import { Card, TrumpInfo, Rank, JokerType, ComboType } from "../types";
import { getComboType } from "../game/gameLogic";

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
 */
export const findTractorCards = (
  targetCard: Card,
  hand: Card[],
  trumpInfo: TrumpInfo,
): Card[] => {
  // Special case: Joker tractor (Small Joker pair + Big Joker pair)
  if (targetCard.joker) {
    const smallJokers = hand.filter((card) => card.joker === JokerType.Small);
    const bigJokers = hand.filter((card) => card.joker === JokerType.Big);

    if (smallJokers.length >= 2 && bigJokers.length >= 2) {
      return [...smallJokers.slice(0, 2), ...bigJokers.slice(0, 2)];
    }
    return [];
  }

  if (!targetCard.rank || !targetCard.suit) return [];

  // Group cards by rank and suit to find pairs
  const cardsByRankSuit = new Map<string, Card[]>();
  hand.forEach((card) => {
    if (card.rank && card.suit) {
      const key = `${card.rank}-${card.suit}`;
      if (!cardsByRankSuit.has(key)) {
        cardsByRankSuit.set(key, []);
      }
      cardsByRankSuit.get(key)!.push(card);
    }
  });

  // Find pairs only (need exactly 2 cards of same rank/suit)
  const availablePairs = new Map<string, Card[]>();
  cardsByRankSuit.forEach((cards, key) => {
    if (cards.length >= 2) {
      availablePairs.set(key, cards.slice(0, 2));
    }
  });

  const targetKey = `${targetCard.rank}-${targetCard.suit}`;
  if (!availablePairs.has(targetKey)) return [];

  // Get rank order for consecutive checking
  const rankOrder = [
    Rank.Two,
    Rank.Three,
    Rank.Four,
    Rank.Five,
    Rank.Six,
    Rank.Seven,
    Rank.Eight,
    Rank.Nine,
    Rank.Ten,
    Rank.Jack,
    Rank.Queen,
    Rank.King,
    Rank.Ace,
  ];

  const targetRankIndex = rankOrder.indexOf(targetCard.rank);
  if (targetRankIndex === -1) return [];

  // Look for consecutive pairs in the same suit, checking both directions
  const tractorCards: Card[] = [];
  const ranksInTractor: Rank[] = [];

  // Add the starting pair
  tractorCards.push(...availablePairs.get(targetKey)!);
  ranksInTractor.push(targetCard.rank);

  // Look for consecutive pairs going up
  let currentRankIndex = targetRankIndex;
  while (currentRankIndex + 1 < rankOrder.length) {
    const nextRank = rankOrder[currentRankIndex + 1];
    const nextKey = `${nextRank}-${targetCard.suit}`;

    if (availablePairs.has(nextKey)) {
      tractorCards.push(...availablePairs.get(nextKey)!);
      ranksInTractor.push(nextRank);
      currentRankIndex++;
    } else {
      break;
    }
  }

  // Look for consecutive pairs going down
  currentRankIndex = targetRankIndex;
  while (currentRankIndex - 1 >= 0) {
    const prevRank = rankOrder[currentRankIndex - 1];
    const prevKey = `${prevRank}-${targetCard.suit}`;

    if (availablePairs.has(prevKey)) {
      tractorCards.push(...availablePairs.get(prevKey)!);
      ranksInTractor.push(prevRank);
      currentRankIndex--;
    } else {
      break;
    }
  }

  // A tractor needs at least 2 consecutive pairs (4 cards)
  return tractorCards.length >= 4 ? tractorCards : [];
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

  // Special handling during trump declaration - single selection only
  if (!trumpInfo?.declared) {
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
