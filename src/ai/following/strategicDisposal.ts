import {
  Card,
  Combo,
  ComboAnalysis,
  GameContext,
  GameState,
  PositionStrategy,
  Rank,
  TrickPosition,
  TrumpInfo,
} from "../../types";

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
  positionStrategy: PositionStrategy,
  gameState?: GameState,
): Card[] {
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
        // Use specialized disposal logic but only consider non-trump cards
        return selectFourthPlayerPointAvoidance(
          nonTrumpOptions,
          context,
          gameState.trumpInfo,
        );
      }
    }

    // Use specialized 4th player logic with perfect information
    return selectFourthPlayerPointAvoidance(
      comboAnalyses,
      context,
      gameState.trumpInfo,
    );
  }

  // When we can't win the trick, conserve valuable cards (trump + Aces + point cards)
  const trickWinner = context.trickWinnerAnalysis;
  if (!trickWinner?.canBeatCurrentWinner) {
    // First priority: prefer non-trump, non-Ace, non-point cards
    const nonValuable = comboAnalyses.filter(
      (ca) =>
        !ca.analysis.isTrump &&
        !ca.combo.cards.some((card) => card.rank === Rank.Ace) &&
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
    // When forced to play trump, use trump conservation hierarchy (weakest trump first)
    const trumpCombos = comboAnalyses.filter((ca) => ca.analysis.isTrump);
    if (trumpCombos.length > 0) {
      const sorted = trumpCombos.sort(
        (a, b) => a.analysis.conservationValue - b.analysis.conservationValue,
      );
      return sorted[0].combo.cards;
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

  // If only trump available, use conservation hierarchy (weakest trump first)
  if (trumpCombos.length > 0) {
    const sorted = trumpCombos.sort(
      (a, b) => a.analysis.conservationValue - b.analysis.conservationValue,
    );
    return sorted[0].combo.cards;
  }

  // Ultimate fallback (should rarely happen)
  const sorted = comboAnalyses.sort((a, b) => a.combo.value - b.combo.value);
  return sorted[0].combo.cards;
}

/**
 * Fourth player point avoidance with perfect information
 */
export function selectFourthPlayerPointAvoidance(
  comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
  context: GameContext,
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

  // Priority 3: Non-trump cards (avoid giving away trump)
  const nonTrump = comboAnalyses.filter((ca) => !ca.analysis.isTrump);
  if (nonTrump.length > 0) {
    // Among non-trump, prefer lowest point cards
    const sorted = nonTrump.sort((a, b) => {
      const aPoints = a.combo.cards.reduce(
        (total, card) => total + (card.points || 0),
        0,
      );
      const bPoints = b.combo.cards.reduce(
        (total, card) => total + (card.points || 0),
        0,
      );
      if (aPoints !== bPoints) return aPoints - bPoints; // Prefer lower points
      return a.combo.value - b.combo.value; // Then by card value
    });
    return sorted[0].combo.cards;
  }

  // Last resort: Use weakest trump (only when no non-trump available)
  const sorted = comboAnalyses.sort(
    (a, b) => a.analysis.conservationValue - b.analysis.conservationValue,
  );
  return sorted[0].combo.cards;
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
