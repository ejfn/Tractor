import {
  getComboType,
  identifyCombos,
  isTrump,
  compareCards
} from '../src/utils/gameLogic';
import {
  Card,
  ComboType,
  JokerType,
  Rank,
  Suit,
  TrumpInfo
} from '../src/types/game';

// Test data
const fourSpades1: Card = {
  suit: Suit.Spades,
  rank: Rank.Four,
  id: 'Spades_4_1',
  points: 0
};

const fourSpades2: Card = {
  suit: Suit.Spades,
  rank: Rank.Four,
  id: 'Spades_4_2',
  points: 0
};

const fourDiamonds1: Card = {
  suit: Suit.Diamonds,
  rank: Rank.Four,
  id: 'Diamonds_4_1',
  points: 0
};

const fourDiamonds2: Card = {
  suit: Suit.Diamonds,
  rank: Rank.Four,
  id: 'Diamonds_4_2',
  points: 0
};

const fourClubs1: Card = {
  suit: Suit.Clubs,
  rank: Rank.Four,
  id: 'Clubs_4_1',
  points: 0
};

const fourHearts1: Card = {
  suit: Suit.Hearts,
  rank: Rank.Four,
  id: 'Hearts_4_1',
  points: 0
};

const fiveSpades1: Card = {
  suit: Suit.Spades,
  rank: Rank.Five,
  id: 'Spades_5_1',
  points: 5
};

const fiveSpades2: Card = {
  suit: Suit.Spades,
  rank: Rank.Five,
  id: 'Spades_5_2',
  points: 5
};

