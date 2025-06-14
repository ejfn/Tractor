import { isValidPlay } from '../../src/game/playValidation';
import { Card, Rank, Suit, TrumpInfo } from '../../src/types';

describe('FRV-7: Non-Trump Suit Edge Cases', () => {
  const createTestTrumpInfo = (trumpRank: Rank, trumpSuit: Suit): TrumpInfo => ({
    trumpRank,
    trumpSuit, 
  });

  describe('Non-Trump Suit Following with Singles Available', () => {
    test('FRV-7.1: should not allow non-suit pairs when suit singles available', () => {
      // Test the same rule but with non-trump suits (Hearts led, player has Hearts singles + Clubs pair)
      
      // Set up trump info: Diamonds trump, rank 2
      const trumpInfo: TrumpInfo = {
        trumpRank: Rank.Two,
        trumpSuit: Suit.Diamonds,
      };
      
      // Leading Hearts pair (3♥-3♥) - non-trump
      const leadingHeartsPair: Card[] = Card.createPair(Suit.Hearts, Rank.Three);
      
      // Player hand with ONLY ONE Hearts single + Clubs pair + other cards
      const playerHand: Card[] = [
        // Only ONE Hearts single (leading suit)
        Card.createCard(Suit.Hearts, Rank.Four, 0),
        // Clubs pair (different non-trump suit)
        ...Card.createPair(Suit.Clubs, Rank.Six),
        // Other cards
        Card.createCard(Suit.Spades, Rank.Seven, 0)
      ];
      
      // Non-suit pair should be INVALID when suit singles are available
      const nonSuitPair = [playerHand[1], playerHand[2]]; // 6♣-6♣
      const nonSuitPairValid = isValidPlay(
        nonSuitPair,
        leadingHeartsPair,
        playerHand,
        trumpInfo
      );
      
      expect(nonSuitPairValid).toBe(false); // Should be invalid - must use leading suit when available
    });

    test('FRV-7.2: should allow mixed play using all available leading suit cards', () => {
      // Test the same rule but with non-trump suits (Hearts led, player has Hearts singles + Clubs pair)
      
      // Set up trump info: Diamonds trump, rank 2
      const trumpInfo: TrumpInfo = {
        trumpRank: Rank.Two,
        trumpSuit: Suit.Diamonds,
      };
      
      // Leading Hearts pair (3♥-3♥) - non-trump
      const leadingHeartsPair: Card[] = Card.createPair(Suit.Hearts, Rank.Three);
      
      // Player hand with ONLY ONE Hearts single + Clubs pair + other cards
      const playerHand: Card[] = [
        // Only ONE Hearts single (leading suit)
        Card.createCard(Suit.Hearts, Rank.Four, 0),
        // Clubs pair (different non-trump suit)
        ...Card.createPair(Suit.Clubs, Rank.Six),
        // Other cards
        Card.createCard(Suit.Spades, Rank.Seven, 0)
      ];
      
      // Suit single + other card should be VALID (must use all leading suit)
      const suitSinglePlusOther = [playerHand[0], playerHand[3]]; // 4♥, 7♠
      const mixedValid = isValidPlay(
        suitSinglePlusOther,
        leadingHeartsPair,
        playerHand,
        trumpInfo
      );
      
      expect(mixedValid).toBe(true); // Should be valid - using all available leading suit cards
    });
  });
});