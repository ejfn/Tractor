-- BigQuery analysis query for Tractor AI performance data
-- Generates comprehensive KPI reports from game logs

WITH
-- Parse JSON data into structured format
ParsedLogs AS (
    SELECT 
        timestamp,
        level,
        event,
        gameId,
        appVersion,
        JSON_EXTRACT_SCALAR(data, '$.attackingTeam') AS attacking_team,
        JSON_EXTRACT_SCALAR(data, '$.defendingTeam') AS defending_team,
        JSON_EXTRACT_SCALAR(data, '$.winner') AS winner,
        JSON_EXTRACT_SCALAR(data, '$.winningPlayer') AS winning_player,
        JSON_EXTRACT_SCALAR(data, '$.trickPoints') AS trick_points_str,
        JSON_EXTRACT_SCALAR(data, '$.finalPoints') AS final_points_str,
        JSON_EXTRACT_SCALAR(data, '$.attackingTeamPoints') AS attacking_team_points_str,
        JSON_EXTRACT_SCALAR(data, '$.kittyPoints') AS kitty_points_str,
        JSON_EXTRACT_SCALAR(data, '$.player') AS player,
        JSON_EXTRACT_SCALAR(data, '$.score') AS decision_score_str,
        JSON_EXTRACT_SCALAR(data, '$.reasoning') AS reasoning,
        JSON_EXTRACT(data, '$.allPlays') AS all_plays,
        JSON_EXTRACT(data, '$.context') AS context
    FROM `{full_table_id}`
    WHERE appVersion IS NOT NULL
),

-- Game Statistics
GameStats AS (
    SELECT 
        appVersion,
        COUNT(DISTINCT gameId) as total_games
    FROM ParsedLogs
    WHERE event = 'game_over'
    GROUP BY appVersion
),

-- Team Role Statistics (get team data from game_initialized, winner from game_over)
TeamRoleStats AS (
    SELECT 
        gi.appVersion,
        COUNT(*) as total_games_with_roles,
        AVG(CASE WHEN gi.attacking_team = go.winner THEN 1.0 ELSE 0.0 END) as attacking_team_win_rate,
        AVG(CASE WHEN gi.defending_team = go.winner THEN 1.0 ELSE 0.0 END) as defending_team_win_rate
    FROM (
        SELECT 
            appVersion,
            gameId,
            JSON_EXTRACT_SCALAR(data, '$.attackingTeam') AS attacking_team,
            JSON_EXTRACT_SCALAR(data, '$.defendingTeam') AS defending_team
        FROM `{full_table_id}`
        WHERE event = 'game_initialized'
            AND JSON_EXTRACT_SCALAR(data, '$.attackingTeam') IS NOT NULL 
            AND JSON_EXTRACT_SCALAR(data, '$.defendingTeam') IS NOT NULL
    ) gi
    INNER JOIN (
        SELECT 
            gameId,
            JSON_EXTRACT_SCALAR(data, '$.winner') AS winner
        FROM `{full_table_id}`
        WHERE event = 'game_over' 
            AND JSON_EXTRACT_SCALAR(data, '$.winner') IS NOT NULL
    ) go ON gi.gameId = go.gameId
    GROUP BY gi.appVersion
),

-- Round Efficiency
RoundEfficiency AS (
    SELECT 
        appVersion,
        COUNT(*) as total_rounds,
        AVG(SAFE_CAST(final_points_str AS FLOAT64)) as avg_final_points,
        AVG(CASE WHEN event = 'attacking_team_victory' THEN 1.0 ELSE 0.0 END) as attacking_round_win_rate,
        AVG(CASE WHEN event = 'attacking_team_victory' 
            THEN SAFE_CAST(final_points_str AS FLOAT64) 
            ELSE NULL END) as avg_attacking_win_points,
        AVG(CASE WHEN event = 'defending_team_victory' 
            THEN SAFE_CAST(attacking_team_points_str AS FLOAT64) 
            ELSE NULL END) as avg_defending_win_points
    FROM ParsedLogs
    WHERE event IN ('attacking_team_victory', 'defending_team_victory')
    GROUP BY appVersion
),

-- Trick Performance (flattened from JSON)
TrickPerformance AS (
    SELECT 
        appVersion,
        gameId,
        JSON_EXTRACT_SCALAR(data, '$.winningPlayer') AS winning_player,
        SAFE_CAST(JSON_EXTRACT_SCALAR(data, '$.trickPoints') AS INT64) as trick_points,
        JSON_EXTRACT_SCALAR(play, '$.playerId') AS player_id,
        -- Use array position + 1 for trick position (BigQuery OFFSET starts at 0)
        play_offset + 1 AS trick_position
    FROM `{full_table_id}`,
    UNNEST(JSON_EXTRACT_ARRAY(JSON_EXTRACT(data, '$.allPlays'))) AS play WITH OFFSET AS play_offset
    WHERE event = 'trick_completed' 
        AND JSON_EXTRACT(data, '$.allPlays') IS NOT NULL
),

