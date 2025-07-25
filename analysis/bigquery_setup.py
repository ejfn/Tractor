#!/usr/bin/env python3
"""
BigQuery setup script for Tractor AI analysis.
Sets up dataset, tables, and authentication for the tractor-card-game project.
"""

from google.cloud import bigquery
from google.cloud import storage
from google.cloud import bigquery_datatransfer
from google.cloud.bigquery_datatransfer_v1.types import TransferConfig, CreateTransferConfigRequest
from google.cloud.exceptions import NotFound, Conflict
from google.protobuf.struct_pb2 import Struct
import google.auth

from config import PROJECT_ID, DATASET_ID, TABLE_ID, BUCKET_NAME, LOCATION

try:
    from googleapiclient.discovery import build
except ImportError:
    print("Warning: google-api-python-client is not installed. Service account creation will be skipped.")
    print("Please run: uv pip install google-api-python-client google-auth-httplib2")
    build = None

class BigQuerySetup:
    def __init__(self):
        """Initialize BigQuery, Storage, and Data Transfer clients."""
        self.project_id = PROJECT_ID
        self.bq_client = bigquery.Client(project=self.project_id)
        self.storage_client = storage.Client(project=self.project_id)
        self.transfer_client = bigquery_datatransfer.DataTransferServiceClient()
        self.dataset_id = DATASET_ID
        self.table_id = TABLE_ID
        self.bucket_name = BUCKET_NAME
        
    def create_or_get_service_account(self, account_id, display_name):
        """Creates a service account if it doesn't exist, or gets it if it does."""
        print(f"👤 Ensuring service account exists: {account_id}")
        if not build:
            print("❌ google-api-python-client not found, cannot proceed.")
            return None
            
        try:
            # This script needs credentials with permission to create service accounts
            # and set IAM policies.
            credentials, project_id = google.auth.default()
            
            iam_service = build('iam', 'v1', credentials=credentials)
            
            email = f"{account_id}@{self.project_id}.iam.gserviceaccount.com"
            name = f"projects/{self.project_id}/serviceAccounts/{email}"

            try:
                # Check if service account already exists
                iam_service.projects().serviceAccounts().get(name=name).execute()
                print(f"✅ Service account already exists: {email}")
                return email
            except Exception as e:
                if '404' not in str(e):
                    raise # Re-raise unexpected errors
                # If 404, it doesn't exist, so create it
                pass

            print("   Service account not found, creating...")
            request_body = {
                'accountId': account_id,
                'serviceAccount': {
                    'displayName': display_name
                }
            }
            account = iam_service.projects().serviceAccounts().create(
                name=f'projects/{self.project_id}', body=request_body
            ).execute()
            
            created_email = account['email']
            print(f"✅ Created service account: {created_email}")
            return created_email

        except Exception as e:
            print(f"❌ Failed to create or get service account: {e}")
            print("   Please ensure the user/credentials running this script has 'Service Account Admin' role.")
            return None

    def grant_iam_roles(self, service_account_email):
        """Grants necessary IAM roles to the service account."""
        if not service_account_email:
            return False
            
        print(f"🔑 Granting IAM roles to {service_account_email}...")
        member = f"serviceAccount:{service_account_email}"
        
        # 1. Grant project-level roles
        try:
            credentials, project_id = google.auth.default()
            crm_service = build('cloudresourcemanager', 'v1', credentials=credentials)

            policy = crm_service.projects().getIamPolicy(resource=self.project_id).execute()
            
            roles_to_add = [
                "roles/bigquery.admin",
                # "roles/bigquerydatatransfer.admin", # This role is not supported at the project level
            ]
            
            changed = False
            for role in roles_to_add:
                binding = next((b for b in policy['bindings'] if b['role'] == role), None)
                if binding:
                    if member not in binding['members']:
                        binding['members'].append(member)
                        changed = True
                        print(f"   - Added {role}")
                else:
                    # Add new binding if role doesn't exist in policy
                    policy['bindings'].append({'role': role, 'members': [member]})
                    changed = True
                    print(f"   - Added {role}")

            if changed:
                crm_service.projects().setIamPolicy(
                    resource=self.project_id,
                    body={'policy': policy}
                ).execute()
                print("✅ Successfully set project-level IAM policies.")
            else:
                print("✅ Project-level IAM policies already up-to-date.")

        except Exception as e:
            print(f"❌ Failed to set project-level IAM policies: {e}")
            print("   Please ensure you have 'Project IAM Admin' permissions.")
            return False

        # 2. Grant bucket-level role (Storage Object Admin)
        try:
            bucket = self.storage_client.get_bucket(self.bucket_name)
            policy = bucket.get_iam_policy(requested_policy_version=3)
            
            role = "roles/storage.objectAdmin"
            member_to_add = f"serviceAccount:{service_account_email}"
            
            # Check if the binding already exists to avoid duplicates
            binding_exists = any(
                b.get('role') == role and member_to_add in b.get('members', [])
                for b in policy.bindings
            )

            if not binding_exists:
                policy.bindings.append({"role": role, "members": {member_to_add}})
                bucket.set_iam_policy(policy)
                print(f"✅ Granted Storage Object Admin on bucket '{self.bucket_name}'")
            else:
                print(f"✅ Storage Object Admin role already exists on bucket '{self.bucket_name}'")

        except Exception as e:
            print(f"❌ Failed to set bucket-level IAM policy: {e}")
            print(f"   Could not grant Storage Object Admin to {service_account_email} on bucket {self.bucket_name}.")
            return False
            
        return True

    def setup_authentication(self):
        """Guide user through authentication setup."""
        print("🔐 BigQuery Authentication Setup")
        print("=" * 50)
        
        # Check if already authenticated
        try:
            # Test authentication by trying to list datasets
            datasets = list(self.bq_client.list_datasets())
            print("✅ Already authenticated with BigQuery!")
            return True
        except Exception as e:
            print("❌ You are not authenticated. Please authenticate to continue.")
            print("   This script will automatically create the necessary service accounts and permissions,")
            print("   but you must first authenticate with an account that has sufficient privileges.")
            print()
            print("To authenticate, please run:")
            print("   gcloud auth application-default login")
            print()
            print("The account you use must have the following IAM roles on the project:")
            print("   - Service Account Admin (roles/iam.serviceAccountAdmin)")
            print("   - Project IAM Admin (roles/resourcemanager.projectIamAdmin)")
            print()
            print("After authenticating, please re-run this script.")
            return False
    
    def create_dataset(self):
        """Create the BigQuery dataset."""
        print(f"📁 Creating dataset: {self.dataset_id}")
        
        dataset_ref = self.bq_client.dataset(self.dataset_id)
        
        try:
            dataset = self.bq_client.get_dataset(dataset_ref)
            print(f"✅ Dataset {self.dataset_id} already exists")
            return dataset
        except NotFound:
            pass
        
        # Create new dataset
        dataset = bigquery.Dataset(dataset_ref)
        dataset.location = LOCATION  # Sydney region
        dataset.description = "Tractor card game AI analysis data"
        
        try:
            dataset = self.bq_client.create_dataset(dataset)
            print(f"✅ Created dataset: {self.dataset_id}")
            return dataset
        except Conflict:
            print(f"✅ Dataset {self.dataset_id} already exists")
            return self.bq_client.get_dataset(dataset_ref)
    
    def create_table(self):
        """Create the game logs table with proper schema."""
        print(f"📋 Creating table: {self.table_id}")
        
        table_ref = self.bq_client.dataset(self.dataset_id).table(self.table_id)
        
        try:
            table = self.bq_client.get_table(table_ref)
            print(f"✅ Table {self.table_id} already exists")
            return table
        except NotFound:
            pass
        
        # Define schema based on your log structure
        schema = [
            bigquery.SchemaField("timestamp", "TIMESTAMP", mode="REQUIRED"),
            bigquery.SchemaField("level", "STRING", mode="REQUIRED"),
            bigquery.SchemaField("event", "STRING", mode="REQUIRED"),
            bigquery.SchemaField("gameId", "STRING", mode="NULLABLE"),
            bigquery.SchemaField("sequenceNumber", "INTEGER", mode="REQUIRED"),
            bigquery.SchemaField("appVersion", "STRING", mode="NULLABLE"),
            bigquery.SchemaField("data", "JSON", mode="NULLABLE"),
            bigquery.SchemaField("message", "STRING", mode="NULLABLE"),
        ]
        
        table = bigquery.Table(table_ref, schema=schema)
        table.description = "Tractor game logs for AI analysis"
        
        try:
            table = self.bq_client.create_table(table)
            print(f"✅ Created table: {self.table_id}")
            return table
        except Conflict:
            print(f"✅ Table {self.table_id} already exists")
            return self.bq_client.get_table(table_ref)
    
    def create_gcs_bucket(self):
        """Create GCS bucket for staging log files."""
        print(f"🪣 Creating GCS bucket: {self.bucket_name}")
        
        try:
            bucket = self.storage_client.get_bucket(self.bucket_name)
            print(f"✅ GCS bucket {self.bucket_name} already exists")
            return bucket
        except NotFound:
            pass
        
        try:
            bucket = self.storage_client.create_bucket(
                self.bucket_name,
                location=LOCATION
            )
            print(f"✅ Created GCS bucket: {self.bucket_name}")
            
            # Set lifecycle policy to auto-delete files after 30 days
            lifecycle_rule = {
                'action': {'type': 'Delete'},
                'condition': {'age': 30}
            }
            bucket.lifecycle_rules = [lifecycle_rule]
            bucket.patch()
            print("   📅 Set 30-day auto-deletion policy")
            
            return bucket
        except Conflict:
            print(f"✅ GCS bucket {self.bucket_name} already exists")
            return self.storage_client.get_bucket(self.bucket_name)
        except Exception as e:
            print(f"❌ Failed to create GCS bucket: {e}")
            print("   Note: You may need Storage Admin permissions")
            return None
    
    def create_transfer_job(self, service_account_email):
        """Create a BigQuery Data Transfer job using the specified service account."""
        print(f"🔄 Creating BigQuery Data Transfer job...")
        
        parent = f"projects/{self.project_id}/locations/{LOCATION}"
        data_source_uri = f"gs://{self.bucket_name}/*.gz"
        
        print(f"   Source: {data_source_uri}")
        print(f"   Destination: {self.dataset_id}.{self.table_id}")
        print(f"   Parent: {parent}")
        
        params = Struct()
        params.update({
            "data_path_template": data_source_uri,
            "destination_table_name_template": self.table_id,
            "file_format": "JSON",
            "write_disposition": "APPEND",
            "max_bad_records": "100",
            "delete_source_files": "true"
        })
        
        transfer_config = TransferConfig(
            display_name="Tractor Logs Auto Import",
            data_source_id="google_cloud_storage",
            destination_dataset_id=self.dataset_id,
            schedule="every 6 hours",
            params=params
        )
        
        try:
            print(f"   Using service account: {service_account_email}")
            
            request = CreateTransferConfigRequest(
                parent=parent,
                transfer_config=transfer_config,
                service_account_name=service_account_email
            )
            
            response = self.transfer_client.create_transfer_config(request=request)
            
            print(f"✅ Created Data Transfer job: {response.display_name}")
            print(f"   Job ID: {response.name}")
            print(f"   Schedule: {response.schedule}")
            print("   📅 Will automatically import new files every 6 hours")
            print("   🗑️  Source files will be deleted after successful transfer")
            
            return response
            
        except Exception as e:
            print(f"❌ Failed to create Data Transfer job: {e}")
            print()
            print("🔧 Troubleshooting suggestions:")
            print("1. Ensure the user/credentials running this script has 'Service Account User' role on the created service account.")
            print("2. Verify all required APIs are enabled.")
            print("3. Check IAM permissions for the service account in the Google Cloud Console.")
            return None
    
    def verify_setup(self):
        """Verify that everything is set up correctly."""
        print("🔍 Verifying setup...")
        
        try:
            # Check dataset exists
            dataset = self.bq_client.get_dataset(self.dataset_id)
            print(f"✅ Dataset verified: {self.dataset_id}")
            
            # Check table exists
            table_ref = self.bq_client.dataset(self.dataset_id).table(self.table_id)
            table = self.bq_client.get_table(table_ref)
            print(f"✅ Table verified: {self.table_id}")
            print(f"   Schema: {len(table.schema)} fields")
            print(f"   Rows: {table.num_rows}")
            
            # Check GCS bucket exists
            try:
                bucket = self.storage_client.get_bucket(self.bucket_name)
                print(f"✅ GCS bucket verified: {self.bucket_name}")
                print(f"   Location: {bucket.location}")
            except Exception as e:
                print(f"⚠️  GCS bucket issue: {e}")
            
            # Check Data Transfer jobs
            try:
                # Try location-based parent first
                parent = f"projects/{self.project_id}/locations/{LOCATION}"
                transfer_configs = list(self.transfer_client.list_transfer_configs(parent=parent))
                
                tractor_jobs = [tc for tc in transfer_configs if "Tractor" in tc.display_name]
                if tractor_jobs:
                    print(f"✅ Data Transfer job verified: {len(tractor_jobs)} job(s)")
                    for job in tractor_jobs:
                        print(f"   - {job.display_name} ({job.schedule})")
                else:
                    print("ℹ️  No Data Transfer jobs found")
            except Exception as e:
                print(f"⚠️  Data Transfer job check failed: {e}")
            
            return True
        except Exception as e:
            print(f"❌ Verification failed: {e}")
            return False
    
    def run_setup(self):
        """Run the complete setup process."""
        print("🚀 BigQuery Setup for Tractor AI Analysis")
        print("=" * 60)
        
        # Step 1: Authentication
        if not self.setup_authentication():
            print("⚠️  Please complete authentication setup and run again.")
            return False

        # Step 1a: Create Service Account and grant permissions
        service_account_email = self.create_or_get_service_account(
            account_id="tractor-data-transfer",
            display_name="Tractor Data Transfer"
        )
        if not service_account_email or not self.grant_iam_roles(service_account_email):
            print("❌ Failed to set up service account and permissions. Aborting.")
            return False
        
        # Step 2: Create dataset
        self.create_dataset()
        
        # Step 3: Create table
        self.create_table()
        
        # Step 4: Create GCS bucket
        self.create_gcs_bucket()
        
        # Step 5: Create Data Transfer job
        self.create_transfer_job(service_account_email)
        
        # Step 6: Verify setup
        success = self.verify_setup()
        
        if success:
            print("=" * 60)
            print("🎉 BigQuery, GCS, and Data Transfer setup complete!")
            print(f"   Project: {self.project_id}")
            print(f"   Dataset: {self.dataset_id}")
            print(f"   Table: {self.table_id}")
            print(f"   GCS Bucket: {self.bucket_name}")
            print()
            print("Next steps:")
            print("1. Run: uv run analysis/bigquery_main.py upload")
            print("2. Data Transfer job will automatically import new files")
            print("3. Run: uv run analysis/bigquery_main.py analyse")
        else:
            print("❌ Setup incomplete. Please check errors above.")
        
        return success

