import {
    Card,
    Combo,
    ComboAnalysis,
    GameContext,
    GameState,
    PlayerId,
    TrickPosition,
} from "../../types";
import { gameLogger } from "../../utils/gameLogger";
import { calculateTrumpDeploymentTiming } from "../aiCardMemory";

/**
 * Strategic Disposal - Optimal card disposal when can't influence trick outcome
 *
 * Handles card disposal with trump conservation hierarchy and value optimization.
 * Uses position-specific logic and endgame awareness for optimal future positioning.
 */

/**
 * Main strategic disposal logic with position-specific optimizations
 */
export function selectStrategicDisposal(
  comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
  context: GameContext,
  gameState?: GameState,
): Card[] {
  // Strategic disposal decision tracking for AI learning
  gameLogger.debug("ai_following_decision", {
    decisionPoint: "strategic_disposal_start",
    comboCount: comboAnalyses.length,
    cardsRemaining: context.cardsRemaining,
  });
  // REMOVED ISSUE #104 BAND-AID FIX - Game logic now properly handles mixed combinations

  // Strategic disposal when not contesting trick
  if (context.cardsRemaining <= 3) {
    // Endgame - dispose of least valuable
    const sorted = comboAnalyses.sort(
      (a, b) => a.analysis.conservationValue - b.analysis.conservationValue,
    );
    return sorted[0].combo.cards;
  }

  // 🎯 4TH PLAYER ENHANCEMENT: Perfect information disposal with teammate awareness
  if (context.trickPosition === TrickPosition.Fourth && gameState) {
    // Check if teammate is winning - if so, prioritize trump conservation
    const trickWinner = context.trickWinnerAnalysis;
    if (trickWinner?.isTeammateWinning) {
      // Teammate winning - prioritize trump conservation over everything else
      const nonTrumpOptions = comboAnalyses.filter(
        (ca) => !ca.analysis.isTrump,
      );
      if (nonTrumpOptions.length > 0) {
        // Use general disposal logic but only consider non-trump cards
        return selectStrategicDisposal(nonTrumpOptions, context, gameState);
      }
    }

    // Fourth player uses same logic as general strategic disposal
    // No need for specialized function - general logic already handles perfect information
  }

  // When we can't win the trick, conserve valuable cards (trump + Aces + point cards)
  const trickWinner = context.trickWinnerAnalysis;
  if (!trickWinner?.canBeatCurrentWinner) {
    // First priority: prefer non-trump, non-Ace, non-point cards
    const nonValuable = comboAnalyses.filter(
      (ca) =>
        !ca.analysis.isTrump &&
        !ca.combo.cards.some((card) => (card.points || 0) > 0),
    );

    if (nonValuable.length > 0) {
      const sorted = nonValuable.sort((a, b) => a.combo.value - b.combo.value);
      return sorted[0].combo.cards;
    }

    // Second priority: prefer non-trump, non-point cards (even if Aces)
    const nonTrumpNonPoint = comboAnalyses.filter(
      (ca) =>
        !ca.analysis.isTrump &&
        !ca.combo.cards.some((card) => (card.points || 0) > 0),
    );
    if (nonTrumpNonPoint.length > 0) {
      const sorted = nonTrumpNonPoint.sort(
        (a, b) => a.combo.value - b.combo.value,
      );
      return sorted[0].combo.cards;
    }

    // Third priority: prefer non-trump (even if point cards)
    const nonTrump = comboAnalyses.filter((ca) => !ca.analysis.isTrump);
    if (nonTrump.length > 0) {
      const sorted = nonTrump.sort((a, b) => a.combo.value - b.combo.value);
      return sorted[0].combo.cards;
    }

    // Last resort: use trump cards (only if no non-trump available)
    // PHASE 3: Memory-enhanced trump disposal with deployment timing analysis
    const trumpCombos = comboAnalyses.filter((ca) => ca.analysis.isTrump);
    if (trumpCombos.length > 0) {
      return selectMemoryEnhancedTrumpDisposal(trumpCombos, context, gameState);
    }
  }

  // Final fallback - use trump conservation hierarchy for trump, combo value for non-trump
  const trumpCombos = comboAnalyses.filter((ca) => ca.analysis.isTrump);
  const nonTrumpCombos = comboAnalyses.filter((ca) => !ca.analysis.isTrump);

  // Prefer non-trump over trump when both available
  if (nonTrumpCombos.length > 0) {
    const sorted = nonTrumpCombos.sort((a, b) => a.combo.value - b.combo.value);
    return sorted[0].combo.cards;
  }

  // If only trump available, use memory-enhanced trump disposal
  if (trumpCombos.length > 0) {
    return selectMemoryEnhancedTrumpDisposal(trumpCombos, context, gameState);
  }

  // Ultimate fallback (should rarely happen)
  const sorted = comboAnalyses.sort((a, b) => a.combo.value - b.combo.value);
  const result = sorted[0].combo.cards;
  gameLogger.debug("ai_following_decision", {
    decisionPoint: "strategic_disposal_fallback",
    selectedCards: result.map((c) => c.toString()),
  });
  return result;
}

