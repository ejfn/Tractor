import {
  GameContext,
  PlayerId,
  Suit,
  TrumpInfo,
  Combo,
  ComboAnalysis,
  ComboStrength,
  ComboType,
  PointPressure,
} from "../../../types";
import { isBiggestRemainingInSuit } from "../../aiCardMemory";
import { calculateCardStrategicValue, isTrump } from "../../../game/cardValue";

/**
 * Memory Integration - Utilities for memory-enhanced decision making
 *
 * Provides utilities for accessing and analyzing the memory context to make
 * more intelligent strategic decisions based on card tracking and game history.
 */

/**
 * Opponent void status analysis result
 */
export interface VoidStatusResult {
  allVoid: boolean;
  voidPlayers: PlayerId[];
  partialVoid: boolean;
  voidCount: number;
}

/**
 * Trump exhaustion analysis result
 */
export interface TrumpExhaustionResult {
  level: number;
  recommendation: "preserve" | "use" | "aggressive";
  reasoning: string[];
  opponentTrumpEstimate: number;
}

/**
 * Point timing analysis result
 */
export interface PointTimingResult {
  shouldContribute: boolean;
  priority: "high" | "medium" | "low";
  reasoning: string[];
  expectedValue: number;
}

/**
 * Check opponent void status for a specific suit
 *
 * Uses memory system to determine which players are void in the specified suit.
 * This is crucial for multi-combo analysis and strategic decision making.
 */
export function checkOpponentVoidStatus(
  suit: Suit,
  context: GameContext,
): VoidStatusResult {
  if (!context.memoryContext?.cardMemory) {
    return {
      allVoid: false,
      voidPlayers: [],
      partialVoid: false,
      voidCount: 0,
    };
  }

  const memory = context.memoryContext.cardMemory;
  const voidPlayers: PlayerId[] = [];

  // Check each player's void status (excluding current player)
  Object.entries(memory.playerMemories).forEach(([playerId, playerMemory]) => {
    if (
      playerId !== context.currentPlayer &&
      playerMemory.suitVoids.has(suit)
    ) {
      voidPlayers.push(playerId as PlayerId);
    }
  });

  const voidCount = voidPlayers.length;
  const partialVoid = voidCount > 0 && voidCount < 3;
  const allVoid = voidCount >= 3; // All other 3 players are void

  return {
    allVoid,
    voidPlayers,
    partialVoid,
    voidCount,
  };
}

/**
 * Analyze trump exhaustion levels across all players
 *
 * Uses memory tracking to assess trump card depletion and provide
 * recommendations for trump conservation strategy.
 */
export function analyzeTrumpExhaustion(
  context: GameContext,
): TrumpExhaustionResult {
  const reasoning: string[] = [];
  const exhaustion = context.memoryContext?.trumpExhaustion ?? 0.5;

  reasoning.push(`trump_exhaustion_level_${exhaustion.toFixed(2)}`);

  // Estimate opponent trump cards remaining
  let opponentTrumpEstimate = 0.5; // Default estimate

  if (context.memoryContext?.cardMemory) {
    const memory = context.memoryContext.cardMemory;
    const totalTrumpPlayed = memory.trumpCardsPlayed;
    const startingTrumpCards = 28; // Approximate trump cards in deck
    const remainingTrump = Math.max(0, startingTrumpCards - totalTrumpPlayed);

    // Estimate opponent trump strength
    opponentTrumpEstimate = remainingTrump / startingTrumpCards;
    reasoning.push(`total_trump_played_${totalTrumpPlayed}`);
    reasoning.push(`estimated_remaining_${remainingTrump}`);
  }

  // Determine recommendation based on exhaustion level
  let recommendation: "preserve" | "use" | "aggressive";

  if (exhaustion > 0.8) {
    recommendation = "aggressive";
    reasoning.push("high_exhaustion_aggressive_play");
  } else if (exhaustion > 0.5) {
    recommendation = "use";
    reasoning.push("medium_exhaustion_strategic_use");
  } else {
    recommendation = "preserve";
    reasoning.push("low_exhaustion_preserve_trump");
  }

  // Factor in game pressure
  if (context.pointPressure === PointPressure.HIGH && exhaustion > 0.6) {
    recommendation = "aggressive";
    reasoning.push("high_point_pressure_override");
  }

  return {
    level: exhaustion,
    recommendation,
    reasoning,
    opponentTrumpEstimate,
  };
}

