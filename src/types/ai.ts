// AI strategy and intelligence types

import { Card, Suit, TrumpInfo } from "./card";
import { PlayerId } from "./core";

// AI Strategy Enhancement Types
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

// Core AI Context - essential game state for AI decisions
export interface GameContext {
  // Core Game Info
  isAttackingTeam: boolean; // Is this AI on the attacking team?
  currentPoints: number; // Points collected by attacking team so far
  cardsRemaining: number; // Cards left in round
  trickPosition: TrickPosition; // Position in current trick
  pointPressure: PointPressure; // Urgency level based on point progress
  currentPlayer: PlayerId;
  trumpInfo?: TrumpInfo; // Trump information for card analysis
  trickWinnerAnalysis?: TrickWinnerAnalysis; // Real-time trick winner analysis

  // Memory System (always present to avoid nullable complexity)
  memoryContext: MemoryContext;
}

// Memory-enhanced context - contains all memory-related analysis
export interface MemoryContext {
  // Card Memory Data
  playedCards: Card[]; // All cards seen this round
  trumpCardsPlayed: number; // Count of trump cards played
  pointCardsPlayed: number; // Count of point cards played
  leadTrumpPairsPlayed: number; // Count of trump pairs played as leads
  suitDistribution: Record<string, number>; // Cards played by suit
  playerMemories: Record<string, PlayerMemory>; // Memory for each player
  tricksAnalyzed: number; // Number of tricks processed for memory

  // Memory Analysis
  cardsRemaining: number; // Total cards remaining across all players
  knownCards: number; // Cards we have information about
  nextPlayerVoidLed: boolean; // CRITICAL: Strategic trump conservation logic
}

// Phase 3: Enhanced Card Memory & Probability System
export interface PlayerMemory {
  playerId: PlayerId;
  knownCards: Card[]; // Cards we've seen this player play
  suitVoids: Set<Suit>; // Suits this player has shown to be out of
  trumpVoid: boolean; // Whether this player has shown to be out of trump cards
  trumpUsed: number; // The count of trump cards have been played by this player
}

// Enhanced types for real-time trick winner analysis
export interface TrickWinnerAnalysis {
  currentWinner: PlayerId; // Player ID of current trick winner
  isTeammateWinning: boolean; // Is AI's teammate currently winning
  isOpponentWinning: boolean; // Is an opponent currently winning
  isLeadWinning: boolean; // Is the leading player currently winning
  isTrumpLead: boolean; // Leading combo was trump
  isCurrentlyTrumped: boolean; // Non-trump lead got trumped by someone
  trickPoints: number; // Total points in current trick
}
