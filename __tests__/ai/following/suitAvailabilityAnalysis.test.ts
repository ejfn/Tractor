import { analyzeSuitAvailability } from "../../../src/ai/following/suitAvailabilityAnalysis";
import {
  Card,
  ComboType,
  JokerType,
  Rank,
  Suit,
  TrumpInfo,
} from "../../../src/types";

/**
 * Comprehensive tests for suitAvailabilityAnalysis.ts
 *
 * Tests the core foundation of V2 following algorithm:
 * - Strict valid combo detection (no disposal fallbacks)
 * - Proper suit/trump awareness
 * - Correct scenario classification
 */

describe("Suit Availability Analysis", () => {
  const trumpInfo: TrumpInfo = {
    trumpSuit: Suit.Hearts,
    trumpRank: Rank.Two,
  };

  describe("Scenario Classification", () => {
    describe("Void Scenario", () => {
      it("should classify as void when no cards in leading suit (single lead)", () => {
        const leadingCards = [Card.createCard(Suit.Spades, Rank.Ace, 0)]; // Single lead
        const playerHand = [
          Card.createCard(Suit.Hearts, Rank.King, 0),
          Card.createCard(Suit.Diamonds, Rank.Queen, 0),
        ];

        const result = analyzeSuitAvailability(
          leadingCards,
          playerHand,
          trumpInfo,
        );

        expect(result.scenario).toBe("void");
        expect(result.leadingSuit).toBe(Suit.Spades);
        expect(result.availableCount).toBe(0);
      });

      it("should classify as void when no cards in leading suit (pair lead)", () => {
        const leadingCards = Card.createPair(Suit.Spades, Rank.Ace); // Pair lead
        const playerHand = [
          Card.createCard(Suit.Hearts, Rank.King, 0),
          Card.createCard(Suit.Diamonds, Rank.Queen, 0),
        ];

        const result = analyzeSuitAvailability(
          leadingCards,
          playerHand,
          trumpInfo,
        );

        expect(result.scenario).toBe("void");
        expect(result.leadingSuit).toBe(Suit.Spades);
        expect(result.availableCount).toBe(0);
      });

      it("should classify as void when no cards in leading suit (tractor lead)", () => {
        const leadingCards = [
          ...Card.createPair(Suit.Spades, Rank.Ace),
          ...Card.createPair(Suit.Spades, Rank.King),
        ]; // Tractor lead
        const playerHand = [
          Card.createCard(Suit.Hearts, Rank.King, 0),
          Card.createCard(Suit.Diamonds, Rank.Queen, 0),
        ];

        const result = analyzeSuitAvailability(
          leadingCards,
          playerHand,
          trumpInfo,
        );

        expect(result.scenario).toBe("void");
        expect(result.leadingSuit).toBe(Suit.Spades);
        expect(result.availableCount).toBe(0);
      });

      it("should classify as void when only trump rank cards in leading suit", () => {
        const leadingCards = [Card.createCard(Suit.Spades, Rank.Ace, 0)];
        const playerHand = [
          Card.createCard(Suit.Spades, Rank.Two, 0), // Trump rank, excluded from Spades
          Card.createCard(Suit.Hearts, Rank.King, 0),
        ];

        const result = analyzeSuitAvailability(
          leadingCards,
          playerHand,
          trumpInfo,
        );

        expect(result.scenario).toBe("void");
        expect(result.availableCount).toBe(0);
      });
    });

    describe("Insufficient Scenario", () => {
      it("should classify as insufficient when some cards but not enough (pair lead)", () => {
        const leadingCards = Card.createPair(Suit.Spades, Rank.Ace); // Pair lead, needs 2
        const playerHand = [
          Card.createCard(Suit.Spades, Rank.King, 0), // Only 1 card, need 2
          Card.createCard(Suit.Hearts, Rank.Queen, 0),
        ];

        const result = analyzeSuitAvailability(
          leadingCards,
          playerHand,
          trumpInfo,
        );

        expect(result.scenario).toBe("insufficient");
        expect(result.availableCount).toBe(1);
        expect(result.requiredLength).toBe(2);
        expect(result.remainingCards).toHaveLength(1);
      });

      it("should classify as insufficient when some cards but not enough (tractor lead)", () => {
        const leadingCards = [
          ...Card.createPair(Suit.Spades, Rank.Ace),
          ...Card.createPair(Suit.Spades, Rank.King),
        ]; // Tractor lead, needs 4
        const playerHand = [
          Card.createCard(Suit.Spades, Rank.Queen, 0),
          Card.createCard(Suit.Spades, Rank.Jack, 0), // Only 2 cards, need 4
          Card.createCard(Suit.Hearts, Rank.Queen, 0),
        ];

        const result = analyzeSuitAvailability(
          leadingCards,
          playerHand,
          trumpInfo,
        );

        expect(result.scenario).toBe("insufficient");
        expect(result.availableCount).toBe(2);
        expect(result.requiredLength).toBe(4);
        expect(result.remainingCards).toHaveLength(2);
      });

      it("should NOT classify single lead as insufficient (always sufficient)", () => {
        const leadingCards = [Card.createCard(Suit.Spades, Rank.Ace, 0)]; // Single lead, needs 1
        const playerHand = [
          Card.createCard(Suit.Spades, Rank.King, 0), // 1 card available, exactly enough
          Card.createCard(Suit.Hearts, Rank.Queen, 0),
        ];

        const result = analyzeSuitAvailability(
          leadingCards,
          playerHand,
          trumpInfo,
        );

        expect(result.scenario).toBe("valid_combos"); // Should be valid, not insufficient
        expect(result.availableCount).toBe(1);
        expect(result.requiredLength).toBe(1);
      });
    });

    describe("Valid Combos Scenario", () => {
      it("should classify as valid_combos when can form proper pairs", () => {
        const leadingCards = Card.createPair(Suit.Spades, Rank.Ace); // Pair lead
        const playerHand = [
          ...Card.createPair(Suit.Spades, Rank.King), // King pair available
          Card.createCard(Suit.Hearts, Rank.Queen, 0),
        ];

        const result = analyzeSuitAvailability(
          leadingCards,
          playerHand,
          trumpInfo,
        );

        expect(result.scenario).toBe("valid_combos");
        expect(result.validCombos).toHaveLength(1);
        expect(result.validCombos[0].type).toBe(ComboType.Pair);
        expect(result.validCombos[0].cards).toHaveLength(2);
      });

      it("should classify as valid_combos for single leads with any cards", () => {
        const leadingCards = [Card.createCard(Suit.Spades, Rank.Ace, 0)]; // Single lead
        const playerHand = [
          Card.createCard(Suit.Spades, Rank.King, 0),
          Card.createCard(Suit.Spades, Rank.Queen, 0),
          Card.createCard(Suit.Hearts, Rank.Jack, 0),
        ];

        const result = analyzeSuitAvailability(
          leadingCards,
          playerHand,
          trumpInfo,
        );

        expect(result.scenario).toBe("valid_combos");
        expect(result.validCombos).toHaveLength(2); // K♠ and Q♠
        expect(
          result.validCombos.every((combo) => combo.type === ComboType.Single),
        ).toBe(true);

        // Validate specific cards: K♠ and Q♠
        const hasKingSpade = result.validCombos.some((combo) =>
          combo.cards.every(
            (card) => card.rank === Rank.King && card.suit === Suit.Spades,
          ),
        );
        const hasQueenSpade = result.validCombos.some((combo) =>
          combo.cards.every(
            (card) => card.rank === Rank.Queen && card.suit === Suit.Spades,
          ),
        );

        expect(hasKingSpade).toBe(true); // Should have K♠ single
        expect(hasQueenSpade).toBe(true); // Should have Q♠ single
      });

      it("should find individual pairs when pair is led", () => {
        const leadingCards = Card.createPair(Suit.Spades, Rank.Ace); // Pair lead
        const playerHand = [
          ...Card.createPair(Suit.Spades, Rank.King),
          ...Card.createPair(Suit.Spades, Rank.Queen), // Individual pairs
          ...Card.createPair(Suit.Spades, Rank.Jack), // Individual pairs
        ];

        const result = analyzeSuitAvailability(
          leadingCards,
          playerHand,
          trumpInfo,
        );

        expect(result.scenario).toBe("valid_combos");

        // Should find pairs only (not tractors, since pair lead requires pair response)
        const pairCombos = result.validCombos.filter(
          (combo) => combo.type === ComboType.Pair,
        );
        expect(pairCombos.length).toBe(3); // Should have 3 individual pairs: KK, QQ, JJ

        // Validate each pair exists
        const hasKingPair = pairCombos.some((combo) =>
          combo.cards.every((card) => card.rank === Rank.King),
        );
        const hasQueenPair = pairCombos.some((combo) =>
          combo.cards.every((card) => card.rank === Rank.Queen),
        );
        const hasJackPair = pairCombos.some((combo) =>
          combo.cards.every((card) => card.rank === Rank.Jack),
        );

        expect(hasKingPair).toBe(true); // Should have KK pair
        expect(hasQueenPair).toBe(true); // Should have QQ pair
        expect(hasJackPair).toBe(true); // Should have JJ pair

        // All pair combos should be exactly 2 cards
        expect(pairCombos.every((combo) => combo.cards.length === 2)).toBe(
          true,
        );
      });

      it("should classify as valid_combos when can form proper tractors", () => {
        const leadingCards = [
          ...Card.createPair(Suit.Spades, Rank.Ace),
          ...Card.createPair(Suit.Spades, Rank.King),
        ]; // Tractor lead
        const playerHand = [
          ...Card.createPair(Suit.Spades, Rank.Queen),
          ...Card.createPair(Suit.Spades, Rank.Jack), // Q-J tractor (consecutive)
          Card.createCard(Suit.Hearts, Rank.Queen, 0),
        ];

        const result = analyzeSuitAvailability(
          leadingCards,
          playerHand,
          trumpInfo,
        );

        expect(result.scenario).toBe("valid_combos");
        // Should find the Q-J tractor
        expect(
          result.validCombos.some((combo) => combo.type === ComboType.Tractor),
        ).toBe(true);
        // Note: Individual pairs may or may not be included since tractor can satisfy tractor requirement
      });
    });

    describe("Enough Remaining Scenario", () => {
      it("should classify as enough_remaining when has cards but wrong structure (pair lead)", () => {
        const leadingCards = Card.createPair(Suit.Spades, Rank.Ace); // Pair lead
        const playerHand = [
          Card.createCard(Suit.Spades, Rank.King, 0),
          Card.createCard(Suit.Spades, Rank.Queen, 0), // 2 singles, but no pair
          Card.createCard(Suit.Hearts, Rank.Jack, 0),
        ];

        const result = analyzeSuitAvailability(
          leadingCards,
          playerHand,
          trumpInfo,
        );

        expect(result.scenario).toBe("enough_remaining");
        expect(result.availableCount).toBe(2);
        expect(result.remainingCards).toHaveLength(2);
      });

      it("should classify tractor lead with only pairs as enough_remaining", () => {
        const leadingCards = [
          ...Card.createPair(Suit.Spades, Rank.Ace),
          ...Card.createPair(Suit.Spades, Rank.King),
        ]; // Tractor lead
        const playerHand = [
          ...Card.createPair(Suit.Spades, Rank.Queen),
          ...Card.createPair(Suit.Spades, Rank.Ten), // Non-consecutive pairs, no tractor
        ];

        const result = analyzeSuitAvailability(
          leadingCards,
          playerHand,
          trumpInfo,
        );

        expect(result.scenario).toBe("enough_remaining");
        expect(result.availableCount).toBe(4);
      });

      it("should classify tractor lead with enough cards but no tractor as enough_remaining", () => {
        const leadingCards = [
          ...Card.createPair(Suit.Spades, Rank.Ace),
          ...Card.createPair(Suit.Spades, Rank.King),
        ]; // Tractor lead, needs consecutive pairs
        const playerHand = [
          Card.createCard(Suit.Spades, Rank.Queen, 0),
          Card.createCard(Suit.Spades, Rank.Jack, 0),
          Card.createCard(Suit.Spades, Rank.Ten, 0),
          Card.createCard(Suit.Spades, Rank.Nine, 0), // 4 singles, no pairs/tractor
        ];

        const result = analyzeSuitAvailability(
          leadingCards,
          playerHand,
          trumpInfo,
        );

        expect(result.scenario).toBe("enough_remaining");
        expect(result.availableCount).toBe(4);
        expect(result.remainingCards).toHaveLength(4);
      });

      it("should NOT classify single lead as enough_remaining (singles always work)", () => {
        const leadingCards = [Card.createCard(Suit.Spades, Rank.Ace, 0)]; // Single lead
        const playerHand = [
          Card.createCard(Suit.Spades, Rank.King, 0),
          Card.createCard(Suit.Spades, Rank.Queen, 0), // Any singles work for single lead
          Card.createCard(Suit.Hearts, Rank.Jack, 0),
        ];

        const result = analyzeSuitAvailability(
          leadingCards,
          playerHand,
          trumpInfo,
        );

        expect(result.scenario).toBe("valid_combos"); // Should be valid, not enough_remaining
        expect(result.availableCount).toBe(2);
        expect(result.validCombos).toHaveLength(2); // K♠ and Q♠ singles
      });
    });
  });

  describe("Trump Suit Handling", () => {
    it("should include all trump cards when leading suit is trump", () => {
      const leadingCards = [Card.createCard(Suit.Hearts, Rank.Ace, 0)]; // Hearts trump lead
      const playerHand = [
        Card.createCard(Suit.Hearts, Rank.King, 0), // Trump suit card
        Card.createCard(Suit.Spades, Rank.Two, 0), // Trump rank card
        Card.createCard(Suit.Diamonds, Rank.Two, 1), // Trump rank card
        Card.createJoker(JokerType.Big, 0),
        Card.createCard(Suit.Clubs, Rank.Queen, 0), // Non-trump
      ];

      const result = analyzeSuitAvailability(
        leadingCards,
        playerHand,
        trumpInfo,
      );

      expect(result.scenario).toBe("valid_combos");
      expect(result.leadingSuit).toBe(Suit.None); // Trump leads should have Suit.None
      expect(result.availableCount).toBe(4); // All trump cards
      expect(result.validCombos).toHaveLength(4); // 4 singles
    });

    it("should find trump pairs correctly", () => {
      const leadingCards = Card.createPair(Suit.Hearts, Rank.Ace); // Trump pair lead
      const playerHand = [
        ...Card.createPair(Suit.Spades, Rank.Two), // Valid trump rank pair (2♠2♠)
        ...Card.createPair(Suit.Hearts, Rank.King), // Trump suit pair
        ...Card.createJokerPair(JokerType.Big), // Big joker pair
      ];

      const result = analyzeSuitAvailability(
        leadingCards,
        playerHand,
        trumpInfo,
      );

      expect(result.scenario).toBe("valid_combos");
      expect(result.leadingSuit).toBe(Suit.None); // Trump leads should have Suit.None

      // Should find exactly 3 pairs: trump rank pair, trump suit pair, and joker pair
      const pairCombos = result.validCombos.filter(
        (combo) => combo.type === ComboType.Pair,
      );
      expect(pairCombos.length).toBe(3);

      // Validate specific pairs exist:
      // 1. Trump rank pair (2♠2♠)
      const hasTrumpRankPair = pairCombos.some((combo) =>
        combo.cards.every(
          (card) => card.rank === Rank.Two && card.suit === Suit.Spades,
        ),
      );

      // 2. Trump suit pair (K♥K♥)
      const hasTrumpSuitPair = pairCombos.some((combo) =>
        combo.cards.every(
          (card) => card.rank === Rank.King && card.suit === Suit.Hearts,
        ),
      );

      // 3. Big joker pair
      const hasBigJokerPair = pairCombos.some((combo) =>
        combo.cards.every((card) => card.joker === JokerType.Big),
      );

      expect(hasTrumpRankPair).toBe(true); // Should have 2♠2♠ trump rank pair
      expect(hasTrumpSuitPair).toBe(true); // Should have K♥K♥ trump suit pair
      expect(hasBigJokerPair).toBe(true); // Should have Big Joker pair
    });
  });

  describe("Strict Valid Combo Detection", () => {
    it("should NOT return disposal singles for pair lead", () => {
      const leadingCards = Card.createPair(Suit.Spades, Rank.Ace); // Pair lead
      const playerHand = [
        Card.createCard(Suit.Spades, Rank.King, 0),
        Card.createCard(Suit.Spades, Rank.Queen, 0), // 2 different singles, NO pair
      ];

      const result = analyzeSuitAvailability(
        leadingCards,
        playerHand,
        trumpInfo,
      );

      expect(result.scenario).toBe("enough_remaining"); // NOT valid_combos
      expect(result.validCombos).toHaveLength(0);
    });

    it("should NOT return disposal pairs for tractor lead", () => {
      const leadingCards = [
        ...Card.createPair(Suit.Spades, Rank.Ace),
        ...Card.createPair(Suit.Spades, Rank.King),
      ]; // Tractor lead
      const playerHand = [
        ...Card.createPair(Suit.Spades, Rank.Queen),
        ...Card.createPair(Suit.Spades, Rank.Nine), // 2 non-consecutive pairs, NO tractor
      ];

      const result = analyzeSuitAvailability(
        leadingCards,
        playerHand,
        trumpInfo,
      );

      expect(result.scenario).toBe("enough_remaining"); // NOT valid_combos
      expect(result.validCombos).toHaveLength(0);
    });

    it("should find valid tractor when available", () => {
      const leadingCards = [
        ...Card.createPair(Suit.Spades, Rank.Ace),
        ...Card.createPair(Suit.Spades, Rank.King),
      ]; // Tractor lead
      const playerHand = [
        ...Card.createPair(Suit.Spades, Rank.Queen),
        ...Card.createPair(Suit.Spades, Rank.Jack), // Q-J tractor (consecutive)
      ];

      const result = analyzeSuitAvailability(
        leadingCards,
        playerHand,
        trumpInfo,
      );

      expect(result.scenario).toBe("valid_combos");
      expect(
        result.validCombos.some((combo) => combo.type === ComboType.Tractor),
      ).toBe(true);
    });
  });
});

