import { isValidPlay } from '../../src/game/playValidation';
import { Card, JokerType, Rank, Suit, TrumpInfo } from '../../src/types';
import { createTrumpInfo } from '../helpers';

describe('FRV-4: Trump Unification Rules', () => {
  const createTestTrumpInfo = (trumpRank: Rank, trumpSuit: Suit): TrumpInfo => ({
    trumpRank,
    trumpSuit, 
  });

  describe('Mixed Trump Tractors', () => {

    test('FRV-4.1: Joker tractor - Big and Small Joker pairs', () => {
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Hearts);
      
      // Leading trump tractor: 5♥5♥-6♥6♥
      const leadingCombo = [
        ...Card.createPair(Suit.Hearts, Rank.Five),
        ...Card.createPair(Suit.Hearts, Rank.Six)
      ];
      
      // Player has Big Joker pair + Small Joker pair + trump suit pair
      const playerHand = [
        Card.createJoker(JokerType.Big, 0),
        Card.createJoker(JokerType.Big, 1),
        Card.createJoker(JokerType.Small, 0), 
        Card.createJoker(JokerType.Small, 1),
        ...Card.createPair(Suit.Hearts, Rank.Ace),
        Card.createCard(Suit.Diamonds, Rank.King, 0)
      ];
      
      // Joker tractor should be valid trump response
      expect(isValidPlay([
        playerHand[0], playerHand[1], playerHand[2], playerHand[3]
      ], leadingCombo, playerHand, trumpInfo)).toBe(true);
    });

    test('FRV-4.2: Cannot mix Big and Small Jokers in same pair', () => {
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Hearts);
      
      // Leading trump tractor: 5♥5♥-6♥6♥
      const leadingCombo = [
        ...Card.createPair(Suit.Hearts, Rank.Five),
        ...Card.createPair(Suit.Hearts, Rank.Six)
      ];
      
      // Player has Big Joker pair + Small Joker pair + trump suit pair
      const playerHand = [
        Card.createJoker(JokerType.Big, 0),
        Card.createJoker(JokerType.Big, 1),
        Card.createJoker(JokerType.Small, 0), 
        Card.createJoker(JokerType.Small, 1),
        ...Card.createPair(Suit.Hearts, Rank.Ace),
        Card.createCard(Suit.Diamonds, Rank.King, 0)
      ];
      
      // Cannot use BJ-BJ + A♥A♥ when joker tractor BJ-BJ + SJ-SJ available
      expect(isValidPlay([
        playerHand[0], playerHand[1], playerHand[4], playerHand[5]
      ], leadingCombo, playerHand, trumpInfo)).toBe(false);
    });

    test('FRV-4.3: Trump rank tractor - trump suit + off-suit rank pairs', () => {
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Hearts);
      
      // Leading trump tractor: 5♥5♥-6♥6♥
      const leadingCombo = [
        ...Card.createPair(Suit.Hearts, Rank.Five),
        ...Card.createPair(Suit.Hearts, Rank.Six)
      ];
      
      // Player has trump rank pairs: trump suit + off-suit
      const playerHand = [
        ...Card.createPair(Suit.Hearts, Rank.Two), // Trump rank in trump suit
        ...Card.createPair(Suit.Spades, Rank.Two), // Trump rank in off-suit
        ...Card.createPair(Suit.Clubs, Rank.Two),  // Trump rank in off-suit
        Card.createCard(Suit.Diamonds, Rank.King, 0)
      ];
      
      // Trump rank tractor should be valid
      expect(isValidPlay([
        playerHand[0], playerHand[1], playerHand[2], playerHand[3]
      ], leadingCombo, playerHand, trumpInfo)).toBe(true);
    });

    test('FRV-4.4: Cannot form rank tractor with only off-suit pairs', () => {
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Hearts);
      
      // Leading trump tractor: 5♥5♥-6♥6♥
      const leadingCombo = [
        ...Card.createPair(Suit.Hearts, Rank.Five),
        ...Card.createPair(Suit.Hearts, Rank.Six)
      ];
      
      // Player has trump suit rank pair but tries to use only off-suit pairs
      const playerHand = [
        ...Card.createPair(Suit.Hearts, Rank.Two), // Trump rank in trump suit (available)
        ...Card.createPair(Suit.Spades, Rank.Two), // Trump rank (off-suit)
        ...Card.createPair(Suit.Clubs, Rank.Two),  // Trump rank (off-suit)
        Card.createCard(Suit.Diamonds, Rank.King, 0)
      ];
      
      // Cannot use only off-suit rank pairs when trump suit rank pair available
      expect(isValidPlay([
        playerHand[2], playerHand[3], playerHand[4], playerHand[5]
      ], leadingCombo, playerHand, trumpInfo)).toBe(false);
    });

    test('FRV-4.5: Skip-rank tractor - trump rank bridges gap', () => {
      const trumpInfo = createTestTrumpInfo(Rank.Seven, Suit.Hearts);
      
      // Leading trump tractor: 3♥3♥-4♥4♥
      const leadingCombo = [
        ...Card.createPair(Suit.Hearts, Rank.Three),
        ...Card.createPair(Suit.Hearts, Rank.Four)
      ];
      
      // Player has 5♥5♥-6♥6♥-9♥9♥-K♦
      const playerHand = [
        ...Card.createPair(Suit.Hearts, Rank.Five),
        ...Card.createPair(Suit.Hearts, Rank.Six),
        ...Card.createPair(Suit.Hearts, Rank.Nine),
        Card.createCard(Suit.Diamonds, Rank.King, 0)
      ];
      
      // 5♥5♥-6♥6♥ is valid (consecutive pairs)
      expect(isValidPlay([
        playerHand[0], playerHand[1], playerHand[2], playerHand[3]
      ], leadingCombo, playerHand, trumpInfo)).toBe(true);
    });

    test('FRV-4.6: Cannot form skip-rank without trump rank bridge', () => {
      const trumpInfo = createTestTrumpInfo(Rank.Seven, Suit.Hearts);
      
      // Leading trump tractor: 3♥3♥-4♥4♥
      const leadingCombo = [
        ...Card.createPair(Suit.Hearts, Rank.Three),
        ...Card.createPair(Suit.Hearts, Rank.Four)
      ];
      
      // Player has 5♥5♥-6♥6♥-9♥9♥-K♦
      const playerHand = [
        ...Card.createPair(Suit.Hearts, Rank.Five),
        ...Card.createPair(Suit.Hearts, Rank.Six),
        ...Card.createPair(Suit.Hearts, Rank.Nine),
        Card.createCard(Suit.Diamonds, Rank.King, 0)
      ];
      
      // 6♥6♥-9♥9♥ is invalid (gap 6-[7,8]-9 too big)
      expect(isValidPlay([
        playerHand[2], playerHand[3], playerHand[4], playerHand[5]
      ], leadingCombo, playerHand, trumpInfo)).toBe(false);
    });

    test('FRV-4.7: Must use trump tractor when available', () => {
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Hearts);
      
      // Leading trump tractor: 5♥5♥-6♥6♥
      const leadingCombo = [
        ...Card.createPair(Suit.Hearts, Rank.Five),
        ...Card.createPair(Suit.Hearts, Rank.Six)
      ];
      
      // Player has trump tractor + non-trump pairs
      const playerHand = [
        ...Card.createPair(Suit.Hearts, Rank.Three), // Trump suit pair
        ...Card.createPair(Suit.Hearts, Rank.Four),  // Trump suit pair (forms tractor)
        ...Card.createPair(Suit.Clubs, Rank.Ace),    // Non-trump pair
        Card.createCard(Suit.Diamonds, Rank.King, 0)
      ];
      
      // Cannot skip trump tractor for non-trump pairs
      expect(isValidPlay([
        playerHand[0], playerHand[1], playerHand[4], playerHand[5]
      ], leadingCombo, playerHand, trumpInfo)).toBe(false);
    });

    test('FRV-4.8: Using trump tractor when available', () => {
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Hearts);
      
      // Leading trump tractor: 5♥5♥-6♥6♥
      const leadingCombo = [
        ...Card.createPair(Suit.Hearts, Rank.Five),
        ...Card.createPair(Suit.Hearts, Rank.Six)
      ];
      
      // Player has trump tractor + non-trump pairs
      const playerHand = [
        ...Card.createPair(Suit.Hearts, Rank.Three), // Trump suit pair
        ...Card.createPair(Suit.Hearts, Rank.Four),  // Trump suit pair (forms tractor)
        ...Card.createPair(Suit.Clubs, Rank.Ace),    // Non-trump pair
        Card.createCard(Suit.Diamonds, Rank.King, 0)
      ];
      
      // Must use trump tractor when available
      expect(isValidPlay([
        playerHand[0], playerHand[1], playerHand[2], playerHand[3]
      ], leadingCombo, playerHand, trumpInfo)).toBe(true);
    });
  });
});