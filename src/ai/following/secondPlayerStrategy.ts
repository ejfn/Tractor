import {
  Combo,
  ComboAnalysis,
  GameContext,
  GameState,
  TrickPosition,
  TrumpInfo,
  SecondPlayerAnalysis,
} from "../../types";

/**
 * Second Player Strategy - Position 2 specific optimizations
 *
 * Handles strategic opportunities for the 2nd player with early position
 * influence and setup opportunities for remaining players.
 */

/**
 * Analyzes strategic opportunities for the 2nd player
 * Leverages early position influence and setup opportunities
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

  // 2nd player can influence the remaining 2 players
  const shouldContribute =
    context.trickWinnerAnalysis?.isTeammateWinning || false;

  // Find point cards for contribution
  const pointCombos = comboAnalyses.filter((ca) =>
    ca.combo.cards.some((card) => card.points > 0),
  );

  return {
    leaderRelationship: "teammate", // Placeholder - should be determined from context
    leaderStrength: "moderate", // Placeholder - should analyze leader's cards
    responseStrategy: shouldContribute ? "support" : "setup",
    informationAdvantage: 0.6, // 2nd player has seen leader's play
    optimalCombo: pointCombos.length > 0 ? pointCombos[0].combo : null,
    setupOpportunity: true, // 2nd player can influence remaining players
    blockingPotential: 0.5, // Moderate blocking potential
    coordinationValue: 0.7, // High coordination value for 2nd position
    shouldContribute,
  };
}

/**
 * Second player contribution logic with influence positioning
 */
export function selectSecondPlayerContribution(
  comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
  analysis: SecondPlayerAnalysis,
  trumpInfo: TrumpInfo,
  context: GameContext,
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