describe("Integration Tests", () => {
  describe("Real Game Scenarios", () => {
    it("should handle Issue 204 scenario correctly", () => {
      // Leading: A♠ pair, Following: Bot3 has both 9♠ pair and 10♠ pair
      const trumpInfo: TrumpInfo = {
        trumpSuit: Suit.Hearts,
        trumpRank: Rank.Two,
      };
      const leadingCards = Card.createPair(Suit.Spades, Rank.Ace);
      const playerHand = [
        ...Card.createPair(Suit.Spades, Rank.Ten),
        ...Card.createPair(Suit.Spades, Rank.Nine),
        Card.createCard(Suit.Hearts, Rank.Eight, 0),
      ];

      const result = analyzeSuitAvailability(
        leadingCards,
        playerHand,
        trumpInfo,
      );

      expect(result.scenario).toBe("valid_combos");
      expect(result.validCombos.length).toBeGreaterThanOrEqual(2); // Should have pairs and/or tractors

      // Should find both individual pairs: 10♠ pair and 9♠ pair
      const pairCombos = result.validCombos.filter(
        (combo) => combo.type === ComboType.Pair,
      );

      // Validate specific pairs exist:
      const hasTenPair = pairCombos.some((combo) =>
        combo.cards.every(
          (card) => card.rank === Rank.Ten && card.suit === Suit.Spades,
        ),
      );
      const hasNinePair = pairCombos.some((combo) =>
        combo.cards.every(
          (card) => card.rank === Rank.Nine && card.suit === Suit.Spades,
        ),
      );

      expect(hasTenPair).toBe(true); // Should have 10♠10♠ pair
      expect(hasNinePair).toBe(true); // Should have 9♠9♠ pair

      // GAME RULE (CLAUDE.md): "Pairs and tractors are different combo types"
      // Should NOT find tractors for pair lead - this is fundamental rule!
      const hasTractor = result.validCombos.some(
        (combo) => combo.type === ComboType.Tractor,
      );
      expect(hasTractor).toBe(false); // RULE: Pair lead = pairs only, NO tractors
    });

    it("should handle trump takeover scenario", () => {
      // Leading: K♠ single, Following: Bot2 has J♥ trump
      const trumpInfo: TrumpInfo = {
        trumpSuit: Suit.Hearts,
        trumpRank: Rank.Two,
      };
      const leadingCards = [Card.createCard(Suit.Spades, Rank.King, 0)];
      const playerHand = [
        Card.createCard(Suit.Hearts, Rank.Jack, 0), // Medium trump
        Card.createCard(Suit.Hearts, Rank.Three, 0), // Low trump
        Card.createCard(Suit.Diamonds, Rank.Queen, 0),
      ];

      const result = analyzeSuitAvailability(
        leadingCards,
        playerHand,
        trumpInfo,
      );

      expect(result.scenario).toBe("void"); // No Spades
      expect(result.leadingSuit).toBe(Suit.Spades);
    });

    it("should handle same-suit disposal scenario", () => {
      // Leading: A♠ pair, Following: Has Spades but no pairs
      const trumpInfo: TrumpInfo = {
        trumpSuit: Suit.Hearts,
        trumpRank: Rank.Two,
      };
      const leadingCards = Card.createPair(Suit.Spades, Rank.Ace);
      const playerHand = [
        Card.createCard(Suit.Spades, Rank.King, 0),
        Card.createCard(Suit.Spades, Rank.Queen, 0), // 2 singles, no pair
        Card.createCard(Suit.Hearts, Rank.Jack, 0),
      ];

      const result = analyzeSuitAvailability(
        leadingCards,
        playerHand,
        trumpInfo,
      );

      expect(result.scenario).toBe("enough_remaining");
      expect(result.remainingCards).toHaveLength(2);
    });
  });
});

