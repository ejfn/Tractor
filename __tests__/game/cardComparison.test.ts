import { compareCards } from "../../src/game/cardComparison";
import { Card, Rank, Suit } from "../../src/types";

describe("Card Comparison Tests", () => {
  const trumpInfo = { trumpSuit: Suit.Hearts, trumpRank: Rank.Two };

  describe("Cross-suit comparisons", () => {
    test("A♣-A♣ pair should NOT beat 4♦-4♦ pair (different suits, both non-trump)", () => {
      // Create the cards
      const aceClubs1 = Card.createCard(Suit.Clubs, Rank.Ace, 0);
      const fourDiamonds1 = Card.createCard(Suit.Diamonds, Rank.Four, 0);

      // Verify neither are trump
      expect(aceClubs1.suit).toBe(Suit.Clubs);
      expect(fourDiamonds1.suit).toBe(Suit.Diamonds);
      expect(trumpInfo.trumpSuit).toBe(Suit.Hearts); // Different from both

      // Test that compareCards correctly rejects cross-suit non-trump comparisons
      expect(() => {
        compareCards(aceClubs1, fourDiamonds1, trumpInfo);
      }).toThrow(
        "compareCards: Invalid comparison between different non-trump suits",
      );

      // The protection ensures different suits cannot be compared directly
      // For trick logic, use evaluateTrickPlay() instead
    });

    test("Trump pair should beat non-trump pair regardless of suit", () => {
      // Individual card comparison - trump should beat non-trump
      const trumpCard = Card.createCard(Suit.Hearts, Rank.Three, 0);
      const nonTrumpCard = Card.createCard(Suit.Diamonds, Rank.Four, 0);

      const comparison = compareCards(trumpCard, nonTrumpCard, trumpInfo);
      expect(comparison).toBeGreaterThan(0); // Trump should beat non-trump
    });
  });

  describe("Same suit comparisons", () => {
    test("Higher rank pair should beat lower rank pair in same suit", () => {
      const aceSpades1 = Card.createCard(Suit.Spades, Rank.Ace, 0);
      const fourSpades1 = Card.createCard(Suit.Spades, Rank.Four, 0);

      // Same suit comparison - Ace should beat 4
      const comparison = compareCards(aceSpades1, fourSpades1, trumpInfo);
      expect(comparison).toBeGreaterThan(0); // Ace should beat 4 in same suit
    });

    test("A♠-A♠ should beat 4♠-4♠ when both are same suit non-trump", () => {
      // This should work correctly - same suit, higher rank wins
      const aceSpadesPair = [
        Card.createCard(Suit.Spades, Rank.Ace, 0),
        Card.createCard(Suit.Spades, Rank.Ace, 0),
      ];
      const fourSpadesPair = [
        Card.createCard(Suit.Spades, Rank.Four, 0),
        Card.createCard(Suit.Spades, Rank.Four, 0),
      ];

      const comparison = compareCards(
        aceSpadesPair[0],
        fourSpadesPair[0],
        trumpInfo,
      );
      expect(comparison).toBeGreaterThan(0);
    });
  });

  describe("Trump suit skipped scenarios", () => {
    // When trump suit is skipped, only trump rank and jokers are trump
    const skippedTrumpInfo = { trumpSuit: undefined, trumpRank: Rank.Two };

    test("A♣-A♣ should NOT beat 4♥-4♥ when trump suit skipped (both non-trump)", () => {
      // No trump suit declared, so Heart cards are regular
      const aceClubs1 = Card.createCard(Suit.Clubs, Rank.Ace, 0);
      const fourHearts1 = Card.createCard(Suit.Hearts, Rank.Four, 0);

      // Neither should be trump since trump suit is not declared
      expect(aceClubs1.suit).toBe(Suit.Clubs);
      expect(fourHearts1.suit).toBe(Suit.Hearts);
      expect(skippedTrumpInfo.trumpSuit).toBe(undefined);

      // Test that compareCards correctly rejects cross-suit non-trump comparisons
      expect(() => {
        compareCards(aceClubs1, fourHearts1, skippedTrumpInfo);
      }).toThrow(
        "compareCards: Invalid comparison between different non-trump suits",
      );
    });

    test("2♠-2♠ should beat A♣-A♣ when trump suit skipped (trump rank vs non-trump)", () => {
      // 2s are trump rank, so they're trump even when trump suit is skipped
      const twoSpades1 = Card.createCard(Suit.Spades, Rank.Two, 0);
      const aceClubs1 = Card.createCard(Suit.Clubs, Rank.Ace, 0);

      // Trump rank (2♠) should beat non-trump (A♣)
      const comparison = compareCards(twoSpades1, aceClubs1, skippedTrumpInfo);
      expect(comparison).toBeGreaterThan(0); // Trump rank should beat non-trump
    });

    test("2♥-2♥ should be trump when trump suit skipped", () => {
      // Even though no trump suit is declared, 2♥ is still trump rank
      const twoHearts1 = Card.createCard(Suit.Hearts, Rank.Two, 0);
      const fourHearts1 = Card.createCard(Suit.Hearts, Rank.Four, 0);

      // 2♥ should be trump (trump rank), but 4♥ should NOT be trump (regular heart)
      const twoHeartsComparison = compareCards(
        twoHearts1,
        fourHearts1,
        skippedTrumpInfo,
      );
      expect(twoHeartsComparison).toBeGreaterThan(0); // 2♥ (trump rank) beats 4♥ (regular)
    });
  });
});
