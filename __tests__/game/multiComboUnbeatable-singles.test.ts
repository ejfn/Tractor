import { describe, expect, test } from "@jest/globals";
import { detectLeadingMultiCombo } from "../../src/game/multiComboDetection";
import {
  isComboUnbeatable,
  validateLeadingMultiCombo,
} from "../../src/game/multiComboValidation";
import { isValidPlay } from "../../src/game/playValidation";
import {
  Card,
  ComboType,
  GameState,
  PlayerId,
  Rank,
  Suit,
  TrumpInfo,
} from "../../src/types";
import { initializeGame } from "../../src/utils/gameInitialization";
import { createTrumpScenarios } from "../helpers";

describe("Single Cards - isComboUnbeatable Tests", () => {
  const trumpInfo = createTrumpScenarios.spadesTrump(); // Rank 2, Spades trump
  const trumpInfoAceRank: TrumpInfo = {
    trumpRank: Rank.Ace,
    trumpSuit: Suit.Spades,
  };

  describe("Single Cards - isComboUnbeatable", () => {
    test("Single A♥ is ALWAYS unbeatable (highest card)", () => {
      const combo = {
        type: ComboType.Single,
        cards: [Card.createCard(Suit.Hearts, Rank.Ace, 0)],
        value: 100,
        isBreakingPair: false,
      };

      const playedCards: Card[] = []; // No cards played

      const ownHand = [
        Card.createCard(Suit.Hearts, Rank.King, 0),
        Card.createCard(Suit.Hearts, Rank.Queen, 0),
      ];

      const result = isComboUnbeatable(
        combo,
        Suit.Hearts,
        playedCards,
        ownHand,
        trumpInfo,
        [], // visibleKittyCards (empty for tests)
      );
      expect(result).toBe(true);
    });

    test("Single K♥ is beatable when both A♥ not played and not in our hand", () => {
      const combo = {
        type: ComboType.Single,
        cards: [Card.createCard(Suit.Hearts, Rank.King, 0)],
        value: 90,
        isBreakingPair: false,
      };

      const playedCards: Card[] = []; // No A♥ played yet

      const ownHand = [Card.createCard(Suit.Hearts, Rank.Queen, 0)];

      const result = isComboUnbeatable(
        combo,
        Suit.Hearts,
        playedCards,
        ownHand,
        trumpInfo,
        [], // visibleKittyCards (empty for tests)
      );
      expect(result).toBe(false);
    });

    test("Single K♥ is STILL beatable when only one A♥ played", () => {
      const combo = {
        type: ComboType.Single,
        cards: [Card.createCard(Suit.Hearts, Rank.King, 0)],
        value: 90,
        isBreakingPair: false,
      };

      const playedCards = [
        Card.createCard(Suit.Hearts, Rank.Ace, 0), // One A♥ played
      ];

      const ownHand = [Card.createCard(Suit.Hearts, Rank.Queen, 0)];

      // Still beatable because other A♥ not accounted for (not played, not in hand)
      const result = isComboUnbeatable(
        combo,
        Suit.Hearts,
        playedCards,
        ownHand,
        trumpInfo,
        [], // visibleKittyCards (empty for tests)
      );
      expect(result).toBe(false);
    });

    test("Single K♥ is unbeatable when both A♥ played", () => {
      const combo = {
        type: ComboType.Single,
        cards: [Card.createCard(Suit.Hearts, Rank.King, 0)],
        value: 90,
        isBreakingPair: false,
      };

      const playedCards = [
        ...Card.createPair(Suit.Hearts, Rank.Ace), // Both A♥ played
      ];

      const ownHand = [Card.createCard(Suit.Hearts, Rank.Queen, 0)];

      const result = isComboUnbeatable(
        combo,
        Suit.Hearts,
        playedCards,
        ownHand,
        trumpInfo,
        [], // visibleKittyCards (empty for tests)
      );
      expect(result).toBe(true);
    });

    test("Single K♥ is unbeatable when both A♥ in our hand", () => {
      const combo = {
        type: ComboType.Single,
        cards: [Card.createCard(Suit.Hearts, Rank.King, 0)],
        value: 90,
        isBreakingPair: false,
      };

      const playedCards: Card[] = []; // No cards played

      const ownHand = [
        ...Card.createPair(Suit.Hearts, Rank.Ace), // Both A♥ in our hand
        Card.createCard(Suit.Hearts, Rank.Queen, 0),
      ];

      const result = isComboUnbeatable(
        combo,
        Suit.Hearts,
        playedCards,
        ownHand,
        trumpInfo,
        [], // visibleKittyCards (empty for tests)
      );
      expect(result).toBe(true);
    });

    test("Single K♥ is unbeatable when one A♥ played, one A♥ in hand", () => {
      const combo = {
        type: ComboType.Single,
        cards: [Card.createCard(Suit.Hearts, Rank.King, 0)],
        value: 90,
        isBreakingPair: false,
      };

      const playedCards = [
        Card.createCard(Suit.Hearts, Rank.Ace, 0), // One A♥ played
      ];

      const ownHand = [
        Card.createCard(Suit.Hearts, Rank.Ace, 1), // Other A♥ in hand
        Card.createCard(Suit.Hearts, Rank.Queen, 0),
      ];

      const result = isComboUnbeatable(
        combo,
        Suit.Hearts,
        playedCards,
        ownHand,
        trumpInfo,
        [], // visibleKittyCards (empty for tests)
      );
      expect(result).toBe(true);
    });

    test("Single 10♥ is unbeatable when A♥, K♥, Q♥, J♥ all accounted for", () => {
      const combo = {
        type: ComboType.Single,
        cards: [Card.createCard(Suit.Hearts, Rank.Ten, 0)],
        value: 70,
        isBreakingPair: false,
      };

      const playedCards = [
        Card.createCard(Suit.Hearts, Rank.Ace, 0), // One A♥ played
        Card.createCard(Suit.Hearts, Rank.King, 0), // One K♥ played
        Card.createCard(Suit.Hearts, Rank.Queen, 1), // One Q♥ played
      ];

      const ownHand = [
        Card.createCard(Suit.Hearts, Rank.Ace, 1), // Other A♥ in hand
        Card.createCard(Suit.Hearts, Rank.King, 1), // Other K♥ in hand
        Card.createCard(Suit.Hearts, Rank.Queen, 0), // Other Q♥ in hand
        Card.createCard(Suit.Hearts, Rank.Jack, 0), // One J♥ in hand
        Card.createCard(Suit.Hearts, Rank.Jack, 1), // Other J♥ in hand
        Card.createCard(Suit.Hearts, Rank.Nine, 0),
      ];

      const result = isComboUnbeatable(
        combo,
        Suit.Hearts,
        playedCards,
        ownHand,
        trumpInfo,
        [], // visibleKittyCards (empty for tests)
      );
      expect(result).toBe(true);
    });

    test("Single 9♥ is beatable when 10♥ not accounted for", () => {
      const combo = {
        type: ComboType.Single,
        cards: [Card.createCard(Suit.Hearts, Rank.Nine, 0)],
        value: 60,
        isBreakingPair: false,
      };

      const playedCards = [
        Card.createCard(Suit.Hearts, Rank.Ace, 0), // One A♥ played
        Card.createCard(Suit.Hearts, Rank.King, 0), // One K♥ played
      ];

      const ownHand = [
        Card.createCard(Suit.Hearts, Rank.Ace, 1), // Other A♥ in hand
        Card.createCard(Suit.Hearts, Rank.Ten, 0), // One 10♥ in hand, but other could be unaccounted
      ];

      const result = isComboUnbeatable(
        combo,
        Suit.Hearts,
        playedCards,
        ownHand,
        trumpInfo,
        [], // visibleKittyCards (empty for tests)
      );
      expect(result).toBe(false);
    });

    test("Single K♥ is unbeatable when A is trump rank (K becomes highest)", () => {
      const combo = {
        type: ComboType.Single,
        cards: [Card.createCard(Suit.Hearts, Rank.King, 0)],
        value: 90,
        isBreakingPair: false,
      };

      const playedCards: Card[] = []; // No cards played

      const ownHand = [
        Card.createCard(Suit.Hearts, Rank.Queen, 0),
        // Note: A♥ would be trump when Ace is trump rank, so not in Hearts suit
      ];

      // When A is trump rank, K♥ becomes highest non-trump card in Hearts
      const result = isComboUnbeatable(
        combo,
        Suit.Hearts,
        playedCards,
        ownHand,
        trumpInfoAceRank,
        [], // visibleKittyCards (empty for tests)
      );
      expect(result).toBe(true);
    });
  });

  describe("Special Cases - isComboUnbeatable", () => {
    test("SPECIAL CASE: Any combo is unbeatable when all cards accounted for", () => {
      // When all other cards in Hearts are accounted for (played + in hand), even weak cards are unbeatable
      const combo = {
        type: ComboType.Single,
        cards: [Card.createCard(Suit.Hearts, Rank.Three, 0)], // Weakest card
        value: 10,
        isBreakingPair: false,
      };

      // All Hearts cards except our hand have been played (opponents are void)
      const playedCards = [
        ...Card.createPair(Suit.Hearts, Rank.Ace),
        ...Card.createPair(Suit.Hearts, Rank.King),
        ...Card.createPair(Suit.Hearts, Rank.Queen),
        ...Card.createPair(Suit.Hearts, Rank.Jack),
        ...Card.createPair(Suit.Hearts, Rank.Ten),
        ...Card.createPair(Suit.Hearts, Rank.Nine),
        ...Card.createPair(Suit.Hearts, Rank.Eight),
        ...Card.createPair(Suit.Hearts, Rank.Seven),
        ...Card.createPair(Suit.Hearts, Rank.Six),
        ...Card.createPair(Suit.Hearts, Rank.Five),
        ...Card.createPair(Suit.Hearts, Rank.Four),
        Card.createCard(Suit.Hearts, Rank.Three, 1), // One 3♥ played
      ];

      const ownHand = [
        Card.createCard(Suit.Hearts, Rank.Three, 0), // We hold the other 3♥
      ];

      const result = isComboUnbeatable(
        combo,
        Suit.Hearts,
        playedCards,
        ownHand,
        trumpInfo,
        [], // visibleKittyCards (empty for tests)
      );
      expect(result).toBe(true);
      // When all other cards accounted for, any remaining card is unbeatable
    });

    test("Trump rank filtering: Cards become trump when rank matches", () => {
      // When trump rank is 2, all 2s become trump (not in Hearts suit)
      const combo = {
        type: ComboType.Single,
        cards: [Card.createCard(Suit.Hearts, Rank.King, 0)], // K♥ when 2 is trump rank
        value: 90,
        isBreakingPair: false,
      };

      const playedCards = [
        Card.createCard(Suit.Hearts, Rank.Ace, 0), // One A♥ played
      ];

      const ownHand = [
        Card.createCard(Suit.Hearts, Rank.Queen, 0),
        Card.createCard(Suit.Hearts, Rank.Two, 0), // 2♥ is trump, not in Hearts suit
      ];

      // K♥ is still beatable by other A♥ since 2♥ is trump (not in Hearts suit)
      const result = isComboUnbeatable(
        combo,
        Suit.Hearts,
        playedCards,
        ownHand,
        trumpInfo,
        [], // visibleKittyCards (empty for tests)
      );
      expect(result).toBe(false);
    });

    test("Single 3♥ is unbeatable when trump rank is 2 and all higher cards accounted for", () => {
      // When trump rank is 2, 2♥ becomes trump (excluded from Hearts suit)
      const combo = {
        type: ComboType.Single,
        cards: [Card.createCard(Suit.Hearts, Rank.Three, 0)], // 3♥ when 2 is trump rank
        value: 30,
        isBreakingPair: false,
      };

      const playedCards = [
        Card.createCard(Suit.Hearts, Rank.Ace, 0), // One A♥ played
        Card.createCard(Suit.Hearts, Rank.King, 1), // One K♥ played
        Card.createCard(Suit.Hearts, Rank.Queen, 0), // One Q♥ played
        // Note: 2♥ cards would be trump, so not in Hearts suit
      ];

      const ownHand = [
        Card.createCard(Suit.Hearts, Rank.Ace, 1), // Other A♥ in hand
        Card.createCard(Suit.Hearts, Rank.King, 0), // Other K♥ in hand
        Card.createCard(Suit.Hearts, Rank.Queen, 1), // Other Q♥ in hand
        Card.createCard(Suit.Hearts, Rank.Jack, 0), // One J♥ in hand
        Card.createCard(Suit.Hearts, Rank.Jack, 1), // Other J♥ in hand
        Card.createCard(Suit.Hearts, Rank.Ten, 0), // One 10♥ in hand
        Card.createCard(Suit.Hearts, Rank.Ten, 1), // Other 10♥ in hand
        Card.createCard(Suit.Hearts, Rank.Nine, 0), // One 9♥ in hand
        Card.createCard(Suit.Hearts, Rank.Nine, 1), // Other 9♥ in hand
        Card.createCard(Suit.Hearts, Rank.Eight, 0), // One 8♥ in hand
        Card.createCard(Suit.Hearts, Rank.Eight, 1), // Other 8♥ in hand
        Card.createCard(Suit.Hearts, Rank.Seven, 0), // One 7♥ in hand
        Card.createCard(Suit.Hearts, Rank.Seven, 1), // Other 7♥ in hand
        Card.createCard(Suit.Hearts, Rank.Six, 0), // One 6♥ in hand
        Card.createCard(Suit.Hearts, Rank.Six, 1), // Other 6♥ in hand
        Card.createCard(Suit.Hearts, Rank.Five, 0), // One 5♥ in hand
        Card.createCard(Suit.Hearts, Rank.Five, 1), // Other 5♥ in hand
        Card.createCard(Suit.Hearts, Rank.Four, 0), // One 4♥ in hand
        Card.createCard(Suit.Hearts, Rank.Four, 1), // Other 4♥ in hand
        Card.createCard(Suit.Hearts, Rank.Three, 1), // Other 3♥ in hand
      ];

      // 3♥ is unbeatable because all higher non-trump cards in Hearts are accounted for
      // (2♥ is trump, so 3♥ becomes the lowest card in Hearts suit)
      const result = isComboUnbeatable(
        combo,
        Suit.Hearts,
        playedCards,
        ownHand,
        trumpInfo,
        [], // visibleKittyCards (empty for tests)
      );
      expect(result).toBe(true);
    });
  });

  describe("Multi-Combo Leading: A♦K♦ Scenario", () => {
    let gameState: GameState;

    beforeEach(() => {
      const trumpInfoHearts: TrumpInfo = {
        trumpRank: Rank.Two,
        trumpSuit: Suit.Hearts,
      };
      gameState = initializeGame();
      gameState.trumpInfo = trumpInfoHearts;
    });

    test("A♦K♦ should be detected as valid leading multi-combo when A♦,K♦,3♦,4♦ already played", () => {
      // Set up played cards in memory (A♦,K♦,3♦,4♦ already played)
      const playedCards = [
        Card.createCard(Suit.Diamonds, Rank.Ace, 0),
        Card.createCard(Suit.Diamonds, Rank.King, 0),
        Card.createCard(Suit.Diamonds, Rank.Three, 0),
        Card.createCard(Suit.Diamonds, Rank.Four, 0),
      ];

      // Add these to tricks to simulate they've been played
      gameState.tricks = [
        {
          plays: [
            { playerId: PlayerId.Bot1, cards: [playedCards[0]] },
            { playerId: PlayerId.Bot2, cards: [playedCards[1]] },
            { playerId: PlayerId.Bot3, cards: [playedCards[2]] },
            { playerId: PlayerId.Human, cards: [playedCards[3]] },
          ],
          winningPlayerId: PlayerId.Human,
          points: 0,
          isFinalTrick: false,
        },
      ];

      // Clear current trick to simulate human is leading
      gameState.currentTrick = null;

      // Human hand with A♦K♦ (the other copies)
      const humanHand = [
        Card.createCard(Suit.Diamonds, Rank.Ace, 1), // A♦ from deck 1
        Card.createCard(Suit.Diamonds, Rank.King, 1), // K♦ from deck 1
        Card.createCard(Suit.Spades, Rank.Seven, 0),
        Card.createCard(Suit.Spades, Rank.Eight, 0),
      ];

      gameState.players[0].hand = humanHand; // Human is player 0

      const attemptedCombo = [
        Card.createCard(Suit.Diamonds, Rank.Ace, 1),
        Card.createCard(Suit.Diamonds, Rank.King, 1),
      ];

      // Step 1: Should be detected as multi-combo (2 singles from same suit)
      const detection = detectLeadingMultiCombo(
        attemptedCombo,
        gameState.trumpInfo,
      );
      expect(detection.isMultiCombo).toBe(true);
      expect(detection.structure).toBeDefined();
      expect(detection.components).toBeDefined();

      if (detection.structure && detection.components) {
        expect(detection.structure.suit).toBe(Suit.Diamonds);
        expect(detection.structure.components.totalPairs).toBe(0);
        expect(detection.structure.components.totalLength).toBe(2);
        expect(detection.components).toHaveLength(2); // Two single-card combos
      }

      // Step 2: Should pass validation (unbeatable because other A♦,K♦ already played)
      if (
        detection.isMultiCombo &&
        detection.components &&
        detection.structure
      ) {
        const validation = validateLeadingMultiCombo(
          detection.components,
          detection.structure.suit,
          gameState,
          PlayerId.Human,
        );
        expect(validation.isValid).toBe(true);
        expect(validation.invalidReasons).toHaveLength(0);
      }

      // Step 3: Should pass full isValidPlay validation
      const isValid = isValidPlay(
        attemptedCombo,
        humanHand,
        PlayerId.Human,
        gameState,
      );
      expect(isValid).toBe(true);
    });

    test("A♦K♦ should be unbeatable when other copies already played", () => {
      // Scenario: A♦ (deck 0) and K♦ (deck 0) have been played
      // Therefore A♦ (deck 1) and K♦ (deck 1) are the highest remaining in Diamonds
      const playedCards = [
        Card.createCard(Suit.Diamonds, Rank.Ace, 0), // Other A♦ played
        Card.createCard(Suit.Diamonds, Rank.King, 0), // Other K♦ played
      ];

      // Add these to tricks
      gameState.tricks = [
        {
          plays: [
            { playerId: PlayerId.Bot1, cards: [playedCards[0]] },
            { playerId: PlayerId.Bot2, cards: [playedCards[1]] },
          ],
          winningPlayerId: PlayerId.Bot1,
          points: 0,
          isFinalTrick: false,
        },
      ];

      // Human hand with remaining A♦K♦
      const humanHand = [
        Card.createCard(Suit.Diamonds, Rank.Ace, 1),
        Card.createCard(Suit.Diamonds, Rank.King, 1),
        Card.createCard(Suit.Spades, Rank.Seven, 0),
      ];

      gameState.players[0].hand = humanHand;
      gameState.currentTrick = null; // Leading

      const attemptedCombo = [
        Card.createCard(Suit.Diamonds, Rank.Ace, 1),
        Card.createCard(Suit.Diamonds, Rank.King, 1),
      ];

      // Should be valid because no higher singles can beat A♦ and K♦
      const isValid = isValidPlay(
        attemptedCombo,
        humanHand,
        PlayerId.Human,
        gameState,
      );
      expect(isValid).toBe(true);
    });

    test("A♦K♦ should NOT be valid when other A♦,K♦ still available to other players", () => {
      // Scenario: No Diamonds played yet, so other players could have A♦,K♦
      gameState.tricks = []; // No cards played
      gameState.currentTrick = null; // Leading

      const humanHand = [
        Card.createCard(Suit.Diamonds, Rank.Ace, 0),
        Card.createCard(Suit.Diamonds, Rank.King, 0),
        Card.createCard(Suit.Spades, Rank.Seven, 0),
      ];

      gameState.players[0].hand = humanHand;

      const attemptedCombo = [
        Card.createCard(Suit.Diamonds, Rank.Ace, 0),
        Card.createCard(Suit.Diamonds, Rank.King, 0),
      ];

      // Should be invalid because opponents could have the other A♦,K♦ to beat this
      const isValid = isValidPlay(
        attemptedCombo,
        humanHand,
        PlayerId.Human,
        gameState,
      );
      expect(isValid).toBe(false); // Not unbeatable
    });
  });
});