/**
 * Analyze point timing for contribution decisions
 *
 * Determines whether and how aggressively to contribute point cards
 * based on trick value, game state, and memory context.
 */
export function analyzePointTiming(
  context: GameContext,
  trickPoints: number,
): PointTimingResult {
  const reasoning: string[] = [];
  const cardsRemaining = context.cardsRemaining;
  const pointPressure = context.pointPressure;

  reasoning.push(`trick_points_${trickPoints}`);
  reasoning.push(`cards_remaining_${cardsRemaining}`);
  reasoning.push(`point_pressure_${pointPressure}`);

  // Calculate expected value of contributing points
  let expectedValue = trickPoints;

  // Memory enhancement: factor in guaranteed winner probability
  if (context.memoryContext?.cardMemory) {
    // If we have memory, we can be more confident about point collection
    expectedValue *= 1.2; // 20% bonus for memory-enhanced confidence
    reasoning.push("memory_enhanced_confidence");
  }

  // High priority scenarios
  if (trickPoints >= 15) {
    reasoning.push("high_value_trick");
    return {
      shouldContribute: true,
      priority: "high",
      reasoning,
      expectedValue,
    };
  }

  if (trickPoints >= 10 && cardsRemaining <= 10) {
    reasoning.push("medium_value_endgame");
    return {
      shouldContribute: true,
      priority: "high",
      reasoning,
      expectedValue,
    };
  }

  // Medium priority scenarios
  if (trickPoints >= 10 && pointPressure !== PointPressure.LOW) {
    reasoning.push("medium_value_pressure");
    return {
      shouldContribute: true,
      priority: "medium",
      reasoning,
      expectedValue,
    };
  }

  if (trickPoints >= 5 && cardsRemaining <= 5) {
    reasoning.push("any_points_final_tricks");
    return {
      shouldContribute: true,
      priority: "medium",
      reasoning,
      expectedValue,
    };
  }

  // Low priority scenarios
  if (trickPoints >= 5 && pointPressure === PointPressure.HIGH) {
    reasoning.push("low_value_high_pressure");
    return {
      shouldContribute: true,
      priority: "low",
      reasoning,
      expectedValue,
    };
  }

  // Conservative default
  reasoning.push("conservative_no_contribution");
  return {
    shouldContribute: false,
    priority: "low",
    reasoning,
    expectedValue: 0,
  };
}

/**
 * Enhance combo analysis with memory-based insights
 *
 * Augments basic combo analysis with memory-enhanced information like
 * guaranteed winner status and strategic positioning.
 */
export function enhanceComboWithMemory(
  combo: Combo,
  context: GameContext,
  trumpInfo: TrumpInfo,
): ComboAnalysis & { isGuaranteedWinner?: boolean; memoryInsights?: string[] } {
  const memoryInsights: string[] = [];

  // Base analysis
  const baseAnalysis: ComboAnalysis = {
    strength: ComboStrength.Medium,
    isTrump: combo.cards.some((card) => isTrump(card, trumpInfo)),
    hasPoints: combo.cards.some((card) => card.points > 0),
    pointValue: combo.cards.reduce((sum, card) => sum + card.points, 0),
    disruptionPotential: 0.5,
    conservationValue: calculateCardStrategicValue(
      combo.cards[0],
      trumpInfo,
      "basic",
    ),
    isBreakingPair: false,
    relativeStrength: 0.5,
    canBeat: false,
  };

  // Memory enhancement: check if guaranteed winner
  let isGuaranteedWinner = false;

  if (context.memoryContext?.cardMemory && combo.cards[0]) {
    const card = combo.cards[0];
    const comboType = combo.type === ComboType.Pair ? "pair" : "single";

    try {
      isGuaranteedWinner = isBiggestRemainingInSuit(
        context.memoryContext.cardMemory,
        card.suit,
        card.rank,
        comboType,
      );

      if (isGuaranteedWinner) {
        memoryInsights.push("guaranteed_winner");
        baseAnalysis.strength = ComboStrength.Critical;
        baseAnalysis.relativeStrength = 1.0;
      }
    } catch {
      memoryInsights.push("memory_analysis_failed");
    }
  }

  // Enhanced strategic value assessment
  if (baseAnalysis.isTrump) {
    memoryInsights.push("trump_combo");
    const trumpAnalysis = analyzeTrumpExhaustion(context);

    if (trumpAnalysis.recommendation === "preserve") {
      baseAnalysis.conservationValue *= 1.5; // Higher conservation value
      memoryInsights.push("trump_preservation_recommended");
    } else if (trumpAnalysis.recommendation === "aggressive") {
      baseAnalysis.conservationValue *= 0.8; // Lower conservation value
      memoryInsights.push("trump_aggressive_use_recommended");
    }
  }

  // Point card timing assessment
  if (baseAnalysis.hasPoints) {
    const pointTiming = analyzePointTiming(context, baseAnalysis.pointValue);

    if (pointTiming.shouldContribute) {
      baseAnalysis.relativeStrength += 0.2; // Bonus for good timing
      memoryInsights.push(`point_contribution_${pointTiming.priority}`);
    } else {
      memoryInsights.push("point_contribution_not_recommended");
    }
  }

  return {
    ...baseAnalysis,
    isGuaranteedWinner,
    memoryInsights,
  };
}

