-- Performance-focused KPI report for Tractor AI simulation logs
-- Focus on win rates, point efficiency, and AI decision effectiveness

-- Basic game performance with attacking/defending team analysis
WITH GameStats AS (
    SELECT 
        appVersion,
        COUNT(DISTINCT gameId) as total_games
    FROM `tractor_analytics.simulation_logs`
    WHERE event = 'game_over'
    GROUP BY appVersion
),

-- Team role analysis from game initialization
TeamRoleStats AS (
    SELECT 
        appVersion,
        COUNT(*) as total_games_with_roles,
        -- Overall attacking team performance across all games
        ROUND(AVG(
            CASE 
                WHEN JSON_VALUE(data, '$.attackingTeam') = JSON_VALUE(go.winner_data, '$.winner') THEN 1.0
                ELSE 0.0
            END
        ), 3) as attacking_team_win_rate,
        -- Overall defending team performance  
        ROUND(AVG(
            CASE 
                WHEN JSON_VALUE(data, '$.defendingTeam') = JSON_VALUE(go.winner_data, '$.winner') THEN 1.0
                ELSE 0.0
            END
        ), 3) as defending_team_win_rate
    FROM `tractor_analytics.simulation_logs` gi
    JOIN (
        SELECT gameId, data as winner_data 
        FROM `tractor_analytics.simulation_logs` 
        WHERE event = 'game_over'
    ) go ON gi.gameId = go.gameId
    WHERE gi.event = 'game_initialized'
    GROUP BY appVersion
),

-- Extract trick details with player positions and performance
TrickPerformance AS (
    SELECT 
        appVersion,
        gameId,
        JSON_VALUE(data, '$.winningPlayer') as winningPlayer,
        CAST(JSON_VALUE(data, '$.trickPoints') AS INT64) as trickPoints,
        data
    FROM `tractor_analytics.simulation_logs`
    WHERE event = 'trick_completed'
        AND JSON_VALUE(data, '$.trickPoints') IS NOT NULL
        AND JSON_QUERY(data, '$.allPlays') IS NOT NULL
),

-- Flatten trick data to get player positions and performance
TrickPositions AS (
    SELECT 
        tp.appVersion,
        tp.gameId,
        tp.winningPlayer,
        tp.trickPoints,
        JSON_VALUE(play, '$.playerId') as playerId,
        -- Position in this specific trick (1-4, based on play order)
        play_offset + 1 as trickPosition,
        -- Check if this player won the trick
        (JSON_VALUE(play, '$.playerId') = tp.winningPlayer) as wonTrick
    FROM TrickPerformance tp,
    UNNEST(JSON_QUERY_ARRAY(tp.data, '$.allPlays')) as play WITH OFFSET play_offset
),

-- Position-based performance metrics
PositionStats AS (
    SELECT 
        appVersion,
        trickPosition,
        COUNT(*) as total_tricks_at_position,
        SUM(CASE WHEN wonTrick THEN 1 ELSE 0 END) as tricks_won_at_position,
        SUM(CASE WHEN wonTrick THEN trickPoints ELSE 0 END) as points_won_at_position,
        -- Win rate for this position
        ROUND(SAFE_DIVIDE(SUM(CASE WHEN wonTrick THEN 1 ELSE 0 END), COUNT(*)), 3) as position_win_rate,
        -- Average points when winning from this position
        ROUND(SAFE_DIVIDE(SUM(CASE WHEN wonTrick THEN trickPoints ELSE 0 END), 
                         SUM(CASE WHEN wonTrick THEN 1 ELSE 0 END)), 2) as avg_points_when_winning,
        -- Average points per round for this position (total points won / total rounds in dataset)
        ROUND(SAFE_DIVIDE(SUM(CASE WHEN wonTrick THEN trickPoints ELSE 0 END), 
                         (SELECT COUNT(*) FROM `tractor_analytics.simulation_logs` WHERE event = 'round_end')), 2) as avg_points_per_round
    FROM TrickPositions
    GROUP BY appVersion, trickPosition
),

-- Player-specific performance (Human vs Bots)
PlayerPerformance AS (
    SELECT 
        appVersion,
        playerId,
        COUNT(*) as total_tricks,
        SUM(CASE WHEN wonTrick THEN 1 ELSE 0 END) as tricks_won,
        SUM(CASE WHEN wonTrick THEN trickPoints ELSE 0 END) as total_points_won,
        ROUND(SAFE_DIVIDE(SUM(CASE WHEN wonTrick THEN 1 ELSE 0 END), COUNT(*)), 3) as player_win_rate,
        ROUND(SAFE_DIVIDE(SUM(CASE WHEN wonTrick THEN trickPoints ELSE 0 END), COUNT(*)), 2) as avg_points_per_trick
    FROM TrickPositions
    GROUP BY appVersion, playerId
),

-- Round efficiency metrics
RoundEfficiency AS (
    SELECT 
        appVersion,
        COUNT(*) as total_rounds,
        AVG(CAST(JSON_VALUE(data, '$.finalPoints') AS INT64)) as avg_final_points,
        ROUND(SAFE_DIVIDE(COUNTIF(JSON_VALUE(data, '$.attackingTeamWon') = 'true'), COUNT(*)), 3) as attacking_round_win_rate
    FROM `tractor_analytics.simulation_logs`
    WHERE event = 'round_end'
        AND JSON_VALUE(data, '$.finalPoints') IS NOT NULL
    GROUP BY appVersion
),

