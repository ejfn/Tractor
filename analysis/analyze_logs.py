import os
import json
import pandas as pd
from pathlib import Path

# --- Configuration ---
SIMULATION_DATA_DIR = Path(__file__).parent.parent / "simulation_data"
REPORTS_DIR = Path(__file__).parent / "reports"

# --- Main Orchestration ---
def main():
    """
    Main function to run the analysis pipeline.
    """
    print("Starting AI simulation analysis...")

    # Ensure reports directory exists
    REPORTS_DIR.mkdir(exist_ok=True)

    # 1. Load and parse log files
    log_files = find_log_files(SIMULATION_DATA_DIR)
    if not log_files:
        print(f"No log files found in {SIMULATION_DATA_DIR}. Exiting.")
        return

    print(f"Found {len(log_files)} log files to analyze.")
    all_decisions_df = parse_log_files(log_files)

    if all_decisions_df.empty:
        print("No decision data could be parsed from the logs. Exiting.")
        return

    # 2. Calculate Key Performance Indicators (KPIs)
    print("Calculating KPIs...")
    kpi_report = calculate_kpis(all_decisions_df)

    # 3. Generate and save reports
    print("Generating reports...")
    save_kpi_report(kpi_report)

    print(f"Analysis complete. Reports saved in {REPORTS_DIR}")

# --- Data Loading and Parsing ---
def find_log_files(directory: Path) -> list[Path]:
    """Finds all .log files in the specified directory."""
    return list(directory.glob("*.log"))

def parse_log_files(log_files: list[Path]) -> pd.DataFrame:
    """Parses all log files and extracts AI decision points."""
    all_decisions = []
    for log_file in log_files:
        with open(log_file, 'r') as f:
            for line in f:
                try:
                    log_entry = json.loads(line)
                    # Check for the new structured logging format
                    if 'event' in log_entry and isinstance(log_entry['event'], dict) and 'context' in log_entry['event']:
                        decision_data = log_entry['event']['context']
                        flat_data = {
                            'timestamp': log_entry.get('timestamp'),
                            'gameId': log_entry.get('gameId'),
                            'decisionPoint': decision_data.get('decisionPoint'),
                            'player': decision_data.get('player'),
                            'decision': str(decision_data.get('decision')),
                        }
                        if isinstance(decision_data.get('context'), dict):
                            flat_data.update(decision_data['context'])
                        all_decisions.append(flat_data)
                except (json.JSONDecodeError, AttributeError):
                    # Ignore lines that are not valid JSON or don't have the expected structure
                    continue
    return pd.DataFrame(all_decisions)

# --- KPI Calculation ---
def calculate_kpis(df: pd.DataFrame) -> dict:
    """
    Calculates various KPIs from the parsed decision data.
    Placeholder for actual KPI calculation logic.
    """
    kpis = {}

    # Example KPI: Decision point frequency
    kpis['decision_point_frequency'] = df['decisionPoint'].value_counts().to_dict()

    # TODO: Implement more detailed KPI calculations as per the strategy document.
    # - Attacking Team Win Rate (requires parsing game end events)
    # - Point Capture Efficiency
    # - Trump Efficiency
    # - Kitty Swap Effectiveness
    # - Trick Win Rate by Position

    return kpis

# --- Report Generation ---
def save_kpi_report(kpi_report: dict):
    """Saves the calculated KPIs to a markdown file."""
    report_path = REPORTS_DIR / "kpi_summary.md"
    with open(report_path, 'w') as f:
        f.write("# AI Performance KPI Summary\n\n")
        f.write("This report summarizes the key performance indicators from the latest simulation run.\n\n")

        f.write("## Decision Point Frequency\n")
        f.write("| Decision Point | Count |\n")
        f.write("|----------------|-------|\n")
        freq_data = kpi_report.get('decision_point_frequency', {})
        for point, count in sorted(freq_data.items()):
            f.write(f"| {point} | {count} |\n")

        # Add sections for other KPIs as they are implemented

    print(f"KPI report saved to {report_path}")


if __name__ == "__main__":
    main()
