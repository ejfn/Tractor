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

export enum PlayerId {
  Human = "human",
  Bot1 = "bot1",
  Bot2 = "bot2",
  Bot3 = "bot3",
}

export enum PlayerName {
  Human = "You",
  Bot1 = "Bot 1",
  Bot2 = "Bot 2",
  Bot3 = "Bot 3",
}

export enum GamePhase {
  Dealing = "dealing",
  Declaring = "declaring",
  Playing = "playing",
  Scoring = "scoring",
  RoundEnd = "roundEnd",
  GameOver = "gameOver",
}

export enum TrickPosition {
  First = "first", // Leading the trick
  Second = "second", // Early follower
  Third = "third", // Late follower
  Fourth = "fourth", // Last player
}

export enum PointPressure {
  LOW = "low", // < 30% of points needed
  MEDIUM = "medium", // 30-70% of points needed
  HIGH = "high", // 70%+ of points needed
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
  team: "A" | "B"; // Team identifier
};

export type Team = {
  id: "A" | "B";
  currentRank: Rank;
  points: number;
  isDefending: boolean; // Whether this team is defending in the current round
};

export type Trick = {
  leadingPlayerId: string;
  leadingCombo: Card[]; // Cards that started the trick
  plays: {
    playerId: string;
    cards: Card[];
  }[];
  winningPlayerId?: string;
  points: number; // Total points in this trick
};

export type TrumpInfo = {
  trumpRank: Rank;
  trumpSuit?: Suit;
  declared: boolean;
  declarerPlayerId?: string; // ID of the player who declared trump
};

export type GameState = {
  players: Player[];
  teams: [Team, Team];
  deck: Card[];
  kittyCards: Card[]; // Bottom cards that no one gets to see
  currentTrick: Trick | null; // The trick currently being played (null when no trick in progress)
  trumpInfo: TrumpInfo;
  tricks: Trick[]; // History of all completed tricks in the current round
  roundNumber: number;
  currentPlayerIndex: number;
  lastRoundStartingPlayerIndex?: number; // Stores index of the player who started last round
  gamePhase: GamePhase;
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

// AI Strategy Enhancement Types
export interface GameContext {
  isAttackingTeam: boolean; // Is this AI on the attacking team?
  currentPoints: number; // Points collected by attacking team so far
  pointsNeeded: number; // Points needed to win (usually 80)
  cardsRemaining: number; // Cards left in round
  trickPosition: TrickPosition; // Position in current trick
  pointPressure: PointPressure; // Urgency level based on point progress
}

export interface CardMemory {
  playedCards: Card[]; // All cards seen this round
  trumpCardsPlayed: number; // Count of trump cards played
  pointCardsPlayed: number; // Count of point cards played
  suitDistribution: Record<string, number>; // Cards played by suit
}
