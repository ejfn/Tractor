import { calculateCardStrategicValue } from "../../game/cardValue";
import { Card, Combo, TrumpInfo } from "../../types";

/**
 * Strategic Selection Functions for Enhanced Following V2
 *
 * Core utilities for strategic card and combo selection with unified APIs.
 * These replace dependencies on the V1 following/ modules.
 */

// =============== CORE SELECTION UTILITIES ===============

/**
 * Core combo selection function - selects combo(s) based on strategic value
 *
 * @param validCombos - Array of combos to choose from
 * @param trumpInfo - Current trump information
 * @param mode - Strategic value calculation mode
 * @param direction - Whether to select highest or lowest value
 * @param requiredComboLength - Number of combos to select (default 1)
 * @returns Selected combo cards
 */
export function selectComboByStrategicValue(
  validCombos: Combo[],
  trumpInfo: TrumpInfo,
  mode: "contribute" | "strategic" | "basic",
  direction: "highest" | "lowest",
  requiredComboLength: number = 1,
): Card[] {
  if (validCombos.length === 0) {
    throw new Error("selectComboByStrategicValue called with no valid combos");
  }

  // Calculate strategic value for each combo
  const comboScores = validCombos.map((combo) => ({
    combo,
    score: combo.cards.reduce(
      (sum, card) => sum + calculateCardStrategicValue(card, trumpInfo, mode),
      0,
    ),
  }));

  // Sort by score based on direction
  comboScores.sort((a, b) =>
    direction === "highest" ? b.score - a.score : a.score - b.score,
  );

  // Select the required number of combos and return all their cards
  const selectedCombos = comboScores.slice(0, requiredComboLength);
  return selectedCombos.flatMap(({ combo }) => combo.cards);
}

/**
 * Core card selection function - selects cards based on strategic value
 *
 * @param cards - Array of cards to choose from
 * @param trumpInfo - Current trump information
 * @param mode - Strategic value calculation mode
 * @param direction - Whether to select highest or lowest value
 * @param requiredLength - Number of cards to select
 * @returns Selected cards
 */
export function selectCardsByStrategicValue(
  cards: Card[],
  trumpInfo: TrumpInfo,
  mode: "contribute" | "strategic" | "basic",
  direction: "highest" | "lowest",
  requiredLength: number,
): Card[] {
  if (cards.length === 0) {
    return [];
  }

  // Calculate strategic value for each card
  const cardScores = cards.map((card) => ({
    card,
    score: calculateCardStrategicValue(card, trumpInfo, mode),
  }));

  // Sort by score based on direction
  cardScores.sort((a, b) =>
    direction === "highest" ? b.score - a.score : a.score - b.score,
  );

  return cardScores.slice(0, requiredLength).map((item) => item.card);
}

// =============== SPECIALIZED SELECTION FUNCTIONS ===============

/**
 * Select cards for point contribution strategy
 */
export function selectPointContribution(
  cards: Card[],
  requiredLength: number,
  trumpInfo: TrumpInfo,
): Card[] {
  return selectCardsByStrategicValue(
    cards,
    trumpInfo,
    "contribute",
    "highest",
    requiredLength,
  );
}

/**
 * Select lowest value cards for disposal
 */
export function selectStrategicDisposal(
  cards: Card[],
  requiredLength: number,
  trumpInfo: TrumpInfo,
): Card[] {
  return selectCardsByStrategicValue(
    cards,
    trumpInfo,
    "strategic",
    "lowest",
    requiredLength,
  );
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
