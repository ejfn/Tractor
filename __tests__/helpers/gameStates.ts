import {
  Card,
  GameState,
  GamePhase,
  Player,
  PlayerId,
  PlayerName,
  Rank,
  Suit,
  Team,
  Trick,
  TrumpInfo,
} from '../../src/types';
import { createCard, createPair, createTractor, testData } from './cards';
import { createStandardPlayers, createStandardTeams } from './players';
import { createTrumpInfo } from './trump';
import { createCompletedTrick, createTrick } from './tricks';

// ============================================================================
// GAME STATE CREATION UTILITIES
// ============================================================================

interface GameStateOptions {
  players?: Player[];
  teams?: [Team, Team];
  trumpInfo?: TrumpInfo;
  gamePhase?: GamePhase;
  currentPlayerIndex?: number;
  currentTrick?: Trick | null;
  tricks?: Trick[];
  roundNumber?: number;
  deck?: Card[];
  kittyCards?: Card[];
  lastRoundStartingPlayerIndex?: number;
}

/**
 * Creates a game state with sensible defaults and optional overrides
 */
export const createGameState = (options: GameStateOptions = {}): GameState => ({
  players: options.players || createStandardPlayers(),
  teams: options.teams || createStandardTeams(),
  trumpInfo: options.trumpInfo || createTrumpInfo(),
  gamePhase: options.gamePhase || GamePhase.Playing,
  currentPlayerIndex: options.currentPlayerIndex ?? 0,
  currentTrick: options.currentTrick ?? null,
  tricks: options.tricks || [],
  deck: options.deck || [],
  kittyCards: options.kittyCards || [],
  roundNumber: options.roundNumber || 1,
  lastRoundStartingPlayerIndex: options.lastRoundStartingPlayerIndex
});

/**
 * Creates common game state scenarios
 */
export const createGameScenarios = {
  // Fresh game start
  newGame: () => createGameState({
    gamePhase: GamePhase.Dealing,
    currentPlayerIndex: 0,
    roundNumber: 1
  }),

  // Trump declaration phase
  trumpDeclaration: () => createGameState({
    gamePhase: GamePhase.Dealing,
    trumpInfo: createTrumpInfo(Rank.Two, undefined, false)
  }),

  // Active game with trump declared
  playingWithTrump: (trumpSuit: Suit) => createGameState({
    gamePhase: GamePhase.Playing,
    trumpInfo: createTrumpInfo(Rank.Two, trumpSuit, true)
  }),

  // Game in progress, human's turn
  humanTurn: () => createGameState({
    gamePhase: GamePhase.Playing,
    currentPlayerIndex: 0
  }),

  // Game in progress, AI turn
  aiTurn: (aiIndex: number = 1) => createGameState({
    gamePhase: GamePhase.Playing,
    currentPlayerIndex: aiIndex
  }),

  // Trick in progress
  trickInProgress: (leadingCards: Card[], currentPlayer: number = 1) => createGameState({
    gamePhase: GamePhase.Playing,
    currentPlayerIndex: currentPlayer,
    currentTrick: createTrick(PlayerId.Human, leadingCards)
  }),

  // End of round
  roundEnd: () => createGameState({
    gamePhase: GamePhase.Scoring
  })
};

// ============================================================================
// COMMON MOCK GAME STATE PATTERNS
// ============================================================================

/**
 * Creates a basic game state with no trump declared and empty hands
 * Used for testing game mechanics without card-specific logic
 */
export const createBasicGameState = (): GameState => createGameState({
  gamePhase: GamePhase.Playing,
  trumpInfo: createTrumpInfo(Rank.Two, undefined, false),
  currentPlayerIndex: 0
});

/**
 * Creates a game state with trump declared for the specified suit
 * Used for testing trump-related game mechanics
 */
export const createTrumpGameState = (trumpSuit: Suit): GameState => createGameState({
  gamePhase: GamePhase.Playing,
  trumpInfo: createTrumpInfo(Rank.Two, trumpSuit, true),
  currentPlayerIndex: 0
});

/**
 * Creates a game state with standard test cards distributed to all players
 * Used for testing card-specific interactions and UI components
 */
