import { isValidPlay } from "../../src/game/playValidation";
import {
  Card,
  JokerType,
  PlayerId,
  Rank,
  Suit,
  TrumpInfo,
} from "../../src/types";
import { createGameState } from "../helpers";

describe("FRV-1: Single Following Rules", () => {
  const createTestTrumpInfo = (
    trumpRank: Rank,
    trumpSuit: Suit,
  ): TrumpInfo => ({
    trumpRank,
    trumpSuit,
  });

  describe("Basic same-suit following", () => {
    test("FRV-1.1: Basic same-suit single following", () => {
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Spades);

      // Leading with single Hearts card
      const leadingCombo = [Card.createCard(Suit.Hearts, Rank.Five, 0)];

      // Player has Hearts cards + other suits
      const playerHand = [
        Card.createCard(Suit.Hearts, Rank.King, 0), // Hearts (same suit)
        Card.createCard(Suit.Clubs, Rank.Ace, 0), // Different suit
        Card.createCard(Suit.Diamonds, Rank.Queen, 0), // Different suit
      ];
      const gameState = createGameState({
        trumpInfo,
        currentTrick: {
          plays: [{ playerId: PlayerId.Human, cards: leadingCombo }],
          winningPlayerId: PlayerId.Human,
          points: 0,
        },
      });

      // Must follow Hearts when available
      expect(
        isValidPlay([playerHand[0]], playerHand, PlayerId.Bot1, gameState),
      ).toBe(true);
      // Cannot play other suits when Hearts available
      expect(
        isValidPlay([playerHand[1]], playerHand, PlayerId.Bot1, gameState),
      ).toBe(false);
      expect(
        isValidPlay([playerHand[2]], playerHand, PlayerId.Bot1, gameState),
      ).toBe(false);
    });

    test("FRV-1.2: Multiple same-suit cards - any valid", () => {
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Spades);

      // Leading with single Hearts card
      const leadingCombo = [Card.createCard(Suit.Hearts, Rank.Five, 0)];

      // Player has multiple Hearts cards
      const playerHand = [
        Card.createCard(Suit.Hearts, Rank.Ace, 0), // Hearts option 1
        Card.createCard(Suit.Hearts, Rank.King, 0), // Hearts option 2
        Card.createCard(Suit.Hearts, Rank.Three, 0), // Hearts option 3
        Card.createCard(Suit.Clubs, Rank.Queen, 0), // Other suit
      ];
      const gameState = createGameState({
        trumpInfo,
        currentTrick: {
          plays: [{ playerId: PlayerId.Human, cards: leadingCombo }],
          winningPlayerId: PlayerId.Human,
          points: 0,
        },
      });

      // Any Hearts card is valid
      expect(
        isValidPlay([playerHand[0]], playerHand, PlayerId.Bot1, gameState),
      ).toBe(true);
      expect(
        isValidPlay([playerHand[1]], playerHand, PlayerId.Bot1, gameState),
      ).toBe(true);
      expect(
        isValidPlay([playerHand[2]], playerHand, PlayerId.Bot1, gameState),
      ).toBe(true);
      // Other suits still invalid when Hearts available
      expect(
        isValidPlay([playerHand[3]], playerHand, PlayerId.Bot1, gameState),
      ).toBe(false);
    });
  });

  describe("Cross-suit following when void", () => {
    test("FRV-1.3: Cross-suit valid when void in led suit", () => {
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Spades);

      // Leading with single Hearts card
      const leadingCombo = [Card.createCard(Suit.Hearts, Rank.Five, 0)];

      // Player has NO Hearts (void in led suit)
      const playerHand = [
        Card.createCard(Suit.Clubs, Rank.Ace, 0), // Non-trump
        Card.createCard(Suit.Diamonds, Rank.King, 0), // Non-trump
        Card.createCard(Suit.Spades, Rank.Queen, 0), // Trump
      ];
      const gameState = createGameState({
        trumpInfo,
        currentTrick: {
          plays: [{ playerId: PlayerId.Human, cards: leadingCombo }],
          winningPlayerId: PlayerId.Human,
          points: 0,
        },
      });

      // Any card valid when void in led suit
      expect(
        isValidPlay([playerHand[0]], playerHand, PlayerId.Bot1, gameState),
      ).toBe(true);
      expect(
        isValidPlay([playerHand[1]], playerHand, PlayerId.Bot1, gameState),
      ).toBe(true);
      expect(
        isValidPlay([playerHand[2]], playerHand, PlayerId.Bot1, gameState),
      ).toBe(true);
    });

    test("FRV-1.4: Must use trump when void in non-trump lead", () => {
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Spades);

      // Leading with single Hearts card (non-trump)
      const leadingCombo = [Card.createCard(Suit.Hearts, Rank.Five, 0)];

      // Player has trump + non-trump (no Hearts)
      const playerHand = [
        Card.createCard(Suit.Spades, Rank.Ace, 0), // Trump
        Card.createCard(Suit.Clubs, Rank.King, 0), // Non-trump
        Card.createCard(Suit.Diamonds, Rank.Queen, 0), // Non-trump
      ];
      const gameState = createGameState({
        trumpInfo,
        currentTrick: {
          plays: [{ playerId: PlayerId.Human, cards: leadingCombo }],
          winningPlayerId: PlayerId.Human,
          points: 0,
        },
      });

      // Trump valid when void in led suit
      expect(
        isValidPlay([playerHand[0]], playerHand, PlayerId.Bot1, gameState),
      ).toBe(true);
      // Non-trump also valid when void (can choose not to trump)
      expect(
        isValidPlay([playerHand[1]], playerHand, PlayerId.Bot1, gameState),
      ).toBe(true);
      expect(
        isValidPlay([playerHand[2]], playerHand, PlayerId.Bot1, gameState),
      ).toBe(true);
    });
  });

  describe("Trump single following", () => {
    test("FRV-1.5: Trump suit single following", () => {
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Hearts);

      // Leading with trump suit single
      const leadingCombo = [Card.createCard(Suit.Hearts, Rank.Five, 0)];

      // Player has trump + non-trump cards
      const playerHand = [
        Card.createCard(Suit.Hearts, Rank.Ace, 0), // Trump suit
        Card.createCard(Suit.Hearts, Rank.King, 0), // Trump suit
        Card.createCard(Suit.Clubs, Rank.Queen, 0), // Non-trump
      ];
      const gameState = createGameState({
        trumpInfo,
        currentTrick: {
          plays: [{ playerId: PlayerId.Human, cards: leadingCombo }],
          winningPlayerId: PlayerId.Human,
          points: 0,
        },
      });

      // Any trump suit card valid
      expect(
        isValidPlay([playerHand[0]], playerHand, PlayerId.Bot1, gameState),
      ).toBe(true);
      expect(
        isValidPlay([playerHand[1]], playerHand, PlayerId.Bot1, gameState),
      ).toBe(true);
      // Non-trump invalid when trump available
      expect(
        isValidPlay([playerHand[2]], playerHand, PlayerId.Bot1, gameState),
      ).toBe(false);
    });

    test("FRV-1.6: Joker single following", () => {
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Hearts);

      // Leading with Big Joker
      const leadingCombo = [Card.createJoker(JokerType.Big, 0)];

      // Player has jokers + non-trump cards
      const playerHand = [
        Card.createJoker(JokerType.Small, 0), // Small Joker (trump)
        Card.createJoker(JokerType.Big, 1), // Big Joker (trump)
        Card.createCard(Suit.Clubs, Rank.King, 0), // Non-trump
      ];
      const gameState = createGameState({
        trumpInfo,
        currentTrick: {
          plays: [{ playerId: PlayerId.Human, cards: leadingCombo }],
          winningPlayerId: PlayerId.Human,
          points: 0,
        },
      });

      // Any joker valid
      expect(
        isValidPlay([playerHand[0]], playerHand, PlayerId.Bot1, gameState),
      ).toBe(true);
      expect(
        isValidPlay([playerHand[1]], playerHand, PlayerId.Bot1, gameState),
      ).toBe(true);
      // Non-trump invalid when trump available
      expect(
        isValidPlay([playerHand[2]], playerHand, PlayerId.Bot1, gameState),
      ).toBe(false);
    });

    test("FRV-1.7: Trump rank single following", () => {
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Hearts);

      // Leading with trump rank (off-suit)
      const leadingCombo = [Card.createCard(Suit.Spades, Rank.Two, 0)];

      // Player has trump rank cards + non-trump
      const playerHand = [
        Card.createCard(Suit.Hearts, Rank.Two, 0), // Trump rank in trump suit
        Card.createCard(Suit.Clubs, Rank.Two, 0), // Trump rank (off-suit)
        Card.createCard(Suit.Diamonds, Rank.King, 0), // Non-trump
      ];
      const gameState = createGameState({
        trumpInfo,
        currentTrick: {
          plays: [{ playerId: PlayerId.Human, cards: leadingCombo }],
          winningPlayerId: PlayerId.Human,
          points: 0,
        },
      });

      // Any trump rank card valid
      expect(
        isValidPlay([playerHand[0]], playerHand, PlayerId.Bot1, gameState),
      ).toBe(true);
      expect(
        isValidPlay([playerHand[1]], playerHand, PlayerId.Bot1, gameState),
      ).toBe(true);
      // Non-trump invalid when trump available
      expect(
        isValidPlay([playerHand[2]], playerHand, PlayerId.Bot1, gameState),
      ).toBe(false);
    });

    test("FRV-1.8: Trump unification - all trump types valid when trump led", () => {
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Hearts);

      // Leading with trump suit single
      const leadingCombo = [Card.createCard(Suit.Hearts, Rank.Five, 0)];

      // Player has trump suit + other trump types
      const playerHand = [
        Card.createCard(Suit.Hearts, Rank.Ace, 0), // Trump suit (same as lead)
        Card.createJoker(JokerType.Big, 0), // Big Joker (also trump)
        Card.createCard(Suit.Clubs, Rank.King, 0), // Non-trump
      ];
      const gameState = createGameState({
        trumpInfo,
        currentTrick: {
          plays: [{ playerId: PlayerId.Human, cards: leadingCombo }],
          winningPlayerId: PlayerId.Human,
          points: 0,
        },
      });

      // All trump types valid when trump led (trump unification rule)
      expect(
        isValidPlay([playerHand[0]], playerHand, PlayerId.Bot1, gameState),
      ).toBe(true);
      expect(
        isValidPlay([playerHand[1]], playerHand, PlayerId.Bot1, gameState),
      ).toBe(true);
      // Non-trump invalid when trump available
      expect(
        isValidPlay([playerHand[2]], playerHand, PlayerId.Bot1, gameState),
      ).toBe(false);
    });
  });

  describe("Trump exhaustion scenarios", () => {
    test("FRV-1.9: Non-trump valid when no trump cards left", () => {
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Hearts);

      // Leading with trump suit single
      const leadingCombo = [Card.createCard(Suit.Hearts, Rank.Five, 0)];

      // Player has NO trump cards at all
      const playerHand = [
        Card.createCard(Suit.Spades, Rank.Ace, 0), // Non-trump
        Card.createCard(Suit.Clubs, Rank.King, 0), // Non-trump
        Card.createCard(Suit.Diamonds, Rank.Queen, 0), // Non-trump
      ];
      const gameState = createGameState({
        trumpInfo,
        currentTrick: {
          plays: [{ playerId: PlayerId.Human, cards: leadingCombo }],
          winningPlayerId: PlayerId.Human,
          points: 0,
        },
      });

      // Any non-trump card valid when no trump available
      expect(
        isValidPlay([playerHand[0]], playerHand, PlayerId.Bot1, gameState),
      ).toBe(true);
      expect(
        isValidPlay([playerHand[1]], playerHand, PlayerId.Bot1, gameState),
      ).toBe(true);
      expect(
        isValidPlay([playerHand[2]], playerHand, PlayerId.Bot1, gameState),
      ).toBe(true);
    });

    test("FRV-1.10: Trump rank following when trump rank led", () => {
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Hearts);

      // Leading with trump rank (off-suit)
      const leadingCombo = [Card.createCard(Suit.Spades, Rank.Two, 0)];

      // Player has trump rank + trump suit + non-trump
      const playerHand = [
        Card.createCard(Suit.Clubs, Rank.Two, 0), // Trump rank (off-suit)
        Card.createCard(Suit.Hearts, Rank.Ace, 0), // Trump suit
        Card.createCard(Suit.Diamonds, Rank.King, 0), // Non-trump
      ];
      const gameState = createGameState({
        trumpInfo,
        currentTrick: {
          plays: [{ playerId: PlayerId.Human, cards: leadingCombo }],
          winningPlayerId: PlayerId.Human,
          points: 0,
        },
      });

      // All trump cards valid when trump led (trump unification rule)
      expect(
        isValidPlay([playerHand[0]], playerHand, PlayerId.Bot1, gameState),
      ).toBe(true);
      expect(
        isValidPlay([playerHand[1]], playerHand, PlayerId.Bot1, gameState),
      ).toBe(true);
      // Non-trump invalid when trump available
      expect(
        isValidPlay([playerHand[2]], playerHand, PlayerId.Bot1, gameState),
      ).toBe(false);
    });
  });

  describe("Edge cases and special scenarios", () => {
    test("FRV-1.11: Same rank different suit following", () => {
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Hearts);

      // Leading with non-trump King
      const leadingCombo = [Card.createCard(Suit.Spades, Rank.King, 0)];

      // Player has same rank different suits + other cards
      const playerHand = [
        Card.createCard(Suit.Spades, Rank.Queen, 0), // Same suit (different rank)
        Card.createCard(Suit.Clubs, Rank.King, 0), // Same rank (different suit)
        Card.createCard(Suit.Diamonds, Rank.Ace, 0), // Different suit/rank
        Card.createCard(Suit.Hearts, Rank.Five, 0), // Trump suit
      ];
      const gameState = createGameState({
        trumpInfo,
        currentTrick: {
          plays: [{ playerId: PlayerId.Human, cards: leadingCombo }],
          winningPlayerId: PlayerId.Human,
          points: 0,
        },
      });

      // Same suit takes priority over same rank
      expect(
        isValidPlay([playerHand[0]], playerHand, PlayerId.Bot1, gameState),
      ).toBe(true);
      // Different suit invalid when same suit available
      expect(
        isValidPlay([playerHand[1]], playerHand, PlayerId.Bot1, gameState),
      ).toBe(false);
      expect(
        isValidPlay([playerHand[2]], playerHand, PlayerId.Bot1, gameState),
      ).toBe(false);
      expect(
        isValidPlay([playerHand[3]], playerHand, PlayerId.Bot1, gameState),
      ).toBe(false);
    });

    test("FRV-1.12: Cross-suit valid when void in non-trump lead", () => {
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Hearts);

      // Leading with non-trump single (player void in Clubs)
      const leadingCombo = [Card.createCard(Suit.Clubs, Rank.King, 0)];

      // Player void in Clubs, has trump + other non-trump
      const playerHand = [
        Card.createCard(Suit.Hearts, Rank.Ace, 0), // Trump
        Card.createCard(Suit.Spades, Rank.Queen, 0), // Non-trump
        Card.createCard(Suit.Diamonds, Rank.Jack, 0), // Non-trump
      ];
      const gameState = createGameState({
        trumpInfo,
        currentTrick: {
          plays: [{ playerId: PlayerId.Human, cards: leadingCombo }],
          winningPlayerId: PlayerId.Human,
          points: 0,
        },
      });

      // Any card valid when void in led suit
      expect(
        isValidPlay([playerHand[0]], playerHand, PlayerId.Bot1, gameState),
      ).toBe(true);
      expect(
        isValidPlay([playerHand[1]], playerHand, PlayerId.Bot1, gameState),
      ).toBe(true);
      expect(
        isValidPlay([playerHand[2]], playerHand, PlayerId.Bot1, gameState),
      ).toBe(true);
    });

    test("FRV-1.13: Must use trump when trump lead and trump available", () => {
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Hearts);

      // Leading with trump single
      const leadingCombo = [Card.createCard(Suit.Hearts, Rank.King, 0)];

      // Player has trump + non-trump
      const playerHand = [
        Card.createCard(Suit.Hearts, Rank.Ace, 0), // Trump
        Card.createCard(Suit.Spades, Rank.Queen, 0), // Non-trump
        Card.createCard(Suit.Diamonds, Rank.Jack, 0), // Non-trump
      ];
      const gameState = createGameState({
        trumpInfo,
        currentTrick: {
          plays: [{ playerId: PlayerId.Human, cards: leadingCombo }],
          winningPlayerId: PlayerId.Human,
          points: 0,
        },
      });

      // Must use trump when trump led and trump available
      expect(
        isValidPlay([playerHand[0]], playerHand, PlayerId.Bot1, gameState),
      ).toBe(true);
      // Non-trump invalid when trump available
      expect(
        isValidPlay([playerHand[1]], playerHand, PlayerId.Bot1, gameState),
      ).toBe(false);
      expect(
        isValidPlay([playerHand[2]], playerHand, PlayerId.Bot1, gameState),
      ).toBe(false);
    });
  });
});
