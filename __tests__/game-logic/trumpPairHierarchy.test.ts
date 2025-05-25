import { compareCardCombos } from '../../src/utils/gameLogic';
import { Card, Suit, Rank, TrumpInfo, JokerType } from '../../src/types/game';
import { createCard, createJoker, createPair } from '../helpers/testUtils';

describe('Trump Pair Hierarchy Tests', () => {
  // Test case for issue #49: Trump rank pairs vs trump suit pairs
  describe('Issue #49: Trump rank pairs should beat trump suit pairs of different ranks', () => {
    const trumpInfo: TrumpInfo = {
      trumpRank: Rank.Two,
      trumpSuit: Suit.Spades,
      declared: true,
      declarerPlayerId: 'test',
    };

    test('2♣-2♣ pair should beat Q♠-Q♠ pair (trump rank vs trump suit)', () => {
      const trumpRankPair = createPair(Suit.Clubs, Rank.Two);
      const trumpSuitPair = createPair(Suit.Spades, Rank.Queen);

      // Trump rank pair should win over trump suit pair
      const result = compareCardCombos(trumpRankPair, trumpSuitPair, trumpInfo);
      expect(result).toBeGreaterThan(0); // trumpRankPair wins
    });

    test('2♥-2♥ pair should beat A♠-A♠ pair (trump rank vs trump suit)', () => {
      const trumpRankPair = createPair(Suit.Hearts, Rank.Two);
      const trumpSuitPair = createPair(Suit.Spades, Rank.Ace);

      const result = compareCardCombos(trumpRankPair, trumpSuitPair, trumpInfo);
      expect(result).toBeGreaterThan(0); // trumpRankPair wins
    });

    test('2♦-2♦ pair should beat 3♠-3♠ pair (trump rank vs trump suit)', () => {
      const trumpRankPair = createPair(Suit.Diamonds, Rank.Two);
      const trumpSuitPair = createPair(Suit.Spades, Rank.Three);

      const result = compareCardCombos(trumpRankPair, trumpSuitPair, trumpInfo);
      expect(result).toBeGreaterThan(0); // trumpRankPair wins
    });
  });

  describe('Complete trump pair hierarchy verification', () => {
    const trumpInfo: TrumpInfo = {
      trumpRank: Rank.Two,
      trumpSuit: Suit.Spades,
      declared: true,
      declarerPlayerId: 'test',
    };

    test('2♠-2♠ pair should beat 2♣-2♣ pair (trump rank in trump suit vs other suits)', () => {
      const trumpRankInTrumpSuit = createPair(Suit.Spades, Rank.Two);
      const trumpRankInOtherSuit = createPair(Suit.Clubs, Rank.Two);

      const result = compareCardCombos(trumpRankInTrumpSuit, trumpRankInOtherSuit, trumpInfo);
      expect(result).toBeGreaterThan(0); // trump suit trump rank wins
    });

    test('Small Joker pair should beat 2♠-2♠ pair', () => {
      const smallJokerPair = [createJoker(JokerType.Small), createJoker(JokerType.Small)];
      const trumpRankInTrumpSuit = createPair(Suit.Spades, Rank.Two);

      const result = compareCardCombos(smallJokerPair, trumpRankInTrumpSuit, trumpInfo);
      expect(result).toBeGreaterThan(0); // joker pair wins
    });

    test('Big Joker pair should beat Small Joker pair', () => {
      const bigJokerPair = [createJoker(JokerType.Big), createJoker(JokerType.Big)];
      const smallJokerPair = [createJoker(JokerType.Small), createJoker(JokerType.Small)];

      const result = compareCardCombos(bigJokerPair, smallJokerPair, trumpInfo);
      expect(result).toBeGreaterThan(0); // big joker pair wins
    });

    test('Trump rank pairs from different non-trump suits should be equal (first played wins)', () => {
      const trumpRankClubs = createPair(Suit.Clubs, Rank.Two);
      const trumpRankHearts = createPair(Suit.Hearts, Rank.Two);

      // When trump rank cards from different non-trump suits are compared,
      // they should be equal strength (first played wins)
      const result = compareCardCombos(trumpRankClubs, trumpRankHearts, trumpInfo);
      expect(result).toBe(0); // equal strength, first played wins
    });
  });

  describe('Non-trump pairs should not be affected', () => {
    const trumpInfo: TrumpInfo = {
      trumpRank: Rank.Two,
      trumpSuit: Suit.Spades,
      declared: true,
      declarerPlayerId: 'test',
    };

    test('Non-trump pairs comparison should remain unchanged', () => {
      const heartsKings = createPair(Suit.Hearts, Rank.King);
      const clubsQueens = createPair(Suit.Clubs, Rank.Queen);

      // Non-trump pairs from different suits - leading combo should win
      const result = compareCardCombos(heartsKings, clubsQueens, trumpInfo);
      expect(result).toBeGreaterThan(0); // leading combo wins
    });

    test('Same suit non-trump pairs should compare by rank', () => {
      const heartsKings = createPair(Suit.Hearts, Rank.King);
      const heartsQueens = createPair(Suit.Hearts, Rank.Queen);

      // Same suit pairs should compare by rank
      const result = compareCardCombos(heartsKings, heartsQueens, trumpInfo);
      expect(result).toBeGreaterThan(0); // Kings beat Queens
    });
  });
});