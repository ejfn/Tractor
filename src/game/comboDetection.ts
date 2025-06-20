import { Card, Combo, ComboType, Suit, TrumpInfo } from "../types";
import { calculateCardStrategicValue, isTrump } from "./gameHelpers";
import { findAllTractors, isValidTractor } from "./tractorLogic";

// Identify valid combinations in a player's hand
export const identifyCombos = (
  cards: Card[],
  trumpInfo: TrumpInfo,
): Combo[] => {
  const combos: Combo[] = [];

  // Standard pairing logic: only identical cards can form pairs
  const cardsByIdentity: Record<string, Card[]> = {};

  cards.forEach((card) => {
    // Regular pairing by commonId (works for identical cards only)
    const identityKey = card.commonId; // "Hearts_A", "Spades_2", "Small_Joker", etc.
    if (!cardsByIdentity[identityKey]) {
      cardsByIdentity[identityKey] = [];
    }
    cardsByIdentity[identityKey].push(card);
  });

  // Create pairs from identical cards only
  const pairCards = new Set<string>(); // Track cards that are part of pairs
  Object.values(cardsByIdentity).forEach((identicalCards) => {
    if (identicalCards.length === 2) {
      // Make exactly one pair from the two identical cards
      combos.push({
        type: ComboType.Pair,
        cards: [identicalCards[0], identicalCards[1]],
        value: getCardValue(identicalCards[0], trumpInfo),
        isBreakingPair: false, // Pairs don't break pairs
      });
      // Mark these cards as part of a pair
      identicalCards.forEach((card) => pairCards.add(card.id));
    }
  });

  // Look for singles
  cards.forEach((card) => {
    combos.push({
      type: ComboType.Single,
      cards: [card],
      value: getCardValue(card, trumpInfo),
      isBreakingPair: pairCards.has(card.id), // Single breaks pair if this card is part of a pair
    });
  });

  // Look for all types of tractors with unified logic
  const tractors = findAllTractors(cards, trumpInfo);

  // Add isBreakingPair: false to all tractors
  const tractorsWithBreaking = tractors.map((tractor) => ({
    ...tractor,
    isBreakingPair: false, // Tractors don't break pairs
  }));
  combos.push(...tractorsWithBreaking);

  return combos;
};

// Legacy function for backward compatibility
export const getCardValue = (card: Card, trumpInfo: TrumpInfo): number => {
  return calculateCardStrategicValue(card, trumpInfo, "combo");
};

// Get the combo type (single, pair, etc.) based on the cards
// IMPORTANT: This function should ONLY be used for straight combo detection!
// Do NOT use this for multi-combos - they require contextual detection via detectLeadingMultiCombo()
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

  // Multi-combo detection removed from getComboType - now handled separately with context

  // Return Invalid for combinations that don't match any valid combo type
  return ComboType.Invalid;
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

/**
 * Check tractor following priority rule: when following tractor/pairs,
 * must use ALL available pairs before any singles
 */
export const checkTractorFollowingPriority = (
  playedCards: Card[],
  leadingCombo: Card[],
  playerHand: Card[],
  trumpInfo: TrumpInfo,
): boolean => {
  // Get leading combo type
  const leadingType = getComboType(leadingCombo, trumpInfo);

  // Only apply this rule when following pairs or tractors
  if (leadingType !== ComboType.Pair && leadingType !== ComboType.Tractor) {
    return true; // Rule doesn't apply to single cards
  }

  // Local helper function
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

  // If player doesn't have enough cards to match leading combo length, rule doesn't apply
  if (relevantCards.length < leadingCombo.length) {
    return true;
  }

  // Get all available pairs in the relevant suit
  const availablePairs = identifyCombos(relevantCards, trumpInfo)
    .filter((combo) => combo.type === ComboType.Pair)
    .map((combo) => combo.cards);

  // If no pairs available, rule doesn't apply
  if (availablePairs.length === 0) {
    return true;
  }

  // Check how many pairs were used in the played cards
  const usedPairs = availablePairs.filter((pair) =>
    pair.every((pairCard) =>
      playedCards.some((played) => played.id === pairCard.id),
    ),
  );

  // Check how many pairs could have been used (limited by played cards length)
  const maxPairsUsable = Math.floor(playedCards.length / 2);
  const availablePairsCount = availablePairs.length;
  const expectedPairsUsed = Math.min(maxPairsUsable, availablePairsCount);

  // Must use ALL available pairs before any singles (up to the limit of played cards)
  if (usedPairs.length < expectedPairsUsed) {
    return false; // Didn't use all available pairs first
  }

  return true;
};
