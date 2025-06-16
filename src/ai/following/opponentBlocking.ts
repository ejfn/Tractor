import {
  Card,
  Combo,
  ComboAnalysis,
  ComboType,
  GameContext,
  GameState,
  PositionStrategy,
  Rank,
  TrumpInfo,
  TrickWinnerAnalysis,
} from "../../types";
import { isTrump } from "../../game/gameHelpers";
import { getComboType } from "../../game/comboDetection";
import {
  selectOptimalWinningCombo,
  selectAggressiveBeatPlay,
} from "./trickContention";
import { isBiggestRemainingInSuit } from "../aiCardMemory";

/**
 * Opponent Blocking - Strategic countering when opponent is winning
 *
 * Handles blocking opponent point collection with strategic card management.
 * Uses trump conservation hierarchy and point avoidance when can't beat opponent.
 */

/**
 * Main opponent winning handler with strategic blocking logic
 */
export function handleOpponentWinning(
  comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
  context: GameContext,
  trickWinner: TrickWinnerAnalysis,
  trumpInfo: TrumpInfo,
  gameState: GameState,
): Card[] | null {
  // MEMORY ENHANCEMENT: Check for guaranteed winners first, but only for valuable tricks AND when we can beat the opponent
  if (
    context.memoryContext?.cardMemory &&
    trickWinner.trickPoints >= 10 &&
    trickWinner.canBeatCurrentWinner
  ) {
    const guaranteedWinner = selectMemoryGuaranteedWinner(
      comboAnalyses,
      context,
      trumpInfo,
    );
    if (guaranteedWinner) {
      return guaranteedWinner;
    }
  }

  // Can't beat opponent - use strategic disposal
  if (!trickWinner.canBeatCurrentWinner) {
    return selectStrategicPointAvoidance(comboAnalyses, trumpInfo);
  }

  // Check for trump combos that match leading combo type for strategic dominance
  const leadingCards = gameState?.currentTrick?.plays[0]?.cards;
  if (leadingCards) {
    const leadingIsTrump = leadingCards.some((card) =>
      isTrump(card, trumpInfo),
    );

    if (!leadingIsTrump) {
      // Non-trump led - check for proper trump combos that match type
      const leadingComboType = getComboType(leadingCards, trumpInfo);
      const matchingTrumpCombos = comboAnalyses.filter(
        (ca) =>
          ca.combo.cards.every((card) => isTrump(card, trumpInfo)) &&
          ca.combo.type === leadingComboType &&
          ca.combo.type !== ComboType.Single,
      );

      // Prioritize trump tractors/pairs over mixed combos for strategic dominance
      if (matchingTrumpCombos.length > 0) {
        return selectOptimalWinningCombo(
          matchingTrumpCombos,
          context,
          {} as PositionStrategy,
          trumpInfo,
          gameState,
        );
      }
    }
  }

  // High-value tricks: contest with any available combo
  if (trickWinner.trickPoints >= 10) {
    return selectOptimalWinningCombo(
      comboAnalyses,
      context,
      {} as PositionStrategy,
      trumpInfo,
      gameState,
    );
  }

  // Medium-value tricks: contest if strategically sound
  if (trickWinner.trickPoints >= 5 && trickWinner.shouldTryToBeat) {
    return selectAggressiveBeatPlay(comboAnalyses, context);
  }

  // Low-value tricks: use strategic disposal
  return selectStrategicPointAvoidance(comboAnalyses, trumpInfo);
}

/**
 * Strategic point avoidance when opponent is winning
 * Uses hierarchical disposal to minimize damage
 */
export function selectStrategicPointAvoidance(
  comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
  _trumpInfo: TrumpInfo,
): Card[] {
  // Priority 1: Non-trump, non-point, non-Ace cards (safest disposal)
  const safeCards = comboAnalyses.filter(
    (ca) =>
      !ca.analysis.isTrump &&
      !ca.combo.cards.some((card) => (card.points || 0) > 0) &&
      !ca.combo.cards.some((card) => card.rank === Rank.Ace),
  );

  if (safeCards.length > 0) {
    const sorted = safeCards.sort((a, b) => a.combo.value - b.combo.value);
    return sorted[0].combo.cards;
  }

  // Priority 2: Non-trump, non-point cards (lose Ace but avoid giving points)
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

  // Priority 3: Non-trump (even if point cards - better than trump)
  const nonTrump = comboAnalyses.filter((ca) => !ca.analysis.isTrump);
  if (nonTrump.length > 0) {
    const sorted = nonTrump.sort((a, b) => a.combo.value - b.combo.value);
    return sorted[0].combo.cards;
  }

  // Last resort: trump cards (only if no non-trump available)
  const sorted = comboAnalyses.sort(
    (a, b) => a.analysis.conservationValue - b.analysis.conservationValue,
  );
  return sorted[0].combo.cards;
}

/**
 * Memory-enhanced: Select guaranteed winning combos for opponent blocking
 * Uses card memory to identify combinations that are certain to win
 */
function selectMemoryGuaranteedWinner(
  comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
  context: GameContext,
  trumpInfo: TrumpInfo,
): Card[] | null {
  if (!context.memoryContext?.cardMemory) return null;

  // Find combos with guaranteed winning cards
  const guaranteedWinners: {
    combo: { combo: Combo; analysis: ComboAnalysis };
    priority: number;
  }[] = [];

  comboAnalyses.forEach((comboAnalysis) => {
    const firstCard = comboAnalysis.combo.cards[0];
    if (!firstCard.rank || !firstCard.suit || isTrump(firstCard, trumpInfo)) {
      return; // Skip trump or invalid cards for blocking strategy
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

      // For opponent blocking: prioritize stopping their points
      // High cards get priority for blocking
      if (firstCard.rank === Rank.Ace) {
        priority += 50; // Aces are excellent blockers
      } else if (firstCard.rank === Rank.King) {
        priority += 40; // Kings are good blockers
      } else if (firstCard.rank === Rank.Queen) {
        priority += 30; // Queens are decent blockers
      }

      // Bonus for non-point cards (avoid giving points while blocking)
      if (!firstCard.points || firstCard.points === 0) {
        priority += 20;
      }

      guaranteedWinners.push({
        combo: comboAnalysis,
        priority,
      });
    }
  });

  if (guaranteedWinners.length > 0) {
    // Sort by priority: highest first
    guaranteedWinners.sort((a, b) => b.priority - a.priority);
    return guaranteedWinners[0].combo.combo.cards;
  }

  return null;
}
