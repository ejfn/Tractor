# Following V2 Implementation Plan

**Phase 1: Core Framework Implementation**

*Related Documentation: [Following V2 Design](FOLLOWING_V2_DESIGN.md) | [AI System](AI_SYSTEM.md) | [CLAUDE.md](../CLAUDE.md)*

---

## Implementation Order

### Step 1: Folder Structure Setup
```bash
mkdir -p src/ai/followingV2/core
mkdir -p src/ai/followingV2/decisions  # For future phases
```

### Step 2: Core Framework Implementation

#### 2.1 `core/suitAvailabilityAnalysis.ts`

**Interface Definitions**:
```typescript
export interface SuitAvailabilityResult {
  scenario: 'valid_combos' | 'enough_remaining' | 'void' | 'insufficient';
  leadingSuit: Suit;
  leadingComboType: ComboType;
  requiredLength: number;
  
  // Scenario-specific data
  validCombos?: Combo[];
  remainingCards?: Card[];
  availableCount?: number;
  
  // Analysis metadata
  reasoning: string[];
  memoryEnhanced?: boolean;
}
```

**Main Function**:
```typescript
export function analyzeSuitAvailability(
  leadingCards: Card[],
  playerHand: Card[],
  trumpInfo: TrumpInfo,
  context?: GameContext
): SuitAvailabilityResult
```

**Implementation Logic**:
1. **Extract leading information**:
   ```typescript
   const leadingSuit = leadingCards[0].suit;
   const leadingComboType = getComboType(leadingCards, trumpInfo);
   const requiredLength = leadingCards.length;
   ```

2. **Filter available cards**:
   ```typescript
   const availableCards = playerHand.filter(card => 
     card.suit === leadingSuit && !isTrump(card, trumpInfo)
   );
   ```

3. **Analyze combo formation capability**:
   ```typescript
   const possibleCombos = identifyCombos(availableCards, trumpInfo);
   const validCombos = possibleCombos.filter(combo => 
     combo.type === leadingComboType && combo.cards.length >= requiredLength
   );
   ```

4. **Classify scenario**:
   ```typescript
   if (validCombos.length > 0) {
     return { scenario: 'valid_combos', validCombos, ... };
   } else if (availableCards.length >= requiredLength) {
     return { scenario: 'enough_remaining', remainingCards: availableCards, ... };
   } else if (availableCards.length === 0) {
     return { scenario: 'void', ... };
   } else {
     return { scenario: 'insufficient', remainingCards: availableCards, ... };
   }
   ```

#### 2.2 `core/memoryIntegration.ts`

**Memory Utility Functions**:

