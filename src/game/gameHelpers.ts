import { Card, JokerType, Rank, TrumpInfo } from "../types";

/**
 * Game Helper Functions
 *
 * Shared utility functions used across game logic modules.
 * Extracted to avoid circular imports between gameLogic.ts and tractorLogic.ts.
 */

// Rank value mapping for numeric comparisons
const RANK_VALUES: Record<Rank, number> = {
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
 * Get trump hierarchy base value for trump suit cards
 * Used consistently across conservation and strategic modes
 */
const getTrumpSuitBaseValue = (rank: Rank): number => {
  const trumpSuitValues: Record<Rank, number> = {
    [Rank.Three]: 5,
    [Rank.Four]: 10,
    [Rank.Five]: 15,
    [Rank.Six]: 20,
    [Rank.Seven]: 25,
    [Rank.Eight]: 30,
    [Rank.Nine]: 35,
    [Rank.Ten]: 40,
    [Rank.Jack]: 45,
    [Rank.Queen]: 50,
    [Rank.King]: 55,
    [Rank.Ace]: 60,
    [Rank.Two]: 65, // Two is above Ace in trump suit when not trump rank
  };
  return trumpSuitValues[rank] || 0;
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
 * Get the numeric value of a rank for comparison purposes
 */
export const getRankValue = (rank: Rank): number => {
  return RANK_VALUES[rank] || 0;
};

/**
 * Calculate strategic value of a card for various game scenarios
 */
export const calculateCardStrategicValue = (
  card: Card,
  trumpInfo: TrumpInfo,
  mode: "combo" | "conservation" | "strategic" = "combo",
): number => {
  // Handle jokers first
  if (card.joker) {
    if (mode === "combo") return card.joker === JokerType.Big ? 1000 : 999;
    if (mode === "conservation") return card.joker === JokerType.Big ? 100 : 90;
    if (mode === "strategic") return card.joker === JokerType.Big ? 1200 : 1190; // Trump bonus + conservation
  }

  let value = 0;

  // Mode-specific value calculation
  if (mode === "strategic") {
    // Strategic mode: Trump cards ALWAYS rank higher than non-trump cards for disposal

    // Trump cards get minimum base value to ensure they rank above all non-trump cards
    if (isTrump(card, trumpInfo)) {
      value += 200; // Base trump value ensures trump > non-trump

      // Use conservation hierarchy for trump cards to maintain proper trump priority
      if (card.rank === trumpInfo.trumpRank) {
        value += card.suit === trumpInfo.trumpSuit ? 80 : 70; // Trump rank priority
      } else if (card.suit === trumpInfo.trumpSuit) {
        // Trump suit cards get graduated bonuses based on conservation hierarchy
        value += getTrumpSuitBaseValue(card.rank!);
      }
    } else {
      // Non-trump cards: point cards and Aces are valuable but always < trump
      if (card.points && card.points > 0) {
        value += card.points * 10; // 5s = 50, 10s/Kings = 100
      }

      // Aces are valuable for non-trump cards
      if (card.rank === Rank.Ace) {
        value += 50;
      }

      // Base rank value for non-trump cards
      value += RANK_VALUES[card.rank!] || 0;
    }
  } else if (mode === "conservation") {
    // Conservation mode: Trump hierarchy for AI strategic decisions

    // Trump rank cards
    if (card.rank === trumpInfo.trumpRank) {
      value = card.suit === trumpInfo.trumpSuit ? 80 : 70; // Trump rank in trump suit vs off-suits
    }
    // Trump suit cards (non-rank)
    else if (card.suit === trumpInfo.trumpSuit) {
      value = getTrumpSuitBaseValue(card.rank!);
    }
    // Non-trump cards
    else {
      value = RANK_VALUES[card.rank!] || 0;
    }
  } else {
    // Combo mode: Basic trump hierarchy for combination comparison
    value = RANK_VALUES[card.rank!] || 0;

    // Trump cards have higher value
    if (isTrump(card, trumpInfo)) {
      value += 100;

      // Trump suit is higher than trump rank of other suits
      if (card.suit === trumpInfo.trumpSuit) {
        value += 50;
      }
    }
  }

  return value;
};
