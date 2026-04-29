# LLM-Driven AI Decisions via OpenRouter

Replace the purely algorithmic AI move selection with LLM API calls (OpenRouter) while keeping the existing rule-based code to generate a **ranked list of candidate options** that the LLM chooses from. Fallback to the existing algorithmic choice if the API call fails or times out.

---

## Overview

The current flow:
```
useAITurns → getAIMove() → makeAIPlay() → selectLeadingPlay / selectFollowingPlay → Card[]
```

Proposed flow:
```
useAITurns → getAIMove() [async] → makeLLMAIPlay(gameState, player, config, signal)
                                    ├── build candidate list (existing code)
                                    ├── build full-context prompt from gameState
                                    ├── call OpenRouter API (single stateless call)
                                    ├── parse response integer → pick candidate
                                    └── fallback to algorithmic best on error/timeout
```

The LLM only **picks** from the pre-validated candidate list — it never invents an illegal play. Each call is fully stateless: the complete game context (play history, player memory, hand, trick, candidates) is included in the prompt, reconstructed from `gameState` and `MemoryContext` which already track everything.

---

## User Review Required

> [!IMPORTANT]
> **API Key Storage**: The OpenRouter API key must be stored securely. On mobile (Expo), the safest approach is to store it in `expo-constants` via `app.json` `extra` field (injected at build time from an environment variable), which means the key is baked into the app bundle. This is acceptable for personal use / development but not suitable for a public release. Please confirm if this is fine for your use case.

> [!IMPORTANT]
> **Performance / Latency**: LLM API calls add ~500ms–3s latency per AI turn. The existing `AI_MOVE_DELAY` (currently ~300ms) in `gameTimings.ts` would need to be removed or reduced when LLM mode is active, and the `waitingForAI` indicator will be shown during the full API round-trip. Please confirm acceptable latency.

> [!WARNING]
> **Async in useAITurns**: `handleAIMove` is currently synchronous. Making it async requires a ref-based cancellation pattern to avoid race conditions (e.g., stale state if the component unmounts mid-request). This is handled in the plan.

---

## Open Questions

