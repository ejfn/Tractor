import {
  Combo,
  ComboType,
  FirstPlayerAnalysis,
  GameContext,
  GameState,
  PointFocusedContext,
  PointPressure,
  TrumpInfo,
} from "../../types";
import { isTrump } from "../../game/gameHelpers";
import { getRankValue } from "../analysis/comboAnalysis";

/**
 * First Player Analysis - Strategic analysis for leading players
 *
 * Provides comprehensive analysis and strategy selection for players
 * in the leading (first) position of tricks.
 */

/**
 * Analyze first player strategy based on game context and available combos
 */
export function analyzeFirstPlayerStrategy(
  validCombos: Combo[],
  trumpInfo: TrumpInfo,
  context: GameContext,
  pointContext: PointFocusedContext,
  gameState: GameState,
): FirstPlayerAnalysis {
  // Determine game phase strategy based on context
  let gamePhaseStrategy: "probe" | "aggressive" | "control" | "endgame";

  if (context.cardsRemaining > 20) {
    gamePhaseStrategy = "probe"; // Early game - gather information
  } else if (context.pointPressure === PointPressure.HIGH) {
    gamePhaseStrategy = "aggressive"; // High pressure - force points
  } else if (context.cardsRemaining <= 8) {
    gamePhaseStrategy = "endgame"; // Late game - precise control
  } else {
    gamePhaseStrategy = "control"; // Mid game - strategic control
  }

  // Calculate information gathering focus
  const informationGatheringFocus =
    gamePhaseStrategy === "probe"
      ? 0.9
      : gamePhaseStrategy === "aggressive"
        ? 0.3
        : gamePhaseStrategy === "control"
          ? 0.6
          : 0.8;

  // Calculate hand reveal minimization
  const handRevealMinimization =
    gamePhaseStrategy === "probe"
      ? 0.8
      : gamePhaseStrategy === "aggressive"
        ? 0.2
        : gamePhaseStrategy === "control"
          ? 0.6
          : 0.4;

  // Find optimal leading combo based on strategy
  const optimalLeadingCombo = selectOptimalLeadingComboForPhase(
    validCombos,
    trumpInfo,
    gamePhaseStrategy,
    context,
  );

  // Determine strategic depth
  const strategicDepth: "shallow" | "medium" | "deep" = context.memoryContext
    ? "deep"
    : context.pointPressure === PointPressure.HIGH
      ? "medium"
      : "shallow";

  return {
    gamePhaseStrategy,
    informationGatheringFocus,
    handRevealMinimization,
    optimalLeadingCombo,
    strategicDepth,
    trumpConservationPriority: gamePhaseStrategy === "probe" ? 0.9 : 0.6,
    opponentProbeValue: informationGatheringFocus,
    teamCoordinationSetup: gamePhaseStrategy === "control",
  };
}

/**
 * Select optimal leading combo for specific game phase
 */
export function selectOptimalLeadingComboForPhase(
  validCombos: Combo[],
  trumpInfo: TrumpInfo,
  gamePhaseStrategy: "probe" | "aggressive" | "control" | "endgame",
  context: GameContext,
): Combo | null {
  if (validCombos.length === 0) return null;

  // Filter combos based on game phase strategy
  let candidates: Combo[];

  switch (gamePhaseStrategy) {
    case "probe":
      // Prefer safe, non-revealing leads
      candidates = validCombos.filter(
        (combo) =>
          !combo.cards.some((card) => isTrump(card, trumpInfo)) &&
          combo.cards.every((card) => (card.points || 0) === 0),
      );
      break;

    case "aggressive":
      // Prefer strong, point-collecting leads
      candidates = validCombos.filter(
        (combo) =>
          combo.cards.some((card) => (card.points || 0) > 0) ||
          combo.cards.some((card) => isTrump(card, trumpInfo)),
      );
      break;

    case "control":
      // Prefer strategic, combination-rich leads
      candidates = validCombos.filter(
        (combo) =>
          combo.type === ComboType.Tractor || combo.type === ComboType.Pair,
      );
      break;

    case "endgame":
      // Prefer highest value available
      candidates = validCombos;
      break;

    default:
      candidates = validCombos;
  }

  // Fall back to all combos if no phase-specific candidates
  if (candidates.length === 0) {
    candidates = validCombos;
  }

  // Select best combo from candidates based on value and strategy
  return candidates.reduce(
    (best, combo) => {
      const comboValue = calculateLeadingComboValue(
        combo,
        trumpInfo,
        gamePhaseStrategy,
      );
      const bestValue = best
        ? calculateLeadingComboValue(best, trumpInfo, gamePhaseStrategy)
        : 0;

      return comboValue > bestValue ? combo : best;
    },
    null as Combo | null,
  );
}

/**
 * Calculate leading combo value for first player analysis
 */
function calculateLeadingComboValue(
  combo: Combo,
  trumpInfo: TrumpInfo,
  gamePhaseStrategy: "probe" | "aggressive" | "control" | "endgame",
): number {
  let value = 0;

  // Base value from combo type
  switch (combo.type) {
    case ComboType.Tractor:
      value += 30;
      break;
    case ComboType.Pair:
      value += 20;
      break;
    case ComboType.Single:
      value += 10;
      break;
  }

  // Add card strength value
  const cardStrength = combo.cards.reduce((sum, card) => {
    if (isTrump(card, trumpInfo)) {
      return sum + 15; // Trump cards are valuable
    }
    const rankValue = card.rank ? getRankValue(card.rank) : 0;
    return sum + Math.min(rankValue, 10); // Non-trump card rank value
  }, 0);

  value += cardStrength;

  // Phase-specific adjustments
  switch (gamePhaseStrategy) {
    case "probe":
      // Penalty for revealing strong cards early
      if (combo.cards.some((card) => isTrump(card, trumpInfo))) {
        value -= 20;
      }
      break;

    case "aggressive":
      // Bonus for point cards and strong combinations
      const points = combo.cards.reduce(
        (sum, card) => sum + (card.points || 0),
        0,
      );
      value += points * 2;
      break;

    case "control":
      // Bonus for tactical combinations
      if (combo.type === ComboType.Tractor) {
        value += 15;
      }
      if (combo.type === ComboType.Pair) {
        value += 10;
      }
      break;

    case "endgame":
      // Maximize total value
      const totalValue = combo.cards.reduce(
        (sum, card) =>
          sum +
          (card.points || 0) +
          (isTrump(card, trumpInfo)
            ? 10
            : card.rank
              ? getRankValue(card.rank)
              : 0),
        0,
      );
      value += totalValue;
      break;
  }

  return value;
}
