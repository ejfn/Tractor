# AI System Guide

**Comprehensive AI Intelligence & Strategic Decision Making**

*Related Documentation: [Game Rules](game_rules.md) | [AGENTS.md](../AGENTS.md)*

## Overview

The Tractor AI system implements **memory-enhanced strategic decision-making** with card tracking and opponent modelling. It delivers challenging yet fair gameplay through strong card play, team coordination, and predictive analysis.

**Core Intelligence Features:**
- **Memory-Enhanced Strategy** - Card tracking with guaranteed winner identification
- **Historical Pattern Recognition** - Opponent behavioral analysis and adaptive counter-strategies
- **Position-Based Intelligence** - Specialized logic for all 4 trick positions
- **Strategic Team Coordination** - Optimal cooperation with human teammates
- **Advanced Trump Management** - Hierarchical conservation and strategic deployment

> **Optional LLM layer:** beyond the always-on rule-based engine documented here, an optional language-model layer (`src/ai/llm/`, disabled by default) can make trick-play decisions at genuinely ambiguous moments — see **[LLM Trick-Play Layer](#llm-trick-play-layer-optional)**. The rule-based engine remains the foundation and the fallback.

---

## Modular AI Architecture

The AI system has been **modularized into focused components** organized by functional domain for optimal maintainability and strategic coherence.

### **Architectural Organization**

```text
src/ai/
├── Core System (4 modules)
│   ├── aiLogic.ts              # Public API and game rule compliance
│   ├── aiStrategy.ts           # Core decision-making coordination  
│   ├── aiGameContext.ts        # Game state analysis and context creation
│   └── aiCardMemory.ts         # Memory system and tracking
├── Following Strategies (10 modules)
│   ├── followingStrategy.ts    # Main strategy coordination and routing
│   ├── routingLogic.ts         # Scenario classification and decision routing
│   ├── suitAvailabilityAnalysis.ts # Core scenario analysis with strict combo detection
│   ├── validCombosDecision.ts  # Strategic combo selection and team coordination
│   ├── sameSuitDecision.ts     # Same-suit disposal and contribution logic
│   ├── voidDecision.ts         # Trump and cross-suit decision making
│   ├── crossSuitDecision.ts    # Cross-suit disposal strategies
│   ├── strategicSelection.ts   # Pair-preserving card selection utilities
│   ├── teammateAnalysis.ts     # Advanced teammate situation analysis
│   └── multiComboFollowingStrategy.ts # Multi-combo following logic
├── Leading Strategies (4 modules)
│   ├── leadingStrategy.ts      # Unified scoring-based leading strategy
│   ├── candidateLeadDetection.ts # Detection of all possible lead candidates
│   ├── leadingContext.ts       # Context collection and team analysis
│   └── leadingScoring.ts       # Comprehensive scoring and reasoning system
├── Specialized Systems (2 modules)
│   ├── kittySwap/
│   │   └── kittySwapStrategy.ts # Rule-based exclusion and suit elimination
│   └── trumpDeclaration/
│       └── trumpDeclarationStrategy.ts # Sophisticated declaration timing
└── LLM Layer (6 modules, OPTIONAL — off by default)
    └── llm/
        ├── llmAIStrategy.ts        # Decision orchestration: prompt → validate → retry → fallback
        ├── llmGamePrompt.ts        # Builds the dynamic user prompt from engine analysis
        ├── llmPromptTemplates.ts   # Static rules system prompt + user-prompt template
        ├── llmAIClient.ts          # OpenRouter HTTP transport (fetch / node-https)
        ├── llmConfig.ts            # Config load/persist + enable check
        └── llmModels.ts            # Available models + default
```

The 20 rule-based modules are always active; the LLM layer is a separate, optional
addition described in its own section below.

### **Modular Benefits**

**Functional Coherence:**
- **Following Module**: 10 specialized modules for position-based following strategies
- **Leading Module**: 4 modules for strategic leading decisions and analysis
- **Core System**: 4 modules for fundamental AI operations and memory
- **Specialized Systems**: 2 modules for kitty management and trump declaration

**Development Advantages:**
- **Single Responsibility**: Each module has one clear purpose and domain
- **Easy Testing**: Modular structure enables targeted unit testing
- **Clean Dependencies**: Clear import relationships between modules
- **Logical Organization**: Related functionality grouped together
- **Reduced Complexity**: Large files split into manageable, focused modules

**Strategic Architecture:**
- **Enhanced V2 Following System**: Scenario-based decision routing with strict rule compliance
- **Domain Separation**: Following strategies separate from leading strategies
- **Memory Integration**: Memory system cleanly integrated across all modules
- **Pair Preservation**: Intelligent card selection that preserves valuable combinations
- **Trump Management**: Hierarchical trump logic consistently applied

### **Enhanced V2 Following System**

The V2 following system implements a **scenario-based approach** with strict game rule compliance:

**Core V2 Principles:**
1. **Suit Availability Analysis** → `suitAvailabilityAnalysis.ts` - Classifies scenarios with strict combo detection
2. **Scenario Routing** → `routingLogic.ts` - Routes to appropriate decision handlers
3. **Strategic Selection** → `strategicSelection.ts` - Pair-preserving card selection
4. **Team Analysis** → `teammateAnalysis.ts` - Memory-enhanced teammate evaluation

**V2 Decision Flow:**
- **valid_combos** → Use strategic combo selection with team coordination
- **enough_remaining** → Same-suit disposal/contribution logic  
- **insufficient** → Cross-suit fill with optimal card selection
- **void** → Trump or cross-suit decision making

### **Key Architectural Principles**

**Unified Following Logic**: Consolidated position-aware decision making:
- **Context-Aware Decisions** → Single followingStrategy.ts handles all positions with context-specific logic
- **Strategic Routing** → routingLogic.ts routes decisions based on scenario analysis, not position
- **Team Analysis** → teammateAnalysis.ts provides position-aware teammate evaluation

**Memory-Enhanced Decisions**: Memory system integrated throughout:
- **Leading Strategy** → Scoring-based system with memory-enhanced candidate detection
- **Following Strategy** → Memory-integrated scenario analysis and team coordination
- **Specialized Systems** → Memory-enhanced trump conservation and point timing

---

## LLM Trick-Play Layer (Optional)

Everything above describes the **rule-based engine**, which is always on. Layered on top
is an **optional LLM layer** (`src/ai/llm/`) that, when enabled, makes the trick-play
*judgement* at genuinely ambiguous lead/follow decisions for its **LLM players**. It is
**disabled by default** and requires an OpenRouter API key; the rule-based engine remains
the foundation and the fallback.

### What the LLM decides — and what it doesn't

- **In scope**: lead and follow choices during the **Playing** phase, for the configured
  **LLM players** (default `bot1`, `bot2`, `bot3` — note `bot2` is your teammate).
- **Out of scope**: kitty swap and trump declaration stay fully rule-based.
- **Forced or obvious plays are short-circuited before any API call** (see Adaptive
  Shortcuts below) — the LLM is consulted only where there is a real choice to make.

### The engine feeds the prompt

The LLM does not reason from raw state. The same rule-based modules that drive autonomous
play compute the signals injected into the prompt:

- **Leading** → candidate leads from `candidateLeadDetection.ts`, each carrying a **Rule
  Score** from `leadingScoring.ts`.
- **Following** → the suit-availability scenario (`valid_combos` / `enough_remaining` /
  `insufficient` / `void`), a **Trick Win Security** verdict (SECURED / LIKELY /
  UNCERTAIN), confirmed voids from the memory context, unseen off-suit points, and a
  per-seat **GUIDANCE FOR THIS SEAT** bullet that applies the following rules to the exact
  situation.

The model's job is judgement among already-legal options, not legality or arithmetic.

### Prompt structure

- **System prompt** = `STATIC_LLM_GAME_RULES` (`llmPromptTemplates.ts`): the standing
  trick-play strategy guide (card strength, combos, following/ruffing/leading order,
  position cues, conservation).
- **User prompt** = `buildUserPromptTemplate`, filled by `buildLLMUserPrompt` in
  `llmGamePrompt.ts` with the per-decision state above.
- **Card notation**: cards are named exactly as displayed — `10♦`, `K♥`, `A♠`, plus
  `BJ` / `SJ` for the jokers; the hand groups duplicates with a `×N` count tag. The model
  replies with JSON: `{"reasoning":"…","play":["…"]}`.

### Validation, retry, and fallback

`llmAIStrategy.ts` orchestrates each decision:

1. Call the model (`llmAIClient.ts` → OpenRouter, `temperature: 0.1`, default 15s timeout).
2. Parse JSON → map each notation to a held card → validate against the rules
   (`getPlayValidationError`).
3. On any failure, append a specific corrective hint and retry. **Max 2 attempts** (one
   retry).
4. If still invalid, or on API error/timeout, **fall back to the rule-based pick** for
   that turn.

### Adaptive shortcuts (skip the LLM)

When the play is forced or strategically obvious the engine plays it directly and logs an
`llm_adaptive_shortcut_*` event instead of calling the API:

- **Leading**: round-start ace/king lead (`lead_ace`), unbeatable combo
  (`lead_unbeatable`), only one legal candidate (`lead_single_candidate`).
- **Following**: multi-combo follow (`follow_multi_combo`, delegated to the deterministic
  algorithm), must play the whole hand (`follow_hand_size`), forced to play all remaining
  cards of the led suit (`follow_forced_suit`), only one valid combo
  (`follow_single_combo`).

### Execution path & configuration

- **Async path**: `getAIMoveWithErrorHandlingAsync` → `makeAIPlayAsync` →
  `selectLeadingPlayAsync` / `selectFollowingPlayAsync`, awaited by the `useAITurns` hook.
  The synchronous `getAIMove` stays rule-based (used by tests and simulation).
- **Config** (`llmConfig.ts`): persisted in `localStorage` under `tractor_llm_config` (no
  env vars). Fields: `enabled`, `apiKey`, `model`, `apiUrl`, `timeoutMs`,
  `applyToPlayers`. `isLLMEnabled()` requires `enabled && apiKey`.
- **Models** (`llmModels.ts`): default `google/gemini-2.5-flash-lite`; DeepSeek V3,
  Qwen3 Next 80B, and Llama 3.3 70B also selectable.
---

## Decision Framework

The AI follows a **modular decision framework** with specialized modules handling each strategic component. The decision process is split into two main pathways:

### **Leading Strategy Framework**

Leading flows through the core pipeline (`aiLogic` → `aiStrategy` → `aiGameContext` → `aiCardMemory`) into the scoring-based leading modules: candidate detection (`candidateLeadDetection.ts`) → context collection (`leadingContext.ts`) → scoring (`leadingScoring.ts`) → selection (`leadingStrategy.ts`).

### **Following Strategy Framework**

Following runs the same core pipeline, then checks for a multi-combo lead (handled by `multiComboFollowingStrategy.ts`). Otherwise `suitAvailabilityAnalysis.ts` classifies the scenario (`valid_combos` / `enough_remaining` / `insufficient` / `void`) and `routingLogic.ts` routes to the matching decision module (`validCombosDecision` / `sameSuitDecision` / `crossSuitDecision` / `voidDecision`); the priority chain (teammate support → opponent blocking → trick contention → disposal) and position-specific logic then choose the card.

### **Priority Levels**

**Priority 0: Historical Insights** - Adaptive counter-strategies based on opponent behavioral patterns (activates after 3+ tricks)

**Priority 1: Team Coordination** - Support teammate when winning or set up strategic plays

**Priority 2: Opponent Blocking** - Block opponent point collection with strategic card management

**Priority 3: Trick Contention** - Contest valuable tricks (≥5 points) when winnable

**Priority 4: Strategic Disposal** - Play weakest cards while preserving valuable combinations

## Scoring-Based Leading Strategy

The AI implements a **unified scoring-based leading strategy**: it evaluates every candidate lead with a single scoring function and plays the highest-scoring option, keeping leading decisions transparent and debuggable.

### **Core Architecture**

#### **4-Module System**

1. **Candidate Detection (`candidateLeadDetection.ts`)**: Finds ALL possible leads
   - **Multi-combo detection**: Unbeatable multi-combos from each non-trump suit
   - **Straight combo detection**: All tractors, pairs, and singles from hand
   - **Unbeatable analysis**: Memory-enhanced detection of guaranteed winners
   - **Deduplication**: Prevents overlap between multi-combo and straight combos

2. **Context Collection (`leadingContext.ts`)**: Gathers strategic information
   - **Void status analysis**: Checks if all other players are void in each suit
   - **Team information**: Current attacking/defending team status
   - **Point pressure**: Calculated based on current team progress
   - **Game phase**: Early, mid, or endgame strategic context

3. **Scoring Evaluation (`leadingScoring.ts`)**: scores each candidate by combining
   - **Base card values** — higher ranks score higher
   - **Pair bonuses** — pairs beat singles; trump pairs weighted above non-trump
   - **Unbeatable bonus** — guaranteed winners score highest
   - **Trump penalty** — trump cards are penalised to encourage conservation
   - **Void-suit adjustment** — bonus for leading a teammate-void suit, penalty for an opponent-void suit
   - *(exact weights live in `leadingScoring.ts`)*

4. **Selection & Execution (`leadingStrategy.ts`)**: Chooses best option
   - **Score ranking**: Sorts all candidates by total score
   - **Tie breaking**: Uses card strength for equal scores
   - **Fallback handling**: Graceful degradation when no candidates found
   - **Comprehensive logging**: Detailed reasoning for analysis

### **Strategic Priorities**

In effect the scoring ranks leads roughly as: guaranteed-unbeatable leads first, then high-value pairs over singles, then stronger cards over weaker — while penalising trump (to conserve it) and rewarding a lead into a teammate's void. See `leadingScoring.ts` for the exact formula and weights.

### **Decision Process**

1. **Comprehensive Detection**: Find every possible lead candidate
2. **Context Analysis**: Gather void status and team information
3. **Score Calculation**: Evaluate each candidate with detailed reasoning
4. **Best Selection**: Choose highest scoring option with tie-breaking
5. **Execution**: Play selected cards with comprehensive logging

### **Benefits Over Priority Chain**

- **Transparency**: Clear scoring makes decisions easy to understand and debug
- **Maintainability**: Simple to adjust individual scoring components
- **Consistency**: All leads evaluated by same criteria, no special cases
- **Flexibility**: Easy to add new scoring factors or adjust existing ones
- **Performance**: Single pass evaluation faster than multiple priority checks

---

## Memory-Enhanced Strategy

The AI implements a **comprehensive memory system** that tracks cards, analyzes patterns, and enables sophisticated strategic decision-making based on accumulated game knowledge.

### **Core Memory Components**

#### Card Memory Tracking (`aiCardMemory.ts`)

- **Played Card Tracking**: Complete record of all cards played throughout the game
- **Hand Size Estimation**: Dynamic tracking of estimated cards remaining per player
- **Suit Void Detection**: Automatic detection when players can no longer follow suit
- **Trump Exhaustion Analysis**: Tracking trump depletion levels for all players

#### Advanced Analysis Integration

- **Void Analysis**: Integrated into following strategy modules for strategic exploitation
- **Point Timing**: Memory-enhanced optimization integrated into scoring system

### **Guaranteed Winner Detection**

The AI identifies cards that are certain to win based on comprehensive memory analysis:

#### Detection Logic

- **Singles Logic**: K♥ wins if both A♥ copies have been played
- **Pairs Logic**: Q♥-Q♥ wins if ANY A♥ or K♥ has been played
- **Trump Logic**: Accounts for trump hierarchy and remaining trump cards
- **Cross-Suit Analysis**: Considers void patterns for guaranteed trick wins

#### Strategic Applications

- **Point Collection Priority** - Play guaranteed point winners before opponents run out of suit
- **Optimal Sequencing** - Order plays based on remaining card knowledge and certainty
- **Risk Minimization** - Use certain winners to secure valuable tricks with minimal waste
- **Endgame Precision** - Leverage perfect information in final tricks for maximum points

### **Advanced Void Exploitation**

#### Smart Void Analysis

- **Confirmed Voids**: Definitively identified when players trump or discard
- **Probable Voids**: Statistical analysis based on play patterns and card distribution
- **Teammate vs Opponent Strategy**: Different exploitation approaches based on team relationships

#### Teammate Void Strategy (Smart Point Collection)

When a teammate is void in a suit, lead it **for points** if the teammate can ruff and there are meaningful points to win; otherwise **avoid leading it** so the teammate isn't forced to spend trump on a low-value trick.

#### Opponent Void Strategy (Aggressive Exploitation)

- **Force Trump Waste**: Lead void suits to exhaust opponent trump cards
- **Strategic Isolation**: Use void knowledge for optimal trick timing
- **Multi-Suit Patterns**: Exploit complex void combinations

### **Trump Exhaustion & Conservation**

#### Dynamic Trump Analysis

- **Exhaustion Tracking**: Monitor trump depletion across all players
- **Conservation Values**: Dynamic hierarchy based on remaining trump distribution
- **Timing Optimization**: Optimal trump usage based on exhaustion analysis

#### Conservation Hierarchy

Trump is conserved by a fixed value ordering (jokers > trump-rank cards > trump-suit regulars) — see [Trump Management](#trump-management) for the full hierarchy.

### **Unified Memory Integration**

The memory system is seamlessly integrated across all AI decision modules:

#### Following Decision Integration

- **Context-Aware Memory**: All trick positions receive memory-enhanced context through aiGameContext.ts
- **Scenario Analysis**: suitAvailabilityAnalysis.ts uses memory for void detection and card tracking
- **Team Coordination**: teammateAnalysis.ts leverages memory for optimal teammate support decisions

#### Strategic Enhancement

- **Guaranteed Winner Detection**: Memory identifies cards certain to win based on played card tracking
- **Void Exploitation**: Real-time void analysis using memory-tracked suit exhaustion
- **Conservation Decisions**: Memory-informed trump and point card conservation strategies

### **Memory System Benefits**

#### Intelligence Enhancement

- **Improved decision quality** through comprehensive card tracking
- **Strategic Depth**: Complex void exploitation and point timing optimization
- **Predictive Analysis**: Anticipate opponent capabilities based on memory
- **Team Coordination**: Smart teammate strategies that maximize point collection

## Memory System Implementation

The AI memory system provides **comprehensive card tracking** and **strategic analysis** to enable intelligent decision-making.

### **Core Memory Functions**

#### **Memory Context Creation**

```typescript
// Creates comprehensive memory context for AI decisions
export function createMemoryContext(gameState: GameState): MemoryContext
```

**Key Features:**
- **Card Tracking** - Complete record of all played cards
- **Void Detection** - Automatic detection of suit exhaustion
- **Trump Analysis** - Strategic trump usage analysis
- **Point Collection** - Optimal timing for point card collection

#### **Strategic Memory Usage**

**Memory Integration in AI Modules:**
- **Leading Strategy** - Uses memory for guaranteed winner detection
- **Following Strategy** - Leverages void analysis for optimal responses
- **Multi-Combo Logic** - Memory-enhanced unbeatable combo detection
- **Trump Management** - Conservation decisions based on trump depletion

**Performance Characteristics:**
- **Efficient Processing** - designed for real-time decision making
- **Memory Efficiency** - clean data structures without redundancy

---

## Position-Based Intelligence

The AI adapts its strategy based on trick position, leveraging unique advantages of each playing order:

### **Leading Player Strategy**

**Strategic Capabilities:**
- **Memory-Enhanced Leading** - Guaranteed winner identification for optimal timing
- **Game Phase Adaptation** - Early probing vs mid-game aggression vs endgame control
- **Information Management** - Balance between learning and hand concealment
- **Point Collection Priority** - Aces and Kings before tractors when guaranteed

#### **Weak Multi-Combo Leading**

The AI uses a context-aware approach to leading weak multi-combos (e.g., two or three small, non-point singles). This prevents the AI from making risky, low-value leads in critical game situations.

**Decision Logic:**
- **Attacking Team**: The AI will lead a weak multi-combo to probe for opponent responses and gain information.
- **Defending Team**: The AI will only lead a weak multi-combo when the `pointPressure` is `LOW`. This ensures the defending team plays conservatively and avoids giving up the lead unnecessarily when the attacking team is close to winning.

### **Following Player Strategy**

All following positions use the same priority framework but with position-specific tactical advantages:

**Position-Specific Advantages:**

**2nd Player (Early Follower):**
- **Partial Information** - Can influence remaining 2 players
- **Setup Opportunities** - Position teammates for optimal responses
- **Early Blocking** - Prevent opponent momentum

**3rd Player (Enhanced Takeover Logic):**
- **Strategic Value Analysis** - Uses `calculateCardStrategicValue()` for lead strength assessment
- **Trump Weakness Detection** - Recognizes that leading trump often indicates strategic weakness
- **Intelligent Takeover Decisions** - Dynamic takeover vs support based on teammate lead strength
- **Risk Assessment** - Comprehensive analysis with memory-enhanced decision making

#### **Enhanced 3rd Player Takeover System**

The AI uses strategic value analysis to determine when to take over from a teammate:

**Strategic Value Thresholds:**
- **Strong** (≥170): Jokers, trump rank cards → Support teammate
- **Moderate** (110-169): High trump suit cards (J, Q, K, A) → Strategic evaluation  
- **Weak** (<110): Low trump cards ≤ 10, forced plays → Consider takeover

**Key Enhancement - Trump Analysis:**
```typescript
// Trump analysis based on strategic value
if (strategicValue >= 170) {
  leadStrength = "strong"; // Jokers, trump rank cards
} else if (strategicValue > 110) {
  leadStrength = "moderate"; // Trump suit cards > 10 (J, Q, K, A)
} else {
  leadStrength = "weak"; // Trump suit cards ≤ 10 (forced play)
  vulnerabilityFactors.push("low_trump_forced_play");
}
```

**Non-Trump Analysis:** Uses `isBiggestInSuit()` utility to identify theoretical card strength:
- **Strong**: Ace when Ace is not trump rank, King when Ace is trump rank
- **Moderate**: Queen, Jack (strategic value ~12, 11)  
- **Weak**: 10 and below → potential takeover scenario

**Takeover Decision Logic:**
- **Weak + Vulnerable**: Immediate takeover recommendation
- **Moderate**: Strategic evaluation based on risk assessment
- **Strong**: Support teammate with point contribution

**4th Player (Perfect Information):**
- **Complete Visibility** - All 3 cards played before decision
- **Optimal Decisions** - Perfect information for point maximization
- **Strategic Precision** - Minimal waste, maximum effectiveness

---

## Advanced Strategic Capabilities

### **Trump Management**

The AI uses sophisticated trump conservation with hierarchical values:

**Conservation Hierarchy:**
```
Big Joker (100) > Small Joker (90) > Trump Rank in Trump Suit (80) > 
Trump Rank in Off-Suits (70) > Trump Suit Cards (A♠:60 → 3♠:5)
```

**Strategic Principles:**
- **Hierarchical Preservation** - Play weakest trump when forced (3♠, 4♠)
- **Valuable Trump Protection** - Preserve trump rank cards and jokers
- **Memory-Enhanced Usage** - Track opponent trump depletion for optimal timing
- **Strategic Deployment** - Use trump exhaustion analysis for perfect timing

### **Kitty Swap Strategy**

The AI employs a **streamlined rule-based approach** with clear exclusion principles and intelligent suit elimination when managing the 8-card kitty.

**Core Exclusion Rules (Never Dispose):**
- **No Trump Cards** - All trump cards preserved for strategic advantage
- **No Biggest Cards** - Aces and Kings always protected regardless of suit
- **No Tractors** - Consecutive pairs preserved for powerful combinations
- **No Big Pairs** - Pairs with rank > 7 preserved for strategic value

**Unified Strategy Framework:**

The AI uses a single, clean approach that handles both normal and strong hand scenarios:

1. **Apply Basic Exclusions** - Categorize all cards into disposable vs excluded
2. **Sufficient Disposables (≥8 cards)**: Use intelligent suit elimination strategy
3. **Insufficient Disposables (<8 cards)**: Use ALL disposables + value-sorted exclusions

**Intelligent Suit Elimination (≥8 Disposables):**
- **Trump Strength Evaluation**: Normal (≤9), Strong (10-14), Very Strong (15+)
- **Suit Elimination Scoring**:
  - **Prefer Shorter Suits** - 2-6 card suits prioritized for elimination
  - **Penalize Point Cards** - 10s and 5s avoided (penalty reduced with stronger trump)
  - **Penalize Kings** - Even disposable Kings avoided when possible
  - **Bonus Non-Point Suits** - Ideal elimination targets for strategic voids

**Simple Value Selection (<8 Disposables):**
- **Use ALL disposable cards first** - Every non-valuable card included
- **Fill remainder from exclusions** - Simple strategic value sorting for remaining slots
- **Automatic Trump Hierarchy** - Conservation values ensure optimal trump disposal order

**Conservation Hierarchy for Trump Disposal:**
When forced to dispose trump cards, the AI follows strict conservation values:
- **Weakest Trump First**: 3♠ (5) → 4♠ (10) → 5♠ (15) → ... → K♠ (55) → A♠ (60)
- **Trump Rank Priority**: Off-suit trump rank (70) vs trump suit trump rank (80)
- **Joker Protection**: Big Joker (100) and Small Joker (90) never disposed

**Strategic Advantages:**
- **Single Function Design** - One streamlined function eliminates duplicate logic
- **Predictable Logic** - Clear, maintainable rules that avoid edge cases
- **Value Preservation** - Systematic exclusion ensures optimal card selection
- **Clean Codebase** - Simplified architecture with no redundant validation
- **Conservation Hierarchy** - Optimal trump disposal when forced by exceptional hand scenarios
- **Bug Prevention** - Rule-based approach eliminates previous issues with valuable card disposal

### **Shared Utility Functions**

The AI system uses several shared utility functions for consistent strategic analysis:

**`isBiggestInSuit(card, trumpInfo)`** - Determines theoretical card strength:
- Returns `true` for Ace when Ace is not trump rank
- Returns `true` for King when Ace is trump rank (making King strongest)
- Used across multiple AI modules for consistent strength evaluation
- Critical for 3rd player takeover analysis and lead strength assessment

**`calculateCardStrategicValue(card, trumpInfo, mode)`** - Core strategic evaluation:
- Provides numerical values for strategic decision-making
- Supports multiple modes: "basic", "strategic", "contribute"
- Used throughout the AI system for consistent card evaluation
- Forms the foundation of the enhanced 3rd player takeover logic

### **Trump Declaration Strategy**

During progressive dealing, the AI uses sophisticated declaration logic:

**Strategic Capabilities:**
- **Hand Quality Focus** - Prioritizes suit length over high cards (7+ cards recommended)
- **Timing Optimization** - Peak declaration window at 40-70% of dealing
- **Override Intelligence** - Strategic decisions on when to override opponents
- **Team Coordination** - Consider teammate implications and positioning

---

## Strategic Disposal Hierarchy

When the AI cannot win a trick, it follows a sophisticated disposal system:

**Disposal Categories:**
- **Safe Cards** - No trump, no Ace, no points (7♣, 8♠, 9♦)
- **Good Cards** - Lose an Ace but no points given (A♣, Q♠, J♦)
- **Acceptable Cards** - Give away points but save trump (5♣, 10♠, K♦)
- **Forced Cards** - Trump cards only when no choice (3♦, 4♦)

---

## Performance & User Experience

### **Decision Quality**

- **Rule Compliance** - complete adherence to complex Tractor/Shengji rules
- **Strategic Optimisation** - card-tracking and memory inform stronger play than naive heuristics
- **Position-Based Logic** - specialised decisions for all 4 trick positions
- **Modular Efficiency** - focused modules avoid redundant calculation

### **Strategic Effectiveness**

**Gameplay Impact:**
- **Challenging Opponent** - Consistent challenge without being unfair
- **Strategic Intelligence** - Memory-enhanced decision making
- **Team Coordination** - Effective cooperation with human teammate
- **Strategic Depth** - Multiple decision layers create engaging gameplay

**User Experience:**
- **Predictable Framework** - Consistent strategic approach
- **Tactical Variety** - Position-based and context-aware decisions
- **Fair Competition** - Challenging but beatable opponent
- **Educational Value** - Demonstrates advanced Tractor/Shengji strategy
- **Maintainable Codebase** - Modular architecture enables rapid feature development and bug fixes

---

## Summary

The Tractor AI system delivers strong strategic gameplay through memory-enhanced intelligence and a modular architecture:

### **Core Capabilities**

**Strategic Intelligence:**
- **Perfect Rule Compliance** - Complete adherence to complex Tractor/Shengji rules
- **Memory-Enhanced Decisions** - Card tracking with guaranteed winner identification
- **Scoring-Based Leading** - Transparent, maintainable scoring system for all leading decisions
- **Position-Based Following** - Specialized logic for all 4 trick positions with scenario-based routing
- **Multi-Combo Integration** - Complete support for complex multi-combo scenarios

**Modular Architecture:**
- **Modular Architecture** - 20 rule-based modules (4 core + 10 following + 4 leading + 2 specialised) plus an optional 6-module LLM layer
- **Unified Leading Strategy** - Scoring-based system with transparent decision making
- **4-Priority Following Chain** - Conflict-free strategic decision making for following scenarios
- **Domain Separation** - Clean separation between following, leading, and specialized systems
- **Single Responsibility** - Each module has one clear purpose and strategic focus

**Decision Framework:**
- **Scoring-Based Leading** - Comprehensive candidate evaluation with transparent scoring
- **Scenario-Based Following** - Enhanced V2 system with strict rule compliance
- **Team Coordination** - Optimal cooperation with human teammates via specialized modules
- **Advanced Trump Management** - Hierarchical conservation and strategic deployment
- **Strategic Disposal** - Multi-level card safety prioritization with conservation values

**Performance & Maintainability:**
- **Responsive** - synchronous rule-based decisions suitable for real-time play
- **Modular Efficiency** - Specialized modules eliminate redundant calculations
- **Easy Testing** - Modular structure enables comprehensive unit testing
- **Rapid Development** - Clean architecture supports quick feature additions and bug fixes

The AI system successfully balances **strategic sophistication** with **enjoyable gameplay** and **maintainable code architecture**, creating a challenging opponent that provides engaging long-term play through intelligent decision-making, continuous adaptation, and a robust foundation for future enhancements.

---

**See Also:**

- **[Game Rules](game_rules.md)** - Complete Tractor/Shengji rules and strategy guide
- **[AGENTS.md](../AGENTS.md)** - Development guidelines and project architecture