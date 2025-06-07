// AI strategy and intelligence types

import { Card, PlayerId, Suit, TrumpInfo, Combo } from "./core";

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

// Memory-enhanced decision context
export interface MemoryContext {
  cardsRemaining: number;
  knownCards: number; // Cards we have information about
  uncertaintyLevel: number; // 0.0 (perfect info) to 1.0 (no info)
  trumpExhaustion: number; // 0.0 (many trumps left) to 1.0 (few trumps)
  opponentHandStrength: Record<string, number>; // Estimated strength per player
  cardMemory?: CardMemory; // Enhanced: Direct access to card memory for biggest remaining detection
}

// Position-based strategy matrices
export interface PositionStrategy {
  informationGathering: number; // How much to prioritize learning opponent hands
  riskTaking: number; // Willingness to use strong cards
  partnerCoordination: number; // How much to consider partner status
  disruptionFocus: number; // How much to focus on disrupting opponents
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
  trickWinnerAnalysis?: TrickWinnerAnalysis; // Real-time trick winner analysis
  trumpInfo?: TrumpInfo; // Enhanced: Trump information for card analysis
}

export interface ComboAnalysis {
  strength: ComboStrength;
  isTrump: boolean;
  hasPoints: boolean;
  pointValue: number;
  disruptionPotential: number; // How much this combo can disrupt opponents
  conservationValue: number; // How valuable this combo is to keep
}

// Phase 3: Enhanced Card Memory & Probability System
export interface PlayerMemory {
  playerId: PlayerId;
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

// Enhanced types for real-time trick winner analysis
export interface TrickWinnerAnalysis {
  currentWinner: PlayerId; // Player ID of current trick winner
  isTeammateWinning: boolean; // Is AI's teammate currently winning
  isOpponentWinning: boolean; // Is an opponent currently winning
  isSelfWinning: boolean; // Is this AI currently winning
  trickPoints: number; // Total points in current trick
  canBeatCurrentWinner: boolean; // Can this AI beat current winner
  shouldTryToBeat: boolean; // Strategic decision to try beating
  shouldPlayConservatively: boolean; // Strategic decision for conservative play
}

// 4th Player Perfect Information Analysis
export interface FourthPlayerAnalysis {
  certainWinCards: Combo[]; // Cards that definitely win
  pointMaximizationPotential: number; // Total points possible in trick
  optimalContributionStrategy: "maximize" | "conserve" | "beat"; // Recommended strategy
  teammateSupportOpportunity: boolean; // Can contribute points to teammate
  guaranteedPointCards: Combo[]; // Point cards that are guaranteed winners
  perfectInformationAdvantage: boolean; // Has certain winning options
}

// 1st Player (Leading) Strategy Analysis
export interface FirstPlayerAnalysis {
  gamePhaseStrategy: "probe" | "aggressive" | "control" | "endgame"; // Leading strategy based on game phase
  informationGatheringFocus: number; // How much to prioritize learning from responses (0-1)
  handRevealMinimization: number; // How much to hide hand strength from opponents (0-1)
  optimalLeadingCombo: Combo | null; // Best combination for leading
  strategicDepth: "shallow" | "medium" | "deep"; // How sophisticated the leading strategy should be
  trumpConservationPriority: number; // Priority for conserving trump cards (0-1)
  opponentProbeValue: number; // Value of probing opponent hands (0-1)
  teamCoordinationSetup: boolean; // Whether this lead sets up good teammate positions
}

// 2nd Player Strategy Analysis
export interface SecondPlayerAnalysis {
  leaderRelationship: "teammate" | "opponent"; // Relationship to the leading player
  leaderStrength: "weak" | "moderate" | "strong"; // Assessment of leader's play strength
  responseStrategy: "support" | "pressure" | "block" | "setup"; // Recommended response strategy
  informationAdvantage: number; // Advantage from seeing leader's play (0-1 scale)
  optimalCombo: Combo | null; // Best combination for the situation
  setupOpportunity: boolean; // Can setup teammates for positions 3/4
  blockingPotential: number; // Potential to disrupt opponent plans (0-1)
  coordinationValue: number; // Value of coordinating with future positions (0-1)
  shouldContribute: boolean; // Whether to contribute points to trick
}

// 3rd Player Tactical Analysis
export interface ThirdPlayerAnalysis {
  teammateLeadStrength: "weak" | "moderate" | "strong"; // Teammate's lead security assessment
  takeoverRecommendation: "support" | "takeover" | "strategic"; // Recommended action
  pointContributionStrategy: "enhanced" | "strategic" | "conservative"; // Point contribution approach
  vulnerabilityFactors: string[]; // Specific vulnerabilities in teammate's lead
  riskAssessment: number; // Risk level of potential takeover (0-1 scale)
  pointMaximizationPotential: number; // Points that could be collected
  optimalCombo: Combo | null; // Best combination for the situation
  tacticalAdvantage: boolean; // Whether 3rd position provides tactical benefit
}
