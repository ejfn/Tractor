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
                                    ├── Short-circuit: if only 1 legal play, play instantly (no API call)
                                    ├── getOrCreateSession(playerId, roundNumber)
                                    ├── build incremental trick update + hand with unique IDs
                                    └── Validation Loop (max 2 retries):
                                        ├── call OpenRouter API (sends message thread + reasoning_effort)
                                        ├── parse JSON array output (e.g., ["c1", "c2"])
                                        ├── validate cards via engine (isValidPlay)
                                        ├── [If valid] -> execute play, append success to session, return
                                        └── [If invalid] -> append error to session, decrement retry, repeat
                                        └── [On retry exhaustion / API error] -> execute algorithmic fallback
```

The LLM is given direct agency to select cards natively from its sorted hand using unique IDs (e.g., `c1: A♠`, `c2: K♠`). Its choice is validated in real-time by the game's rule engine. If the play is invalid, the engine sends the error details back to the LLM, giving it up to 2 retries to self-correct before falling back to the standard algorithmic bot play. No visual badges are displayed in the UI to keep it pristine; instead, decision sources are tracked extensively via developer console logs and BigQuery analytics events.

---

## Resolved Decisions

> [!NOTE]
> The architectural proposal has been aligned with the following decisions:
> - **Session Management**: Uses an **incremental, stateful chat session** per AI player (three active sessions per round, excluding the human). Each trick appends exactly 1 user message (containing the outcome of the last trick and new choices) and 1 assistant message (the selected choice). 
> - **API Key Security**: Using Expo's native `EXPO_PUBLIC_` environment variable pattern (`EXPO_PUBLIC_OPENROUTER_API_KEY`) to prevent credentials from being stored or committed in `app.json` / version control.
> - **Prompt Language**: Prompts will be fully written in **English** (using standard Pinyin and English terms in parentheses for game-specific vocab). This achieves 2x–3x higher token efficiency and lower API costs while fully leveraging top model reasoning capabilities.
> - **Primary Model**: `deepseek/deepseek-chat` (DeepSeek-V3) via OpenRouter, utilizing its native prefix caching to get ~90% cost savings on the static system rules prompt.
> - **Stage 1 Scope**: Apply LLM decisions only to card play during the `Playing` phase. Kitty swap and trump declaration remain algorithmic in Stage 1 to keep candidate verification clean.
> - **Turn Cancellation**: Solved via a unique `turnId` tracked in `activeRequestRef` to ensure that stale promise completions during component unmounts or turn advancements are discarded.

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


**User messages** (incremental, stateful chat history):

The LLM is prompted via a series of alternating user/assistant messages. The system prompt contains the static game rules (cached).

**Message 1 (Trick 1 start)**:
```
[User]
Trick 1 started.
TRUMP: 2 of Heart (♥)
SCORE: Attacking team (Your opponents) 0/80 pts.
YOUR ROLE: You are Bot1. Your ally is Bot3. Your opponents are Human and Bot2.
YOUR HAND (sorted by suit): ♠ A K Q | ♥ 3 3 | trump: BJ, 5♦, 8♠

CURRENT TRICK:
  Human led: K♦ (current winner)
  → Your turn (2nd to play)

CANDIDATES:
  0: 3♥ (single, 0pts)
  1: A♠ (single, 0pts)
  2: BJ (single, 0pts)
  3: 5♦ (single, 5pts)
Choose:
```
*Assistant response*: `0`

**Message 2 (Trick 2 start)**:
```
[User]
Trick 1 ended.
Cards played: Human K♦ | Bot1 3♥ | Bot2 5♦ | Bot3 10♦.
Bot2 won the trick and scored 15 points (5♦ + 10♦).
Attacking team now has 15/80 points.

Trick 2 started.
YOUR HAND (sorted by suit): ♠ A K Q | ♥ 3 | trump: BJ, 8♠

CURRENT TRICK:
  Bot2 led: Q♣ (current winner)
  Bot3 played: 4♣
  Human played: A♣ (current winner)
  → Your turn (4th to play)

CANDIDATES:
  0: A♠ (single, 0pts)
  1: 8♠ (single, 0pts)
