import {
  Card,
  Combo,
  ComboAnalysis,
  ComboType,
  GameContext,
  GameState,
  Rank,
  TrickPosition,
  TrumpInfo,
  PlayerId,
} from "../../types";
import { isTrump } from "../../game/gameHelpers";
import { isBiggestRemainingInSuit } from "../aiCardMemory";
import { selectLowestValueNonPointCombo } from "./strategicDisposal";
import { getPointCardPriority } from "../utils/aiHelpers";
import { analyzePointCardTiming } from "../analysis/pointCardTiming";
import { gameLogger } from "../../utils/gameLogger";

/**
 * Point Contribution - Strategic point card selection for team coordination
 *
 * Handles optimal point card contribution when teammate is winning.
 * Uses memory-enhanced analysis and position-specific priorities.
 */

/**
 * Enhanced point contribution with timing analysis
 * Uses point card timing optimization for teammate support
 */
export function selectEnhancedPointContribution(
  comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
  trumpInfo: TrumpInfo,
  context: GameContext,
  gameState: GameState,
  currentPlayerId: PlayerId,
): Card[] | null {
  // Only proceed if we have memory context for timing analysis
  if (!context.memoryContext?.cardMemory) {
    return null;
  }

  try {
    // Create valid combos from combo analyses
    const validCombos = comboAnalyses.map((ca) => ca.combo);

    // Perform point timing analysis
    const pointTimingAnalysis = analyzePointCardTiming(
      context.memoryContext.cardMemory,
      gameState,
      context,
      trumpInfo,
      currentPlayerId,
      validCombos,
    );

    // Check for optimal point contribution scenarios
    if (
      pointTimingAnalysis.teamPointCoordination.coordinationOpportunities
        .length > 0
    ) {
      const bestCoordination =
        pointTimingAnalysis.teamPointCoordination.coordinationOpportunities[0];

      // Look for setup teammate opportunities
      if (bestCoordination.opportunityType === "setup_teammate") {
        // Find the best point card to contribute
        const pointCombos = comboAnalyses.filter((ca) =>
          ca.combo.cards.some((card) => card.points && card.points > 0),
        );

        if (pointCombos.length > 0) {
          // Use timing analysis to select optimal point contribution
          const timingAwareSelection = pointCombos.find((ca) =>
            pointTimingAnalysis.guaranteedPointPlays.some(
              (guaranteed) =>
                guaranteed.cards.length === ca.combo.cards.length &&
                guaranteed.cards.every(
                  (card, index) =>
                    card.suit === ca.combo.cards[index].suit &&
                    card.rank === ca.combo.cards[index].rank,
                ),
            ),
          );

          if (timingAwareSelection) {
            return timingAwareSelection.combo.cards;
          }

          // Fallback to highest value point contribution
          const sortedPoints = pointCombos.sort(
            (a, b) => b.analysis.pointValue - a.analysis.pointValue,
          );
          return sortedPoints[0].combo.cards;
        }
      }
    }

    // Check for defensive point strategies
    if (pointTimingAnalysis.pointDefensePlays.length > 0) {
      const defensivePlay = pointTimingAnalysis.pointDefensePlays[0];
      const matchingCombo = comboAnalyses.find(
        (ca) =>
          ca.combo.cards.length === defensivePlay.cards.length &&
          ca.combo.cards.every(
            (card, index) =>
              card.suit === defensivePlay.cards[index].suit &&
              card.rank === defensivePlay.cards[index].rank,
          ),
      );

      if (matchingCombo) {
        return matchingCombo.combo.cards;
      }
    }
  } catch (error) {
    gameLogger.warn(
      "enhanced_point_contribution_analysis_failed",
      {
        error: error instanceof Error ? error.message : String(error),
        currentPlayerId,
        hasMemoryContext: !!context.memoryContext?.cardMemory,
      },
      "Enhanced point contribution analysis failed",
    );
  }

  return null;
}

/**
 * Main point contribution logic with memory enhancement
 */
