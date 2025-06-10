import { describe, expect, test } from '@jest/globals';
import { getComboType } from '../../src/game/comboDetection';
import { compareCardCombos } from '../../src/game/playProcessing';
import {
  Card,
  ComboType,
  JokerType,
  Rank,
  Suit
} from "../../src/types";
import { createTrumpScenarios } from "../helpers";

describe('Issue #88: Non-trump pair vs single trumps bug', () => {
  // Standard trump info for tests - Spades trump, rank 2
  const trumpInfo = createTrumpScenarios.spadesTrump();

  describe('Leading non-trump pair should beat following two single trump cards', () => {
    test('LEADING non-trump pair (Hearts K-K) should beat FOLLOWING two single trump cards (Spades 3, Spades 4)', () => {
      // Create a non-trump pair (LEADING play)
      const heartKing1 = Card.createCard(Suit.Hearts, Rank.King, 0);
      const heartKing2 = Card.createCard(Suit.Hearts, Rank.King, 1);
      const leadingNonTrumpPair = [heartKing1, heartKing2];

      // Create two single trump cards (FOLLOWING play - should be invalid in real game but testing comparison logic)
      const spadeThree = Card.createCard(Suit.Spades, Rank.Three, 0);
      const spadeFour = Card.createCard(Suit.Spades, Rank.Four, 0);
      const followingTwoSingleTrumps = [spadeThree, spadeFour];

      // Verify that the combos are correctly identified
      expect(getComboType(leadingNonTrumpPair, trumpInfo)).toBe(ComboType.Pair);
      expect(getComboType(followingTwoSingleTrumps, trumpInfo)).toBe(ComboType.Single); // Two singles, not a pair

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
      const clubQueen1 = Card.createCard(Suit.Clubs, Rank.Queen, 0);
      const clubQueen2 = Card.createCard(Suit.Clubs, Rank.Queen, 1);
      const leadingNonTrumpPair = [clubQueen1, clubQueen2];

      // Create two single trump cards (FOLLOWING - different trump types)
      const spadeTwo = Card.createCard(Suit.Spades, Rank.Two, 0); // Trump rank + trump suit
      const heartTwo = Card.createCard(Suit.Hearts, Rank.Two, 0); // Trump rank only
      const followingTwoSingleTrumps = [spadeTwo, heartTwo];

      // Verify types
      expect(getComboType(leadingNonTrumpPair, trumpInfo)).toBe(ComboType.Pair);
      expect(getComboType(followingTwoSingleTrumps, trumpInfo)).toBe(ComboType.Single);

      // Leading pair should beat following two singles (wrong combination type to follow)
      const result = compareCardCombos(leadingNonTrumpPair, followingTwoSingleTrumps, trumpInfo);
      expect(result).toBeGreaterThan(0);
    });

    test('LEADING non-trump pair (Diamonds A-A) should beat FOLLOWING two single trump cards (Small Joker, Spades 2)', () => {
      // Create a non-trump pair (LEADING)
      const diamondAce1 = Card.createCard(Suit.Diamonds, Rank.Ace, 0);
      const diamondAce2 = Card.createCard(Suit.Diamonds, Rank.Ace, 1);
      const leadingNonTrumpPair = [diamondAce1, diamondAce2];

      // Create two single trump cards (FOLLOWING - joker + trump card, wrong combination type)
      const smallJoker = Card.createJoker(JokerType.Small, 0);
      const spadeTwo = Card.createCard(Suit.Spades, Rank.Two, 0);
      const followingTwoSingleTrumps = [smallJoker, spadeTwo];

      // Verify types
      expect(getComboType(leadingNonTrumpPair, trumpInfo)).toBe(ComboType.Pair);
      expect(getComboType(followingTwoSingleTrumps, trumpInfo)).toBe(ComboType.Single);

      // Leading pair should beat following two singles (wrong combination type to follow)
      const result = compareCardCombos(leadingNonTrumpPair, followingTwoSingleTrumps, trumpInfo);
      expect(result).toBeGreaterThan(0);
    });
  });

  describe('Correct behavior: Trump pairs should beat non-trump pairs', () => {
    test('Trump pair (Spades 3-3) should beat non-trump pair (Hearts K-K)', () => {
      // Create a trump pair
      const spadeThree1 = Card.createCard(Suit.Spades, Rank.Three, 0);
      const spadeThree2 = Card.createCard(Suit.Spades, Rank.Three, 1);
      const trumpPair = [spadeThree1, spadeThree2];

      // Create a non-trump pair
      const heartKing1 = Card.createCard(Suit.Hearts, Rank.King, 0);
      const heartKing2 = Card.createCard(Suit.Hearts, Rank.King, 1);
      const nonTrumpPair = [heartKing1, heartKing2];

      // Verify types
      expect(getComboType(trumpPair, trumpInfo)).toBe(ComboType.Pair);
      expect(getComboType(nonTrumpPair, trumpInfo)).toBe(ComboType.Pair);

      // Trump pair should beat non-trump pair (this should work correctly)
      const result = compareCardCombos(trumpPair, nonTrumpPair, trumpInfo);
      expect(result).toBeGreaterThan(0);
    });

    test('Trump rank pair (Hearts 2-2) should beat non-trump pair (Clubs A-A)', () => {
      // Create a trump rank pair (not trump suit)
      const heartTwo1 = Card.createCard(Suit.Hearts, Rank.Two, 0);
      const heartTwo2 = Card.createCard(Suit.Hearts, Rank.Two, 1);
      const trumpRankPair = [heartTwo1, heartTwo2];

      // Create a non-trump pair
      const clubAce1 = Card.createCard(Suit.Clubs, Rank.Ace, 0);
      const clubAce2 = Card.createCard(Suit.Clubs, Rank.Ace, 1);
      const nonTrumpPair = [clubAce1, clubAce2];

      // Verify types
      expect(getComboType(trumpRankPair, trumpInfo)).toBe(ComboType.Pair);
      expect(getComboType(nonTrumpPair, trumpInfo)).toBe(ComboType.Pair);

      // Trump rank pair should beat non-trump pair
      const result = compareCardCombos(trumpRankPair, nonTrumpPair, trumpInfo);
      expect(result).toBeGreaterThan(0);
    });
  });

  describe('Correct behavior: Single trump should beat single non-trump', () => {
    test('Single trump (Spades 3) should beat single non-trump (Hearts K)', () => {
      // Create single trump
      const spadeThree = Card.createCard(Suit.Spades, Rank.Three, 0);
      const singleTrump = [spadeThree];

      // Create single non-trump
      const heartKing = Card.createCard(Suit.Hearts, Rank.King, 0);
      const singleNonTrump = [heartKing];

      // Single trump should beat single non-trump (this should work correctly)
      const result = compareCardCombos(singleTrump, singleNonTrump, trumpInfo);
      expect(result).toBeGreaterThan(0);
    });
  });

  describe('Combination comparison logic', () => {
    test('Non-trump pair should be recognized as stronger than individual trump cards when follows are invalid', () => {
      // Create a non-trump pair (hearts kings)
      const heartKing1 = Card.createCard(Suit.Hearts, Rank.King, 0);
      const heartKing2 = Card.createCard(Suit.Hearts, Rank.King, 1);
      const nonTrumpPair = [heartKing1, heartKing2];
      
      // Create individual trump cards (these would be invalid follows in real game)
      const spadeThree = Card.createCard(Suit.Spades, Rank.Three, 0);
      const spadeFour = Card.createCard(Suit.Spades, Rank.Four, 0);
      const twoSingleTrumps = [spadeThree, spadeFour];

      // The non-trump pair should be treated as stronger than two unrelated trump cards
      // because proper combinations have precedence over invalid follows
      const result = compareCardCombos(nonTrumpPair, twoSingleTrumps, trumpInfo);
      expect(result).toBeGreaterThan(0);
    });
  });

  describe('Edge cases', () => {
    test('Two trump pairs comparison should work correctly', () => {
      // Create two trump pairs of different ranks
      const spadeTwo1 = Card.createCard(Suit.Spades, Rank.Two, 0);
      const spadeTwo2 = Card.createCard(Suit.Spades, Rank.Two, 1);
      const trumpRankPair = [spadeTwo1, spadeTwo2];

      const spadeThree1 = Card.createCard(Suit.Spades, Rank.Three, 0);
      const spadeThree2 = Card.createCard(Suit.Spades, Rank.Three, 1);
      const trumpSuitPair = [spadeThree1, spadeThree2];

      // Trump rank pair should beat trump suit pair
      const result = compareCardCombos(trumpRankPair, trumpSuitPair, trumpInfo);
      expect(result).toBeGreaterThan(0);
    });

    test('Same rank non-trump pairs should compare correctly', () => {
      // Create two non-trump pairs of same rank, different suits
      const heartKing1 = Card.createCard(Suit.Hearts, Rank.King, 0);
      const heartKing2 = Card.createCard(Suit.Hearts, Rank.King, 1);
      const heartPair = [heartKing1, heartKing2];

      const clubKing1 = Card.createCard(Suit.Clubs, Rank.King, 0);
      const clubKing2 = Card.createCard(Suit.Clubs, Rank.King, 1);
      const clubPair = [clubKing1, clubKing2];

      // Leading pair should win (hearts in this case)
      const result = compareCardCombos(heartPair, clubPair, trumpInfo);
      expect(result).toBeGreaterThan(0);
    });
  });
});