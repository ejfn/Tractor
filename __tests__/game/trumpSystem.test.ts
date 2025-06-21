import { compareCards } from "../../src/game/cardComparison";
import { identifyCombos } from "../../src/game/comboDetection";
import { isTrump } from "../../src/game/gameHelpers";
import { compareCardCombos } from "../../src/game/playProcessing";
import {
  Card,
  ComboType,
  JokerType,
  Rank,
  Suit,
  TrumpInfo,
} from "../../src/types";

/**
 * Comprehensive Trump System Tests
 *
 * This file consolidates all trump-related game logic tests including:
 * - Trump pair formation and hierarchy
 * - Trump following rules and validation
 * - Trump strength calculations and comparison
 * - Joker trump integration
 */

describe("Trump System", () => {
  let trumpInfo: TrumpInfo;

  beforeEach(() => {
    trumpInfo = {
      trumpRank: Rank.Four,
      trumpSuit: Suit.Spades,
    };
  });

  describe("Trump Pair Formation", () => {
    test("should identify trump rank pairs in trump suit", () => {
      const fourSpades1 = Card.createCard(Suit.Spades, Rank.Four, 0);
      const fourSpades2 = Card.createCard(Suit.Spades, Rank.Four, 1);

      const cards = [fourSpades1, fourSpades2];
      const combos = identifyCombos(cards, trumpInfo);
      const pairCombo = combos.find((combo) => combo.type === ComboType.Pair);

      expect(pairCombo).toBeDefined();
      expect(pairCombo?.type).toBe(ComboType.Pair);
      expect(pairCombo?.cards).toEqual([fourSpades1, fourSpades2]);
    });

    test("should identify trump rank pairs in non-trump suits", () => {
      const fourDiamonds1 = Card.createCard(Suit.Diamonds, Rank.Four, 0);
      const fourDiamonds2 = Card.createCard(Suit.Diamonds, Rank.Four, 1);

      const cards = [fourDiamonds1, fourDiamonds2];
      const combos = identifyCombos(cards, trumpInfo);
      const pairCombo = combos.find((combo) => combo.type === ComboType.Pair);

      expect(pairCombo).toBeDefined();
      expect(pairCombo?.type).toBe(ComboType.Pair);
      expect(pairCombo?.cards).toEqual([fourDiamonds1, fourDiamonds2]);
    });

    test("should identify Big Joker pairs", () => {
      const bigJoker1 = Card.createJoker(JokerType.Big, 0);
      const bigJoker2 = Card.createJoker(JokerType.Big, 1);

      const cards = [bigJoker1, bigJoker2];
      const combos = identifyCombos(cards, trumpInfo);
      const pairCombo = combos.find((combo) => combo.type === ComboType.Pair);

      expect(pairCombo).toBeDefined();
      expect(pairCombo?.type).toBe(ComboType.Pair);
      expect(pairCombo?.cards).toEqual([bigJoker1, bigJoker2]);
    });

    test("should identify Small Joker pairs", () => {
      const smallJoker1 = Card.createJoker(JokerType.Small, 0);
      const smallJoker2 = Card.createJoker(JokerType.Small, 1);

      const cards = [smallJoker1, smallJoker2];
      const combos = identifyCombos(cards, trumpInfo);
      const pairCombo = combos.find((combo) => combo.type === ComboType.Pair);

      expect(pairCombo).toBeDefined();
      expect(pairCombo?.type).toBe(ComboType.Pair);
      expect(pairCombo?.cards).toEqual([smallJoker1, smallJoker2]);
    });

    test("should identify trump rank pairs across suits", () => {
      const fourSpades = Card.createCard(Suit.Spades, Rank.Four, 0);
      const fourDiamonds = Card.createCard(Suit.Diamonds, Rank.Four, 0);

      const cards = [fourSpades, fourDiamonds];
      const combos = identifyCombos(cards, trumpInfo);

      // Should identify as two singles but NO pairs
      // Trump cards are treated as same suit for FOLLOWING, but pairs require identical cards
      expect(combos).toHaveLength(2); // 2 singles only
      expect(
        combos.filter((combo) => combo.type === ComboType.Single),
      ).toHaveLength(2);
      expect(
        combos.filter((combo) => combo.type === ComboType.Pair),
      ).toHaveLength(0);

      // Verify both singles are trump rank cards
      const singleCombos = combos.filter(
        (combo) => combo.type === ComboType.Single,
      );
      expect(singleCombos[0].cards[0].rank).toBe(Rank.Four);
      expect(singleCombos[1].cards[0].rank).toBe(Rank.Four);
    });

    test("should not identify mixed joker pairs", () => {
      const bigJoker = Card.createJoker(JokerType.Big, 0);
      const smallJoker = Card.createJoker(JokerType.Small, 0);

      const cards = [bigJoker, smallJoker];
      const combos = identifyCombos(cards, trumpInfo);

      // Should identify as two singles, not a pair
      expect(combos).toHaveLength(2);
      expect(combos.every((combo) => combo.type === ComboType.Single)).toBe(
        true,
      );
    });
  });

  describe("Trump Hierarchy", () => {
    test("should order trump cards correctly: BJ > SJ > trump rank in trump suit > trump rank in other suits > trump suit cards", () => {
      const trumpInfo: TrumpInfo = {
        trumpRank: Rank.Two,
        trumpSuit: Suit.Hearts,
      };

      const bigJoker = Card.createJoker(JokerType.Big, 0);
      const smallJoker = Card.createJoker(JokerType.Small, 0);
      const twoHearts = Card.createCard(Suit.Hearts, Rank.Two, 0); // Trump rank in trump suit
      const twoSpades = Card.createCard(Suit.Spades, Rank.Two, 0); // Trump rank in other suit
      const aceHearts = Card.createCard(Suit.Hearts, Rank.Ace, 0); // Trump suit card

      // Big Joker > Small Joker
      expect(compareCards(bigJoker, smallJoker, trumpInfo)).toBeGreaterThan(0);

      // Small Joker > Trump rank in trump suit
      expect(compareCards(smallJoker, twoHearts, trumpInfo)).toBeGreaterThan(0);

      // Trump rank in trump suit > Trump rank in other suits
      expect(compareCards(twoHearts, twoSpades, trumpInfo)).toBeGreaterThan(0);

      // Trump rank in other suits > Trump suit cards
      expect(compareCards(twoSpades, aceHearts, trumpInfo)).toBeGreaterThan(0);
    });

    test("should handle trump rank cards in different non-trump suits as equal strength", () => {
      const trumpInfo: TrumpInfo = {
        trumpRank: Rank.Two,
        trumpSuit: Suit.Hearts,
      };

      const twoSpades = Card.createCard(Suit.Spades, Rank.Two, 0);
      const twoClubs = Card.createCard(Suit.Clubs, Rank.Two, 0);
      const twoDiamonds = Card.createCard(Suit.Diamonds, Rank.Two, 0);

      // All trump rank cards in non-trump suits should be equal
      expect(compareCards(twoSpades, twoClubs, trumpInfo)).toBe(0);
      expect(compareCards(twoClubs, twoDiamonds, trumpInfo)).toBe(0);
      expect(compareCards(twoSpades, twoDiamonds, trumpInfo)).toBe(0);
    });

    test("should properly rank trump suit cards by rank", () => {
      const trumpInfo: TrumpInfo = {
        trumpRank: Rank.Two,
        trumpSuit: Suit.Hearts,
      };

      const aceHearts = Card.createCard(Suit.Hearts, Rank.Ace, 0);
      const kingHearts = Card.createCard(Suit.Hearts, Rank.King, 0);
      const threeHearts = Card.createCard(Suit.Hearts, Rank.Three, 0);

      // Higher ranks beat lower ranks within trump suit
      expect(compareCards(aceHearts, kingHearts, trumpInfo)).toBeGreaterThan(0);
      expect(compareCards(kingHearts, threeHearts, trumpInfo)).toBeGreaterThan(
        0,
      );
      expect(compareCards(aceHearts, threeHearts, trumpInfo)).toBeGreaterThan(
        0,
      );
    });
  });

  describe("Trump Following Rules", () => {
    test("should require trump cards when trump is led", () => {
      const trumpInfo: TrumpInfo = {
        trumpRank: Rank.Two,
        trumpSuit: Suit.Hearts,
      };

      const bigJoker = Card.createJoker(JokerType.Big, 0);
      const hand = [
        Card.createCard(Suit.Hearts, Rank.Ace, 0), // Trump suit card
        Card.createCard(Suit.Spades, Rank.Two, 0), // Trump rank card
        Card.createCard(Suit.Clubs, Rank.King, 0), // Non-trump card
        bigJoker,
      ];

      // When trump is led, player must follow with trump if they have any
      const trumpCards = hand.filter((card) => isTrump(card, trumpInfo));
      expect(trumpCards).toHaveLength(3); // Hearts Ace, Spades Two, Big Joker

      // All of these are valid trump plays
      trumpCards.forEach((card) => {
        expect(isTrump(card, trumpInfo)).toBe(true);
      });
    });

    test("should allow non-trump when no trump cards available", () => {
      const trumpInfo: TrumpInfo = {
        trumpRank: Rank.Two,
        trumpSuit: Suit.Hearts,
      };

      const hand = [
        Card.createCard(Suit.Spades, Rank.Ace, 0),
        Card.createCard(Suit.Clubs, Rank.King, 0),
        Card.createCard(Suit.Diamonds, Rank.Queen, 0),
      ];

      // When player has no trump, they can play any card
      const trumpCards = hand.filter((card) => isTrump(card, trumpInfo));
      expect(trumpCards).toHaveLength(0);

      // All non-trump cards are valid when no trump available
      hand.forEach((card) => {
        expect(isTrump(card, trumpInfo)).toBe(false);
      });
    });

    test("should handle trump pair requirements correctly", () => {
      const trumpInfo: TrumpInfo = {
        trumpRank: Rank.Two,
        trumpSuit: Suit.Hearts,
      };

      const hand = [
        Card.createCard(Suit.Hearts, Rank.Ace, 0),
        Card.createCard(Suit.Hearts, Rank.Ace, 1), // Trump pair
        Card.createCard(Suit.Spades, Rank.Two, 0),
        Card.createCard(Suit.Spades, Rank.Two, 1), // Trump rank pair
        Card.createCard(Suit.Clubs, Rank.King, 0),
      ];

      // Should identify trump pairs correctly
      const combos = identifyCombos(hand.slice(0, 2), trumpInfo); // Hearts Ace pair
      const pairCombo = combos.find((combo) => combo.type === ComboType.Pair);
      expect(pairCombo).toBeDefined();
      expect(pairCombo?.type).toBe(ComboType.Pair);

      const rankPairCombos = identifyCombos(hand.slice(2, 4), trumpInfo); // Spades Two pair
      const rankPairCombo = rankPairCombos.find(
        (combo) => combo.type === ComboType.Pair,
      );
      expect(rankPairCombo).toBeDefined();
      expect(rankPairCombo?.type).toBe(ComboType.Pair);
    });
  });

  describe("Trump Strength Calculations", () => {
    test("should calculate trump combo strength higher than non-trump", () => {
      const trumpInfo: TrumpInfo = {
        trumpRank: Rank.Two,
        trumpSuit: Suit.Hearts,
      };

      const trumpCards = [
        Card.createCard(Suit.Hearts, Rank.Three, 0),
        Card.createCard(Suit.Hearts, Rank.Three, 1),
      ];

      const nonTrumpCards = [
        Card.createCard(Suit.Spades, Rank.Ace, 0),
        Card.createCard(Suit.Spades, Rank.Ace, 1),
      ];

      // Get combo types

      // Trump combo should beat non-trump combo of same type
      const comparison = compareCardCombos(
        trumpCards,
        nonTrumpCards,
        trumpInfo,
      );
      expect(comparison).toBeGreaterThan(0);
    });

    test("should handle joker combinations as strongest trump", () => {
      const trumpInfo: TrumpInfo = {
        trumpRank: Rank.Two,
        trumpSuit: Suit.Hearts,
      };

      const bigJokerCards = [
        Card.createJoker(JokerType.Big, 0),
        Card.createJoker(JokerType.Big, 1),
      ];

      const trumpSuitCards = [
        Card.createCard(Suit.Hearts, Rank.Ace, 0),
        Card.createCard(Suit.Hearts, Rank.Ace, 1),
      ];

      // Get combo types

      // Big Joker pair should beat trump suit pair
      const comparison = compareCardCombos(
        bigJokerCards,
        trumpSuitCards,
        trumpInfo,
      );
      expect(comparison).toBeGreaterThan(0);
    });

    test("should handle mixed trump combinations correctly", () => {
      const trumpInfo: TrumpInfo = {
        trumpRank: Rank.Two,
        trumpSuit: Suit.Hearts,
      };

      // Test Small Joker pair vs Trump rank pair in trump suit
      const smallJokerCards = [
        Card.createJoker(JokerType.Small, 0),
        Card.createJoker(JokerType.Small, 1),
      ];

      const trumpRankCards = [
        Card.createCard(Suit.Hearts, Rank.Two, 0),
        Card.createCard(Suit.Hearts, Rank.Two, 1),
      ];

      // Get combo types

      // Small Joker pair should beat trump rank pair
      const comparison = compareCardCombos(
        smallJokerCards,
        trumpRankCards,
        trumpInfo,
      );
      expect(comparison).toBeGreaterThan(0);
    });
  });

  describe("Trump Validation and Edge Cases", () => {
    test("should handle no trump suit scenario", () => {
      const noSuitTrump: TrumpInfo = { trumpRank: Rank.Two };

      const twoHearts = Card.createCard(Suit.Hearts, Rank.Two, 0);
      const twoSpades = Card.createCard(Suit.Spades, Rank.Two, 0);
      const bigJoker = Card.createJoker(JokerType.Big, 0);
      const aceHearts = Card.createCard(Suit.Hearts, Rank.Ace, 0);

      // Trump rank cards and jokers should be trump
      expect(isTrump(twoHearts, noSuitTrump)).toBe(true);
      expect(isTrump(twoSpades, noSuitTrump)).toBe(true);
      expect(isTrump(bigJoker, noSuitTrump)).toBe(true);

      // Regular suit cards should not be trump
      expect(isTrump(aceHearts, noSuitTrump)).toBe(false);
    });

    test("should validate trump info consistency", () => {
      const trumpInfo: TrumpInfo = {
        trumpRank: Rank.Two,
        trumpSuit: Suit.Hearts,
      };

      // Trump rank in trump suit should be highest trump card (after jokers)
      const twoHearts = Card.createCard(Suit.Hearts, Rank.Two, 0);
      const smallJoker = Card.createJoker(JokerType.Small, 0);
      const aceHearts = Card.createCard(Suit.Hearts, Rank.Ace, 0);

      expect(isTrump(twoHearts, trumpInfo)).toBe(true);
      expect(compareCards(smallJoker, twoHearts, trumpInfo)).toBeGreaterThan(0);
      expect(compareCards(twoHearts, aceHearts, trumpInfo)).toBeGreaterThan(0);
    });

    test("should handle empty trump scenarios gracefully", () => {
      const trumpInfo: TrumpInfo = {
        trumpRank: Rank.Two,
        trumpSuit: Suit.Hearts,
      };

      const emptyCards: Card[] = [];
      const combos = identifyCombos(emptyCards, trumpInfo);

      expect(combos).toHaveLength(0);
    });

    test("should handle single card trump combinations", () => {
      const trumpInfo: TrumpInfo = {
        trumpRank: Rank.Two,
        trumpSuit: Suit.Hearts,
      };

      const singleTrump = [Card.createCard(Suit.Hearts, Rank.Two, 0)];
      const combos = identifyCombos(singleTrump, trumpInfo);
      const singleCombo = combos.find(
        (combo) => combo.type === ComboType.Single,
      );

      expect(singleCombo).toBeDefined();
      expect(singleCombo?.type).toBe(ComboType.Single);
      const singleCard = singleCombo?.cards?.[0];
      expect(singleCard).toBeDefined();
      if (singleCard) expect(isTrump(singleCard, trumpInfo)).toBe(true);
    });
  });

  describe("Integration with Game Logic", () => {
    test("should integrate trump rules with combination detection", () => {
      const trumpInfo: TrumpInfo = {
        trumpRank: Rank.Two,
        trumpSuit: Suit.Hearts,
      };

      const mixedCards = [
        Card.createCard(Suit.Hearts, Rank.Two, 0), // Trump rank in trump suit
        Card.createCard(Suit.Hearts, Rank.Two, 1), // Trump rank in trump suit (pair)
        Card.createCard(Suit.Spades, Rank.Two, 0), // Trump rank in other suit
        Card.createCard(Suit.Hearts, Rank.Ace, 0), // Trump suit card
        Card.createCard(Suit.Spades, Rank.Ace, 0), // Non-trump card
        Card.createJoker(JokerType.Small, 0), // Joker
      ];

      const combos = identifyCombos(mixedCards.slice(0, 2), trumpInfo);
      const pairCombo = combos.find((combo) => combo.type === ComboType.Pair);
      expect(pairCombo).toBeDefined();
      expect(pairCombo?.type).toBe(ComboType.Pair);

      // Verify all trump cards are correctly identified
      const trumpCards = mixedCards.filter((card) => isTrump(card, trumpInfo));
      expect(trumpCards).toHaveLength(5); // All except Spades Ace
    });

    test("should work with complex trump hierarchies", () => {
      const trumpInfo: TrumpInfo = {
        trumpRank: Rank.Two,
        trumpSuit: Suit.Hearts,
      };

      // Create a complex scenario with all trump types
      const cards = [
        Card.createJoker(JokerType.Big, 0),
        Card.createJoker(JokerType.Small, 0),
        Card.createCard(Suit.Hearts, Rank.Two, 0), // Trump rank in trump suit
        Card.createCard(Suit.Spades, Rank.Two, 0), // Trump rank in other suit
        Card.createCard(Suit.Clubs, Rank.Two, 0), // Trump rank in other suit
        Card.createCard(Suit.Hearts, Rank.Ace, 0), // Trump suit high card
        Card.createCard(Suit.Hearts, Rank.Three, 0), // Trump suit low card
      ];

      // Sort by trump strength (highest to lowest)
      const sortedCards = [...cards].sort((a, b) =>
        compareCards(b, a, trumpInfo),
      );

      // Verify correct trump hierarchy order
      expect(sortedCards[0].joker).toBe(JokerType.Big);
      expect(sortedCards[1].joker).toBe(JokerType.Small);
      expect(sortedCards[2].suit).toBe(Suit.Hearts);
      expect(sortedCards[2].rank).toBe(Rank.Two);
      expect([Suit.Spades, Suit.Clubs]).toContain(sortedCards[3].suit);
      expect([Suit.Spades, Suit.Clubs]).toContain(sortedCards[4].suit);
      expect(sortedCards[5].suit).toBe(Suit.Hearts);
      expect(sortedCards[5].rank).toBe(Rank.Ace);
      expect(sortedCards[6].suit).toBe(Suit.Hearts);
      expect(sortedCards[6].rank).toBe(Rank.Three);
    });
  });
});