export const createTestCardsGameState = (): GameState => {
  let state = createGameState({
    gamePhase: GamePhase.Playing,
    trumpInfo: createTrumpInfo(Rank.Two, undefined, false),
    currentPlayerIndex: 0
  });

  // Give each player a set of test cards
  state = givePlayerCards(state, 0, [
    testData.cards.heartsFive,    // 5 points
    testData.cards.clubsKing      // 10 points
  ]);
  
  state = givePlayerCards(state, 1, [
    createCard(Suit.Diamonds, Rank.Three),
    createCard(Suit.Clubs, Rank.Jack)
  ]);
  
  state = givePlayerCards(state, 2, [
    createCard(Suit.Spades, Rank.Two),  // Would be trump if spades declared
    createCard(Suit.Hearts, Rank.Ace)
  ]);
  
  state = givePlayerCards(state, 3, [
    createCard(Suit.Clubs, Rank.Four),
    testData.cards.diamondsTen    // 10 points
  ]);

  return state;
};

/**
 * Creates a minimal game state focused on team scoring
 * Used for testing scoring logic and team-related functionality
 */
export const createScoringGameState = (teamAPoints: number = 0, teamBPoints: number = 0): GameState => {
  const state = createGameState({
    gamePhase: GamePhase.Scoring,
    currentPlayerIndex: 0
  });
  
  // Set team points
  state.teams[0].points = teamAPoints;
  state.teams[1].points = teamBPoints;
  
  return state;
};

/**
 * Creates a game state for trump declaration testing
 * Players have trump rank cards that they can use to declare trump
 */
export const createTrumpDeclarationGameState = (): GameState => {
  let state = createGameState({
    gamePhase: GamePhase.Dealing,
    trumpInfo: createTrumpInfo(Rank.Two, undefined, false),
    currentPlayerIndex: 0
  });

  // Give players trump rank cards for declaration testing
  state = givePlayerCards(state, 0, [
    createCard(Suit.Hearts, Rank.Two),   // Trump rank card
    createCard(Suit.Spades, Rank.King)
  ]);
  
  state = givePlayerCards(state, 1, [
    createCard(Suit.Clubs, Rank.Two),    // Trump rank card
    createCard(Suit.Diamonds, Rank.Ace)
  ]);
  
  state = givePlayerCards(state, 2, [
    createCard(Suit.Spades, Rank.Two),   // Trump rank card
    createCard(Suit.Hearts, Rank.Queen)
  ]);
  
  state = givePlayerCards(state, 3, [
    createCard(Suit.Diamonds, Rank.Two), // Trump rank card
    createCard(Suit.Clubs, Rank.Jack)
  ]);

  return state;
};

/**
 * Creates a full game state with completed tricks and round history
 * Used for testing round management and game progression
 */
export const createFullGameStateWithTricks = (): GameState => {
  let state = createGameState({
    gamePhase: GamePhase.Playing,
    trumpInfo: createTrumpInfo(Rank.Two, Suit.Spades, true),
    currentPlayerIndex: 0,
    roundNumber: 1
  });

  // Add some completed tricks to the history
  const completedTrick1 = createCompletedTrick(
    PlayerId.Human,
    [testData.cards.heartsFive],
    [
      { playerId: PlayerId.Bot1, cards: [createCard(Suit.Hearts, Rank.Three)] },
      { playerId: PlayerId.Bot2, cards: [createCard(Suit.Hearts, Rank.Ace)] },
      { playerId: PlayerId.Bot3, cards: [createCard(Suit.Hearts, Rank.King)] }
    ],
    PlayerId.Bot2 // Ace wins
  );

  const completedTrick2 = createCompletedTrick(
    PlayerId.Bot2,
    [createCard(Suit.Clubs, Rank.Queen)],
    [
      { playerId: PlayerId.Bot3, cards: [createCard(Suit.Clubs, Rank.Jack)] },
      { playerId: PlayerId.Human, cards: [createCard(Suit.Clubs, Rank.Four)] },
      { playerId: PlayerId.Bot1, cards: [createCard(Suit.Clubs, Rank.Two)] }
    ],
    PlayerId.Bot2 // Queen wins
  );

  state.tricks = [completedTrick1, completedTrick2];

  // Give players remaining cards
  state = givePlayerCards(state, 0, [
    testData.cards.clubsKing,
    createCard(Suit.Diamonds, Rank.Seven)
  ]);
  
  state = givePlayerCards(state, 1, [
    createCard(Suit.Spades, Rank.Five),
    createCard(Suit.Hearts, Rank.Six)
  ]);
  
  state = givePlayerCards(state, 2, [
    createCard(Suit.Spades, Rank.Ace),
    createCard(Suit.Diamonds, Rank.Eight)
  ]);
  
  state = givePlayerCards(state, 3, [
    createCard(Suit.Hearts, Rank.Seven),
    createCard(Suit.Clubs, Rank.Five)
  ]);

  return state;
};