describe('Trump Pair Tests', () => {
  const trumpInfo: TrumpInfo = {
    trumpRank: Rank.Four,
    trumpSuit: Suit.Diamonds,
    declared: true
  };

  // Individual card tests
  test('4♠ is a trump card when 4♦ is trump', () => {
    expect(isTrump(fourSpades1, trumpInfo)).toBe(true);
  });

  test('4♦ is a trump card when 4♦ is trump', () => {
    expect(isTrump(fourDiamonds1, trumpInfo)).toBe(true);
  });

  test('4♣ is a trump card when 4♦ is trump', () => {
    expect(isTrump(fourClubs1, trumpInfo)).toBe(true);
  });

  test('4♥ is a trump card when 4♦ is trump', () => {
    expect(isTrump(fourHearts1, trumpInfo)).toBe(true);
  });

  test('5♠ is NOT a trump card when 4♦ is trump', () => {
    expect(isTrump(fiveSpades1, trumpInfo)).toBe(false);
  });

  // Valid pair tests
  test('5♠-5♠ forms a valid pair (same rank, same suit)', () => {
    const result = getComboType([fiveSpades1, fiveSpades2]);
    expect(result).toBe(ComboType.Pair);
  });

  // Valid trump pair tests
  test('4♦-4♦ forms a valid trump pair when 4♦ is trump (same rank, same suit)', () => {
    // First, check that each card is a trump
    expect(isTrump(fourDiamonds1, trumpInfo)).toBe(true);
    expect(isTrump(fourDiamonds2, trumpInfo)).toBe(true);

    // Then check that they form a pair
    const result = getComboType([fourDiamonds1, fourDiamonds2]);
    expect(result).toBe(ComboType.Pair);

    // Finally, check they are identified as a combo
    const combos = identifyCombos([fourDiamonds1, fourDiamonds2, fiveSpades1], trumpInfo);

    // Find the pair combo in question
    const fourDiamondsPair = combos.find(combo =>
      combo.type === ComboType.Pair &&
      combo.cards.length === 2 &&
      combo.cards.every(card => card.rank === Rank.Four && card.suit === Suit.Diamonds)
    );

    expect(fourDiamondsPair).toBeDefined();
  });

  test('4♠-4♠ forms a valid trump pair when 4♦ is trump (same rank, same suit)', () => {
    // First, check that each card is a trump
    expect(isTrump(fourSpades1, trumpInfo)).toBe(true);
    expect(isTrump(fourSpades2, trumpInfo)).toBe(true);

    // Then check that they form a pair
    const result = getComboType([fourSpades1, fourSpades2]);
    expect(result).toBe(ComboType.Pair);

    // Now check that they are identified as a combo in the hand
    const combos = identifyCombos([fourSpades1, fourSpades2, fiveSpades1], trumpInfo);

    // Find the pair combo in question
    const fourSpadesPair = combos.find(combo =>
      combo.type === ComboType.Pair &&
      combo.cards.length === 2 &&
      combo.cards.every(card => card.rank === Rank.Four && card.suit === Suit.Spades)
    );

    expect(fourSpadesPair).toBeDefined();

    // Additional test: a trump pair should beat a non-trump pair
    const compared = compareCards(fourSpades1, fiveSpades1, trumpInfo);
    expect(compared).toBeGreaterThan(0); // Trump card should win
  });

  // Invalid pair tests - different suits
  test('4♦-4♣ does NOT form a valid pair even though both are trump cards (same rank, different suits)', () => {
    // First, check that each card is a trump
    expect(isTrump(fourDiamonds1, trumpInfo)).toBe(true);
    expect(isTrump(fourClubs1, trumpInfo)).toBe(true);

    // Then check that they do NOT form a pair
    const result = getComboType([fourDiamonds1, fourClubs1]);
    expect(result).not.toBe(ComboType.Pair);

    // Should be treated as singles, not as a pair
    expect(result).toBe(ComboType.Single);

    // Check combos doesn't find a pair with these
    const combos = identifyCombos([fourDiamonds1, fourClubs1, fiveSpades1], trumpInfo);

    // Should not find a pair with diamond and club
    const invalidPair = combos.find(combo =>
      combo.type === ComboType.Pair &&
      combo.cards.length === 2 &&
      combo.cards.some(card => card.suit === Suit.Diamonds) &&
      combo.cards.some(card => card.suit === Suit.Clubs)
    );

    expect(invalidPair).toBeUndefined();
  });

  test('4♠-4♣ does NOT form a valid pair even though both are trump cards (same rank, different suits)', () => {
    // First, check that each card is a trump
    expect(isTrump(fourSpades1, trumpInfo)).toBe(true);
    expect(isTrump(fourClubs1, trumpInfo)).toBe(true);

    // Then check that they do NOT form a pair
    const result = getComboType([fourSpades1, fourClubs1]);
    expect(result).not.toBe(ComboType.Pair);

    // Should be treated as singles, not as a pair
    expect(result).toBe(ComboType.Single);

    // Check combos doesn't find a pair with these
    const combos = identifyCombos([fourSpades1, fourClubs1, fiveSpades1], trumpInfo);

    // Should not find a pair with spade and club
    const invalidPair = combos.find(combo =>
      combo.type === ComboType.Pair &&
      combo.cards.length === 2 &&
      combo.cards.some(card => card.suit === Suit.Spades) &&
      combo.cards.some(card => card.suit === Suit.Clubs)
    );

    expect(invalidPair).toBeUndefined();
  });

  test('4♠-4♥ does NOT form a valid pair even though both are trump cards (same rank, different suits)', () => {
    // Check that they do NOT form a pair
    const result = getComboType([fourSpades1, fourHearts1]);
    expect(result).not.toBe(ComboType.Pair);
  });

  // Hierarchy tests
  test('4♦-4♦ beats 4♠-4♠ when 4♦ is trump (trump hierarchy)', () => {
    // Create pairs
    const spadesPair = [fourSpades1, fourSpades2];
    const diamondsPair = [fourDiamonds1, fourDiamonds2];

    // Use a helper function to compare the first card of each pair
    // This is how the game generally compares pairs/combos
    const compared = compareCards(fourDiamonds1, fourSpades1, trumpInfo);
    expect(compared).toBeGreaterThan(0); // Diamond should win

    // Check that their value in the combos is also correctly ordered
    const combos = identifyCombos([...spadesPair, ...diamondsPair], trumpInfo);

    const spadesPairCombo = combos.find(combo =>
      combo.type === ComboType.Pair &&
      combo.cards.every(card => card.rank === Rank.Four && card.suit === Suit.Spades)
    );

    const diamondsPairCombo = combos.find(combo =>
      combo.type === ComboType.Pair &&
      combo.cards.every(card => card.rank === Rank.Four && card.suit === Suit.Diamonds)
    );

    expect(spadesPairCombo).toBeDefined();
    expect(diamondsPairCombo).toBeDefined();

    if (spadesPairCombo && diamondsPairCombo) {
      expect(diamondsPairCombo.value).toBeGreaterThan(spadesPairCombo.value);
    }
  });
});