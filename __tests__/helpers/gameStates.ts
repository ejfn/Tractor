import {
  dealNextCard,
  isDealingComplete,
} from "../../src/game/dealingAndDeclaration";
import {
  Card,
  GamePhase,
  GameState,
  Player,
  PlayerId,
  Rank,
  Suit,
  Team,
  Trick,
  TrumpInfo,
} from "../../src/types";
import { initializeGame } from "../../src/utils/gameInitialization";
import { createTractor, testData } from "./cards";
import { createStandardPlayers, createStandardTeams } from "./players";
import { createCompletedTrick, createTrick } from "./tricks";
import { createTrumpInfo } from "./trump";

// ============================================================================
// GAME STATE CREATION UTILITIES
// ============================================================================

interface GameStateOptions {
  players?: Player[];
  teams?: [Team, Team];
  trumpInfo?: TrumpInfo;
  gamePhase?: GamePhase;
  currentPlayerIndex?: number;
  roundStartingPlayerIndex?: number;
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
  roundStartingPlayerIndex: options.roundStartingPlayerIndex ?? 0,
  currentTrick: options.currentTrick ?? null,
  tricks: options.tricks || [],
  deck: options.deck || [],
  kittyCards: options.kittyCards || [],
  roundNumber: options.roundNumber || 1,
  lastRoundStartingPlayerIndex: options.lastRoundStartingPlayerIndex,
});

/**
 * Creates common game state scenarios
 */
export const createGameScenarios = {
  // Fresh game start
  newGame: () =>
    createGameState({
      gamePhase: GamePhase.Dealing,
      currentPlayerIndex: 0,
      roundNumber: 1,
    }),

  // Trump declaration phase
  trumpDeclaration: () =>
    createGameState({
      gamePhase: GamePhase.Dealing,
      trumpInfo: createTrumpInfo(Rank.Two, undefined),
    }),

  // Active game with trump declared
  playingWithTrump: (trumpSuit: Suit) =>
    createGameState({
      gamePhase: GamePhase.Playing,
      trumpInfo: createTrumpInfo(Rank.Two, trumpSuit),
    }),

  // Game in progress, human's turn
  humanTurn: () =>
    createGameState({
      gamePhase: GamePhase.Playing,
      currentPlayerIndex: 0,
    }),

  // Game in progress, AI turn
  aiTurn: (aiIndex: number = 1) =>
    createGameState({
      gamePhase: GamePhase.Playing,
      currentPlayerIndex: aiIndex,
    }),

  // Trick in progress
  trickInProgress: (leadingCards: Card[], currentPlayer: number = 1) =>
    createGameState({
      gamePhase: GamePhase.Playing,
      currentPlayerIndex: currentPlayer,
      currentTrick: createTrick(PlayerId.Human, leadingCards),
    }),

  // End of round
  roundEnd: () =>
    createGameState({
      gamePhase: GamePhase.Scoring,
    }),
};

// ============================================================================
// COMMON MOCK GAME STATE PATTERNS
// ============================================================================

/**
 * Creates a basic game state with no trump declared and empty hands
 * Used for testing game mechanics without card-specific logic
 */
export const createBasicGameState = (): GameState =>
  createGameState({
    gamePhase: GamePhase.Playing,
    trumpInfo: createTrumpInfo(Rank.Two, undefined),
    currentPlayerIndex: 0,
  });

/**
 * Creates a game state with trump declared for the specified suit
 * Used for testing trump-related game mechanics
 */
export const createTrumpGameState = (trumpSuit: Suit): GameState =>
  createGameState({
    gamePhase: GamePhase.Playing,
    trumpInfo: createTrumpInfo(Rank.Two, trumpSuit),
    currentPlayerIndex: 0,
  });

/**
 * Creates a game state with standard test cards distributed to all players
 * Used for testing card-specific interactions and UI components
 */
export const createTestCardsGameState = (): GameState => {
  let state = createGameState({
    gamePhase: GamePhase.Playing,
    trumpInfo: createTrumpInfo(Rank.Two, undefined),
    currentPlayerIndex: 0,
  });

  // Give each player a set of test cards
  state = givePlayerCards(state, 0, [
    testData.cards.heartsFive, // 5 points
    testData.cards.clubsKing, // 10 points
  ]);

  state = givePlayerCards(state, 1, [
    Card.createCard(Suit.Diamonds, Rank.Three, 0),
    Card.createCard(Suit.Clubs, Rank.Jack, 0),
  ]);

  state = givePlayerCards(state, 2, [
    Card.createCard(Suit.Spades, Rank.Two, 0), // Would be trump if spades declared
    Card.createCard(Suit.Hearts, Rank.Ace, 0),
  ]);

  state = givePlayerCards(state, 3, [
    Card.createCard(Suit.Clubs, Rank.Four, 0),
    testData.cards.diamondsTen, // 10 points
  ]);

  return state;
};

