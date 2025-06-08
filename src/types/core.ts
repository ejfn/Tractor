// Core game enums and basic types
import { TrumpDeclarationState } from "./trumpDeclaration";
import { DealingState } from "./dealing";

export enum Suit {
  Hearts = "Hearts",
  Diamonds = "Diamonds",
  Clubs = "Clubs",
  Spades = "Spades",
  None = "None", // For joker pair declarations - no trump suit
}

export enum Rank {
  Two = "2",
  Three = "3",
  Four = "4",
  Five = "5",
  Six = "6",
  Seven = "7",
  Eight = "8",
  Nine = "9",
  Ten = "10",
  Jack = "J",
  Queen = "Q",
  King = "K",
  Ace = "A",
}

export enum JokerType {
  Small = "Small",
  Big = "Big",
}

export enum PlayerId {
  Human = "human",
  Bot1 = "bot1",
  Bot2 = "bot2",
  Bot3 = "bot3",
}

export enum TeamId {
  A = "A",
  B = "B",
}

export enum PlayerName {
  Human = "You",
  Bot1 = "Bot 1",
  Bot2 = "Bot 2",
  Bot3 = "Bot 3",
}

export enum GamePhase {
  Dealing = "dealing",
  KittySwap = "kittySwap",
  Playing = "playing",
  Scoring = "scoring",
  RoundEnd = "roundEnd",
  GameOver = "gameOver",
}

export type Card = {
  suit?: Suit;
  rank?: Rank;
  joker?: JokerType;
  id: string; // Unique ID for each card (considering we're using 2 decks)
  points: number; // Point value of the card (5s = 5, 10s and Ks = 10)
};

export type Player = {
  id: PlayerId;
  name: PlayerName;
  isHuman: boolean;
  hand: Card[];
  team: TeamId; // Team identifier
};

export type Team = {
  id: TeamId;
  currentRank: Rank;
  points: number;
  isDefending: boolean; // Whether this team is defending in the current round
};

export type Trick = {
  plays: {
    playerId: PlayerId;
    cards: Card[];
  }[]; // All plays including leader at plays[0]
  winningPlayerId: PlayerId; // Current winner of the trick (starts with plays[0].playerId, updates as stronger plays are made)
  points: number; // Total points in this trick
};

export type TrumpInfo = {
  trumpRank: Rank;
  trumpSuit?: Suit; // undefined = not declared, Suit.None = joker pairs, specific suit = trump rank declarations
};

export type GameState = {
  players: Player[];
  teams: [Team, Team];
  deck: Card[];
  kittyCards: Card[]; // Bottom cards that no one gets to see
  currentTrick: Trick | null; // The trick currently being played (null when no trick in progress)
  trumpInfo: TrumpInfo;
  trumpDeclarationState?: TrumpDeclarationState; // Trump declarations during dealing phase (optional for backward compatibility)
  dealingState?: DealingState; // Progressive dealing state (optional for backward compatibility)
  tricks: Trick[]; // History of all completed tricks in the current round
  roundNumber: number;
  currentPlayerIndex: number;
  roundStartingPlayerIndex: number; // Index of the player who starts the current round (for crown display)
  lastRoundStartingPlayerIndex?: number; // Stores index of the player who started last round
  gamePhase: GamePhase;
  roundEndKittyInfo?: {
    // Track kitty info for round result display (use gameState.kittyCards for the actual cards)
    kittyPoints: number;
    finalTrickType: string; // "singles" or "pairs/tractors"
    kittyBonus?: {
      // Only present if attacking team won final trick
      bonusPoints: number;
      multiplier: number;
    };
  };
};

// Combination types for valid plays
export enum ComboType {
  Single = "Single",
  Pair = "Pair",
  Tractor = "Tractor", // Consecutive pairs of same suit
}

export type Combo = {
  type: ComboType;
  cards: Card[];
  value: number; // Relative hand strength for comparison
};

/**
 * Result of processing a round end - contains computed information for modal display and next round preparation
 */
export type RoundResult = {
  // Game outcome
  gameOver: boolean;
  gameWinner?: TeamId; // Only set when entire game ends
  roundCompleteMessage: string;

  // Team and rank changes
  attackingTeamWon: boolean; // Also indicates round winner and if team roles should switch
  rankChanges: Record<TeamId, Rank>;

  // Point information
  finalPoints: number;
  pointsBreakdown: string;
};
