// AI strategy and intelligence types

import type { PointCardTimingAnalysis } from "../ai/analysis/pointCardTiming";
import type { VoidExploitationAnalysis } from "../ai/analysis/voidExploitation";
import { Card, Combo, Suit, TrumpInfo } from "./card";
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
  voidExploitation?: VoidExploitationAnalysis; // Advanced void exploitation analysis
  pointTiming?: PointCardTimingAnalysis; // Point card timing analysis
  nextPlayerVoidLed?: boolean;
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
  trickWinnerAnalysis?: TrickWinnerAnalysis; // Real-time trick winner analysis
  trumpInfo?: TrumpInfo; // Enhanced: Trump information for card analysis
  memoryContext?: MemoryContext; // Memory-based decision context
}

export interface ComboAnalysis {
  strength: ComboStrength;
  isTrump: boolean;
  hasPoints: boolean;
  pointValue: number;
  disruptionPotential: number; // How much this combo can disrupt opponents
  conservationValue: number; // How valuable this combo is to keep
  isBreakingPair: boolean; // Whether this combo breaks up a valuable pair
}

// Phase 3: Enhanced Card Memory & Probability System
export interface PlayerMemory {
  playerId: PlayerId;
  knownCards: Card[]; // Cards we've seen this player play
  estimatedHandSize: number; // Estimated cards remaining
  suitVoids: Set<Suit>; // Suits this player has shown to be out of
  trumpVoid: boolean; // Whether this player has shown to be out of trump cards
  trumpUsed: number; // The count of trump cards have been played by this player
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
  isLeadWinning: boolean; // Is the leading player currently winning
  isSelfWinning: boolean; // Is this AI currently winning
  trickPoints: number; // Total points in current trick
  canBeatCurrentWinner: boolean; // Can this AI beat current winner
  shouldTryToBeat: boolean; // Strategic decision to try beating
  shouldPlayConservatively: boolean; // Strategic decision for conservative play
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

// 4th Player Perfect Information Analysis
export interface FourthPlayerAnalysis {
  certainWinCards: Combo[]; // Cards that definitely win
  pointMaximizationPotential: number; // Total points possible in trick
  optimalContributionStrategy:
    | "maximize"
    | "optimize"
    | "conservative"
    | "minimal"
    | "conserve"
    | "beat"; // Recommended strategy
  teammateSupportOpportunity: boolean; // Can contribute points to teammate
  guaranteedPointCards: Combo[]; // Point cards that are guaranteed winners
  perfectInformationAdvantage: boolean; // Has certain winning options
  // Phase 3: Memory enhancement fields
  memoryAnalysis?: {
    optimalDecision: "win" | "lose" | "minimize" | "contribute";
    confidenceLevel: number;
    futureRoundAdvantage: number;
    reasoning: string;
  };
  trumpConservationRecommendation?: "preserve" | "standard" | "use";
  nonTrumpPointOptions: Combo[]; // Non-trump point card options
  trumpPointOptions: Combo[]; // Trump point card options
}

// Phase 4: Historical Trick Analysis Types
export interface TrickHistoryAnalysis {
  opponentLeadingPatterns: Record<PlayerId, OpponentLeadingPattern>; // Leading behavior patterns by player
  teamCoordinationHistory: TeamCoordinationPattern; // Team cooperation patterns
  adaptiveBehaviorTrends: AdaptiveBehaviorDetection; // Learning and adaptation patterns
  roundProgression: RoundProgressionPattern; // How player behavior changes through rounds
  trickSequencePatterns: TrickSequencePattern[]; // Multi-trick tactical patterns
}

export interface OpponentLeadingPattern {
  trumpLeadFrequency: number; // 0-1 frequency of leading trump
  pointCardLeadFrequency: number; // 0-1 frequency of leading point cards
  strongSuitPreference: Suit | null; // Preferred suit for leading
  situationalBehavior: Record<string, LeadingBehaviorProfile>; // Context-specific leading patterns
  aggressivenessLevel: number; // 0-1 scale of aggressive vs conservative leading
  teamCoordinationStyle: "supportive" | "independent" | "opportunistic"; // How they coordinate with teammates
}

export interface LeadingBehaviorProfile {
  cardTypePreference: "trump" | "point" | "safe" | "tactical"; // Preferred card type to lead
  comboPreference: "singles" | "pairs" | "tractors"; // Preferred combination type
  frequency: number; // How often this behavior occurs
  context: string; // Game situation that triggers this behavior
}

export interface TeamCoordinationPattern {
  supportFrequency: number; // 0-1 frequency of supporting winning teammates
  blockingEfficiency: number; // 0-1 effectiveness at blocking opponents
  pointContributionStrategy: "conservative" | "aggressive" | "opportunistic"; // Point contribution style
  communicationPatterns: CommunicationPattern[]; // Implied communication through plays
  cooperationLevel: number; // 0-1 overall team cooperation effectiveness
}

export interface CommunicationPattern {
  signal: string; // Type of signal (e.g., "trump_conservation", "point_dump")
  frequency: number; // How often this signal appears
  effectiveness: number; // 0-1 how well teammates respond to this signal
  context: string; // When this communication typically occurs
}

export interface AdaptiveBehaviorDetection {
  learningRate: number; // 0-1 how quickly player adapts to opponent strategies
  counterStrategyUsage: number; // 0-1 frequency of counter-strategy deployment
  behaviorConsistency: number; // 0-1 how consistent player behavior is
  adaptationTriggers: string[]; // Situations that cause behavior changes
  strategicFlexibility: number; // 0-1 ability to change tactics mid-round
}

export interface RoundProgressionPattern {
  earlyRoundBehavior: BehaviorPhaseProfile; // Behavior in early tricks
  midRoundBehavior: BehaviorPhaseProfile; // Behavior in middle tricks
  endgameBehavior: BehaviorPhaseProfile; // Behavior in final tricks
  consistencyScore: number; // 0-1 how consistent behavior is across round phases
}

export interface BehaviorPhaseProfile {
  riskTolerance: number; // 0-1 willingness to take risks
  trumpUsage: number; // 0-1 frequency of trump card usage
  pointFocus: number; // 0-1 focus on collecting points
  teamOrientation: number; // 0-1 focus on team coordination vs individual play
}

export interface TrickSequencePattern {
  patternType: "setup" | "trap" | "coordination" | "endgame"; // Type of multi-trick pattern
  triggerConditions: string[]; // Conditions that initiate this pattern
  sequenceLength: number; // Number of tricks involved in pattern
  successRate: number; // 0-1 historical success rate of this pattern
  playerInvolved: PlayerId[]; // Players who participate in this pattern
  description: string; // Human-readable description of the pattern
}

// Enhanced Memory Context for Historical Analysis
export interface EnhancedMemoryContext extends MemoryContext {
  trickHistory?: TrickHistoryAnalysis; // Historical pattern analysis
  predictiveModeling?: PredictiveOpponentModel[]; // Opponent behavior predictions
  adaptiveStrategy?: AdaptiveStrategyRecommendation; // Strategy recommendations based on history
}

export interface PredictiveOpponentModel {
  playerId: PlayerId; // Target player for prediction
  nextMoveAnalysis: NextMovePrediction; // Predicted next move
  handStrengthEstimate: HandStrengthPrediction; // Estimated hand composition
  strategicIntent: StrategicIntentAnalysis; // Predicted strategic goals
  reliability: number; // 0-1 confidence in predictions
}

export interface NextMovePrediction {
  mostLikelyPlay: "trump" | "point" | "safe" | "tactical"; // Predicted card type
  confidence: number; // 0-1 confidence in prediction
  alternativeScenarios: AlternativeScenario[]; // Other possible plays
  reasoning: string; // Why this prediction was made
}

export interface AlternativeScenario {
  playType: "trump" | "point" | "safe" | "tactical"; // Alternative card type
  probability: number; // 0-1 probability of this alternative
  conditions: string[]; // Conditions that would trigger this alternative
}

export interface HandStrengthPrediction {
  trumpCount: number; // Estimated trump cards remaining
  pointCardProbability: number; // 0-1 probability of having point cards
  dominantSuit: Suit | null; // Estimated strongest suit
  overallStrength: number; // 0-1 overall hand strength estimate
  voidSuits: Suit[]; // Suits player likely has no cards in
}

export interface StrategicIntentAnalysis {
  primaryGoal:
    | "point_collection"
    | "trump_conservation"
    | "opponent_blocking"
    | "endgame_setup"; // Main strategic focus
  secondaryGoals: string[]; // Additional strategic objectives
  adaptationLevel: number; // 0-1 how much strategy has adapted this round
  teamCoordination: number; // 0-1 focus on team coordination
}

export interface AdaptiveStrategyRecommendation {
  recommendedApproach: "counter" | "exploit" | "adapt" | "maintain"; // Strategic recommendation
  targetOpponent: PlayerId | null; // Specific opponent to focus on
  tacticalAdjustments: TacticalAdjustment[]; // Specific tactical changes
  confidenceLevel: number; // 0-1 confidence in recommendation
  expectedOutcome: string; // Predicted result of following recommendation
}

export interface TacticalAdjustment {
  adjustmentType:
    | "trump_usage"
    | "point_timing"
    | "combination_choice"
    | "positional_play"; // Type of adjustment
  direction: "increase" | "decrease" | "modify"; // How to adjust current approach
  magnitude: number; // 0-1 how much to adjust
  context: string[]; // Situations where this adjustment applies
}

// Play pattern analysis types
export interface PlayPatterns {
  trumpUsage: number; // 0-1 frequency of trump usage
  pointFocus: number; // 0-1 focus on point collection
}

// Player context for AI analysis
export interface PlayerContext {
  id: string;
  team: string;
}

// Game context for AI analysis - moved to proper location above
