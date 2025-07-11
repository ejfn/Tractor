#!/usr/bin/env python3
"""
Local KPI report generator for Tractor AI simulation data.
Uses the same report generation logic as the BigQuery version but with local data.
"""

import os
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from local_analyzer import LocalLogAnalyzer

# Use the reports directory within analysis
script_dir = os.path.dirname(__file__)
OUTPUT_DIR = os.path.join(script_dir, "reports")

def generate_report(df):
    """Generate performance-focused markdown report (same as BigQuery version)."""
    if df.empty:
        return "# No data found\n"
    
    lines = []
    lines.append("# 🎮 Tractor AI Performance Report (Local Analysis)\n")
    lines.append(f"**Generated:** {pd.Timestamp.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    lines.append(f"**App Versions:** {len(df)}\n")
    lines.append(f"**Total Games:** {df['total_games'].sum()}\n\n")
    
    for _, row in df.iterrows():
        lines.append(f"## 📊 App Version: `{row['appVersion']}`\n")
        
        # Game performance overview
        lines.append("### 🏆 Game Performance\n")
        lines.append(f"- **Total Games:** {row['total_games']}\n")
        
        if pd.notna(row.get('attacking_team_win_rate')):
            lines.append(f"- **Attacking Team Win Rate:** {row['attacking_team_win_rate']:.1%}\n")
        if pd.notna(row.get('defending_team_win_rate')):
            lines.append(f"- **Defending Team Win Rate:** {row['defending_team_win_rate']:.1%}\n")
        if pd.notna(row.get('total_rounds')):
            lines.append(f"- **Total Rounds:** {row['total_rounds']}\n")
        if pd.notna(row.get('avg_rounds_per_game')):
            lines.append(f"- **Avg Rounds per Game:** {row['avg_rounds_per_game']:.1f}\n")
        if pd.notna(row.get('attacking_round_win_rate')):
            lines.append(f"- **Attacking Round Win Rate:** {row['attacking_round_win_rate']:.1%}\n")
        lines.append("\n")
        
        # Position-based performance analysis
        lines.append("### 🎯 Position Performance (Win Rates)\n")
        pos1_rate = row.get('position_1_win_rate')
        pos2_rate = row.get('position_2_win_rate') 
        pos3_rate = row.get('position_3_win_rate')
        pos4_rate = row.get('position_4_win_rate')
        
        if pd.notna(pos1_rate):
            lines.append(f"- **Leading Player (Pos 1):** {pos1_rate:.1%} win rate\n")
        if pd.notna(pos2_rate):
            lines.append(f"- **2nd Player:** {pos2_rate:.1%} win rate\n")
        if pd.notna(pos3_rate):
            lines.append(f"- **3rd Player:** {pos3_rate:.1%} win rate\n")
        if pd.notna(pos4_rate):
            lines.append(f"- **4th Player:** {pos4_rate:.1%} win rate\n")
        lines.append("\n")
        
        # Total points per round by position
        lines.append("### 🎯 Total Points Collected Per Round (By Position)\n")
        pos1_round_pts = row.get('position_1_points_per_round')
        pos2_round_pts = row.get('position_2_points_per_round')
        pos3_round_pts = row.get('position_3_points_per_round')
        pos4_round_pts = row.get('position_4_points_per_round')
        
        valid_points = [x for x in [pos1_round_pts, pos2_round_pts, pos3_round_pts, pos4_round_pts] if pd.notna(x)]
        total_round_points = sum(valid_points) if valid_points else 0
        
        if pd.notna(pos1_round_pts) and total_round_points > 0:
            lines.append(f"- **Leading Player:** {pos1_round_pts:.1f} points per round ({pos1_round_pts/total_round_points:.1%} of total)\n")
        if pd.notna(pos2_round_pts) and total_round_points > 0:
            lines.append(f"- **2nd Player:** {pos2_round_pts:.1f} points per round ({pos2_round_pts/total_round_points:.1%} of total)\n")
        if pd.notna(pos3_round_pts) and total_round_points > 0:
            lines.append(f"- **3rd Player:** {pos3_round_pts:.1f} points per round ({pos3_round_pts/total_round_points:.1%} of total)\n")
        if pd.notna(pos4_round_pts) and total_round_points > 0:
            lines.append(f"- **4th Player:** {pos4_round_pts:.1f} points per round ({pos4_round_pts/total_round_points:.1%} of total)\n")
        if total_round_points > 0:
            lines.append(f"- **Total Round Points:** {total_round_points:.1f} per round (out of ~200 available)\n")
        lines.append("\n")
        
        # Add charts to the report
        # Remove dev hash from version, only keep base version
        base_version = row['appVersion'].split('+')[0]  # Remove +dev_hash part
        safe_version = base_version.replace('/', '_').replace('+', '_')
        lines.append("## 📊 Performance Visualizations\n\n")
        
        if pd.notna(row.get('attacking_team_win_rate')) and pd.notna(row.get('defending_team_win_rate')):
            lines.append("### Team Performance: Attacking vs Defending\n")
            lines.append(f"![Team Win Rates](team_win_rates_{safe_version}.png)\n\n")
        
        if any(pd.notna(row.get(f'position_{i}_win_rate')) for i in range(1, 5)):
            lines.append("### Position Win Rates\n")
            lines.append(f"![Position Win Rates](position_win_rates_{safe_version}.png)\n\n")
        
        if any(pd.notna(row.get(f'position_{i}_points_per_round')) for i in range(1, 5)):
            lines.append("### Total Points Per Round by Position\n")
            lines.append(f"![Points Per Round](position_points_per_round_{safe_version}.png)\n\n")
        
        # Overall player performance 
        lines.append("### 🎮 Player Performance\n")
        avg_wr = row.get('avg_player_win_rate')
        avg_pts = row.get('avg_points_per_trick')
        
        if pd.notna(avg_wr):
            lines.append(f"- **Average Player Win Rate:** {avg_wr:.1%}\n")
        if pd.notna(avg_pts):
            lines.append(f"- **Average Points per Trick:** {avg_pts:.1f}\n")
        lines.append("\n")
        
        # Efficiency metrics
        lines.append("### 📈 Efficiency Metrics\n")
        if pd.notna(row.get('avg_final_points')):
            lines.append(f"- **Avg Final Points per Round:** {row['avg_final_points']:.1f}\n")
        if pd.notna(row.get('avg_kitty_points')):
            lines.append(f"- **Avg Kitty Points:** {row['avg_kitty_points']:.1f}\n")
        lines.append("\n")
        
        # Most used AI strategies (only frequently used ones)
        lines.append("### 🧠 Most Used AI Strategies\n")
        if row.get('top_ai_decisions') is not None and len(row['top_ai_decisions']) > 0:
            # Group and sort, removing duplicates
            leading_decisions = {}
            following_decisions = {}
            
            for decision in row['top_ai_decisions']:
                if decision['event'] == 'ai_leading_decision':
                    decision_point = decision['decisionPoint']
                    if decision_point not in leading_decisions:
                        leading_decisions[decision_point] = decision['usage_count']
                elif decision['event'] == 'ai_following_decision':
                    decision_point = decision['decisionPoint']
                    if decision_point not in following_decisions:
                        following_decisions[decision_point] = decision['usage_count']
            
            if leading_decisions:
                lines.append("**🎯 Leading Strategies:**\n")
                # Sort by count descending
                sorted_leading = sorted(leading_decisions.items(), key=lambda x: x[1], reverse=True)
                for decision_point, count in sorted_leading[:5]:  # Top 5
                    lines.append(f"- `{decision_point}`: {count:,} uses\n")
            
            if following_decisions:
                lines.append("\n**🤝 Following Strategies:**\n") 
                # Sort by count descending
                sorted_following = sorted(following_decisions.items(), key=lambda x: x[1], reverse=True)
                for decision_point, count in sorted_following[:5]:  # Top 5
                    lines.append(f"- `{decision_point}`: {count:,} uses\n")
        else:
            lines.append("- No frequently used strategies identified\n")
        
        lines.append("\n---\n\n")
    
    return "".join(lines)

def create_visualizations(df):
    """Create performance-focused visualization charts (same as BigQuery version)."""
    if df.empty or len(df) < 1:
        print("Skipping visualizations: insufficient data")
        return
    
    # Ensure output directory exists
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # Set style
    plt.style.use('default')
    sns.set_palette("husl")
    
    for _, row in df.iterrows():
        # Remove dev hash from version, only keep base version
        base_version = row['appVersion'].split('+')[0]  # Remove +dev_hash part
        safe_version = base_version.replace('/', '_').replace('+', '_')
        
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
                     if pd.notna(rate)]
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
        
        valid_round_data = [(pos, pts) for pos, pts in zip(positions, points_per_round) 
                           if pd.notna(pts)]
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
        
        if pd.notna(attacking_rate) and pd.notna(defending_rate):
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
    
    print(f"Performance visualizations saved to {OUTPUT_DIR}/")

