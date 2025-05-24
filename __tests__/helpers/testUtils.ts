import { GameState, Player, Team, Card, Suit, Rank } from '../../src/types/game';
import { GameStateUtils } from '../../src/utils/gameStateUtils';

export function createTestCard(suit: Suit, rank: Rank): Card {
  return { suit, rank };
}

export function createTestPlayer(
  id: string,
  name: string,
  cards: Card[] = [],
  isHuman: boolean = false
): Player {
  return {
    id,
    name,
    cards,
    isHuman,
    selectedCards: [],
    hasPlayedCard: false
  };
}

export function createTestTeam(
  id: string,
  name: string,
  playerIds: string[],
  score: number = 0
): Team {
  return {
    id,
    name,
    playerIds,
    score,
    isDefending: false
  };
}

export function createTestGameState(overrides: Partial<GameState> = {}): GameState {
  const defaultPlayers = {
    'player': createTestPlayer('player', 'Human', [], true),
    'ai1': createTestPlayer('ai1', 'AI 1'),
    'ai2': createTestPlayer('ai2', 'AI 2'),
    'ai3': createTestPlayer('ai3', 'AI 3')
  };

  const defaultTeams = {
    'A': createTestTeam('A', 'Team A', ['player', 'ai2']),
    'B': createTestTeam('B', 'Team B', ['ai1', 'ai3'])
  };

  return {
    players: defaultPlayers,
    teams: defaultTeams,
    playOrder: ['player', 'ai1', 'ai2', 'ai3'],
    currentRank: 'TWO',
    trump: null,
    phase: 'dealing',
    deck: [],
    currentTrick: null,
    completedTricks: [],
    roundComplete: false,
    gameComplete: false,
    winner: null,
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
export function getTestTeam(gameState: GameState, teamId: string): Team {
  return GameStateUtils.getTeam(gameState, teamId);
}

// Helper function to create a game state with specific card distributions
export function createGameStateWithCards(playerCards: Record<string, Card[]>): GameState {
  const gameState = createTestGameState();
  
  Object.entries(playerCards).forEach(([playerId, cards]) => {
    if (gameState.players[playerId]) {
      gameState.players[playerId].cards = cards;
    }
  });
  
  return gameState;
}

// Helper function to create cards quickly
export function createCards(cardSpecs: Array<[Suit, Rank]>): Card[] {
  return cardSpecs.map(([suit, rank]) => createTestCard(suit, rank));
}

// Helper function to set up a game state in playing phase
export function createPlayingGameState(overrides: Partial<GameState> = {}): GameState {
  return createTestGameState({
    phase: 'playing',
    trump: 'HEARTS',
    currentRank: 'TWO',
    ...overrides
  });
}

// Helper function to create a trick in progress
export function createGameStateWithTrick(
  leadingPlayerId: string,
  leadingCards: Card[],
  plays: Array<{ playerId: string; cards: Card[] }> = [],
  overrides: Partial<GameState> = {}
): GameState {
  return createTestGameState({
    phase: 'playing',
    currentTrick: {
      leadingPlayerId,
      leadingCards,
      plays: plays.map(play => ({
        playerId: play.playerId,
        cards: play.cards
      }))
    },
    ...overrides
  });
}

// Helper function to simulate card dealing
export function dealCardsToPlayers(gameState: GameState, cardsPerPlayer: number = 13): GameState {
  const allCards: Card[] = [];
  
  // Create a standard deck
  const suits: Suit[] = ['SPADES', 'HEARTS', 'CLUBS', 'DIAMONDS'];
  const ranks: Rank[] = ['TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN', 'JACK', 'QUEEN', 'KING', 'ACE'];
  
  suits.forEach(suit => {
    ranks.forEach(rank => {
      allCards.push(createTestCard(suit, rank));
    });
  });
  
  // Add jokers
  allCards.push({ suit: 'JOKER', rank: 'SMALL_JOKER' });
  allCards.push({ suit: 'JOKER', rank: 'BIG_JOKER' });
  
  // Shuffle and deal
  const shuffled = [...allCards].sort(() => Math.random() - 0.5);
  const playerIds = Object.keys(gameState.players);
  
  const updatedPlayers = { ...gameState.players };
  playerIds.forEach((playerId, playerIndex) => {
    const startIndex = playerIndex * cardsPerPlayer;
    const endIndex = startIndex + cardsPerPlayer;
    updatedPlayers[playerId] = {
      ...updatedPlayers[playerId],
      cards: shuffled.slice(startIndex, endIndex)
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
    return total + player.cards.length;
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
  return player.cards.filter(card => card.suit === suit);
}

// Helper function to get cards by rank from a player
export function getCardsByRank(player: Player, rank: Rank): Card[] {
  return player.cards.filter(card => card.rank === rank);
}

// Helper function to create a minimal valid game state for testing
export function createMinimalGameState(): GameState {
  return createTestGameState({
    phase: 'playing',
    trump: 'HEARTS',
    currentRank: 'TWO'
  });
}

// Helper function to advance game state to a specific phase
export function advanceToPhase(gameState: GameState, phase: GameState['phase']): GameState {
  return {
    ...gameState,
    phase
  };
}

// Helper function to set trump for testing
export function setTrump(gameState: GameState, trump: Suit | null): GameState {
  return {
    ...gameState,
    trump
  };
}

// Helper function to complete a trick for testing
export function completeTrick(gameState: GameState, winningPlayerId: string): GameState {
  if (!gameState.currentTrick) {
    throw new Error('No current trick to complete');
  }
  
  const completedTrick = {
    leadingPlayerId: gameState.currentTrick.leadingPlayerId,
    leadingCards: gameState.currentTrick.leadingCards,
    plays: gameState.currentTrick.plays,
    winningPlayerId
  };
  
  return {
    ...gameState,
    currentTrick: null,
    completedTricks: [...gameState.completedTricks, completedTrick]
  };
}

// Helper function to create a game state with completed tricks
export function createGameStateWithCompletedTricks(
  tricks: Array<{
    leadingPlayerId: string;
    leadingCards: Card[];
    plays: Array<{ playerId: string; cards: Card[] }>;
    winningPlayerId: string;
  }>,
  overrides: Partial<GameState> = {}
): GameState {
  const completedTricks = tricks.map(trick => ({
    leadingPlayerId: trick.leadingPlayerId,
    leadingCards: trick.leadingCards,
    plays: trick.plays,
    winningPlayerId: trick.winningPlayerId
  }));
  
  return createTestGameState({
    phase: 'playing',
    completedTricks,
    ...overrides
  });
}