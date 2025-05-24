import {
  Card,
  GameState,
  JokerType,
  Player,
  PlayerId,
  PlayerName,
  Rank,
  Suit,
  Team,
  Trick,
  TrumpInfo,
  GamePhase
} from '../../src/types/game';

// ============================================================================
// CARD CREATION UTILITIES
// ============================================================================

/**
 * Creates a standard playing card with automatic point calculation
 */
export const createCard = (suit: Suit, rank: Rank, id?: string): Card => {
  let points = 0;
  if (rank === Rank.Five) points = 5;
  if (rank === Rank.Ten || rank === Rank.King) points = 10;
  
  return { 
    suit, 
    rank, 
    id: id || `${suit.toLowerCase()}_${rank.toLowerCase()}_${Math.random().toString(36).substring(7)}`, 
    points 
  };
};

/**
 * Creates a joker card
 */
export const createJoker = (type: JokerType, id?: string): Card => ({
  joker: type,
  id: id || `${type.toLowerCase()}_joker_${Math.random().toString(36).substring(7)}`,
  points: 0,
  suit: undefined,
  rank: undefined
});

/**
 * Creates multiple cards quickly using a shorthand notation
 * @param specs Array of [suit, rank] or [suit, rank, id] tuples
 */
export const createCards = (specs: Array<[Suit, Rank] | [Suit, Rank, string]>): Card[] => {
  return specs.map(spec => {
    const [suit, rank, id] = spec;
    return createCard(suit, rank, id);
  });
};

/**
 * Creates a pair of identical cards (same suit and rank)
 */
export const createPair = (suit: Suit, rank: Rank, baseId?: string): Card[] => {
  const base = baseId || `${suit.toLowerCase()}_${rank.toLowerCase()}`;
  return [
    createCard(suit, rank, `${base}_1`),
    createCard(suit, rank, `${base}_2`)
  ];
};

/**
 * Creates a tractor (consecutive pairs of same suit)
 */
export const createTractor = (suit: Suit, startRank: Rank, length: number = 2): Card[] => {
  const ranks = Object.values(Rank);
  const startIndex = ranks.indexOf(startRank);
  const cards: Card[] = [];
  
  for (let i = 0; i < length; i++) {
    const rank = ranks[startIndex + i];
    if (rank) {
      cards.push(...createPair(suit, rank));
    }
  }
  
  return cards;
};

// ============================================================================
// PLAYER CREATION UTILITIES
// ============================================================================

/**
 * Creates a player with specified properties
 */
export const createPlayer = (
  id: PlayerId,
  name: PlayerName,
  isHuman: boolean,
  team: 'A' | 'B',
  hand: Card[] = []
): Player => ({
  id,
  name,
  isHuman,
  team,
  hand: [...hand] // Deep copy the hand
});

/**
 * Creates the standard 4-player setup used in most tests
 */
export const createStandardPlayers = (): Player[] => [
  createPlayer(PlayerId.Human, PlayerName.Human, true, 'A'),
  createPlayer(PlayerId.Bot1, PlayerName.Bot1, false, 'B'),
  createPlayer(PlayerId.Bot2, PlayerName.Bot2, false, 'A'),
  createPlayer(PlayerId.Bot3, PlayerName.Bot3, false, 'B')
];

/**
 * Creates players with standard IDs but custom display names (useful for specific test scenarios)
 * Note: This bypasses type safety for custom names, use carefully
 */
export const createPlayersWithNames = (names: string[]): Player[] => {
  const teams: ('A' | 'B')[] = ['A', 'B', 'A', 'B'];
  const playerIds = [PlayerId.Human, PlayerId.Bot1, PlayerId.Bot2, PlayerId.Bot3];
  return names.map((name, index) => 
    createPlayer(playerIds[index], name as PlayerName, index === 0, teams[index])
  );
};

// ============================================================================
// TEAM CREATION UTILITIES
// ============================================================================

/**
 * Creates a team with specified properties
 */
export const createTeam = (
  id: 'A' | 'B',
  currentRank: Rank = Rank.Two,
  isDefending: boolean,
  points: number = 0
): Team => ({
  id,
  currentRank,
  isDefending,
  points
});

/**
 * Creates the standard team setup (Team A defending, Team B attacking)
 */
export const createStandardTeams = (): [Team, Team] => [
  createTeam('A', Rank.Two, true, 0),
  createTeam('B', Rank.Two, false, 0)
];

/**
 * Creates teams with custom ranks and points
 */
export const createTeamsWithRanks = (
  teamARank: Rank,
  teamBRank: Rank,
  defendingTeam: 'A' | 'B' = 'A',
  teamAPoints: number = 0,
  teamBPoints: number = 0
): [Team, Team] => [
  createTeam('A', teamARank, defendingTeam === 'A', teamAPoints),
  createTeam('B', teamBRank, defendingTeam === 'B', teamBPoints)
];

