export enum Suit {
  Hearts = 'Hearts',
  Diamonds = 'Diamonds',
  Clubs = 'Clubs',
  Spades = 'Spades',
}

export enum Rank {
  Two = '2',
  Three = '3',
  Four = '4',
  Five = '5',
  Six = '6',
  Seven = '7',
  Eight = '8',
  Nine = '9',
  Ten = '10',
  Jack = 'J',
  Queen = 'Q',
  King = 'K',
  Ace = 'A',
}

export enum JokerType {
  Small = 'Small',
  Big = 'Big',
}

export type Card = {
  suit?: Suit;
  rank?: Rank;
  joker?: JokerType;
  id: string; // Unique ID for each card (considering we're using 2 decks)
  points: number; // Point value of the card (5s = 5, 10s and Ks = 10)
};

export type Player = {
  id: string;
  name: string;
  isHuman: boolean;
  hand: Card[];
  currentRank: Rank; // Player's current rank in the game
  team: 'A' | 'B'; // Team identifier
};

export type Team = {
  id: 'A' | 'B';
  players: string[]; // Array of player IDs
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
};

export type GameState = {
  players: Player[];
  teams: [Team, Team];
  deck: Card[];
  kittyCards: Card[]; // Bottom cards that no one gets to see
  currentTrick: Trick | null;
  trumpInfo: TrumpInfo;
  tricks: Trick[];
  roundNumber: number;
  currentPlayerIndex: number;
  gamePhase: 'dealing' | 'declaring' | 'playing' | 'scoring' | 'gameOver';
};

// Combination types for valid plays
export enum ComboType {
  Single = 'Single',
  Pair = 'Pair',
  Tractor = 'Tractor', // Consecutive pairs of same suit
}

export type Combo = {
  type: ComboType;
  cards: Card[];
  value: number; // Relative hand strength for comparison
};

// AI difficulty levels
export enum AIDifficulty {
  Easy = 'Easy',
  Medium = 'Medium',
  Hard = 'Hard',
}

// Game configuration
export type GameConfig = {
  aiDifficulty: AIDifficulty;
  playerName: string;
  teamNames: [string, string];
  startingRank: Rank;
};