import {
  compareCardCombos,
  determineTrickWinner,
  getComboType
} from '../../src/game/gameLogic';
import {
  Suit, 
  Rank, 
  ComboType,
  TrumpInfo,
  Trick,
  JokerType
} from "../../src/types";
import { describe, test, expect } from '@jest/globals';
import {
  createCard,
  createJoker,
  createTrumpScenarios,
} from "../helpers";

describe('Issue #88: Non-trump pair vs single trumps bug', () => {
  // Standard trump info for tests - Spades trump, rank 2
  const trumpInfo = createTrumpScenarios.spadesTrump();

  describe('Leading non-trump pair should beat following two single trump cards', () => {
    test('LEADING non-trump pair (Hearts K-K) should beat FOLLOWING two single trump cards (Spades 3, Spades 4)', () => {
      // Create a non-trump pair (LEADING play)
      const heartKing1 = createCard(Suit.Hearts, Rank.King, 'hearts_k_1');
      const heartKing2 = createCard(Suit.Hearts, Rank.King, 'hearts_k_2');
      const leadingNonTrumpPair = [heartKing1, heartKing2];

      // Create two single trump cards (FOLLOWING play - should be invalid in real game but testing comparison logic)
      const spadeThree = createCard(Suit.Spades, Rank.Three, 'spades_3_1');
      const spadeFour = createCard(Suit.Spades, Rank.Four, 'spades_4_1');
      const followingTwoSingleTrumps = [spadeThree, spadeFour];

      // Verify that the combos are correctly identified
      expect(getComboType(leadingNonTrumpPair)).toBe(ComboType.Pair);
      expect(getComboType(followingTwoSingleTrumps)).toBe(ComboType.Single); // Two singles, not a pair

      // The bug: When a pair is led, only pairs can beat it (not two singles, even trump singles)
      // According to game rules: different combination types cannot beat each other
      // compareCardCombos treats first argument as "leading" combo
      const result = compareCardCombos(leadingNonTrumpPair, followingTwoSingleTrumps, trumpInfo);
      
      // EXPECTED: leading pair should win because following play is wrong combination type (result > 0)
      // ACTUAL BUG: two single trumps incorrectly win (result < 0)
      expect(result).toBeGreaterThan(0); // This should pass but currently fails due to bug
    });

    test('LEADING non-trump pair (Clubs Q-Q) should beat FOLLOWING two single trump cards (Spades 2, Hearts 2)', () => {
      // Create a non-trump pair (LEADING)
      const clubQueen1 = createCard(Suit.Clubs, Rank.Queen, 'clubs_q_1');
      const clubQueen2 = createCard(Suit.Clubs, Rank.Queen, 'clubs_q_2');
      const leadingNonTrumpPair = [clubQueen1, clubQueen2];

      // Create two single trump cards (FOLLOWING - different trump types)
      const spadeTwo = createCard(Suit.Spades, Rank.Two, 'spades_2_1'); // Trump rank + trump suit
      const heartTwo = createCard(Suit.Hearts, Rank.Two, 'hearts_2_1'); // Trump rank only
      const followingTwoSingleTrumps = [spadeTwo, heartTwo];

      // Verify types
      expect(getComboType(leadingNonTrumpPair)).toBe(ComboType.Pair);
      expect(getComboType(followingTwoSingleTrumps)).toBe(ComboType.Single);

      // Leading pair should beat following two singles (wrong combination type to follow)
      const result = compareCardCombos(leadingNonTrumpPair, followingTwoSingleTrumps, trumpInfo);
      expect(result).toBeGreaterThan(0);
    });

    test('LEADING non-trump pair (Diamonds A-A) should beat FOLLOWING two single trump cards (Small Joker, Spades 2)', () => {
      // Create a non-trump pair (LEADING)
      const diamondAce1 = createCard(Suit.Diamonds, Rank.Ace, 'diamonds_a_1');
      const diamondAce2 = createCard(Suit.Diamonds, Rank.Ace, 'diamonds_a_2');
      const leadingNonTrumpPair = [diamondAce1, diamondAce2];

      // Create two single trump cards (FOLLOWING - joker + trump card, wrong combination type)
      const smallJoker = createJoker(JokerType.Small, 'small_joker_1');
      const spadeTwo = createCard(Suit.Spades, Rank.Two, 'spades_2_1');
      const followingTwoSingleTrumps = [smallJoker, spadeTwo];

      // Verify types
      expect(getComboType(leadingNonTrumpPair)).toBe(ComboType.Pair);
      expect(getComboType(followingTwoSingleTrumps)).toBe(ComboType.Single);

      // Leading pair should beat following two singles (wrong combination type to follow)
      const result = compareCardCombos(leadingNonTrumpPair, followingTwoSingleTrumps, trumpInfo);
      expect(result).toBeGreaterThan(0);
    });
  });

  describe('Correct behavior: Trump pairs should beat non-trump pairs', () => {
    test('Trump pair (Spades 3-3) should beat non-trump pair (Hearts K-K)', () => {
      // Create a trump pair
      const spadeThree1 = createCard(Suit.Spades, Rank.Three, 'spades_3_1');
      const spadeThree2 = createCard(Suit.Spades, Rank.Three, 'spades_3_2');
      const trumpPair = [spadeThree1, spadeThree2];

      // Create a non-trump pair
      const heartKing1 = createCard(Suit.Hearts, Rank.King, 'hearts_k_1');
      const heartKing2 = createCard(Suit.Hearts, Rank.King, 'hearts_k_2');
      const nonTrumpPair = [heartKing1, heartKing2];

      // Verify types
      expect(getComboType(trumpPair)).toBe(ComboType.Pair);
      expect(getComboType(nonTrumpPair)).toBe(ComboType.Pair);

      // Trump pair should beat non-trump pair (this should work correctly)
      const result = compareCardCombos(trumpPair, nonTrumpPair, trumpInfo);
      expect(result).toBeGreaterThan(0);
    });

    test('Trump rank pair (Hearts 2-2) should beat non-trump pair (Clubs A-A)', () => {
      // Create a trump rank pair (not trump suit)
      const heartTwo1 = createCard(Suit.Hearts, Rank.Two, 'hearts_2_1');
      const heartTwo2 = createCard(Suit.Hearts, Rank.Two, 'hearts_2_2');
      const trumpRankPair = [heartTwo1, heartTwo2];

      // Create a non-trump pair
      const clubAce1 = createCard(Suit.Clubs, Rank.Ace, 'clubs_a_1');
      const clubAce2 = createCard(Suit.Clubs, Rank.Ace, 'clubs_a_2');
      const nonTrumpPair = [clubAce1, clubAce2];

      // Verify types
      expect(getComboType(trumpRankPair)).toBe(ComboType.Pair);
      expect(getComboType(nonTrumpPair)).toBe(ComboType.Pair);

      // Trump rank pair should beat non-trump pair
      const result = compareCardCombos(trumpRankPair, nonTrumpPair, trumpInfo);
      expect(result).toBeGreaterThan(0);
    });
  });

  describe('Correct behavior: Single trump should beat single non-trump', () => {
    test('Single trump (Spades 3) should beat single non-trump (Hearts K)', () => {
      // Create single trump
      const spadeThree = createCard(Suit.Spades, Rank.Three, 'spades_3_1');
      const singleTrump = [spadeThree];

      // Create single non-trump
      const heartKing = createCard(Suit.Hearts, Rank.King, 'hearts_k_1');
      const singleNonTrump = [heartKing];

      // Single trump should beat single non-trump (this should work correctly)
      const result = compareCardCombos(singleTrump, singleNonTrump, trumpInfo);
      expect(result).toBeGreaterThan(0);
    });
  });

  describe('Trick winner integration test', () => {
    test('Trick led by non-trump pair should win against invalid follows with two single trumps', () => {
      // Create a trick where human leads with non-trump pair
      const heartKing1 = createCard(Suit.Hearts, Rank.King, 'hearts_k_1');
      const heartKing2 = createCard(Suit.Hearts, Rank.King, 'hearts_k_2');
      
      // Other players play two single trump cards each (invalid follows - should be pairs to match leading combo)
      const spadeThree = createCard(Suit.Spades, Rank.Three, 'spades_3_1');
      const spadeFour = createCard(Suit.Spades, Rank.Four, 'spades_4_1');
      const spadeTwo1 = createCard(Suit.Spades, Rank.Two, 'spades_2_1');
      const spadeTwo2 = createCard(Suit.Spades, Rank.Two, 'spades_2_2');
      const spadeFive = createCard(Suit.Spades, Rank.Five, 'spades_5_1');
      const spadeSix = createCard(Suit.Spades, Rank.Six, 'spades_6_1');

      const trick: Trick = {
        leadingPlayerId: 'human',
        leadingCombo: [heartKing1, heartKing2], // Leading with non-trump pair
        plays: [
          { playerId: 'bot1', cards: [spadeThree, spadeFour] }, // Two single trumps (invalid follow)
          { playerId: 'bot2', cards: [spadeTwo1, spadeFive] }, // Two single trumps (invalid follow) 
          { playerId: 'bot3', cards: [spadeSix, spadeTwo2] } // Two single trumps (invalid follow)
        ],
        winningPlayerId: 'human',
        points: 20
      };

      // The leading player with the pair should win because all follows are invalid combination types
      // In real game, this wouldn't happen due to validation, but testing the comparison logic
      const winner = determineTrickWinner(trick, trumpInfo);
      expect(winner).toBe('human');
    });
  });

  describe('Edge cases', () => {
    test('Two trump pairs comparison should work correctly', () => {
      // Create two trump pairs of different ranks
      const spadeTwo1 = createCard(Suit.Spades, Rank.Two, 'spades_2_1');
      const spadeTwo2 = createCard(Suit.Spades, Rank.Two, 'spades_2_2');
      const trumpRankPair = [spadeTwo1, spadeTwo2];

      const spadeThree1 = createCard(Suit.Spades, Rank.Three, 'spades_3_1');
      const spadeThree2 = createCard(Suit.Spades, Rank.Three, 'spades_3_2');
      const trumpSuitPair = [spadeThree1, spadeThree2];

      // Trump rank pair should beat trump suit pair
      const result = compareCardCombos(trumpRankPair, trumpSuitPair, trumpInfo);
      expect(result).toBeGreaterThan(0);
    });

    test('Same rank non-trump pairs should compare correctly', () => {
      // Create two non-trump pairs of same rank, different suits
      const heartKing1 = createCard(Suit.Hearts, Rank.King, 'hearts_k_1');
      const heartKing2 = createCard(Suit.Hearts, Rank.King, 'hearts_k_2');
      const heartPair = [heartKing1, heartKing2];

      const clubKing1 = createCard(Suit.Clubs, Rank.King, 'clubs_k_1');
      const clubKing2 = createCard(Suit.Clubs, Rank.King, 'clubs_k_2');
      const clubPair = [clubKing1, clubKing2];

      // Leading pair should win (hearts in this case)
      const result = compareCardCombos(heartPair, clubPair, trumpInfo);
      expect(result).toBeGreaterThan(0);
    });
  });
});