/**
 * Creates a game state specifically for player rotation testing
 * Focuses on counter-clockwise player order with minimal setup
 */
export const createRotationTestGameState = (): GameState => createGameState({
  gamePhase: GamePhase.Playing,
  trumpInfo: createTrumpInfo(Rank.Two, Suit.Hearts, true),
  currentPlayerIndex: 0
});

/**
 * Creates a game state for React component testing
 * Includes mock cards with predictable IDs for component assertions
 */
export const createComponentTestGameState = (): GameState => {
  let state = createGameState({
    gamePhase: GamePhase.Playing,
    trumpInfo: createTrumpInfo(Rank.Two, undefined, false),
    currentPlayerIndex: 0
  });

  // Give players cards with predictable structure for component testing
  state = givePlayerCards(state, 0, [
    createCard(Suit.Spades, Rank.Five, 'spades_5_1'),
    createCard(Suit.Hearts, Rank.King, 'hearts_k_1')
  ]);
  
  state = givePlayerCards(state, 1, [
    createCard(Suit.Diamonds, Rank.Three, 'diamonds_3_1'),
    createCard(Suit.Clubs, Rank.Jack, 'clubs_j_1')
  ]);
  
  state = givePlayerCards(state, 2, [
    createCard(Suit.Spades, Rank.Two, 'spades_2_1'),
    createCard(Suit.Hearts, Rank.Queen, 'hearts_q_1')
  ]);
  
  state = givePlayerCards(state, 3, [
    createCard(Suit.Clubs, Rank.Four, 'clubs_4_1'),
    createCard(Suit.Diamonds, Rank.Six, 'diamonds_6_1')
  ]);

  return state;
};

// ============================================================================
// HAND SETUP UTILITIES
// ============================================================================

/**
 * Gives a player specific cards (replaces their hand)
 */
export const givePlayerCards = (
  gameState: GameState,
  playerIndex: number,
  cards: Card[]
): GameState => {
  const newState = { ...gameState };
  newState.players = gameState.players.map((player, index) => 
    index === playerIndex 
      ? { ...player, hand: [...cards] }
      : { ...player, hand: [...player.hand] } // Deep copy all hands
  );
  return newState;
};

/**
 * Adds cards to a player's existing hand
 */
export const addCardsToPlayer = (
  gameState: GameState,
  playerIndex: number,
  cards: Card[]
): GameState => {
  const newState = { ...gameState };
  newState.players = gameState.players.map((player, index) => 
    index === playerIndex 
      ? { ...player, hand: [...player.hand, ...cards] }
      : { ...player, hand: [...player.hand] }
  );
  return newState;
};

/**
 * Sets up hands for common test scenarios
 */
export const setupTestHands = {
  // Give human a pair
  humanPair: (gameState: GameState, suit: Suit, rank: Rank) => 
    givePlayerCards(gameState, 0, createPair(suit, rank)),

  // Give human a tractor
  humanTractor: (gameState: GameState, suit: Suit, startRank: Rank) => 
    givePlayerCards(gameState, 0, createTractor(suit, startRank)),

  // Give human trump cards
  humanTrumpCards: (gameState: GameState, trumpSuit: Suit, ranks: Rank[]) => 
    givePlayerCards(gameState, 0, ranks.map(rank => createCard(trumpSuit, rank))),

  // Give all players some cards
  allPlayersCards: (gameState: GameState, cardsPerPlayer: number = 5) => {
    let cardIndex = 0;
    const allSuits = Object.values(Suit);
    const allRanks = Object.values(Rank);
    
    return gameState.players.reduce((state, _, playerIndex) => {
      const cards: Card[] = [];
      for (let i = 0; i < cardsPerPlayer; i++) {
        const suit = allSuits[cardIndex % allSuits.length];
        const rank = allRanks[Math.floor(cardIndex / allSuits.length) % allRanks.length];
        cards.push(createCard(suit, rank));
        cardIndex++;
      }
      return givePlayerCards(state, playerIndex, cards);
    }, gameState);
  }
};

