import {
  Card,
  GameState,
  GamePhase,
  PlayerId,
  Rank,
  Suit,
  Trick,
} from '../../src/types';
import { createCard } from './cards';
import { createTrumpInfo } from './trump';

// ============================================================================
// MOCK SETUP UTILITIES
// ============================================================================

/**
 * Mock configurations for individual modules
 * Note: These are configuration objects, not the actual mock setup
 */
export const mockConfigs = {
  gameLogic: {
    initializeGame: jest.fn(),
    identifyCombos: jest.fn(),
    isValidPlay: jest.fn(),
    isTrump: jest.fn(),
    humanHasTrumpRank: jest.fn().mockReturnValue(false)
  },
  
  aiLogic: {
    getAIMove: jest.fn()
  },
  
  gamePlayManager: {
    processPlay: jest.fn(),
    validatePlay: jest.fn(),
    getAIMoveWithErrorHandling: jest.fn()
  },
  
  
  gameRoundManager: {
    prepareNextRound: jest.fn(),
    endRound: jest.fn()
  }
};

/**
 * Gets the mocked version of a module's functions
 */
export const getMockModule = (modulePath: string) => {
  return jest.requireMock(modulePath);
};

// ============================================================================
// ASSERTION HELPERS
// ============================================================================

/**
 * Common assertions used in tests
 */
export const testAssertions = {
  // Verify a player has specific cards
  playerHasCards: (gameState: GameState, playerIndex: number, expectedCards: Card[]) => {
    const player = gameState.players[playerIndex];
    expect(player.hand).toHaveLength(expectedCards.length);
    expectedCards.forEach(expectedCard => {
      expect(player.hand.some(card => 
        card.suit === expectedCard.suit && 
        card.rank === expectedCard.rank &&
        card.points === expectedCard.points
      )).toBe(true);
    });
  },

  // Verify game phase
  gamePhaseIs: (gameState: GameState, expectedPhase: GameState['gamePhase']) => {
    expect(gameState.gamePhase).toBe(expectedPhase);
  },

  // Verify current player
  currentPlayerIs: (gameState: GameState, expectedPlayerIndex: number) => {
    expect(gameState.currentPlayerIndex).toBe(expectedPlayerIndex);
  },

  // Verify trump information
  trumpIs: (gameState: GameState, expectedRank: Rank, expectedSuit?: Suit) => {
    expect(gameState.trumpInfo.trumpRank).toBe(expectedRank);
    if (expectedSuit) {
      expect(gameState.trumpInfo.trumpSuit).toBe(expectedSuit);
    }
  }
};

// ============================================================================
// PERFORMANCE TESTING UTILITIES
// ============================================================================

/**
 * Measures the performance of a function call
 */
export const measurePerformance = async <T>(
  fn: () => T | Promise<T>,
  label: string = "operation"
): Promise<{ result: T; duration: number }> => {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  const duration = end - start;
  
  if (duration > 100) {
    console.warn(`${label} took ${duration.toFixed(2)}ms - consider optimization`);
  }
  
  return { result, duration };
};

/**
 * Creates a large game state for performance testing
 * Note: This function requires gameStates module to avoid circular imports
 */
export const createLargeGameState = (): GameState => {
  // Import here to avoid circular dependency
  const { createGameState, givePlayerCards } = require('./gameStates');
  const { createCompletedTrick } = require('./tricks');
  
  let state = createGameState({
    gamePhase: GamePhase.Playing,
    trumpInfo: createTrumpInfo(Rank.Two, Suit.Spades),
    currentPlayerIndex: 0
  });

  // Give each player a full hand (25 cards)
  const allSuits = Object.values(Suit);
  const allRanks = Object.values(Rank);
  
  for (let playerIndex = 0; playerIndex < 4; playerIndex++) {
    const cards: Card[] = [];
    for (let cardIndex = 0; cardIndex < 25; cardIndex++) {
      const suit = allSuits[cardIndex % allSuits.length];
      const rank = allRanks[Math.floor(cardIndex / allSuits.length) % allRanks.length];
      cards.push(createCard(suit, rank, `player_${playerIndex}_card_${cardIndex}`));
    }
    state = givePlayerCards(state, playerIndex, cards);
  }

  // Add some completed tricks
  const tricks: Trick[] = [];
  for (let i = 0; i < 10; i++) {
    tricks.push(createCompletedTrick(
      PlayerId.Human,
      [createCard(Suit.Hearts, Rank.Three, `trick_${i}_lead`)],
      [
        { playerId: PlayerId.Bot1, cards: [createCard(Suit.Hearts, Rank.Four, `trick_${i}_bot1`)] },
        { playerId: PlayerId.Bot2, cards: [createCard(Suit.Hearts, Rank.Five, `trick_${i}_bot2`)] },
        { playerId: PlayerId.Bot3, cards: [createCard(Suit.Hearts, Rank.Six, `trick_${i}_bot3`)] }
      ],
      PlayerId.Bot3
    ));
  }
  state.tricks = tricks;

  return state;
};

