import { GameState, Player, Team, Card, Suit, Rank, JokerType, PlayerPosition, TrumpInfo, Trick } from '../../src/types/game';
import { GameStateUtils } from '../../src/utils/gameStateUtils';

export function createTestCard(suit?: Suit, rank?: Rank, joker?: JokerType, id?: string): Card {
  const cardId = id || (joker ? `joker-${joker}` : `${suit}-${rank}`);
  let points = 0;
  
  if (rank === Rank.Five) points = 5;
  if (rank === Rank.Ten || rank === Rank.King) points = 10;
  
  return { suit, rank, joker, id: cardId, points };
}

export function createTestPlayer(
  id: string,
  name?: string,
  hand?: Card[],
  isHuman?: boolean,
  teamId?: "A" | "B",
  position?: PlayerPosition
): Player {
  return {
    id,
    name: name || `Player ${id}`,
    hand: hand || [],
    isHuman: isHuman || false,
    teamId: teamId || "A",
    position: position || "bottom",
    isThinking: false
  };
}

export function createTestTeam(
  id: "A" | "B",
  currentRank: Rank = Rank.Two,
  points: number = 0,
  isDefending: boolean = false
): Team {
  return {
    id,
    currentRank,
    points,
    isDefending
  };
}

export function createTestTeams(overrides?: {
  A?: Partial<Team>;
  B?: Partial<Team>;
}): Record<"A" | "B", Team> {
  return {
    'A': { ...createTestTeam('A'), ...overrides?.A },
    'B': { ...createTestTeam('B'), ...overrides?.B }
  };
}

export function createTestTrumpInfo(
  trumpRank: Rank = Rank.Two,
  trumpSuit?: Suit,
  declared: boolean = false,
  declarerPlayerId?: string
): TrumpInfo {
  return {
    trumpRank,
    trumpSuit,
    declared,
    declarerPlayerId
  };
}

export function createTestGameState(overrides: Partial<GameState> = {}): GameState {
  const defaultPlayers = {
    'player': createTestPlayer('player', 'Human', [], true, 'A', 'bottom'),
    'ai1': createTestPlayer('ai1', 'Bot 1', [], false, 'B', 'right'),
    'ai2': createTestPlayer('ai2', 'Bot 2', [], false, 'A', 'top'),
    'ai3': createTestPlayer('ai3', 'Bot 3', [], false, 'B', 'left')
  };

  const defaultTeams = {
    'A': createTestTeam('A'),
    'B': createTestTeam('B')
  };

  return {
    players: defaultPlayers,
    teams: defaultTeams,
    deck: [],
    kittyCards: [],
    currentTrick: null,
    trumpInfo: createTestTrumpInfo(),
    tricks: [],
    roundNumber: 1,
    gamePhase: 'dealing',
    currentPlayerId: 'player',
    selectedCards: [],
    ...overrides
  };
}

export function createTest(description: string, testFn: () => void | Promise<void>) {
  return { description, testFn };
}

// Helper function to get a player by ID from test game state
export function getTestPlayer(gameState: GameState, playerId: string): Player {
  return GameStateUtils.getPlayerById(gameState, playerId);
}

// Helper function to get a team by ID from test game state
export function getTestTeam(gameState: GameState, teamId: "A" | "B"): Team {
  return GameStateUtils.getTeam(gameState, teamId);
}

// Helper function to create a game state with specific card distributions
export function createGameStateWithCards(playerCards: Record<string, Card[]>): GameState {
  const gameState = createTestGameState();
  
  Object.entries(playerCards).forEach(([playerId, cards]) => {
    if (gameState.players[playerId]) {
      gameState.players[playerId].hand = cards;
    }
  });
  
  return gameState;
}

// Helper function to create cards quickly
export function createCards(cardSpecs: Array<[Suit?, Rank?, JokerType?]>): Card[] {
  return cardSpecs.map(([suit, rank, joker]) => createTestCard(suit, rank, joker));
}

// Helper function to set up a game state in playing phase
export function createPlayingGameState(overrides: Partial<GameState> = {}): GameState {
  return createTestGameState({
    gamePhase: 'playing',
    trumpInfo: createTestTrumpInfo(Rank.Two, Suit.Hearts, true),
    ...overrides
  });
}

// Helper function to create a trick in progress
export function createGameStateWithTrick(
  leadingPlayerId: string,
  leadingCombo: Card[],
  plays: Array<{ playerId: string; cards: Card[] }> = [],
  overrides: Partial<GameState> = {}
): GameState {
  const trick: Trick = {
    leadingPlayerId,
    leadingCombo,
    plays: plays.map(play => ({
      playerId: play.playerId,
      cards: play.cards
    })),
    points: 0
  };

  return createTestGameState({
    gamePhase: 'playing',
    currentTrick: trick,
    ...overrides
  });
}

