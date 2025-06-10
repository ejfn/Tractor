import {
  Card,
  Combo,
  ComboAnalysis,
  ComboStrength,
  GameContext,
  GameState,
  PositionStrategy,
  TrumpInfo,
} from "../../types";
import { evaluateTrickPlay } from "../../game/cardComparison";

/**
 * Trick Contention - Strategic trick winning when valuable
 *
 * Handles optimal combo selection when AI can and should contest for trick victory.
 * Uses trump conservation hierarchy and proper trick evaluation for strategic wins.
 */

/**
 * Main trick contention handler for valuable tricks
 */
export function selectOptimalWinningCombo(
  comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
  context: GameContext,
  positionStrategy: PositionStrategy,
  trumpInfo: TrumpInfo,
  gameState: GameState,
): Card[] {
  // Find combos that can actually beat the current trick using proper trick evaluation
  const currentTrick = gameState.currentTrick;
  const winningCombos = comboAnalyses.filter((ca) => {
    if (!currentTrick) return true; // No trick in progress

    // Use evaluateTrickPlay for proper trick-context evaluation
    try {
      const player = gameState.players[gameState.currentPlayerIndex];
      if (!player) return false;

      const evaluation = evaluateTrickPlay(
        ca.combo.cards,
        currentTrick,
        trumpInfo,
        player.hand,
      );

      return evaluation.canBeat && evaluation.isLegal;
    } catch {
      // If evaluation fails, assume this combo cannot win
      return false;
    }
  });

  if (winningCombos.length === 0) {
    return comboAnalyses[0].combo.cards; // Fallback
  }

  // Use the WEAKEST winning combo for trump conservation
  // Sort by conservation value (ascending = weakest first)
  return winningCombos.sort(
    (a, b) => a.analysis.conservationValue - b.analysis.conservationValue,
  )[0].combo.cards;
}

/**
 * Aggressive beat play for medium-value tricks
 */
export function selectAggressiveBeatPlay(
  comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
  context: GameContext,
): Card[] {
  // Filter for combinations that can win
  const winningCombos = comboAnalyses.filter((ca) => {
    // This is a simplified check - could be enhanced with more sophisticated logic
    return ca.analysis.strength >= ComboStrength.Medium;
  });

  if (winningCombos.length === 0) {
    // No medium+ strength combos - use weakest available
    const sorted = comboAnalyses.sort(
      (a, b) => a.analysis.conservationValue - b.analysis.conservationValue,
    );
    return sorted[0].combo.cards;
  }

  // Use weakest medium+ combo for conservation
  const sorted = winningCombos.sort(
    (a, b) => a.analysis.conservationValue - b.analysis.conservationValue,
  );
  return sorted[0].combo.cards;
}