describe("Tractor Length Matching Tests", () => {
  const trumpInfo: TrumpInfo = {
    trumpSuit: Suit.Hearts,
    trumpRank: Rank.Two,
  };

  describe("Two-Pair Tractor Lead", () => {
    it("should only find 2-pair tractors when 2-pair tractor is led", () => {
      // GAME RULE: Tractor length matching - 2-pair lead = 2-pair response only
      // Leading: AA-KK (2-pair tractor)
      const leadingCards = [
        ...Card.createPair(Suit.Spades, Rank.Ace),
        ...Card.createPair(Suit.Spades, Rank.King),
      ];

      // Hand: 66-77-88 (3 consecutive pairs)
      const playerHand = [
        ...Card.createPair(Suit.Spades, Rank.Six),
        ...Card.createPair(Suit.Spades, Rank.Seven),
        ...Card.createPair(Suit.Spades, Rank.Eight),
      ];

      const result = analyzeSuitAvailability(
        leadingCards,
        playerHand,
        trumpInfo,
      );

      expect(result.scenario).toBe("valid_combos");

      // Should find tractors
      const tractorCombos = result.validCombos.filter(
        (combo) => combo.type === ComboType.Tractor,
      );

      // Should find exactly 2 different 2-pair tractors: 66-77 and 77-88
      expect(tractorCombos.length).toBe(2);

      // All tractors should be exactly 4 cards (2 pairs)
      expect(tractorCombos.every((tractor) => tractor.cards.length === 4)).toBe(
        true,
      );

      // Verify the specific tractors exist
      const has67Tractor = tractorCombos.some((tractor) => {
        const ranks = tractor.cards.map((card) => card.rank).sort();
        return ranks.join("") === "6677";
      });

      const has78Tractor = tractorCombos.some((tractor) => {
        const ranks = tractor.cards.map((card) => card.rank).sort();
        return ranks.join("") === "7788";
      });

      expect(has67Tractor).toBe(true); // Should have 66-77 tractor
      expect(has78Tractor).toBe(true); // Should have 77-88 tractor

      // Should NOT find the full 3-pair tractor 66-77-88
      const has678Tractor = tractorCombos.some((tractor) => {
        const ranks = tractor.cards.map((card) => card.rank).sort();
        return ranks.join("") === "667788";
      });
      expect(has678Tractor).toBe(false); // Should NOT have 66-77-88 tractor
    });

    it("should find all possible 2-pair tractor combinations", () => {
      // Leading: AA-KK (2-pair tractor)
      const leadingCards = [
        ...Card.createPair(Suit.Spades, Rank.Ace),
        ...Card.createPair(Suit.Spades, Rank.King),
      ];

      // Hand: 55-66-77-88-99 (5 consecutive pairs)
      const playerHand = [
        ...Card.createPair(Suit.Spades, Rank.Five),
        ...Card.createPair(Suit.Spades, Rank.Six),
        ...Card.createPair(Suit.Spades, Rank.Seven),
        ...Card.createPair(Suit.Spades, Rank.Eight),
        ...Card.createPair(Suit.Spades, Rank.Nine),
      ];

      const result = analyzeSuitAvailability(
        leadingCards,
        playerHand,
        trumpInfo,
      );

      expect(result.scenario).toBe("valid_combos");

      const tractorCombos = result.validCombos.filter(
        (combo) => combo.type === ComboType.Tractor,
      );

      // Should find exactly 4 different 2-pair tractors: 55-66, 66-77, 77-88, 88-99
      expect(tractorCombos.length).toBe(4);

      // All should be 2-pair tractors (4 cards each)
      expect(tractorCombos.every((tractor) => tractor.cards.length === 4)).toBe(
        true,
      );
    });
  });

  describe("Three-Pair Tractor Lead", () => {
    it("should only find 3-pair tractors when 3-pair tractor is led", () => {
      // Leading: AAA-KKK-QQQ (3-pair tractor)
      const leadingCards = [
        ...Card.createPair(Suit.Spades, Rank.Ace),
        ...Card.createPair(Suit.Spades, Rank.King),
        ...Card.createPair(Suit.Spades, Rank.Queen),
      ];

      // Hand: 55-66-77-88-99 (5 consecutive pairs)
      const playerHand = [
        ...Card.createPair(Suit.Spades, Rank.Five),
        ...Card.createPair(Suit.Spades, Rank.Six),
        ...Card.createPair(Suit.Spades, Rank.Seven),
        ...Card.createPair(Suit.Spades, Rank.Eight),
        ...Card.createPair(Suit.Spades, Rank.Nine),
      ];

      const result = analyzeSuitAvailability(
        leadingCards,
        playerHand,
        trumpInfo,
      );

      expect(result.scenario).toBe("valid_combos");

      const tractorCombos = result.validCombos.filter(
        (combo) => combo.type === ComboType.Tractor,
      );

      // Should find exactly 3 different 3-pair tractors: 55-66-77, 66-77-88, 77-88-99
      expect(tractorCombos.length).toBe(3);

      // All should be 3-pair tractors (6 cards each)
      expect(tractorCombos.every((tractor) => tractor.cards.length === 6)).toBe(
        true,
      );
    });
  });

  describe("No Overlapping Combinations", () => {
    it("should not return overlapping pairs and tractors for pair lead", () => {
      // Leading: AA (pair lead)
      const leadingCards = Card.createPair(Suit.Spades, Rank.Ace);

      // Hand: 66-77-88 (can form tractor but lead is pair)
      const playerHand = [
        ...Card.createPair(Suit.Spades, Rank.Six),
        ...Card.createPair(Suit.Spades, Rank.Seven),
        ...Card.createPair(Suit.Spades, Rank.Eight),
      ];

      const result = analyzeSuitAvailability(
        leadingCards,
        playerHand,
        trumpInfo,
      );

      expect(result.scenario).toBe("valid_combos");

      // GAME RULE (CLAUDE.md): "Pairs and tractors are different combo types"
      // Should ONLY find pairs, NOT tractors (since pair was led)
      const pairCombos = result.validCombos.filter(
        (combo) => combo.type === ComboType.Pair,
      );
      const tractorCombos = result.validCombos.filter(
        (combo) => combo.type === ComboType.Tractor,
      );

      expect(pairCombos.length).toBe(3); // 66, 77, 88 pairs
      expect(tractorCombos.length).toBe(0); // RULE: No tractors for pair lead

      // All combos should be exactly 2 cards (pairs only)
      expect(
        result.validCombos.every((combo) => combo.cards.length === 2),
      ).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("should handle exactly matching tractor length", () => {
      // Leading: AA-KK (2-pair tractor)
      const leadingCards = [
        ...Card.createPair(Suit.Spades, Rank.Ace),
        ...Card.createPair(Suit.Spades, Rank.King),
      ];

      // Hand: exactly 66-77 (2-pair tractor, perfect match)
      const playerHand = [
        ...Card.createPair(Suit.Spades, Rank.Six),
        ...Card.createPair(Suit.Spades, Rank.Seven),
      ];

      const result = analyzeSuitAvailability(
        leadingCards,
        playerHand,
        trumpInfo,
      );

      expect(result.scenario).toBe("valid_combos");

      const tractorCombos = result.validCombos.filter(
        (combo) => combo.type === ComboType.Tractor,
      );

      // Should find exactly 1 tractor: 66-77
      expect(tractorCombos.length).toBe(1);
      expect(tractorCombos[0].cards.length).toBe(4);
    });

    it("should handle insufficient pairs for tractor length", () => {
      // Leading: AA-KK-QQ (3-pair tractor)
      const leadingCards = [
        ...Card.createPair(Suit.Spades, Rank.Ace),
        ...Card.createPair(Suit.Spades, Rank.King),
        ...Card.createPair(Suit.Spades, Rank.Queen),
      ];

      // Hand: 66-77 + 99-33 (4 non-consecutive pairs, enough cards but wrong structure)
      const playerHand = [
        ...Card.createPair(Suit.Spades, Rank.Six),
        ...Card.createPair(Suit.Spades, Rank.Seven),
        ...Card.createPair(Suit.Spades, Rank.Nine),
        ...Card.createPair(Suit.Spades, Rank.Three),
      ];

      const result = analyzeSuitAvailability(
        leadingCards,
        playerHand,
        trumpInfo,
      );

      expect(result.scenario).toBe("enough_remaining");
      expect(result.validCombos.length).toBe(0); // No valid 3-pair tractors
    });
  });
});
