import {
  GameContext,
  MemoryContext,
  PlayerId,
  PointPressure,
  TrickPosition,
  TrickWinnerAnalysis,
} from "../../src/types";

// ============================================================================
// AI TESTING UTILITIES
// ============================================================================

/**
 * Creates a basic game context for AI testing
 */
export const createAIGameContext = (
  isAttackingTeam: boolean = true,
  currentPoints: number = 0,
  cardsRemaining: number = 25,
  trickPosition: TrickPosition = TrickPosition.First,
  pointPressure: PointPressure = PointPressure.LOW,
  currentPlayer: PlayerId = PlayerId.Human, // Add currentPlayer with a default value
  trickWinnerAnalysis?: TrickWinnerAnalysis,
): GameContext => ({
  // Core Game Info
  isAttackingTeam,
  currentPoints,
  cardsRemaining,
  trickPosition,
  pointPressure,
  currentPlayer,
  trickWinnerAnalysis: trickWinnerAnalysis ?? {
    currentWinner: PlayerId.Human, // Default to human for test scenarios
    isTeammateWinning: false,
    isOpponentWinning: false,
    isLeadWinning: false,
    trickPoints: 0,
    isTrumpLead: false,
    isCurrentlyTrumped: false,
  },

  // Memory System - now consolidated into memoryContext
  memoryContext: {
    // Card Memory Data
    playedCards: [],
    trumpCardsPlayed: 0,
    pointCardsPlayed: 0,
    leadTrumpPairsPlayed: 0,
    suitDistribution: {},
    playerMemories: {},
    tricksAnalyzed: 0,

    // Memory Analysis
    cardsRemaining,
    knownCards: 0,
    nextPlayerVoidLed: false,
  },
});

/**
 * Creates memory context for AI testing
 */
export const createAIMemoryContext = (
  cardsRemaining: number = 25,
  knownCards: number = 0,
): MemoryContext => ({
  // Card Memory Data
  playedCards: [],
  trumpCardsPlayed: 0,
  pointCardsPlayed: 0,
  leadTrumpPairsPlayed: 0,
  suitDistribution: {},
  playerMemories: {},
  tricksAnalyzed: 0,

  // Memory Analysis
  cardsRemaining,
  knownCards,
  nextPlayerVoidLed: false,
});
