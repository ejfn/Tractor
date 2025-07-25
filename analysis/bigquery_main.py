#!/usr/bin/env python3
"""
Complete BigQuery workflow orchestrator for Tractor AI analysis.
Handles setup, data upload, analysis, and report generation.
"""

import os
import sys
from bigquery_setup import BigQuerySetup
from bigquery_upload import BigQueryUploader
from bigquery_analyser import BigQueryAnalyser

def main():
    """Main orchestrator for BigQuery analysis workflow."""
    print("🚀 Tractor AI BigQuery Analysis Workflow")
    print("=" * 60)
    
    if len(sys.argv) > 1:
        command = sys.argv[1].lower()
    else:
        print("Available commands:")
        print("  setup    - Set up BigQuery dataset and tables")
        print("  upload   - Upload log data to BigQuery")
        print("  analyse  - Run analysis and generate performance report")
        print("  full     - Run complete workflow (upload + analyse)")
        print()
        command = input("Enter command: ").strip().lower()
    
    # Get logs directory
    script_dir = os.path.dirname(__file__)
    project_root = os.path.dirname(script_dir)
    logs_dir = os.path.join(project_root, "logs")
    
    try:
        if command == "setup":
            print("\n🔧 Running BigQuery setup...")
            setup = BigQuerySetup()
            success = setup.run_setup()
            if success:
                print("✅ Setup complete! Next: run 'upload' to load your data")
            else:
                print("❌ Setup failed")
                return False
                
        elif command == "upload":
            print("\n📤 Uploading data to BigQuery...")
            uploader = BigQueryUploader()
            success = uploader.run_upload_and_transfer(logs_dir)
            if success:
                print("✅ Upload complete! Next: run 'analyse' to generate analysis and visualizations")
            else:
                print("❌ Upload failed")
                return False
                
        elif command == "analyse":
            print("\n📊 Running BigQuery analysis and generating report...")
            # Run analysis and generate report
            analyser = BigQueryAnalyser()
            analyser.run_analysis()
            print("✅ Analysis and report generation complete!")
            
        elif command == "full":
            print("\n🔄 Running complete workflow...")
            
            # Step 1: Upload (skip setup, assume it's done)
            print("\n📤 Step 1: Uploading data...")
            uploader = BigQueryUploader()
            if not uploader.run_upload(logs_dir):
                print("❌ Upload failed")
                return False
            
            # Step 2: Analyze and generate report
            print("\n📊 Step 2: Running analysis and generating report...")
            analyser = BigQueryAnalyser()
            analyser.run_analysis()
            
            print("✅ Complete workflow finished!")
            
        else:
            print(f"❌ Unknown command: {command}")
            return False
            
        return True
        
    except Exception as e:
        print(f"❌ Workflow failed: {e}")
        return False

if __name__ == "__main__":
    main()
