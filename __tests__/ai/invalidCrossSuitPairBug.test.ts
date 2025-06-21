import { identifyCombos } from "../../src/game/comboDetection";
import { Card, ComboType, Rank, Suit, TrumpInfo } from "../../src/types";

describe("Invalid Cross-Suit Pair Bug Fix", () => {
  test("should NOT create pair from different suit trump rank cards", () => {
    const trumpInfo: TrumpInfo = {
      trumpRank: Rank.Two,
      trumpSuit: Suit.Spades,
    };

    // Create cards: 2♥ and 2♦ (both trump rank, different suits)
    const cards = [
      Card.createCard(Suit.Hearts, Rank.Two, 0), // 2♥ - trump rank card
      Card.createCard(Suit.Diamonds, Rank.Two, 0), // 2♦ - trump rank card
    ];

    const combos = identifyCombos(cards, trumpInfo);

    // Should find 2 singles but NO pairs
    const pairs = combos.filter((combo) => combo.type === ComboType.Pair);
    const singles = combos.filter((combo) => combo.type === ComboType.Single);

    expect(singles).toHaveLength(2);
    expect(pairs).toHaveLength(0); // Bug fix: No cross-suit pairs

    // Verify both singles are trump rank cards
    expect(singles[0].cards[0].rank).toBe(Rank.Two);
    expect(singles[1].cards[0].rank).toBe(Rank.Two);
    expect(singles[0].cards[0].suit).not.toBe(singles[1].cards[0].suit);
  });

  test("should create pair from identical trump rank cards (same suit)", () => {
    const trumpInfo: TrumpInfo = {
      trumpRank: Rank.Two,
      trumpSuit: Suit.Spades,
    };

    // Create cards: two identical 2♥ cards
    const cards = [
      Card.createCard(Suit.Hearts, Rank.Two, 0), // 2♥ - trump rank card
      Card.createCard(Suit.Hearts, Rank.Two, 1), // 2♥ - identical trump rank card
    ];

    const combos = identifyCombos(cards, trumpInfo);

    // Should find 2 singles AND 1 pair from identical cards
    const pairs = combos.filter((combo) => combo.type === ComboType.Pair);
    const singles = combos.filter((combo) => combo.type === ComboType.Single);

    expect(singles).toHaveLength(2);
    expect(pairs).toHaveLength(1); // Should correctly find identical pair

    // Verify pair contains identical cards
    expect(pairs[0].cards).toHaveLength(2);
    expect(pairs[0].cards[0].rank).toBe(Rank.Two);
    expect(pairs[0].cards[0].suit).toBe(Suit.Hearts);
    expect(pairs[0].cards[1].rank).toBe(Rank.Two);
    expect(pairs[0].cards[1].suit).toBe(Suit.Hearts);
  });

  test("should handle mixed trump scenarios correctly", () => {
    const trumpInfo: TrumpInfo = {
      trumpRank: Rank.King,
      trumpSuit: Suit.Clubs,
    };

    // Mix of trump rank cards and trump suit cards
    const cards = [
      Card.createCard(Suit.Hearts, Rank.King, 0), // K♥ - trump rank card
      Card.createCard(Suit.Diamonds, Rank.King, 0), // K♦ - trump rank card (different suit)
      Card.createCard(Suit.Clubs, Rank.Ace, 0), // A♣ - trump suit card
      Card.createCard(Suit.Clubs, Rank.Ace, 1), // A♣ - identical trump suit card
    ];

    const combos = identifyCombos(cards, trumpInfo);

    const pairs = combos.filter((combo) => combo.type === ComboType.Pair);
    const singles = combos.filter((combo) => combo.type === ComboType.Single);

    expect(singles).toHaveLength(4);
    expect(pairs).toHaveLength(1); // Only the identical A♣-A♣ pair

    // Verify the pair is the identical trump suit cards
    const pair = pairs[0];
    expect(pair.cards[0].rank).toBe(Rank.Ace);
    expect(pair.cards[0].suit).toBe(Suit.Clubs);
    expect(pair.cards[1].rank).toBe(Rank.Ace);
    expect(pair.cards[1].suit).toBe(Suit.Clubs);
  });
});
