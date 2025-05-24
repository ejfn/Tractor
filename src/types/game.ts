export enum Suit {
  Hearts = "Hearts",
  Diamonds = "Diamonds",
  Clubs = "Clubs",
  Spades = "Spades",
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

export type Card = {
  suit?: Suit;
  rank?: Rank;
  joker?: JokerType;
  id: string; // Unique ID for each card (considering we're using 2 decks)
  points: number; // Point value of the card (5s = 5, 10s and Ks = 10)
};

export type Team = {
  id: "A" | "B";
  currentRank: Rank;
  points: number;
  isDefending: boolean; // Whether this team is defending in the current round
  // Note: players list is derived from GameState.playerStates by team field
};

export type PlayerPosition = "bottom" | "right" | "top" | "left";

export interface Player {
  id: string;
  name: string;
  isHuman: boolean;
  hand: Card[];
  teamId: "A" | "B";
  position: PlayerPosition;
  isThinking: boolean;
}

export type Trick = {
  leadingPlayerId: string;
  leadingCombo: Card[]; // Cards that started the trick
  plays: {
    playerId: string;
    cards: Card[];
  }[];
  winningPlayerId?: string;
  points: number; // Total points in this trick
  // Note: leadingPlayerId serves as trickLeaderId, winningPlayerId serves as trickWinnerId
};

export type TrumpInfo = {
  trumpRank: Rank;
  trumpSuit?: Suit;
  declared: boolean;
  declarerPlayerId?: string;
};

export type GameState = {
  // Core game data with players and teams
  players: Record<string, Player>;
  teams: Record<"A" | "B", Team>;
  deck: Card[];
  kittyCards: Card[]; // Bottom cards that no one gets to see
  currentTrick: Trick | null;
  trumpInfo: TrumpInfo;
  tricks: Trick[];
  roundNumber: number;
  gamePhase:
    | "dealing"
    | "declaring"
    | "playing"
    | "scoring"
    | "roundEnd"
    | "gameOver";

  // Unified state management
  currentPlayerId: string;
  selectedCards: Card[];
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

// AI now always runs at Hard difficulty

// Game constants
export const PLAYER_COUNT = 4;
export const TRICK_COMPLETE_PLAYS = 3; // PLAYER_COUNT - 1 (leader doesn't go in plays array)
