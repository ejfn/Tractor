import { Card, Combo, ComboType, JokerType, TrumpInfo } from "../types";
import { calculateCardStrategicValue, getRankValue } from "./cardValue";

/**
 * Tractor Detection Module
 *
 * Implements unified tractor-rank system for detecting all types of tractors:
 * 1. Regular same-suit tractors (e.g., 6♠-6♠ + 7♠-7♠)
 * 2. Rank-skip tractors (e.g., 6♠-6♠ + 8♠-8♠ when 7 is trump rank)
 * 3. Trump cross-suit tractors (e.g., 2♠-2♠ + 2♥-2♥ when trump suit Spades)
 * 4. Joker tractors (e.g., SJ-SJ + BJ-BJ)
 *
 * The tractor-rank system assigns consecutive numbers to cards that can form tractors,
 * making it easy to detect all tractor types with unified logic.
 */

// Get tractor rank for a card - unified ranking system for tractor detection
export const getTractorRank = (card: Card, trumpInfo: TrumpInfo): number => {
  // Jokers have highest tractor ranks
  if (card.joker === JokerType.Big) return 1020; // Above all suits
  if (card.joker === JokerType.Small) return 1019; // Above all suits

  // Trump rank cards - special handling for cross-suit combinations
  if (card.rank === trumpInfo.trumpRank) {
    if (card.suit === trumpInfo.trumpSuit) {
      return 1017; // Trump suit rank - can combine with off-suit ranks
    } else {
      return 1016; // Off-suit trump rank - all get same rank so they DON'T form tractors with each other
    }
  }

  // Regular cards - adjust for trump rank gaps + suit-based offset
  const baseRankValue = getRankValue(card.rank);
  const trumpRankValue = getRankValue(trumpInfo.trumpRank);

  // If this card's rank is lower than trump rank, shift it up by 1
  // This creates the "bridge" effect for rank-skip tractors
  let adjustedRank = baseRankValue;
  if (baseRankValue < trumpRankValue) {
    adjustedRank = baseRankValue + 1;
  }

  // Add suit-based offset to prevent cross-suit combinations
  const suitOffset = getSuitOffset(card.suit, trumpInfo);
  return adjustedRank + suitOffset;
};

// Get suit-based offset to ensure suit separation
const getSuitOffset = (suit: string, trumpInfo: TrumpInfo): number => {
  if (suit === trumpInfo.trumpSuit) {
    return 1000; // Trump suit cards get special trump offset
  }

  switch (suit) {
    case "Spades":
      return 0;
    case "Hearts":
      return 100;
    case "Clubs":
      return 200;
    case "Diamonds":
      return 300;
    default:
      return 400; // Fallback
  }
};

// Get tractor context for grouping cards that can form tractors together
export const getTractorContext = (card: Card, trumpInfo: TrumpInfo): string => {
  if (card.joker) {
    return "joker"; // Jokers form their own tractor context
  } else if (card.rank === trumpInfo.trumpRank) {
    return "trump_rank"; // All trump rank cards can potentially form cross-suit tractors
  } else if (card.suit) {
    return card.suit; // Regular cards grouped by suit
  }
  return "other";
};

// Find all tractors using unified tractor rank system
export const findAllTractors = (
  cards: Card[],
  trumpInfo: TrumpInfo,
): Combo[] => {
  const combos: Combo[] = [];

  // Group all cards by their tractor context
  const cardsByTractorContext: Record<string, Card[]> = {};

  cards.forEach((card) => {
    const contextKey = getTractorContext(card, trumpInfo);

    if (!cardsByTractorContext[contextKey]) {
      cardsByTractorContext[contextKey] = [];
    }
    cardsByTractorContext[contextKey].push(card);
  });

  // Find tractors within each context
  Object.values(cardsByTractorContext).forEach((contextCards) => {
    const contextTractors = findTractorsInContext(contextCards, trumpInfo);
    combos.push(...contextTractors);
  });

  return combos;
};

