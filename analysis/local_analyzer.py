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
        # Use actual round completion events that exist in logs
        rounds = df[df['event'].isin(['attacking_team_victory', 'defending_team_victory'])].copy()
        
        if rounds.empty:
            return pd.DataFrame()
        
        # Extract round data from the correct data structure
        # For attacking victories: use 'finalPoints'
        # For defending victories: use 'attackingTeamPoints' (how many points attackers got)
        rounds['final_points'] = rounds.apply(lambda row: 
            row['data'].get('finalPoints', 0) if row['event'] == 'attacking_team_victory'
            else row['data'].get('attackingTeamPoints', 0), axis=1
        )
        rounds['attacking_won'] = rounds['event'] == 'attacking_team_victory'
        
        # Calculate attacking winning rounds average
        attacking_wins = rounds[rounds['attacking_won']].copy()
        avg_attacking_win_points = attacking_wins['final_points'].mean() if not attacking_wins.empty else 0
        
        # Calculate defending winning rounds average
        defending_wins = rounds[~rounds['attacking_won']].copy()
        avg_defending_win_points = defending_wins['final_points'].mean() if not defending_wins.empty else 0
        
        result = rounds.groupby('appVersion').agg({
            'gameId': 'count',
            'final_points': 'mean',
            'attacking_won': 'mean'
        }).reset_index()
        
        # Add attacking winning rounds average
        if not attacking_wins.empty:
            attacking_win_avg = attacking_wins.groupby('appVersion')['final_points'].mean().reset_index()
            attacking_win_avg.columns = ['appVersion', 'avg_attacking_win_points']
            result = result.merge(attacking_win_avg, on='appVersion', how='left')
        else:
            result['avg_attacking_win_points'] = 0
            
        # Add defending winning rounds average
        if not defending_wins.empty:
            defending_win_avg = defending_wins.groupby('appVersion')['final_points'].mean().reset_index()
            defending_win_avg.columns = ['appVersion', 'avg_defending_win_points']
            result = result.merge(defending_win_avg, on='appVersion', how='left')
        else:
            result['avg_defending_win_points'] = 0
        
        result.columns = ['appVersion', 'total_rounds', 'avg_final_points', 'attacking_round_win_rate', 'avg_attacking_win_points', 'avg_defending_win_points']
        result['avg_final_points'] = result['avg_final_points'].round(1)
        result['attacking_round_win_rate'] = result['attacking_round_win_rate'].round(3)
        result['avg_attacking_win_points'] = result['avg_attacking_win_points'].round(1)
        result['avg_defending_win_points'] = result['avg_defending_win_points'].round(1)
        
        return result
    
    def analyze_ai_strategic_effectiveness(self, df: pd.DataFrame) -> pd.DataFrame:
        """Analyze AI strategic effectiveness and decision quality."""
        ai_events = df[df['event'].isin(['ai_leading_decision', 'ai_following_decision'])].copy()
        
        if ai_events.empty:
            return pd.DataFrame()
        
        # Extract strategic metrics
        results = []
        for _, row in ai_events.iterrows():
            data = row.get('data', {})
            context = data.get('context', {})
            
            # Basic info
            app_version = row.get('appVersion')
            player = data.get('player')
            decision_point = data.get('decisionPoint')
            
            # Strategic context
            is_attacking = context.get('isAttackingTeam', False)
            trick_position = context.get('trickPosition', 'unknown')
            point_pressure = context.get('pointPressure', 'unknown')
            
            # Decision quality indicators
            reasoning = data.get('reasoning', [])
            score = data.get('score', 0)
            
            results.append({
                'appVersion': app_version,
                'player': player,
                'decision_point': decision_point,
                'is_attacking': is_attacking,
                'trick_position': trick_position,
                'point_pressure': point_pressure,
                'has_reasoning': len(reasoning) > 0,
                'decision_score': score,
                'is_leading': row['event'] == 'ai_leading_decision'
            })
        
        strategic_df = pd.DataFrame(results)
        
        # Calculate strategic effectiveness metrics
        effectiveness = strategic_df.groupby('appVersion').agg({
            'decision_score': 'mean',
            'has_reasoning': 'mean',
            'is_attacking': 'mean',
            'is_leading': 'mean',
            'player': 'count'
        }).round(3).reset_index()
        
        effectiveness.columns = ['appVersion', 'avg_decision_score', 'reasoning_rate', 'attacking_decision_rate', 'leading_decision_rate', 'total_decisions']
        
        # Add position effectiveness
        position_effectiveness = strategic_df.groupby(['appVersion', 'trick_position']).agg({
            'decision_score': 'mean'
        }).reset_index()
        
        position_pivot = position_effectiveness.pivot(index='appVersion', columns='trick_position', values='decision_score')
        
        # Merge position data
        for pos in ['first', 'second', 'third', 'fourth']:
            if pos in position_pivot.columns:
                effectiveness[f'{pos}_position_score'] = effectiveness['appVersion'].map(position_pivot[pos])
        
        return effectiveness
    
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
        ai_strategic = self.analyze_ai_strategic_effectiveness(df)
        
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
            final_report = final_report.merge(round_efficiency[['appVersion', 'total_rounds', 'avg_final_points', 'attacking_round_win_rate', 'avg_attacking_win_points', 'avg_defending_win_points']], 
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
        
        # Player performance averages removed - useless metrics
        # (avg_player_win_rate is always 25%, avg_points_per_trick provides no insight)
        
        # Add efficiency stats
        if not efficiency_stats.empty:
            final_report = final_report.merge(efficiency_stats[['appVersion', 'avg_kitty_points']], 
                                            on='appVersion', how='left')
        
        # Add AI strategic effectiveness metrics
        if not ai_strategic.empty:
            final_report = final_report.merge(ai_strategic[['appVersion', 'avg_decision_score', 'reasoning_rate', 'attacking_decision_rate']], 
                                            on='appVersion', how='left')
        else:
            final_report['avg_decision_score'] = None
            final_report['reasoning_rate'] = None
            final_report['attacking_decision_rate'] = None
        
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