import {
  findAllTractors,
  getTractorContext,
  getTractorRank,
  getTractorTypeDescription,
  isValidTractor,
} from "../../src/game/tractorLogic";
import {
  Card,
  ComboType,
  JokerType,
  Rank,
  Suit,
  TrumpInfo,
} from "../../src/types";

/**
 * Advanced Tractor Rules Tests - Issue #177
 *
 * Tests the new unified tractor-rank system for:
 * 1. Trump suit rank pair + off-suit rank pair tractors
 * 2. Rank-skip tractors (any suit when trump rank creates gap)
 * 3. Multi-pair rank-skip tractors
 * 4. Verification that off-suit rank pairs don't form tractors
 */

describe("Advanced Tractor Rules - Unified Tractor Rank System", () => {
  describe("Tractor Rank Calculation", () => {
    const trumpInfo: TrumpInfo = {
      trumpSuit: Suit.Spades,
      trumpRank: Rank.Seven,
    };

    test("should assign correct tractor ranks for jokers", () => {
      const bigJoker = Card.createJoker(JokerType.Big, 0);
      const smallJoker = Card.createJoker(JokerType.Small, 0);

      expect(getTractorRank(bigJoker, trumpInfo)).toBe(1018);
      expect(getTractorRank(smallJoker, trumpInfo)).toBe(1017);
    });

    test("should assign correct tractor ranks for trump rank cards", () => {
      const trumpSuitRank = Card.createCard(Suit.Spades, Rank.Seven, 0);
      const offSuitRank1 = Card.createCard(Suit.Hearts, Rank.Seven, 0);
      const offSuitRank2 = Card.createCard(Suit.Clubs, Rank.Seven, 0);

      expect(getTractorRank(trumpSuitRank, trumpInfo)).toBe(1016); // Trump suit rank
      expect(getTractorRank(offSuitRank1, trumpInfo)).toBe(1015); // Off-suit trump rank
      expect(getTractorRank(offSuitRank2, trumpInfo)).toBe(1015); // Off-suit trump rank
    });

    test("should assign correct tractor ranks for regular cards with trump rank bridging", () => {
      const trumpInfo7: TrumpInfo = {
        trumpSuit: Suit.Spades,
        trumpRank: Rank.Seven,
      };

      // Cards below trump rank (7) should be shifted up by 1, plus Hearts suit offset (100)
      expect(
        getTractorRank(Card.createCard(Suit.Hearts, Rank.Three, 0), trumpInfo7),
      ).toBe(104); // (3+1) + 100
      expect(
        getTractorRank(Card.createCard(Suit.Hearts, Rank.Four, 0), trumpInfo7),
      ).toBe(105); // (4+1) + 100
      expect(
        getTractorRank(Card.createCard(Suit.Hearts, Rank.Five, 0), trumpInfo7),
      ).toBe(106); // (5+1) + 100
      expect(
        getTractorRank(Card.createCard(Suit.Hearts, Rank.Six, 0), trumpInfo7),
      ).toBe(107); // (6+1) + 100

      // Cards above trump rank (7) should remain unchanged, plus Hearts suit offset (100)
      expect(
        getTractorRank(Card.createCard(Suit.Hearts, Rank.Eight, 0), trumpInfo7),
      ).toBe(108); // 8 + 100
      expect(
        getTractorRank(Card.createCard(Suit.Hearts, Rank.Nine, 0), trumpInfo7),
      ).toBe(109); // 9 + 100
      expect(
        getTractorRank(Card.createCard(Suit.Hearts, Rank.King, 0), trumpInfo7),
      ).toBe(113); // 13 + 100
      expect(
        getTractorRank(Card.createCard(Suit.Hearts, Rank.Ace, 0), trumpInfo7),
      ).toBe(114); // 14 + 100
    });

    test("should assign correct tractor ranks when trump rank is Ace", () => {
      const trumpInfoAce: TrumpInfo = {
        trumpSuit: Suit.Hearts,
        trumpRank: Rank.Ace,
      };

      // All regular cards below Ace should be shifted up by 1, plus Spades suit offset (0)
      expect(
        getTractorRank(
          Card.createCard(Suit.Spades, Rank.King, 0),
          trumpInfoAce,
        ),
      ).toBe(14); // (13+1) + 0
      expect(
        getTractorRank(
          Card.createCard(Suit.Spades, Rank.Queen, 0),
          trumpInfoAce,
        ),
      ).toBe(13); // (12+1) + 0
      expect(
        getTractorRank(
          Card.createCard(Suit.Spades, Rank.Three, 0),
          trumpInfoAce,
        ),
      ).toBe(4); // (3+1) + 0

      // Trump rank cards
      expect(
        getTractorRank(Card.createCard(Suit.Hearts, Rank.Ace, 0), trumpInfoAce),
      ).toBe(1016); // Trump suit
      expect(
        getTractorRank(Card.createCard(Suit.Spades, Rank.Ace, 0), trumpInfoAce),
      ).toBe(1015); // Off-suit
    });
  });

  describe("Tractor Context Grouping", () => {
    const trumpInfo: TrumpInfo = {
      trumpSuit: Suit.Spades,
      trumpRank: Rank.Seven,
    };

    test("should group jokers in joker context", () => {
      const bigJoker = Card.createJoker(JokerType.Big, 0);
      const smallJoker = Card.createJoker(JokerType.Small, 0);

      expect(getTractorContext(bigJoker, trumpInfo)).toBe("joker");
      expect(getTractorContext(smallJoker, trumpInfo)).toBe("joker");
    });

    test("should group trump rank cards in trump_rank context", () => {
      const trumpSuitRank = Card.createCard(Suit.Spades, Rank.Seven, 0);
      const offSuitRank = Card.createCard(Suit.Hearts, Rank.Seven, 0);

      expect(getTractorContext(trumpSuitRank, trumpInfo)).toBe("trump_rank");
      expect(getTractorContext(offSuitRank, trumpInfo)).toBe("trump_rank");
    });

    test("should group regular cards by suit", () => {
      const heartCard = Card.createCard(Suit.Hearts, Rank.Six, 0);
      const spadeCard = Card.createCard(Suit.Spades, Rank.Eight, 0);

      expect(getTractorContext(heartCard, trumpInfo)).toBe(Suit.Hearts);
      expect(getTractorContext(spadeCard, trumpInfo)).toBe(Suit.Spades);
    });
  });

  describe("Trump Cross-Suit Tractors", () => {
    test("should form tractor with trump suit rank pair + off-suit rank pair", () => {
      const trumpInfo: TrumpInfo = {
        trumpSuit: Suit.Spades,
        trumpRank: Rank.Two,
      };

      const cards = [
        Card.createCard(Suit.Spades, Rank.Two, 0),
        Card.createCard(Suit.Spades, Rank.Two, 1),
        Card.createCard(Suit.Hearts, Rank.Two, 0),
        Card.createCard(Suit.Hearts, Rank.Two, 1),
      ];

      const tractors = findAllTractors(cards, trumpInfo);
      expect(tractors).toHaveLength(1);
      expect(tractors[0].type).toBe(ComboType.Tractor);
      expect(tractors[0].cards).toHaveLength(4);

      const description = getTractorTypeDescription(cards, trumpInfo);
      expect(description).toBe("Trump cross-suit tractor");
    });

    test("should NOT form tractor with only off-suit rank pairs", () => {
      const trumpInfo: TrumpInfo = {
        trumpSuit: Suit.Spades,
        trumpRank: Rank.Two,
      };

      const cards = [
        Card.createCard(Suit.Hearts, Rank.Two, 0),
        Card.createCard(Suit.Hearts, Rank.Two, 1),
        Card.createCard(Suit.Clubs, Rank.Two, 0),
        Card.createCard(Suit.Clubs, Rank.Two, 1),
      ];

      const tractors = findAllTractors(cards, trumpInfo);
      expect(tractors).toHaveLength(0); // No tractors should be formed

      expect(isValidTractor(cards, trumpInfo)).toBe(false);
    });

    test("should form tractor with trump suit + off-suit trump rank pairs", () => {
      const trumpInfo: TrumpInfo = {
        trumpSuit: Suit.Hearts,
        trumpRank: Rank.King,
      };

      const cards = [
        Card.createCard(Suit.Hearts, Rank.King, 0),
        Card.createCard(Suit.Hearts, Rank.King, 1),
        Card.createCard(Suit.Spades, Rank.King, 0),
        Card.createCard(Suit.Spades, Rank.King, 1),
        Card.createCard(Suit.Clubs, Rank.King, 0),
        Card.createCard(Suit.Clubs, Rank.King, 1),
      ];

      const tractors = findAllTractors(cards, trumpInfo);
      expect(tractors).toHaveLength(2); // Should find ALL combinations: K♥K♥+K♠K♠ AND K♥K♥+K♣K♣

      // Both tractors should be valid
      expect(tractors[0].type).toBe(ComboType.Tractor);
      expect(tractors[0].cards).toHaveLength(4); // Two pairs: trump suit rank + off-suit rank
      expect(tractors[1].type).toBe(ComboType.Tractor);
      expect(tractors[1].cards).toHaveLength(4); // Two pairs: trump suit rank + off-suit rank

      // Both tractors should include trump suit pair (Hearts)
      for (const tractor of tractors) {
        const heartKings = tractor.cards.filter(
          (card) => card.suit === Suit.Hearts && card.rank === Rank.King,
        );
        expect(heartKings).toHaveLength(2); // Should have both Hearts King cards in each tractor
      }
    });
  });

  describe("Rank-Skip Tractors", () => {
    test("should form rank-skip tractor when trump rank creates gap", () => {
      const trumpInfo: TrumpInfo = {
        trumpSuit: Suit.Hearts,
        trumpRank: Rank.Seven,
      };

      const cards = [
        Card.createCard(Suit.Spades, Rank.Six, 0),
        Card.createCard(Suit.Spades, Rank.Six, 1),
        Card.createCard(Suit.Spades, Rank.Eight, 0),
        Card.createCard(Suit.Spades, Rank.Eight, 1),
      ];

      const tractors = findAllTractors(cards, trumpInfo);
      expect(tractors).toHaveLength(1);
      expect(tractors[0].type).toBe(ComboType.Tractor);
      expect(tractors[0].cards).toHaveLength(4);

      expect(isValidTractor(cards, trumpInfo)).toBe(true);

      const description = getTractorTypeDescription(cards, trumpInfo);
      expect(description).toBe("Regular same-suit tractor"); // Appears regular due to bridging
    });

    test("should form multi-pair rank-skip tractor", () => {
      const trumpInfo: TrumpInfo = {
        trumpSuit: Suit.Hearts,
        trumpRank: Rank.Seven,
      };

      const cards = [
        Card.createCard(Suit.Spades, Rank.Six, 0),
        Card.createCard(Suit.Spades, Rank.Six, 1),
        Card.createCard(Suit.Spades, Rank.Eight, 0),
        Card.createCard(Suit.Spades, Rank.Eight, 1),
        Card.createCard(Suit.Spades, Rank.Nine, 0),
        Card.createCard(Suit.Spades, Rank.Nine, 1),
        Card.createCard(Suit.Spades, Rank.Ten, 0),
        Card.createCard(Suit.Spades, Rank.Ten, 1),
      ];

      const tractors = findAllTractors(cards, trumpInfo);
      expect(tractors).toHaveLength(6); // Multiple overlapping tractors

      // Should include the full 4-pair tractor
      const fullTractor = tractors.find((t) => t.cards.length === 8);
      expect(fullTractor).toBeDefined();
      expect(fullTractor?.type).toBe(ComboType.Tractor);
      expect(fullTractor?.cards).toHaveLength(8); // Four pairs

      expect(isValidTractor(cards, trumpInfo)).toBe(true);
    });

    test("should form mixed consecutive and rank-skip tractor", () => {
      const trumpInfo: TrumpInfo = {
        trumpSuit: Suit.Hearts,
        trumpRank: Rank.Seven,
      };

      const cards = [
        Card.createCard(Suit.Spades, Rank.Five, 0),
        Card.createCard(Suit.Spades, Rank.Five, 1),
        Card.createCard(Suit.Spades, Rank.Six, 0),
        Card.createCard(Suit.Spades, Rank.Six, 1),
        Card.createCard(Suit.Spades, Rank.Eight, 0),
        Card.createCard(Suit.Spades, Rank.Eight, 1),
      ];

      const tractors = findAllTractors(cards, trumpInfo);
      expect(tractors).toHaveLength(3); // Multiple overlapping tractors

      // Should include the full 3-pair tractor
      const fullTractor = tractors.find((t) => t.cards.length === 6);
      expect(fullTractor).toBeDefined();
      expect(fullTractor?.type).toBe(ComboType.Tractor);
      expect(fullTractor?.cards).toHaveLength(6); // Three pairs: 5-6-[7]-8

      expect(isValidTractor(cards, trumpInfo)).toBe(true);
    });

    test("should NOT form tractor when gap is not trump rank", () => {
      const trumpInfo: TrumpInfo = {
        trumpSuit: Suit.Hearts,
        trumpRank: Rank.Five,
      };

      const cards = [
        Card.createCard(Suit.Spades, Rank.Six, 0),
        Card.createCard(Suit.Spades, Rank.Six, 1),
        Card.createCard(Suit.Spades, Rank.Eight, 0),
        Card.createCard(Suit.Spades, Rank.Eight, 1),
      ];

      const tractors = findAllTractors(cards, trumpInfo);
      expect(tractors).toHaveLength(0); // No tractor - 7 is not trump rank

      expect(isValidTractor(cards, trumpInfo)).toBe(false);
    });
  });

  describe("Joker Tractors", () => {
    test("should form joker tractor with SJ-SJ + BJ-BJ", () => {
      const trumpInfo: TrumpInfo = {
        trumpSuit: Suit.Hearts,
        trumpRank: Rank.Seven,
      };

      const cards = [
        Card.createJoker(JokerType.Small, 0),
        Card.createJoker(JokerType.Small, 1),
        Card.createJoker(JokerType.Big, 0),
        Card.createJoker(JokerType.Big, 1),
      ];

      const tractors = findAllTractors(cards, trumpInfo);
      expect(tractors).toHaveLength(1);
      expect(tractors[0].type).toBe(ComboType.Tractor);
      expect(tractors[0].cards).toHaveLength(4);

      expect(isValidTractor(cards, trumpInfo)).toBe(true);

      const description = getTractorTypeDescription(cards, trumpInfo);
      expect(description).toBe("Joker tractor");
    });
  });

  describe("Invalid Tractor Combinations", () => {
    test("should NOT form tractor with trump rank + joker pairs", () => {
      const trumpInfo: TrumpInfo = {
        trumpSuit: Suit.Spades,
        trumpRank: Rank.Two,
      };

      const cards = [
        Card.createCard(Suit.Spades, Rank.Two, 0),
        Card.createCard(Suit.Spades, Rank.Two, 1),
        Card.createJoker(JokerType.Small, 0),
        Card.createJoker(JokerType.Small, 1),
      ];

      const tractors = findAllTractors(cards, trumpInfo);
      expect(tractors).toHaveLength(0); // Different contexts, different tractor ranks

      expect(isValidTractor(cards, trumpInfo)).toBe(false);
    });

    test("should NOT form tractor with non-trump cross-suit pairs", () => {
      const trumpInfo: TrumpInfo = {
        trumpSuit: Suit.Hearts,
        trumpRank: Rank.Two,
      };

      const cards = [
        Card.createCard(Suit.Spades, Rank.Six, 0),
        Card.createCard(Suit.Spades, Rank.Six, 1),
        Card.createCard(Suit.Clubs, Rank.Six, 0),
        Card.createCard(Suit.Clubs, Rank.Six, 1),
      ];

      const tractors = findAllTractors(cards, trumpInfo);
      expect(tractors).toHaveLength(0); // Different suits, not trump rank

      expect(isValidTractor(cards, trumpInfo)).toBe(false);
    });

    test("should NOT form tractor with consecutive ranks from different suits", () => {
      const trumpInfo: TrumpInfo = {
        trumpSuit: Suit.Hearts,
        trumpRank: Rank.Two,
      };

      const cards = [
        Card.createCard(Suit.Spades, Rank.Six, 0),
        Card.createCard(Suit.Spades, Rank.Six, 1),
        Card.createCard(Suit.Clubs, Rank.Seven, 0),
        Card.createCard(Suit.Clubs, Rank.Seven, 1),
      ];

      const tractors = findAllTractors(cards, trumpInfo);
      expect(tractors).toHaveLength(0); // No tractors should be formed - different suits

      expect(isValidTractor(cards, trumpInfo)).toBe(false);
    });

    test("should NOT form tractor with insufficient cards", () => {
      const trumpInfo: TrumpInfo = {
        trumpSuit: Suit.Hearts,
        trumpRank: Rank.Seven,
      };

      const cards = [
        Card.createCard(Suit.Spades, Rank.Six, 0),
        Card.createCard(Suit.Spades, Rank.Six, 1),
      ];

      expect(isValidTractor(cards, trumpInfo)).toBe(false);
    });

    test("should NOT form tractor with odd number of cards", () => {
      const trumpInfo: TrumpInfo = {
        trumpSuit: Suit.Hearts,
        trumpRank: Rank.Seven,
      };

      const cards = [
        Card.createCard(Suit.Spades, Rank.Six, 0),
        Card.createCard(Suit.Spades, Rank.Six, 1),
        Card.createCard(Suit.Spades, Rank.Eight, 0),
      ];

      expect(isValidTractor(cards, trumpInfo)).toBe(false);
    });
  });

  describe("Edge Cases", () => {
    test("should handle trump rank at extremes", () => {
      // Trump rank is 3 (low)
      const trumpInfo3: TrumpInfo = {
        trumpSuit: Suit.Hearts,
        trumpRank: Rank.Three,
      };

      const cards3 = [
        Card.createCard(Suit.Spades, Rank.Two, 0),
        Card.createCard(Suit.Spades, Rank.Two, 1),
        Card.createCard(Suit.Spades, Rank.Four, 0),
        Card.createCard(Suit.Spades, Rank.Four, 1),
      ];

      expect(isValidTractor(cards3, trumpInfo3)).toBe(true); // 2-[3]-4 bridged

      // Trump rank is Ace (high)
      const trumpInfoAce: TrumpInfo = {
        trumpSuit: Suit.Hearts,
        trumpRank: Rank.Ace,
      };

      const cardsAce = [
        Card.createCard(Suit.Spades, Rank.King, 0),
        Card.createCard(Suit.Spades, Rank.King, 1),
        Card.createCard(Suit.Spades, Rank.Queen, 0),
        Card.createCard(Suit.Spades, Rank.Queen, 1),
      ];

      expect(isValidTractor(cardsAce, trumpInfoAce)).toBe(true); // Q-K consecutive after shift
    });

    test("should handle complex multi-context scenarios", () => {
      const trumpInfo: TrumpInfo = {
        trumpSuit: Suit.Hearts,
        trumpRank: Rank.Seven,
      };

      const cards = [
        // Trump rank context - should form tractor
        Card.createCard(Suit.Hearts, Rank.Seven, 0),
        Card.createCard(Suit.Hearts, Rank.Seven, 1),
        Card.createCard(Suit.Spades, Rank.Seven, 0),
        Card.createCard(Suit.Spades, Rank.Seven, 1),
        // Regular suit context - should form separate tractor
        Card.createCard(Suit.Clubs, Rank.Six, 0),
        Card.createCard(Suit.Clubs, Rank.Six, 1),
        Card.createCard(Suit.Clubs, Rank.Eight, 0),
        Card.createCard(Suit.Clubs, Rank.Eight, 1),
      ];

      const tractors = findAllTractors(cards, trumpInfo);
      expect(tractors).toHaveLength(2); // Two separate tractors

      // Each should be valid
      expect(tractors[0].type).toBe(ComboType.Tractor);
      expect(tractors[1].type).toBe(ComboType.Tractor);
    });
  });
});