def main():
    """Main execution function."""
    print("🎮 Tractor AI Performance Report Generator (Local Analysis)")
    print("=" * 60)
    
    try:
        # Run local analysis
        script_dir = os.path.dirname(__file__)
        project_root = os.path.dirname(script_dir)
        logs_dir = os.path.join(project_root, "logs")
        
        analyzer = LocalLogAnalyzer(logs_dir)
        df = analyzer.generate_final_report()
        
        if df.empty:
            print("❌ No data found in log files")
            return
        
        # Show basic info
        print(f"📊 Data overview:")
        print(f"   - App versions: {len(df)}")
        print(f"   - Total games: {df['total_games'].sum()}")
        if 'total_rounds' in df.columns:
            print(f"   - Total rounds: {df['total_rounds'].sum()}")
        
        # Generate report
        report = generate_report(df)
        
        # Use version string in filename if available
        if len(df) > 0:
            # Remove dev hash from version, only keep base version
            base_version = df.iloc[0]['appVersion'].split('+')[0]  # Remove +dev_hash part
            safe_version = base_version.replace('/', '_').replace('+', '_')
            report_filename = f"kpi_report_local_{safe_version}.md"
        else:
            report_filename = "kpi_report_local.md"
            
        report_path = f"{OUTPUT_DIR}/{report_filename}"
        os.makedirs(OUTPUT_DIR, exist_ok=True)
        
        with open(report_path, 'w') as f:
            f.write(report)
        print(f"📄 Report generated: {report_path}")
        
        # Create visualizations
        create_visualizations(df)
        
        print("✅ Local performance analysis complete!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        raise

if __name__ == "__main__":
    main()