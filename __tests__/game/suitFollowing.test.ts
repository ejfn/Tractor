import { isValidPlay } from '../../src/game/playValidation';
import { Card, Rank, Suit, TrumpInfo } from '../../src/types';

describe('FRV-4: Suit Following Fundamentals', () => {
  const createTestTrumpInfo = (trumpRank: Rank, trumpSuit: Suit): TrumpInfo => ({
    trumpRank,
    trumpSuit, 
  });

  describe('Following Rules', () => {
    test('FRV-4.1: When following, single card play should be invalid for pair lead', () => {
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Spades);
      const leadingCombo = Card.createPair(Suit.Hearts, Rank.Three);
      const playerHand = [
        ...Card.createPair(Suit.Hearts, Rank.Seven),
        Card.createCard(Suit.Clubs, Rank.Eight, 0)
      ];
      
      // Single card invalid for pair lead
      expect(isValidPlay([playerHand[0]], leadingCombo, playerHand, trumpInfo)).toBe(false);
    });

    test('FRV-4.2: When following, two cards should match pair lead length', () => {
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Spades);
      const leadingCombo = Card.createPair(Suit.Hearts, Rank.Three);
      const playerHand = [
        ...Card.createPair(Suit.Hearts, Rank.Seven),
        Card.createCard(Suit.Clubs, Rank.Eight, 0)
      ];
      
      // Two cards valid for pair lead
      expect(isValidPlay([playerHand[0], playerHand[1]], leadingCombo, playerHand, trumpInfo)).toBe(true);
    });

    test('FRV-4.3: When following a pair, must use same suit pair when available', () => {
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Spades);
      const leadingCombo = Card.createPair(Suit.Hearts, Rank.Three);
      const playerHand = [
        ...Card.createPair(Suit.Hearts, Rank.Seven),
        Card.createCard(Suit.Hearts, Rank.Eight, 0),
        Card.createCard(Suit.Clubs, Rank.Nine, 0)
      ];
      
      // Must use the Hearts pair
      expect(isValidPlay([playerHand[0], playerHand[1]], leadingCombo, playerHand, trumpInfo)).toBe(true);
    });

    test('FRV-4.4: When following a pair, cannot mix suits when same suit pair available', () => {
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Spades);
      const leadingCombo = Card.createPair(Suit.Hearts, Rank.Three);
      const playerHand = [
        ...Card.createPair(Suit.Hearts, Rank.Seven),
        Card.createCard(Suit.Hearts, Rank.Eight, 0),
        Card.createCard(Suit.Clubs, Rank.Nine, 0)
      ];
      
      // Cannot mix Hearts with Clubs when Hearts pair available
      expect(isValidPlay([playerHand[0], playerHand[3]], leadingCombo, playerHand, trumpInfo)).toBe(false);
    });

    test('FRV-4.5: When cannot form matching combo, must include leading suit card', () => {
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Spades);
      const leadingCombo = Card.createPair(Suit.Hearts, Rank.Three);
      const playerHand = [
        Card.createCard(Suit.Hearts, Rank.Seven, 0), // Only one Hearts card
        Card.createCard(Suit.Clubs, Rank.Eight, 0),
        Card.createCard(Suit.Diamonds, Rank.Nine, 0)
      ];
      
      // Must use the Hearts card + one other
      expect(isValidPlay([playerHand[0], playerHand[1]], leadingCombo, playerHand, trumpInfo)).toBe(true);
    });

    test('FRV-4.6: When cannot form matching combo, cannot skip leading suit card', () => {
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Spades);
      const leadingCombo = Card.createPair(Suit.Hearts, Rank.Three);
      const playerHand = [
        Card.createCard(Suit.Hearts, Rank.Seven, 0), // Only one Hearts card
        Card.createCard(Suit.Clubs, Rank.Eight, 0),
        Card.createCard(Suit.Diamonds, Rank.Nine, 0)
      ];
      
      // Cannot skip the Hearts card
      expect(isValidPlay([playerHand[1], playerHand[2]], leadingCombo, playerHand, trumpInfo)).toBe(false);
    });

    test('FRV-4.7: When void in leading suit, can play any valid combination - option 1', () => {
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Spades);
      const leadingCombo = Card.createPair(Suit.Hearts, Rank.Three);
      const playerHand = [
        Card.createCard(Suit.Clubs, Rank.Seven, 0),
        Card.createCard(Suit.Clubs, Rank.Eight, 0),
        Card.createCard(Suit.Diamonds, Rank.Nine, 0)
      ];
      
      // No Hearts cards, so Clubs combo is valid
      expect(isValidPlay([playerHand[0], playerHand[1]], leadingCombo, playerHand, trumpInfo)).toBe(true);
    });

    test('FRV-4.8: When void in leading suit, can play any valid combination - option 2', () => {
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Spades);
      const leadingCombo = Card.createPair(Suit.Hearts, Rank.Three);
      const playerHand = [
        Card.createCard(Suit.Clubs, Rank.Seven, 0),
        Card.createCard(Suit.Clubs, Rank.Eight, 0),
        Card.createCard(Suit.Diamonds, Rank.Nine, 0)
      ];
      
      // No Hearts cards, so mixed combo is valid
      expect(isValidPlay([playerHand[0], playerHand[2]], leadingCombo, playerHand, trumpInfo)).toBe(true);
    });

    test('FRV-4.9: Must play all leading suit cards even if insufficient - correct play', () => {
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Spades);
      const leadingCombo = [
        Card.createCard(Suit.Hearts, Rank.Three, 0),
        Card.createCard(Suit.Hearts, Rank.Three, 1),
        Card.createCard(Suit.Hearts, Rank.Three, 0),
        Card.createCard(Suit.Hearts, Rank.Three, 1)
      ]; // 4-card combo
      
      const playerHand = [
        Card.createCard(Suit.Hearts, Rank.Seven, 0),
        Card.createCard(Suit.Hearts, Rank.Eight, 0), // Only 2 Hearts cards
        Card.createCard(Suit.Clubs, Rank.Nine, 0),
        Card.createCard(Suit.Diamonds, Rank.Ten, 0)
      ];
      
      // Must use both Hearts cards + 2 others
      expect(isValidPlay([
        playerHand[0], playerHand[1], playerHand[2], playerHand[3]
      ], leadingCombo, playerHand, trumpInfo)).toBe(true);
    });

    test('FRV-4.10: Must play all leading suit cards - order variation 1', () => {
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Spades);
      const leadingCombo = [
        Card.createCard(Suit.Hearts, Rank.Three, 0),
        Card.createCard(Suit.Hearts, Rank.Three, 1),
        Card.createCard(Suit.Hearts, Rank.Three, 0),
        Card.createCard(Suit.Hearts, Rank.Three, 1)
      ]; // 4-card combo
      
      const playerHand = [
        Card.createCard(Suit.Hearts, Rank.Seven, 0),
        Card.createCard(Suit.Hearts, Rank.Eight, 0), // Only 2 Hearts cards
        Card.createCard(Suit.Clubs, Rank.Nine, 0),
        Card.createCard(Suit.Diamonds, Rank.Ten, 0)
      ];
      
      // Order doesn't matter as long as all Hearts included
      expect(isValidPlay([
        playerHand[0], playerHand[2], playerHand[3], playerHand[1]
      ], leadingCombo, playerHand, trumpInfo)).toBe(true);
    });

    test('FRV-4.11: Must play all leading suit cards - order variation 2', () => {
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Spades);
      const leadingCombo = [
        Card.createCard(Suit.Hearts, Rank.Three, 0),
        Card.createCard(Suit.Hearts, Rank.Three, 1),
        Card.createCard(Suit.Hearts, Rank.Three, 0),
        Card.createCard(Suit.Hearts, Rank.Three, 1)
      ]; // 4-card combo
      
      const playerHand = [
        Card.createCard(Suit.Hearts, Rank.Seven, 0),
        Card.createCard(Suit.Hearts, Rank.Eight, 0), // Only 2 Hearts cards
        Card.createCard(Suit.Clubs, Rank.Nine, 0),
        Card.createCard(Suit.Diamonds, Rank.Ten, 0)
      ];
      
      // Order doesn't matter as long as all Hearts included
      expect(isValidPlay([
        playerHand[2], playerHand[3], playerHand[0], playerHand[1] 
      ], leadingCombo, playerHand, trumpInfo)).toBe(true);
    });
  });
});