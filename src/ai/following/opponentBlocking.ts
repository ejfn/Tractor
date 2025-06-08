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
} from "../../types";
import { isTrump, getComboType } from "../../game/gameLogic";
import {
  selectOptimalWinningCombo,
  selectAggressiveBeatPlay,
} from "./trickContention";

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
  trickWinner: any,
  trumpInfo: TrumpInfo,
  gameState: GameState,
): Card[] | null {
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
  trumpInfo: TrumpInfo,
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
