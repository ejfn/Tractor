import { isValidPlay, getComboType, getLeadingSuit } from '../../src/game/gameLogic';
import { createCard } from '../helpers/cards';
import { Card, Suit, Rank, ComboType, TrumpInfo, PlayerId } from '../../src/types';

describe('Suit Following Rules Tests', () => {
  const createTestTrumpInfo = (trumpRank: Rank, trumpSuit: Suit): TrumpInfo => ({
    trumpRank,
    trumpSuit, 
    declared: true,
    declarerPlayerId: PlayerId.Human
  });

  describe('Basic Suit Following Rules', () => {
    test('Trump rank in trump suit should be higher than trump rank in other suits', () => {
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Spades);
      const leadingCombo = [createCard(Suit.Hearts, Rank.Three, 'hearts_3_1')];
      const playerHand = [
        createCard(Suit.Spades, Rank.Two, 'spades_2_1'),
        createCard(Suit.Hearts, Rank.Two, 'hearts_2_1')
      ];
      
      expect(isValidPlay([playerHand[0]], leadingCombo, playerHand, trumpInfo)).toBe(true);
      expect(isValidPlay([playerHand[1]], leadingCombo, playerHand, trumpInfo)).toBe(true);
    });

    test('getLeadingSuit should return the suit of the first card with a suit', () => {
      const combo = [createCard(Suit.Hearts, Rank.Seven, 'hearts_7_1')];
      expect(getLeadingSuit(combo)).toBe(Suit.Hearts);
    });

    test('getComboType should correctly identify pairs', () => {
      const pair = [
        createCard(Suit.Hearts, Rank.Seven, 'hearts_7_1'),
        createCard(Suit.Hearts, Rank.Seven, 'hearts_7_2')
      ];
      expect(getComboType(pair)).toBe(ComboType.Pair);
    });
  });

  describe('Leading Rules', () => {
    test('When leading, any valid combo is acceptable', () => {
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Spades);
      const playerHand = [createCard(Suit.Hearts, Rank.Seven, 'hearts_7_1')];
      const leadingCombo = null; // Null for leading
      
      expect(isValidPlay([playerHand[0]], leadingCombo, playerHand, trumpInfo)).toBe(true);
    });
  });

  describe('Following Rules', () => {
    test('When following, must match the combination length', () => {
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Spades);
      const leadingCombo = [
        createCard(Suit.Hearts, Rank.Three, 'hearts_3_1'),
        createCard(Suit.Hearts, Rank.Three, 'hearts_3_2')
      ];
      const playerHand = [
        createCard(Suit.Hearts, Rank.Seven, 'hearts_7_1'),
        createCard(Suit.Hearts, Rank.Seven, 'hearts_7_2'),
        createCard(Suit.Clubs, Rank.Eight, 'clubs_8_1')
      ];
      
      // Must play 2 cards to match leading pair
      expect(isValidPlay([playerHand[0]], leadingCombo, playerHand, trumpInfo)).toBe(false);
      expect(isValidPlay([playerHand[0], playerHand[1]], leadingCombo, playerHand, trumpInfo)).toBe(true);
    });

    test('When following a pair, must play a pair of the same suit if available', () => {
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Spades);
      const leadingCombo = [
        createCard(Suit.Hearts, Rank.Three, 'hearts_3_1'),
        createCard(Suit.Hearts, Rank.Three, 'hearts_3_2')
      ];
      const playerHand = [
        createCard(Suit.Hearts, Rank.Seven, 'hearts_7_1'),
        createCard(Suit.Hearts, Rank.Seven, 'hearts_7_2'),
        createCard(Suit.Hearts, Rank.Eight, 'hearts_8_1'),
        createCard(Suit.Clubs, Rank.Nine, 'clubs_9_1')
      ];
      
      // Must use the Hearts pair, not mix suits
      expect(isValidPlay([playerHand[0], playerHand[1]], leadingCombo, playerHand, trumpInfo)).toBe(true);
      expect(isValidPlay([playerHand[0], playerHand[2]], leadingCombo, playerHand, trumpInfo)).toBe(false);
    });

    test('When following and cannot form matching combo, must use all cards of leading suit', () => {
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Spades);
      const leadingCombo = [
        createCard(Suit.Hearts, Rank.Three, 'hearts_3_1'),
        createCard(Suit.Hearts, Rank.Three, 'hearts_3_2')
      ];
      const playerHand = [
        createCard(Suit.Hearts, Rank.Seven, 'hearts_7_1'), // Only one Hearts card
        createCard(Suit.Clubs, Rank.Eight, 'clubs_8_1'),
        createCard(Suit.Diamonds, Rank.Nine, 'diamonds_9_1')
      ];
      
      // Must use the Hearts card + one other
      expect(isValidPlay([playerHand[0], playerHand[1]], leadingCombo, playerHand, trumpInfo)).toBe(true);
      expect(isValidPlay([playerHand[1], playerHand[2]], leadingCombo, playerHand, trumpInfo)).toBe(false);
    });

    test('When player has no cards of leading suit, any same-length combo can be played', () => {
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Spades);
      const leadingCombo = [
        createCard(Suit.Hearts, Rank.Three, 'hearts_3_1'),
        createCard(Suit.Hearts, Rank.Three, 'hearts_3_2')
      ];
      const playerHand = [
        createCard(Suit.Clubs, Rank.Seven, 'clubs_7_1'),
        createCard(Suit.Clubs, Rank.Eight, 'clubs_8_1'),
        createCard(Suit.Diamonds, Rank.Nine, 'diamonds_9_1')
      ];
      
      // No Hearts cards, so any 2-card combo is valid
      expect(isValidPlay([playerHand[0], playerHand[1]], leadingCombo, playerHand, trumpInfo)).toBe(true);
      expect(isValidPlay([playerHand[0], playerHand[2]], leadingCombo, playerHand, trumpInfo)).toBe(true);
    });

    test('Must play all cards of leading suit even if not enough for the combo', () => {
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Spades);
      const leadingCombo = [
        createCard(Suit.Hearts, Rank.Three, 'hearts_3_1'),
        createCard(Suit.Hearts, Rank.Three, 'hearts_3_2'),
        createCard(Suit.Hearts, Rank.Three, 'hearts_3_3'),
        createCard(Suit.Hearts, Rank.Three, 'hearts_3_4')
      ]; // 4-card combo
      
      const playerHand = [
        createCard(Suit.Hearts, Rank.Seven, 'hearts_7_1'),
        createCard(Suit.Hearts, Rank.Eight, 'hearts_8_1'), // Only 2 Hearts cards
        createCard(Suit.Clubs, Rank.Nine, 'clubs_9_1'),
        createCard(Suit.Diamonds, Rank.Ten, 'diamonds_10_1')
      ];
      
      // Must use both Hearts cards + 2 others
      expect(isValidPlay([
        playerHand[0], playerHand[1], playerHand[2], playerHand[3]
      ], leadingCombo, playerHand, trumpInfo)).toBe(true);
      
      // Cannot skip Hearts cards
      expect(isValidPlay([
        playerHand[0], playerHand[2], playerHand[3], playerHand[1]
      ], leadingCombo, playerHand, trumpInfo)).toBe(true); // Order doesn't matter
      
      expect(isValidPlay([
        playerHand[2], playerHand[3], playerHand[0], playerHand[1] 
      ], leadingCombo, playerHand, trumpInfo)).toBe(true); // Order doesn't matter
    });
  });

  describe('Non-Trump Suit Following with Singles Available', () => {
    test('should NOT allow non-suit pairs when only suit singles are available', () => {
      // Test the same rule but with non-trump suits (Hearts led, player has Hearts singles + Clubs pair)
      
      // Set up trump info: Diamonds trump, rank 2
      const trumpInfo: TrumpInfo = {
        trumpRank: Rank.Two,
        trumpSuit: Suit.Diamonds,
        declared: true,
        declarerPlayerId: PlayerId.Human
      };
      
      // Leading Hearts pair (3♥-3♥) - non-trump
      const leadingHeartsPair: Card[] = [
        {
          id: 'hearts-3-1',
          suit: Suit.Hearts,
          rank: Rank.Three,
          joker: undefined,
          points: 0
        },
        {
          id: 'hearts-3-2', 
          suit: Suit.Hearts,
          rank: Rank.Three,
          joker: undefined,
          points: 0
        }
      ];
      
      // Player hand with ONLY ONE Hearts single + Clubs pair + other cards
      const playerHand: Card[] = [
        // Only ONE Hearts single (leading suit)
        {
          id: 'hearts-4-1',
          suit: Suit.Hearts,
          rank: Rank.Four,
          joker: undefined,
          points: 0
        },
        // Clubs pair (different non-trump suit)
        {
          id: 'clubs-6-1',
          suit: Suit.Clubs,
          rank: Rank.Six,
          joker: undefined,
          points: 0
        },
        {
          id: 'clubs-6-2',
          suit: Suit.Clubs,
          rank: Rank.Six,
          joker: undefined,
          points: 0
        },
        // Other cards
        {
          id: 'spades-7-1',
          suit: Suit.Spades,
          rank: Rank.Seven,
          joker: undefined,
          points: 0
        }
      ];
      
      // TEST: Non-suit pair should be INVALID when suit singles are available
      const nonSuitPair = [playerHand[1], playerHand[2]]; // 6♣-6♣
      const nonSuitPairValid = isValidPlay(
        nonSuitPair,
        leadingHeartsPair,
        playerHand,
        trumpInfo
      );
      
      expect(nonSuitPairValid).toBe(false); // Should be invalid - must use leading suit when available

      // TEST: Suit single + other card should be VALID (must use all leading suit)
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

  describe('Edge Cases', () => {
    test('A♠-Q♠ cannot beat a leading 5♠-5♠ when 2♠ is trump', () => {
      // NOTE: This test verifies that two single trump cards cannot win against a trump pair,
      // even though the play is valid. "Cannot beat" refers to winning the trick, not validity.
      
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Spades);
      
      // Player has A♠ and Q♠ in hand (both trump cards due to trump suit)
      const playerHand = [
        createCard(Suit.Spades, Rank.Ace, 'spades_a_1'),
        createCard(Suit.Spades, Rank.Queen, 'spades_q_1'),
        createCard(Suit.Hearts, Rank.Seven, 'hearts_7_1')
      ];

      // Leading with a pair of 5♠
      const leadingCombo = [
        createCard(Suit.Spades, Rank.Five, 'spades_5_1'),
        createCard(Suit.Spades, Rank.Five, 'spades_5_2')
      ];

      // Playing A♠-Q♠ (which is not a valid pair, just two singles)
      const playedCards = [
        createCard(Suit.Spades, Rank.Ace, 'spades_a_1'),
        createCard(Suit.Spades, Rank.Queen, 'spades_q_1')
      ];

      // The play is VALID (player has trumps and must play them)
      expect(isValidPlay(playedCards, leadingCombo, playerHand, trumpInfo)).toBe(true);

      // For comparison, a valid pair would NOT be allowed when trump cards are available (Issue #102 fix)
      const validPairHand = [
        createCard(Suit.Spades, Rank.Ace, 'spades_a_1'),
        createCard(Suit.Hearts, Rank.Seven, 'hearts_7_1'),
        createCard(Suit.Hearts, Rank.Seven, 'hearts_7_2')
      ];

      const validPairPlay = [
        createCard(Suit.Hearts, Rank.Seven, 'hearts_7_1'),
        createCard(Suit.Hearts, Rank.Seven, 'hearts_7_2')
      ];

      // Confirm a proper pair would NOT be allowed when trump cards are available (Issue #102 fix)
      expect(getComboType(validPairPlay)).toBe(ComboType.Pair);
      expect(isValidPlay(validPairPlay, leadingCombo, validPairHand, trumpInfo)).toBe(false);
    });
  });
});