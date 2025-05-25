// Enhanced Point-Focused Strategy Types (Issue #61)

export enum GamePhaseStrategy {
  EarlyGame = "early_game", // First 25% of round - information gathering, position building
  MidGame = "mid_game", // Middle 50% of round - strategic point collection
  LateGame = "late_game", // Final 25% of round - optimal execution
}

export enum PointCardStrategy {
  Aggressive = "aggressive", // Actively collect points when behind
  Conservative = "conservative", // Protect points when ahead
  Escape = "escape", // Help partner dump point cards safely
  Block = "block", // Prevent opponent point collection
}

export enum TrumpTiming {
  Preserve = "preserve", // Save big trumps for critical moments
  Flush = "flush", // Use trumps to exhaust opponent trumps
  Control = "control", // Use trumps to control trick outcomes
  Emergency = "emergency", // Use any trump to prevent point loss
}

export interface PointFocusedContext {
  gamePhase: GamePhaseStrategy;
  pointCardStrategy: PointCardStrategy;
  trumpTiming: TrumpTiming;
  teamPointsCollected: number; // Points collected by team this round
  opponentPointsCollected: number; // Points collected by opponents
  pointCardDensity: number; // Percentage of remaining cards that are point cards
  partnerNeedsPointEscape: boolean; // Partner has many point cards to dump
  canWinWithoutPoints: boolean; // Team can win round without collecting more points
}

export interface TrumpConservationStrategy {
  preserveBigJokers: boolean; // Avoid playing big jokers early
  preserveSmallJokers: boolean; // Avoid playing small jokers early
  preserveTrumpRanks: boolean; // Avoid playing trump rank cards early
  minTricksRemainingForBigTrump: number; // Minimum tricks left before using big trumps
  trumpFollowingPriority: "minimal" | "moderate" | "aggressive"; // How aggressively to follow trump
}
