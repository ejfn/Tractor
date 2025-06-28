import os
import json
import argparse
import tempfile
import shutil

def process_log_file_in_place(filepath):
    """
    Reads an uncompressed JSONL file, adds a sequenceNumber to each line,
    and overwrites the original file with the modified content.
    """
    print(f"Processing {filepath} in place...")
    processed_lines = []
    sequence_number = 0

    try:
        with open(filepath, 'rt', encoding='utf-8') as infile:
            for line in infile:
                line = line.strip()
                if not line:
                    continue
                try:
                    data = json.loads(line)
                    sequence_number += 1
                    data['sequenceNumber'] = sequence_number
                    processed_lines.append(json.dumps(data))
                except json.JSONDecodeError as e:
                    print(f"Skipping malformed JSON line in {filepath}: {line} - Error: {e}")
                    continue
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
        return

    if processed_lines:
        # Write to a temporary file first
        with tempfile.NamedTemporaryFile(mode='wt', delete=False, encoding='utf-8', suffix='.log') as temp_outfile:
            for p_line in processed_lines:
                temp_outfile.write(p_line + '\n')
        
        # Replace the original file with the temporary one
        shutil.move(temp_outfile.name, filepath)
        print(f"Successfully processed and updated {filepath}")
    else:
        print(f"No valid lines processed from {filepath}. Original file untouched.")

def main():
    parser = argparse.ArgumentParser(description="Process JSONL log files to add a sequenceNumber.")
    parser.add_argument("--log_dir", default="logs", help="Directory containing .log files to process in place.")
    
    args = parser.parse_args()

    if not os.path.exists(args.log_dir):
        print(f"Error: Log directory '{args.log_dir}' does not exist.")
        return

    for filename in os.listdir(args.log_dir):
        # Only process uncompressed .log files
        if filename.endswith(".log") and not filename.endswith(".log.gz"):
            filepath = os.path.join(args.log_dir, filename)
            process_log_file_in_place(filepath)

if __name__ == "__main__":
    main()