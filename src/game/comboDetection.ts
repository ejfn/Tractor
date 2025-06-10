import { Card, Combo, ComboType, JokerType, Suit, TrumpInfo } from "../types";
import { findAllTractors, isValidTractor } from "./tractorLogic";
import { calculateCardStrategicValue, isTrump } from "./gameHelpers";

// Identify valid combinations in a player's hand
export const identifyCombos = (
  cards: Card[],
  trumpInfo: TrumpInfo,
): Combo[] => {
  const combos: Combo[] = [];

  // Group cards by suit and rank
  const cardsBySuit = groupCardsBySuit(cards, trumpInfo);

  // Look for singles
  cards.forEach((card) => {
    combos.push({
      type: ComboType.Single,
      cards: [card],
      value: getCardValue(card, trumpInfo),
    });
  });

  // Handle joker pairs separately
  const smallJokers = cards.filter((card) => card.joker === JokerType.Small);
  const bigJokers = cards.filter((card) => card.joker === JokerType.Big);

  // Add Small Joker pairs (using cardId for identity matching)
  if (smallJokers.length >= 2) {
    for (let i = 0; i < smallJokers.length - 1; i++) {
      // Verify they are truly identical using cardId
      if (smallJokers[i].isIdenticalTo(smallJokers[i + 1])) {
        combos.push({
          type: ComboType.Pair,
          cards: [smallJokers[i], smallJokers[i + 1]],
          value: getCardValue(smallJokers[i], trumpInfo),
        });
      }
    }
  }

  // Add Big Joker pairs (using cardId for identity matching)
  if (bigJokers.length >= 2) {
    for (let i = 0; i < bigJokers.length - 1; i++) {
      // Verify they are truly identical using cardId
      if (bigJokers[i].isIdenticalTo(bigJokers[i + 1])) {
        combos.push({
          type: ComboType.Pair,
          cards: [bigJokers[i], bigJokers[i + 1]],
          value: getCardValue(bigJokers[i], trumpInfo),
        });
      }
    }
  }

  // NOTE: Special joker tractor SJ-SJ-BJ-BJ is now handled by findAllTractors

  // Look for regular pairs and tractors
  Object.values(cardsBySuit).forEach((suitCards) => {
    // Skip the joker group since we've handled jokers separately
    if (suitCards.length > 0 && suitCards[0].joker) {
      return;
    }

    const cardsByRank = groupCardsByRank(suitCards);

    Object.values(cardsByRank).forEach((rankCards) => {
      // Pairs: Only create pairs from IDENTICAL cards using cardId comparison
      // This fixes the invalid cross-suit pair bug
      if (rankCards.length >= 2) {
        // Use cardId-based grouping for precise identity matching
        const cardsByIdentity: Record<string, Card[]> = {};

        rankCards.forEach((card) => {
          const identityKey = card.cardId; // "Hearts_A", "Spades_2", etc.
          if (!cardsByIdentity[identityKey]) {
            cardsByIdentity[identityKey] = [];
          }
          cardsByIdentity[identityKey].push(card);
        });

        // Only create pairs from cards with identical cardId
        Object.values(cardsByIdentity).forEach((identicalCards) => {
          if (identicalCards.length >= 2) {
            for (let i = 0; i < identicalCards.length - 1; i++) {
              // Double-check identity using isIdenticalTo() method
              if (identicalCards[i].isIdenticalTo(identicalCards[i + 1])) {
                combos.push({
                  type: ComboType.Pair,
                  cards: [identicalCards[i], identicalCards[i + 1]],
                  value: getCardValue(identicalCards[i], trumpInfo),
                });
              }
            }
          }
        });
      }
    });
  });

  // Look for all types of tractors with unified logic
  const tractors = findAllTractors(cards, trumpInfo);
  combos.push(...tractors);

  return combos;
};

