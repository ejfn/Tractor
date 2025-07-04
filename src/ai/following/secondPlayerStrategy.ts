import { calculateCardStrategicValue, isTrump } from "../../game/cardValue";
import {
  Card,
  Combo,
  ComboAnalysis,
  GameContext,
  GameState,
  PlayerId,
  Rank,
  SecondPlayerAnalysis,
  Suit,
  TrickPosition,
  TrumpInfo,
} from "../../types";
import { gameLogger } from "../../utils/gameLogger";
import { analyze2ndPlayerMemoryContext } from "../aiCardMemory";

/**
 * Second Player Strategy - Position 2 specific optimizations
 *
 * Handles strategic opportunities for the 2nd player with early position
 * influence and setup opportunities for remaining players.
 */

/**
 * Phase 3: Memory-Enhanced 2nd Player Strategy Analysis
 *
 * Analyzes strategic opportunities for the 2nd player with memory-based
 * partial information analysis leveraging trump exhaustion and void detection.
 */
export function analyzeSecondPlayerStrategy(
  comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
  context: GameContext,
  trumpInfo: TrumpInfo,
  gameState: GameState,
): SecondPlayerAnalysis {
  if (context.trickPosition !== TrickPosition.Second) {
    throw new Error(
      "analyzeSecondPlayerStrategy should only be called for 2nd player (TrickPosition.Second)",
    );
  }

  // Enhanced analysis with memory context when available
  let memoryAnalysis = null;
  let currentPlayer: PlayerId | null = null;

  if (
    context.memoryContext?.cardMemory &&
    gameState.currentTrick?.plays?.[0]?.cards
  ) {
    // Determine current player from game state
    currentPlayer = gameState.players[gameState.currentPlayerIndex]?.id || null;

    if (currentPlayer) {
      try {
        memoryAnalysis = analyze2ndPlayerMemoryContext(
          context.memoryContext.cardMemory,
          gameState.currentTrick.plays[0].cards,
          trumpInfo,
          currentPlayer,
        );
      } catch (error) {
        gameLogger.warn(
          "second_player_memory_analysis_failed",
          {
            error: error instanceof Error ? error.message : String(error),
            currentPlayer,
            hasLeadingCards: !!gameState.currentTrick?.plays?.[0]?.cards,
          },
          "2nd player memory analysis failed",
        );
      }
    }
  }

  const pointCombos = comboAnalyses.filter((ca) =>
    ca.combo.cards.some((card) => card.points > 0),
  );

  // Enhanced response strategy based on memory analysis
  let responseStrategy: "support" | "pressure" | "block" | "setup" = "setup";
  let informationAdvantage = 0.6; // Base value
  let blockingPotential = 0.5; // Base value
  let coordinationValue = 0.7; // Base value

  if (memoryAnalysis) {
    responseStrategy = memoryAnalysis.optimalResponseStrategy;

    // Adjust metrics based on memory insights
    switch (memoryAnalysis.recommendedInfluenceLevel) {
      case "high":
        informationAdvantage = 0.8;
        blockingPotential = 0.8;
        coordinationValue = 0.9;
        break;
      case "moderate":
        informationAdvantage = 0.7;
        blockingPotential = 0.6;
        coordinationValue = 0.8;
        break;
      case "low":
        informationAdvantage = 0.5;
        blockingPotential = 0.3;
        coordinationValue = 0.6;
        break;
    }

    // Adjust blocking potential based on void detection
    const totalVoidProbability = Object.values(
      memoryAnalysis.opponentVoidProbabilities,
    ).reduce((sum, prob) => sum + prob, 0);
    if (totalVoidProbability > 0) {
      blockingPotential += totalVoidProbability * 0.3; // Increase blocking potential
      blockingPotential = Math.min(1.0, blockingPotential);
    }
  }

  // Determine leader relationship and strength
  const leadingCards = gameState.currentTrick?.plays?.[0]?.cards || [];
  const leaderRelationship = context.trickWinnerAnalysis?.isTeammateWinning
    ? "teammate"
    : "opponent";

  // Analyze leader strength based on cards played
  let leaderStrength: "weak" | "moderate" | "strong" = "moderate";
  if (leadingCards.length > 0) {
    const hasHighCards = leadingCards.some(
      (card) => card.rank === Rank.Ace || card.rank === Rank.King,
    );
    const hasPoints = leadingCards.some((card) => card.points > 0);
    const isTrumpLead = leadingCards.some(
      (card) =>
        card.suit === trumpInfo.trumpSuit || card.rank === trumpInfo.trumpRank,
    );

    if (isTrumpLead || hasHighCards || hasPoints) {
      // Trump leads, high cards (Ace/King), or point cards are all considered strong
      leaderStrength = "strong";
    } else {
      leaderStrength = "weak";
    }
  }

  // OVERRIDE: If teammate leads with strong card, always support regardless of memory analysis
  if (leaderRelationship === "teammate" && leaderStrength === "strong") {
    responseStrategy = "support";
  }

  // Select optimal combo based on enhanced analysis
  let optimalCombo = null;
  if (responseStrategy === "support" && pointCombos.length > 0) {
    // Support with best point contribution
    optimalCombo = pointCombos.reduce((best, current) => {
      const bestPoints = best.combo.cards.reduce(
        (total, card) => total + (card.points || 0),
        0,
      );
      const currentPoints = current.combo.cards.reduce(
        (total, card) => total + (card.points || 0),
        0,
      );
      return currentPoints > bestPoints ? current : best;
    }).combo;
  } else if (responseStrategy === "pressure" || responseStrategy === "block") {
    // Use strongest available combo for pressure/blocking
    const strongCombos = comboAnalyses.filter(
      (ca) =>
        ca.analysis.isTrump ||
        ca.combo.cards.some(
          (card) => card.rank === Rank.Ace || card.rank === Rank.King,
        ),
    );
    if (strongCombos.length > 0) {
      optimalCombo = strongCombos[0].combo;
    }
  }

  return {
    leaderRelationship,
    leaderStrength,
    responseStrategy,
    informationAdvantage,
    optimalCombo,
    setupOpportunity: responseStrategy === "setup",
    blockingPotential,
    coordinationValue,
    shouldContribute: responseStrategy === "support",
  };
}