/**
 * Creates a minimal game state focused on team scoring
 * Used for testing scoring logic and team-related functionality
 */
export const createScoringGameState = (
  teamAPoints: number = 0,
  teamBPoints: number = 0,
): GameState => {
  const state = createGameState({
    gamePhase: GamePhase.Scoring,
    currentPlayerIndex: 0,
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
    trumpInfo: createTrumpInfo(Rank.Two, undefined),
    currentPlayerIndex: 0,
  });

  // Give players trump rank cards for declaration testing
  state = givePlayerCards(state, 0, [
    Card.createCard(Suit.Hearts, Rank.Two, 0), // Trump rank card
    Card.createCard(Suit.Spades, Rank.King, 0),
  ]);

  state = givePlayerCards(state, 1, [
    Card.createCard(Suit.Clubs, Rank.Two, 0), // Trump rank card
    Card.createCard(Suit.Diamonds, Rank.Ace, 0),
  ]);

  state = givePlayerCards(state, 2, [
    Card.createCard(Suit.Spades, Rank.Two, 0), // Trump rank card
    Card.createCard(Suit.Hearts, Rank.Queen, 0),
  ]);

  state = givePlayerCards(state, 3, [
    Card.createCard(Suit.Diamonds, Rank.Two, 0), // Trump rank card
    Card.createCard(Suit.Clubs, Rank.Jack, 0),
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
    trumpInfo: createTrumpInfo(Rank.Two, Suit.Spades),
    currentPlayerIndex: 0,
    roundNumber: 1,
  });

  // Add some completed tricks to the history
  const completedTrick1 = createCompletedTrick(
    PlayerId.Human,
    [testData.cards.heartsFive],
    [
      {
        playerId: PlayerId.Bot1,
        cards: [Card.createCard(Suit.Hearts, Rank.Three, 0)],
      },
      {
        playerId: PlayerId.Bot2,
        cards: [Card.createCard(Suit.Hearts, Rank.Ace, 0)],
      },
      {
        playerId: PlayerId.Bot3,
        cards: [Card.createCard(Suit.Hearts, Rank.King, 0)],
      },
    ],
    PlayerId.Bot2, // Ace wins
  );

  const completedTrick2 = createCompletedTrick(
    PlayerId.Bot2,
    [Card.createCard(Suit.Clubs, Rank.Queen, 0)],
    [
      {
        playerId: PlayerId.Bot3,
        cards: [Card.createCard(Suit.Clubs, Rank.Jack, 0)],
      },
      {
        playerId: PlayerId.Human,
        cards: [Card.createCard(Suit.Clubs, Rank.Four, 0)],
      },
      {
        playerId: PlayerId.Bot1,
        cards: [Card.createCard(Suit.Clubs, Rank.Two, 0)],
      },
    ],
    PlayerId.Bot2, // Queen wins
  );

  state.tricks = [completedTrick1, completedTrick2];

  // Give players remaining cards
  state = givePlayerCards(state, 0, [
    testData.cards.clubsKing,
    Card.createCard(Suit.Diamonds, Rank.Seven, 0),
  ]);

  state = givePlayerCards(state, 1, [
    Card.createCard(Suit.Spades, Rank.Five, 0),
    Card.createCard(Suit.Hearts, Rank.Six, 0),
  ]);

  state = givePlayerCards(state, 2, [
    Card.createCard(Suit.Spades, Rank.Ace, 0),
    Card.createCard(Suit.Diamonds, Rank.Eight, 0),
  ]);

  state = givePlayerCards(state, 3, [
    Card.createCard(Suit.Hearts, Rank.Seven, 0),
    Card.createCard(Suit.Clubs, Rank.Five, 0),
  ]);

  return state;
};

/**
 * Creates a game state specifically for player rotation testing
 * Focuses on counter-clockwise player order with minimal setup
 */
