import {
  Card,
  DeckId,
  GamePhase,
  GameState,
  JokerType,
  Player,
  PlayerId,
  Rank,
  Suit,
  Team,
  TeamId,
  TrumpDeclarationState,
} from "../types";
import { gameLogger } from "./gameLogger";

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

// Shuffle deck using individual deck shuffling then combined shuffling for enhanced randomness
export const shuffleDeck = (deck: Card[]): Card[] => {
  // Separate the two decks by deckId
  const deck0Cards = deck.filter((card) => card.deckId === 0);
  const deck1Cards = deck.filter((card) => card.deckId === 1);

  // Shuffle cards using Fisher-Yates algorithm
  const shuffleCards = (cards: Card[]): Card[] => {
    const shuffled = [...cards];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const shuffledDeck0 = shuffleCards(deck0Cards);
  const shuffledDeck1 = shuffleCards(deck1Cards);

  // Join the two shuffled decks alternately (deck0, deck1, deck0, deck1...)
  const combinedDeck: Card[] = [];
  const maxLength = Math.max(shuffledDeck0.length, shuffledDeck1.length);
  for (let i = 0; i < maxLength; i++) {
    if (i < shuffledDeck0.length) {
      combinedDeck.push(shuffledDeck0[i]);
    }
    if (i < shuffledDeck1.length) {
      combinedDeck.push(shuffledDeck1[i]);
    }
  }

  // Perform final shuffle on the combined deck
  const finalDeck = shuffleCards(combinedDeck);

  return finalDeck;
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
      isHuman: true,
      hand: [],
      team: TeamId.A,
    },
    {
      id: PlayerId.Bot1,
      isHuman: false,
      hand: [],
      team: TeamId.B,
    },
    {
      id: PlayerId.Bot2,
      isHuman: false,
      hand: [],
      team: TeamId.A,
    },
    {
      id: PlayerId.Bot3,
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

  // Log game initialization
  gameLogger.info(
    "game_initialized",
    {
      roundNumber: gameState.roundNumber,
      defendingTeam: gameState.teams.find((t) => t.isDefending)?.id,
      attackingTeam: gameState.teams.find((t) => !t.isDefending)?.id,
      roundStartingPlayer:
        gameState.players[gameState.roundStartingPlayerIndex]?.id,
      trumpRank: gameState.trumpInfo.trumpRank,
      teamRanks: gameState.teams.map((team) => ({
        teamId: team.id,
        currentRank: team.currentRank,
        isDefending: team.isDefending,
      })),
      deckSize: gameState.deck.length,
    },
    `Game initialized: ${gameState.teams.find((t) => t.isDefending)?.id} defending, ${gameState.teams.find((t) => !t.isDefending)?.id} attacking, trump rank ${gameState.trumpInfo.trumpRank}`,
  );

  return gameState;
  // Don't initialize dealing state here - let dealNextCard() handle it properly
};
