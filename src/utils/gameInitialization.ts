import {
  Card,
  DeckId,
  GamePhase,
  GameState,
  JokerType,
  Player,
  PlayerId,
  PlayerName,
  Rank,
  Suit,
  Team,
  TeamId,
  TrumpDeclarationState,
} from "../types";

// Create a new deck of cards (2 decks for Shengji)
export const createDeck = (): Card[] => {
  const deck: Card[] = [];

  // Create 2 decks with all suits and ranks
  for (let deckNum = 0; deckNum < 2; deckNum++) {
    // Regular cards (exclude Suit.None and Rank.None which are only for jokers)
    Object.values(Suit)
      .filter((suit) => suit !== Suit.None)
      .forEach((suit) => {
        Object.values(Rank)
          .filter((rank) => rank !== Rank.None)
          .forEach((rank) => {
            deck.push(Card.createCard(suit, rank, deckNum as DeckId));
          });
      });

    // Add jokers
    deck.push(Card.createJoker(JokerType.Small, deckNum as DeckId));
    deck.push(Card.createJoker(JokerType.Big, deckNum as DeckId));
  }

  return deck;
};

// Shuffle deck using Fisher-Yates algorithm
export const shuffleDeck = (deck: Card[]): Card[] => {
  const newDeck = [...deck];
  for (let i = newDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
  }
  return newDeck;
};

/**
 * Initialize trump declaration state for a new round
 */
export function initializeTrumpDeclarationState(): TrumpDeclarationState {
  return {
    currentDeclaration: undefined,
    declarationHistory: [],
    declarationWindow: true, // Start with declarations allowed
  };
}

/**
 * Initialize a new game with default settings
 */
export const initializeGame = (): GameState => {
  // Create players (1 human, 3 AI)
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

  // Create teams
  const teams: [Team, Team] = [
    {
      id: TeamId.A,
      currentRank: Rank.Two,
      points: 0,
      isDefending: true, // Team A defends first
    },
    {
      id: TeamId.B,
      currentRank: Rank.Two,
      points: 0,
      isDefending: false,
    },
  ];

  // Create and shuffle deck
  const deck = shuffleDeck(createDeck());

  // Initialize game state
  const gameState: GameState = {
    players,
    teams,
    deck,
    kittyCards: [],
    currentTrick: null,
    trumpInfo: {
      trumpRank: Rank.Two,
      trumpSuit: undefined,
    },
    trumpDeclarationState: initializeTrumpDeclarationState(),
    tricks: [],
    roundNumber: 1,
    currentPlayerIndex: 0,
    roundStartingPlayerIndex: 0, // Round 1 starts with Human (index 0)
    gamePhase: GamePhase.Dealing,
  };

  return gameState;
  // Don't initialize dealing state here - let dealNextCard() handle it properly
};
