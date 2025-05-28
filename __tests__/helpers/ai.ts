import {
  Card,
  ComboStrength,
  ComboType,
  GameContext,
  GamePhase,
  GamePhaseStrategy,
  MemoryContext,
  PlayStyle,
  PointCardStrategy,
  PointFocusedContext,
  PointPressure,
  Rank,
  Suit,
  TrickPosition,
  TrumpTiming,
  AdvancedComboPattern,
  CombinationAnalysis,
  CombinationContext,
  TrickWinnerAnalysis,
} from '../../src/types';
import { createCard, createPair, createTractor } from './cards';

// ============================================================================
// AI TESTING UTILITIES
// ============================================================================

/**
 * Creates a basic game context for AI testing
 */
export const createAIGameContext = (
  isAttackingTeam: boolean = true,
  currentPoints: number = 0,
  pointsNeeded: number = 80,
  cardsRemaining: number = 25,
  trickPosition: TrickPosition = TrickPosition.First,
  pointPressure: PointPressure = PointPressure.LOW,
  playStyle: PlayStyle = PlayStyle.Balanced,
  trickWinnerAnalysis?: TrickWinnerAnalysis
): GameContext => ({
  isAttackingTeam,
  currentPoints,
  pointsNeeded,
  cardsRemaining,
  trickPosition,
  pointPressure,
  playStyle,
  trickWinnerAnalysis: trickWinnerAnalysis ?? {
    currentWinner: null,
    isTeammateWinning: false,
    isOpponentWinning: false,
    isSelfWinning: false,
    trickPoints: 0,
    canBeatCurrentWinner: false,
    shouldTryToBeat: false,
    shouldPlayConservatively: false,
  }
});

/**
 * Creates memory context for AI testing
 */
export const createAIMemoryContext = (
  cardsRemaining: number = 25,
  knownCards: number = 0,
  uncertaintyLevel: number = 0.5,
  trumpExhaustion: number = 0.0,
  opponentHandStrength: Record<string, number> = {}
): MemoryContext => ({
  cardsRemaining,
  knownCards,
  uncertaintyLevel,
  trumpExhaustion,
  opponentHandStrength
});

/**
 * Creates point-focused context for AI testing
 */
export const createAIPointFocusedContext = (
  gamePhase: GamePhaseStrategy = GamePhaseStrategy.EarlyGame,
  pointCardStrategy: PointCardStrategy = PointCardStrategy.Conservative,
  trumpTiming: TrumpTiming = TrumpTiming.Preserve,
  teamPointsCollected: number = 0,
  opponentPointsCollected: number = 0,
  pointCardDensity: number = 0.2,
  partnerNeedsPointEscape: boolean = false,
  canWinWithoutPoints: boolean = false
): PointFocusedContext => ({
  gamePhase,
  pointCardStrategy,
  trumpTiming,
  teamPointsCollected,
  opponentPointsCollected,
  pointCardDensity,
  partnerNeedsPointEscape,
  canWinWithoutPoints
});

/**
 * Creates combination analysis for testing
 */
export const createAICombinationAnalysis = (
  pattern: AdvancedComboPattern,
  cards: Card[],
  effectiveness: number = 0.5,
  timing: "immediate" | "delayed" | "endgame" = "immediate",
  risk: number = 0.3,
  reward: number = 0.7,
  alternativeCount: number = 1
): CombinationAnalysis => ({
  pattern,
  cards: [...cards],
  effectiveness,
  timing,
  risk,
  reward,
  alternativeCount
});

/**
 * Creates combination context for testing
 */
export const createAICombinationContext = (): CombinationContext => {
  return CombinationContext.Leading; // Default context for testing
};

/**
 * AI test scenarios for common game situations
 */
export const aiTestScenarios = {
  // Early game leading scenario
  earlyGameLeading: () => ({
    context: createAIGameContext(true, 0, 80, 25, TrickPosition.First, PointPressure.LOW, PlayStyle.Balanced),
    pointContext: createAIPointFocusedContext(GamePhaseStrategy.EarlyGame, PointCardStrategy.Conservative, TrumpTiming.Preserve)
  }),

  // Late game desperate scenario
  lateGameDesperate: () => ({
    context: createAIGameContext(true, 60, 80, 5, TrickPosition.Fourth, PointPressure.HIGH, PlayStyle.Desperate),
    pointContext: createAIPointFocusedContext(GamePhaseStrategy.LateGame, PointCardStrategy.Aggressive, TrumpTiming.Flush)
  }),

  // Defending team scenario
  defendingTeam: () => ({
    context: createAIGameContext(false, 0, 0, 20, TrickPosition.Second, PointPressure.MEDIUM, PlayStyle.Conservative),
    pointContext: createAIPointFocusedContext(GamePhaseStrategy.MidGame, PointCardStrategy.Block, TrumpTiming.Control)
  }),

  // Partner coordination scenario
  partnerCoordination: () => ({
    context: createAIGameContext(true, 30, 80, 15, TrickPosition.Third, PointPressure.MEDIUM, PlayStyle.Balanced),
    pointContext: createAIPointFocusedContext(GamePhaseStrategy.MidGame, PointCardStrategy.Escape, TrumpTiming.Preserve, 30, 20, 0.3, true)
  })
};

// ============================================================================
// COMBINATION TESTING UTILITIES  
// ============================================================================

/**
 * Creates advanced combo patterns for testing
 */
export const createAdvancedComboPattern = (
  type: ComboType = ComboType.Single,
  strength: ComboStrength = ComboStrength.Medium,
  minCards: number = 1,
  maxCards: number = 1
): AdvancedComboPattern => ({
  type,
  minCards,
  maxCards,
  strengthRange: [strength, strength],
  situationalValue: 0.5,
  opponentDisruption: 0.3,
  partnerSupport: 0.4
});

/**
 * Test combinations for various scenarios
 */
export const testCombinations = {
  // Single card combinations
  singles: {
    weakNonTrump: () => createAdvancedComboPattern(ComboType.Single, ComboStrength.Weak, 1, 1),
    strongTrump: () => createAdvancedComboPattern(ComboType.Single, ComboStrength.Strong, 1, 1),
    pointCard: () => createAdvancedComboPattern(ComboType.Single, ComboStrength.Medium, 1, 1)
  },

  // Pair combinations
  pairs: {
    weakPair: () => createAdvancedComboPattern(ComboType.Pair, ComboStrength.Weak, 2, 2),
    strongPair: () => createAdvancedComboPattern(ComboType.Pair, ComboStrength.Strong, 2, 2),
    pointPair: () => createAdvancedComboPattern(ComboType.Pair, ComboStrength.Medium, 2, 2)
  },

  // Tractor combinations
  tractors: {
    weakTractor: () => createAdvancedComboPattern(ComboType.Tractor, ComboStrength.Weak, 4, 4),
    strongTractor: () => createAdvancedComboPattern(ComboType.Tractor, ComboStrength.Strong, 4, 4),
    pointTractor: () => createAdvancedComboPattern(ComboType.Tractor, ComboStrength.Critical, 4, 4)
  }
};