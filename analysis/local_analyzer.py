#!/usr/bin/env python3
"""
Local KPI report generator for Tractor AI simulation data.
Processes JSON log files locally instead of using BigQuery.
"""

import os
import json
import pandas as pd
import duckdb

class LocalLogAnalyzer:
    def __init__(self, logs_directory: str):
        self.logs_dir = logs_directory
        self.conn = duckdb.connect()
        
    def load_logs(self) -> pd.DataFrame:
        """Load all JSON log files into a pandas DataFrame."""
        all_logs = []
        
        # Process all .log files in the directory
        for filename in os.listdir(self.logs_dir):
            if filename.endswith('.log'):
                filepath = os.path.join(self.logs_dir, filename)
                with open(filepath, 'r') as f:
                    for line in f:
                        try:
                            log_entry = json.loads(line.strip())
                            all_logs.append(log_entry)
                        except json.JSONDecodeError:
                            continue  # Skip malformed lines
        
        df = pd.DataFrame(all_logs)
        print(f"Loaded {len(df)} log entries from {len([f for f in os.listdir(self.logs_dir) if f.endswith('.log')])} files")
        return df
    
    def analyze_game_stats(self, df: pd.DataFrame) -> pd.DataFrame:
        """Equivalent to GameStats CTE."""
        query = """
        SELECT 
            appVersion,
            COUNT(DISTINCT gameId) as total_games
        FROM df
        WHERE event = 'game_over'
        GROUP BY appVersion
        """
        return self.conn.execute(query).df()
    
    def analyze_team_roles(self, df: pd.DataFrame) -> pd.DataFrame:
        """Equivalent to TeamRoleStats CTE."""
        # First get game initialization data
        game_init = df[df['event'] == 'game_initialized'].copy()
        game_over = df[df['event'] == 'game_over'].copy()
        
        # Extract team data from JSON
        game_init['attacking_team'] = game_init['data'].apply(lambda x: x.get('attackingTeam'))
        game_init['defending_team'] = game_init['data'].apply(lambda x: x.get('defendingTeam'))
        game_over['winner'] = game_over['data'].apply(lambda x: x.get('winner'))
        
        # Merge initialization and game over data
        merged = game_init.merge(game_over[['gameId', 'winner']], on='gameId', how='inner')
        
        # Calculate win rates
        merged['attacking_won'] = (merged['attacking_team'] == merged['winner']).astype(int)
        merged['defending_won'] = (merged['defending_team'] == merged['winner']).astype(int)
        
        result = merged.groupby('appVersion').agg({
            'gameId': 'count',
            'attacking_won': 'mean',
            'defending_won': 'mean'
        }).reset_index()
        
        result.columns = ['appVersion', 'total_games_with_roles', 'attacking_team_win_rate', 'defending_team_win_rate']
        result['attacking_team_win_rate'] = result['attacking_team_win_rate'].round(3)
        result['defending_team_win_rate'] = result['defending_team_win_rate'].round(3)
        
        return result
    
    def analyze_trick_performance(self, df: pd.DataFrame) -> pd.DataFrame:
        """Equivalent to TrickPerformance and TrickPositions CTEs."""
        tricks = df[df['event'] == 'trick_completed'].copy()
        
        # Extract trick data
        tricks['winningPlayer'] = tricks['data'].apply(lambda x: x.get('winningPlayer'))
        tricks['trickPoints'] = tricks['data'].apply(lambda x: x.get('trickPoints', 0))
        tricks['allPlays'] = tricks['data'].apply(lambda x: x.get('allPlays', []))
        
        # Flatten trick positions
        position_data = []
        for _, row in tricks.iterrows():
            all_plays = row['allPlays']
            if all_plays:
                for i, play in enumerate(all_plays):
                    position_data.append({
                        'appVersion': row['appVersion'],
                        'gameId': row['gameId'],
                        'winningPlayer': row['winningPlayer'],
                        'trickPoints': row['trickPoints'],
                        'playerId': play.get('playerId'),
                        'trickPosition': i + 1,
                        'wonTrick': play.get('playerId') == row['winningPlayer']
                    })
        
        return pd.DataFrame(position_data)
    
    def analyze_position_stats(self, trick_positions: pd.DataFrame) -> pd.DataFrame:
        """Equivalent to PositionStats CTE."""
        if trick_positions.empty:
            return pd.DataFrame()
            
        # Get total rounds for points per round calculation
        # We'll approximate this as total tricks / 4 (since each round has multiple tricks)
        total_rounds_approx = len(trick_positions) / 4 / len(trick_positions['appVersion'].unique()) if not trick_positions.empty else 1
        
        result = trick_positions.groupby(['appVersion', 'trickPosition']).agg({
            'wonTrick': ['count', 'sum'],
            'trickPoints': lambda x: (x * trick_positions.loc[x.index, 'wonTrick']).sum()
        }).reset_index()
        
        # Flatten column names
        result.columns = ['appVersion', 'trickPosition', 'total_tricks_at_position', 'tricks_won_at_position', 'points_won_at_position']
        
        # Calculate derived metrics
        result['position_win_rate'] = (result['tricks_won_at_position'] / result['total_tricks_at_position']).round(3)
        result['avg_points_when_winning'] = (result['points_won_at_position'] / result['tricks_won_at_position'].replace(0, 1)).round(2)
        result['avg_points_per_round'] = (result['points_won_at_position'] / total_rounds_approx).round(2)
        
        return result
    
    def analyze_player_performance(self, trick_positions: pd.DataFrame) -> pd.DataFrame:
        """Equivalent to PlayerPerformance CTE."""
        if trick_positions.empty:
            return pd.DataFrame()
            
        result = trick_positions.groupby(['appVersion', 'playerId']).agg({
            'wonTrick': ['count', 'sum'],
            'trickPoints': lambda x: (x * trick_positions.loc[x.index, 'wonTrick']).sum()
        }).reset_index()
        
        # Flatten column names
        result.columns = ['appVersion', 'playerId', 'total_tricks', 'tricks_won', 'total_points_won']
        
        # Calculate derived metrics
        result['player_win_rate'] = (result['tricks_won'] / result['total_tricks']).round(3)
        result['avg_points_per_trick'] = (result['total_points_won'] / result['total_tricks']).round(2)
        
        return result
    
    def analyze_round_efficiency(self, df: pd.DataFrame) -> pd.DataFrame:
        """Equivalent to RoundEfficiency CTE."""
        rounds = df[df['event'] == 'round_complete'].copy()
        
        if rounds.empty:
            # Fallback: use available data
            rounds = df[df['event'].isin(['round_end', 'game_over'])].copy()
        
        if rounds.empty:
            return pd.DataFrame()
        
        # Extract round data
        rounds['attacking_team_points'] = rounds['data'].apply(lambda x: x.get('attackingTeamPoints', 0))
        rounds['defending_team_points'] = rounds['data'].apply(lambda x: x.get('defendingTeamPoints', 0))
        rounds['final_points'] = rounds['attacking_team_points'] + rounds['defending_team_points']
        rounds['attacking_won'] = rounds['data'].apply(lambda x: x.get('attackingTeamPoints', 0) >= 80)
        
        result = rounds.groupby('appVersion').agg({
            'gameId': 'count',
            'final_points': 'mean',
            'attacking_won': 'mean'
        }).reset_index()
        
        result.columns = ['appVersion', 'total_rounds', 'avg_final_points', 'attacking_round_win_rate']
        result['avg_final_points'] = result['avg_final_points'].round(1)
        result['attacking_round_win_rate'] = result['attacking_round_win_rate'].round(3)
        
        return result
    
    def analyze_ai_decisions(self, df: pd.DataFrame) -> pd.DataFrame:
        """Equivalent to AIDecisionEffectiveness CTE."""
        ai_events = df[df['event'].isin(['ai_leading_decision', 'ai_following_decision'])].copy()
        
        if ai_events.empty:
            return pd.DataFrame()
        
        # Extract decision points
        ai_events['decisionPoint'] = ai_events['data'].apply(lambda x: x.get('decisionPoint'))
        ai_events = ai_events.dropna(subset=['decisionPoint'])
        
        # Filter out generic events and low frequency
        ai_events = ai_events[~ai_events['decisionPoint'].isin(['leading_play', 'following_play'])]
        
        result = ai_events.groupby(['appVersion', 'event', 'decisionPoint']).size().reset_index(name='usage_count')
        result = result[result['usage_count'] >= 10]  # Lower threshold for local analysis
        
        return result
    
    def analyze_efficiency_stats(self, df: pd.DataFrame) -> pd.DataFrame:
        """Equivalent to EfficiencyStats CTE."""
        kitty_events = df[df['event'] == 'kitty_pickup'].copy()
        
        if kitty_events.empty:
            return pd.DataFrame()
        
        kitty_events['kitty_points'] = kitty_events['data'].apply(lambda x: x.get('kittyPoints', 0))
        
        result = kitty_events.groupby('appVersion').agg({
            'kitty_points': 'mean',
            'gameId': 'count'
        }).reset_index()
        
        result.columns = ['appVersion', 'avg_kitty_points', 'kitty_events']
        result['avg_kitty_points'] = result['avg_kitty_points'].round(2)
        
        return result
    
    def generate_final_report(self) -> pd.DataFrame:
        """Generate the complete KPI report equivalent to the BigQuery version."""
        print("Loading log files...")
        df = self.load_logs()
        
        if df.empty:
            print("No log data found!")
            return pd.DataFrame()
        
        print("Analyzing game statistics...")
        game_stats = self.analyze_game_stats(df)
        
        print("Analyzing team performance...")
        team_roles = self.analyze_team_roles(df)
        
        print("Analyzing trick performance...")
        trick_positions = self.analyze_trick_performance(df)
        
        print("Analyzing position statistics...")
        position_stats = self.analyze_position_stats(trick_positions)
        
        print("Analyzing player performance...")
        player_performance = self.analyze_player_performance(trick_positions)
        
        print("Analyzing round efficiency...")
        round_efficiency = self.analyze_round_efficiency(df)
        
        print("Analyzing AI decisions...")
        ai_decisions = self.analyze_ai_decisions(df)
        
        print("Analyzing efficiency metrics...")
        efficiency_stats = self.analyze_efficiency_stats(df)
        
        # Merge all data together
        final_report = game_stats.copy()
        
        # Add team role stats
        if not team_roles.empty:
            final_report = final_report.merge(team_roles[['appVersion', 'attacking_team_win_rate', 'defending_team_win_rate']], 
                                            on='appVersion', how='left')
        
        # Add round efficiency
        if not round_efficiency.empty:
            final_report = final_report.merge(round_efficiency[['appVersion', 'total_rounds', 'avg_final_points', 'attacking_round_win_rate']], 
                                            on='appVersion', how='left')
            final_report['avg_rounds_per_game'] = (final_report['total_rounds'] / final_report['total_games']).round(1)
        
        # Add position stats (pivot to match BigQuery format)
        if not position_stats.empty:
            position_pivot = position_stats.pivot(index='appVersion', columns='trickPosition', 
                                                values=['position_win_rate', 'avg_points_when_winning', 'avg_points_per_round'])
            
            # Flatten column names
            for metric in ['position_win_rate', 'avg_points_when_winning', 'avg_points_per_round']:
                for pos in [1, 2, 3, 4]:
                    col_name = f'position_{pos}_{metric.replace("position_", "").replace("avg_points_when_winning", "avg_points").replace("avg_points_per_round", "points_per_round")}'
                    if (metric, pos) in position_pivot.columns:
                        final_report[col_name] = final_report['appVersion'].map(position_pivot[(metric, pos)])
        
        # Add player performance averages
        if not player_performance.empty:
            player_avg = player_performance.groupby('appVersion').agg({
                'player_win_rate': 'mean',
                'avg_points_per_trick': 'mean'
            }).round(3)
            final_report = final_report.merge(player_avg, on='appVersion', how='left')
            final_report.rename(columns={
                'player_win_rate': 'avg_player_win_rate',
                'avg_points_per_trick': 'avg_points_per_trick'
            }, inplace=True)
        
        # Add efficiency stats
        if not efficiency_stats.empty:
            final_report = final_report.merge(efficiency_stats[['appVersion', 'avg_kitty_points']], 
                                            on='appVersion', how='left')
        
        # Add AI decisions as structured data
        if not ai_decisions.empty:
            # Suppress the FutureWarning for now
            import warnings
            with warnings.catch_warnings():
                warnings.simplefilter("ignore", FutureWarning)
                ai_decisions_grouped = ai_decisions.groupby('appVersion').apply(
                    lambda x: x[['event', 'decisionPoint', 'usage_count']].to_dict('records')
                ).reset_index(name='top_ai_decisions')
            final_report = final_report.merge(ai_decisions_grouped, on='appVersion', how='left')
        else:
            final_report['top_ai_decisions'] = None
        
        print(f"Analysis complete! Generated report for {len(final_report)} app versions.")
        return final_report

def main():
    """Main execution function for local analysis."""
    script_dir = os.path.dirname(__file__)
    project_root = os.path.dirname(script_dir)
    logs_dir = os.path.join(project_root, "logs")
    
    if not os.path.exists(logs_dir):
        print(f"❌ Logs directory not found: {logs_dir}")
        return
    
    analyzer = LocalLogAnalyzer(logs_dir)
    report_df = analyzer.generate_final_report()
    
    if report_df.empty:
        print("❌ No data to analyze")
        return
    
    # Save the raw data for use by the report generator
    output_file = os.path.join(script_dir, "local_analysis_results.csv")
    report_df.to_csv(output_file, index=False)
    print(f"📄 Analysis results saved to: {output_file}")
    
    return report_df

if __name__ == "__main__":
    main()