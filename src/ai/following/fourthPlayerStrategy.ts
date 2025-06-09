import {
  Combo,
  ComboAnalysis,
  GameContext,
  GameState,
  TrickPosition,
  TrumpInfo,
  FourthPlayerAnalysis,
} from "../../types";

/**
 * Fourth Player Strategy - Position 4 specific optimizations
 *
 * Handles perfect information advantages available to the 4th (last) player
 * with complete visibility of all played cards for optimal decision making.
 */

/**
 * Analyzes perfect information advantages available to the 4th (last) player
 * Leverages complete visibility of all played cards for optimal decision making
 */
export function analyzeFourthPlayerAdvantage(
  comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
  context: GameContext,
  trumpInfo: TrumpInfo,
  gameState: GameState,
): FourthPlayerAnalysis {
  if (context.trickPosition !== TrickPosition.Fourth) {
    throw new Error(
      "analyzeFourthPlayerAdvantage should only be called for 4th player (TrickPosition.Fourth)",
    );
  }

  // 4th player has perfect information - all cards are visible
  const pointCardCombos = comboAnalyses.filter((ca) =>
    ca.combo.cards.some((card) => card.points > 0),
  );

  // For 4th player, we can guarantee point contribution since we see all cards
  const guaranteedPointCards = pointCardCombos.filter((ca) => {
    // All point cards are guaranteed contributions when teammate is winning
    return ca.combo.cards.some((card) => card.points > 0);
  });

  // Enhanced perfect information analysis (for future use)
  // const perfectInfoAnalysis = {
  //   totalVisibleCards: 3, // 4th player sees all 3 previous plays
  //   canOptimizeContribution: true,
  //   hasCompleteInformation: true,
  // };

  return {
    certainWinCards: [],
    pointMaximizationPotential: guaranteedPointCards.reduce(
      (total, ca) =>
        total +
        ca.combo.cards.reduce((sum, card) => sum + (card.points || 0), 0),
      0,
    ),
    optimalContributionStrategy: "maximize",
    teammateSupportOpportunity: guaranteedPointCards.length > 0,
    guaranteedPointCards: guaranteedPointCards.map((ca) => ca.combo),
    perfectInformationAdvantage: true,
  };
}