-- AI Decision effectiveness (not just frequency)
AIDecisionEffectiveness AS (
    SELECT 
        appVersion,
        event as eventType,
        JSON_VALUE(data, '$.decisionPoint') as decisionPoint,
        COUNT(*) as usage_count
    FROM `tractor_analytics.simulation_logs`
    WHERE event IN ('ai_leading_decision', 'ai_following_decision')
        AND JSON_VALUE(data, '$.decisionPoint') IS NOT NULL
        AND JSON_VALUE(data, '$.decisionPoint') NOT IN ('leading_play', 'following_play')  -- Filter generic events
    GROUP BY appVersion, event, JSON_VALUE(data, '$.decisionPoint')
    HAVING COUNT(*) >= 100  -- Only show frequently used decisions
),

-- Trump and kitty efficiency
EfficiencyStats AS (
    SELECT 
        appVersion,
        AVG(CAST(JSON_VALUE(data, '$.kittyPoints') AS INT64)) as avg_kitty_points,
        COUNT(*) as kitty_events
    FROM `tractor_analytics.simulation_logs`
    WHERE event = 'kitty_pickup'
        AND JSON_VALUE(data, '$.kittyPoints') IS NOT NULL
    GROUP BY appVersion
)

-- Final performance report
SELECT 
    gs.appVersion,
    gs.total_games,
    trs.attacking_team_win_rate,
    trs.defending_team_win_rate,
    
    -- Round performance
    re.total_rounds,
    ROUND(re.total_rounds / gs.total_games, 1) as avg_rounds_per_game,
    re.avg_final_points,
    re.attacking_round_win_rate,
    
    -- Position-based win rates (pivoted)
    MAX(CASE WHEN ps.trickPosition = 1 THEN ps.position_win_rate ELSE NULL END) as position_1_win_rate,
    MAX(CASE WHEN ps.trickPosition = 2 THEN ps.position_win_rate ELSE NULL END) as position_2_win_rate,
    MAX(CASE WHEN ps.trickPosition = 3 THEN ps.position_win_rate ELSE NULL END) as position_3_win_rate,
    MAX(CASE WHEN ps.trickPosition = 4 THEN ps.position_win_rate ELSE NULL END) as position_4_win_rate,
    
    -- Position-based point efficiency (when winning)
    MAX(CASE WHEN ps.trickPosition = 1 THEN ps.avg_points_when_winning ELSE NULL END) as position_1_avg_points,
    MAX(CASE WHEN ps.trickPosition = 2 THEN ps.avg_points_when_winning ELSE NULL END) as position_2_avg_points,
    MAX(CASE WHEN ps.trickPosition = 3 THEN ps.avg_points_when_winning ELSE NULL END) as position_3_avg_points,
    MAX(CASE WHEN ps.trickPosition = 4 THEN ps.avg_points_when_winning ELSE NULL END) as position_4_avg_points,
    
    -- Position-based total points per round
    MAX(CASE WHEN ps.trickPosition = 1 THEN ps.avg_points_per_round ELSE NULL END) as position_1_points_per_round,
    MAX(CASE WHEN ps.trickPosition = 2 THEN ps.avg_points_per_round ELSE NULL END) as position_2_points_per_round,
    MAX(CASE WHEN ps.trickPosition = 3 THEN ps.avg_points_per_round ELSE NULL END) as position_3_points_per_round,
    MAX(CASE WHEN ps.trickPosition = 4 THEN ps.avg_points_per_round ELSE NULL END) as position_4_points_per_round,
    
    -- Player performance (all AI players)
    ROUND(AVG(pp.player_win_rate), 3) as avg_player_win_rate,
    ROUND(AVG(pp.avg_points_per_trick), 2) as avg_points_per_trick,
    
    -- Efficiency metrics
    es.avg_kitty_points,
    
    -- Top AI decisions (as array for detailed analysis)
    ARRAY_AGG(
        STRUCT<eventType STRING, decisionPoint STRING, count INT64>(
            ade.eventType, ade.decisionPoint, ade.usage_count
        )
    ) as top_ai_decisions

FROM GameStats gs
LEFT JOIN TeamRoleStats trs ON gs.appVersion = trs.appVersion
LEFT JOIN RoundEfficiency re ON gs.appVersion = re.appVersion
LEFT JOIN PositionStats ps ON gs.appVersion = ps.appVersion
LEFT JOIN PlayerPerformance pp ON gs.appVersion = pp.appVersion
LEFT JOIN EfficiencyStats es ON gs.appVersion = es.appVersion
LEFT JOIN AIDecisionEffectiveness ade ON gs.appVersion = ade.appVersion

GROUP BY 
    gs.appVersion, gs.total_games, trs.attacking_team_win_rate, trs.defending_team_win_rate,
    re.total_rounds, re.avg_final_points, re.attacking_round_win_rate,
    es.avg_kitty_points

ORDER BY gs.appVersion;