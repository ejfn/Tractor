# Log Event Schema Documentation

This document outlines the structure of various event types logged in the AI simulation, detailing the JSON paths and expected data types for key fields within the `data` payload of each event. This schema serves as a reference for accurate data parsing and analysis in the local analysis pipeline.

## Common Log Entry Fields

All log entries share these top-level fields:

- `timestamp` (string): ISO 8601 formatted timestamp of the log entry.
- `level` (string): The log level (e.g., "INFO", "DEBUG", "WARN", "ERROR").
- `event` (string): A descriptive name for the event being logged.
- `sequenceNumber` (integer): The sequential number of the log entry within its file.
- `appVersion` (string): The version of the application that generated the log.
- `gameId` (string): A unique identifier for the game session.
- `message` (string): A human-readable summary of the event.
- `data` (JSON object): The event-specific payload, whose structure varies by `event` type.

---

## Event-Specific Data Payloads

### 1. `game_initialized`

**Purpose**: Marks the start of a new game round.

**`data` fields**:
- `round_number` (integer): `$.roundNumber`
- `defending_team` (string): `$.defendingTeam`
- `attacking_team` (string): `$.attackingTeam`
- `round_starting_player` (string): `$.roundStartingPlayer`
- `trump_rank` (string): `$.trumpRank`
- `team_ranks` (JSON array): `$.teamRanks`
- `deck_size` (integer): `$.deckSize`

### 2. `trump_finalized`

**Purpose**: Records the final trump suit and rank for a round.

**`data` fields**:
- `trump_suit` (string): `$.trumpInfo.trumpSuit`

### 3. `game_over`

**Purpose**: Indicates the end of a game.

**`data` fields**:
- `winner` (string): `$.winner` (Team ID)

### 4. `trick_completed`

**Purpose**: Records the outcome of a completed trick.

**`data` fields**:
- `winning_player` (string): `$.winningPlayer` (Player ID)
- `trick_points` (integer): `$.trickPoints`
- `all_plays` (JSON array): `$.allPlays`
  - Each element in `all_plays` is a JSON object representing a player's play, containing:
    - `player_id` (string): `$.playerId`
    - `cards` (JSON array): `$.cards`
      - Each element in `cards` is a JSON string representing a card (e.g., `"S-A"` for Ace of Spades).
- `trick_type` (string): `$.trickType` (e.g., "single", "pair", "tractor", "multi-combo")

### 5. `trump_declared`

**Purpose**: Captures details when a player declares trump during dealing.

**`data` fields**:
- `player_id` (string): `$.playerId` (Player ID of the declarer)

### 6. `kitty_pickup`

**Purpose**: Records the points in the kitty when it's picked up.

**`data` fields**:
- `kitty_points` (integer): `$.kittyPoints`

### 7. `kitty_swap_completed`

**Purpose**: Records the points of cards put back into the kitty after a swap.

**`data` fields**:
- `selected_card_points` (integer): `$.selectedCardPoints`

### 8. `round_preparation_start`

**Purpose**: Marks the beginning of round preparation.

**`data` fields**:
- `current_team_ranks` (JSON array): `$.currentTeamRanks`
  - Each element in `current_team_ranks` is a JSON object representing a team's rank, containing:
    - `is_defending` (boolean): `$.isDefending`
    - `team_id` (string): `$.teamId`

### 9. `ai_leading_decision`

**Purpose**: Captures the AI's strategic decision when leading a trick.

**`data` fields**:
- `decision_point` (string): `$.decisionPoint` (specific AI strategy, e.g., "lead_multi_combo", "lead_early_game_ace", "lead_void_exploitation", "lead_point_timing", "lead_guaranteed_winner", "lead_historical_insights")
- `player` (string): `$.player` (AI Player ID making the decision)
- `decision` (JSON array): `$.decision` (cards selected for the leading play)
- `context` (JSON object): `$.context` (strategic context)
  - `trick_position` (string): `$.trickPosition`
  - `point_pressure` (string): `$.pointPressure`
  - `play_style` (string): `$.playStyle`
  - `trump_exhaustion` (float): `$.memoryContext.trumpExhaustion` (when available)
  - `uncertainty_level` (float): `$.memoryContext.uncertaintyLevel` (when available)

### 10. `ai_following_decision`

**Purpose**: Captures the AI's strategic decision when following in a trick.

**`data` fields**:
- `decision_point` (string): `$.decisionPoint` (specific AI strategy, e.g., "analysis_start", "follow_multi_combo", "follow_teammate_winning", "follow_suit_establishment", "follow_opponent_blocking", "follow_trick_contention", "follow_strategic_disposal", "teammate_winning_second_player", "teammate_winning_third_player", "second_player_same_suit", "second_player_trump", "strategic_disposal_start")
- `player` (string): `$.player` (AI Player ID making the decision)
- `decision` (JSON array): `$.decision` (cards selected for the following play)
- `context` (JSON object): `$.context` (strategic context)
  - `trick_position` (string): `$.trickPosition`
  - `is_teammate_winning` (boolean): `$.isTeammateWinning`
  - `is_opponent_winning` (boolean): `$.isOpponentWinning`
  - `can_beat_current_winner` (boolean): `$.canBeatCurrentWinner`
  - `trick_points` (integer): `$.trickPoints`
- Additional context-specific fields based on `decision_point`:
  - For "second_player_trump": `strategy` (string), `point_potential` (integer)
  - For "teammate_winning_third_player": `should_contribute` (boolean)
  - For "strategic_disposal_start": `combo_count` (integer), `cards_remaining` (integer)

### 11. `round_complete`

**Purpose**: Indicates the completion of a game round.

**`data` fields**:
- `winning_team_id` (string): `$.winningTeamId`
- `attacking_team_points` (integer): `$.attackingTeamPoints`
- `defending_team_points` (integer): `$.defendingTeamPoints`

---

## Future Updates

This schema will be updated as new event types are introduced or existing event structures evolve.