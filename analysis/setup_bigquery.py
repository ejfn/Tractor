
import os
from google.cloud import bigquery
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# --- Configuration ---
PROJECT_ID = os.environ.get("GOOGLE_CLOUD_PROJECT")

DATASET_ID = "tractor_analytics"
TABLE_ID = "simulation_logs"
TABLE_DESCRIPTION = "Stores log data from AI simulations for the Tractor card game."
SCHEMA = [
    bigquery.SchemaField("timestamp", "TIMESTAMP", mode="REQUIRED", description="The timestamp of the event."),
    bigquery.SchemaField("level", "STRING", mode="NULLABLE", description="The log level of the event (e.g., INFO, DEBUG, ERROR)."),
    bigquery.SchemaField("gameId", "STRING", mode="NULLABLE", description="The unique identifier for the game session."),
    bigquery.SchemaField("sequenceNumber", "INTEGER", mode="NULLABLE", description="The sequential number of the event within its log file."),
    bigquery.SchemaField("event", "STRING", mode="REQUIRED", description="The type of event that occurred."),
    bigquery.SchemaField("message", "STRING", mode="NULLABLE", description="A human-readable message associated with the event."),
    bigquery.SchemaField("data", "JSON", mode="NULLABLE", description="A JSON object containing detailed event data."),
    bigquery.SchemaField("appVersion", "STRING", mode="NULLABLE", description="The version of the application that generated the log."),
]

GCS_BUCKET_NAME = f"{PROJECT_ID}-simulation-logs"
LOCATION = "australia-southeast1"


from google.cloud import storage
from google.cloud.bigquery_datatransfer import DataTransferServiceClient, TransferConfig, CreateTransferConfigRequest



# --- Main Orchestration ---
def main():
    """
    Main function to set up BigQuery dataset, table, GCS bucket, and Data Transfer Service.
    """
    if not PROJECT_ID:
        print("GOOGLE_CLOUD_PROJECT environment variable not set.")
        print("Please set it to your Google Cloud project ID.")
        return

    bq_client = bigquery.Client(project=PROJECT_ID)
    gcs_client = storage.Client(project=PROJECT_ID)
    dts_client = DataTransferServiceClient()

    # 1. Create BigQuery Dataset
    dataset = create_dataset(bq_client)
    if dataset:
        print(f"Successfully created or found BigQuery dataset: {dataset.dataset_id}")

    # 2. Create BigQuery Table
    table = create_table(bq_client)
    if table:
        print(f"Successfully created or found BigQuery table: {table.table_id}")

    # 3. Create GCS Bucket
    bucket = create_gcs_bucket(gcs_client)
    if bucket:
        print(f"Successfully created or found GCS bucket: {bucket.name}")

    # 4. Create Data Transfer Job
    create_data_transfer_job(dts_client)

    

# --- BigQuery Setup ---

# --- BigQuery Setup ---
def create_dataset(client: bigquery.Client) -> bigquery.Dataset:
    """
    Creates a new BigQuery dataset if it doesn't already exist.
    """
    dataset_id = f"{PROJECT_ID}.{DATASET_ID}"
    try:
        dataset = client.get_dataset(dataset_id)
        print(f"Dataset {dataset_id} already exists.")
        return dataset
    except Exception:
        dataset = bigquery.Dataset(dataset_id)
        dataset.location = LOCATION  # Set to Australia region
        dataset = client.create_dataset(dataset, timeout=30)
        print(f"Created dataset {dataset.project}.{dataset.dataset_id}")
        return dataset

def create_table(client: bigquery.Client) -> bigquery.Table:
    """
    Creates a new BigQuery table if it doesn't already exist.
    """
    table_id = f"{PROJECT_ID}.{DATASET_ID}.{TABLE_ID}"
    try:
        table = client.get_table(table_id)
        print(f"Table {table_id} already exists.")
        return table
    except Exception:
        table = bigquery.Table(table_id, schema=SCHEMA)
        table.description = TABLE_DESCRIPTION
        table = client.create_table(table, timeout=30)
        print(f"Created table {table.project}.{table.dataset_id}.{table.table_id}")
        return table


def create_gcs_bucket(client: storage.Client) -> storage.Bucket:
    """
    Creates a new GCS bucket if it doesn't already exist.
    """
    try:
        bucket = client.get_bucket(GCS_BUCKET_NAME)
        print(f"GCS bucket {GCS_BUCKET_NAME} already exists.")
        return bucket
    except Exception:
        bucket = client.create_bucket(GCS_BUCKET_NAME, location=LOCATION)
        print(f"Created GCS bucket {bucket.name}")
        return bucket



def create_data_transfer_job(client: DataTransferServiceClient):
    """
    Creates a BigQuery Data Transfer Service job to load data from GCS.
    """
    parent = client.common_project_path(PROJECT_ID)

    # Check if a transfer config already exists for this source and destination
    existing_configs = client.list_transfer_configs(parent=parent)
    for config in existing_configs:
        if config.data_source_id == "google_cloud_storage" and \
           config.destination_dataset_id == DATASET_ID and \
           config.params.get("destination_table_name_template") == TABLE_ID:
            print(f"Data Transfer job '{config.display_name}' already exists.")
            return config

    # Define the transfer configuration
    transfer_config = TransferConfig(
        destination_dataset_id=DATASET_ID,
        display_name="Tractor Simulation Logs GCS Transfer",
        data_source_id="google_cloud_storage",
        params={
            "data_path_template": f"gs://{GCS_BUCKET_NAME}/*.log.gz",
            "destination_table_name_template": TABLE_ID,
            "file_format": "JSON",
            "write_disposition": "APPEND",
            "ignore_unknown_values": "true", # Allow for schema evolution
            "delete_source_files": "true", # Delete source files after successful transfer
            
        },
        schedule="every 15 minutes", # Run every 15 minutes
        disabled=False,
    )

    # Create the request object for creating the transfer config
    request = CreateTransferConfigRequest(
        parent=parent,
        transfer_config=transfer_config,
        service_account_name=f"{PROJECT_ID}@appspot.gserviceaccount.com",
    )

    # Create the transfer config
    try:
        response = client.create_transfer_config(request=request)
        print(f"Successfully created Data Transfer job: {response.display_name}")
        return response
    except Exception as e:
        print(f"Error creating Data Transfer job: {e}")
        return None


if __name__ == "__main__":
    main()

