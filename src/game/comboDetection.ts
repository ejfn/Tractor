import { Card, Combo, ComboType, Suit, TrumpInfo } from "../types";
import { findAllTractors, isValidTractor } from "./tractorLogic";
import { calculateCardStrategicValue, isTrump } from "./gameHelpers";

// Identify valid combinations in a player's hand
export const identifyCombos = (
  cards: Card[],
  trumpInfo: TrumpInfo,
): Combo[] => {
  const combos: Combo[] = [];

  // Look for singles
  cards.forEach((card) => {
    combos.push({
      type: ComboType.Single,
      cards: [card],
      value: getCardValue(card, trumpInfo),
    });
  });

  // Simple pairs: identical cards make pairs!
  const cardsByIdentity: Record<string, Card[]> = {};

  cards.forEach((card) => {
    const identityKey = card.cardId; // "Hearts_A", "Spades_2", "Small_Joker", etc.
    if (!cardsByIdentity[identityKey]) {
      cardsByIdentity[identityKey] = [];
    }
    cardsByIdentity[identityKey].push(card);
  });

  // Create pairs from identical cards
  Object.values(cardsByIdentity).forEach((identicalCards) => {
    if (identicalCards.length === 2) {
      // Make exactly one pair from the two identical cards
      combos.push({
        type: ComboType.Pair,
        cards: [identicalCards[0], identicalCards[1]],
        value: getCardValue(identicalCards[0], trumpInfo),
      });
    }
  });

  // Look for all types of tractors with unified logic
  const tractors = findAllTractors(cards, trumpInfo);
  combos.push(...tractors);

  return combos;
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
