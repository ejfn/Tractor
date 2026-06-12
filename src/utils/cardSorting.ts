import { isTrump } from "../game/cardValue";
import { Card, Rank, Suit, TrumpInfo } from "../types";

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
        if (trumpInfo.trumpSuit !== undefined) {
          if (a.suit === trumpInfo.trumpSuit && b.suit !== trumpInfo.trumpSuit)
            return -1;
          if (a.suit !== trumpInfo.trumpSuit && b.suit === trumpInfo.trumpSuit)
            return 1;
        }

        // Sort by rotated suit order
        const suitOrderValue = getSuitOrderValue(a.suit, b.suit, trumpInfo);
        if (suitOrderValue !== 0) return suitOrderValue;
      }

      // Sort by rank (descending - Ace high)
      return getRankOrderValue(b.rank) - getRankOrderValue(a.rank);
    }

    if (aIsTrump && !bIsTrump) return -1;
    if (!aIsTrump && bIsTrump) return 1;

    // Neither is trump - sort by suit with rotation
    if (a.suit !== b.suit) {
      return getSuitOrderValue(a.suit, b.suit, trumpInfo);
    }

    // Same suit - sort by rank (descending - Ace high)
    return getRankOrderValue(b.rank) - getRankOrderValue(a.rank);
  });
};

/**
 * Get suit order value based on trump suit rotation
 * Trump suit comes first, then rotated order maintains black-red alternation
 */
const getSuitOrderValue = (
  suitA: Suit,
  suitB: Suit,
  trumpInfo: TrumpInfo,
): number => {
  const standardSuitOrder: Suit[] = [
    Suit.Spades,
    Suit.Hearts,
    Suit.Clubs,
    Suit.Diamonds,
  ];
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

  const suitOrder: Partial<Record<Suit, number>> = {};
  rotatedOrder.forEach((suit, index) => {
    suitOrder[suit] = index;
  });

  return (suitOrder[suitA] ?? 0) - (suitOrder[suitB] ?? 0);
};

/**
 * Get rank order value (higher number = higher rank)
 * Ace is highest (12), 2 is lowest (0)
 */
const getRankOrderValue = (rank: Rank): number => {
  const rankOrder: Partial<Record<Rank, number>> = {
    [Rank.Two]: 0,
    [Rank.Three]: 1,
    [Rank.Four]: 2,
    [Rank.Five]: 3,
    [Rank.Six]: 4,
    [Rank.Seven]: 5,
    [Rank.Eight]: 6,
    [Rank.Nine]: 7,
    [Rank.Ten]: 8,
    [Rank.Jack]: 9,
    [Rank.Queen]: 10,
    [Rank.King]: 11,
    [Rank.Ace]: 12,
  };
  return rankOrder[rank] ?? 0;
};