export function selectPointContribution(
  comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
  trumpInfo: TrumpInfo,
  context?: GameContext,
  gameState?: GameState,
): Card[] {
  const pointCardCombos = comboAnalyses.filter((ca) =>
    ca.combo.cards.some((card) => card.points > 0),
  );

  if (pointCardCombos.length === 0) {
    // No point cards - play lowest available non-point cards
    return selectLowestValueNonPointCombo(comboAnalyses);
  }

  // 🎯 4TH PLAYER TRUMP CONSERVATION: Prioritize non-trump point cards
  if (context?.trickPosition === TrickPosition.Fourth) {
    const nonTrumpPointCombos = pointCardCombos.filter(
      (ca) => !ca.analysis.isTrump,
    );

    // If non-trump point cards are available, prefer them to preserve trump
    if (nonTrumpPointCombos.length > 0) {
      pointCardCombos.splice(0, pointCardCombos.length, ...nonTrumpPointCombos);
    }
  }

  // Memory-enhanced selection: Prioritize biggest remaining point cards
  if (context?.memoryContext?.cardMemory) {
    const guaranteedWinningPointCards: {
      combo: { combo: Combo; analysis: ComboAnalysis };
      priority: number;
    }[] = [];

    pointCardCombos.forEach((comboAnalysis) => {
      const firstCard = comboAnalysis.combo.cards[0];
      if (!firstCard.suit || isTrump(firstCard, trumpInfo)) {
        return; // Skip trump or invalid cards
      }

      const comboType =
        comboAnalysis.combo.type === ComboType.Pair ? "pair" : "single";
      const isBiggestRemaining =
        context.memoryContext?.cardMemory &&
        firstCard.rank &&
        isBiggestRemainingInSuit(
          context.memoryContext.cardMemory,
          firstCard.suit,
          firstCard.rank,
          comboType,
        );

      if (isBiggestRemaining) {
        let priority = 0;

        // 🎯 4TH PLAYER ENHANCEMENT: Enhanced priority for last player
        // Priority order: 10s > Kings > 5s (traditional Shengji strategy)
        if (context?.trickPosition === TrickPosition.Fourth) {
          // Last player gets bonus priority for point cards
          if (firstCard.rank === Rank.Ten) {
            priority += 7; // 10s get highest priority
          } else if (firstCard.rank === Rank.King) {
            priority += 6; // Kings get medium priority
          } else if (firstCard.rank === Rank.Five) {
            priority += 5; // 5s get lowest priority
          }
        } else {
          // Regular priority for other positions
          if (firstCard.rank === Rank.Ten) {
            priority += 4;
          } else if (firstCard.rank === Rank.King) {
            priority += 3;
          } else if (firstCard.rank === Rank.Five) {
            priority += 2;
          }
        }

        guaranteedWinningPointCards.push({
          combo: comboAnalysis,
          priority,
        });
      }
    });

    // Use biggest remaining point cards if available
    if (guaranteedWinningPointCards.length > 0) {
      guaranteedWinningPointCards.sort((a, b) => b.priority - a.priority);
      return guaranteedWinningPointCards[0].combo.combo.cards;
    }
  }

  // Fallback: Traditional point contribution (10 > King > 5) with 4th player enhancement
  const sorted = pointCardCombos.sort((a, b) => {
    const aCard = a.combo.cards[0];
    const bCard = b.combo.cards[0];

    const aPriority = getPointCardPriority(aCard);
    const bPriority = getPointCardPriority(bCard);

    if (aPriority !== bPriority) {
      return bPriority - aPriority; // Higher priority first
    }

    return b.analysis.pointValue - a.analysis.pointValue;
  });

  return sorted[0].combo.cards;
}

/**
 * Point contribution combo selection for tactical analysis
 */
export function selectPointContributionCombo(
  comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
  trumpInfo: TrumpInfo,
  context: GameContext,
): Combo | null {
  if (comboAnalyses.length === 0) return null;

  // Use existing point contribution logic but return the combo instead of cards
  const pointCardCombos = comboAnalyses.filter((ca) =>
    ca.combo.cards.some((card) => card.points > 0),
  );

  if (pointCardCombos.length > 0) {
    // Sort by traditional point card hierarchy: 10 > King > 5
    const sorted = pointCardCombos.sort((a, b) => {
      const aCard = a.combo.cards[0];
      const bCard = b.combo.cards[0];

      const aPriority = getPointCardPriority(aCard);
      const bPriority = getPointCardPriority(bCard);

      if (aPriority !== bPriority) {
        return bPriority - aPriority; // Higher priority first
      }

      return b.analysis.pointValue - a.analysis.pointValue;
    });

    return sorted[0].combo;
  }

  // Fallback to lowest value combo if no point cards available
  const sorted = comboAnalyses.sort((a, b) => a.combo.value - b.combo.value);
  return sorted[0].combo;
}
