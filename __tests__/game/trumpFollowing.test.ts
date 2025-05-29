import { isValidPlay } from '../../src/game/gameLogic';
import { Card, Suit, Rank, TrumpInfo, PlayerId, JokerType } from '../../src/types';

describe('Trump Following Rules', () => {
  const createTestTrumpInfo = (trumpRank: Rank, trumpSuit: Suit): TrumpInfo => ({
    trumpRank,
    trumpSuit,
    declared: true,
    declarerPlayerId: PlayerId.Human
  });

  describe('Basic Trump Following Rules (Issue #102 Fix)', () => {
    it('should NOT allow non-trump pairs when trump suit singles are available', () => {
      // Original Issue #102 scenario
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Hearts);
      
      // Leading trump pair (3♥-3♥)
      const leadingTrumpPair: Card[] = [
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
      
      // Player hand with ONLY ONE trump single + non-trump pair
      const playerHand: Card[] = [
        // Only ONE trump single (Hearts)
        {
          id: 'hearts-4-1',
          suit: Suit.Hearts,
          rank: Rank.Four,
          joker: undefined,
          points: 0
        },
        // Non-trump pair (Spades)
        {
          id: 'spades-6-1',
          suit: Suit.Spades,
          rank: Rank.Six,
          joker: undefined,
          points: 0
        },
        {
          id: 'spades-6-2',
          suit: Suit.Spades,
          rank: Rank.Six,
          joker: undefined,
          points: 0
        },
        // Other cards
        {
          id: 'clubs-7-1',
          suit: Suit.Clubs,
          rank: Rank.Seven,
          joker: undefined,
          points: 0
        }
      ];
      
      // TEST: Non-trump pair should be INVALID when trump single available
      const nonTrumpPair = [playerHand[1], playerHand[2]]; // 6♠-6♠
      const nonTrumpPairValid = isValidPlay(
        nonTrumpPair,
        leadingTrumpPair,
        playerHand,
        trumpInfo
      );
      
      expect(nonTrumpPairValid).toBe(false); // Should be invalid - must use trump

      // TEST: Trump single + non-trump should be VALID (must use all trump)
      const trumpSinglePlusNonTrump = [playerHand[0], playerHand[3]]; // 4♥, 7♣
      const mixedValid = isValidPlay(
        trumpSinglePlusNonTrump,
        leadingTrumpPair,
        playerHand,
        trumpInfo
      );
      
      expect(mixedValid).toBe(true); // Should be valid - using all available trump
    });

    it('should NOT allow non-trump pairs when trump RANK singles are available', () => {
      // Test with trump rank cards (2♥, 2♣) instead of trump suit cards
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Spades);
      
      // Leading trump pair (3♠-3♠) - trump suit
      const leadingTrumpPair: Card[] = [
        {
          id: 'spades-3-1',
          suit: Suit.Spades,
          rank: Rank.Three,
          joker: undefined,
          points: 0
        },
        {
          id: 'spades-3-2', 
          suit: Suit.Spades,
          rank: Rank.Three,
          joker: undefined,
          points: 0
        }
      ];
      
      // Player hand with trump RANK singles (not trump suit) + non-trump pair
      const playerHand: Card[] = [
        // Trump rank in off-suit (2♥) - trump card
        {
          id: 'hearts-2-1',
          suit: Suit.Hearts,
          rank: Rank.Two,
          joker: undefined,
          points: 0
        },
        // Trump rank in another off-suit (2♣) - trump card  
        {
          id: 'clubs-2-1',
          suit: Suit.Clubs,
          rank: Rank.Two,
          joker: undefined,
          points: 0
        },
        // Non-trump pair (Diamonds)
        {
          id: 'diamonds-6-1',
          suit: Suit.Diamonds,
          rank: Rank.Six,
          joker: undefined,
          points: 0
        },
        {
          id: 'diamonds-6-2',
          suit: Suit.Diamonds,
          rank: Rank.Six,
          joker: undefined,
          points: 0
        },
        // Other card
        {
          id: 'hearts-7-1',
          suit: Suit.Hearts,
          rank: Rank.Seven,
          joker: undefined,
          points: 0
        }
      ];
      
      // TEST: Non-trump pair should be INVALID when trump rank singles available
      const nonTrumpPair = [playerHand[2], playerHand[3]]; // 6♦-6♦
      const nonTrumpPairValid = isValidPlay(
        nonTrumpPair,
        leadingTrumpPair,
        playerHand,
        trumpInfo
      );
      
      expect(nonTrumpPairValid).toBe(false); // Should be invalid - must use trump rank cards

      // TEST: Trump rank singles should be VALID (must use all trump)
      const trumpRankSingles = [playerHand[0], playerHand[1]]; // 2♥, 2♣
      const trumpRankValid = isValidPlay(
        trumpRankSingles,
        leadingTrumpPair,
        playerHand,
        trumpInfo
      );
      
      expect(trumpRankValid).toBe(true); // Should be valid - using all available trump
    });

    it('should NOT allow non-trump pairs when JOKER singles are available', () => {
      // Test with joker cards
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Hearts);
      
      // Leading trump pair (3♥-3♥) - trump suit
      const leadingTrumpPair: Card[] = [
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
      
      // Player hand with jokers + non-trump pair
      const playerHand: Card[] = [
        // Big Joker - highest trump
        {
          id: 'big-joker-1',
          suit: Suit.Hearts, // Suit doesn't matter for jokers
          rank: Rank.Ace,
          joker: JokerType.Big,
          points: 0
        },
        // Small Joker - second highest trump
        {
          id: 'small-joker-1',
          suit: Suit.Hearts,
          rank: Rank.Ace,
          joker: JokerType.Small,
          points: 0
        },
        // Non-trump pair (Spades)
        {
          id: 'spades-6-1',
          suit: Suit.Spades,
          rank: Rank.Six,
          joker: undefined,
          points: 0
        },
        {
          id: 'spades-6-2',
          suit: Suit.Spades,
          rank: Rank.Six,
          joker: undefined,
          points: 0
        },
        // Other card
        {
          id: 'clubs-7-1',
          suit: Suit.Clubs,
          rank: Rank.Seven,
          joker: undefined,
          points: 0
        }
      ];
      
      // TEST: Non-trump pair should be INVALID when jokers available
      const nonTrumpPair = [playerHand[2], playerHand[3]]; // 6♠-6♠
      const nonTrumpPairValid = isValidPlay(
        nonTrumpPair,
        leadingTrumpPair,
        playerHand,
        trumpInfo
      );
      
      expect(nonTrumpPairValid).toBe(false); // Should be invalid - must use jokers

      // TEST: Joker singles should be VALID (must use all trump)
      const jokerSingles = [playerHand[0], playerHand[1]]; // Big Joker, Small Joker
      const jokerValid = isValidPlay(
        jokerSingles,
        leadingTrumpPair,
        playerHand,
        trumpInfo
      );
      
      expect(jokerValid).toBe(true); // Should be valid - using all available trump
    });

    it('should NOT allow non-trump pairs when MIXED trump types are available', () => {
      // Test with mixed trump: trump suit + trump rank + joker
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Clubs);
      
      // Leading trump pair (4♣-4♣) - trump suit
      const leadingTrumpPair: Card[] = [
        {
          id: 'clubs-4-1',
          suit: Suit.Clubs,
          rank: Rank.Four,
          joker: undefined,
          points: 0
        },
        {
          id: 'clubs-4-2', 
          suit: Suit.Clubs,
          rank: Rank.Four,
          joker: undefined,
          points: 0
        }
      ];
      
      // Player hand with mixed trump types + non-trump pair
      const playerHand: Card[] = [
        // Trump suit single (5♣)
        {
          id: 'clubs-5-1',
          suit: Suit.Clubs,
          rank: Rank.Five,
          joker: undefined,
          points: 5
        },
        // Trump rank in off-suit (2♠)
        {
          id: 'spades-2-1',
          suit: Suit.Spades,
          rank: Rank.Two,
          joker: undefined,
          points: 0
        },
        // Small Joker
        {
          id: 'small-joker-1',
          suit: Suit.Hearts,
          rank: Rank.Ace,
          joker: JokerType.Small,
          points: 0
        },
        // Non-trump pair (Hearts)
        {
          id: 'hearts-6-1',
          suit: Suit.Hearts,
          rank: Rank.Six,
          joker: undefined,
          points: 0
        },
        {
          id: 'hearts-6-2',
          suit: Suit.Hearts,
          rank: Rank.Six,
          joker: undefined,
          points: 0
        },
        // Other card
        {
          id: 'diamonds-7-1',
          suit: Suit.Diamonds,
          rank: Rank.Seven,
          joker: undefined,
          points: 0
        }
      ];
      
      // TEST: Non-trump pair should be INVALID when mixed trump available
      const nonTrumpPair = [playerHand[3], playerHand[4]]; // 6♥-6♥
      const nonTrumpPairValid = isValidPlay(
        nonTrumpPair,
        leadingTrumpPair,
        playerHand,
        trumpInfo
      );
      
      expect(nonTrumpPairValid).toBe(false); // Should be invalid - must use trump cards

      // TEST: Two trump cards should be VALID (any two trump cards)
      const mixedTrump = [playerHand[0], playerHand[2]]; // 5♣, Small Joker
      const mixedTrumpValid = isValidPlay(
        mixedTrump,
        leadingTrumpPair,
        playerHand,
        trumpInfo
      );
      
      expect(mixedTrumpValid).toBe(true); // Should be valid - using trump cards
    });
  });


  describe('Regression Tests for Historical Issues', () => {
    it('should reproduce and validate the original Issue #102 bug fix', () => {
      // This test documents the exact scenario that was reported in Issue #102
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Hearts);
      
      // Leading trump pair (3♥-3♥)
      const leadingTrumpPair: Card[] = [
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
      
      // Player hand with ONLY ONE trump single + non-trump pair
      const playerHand: Card[] = [
        // Only ONE trump single (Hearts)
        {
          id: 'hearts-4-1',
          suit: Suit.Hearts,
          rank: Rank.Four,
          joker: undefined,
          points: 0
        },
        // Non-trump pair (Spades)
        {
          id: 'spades-6-1',
          suit: Suit.Spades,
          rank: Rank.Six,
          joker: undefined,
          points: 0
        },
        {
          id: 'spades-6-2',
          suit: Suit.Spades,
          rank: Rank.Six,
          joker: undefined,
          points: 0
        },
        // Other card
        {
          id: 'clubs-7-1',
          suit: Suit.Clubs,
          rank: Rank.Seven,
          joker: undefined,
          points: 0
        }
      ];
      
      // BUG REPRODUCTION: Non-trump pair should be INVALID when trump single available
      const nonTrumpPair = [playerHand[1], playerHand[2]]; // 6♠-6♠
      const nonTrumpPairValid = isValidPlay(
        nonTrumpPair,
        leadingTrumpPair,
        playerHand,
        trumpInfo
      );
      
      expect(nonTrumpPairValid).toBe(false); // Should be invalid - must use trump

      // CORRECT BEHAVIOR: Trump single + non-trump should be VALID (must use all trump)
      const trumpSinglePlusNonTrump = [playerHand[0], playerHand[3]]; // 4♥, 7♣
      const mixedValid = isValidPlay(
        trumpSinglePlusNonTrump,
        leadingTrumpPair,
        playerHand,
        trumpInfo
      );
      
      expect(mixedValid).toBe(true); // Should be valid - using all available trump
    });
  });
});