// Group cards by suit (considering trumps)
export const groupCardsBySuit = (
  cards: Card[],
  trumpInfo: TrumpInfo,
): Record<string, Card[]> => {
  const cardsBySuit: Record<string, Card[]> = {};

  cards.forEach((card) => {
    let suitKey = "joker";

    if (card.suit) {
      // 🚨 CRITICAL RULE: ALL TRUMP CARDS ARE TREATED AS SAME SUIT
      // Trump group = Jokers + Trump Rank Cards + Trump Suit Cards
      // Must play ALL trump cards when following trump lead

      if (isTrump(card, trumpInfo)) {
        // ALL trump cards (trump rank in any suit + trump suit cards) grouped together
        // This ensures trump rank cards from different suits can form pairs
        // as required by Tractor rules when following trump leads
        suitKey = "trump";
      } else {
        // Normal non-trump card
        suitKey = card.suit;
      }
    }

    if (!cardsBySuit[suitKey]) {
      cardsBySuit[suitKey] = [];
    }

    cardsBySuit[suitKey].push(card);
  });

  return cardsBySuit;
};

// Group cards by rank within a suit
export const groupCardsByRank = (cards: Card[]): Record<string, Card[]> => {
  const cardsByRank: Record<string, Card[]> = {};

  cards.forEach((card) => {
    if (!card.rank) return; // Skip jokers

    if (!cardsByRank[card.rank]) {
      cardsByRank[card.rank] = [];
    }

    cardsByRank[card.rank].push(card);
  });

  return cardsByRank;
};

// Legacy function for backward compatibility
export const getCardValue = (card: Card, trumpInfo: TrumpInfo): number => {
  return calculateCardStrategicValue(card, trumpInfo, "combo");
};

// Get the combo type (single, pair, etc.) based on the cards
export const getComboType = (
  cards: Card[],
  trumpInfo: TrumpInfo,
): ComboType => {
  if (cards.length === 1) {
    return ComboType.Single;
  } else if (cards.length === 2) {
    // Pairs must be identical cards (same cardId)
    if (cards[0].isIdenticalTo(cards[1])) {
      return ComboType.Pair;
    }
  } else if (cards.length >= 4 && cards.length % 2 === 0) {
    // Use existing tractor detection logic
    if (isValidTractor(cards, trumpInfo)) {
      return ComboType.Tractor;
    }
  }

  // Default to Single as fallback
  return ComboType.Single;
};

/**
 * Check if same-suit pairs are preserved when following combinations
 * Issue #126 Fix: Enforce that pairs from the same suit as led cannot be broken
 */
export const checkSameSuitPairPreservation = (
  playedCards: Card[],
  leadingCombo: Card[],
  playerHand: Card[],
  trumpInfo: TrumpInfo,
): boolean => {
  // Local helper function to avoid circular dependency
  const getLeadingSuit = (combo: Card[]): Suit | undefined => {
    for (const card of combo) {
      if (card.suit) {
        return card.suit;
      }
    }
    return undefined;
  };
  const leadingSuit = getLeadingSuit(leadingCombo);
  const isLeadingTrump = leadingCombo.some((card) => isTrump(card, trumpInfo));

  // Get all cards of the leading suit/trump in player's hand
  const relevantCards = isLeadingTrump
    ? playerHand.filter((card) => isTrump(card, trumpInfo))
    : playerHand.filter(
        (card) => card.suit === leadingSuit && !isTrump(card, trumpInfo),
      );

  // Identify pairs in the relevant cards (same suit as led)
  const relevantPairs = identifyCombos(relevantCards, trumpInfo)
    .filter((combo) => combo.type === ComboType.Pair)
    .map((combo) => combo.cards);

  if (relevantPairs.length === 0) {
    return true; // No same-suit pairs to preserve
  }

  // Check each same-suit pair - if any card from a pair is played, the whole pair must be played
  for (const pair of relevantPairs) {
    const cardsFromPairPlayed = pair.filter((pairCard) =>
      playedCards.some((played) => played.id === pairCard.id),
    );

    // If some but not all cards from a pair are played, this violates pair preservation
    if (
      cardsFromPairPlayed.length > 0 &&
      cardsFromPairPlayed.length < pair.length
    ) {
      return false; // Same-suit pair broken
    }
  }

  return true; // All same-suit pairs preserved
};
