import { Card, JokerType, Rank, Suit } from "../../src/types";
import {
  findPairCards,
  findTractorCards,
  getAutoSelectedCards,
} from "../../src/utils/cardAutoSelection";
import { createTrumpInfo } from "../helpers";

describe("Card Auto-Selection Utils", () => {
  describe("findPairCards", () => {
    test("should find regular pair cards", () => {
      const hand = [
        Card.createCard(Suit.Hearts, Rank.King, 0),
        Card.createCard(Suit.Hearts, Rank.King, 1),
        Card.createCard(Suit.Spades, Rank.Ace, 0),
        Card.createCard(Suit.Clubs, Rank.Five, 0),
      ];

      const targetCard = hand[0]; // First King of Hearts
      const pairs = findPairCards(targetCard, hand);

      expect(pairs).toHaveLength(2);
      expect(pairs).toContain(hand[0]);
      expect(pairs).toContain(hand[1]);
    });

    test("should find joker pairs", () => {
      const hand = [
        Card.createJoker(JokerType.Small, 0),
        Card.createJoker(JokerType.Small, 1),
        Card.createJoker(JokerType.Big, 0),
        Card.createCard(Suit.Hearts, Rank.Ace, 0),
      ];

      const targetCard = hand[0]; // First Small Joker
      const pairs = findPairCards(targetCard, hand);

      expect(pairs).toHaveLength(2);
      expect(pairs).toContain(hand[0]);
      expect(pairs).toContain(hand[1]);
    });

    test("should return only target card if no pairs exist", () => {
      const hand = [
        Card.createCard(Suit.Hearts, Rank.King, 0),
        Card.createCard(Suit.Spades, Rank.Queen, 0),
        Card.createCard(Suit.Clubs, Rank.Ace, 0),
      ];

      const targetCard = hand[0];
      const pairs = findPairCards(targetCard, hand);

      expect(pairs).toHaveLength(1);
      expect(pairs).toContain(targetCard);
    });

    test("should not include cards of same rank but different suit", () => {
      const hand = [
        Card.createCard(Suit.Hearts, Rank.King, 0),
        Card.createCard(Suit.Spades, Rank.King, 0), // Same rank, different suit
        Card.createCard(Suit.Clubs, Rank.Ace, 0),
      ];

      const targetCard = hand[0];
      const pairs = findPairCards(targetCard, hand);

      expect(pairs).toHaveLength(1);
      expect(pairs).toContain(targetCard);
    });
  });

  describe("findTractorCards", () => {
    const trumpInfo = createTrumpInfo(Rank.Two, Suit.Spades);

    test("should find regular tractor (consecutive pairs)", () => {
      const hand = [
        ...Card.createPair(Suit.Hearts, Rank.Seven),
        ...Card.createPair(Suit.Hearts, Rank.Eight),
        Card.createCard(Suit.Spades, Rank.Ace, 0),
      ];

      const targetCard = hand[0]; // Seven of Hearts
      const tractor = findTractorCards(targetCard, hand, trumpInfo);

      expect(tractor).toHaveLength(4);
      // Should include both 7-7 and 8-8 pairs
      const ranks = tractor.map((c) => c.rank);
      expect(ranks.filter((r) => r === Rank.Seven)).toHaveLength(2);
      expect(ranks.filter((r) => r === Rank.Eight)).toHaveLength(2);
    });

    test("should find joker tractor", () => {
      const hand = [
        Card.createJoker(JokerType.Small, 0),
        Card.createJoker(JokerType.Small, 1),
        Card.createJoker(JokerType.Big, 0),
        Card.createJoker(JokerType.Big, 1),
        Card.createCard(Suit.Hearts, Rank.Ace, 0),
      ];

      const targetCard = hand[0]; // Small Joker
      const tractor = findTractorCards(targetCard, hand, trumpInfo);

      expect(tractor).toHaveLength(4);
      expect(tractor.filter((c) => c.joker === JokerType.Small)).toHaveLength(
        2,
      );
      expect(tractor.filter((c) => c.joker === JokerType.Big)).toHaveLength(2);
    });

    test("should return empty array for non-consecutive pairs", () => {
      const hand = [
        ...Card.createPair(Suit.Hearts, Rank.Seven),
        ...Card.createPair(Suit.Hearts, Rank.Nine), // Gap - no Eight
        Card.createCard(Suit.Spades, Rank.Ace, 0),
      ];

      const targetCard = hand[0]; // Seven of Hearts
      const tractor = findTractorCards(targetCard, hand, trumpInfo);

      expect(tractor).toHaveLength(0);
    });

    test("should return empty array for different suits", () => {
      const hand = [
        ...Card.createPair(Suit.Hearts, Rank.Seven),
        ...Card.createPair(Suit.Spades, Rank.Eight), // Different suit
      ];

      const targetCard = hand[0]; // Seven of Hearts
      const tractor = findTractorCards(targetCard, hand, trumpInfo);

      expect(tractor).toHaveLength(0);
    });

    test("should find longer tractors", () => {
      const hand = [
        ...Card.createPair(Suit.Hearts, Rank.Five),
        ...Card.createPair(Suit.Hearts, Rank.Six),
        ...Card.createPair(Suit.Hearts, Rank.Seven),
        Card.createCard(Suit.Spades, Rank.Ace, 0),
      ];

      const targetCard = hand[0]; // Five of Hearts
      const tractor = findTractorCards(targetCard, hand, trumpInfo);

      expect(tractor).toHaveLength(6); // Three consecutive pairs
      const ranks = tractor.map((c) => c.rank);
      expect(ranks.filter((r) => r === Rank.Five)).toHaveLength(2);
      expect(ranks.filter((r) => r === Rank.Six)).toHaveLength(2);
      expect(ranks.filter((r) => r === Rank.Seven)).toHaveLength(2);
    });
  });

  describe("getAutoSelectedCards", () => {
    const trumpInfo = createTrumpInfo(Rank.Two, Suit.Spades);

    test("should toggle off already selected card", () => {
      const hand = [Card.createCard(Suit.Hearts, Rank.King, 0)];
      const currentSelection = [hand[0]];

      const result = getAutoSelectedCards(
        hand[0],
        hand,
        currentSelection,
        true,
        undefined,
        trumpInfo,
      );

      expect(result).toHaveLength(0);
    });

    test("should auto-select pair when leading", () => {
      const hand = [
        ...Card.createPair(Suit.Hearts, Rank.King),
        Card.createCard(Suit.Spades, Rank.Ace, 0),
      ];

      const result = getAutoSelectedCards(
        hand[0],
        hand,
        [],
        true,
        undefined,
        trumpInfo,
      );

      expect(result).toHaveLength(2);
      expect(result).toContain(hand[0]);
      expect(result).toContain(hand[1]);
    });

    test("should auto-select tractor when leading", () => {
      const hand = [
        ...Card.createPair(Suit.Hearts, Rank.Seven),
        ...Card.createPair(Suit.Hearts, Rank.Eight),
        Card.createCard(Suit.Spades, Rank.Ace, 0),
      ];

      const result = getAutoSelectedCards(
        hand[0],
        hand,
        [],
        true,
        undefined,
        trumpInfo,
      );

      expect(result).toHaveLength(4); // Tractor takes priority over pair
    });

    test("should auto-select pair when tapping card that can form pair while following pair", () => {
      const hand = [
        ...Card.createPair(Suit.Hearts, Rank.King),
        Card.createCard(Suit.Hearts, Rank.Ace, 0),
      ];

      const leadingCombo = Card.createPair(Suit.Spades, Rank.Queen);

      // Click on the first King - should auto-select both Kings
      const result = getAutoSelectedCards(
        hand[0],
        hand,
        [],
        false,
        leadingCombo,
        trumpInfo,
      );

      expect(result).toHaveLength(2);
      expect(result).toContain(hand[0]);
      expect(result).toContain(hand[1]);
    });

    test("should auto-select tractor when tapping card that can form tractor while following tractor", () => {
      const hand = [
        ...Card.createPair(Suit.Hearts, Rank.Seven),
        ...Card.createPair(Suit.Hearts, Rank.Eight),
        Card.createCard(Suit.Hearts, Rank.Nine, 0),
      ];

      const leadingCombo = [
        ...Card.createPair(Suit.Spades, Rank.King),
        ...Card.createPair(Suit.Spades, Rank.Ace),
      ];

      // Click on Seven of Hearts - should auto-select the 7-7-8-8 tractor
      const result = getAutoSelectedCards(
        hand[0],
        hand,
        [],
        false,
        leadingCombo,
        trumpInfo,
      );

      expect(result).toHaveLength(4);
    });

    test("should select single card when no combinations available", () => {
      const hand = [
        Card.createCard(Suit.Hearts, Rank.King, 0),
        Card.createCard(Suit.Spades, Rank.Queen, 0),
        Card.createCard(Suit.Clubs, Rank.Ace, 0),
      ];

      const result = getAutoSelectedCards(
        hand[0],
        hand,
        [],
        true,
        undefined,
        trumpInfo,
      );

      expect(result).toHaveLength(1);
      expect(result).toContain(hand[0]);
    });

    test("should handle trump declaration mode by appending to selection", () => {
      const hand = [Card.createCard(Suit.Hearts, Rank.Two, 0)];
      const trumpInfoUndeclared = createTrumpInfo(Rank.Two, undefined);
      const existingSelection = [Card.createCard(Suit.Spades, Rank.King, 0)];

      const result = getAutoSelectedCards(
        hand[0],
        hand,
        existingSelection,
        true,
        undefined,
        trumpInfoUndeclared,
      );

      expect(result).toHaveLength(2);
      expect(result).toContain(hand[0]);
      expect(result).toContain(existingSelection[0]);
    });

    test("should append auto-selected pair to existing selection", () => {
      const hand = [
        ...Card.createPair(Suit.Hearts, Rank.King),
        Card.createCard(Suit.Spades, Rank.Ace, 0),
      ];
      const existingSelection = [Card.createCard(Suit.Clubs, Rank.Queen, 0)];

      const result = getAutoSelectedCards(
        hand[0],
        hand,
        existingSelection,
        true,
        undefined,
        trumpInfo,
      );

      expect(result).toHaveLength(3); // existing + pair
      expect(result).toContain(existingSelection[0]); // Keep existing
      expect(result).toContain(hand[0]); // Add pair
      expect(result).toContain(hand[1]);
    });

    test("should append auto-selected tractor to existing selection", () => {
      const hand = [
        ...Card.createPair(Suit.Hearts, Rank.Seven),
        ...Card.createPair(Suit.Hearts, Rank.Eight),
        Card.createCard(Suit.Spades, Rank.Ace, 0),
      ];
      const existingSelection = [Card.createCard(Suit.Clubs, Rank.Queen, 0)];

      const result = getAutoSelectedCards(
        hand[0],
        hand,
        existingSelection,
        true,
        undefined,
        trumpInfo,
      );

      expect(result).toHaveLength(5); // existing + tractor
      expect(result).toContain(existingSelection[0]); // Keep existing
      // Should contain all tractor cards
      expect(result).toContain(hand[0]);
      expect(result).toContain(hand[1]);
      expect(result).toContain(hand[2]);
      expect(result).toContain(hand[3]);
    });

    test("should not add duplicate cards when appending", () => {
      const pairCards = Card.createPair(Suit.Hearts, Rank.King);
      const hand = [...pairCards, Card.createCard(Suit.Spades, Rank.Ace, 0)];
      const existingSelection = [pairCards[1]]; // Already have second card of pair

      const result = getAutoSelectedCards(
        pairCards[0],
        hand,
        existingSelection,
        true,
        undefined,
        trumpInfo,
      );

      expect(result).toHaveLength(2); // Should not duplicate
      expect(result).toContain(pairCards[0]);
      expect(result).toContain(pairCards[1]);
    });

    test("should fall back to single selection when following pair but clicked card cannot form pair", () => {
      const hand = [
        Card.createCard(Suit.Hearts, Rank.King, 0),
        Card.createCard(Suit.Spades, Rank.Queen, 0),
      ];

      const leadingCombo = Card.createPair(Suit.Clubs, Rank.Ace);

      // Click on King of Hearts - no pair available, should select single card
      const result = getAutoSelectedCards(
        hand[0],
        hand,
        [],
        false,
        leadingCombo,
        trumpInfo,
      );

      expect(result).toHaveLength(1);
      expect(result).toContain(hand[0]);
    });

    test("should fall back to single selection when following tractor but clicked card cannot form tractor", () => {
      const hand = [
        Card.createCard(Suit.Hearts, Rank.King, 0),
        Card.createCard(Suit.Spades, Rank.Queen, 0),
        Card.createCard(Suit.Clubs, Rank.Ace, 0),
      ];

      const leadingCombo = [
        ...Card.createPair(Suit.Spades, Rank.King),
        ...Card.createPair(Suit.Spades, Rank.Ace),
      ];

      // Click on King of Hearts - no tractor available, should select single card
      const result = getAutoSelectedCards(
        hand[0],
        hand,
        [],
        false,
        leadingCombo,
        trumpInfo,
      );

      expect(result).toHaveLength(1);
      expect(result).toContain(hand[0]);
    });

    test("should auto-select 6-card tractor when following 6-card tractor", () => {
      // Hand with A(S)-A(S)-K(S)-K(S)-Q(S)-Q(S) tractor
      const hand = [
        ...Card.createPair(Suit.Spades, Rank.Ace),
        ...Card.createPair(Suit.Spades, Rank.King),
        ...Card.createPair(Suit.Spades, Rank.Queen),
        Card.createCard(Suit.Hearts, Rank.Two, 0),
      ];

      // Leading combo is a 6-card tractor (3 consecutive pairs)
      const leadingCombo = [
        ...Card.createPair(Suit.Hearts, Rank.Ten),
        ...Card.createPair(Suit.Hearts, Rank.Jack),
        ...Card.createPair(Suit.Hearts, Rank.Queen),
      ];

      // Click on Ace of Spades - should auto-select the full 6-card tractor
      const result = getAutoSelectedCards(
        hand[0],
        hand,
        [],
        false,
        leadingCombo,
        trumpInfo,
      );

      expect(result).toHaveLength(6);
      const ranks = result.map((c) => c.rank);
      expect(ranks.filter((r) => r === Rank.Ace)).toHaveLength(2);
      expect(ranks.filter((r) => r === Rank.King)).toHaveLength(2);
      expect(ranks.filter((r) => r === Rank.Queen)).toHaveLength(2);
    });

    test("should auto-select 6-card tractor when leading with 6-card tractor available", () => {
      // Hand with A(S)-A(S)-K(S)-K(S)-Q(S)-Q(S) tractor
      const hand = [
        ...Card.createPair(Suit.Spades, Rank.Ace),
        ...Card.createPair(Suit.Spades, Rank.King),
        ...Card.createPair(Suit.Spades, Rank.Queen),
        Card.createCard(Suit.Hearts, Rank.Two, 0),
      ];

      // When leading, click on any card in the tractor - should auto-select all 6 cards
      const result = getAutoSelectedCards(
        hand[2],
        hand,
        [],
        true,
        undefined,
        trumpInfo, // Click on King of Spades
      );

      expect(result).toHaveLength(6);
      const ranks = result.map((c) => c.rank);
      expect(ranks.filter((r) => r === Rank.Ace)).toHaveLength(2);
      expect(ranks.filter((r) => r === Rank.King)).toHaveLength(2);
      expect(ranks.filter((r) => r === Rank.Queen)).toHaveLength(2);
    });

    test("should auto-select 8-card tractor when following 8-card tractor", () => {
      // Hand with 5-5-6-6-7-7-8-8 of Hearts tractor
      const hand = [
        ...Card.createPair(Suit.Hearts, Rank.Five),
        ...Card.createPair(Suit.Hearts, Rank.Six),
        ...Card.createPair(Suit.Hearts, Rank.Seven),
        ...Card.createPair(Suit.Hearts, Rank.Eight),
        Card.createCard(Suit.Spades, Rank.Ace, 0),
      ];

      // Leading combo is an 8-card tractor (4 consecutive pairs)
      const leadingCombo = [
        ...Card.createPair(Suit.Clubs, Rank.Nine),
        ...Card.createPair(Suit.Clubs, Rank.Ten),
        ...Card.createPair(Suit.Clubs, Rank.Jack),
        ...Card.createPair(Suit.Clubs, Rank.Queen),
      ];

      // Click on Five of Hearts - should auto-select the full 8-card tractor
      const result = getAutoSelectedCards(
        hand[0],
        hand,
        [],
        false,
        leadingCombo,
        trumpInfo,
      );

      expect(result).toHaveLength(8);
      const ranks = result.map((c) => c.rank);
      expect(ranks.filter((r) => r === Rank.Five)).toHaveLength(2);
      expect(ranks.filter((r) => r === Rank.Six)).toHaveLength(2);
      expect(ranks.filter((r) => r === Rank.Seven)).toHaveLength(2);
      expect(ranks.filter((r) => r === Rank.Eight)).toHaveLength(2);
    });

    test("should NOT auto-select when hand tractor length does not match leading combo", () => {
      // Hand with only 4-card tractor (7-7-8-8)
      const hand = [
        ...Card.createPair(Suit.Hearts, Rank.Seven),
        ...Card.createPair(Suit.Hearts, Rank.Eight),
        Card.createCard(Suit.Spades, Rank.Ace, 0),
      ];

      // Leading combo is a 6-card tractor (3 consecutive pairs)
      const leadingCombo = [
        ...Card.createPair(Suit.Clubs, Rank.Nine),
        ...Card.createPair(Suit.Clubs, Rank.Ten),
        ...Card.createPair(Suit.Clubs, Rank.Jack),
      ];

      // Click on Seven of Hearts - cannot match 6-card tractor with 4-card tractor
      const result = getAutoSelectedCards(
        hand[0],
        hand,
        [],
        false,
        leadingCombo,
        trumpInfo,
      );

      // Should fall back to single selection
      expect(result).toHaveLength(1);
      expect(result).toContain(hand[0]);
    });

    test("should auto-select longest available tractor when leading", () => {
      // Hand with 3-3-4-4-5-5-6-6-7-7 (10-card tractor)
      const hand = [
        ...Card.createPair(Suit.Diamonds, Rank.Three),
        ...Card.createPair(Suit.Diamonds, Rank.Four),
        ...Card.createPair(Suit.Diamonds, Rank.Five),
        ...Card.createPair(Suit.Diamonds, Rank.Six),
        ...Card.createPair(Suit.Diamonds, Rank.Seven),
        Card.createCard(Suit.Hearts, Rank.King, 0),
      ];

      // When leading, click on any card in the tractor - should auto-select all 10 cards
      const result = getAutoSelectedCards(
        hand[4],
        hand,
        [],
        true,
        undefined,
        trumpInfo, // Click on Five of Diamonds
      );

      expect(result).toHaveLength(10);
      const ranks = result.map((c) => c.rank);
      expect(ranks.filter((r) => r === Rank.Three)).toHaveLength(2);
      expect(ranks.filter((r) => r === Rank.Four)).toHaveLength(2);
      expect(ranks.filter((r) => r === Rank.Five)).toHaveLength(2);
      expect(ranks.filter((r) => r === Rank.Six)).toHaveLength(2);
      expect(ranks.filter((r) => r === Rank.Seven)).toHaveLength(2);
    });

    test("should append longer tractor to existing selection", () => {
      // Hand with 6-card tractor
      const hand = [
        ...Card.createPair(Suit.Spades, Rank.Ace),
        ...Card.createPair(Suit.Spades, Rank.King),
        ...Card.createPair(Suit.Spades, Rank.Queen),
        Card.createCard(Suit.Hearts, Rank.Two, 0),
      ];
      const existingSelection = [Card.createCard(Suit.Clubs, Rank.Nine, 0)];

      // When leading, click on tractor card with existing selection
      const result = getAutoSelectedCards(
        hand[0],
        hand,
        existingSelection,
        true,
        undefined,
        trumpInfo,
      );

      expect(result).toHaveLength(7); // existing + 6-card tractor
      expect(result).toContain(existingSelection[0]); // Keep existing

      // Should contain all tractor cards
      const tractorCards = result.filter(
        (c) => c.id !== existingSelection[0].id,
      );
      expect(tractorCards).toHaveLength(6);
      const ranks = tractorCards.map((c) => c.rank);
      expect(ranks.filter((r) => r === Rank.Ace)).toHaveLength(2);
      expect(ranks.filter((r) => r === Rank.King)).toHaveLength(2);
      expect(ranks.filter((r) => r === Rank.Queen)).toHaveLength(2);
    });

    test("should handle mixed trump and non-trump in longer tractor correctly", () => {
      // Create trump scenario where Hearts is trump suit
      const trumpInfoHearts = createTrumpInfo(Rank.Two, Suit.Hearts);

      // Hand with A♥-A♥-K♥-K♥-Q♥-Q♥ (trump suit tractor)
      const hand = [
        ...Card.createPair(Suit.Hearts, Rank.Ace),
        ...Card.createPair(Suit.Hearts, Rank.King),
        ...Card.createPair(Suit.Hearts, Rank.Queen),
        Card.createCard(Suit.Spades, Rank.Jack, 0),
      ];

      // Leading combo is a 6-card non-trump tractor
      const leadingCombo = [
        ...Card.createPair(Suit.Clubs, Rank.Nine),
        ...Card.createPair(Suit.Clubs, Rank.Ten),
        ...Card.createPair(Suit.Clubs, Rank.Jack),
      ];

      // Click on Ace of Hearts - should auto-select the trump tractor
      const result = getAutoSelectedCards(
        hand[0],
        hand,
        [],
        false,
        leadingCombo,
        trumpInfoHearts,
      );

      expect(result).toHaveLength(6);
      const ranks = result.map((c) => c.rank);
      expect(ranks.filter((r) => r === Rank.Ace)).toHaveLength(2);
      expect(ranks.filter((r) => r === Rank.King)).toHaveLength(2);
      expect(ranks.filter((r) => r === Rank.Queen)).toHaveLength(2);

      // All should be trump cards
      result.forEach((card) => {
        expect(card.suit).toBe(Suit.Hearts);
      });
    });
  });
});
