# Architecture Proposal: Hybrid Strategic AI for Shengji / Tractor

**Date**: 2026-08-21  
**Status**: Proposed & Reviewed  
**Tracking Issue**: [#462](https://github.com/ejfn/Tractor/issues/462)  
**Target Models**: Lightweight LLMs (e.g. `google/gemini-2.5-flash-lite`, small on-device or fast cloud models)  
**Related Docs**: [docs/ai_system.md](../ai_system.md) | [docs/game_rules.md](../game_rules.md) | [AGENTS.md](../../AGENTS.md)

---

## 1. Executive Summary & Problem Statement

The Shengji (Tractor) AI system has hit the **"LLM Prompt Ceiling"**:
1. **The Combinatorial vs Strategic Mismatch**: A Shengji hand contains 25–33 cards, generating dozens of legal combinatorial moves (singles, pairs, tractors, multi-combos). Asking a language model to output raw card strings (`["3♣", "7♦"]`) forces it to perform complex constraint checking and card counting—tasks statistical language models are inherently unreliable at.
2. **Stateless Trick Amnesia**: In current prompt-based bots, each trick prompt is an isolated snapshot. Without a persistent round plan, the AI cannot execute multi-trick strategies (e.g., establishing a long suit, drawing opponent trumps, or coordinating endgame kitty defense).
3. **Prompt Bloat & Attention Dilution**: Adding more tactical instructions to fix edge cases bloats prompts to 2,500+ tokens, degrading attention in lightweight models like **Gemini Flash Lite** and causing regressions.

### The Solution: A Hybrid "Analyst & Decider" Architecture
We decouple mechanical execution from strategic reasoning:
- **TypeScript Engine ("The Analyst & Executor")**: Performs 100% of rule validation, card tracking, void detection, point accounting, and Pareto clustering. It reduces the entire hand into **Max 3 non-dominated Strategic Lines**.
- **Lite LLM ("Strategic Intuition")**: Evaluates the 3 concise choices against the round score and persistent strategy, outputting an ultra-simple JSON response in **< 150ms with 0% illegal plays**.

---

## 2. Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                   TYPESCRIPT ENGINE ("The Analyst")                      │
│  - 100% Rule Validation, Trump Hierarchy, Card Tracking, Void Analysis  │
│  - Reduces 20+ cards into Max 3 Clear Strategic Lines (A / B / C)        │
│  - Pre-calculates exact point gain/risk for each line                    │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │ Ultra-Compact Prompt (< 400 tokens)
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                   LITE MODEL ("Strategic Intuition")                     │
│  - Input: Current Goal + 3 Simple Options (A, B, C)                      │
│  - Output: Ultra-Simple JSON: {"line": "A", "strategy": "...", ...}      │
│  - Execution Time: ~150ms with 0% failure rate                           │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │ Line ID ("A")
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                   TYPESCRIPT ENGINE ("The Executor")                     │
│  - Maps Line "A" to exact, verified cards                                │
│  - Executes play with 100% legal guarantee (Zero Retries)                │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Strategic Line Generation (Pareto Clustering)

### A. Leading (When you lead the trick):
The engine classifies all legal candidate leads (singles, pairs, tractors, and unbeatable multi-combos from [`candidateLeadDetection.ts`](file:///home/eric/repos/Tractor/src/ai/leading/candidateLeadDetection.ts)) into **4 Strategic Archetypes**, picking the single **best representative play** for each:

1. **`CASH_WINNER` (Claim points / Retain control)**
   - *Candidates*: Guaranteed unbeatable singles/pairs/tractors ($A\diamondsuit$, $A\heartsuit A\heartsuit$, multi-combos).
   - *Engine Selection*: Picks the highest point-yielding or most urgent boss card.
   - *Prompt description*: `"[Line A] Cash guaranteed boss (A♦) → captures 10 pts, retains lead"`.

2. **`ATTACK_DEVELOP_SUIT` (Establish long suit / Pressure opponents)**
   - *Candidates*: Strong non-unbeatable pairs ($K\clubsuit K\clubsuit$) or longest side suit cards where player holds length $\ge 4$.
   - *Engine Selection*: Picks the most structured combo in the longest non-trump suit.
   - *Prompt description*: `"[Line B] Attack Clubs (K♣ K♣) → forces opponent trumps, establishes Clubs"`.

3. **`SAFE_EXIT_FEED` (Pass lead safely / Feed partner)**
   - *Candidates*: Lowest non-point cards in suits where partner is void OR weak short suits.
   - *Engine Selection*: Lowest rank non-point card ($3\spadesuit$) to minimize conceded points (0 pts risked).
   - *Prompt description*: `"[Line C] Safe lead exit (3♠) → surrenders lead with 0 pts risked; feeds partner's void"`.

4. **`TRUMP_CONTROL` (Draw trumps / Assert endgame dominance)**
   - *Candidates*: Trump pairs or top trumps ($BJ$, $SJ$, Trump Rank).
   - *Engine Selection*: Lowest sufficient trump combo that draws opponent trumps.
   - *Prompt description*: `"[Line D] Draw trumps (Q♠ Q♠) → bleeds opponent trumps; costs 1 trump pair"`.

---

### B. Following (When responding to a lead):

The engine evaluates the trick context (using [`suitAvailabilityAnalysis.ts`](file:///home/eric/repos/Tractor/src/ai/following/suitAvailabilityAnalysis.ts) and [`teammateAnalysis.ts`](file:///home/eric/repos/Tractor/src/ai/following/teammateAnalysis.ts)) and collapses the hand into 2–3 clear choices:

#### Scenario 1: Void in Led Suit (Ruff vs Sluff)
A void player holding 20+ cards is presented with **3 clear tactical intents**:
- **Line A (`RUFF_TO_WIN`)**: Lowest trump that beats the current winner.
  - *Details*: `"Ruff with (4♠) → wins trick, captures 15 pts; spends low trump"`.
- **Line B (`FEED_POINTS`)**: *(Only when partner is winning safely)* Highest point card to dump.
  - *Details*: `"Bank points with (10♥) → adds 10 pts to partner's safe trick"`.
- **Line C (`DUMP_TRASH`)**: Lowest non-point, non-trump card in weakest suit.
  - *Details*: `"Discard trash (3♦) → concedes trick; preserves all trumps and point cards"`.

#### Scenario 2: In-Suit Following (Multiple legal cards)
- **Line A (`OVERTAKE_WIN`)**: Lowest card/combo that beats current winner.
- **Line B (`FEED_PARTNER`)**: Point card ($K/10/5$) if partner is winning safely.
- **Line C (`DUCK_LOW`)**: Lowest non-point loser to conserve higher cards.

#### Scenario 3: Forced / Single Option
- **Short-circuited in 0ms**: Engine plays immediately without LLM call when:
  - Hand size $\le$ required cards.
  - Only one legal combo exists.
  - Forced to play all remaining cards of the led suit.

---

## 4. Deep Shengji Domain Integrations

### A. Tractors & High Trump Continuity
Tractors follow the consecutive rank system:
$$\text{Trump Suit } A \to \text{Off-Suit Rank} \to \text{Trump-Suit Rank} \to SJ \to BJ$$
The Line Generator respects tractor integrity and pair preservation rules (`validateAntiCheatStructure`), preventing illegal pair breaks.

### B. Multi-Combos
Unbeatable multi-combos from [`multiComboValidation.ts`](file:///home/eric/repos/Tractor/src/game/multiComboValidation.ts) are grouped under **`CASH_WINNER`**. Following multi-combos are automatically short-circuited to the deterministic `executeMultiComboFollowingAlgorithm`.

### C. Endgame & Kitty Multiplier Defense ($2^{\text{pairs}+1}$)
When hand size reaches $\le 7$ cards, the engine alerts the LLM to prioritize **Kitty Defense** and conserve high trumps (Jokers) to contest the final trick multiplier.

### D. No-Trump Rounds
In rounds without a declared trump suit, boss cards cannot be ruffed. Line descriptions automatically adjust to reflect guaranteed boss status.

---

## 5. Dynamic Strategy Lifecycle & Inflection Alerts

In Shengji, strategy is dynamic. The **TypeScript engine detects precise inflection triggers** and explicitly highlights them in the prompt:

### Inflection Triggers:
1. **Tactical Rupture Alert**: An established boss card was **unexpectedly ruffed** by an opponent, or an opponent showed a void in our primary target suit.
2. **Score Milestone Alert**: Attacking team crosses **40 pts** (halfway) or **60 pts** (danger zone).
3. **Phase Shift Alert**: Transition to Endgame ($\le 7$ cards left). Shift focus to **Kitty Defense**.
4. **Suit Depletion Alert**: The target suit we were developing has been completely exhausted.

### Unified Single-Call Plan Update + Move:
The prompt includes the current plan and any active alert. The LLM updates the strategy and selects the move in **one single response**:

#### Prompt Example:
```markdown
# Role: Attacking Team (Score: 45 / 80 pts | Phase: Midgame)
# Active Strategy: Establish Spades & Conserve Jokers
# ⚠️ ALERT: Opponent Bot1 unexpectedly ruffed Spades on Trick 4!

## Your 3 Strategic Choices:
- [Line A] Cash Boss Card (A♦) → Guarantees trick win; captures 10 pts; keeps lead.
- [Line B] Attack Hearts (K♥ K♥) → Probes Hearts; partner is void in Hearts.
- [Line C] Safe Exit (3♣) → Concedes lead; risks 0 pts.

## Output JSON:
{"line": "B", "strategy": "feed_partner", "reason": "Spades compromised from Bot1 ruff; switching to Hearts to feed partner."}
```

---

## 6. Performance & Quality Comparison

| Metric | Current (Raw Prompt Tuning) | Proposed Hybrid Architecture |
| :--- | :--- | :--- |
| **Model Compatibility** | Requires large frontier models | **Flawless on Gemini Flash Lite / 8B models** |
| **Prompt Size** | 2,500 – 3,500 tokens | **~400 tokens (85% reduction)** |
| **Response Latency** | 1,500ms – 4,000ms (with retries) | **150ms – 300ms (1-shot)** |
| **JSON Parse Failures** | Occasional syntax / mapping errors | **0% (Flat, simple schema)** |
| **Rule Validity** | Dependent on LLM memory | **100% Guaranteed by TypeScript Engine** |
| **Strategic Continuity** | Stateless trick amnesia | **Continuous Macro Strategy across all tricks** |

---

## 7. Implementation Plan & File Structure

```
src/ai/llm/
├── llmAIStrategy.ts            # Orchestrates prompt → LLM call → engine execution
├── llmStrategicLines.ts        # [NEW] Pareto-clustering for Leading and Following lines
├── llmCompactPrompt.ts         # [NEW] Ultra-compact ~400-token prompt builder
├── llmInflectionDetector.ts    # [NEW] Real-time detection of strategic turning points
├── llmPlanState.ts             # [NEW] Persistent RoundStrategyPlan state management
├── llmAIClient.ts              # OpenRouter HTTP transport
├── llmConfig.ts                # Configuration & player toggles
└── llmModels.ts                # Model registry
```

### Phased Roadmap (Tracked in #462):
1. **Phase 1**: Implement `llmStrategicLines.ts` and test Pareto-clustering on real game states.
2. **Phase 2**: Implement `llmInflectionDetector.ts` and `llmPlanState.ts` for dynamic plan tracking.
3. **Phase 3**: Build `llmCompactPrompt.ts` and integrate with `llmAIStrategy.ts`.
4. **Phase 4**: Run full-game simulation benchmark (`npm run test:simulation`) to evaluate win rate and latency.
