import {
  Combo,
  ComboAnalysis,
  GameContext,
  GameState,
  TrickPosition,
  TrumpInfo,
  SecondPlayerAnalysis,
  PlayerId,
  Rank,
} from "../../types";
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
        console.warn("2nd player memory analysis failed:", error);
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
