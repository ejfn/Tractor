# Multi-Combo Documentation

**Complete guide to multi-combo implementation in Tractor**

*Related Documentation: [Game Rules](GAME_RULES.md) | [AI System](AI_SYSTEM.md) | [CLAUDE.md](../CLAUDE.md)*

---

## What is a Multi-Combo?

In Tractor/Shengji, a **multi-combo** is multiple combos from the same suit played simultaneously:

- **`A♥ + K♥ + Q♥`** = 3 singles from Hearts
- **`A♥A♥ + K♥`** = pair + single from Hearts  
- **`K♥K♥-Q♥Q♥ + J♥ + 9♥`** = tractor + singles from Hearts

**🚨 CRITICAL RULES:**
- **Same suit only**: All combos must be from the same non-trump suit for leading
- **Unbeatable requirement**: Each component combo must be unbeatable OR all other players must be void in that suit
- **ALL OTHER THREE PLAYERS**: Multi-combo validation considers all 3 other players (teammates + opponents)

---

## Core Implementation

### Leading Multi-Combos

**Human Validation** (`playValidation.ts`):
```typescript
// Simple validation: same suit + unbeatable check
if (isMultiCombo(cards)) {
  return validateMultiComboLead(cards, gameState, playerId);
}
```

**AI Selection** (`candidateLeadDetection.ts`):
```typescript
// AI finds unbeatable combos and bundles them
const unbeatableCombos = findUnbeatableCombos(suit, gameState);
if (unbeatableCombos.length >= 2) {
  return createMultiComboLead(unbeatableCombos);
}
```

### Following Multi-Combos

**Current AI Algorithm** (`multiComboFollowingStrategy.ts`):
```typescript
// Simplified 3-step algorithm
1. Same-suit following: Match structure if possible
2. Trump following: Use trump with matching structure  
3. Cross-suit disposal: Play any cards when exhausted
```

**Validation** (`playValidation.ts`):
```typescript
// Exhaustion rule: If void after play → always valid
if (isVoidAfterPlay(cards, hand, leadingSuit)) {
  return true;
}
// Otherwise: structure matching validation
```

---

## Data Structures

### Core Types

```typescript
// Multi-combo structure analysis
interface MultiComboStructure {
  suit: Suit;
  components: MultiComboComponents;
  isLeading: boolean;
}

interface MultiComboComponents {
  totalLength: number;    // Total cards
  totalPairs: number;     // All pairs (including tractor pairs)
  tractors: number;       // Number of tractors
  tractorSizes: number[]; // Length of each tractor
}
```

### Detection Results

```typescript
interface MultiComboDetection {
  isMultiCombo: boolean;
  structure?: MultiComboStructure;
  components?: Combo[];
  validation?: MultiComboValidation;
}
```

---

## Key Algorithms

### 1. Unbeatable Detection

**Core Logic** (`multiComboValidation.ts`):
```typescript
function isComboUnbeatable(combo: Combo, suit: Suit, gameState: GameState): boolean {
  const availableToOthers = getTotalCards(108) 
    - getPlayedCards(gameState) 
    - getCurrentPlayerHand(gameState);
  
  // Check if any stronger combo exists in availableToOthers
  return !canBeBeaten(combo, availableToOthers, suit);
}
```

### 2. Structure Matching

**Following Validation** (`multiComboAnalysis.ts`):
```typescript
function matchesRequiredStructure(
  playedCards: Card[],
  requiredStructure: MultiComboComponents
): boolean {
  const playedStructure = analyzeComboStructure(playedCards);
  
  return playedStructure.totalLength === requiredStructure.totalLength &&
         playedStructure.totalPairs >= requiredStructure.totalPairs &&
         playedStructure.tractors >= requiredStructure.tractors;
}
```

### 3. Trump Multi-Combo Comparison

