import { Card, Rank, Suit, TrumpInfo, PlayerId, Trick, JokerType } from "../../src/types";
import { compareCards, determineTrickWinner } from '../../src/game/gameLogic';

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
      const trumpRankInHearts: Card = { id: '2H1', rank: Rank.Two, suit: Suit.Hearts, points: 0 };
      const trumpRankInClubs: Card = { id: '2C1', rank: Rank.Two, suit: Suit.Clubs, points: 0 };
      const trumpRankInDiamonds: Card = { id: '2D1', rank: Rank.Two, suit: Suit.Diamonds, points: 0 };
      const trumpSuitAce: Card = { id: 'AS1', rank: Rank.Ace, suit: Suit.Spades, points: 0 };
      const nonTrumpCard: Card = { id: '5H1', rank: Rank.Five, suit: Suit.Hearts, points: 5 };

      // Big Joker > Small Joker
      expect(compareCards(bigJoker, smallJoker, trumpInfo)).toBeGreaterThan(0);

      // Small Joker > Trump rank in trump suit
      expect(compareCards(smallJoker, trumpRankInTrumpSuit, trumpInfo)).toBeGreaterThan(0);

      // Trump rank in trump suit > Trump rank in other suits
      expect(compareCards(trumpRankInTrumpSuit, trumpRankInHearts, trumpInfo)).toBeGreaterThan(0);
      expect(compareCards(trumpRankInTrumpSuit, trumpRankInClubs, trumpInfo)).toBeGreaterThan(0);
      expect(compareCards(trumpRankInTrumpSuit, trumpRankInDiamonds, trumpInfo)).toBeGreaterThan(0);

      // Trump rank in other suits > Trump suit cards
      expect(compareCards(trumpRankInHearts, trumpSuitAce, trumpInfo)).toBeGreaterThan(0);
      expect(compareCards(trumpRankInClubs, trumpSuitAce, trumpInfo)).toBeGreaterThan(0);
      expect(compareCards(trumpRankInDiamonds, trumpSuitAce, trumpInfo)).toBeGreaterThan(0);

      // Trump suit cards > Non-trump cards
      expect(compareCards(trumpSuitAce, nonTrumpCard, trumpInfo)).toBeGreaterThan(0);
    });

    test('Trump ranks in other suits have equal strength', () => {
      const trumpRankInHearts: Card = { id: '2H1', rank: Rank.Two, suit: Suit.Hearts, points: 0 };
      const trumpRankInClubs: Card = { id: '2C1', rank: Rank.Two, suit: Suit.Clubs, points: 0 };
      const trumpRankInDiamonds: Card = { id: '2D1', rank: Rank.Two, suit: Suit.Diamonds, points: 0 };

      // All trump ranks in non-trump suits should have equal strength (return 0)
      expect(compareCards(trumpRankInHearts, trumpRankInClubs, trumpInfo)).toBe(0);
      expect(compareCards(trumpRankInHearts, trumpRankInDiamonds, trumpInfo)).toBe(0);
      expect(compareCards(trumpRankInClubs, trumpRankInDiamonds, trumpInfo)).toBe(0);
    });
  });

  describe('First played wins rule', () => {
    test('Issue #37 example: Human should win with 2D when played first', () => {
      // Example from issue:
      // Trump 2S
      // Bot 3: 5S
      // Human: 2D (trump rank in non-trump suit)
      // Bot 1: 2C (trump rank in non-trump suit) 
      // Bot 2: 9S

      const trick: Trick = {
        leadingPlayerId: PlayerId.Bot3,
        leadingCombo: [{ id: '5S1', rank: Rank.Five, suit: Suit.Spades, points: 5 }],
        plays: [
          {
            playerId: PlayerId.Human,
            cards: [{ id: '2D1', rank: Rank.Two, suit: Suit.Diamonds, points: 0 }],
          },
          {
            playerId: PlayerId.Bot1,
            cards: [{ id: '2C1', rank: Rank.Two, suit: Suit.Clubs, points: 0 }],
          },
          {
            playerId: PlayerId.Bot2,
            cards: [{ id: '9S1', rank: Rank.Nine, suit: Suit.Spades, points: 0 }],
          },
        ],
        winningPlayerId: PlayerId.Bot3,
        points: 5,
      };

      const winner = determineTrickWinner(trick, trumpInfo);
      
      // Human should win because 2D (trump rank) was played first among trump rank cards
      expect(winner).toBe(PlayerId.Human);
    });

    test('First trump rank card wins when multiple trump ranks played', () => {
      const trick: Trick = {
        leadingPlayerId: PlayerId.Bot1,
        leadingCombo: [{ id: '2H1', rank: Rank.Two, suit: Suit.Hearts, points: 0 }],
        plays: [
          {
            playerId: PlayerId.Bot2,
            cards: [{ id: '2C1', rank: Rank.Two, suit: Suit.Clubs, points: 0 }],
          },
          {
            playerId: PlayerId.Bot3,
            cards: [{ id: '2D1', rank: Rank.Two, suit: Suit.Diamonds, points: 0 }],
          },
          {
            playerId: PlayerId.Human,
            cards: [{ id: '3H1', rank: Rank.Three, suit: Suit.Hearts, points: 0 }],
          },
        ],
        winningPlayerId: PlayerId.Bot1,
        points: 0,
      };

      const winner = determineTrickWinner(trick, trumpInfo);
      
      // Bot1 should win because they played the first trump rank card (2H)
      expect(winner).toBe(PlayerId.Bot1);
    });

    test('Higher trump beats equal strength trump regardless of play order', () => {
      const trick: Trick = {
        leadingPlayerId: PlayerId.Human,
        leadingCombo: [{ id: '2D1', rank: Rank.Two, suit: Suit.Diamonds, points: 0 }], // Trump rank in non-trump suit
        plays: [
          {
            playerId: PlayerId.Bot1,
            cards: [{ id: '2C1', rank: Rank.Two, suit: Suit.Clubs, points: 0 }], // Equal strength trump rank
          },
          {
            playerId: PlayerId.Bot2,
            cards: [{ id: '2S1', rank: Rank.Two, suit: Suit.Spades, points: 0 }], // Trump rank in trump suit (higher)
          },
          {
            playerId: PlayerId.Bot3,
            cards: [{ id: '5H1', rank: Rank.Five, suit: Suit.Hearts, points: 5 }], // Non-trump
          },
        ],
        winningPlayerId: PlayerId.Bot2,
        points: 5,
      };

      const winner = determineTrickWinner(trick, trumpInfo);
      
      // Bot2 should win because 2S (trump rank in trump suit) beats trump ranks in other suits
      expect(winner).toBe(PlayerId.Bot2);
    });
  });
});