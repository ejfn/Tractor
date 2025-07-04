#!/usr/bin/env python3
"""
Simplified KPI report generator for Tractor AI simulation data.
Rewritten to work with the clean SQL query and standardized logging.
"""

import os
import pandas as pd
from google.cloud import bigquery
import matplotlib.pyplot as plt
import seaborn as sns
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
PROJECT_ID = os.environ.get("GOOGLE_CLOUD_PROJECT")
KPI_QUERY_FILE = "kpi_report_query.sql"

# Always use the project root directory for output
script_dir = os.path.dirname(__file__)
project_root = os.path.dirname(script_dir)  # Go up one level from analysis/ to project root
OUTPUT_DIR = os.path.join(project_root, "analysis_reports")

def run_query():
    """Run the KPI query and return results."""
    if not PROJECT_ID:
        raise ValueError("GOOGLE_CLOUD_PROJECT environment variable not set.")

    client = bigquery.Client(project=PROJECT_ID)
    
    query_path = os.path.join(script_dir, KPI_QUERY_FILE)
    
    with open(query_path, "r") as f:
        query = f.read()

    print(f"Running KPI query...")
    result = client.query(query).to_dataframe()
    print(f"Query completed. Found {len(result)} app versions.")
    return result

def generate_report(df):
    """Generate performance-focused markdown report."""
    if df.empty:
        return "# No data found\n"
    
    lines = []
    lines.append("# 🎮 Tractor AI Performance Report\n")
    lines.append(f"**Generated:** {pd.Timestamp.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    lines.append(f"**App Versions:** {len(df)}\n")
    lines.append(f"**Total Games:** {df['total_games'].sum()}\n\n")
    
    for _, row in df.iterrows():
        lines.append(f"## 📊 App Version: `{row['appVersion']}`\n")
        
        # Game performance overview
        lines.append("### 🏆 Game Performance\n")
        lines.append(f"- **Total Games:** {row['total_games']}\n")
        lines.append(f"- **Attacking Team Win Rate:** {row['attacking_team_win_rate']:.1%}\n")
        lines.append(f"- **Defending Team Win Rate:** {row['defending_team_win_rate']:.1%}\n")
        lines.append(f"- **Total Rounds:** {row['total_rounds']}\n")
        lines.append(f"- **Avg Rounds per Game:** {row['avg_rounds_per_game']:.1f}\n")
        lines.append(f"- **Attacking Round Win Rate:** {row['attacking_round_win_rate']:.1%}\n\n")
        
        # Position-based performance analysis
        lines.append("### 🎯 Position Performance (Win Rates)\n")
        pos1_rate = row.get('position_1_win_rate')
        pos2_rate = row.get('position_2_win_rate') 
        pos3_rate = row.get('position_3_win_rate')
        pos4_rate = row.get('position_4_win_rate')
        
        if pos1_rate is not None:
            lines.append(f"- **Leading Player (Pos 1):** {pos1_rate:.1%} win rate\n")
        if pos2_rate is not None:
            lines.append(f"- **2nd Player:** {pos2_rate:.1%} win rate\n")
        if pos3_rate is not None:
            lines.append(f"- **3rd Player:** {pos3_rate:.1%} win rate\n")
        if pos4_rate is not None:
            lines.append(f"- **4th Player:** {pos4_rate:.1%} win rate\n")
        lines.append("\n")
        
        
        # Total points per round by position
        lines.append("### 🎯 Total Points Collected Per Round (By Position)\n")
        pos1_round_pts = row.get('position_1_points_per_round')
        pos2_round_pts = row.get('position_2_points_per_round')
        pos3_round_pts = row.get('position_3_points_per_round')
        pos4_round_pts = row.get('position_4_points_per_round')
        
        total_round_points = sum(x for x in [pos1_round_pts, pos2_round_pts, pos3_round_pts, pos4_round_pts] if x is not None)
        
        if pos1_round_pts is not None:
            lines.append(f"- **Leading Player:** {pos1_round_pts:.1f} points per round ({pos1_round_pts/total_round_points:.1%} of total)\n")
        if pos2_round_pts is not None:
            lines.append(f"- **2nd Player:** {pos2_round_pts:.1f} points per round ({pos2_round_pts/total_round_points:.1%} of total)\n")
        if pos3_round_pts is not None:
            lines.append(f"- **3rd Player:** {pos3_round_pts:.1f} points per round ({pos3_round_pts/total_round_points:.1%} of total)\n")
        if pos4_round_pts is not None:
            lines.append(f"- **4th Player:** {pos4_round_pts:.1f} points per round ({pos4_round_pts/total_round_points:.1%} of total)\n")
        lines.append(f"- **Total Round Points:** {total_round_points:.1f} per round (out of ~200 available)\n")
        lines.append("\n")
        
        # Add charts to the report
        safe_version = row['appVersion'].replace('/', '_').replace('+', '_')
        lines.append("## 📊 Performance Visualizations\n\n")
        
        lines.append("### Team Performance: Attacking vs Defending\n")
        lines.append(f"![Team Win Rates](team_win_rates_{safe_version}.png)\n\n")
        
        lines.append("### Position Win Rates\n")
        lines.append(f"![Position Win Rates](position_win_rates_{safe_version}.png)\n\n")
        
        lines.append("### Total Points Per Round by Position\n")
        lines.append(f"![Points Per Round](position_points_per_round_{safe_version}.png)\n\n")
        
        # Overall player performance 
        lines.append("### 🎮 Player Performance\n")
        avg_wr = row.get('avg_player_win_rate')
        avg_pts = row.get('avg_points_per_trick')
        
        if avg_wr is not None and avg_pts is not None:
            lines.append(f"- **Average Player Win Rate:** {avg_wr:.1%}\n")
            lines.append(f"- **Average Points per Trick:** {avg_pts:.1f}\n")
        lines.append("\n")
        
        # Efficiency metrics
        lines.append("### 📈 Efficiency Metrics\n")
        lines.append(f"- **Avg Final Points per Round:** {row['avg_final_points']:.1f}\n")
        if row.get('avg_kitty_points') is not None:
            lines.append(f"- **Avg Kitty Points:** {row['avg_kitty_points']:.1f}\n")
        lines.append("\n")
        
        # Most used AI strategies (only frequently used ones)
        lines.append("### 🧠 Most Used AI Strategies\n")
        if row['top_ai_decisions'] is not None and len(row['top_ai_decisions']) > 0:
            # Group and sort, removing duplicates
            leading_decisions = {}
            following_decisions = {}
            
            for decision in row['top_ai_decisions']:
                if decision['eventType'] == 'ai_leading_decision':
                    decision_point = decision['decisionPoint']
                    if decision_point not in leading_decisions:
                        leading_decisions[decision_point] = decision['count']
                elif decision['eventType'] == 'ai_following_decision':
                    decision_point = decision['decisionPoint']
                    if decision_point not in following_decisions:
                        following_decisions[decision_point] = decision['count']
            
            if leading_decisions:
                lines.append("**🎯 Leading Strategies:**\n")
                # Sort by count descending
                sorted_leading = sorted(leading_decisions.items(), key=lambda x: x[1], reverse=True)
                for decision_point, count in sorted_leading[:5]:  # Top 5
                    lines.append(f"- `{decision_point}`: {count:,} uses\n")
            
            if following_decisions:
                lines.append("**🤝 Following Strategies:**\n") 
                # Sort by count descending
                sorted_following = sorted(following_decisions.items(), key=lambda x: x[1], reverse=True)
                for decision_point, count in sorted_following[:5]:  # Top 5
                    lines.append(f"- `{decision_point}`: {count:,} uses\n")
        else:
            lines.append("- No frequently used strategies identified\n")
        
        lines.append("\n---\n\n")
    
    return "".join(lines)

def create_visualizations(df):
    """Create performance-focused visualization charts."""
    if df.empty or len(df) < 1:
        print("Skipping visualizations: insufficient data")
        return
    
    # Ensure output directory exists
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # Set style
    plt.style.use('default')
    sns.set_palette("husl")
    
    for _, row in df.iterrows():
        safe_version = row['appVersion'].replace('/', '_').replace('+', '_')
        
        # 1. Position-based Win Rate Analysis
        positions = ['Position 1\n(Leading)', 'Position 2', 'Position 3', 'Position 4']
        win_rates = [
            row.get('position_1_win_rate'),
            row.get('position_2_win_rate'), 
            row.get('position_3_win_rate'),
            row.get('position_4_win_rate')
        ]
        
        # Filter out None and NaN values
        valid_data = [(pos, rate) for pos, rate in zip(positions, win_rates) 
                     if rate is not None and not pd.isna(rate)]
        if valid_data:
            pos_labels, rates = zip(*valid_data)
            
            plt.figure(figsize=(10, 6))
            bars = plt.bar(pos_labels, rates, color=['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728'])
            plt.title(f'Trick Win Rate by Position - {row["appVersion"]}')
            plt.ylabel('Win Rate')
            plt.xlabel('Trick Position')
            
            # Add value labels on bars
            for bar, rate in zip(bars, rates):
                plt.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.01,
                        f'{rate:.1%}', ha='center', va='bottom', fontweight='bold')
            
            plt.ylim(0, max(rates) * 1.15)
            plt.tight_layout()
            plt.savefig(f"{OUTPUT_DIR}/position_win_rates_{safe_version}.png", dpi=300, bbox_inches='tight')
            plt.close()
        
        # 2. Total Points Per Round by Position
        points_per_round = [
            row.get('position_1_points_per_round'),
            row.get('position_2_points_per_round'),
            row.get('position_3_points_per_round'),
            row.get('position_4_points_per_round')
        ]
        
        valid_round_data = [(pos, pts) for pos, pts in zip(positions, points_per_round) if pts is not None and not pd.isna(pts)]
        if valid_round_data:
            pos_labels, round_points = zip(*valid_round_data)
            
            plt.figure(figsize=(10, 6))
            bars = plt.bar(pos_labels, round_points, color=['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728'])
            plt.title(f'Total Points Per Round by Position - {row["appVersion"]}')
            plt.ylabel('Average Points Per Round')
            plt.xlabel('Trick Position')
            
            # Add value labels on bars
            for bar, pts in zip(bars, round_points):
                plt.text(bar.get_x() + bar.get_width()/2, bar.get_height() + max(round_points) * 0.01,
                        f'{pts:.1f}', ha='center', va='bottom', fontweight='bold')
            
            plt.ylim(0, max(round_points) * 1.15)
            plt.tight_layout()
            plt.savefig(f"{OUTPUT_DIR}/position_points_per_round_{safe_version}.png", dpi=300, bbox_inches='tight')
            plt.close()
        
        # 3. Attacking vs Defending Team Win Rates
        attacking_rate = row.get('attacking_team_win_rate')
        defending_rate = row.get('defending_team_win_rate')
        
        if attacking_rate is not None and defending_rate is not None and not pd.isna(attacking_rate) and not pd.isna(defending_rate):
            team_types = ['Attacking\nTeam', 'Defending\nTeam']
            win_rates = [attacking_rate, defending_rate]
            
            plt.figure(figsize=(8, 6))
            bars = plt.bar(team_types, win_rates, color=['#e74c3c', '#3498db'], alpha=0.8)
            plt.title(f'Team Performance: Attacking vs Defending - {row["appVersion"]}')
            plt.ylabel('Win Rate')
            plt.xlabel('Team Role')
            
            # Add value labels on bars
            for bar, rate in zip(bars, win_rates):
                plt.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.01,
                        f'{rate:.1%}', ha='center', va='bottom', fontweight='bold', fontsize=12)
            
            # Add a horizontal line at 50% for reference
            plt.axhline(y=0.5, color='gray', linestyle='--', alpha=0.5, label='50% Balance')
            
            plt.ylim(0, max(win_rates) * 1.15)
            plt.legend()
            plt.tight_layout()
            plt.savefig(f"{OUTPUT_DIR}/team_win_rates_{safe_version}.png", dpi=300, bbox_inches='tight')
            plt.close()
        
        # Note: Human vs AI comparison removed since all players are AI in simulations
    
    print(f"Performance visualizations saved to {OUTPUT_DIR}/")

def main():
    """Main execution function."""
    print("🎮 Tractor AI Performance Report Generator")
    print("=" * 44)
    
    try:
        # Run query
        df = run_query()
        
        if df.empty:
            print("❌ No data found in BigQuery")
            return
        
        # Show basic info
        print(f"📊 Data overview:")
        print(f"   - App versions: {len(df)}")
        print(f"   - Total games: {df['total_games'].sum()}")
        print(f"   - Total rounds: {df['total_rounds'].sum()}")
        
        # Generate report
        report = generate_report(df)
        
        # Use version string in filename if available
        if len(df) > 0:
            safe_version = df.iloc[0]['appVersion'].replace('/', '_').replace('+', '_')
            report_filename = f"kpi_report_{safe_version}.md"
        else:
            report_filename = "kpi_report.md"
            
        report_path = f"{OUTPUT_DIR}/{report_filename}"
        os.makedirs(OUTPUT_DIR, exist_ok=True)
        
        with open(report_path, 'w') as f:
            f.write(report)
        print(f"📄 Report generated: {report_path}")
        
        # Create visualizations
        create_visualizations(df)
        
        print("✅ Performance analysis complete!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        raise

if __name__ == "__main__":
    main()