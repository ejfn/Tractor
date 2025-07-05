import { Card, Combo, ComboAnalysis, TrumpInfo } from "../../../types";
import { calculateCardStrategicValue } from "../../../game/cardValue";

/**
 * Strategic Selection Functions for Enhanced Following V2
 *
 * Simplified implementations of strategic selection logic for V2 algorithm.
 * These replace dependencies on the V1 following/ modules.
 */

/**
 * Select optimal winning combo from available options
 */
export function selectOptimalWinningCombo(
  comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
  trumpInfo: TrumpInfo,
): Card[] {
  if (comboAnalyses.length === 0) {
    return [];
  }

  // Select combo with highest strategic value for winning
  const bestCombo = comboAnalyses.reduce((best, current) => {
    const bestValue = best.combo.cards.reduce(
      (sum, card) =>
        sum + calculateCardStrategicValue(card, trumpInfo, "basic"),
      0,
    );
    const currentValue = current.combo.cards.reduce(
      (sum, card) =>
        sum + calculateCardStrategicValue(card, trumpInfo, "basic"),
      0,
    );
    return currentValue > bestValue ? current : best;
  });

  return bestCombo.combo.cards;
}

/**
 * Select cards for point contribution strategy
 */
export function selectPointContribution(
  cards: Card[],
  requiredLength: number,
  trumpInfo: TrumpInfo,
): Card[] {
  // Sort by contribution value (highest first)
  const sortedCards = cards.sort(
    (a, b) =>
      calculateCardStrategicValue(b, trumpInfo, "contribute") -
      calculateCardStrategicValue(a, trumpInfo, "contribute"),
  );

  return sortedCards.slice(0, requiredLength);
}

/**
 * Select lowest value cards for disposal
 */
export function selectStrategicDisposal(
  cards: Card[],
  requiredLength: number,
  trumpInfo: TrumpInfo,
): Card[] {
  // Sort by strategic value (lowest first)
  const sortedCards = cards.sort(
    (a, b) =>
      calculateCardStrategicValue(a, trumpInfo, "basic") -
      calculateCardStrategicValue(b, trumpInfo, "basic"),
  );

  return sortedCards.slice(0, requiredLength);
}

/**
 * Select lowest value non-point cards
 */
export function selectLowestValueNonPointCombo(
  cards: Card[],
  requiredLength: number,
  trumpInfo: TrumpInfo,
): Card[] {
  // Filter out point cards first, then sort by value
  const nonPointCards = cards.filter((card) => card.points === 0);

  if (nonPointCards.length >= requiredLength) {
    return selectStrategicDisposal(nonPointCards, requiredLength, trumpInfo);
  }

  // If not enough non-point cards, use all available cards
  return selectStrategicDisposal(cards, requiredLength, trumpInfo);
}
