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

// Memory-enhanced decision context
export interface MemoryContext {
  cardsRemaining: number;
  knownCards: number; // Cards we have information about
  uncertaintyLevel: number; // 0.0 (perfect info) to 1.0 (no info)
  trumpExhaustion: number; // 0.0 (many trumps left) to 1.0 (few trumps)
  opponentHandStrength: Record<string, number>; // Estimated strength per player
}

// Position-based strategy matrices
export interface PositionStrategy {
  informationGathering: number; // How much to prioritize learning opponent hands
  riskTaking: number; // Willingness to use strong cards
  partnerCoordination: number; // How much to consider partner status
  disruptionFocus: number; // How much to focus on disrupting opponents
}

// AI now always runs at Hard difficulty

// AI Strategy Enhancement Types
export enum ComboStrength {
  Weak = "weak", // Low-value cards, safe to play
  Medium = "medium", // Moderate value, strategic choice
  Strong = "strong", // High value, precious resource
  Critical = "critical", // Highest trump/tractor, game-changing
}

export enum PlayStyle {
  Conservative = "conservative", // Minimize risks, save resources
  Balanced = "balanced", // Moderate risk-taking
  Aggressive = "aggressive", // High risk, high reward
  Desperate = "desperate", // All-out attack/defense
}

export interface GameContext {
  isAttackingTeam: boolean; // Is this AI on the attacking team?
  currentPoints: number; // Points collected by attacking team so far
  pointsNeeded: number; // Points needed to win (usually 80)
  cardsRemaining: number; // Cards left in round
  trickPosition: TrickPosition; // Position in current trick
  pointPressure: PointPressure; // Urgency level based on point progress
  playStyle: PlayStyle; // Current strategic approach
  memoryContext?: MemoryContext; // Phase 3: Memory-based decision context
  memoryStrategy?: MemoryBasedStrategy; // Phase 3: Memory-enhanced strategy
}

export interface ComboAnalysis {
  strength: ComboStrength;
  isTrump: boolean;
  hasPoints: boolean;
  pointValue: number;
  disruptionPotential: number; // How much this combo can disrupt opponents
  conservationValue: number; // How valuable this combo is to keep
}

export interface TrickAnalysis {
  currentWinner: string | null;
  winningCombo: Card[] | null;
  totalPoints: number;
  canWin: boolean; // Can this AI win with available combos
  shouldContest: boolean; // Is it strategically worth contesting
  partnerStatus: "winning" | "losing" | "not_played";
}

// Phase 3: Enhanced Card Memory & Probability System
export interface PlayerMemory {
  playerId: string;
  knownCards: Card[]; // Cards we've seen this player play
  estimatedHandSize: number; // Estimated cards remaining
  suitVoids: Set<Suit>; // Suits this player has shown to be out of
  trumpCount: number; // Estimated trump cards remaining
  pointCardsProbability: number; // Likelihood of having point cards
  playPatterns: PlayPattern[]; // Historical play behavior
}

export interface PlayPattern {
  situation: string; // "leading_low_pressure", "following_partner_winning", etc.
  cardType: "trump" | "point" | "safe" | "discard";
  frequency: number; // How often this pattern occurs
}

export interface CardProbability {
  card: Card;
  players: Record<string, number>; // Probability each player has this card
}

export interface CardMemory {
  playedCards: Card[]; // All cards seen this round
  trumpCardsPlayed: number; // Count of trump cards played
  pointCardsPlayed: number; // Count of point cards played
  suitDistribution: Record<string, number>; // Cards played by suit
  playerMemories: Record<string, PlayerMemory>; // Memory for each player
  cardProbabilities: CardProbability[]; // Probability distribution for unseen cards
  roundStartCards: number; // Cards each player started with this round
  tricksAnalyzed: number; // Number of tricks processed for memory
}

export interface MemoryBasedStrategy {
  shouldPlayTrump: boolean; // Based on trump card tracking
  riskLevel: number; // 0.0-1.0 based on remaining card knowledge
  expectedOpponentStrength: number; // Estimated opponent hand strength
  suitExhaustionAdvantage: boolean; // Can we exploit suit voids
  endgameOptimal: boolean; // Perfect information available
}
