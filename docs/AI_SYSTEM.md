# AI System Guide

**Related Documentation:**

- **[AI Decision Trees](AI_DECISION_TREE.md)** - Decision flowcharts and logic trees
- **[Game Rules](GAME_RULES.md)** - Complete game rules and strategy

## Overview

The AI system has **4 phases** of increasing sophistication:

- **Phase 1: Foundation** - Basic rules, combinations, trump management
- **Phase 2: Strategy** - Point-focused play, positioning, team dynamics  
- **Phase 3: Memory** - Card tracking, pattern recognition, predictions
- **Phase 4: Mastery** - Advanced analysis, optimization, perfect execution

## Core Strategy

The AI follows a **4-priority decision chain**:

1. **Team Coordination** - Support teammate when winning
2. **Opponent Blocking** - Block opponent point collection  
3. **Trick Contention** - Contest valuable tricks (≥5 points)
4. **Strategic Disposal** - Play weakest cards, preserve Aces

## Position Strategy

- **Leading**: Deploy strong combinations, control tempo
- **Following**: Balance point collection with conservation
- **Late Position**: Maximize/minimize points based on team benefit

## Trump Conservation

AI preserves valuable trump cards using hierarchy:

- **Big Joker** (100) > **Small Joker** (90) > **Trump rank in trump suit** (80) > **Trump rank in off-suits** (70) > **Trump suit cards** (A♠:60 → 3♠:5)
- When forced to follow trump, plays weakest available (3♠, 4♠) instead of valuable trump rank cards

## Trump Declaration Strategy

AI declares trump during dealing with sophisticated analysis:

**Hand Quality Focus**: Prioritizes suit length over high cards

- **7+ cards**: Good declaration baseline  
- **9+ cards**: Excellent (1.4x probability boost)
- **≤4 cards**: Poor (0.4-0.7x penalty)

**Timing Optimization**: Peak declaration window at 40-70% dealt
**Declaration Types**: Big Joker Pair (95%) > Small Joker Pair (85%) > Regular Pair (70%) > Single (30%)

## Kitty Swap Strategy

AI uses advanced kitty management:

**Strategic Suit Elimination**: Empty weak suits completely for optimal hand structure
**Trump Management**: Usually avoids trump cards, includes them only for exceptionally strong hands (10+ trump cards)
**Decision Framework**: Suit elimination > Conservative approach > Exceptional trump strategy

## AI Architecture

The AI system uses 8 specialized modules:

- **`aiLogic.ts`** - Public API and rule compliance
- **`aiStrategy.ts`** - Core decision making with 4-priority chain
- **`aiGameContext.ts`** - Context analysis and trick winner tracking
- **`aiPointFocusedStrategy.ts`** - Point collection and team coordination
- **`aiCardMemory.ts`** - Card tracking and probability systems
- **`aiAdvancedCombinations.ts`** - Combination analysis and optimization
- **`aiKittySwapStrategy.ts`** - Kitty swap with suit elimination
- **`aiTrumpDeclarationStrategy.ts`** - Trump declaration during dealing

## Performance

- **Real-time Analysis**: Context evaluation ~100ms, strategy selection ~200ms
- **Timing**: Regular moves 600ms, kitty swap 1000ms thinking delays
- **All 4 phases implemented** with comprehensive test coverage and production-ready performance

---

**See Also:**

- **[AI Decision Trees](AI_DECISION_TREE.md)** - Detailed decision flowcharts  
- **[Game Rules](GAME_RULES.md)** - Complete game rules
- **[CLAUDE.md](../CLAUDE.md)** - Development guidelines