/**
 * Check if next player is likely void in a specific suit
 *
 * This is particularly useful for trump decision making when considering
 * whether the next player can beat our trump play.
 */
export function isNextPlayerVoid(
  suit: Suit,
  context: GameContext,
  nextPlayerId?: PlayerId,
): boolean {
  if (!context.memoryContext?.cardMemory || !nextPlayerId) {
    return false;
  }

  const memory = context.memoryContext.cardMemory;
  const nextPlayerMemory = memory.playerMemories[nextPlayerId];

  return nextPlayerMemory?.suitVoids.has(suit) ?? false;
}

/**
 * Get memory-enhanced suit strength assessment
 *
 * Analyzes remaining cards in a suit based on memory tracking to assess
 * the strategic value of holding or playing cards from that suit.
 */
export function getSuitStrengthAssessment(
  suit: Suit,
  context: GameContext,
  trumpInfo: TrumpInfo,
): {
  strength: "weak" | "moderate" | "strong";
  remainingHighCards: number;
  voidAdvantage: boolean;
  reasoning: string[];
} {
  const reasoning: string[] = [];

  if (!context.memoryContext?.cardMemory) {
    reasoning.push("no_memory_available");
    return {
      strength: "moderate",
      remainingHighCards: 5,
      voidAdvantage: false,
      reasoning,
    };
  }

  const memory = context.memoryContext.cardMemory;
  const playedCards = memory.playedCards.filter(
    (card) => card.suit === suit && !isTrump(card, trumpInfo),
  );

  // Count high cards that have been played
  const playedHighCards = playedCards.filter((card) =>
    ["Ace", "King", "Queen", "Jack"].includes(card.rank),
  ).length;

  const totalHighCards = 8; // 2 copies each of A, K, Q, J
  const remainingHighCards = totalHighCards - playedHighCards;

  reasoning.push(`played_high_cards_${playedHighCards}`);
  reasoning.push(`remaining_high_cards_${remainingHighCards}`);

  // Check for void advantage
  const voidStatus = checkOpponentVoidStatus(suit, context);
  const voidAdvantage = voidStatus.partialVoid || voidStatus.allVoid;

  if (voidAdvantage) {
    reasoning.push(`void_advantage_${voidStatus.voidCount}_players`);
  }

  // Determine strength
  let strength: "weak" | "moderate" | "strong";

  if (remainingHighCards >= 6 || voidAdvantage) {
    strength = "strong";
    reasoning.push("strong_suit_assessment");
  } else if (remainingHighCards >= 3) {
    strength = "moderate";
    reasoning.push("moderate_suit_assessment");
  } else {
    strength = "weak";
    reasoning.push("weak_suit_assessment");
  }

  return {
    strength,
    remainingHighCards,
    voidAdvantage,
    reasoning,
  };
}
