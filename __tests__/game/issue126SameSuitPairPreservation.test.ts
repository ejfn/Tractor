import { isValidPlay } from '../../src/game/playValidation';
import { Card, Rank, Suit, TrumpInfo } from '../../src/types';
import { createTrumpInfo } from '../helpers';

describe('FRV-3: Issue #126: Same-suit pair preservation when following tractors', () => {
  let trumpInfo: TrumpInfo;

  beforeEach(() => {
    trumpInfo = createTrumpInfo(Rank.Two, Suit.Spades);
  });

  describe('Core bug fix: Reject breaking same-suit pairs', () => {
    test('FRV-3.1: should REJECT breaking same-suit (Hearts) pairs when following Hearts tractor', () => {
      // AI leads 7♥7♥-8♥8♥ (Hearts tractor)
      const leadingCombo = [
        ...Card.createPair(Suit.Hearts, Rank.Seven),
        ...Card.createPair(Suit.Hearts, Rank.Eight),
      ];

      // Human has 9♥9♥ (Hearts pair) + other cards
      const playerHand = [
        ...Card.createPair(Suit.Hearts, Rank.Nine),
        ...Card.createPair(Suit.Spades, Rank.Ace),
        ...Card.createPair(Suit.Clubs, Rank.King),
        Card.createCard(Suit.Diamonds, Rank.Queen, 0),
        Card.createCard(Suit.Diamonds, Rank.Jack, 0),
      ];

      // ❌ INVALID: Breaking same-suit (Hearts) pairs
      const invalidPlay = [
        Card.createCard(Suit.Hearts, Rank.Nine, 0), // Breaks 9♥-9♥ pair
        Card.createCard(Suit.Spades, Rank.Ace, 0),
        Card.createCard(Suit.Clubs, Rank.King, 0),
        Card.createCard(Suit.Diamonds, Rank.Queen, 0),
      ];

      expect(isValidPlay(invalidPlay, leadingCombo, playerHand, trumpInfo)).toBe(false);
    });

    test('FRV-3.2: should REJECT breaking Hearts pair when singles available', () => {
      const leadingCombo = [
        ...Card.createPair(Suit.Hearts, Rank.Seven),
        ...Card.createPair(Suit.Hearts, Rank.Eight),
      ];

      const playerHand = [
        Card.createCard(Suit.Hearts, Rank.Nine, 0),
        Card.createCard(Suit.Hearts, Rank.Nine, 1),  // Different deck for valid pair
        Card.createCard(Suit.Hearts, Rank.Six, 0),
        Card.createCard(Suit.Hearts, Rank.Five, 0),
        Card.createCard(Suit.Spades, Rank.Ace, 0),
        Card.createCard(Suit.Spades, Rank.Ace, 1),  // Different deck for valid pair
        Card.createCard(Suit.Clubs, Rank.King, 0),
        Card.createCard(Suit.Clubs, Rank.King, 1),  // Different deck for valid pair
      ];

      // ❌ INVALID: Breaking Hearts pair when singles available
      const invalidPlay = [
        Card.createCard(Suit.Hearts, Rank.Nine, 0), // Breaks 9♥-9♥ pair
        Card.createCard(Suit.Hearts, Rank.Six, 0),
        Card.createCard(Suit.Hearts, Rank.Five, 0),
        Card.createCard(Suit.Spades, Rank.Ace, 0),
      ];

      expect(isValidPlay(invalidPlay, leadingCombo, playerHand, trumpInfo)).toBe(false);
    });

    test('FRV-3.3: should REJECT breaking pair unnecessarily when excess Hearts available', () => {
      const leadingCombo = [
        ...Card.createPair(Suit.Hearts, Rank.Seven),
        ...Card.createPair(Suit.Hearts, Rank.Eight),
      ];

      const playerHand = [
        Card.createCard(Suit.Hearts, Rank.Nine, 0),
        Card.createCard(Suit.Hearts, Rank.Nine, 1),  // Different deck for valid pair
        Card.createCard(Suit.Hearts, Rank.Six, 0),
        Card.createCard(Suit.Hearts, Rank.Five, 0),
        Card.createCard(Suit.Hearts, Rank.Four, 0),
        Card.createCard(Suit.Spades, Rank.Ace, 0),
        Card.createCard(Suit.Clubs, Rank.King, 0),
      ];

      // ❌ INVALID: Breaking pair unnecessarily
      const invalidPlay = [
        Card.createCard(Suit.Hearts, Rank.Nine, 0), // Breaks pair unnecessarily
        Card.createCard(Suit.Hearts, Rank.Six, 0),
        Card.createCard(Suit.Hearts, Rank.Five, 0),
        Card.createCard(Suit.Hearts, Rank.Four, 0),
      ];

      expect(isValidPlay(invalidPlay, leadingCombo, playerHand, trumpInfo)).toBe(false);
    });

    test('FRV-3.4: should REJECT breaking Hearts pair when insufficient Hearts total', () => {
      const leadingCombo = [
        ...Card.createPair(Suit.Hearts, Rank.Seven),
        ...Card.createPair(Suit.Hearts, Rank.Eight),
      ];

      const playerHand = [
        Card.createCard(Suit.Hearts, Rank.Nine, 0),
        Card.createCard(Suit.Hearts, Rank.Nine, 1),  // Different deck for valid pair
        Card.createCard(Suit.Hearts, Rank.Six, 0),
        Card.createCard(Suit.Spades, Rank.Ace, 0),
        Card.createCard(Suit.Spades, Rank.Ace, 1),  // Different deck for valid pair
        Card.createCard(Suit.Clubs, Rank.King, 0),
        Card.createCard(Suit.Clubs, Rank.King, 1),  // Different deck for valid pair
        Card.createCard(Suit.Diamonds, Rank.Queen, 0),
      ];

      // ❌ INVALID: Breaking Hearts pair when insufficient Hearts total
      const invalidPlay = [
        Card.createCard(Suit.Hearts, Rank.Nine, 0), // Breaks pair unnecessarily
        Card.createCard(Suit.Hearts, Rank.Six, 0),
        Card.createCard(Suit.Spades, Rank.Ace, 0),
        Card.createCard(Suit.Clubs, Rank.King, 0),
      ];

      expect(isValidPlay(invalidPlay, leadingCombo, playerHand, trumpInfo)).toBe(false);
    });
  });

  describe('Trump combination following (same rules apply)', () => {
    test('FRV-3.5: should enforce same-suit pair preservation for trump combinations', () => {
      // Trump rank 2, Spades trump - use valid consecutive trump suit tractor
      const leadingCombo = [
        Card.createCard(Suit.Spades, Rank.Four, 0), // Trump suit
        Card.createCard(Suit.Spades, Rank.Four, 1),  // Different deck for valid pair
        Card.createCard(Suit.Spades, Rank.Five, 0), // Trump suit (consecutive)
        Card.createCard(Suit.Spades, Rank.Five, 1),  // Different deck for valid pair
      ];

      const playerHand = [
        Card.createCard(Suit.Spades, Rank.Six, 0), // Trump suit pair
        Card.createCard(Suit.Spades, Rank.Six, 1),  // Different deck for valid pair
        Card.createCard(Suit.Spades, Rank.Seven, 0), // Trump suit single
        Card.createCard(Suit.Hearts, Rank.Ace, 0),
        Card.createCard(Suit.Hearts, Rank.King, 0),
        Card.createCard(Suit.Clubs, Rank.Queen, 0),
        Card.createCard(Suit.Diamonds, Rank.Jack, 0),
      ];

      // ❌ INVALID: Breaking trump pair when trump is led
      const invalidPlay = [
        Card.createCard(Suit.Spades, Rank.Six, 0), // Breaks trump pair
        Card.createCard(Suit.Spades, Rank.Seven, 0),
        Card.createCard(Suit.Hearts, Rank.Ace, 0),
        Card.createCard(Suit.Hearts, Rank.King, 0),
      ];

      // Trump pair preservation should work the same as non-trump pair preservation
      const result = isValidPlay(invalidPlay, leadingCombo, playerHand, trumpInfo);
      
      // Should reject breaking trump pairs unnecessarily, same as non-trump pairs
      expect(result).toBe(false);
    });
  });
});