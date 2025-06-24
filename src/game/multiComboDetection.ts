import { Card, MultiCombo, TrumpInfo } from "../types";
import { isTrump } from "./gameHelpers";
import { detectMultiComboAttempt } from "./multiComboAnalysis";

/**
 * Multi-Combo Detection for Game Rule Validation
 *
 * This module provides multi-combo detection specifically for game rule enforcement.
 * Should ONLY be used for:
 * 1) Leading multi-combo validation in isValidPlay()
 * 2) Trump responses attempting to beat leading multi-combos in isValidPlay()
 *
 * This is separated from getComboType to avoid context confusion.
 * getComboType handles only straight combo types: Single, Pair, Tractor, Invalid
 *
 * For comprehensive multi-combo analysis, see multiComboAnalysis.ts
 */

export interface MultiComboDetectionResult {
  isMultiCombo: boolean;
  components?: MultiCombo;
}

/**
 * Detect multi-combo for leading validation
 * Only allows well-structured multi-combos from non-trump suits
 */
export const detectLeadingMultiCombo = (
  cards: Card[],
  trumpInfo: TrumpInfo,
): MultiComboDetectionResult => {
  const detection = detectMultiComboAttempt(cards, trumpInfo);

  if (!detection.isMultiCombo || !detection.components) {
    return { isMultiCombo: false };
  }

  // RESTRICTIVE: Only allow leading multi-combos from non-trump suits
  if (detection.components && detection.components.isTrump) {
    return { isMultiCombo: false };
  }

  // Additional validation: All cards must be from same non-trump suit
  const nonTrumpCards = cards.filter((card) => !isTrump(card, trumpInfo));
  if (nonTrumpCards.length > 0) {
    const firstNonTrumpSuit = nonTrumpCards[0].suit;
    const allSameSuit = nonTrumpCards.every(
      (card) => card.suit === firstNonTrumpSuit,
    );
    if (!allSameSuit) {
      return { isMultiCombo: false };
    }
  }

  return {
    isMultiCombo: true,
    components: detection.components,
  };
};
