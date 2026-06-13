# Proposal: Programmatic Context Augmentation & Strategic Reasoning for LLMs

## Status
* **Author**: Antigravity
* **Date**: 2026-06-13 (Merged, Updated & Detailed)
* **Status**: Approved
* **Timeline**: Active implementation phase.

---

## 1. Architectural Philosophy: "Count in Code, Reason in LLM"

Shengji (Tractor) is a game with complex, highly structured rules and calculations. From any single seat, it is a **near-perfect-information game**: with full card accounting, almost every strategic signal is *computable*, not guessed.

However, LLMs (especially smaller models run locally or via API) struggle with:
1. **Arithmetic & Duplicate Counting**: Correctly tracking duplicates and structures across a flat pool of cards.
2. **Rule Parsing under Constraints**: Correctly enforcing complex nested conditions (e.g. matching a Tractor or Pair structure when following a lead).

Rather than expecting the LLM to perform arithmetic or count cards blindly, our prompt augmentation strategy raises the LLM's baseline knowledge to match and exceed the algorithm's:
*   **TypeScript Code**: Calculates card structures, counts duplicates, evaluates legal boundaries, and runs the rule-based AI algorithm to compute optimal baseline moves and strategic intents.
*   **LLM (Strategic Decision-Maker)**: By injecting these computed recommendations, constraints, and rules directly into the prompt, we prevent the LLM from playing in the dark (which currently causes it to play worse than the algorithm). Empowered with the same depth of knowledge, the LLM can use its superior reasoning engine to make the right choices, override greedy rule-based baselines when strategic trade-offs exist, and ultimately out-play the algorithm.

---

## 2. Phase 1 [ACTIVE]: Programmatic Constraints & Recommendations

In Phase 1, we implement programmatic prompt help to prevent basic following violations and expose the rule-based AI's calculated choices to the LLM.

### A. Dynamic Follow Recommendations (`llmGamePrompt.ts`)
Instead of expecting the LLM to select following cards blindly, the prompt builder will run the rule-based AI's follow router in the background:
```typescript
const recommendedCards = routeToDecision(analysis, handCards, gameContext, trumpInfo, gameState, playerId);
```

We will extract the strategy used by the engine and present it as a dedicated **Strategic Intent** instruction:
*   **Void in led suit**:
    *   *Teammate winning safely*: *"Void in led suit. Teammate is winning safely; sluffing a trash card or point card to bank points."*
    *   *Teammate unsafe / Opponent winning*: *"Void in led suit. Opponent is winning or teammate is unsafe; evaluating ruffing with trump to capture points/block, or sluffing rubbish to conserve resources."*
*   **Teammate winning**:
    *   *Teammate win is safe (via `shouldContributeToTeammate`)*: *"Teammate is winning safely. Contributing point cards (5, 10, K) or high cards to maximize score."*
    *   *Teammate win is not safe*: *"Teammate leads but is vulnerable to players behind. Playing lowest non-points to conserve resources and minimize loss."*
*   **Opponent winning / Other**:
    *   *4th seat (perfect info)*: *"You play last (perfect info). Beating opponent's winning play with the cheapest sufficient card, or discarding lowest rubbish to conserve cards."*
    *   *Otherwise*: *"Opponent is winning and other players act after you. Ducking low / disposing of rubbish to conserve pairs, point cards, and trumps."*

Expose this in the user prompt:
```markdown
## Recommended Play
- Recommended cards: [3♦, 4♦]
- Strategic strategy: Duck low / dispose of lowest cards to conserve pairs and point cards (conserve strength).
```

### B. Visual Pair Grouping & Constraints (`llmGamePrompt.ts`)
Under the `case "enough_remaining"` scenario, when a `Tractor` is led and the player holds pairs but cannot form a Tractor:
1.  **Grouping**: Group matching cards sharing `commonId` and wrap them in brackets (e.g. `[3♦, 3♦]`). Leave unpaired cards normally formatted.
2.  **Constraint Calculation**:
    *   Count held pairs: `heldPairsCount` (derived from grouping).
    *   Calculate required pairs: `ledPairsCount = requiredLength / 2`.
    *   Determine forced pairs: `requiredPairs = Math.min(heldPairsCount, ledPairsCount)`.
3.  **Prompt Injection**: If `heldPairsCount > 0`, inject:
    *   If `requiredPairs === heldPairsCount`:
        *   `- CRITICAL CONSTRAINT: You hold {heldPairsCount} pair(s) in this suit: {pairsList}. Because a Tractor was led, you MUST match the led pair structure. You are required to play all of these pairs in your selection! Do NOT split them into singles.`
    *   If `requiredPairs < heldPairsCount`:
        *   `- CRITICAL CONSTRAINT: You hold {heldPairsCount} pair(s) in this suit: {pairsList}. Because a Tractor was led, you MUST match the led pair structure. You are required to choose and play at least {requiredPairs} of these pairs in your selection! Do NOT split the selected pair(s) into singles.`

