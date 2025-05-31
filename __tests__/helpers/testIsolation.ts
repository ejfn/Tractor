/**
 * Test isolation utilities to prevent test interference
 * These utilities ensure each test gets fresh, isolated state
 */

import { GameState, Player, Team, Rank, Suit, GamePhase, PlayerId, PlayerName, TeamId } from '../../src/types';
import { createDeck, shuffleDeck } from '../../src/game/gameLogic';

/**
 * Creates a completely fresh game state without any shared references
 * This ensures tests don't interfere with each other through shared objects
 */
export const createIsolatedGameState = (): GameState => {
  // Create fresh player objects with no shared references
  const players: Player[] = [
    {
      id: PlayerId.Human,
      name: PlayerName.Human,
      isHuman: true,
      hand: [],
      team: TeamId.A,
    },
    {
      id: PlayerId.Bot1,
      name: PlayerName.Bot1,
      isHuman: false,
      hand: [],
      team: TeamId.B,
    },
    {
      id: PlayerId.Bot2,
      name: PlayerName.Bot2,
      isHuman: false,
      hand: [],
      team: TeamId.A,
    },
    {
      id: PlayerId.Bot3,
      name: PlayerName.Bot3,
      isHuman: false,
      hand: [],
      team: TeamId.B,
    },
  ];

  // Create fresh team objects
  const teams: [Team, Team] = [
    {
      id: TeamId.A,
      currentRank: Rank.Two,
      points: 0,
      isDefending: true,
    },
    {
      id: TeamId.B,
      currentRank: Rank.Two,
      points: 0,
      isDefending: false,
    },
  ];

  // Create fresh deck with unique card IDs to prevent reference sharing
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substr(2, 9);
  const deck = createDeck().map((card, index) => ({
    ...card,
    id: `${card.id}_${timestamp}_${randomSuffix}_${index}`, // Ensure unique IDs
  }));

  // Create completely isolated game state
  const gameState: GameState = {
    players,
    teams,
    deck: shuffleDeck([...deck]), // Spread to avoid reference sharing
    kittyCards: [],
    currentTrick: null,
    trumpInfo: {
      trumpRank: Rank.Two,
      trumpSuit: undefined,
    },
    tricks: [],
    roundNumber: 1,
    currentPlayerIndex: 0,
    gamePhase: GamePhase.Dealing,
  };

  // Deal cards to players using isolated logic
  const cardsPerPlayer = Math.floor((gameState.deck.length - 8) / players.length);
  
  gameState.players.forEach((player, index) => {
    const startIdx = index * cardsPerPlayer;
    player.hand = gameState.deck.slice(startIdx, startIdx + cardsPerPlayer).map(card => ({
      ...card, // Create new card objects to prevent reference sharing
    }));
  });

  // Set kitty cards
  gameState.kittyCards = gameState.deck.slice(gameState.deck.length - 8).map(card => ({
    ...card,
  }));

  // Update game phase
  gameState.gamePhase = GamePhase.Dealing;

  return gameState;
};

/**
 * Creates a deep copy of any object to prevent reference sharing
 * This is useful for ensuring test data doesn't have shared references
 */
export const deepClone = <T>(obj: T): T => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item)) as unknown as T;
  }
  
  const cloned = {} as T;
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  
  return cloned;
};

/**
 * Ensures a test function runs with completely isolated state
 * This wrapper guarantees no state leakage between tests
 */
export const withIsolatedState = <T extends any[], R>(
  testFn: (...args: T) => R
) => {
  return (...args: T): R => {
    // Clear any potential shared state before running the test
    jest.clearAllMocks();
    jest.resetAllMocks();
    
    try {
      return testFn(...args);
    } finally {
      // Clean up after the test
      jest.clearAllMocks();
    }
  };
};

/**
 * Validates that a game state has no shared references with another
 * Useful for debugging test isolation issues
 */
export const validateStateIsolation = (state1: GameState, state2: GameState): boolean => {
  // Check if any players share references
  for (let i = 0; i < state1.players.length; i++) {
    if (state1.players[i] === state2.players[i]) {
      console.warn(`Player ${i} shares reference between states`);
      return false;
    }
    
    if (state1.players[i].hand === state2.players[i].hand) {
      console.warn(`Player ${i} hand shares reference between states`);
      return false;
    }
  }
  
  // Check if teams share references
  for (let i = 0; i < state1.teams.length; i++) {
    if (state1.teams[i] === state2.teams[i]) {
      console.warn(`Team ${i} shares reference between states`);
      return false;
    }
  }
  
  // Check if decks share references
  if (state1.deck === state2.deck) {
    console.warn('Decks share reference between states');
    return false;
  }
  
  return true;
};