# Proposal: Programmatic Pair-Constraint Injection for LLM Suit Following

## Status
* **Author**: Antigravity
* **Date**: 2026-06-01
* **Status**: Proposed

---

## 1. Context & Motivation

During unattended game simulations with LLMs active, we observed initial following failures on **Trick 2** where multiple bots made rule-invalid plays:
* **`bot1`**: Attempted to play `["2♣", "3♦", "3♦", "4♦"]` (one pair, two singles) against a led Tractor. It got rejected with: `Must follow tractor priority: you must play pairs to match the pairs of the leading tractor.`
* **`bot2`**: Attempted to play `["4♦", "2♠", "Q♦", "J♦"]` (four singles) against a led Tractor. It got rejected with the same error.

Both bots recovered on Attempt 2 via the self-correction retry loop, but these failures reveal a critical structural gap in how general suit-following rules for structured leads are surfaced to the LLM.

---

## 2. Root Cause Analysis

In Shengji (Tractor), when a structured lead occurs—such as a `Pair` or a `Tractor` (consecutive pairs)—a player holding any pairs in that suit **must** follow with those pairs to match the leading structure (e.g., matching a 4-card tractor requires playing 2 pairs if held, or 1 pair and 2 singles if only 1 pair is held).

In our current prompt design:
1. When the player doesn't hold the exact matching combination (like a matching 4-card consecutive tractor) but holds enough cards, the scenario is classified as `enough_remaining`.
2. The prompt displays a flat list of all available cards in the suit:
   ```
   - Scenario: enough_remaining
   - You must still play 4 card(s) from this suit. Available cards:
       3♦, 3♦, 8♦, 8♦, 2♣, 4♦
   ```
3. Because the cards are presented as a flat pool, the LLM treats it as an unconstrained set. It splits pairs into singles (such as `bot2` playing a single `Q♦` and a single `J♦` instead of keeping its `Q♦` pair intact) because nothing in the active trick context explicitly warns it that splitting pairs is illegal.

While a human or the rule-based AI immediately understands the structural constraints, smaller LLMs lack the situational counting capacity to infer these rules from a flat list.

---

## 3. Proposed Solution: Programmatic Pair-Constraint Injection

Instead of expecting the LLM to count duplicates and calculate structural requirements, we can solve this programmatically in code. The rule-based engine already classifies the lead. We can identify what pairs the player holds in the led suit and inject a direct, explicit directive into the prompt.

### A. Code Changes in Prompt Builder (`llmGamePrompt.ts`)

1. **Add Pair-Detection Helper**:
   Implement a local helper `localFindPairsInCards(cards: Card[]): Card[][]` to group identical cards in a card list and identify pairs.

2. **Inject Critical Constraints**:
   In `localBuildFollowingPromptContext`, when `analysis.scenario === "enough_remaining"` and the led combo is a `Pair` or `Tractor`:
   * Scan `analysis.remainingCards` for pairs.
   * If any pairs are held, format and append a strict `CRITICAL CONSTRAINT` directive.

#### Example Directive for `bot1` (held two pairs: `3♦, 3♦` and `8♦, 8♦`):
```markdown
- Led combo type: Tractor (4 cards)
- Led suit/group: Diamonds
- Your cards in that suit: 6
- Scenario: enough_remaining
- You have enough cards in the led suit but NO matching Tractor combos.
- You must still play 4 card(s) from this suit. Available cards:
    3♦, 3♦, 8♦, 8♦, 2♣, 4♦
- CRITICAL CONSTRAINT: You hold 2 pair(s) in this suit: [3♦, 3♦] and [8♦, 8♦]. Because a Tractor was led, you MUST match the led pair structure. You are required to play BOTH of these pairs in your selection! Do NOT split them into singles.
```

#### Example Directive for `bot2` (held one pair: `Q♦, Q♦`):
```markdown
- CRITICAL CONSTRAINT: You hold 1 pair(s) in this suit: [Q♦, Q♦]. Because a Tractor was led, you MUST match the led pair structure. You are required to play this pair in your selection! Do NOT split it into singles.
```

---

## 4. Token & Performance Impact

* **Token Overhead**: Negligible (adds $\sim 40\text{--}70$ tokens only when the player holds pairs under a Pair/Tractor lead in `enough_remaining` scenarios).
* **Execution Overhead**: Zero (pair scanning on a maximum of 25 cards takes micro-seconds).
* **Benefits**: 
  * Eliminates $100\%$ of formatting and structural following violations during Pair/Tractor leads.
  * Drives the Attempt-1 success rate closer to $100\%$, saving OpenRouter API costs and reducing latency.

---

## 5. Next Steps

1. **Approval**: Align on this proposal.
2. **Implementation**: Edit `llmGamePrompt.ts` to implement the pair-constraint logic.
3. **Prompt Refinement**: Refine `# 4. Following — fixed rules` in `llmPromptTemplates.ts` to reinforce the pair-preservation rule.
4. **Verification**: Run a full LLM simulation game and verify that all bots follow `Pair` and `Tractor` leads successfully on their very first attempt.