// ============================================================================
// TRUMP INFO UTILITIES
// ============================================================================

/**
 * Creates trump information
 */
export const createTrumpInfo = (
  trumpRank: Rank = Rank.Two,
  trumpSuit?: Suit,
  declared: boolean = false,
  declarerPlayerId?: string
): TrumpInfo => ({
  trumpRank,
  trumpSuit,
  declared,
  declarerPlayerId
});

/**
 * Creates trump info for common test scenarios
 */
export const createTrumpScenarios = {
  noTrump: () => createTrumpInfo(Rank.Two, undefined, false),
  heartsTrump: () => createTrumpInfo(Rank.Two, Suit.Hearts, true),
  spadesTrump: () => createTrumpInfo(Rank.Two, Suit.Spades, true),
  clubsTrump: () => createTrumpInfo(Rank.Two, Suit.Clubs, true),
  diamondsTrump: () => createTrumpInfo(Rank.Two, Suit.Diamonds, true),
  rankOnly: (rank: Rank) => createTrumpInfo(rank, undefined, false)
};

// ============================================================================
// TRICK CREATION UTILITIES
// ============================================================================

/**
 * Creates a trick with specified properties
 */
export const createTrick = (
  leadingPlayerId: string,
  leadingCombo: Card[],
  plays: Array<{ playerId: string; cards: Card[] }> = [],
  points: number = 0,
  winningPlayerId?: string
): Trick => ({
  leadingPlayerId,
  leadingCombo: [...leadingCombo], // Deep copy
  plays: plays.map(play => ({ ...play, cards: [...play.cards] })), // Deep copy
  points,
  winningPlayerId
});

/**
 * Creates a completed trick with all 4 players having played
 */
export const createCompletedTrick = (
  leadingPlayerId: string,
  leadingCards: Card[],
  otherPlays: Array<{ playerId: string; cards: Card[] }>,
  winningPlayerId: string
): Trick => {
  const totalPoints = [...leadingCards, ...otherPlays.flatMap(p => p.cards)]
    .reduce((sum, card) => sum + card.points, 0);
  
  return createTrick(leadingPlayerId, leadingCards, otherPlays, totalPoints, winningPlayerId);
};

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
    gamePhase: GamePhase.Declaring,
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
    currentTrick: createTrick('human', leadingCards)
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
    gamePhase: GamePhase.Declaring,
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
    determineTrickWinner: jest.fn(),
    isTrump: jest.fn(),
    humanHasTrumpRank: jest.fn().mockReturnValue(false)
  },
  
  aiLogic: {
    getAIMove: jest.fn(),
    shouldAIDeclare: jest.fn().mockReturnValue(false)
  },
  
  gamePlayManager: {
    processPlay: jest.fn(),
    validatePlay: jest.fn(),
    getAIMoveWithErrorHandling: jest.fn()
  },
  
  trumpManager: {
    declareTrumpSuit: jest.fn(),
    checkAITrumpDeclaration: jest.fn().mockReturnValue({ shouldDeclare: false }),
    humanHasTrumpRank: jest.fn().mockReturnValue(false)
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
      expect(gameState.trumpInfo.declared).toBe(true);
    }
  }
};

// ============================================================================
// COMMON TEST DATA
// ============================================================================

/**
 * Predefined test data for common scenarios
 */
export const testData = {
  // Standard cards for testing
  cards: {
    spadesAce: createCard(Suit.Spades, Rank.Ace, 'spades_ace_1'),
    heartsFive: createCard(Suit.Hearts, Rank.Five, 'hearts_five_1'),
    clubsKing: createCard(Suit.Clubs, Rank.King, 'clubs_king_1'),
    diamondsTen: createCard(Suit.Diamonds, Rank.Ten, 'diamonds_ten_1'),
    bigJoker: createJoker(JokerType.Big, 'big_joker_1'),
    smallJoker: createJoker(JokerType.Small, 'small_joker_1')
  },

  // Standard pairs for testing
  pairs: {
    spadesAces: createPair(Suit.Spades, Rank.Ace),
    heartsTwos: createPair(Suit.Hearts, Rank.Two),
    clubsKings: createPair(Suit.Clubs, Rank.King),
    diamondsFives: createPair(Suit.Diamonds, Rank.Five)
  },

  // Standard tractors for testing
  tractors: {
    spadesThreeFour: createTractor(Suit.Spades, Rank.Three, 2),
    heartsKingAce: createTractor(Suit.Hearts, Rank.King, 2),
    clubsFiveSixSeven: createTractor(Suit.Clubs, Rank.Five, 3)
  }
};