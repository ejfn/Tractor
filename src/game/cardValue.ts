import { Card, JokerType, Rank, TrumpInfo } from "../types";

/**
 * Card Value Functions
 *
 * Functions for calculating card values and trump hierarchy.
 * Used across game logic and AI strategy modules.
 */

// Rank value mapping for numeric comparisons
const RANK_VALUES: Record<Rank, number> = {
  [Rank.None]: 0, // For jokers - no rank value
  [Rank.Two]: 2,
  [Rank.Three]: 3,
  [Rank.Four]: 4,
  [Rank.Five]: 5,
  [Rank.Six]: 6,
  [Rank.Seven]: 7,
  [Rank.Eight]: 8,
  [Rank.Nine]: 9,
  [Rank.Ten]: 10,
  [Rank.Jack]: 11,
  [Rank.Queen]: 12,
  [Rank.King]: 13,
  [Rank.Ace]: 14,
};

/**
 * Check if a card is trump
 */
export const isTrump = (card: Card, trumpInfo: TrumpInfo): boolean => {
  return (
    !!card.joker ||
    card.rank === trumpInfo.trumpRank ||
    card.suit === trumpInfo.trumpSuit
  );
};

/**
 * Check if a card is the biggest possible card in its non-trump suit
 * considering trump rank (e.g., King is biggest when Ace is trump rank)
 */
export const isBiggestInSuit = (card: Card, trumpInfo: TrumpInfo): boolean => {
  // Only applies to non-trump cards
  if (isTrump(card, trumpInfo)) {
    return false;
  }

  // If Ace is not trump rank, then Ace is biggest in non-trump suits
  if (trumpInfo.trumpRank !== Rank.Ace && card.rank === Rank.Ace) {
    return true;
  }

  // If Ace is trump rank, then King becomes biggest in non-trump suits
  if (trumpInfo.trumpRank === Rank.Ace && card.rank === Rank.King) {
    return true;
  }

  return false;
};

/**
 * Get the numeric value of a rank for comparison purposes
 */
export const getRankValue = (rank: Rank): number => {
  return RANK_VALUES[rank] || 0;
};

/**
 * Calculate strategic value of a card for various game scenarios
 *
 * Three simple modes:
 * - "basic" (default): Trump (with hierarchy) > non-trump (simple rank values)
 * - "strategic": Default + save points (increase value for point cards)
 * - "contribute": Default + contribute points (decrease value for point cards)
 */
export const calculateCardStrategicValue = (
  card: Card,
  trumpInfo: TrumpInfo,
  mode: "basic" | "strategic" | "contribute" = "basic",
): number => {
  // Handle jokers first
  if (card.joker) {
    return card.joker === JokerType.Big ? 1000 : 999;
  }

  let value = 0;

  // Default mode: Trump (always with hierarchy) > non-trump (simple)
  if (isTrump(card, trumpInfo)) {
    // Trump cards get base trump value to ensure they rank above all non-trump
    value += 100;

    // Use trump hierarchy
    if (card.rank === trumpInfo.trumpRank) {
      value += card.suit === trumpInfo.trumpSuit ? 80 : 70; // Trump rank priority
    } else if (card.suit === trumpInfo.trumpSuit) {
      // Trump suit cards get base rank value
      value += RANK_VALUES[card.rank] || 0;
    }
  } else {
    // Non-trump cards: base rank value only
    value = RANK_VALUES[card.rank] || 0;
  }

  if (card.points > 0 && card.rank !== trumpInfo.trumpRank) {
    // Strategic adjustments
    if (mode === "strategic") {
      value += card.points * 10; // Save points (increase value)
    } else if (mode === "contribute") {
      value -= card.points * 10; // Contribute points (decrease value)
      // Extra penalty for 10s to make them less disposable than Kings: 5 > K > 10
      if (card.rank === Rank.Ten) {
        value -= 5; // extra -5 for 10
      }
    }
  }

  return value;
};