Choose:
```
*Assistant response*: `1`

---

- **Prompt Structure & Caching Strategy**: Since we are appending user/assistant messages chronologically, the thread prefix remains **100% identical** from turn to turn. 
  - The static game rules in the `system` message remain fully cached.
  - The early chat messages are cached dynamically by DeepSeek's automatic prefix caching.
  - Only the newest user message added at the end of the thread incurs new input token billing!
- **Session Lifespan & Recovery**:
  - Chat sessions live in-memory under a `llmSessionManager` mapped by `PlayerId`.
  - Sessions automatically reset at the start of each round.
  - **Self-Healing Recovery**: If a game is saved, reloaded, or recovered, the system gracefully recovers by initiating a **fresh stateless conversation start** (where the first user message includes a summarized transcript of the completed tricks so far, after which the session resumes incrementally).


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
1. **Short-Circuit Check**: Count the number of unique legal plays in the current context. If only 1 play is legal, immediately execute it (no API call required, saving latency and token costs!).
2. **Session Retrieval**: Fetch the player's dedicated chat session from `llmSessionManager`. If Trick 2+, append a brief system/user update detailing what cards were played in the last trick and who won it.
3. **Prompt Construction**: Sort the player's Hand and format it with unique string IDs (e.g., `c1: A♠`, `c2: K♠`), instructing the LLM to output a clean JSON array of selected IDs (e.g., `["c1", "c2"]`).
4. **Validation Loop (Max 2 retries / 3 total attempts)**:
   - Call `llmAIClient.ts` with the current message history, passing `reasoning_effort` mapped from the game difficulty.
   - Parse the assistant response to extract the JSON array of card IDs.
   - Resolve IDs back to real `Card` objects from the player's hand.
   - Run rule validation: check if play is valid under Shengji suit-following and combo-matching rules.
   - **If Valid**: Append choice to session history, advance, and return the chosen `Card[]`.
   - **If Invalid**: Log validation failure, append a clear feedback message to the chat history (e.g., `"Invalid play: Led suit is Hearts. You must follow suit using your Hearts cards."`), and trigger retry.
5. **Fallback Safety**: On retry exhaustion, API error, or timeout, immediately execute the standard synchronous algorithmic fallback `makeAIPlay(gameState, player)`, logging the fallback decision for testing.

---

### New File: `src/ai/llmConfig.ts`

```typescript
export interface LLMConfig {
  enabled: boolean;            // Feature flag
  apiKey: string;              // OpenRouter API key
  model: string;               // e.g. "deepseek/deepseek-chat"
  timeoutMs: number;           // Default: 15000
  applyToPlayers: PlayerId[];  // Which AI players use LLM
  reasoningEffort?: 'low' | 'medium' | 'high'; // Dynamic thinking level mapped to game difficulty
}

export function getLLMConfig(difficulty?: 'easy' | 'medium' | 'hard'): LLMConfig
// Reads dynamically from process.env, mapping game difficulty to OpenRouter's reasoning_effort parameter:
// - 'easy' -> 'low'
// - 'medium' -> 'medium'
// - 'hard' -> 'high'
```

### Modify: `src/hooks/useAITurns.ts`

Convert `handleAIMove` to async and use a `useRef<string | null>` to track active request IDs (`turnId`) alongside an `AbortController` for cancellation.

```diff
+ const activeRequestRef = useRef<string | null>(null);

- const handleAIMove = useCallback(() => {
+ const handleAIMove = useCallback(async () => {
    ...
+   const turnId = `${gameState.roundNumber}-${gameState.currentTrick?.plays.length || 0}-${currentPlayer.id}`;
+   activeRequestRef.current = turnId;
+   const controller = new AbortController();
+
-   const { cards, error } = getAIMoveWithErrorHandling(gameState);
+   const { cards, error, source } = await getAIMoveWithErrorHandling(gameState, controller.signal);
+
+   // Ignore stale updates if the game state/turn advanced in the meantime
+   if (activeRequestRef.current !== turnId) return;
    ...
```

---

### Modify: `src/game/playProcessing.ts`

Make `getAIMoveWithErrorHandling` async, accepting an optional `AbortSignal`.

```diff
- export function getAIMoveWithErrorHandling(gameState: GameState)
+ export async function getAIMoveWithErrorHandling(
+   gameState: GameState,
+   signal?: AbortSignal
+ ): Promise<{ cards: Card[] | null; error: string | null; source: 'llm' | 'llm-bypass' | 'algorithmic' }>
```

Inside: if LLM is enabled for the current player, call `makeLLMAIPlay`; otherwise fall through to existing `getAIMove`.

---

### New File: `.env.example`

Add environment variables for configuring OpenRouter locally:

```bash
EXPO_PUBLIC_LLM_ENABLED=false
EXPO_PUBLIC_OPENROUTER_API_KEY=your_key_here
EXPO_PUBLIC_LLM_MODEL=deepseek/deepseek-chat
EXPO_PUBLIC_LLM_TIMEOUT=15000
```

---

### Modify: `src/utils/gameTimings.ts`

When LLM is active, the `AI_MOVE_DELAY` should be 0 (the API latency itself provides the natural delay):

```typescript
export const AI_MOVE_DELAY = llmConfig.enabled ? 0 : 300;
```

---

### Modify: `docs/LOG_EVENT_SCHEMA.md` & Analytics Logging

To support tracking LLM performance, latency, and costs via the existing BigQuery analysis script, add the following fields to the play logging schema:

```json
{
  "decision_source": "string (llm | llm-bypass | algorithmic)",
  "llm_latency_ms": "integer (null if algorithmic or llm-bypass)",
  "llm_model": "string (null if algorithmic or llm-bypass)"
}
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

In Stage 2, we will look into expanding LLM-driven gameplay beyond active card play into:
1. **Kitty Swap Phase**: Allowing the LLM to inspect its dealt hand, formulate a long-term suit/point strategy, and decide which 8 cards to discard to the kitty.
2. **Trump Declaration Phase**: Allowing the LLM to dynamically evaluate risk and declare trumps from its hand during the dealing phase.
