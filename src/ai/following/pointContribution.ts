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
} from "../../types";
import { isTrump } from "../../game/gameLogic";
import { isBiggestRemainingInSuit } from "../aiCardMemory";
import { selectLowestValueNonPointCombo } from "./strategicDisposal";

/**
 * Point Contribution - Strategic point card selection for team coordination
 *
 * Handles optimal point card contribution when teammate is winning.
 * Uses memory-enhanced analysis and position-specific priorities.
 */

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
        context.memoryContext!.cardMemory &&
        isBiggestRemainingInSuit(
          context.memoryContext!.cardMemory,
          firstCard.suit,
          firstCard.rank!,
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

    const getPriority = (card: any) => {
      if (card.rank === Rank.Ten) return 3;
      if (card.rank === Rank.King) return 2;
      if (card.rank === Rank.Five) return 1;
      return 0;
    };

    const aPriority = getPriority(aCard);
    const bPriority = getPriority(bCard);

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

      const getPriority = (card: any) => {
        if (card.rank === Rank.Ten) return 3;
        if (card.rank === Rank.King) return 2;
        if (card.rank === Rank.Five) return 1;
        return 0;
      };

      const aPriority = getPriority(aCard);
      const bPriority = getPriority(bCard);

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
