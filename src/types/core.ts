// Core game enums and basic types
import { Card, Rank, TrumpInfo } from "./card";
import { DealingState } from "./dealing";
import { TrumpDeclarationState } from "./trumpDeclaration";

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

export enum GamePhase {
  Dealing = "dealing",
  KittySwap = "kittySwap",
  Playing = "playing",
  Scoring = "scoring",
  RoundEnd = "roundEnd",
  GameOver = "gameOver",
}

export type Player = {
  id: PlayerId;
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
  isFinalTrick?: boolean; // Optional flag to track if this is the final trick of the round
};

export type KittyBonusInfo = {
  kittyPoints: number;
  multiplier: number;
  bonusPoints: number;
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
  gamePhase: GamePhase;
  kittyBonus?: KittyBonusInfo;
};

/**
 * Result of processing a round end - contains computed information for modal display and next round preparation
 */
export type RoundResult = {
  // Game outcome
  gameOver: boolean;
  gameWinner?: TeamId; // Only set when entire game ends

  // Team and rank changes
  attackingTeamWon: boolean; // Also indicates round winner and if team roles should switch
  winningTeam: TeamId; // The team that won this round
  rankChanges: Record<TeamId, Rank>;
  rankAdvancement: number; // How many ranks the winning team advanced

  // Point information
  finalPoints: number;
  kittyBonus?: KittyBonusInfo;
};
