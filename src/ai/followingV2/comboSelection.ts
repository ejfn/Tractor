import { calculateCardStrategicValue } from "../../game/cardValue";
import { Card, Combo, TrumpInfo } from "../../types";

/**
 * Combo Selection Utilities
 *
 * Generalized combo selection based on strategic value sorting.
 * Used across various AI following scenarios.
 */

/**
 * Core combo selection function - selects combo based on strategic value
 *
 * @param validCombos - Array of combos to choose from
 * @param trumpInfo - Current trump information
 * @param mode - Strategic value calculation mode
 * @param direction - Whether to select highest or lowest value
 * @returns Selected combo cards
 */
export function selectComboByStrategicValue(
  validCombos: Combo[],
  trumpInfo: TrumpInfo,
  mode: "contribute" | "strategic" | "basic",
  direction: "highest" | "lowest",
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

  return comboScores[0].combo.cards;
}
