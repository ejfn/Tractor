# MultiCombo System Architecture Documentation

**Comprehensive Analysis of the Tractor MultiCombo Implementation**

*Part of the Tractor Card Game Project | Related Documentation: [Game Rules](GAME_RULES.md) | [AI System](AI_SYSTEM.md) | [Multi-Combo Algorithms](MULTI_COMBO_ALGORITHMS.md)*

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Components](#architecture-components)
3. [Data Structures](#data-structures)
4. [Core Algorithms](#core-algorithms)
5. [Validation Flows](#validation-flows)
6. [AI Integration](#ai-integration)
7. [Integration Points](#integration-points)

---

## System Overview

### What is a MultiCombo?

In Tractor/Shengji, a **MultiCombo** is multiple combos from the same suit played simultaneously. Examples:
- **`A♥ + K♥ + Q♥`** = 3 singles from Hearts (valid multi-combo)
- **`A♥A♥ + K♥`** = pair + single from Hearts (valid multi-combo)  
- **`K♥K♥-Q♥Q♥ + J♥ + 9♥`** = tractor + singles from Hearts (valid multi-combo)

**🚨 CRITICAL: NOT "multiple combination types" - that is completely wrong! MultiCombo = multiple combos from same suit!**

### Core Principles

1. **All same suit**: Multi-combos must be from a single non-trump suit for leading
2. **Unbeatable requirement**: Each component combo must be unbeatable by other players OR all other players must be void in that suit
3. **Structure matching**: Following players must match the total length and try to match the combination structure (match higher combo types as much as they can), and then fallback to play any cards when exhausted
4. **Trump responses**: Trump cards can beat non-trump multi-combos with matching structure only when exhausted of the leading suit
5. **Trump vs trump**: When multiple players respond with trump to a multi-combo, the strongest trump response wins by comparing the highest combo type only (tractors > pairs > singles)

### Core Components

#### 1. **Human leading validation**: Validate human multi-combo lead attempts for rule compliance
- **Implementation**: `multiComboLeadingStrategies.ts` → `validateMultiComboLead()` 
- **Integration**: Called by `playValidation.ts` → `isValidPlay()` when human leads multi-combo
- **Logic**: Validates same suit requirement, checks unbeatable status or void condition for each component combo

#### 2. **AI leading detection and strategy**: AI detection of unbeatable multi-combo opportunities and strategic selection
- **Implementation**: `ai/leading/leadingStrategy.ts` → `selectAIMultiComboLead()` (Priority 1)
- **Integration**: Called by main AI leading logic as highest priority option
- **Logic**: Scans each non-trump suit for unbeatable combos, selects suit with maximum unbeatable cards using memory system

#### 3. **AI following selection and strategy**: AI systematic algorithm for responding to multi-combo leads
- **Implementation**: `ai/following/multiComboFollowingStrategy.ts` → `executeMultiComboFollowingAlgorithm()`
- **Integration**: Called by main AI following logic when multi-combo detected
- **Logic**: 3-section algorithm (same-suit → trump → cross-suit) with progressive filtering and strategic decisions, includes AI trump response strategy when exhausted of leading suit

#### 4. **Following validation**: Validate following attempts with simple same-suit check and exhaustion rule
- **Implementation**: `playValidation.ts` → `validateMultiComboFollowing()` for same-suit structure matching
- **Integration**: Called by main `isValidPlay()` when multi-combo following detected
- **Logic**: If all cards from leading suit → validate structure matching, otherwise → always valid (exhaustion rule)

#### 5. **Trump vs trump comparison**: Trump multi-combo strength comparison using highest combo type priority
- **Implementation**: `cardComparison.ts` → `compareTrumpMultiCombos()` function - core logic for determining if one multi-combo beats another
- **Integration**: 
  - Called by AI following strategy for trump vs trump decision-making
  - Used by `canMultiComboBeaten()` for multi-combo trick winner determination (separated from straight combo logic)
- **Logic**: Compares highest combo type first (tractors > pairs > singles), then compares strength within that type using trump hierarchy
- **Key Enhancement**: `getHighestComboOfType()` allows higher combo types to satisfy lower requirements (e.g., trump pair can beat single multi-combo)

### System Architecture Philosophy

The MultiCombo system follows a **modular, separation-of-concerns approach**:

- **Detection**: Identify multi-combo patterns in card selections
- **Analysis**: Break down multi-combos into component combinations
- **Validation**: Ensure game rule compliance for leading/following
- **Strategy**: AI decision-making for optimal multi-combo play
- **Integration**: Seamless connection with existing game systems

---

## Architecture Components

### Core Module Structure

```
src/game/
├── multiComboAnalysis.ts          # Core detection and component analysis with isLeading flag
├── multiComboValidation.ts        # Unbeatable analysis and void detection
├── cardComparison.ts              # Enhanced trump comparison with canMultiComboBeaten()
└── playValidation.ts              # Integration with main game validation

src/ai/following/
└── multiComboFollowingStrategy.ts # AI following algorithm implementation

src/ai/leading/
└── multiComboLeadingStrategy.ts   # AI leading selection and strategy

__tests__/game/
├── multiComboAnalysis.test.ts     # Structure analysis tests
├── multiComboFollowing.test.ts    # Following validation tests
├── multiComboUnbeatable-*.test.ts # Unbeatable detection tests
└── multiComboTrumpStructureMatching.test.ts # Trump structure matching tests

__tests__/ai/
└── multiComboFollowingAI.test.ts  # AI strategy tests
```

---

## Data Structures

### Core Types

#### **MultiComboStructure** (defined in `src/types/card.ts`)
```typescript
type MultiComboStructure = {
  suit: Suit;                    // Specific suit or Suit.None for trump multi-combos
  components: MultiComboComponents;
  isLeading: boolean;            // Leading vs following context
};
```

#### **MultiComboComponents** (defined in `src/types/card.ts`)
```typescript
type MultiComboComponents = {
  totalLength: number;           // Total cards in multi-combo
  totalPairs: number;            // Total pairs (includes standalone pairs + pairs within tractors)
  tractors: number;              // Count of tractors
  tractorSizes: number[];        // Length of each tractor (in pairs)
};
```

#### **MultiComboDetection** (defined in `src/types/combinations.ts`)
```typescript
interface MultiComboDetection {
  isMultiCombo: boolean;         // Whether cards form a valid multi-combo
  structure?: MultiComboStructure; // Structural analysis
  components?: Combo[];          // Individual combos within multi-combo
  validation?: MultiComboValidation; // Detailed validation results
}
```

#### **MultiComboValidation** (defined in `src/types/combinations.ts`)
```typescript
interface MultiComboValidation {
  isValid: boolean;              // Overall validation result
  invalidReasons: string[];      // Specific failure reasons
  voidStatus: {
    allOpponentsVoid: boolean;   // Whether all 3 other players are void
    voidPlayers: PlayerId[];     // List of void player IDs
  };
  unbeatableStatus: {
    allUnbeatable: boolean;      // Whether all components are unbeatable
    beatableComponents: {       // Components that can be beaten
      combo: Combo;
      beatenBy: string;          // Description of what can beat it
    }[];
  };
}
```

### Component Analysis Types

#### **Combo** (defined in `src/types/card.ts`)
```typescript
type Combo = {
  type: ComboType;               // Single, Pair, Tractor, MultiCombo
  cards: Card[];                 // Cards in this combination
  value: number;                 // Relative hand strength for comparison
  isBreakingPair?: boolean;      // Whether this combo breaks up a valuable pair
  multiComboStructure?: MultiComboStructure; // For MultiCombo type only
};
```

---

## Core Algorithms

### 1. Multi-Combo Detection Algorithm

**Location**: `multiComboAnalysis.ts` → `analyzeComboStructure()`

**Purpose**: Break down cards into optimal non-overlapping combinations with context-aware multi-combo detection

**Key Enhancement**: **`isLeading` Flag**
- **Leading combos** (`isLeading=true`): Must have ≥2 combos to be considered multi-combo
- **Following combos** (`isLeading=false`): Can be single combo (e.g., trump pair beating two singles)
- **Use case**: Trump pair can beat single multi-combo by providing highest single card

**Algorithm Flow**:
```
Input: Cards from same suit/trump group + isLeading flag
↓
1. Use identifyCombos() to find all possible combinations
↓
2. Apply optimal decomposition algorithm:
   - Priority: Tractor > Pair > Single
   - Use largest combos first
   - Ensure no card overlap
↓
3. Check multi-combo requirement:
   - If isLeading=true AND combos.length < 2 → return null
   - Otherwise → return component analysis
↓
4. Return non-overlapping combination set with structure metadata
```

**Key Implementation**:
```typescript
function findOptimalComboDecomposition(cards: Card[], allCombos: Combo[]): Combo[] {
  // Sort by priority and size
  const sortedCombos = allCombos.sort((a, b) => {
    const typePriority = { Tractor: 3, Pair: 2, Single: 1 };
    const priorityDiff = typePriority[b.type] - typePriority[a.type];
    if (priorityDiff !== 0) return priorityDiff;
    return b.cards.length - a.cards.length; // Larger first
  });

  // Greedy selection with overlap prevention
  const usedCardIds = new Set<string>();
  const selectedCombos: Combo[] = [];
  
  for (const combo of sortedCombos) {
    const hasOverlap = combo.cards.some(card => usedCardIds.has(card.id));
    if (!hasOverlap) {
      selectedCombos.push(combo);
      combo.cards.forEach(card => usedCardIds.add(card.id));
    }
  }
  
  return selectedCombos;
}
```

### 2. Unbeatable Analysis Algorithm

**Location**: `multiComboValidation.ts` → `isComboUnbeatable()`

**Purpose**: Determine if a combo cannot be beaten by cards available to all other players

**Memory System Integration**: Uses AI card memory system to track played cards and determine what's available to all other players

**Kitty Card Visibility**: 
- **Round Starter Only**: Kitty cards are visible only to the round starter (first trick leader of each round)
- **Other Players**: Kitty cards remain hidden and must be considered as potentially available to all other players
- **Asymmetric Information**: Unbeatable analysis differs based on player's kitty visibility

**Algorithm Logic**:
```
Available to others = Total cards (108) - playedCards - currentPlayer'sHand - kittyCards (if visible)
(playedCards sourced from memory.playedCards for accurate tracking)
(kittyCards included only if current player is the round starter)

For Singles (e.g., K♥):
  ✅ Unbeatable if A♥ already played (tracked in memory) OR A♥ in visible kitty
  ⚠️ Beatable if A♥ could exist in all other players' hands OR hidden kitty

For Pairs (e.g., Q♥Q♥):
  ✅ Unbeatable if ANY higher rank played (A♥ OR K♥ in memory/kitty)
  ⚠️ Beatable if both A♥A♥ and K♥K♥ could exist in all other players' hands/hidden kitty

For Tractors (e.g., A♥A♥-K♥K♥):
  ✅ Always unbeatable (highest possible)
  ⚠️ Beatable only if higher tractor possible in all other players' hands/hidden kitty
```

**Implementation Example**:
```typescript
function isComboUnbeatable(
  combo: Combo,
  suit: Suit,
  playedCards: Card[], // From memory.playedCards
  ownHand: Card[],
  trumpInfo: TrumpInfo,
  visibleKittyCards: Card[], // Actual kitty for round starter, [] for others
): boolean {
  // Get all possible unseen combos considering kitty visibility
  const unseenCombos = findAllPossibleUnseenCombos(
    suit, 
    playedCards,
    ownHand,
    trumpInfo,
    visibleKittyCards
  );
  
  switch (combo.type) {
    case ComboType.Single:
      return !unseenCombos.singles.some(card => 
        isCardStronger(card, combo.cards[0], trumpInfo)
      );
    case ComboType.Pair:
      return !unseenCombos.pairs.some(pair => 
        isPairStronger(pair, combo.cards, trumpInfo)
      );
    case ComboType.Tractor:
      return !unseenCombos.tractors.some(tractor => 
        isTractorStronger(tractor, combo.cards, trumpInfo)
      );
  }
}

// Usage with memory system and kitty visibility:
const memory = createCardMemory(gameState);
const isRoundStarter = gameState.currentPlayerIndex === gameState.roundStartingPlayerIndex;
const visibleKittyCards = isRoundStarter ? gameState.kittyCards : [];
const isUnbeatable = isComboUnbeatable(
  combo, 
  suit, 
  memory.playedCards, 
  ownHand, 
  trumpInfo,
  visibleKittyCards
);
}
```

### 3. Multi-Combo Following Algorithm

**Location**: `multiComboFollowingStrategy.ts` → `executeMultiComboFollowingAlgorithm()`

**Purpose**: Systematic approach to following multi-combo leads

**3-Section Algorithm**:

#### **Section A: Same-Suit Following**
```
A1: Do I have cards in led suit?
    NO → Go to Section B (Trump)
    YES → Continue

A2: Do I have enough cards (≥ leading length)?
    NO → Use all remaining + cross-suit fill
    YES → Continue

A3: Leading has pairs/tractors? Do I have enough pairs?
    NO → Same-suit disposal/contribution
    YES → Continue

A4: Leading has tractors? Do I have matching tractors?
    NO → Same-suit disposal/contribution
    YES → Play matching multi-combo!
```

#### **Section B: Trump Following**
```
B1: Do I have trump cards?
    NO → Go to Section C (Cross-suit)
    YES → Continue

B2: Do I have enough trump (≥ leading length)?
    NO → Go to Section C
    YES → Continue

B3: Leading has pairs/tractors? Do I have enough trump pairs?
    NO → Go to Section C
    YES → Continue

B4: Leading has tractors? Do I have matching trump tractors?
    NO → Go to Section C
    YES → Continue

B5: Strategic decision (trump it, beat existing trump, or dispose)
```

#### **Section C: Cross-Suit Disposal**
```
Play lowest value cards to match required length
```

### 4. Enhanced Trump Comparison Algorithm

**Location**: `cardComparison.ts` → `getHighestComboOfType()`

**Purpose**: Extract highest card of required type, allowing higher combo types to satisfy lower requirements

**Problem Solved**: Previously, when leading required "singles" but response had "pairs", the filter logic couldn't find matching combos because it looked for exact type matches. This caused trump pairs to be unable to beat single multi-combos.

**Key Innovation**: **Hierarchical Type Satisfaction**
- **Tractor requirement**: Only tractors can satisfy (most restrictive)
- **Pair requirement**: Pairs OR tractors can satisfy (tractors contain pairs)  
- **Single requirement**: Any combo can satisfy (all combos contain single cards)

**Algorithm Flow**:
```
Input: Combos + target combo type + trump info
↓
1. Collect candidate cards based on type hierarchy:
   - Tractor target → Only tractor cards qualify
   - Pair target → Pair + tractor cards qualify  
   - Single target → All combo cards qualify
↓
2. Find highest card among candidates using trump comparison
↓
3. Return strongest card that satisfies requirement
```

**Critical Use Case**:
```
Leading: K♠ + Q♠ (2 singles) → required type = Single
Response: A♥A♥ (trump pair) → candidates = [A♥, A♥] → highest = A♥
Result: Trump pair beats singles by providing A♥ as highest single
```

### 5. Structure Matching Algorithm

**Location**: `multiComboAnalysis.ts` → `matchesRequiredComponents()`

**Purpose**: Validate that following multi-combo matches required structure

**5-Step Validation**:
```
Step 1: Total length check (must match exactly)
Step 2: Total pairs check (≥ required pairs)
Step 3: Tractors count check (≥ required tractors)
Step 4: Tractor pairs check (≥ required tractor pairs)
Step 5: Maximum tractor size check (≥ longest required tractor)
```

---

## Validation Flows

### Leading Multi-Combo Validation

**Entry Point**: `playValidation.ts` → `isValidPlay()` → Multi-combo detection

**Flow Diagram**:
```
Human/AI selects cards for leading
↓
detectLeadingMultiCombo() - Check if it's a multi-combo
↓
validateMultiComboLead() - Comprehensive validation
↓
Check: All non-trump? Same suit? Valid components?
↓
validateLeadingMultiCombo() - Unbeatable/void analysis
↓
Result: VALID (can lead) or INVALID (with reasons)
```

**Critical Rules**:
1. **Non-trump only**: Leading multi-combos must be from non-trump suits
2. **Unbeatable OR void**: Either each component is unbeatable OR all other players are void
3. **Structure validity**: Must form valid combination components

### Following Multi-Combo Validation

**Entry Point**: `playValidation.ts` → `isValidPlay()` → Multi-combo following detection

**Flow Diagram**:
```
Leading multi-combo detected
↓
Determine following scenario:
├── All from leading suit → Multi-combo structure validation
├── All trump → Trump structure matching
└── Mixed suits → Exhaustion/disposal validation
↓
Apply exhaustion rule OR anti-cheat algorithm
↓
Result: VALID or INVALID
```

**Critical Exhaustion Rule**:
```typescript
// THE FUNDAMENTAL RULE: If player is void in leading suit AFTER play → ALWAYS VALID
const remainingRelevantCards = playerHand.filter(
  (card) =>
    !playedCards.some((played) => played.id === card.id) &&
    card.suit === leadingSuit &&
    !isTrump(card, trumpInfo),
);
if (remainingRelevantCards.length === 0) {
  return true; // VALID - exhaustion rule applies
}
```

### Anti-Cheat Validation Algorithm

**Purpose**: Prevent players from hiding better combinations when they can't meet structure requirements

**Algorithm**:
```
Input: playedCards, playerHand, leadingStructure, trumpInfo

Step 1: Get requirements from leading combo
Step 2: Analyze structure of played cards
Step 3: Analyze best possible structure from all relevant cards
Step 4: Validation checks:
        - Pair check: Could player have played more pairs?
        - Tractor check: Could player have played more tractors?
        - Length check: Could player have used longer tractors?
        
Result: VALID if player used best possible structure
```

---

## AI Integration

### AI Leading Strategy

**Location**: `ai/leading/leadingStrategy.ts` → Priority 1: Multi-combos

**Integration Point**:
```typescript
// === PRIORITY 1: MULTI-COMBOS (UNBEATABLE STRATEGY) ===
const multiComboPlay = selectAIMultiComboLead(
  currentPlayer.hand,
  gameState,
  currentPlayer.id,
);
if (multiComboPlay) {
  return multiComboPlay;
}
```

**AI Algorithm**:
1. **Check each non-trump suit** for unbeatable opportunities
2. **Use memory system** to detect void status and played cards
3. **Select suit with most unbeatable cards** total count
4. **Bundle ALL unbeatable combos** from that suit → Lead multi-combo

### AI Following Strategy

**Location**: `ai/following/multiComboFollowingStrategy.ts`

**Integration with Main Following Logic**:
```typescript
// Check if leading combo is a multi-combo
const leadingMultiCombo = detectLeadingMultiCombo(leadingCards, trumpInfo);
if (!leadingMultiCombo.isMultiCombo) {
  return null; // Use regular following strategy
}

// Execute multi-combo specific algorithm
return executeMultiComboFollowingAlgorithm(/* ... */);
```

**AI Strategic Decisions**:
- **Teammate vs opponent strategy**: Different disposal logic based on current winning player
- **Trump conservation**: Strategic trump usage with hierarchy preservation
- **Point management**: Avoid giving points to opponents when possible

### Memory System Integration

**Card Memory Usage**:
```typescript
const memory = createCardMemory(gameState);
const voidStatus = checkOpponentVoidStatus(suit, gameState, playerId);
const isUnbeatable = isComboUnbeatable(combo, suit, memory.playedCards, ownHand, trumpInfo);
```

**Void Detection**:
```typescript
// Check confirmed voids from memory system
allOtherPlayerIds.forEach(playerId => {
  const playerMemory = memory.playerMemories[playerId];
  if (playerMemory && playerMemory.suitVoids.has(suit)) {
    voidPlayers.push(playerId);
  }
});
```

---

## Integration Points

### Game Validation System

**Primary Integration**: `playValidation.ts` → `isValidPlay()`

**Integration Logic**:
```typescript
// Multi-combo leading validation
if (!leadingCombo) {
  const multiComboDetection = detectLeadingMultiCombo(playedCards, trumpInfo);
  if (multiComboDetection.isMultiCombo) {
    const validation = validateMultiComboLead(playedCards, gameState, playerId);
    return validation.isValid;
  }
}

// Multi-combo following validation  
if (leadingDetection.isMultiCombo) {
  if (!leadingDetection.structure) {
    return false;
  }
  return validateMultiComboFollowing(
    playedCards,
    leadingDetection.structure,
    playerHand,
    trumpInfo,
  );
}
```

### Combo Detection System

**Integration**: Uses existing `identifyCombos()` and `getComboType()` functions

**Harmony**: Multi-combo detection complements existing combo system without conflicts:
- **Standard combos**: Single, Pair, Tractor (handled by existing system)
- **Multi-combos**: Multiple combos from same suit (handled by new system)
- **Clear separation**: `getComboType()` returns `Invalid` for multi-combos, triggering multi-combo detection

### Card Comparison System

**Integration**: Enhanced with architectural separation of multi-combo vs straight combo logic

**Key Enhancement**: **Architectural Split**
- **`canMultiComboBeaten()`**: Handles multi-combo specific beating logic with trump structure matching
- **`canComboBeaten()`**: Handles straight combo logic (singles, pairs, tractors)
- **`evaluateTrickPlay()`**: Routes to appropriate function based on leading combo type

**Usage**:
- **Multi-combo comparison**: Uses `compareTrumpMultiCombos()` with enhanced `getHighestComboOfType()`
- **Trump hierarchy**: Proper trump ordering for trump vs trump comparison
- **Structure validation**: Uses `matchesRequiredComponents()` for trump structure matching
- **Cross-suit validation**: Trick evaluation for complex scenarios

**Critical Rules**:
- **Non-trump cannot beat multi-combos**: Only trump responses can beat multi-combo leads
- **Trump structure matching**: Trump responses must match leading combo structure
- **Higher type satisfaction**: Trump pairs can beat single multi-combos by providing highest single card

### Memory System Integration

**Usage**: Full integration with AI card memory system

**Benefits**:
- **Void detection**: Real-time player void status tracking
- **Played cards tracking**: Accurate unbeatable analysis
- **Strategic decisions**: Memory-enhanced AI choices

---

**Related Documentation:**
- **[Multi-Combo Algorithms](MULTI_COMBO_ALGORITHMS.md)** - Detailed algorithmic flows and examples
- **[Game Rules](GAME_RULES.md)** - Complete Tractor/Shengji rules including multi-combo regulations  
- **[AI System](AI_SYSTEM.md)** - AI decision-making and strategic integration
- **[CLAUDE.md](../CLAUDE.md)** - Development guidelines and project architecture