```typescript
// Opponent void status checking
export function checkOpponentVoidStatus(
  suit: Suit,
  context: GameContext
): { allVoid: boolean; voidPlayers: PlayerId[] } {
  if (!context.memoryContext?.cardMemory) {
    return { allVoid: false, voidPlayers: [] };
  }
  
  const memory = context.memoryContext.cardMemory;
  const voidPlayers: PlayerId[] = [];
  
  // Check each opponent's void status
  Object.entries(memory.playerMemories).forEach(([playerId, playerMemory]) => {
    if (playerMemory.suitVoids.has(suit)) {
      voidPlayers.push(playerId as PlayerId);
    }
  });
  
  // All other 3 players are void (for multi-combo analysis)
  const allVoid = voidPlayers.length >= 3;
  
  return { allVoid, voidPlayers };
}

// Trump exhaustion analysis
export function analyzeTrumpExhaustion(
  context: GameContext
): { level: number; recommendation: 'preserve' | 'use' | 'aggressive' } {
  const exhaustion = context.memoryContext?.trumpExhaustion ?? 0.5;
  
  if (exhaustion > 0.8) {
    return { level: exhaustion, recommendation: 'aggressive' };
  } else if (exhaustion > 0.5) {
    return { level: exhaustion, recommendation: 'use' };
  } else {
    return { level: exhaustion, recommendation: 'preserve' };
  }
}

// Point timing analysis
export function analyzePointTiming(
  context: GameContext,
  trickPoints: number
): { shouldContribute: boolean; priority: 'high' | 'medium' | 'low' } {
  const cardsRemaining = context.cardsRemaining;
  const pointPressure = context.pointPressure;
  
  // High priority: valuable tricks or endgame
  if (trickPoints >= 15 || (trickPoints >= 10 && cardsRemaining <= 10)) {
    return { shouldContribute: true, priority: 'high' };
  }
  
  // Medium priority: medium value tricks with pressure
  if (trickPoints >= 5 && pointPressure !== PointPressure.LOW) {
    return { shouldContribute: true, priority: 'medium' };
  }
  
  // Low priority: conservative default
  return { shouldContribute: false, priority: 'low' };
}

// Memory-enhanced combo analysis
export function enhanceComboWithMemory(
  combo: Combo,
  context: GameContext,
  trumpInfo: TrumpInfo
): ComboAnalysis & { isGuaranteedWinner?: boolean } {
  const baseAnalysis: ComboAnalysis = {
    strength: ComboStrength.Medium,
    isTrump: combo.cards.some(card => isTrump(card, trumpInfo)),
    hasPoints: combo.cards.some(card => card.points > 0),
    pointValue: combo.cards.reduce((sum, card) => sum + card.points, 0),
    disruptionPotential: 0.5,
    conservationValue: calculateCardStrategicValue(combo.cards[0], trumpInfo, 'basic'),
    isBreakingPair: false,
    relativeStrength: 0.5,
    canBeat: false
  };
  
  // Memory enhancement: check if guaranteed winner
  let isGuaranteedWinner = false;
  if (context.memoryContext?.cardMemory && combo.cards[0]) {
    const card = combo.cards[0];
    const comboType = combo.type === ComboType.Pair ? 'pair' : 'single';
    
    isGuaranteedWinner = isBiggestRemainingInSuit(
      context.memoryContext.cardMemory,
      card.suit,
      card.rank,
      comboType
    );
  }
  
  return { ...baseAnalysis, isGuaranteedWinner };
}
```

#### 2.3 `core/routingLogic.ts`

**Main Routing Function**:
```typescript
export function routeToDecision(
  analysis: SuitAvailabilityResult,
  playerHand: Card[],
  context: GameContext,
  trumpInfo: TrumpInfo,
  gameState: GameState,
  currentPlayerId: PlayerId
): Card[] {
  
  gameLogger.debug('pursuit_algorithm_routing', {
    scenario: analysis.scenario,
    leadingSuit: analysis.leadingSuit,
    requiredLength: analysis.requiredLength,
    availableCount: analysis.availableCount,
    reasoning: analysis.reasoning
  });
  
  switch (analysis.scenario) {
    case 'valid_combos':
      return handleValidCombosScenario(analysis, context, trumpInfo, gameState);
      
    case 'enough_remaining':
      return handleEnoughRemainingScenario(analysis, context, trumpInfo);
      
    case 'void':
      return handleVoidScenario(playerHand, context, trumpInfo, gameState, currentPlayerId);
      
    case 'insufficient':
      return handleInsufficientScenario(analysis, playerHand, context, trumpInfo);
      
    default:
      gameLogger.warn('unknown_pursuit_scenario', { scenario: analysis.scenario });
      return selectStrategicDisposal(
        [{ combo: { type: ComboType.Single, cards: [playerHand[0]], value: 0 }, analysis: {} as ComboAnalysis }],
        context,
        gameState
      );
  }
}
```