export const createRotationTestGameState = (): GameState =>
  createGameState({
    gamePhase: GamePhase.Playing,
    trumpInfo: createTrumpInfo(Rank.Two, Suit.Hearts),
    currentPlayerIndex: 0,
  });

/**
 * Creates a game state for React component testing
 * Includes mock cards with predictable IDs for component assertions
 */
export const createComponentTestGameState = (): GameState => {
  let state = createGameState({
    gamePhase: GamePhase.Playing,
    trumpInfo: createTrumpInfo(Rank.Two, undefined),
    currentPlayerIndex: 0,
  });

  // Give players cards with predictable structure for component testing
  state = givePlayerCards(state, 0, [
    Card.createCard(Suit.Spades, Rank.Five, 0),
    Card.createCard(Suit.Hearts, Rank.King, 0),
  ]);

  state = givePlayerCards(state, 1, [
    Card.createCard(Suit.Diamonds, Rank.Three, 0),
    Card.createCard(Suit.Clubs, Rank.Jack, 0),
  ]);

  state = givePlayerCards(state, 2, [
    Card.createCard(Suit.Spades, Rank.Two, 0),
    Card.createCard(Suit.Hearts, Rank.Queen, 0),
  ]);

  state = givePlayerCards(state, 3, [
    Card.createCard(Suit.Clubs, Rank.Four, 0),
    Card.createCard(Suit.Diamonds, Rank.Six, 0),
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
  cards: Card[],
): GameState => {
  const newState = { ...gameState };
  newState.players = gameState.players.map(
    (player, index) =>
      index === playerIndex
        ? { ...player, hand: [...cards] }
        : { ...player, hand: [...player.hand] }, // Deep copy all hands
  );
  return newState;
};

/**
 * Adds cards to a player's existing hand
 */
export const addCardsToPlayer = (
  gameState: GameState,
  playerIndex: number,
  cards: Card[],
): GameState => {
  const newState = { ...gameState };
  newState.players = gameState.players.map((player, index) =>
    index === playerIndex
      ? { ...player, hand: [...player.hand, ...cards] }
      : { ...player, hand: [...player.hand] },
  );
  return newState;
};

/**
 * Sets up hands for common test scenarios
 */
export const setupTestHands = {
  // Give human a pair
  humanPair: (gameState: GameState, suit: Suit, rank: Rank) =>
    givePlayerCards(gameState, 0, Card.createPair(suit, rank)),

  // Give human a tractor
  humanTractor: (gameState: GameState, suit: Suit, startRank: Rank) =>
    givePlayerCards(gameState, 0, createTractor(suit, startRank)),

  // Give human trump cards
  humanTrumpCards: (gameState: GameState, trumpSuit: Suit, ranks: Rank[]) =>
    givePlayerCards(
      gameState,
      0,
      ranks.map((rank) => Card.createCard(trumpSuit, rank, 0)),
    ),

  // Give all players some cards
  allPlayersCards: (gameState: GameState, cardsPerPlayer: number = 5) => {
    let cardIndex = 0;
    const allSuits = Object.values(Suit);
    const allRanks = Object.values(Rank);

    return gameState.players.reduce((state, _, playerIndex) => {
      const cards: Card[] = [];
      for (let i = 0; i < cardsPerPlayer; i++) {
        const suit = allSuits[cardIndex % allSuits.length];
        const rank =
          allRanks[Math.floor(cardIndex / allSuits.length) % allRanks.length];
        cards.push(Card.createCard(suit, rank, 0));
        cardIndex++;
      }
      return givePlayerCards(state, playerIndex, cards);
    }, gameState);
  },
};

/**
 * Creates a game state with fully dealt cards ready for Playing phase
 * Uses the progressive dealing system to deal all cards, then sets to Playing
 * This is what most logic tests should use instead of initializeGame
 */
export const createFullyDealtGameState = (): GameState => {
  // Initialize game
  let gameState = initializeGame();

  // Deal all cards using progressive dealing
  while (!isDealingComplete(gameState)) {
    gameState = dealNextCard(gameState);
  }

  // Set to playing phase
  gameState.gamePhase = GamePhase.Playing;

  return gameState;
};

/**
 * Helper function to safely get a player from game state
 * Throws descriptive error if player not found
 */
export const getPlayerById = (
  gameState: GameState,
  playerId: PlayerId,
): Player => {
  const player = gameState.players.find((p) => p.id === playerId);
  if (!player) {
    throw new Error(`Player ${playerId} not found in game state`);
  }
  return player;
};
