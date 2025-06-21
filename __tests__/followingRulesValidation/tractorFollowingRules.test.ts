import { isValidPlay } from "../../src/game/playValidation";
import { Card, PlayerId, Rank, Suit, TrumpInfo } from "../../src/types";
import { createGameState } from "../helpers";

describe("FRV-3: Tractor Following Rules", () => {
  const createTestTrumpInfo = (
    trumpRank: Rank,
    trumpSuit: Suit,
  ): TrumpInfo => ({
    trumpRank,
    trumpSuit,
  });

  describe("Pair-before-singles priority", () => {
    test("FRV-3.1: Must use ALL pairs before singles", () => {
      // Issue #207: Test that players cannot use singles when pairs are available for tractor following

      const trumpInfo = createTestTrumpInfo(Rank.Five, Suit.Hearts);

      // Leading non-trump tractor: 3♦3♦-4♦4♦
      const leadingCombo = [
        ...Card.createPair(Suit.Diamonds, Rank.Three),
        ...Card.createPair(Suit.Diamonds, Rank.Four),
      ];

      // Player hand has: A♦A♦ pair + mixed singles
      const playerHand = [
        ...Card.createPair(Suit.Diamonds, Rank.Ace), // Available pair
        Card.createCard(Suit.Diamonds, Rank.Eight, 0), // Single
        Card.createCard(Suit.Diamonds, Rank.Seven, 0), // Single (part of "pair")
        Card.createCard(Suit.Diamonds, Rank.Seven, 1), // Single (part of "pair")
        Card.createCard(Suit.Diamonds, Rank.Six, 0), // Single
        Card.createCard(Suit.Clubs, Rank.Two, 0), // Other suit
      ];
      const gameState = createGameState({
        trumpInfo,
        currentTrick: {
          plays: [{ playerId: PlayerId.Human, cards: leadingCombo }],
          winningPlayerId: PlayerId.Human,
          points: 0,
        },
      });

      // INVALID: Player attempts to use mixed singles + one pair, skipping available A♦A♦ pair
      const invalidAttempt = [
        playerHand[2], // 8♦ (single)
        playerHand[3], // 7♦ (single)
        playerHand[4], // 7♦ (single)
        playerHand[5], // 6♦ (single)
      ];

      expect(
        isValidPlay(invalidAttempt, playerHand, PlayerId.Bot1, gameState),
      ).toBe(false);
    });

    test("FRV-3.2: All pairs used first", () => {
      const trumpInfo = createTestTrumpInfo(Rank.Five, Suit.Hearts);

      // Leading tractor: 3♦3♦-4♦4♦
      const leadingCombo = [
        ...Card.createPair(Suit.Diamonds, Rank.Three),
        ...Card.createPair(Suit.Diamonds, Rank.Four),
      ];

      // Player hand has pairs available
      const playerHand = [
        ...Card.createPair(Suit.Diamonds, Rank.Ace),
        ...Card.createPair(Suit.Diamonds, Rank.Seven),
        Card.createCard(Suit.Diamonds, Rank.Eight, 0),
        Card.createCard(Suit.Diamonds, Rank.Six, 0),
        Card.createCard(Suit.Clubs, Rank.Two, 0),
      ];
      const gameState = createGameState({
        trumpInfo,
        currentTrick: {
          plays: [{ playerId: PlayerId.Human, cards: leadingCombo }],
          winningPlayerId: PlayerId.Human,
          points: 0,
        },
      });

      // VALID: Player uses all available pairs
      const validPlay = [
        playerHand[0],
        playerHand[1], // A♦A♦ pair
        playerHand[2],
        playerHand[3], // 7♦7♦ pair
      ];

      expect(isValidPlay(validPlay, playerHand, PlayerId.Bot1, gameState)).toBe(
        true,
      );
    });

    test("FRV-3.3: Use available pair + singles", () => {
      const trumpInfo = createTestTrumpInfo(Rank.Five, Suit.Hearts);

      // Leading tractor: 3♦3♦-4♦4♦
      const leadingCombo = [
        ...Card.createPair(Suit.Diamonds, Rank.Three),
        ...Card.createPair(Suit.Diamonds, Rank.Four),
      ];

      // Player hand has only one pair
      const playerHand = [
        ...Card.createPair(Suit.Diamonds, Rank.Ace),
        Card.createCard(Suit.Diamonds, Rank.Eight, 0),
        Card.createCard(Suit.Diamonds, Rank.Six, 0),
        Card.createCard(Suit.Clubs, Rank.Two, 0),
      ];
      const gameState = createGameState({
        trumpInfo,
        currentTrick: {
          plays: [{ playerId: PlayerId.Human, cards: leadingCombo }],
          winningPlayerId: PlayerId.Human,
          points: 0,
        },
      });

      // VALID: Use available pair + singles to match 4-card requirement
      const validPlay = [
        playerHand[0],
        playerHand[1], // A♦A♦ pair
        playerHand[2],
        playerHand[3], // Singles
      ];

      expect(isValidPlay(validPlay, playerHand, PlayerId.Bot1, gameState)).toBe(
        true,
      );
    });

    test("FRV-3.4: Must use ALL trump pairs first", () => {
      // Test the same rule applies to trump suits

      const trumpInfo = createTestTrumpInfo(Rank.Five, Suit.Hearts);

      // Leading trump tractor: 3♥3♥-4♥4♥
      const leadingCombo = [
        ...Card.createPair(Suit.Hearts, Rank.Three),
        ...Card.createPair(Suit.Hearts, Rank.Four),
      ];

      // Player hand has trump pairs available
      const playerHand = [
        ...Card.createPair(Suit.Hearts, Rank.Ace), // Available trump pair
        Card.createCard(Suit.Hearts, Rank.Eight, 0), // Trump single
        Card.createCard(Suit.Hearts, Rank.Seven, 0), // Trump single (part of "pair")
        Card.createCard(Suit.Hearts, Rank.Seven, 1), // Trump single (part of "pair")
        Card.createCard(Suit.Hearts, Rank.Six, 0), // Trump single
        Card.createCard(Suit.Clubs, Rank.Two, 0), // Non-trump
      ];
      const gameState = createGameState({
        trumpInfo,
        currentTrick: {
          plays: [{ playerId: PlayerId.Human, cards: leadingCombo }],
          winningPlayerId: PlayerId.Human,
          points: 0,
        },
      });

      // INVALID: Skipping available trump pair for singles
      const invalidTrumpAttempt = [
        playerHand[2], // 8♥ (trump single)
        playerHand[3], // 7♥ (trump single)
        playerHand[4], // 7♥ (trump single)
        playerHand[5], // 6♥ (trump single)
      ];

      expect(
        isValidPlay(invalidTrumpAttempt, playerHand, PlayerId.Bot1, gameState),
      ).toBe(false);
    });
  });

  describe("Same-suit pair preservation", () => {
    test("FRV-3.5: Same-suit pair preservation", () => {
      // Issue #126: Cannot break pairs of leading suit unnecessarily

      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Spades);

      // Leading tractor: 7♥7♥-8♥8♥
      const leadingCombo = [
        ...Card.createPair(Suit.Hearts, Rank.Seven),
        ...Card.createPair(Suit.Hearts, Rank.Eight),
      ];

      // Player has Hearts pair + other pairs
      const playerHand = [
        ...Card.createPair(Suit.Hearts, Rank.Nine), // Hearts pair (leading suit)
        ...Card.createPair(Suit.Spades, Rank.Ace), // Trump pair
        ...Card.createPair(Suit.Clubs, Rank.King), // Other suit pair
        Card.createCard(Suit.Diamonds, Rank.Queen, 0),
        Card.createCard(Suit.Diamonds, Rank.Jack, 0),
      ];
      const gameState = createGameState({
        trumpInfo,
        currentTrick: {
          plays: [{ playerId: PlayerId.Human, cards: leadingCombo }],
          winningPlayerId: PlayerId.Human,
          points: 0,
        },
      });

      // INVALID: Breaking Hearts pair unnecessarily
      const invalidPlay = [
        playerHand[0], // 9♥ (breaking pair)
        playerHand[2], // A♠ (trump)
        playerHand[4], // K♣ (other suit)
        playerHand[6], // Q♦ (other suit)
      ];

      expect(
        isValidPlay(invalidPlay, playerHand, PlayerId.Bot1, gameState),
      ).toBe(false);
    });

    test("FRV-3.6: Breaking pair unnecessarily", () => {
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Spades);

      // Leading tractor: 7♥7♥-8♥8♥
      const leadingCombo = [
        ...Card.createPair(Suit.Hearts, Rank.Seven),
        ...Card.createPair(Suit.Hearts, Rank.Eight),
      ];

      // Player has Hearts pair but insufficient Hearts for full tractor
      const playerHand = [
        ...Card.createPair(Suit.Hearts, Rank.Nine),
        Card.createCard(Suit.Hearts, Rank.Six, 0),
        Card.createCard(Suit.Hearts, Rank.Five, 0),
        Card.createCard(Suit.Hearts, Rank.Four, 0),
        Card.createCard(Suit.Spades, Rank.Ace, 0),
        Card.createCard(Suit.Clubs, Rank.King, 0),
      ];
      const gameState = createGameState({
        trumpInfo,
        currentTrick: {
          plays: [{ playerId: PlayerId.Human, cards: leadingCombo }],
          winningPlayerId: PlayerId.Human,
          points: 0,
        },
      });

      // INVALID: Breaking pair when could use pair + singles
      const invalidPlay = [
        playerHand[0], // 9♥ (breaking pair)
        playerHand[2], // 6♥ (single)
        playerHand[3], // 5♥ (single)
        playerHand[4], // 4♥ (single)
      ];

      expect(
        isValidPlay(invalidPlay, playerHand, PlayerId.Bot1, gameState),
      ).toBe(false);
    });

    test("FRV-3.7: Breaking pair when insufficient Hearts", () => {
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Spades);

      // Leading tractor: 7♥7♥-8♥8♥
      const leadingCombo = [
        ...Card.createPair(Suit.Hearts, Rank.Seven),
        ...Card.createPair(Suit.Hearts, Rank.Eight),
      ];

      // Player has only Hearts pair + insufficient other Hearts
      const playerHand = [
        ...Card.createPair(Suit.Hearts, Rank.Nine),
        Card.createCard(Suit.Hearts, Rank.Six, 0),
        ...Card.createPair(Suit.Spades, Rank.Ace),
        ...Card.createPair(Suit.Clubs, Rank.King),
        Card.createCard(Suit.Diamonds, Rank.Queen, 0),
      ];
      const gameState = createGameState({
        trumpInfo,
        currentTrick: {
          plays: [{ playerId: PlayerId.Human, cards: leadingCombo }],
          winningPlayerId: PlayerId.Human,
          points: 0,
        },
      });

      // INVALID: Breaking pair + insufficient Hearts when other suits available
      const invalidPlay = [
        playerHand[0], // 9♥ (breaking pair)
        playerHand[2], // 6♥ (only other Heart)
        playerHand[3], // A♠ (trump)
        playerHand[5], // K♣ (other suit)
      ];

      expect(
        isValidPlay(invalidPlay, playerHand, PlayerId.Bot1, gameState),
      ).toBe(false);
    });

    test("FRV-3.8: Rule applies to trump combinations too", () => {
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Spades);

      // Leading trump tractor: 4♠4♠-5♠5♠
      const leadingCombo = [
        ...Card.createPair(Suit.Spades, Rank.Four),
        ...Card.createPair(Suit.Spades, Rank.Five),
      ];

      // Player has trump pairs available
      const playerHand = [
        ...Card.createPair(Suit.Spades, Rank.Six),
        Card.createCard(Suit.Spades, Rank.Seven, 0),
        Card.createCard(Suit.Spades, Rank.Eight, 0),
        Card.createCard(Suit.Hearts, Rank.Nine, 0),
        Card.createCard(Suit.Clubs, Rank.Ten, 0),
      ];
      const gameState = createGameState({
        trumpInfo,
        currentTrick: {
          plays: [{ playerId: PlayerId.Human, cards: leadingCombo }],
          winningPlayerId: PlayerId.Human,
          points: 0,
        },
      });

      // INVALID: Breaking trump pair unnecessarily
      const invalidPlay = [
        playerHand[0], // 6♠ (breaking trump pair)
        playerHand[2], // 7♠ (trump single)
        playerHand[3], // 8♠ (trump single)
        playerHand[4], // 9♥ (non-trump)
      ];

      expect(
        isValidPlay(invalidPlay, playerHand, PlayerId.Bot1, gameState),
      ).toBe(false);
    });
  });

  describe("Complex tractor scenarios", () => {
    test("FRV-3.9: Tractor-to-tractor matching", () => {
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Spades);

      // Leading tractor: 3♥3♥-4♥4♥
      const leadingCombo = [
        ...Card.createPair(Suit.Hearts, Rank.Three),
        ...Card.createPair(Suit.Hearts, Rank.Four),
      ];

      // Player has perfect tractor response
      const playerHand = [
        ...Card.createPair(Suit.Hearts, Rank.Seven),
        ...Card.createPair(Suit.Hearts, Rank.Eight),
        Card.createCard(Suit.Clubs, Rank.Nine, 0),
      ];
      const gameState = createGameState({
        trumpInfo,
        currentTrick: {
          plays: [{ playerId: PlayerId.Human, cards: leadingCombo }],
          winningPlayerId: PlayerId.Human,
          points: 0,
        },
      });

      // VALID: Tractor-to-tractor matching
      expect(
        isValidPlay(
          [playerHand[0], playerHand[1], playerHand[2], playerHand[3]],
          playerHand,
          PlayerId.Bot1,
          gameState,
        ),
      ).toBe(true);
    });

    test("FRV-3.10: Non-consecutive pairs when no tractor available", () => {
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Spades);

      // Leading tractor: 3♥3♥-4♥4♥
      const leadingCombo = [
        ...Card.createPair(Suit.Hearts, Rank.Three),
        ...Card.createPair(Suit.Hearts, Rank.Four),
      ];

      // Player has non-consecutive pairs
      const playerHand = [
        ...Card.createPair(Suit.Hearts, Rank.Six),
        ...Card.createPair(Suit.Hearts, Rank.Nine),
        Card.createCard(Suit.Clubs, Rank.Ten, 0),
      ];
      const gameState = createGameState({
        trumpInfo,
        currentTrick: {
          plays: [{ playerId: PlayerId.Human, cards: leadingCombo }],
          winningPlayerId: PlayerId.Human,
          points: 0,
        },
      });

      // VALID: Non-consecutive pairs when no tractor available
      expect(
        isValidPlay(
          [playerHand[0], playerHand[1], playerHand[2], playerHand[3]],
          playerHand,
          PlayerId.Bot1,
          gameState,
        ),
      ).toBe(true);
    });

    test("FRV-3.11: Insufficient tractor combinations", () => {
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Spades);

      // Leading tractor: 3♥3♥-4♥4♥-5♥5♥
      const leadingCombo = [
        ...Card.createPair(Suit.Hearts, Rank.Three),
        ...Card.createPair(Suit.Hearts, Rank.Four),
        ...Card.createPair(Suit.Hearts, Rank.Five),
      ];

      // Player has only one Hearts pair
      const playerHand = [
        ...Card.createPair(Suit.Hearts, Rank.Seven),
        Card.createCard(Suit.Hearts, Rank.Eight, 0),
        Card.createCard(Suit.Hearts, Rank.Nine, 0),
        Card.createCard(Suit.Clubs, Rank.Ten, 0),
        Card.createCard(Suit.Diamonds, Rank.Jack, 0),
      ];
      const gameState = createGameState({
        trumpInfo,
        currentTrick: {
          plays: [{ playerId: PlayerId.Human, cards: leadingCombo }],
          winningPlayerId: PlayerId.Human,
          points: 0,
        },
      });

      // VALID: Use available pair + fill with singles from same suit
      expect(
        isValidPlay(
          [
            playerHand[0],
            playerHand[1],
            playerHand[2],
            playerHand[3],
            playerHand[4],
            playerHand[5],
          ],
          playerHand,
          PlayerId.Bot1,
          gameState,
        ),
      ).toBe(true);
    });

    test("FRV-3.12: Must use all Hearts + fill with others", () => {
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Spades);

      // Leading tractor: 3♥3♥-4♥4♥
      const leadingCombo = [
        ...Card.createPair(Suit.Hearts, Rank.Three),
        ...Card.createPair(Suit.Hearts, Rank.Four),
      ];

      // Player has insufficient Hearts for tractor
      const playerHand = [
        Card.createCard(Suit.Hearts, Rank.Seven, 0),
        Card.createCard(Suit.Hearts, Rank.Eight, 0),
        Card.createCard(Suit.Clubs, Rank.Nine, 0),
        Card.createCard(Suit.Diamonds, Rank.Ten, 0),
      ];
      const gameState = createGameState({
        trumpInfo,
        currentTrick: {
          plays: [{ playerId: PlayerId.Human, cards: leadingCombo }],
          winningPlayerId: PlayerId.Human,
          points: 0,
        },
      });

      // Must use all Hearts + fill with others
      expect(
        isValidPlay(
          [playerHand[0], playerHand[1], playerHand[2], playerHand[3]],
          playerHand,
          PlayerId.Bot1,
          gameState,
        ),
      ).toBe(true);
    });

    test("FRV-3.13: Order doesn't matter if all Hearts included", () => {
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Spades);

      // Leading tractor: 3♥3♥-4♥4♥
      const leadingCombo = [
        ...Card.createPair(Suit.Hearts, Rank.Three),
        ...Card.createPair(Suit.Hearts, Rank.Four),
      ];

      // Player has insufficient Hearts for tractor
      const playerHand = [
        Card.createCard(Suit.Hearts, Rank.Seven, 0),
        Card.createCard(Suit.Hearts, Rank.Eight, 0),
        Card.createCard(Suit.Clubs, Rank.Nine, 0),
        Card.createCard(Suit.Diamonds, Rank.Ten, 0),
      ];
      const gameState = createGameState({
        trumpInfo,
        currentTrick: {
          plays: [{ playerId: PlayerId.Human, cards: leadingCombo }],
          winningPlayerId: PlayerId.Human,
          points: 0,
        },
      });

      // Order variation - all Hearts included
      expect(
        isValidPlay(
          [playerHand[0], playerHand[2], playerHand[3], playerHand[1]],
          playerHand,
          PlayerId.Bot1,
          gameState,
        ),
      ).toBe(true);
    });

    test("FRV-3.14: Order variation - all Hearts included", () => {
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Spades);

      // Leading tractor: 3♥3♥-4♥4♥
      const leadingCombo = [
        ...Card.createPair(Suit.Hearts, Rank.Three),
        ...Card.createPair(Suit.Hearts, Rank.Four),
      ];

      // Player has insufficient Hearts for tractor
      const playerHand = [
        Card.createCard(Suit.Hearts, Rank.Seven, 0),
        Card.createCard(Suit.Hearts, Rank.Eight, 0),
        Card.createCard(Suit.Clubs, Rank.Nine, 0),
        Card.createCard(Suit.Diamonds, Rank.Ten, 0),
      ];
      const gameState = createGameState({
        trumpInfo,
        currentTrick: {
          plays: [{ playerId: PlayerId.Human, cards: leadingCombo }],
          winningPlayerId: PlayerId.Human,
          points: 0,
        },
      });

      // Another order variation - all Hearts included
      expect(
        isValidPlay(
          [playerHand[2], playerHand[3], playerHand[0], playerHand[1]],
          playerHand,
          PlayerId.Bot1,
          gameState,
        ),
      ).toBe(true);
    });

    test("FRV-3.15: Same-suit tractor following", () => {
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Hearts);

      // Leading tractor: 7♠7♠-8♠8♠
      const leadingCombo = [
        ...Card.createPair(Suit.Spades, Rank.Seven),
        ...Card.createPair(Suit.Spades, Rank.Eight),
      ];

      // Player has perfect same-suit tractor response
      const playerHand = [
        ...Card.createPair(Suit.Spades, Rank.Nine),
        ...Card.createPair(Suit.Spades, Rank.Ten),
        Card.createCard(Suit.Hearts, Rank.King, 0),
      ];
      const gameState = createGameState({
        trumpInfo,
        currentTrick: {
          plays: [{ playerId: PlayerId.Human, cards: leadingCombo }],
          winningPlayerId: PlayerId.Human,
          points: 0,
        },
      });

      // Should follow with same-suit tractor
      expect(
        isValidPlay(
          [playerHand[0], playerHand[1], playerHand[2], playerHand[3]],
          playerHand,
          PlayerId.Bot1,
          gameState,
        ),
      ).toBe(true);
    });

    test("FRV-3.16: Use all pairs + singles when insufficient", () => {
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Hearts);

      // Leading tractor: 7♠7♠-8♠8♠
      const leadingCombo = [
        ...Card.createPair(Suit.Spades, Rank.Seven),
        ...Card.createPair(Suit.Spades, Rank.Eight),
      ];

      // Player has only one pair + singles
      const playerHand = [
        ...Card.createPair(Suit.Spades, Rank.Nine),
        Card.createCard(Suit.Spades, Rank.Ten, 0),
        Card.createCard(Suit.Spades, Rank.Jack, 0),
        Card.createCard(Suit.Hearts, Rank.King, 0),
      ];
      const gameState = createGameState({
        trumpInfo,
        currentTrick: {
          plays: [{ playerId: PlayerId.Human, cards: leadingCombo }],
          winningPlayerId: PlayerId.Human,
          points: 0,
        },
      });

      // Should use available pair + singles
      expect(
        isValidPlay(
          [playerHand[0], playerHand[1], playerHand[2], playerHand[3]],
          playerHand,
          PlayerId.Bot1,
          gameState,
        ),
      ).toBe(true);
    });

    test("FRV-3.17: Cannot use other suits when same suit available", () => {
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Hearts);

      // Leading tractor: 7♠7♠-8♠8♠
      const leadingCombo = [
        ...Card.createPair(Suit.Spades, Rank.Seven),
        ...Card.createPair(Suit.Spades, Rank.Eight),
      ];

      // Player has sufficient spades but tries to use other suits
      const playerHand = [
        ...Card.createPair(Suit.Spades, Rank.Nine),
        Card.createCard(Suit.Spades, Rank.Ten, 0),
        Card.createCard(Suit.Spades, Rank.Jack, 0),
        Card.createCard(Suit.Hearts, Rank.King, 0),
      ];
      const gameState = createGameState({
        trumpInfo,
        currentTrick: {
          plays: [{ playerId: PlayerId.Human, cards: leadingCombo }],
          winningPlayerId: PlayerId.Human,
          points: 0,
        },
      });

      // Cannot mix with Hearts when sufficient Spades available
      expect(
        isValidPlay(
          [playerHand[0], playerHand[1], playerHand[4], playerHand[2]],
          playerHand,
          PlayerId.Bot1,
          gameState,
        ),
      ).toBe(false);
    });

    test("FRV-3.18: Mixed suits when out of leading suit", () => {
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Hearts);

      // Leading tractor: 7♠7♠-8♠8♠
      const leadingCombo = [
        ...Card.createPair(Suit.Spades, Rank.Seven),
        ...Card.createPair(Suit.Spades, Rank.Eight),
      ];

      // Player has no spades, mixed other suits
      const playerHand = [
        ...Card.createPair(Suit.Hearts, Rank.Nine),
        Card.createCard(Suit.Clubs, Rank.Ten, 0),
        Card.createCard(Suit.Diamonds, Rank.Jack, 0),
        Card.createCard(Suit.Hearts, Rank.King, 0),
      ];
      const gameState = createGameState({
        trumpInfo,
        currentTrick: {
          plays: [{ playerId: PlayerId.Human, cards: leadingCombo }],
          winningPlayerId: PlayerId.Human,
          points: 0,
        },
      });

      // Mixed suits valid when out of leading suit
      expect(
        isValidPlay(
          [playerHand[0], playerHand[1], playerHand[2], playerHand[3]],
          playerHand,
          PlayerId.Bot1,
          gameState,
        ),
      ).toBe(true);
    });
  });
});