**Scenario Handlers (Phase 1 - Use Existing Functions)**:
```typescript
function handleValidCombosScenario(
  analysis: SuitAvailabilityResult,
  context: GameContext,
  trumpInfo: TrumpInfo,
  gameState: GameState
): Card[] {
  if (!analysis.validCombos || analysis.validCombos.length === 0) {
    return [];
  }
  
  // Convert to ComboAnalysis format for existing functions
  const comboAnalyses = analysis.validCombos.map(combo => ({
    combo,
    analysis: enhanceComboWithMemory(combo, context, trumpInfo)
  }));
  
  // Use existing function for now (Phase 1)
  return selectOptimalWinningCombo(
    comboAnalyses,
    context,
    {} as PositionStrategy, // Placeholder
    trumpInfo,
    gameState
  );
}

function handleEnoughRemainingScenario(
  analysis: SuitAvailabilityResult,
  context: GameContext,
  trumpInfo: TrumpInfo
): Card[] {
  if (!analysis.remainingCards || analysis.remainingCards.length === 0) {
    return [];
  }
  
  // Use existing point contribution logic (Phase 1)
  const pointTiming = analyzePointTiming(context, context.trickWinnerAnalysis?.trickPoints ?? 0);
  
  if (pointTiming.shouldContribute) {
    return selectPointContribution(
      [{ combo: { type: ComboType.Single, cards: analysis.remainingCards, value: 0 }, analysis: {} as ComboAnalysis }],
      trumpInfo,
      context,
      {} as GameState // Placeholder
    );
  } else {
    return selectLowestValueNonPointCombo(
      [{ combo: { type: ComboType.Single, cards: analysis.remainingCards, value: 0 }, analysis: {} as ComboAnalysis }]
    );
  }
}

function handleVoidScenario(
  playerHand: Card[],
  context: GameContext,
  trumpInfo: TrumpInfo,
  gameState: GameState,
  currentPlayerId: PlayerId
): Card[] {
  const trumpCards = playerHand.filter(card => isTrump(card, trumpInfo));
  
  if (trumpCards.length > 0) {
    // Check if should trump using existing logic
    const trumpExhaustion = analyzeTrumpExhaustion(context);
    
    if (trumpExhaustion.recommendation !== 'preserve') {
      // Use existing trump logic
      return handleOpponentWinning(
        [{ combo: { type: ComboType.Single, cards: trumpCards, value: 0 }, analysis: {} as ComboAnalysis }],
        context,
        context.trickWinnerAnalysis ?? {} as TrickWinnerAnalysis,
        trumpInfo,
        gameState
      ) || selectStrategicDisposal(
        [{ combo: { type: ComboType.Single, cards: playerHand, value: 0 }, analysis: {} as ComboAnalysis }],
        context,
        gameState
      );
    }
  }
  
  // Cross-suit disposal
  return selectStrategicDisposal(
    [{ combo: { type: ComboType.Single, cards: playerHand, value: 0 }, analysis: {} as ComboAnalysis }],
    context,
    gameState
  );
}

function handleInsufficientScenario(
  analysis: SuitAvailabilityResult,
  playerHand: Card[],
  context: GameContext,
  trumpInfo: TrumpInfo
): Card[] {
  if (!analysis.remainingCards) {
    return [];
  }
  
  const needed = analysis.requiredLength;
  const available = analysis.remainingCards.length;
  const shortfall = needed - available;
  
  // Use all remaining cards in suit
  const selectedCards = [...analysis.remainingCards];
  
  // Fill shortfall with cross-suit cards
  const crossSuitCards = playerHand.filter(card => 
    !analysis.remainingCards!.includes(card) && !isTrump(card, trumpInfo)
  );
  
  // Add lowest value cross-suit cards to fill
  const sortedCrossSuit = crossSuitCards.sort((a, b) => 
    calculateCardStrategicValue(a, trumpInfo, 'basic') - 
    calculateCardStrategicValue(b, trumpInfo, 'basic')
  );
  
  selectedCards.push(...sortedCrossSuit.slice(0, shortfall));
  
  gameLogger.debug('insufficient_fill_strategy', {
    needed,
    available,
    shortfall,
    selectedCount: selectedCards.length
  });
  
  return selectedCards;
}
```

#### 2.4 `positionStrategy.ts`

