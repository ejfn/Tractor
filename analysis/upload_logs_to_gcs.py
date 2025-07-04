#!/usr/bin/env python3
"""
Upload simulation log files to Google Cloud Storage for BigQuery ingestion.

This script uploads all *.log.gz files from the logs/ directory to the GCS bucket
configured in setup_bigquery.py, where BigQuery Data Transfer Service will 
automatically ingest them.
"""

import os
from pathlib import Path
from google.cloud import storage
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Configuration (matching setup_bigquery.py)
PROJECT_ID = os.environ.get("GOOGLE_CLOUD_PROJECT")
GCS_BUCKET_NAME = f"{PROJECT_ID}-simulation-logs"
LOGS_DIR = "../logs"
LOG_PATTERN = "*.log.gz"

def upload_logs_to_gcs():
    """Upload all log.gz files to GCS bucket for BigQuery ingestion."""
    
    if not PROJECT_ID:
        print("❌ GOOGLE_CLOUD_PROJECT environment variable not set.")
        print("   Please set it to your Google Cloud project ID.")
        return False

    # Initialize GCS client
    try:
        client = storage.Client(project=PROJECT_ID)
        bucket = client.bucket(GCS_BUCKET_NAME)
        print(f"📦 Connected to GCS bucket: {GCS_BUCKET_NAME}")
    except Exception as e:
        print(f"❌ Failed to connect to GCS: {e}")
        print("   Make sure you're authenticated with Google Cloud SDK")
        return False

    # Find all log files
    script_dir = Path(__file__).parent
    logs_path = script_dir / LOGS_DIR
    log_files = list(logs_path.glob(LOG_PATTERN))
    
    if not log_files:
        print(f"⚠️  No log files found in {logs_path}/{LOG_PATTERN}")
        return False

    print(f"📁 Found {len(log_files)} log files to upload:")
    for log_file in log_files:
        print(f"   - {log_file.name}")

    # Upload each log file
    success_count = 0
    for log_file in log_files:
        try:
            # Use just the filename as the blob name (no path prefix)
            blob_name = log_file.name
            blob = bucket.blob(blob_name)
            
            # Check if file already exists
            if blob.exists():
                print(f"⏭️  Skipping {blob_name} (already exists)")
                continue
            
            # Upload the file
            print(f"⬆️  Uploading {blob_name}...")
            blob.upload_from_filename(str(log_file))
            print(f"✅ Successfully uploaded {blob_name}")
            success_count += 1
            
        except Exception as e:
            print(f"❌ Failed to upload {log_file.name}: {e}")

    print(f"\n🎉 Upload complete: {success_count}/{len(log_files)} files uploaded successfully")
    
    if success_count > 0:
        print(f"📊 Files are now available at: gs://{GCS_BUCKET_NAME}/")
        print("🔄 BigQuery Data Transfer Service will automatically ingest them within 15 minutes")
        print("📈 Run generate_kpi_report.py after ingestion to analyze the data")
    
    return success_count == len(log_files)

def list_bucket_contents():
    """List current contents of the GCS bucket."""
    if not PROJECT_ID:
        print("❌ GOOGLE_CLOUD_PROJECT environment variable not set.")
        return
    
    try:
        client = storage.Client(project=PROJECT_ID)
        bucket = client.bucket(GCS_BUCKET_NAME)
        
        blobs = list(bucket.list_blobs())
        if blobs:
            print(f"📦 Current contents of gs://{GCS_BUCKET_NAME}/:")
            for blob in blobs:
                print(f"   - {blob.name} ({blob.size:,} bytes, {blob.time_created})")
        else:
            print(f"📦 Bucket gs://{GCS_BUCKET_NAME}/ is empty")
            
    except Exception as e:
        print(f"❌ Failed to list bucket contents: {e}")

def main():
    """Main function with menu options."""
    print("🎮 Tractor AI Simulation Log Uploader")
    print("=" * 40)
    
    if len(os.sys.argv) > 1 and os.sys.argv[1] == "--list":
        list_bucket_contents()
        return
    
    # Upload logs
    success = upload_logs_to_gcs()
    
    if success:
        print("\n" + "=" * 40)
        print("✅ All logs uploaded successfully!")
        print("🕐 Wait ~15 minutes for BigQuery ingestion")
        print("📊 Then run: python generate_kpi_report.py")
    else:
        print("\n" + "=" * 40)
        print("⚠️  Some uploads failed. Check the logs above.")

if __name__ == "__main__":
    main()