#!/usr/bin/env python3
"""
BigQuery data upload script for Tractor AI logs.
Uploads JSON log files to GCS, then creates BigQuery load jobs for analysis.
"""

import os
from google.cloud import bigquery
from google.cloud import storage
from google.cloud import bigquery_datatransfer

from config import PROJECT_ID, DATASET_ID, TABLE_ID, BUCKET_NAME, LOCATION

class BigQueryUploader:
    def __init__(self):
        """Initialize BigQuery and Storage clients."""
        self.project_id = PROJECT_ID
        self.bq_client = bigquery.Client(project=self.project_id)
        self.storage_client = storage.Client(project=self.project_id)
        self.transfer_client = bigquery_datatransfer.DataTransferServiceClient()
        self.dataset_id = DATASET_ID
        self.table_id = TABLE_ID
        self.bucket_name = BUCKET_NAME
        self.table_ref = self.bq_client.dataset(self.dataset_id).table(self.table_id)
    
    def upload_logs_to_gcs(self, logs_dir: str):
        """Upload log files to GCS."""
        print("📁 Uploading log files to GCS...")
        
        bucket = self.storage_client.bucket(self.bucket_name)
        
        # Check what files we have
        compressed_files = sorted([f for f in os.listdir(logs_dir) if f.endswith('.log.gz')])
        uncompressed_files = sorted([f for f in os.listdir(logs_dir) if f.endswith('.log')])
        
        if compressed_files:
            print(f"📄 Found {len(compressed_files)} pre-compressed .log.gz files")
            return self._upload_files_directly(bucket, logs_dir, compressed_files)
        elif uncompressed_files:
            print(f"📄 Found {len(uncompressed_files)} uncompressed .log files")
            print("⚠️  Consider running ./run_simulations.sh to auto-compress files")
            return self._upload_files_directly(bucket, logs_dir, uncompressed_files)
        else:
            print("❌ No .log or .log.gz files found")
            return []
    
    def _upload_files_directly(self, bucket, logs_dir: str, file_list: list):
        """Upload files directly to GCS without any processing."""
        uploaded_files = []
        
        print(f"📤 Uploading {len(file_list)} files directly...")
        
        for i, filename in enumerate(file_list, 1):
            filepath = os.path.join(logs_dir, filename)
            gcs_filename = filename  # Upload directly to bucket root, no logs/ prefix
            
            print(f"   📤 Uploading {i}/{len(file_list)}: {gcs_filename}")
            
            # Upload file directly
            blob = bucket.blob(gcs_filename)
            blob.upload_from_filename(filepath)
            
            uploaded_files.append(f"gs://{bucket.name}/{gcs_filename}")
            
            file_size_mb = blob.size / (1024 * 1024) if blob.size else 0
            print(f"      ✅ {file_size_mb:.1f} MB uploaded")
        
        print(f"🎯 Successfully uploaded {len(uploaded_files)} files")
        return uploaded_files
    
    def trigger_bigquery_transfer(self):
        """Manually trigger the existing BigQuery Data Transfer job."""
        print("🔄 Manually triggering existing BigQuery Data Transfer job...")
        
        try:
            # Find the existing transfer job
            parent = f"projects/{self.project_id}/locations/{LOCATION}"
            transfer_configs = list(self.transfer_client.list_transfer_configs(parent=parent))
            
            tractor_jobs = [tc for tc in transfer_configs if "Tractor" in tc.display_name]
            
            if not tractor_jobs:
                print("❌ No Tractor Data Transfer job found")
                print("   Please run the setup script first to create the transfer job")
                return False
            
            transfer_config = tractor_jobs[0]
            print(f"📋 Found transfer job: {transfer_config.display_name}")
            
            # Trigger manual run
            from google.cloud.bigquery_datatransfer_v1.types import StartManualTransferRunsRequest
            
            request = StartManualTransferRunsRequest(
                parent=transfer_config.name,
                requested_time_range={
                    "start_time": {"seconds": 0},
                    "end_time": {"seconds": 9999999999}  # Far future
                }
            )
            
            response = self.transfer_client.start_manual_transfer_runs(request=request)
            
            if response.runs:
                run = response.runs[0]
                print(f"✅ Transfer job triggered successfully!")
                print(f"   Run ID: {run.name}")
                print(f"   State: {run.state.name}")
                print("   The job will process all files in the GCS bucket")
                return True
            else:
                print("❌ Failed to trigger transfer job")
                return False
            
        except Exception as e:
            print(f"❌ Failed to trigger transfer job: {e}")
            return False
    
    def run_upload(self, logs_dir: str):
        """Run the simple upload process - just upload files to GCS."""
        print("🚀 BigQuery File Upload for Tractor AI Analysis")
        print("=" * 60)
        
        # Check if logs directory exists
        if not os.path.exists(logs_dir):
            print(f"❌ Logs directory not found: {logs_dir}")
            return False
        
        # Upload logs to GCS staging
        print("\n📤 Uploading logs to Google Cloud Storage...")
        gcs_files = self.upload_logs_to_gcs(logs_dir)
        
        if not gcs_files:
            print("❌ No files uploaded to GCS")
            return False
        
        print("=" * 60)
        print("🎉 Upload complete!")
        print(f"   Uploaded files: {len(gcs_files)} files to GCS staging")
        print(f"   Project: {self.project_id}")
        print(f"   Bucket: {self.bucket_name}")
        print()
        print("Next step: Run the BigQuery analyzer to process and analyze the data")
        
        return True
    
    def run_upload_and_transfer(self, logs_dir: str):
        """Run upload to GCS and immediately trigger BigQuery transfer."""
        print("🚀 BigQuery Upload & Transfer for Tractor AI Analysis")
        print("=" * 60)
        
        # Step 1: Upload to GCS
        success = self.run_upload(logs_dir)
        if not success:
            return False
        
        # Step 2: Immediately trigger BigQuery transfer
        print("\n📊 Step 2: Triggering BigQuery transfer...")
        return self.trigger_bigquery_transfer()