**Main Entry Point**:
```typescript
import { gameLogger } from '../../utils/gameLogger';
import { getComboType } from '../../game/comboDetection';
import {
  Card,
  Combo,
  ComboAnalysis,
  GameContext,
  GameState,
  PlayerId,
  PositionStrategy,
  TrumpInfo,
} from '../../types';
import { analyzeSuitAvailability } from './core/suitAvailabilityAnalysis';
import { routeToDecision } from './core/routingLogic';

/**
 * Position Strategy V2 - Pursuit Algorithm Implementation
 * 
 * Replaces scattered position-specific logic with a clean decision flow:
 * 1. Analyze suit availability → Classify scenario
 * 2. Route to decision path → Based on classification  
 * 3. Apply memory-enhanced logic → Integrate memory context
 * 4. Return optimal cards → Clean, traceable decisions
 */

/**
 * Main position-aware following play selection using pursuit algorithm
 */
export function selectPositionAwareFollowingPlay(
  comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
  context: GameContext,
  positionStrategy: PositionStrategy,
  trumpInfo: TrumpInfo,
  gameState: GameState,
  currentPlayerId: PlayerId,
): Card[] {
  
  // Extract leading cards from game state
  const leadingCards = gameState.currentTrick?.plays[0]?.cards;
  if (!leadingCards || leadingCards.length === 0) {
    gameLogger.warn('pursuit_no_leading_cards', { currentPlayerId });
    return comboAnalyses.length > 0 ? comboAnalyses[0].combo.cards : [];
  }
  
  // Get current player's hand
  const currentPlayer = gameState.players.find(p => p.id === currentPlayerId);
  if (!currentPlayer) {
    gameLogger.error('pursuit_no_current_player', { currentPlayerId });
    return comboAnalyses.length > 0 ? comboAnalyses[0].combo.cards : [];
  }
  
  // Phase 1: Analyze suit availability and classify scenario
  const analysis = analyzeSuitAvailability(
    leadingCards,
    currentPlayer.hand,
    trumpInfo,
    context
  );
  
  gameLogger.debug('pursuit_algorithm_start', {
    player: currentPlayerId,
    position: context.trickPosition,
    scenario: analysis.scenario,
    leadingSuit: analysis.leadingSuit,
    memoryEnhanced: analysis.memoryEnhanced,
    reasoning: analysis.reasoning
  });
  
  // Phase 2: Route to appropriate decision path
  const selectedCards = routeToDecision(
    analysis,
    currentPlayer.hand,
    context,
    trumpInfo,
    gameState,
    currentPlayerId
  );
  
  gameLogger.debug('pursuit_algorithm_result', {
    player: currentPlayerId,
    scenario: analysis.scenario,
    selectedCards: selectedCards.map(c => `${c.rank}${c.suit}`),
    cardCount: selectedCards.length
  });
  
  return selectedCards;
}
```

### Step 3: Integration Setup

#### 3.1 Update `followingStrategy.ts` Integration Point

Add feature toggle in the existing position strategy call:

```typescript
// In selectOptimalFollowPlay function, around line 107
if (shouldUsePositionSpecificStrategy(context, trickWinner)) {
  // Feature toggle for V2 implementation
  const USE_PURSUIT_ALGORITHM = process.env.NODE_ENV === 'test' || 
                                gameState.debugMode || 
                                context.memoryContext?.usePursuitAlgorithm;
  
  if (USE_PURSUIT_ALGORITHM) {
    try {
      const { selectPositionAwareFollowingPlay: selectV2 } = await import('./followingV2/positionStrategy');
      const positionDecision = selectV2(
        comboAnalyses,
        context,
        positionStrategy,
        trumpInfo,
        gameState,
        currentPlayerId,
      );
      
      gameLogger.debug("ai_following_decision", {
        decisionPoint: "position_specific_override_v2",
        player: currentPlayerId,
        position: context.trickPosition,
        decision: positionDecision,
        context,
      });
      
      return positionDecision;
    } catch (error) {
      gameLogger.error('pursuit_algorithm_error', { 
        error: error instanceof Error ? error.message : String(error),
        fallbackToV1: true 
      });
      // Fallback to existing implementation
    }
  }
  
  // Existing V1 implementation
  const positionDecision = selectPositionAwareFollowingPlay(
    comboAnalyses,
    context,
    positionStrategy,
    trumpInfo,
    gameState,
    currentPlayerId,
  );
  
  // ... rest of existing code
}
```

### Step 4: Import Dependencies

**Required Imports for Core Files**:

```typescript
// suitAvailabilityAnalysis.ts
import { Card, Combo, ComboType, GameContext, Suit, TrumpInfo } from '../../../types';
import { getComboType } from '../../../game/comboDetection';
import { identifyCombos } from '../../../game/comboDetection';
import { isTrump } from '../../../game/cardValue';

// memoryIntegration.ts  
import { GameContext, PlayerId, Suit, TrumpInfo, Combo, ComboAnalysis, ComboStrength, ComboType, PointPressure } from '../../../types';
import { isBiggestRemainingInSuit } from '../../aiCardMemory';
import { calculateCardStrategicValue, isTrump } from '../../../game/cardValue';

// routingLogic.ts
import { Card, GameContext, GameState, PlayerId, TrumpInfo, ComboAnalysis, ComboType } from '../../../types';
import { selectOptimalWinningCombo } from '../../following/trickContention';
import { selectPointContribution } from '../../following/pointContribution';
import { selectStrategicDisposal } from '../../following/strategicDisposal';
import { selectLowestValueNonPointCombo } from '../../following/strategicDisposal';
import { handleOpponentWinning } from '../../following/opponentBlocking';
import { gameLogger } from '../../../utils/gameLogger';
```

---

## Testing Strategy

### Phase 1 Testing

1. **Unit Tests for Core Components**:
   ```typescript
   // __tests__/ai/followingV2/core/suitAvailabilityAnalysis.test.ts
   // __tests__/ai/followingV2/core/memoryIntegration.test.ts
   // __tests__/ai/followingV2/core/routingLogic.test.ts
   ```

2. **Integration Test**:
   ```typescript
   // __tests__/ai/followingV2/positionStrategy.test.ts
   ```

3. **Existing Test Validation**:
   ```bash
   npm test -- __tests__/ai/thirdPlayerTakeover.test.ts
   ```

### Test Data Setup

Create test utilities for consistent test data:

```typescript
// __tests__/helpers/followingV2TestHelpers.ts
export function createTestSuitAvailabilityScenario(
  scenario: 'valid_combos' | 'enough_remaining' | 'void' | 'insufficient'
): { leadingCards: Card[], playerHand: Card[], expectedResult: SuitAvailabilityResult }
```

---

## Implementation Checklist

### Phase 1 Core Framework

- [ ] **Setup**
  - [ ] Create folder structure (`followingV2/`, `core/`)
  - [ ] Set up TypeScript configuration for new files

- [ ] **Core Implementation**  
  - [ ] Implement `suitAvailabilityAnalysis.ts`
  - [ ] Implement `memoryIntegration.ts`
  - [ ] Implement `routingLogic.ts`
  - [ ] Implement `positionStrategy.ts`

- [ ] **Integration**
  - [ ] Add feature toggle in `followingStrategy.ts`
  - [ ] Test import paths and dependencies
  - [ ] Verify no circular dependencies

- [ ] **Testing**
  - [ ] Create unit tests for each core component
  - [ ] Run existing failing tests to validate fixes
  - [ ] Create integration test for main flow

- [ ] **Validation**
  - [ ] TypeScript compilation passes
  - [ ] ESLint passes  
  - [ ] All tests pass
  - [ ] Performance is maintained

### Success Criteria for Phase 1

1. **Functional**: All components work correctly
2. **Tested**: Unit and integration tests pass
3. **Compatible**: Existing tests are fixed, not broken
4. **Performant**: No significant performance degradation
5. **Maintainable**: Code is clean and well-documented

---

## Next Steps After Phase 1

### Phase 2: Enhanced Decision Logic
1. Implement `decisions/validCombosDecision.ts`
2. Implement `decisions/sameSuitDecision.ts`  
3. Implement `decisions/crossSuitDecision.ts`
4. Replace placeholder calls with enhanced logic

### Phase 3: Advanced Features
1. Implement `decisions/trumpDecision.ts`
2. Implement `decisions/fillStrategy.ts`
3. Add advanced memory analysis
4. Performance optimization

### Phase 4: Migration
1. Replace original position strategy
2. Remove deprecated code
3. Update documentation
4. Performance benchmarking

This implementation plan provides a clear roadmap for building the pursuit algorithm foundation while maintaining compatibility and testability throughout the process.