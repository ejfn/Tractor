import {
  Combo,
  ComboAnalysis,
  ComboStrength,
  ComboType,
  Rank,
  TrumpInfo,
} from "../../types";
import { isTrump } from "../../game/gameHelpers";
import {
  getTractorTypeDescription,
  isValidTractor,
} from "../../game/tractorLogic";

/**
 * Combo Analysis - Basic combination analysis and scoring
 *
 * Provides comprehensive analysis of card combinations including strength
 * assessment, trump evaluation, and strategic value calculations.
 */

/**
 * Calculate strategic score for a combo analysis
 */
export function calculateComboScore(analysis: ComboAnalysis): number {
  let score = 0;

  // Base score from strength
  switch (analysis.strength) {
    case ComboStrength.Critical:
      score += 4;
      break;
    case ComboStrength.Strong:
      score += 3;
      break;
    case ComboStrength.Medium:
      score += 2;
      break;
    case ComboStrength.Weak:
      score += 1;
      break;
  }

  // Bonuses
  if (analysis.isTrump) score += 1;
  if (analysis.hasPoints) score += 0.5;

  // Strategic value
  score += analysis.disruptionPotential * 0.3;
  score += analysis.conservationValue * 0.2;

  return score;
}

/**
 * Calculate value for leading combo based on game phase strategy
 */
export function calculateLeadingComboValue(
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

/**
 * Calculate value for second player combo based on response strategy
 */
export function calculateSecondPlayerComboValue(
  comboAnalysis: { combo: Combo; analysis: ComboAnalysis },
  responseStrategy: "support" | "pressure" | "block" | "setup",
): number {
  const { combo, analysis } = comboAnalysis;
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

  // Strategy-specific adjustments
  switch (responseStrategy) {
    case "support":
      // Bonus for point cards and strong combinations
      if (analysis.hasPoints) value += analysis.pointValue * 2;
      if (analysis.strength === ComboStrength.Strong) value += 20;
      break;

    case "pressure":
      // Bonus for moderate to strong combinations
      if (analysis.strength === ComboStrength.Medium) value += 15;
      if (analysis.strength === ComboStrength.Strong) value += 25;
      break;

    case "block":
      // Bonus for safe, non-point cards
      if (!analysis.hasPoints) value += 15;
      if (analysis.strength === ComboStrength.Weak) value += 10;
      break;

    case "setup":
      // Bonus for tactical combinations
      if (combo.type === ComboType.Pair) value += 15;
      if (combo.type === ComboType.Tractor) value += 25;
      if (analysis.strength === ComboStrength.Medium) value += 10;
      break;
  }

  return value;
}

/**
 * Enhanced tractor analysis for new tractor types
 */
export function analyzeTractorType(
  combo: Combo,
  trumpInfo: TrumpInfo,
): {
  tractorType: string;
  isAdvancedTractor: boolean;
  strategicValue: number;
} {
  if (combo.type !== ComboType.Tractor) {
    return {
      tractorType: "Not a tractor",
      isAdvancedTractor: false,
      strategicValue: 0,
    };
  }

  const description = getTractorTypeDescription(combo.cards, trumpInfo);
  const isAdvanced = description !== "Regular same-suit tractor";

  // Calculate strategic value based on tractor type
  let strategicValue = 0;
  const baseValue = combo.cards.length * 5; // Base value per card

  switch (description) {
    case "Joker tractor":
      strategicValue = baseValue + 50; // Highest value - jokers are precious
      break;
    case "Trump cross-suit tractor":
      strategicValue = baseValue + 40; // High value - mixed trump ranks
      break;
    case "Rank-skip tractor":
      strategicValue = baseValue + 30; // Medium-high value - clever play
      break;
    case "Regular same-suit tractor":
      strategicValue = baseValue + 20; // Standard tractor value
      break;
    default:
      strategicValue = baseValue;
  }

  // Trump bonus
  if (combo.cards.some((card) => isTrump(card, trumpInfo))) {
    strategicValue += 15;
  }

  // Point card bonus
  const pointValue = combo.cards.reduce(
    (sum, card) => sum + (card.points || 0),
    0,
  );
  strategicValue += pointValue * 2;

  return {
    tractorType: description,
    isAdvancedTractor: isAdvanced,
    strategicValue,
  };
}

/**
 * Validate and analyze combo strength considering new tractor rules
 */
export function analyzeComboStrength(
  combo: Combo,
  trumpInfo: TrumpInfo,
): ComboStrength {
  // Enhanced tractor validation
  if (combo.type === ComboType.Tractor) {
    if (!isValidTractor(combo.cards, trumpInfo)) {
      return ComboStrength.Weak; // Invalid tractor gets weak rating
    }

    const tractorAnalysis = analyzeTractorType(combo, trumpInfo);

    // Advanced tractors get higher strength ratings
    if (tractorAnalysis.isAdvancedTractor) {
      if (tractorAnalysis.tractorType === "Joker tractor") {
        return ComboStrength.Critical;
      }
      if (tractorAnalysis.tractorType === "Trump cross-suit tractor") {
        return ComboStrength.Strong;
      }
      return ComboStrength.Medium; // Rank-skip tractors
    }
  }

  // Existing strength analysis for other combo types
  const hasHighCards = combo.cards.some(
    (card) => card.rank === Rank.Ace || card.rank === Rank.King,
  );

  const isTrumpCombo = combo.cards.some((card) => isTrump(card, trumpInfo));
  const hasPoints = combo.cards.some((card) => (card.points || 0) > 0);

  if (isTrumpCombo && hasHighCards) return ComboStrength.Strong;
  if (isTrumpCombo || hasHighCards) return ComboStrength.Medium;
  if (hasPoints) return ComboStrength.Medium;

  return ComboStrength.Weak;
}

/**
 * Helper to get numeric value for rank comparison
 */
export function getRankValue(rank: Rank): number {
  const rankValues: Record<Rank, number> = {
    [Rank.None]: 0, // For jokers - no rank value
    [Rank.Ace]: 14,
    [Rank.King]: 13,
    [Rank.Queen]: 12,
    [Rank.Jack]: 11,
    [Rank.Ten]: 10,
    [Rank.Nine]: 9,
    [Rank.Eight]: 8,
    [Rank.Seven]: 7,
    [Rank.Six]: 6,
    [Rank.Five]: 5,
    [Rank.Four]: 4,
    [Rank.Three]: 3,
    [Rank.Two]: 2,
  };
  return rankValues[rank] || 0;
}
