import { describe, expect, test } from "@jest/globals";
import { canBeatCombo } from "../../src/game/cardComparison";
import { getComboType } from "../../src/game/comboDetection";
import { Card, ComboType, Rank, Suit } from "../../src/types";
import { createTrumpScenarios } from "../helpers";

describe("Issue #88: Non-trump pair vs single trumps bug", () => {
  // Standard trump info for tests - Spades trump, rank 2
  const trumpInfo = createTrumpScenarios.spadesTrump();

  describe("Correct behavior: Trump pairs should beat non-trump pairs", () => {
    test("Trump pair (Spades 3-3) should beat non-trump pair (Hearts K-K)", () => {
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
      const canTrumpBeat = canBeatCombo(trumpPair, nonTrumpPair, trumpInfo);
      expect(canTrumpBeat).toBe(true);
    });

    test("Trump rank pair (Hearts 2-2) should beat non-trump pair (Clubs A-A)", () => {
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
      const canTrumpRankBeat = canBeatCombo(
        trumpRankPair,
        nonTrumpPair,
        trumpInfo,
      );
      expect(canTrumpRankBeat).toBe(true);
    });
  });

  describe("Correct behavior: Single trump should beat single non-trump", () => {
    test("Single trump (Spades 3) should beat single non-trump (Hearts K)", () => {
      // Create single trump
      const spadeThree = Card.createCard(Suit.Spades, Rank.Three, 0);
      const singleTrump = [spadeThree];

      // Create single non-trump
      const heartKing = Card.createCard(Suit.Hearts, Rank.King, 0);
      const singleNonTrump = [heartKing];

      // Single trump should beat single non-trump (this should work correctly)
      const canSingleTrumpBeat = canBeatCombo(
        singleTrump,
        singleNonTrump,
        trumpInfo,
      );
      expect(canSingleTrumpBeat).toBe(true);
    });
  });

  describe("Edge cases", () => {
    test("Two trump pairs comparison should work correctly", () => {
      // Create two trump pairs of different ranks
      const spadeTwo1 = Card.createCard(Suit.Spades, Rank.Two, 0);
      const spadeTwo2 = Card.createCard(Suit.Spades, Rank.Two, 1);
      const trumpRankPair = [spadeTwo1, spadeTwo2];

      const spadeThree1 = Card.createCard(Suit.Spades, Rank.Three, 0);
      const spadeThree2 = Card.createCard(Suit.Spades, Rank.Three, 1);
      const trumpSuitPair = [spadeThree1, spadeThree2];

      // Trump rank pair should beat trump suit pair
      const canTrumpRankBeat = canBeatCombo(
        trumpRankPair,
        trumpSuitPair,
        trumpInfo,
      );
      expect(canTrumpRankBeat).toBe(true);
    });
  });
});
