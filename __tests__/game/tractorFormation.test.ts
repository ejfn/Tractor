import { identifyCombos } from "../../src/game/comboDetection";
import {
  ComboType,
  JokerType,
  Rank,
  Suit,
  TrumpInfo,
  Card,
} from "../../src/types";

describe("Tractor Formation Tests", () => {
  describe("Tractor Formation Validation", () => {
    test("should validate consecutive pairs form tractor", () => {
      const trumpInfo: TrumpInfo = {
        trumpSuit: Suit.Hearts,
        trumpRank: Rank.Two,
      };

      // Valid tractor: consecutive pairs
      const consecutivePairs = [
        ...Card.createPair(Suit.Spades, Rank.Seven),
        ...Card.createPair(Suit.Spades, Rank.Eight),
      ];

      const combos = identifyCombos(consecutivePairs, trumpInfo);
      const tractorCombo = combos.find(
        (combo) => combo.type === ComboType.Tractor,
      );
      expect(tractorCombo).toBeDefined();
      expect(tractorCombo?.type).toBe(ComboType.Tractor);
      expect(tractorCombo?.cards).toHaveLength(4);
    });

    test("should reject non-consecutive pairs as tractor", () => {
      const trumpInfo: TrumpInfo = {
        trumpSuit: Suit.Hearts,
        trumpRank: Rank.Two,
      };

      // Invalid tractor: non-consecutive pairs (7♠-7♠, 9♠-9♠)
      const nonConsecutivePairs = [
        ...Card.createPair(Suit.Spades, Rank.Seven),
        ...Card.createPair(Suit.Spades, Rank.Nine),
      ];

      const combos = identifyCombos(nonConsecutivePairs, trumpInfo);
      // Should identify as 2 separate pairs, not a tractor
      const pairCombos = combos.filter(
        (combo) => combo.type === ComboType.Pair,
      );
      const tractorCombos = combos.filter(
        (combo) => combo.type === ComboType.Tractor,
      );
      expect(pairCombos).toHaveLength(2);
      expect(tractorCombos).toHaveLength(0); // No tractor should be formed
    });

    test("should validate trump tractor formation with jokers", () => {
      const trumpInfo: TrumpInfo = {
        trumpSuit: Suit.Hearts,
        trumpRank: Rank.Two,
      };

      // Special trump tractor: Small Joker pair + Big Joker pair
      const jokerTractor = [
        ...Card.createJokerPair(JokerType.Small),
        ...Card.createJokerPair(JokerType.Big),
      ];

      const combos = identifyCombos(jokerTractor, trumpInfo);
      const tractorCombo = combos.find(
        (combo) => combo.type === ComboType.Tractor,
      );
      expect(tractorCombo).toBeDefined();
      expect(tractorCombo?.type).toBe(ComboType.Tractor);
      expect(tractorCombo?.cards).toHaveLength(4);
    });

    test("should handle mixed suit tractor rejection", () => {
      const trumpInfo: TrumpInfo = {
        trumpSuit: Suit.Hearts,
        trumpRank: Rank.Two,
      };

      // Invalid: pairs from different suits
      const mixedSuitPairs = [
        ...Card.createPair(Suit.Spades, Rank.Seven),
        ...Card.createPair(Suit.Hearts, Rank.Eight),
      ];

      const combos = identifyCombos(mixedSuitPairs, trumpInfo);
      // Should identify as 2 separate pairs, not a tractor
      const pairCombos = combos.filter(
        (combo) => combo.type === ComboType.Pair,
      );
      const tractorCombos = combos.filter(
        (combo) => combo.type === ComboType.Tractor,
      );
      expect(pairCombos).toHaveLength(2);
      expect(tractorCombos).toHaveLength(0); // No tractor should be formed from mixed suits
    });
  });

  describe("Combination Generation", () => {
    test("should validate combination generation for tractor following", () => {
      const trumpInfo: TrumpInfo = {
        trumpSuit: Suit.Hearts,
        trumpRank: Rank.Two,
      };

      // Player hand with various options
      const playerHand = [
        ...Card.createPair(Suit.Spades, Rank.Nine),
        Card.createCard(Suit.Spades, Rank.Ten, 0),
        Card.createCard(Suit.Spades, Rank.Jack, 0),
        Card.createCard(Suit.Hearts, Rank.King, 0),
      ];

      // Get valid combinations for tractor following
      const validCombos = identifyCombos(playerHand, trumpInfo);

      // Should have valid combinations that follow tractor rules
      expect(validCombos.length).toBeGreaterThan(0);

      // Check that we can identify valid pairs from this hand
      const pairCombos = validCombos.filter(
        (combo) => combo.type === ComboType.Pair,
      );
      expect(pairCombos.length).toBeGreaterThan(0);

      // Check that we have the Spades Nine pair
      const spadesPair = pairCombos.find(
        (combo) =>
          combo.cards.length === 2 &&
          combo.cards.every(
            (card) => card.suit === Suit.Spades && card.rank === Rank.Nine,
          ),
      );
      expect(spadesPair).toBeDefined();
    });
  });
});