// Find tractors within a specific context using tractor ranks
export const findTractorsInContext = (
  cards: Card[],
  trumpInfo: TrumpInfo,
): Combo[] => {
  const combos: Combo[] = [];

  // Group cards by tractor rank
  const cardsByTractorRank: Record<number, Card[]> = {};

  cards.forEach((card) => {
    const rank = getTractorRank(card, trumpInfo);
    if (!cardsByTractorRank[rank]) {
      cardsByTractorRank[rank] = [];
    }
    cardsByTractorRank[rank].push(card);
  });

  // Find pairs at each tractor rank level using cardId-based identity matching
  const pairs: { rank: number; cards: Card[] }[] = [];
  Object.entries(cardsByTractorRank).forEach(([rank, rankCards]) => {
    if (rankCards.length >= 2) {
      // Group by cardId within the same tractor rank to find truly identical pairs
      const cardsByIdentity: Record<string, Card[]> = {};

      rankCards.forEach((card) => {
        const identityKey = card.commonId;
        if (!cardsByIdentity[identityKey]) {
          cardsByIdentity[identityKey] = [];
        }
        cardsByIdentity[identityKey].push(card);
      });

      // Only create pairs from cards with identical cardId
      Object.values(cardsByIdentity).forEach((identicalCards) => {
        if (identicalCards.length >= 2) {
          for (let i = 0; i < identicalCards.length - 1; i += 2) {
            // Verify identity using isIdenticalTo() method
            if (identicalCards[i].isIdenticalTo(identicalCards[i + 1])) {
              pairs.push({
                rank: parseInt(rank),
                cards: [identicalCards[i], identicalCards[i + 1]],
              });
            }
          }
        }
      });
    }
  });

  // Sort pairs by tractor rank
  pairs.sort((a, b) => a.rank - b.rank);

  // Find all possible tractors
  for (let startIdx = 0; startIdx < pairs.length; startIdx++) {
    for (let endIdx = startIdx + 1; endIdx < pairs.length; endIdx++) {
      // Skip if both are trump rank cards (handled separately)
      const startCard = pairs[startIdx].cards[0];
      const endCard = pairs[endIdx].cards[0];
      if (
        startCard.rank === trumpInfo.trumpRank &&
        endCard.rank === trumpInfo.trumpRank
      ) {
        continue;
      }

      // Check if pairs from startIdx to endIdx form a consecutive tractor
      let isConsecutive = true;
      for (let i = startIdx; i < endIdx; i++) {
        const currentRank = pairs[i].rank;
        const nextRank = pairs[i + 1].rank;

        if (nextRank - currentRank !== 1) {
          isConsecutive = false;
          break;
        }
      }

      // If consecutive and has at least 2 pairs, create a tractor
      if (isConsecutive && endIdx - startIdx + 1 >= 2) {
        const tractorPairs = pairs.slice(startIdx, endIdx + 1);
        const tractorCards = tractorPairs.flatMap((pair) => pair.cards);

        // Calculate value based on the highest rank in the tractor
        const value = Math.max(
          ...tractorPairs.map((pair) =>
            calculateCardStrategicValue(pair.cards[0], trumpInfo, "basic"),
          ),
        );

        combos.push({
          type: ComboType.Tractor,
          cards: tractorCards,
          value: value,
        });
      }
    }
  }

  // Trump rank cross-suit tractors: generate ALL combinations of trump suit + off-suit pairs
  const trumpRankPairs = pairs.filter(
    (pair) => pair.cards[0].rank === trumpInfo.trumpRank,
  );
  const trumpSuitPairs = trumpRankPairs.filter(
    (pair) => pair.cards[0].suit === trumpInfo.trumpSuit,
  );
  const offSuitPairs = trumpRankPairs.filter(
    (pair) => pair.cards[0].suit !== trumpInfo.trumpSuit,
  );

  if (trumpSuitPairs.length > 0 && offSuitPairs.length > 0) {
    // Each trump suit pair can combine with each off-suit pair
    for (const trumpPair of trumpSuitPairs) {
      for (const offSuitPair of offSuitPairs) {
        const tractorCards = [...trumpPair.cards, ...offSuitPair.cards];
        const value = Math.max(
          calculateCardStrategicValue(trumpPair.cards[0], trumpInfo, "basic"),
          calculateCardStrategicValue(offSuitPair.cards[0], trumpInfo, "basic"),
        );

        combos.push({
          type: ComboType.Tractor,
          cards: tractorCards,
          value: value,
        });
      }
    }
  }

  return combos;
};

// Check if given cards form a valid tractor
export const isValidTractor = (
  cards: Card[],
  trumpInfo: TrumpInfo,
): boolean => {
  if (cards.length < 4 || cards.length % 2 !== 0) {
    return false; // Must have even number of cards, at least 4
  }

  const tractors = findAllTractors(cards, trumpInfo);

  // Check if there's a tractor that uses all the cards
  return tractors.some(
    (tractor) =>
      tractor.cards.length === cards.length &&
      tractor.cards.every((tractorCard) =>
        cards.some((card) => card.id === tractorCard.id),
      ),
  );
};

// Get tractor type description for debugging/logging
export const getTractorTypeDescription = (
  cards: Card[],
  trumpInfo: TrumpInfo,
): string => {
  if (cards.length < 4) return "Not a tractor";

  const context = getTractorContext(cards[0], trumpInfo);
  const ranks = cards.map((card) => getTractorRank(card, trumpInfo));
  const uniqueRanks = Array.from(new Set(ranks)).sort((a, b) => a - b);

  if (context === "joker") {
    return "Joker tractor";
  } else if (context === "trump_rank") {
    return "Trump cross-suit tractor";
  } else if (
    uniqueRanks.some((rank, i) => i > 0 && rank - uniqueRanks[i - 1] > 1)
  ) {
    return "Rank-skip tractor";
  } else {
    return "Regular same-suit tractor";
  }
};