/**
 * Phase 3: Memory-Enhanced Trump Disposal
 *
 * Uses trump exhaustion analysis to determine optimal trump disposal timing.
 * Considers trump advantage, opponent exhaustion, and deployment recommendations.
 */
function selectMemoryEnhancedTrumpDisposal(
  trumpCombos: { combo: Combo; analysis: ComboAnalysis }[],
  context: GameContext,
  gameState?: GameState,
): Card[] {
  // Fallback to basic conservation hierarchy if no memory available
  if (!context.memoryContext?.cardMemory || !gameState) {
    const sorted = trumpCombos.sort(
      (a, b) => a.analysis.conservationValue - b.analysis.conservationValue,
    );
    return sorted[0].combo.cards;
  }

  try {
    // Get trump deployment timing analysis
    const currentPlayer = getCurrentPlayerId(gameState, context);
    if (!currentPlayer) {
      // Fallback if can't determine current player
      const sorted = trumpCombos.sort(
        (a, b) => a.analysis.conservationValue - b.analysis.conservationValue,
      );
      return sorted[0].combo.cards;
    }

    const deploymentAnalysis = calculateTrumpDeploymentTiming(
      context.memoryContext.cardMemory,
      currentPlayer,
      gameState.trumpInfo,
    );

    // Apply memory-enhanced disposal strategy based on deployment recommendation
    switch (deploymentAnalysis.recommendedDeployment) {
      case "never":
        // Absolutely avoid trump disposal - should not happen in disposal context
        // but use most conservative approach
        const mostValuable = trumpCombos.sort(
          (a, b) => b.analysis.conservationValue - a.analysis.conservationValue,
        );
        return mostValuable[mostValuable.length - 1].combo.cards; // Least valuable trump

      case "critical":
        // Heavy conservation - dispose only weakest trump
        const criticalSorted = trumpCombos.sort(
          (a, b) => a.analysis.conservationValue - b.analysis.conservationValue,
        );
        return criticalSorted[0].combo.cards;

      case "strategic":
        // Standard trump conservation hierarchy
        const strategicSorted = trumpCombos.sort(
          (a, b) => a.analysis.conservationValue - b.analysis.conservationValue,
        );
        return strategicSorted[0].combo.cards;

      case "aggressive":
        // Less conservative - willing to dispose medium-value trump
        // Still avoid highest value trump (jokers, trump rank cards)
        const aggressiveSorted = trumpCombos.filter((ca) => {
          // Filter out highest conservation value trump (jokers, trump rank)
          return ca.analysis.conservationValue < 70; // Below trump rank threshold
        });

        if (aggressiveSorted.length > 0) {
          const sorted = aggressiveSorted.sort(
            (a, b) =>
              a.analysis.conservationValue - b.analysis.conservationValue,
          );
          return sorted[0].combo.cards;
        } else {
          // All trump is high value - use standard hierarchy
          const sorted = trumpCombos.sort(
            (a, b) =>
              a.analysis.conservationValue - b.analysis.conservationValue,
          );
          return sorted[0].combo.cards;
        }

      default:
        // Fallback to standard conservation hierarchy
        const defaultSorted = trumpCombos.sort(
          (a, b) => a.analysis.conservationValue - b.analysis.conservationValue,
        );
        return defaultSorted[0].combo.cards;
    }
  } catch (error) {
    // Fallback to standard trump hierarchy if memory analysis fails
    gameLogger.warn(
      "memory_trump_disposal_error",
      {
        error: error instanceof Error ? error.message : String(error),
      },
      "Memory-enhanced trump disposal failed, using standard hierarchy",
    );
    const sorted = trumpCombos.sort(
      (a, b) => a.analysis.conservationValue - b.analysis.conservationValue,
    );
    return sorted[0].combo.cards;
  }
}

/**
 * Helper to determine current player ID from game state and context
 */
function getCurrentPlayerId(
  gameState: GameState,
  context: GameContext,
): PlayerId | null {
  // Try to determine from current player index
  if (
    gameState.currentPlayerIndex >= 0 &&
    gameState.currentPlayerIndex < gameState.players.length
  ) {
    return gameState.players[gameState.currentPlayerIndex].id;
  }

  // If context has player information, try to use it
  // This is a fallback approach - in practice the context should provide player info
  return null;
}

/**
 * Selects lowest value non-point combo for conservative play
 */
export function selectLowestValueNonPointCombo(
  comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
): Card[] {
  // First priority: non-point cards
  const nonPointCombos = comboAnalyses.filter(
    (ca) => !ca.combo.cards.some((card) => (card.points || 0) > 0),
  );

  if (nonPointCombos.length > 0) {
    // Sort by conservation value (which now includes pair breaking penalty)
    const sorted = nonPointCombos.sort(
      (a, b) => a.analysis.conservationValue - b.analysis.conservationValue,
    );
    return sorted[0].combo.cards;
  }

  // Fallback: if only point cards available, use lowest conservation value
  const sorted = comboAnalyses.sort(
    (a, b) => a.analysis.conservationValue - b.analysis.conservationValue,
  );
  return sorted[0].combo.cards;
}