// ============================================================================
// ERROR TESTING UTILITIES
// ============================================================================

/**
 * Creates invalid game states for error testing
 */
export const createInvalidGameStates = {
  // Game state with missing players
  missingPlayers: () => {
    const { createGameState } = require('./gameStates');
    const { createStandardPlayers } = require('./players');
    return createGameState({
      players: [createStandardPlayers()[0]] // Only 1 player instead of 4
    });
  },

  // Game state with invalid current player index
  invalidPlayerIndex: () => {
    const { createGameState } = require('./gameStates');
    return createGameState({
      currentPlayerIndex: 10 // Out of bounds
    });
  },

  // Game state with inconsistent trump info
  inconsistentTrump: () => {
    const { createGameState } = require('./gameStates');
    return createGameState({
      trumpInfo: createTrumpInfo(Rank.Two, undefined) // No trump declared
    });
  },

  // Game state with empty hands during play
  emptyHandsInPlay: () => {
    const { createGameState } = require('./gameStates');
    let state = createGameState({
      gamePhase: GamePhase.Playing
    });
    // All players have empty hands but game is in play phase
    return state;
  }
};

/**
 * Creates error scenarios for testing error handling
 */
export const errorScenarios = {
  // Network-related errors
  networkError: () => new Error("Network connection failed"),
  
  // Game logic errors
  invalidPlayError: () => new Error("Invalid card play attempted"),
  
  // State consistency errors
  stateCorruptionError: () => new Error("Game state corruption detected"),
  
  // AI decision errors
  aiDecisionError: () => new Error("AI failed to make valid decision")
};

// ============================================================================
// ASYNC TESTING UTILITIES
// ============================================================================

/**
 * Creates promises that resolve after a specified delay
 */
export const createDelayedPromise = <T>(value: T, delay: number = 100): Promise<T> => {
  return new Promise(resolve => {
    setTimeout(() => resolve(value), delay);
  });
};

/**
 * Creates promises that reject after a specified delay
 */
export const createDelayedRejection = (error: Error, delay: number = 100): Promise<never> => {
  return new Promise((_, reject) => {
    setTimeout(() => reject(error), delay);
  });
};

/**
 * Waits for a condition to become true (useful for testing async state changes)
 */
export const waitForCondition = async (
  condition: () => boolean,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> => {
  const startTime = Date.now();
  
  while (!condition() && (Date.now() - startTime) < timeout) {
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  if (!condition()) {
    throw new Error(`Condition not met within ${timeout}ms timeout`);
  }
};

// ============================================================================
// 3RD PLAYER TACTICAL TEST UTILITIES
// ============================================================================

/**
 * Creates a mock trick for testing tactical scenarios
 */
export const createMockTrick = (leadingPlayer: PlayerId, leadingCards: Card[]): Trick => {
  return {
    leadingPlayerId: leadingPlayer,
    leadingCombo: leadingCards,
    plays: [], // No other players have played yet
    winningPlayerId: leadingPlayer, // Leader is currently winning
    points: leadingCards.reduce((sum, card) => sum + (card.points || 0), 0),
  };
};

/**
 * Creates a mock player for testing
 */
export const createMockPlayer = (playerId: PlayerId, hand: Card[] = []) => {
  const { createPlayer } = require('./players');
  return createPlayer(playerId, hand);
};

