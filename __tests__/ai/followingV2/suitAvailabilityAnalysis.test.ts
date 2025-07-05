import {
  analyzeSuitAvailability,
  getComboRequirements,
  isComboTypeCompatible,
} from "../../../src/ai/followingV2/core/suitAvailabilityAnalysis";
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
        expect(result.reasoning).toContain("void_in_leading_suit");
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
        expect(result.reasoning).toContain("void_in_leading_suit");
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
        expect(result.reasoning).toContain("void_in_leading_suit");
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
        expect(result.reasoning).toContain("insufficient_cards_available");
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
        expect(result.reasoning).toContain("insufficient_cards_available");
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
        expect(result.reasoning).toContain("valid_combos_found_1");
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
        expect(result.reasoning).toContain("enough_cards_wrong_structure");
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
        expect(result.reasoning).toContain("enough_cards_wrong_structure");
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
        Card.createCard(Suit.Spades, Rank.Two, 0),
        Card.createCard(Suit.Diamonds, Rank.Two, 1), // Trump rank pair
        ...Card.createPair(Suit.Hearts, Rank.King), // Trump suit pair
        Card.createJoker(JokerType.Big, 0),
        Card.createJoker(JokerType.Big, 1), // Big joker pair
      ];

      const result = analyzeSuitAvailability(
        leadingCards,
        playerHand,
        trumpInfo,
      );

      expect(result.scenario).toBe("valid_combos");
      expect(result.leadingSuit).toBe(Suit.None); // Trump leads should have Suit.None

      // Should find at least 3 pairs: trump rank pair, trump suit pair, and joker pair
      const pairCombos = result.validCombos.filter(
        (combo) => combo.type === ComboType.Pair,
      );
      expect(pairCombos.length).toBeGreaterThanOrEqual(3);

      // Validate specific pairs exist:
      // 1. Trump rank pair (2♠ + 2♦)
      const hasTrumpRankPair = pairCombos.some((combo) =>
        combo.cards.every((card) => card.rank === Rank.Two),
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

      expect(hasTrumpRankPair).toBe(true); // Should have 2♠2♦ trump rank pair
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

  describe("Edge Cases", () => {
    it("should handle mixed rank pairs in trump", () => {
      const leadingCards = Card.createPair(Suit.Hearts, Rank.Ace); // Trump pair lead
      const playerHand = [
        Card.createCard(Suit.Spades, Rank.Two, 0), // Trump rank
        Card.createCard(Suit.Clubs, Rank.Two, 1), // Different trump rank suit
        Card.createCard(Suit.Hearts, Rank.King, 0),
      ];

      const result = analyzeSuitAvailability(
        leadingCards,
        playerHand,
        trumpInfo,
      );

      expect(result.scenario).toBe("valid_combos");
      expect(
        result.validCombos.some((combo) => combo.type === ComboType.Pair),
      ).toBe(true);
    });
  });
});

describe("Helper Functions", () => {
  describe("isComboTypeCompatible", () => {
    it("should allow exact matches", () => {
      expect(isComboTypeCompatible(ComboType.Pair, ComboType.Pair)).toBe(true);
      expect(isComboTypeCompatible(ComboType.Tractor, ComboType.Tractor)).toBe(
        true,
      );
      expect(isComboTypeCompatible(ComboType.Single, ComboType.Single)).toBe(
        true,
      );
    });

    it("should allow tractors for pair requirements", () => {
      expect(isComboTypeCompatible(ComboType.Tractor, ComboType.Pair)).toBe(
        true,
      );
    });

    it("should allow any combo for single requirements", () => {
      expect(isComboTypeCompatible(ComboType.Pair, ComboType.Single)).toBe(
        true,
      );
      expect(isComboTypeCompatible(ComboType.Tractor, ComboType.Single)).toBe(
        true,
      );
      expect(isComboTypeCompatible(ComboType.Single, ComboType.Single)).toBe(
        true,
      );
    });

    it("should not allow lower types for higher requirements", () => {
      expect(isComboTypeCompatible(ComboType.Pair, ComboType.Tractor)).toBe(
        false,
      );
      expect(isComboTypeCompatible(ComboType.Single, ComboType.Pair)).toBe(
        false,
      );
      expect(isComboTypeCompatible(ComboType.Single, ComboType.Tractor)).toBe(
        false,
      );
    });
  });

  describe("getComboRequirements", () => {
    it("should return correct requirements for each combo type", () => {
      const singleReq = getComboRequirements(ComboType.Single, 3);
      expect(singleReq.minimumSingles).toBe(3);
      expect(singleReq.canUseMixed).toBe(true);

      const pairReq = getComboRequirements(ComboType.Pair, 2);
      expect(pairReq.minimumPairs).toBe(1);
      expect(pairReq.canUseMixed).toBe(false);

      const tractorReq = getComboRequirements(ComboType.Tractor, 4);
      expect(tractorReq.minimumTractors).toBe(1);
      expect(tractorReq.canUseMixed).toBe(false);
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

      // Should also find the 10-9 tractor they can form
      const hasTractor = result.validCombos.some(
        (combo) => combo.type === ComboType.Tractor,
      );
      expect(hasTractor).toBe(true); // Should have 10♠10♠-9♠9♠ tractor
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
