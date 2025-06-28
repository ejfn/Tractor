-- This query generates a KPI report from simulation logs in BigQuery.
-- It aggregates metrics by appVersion.

-- To filter by a specific appVersion or a range of versions, uncomment the WHERE clause
-- at the end of the query and modify it as needed.
-- Examples:
--   WHERE appVersion = 'v1.0.0-beta.5+def5678'
--   WHERE appVersion LIKE 'v1.1.0-dev%'
--   WHERE appVersion IN ('v1.0.0+abc1234', 'v1.0.1+xyz5678')

-- CTE to parse relevant event data from the 'data' JSON field
WITH ParsedEvents AS (
    SELECT
        gameId,
        roundNumber,
        timestamp,
        appVersion,
        event,
        -- Extract trump suit from 'trump_finalized' events
        JSON_VALUE(data, '$.trumpInfo.trumpSuit') AS trumpSuit,
        -- Extract game winner from 'game_over' events
        JSON_VALUE(data, '$.winner') AS gameWinner,
        -- Extract trick winner and points from 'trick_completed' events
        JSON_VALUE(data, '$.winningPlayer') AS trickWinner,
        CAST(JSON_VALUE(data, '$.trickPoints') AS INT64) AS trickPoints,
        -- Extract the 'allPlays' array for later unnesting
        JSON_QUERY(data, '$.allPlays') AS allPlaysJson,
        -- Extract decision point from 'AI' events
        JSON_VALUE(data, '$.decisionPoint') AS decisionPoint,
        -- Extract current team ranks from 'round_preparation_start' events
        JSON_QUERY(data, '$.currentTeamRanks') AS currentTeamRanksJson
    FROM
        `tractor_analytics.simulation_logs`
),
-- CTE to determine attacking/defending teams per game
GameTeams AS (
    SELECT
        gameId,
        MAX(CASE
            WHEN JSON_VALUE(team_rank, '$.isDefending') = 'false' THEN JSON_VALUE(team_rank, '$.teamId')
            ELSE NULL
        END) AS attackingTeamId,
        MAX(CASE
            WHEN JSON_VALUE(team_rank, '$.isDefending') = 'true' THEN JSON_VALUE(team_rank, '$.teamId')
            ELSE NULL
        END) AS defendingTeamId
    FROM
        ParsedEvents,
        UNNEST(JSON_QUERY_ARRAY(currentTeamRanksJson)) AS team_rank
    WHERE
        event = 'round_preparation_start'
    GROUP BY
        gameId
),
-- CTE to process trick details and identify trump plays
TrickDetails AS (
    SELECT
        pe.gameId,
        pe.roundNumber,
        pe.appVersion,
        gt.attackingTeamId,
        gt.defendingTeamId,
        pe.trickWinner,
        pe.trickPoints,
        pe.trumpSuit,
        JSON_VALUE(play, '$.playerId') AS playerId,
        JSON_VALUE(card_str) AS cardString,
        -- Determine if card is trump (assuming 'BigJoker' and 'SmallJoker' are ranks)
        (
            JSON_VALUE(card_str, '$.suit') = pe.trumpSuit OR
            JSON_VALUE(card_str, '$.rank') IN ('BigJoker', 'SmallJoker')
        ) AS isTrumpCard,
        -- Determine player's team based on predefined player IDs
        CASE
            WHEN JSON_VALUE(play, '$.playerId') IN ('human', 'bot2') THEN 'A'
            WHEN JSON_VALUE(play, '$.playerId') IN ('bot1', 'bot3') THEN 'B'
            ELSE NULL
        END AS playerTeamId
    FROM
        ParsedEvents AS pe
    INNER JOIN
        GameTeams AS gt ON pe.gameId = gt.gameId
    CROSS JOIN
        UNNEST(JSON_QUERY_ARRAY(pe.allPlaysJson)) AS play
    CROSS JOIN
        UNNEST(JSON_QUERY_ARRAY(JSON_QUERY(play, '$.cards'))) AS card_str
    WHERE
        pe.event = 'trick_completed'
),
-- CTE to aggregate trick data per game and round
AggregatedTrickStats AS (
    SELECT
        gameId,
        roundNumber,
        appVersion,
        attackingTeamId,
        defendingTeamId,
        SUM(trickPoints) AS totalRoundPoints,
        SUM(CASE WHEN trickWinner = playerId AND isTrumpCard THEN 1 ELSE 0 END) AS trumpWonTricks,
        SUM(CASE WHEN trickWinner = playerId AND isTrumpCard THEN trickPoints ELSE 0 END) AS pointsFromTrumpWins,
        SUM(CASE WHEN isTrumpCard THEN 1 ELSE 0 END) AS totalTrumpCardsPlayed
    FROM
        TrickDetails
    GROUP BY
        gameId, roundNumber, appVersion, attackingTeamId, defendingTeamId
),
-- CTE for game outcomes
GameOutcomes AS (
    SELECT
        gameId,
        appVersion,
        gameWinner
    FROM
        ParsedEvents
    WHERE
        event = 'game_over'
),
-- CTE for decision point frequency
DecisionPointFrequency AS (
    SELECT
        appVersion,
        decisionPoint,
        COUNT(*) AS count
    FROM
        ParsedEvents
    WHERE
        event LIKE 'AI %' AND decisionPoint IS NOT NULL
    GROUP BY
        appVersion, decisionPoint
)
-- Final KPI Calculation
SELECT
    appVersion,
    COUNT(DISTINCT go.gameId) AS total_games,

    -- Win Rates
    SAFE_DIVIDE(SUM(CASE WHEN go.gameWinner = gt.attackingTeamId THEN 1 ELSE 0 END), COUNT(DISTINCT go.gameId)) AS attacking_win_rate,
    SAFE_DIVIDE(SUM(CASE WHEN go.gameWinner = gt.defendingTeamId THEN 1 ELSE 0 END), COUNT(DISTINCT go.gameId)) AS defending_win_rate,
    SAFE_DIVIDE(SUM(CASE WHEN go.gameWinner = 'A' THEN 1 ELSE 0 END), COUNT(DISTINCT go.gameId)) AS team_a_win_rate,
    SAFE_DIVIDE(SUM(CASE WHEN go.gameWinner = 'B' THEN 1 ELSE 0 END), COUNT(DISTINCT go.gameId)) AS team_b_win_rate,

    -- Average Points per Round (Overall)
    SAFE_DIVIDE(SUM(ats.totalRoundPoints), COUNT(DISTINCT ats.gameId, ats.roundNumber)) AS avg_points_per_round,

    -- Trump Efficiency
    SAFE_DIVIDE(SUM(ats.pointsFromTrumpWins), SUM(ats.trumpWonTricks)) AS avg_points_per_trump_won_trick,
    SAFE_DIVIDE(SUM(ats.pointsFromTrumpWins), SUM(ats.totalTrumpCardsPlayed)) AS points_per_trump_card_played,
    SUM(ats.totalTrumpCardsPlayed) AS total_trump_cards_played,

    -- Decision Point Frequency (as an array of structs)
    ARRAY_AGG(STRUCT(dpf.decisionPoint, dpf.count) ORDER BY dpf.decisionPoint) AS decision_point_frequency
FROM
    GameOutcomes AS go
INNER JOIN
    GameTeams AS gt ON go.gameId = gt.gameId
LEFT JOIN
    AggregatedTrickStats AS ats ON go.gameId = ats.gameId AND go.appVersion = ats.appVersion
LEFT JOIN
    DecisionPointFrequency AS dpf ON go.appVersion = dpf.appVersion
-- WHERE go.appVersion = 'your_app_version_here' -- Uncomment and modify to filter by appVersion
GROUP BY
    appVersion
ORDER BY
    appVersion;