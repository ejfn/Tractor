import { selectCardsByStrategicValue } from "../../../src/ai/following/strategicSelection";
import { Card, Rank, Suit, TrumpInfo } from "../../../src/types";

describe("Strategic Selection - Pair Preservation", () => {
  const trumpInfo: TrumpInfo = {
    trumpSuit: Suit.Hearts,
    trumpRank: Rank.Two,
  };

  describe("selectCardsByStrategicValue", () => {
    it("should preserve pairs when selecting singles", () => {
      // Hand: K♠K♠ (pair), Q♠, J♠, 10♠ (multiple singles from same suit)
      const cards = [
        ...Card.createPair(Suit.Spades, Rank.King), // K♠K♠ pair
        Card.createCard(Suit.Spades, Rank.Queen, 0), // Q♠ single
        Card.createCard(Suit.Spades, Rank.Jack, 0), // J♠ single
        Card.createCard(Suit.Spades, Rank.Ten, 0), // 10♠ single
      ];

      // Select 1 card - should pick highest unpaired card (Q♠), preserve K♠K♠ pair
      const result = selectCardsByStrategicValue(
        cards,
        trumpInfo,
        "basic",
        "highest",
        1,
      );

      expect(result).toHaveLength(1);
      // Should NOT select King (which would break the pair)
      expect(result[0].rank).not.toBe(Rank.King);
      // Should select Queen (highest strategic value among unpaired cards)
      expect(result[0].rank).toBe(Rank.Queen);
    });

    it("should only break pairs when no unpaired cards available", () => {
      // Hand: K♠K♠ (pair), Q♠Q♠ (pair) - no singles
      const cards = [
        ...Card.createPair(Suit.Spades, Rank.King),
        ...Card.createPair(Suit.Spades, Rank.Queen),
      ];

      // Select 1 card - must break a pair since no unpaired cards exist
      const result = selectCardsByStrategicValue(
        cards,
        trumpInfo,
        "basic",
        "highest",
        1,
      );

      expect(result).toHaveLength(1);
      // Since all cards are paired, it will pick from paired cards by strategic value
      // King has higher strategic value than Queen
      expect(result[0].rank).toBe(Rank.King);
    });

    it("should preserve pairs when selecting multiple singles", () => {
      // Hand: A♠A♠ (pair), K♠, Q♠, J♠ (singles)
      const cards = [
        ...Card.createPair(Suit.Spades, Rank.Ace),
        Card.createCard(Suit.Spades, Rank.King, 0),
        Card.createCard(Suit.Spades, Rank.Queen, 0),
        Card.createCard(Suit.Spades, Rank.Jack, 0),
      ];

      // Select 2 cards - should pick 2 singles, preserve A♠A♠ pair
      const result = selectCardsByStrategicValue(
        cards,
        trumpInfo,
        "basic",
        "highest",
        2,
      );

      expect(result).toHaveLength(2);
      // Should NOT contain Ace (preserve the pair)
      expect(result.every((card) => card.rank !== Rank.Ace)).toBe(true);
      // Should contain the 2 highest unpaired cards (King and Queen)
      const ranks = result.map((card) => card.rank).sort();
      expect(ranks).toEqual([Rank.King, Rank.Queen]);
    });

    it("should work correctly with mixed pairs and singles", () => {
      // Hand: K♠K♠, Q♠Q♠ (pairs), J♠, 10♠, 9♠ (singles)
      const cards = [
        ...Card.createPair(Suit.Spades, Rank.King),
        ...Card.createPair(Suit.Spades, Rank.Queen),
        Card.createCard(Suit.Spades, Rank.Jack, 0),
        Card.createCard(Suit.Spades, Rank.Ten, 0),
        Card.createCard(Suit.Spades, Rank.Nine, 0),
      ];

      // Select 3 cards - should use all 3 singles before breaking any pairs
      const result = selectCardsByStrategicValue(
        cards,
        trumpInfo,
        "basic",
        "highest",
        3,
      );

      expect(result).toHaveLength(3);
      // Should be the 3 singles: 10♠, 9♠, J♠ (sorted alphabetically)
      const ranks = result.map((card) => card.rank).sort();
      expect(ranks).toEqual([Rank.Ten, Rank.Nine, Rank.Jack]);
      // Should NOT break any pairs
      expect(
        result.every((card) => ![Rank.King, Rank.Queen].includes(card.rank)),
      ).toBe(true);
    });

    it("should respect direction (lowest) while preserving pairs", () => {
      // Hand: A♠A♠ (pair), K♠, Q♠ (singles)
      const cards = [
        ...Card.createPair(Suit.Spades, Rank.Ace),
        Card.createCard(Suit.Spades, Rank.King, 0),
        Card.createCard(Suit.Spades, Rank.Queen, 0),
      ];

      // Select 1 card with "lowest" direction - should pick lowest unpaired card
      const result = selectCardsByStrategicValue(
        cards,
        trumpInfo,
        "basic",
        "lowest",
        1,
      );

      expect(result).toHaveLength(1);
      // Should pick Queen (lowest unpaired card), preserve A♠A♠ pair
      expect(result[0].rank).toBe(Rank.Queen);
    });
  });
});