-- Position Statistics
PositionStats AS (
    SELECT 
        appVersion,
        trick_position,
        COUNT(*) as total_tricks_at_position,
        SUM(CASE WHEN player_id = winning_player THEN 1 ELSE 0 END) as tricks_won_at_position,
        SUM(CASE WHEN player_id = winning_player THEN trick_points ELSE 0 END) as points_won_at_position,
        SAFE_DIVIDE(
            SUM(CASE WHEN player_id = winning_player THEN 1 ELSE 0 END),
            COUNT(*)
        ) as position_win_rate,
        SAFE_DIVIDE(
            SUM(CASE WHEN player_id = winning_player THEN trick_points ELSE 0 END),
            SUM(CASE WHEN player_id = winning_player THEN 1 ELSE 0 END)
        ) as avg_points_when_winning
    FROM TrickPerformance
    WHERE trick_position BETWEEN 1 AND 4
    GROUP BY appVersion, trick_position
),

-- Calculate points per round for positions
PositionPointsPerRound AS (
    SELECT 
        p.appVersion,
        p.trick_position,
        p.position_win_rate,
        p.avg_points_when_winning,
        SAFE_DIVIDE(p.points_won_at_position, r.total_rounds) as avg_points_per_round
    FROM PositionStats p
    LEFT JOIN RoundEfficiency r ON p.appVersion = r.appVersion
),

-- AI Strategic Effectiveness
AIStrategicEffectiveness AS (
    SELECT 
        appVersion,
        AVG(SAFE_CAST(decision_score_str AS FLOAT64)) as avg_decision_score,
        AVG(CASE WHEN reasoning IS NOT NULL AND reasoning != '[]' THEN 1.0 ELSE 0.0 END) as reasoning_rate,
        AVG(CASE WHEN JSON_EXTRACT_SCALAR(context, '$.isAttackingTeam') = 'true' THEN 1.0 ELSE 0.0 END) as attacking_decision_rate
    FROM ParsedLogs
    WHERE event IN ('ai_leading_decision', 'ai_following_decision')
        AND decision_score_str IS NOT NULL
    GROUP BY appVersion
),

-- Efficiency Stats
EfficiencyStats AS (
    SELECT 
        appVersion,
        AVG(SAFE_CAST(kitty_points_str AS FLOAT64)) as avg_kitty_points
    FROM ParsedLogs
    WHERE event = 'kitty_pickup' AND kitty_points_str IS NOT NULL
    GROUP BY appVersion
)

-- Final aggregated report
SELECT 
    g.appVersion,
    g.total_games,
    tr.attacking_team_win_rate,
    tr.defending_team_win_rate,
    re.total_rounds,
    SAFE_DIVIDE(re.total_rounds, g.total_games) as avg_rounds_per_game,
    re.avg_final_points,
    re.attacking_round_win_rate,
    re.avg_attacking_win_points,
    re.avg_defending_win_points,
    
    -- Position 1 (Leading player)
    pos1.position_win_rate as position_1_win_rate,
    pos1.avg_points_when_winning as position_1_avg_points,
    pos1.avg_points_per_round as position_1_points_per_round,
    
    -- Position 2
    pos2.position_win_rate as position_2_win_rate,
    pos2.avg_points_when_winning as position_2_avg_points,
    pos2.avg_points_per_round as position_2_points_per_round,
    
    -- Position 3
    pos3.position_win_rate as position_3_win_rate,
    pos3.avg_points_when_winning as position_3_avg_points,
    pos3.avg_points_per_round as position_3_points_per_round,
    
    -- Position 4
    pos4.position_win_rate as position_4_win_rate,
    pos4.avg_points_when_winning as position_4_avg_points,
    pos4.avg_points_per_round as position_4_points_per_round,
    
    -- Efficiency metrics
    ef.avg_kitty_points,
    
    -- AI strategic metrics
    ai.avg_decision_score,
    ai.reasoning_rate,
    ai.attacking_decision_rate
    
FROM GameStats g
LEFT JOIN TeamRoleStats tr ON g.appVersion = tr.appVersion
LEFT JOIN RoundEfficiency re ON g.appVersion = re.appVersion
LEFT JOIN PositionPointsPerRound pos1 ON g.appVersion = pos1.appVersion AND pos1.trick_position = 1
LEFT JOIN PositionPointsPerRound pos2 ON g.appVersion = pos2.appVersion AND pos2.trick_position = 2
LEFT JOIN PositionPointsPerRound pos3 ON g.appVersion = pos3.appVersion AND pos3.trick_position = 3
LEFT JOIN PositionPointsPerRound pos4 ON g.appVersion = pos4.appVersion AND pos4.trick_position = 4
LEFT JOIN EfficiencyStats ef ON g.appVersion = ef.appVersion
LEFT JOIN AIStrategicEffectiveness ai ON g.appVersion = ai.appVersion
ORDER BY g.appVersion
