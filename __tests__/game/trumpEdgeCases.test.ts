import { getComboType } from '../../src/game/comboDetection';
import { isValidPlay } from '../../src/game/playValidation';
import { Card, ComboType, Rank, Suit, TrumpInfo } from '../../src/types';

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
      
      // Leading with a pair of 5♠
      const leadingCombo = Card.createPair(Suit.Spades, Rank.Five);

      // For comparison, a valid pair would NOT be allowed when trump cards are available (Issue #102 fix)
      const validPairHand = [
        Card.createCard(Suit.Spades, Rank.Ace, 0),
        ...Card.createPair(Suit.Hearts, Rank.Seven)
      ];

      const validPairPlay = Card.createPair(Suit.Hearts, Rank.Seven);

      // Confirm a proper pair would NOT be allowed when trump cards are available (Issue #102 fix)
      expect(getComboType(validPairPlay, trumpInfo)).toBe(ComboType.Pair);
      expect(isValidPlay(validPairPlay, leadingCombo, validPairHand, trumpInfo)).toBe(false);
    });
  });
});