// Helper function to simulate card dealing
export function dealCardsToPlayers(gameState: GameState, cardsPerPlayer: number = 13): GameState {
  const allCards: Card[] = [];
  
  // Create a standard deck
  const suits = [Suit.Spades, Suit.Hearts, Suit.Clubs, Suit.Diamonds];
  const ranks = [
    Rank.Two, Rank.Three, Rank.Four, Rank.Five, Rank.Six, Rank.Seven,
    Rank.Eight, Rank.Nine, Rank.Ten, Rank.Jack, Rank.Queen, Rank.King, Rank.Ace
  ];
  
  suits.forEach(suit => {
    ranks.forEach(rank => {
      allCards.push(createTestCard(suit, rank));
    });
  });
  
  // Add jokers
  allCards.push(createTestCard(undefined, undefined, JokerType.Small));
  allCards.push(createTestCard(undefined, undefined, JokerType.Big));
  
  // Shuffle and deal
  const shuffled = [...allCards].sort(() => Math.random() - 0.5);
  const playerIds = Object.keys(gameState.players);
  
  const updatedPlayers = { ...gameState.players };
  playerIds.forEach((playerId, playerIndex) => {
    const startIndex = playerIndex * cardsPerPlayer;
    const endIndex = startIndex + cardsPerPlayer;
    updatedPlayers[playerId] = {
      ...updatedPlayers[playerId],
      hand: shuffled.slice(startIndex, endIndex)
    };
  });
  
  return {
    ...gameState,
    players: updatedPlayers,
    deck: shuffled.slice(playerIds.length * cardsPerPlayer)
  };
}

// Helper function to count total cards across all players
export function getTotalCardsInPlay(gameState: GameState): number {
  return Object.values(gameState.players).reduce((total, player) => {
    return total + player.hand.length;
  }, 0);
}

// Helper function to verify card conservation
export function verifyCardConservation(
  initialState: GameState,
  finalState: GameState,
  expectedTotal: number = 54
): boolean {
  const initialTotal = getTotalCardsInPlay(initialState) + initialState.deck.length;
  const finalTotal = getTotalCardsInPlay(finalState) + finalState.deck.length;
  
  return initialTotal === expectedTotal && finalTotal === expectedTotal && initialTotal === finalTotal;
}

// Helper function to get cards by suit from a player
export function getCardsBySuit(player: Player, suit: Suit): Card[] {
  return player.hand.filter(card => card.suit === suit);
}

// Helper function to get cards by rank from a player
export function getCardsByRank(player: Player, rank: Rank): Card[] {
  return player.hand.filter(card => card.rank === rank);
}

// Helper function to create a minimal valid game state for testing
export function createMinimalGameState(): GameState {
  return createTestGameState({
    gamePhase: 'playing',
    trumpInfo: createTestTrumpInfo(Rank.Two, Suit.Hearts, true)
  });
}

// Helper function to advance game state to a specific phase
export function advanceToPhase(gameState: GameState, gamePhase: GameState['gamePhase']): GameState {
  return {
    ...gameState,
    gamePhase
  };
}

// Helper function to set trump for testing
export function setTrump(gameState: GameState, trumpSuit: Suit | undefined, trumpRank: Rank = Rank.Two): GameState {
  return {
    ...gameState,
    trumpInfo: {
      ...gameState.trumpInfo,
      trumpSuit,
      trumpRank,
      declared: trumpSuit !== undefined
    }
  };
}

// Helper function to complete a trick for testing
export function completeTrick(gameState: GameState, winningPlayerId: string): GameState {
  if (!gameState.currentTrick) {
    throw new Error('No current trick to complete');
  }
  
  const completedTrick: Trick = {
    leadingPlayerId: gameState.currentTrick.leadingPlayerId,
    leadingCombo: gameState.currentTrick.leadingCombo,
    plays: gameState.currentTrick.plays,
    winningPlayerId,
    points: gameState.currentTrick.points
  };
  
  return {
    ...gameState,
    currentTrick: null,
    tricks: [...gameState.tricks, completedTrick]
  };
}

// Helper function to create a game state with completed tricks
export function createGameStateWithCompletedTricks(
  tricks: Array<{
    leadingPlayerId: string;
    leadingCombo: Card[];
    plays: Array<{ playerId: string; cards: Card[] }>;
    winningPlayerId: string;
    points?: number;
  }>,
  overrides: Partial<GameState> = {}
): GameState {
  const completedTricks: Trick[] = tricks.map(trick => ({
    leadingPlayerId: trick.leadingPlayerId,
    leadingCombo: trick.leadingCombo,
    plays: trick.plays,
    winningPlayerId: trick.winningPlayerId,
    points: trick.points || 0
  }));
  
  return createTestGameState({
    gamePhase: 'playing',
    tricks: completedTricks,
    ...overrides
  });
}

// Additional helper functions that some tests might expect
export function findPlayerById(gameState: GameState, playerId: string): Player {
  return GameStateUtils.getPlayerById(gameState, playerId);
}

export function getPlayOrder(gameState: GameState): Player[] {
  return GameStateUtils.getPlayersInOrder(gameState);
}

export function createAITestGameState(overrides: Partial<GameState> = {}): GameState {
  return createTestGameState(overrides);
}

export function setPlayerCards(gameState: GameState, playerId: string, cards: Card[]): GameState {
  return GameStateUtils.updatePlayer(gameState, playerId, { hand: cards });
}

export function createSequentialCards(suit: Suit, startRank: Rank, count: number): Card[] {
  const ranks = [
    Rank.Two, Rank.Three, Rank.Four, Rank.Five, Rank.Six, Rank.Seven,
    Rank.Eight, Rank.Nine, Rank.Ten, Rank.Jack, Rank.Queen, Rank.King, Rank.Ace
  ];
  
  const startIndex = ranks.indexOf(startRank);
  if (startIndex === -1) {
    throw new Error(`Invalid start rank: ${startRank}`);
  }
  
  const cards: Card[] = [];
  for (let i = 0; i < count && startIndex + i < ranks.length; i++) {
    cards.push(createTestCard(suit, ranks[startIndex + i]));
  }
  
  return cards;
}