# Log Event Reference

Game logs are newline-delimited JSON, one object per event. **The authoritative, current
field set for any event is its `gameLogger` call site in `src/`** — this is an
analysis-oriented index, not an exhaustive schema. JSON keys are camelCase.

## Common envelope

Every entry has: `timestamp`, `level` (INFO / DEBUG / WARN / ERROR), `event`,
`sequenceNumber`, `appVersion`, `gameId`, `message`, and an event-specific `data` object.

Cards appear in display notation: `A♠`, `10♦`, `K♥`, and `BJ` / `SJ` for the jokers.

## Round lifecycle

- **`game_initialized`** (once, round 1) and **`round_start`** (every round): `roundNumber`,
  `defendingTeam`, `attackingTeam`, `roundStartingPlayer`, `trumpRank`, `teamRanks`
  (`game_initialized` also carries `deckSize`). `round_preparation_start` /
  `round_preparation_completed` bracket the per-round preparation step.
- **`trump_finalized`**: `finalDeclaration`, `trumpInfo`. **`trump_declared`**: `playerId`
  (plus declaration detail).
- **`round_end`**: `roundNumber`, `attackingTeamWon`, `finalPoints`, `gameOver`,
  `gameWinner`, `rankChanges`, `defendingTeam`, `attackingTeam`, `teamPointsAfter`.
- **`game_over`**: `winner`, `roundNumber`, `finalPoints`, `trickPoints`, `kittyBonus`,
  `winCondition`.

## Play

- **`card_play`**: `playerId`, `isHuman`, `cardsPlayed`, `cardsPlayedCount`,
  `handSizeBefore`, `handSizeAfter`, `trickNumber`, `roundNumber`, `currentTrickState`.
- **`trick_completed`**: `trickNumber`, `winningPlayer`, `trickPoints`, `isFinalTrick`,
  `allPlays` (`[{ playerId, cards }]`), `roundNumber`.
- **`kitty_pickup`** / **`kitty_swap_completed`** (DEBUG): `kittyPoints` /
  `selectedCardPoints` (the latter only when player hands are included in logs).

## AI decisions

- **`ai_leading_decision`** / **`ai_following_decision`** (DEBUG): `decisionPoint`,
  `player`, `decision`. Async variants (`*_async`) carry the same fields. Richer strategic
  context is emitted as separate DEBUG events by the strategy modules.

## LLM layer (only when the optional LLM players are enabled)

- **`llm_decision_success`**: `playerId`, `reasoning`, `play`, `attempts`.
- **`llm_adaptive_shortcut_*`** (`lead_ace`, `lead_unbeatable`, `lead_single_candidate`,
  `follow_multi_combo`, `follow_hand_size`, `follow_forced_suit`, `follow_single_combo`):
  `playerId`, `play` — a forced/obvious play made without calling the model.
- **Retry / rejection** (WARN): `llm_json_parse_failed`, `llm_invalid_format_keys`,
  `llm_card_mapping_failed`, `llm_decision_invalid_rule`.
- **Fallback** (ERROR): `llm_retries_exhausted`, `llm_fallback_triggered`.
- **API transport**: `llm_api_call_start` / `llm_api_call_success` (INFO), plus the
  `llm_api_*` error events (ERROR).