**Strength Evaluation** (`cardComparison.ts`):
```typescript
function compareTrumpMultiCombos(
  combo1: Card[], 
  combo2: Card[], 
  trumpInfo: TrumpInfo
): number {
  // Compare by highest combo type: tractors > pairs > singles
  const highestType1 = getHighestComboType(combo1);
  const highestType2 = getHighestComboType(combo2);
  
  if (highestType1 !== highestType2) {
    return compareComboTypes(highestType1, highestType2);
  }
  
  // Same type: compare strength within that type
  return compareCardStrength(
    getHighestCardOfType(combo1, highestType1),
    getHighestCardOfType(combo2, highestType2),
    trumpInfo
  );
}
```

---

## AI Integration

### Leading Strategy

**Priority 1**: Multi-combo detection in `leadingStrategy.ts`
```typescript
// Find unbeatable multi-combos as highest priority
const multiComboLead = detectUnbeatableMultiCombos(hand, gameState);
if (multiComboLead) {
  return multiComboLead;
}
```

### Following Strategy

**Routing Logic** in `followingStrategy.ts`:
```typescript
// Check if leading is multi-combo
if (getComboType(leadingCards) === ComboType.Invalid) {
  return executeMultiComboFollowingAlgorithm(/* params */);
}
// Otherwise use regular following logic
```

---

## Game Rules Integration

### Leading Rules

1. **Non-trump suits only**: Cannot lead trump multi-combos
2. **Unbeatable requirement**: Each component must be unbeatable by all other 3 players
3. **Void exception**: Can lead any multi-combo if all others void in that suit

### Following Rules

1. **Structure matching**: Must match total length and try to match combo types
2. **Trump responses**: Can beat non-trump multi-combos with trump structure match
3. **Exhaustion rule**: If void after play → any combination is valid
4. **Trump vs trump**: Highest combo type wins (tractors > pairs > singles)

---

## Examples

### Valid Multi-Combo Leads

```typescript
// Example 1: All unbeatable singles
Cards: [A♠, K♠, Q♠]
Played: [A♠, K♠, Q♠] (other copies already played)
Result: ✅ Valid multi-combo lead

// Example 2: Mix of unbeatable combos  
Cards: [A♠, A♠, K♠, J♠, J♠]
Structure: A♠A♠ (unbeatable pair) + K♠ (unbeatable single) + J♠J♠ (unbeatable pair)
Result: ✅ Valid multi-combo lead

// Example 3: Void suit exploitation
Cards: [7♠, 8♠, 9♠] (all others void in Spades)
Result: ✅ Valid multi-combo lead (void exception)
```

### Following Examples

```typescript
// Example 1: Same-suit structure match
Leading: K♠ + Q♠ + J♠ (3 singles)
Response: 10♠ + 9♠ + 8♠ (3 singles, same suit)
Result: ✅ Valid following

// Example 2: Trump structure match
Leading: K♠ + Q♠ + J♠ (3 singles, non-trump)
Response: 5♥ + 4♥ + 3♥ (3 trump singles)
Result: ✅ Valid trump response

// Example 3: Exhaustion rule
Leading: K♠ + Q♠ + J♠ + 10♠ (4 singles)
Hand: [9♠, 8♠, 7♠, 5♥] (only 3 spades left)
Response: 9♠ + 8♠ + 7♠ + 5♥ (3 spades + 1 other)
Result: ✅ Valid by exhaustion rule
```

---

## Performance Notes

The multi-combo system has been **optimized for simplicity**:

✅ **Unified detection**: Single `analyzeComboStructure()` function  
✅ **Simplified AI**: Clear priority-based routing  
✅ **Efficient validation**: Early exhaustion rule check  
✅ **Memory integration**: Uses existing card tracking  

The implementation focuses on **correctness and maintainability** over complex optimizations, making it easier to debug and extend.

---

## See Also

- **[Game Rules](GAME_RULES.md)** - Complete game rules including multi-combo regulations
- **[AI System](AI_SYSTEM.md)** - AI decision-making integration
- **[CLAUDE.md](../CLAUDE.md)** - Development guidelines and architecture