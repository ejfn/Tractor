import { Card, TrumpInfo, ComboType } from "../types";
import { getComboType } from "../game/gameLogic";
import { findAllTractors } from "../game/tractorLogic";

/**
 * Utility functions for smart card auto-selection
 */

/**
 * Finds all cards that form a pair with the given card
 */
export const findPairCards = (targetCard: Card, hand: Card[]): Card[] => {
  const pairs: Card[] = [targetCard];

  // Find joker pairs
  if (targetCard.joker) {
    const matchingJokers = hand.filter(
      (card) => card.joker === targetCard.joker && card.id !== targetCard.id,
    );
    pairs.push(...matchingJokers);
  }
  // Find regular pairs (same rank and suit)
  else if (targetCard.rank && targetCard.suit) {
    const matchingCards = hand.filter(
      (card) =>
        card.rank === targetCard.rank &&
        card.suit === targetCard.suit &&
        card.id !== targetCard.id,
    );
    pairs.push(...matchingCards);
  }

  return pairs;
};

/**
 * Finds all cards that form a tractor starting with the given card
 * Uses the unified tractor-rank system to support all tractor types:
 * - Regular same-suit tractors
 * - Rank-skip tractors (when trump rank creates gaps)
 * - Trump cross-suit tractors (trump suit rank + off-suit rank pairs)
 * - Joker tractors
 */
export const findTractorCards = (
  targetCard: Card,
  hand: Card[],
  trumpInfo: TrumpInfo,
): Card[] => {
  // Find all possible tractors in the hand using the unified system
  const allTractors = findAllTractors(hand, trumpInfo);

  if (allTractors.length === 0) return [];

  // Filter tractors that include the target card
  const tractorsWithTarget = allTractors.filter((tractor) =>
    tractor.cards.some((card) => card.id === targetCard.id),
  );

  if (tractorsWithTarget.length === 0) return [];

  // Find the longest tractor that includes the target card
  const longestTractor = tractorsWithTarget.reduce((longest, current) =>
    current.cards.length > longest.cards.length ? current : longest,
  );

  return longestTractor.cards;
};

/**
 * Determines what cards should be auto-selected when a player clicks a card
 */
export const getAutoSelectedCards = (
  clickedCard: Card,
  hand: Card[],
  currentSelection: Card[],
  isLeading: boolean,
  leadingCombo?: Card[],
  trumpInfo?: TrumpInfo,
): Card[] => {
  // If card is already selected, remove it (toggle off)
  if (currentSelection.some((c) => c.id === clickedCard.id)) {
    return currentSelection.filter((c) => c.id !== clickedCard.id);
  }

  // Special handling during trump declaration phase - single selection only
  // trumpSuit === undefined means trump declaration is still in progress
  // trumpSuit === Suit.None or specific suit means trump declaration is complete
  if (trumpInfo?.trumpSuit === undefined) {
    return [...currentSelection, clickedCard];
  }

  // Helper function to add new cards to current selection (avoiding duplicates)
  const addToSelection = (newCards: Card[]): Card[] => {
    const newSelection = [...currentSelection];
    newCards.forEach((card) => {
      if (!newSelection.some((c) => c.id === card.id)) {
        newSelection.push(card);
      }
    });
    return newSelection;
  };

  // If following a specific combo type, try to match that type ONLY if the clicked card can form it
  if (!isLeading && leadingCombo && leadingCombo.length > 1) {
    const leadingComboType = getComboType(leadingCombo);

    // Following a pair - auto-select pair only if clicked card can form a pair
    if (leadingComboType === ComboType.Pair && leadingCombo.length === 2) {
      const pairCards = findPairCards(clickedCard, hand);
      if (pairCards.length === 2) {
        return addToSelection(pairCards);
      }
      // If clicked card can't form a pair, fall through to single selection
    }

    // Following a tractor - auto-select tractor only if clicked card can form a tractor
    if (
      leadingComboType === ComboType.Tractor &&
      leadingCombo.length >= 4 &&
      leadingCombo.length % 2 === 0 &&
      trumpInfo
    ) {
      const tractorCards = findTractorCards(clickedCard, hand, trumpInfo);
      if (
        tractorCards.length >= 4 &&
        tractorCards.length === leadingCombo.length
      ) {
        return addToSelection(tractorCards);
      }
      // If clicked card can't form a tractor, fall through to single selection
    }
  }

  // When leading, prioritize tractors over pairs for better combinations
  if (isLeading && trumpInfo) {
    // Try tractor first (more valuable combination)
    const tractorCards = findTractorCards(clickedCard, hand, trumpInfo);
    if (tractorCards.length >= 4) {
      return addToSelection(tractorCards);
    }

    // Fall back to pair
    const pairCards = findPairCards(clickedCard, hand);
    if (pairCards.length === 2) {
      return addToSelection(pairCards);
    }
  }

  // Default: add single card to selection
  return addToSelection([clickedCard]);
};
