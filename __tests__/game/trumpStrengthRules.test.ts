import { Card, Rank, Suit, TrumpInfo, JokerType } from "../../src/types";
import { compareCards } from '../../src/game/gameLogic';

describe('Trump Strength Rules (Issue #37)', () => {
  const trumpInfo: TrumpInfo = {
    trumpRank: Rank.Two,
    trumpSuit: Suit.Spades,
    declared: true,
  };

  describe('Trump hierarchy', () => {
    test('Big Joker > Small Joker > Trump rank in trump suit > Trump rank in other suits > Trump suit cards', () => {
      const bigJoker: Card = { id: 'BJ1', joker: JokerType.Big, points: 0 };
      const smallJoker: Card = { id: 'SJ1', joker: JokerType.Small, points: 0 };
      const trumpRankInTrumpSuit: Card = { id: '2S1', rank: Rank.Two, suit: Suit.Spades, points: 0 };
      const trumpRankInOtherSuit: Card = { id: '2H1', rank: Rank.Two, suit: Suit.Hearts, points: 0 };
      const trumpSuitCard: Card = { id: 'AS1', rank: Rank.Ace, suit: Suit.Spades, points: 0 };

      // Big Joker > Small Joker
      expect(compareCards(bigJoker, smallJoker, trumpInfo)).toBeGreaterThan(0);

      // Small Joker > Trump rank in trump suit
      expect(compareCards(smallJoker, trumpRankInTrumpSuit, trumpInfo)).toBeGreaterThan(0);

      // Trump rank in trump suit > Trump rank in other suits
      expect(compareCards(trumpRankInTrumpSuit, trumpRankInOtherSuit, trumpInfo)).toBeGreaterThan(0);

      // Trump rank in other suits > Trump suit cards
      expect(compareCards(trumpRankInOtherSuit, trumpSuitCard, trumpInfo)).toBeGreaterThan(0);
    });

    test('Trump ranks in other suits have equal strength', () => {
      const twoHearts: Card = { id: '2H1', rank: Rank.Two, suit: Suit.Hearts, points: 0 };
      const twoDiamonds: Card = { id: '2D1', rank: Rank.Two, suit: Suit.Diamonds, points: 0 };
      const twoClubs: Card = { id: '2C1', rank: Rank.Two, suit: Suit.Clubs, points: 0 };

      // All trump ranks in non-trump suits should be equal
      expect(compareCards(twoHearts, twoDiamonds, trumpInfo)).toBe(0);
      expect(compareCards(twoDiamonds, twoClubs, trumpInfo)).toBe(0);
      expect(compareCards(twoClubs, twoHearts, trumpInfo)).toBe(0);
    });
  });

  describe('First played wins rule for equal strength cards', () => {
    test('Trump rank cards in different suits are equal strength - first played wins', () => {
      const twoHearts: Card = { id: '2H1', rank: Rank.Two, suit: Suit.Hearts, points: 0 };
      const twoDiamonds: Card = { id: '2D1', rank: Rank.Two, suit: Suit.Diamonds, points: 0 };
      
      // When cards are equal strength, compareCards returns 0
      expect(compareCards(twoHearts, twoDiamonds, trumpInfo)).toBe(0);
    });

    test('Trump rank in trump suit beats trump rank in other suits', () => {
      const trumpRankInTrumpSuit: Card = { id: '2S1', rank: Rank.Two, suit: Suit.Spades, points: 0 };
      const trumpRankInOtherSuit: Card = { id: '2H1', rank: Rank.Two, suit: Suit.Hearts, points: 0 };
      
      // Trump rank in trump suit should beat trump rank in other suits
      expect(compareCards(trumpRankInTrumpSuit, trumpRankInOtherSuit, trumpInfo)).toBeGreaterThan(0);
    });

    test('Any trump beats any non-trump', () => {
      const trumpRankCard: Card = { id: '2H1', rank: Rank.Two, suit: Suit.Hearts, points: 0 };
      const nonTrumpCard: Card = { id: 'AH1', rank: Rank.Ace, suit: Suit.Hearts, points: 0 };
      
      // Trump rank card should beat non-trump card
      expect(compareCards(trumpRankCard, nonTrumpCard, trumpInfo)).toBeGreaterThan(0);
    });

    test('Non-trump cards compare by rank', () => {
      const aceHearts: Card = { id: 'AH1', rank: Rank.Ace, suit: Suit.Hearts, points: 0 };
      const kingHearts: Card = { id: 'KH1', rank: Rank.King, suit: Suit.Hearts, points: 0 };
      
      // Ace should beat King in non-trump comparison
      expect(compareCards(aceHearts, kingHearts, trumpInfo)).toBeGreaterThan(0);
    });
  });
});