---

## 3. System Rules & Reasoning Framework Rewrite (`llmPromptTemplates.ts`)

We will update `STATIC_LLM_GAME_RULES` and prompt task formats to direct the LLM's reasoning engine.

### A. Chain-of-Thought (CoT) Reasoning Guidelines
We will update the `## Task` block instructions to remove the one-sentence constraint on the reasoning field. The new task instructions will direct the LLM to think step-by-step:
```markdown
## Task
Select exactly {requiredCount} card(s) from your hand to play.

You MUST follow this Chain-of-Thought reasoning structure in your "reasoning" response:
1. TRICK STATE: State who led, the led combo structure, who is winning, and points in play.
2. OPTION VALUATION: Evaluate the recommended play and your available cards. State if you hold bosses or pairs that need preserving.
3. TRADE-OFFS: Compare your options (e.g., winning the trick vs. conserving cards vs. banking points on your partner).
4. DECISION: State why your selected play is the optimal choice for your team.

Reply with JSON ONLY:
{
  "reasoning": "1. TRICK STATE: ... 2. OPTION VALUATION: ... 3. TRADE-OFFS: ... 4. DECISION: ...",
  "play": ["<card>", ...]
}
```

### B. Code-Level Heuristics Extraction & Computation
To support the LLM's decision-making, the TypeScript engine runs the rule-based AI's follow and lead routing algorithms in the background. The LLM is never exposed to raw code structures or internal execution modes; instead, the TypeScript code handles the card accounting and math, feeding the LLM only clean strategic inputs:
1.  **Point Valuation & Defense Checks**: Automatically analyzes whether point cards (5, 10, K) should be donated or protected, adjusting recommended cards based on trick safety and score impact.
2.  **Resource Preservation**: Analyzes hand structures to prevent proposing recommended plays that split pairs or break tractors unless legally forced.
3.  **Trick Safety & Seat Analysis**: Evaluates seat positions (e.g., 4th seat) and player void memory to determine if the teammate's current lead is safe from opponents behind.
4.  **Ruffing/Over-Ruffing Calculations**: Evaluates whether ruffing is mathematically sound based on trick points, and checks whether the player risks being over-ruffed by players acting next.

---

### C. Draft of the Expanded `STATIC_LLM_GAME_RULES` System Prompt
We will replace the static system prompt in `llmPromptTemplates.ts` with this strategic, natural language guide for the LLM to learn and infer from:

```markdown
# Shengji / Tractor — Trick-Play Strategic Rules

## 1. Core Objectives & Point Economy
- **Round Victory**: Attackers win by capturing 80+ points in tricks. Defenders win by keeping attackers under 80.
- **Trick Points**: Points reside only on 5 (5pts), 10 (10pts), and K (10pts).
- **Rule of Point Disposal (Sluffing)**:
  - Never throw point cards (5, 10, K) on tricks won by opponents. Doing so directly feeds them victory points.
  - Donate point cards to tricks won safely by your teammate (marked SECURED or LIKELY) to bank them for your team.
  - Prioritize donating 10s and Kings over 5s because 10s/Kings are worth double the points of a 5.
- **Rule of the Final Trick & Kitty Multipliers**:
  - The final trick of a round is of supreme strategic importance. If the attacking team wins the final trick, they capture all point cards hidden in the kitty, multiplied by a factor determined by the winning play's structure:
    - Single-card lead: Kitty points are multiplied by **2**.
    - One-pair lead: Kitty points are multiplied by **4**.
    - Two-pair lead: Kitty points are multiplied by **8**.
    - Tractor/Multi-combo lead of N pairs: Kitty points are multiplied by **2^(N + 1)**.
  - As the round nears the end (late game stage), defenders must fight to deny the attackers the final trick, while attackers must coordinate to win it. Conserve your highest unbeatable cards (Big Joker, SJ, Aces, Tractors) specifically to secure or block the final trick.

## 2. Resource Conservation & Control
- **Boss Cards & Trumps**: High trumps (Jokers, Active Ranks) and off-suit Bosses (Aces, or Kings if Ace is trump rank) are extremely scarce control resources.
- **Rule of Rubbish Disposal**: If a trick is already won by the opponents or is unsafe, do NOT waste your trumps or boss cards. Conserve them for tricks you lead or can guarantee winning. Play your lowest non-point "rubbish" cards (e.g., 2, 3, 4) to throw away.
- **Rule of Pair Preservation**: Pairs are highly valuable because they block single-card plays and force opponents to match structures. Do not split a pair to play a single card unless you have no other singles. Do not split a Tractor pair unless forced.

## 3. Position-Aware Strategic Cues
- **2nd Seat (Proactive Takeover)**:
  - If the opponent leads a weak trump (Rank 10 or lower), play the cheapest available trump that beats it. This seizes early control without wasting high-value Jokers.
- **3rd Seat (Blocking & Support)**:
  - If the trick contains points and the current winner is weak (Rank 10 or lower), raise the trick strength (play a trump > Rank 10 but <= Ace) to block the 4th player (opponent) from winning cheaply.
  - If your partner is winning with a weak trump, play a small raise to protect them if the 4th player is an opponent.
  - Never over-ruff or overtake a teammate who is already winning safely.
- **4th Seat (Perfect Information)**:
  - You act last and see all plays. If opponents are winning, beat them with the cheapest possible card that wins. If your partner is winning, let them win and dump points or rubbish.

## 4. Void Decisions (Ruffing vs. Sluffing)
When you are void in the led suit, you must evaluate whether to Trump (ruff) or Discard (sluff):
- **When to Ruff**: Ruff only to capture points (>= 10pts) or block opponent takeovers.
  - *Ruff High for Safety*: If there are players behind you who are also void, they can over-ruff you. Ruff with a high enough trump (e.g. trump rank or high trump) to survive, or play your highest trump.
  - *Conserve if Outmatched*: If you cannot beat the current winner or know you will be over-ruffed anyway, do not waste a trump card. Sluff low rubbish instead.
- **When to Sluff**:
  - If your partner is winning safely, sluff point cards (10/K first, then 5) to bank points.
  - If opponents are winning or partner win is unsafe, sluff low rubbish to conserve trumps and point cards.

## 5. Trump Group & Tractors
- **Trump Unity**: All Jokers, active ranks, and declared trump suit cards behave as one single suit.
- **Active Ranks**: Trump ranks in all suits belong to the Trump Group, not their printed suits. They beat any off-suit Ace. Never lead them cheaply.
- **No-Trump Rounds**: If no trump suit is declared, only Jokers and the four active ranks are trumps. Since trump cards are extremely scarce, play them with high defensive caution. Off-suit Aces are near-untouchable as they cannot be easily ruffed; cash them aggressively.
```

---

## 5. Verification Plan

### A. Unit Test Cases (`__tests__/ai/llmGamePrompt.test.ts`)
We will create a new Jest test file verifying prompt generation output.
1.  **Tractor Lead, Holding Pairs (Enough Remaining)**:
    *   *Mock*: GameState with `10♦, 10♦, J♦, J♦` led (Trump rank is 2). Player hand has `3♦, 3♦, 8♦, 8♦, 2♣, 4♦`.
    *   *Assertion*: Available cards is formatted as `[3♦, 3♦], [8♦, 8♦], 2♣, 4♦` and contains: `CRITICAL CONSTRAINT: You hold 2 pair(s) in this suit: [3♦, 3♦] and [8♦, 8♦]. You are required to play all of these pairs...`
2.  **Tractor Lead, Excess Pairs (Enough Remaining)**:
    *   *Mock*: GameState with `10♦, 10♦, J♦, J♦` led. Player hand has `3♦, 3♦, 8♦, 8♦, Q♦, Q♦, 2♣`.
    *   *Assertion*: Available cards lists three bracketed pairs. Constraint states: `You are required to choose and play at least 2 of these pairs...`
3.  **Teammate Winning Safely Recommendation**:
    *   *Mock*: Teammate played `A♣` (Boss). It is the 4th player's turn. Hand has `K♣` and `3♣`.
    *   *Assertion*: `## Recommended Play` section lists `[K♣]` (highest points card) and states: `Contribute points / high cards to teammate because teammate is winning and their win is safe.`
4.  **Opponent Winning (Duck low/Resource conservation)**:
    *   *Mock*: Opponent played `A♣` (Boss). It is 2nd player's turn. Hand has `K♣`, `Q♣`, `3♣`.
    *   *Assertion*: `## Recommended Play` lists `[3♣]` and states: `Duck low / dispose of lowest cards to conserve pairs and point cards (conserve strength).`

### B. Automated Verification Commands
*   Run the new unit test suite:
    ```bash
    npm run test __tests__/ai/llmGamePrompt.test.ts
    ```
*   Verify all existing test suites pass successfully:
    ```bash
    npm run test:silent
    ```
*   Run the live simulation runner to observe log outputs:
    ```bash
    ./.agents/skills/model-evaluation/scripts/run.sh --llm
    ```