1. **Which paid model?** Many models on OpenRouter benefit from **automatic prefix caching** depending on the backend provider (e.g., DeepSeek's native API, Together AI, or Fireworks). Any of these will automatically cache our static game rules:
   - `deepseek/deepseek-chat` or `deepseek/deepseek-reasoner` — Native Chinese, deep logic, automatic caching via DeepSeek API.
   - `qwen/qwen-2.5-72b-instruct` — Alibaba's top open-source model. Excellent native Chinese context, automatic caching via providers like Together/Fireworks.

2. **Scope**: Apply LLM decisions to all 3 AI players, or just one (e.g., for testing)?

3. **Kitty swap & trump declaration**: Should LLM also drive kitty swap and trump declaration, or just card play for now?

4. **Prompt language**: Should the game context be described in English, or Chinese (since this is a Chinese card game)?

---

## Proposed Changes

### New File: `src/ai/llmAIClient.ts`

A thin wrapper around the OpenRouter chat completions API using `messages[]` format.

```typescript
export type LLMMessage = { role: 'system' | 'user'; content: string };

// Handles:
// - Building the fetch request to https://openrouter.ai/api/v1/chat/completions
// - Sending system + user messages (enables prompt caching for Anthropic models)
// - For Anthropic models: wraps system content with cache_control if config.usePromptCaching
// - Timeout (AbortController, 8s default)
// - Returning the raw assistant reply string, or null on any error (triggers fallback)
export async function callOpenRouter(
  systemPrompt: string,
  userPrompt: string,
  model: string,
  apiKey: string,
  signal: AbortSignal,
  usePromptCaching?: boolean,
): Promise<string | null>
```

---

### New File: `src/ai/llmGamePrompt.ts`

Builds two separate prompts from `gameState` and `MemoryContext`:

**System prompt** (static per game, sent as the `system` message — cacheable):

The system message contains a **condensed, LLM-optimized rules summary** written specifically for prompting (not the full `docs/GAME_RULES.md` which is 610 lines / ~26KB — far too large). This summary lives as a constant string in `llmGamePrompt.ts`, derived from `GAME_RULES.md` as the source of truth:

```
You are playing Shengji (升级/Tractor), a Chinese trick-taking card game.

TEAMS: [TeamA: human+bot2] vs [TeamB: bot1+bot3]. Your role: [Bot1/Bot2/Bot3], [attacking/defending].
GOAL: Attacking team needs 80+ points (5=5pts, 10=10pts, K=10pts). Defending team blocks this.
TRUMP: One rank is trump in all suits + one trump suit. Hierarchy: BJ > SJ > trump-rank-in-trump-suit > trump-rank-off-suits > trump-suit-cards (A→3).
COMBINATIONS: Singles (1 card) | Pairs (2 identical) | Tractors (consecutive pairs same suit).
FOLLOWING: Must follow led suit and match combo structure (pair→pair, tractor→tractor). If void, may trump or discard.
WINNING: Highest trump wins trump tricks. Highest led-suit card wins non-trump tricks. Trump always beats non-trump.
KITTY: 8 hidden cards scored if attacking team wins the LAST trick (×2 for single, ×4 for pair/tractor final).

The candidates you receive are already validated as your only legal plays.
Reply with ONLY the candidate number. No explanation.
```


**User prompt** (per-turn, sent as the `user` message — never cached):
```
TRUMP: [rank] of [suit]
SCORE: Attacking team [X]/80 pts | Trick [N] of ~25

PLAY HISTORY ([M] tricks):
  Trick 1: human A♠ K♠ | bot1 7♣ 8♣ | bot2 3♥ | bot3 5♥ → bot2 won [ally] (5pts)
  Trick 2: bot2 K♥ | bot3 2♠ | human Q♥ | bot1 3♦ → bot2 won [ally] (10pts)
  ... (last 6 tricks)

PLAYER MEMORY:
  human: void♣, trump_used=0
  bot1:  void♥, trump_used=2
  bot3:  no confirmed voids, trump_used=0
Trump played total: 4 | Point cards played: 8

CURRENT TRICK:
  human: K♦ (leading, current winner)
  → Your turn (2nd to play)

YOUR HAND (sorted by suit): ♠ A K Q | ♥ 3 3 | trump: BJ

CANDIDATES:
  0: 3♥ 3♥ (pair, 0pts)
  1: A♠ (single, 0pts)
  2: BJ (single, 0pts)
  3: 5♣ (single, 5pts)
Choose:
```

Candidates show **only**: card identity, combo type, and point value of the cards. No rationale, no scores, no algorithmic hints — the LLM reasons from the full game context (history, memory, trick state, team score). Pre-sorted best→worst by algorithmic score so candidate 0 is a reasonable default if the LLM is uncertain.

- **Prompt Structure & Caching Strategy**: To maximize cache hits across all AI bots, the prompt is strictly divided into a shared prefix and a player-specific suffix:
  - **[CACHED PREFIX - Identical for all bots]**
    1. `System Rules`: Full game rules.
    2. `Game Status`: Objective score, trump suit, and declarers.
    3. `Play History`: All past tricks, strictly objective ("Bot1 played...", "Winner: Bot2") with NO `[ally]` tags.
  - **[PLAYER SPECIFIC - Breaks the cache]**
    4. `Player Context`: "You are Bot1. Your ally is Bot3. Your opponents are Bot2 and Human."
    5. `Current Trick`: The cards played so far in the active trick.
    6. `Your Hand`: The player's current hand.
    7. `Candidates`: The pre-validated options.
- **Player memory** from `MemoryContext.playerMemories`: suit voids, trump void, `trumpUsed` count
- User prompt ~300–600 tokens per turn; system prompt ~500–800 tokens (rules, cached after first call)


---

### New File: `src/ai/llmAIStrategy.ts`

The async counterpart to `aiStrategy.ts`. Fully stateless — no session management.

```typescript
export async function makeLLMAIPlay(
  gameState: GameState,
  player: Player,
  config: LLMConfig,
  signal: AbortSignal,
): Promise<Card[]>
```

Flow:
1. Determine scenario: leading, or following (classify via `suitAvailabilityAnalysis`)
2. **Build candidates based on scenario:**
   - **Leading** → candidates from `detectCandidateLeads` (always bounded)
   - **Following / `valid_combos`** → candidates from `validCombosDecision` (STRICT matching combos).
   - **Following / `insufficient` & `enough_remaining`** → Player has cards in the suit but must break structure or dispose. We generate a curated shortlist of disposal options based on existing algorithmic hierarchies.
   - **Following / `void` (Trumping vs Dumping)** → When a player is void in the led suit, we generate a curated shortlist of BOTH trumping options and dumping options. The LLM evaluates the game state and decides whether to win the trick or sacrifice points.
   - **Following / `multi_combo`** → For mixed-suit/complex plays, we generate options using the existing multi-combo disposal logic.
3. Build full-context prompt via `buildGamePrompt(gameState, player.id, candidates, scenario)`
4. Call `llmAIClient.ts` with prompt + cancellation signal
5. Parse response integer → return `candidates[N].cards`
6. On any error → log the failure and return `makeAIPlay(gameState, player)` (synchronous algorithmic fallback), passing back `source: 'fallback'` to the caller.

---

### New File: `src/ai/llmConfig.ts`

```typescript
export interface LLMConfig {
  enabled: boolean;            // Feature flag
  apiKey: string;              // OpenRouter API key
  model: string;               // e.g. "mistralai/mistral-7b-instruct"
  timeoutMs: number;           // Default: 8000
  applyToPlayers: PlayerId[];  // Which AI players use LLM
}

export function getLLMConfig(): LLMConfig
// Reads from expo-constants (app.json extra field)
```

### Modify: `src/hooks/useAITurns.ts`

Convert `handleAIMove` to async and use `AbortController` for cancellation.

```diff
- const handleAIMove = useCallback(() => {
+ const handleAIMove = useCallback(async () => {
    ...
-   const { cards, error } = getAIMoveWithErrorHandling(gameState);
+   const { cards, error } = await getAIMoveWithErrorHandling(gameState, abortRef.current.signal);
    ...
```

The `abortRef` is a `useRef<AbortController>` that is cancelled on unmount and on each new AI turn start.

---

### Modify: `src/game/playProcessing.ts`

Make `getAIMoveWithErrorHandling` async, accepting an optional `AbortSignal`.

```diff
- export function getAIMoveWithErrorHandling(gameState: GameState)
+ export async function getAIMoveWithErrorHandling(
+   gameState: GameState,
+   signal?: AbortSignal
+ ): Promise<{ cards: Card[] | null; error: string | null; source: 'llm' | 'algorithmic' | 'fallback' }>
```

Inside: if LLM is enabled for the current player, call `makeLLMAIPlay`; otherwise fall through to existing `getAIMove`.

---

### Modify: `app.json`

Add `extra` section for the API key:

```json
"extra": {
  "openRouterApiKey": "",
  "llmAIEnabled": false,
  "llmModel": "deepseek/deepseek-chat"
}
```

---

### Modify: `src/utils/gameTimings.ts`

When LLM is active, the `AI_MOVE_DELAY` should be 0 (the API latency itself provides the natural delay):

```typescript
export const AI_MOVE_DELAY = llmConfig.enabled ? 0 : 300;
```

---

## Verification Plan

### Automated Tests
- `npm run typecheck` — verify no type errors in new async signatures
- `npm run test` — existing tests should continue to pass (LLM disabled by default, so fallback path is exercised)
- New unit test: `__tests__/ai/llmGamePrompt.test.ts` — verify prompt building with known game state
- New unit test: `__tests__/ai/llmAIClient.test.ts` — mock fetch, verify timeout/error handling

### Manual Verification
1. Run `npx expo start` with `llmAIEnabled: false` → game plays identically to today
2. Set `llmAIEnabled: true` with a valid OpenRouter key → AI turns show thinking indicator during API call → AI plays a legal card
3. Simulate API failure (bad key) → graceful fallback to algorithmic move, no crash
4. Verify `waitingForAI` indicator is shown throughout the full LLM round-trip


## Future Work (Stage 2)

In Stage 2, we will move away from the 'candidate menu' approach and allow the LLM to output card arrays natively. This will require a validation loop where the LLM's raw output is passed through the game's strict `isValidPlay` guard. If the play is invalid, the engine will bounce the error back to the LLM as a new user message, forcing it to try again until it produces a legal play.
