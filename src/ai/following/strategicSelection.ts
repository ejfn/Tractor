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

  // PAIR PRESERVATION: If all combos are singles, use pair-aware card selection
  const allSingles = validCombos.every((combo) => combo.cards.length === 1);
  if (allSingles) {
    const allCards = validCombos.flatMap((combo) => combo.cards);
    return selectCardsByStrategicValue(
      allCards,
      trumpInfo,
      mode,
      direction,
      requiredComboLength,
    );
  }

  // For non-single combos (pairs, tractors), use original combo-based selection
  // TODO: Also preserve tractors when selecting pairs (similar to pair preservation logic)
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
 * GAME RULE: Preserve pairs when possible - pairs are more valuable than singles
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
  requiredLength: number = 1,
): Card[] {
  if (cards.length === 0) {
    return [];
  }

  // PAIR PRESERVATION LOGIC: Identify pairs and unpaired cards
  const { pairedCards, unpairedCards } = categorizePairs(cards);

  // Calculate strategic value for unpaired cards (prefer these for singles)
  const unpairedScores = unpairedCards.map((card) => ({
    card,
    score: calculateCardStrategicValue(card, trumpInfo, mode),
    isPaired: false,
  }));

  // Calculate strategic value for paired cards (only use if necessary)
  const pairedScores = pairedCards.map((card) => ({
    card,
    score: calculateCardStrategicValue(card, trumpInfo, mode),
    isPaired: true,
  }));

  // Combine and sort: prioritize unpaired cards to preserve pairs
  const allCardScores = [...unpairedScores, ...pairedScores];

  // Sort by: 1) unpaired first (to preserve pairs), 2) then by strategic value
  allCardScores.sort((a, b) => {
    // First priority: prefer unpaired cards (preserve pairs)
    if (a.isPaired !== b.isPaired) {
      return a.isPaired ? 1 : -1; // unpaired cards come first
    }
    // Second priority: sort by strategic value
    return direction === "highest" ? b.score - a.score : a.score - b.score;
  });

  return allCardScores.slice(0, requiredLength).map((item) => item.card);
}

/**
 * Helper function to categorize cards into paired and unpaired
 * GAME RULE: Pairs are identical cards (same rank AND suit)
 */
function categorizePairs(cards: Card[]): {
  pairedCards: Card[];
  unpairedCards: Card[];
} {
  const pairedCards: Card[] = [];
  const unpairedCards: Card[] = [];
  const cardCounts = new Map<string, Card[]>();

  // Group cards by commonId (rank + suit)
  for (const card of cards) {
    const key = card.commonId;
    if (!cardCounts.has(key)) {
      cardCounts.set(key, []);
    }
    const cardGroup = cardCounts.get(key);
    if (cardGroup) {
      cardGroup.push(card);
    }
  }

  // Categorize based on count
  for (const cardGroup of cardCounts.values()) {
    if (cardGroup.length >= 2) {
      // These cards form pairs - add them to paired list
      pairedCards.push(...cardGroup);
    } else {
      // Single cards - safe to use without breaking pairs
      unpairedCards.push(...cardGroup);
    }
  }

  return { pairedCards, unpairedCards };
}

/**
 * Strategic disposal function - selects cards for disposal scenarios
 * Redirects to selectCardsByStrategicValue with "lowest" direction for disposal
 */
export function selectStrategicDisposal(
  cards: Card[],
  trumpInfo: TrumpInfo,
  requiredLength: number,
): Card[] {
  return selectCardsByStrategicValue(
    cards,
    trumpInfo,
    "strategic",
    "lowest",
    requiredLength,
  );
}
