import { isValidPlay } from '../../src/game/playValidation';
import { Card, Rank, Suit, TrumpInfo } from '../../src/types';

describe('FRV-8: Trump Edge Cases', () => {
  const createTestTrumpInfo = (trumpRank: Rank, trumpSuit: Suit): TrumpInfo => ({
    trumpRank,
    trumpSuit, 
  });

  describe('Trump Following Edge Cases', () => {
    test('FRV-8.1: trump singles should be valid when no trump pairs available', () => {
      // NOTE: This test verifies that two single trump cards are valid play when no trump pairs available
      
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Spades);
      
      // Player has A♠ and Q♠ in hand (both trump cards due to trump suit)
      const playerHand = [
        Card.createCard(Suit.Spades, Rank.Ace, 0),
        Card.createCard(Suit.Spades, Rank.Queen, 0),
        Card.createCard(Suit.Hearts, Rank.Seven, 0)
      ];

      // Leading with a pair of 5♠
      const leadingCombo = Card.createPair(Suit.Spades, Rank.Five);

      // Playing A♠-Q♠ (which is not a valid pair, just two singles)
      const playedCards = [
        Card.createCard(Suit.Spades, Rank.Ace, 0),
        Card.createCard(Suit.Spades, Rank.Queen, 0)
      ];

      // The play is VALID (player has trumps and must play them)
      expect(isValidPlay(playedCards, leadingCombo, playerHand, trumpInfo)).toBe(true);
    });

    test('FRV-8.2: non-trump pairs should be invalid when trump cards available', () => {
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Spades);
      
      // Leading with a pair of 5♠ (trump suit)
      const leadingCombo = Card.createPair(Suit.Spades, Rank.Five);

      // Player hand has trump cards available but tries to play non-trump pair
      const playerHand = [
        Card.createCard(Suit.Spades, Rank.Ace, 0), // Trump card available
        ...Card.createPair(Suit.Hearts, Rank.Seven) // Non-trump pair
      ];

      const nonTrumpPairPlay = Card.createPair(Suit.Hearts, Rank.Seven);

      // Should be invalid - must play trump when trump is led and trump cards are available
      expect(isValidPlay(nonTrumpPairPlay, leadingCombo, playerHand, trumpInfo)).toBe(false);
    });
  });
});