import { isTrump } from "../game/gameHelpers";
import { Card, TrumpInfo } from "../types";

/**
 * Sort cards by suit and rank for consistent display
 * Order: Jokers (Big first) -> Trump cards -> Non-trump cards by suit rotation -> By rank (Ace high)
 */
export const sortCards = (cards: Card[], trumpInfo: TrumpInfo): Card[] => {
  return [...cards].sort((a, b) => {
    // Jokers first, big joker before small joker
    if (a.joker && b.joker) {
      return a.joker === "Big" ? -1 : 1;
    }
    if (a.joker && !b.joker) return -1;
    if (!a.joker && b.joker) return 1;

    // Trump cards next
    const aIsTrump = isTrump(a, trumpInfo);
    const bIsTrump = isTrump(b, trumpInfo);

    if (aIsTrump && bIsTrump) {
      // Trump rank cards first
      const aIsTrumpRank = a.rank === trumpInfo.trumpRank;
      const bIsTrumpRank = b.rank === trumpInfo.trumpRank;

      if (aIsTrumpRank && !bIsTrumpRank) return -1;
      if (!aIsTrumpRank && bIsTrumpRank) return 1;

      // If both are trump rank, sort by suit
      if (aIsTrumpRank && bIsTrumpRank) {
        if (a.suit && b.suit) {
          if (trumpInfo.trumpSuit !== undefined) {
            if (
              a.suit === trumpInfo.trumpSuit &&
              b.suit !== trumpInfo.trumpSuit
            )
              return -1;
            if (
              a.suit !== trumpInfo.trumpSuit &&
              b.suit === trumpInfo.trumpSuit
            )
              return 1;
          }

          // Sort by rotated suit order
          const suitOrderValue = getSuitOrderValue(a.suit, b.suit, trumpInfo);
          if (suitOrderValue !== 0) return suitOrderValue;
        }
      }

      // Sort by rank (descending - Ace high)
      if (a.rank && b.rank) {
        return getRankOrderValue(b.rank) - getRankOrderValue(a.rank);
      }
    }

    if (aIsTrump && !bIsTrump) return -1;
    if (!aIsTrump && bIsTrump) return 1;

    // Neither is trump - sort by suit with rotation
    if (a.suit && b.suit && a.suit !== b.suit) {
      return getSuitOrderValue(a.suit, b.suit, trumpInfo);
    }

    // Same suit - sort by rank (descending - Ace high)
    if (a.rank && b.rank) {
      return getRankOrderValue(b.rank) - getRankOrderValue(a.rank);
    }

    return 0;
  });
};

/**
 * Get suit order value based on trump suit rotation
 * Trump suit comes first, then rotated order maintains black-red alternation
 */
const getSuitOrderValue = (
  suitA: string,
  suitB: string,
  trumpInfo: TrumpInfo,
): number => {
  const standardSuitOrder = ["Spades", "Hearts", "Clubs", "Diamonds"];
  let trumpIndex = -1;
  if (trumpInfo.trumpSuit !== undefined) {
    trumpIndex = standardSuitOrder.indexOf(trumpInfo.trumpSuit);
  }

  let rotatedOrder = [...standardSuitOrder];
  if (trumpIndex > 0) {
    rotatedOrder = [
      ...standardSuitOrder.slice(trumpIndex),
      ...standardSuitOrder.slice(0, trumpIndex),
    ];
  }

  const suitOrder: Record<string, number> = {};
  rotatedOrder.forEach((suit, index) => {
    suitOrder[suit] = index;
  });

  return suitOrder[suitA] - suitOrder[suitB];
};

/**
 * Get rank order value (higher number = higher rank)
 * Ace is highest (12), 2 is lowest (0)
 */
const getRankOrderValue = (rank: string): number => {
  const rankOrder: Record<string, number> = {
    "2": 0,
    "3": 1,
    "4": 2,
    "5": 3,
    "6": 4,
    "7": 5,
    "8": 6,
    "9": 7,
    "10": 8,
    J: 9,
    Q: 10,
    K: 11,
    A: 12,
  };
  return rankOrder[rank] ?? 0;
};
