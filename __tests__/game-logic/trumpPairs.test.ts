import {
  getComboType,
  identifyCombos,
  isTrump,
  compareCards,
  compareCardCombos,
  determineTrickWinner
} from '../../src/utils/gameLogic';
import {
  Card,
  ComboType,
  JokerType,
  Rank,
  Suit,
  TrumpInfo
} from '../../src/types/game';

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

// Add more test cards for additional scenarios
const sixSpades1: Card = {
  suit: Suit.Spades,
  rank: Rank.Six,
  id: 'Spades_6_1',
  points: 0
};

const sevenClubs1: Card = {
  suit: Suit.Clubs,
  rank: Rank.Seven,
  id: 'Clubs_7_1',
  points: 0
};

const sevenHearts1: Card = {
  suit: Suit.Hearts,
  rank: Rank.Seven,
  id: 'Hearts_7_1',
  points: 0
};

const smallJoker1: Card = {
  joker: JokerType.Small,
  id: 'Small_Joker_1',
  points: 0
};

const smallJoker2: Card = {
  joker: JokerType.Small,
  id: 'Small_Joker_2',
  points: 0
};

const bigJoker1: Card = {
  joker: JokerType.Big,
  id: 'Big_Joker_1',
  points: 0
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

  // Additional tests for different card combinations

  // Test - Same suit but different rank
  test('5♠-6♠ does NOT form a valid pair (same suit, different rank)', () => {
    const result = getComboType([fiveSpades1, sixSpades1]);
    expect(result).not.toBe(ComboType.Pair);

    // Should be treated as singles
    expect(result).toBe(ComboType.Single);

    // Check identifyCombos doesn't find a pair with these
    const combos = identifyCombos([fiveSpades1, sixSpades1], trumpInfo);

    const invalidPair = combos.find(combo =>
      combo.type === ComboType.Pair &&
      combo.cards.length === 2 &&
      combo.cards.some(card => card.rank === Rank.Five) &&
      combo.cards.some(card => card.rank === Rank.Six)
    );

    expect(invalidPair).toBeUndefined();
  });

  // Test - Non-trump cards of different suits
  test('7♣-7♥ does NOT form a valid pair (same rank, different suits, non-trump)', () => {
    // Verify these aren't trump cards
    expect(isTrump(sevenClubs1, trumpInfo)).toBe(false);
    expect(isTrump(sevenHearts1, trumpInfo)).toBe(false);

    // Check they don't form a pair
    const result = getComboType([sevenClubs1, sevenHearts1]);
    expect(result).not.toBe(ComboType.Pair);

    // Should be treated as singles
    expect(result).toBe(ComboType.Single);
  });

  // Test - Valid joker pair
  test('SJ-SJ forms a valid pair (same joker type)', () => {
    const result = getComboType([smallJoker1, smallJoker2]);
    expect(result).toBe(ComboType.Pair);

    // Should be found as a pair in combos
    const combos = identifyCombos([smallJoker1, smallJoker2], trumpInfo);

    const smallJokerPair = combos.find(combo =>
      combo.type === ComboType.Pair &&
      combo.cards.length === 2 &&
      combo.cards.every(card => card.joker === JokerType.Small)
    );

    expect(smallJokerPair).toBeDefined();
  });

  // Test - Different joker types
  test('SJ-BJ does NOT form a valid pair (different joker types)', () => {
    const result = getComboType([smallJoker1, bigJoker1]);
    expect(result).not.toBe(ComboType.Pair);

    // Should be treated as singles
    expect(result).toBe(ComboType.Single);

    // Should not be found as a pair in combos
    const combos = identifyCombos([smallJoker1, bigJoker1], trumpInfo);

    const invalidJokerPair = combos.find(combo =>
      combo.type === ComboType.Pair &&
      combo.cards.length === 2 &&
      combo.cards.some(card => card.joker === JokerType.Small) &&
      combo.cards.some(card => card.joker === JokerType.Big)
    );

    expect(invalidJokerPair).toBeUndefined();
  });

  // Test for Issue #34 - Non-trump pair from different suits should not beat a leading non-trump pair
  test('A non-trump pair from different suits should not beat a leading non-trump pair', () => {
    // Create a new trumpInfo where 5's aren't trump
    const nonFiveTrumpInfo: TrumpInfo = {
      trumpRank: Rank.Seven,
      trumpSuit: Suit.Diamonds,
      declared: true
    };

    // Create a proper pair of five spades (non-trump)
    const properPair = [fiveSpades1, fiveSpades2];
    
    // Create an "invalid pair" of same rank but different suits (also non-trump)
    const invalidPair = [
      {
        suit: Suit.Hearts,
        rank: Rank.Five,
        id: 'Hearts_5_1',
        points: 5
      },
      {
        suit: Suit.Clubs,
        rank: Rank.Five,
        id: 'Clubs_5_1',
        points: 5
      }
    ];

    // Verify proper pair is actually a pair
    expect(getComboType(properPair)).toBe(ComboType.Pair);
    
    // Verify mixed-suit "pair" is not actually a pair
    expect(getComboType(invalidPair)).toBe(ComboType.Single);
    
    // Test the key scenario - proper pair should beat mixed-suit non-pair
    const comparison = compareCardCombos(properPair, invalidPair, nonFiveTrumpInfo);
    expect(comparison).toBeGreaterThan(0); // properPair should win
  });

  // Test for the scenario where a higher rank pair should not win against a leading pair of a different suit
  test('When comparing pairs from different suits, the leading pair always wins regardless of rank', () => {
    // Create a trumpInfo where 2 is the trump rank and diamonds is the trump suit
    const trumpTwoDiamonds: TrumpInfo = {
      trumpRank: Rank.Two,
      trumpSuit: Suit.Diamonds,
      declared: true
    };

    // Create a pair of fives (lower rank, non-trump)
    const fivePair = [fiveSpades1, fiveSpades2];
    
    // Create a pair of tens (higher rank, non-trump)
    const tenPair = [
      {
        suit: Suit.Clubs,
        rank: Rank.Ten,
        id: 'Clubs_10_1',
        points: 10
      },
      {
        suit: Suit.Clubs,
        rank: Rank.Ten,
        id: 'Clubs_10_2',
        points: 10
      }
    ];

    // Verify both are proper pairs
    expect(getComboType(fivePair)).toBe(ComboType.Pair);
    expect(getComboType(tenPair)).toBe(ComboType.Pair);
    
    // Verify neither contains trump cards
    fivePair.forEach(card => {
      expect(isTrump(card, trumpTwoDiamonds)).toBe(false);
    });
    
    tenPair.forEach(card => {
      expect(isTrump(card, trumpTwoDiamonds)).toBe(false);
    });
    
    // We know that Ten is a higher rank than Five (based on the Rank enum ordering)
    // This is just to confirm our test premise without using the private compareRanks function
    
    // In Shengji, when comparing pairs from different suits, 
    // the leading pair always wins (when no trumps are involved)
    const comparison = compareCardCombos(fivePair, tenPair, trumpTwoDiamonds);
    expect(comparison).toBeGreaterThan(0); // Leading pair (fivePair) should win
  });
  
  // Test for the scenario where a higher rank pair of the same suit wins
  test('When comparing pairs from the same suit, the higher rank pair should win', () => {
    const trumpTwoDiamonds: TrumpInfo = {
      trumpRank: Rank.Two,
      trumpSuit: Suit.Diamonds,
      declared: true
    };

    // Create a pair of fives (lower rank, same suit)
    const fivePair = [fiveSpades1, fiveSpades2];
    
    // Create a pair of sixes (higher rank, same suit)
    const sixPair = [
      sixSpades1,
      {
        suit: Suit.Spades,
        rank: Rank.Six,
        id: 'Spades_6_2',
        points: 0
      }
    ];

    // Verify both are proper pairs and from the same suit
    expect(getComboType(fivePair)).toBe(ComboType.Pair);
    expect(getComboType(sixPair)).toBe(ComboType.Pair);
    expect(fivePair[0].suit).toBe(sixPair[0].suit);
    
    // We know that Six is a higher rank than Five (based on the Rank enum ordering)
    // This is just to confirm our test premise without using the private compareRanks function
    
    // When comparing pairs from the same suit, the higher rank pair should win
    const comparison = compareCardCombos(fivePair, sixPair, trumpTwoDiamonds);
    expect(comparison).toBeLessThan(0); // Higher rank pair (sixPair) should win
  });
});