/**
 * Second player contribution logic with influence positioning
 */
export function selectSecondPlayerContribution(
  comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
  analysis: SecondPlayerAnalysis,
  _trumpInfo: TrumpInfo,
  _context: GameContext,
): import("../../types").Card[] {
  // If we have an optimal combo from analysis, use it
  if (analysis.optimalCombo) {
    return analysis.optimalCombo.cards;
  }

  // Fall back to point contribution if supporting teammate
  if (analysis.shouldContribute) {
    const pointCombos = comboAnalyses.filter((ca) =>
      ca.combo.cards.some((card) => card.points > 0),
    );

    if (pointCombos.length > 0) {
      // Select highest point combo
      const bestPointCombo = pointCombos.reduce((best, current) => {
        const bestPoints = best.combo.cards.reduce(
          (total, card) => total + (card.points || 0),
          0,
        );
        const currentPoints = current.combo.cards.reduce(
          (total, card) => total + (card.points || 0),
          0,
        );
        return currentPoints > bestPoints ? current : best;
      });
      return bestPointCombo.combo.cards;
    }
  }

  // Default to first available combo
  return comboAnalyses.length > 0 ? comboAnalyses[0].combo.cards : [];
}

/**
 * Enhanced 2nd Player Same-Suit Following Strategy
 *
 * For non-trump suit following, 2nd player should generally play higher
 * than the leader when possible to either win the trick or set up teammates.
 */
export function selectOptimalSameSuitResponse(
  comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
  _context: GameContext,
  trumpInfo: TrumpInfo,
  gameState: GameState,
): Card[] | null {
  const leadingCards = gameState.currentTrick?.plays[0]?.cards;
  if (!leadingCards || leadingCards.length === 0) {
    return null;
  }

  const leadingSuit = leadingCards[0].suit;
  const leadingCard = leadingCards[0];

  // Only handle non-trump suit following
  if (isTrump(leadingCard, trumpInfo)) {
    return null;
  }

  // Filter combos that are in the same suit and non-trump
  const sameSuitCombos = comboAnalyses.filter((ca) => {
    return (
      ca.combo.cards.length > 0 &&
      ca.combo.cards[0].suit === leadingSuit &&
      !ca.analysis.isTrump
    );
  });

  if (sameSuitCombos.length === 0) {
    return null; // Player is void in leading suit
  }

  // 2nd player strategy: Always play HIGHEST card available (limited visibility)
  // No need to differentiate between teammate/opponent - just maximize win chance

  // Sort all same-suit combos by strategic value (highest first)
  const sortedCombos = sameSuitCombos.sort((a, b) => {
    const aValue = calculateCardStrategicValue(
      a.combo.cards[0],
      trumpInfo,
      "basic",
    );
    const bValue = calculateCardStrategicValue(
      b.combo.cards[0],
      trumpInfo,
      "basic",
    );
    return bValue - aValue; // Highest first
  });

  // Strategic decision recorded for AI learning
  gameLogger.debug("ai_following_decision", {
    decisionPoint: "second_player_same_suit",
    player: "current_player",
    strategy: "play_highest_available",
    leadingCard: `${leadingCard.rank}${leadingCard.suit}`,
    selectedCard: `${sortedCombos[0].combo.cards[0].rank}${sortedCombos[0].combo.cards[0].suit}`,
  });

  return sortedCombos[0].combo.cards;
}

/**
 * Enhanced 2nd Player Trump Response Strategy
 *
 * When 2nd player is void in leading suit, strategically select trump cards
 * based on remaining point potential and opponent void analysis.
 */
export function selectOptimalTrumpResponse(
  comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
  context: GameContext,
  trumpInfo: TrumpInfo,
  gameState: GameState,
): Card[] | null {
  const leadingCards = gameState.currentTrick?.plays[0]?.cards;
  if (!leadingCards || leadingCards.length === 0) {
    return null;
  }

  const leadingSuit = leadingCards[0].suit;

  // Only handle non-trump suit leads (when we're void and can trump)
  if (isTrump(leadingCards[0], trumpInfo)) {
    return null;
  }

  // Filter trump combos only
  const trumpCombos = comboAnalyses.filter((ca) => ca.analysis.isTrump);
  if (trumpCombos.length === 0) {
    return null; // No trump cards available
  }

  // Assess remaining point potential in leading suit
  const remainingPointPotential = assessRemainingPointPotential(
    leadingSuit,
    context,
  );

  // 2nd player trump strategy: Simple point potential based selection
  // High point potential = use higher trump, Low point potential = conserve trump

  if (remainingPointPotential >= 20) {
    // High point potential - worth using higher trump (medium/high value trump)
    const higherTrumpCombos = trumpCombos.filter(
      (ca) => ca.analysis.conservationValue >= 110, // Higher value trump only
    );

    if (higherTrumpCombos.length > 0) {
      // Strategic decision recorded for AI learning
      gameLogger.debug("ai_following_decision", {
        decisionPoint: "second_player_trump",
        strategy: "higher_trump_for_high_points",
        pointPotential: remainingPointPotential,
      });

      // Use lowest among higher trump (efficient use)
      const sortedHigherTrump = higherTrumpCombos.sort(
        (a, b) => a.analysis.conservationValue - b.analysis.conservationValue,
      );
      return sortedHigherTrump[0].combo.cards;
    }
  }

  // Low point potential - conserve trump (use lowest available)
  const sortedTrumpCombos = trumpCombos.sort(
    (a, b) => a.analysis.conservationValue - b.analysis.conservationValue,
  );

  // Strategic decision recorded for AI learning
  gameLogger.debug("ai_following_decision", {
    decisionPoint: "second_player_trump",
    strategy: "low_trump_conservation",
    pointPotential: remainingPointPotential,
  });

  return sortedTrumpCombos[0].combo.cards;
}

/**
 * Assess remaining point potential in the leading suit
 * Uses memory system to estimate points still in play
 */
function assessRemainingPointPotential(
  leadingSuit: Suit,
  context: GameContext,
): number {
  // Base assessment: typical point cards in suit
  let basePoints = 0;

  // 5s (5 points each), 10s (10 points each), Kings (10 points each)
  // Estimate based on standard deck (2 of each per suit)
  basePoints += 10; // 2 fives = 10 points
  basePoints += 20; // 2 tens = 20 points
  basePoints += 20; // 2 kings = 20 points
  // Total: 50 points per suit in a full deck

  // If memory system is available, use it for more accurate assessment
  if (context.memoryContext?.cardMemory) {
    const playedCards = context.memoryContext.cardMemory.playedCards;

    // Subtract points already played in this suit
    const playedPointsInSuit = playedCards
      .filter((card) => card.suit === leadingSuit)
      .reduce((total, card) => total + (card.points || 0), 0);

    return Math.max(0, basePoints - playedPointsInSuit);
  }

  // Conservative estimate when no memory available
  return Math.floor(basePoints * 0.7); // Assume some points already played
}
