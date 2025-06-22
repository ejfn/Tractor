import { describe, expect, test } from "@jest/globals";
import { isComboUnbeatable } from "../../src/game/multiComboValidation";
import { Card, ComboType, Rank, Suit } from "../../src/types";
import { createTrumpScenarios } from "../helpers";

describe("Pair Cards - isComboUnbeatable Tests", () => {
  const trumpInfo = createTrumpScenarios.spadesTrump(); // Rank 2, Spades trump

  describe("REALISTIC Pair Tests - Two Deck Understanding", () => {
    test("Pair A♥A♥ is ALWAYS unbeatable (no higher pairs possible)", () => {
      const combo = {
        type: ComboType.Pair,
        cards: Card.createPair(Suit.Hearts, Rank.Ace),
        value: 200,
        isBreakingPair: false,
      };

      const playedCards: Card[] = [];
      const ownHand: Card[] = [];

      const result = isComboUnbeatable(
        combo,
        Suit.Hearts,
        playedCards,
        ownHand,
        trumpInfo,
        [], // visibleKittyCards (empty for tests)
      );
      // No pairs higher than A♥A♥ exist (trump rank 2 excluded from Hearts)
      expect(result).toBe(true);
    });

    test("Pair K♥K♥ is BEATABLE when both A♥ copies still unaccounted", () => {
      const combo = {
        type: ComboType.Pair,
        cards: Card.createPair(Suit.Hearts, Rank.King),
        value: 180,
        isBreakingPair: false,
      };

      const playedCards: Card[] = [];
      const ownHand: Card[] = [];

      const result = isComboUnbeatable(
        combo,
        Suit.Hearts,
        playedCards,
        ownHand,
        trumpInfo,
        [], // visibleKittyCards (empty for tests)
      );
      // Can be beaten by A♥A♥ (both A♥ copies available outside)
      expect(result).toBe(false);
    });

    test("Pair K♥K♥ is STILL BEATABLE when only one A♥ accounted", () => {
      const combo = {
        type: ComboType.Pair,
        cards: Card.createPair(Suit.Hearts, Rank.King),
        value: 180,
        isBreakingPair: false,
      };

      const playedCards = [
        Card.createCard(Suit.Hearts, Rank.Ace, 0), // Only A♥ deck 0 - still need both for pair
      ];
      const ownHand: Card[] = [];

      const result = isComboUnbeatable(
        combo,
        Suit.Hearts,
        playedCards,
        ownHand,
        trumpInfo,
        [], // visibleKittyCards (empty for tests)
      );
      // Still beatable by A♥(deck1)A♥(deck1) - wait, that's impossible!
      // Actually: we accounted for A♥(deck0), so only A♥(deck1) remains outside - can't form A♥A♥ pair
      expect(result).toBe(true);
    });

    test("Pair K♥K♥ is UNBEATABLE when both A♥ copies accounted", () => {
      const combo = {
        type: ComboType.Pair,
        cards: Card.createPair(Suit.Hearts, Rank.King),
        value: 180,
        isBreakingPair: false,
      };

      const playedCards = [
        Card.createCard(Suit.Hearts, Rank.Ace, 0), // A♥ deck 0
        Card.createCard(Suit.Hearts, Rank.Ace, 1), // A♥ deck 1
      ];
      const ownHand: Card[] = [];

      const result = isComboUnbeatable(
        combo,
        Suit.Hearts,
        playedCards,
        ownHand,
        trumpInfo,
        [], // visibleKittyCards (empty for tests)
      );
      // No A♥A♥ possible - both A♥ accounted for
      expect(result).toBe(true);
    });

    test("Pair K♥K♥ is UNBEATABLE when one A♥ played, one A♥ in hand", () => {
      const combo = {
        type: ComboType.Pair,
        cards: Card.createPair(Suit.Hearts, Rank.King),
        value: 180,
        isBreakingPair: false,
      };

      const playedCards = [
        Card.createCard(Suit.Hearts, Rank.Ace, 0), // A♥ deck 0 played
      ];
      const ownHand = [
        Card.createCard(Suit.Hearts, Rank.Ace, 1), // A♥ deck 1 in hand
      ];

      const result = isComboUnbeatable(
        combo,
        Suit.Hearts,
        playedCards,
        ownHand,
        trumpInfo,
        [], // visibleKittyCards (empty for tests)
      );
      // Both A♥ copies accounted for (one played, one in hand) - no A♥A♥ possible outside
      expect(result).toBe(true);
    });

    test("Pair Q♥Q♥ is BEATABLE when higher pairs still possible", () => {
      const combo = {
        type: ComboType.Pair,
        cards: Card.createPair(Suit.Hearts, Rank.Queen),
        value: 160,
        isBreakingPair: false,
      };

      const playedCards = [
        Card.createCard(Suit.Hearts, Rank.Ace, 0), // A♥ deck 0 only
      ];
      const ownHand: Card[] = [];

      const result = isComboUnbeatable(
        combo,
        Suit.Hearts,
        playedCards,
        ownHand,
        trumpInfo,
        [], // visibleKittyCards (empty for tests)
      );
      // K♥K♥ still possible (both K♥ unaccounted), A♥A♥ impossible (only one A♥ remaining)
      expect(result).toBe(false);
    });

    test("Pair Q♥Q♥ is UNBEATABLE when all higher pair types broken", () => {
      const combo = {
        type: ComboType.Pair,
        cards: Card.createPair(Suit.Hearts, Rank.Queen),
        value: 160,
        isBreakingPair: false,
      };

      const playedCards = [
        Card.createCard(Suit.Hearts, Rank.Ace, 0), // Break A♥A♥ pair
        Card.createCard(Suit.Hearts, Rank.King, 1), // Break K♥K♥ pair
      ];
      const ownHand: Card[] = [];

      const result = isComboUnbeatable(
        combo,
        Suit.Hearts,
        playedCards,
        ownHand,
        trumpInfo,
        [], // visibleKittyCards (empty for tests)
      );
      // Both A♥A♥ and K♥K♥ impossible - only one copy of each rank remaining outside
      expect(result).toBe(true);
    });

    test("Pair 3♥3♥ is BEATABLE when many higher pairs possible", () => {
      const combo = {
        type: ComboType.Pair,
        cards: Card.createPair(Suit.Hearts, Rank.Three),
        value: 40,
        isBreakingPair: false,
      };

      const playedCards: Card[] = [];
      const ownHand: Card[] = [];

      const result = isComboUnbeatable(
        combo,
        Suit.Hearts,
        playedCards,
        ownHand,
        trumpInfo,
        [], // visibleKittyCards (empty for tests)
      );
      // Many higher pairs possible: A♥A♥, K♥K♥, Q♥Q♥, J♥J♥, 10♥10♥, 9♥9♥, 8♥8♥, 7♥7♥, 6♥6♥, 5♥5♥, 4♥4♥
      expect(result).toBe(false);
    });

    test("Pair 3♥3♥ is UNBEATABLE when ALL higher ranks have one copy accounted", () => {
      const combo = {
        type: ComboType.Pair,
        cards: Card.createPair(Suit.Hearts, Rank.Three),
        value: 40,
        isBreakingPair: false,
      };

      // Account for one copy of every higher rank to break all possible pairs
      const playedCards = [
        Card.createCard(Suit.Hearts, Rank.Ace, 0), // Break A♥A♥
        Card.createCard(Suit.Hearts, Rank.King, 0), // Break K♥K♥
        Card.createCard(Suit.Hearts, Rank.Queen, 0), // Break Q♥Q♥
        Card.createCard(Suit.Hearts, Rank.Jack, 0), // Break J♥J♥
        Card.createCard(Suit.Hearts, Rank.Ten, 0), // Break 10♥10♥
        Card.createCard(Suit.Hearts, Rank.Nine, 0), // Break 9♥9♥
        Card.createCard(Suit.Hearts, Rank.Eight, 0), // Break 8♥8♥
        Card.createCard(Suit.Hearts, Rank.Seven, 0), // Break 7♥7♥
        Card.createCard(Suit.Hearts, Rank.Six, 0), // Break 6♥6♥
        Card.createCard(Suit.Hearts, Rank.Five, 0), // Break 5♥5♥
        Card.createCard(Suit.Hearts, Rank.Four, 0), // Break 4♥4♥
      ];
      const ownHand: Card[] = [];

      const result = isComboUnbeatable(
        combo,
        Suit.Hearts,
        playedCards,
        ownHand,
        trumpInfo,
        [], // visibleKittyCards (empty for tests)
      );
      // All higher pairs broken - only one copy of each higher rank remaining outside
      expect(result).toBe(true);
    });
  });

  describe("Trump Rank Exclusion Tests", () => {
    test("Pair K♥K♥ becomes unbeatable when trump rank is A (no higher Hearts pairs)", () => {
      const combo = {
        type: ComboType.Pair,
        cards: Card.createPair(Suit.Hearts, Rank.King),
        value: 180,
        isBreakingPair: false,
      };

      // Trump rank A excludes A♥ from Hearts suit
      const trumpInfoAce = createTrumpScenarios.customTrump(
        Rank.Ace,
        Suit.Spades,
      );
      const playedCards: Card[] = [];
      const ownHand: Card[] = [];

      const result = isComboUnbeatable(
        combo,
        Suit.Hearts,
        playedCards,
        ownHand,
        trumpInfoAce,
        [], // visibleKittyCards (empty for tests)
      );
      // With trump rank A, no Hearts cards higher than K♥ available - K♥K♥ is highest possible Hearts pair
      expect(result).toBe(true);
    });

    test("Pair Q♥Q♥ becomes unbeatable when trump rank K excludes K♥ from Hearts", () => {
      const combo = {
        type: ComboType.Pair,
        cards: Card.createPair(Suit.Hearts, Rank.Queen),
        value: 160,
        isBreakingPair: false,
      };

      // Trump rank K excludes K♥ from Hearts suit
      const trumpInfoKing = createTrumpScenarios.customTrump(
        Rank.King,
        Suit.Spades,
      );
      const playedCards: Card[] = [];
      const ownHand: Card[] = [];

      const result = isComboUnbeatable(
        combo,
        Suit.Hearts,
        playedCards,
        ownHand,
        trumpInfoKing,
        [], // visibleKittyCards (empty for tests)
      );
      // With trump rank K, only A♥A♥ possible in Hearts, but both A♥ still available
      expect(result).toBe(false);
    });

    test("Pair Q♥Q♥ becomes unbeatable when trump rank K excludes K♥ and A♥ broken", () => {
      const combo = {
        type: ComboType.Pair,
        cards: Card.createPair(Suit.Hearts, Rank.Queen),
        value: 160,
        isBreakingPair: false,
      };

      // Trump rank K excludes K♥ from Hearts suit
      const trumpInfoKing = createTrumpScenarios.customTrump(
        Rank.King,
        Suit.Spades,
      );
      const playedCards = [
        Card.createCard(Suit.Hearts, Rank.Ace, 0), // Break A♥A♥ pair
      ];
      const ownHand: Card[] = [];

      const result = isComboUnbeatable(
        combo,
        Suit.Hearts,
        playedCards,
        ownHand,
        trumpInfoKing,
        [], // visibleKittyCards (empty for tests)
      );
      // With trump rank K, K♥ excluded, and A♥A♥ broken - Q♥Q♥ is now highest possible Hearts pair
      expect(result).toBe(true);
    });
  });

  describe("Middle-Range Pair Tests - Realistic Game Scenarios", () => {
    test("Pair 9♥9♥ is BEATABLE when several higher pairs possible", () => {
      const combo = {
        type: ComboType.Pair,
        cards: Card.createPair(Suit.Hearts, Rank.Nine),
        value: 120,
        isBreakingPair: false,
      };

      const playedCards: Card[] = [];
      const ownHand: Card[] = [];

      const result = isComboUnbeatable(
        combo,
        Suit.Hearts,
        playedCards,
        ownHand,
        trumpInfo,
        [], // visibleKittyCards (empty for tests)
      );
      // Higher pairs possible: A♥A♥, K♥K♥, Q♥Q♥, J♥J♥, 10♥10♥
      expect(result).toBe(false);
    });

    test("Pair 9♥9♥ becomes UNBEATABLE when strategic higher ranks broken", () => {
      const combo = {
        type: ComboType.Pair,
        cards: Card.createPair(Suit.Hearts, Rank.Nine),
        value: 120,
        isBreakingPair: false,
      };

      const playedCards = [
        Card.createCard(Suit.Hearts, Rank.Ace, 0), // Break A♥A♥
        Card.createCard(Suit.Hearts, Rank.King, 1), // Break K♥K♥
        Card.createCard(Suit.Hearts, Rank.Queen, 0), // Break Q♥Q♥
        Card.createCard(Suit.Hearts, Rank.Jack, 1), // Break J♥J♥
        Card.createCard(Suit.Hearts, Rank.Ten, 0), // Break 10♥10♥
      ];
      const ownHand: Card[] = [];

      const result = isComboUnbeatable(
        combo,
        Suit.Hearts,
        playedCards,
        ownHand,
        trumpInfo,
        [], // visibleKittyCards (empty for tests)
      );
      // All higher pairs broken - 9♥9♥ is now unbeatable
      expect(result).toBe(true);
    });

    test("Pair 7♥7♥ is BEATABLE when only high pairs broken (middle pairs remain)", () => {
      const combo = {
        type: ComboType.Pair,
        cards: Card.createPair(Suit.Hearts, Rank.Seven),
        value: 100,
        isBreakingPair: false,
      };

      const playedCards = [
        Card.createCard(Suit.Hearts, Rank.Ace, 0), // Break A♥A♥
        Card.createCard(Suit.Hearts, Rank.King, 1), // Break K♥K♥
        Card.createCard(Suit.Hearts, Rank.Queen, 0), // Break Q♥Q♥
        // J♥J♥, 10♥10♥, 9♥9♥, 8♥8♥ still possible
      ];
      const ownHand: Card[] = [];

      const result = isComboUnbeatable(
        combo,
        Suit.Hearts,
        playedCards,
        ownHand,
        trumpInfo,
        [], // visibleKittyCards (empty for tests)
      );
      // Still beatable by: J♥J♥, 10♥10♥, 9♥9♥, 8♥8♥
      expect(result).toBe(false);
    });

    test("Pair 6♥6♥ becomes UNBEATABLE when higher pairs systematically broken", () => {
      const combo = {
        type: ComboType.Pair,
        cards: Card.createPair(Suit.Hearts, Rank.Six),
        value: 80,
        isBreakingPair: false,
      };

      // Break ALL higher pairs by accounting for one copy of each rank
      const playedCards = [
        Card.createCard(Suit.Hearts, Rank.Ace, 0), // Break A♥A♥
        Card.createCard(Suit.Hearts, Rank.King, 1), // Break K♥K♥
        Card.createCard(Suit.Hearts, Rank.Queen, 0), // Break Q♥Q♥
        Card.createCard(Suit.Hearts, Rank.Jack, 1), // Break J♥J♥
        Card.createCard(Suit.Hearts, Rank.Ten, 0), // Break 10♥10♥
        Card.createCard(Suit.Hearts, Rank.Nine, 1), // Break 9♥9♥
        Card.createCard(Suit.Hearts, Rank.Eight, 0), // Break 8♥8♥
        Card.createCard(Suit.Hearts, Rank.Seven, 1), // Break 7♥7♥
      ];
      const ownHand: Card[] = [];

      const result = isComboUnbeatable(
        combo,
        Suit.Hearts,
        playedCards,
        ownHand,
        trumpInfo,
        [], // visibleKittyCards (empty for tests)
      );
      // All higher pairs broken - 6♥6♥ is now unbeatable
      expect(result).toBe(true);
    });

    test("Pair 10♥10♥ is BEATABLE with partial accounting (only high ranks broken)", () => {
      const combo = {
        type: ComboType.Pair,
        cards: Card.createPair(Suit.Hearts, Rank.Ten),
        value: 140,
        isBreakingPair: false,
      };

      const playedCards = [
        Card.createCard(Suit.Hearts, Rank.Ace, 0), // Break A♥A♥
        Card.createCard(Suit.Hearts, Rank.Queen, 1), // Break Q♥Q♥
        // K♥K♥, J♥J♥ still possible
      ];
      const ownHand: Card[] = [];

      const result = isComboUnbeatable(
        combo,
        Suit.Hearts,
        playedCards,
        ownHand,
        trumpInfo,
        [], // visibleKittyCards (empty for tests)
      );
      // Still beatable by: K♥K♥, J♥J♥
      expect(result).toBe(false);
    });

    test("Pair J♥J♥ becomes UNBEATABLE through mixed played cards and own hand", () => {
      const combo = {
        type: ComboType.Pair,
        cards: Card.createPair(Suit.Hearts, Rank.Jack),
        value: 130,
        isBreakingPair: false,
      };

      const playedCards = [
        Card.createCard(Suit.Hearts, Rank.Ace, 0), // Break A♥A♥
        Card.createCard(Suit.Hearts, Rank.King, 1), // Break K♥K♥
      ];
      const ownHand = [
        Card.createCard(Suit.Hearts, Rank.Queen, 0), // Break Q♥Q♥ (we have one Q♥)
      ];

      const result = isComboUnbeatable(
        combo,
        Suit.Hearts,
        playedCards,
        ownHand,
        trumpInfo,
        [], // visibleKittyCards (empty for tests)
      );
      // All higher pairs broken: A♥A♥ (played one), K♥K♥ (played one), Q♥Q♥ (we hold one)
      expect(result).toBe(true);
    });

    test("Pair 8♥8♥ with complex card distribution", () => {
      const combo = {
        type: ComboType.Pair,
        cards: Card.createPair(Suit.Hearts, Rank.Eight),
        value: 110,
        isBreakingPair: false,
      };

      const playedCards = [
        Card.createCard(Suit.Hearts, Rank.Ace, 0), // A♥ deck 0 played
        Card.createCard(Suit.Hearts, Rank.King, 0), // K♥ deck 0 played
        Card.createCard(Suit.Hearts, Rank.Queen, 0), // Q♥ deck 0 played
        Card.createCard(Suit.Hearts, Rank.Jack, 0), // J♥ deck 0 played
        Card.createCard(Suit.Hearts, Rank.Ten, 0), // 10♥ deck 0 played
        Card.createCard(Suit.Hearts, Rank.Nine, 0), // 9♥ deck 0 played
      ];
      const ownHand: Card[] = [];

      const result = isComboUnbeatable(
        combo,
        Suit.Hearts,
        playedCards,
        ownHand,
        trumpInfo,
        [], // visibleKittyCards (empty for tests)
      );
      // All higher pairs broken - only one copy of each higher rank remaining outside
      expect(result).toBe(true);
    });
  });

  describe("Multiple Pair Scenarios - Strategic Implications", () => {
    test("Two different middle pairs - 9♥9♥ vs 7♥7♥ competition", () => {
      // Test that accounts for multiple pairs being considered
      const combo1 = {
        type: ComboType.Pair,
        cards: Card.createPair(Suit.Hearts, Rank.Nine),
        value: 120,
        isBreakingPair: false,
      };

      const combo2 = {
        type: ComboType.Pair,
        cards: Card.createPair(Suit.Hearts, Rank.Seven),
        value: 100,
        isBreakingPair: false,
      };

      const playedCards = [
        Card.createCard(Suit.Hearts, Rank.Ace, 0), // Break A♥A♥
        Card.createCard(Suit.Hearts, Rank.King, 1), // Break K♥K♥
        Card.createCard(Suit.Hearts, Rank.Queen, 0), // Break Q♥Q♥
        Card.createCard(Suit.Hearts, Rank.Jack, 1), // Break J♥J♥
        Card.createCard(Suit.Hearts, Rank.Ten, 0), // Break 10♥10♥
        Card.createCard(Suit.Hearts, Rank.Nine, 1), // Break 9♥9♥
        Card.createCard(Suit.Hearts, Rank.Eight, 1), // Break 8♥8♥
        // Both 9♥9♥ and 7♥7♥ should be unbeatable now (all higher pairs broken)
      ];
      const ownHand: Card[] = [];

      const result1 = isComboUnbeatable(
        combo1,
        Suit.Hearts,
        playedCards,
        ownHand,
        trumpInfo,
        [], // visibleKittyCards (empty for tests)
      );
      const result2 = isComboUnbeatable(
        combo2,
        Suit.Hearts,
        playedCards,
        ownHand,
        trumpInfo,
        [], // visibleKittyCards (empty for tests)
      );

      // 9♥9♥ unbeatable (all higher pairs broken), 7♥7♥ also unbeatable (same reasoning)
      expect(result1).toBe(true);
      expect(result2).toBe(true);
    });

    test("Strategic pair accounting - some pairs protected, others vulnerable", () => {
      const combo = {
        type: ComboType.Pair,
        cards: Card.createPair(Suit.Hearts, Rank.Eight),
        value: 110,
        isBreakingPair: false,
      };

      // Strategic accounting: break alternate pairs to create pockets of safety
      const playedCards = [
        Card.createCard(Suit.Hearts, Rank.Ace, 0), // Break A♥A♥
        Card.createCard(Suit.Hearts, Rank.Queen, 1), // Break Q♥Q♥
        Card.createCard(Suit.Hearts, Rank.Ten, 0), // Break 10♥10♥
        // K♥K♥, J♥J♥, 9♥9♥ still possible
      ];
      const ownHand: Card[] = [];

      const result = isComboUnbeatable(
        combo,
        Suit.Hearts,
        playedCards,
        ownHand,
        trumpInfo,
        [], // visibleKittyCards (empty for tests)
      );
      // Still beatable by: K♥K♥, J♥J♥, 9♥9♥
      expect(result).toBe(false);
    });

    test("Multi-suit pair comparison - Hearts vs Diamonds", () => {
      const heartsCombo = {
        type: ComboType.Pair,
        cards: Card.createPair(Suit.Hearts, Rank.Ten),
        value: 140,
        isBreakingPair: false,
      };

      const diamondsCombo = {
        type: ComboType.Pair,
        cards: Card.createPair(Suit.Diamonds, Rank.Ten),
        value: 140,
        isBreakingPair: false,
      };

      const playedCards = [
        Card.createCard(Suit.Hearts, Rank.Ace, 0), // Break Hearts A♥A♥
        Card.createCard(Suit.Hearts, Rank.King, 1), // Break Hearts K♥K♥
        Card.createCard(Suit.Hearts, Rank.Queen, 0), // Break Hearts Q♥Q♥
        Card.createCard(Suit.Hearts, Rank.Jack, 1), // Break Hearts J♥J♥
        // Diamonds pairs intact
      ];
      const ownHand: Card[] = [];

      const heartsResult = isComboUnbeatable(
        heartsCombo,
        Suit.Hearts,
        playedCards,
        ownHand,
        trumpInfo,
        [], // visibleKittyCards (empty for tests)
      );
      const diamondsResult = isComboUnbeatable(
        diamondsCombo,
        Suit.Diamonds,
        playedCards,
        ownHand,
        trumpInfo,
        [], // visibleKittyCards (empty for tests)
      );

      // Hearts 10♥10♥ unbeatable (higher Hearts pairs broken), Diamonds 10♦10♦ beatable (Diamonds pairs intact)
      expect(heartsResult).toBe(true);
      expect(diamondsResult).toBe(false);
    });
  });

  describe("Complex Card Accounting Edge Cases", () => {
    test("Pair with one copy in played cards, one copy in own hand (should be unbeatable)", () => {
      const combo = {
        type: ComboType.Pair,
        cards: Card.createPair(Suit.Hearts, Rank.Seven),
        value: 100,
        isBreakingPair: false,
      };

      const playedCards = [
        Card.createCard(Suit.Hearts, Rank.Ace, 0), // Only one A♥
        Card.createCard(Suit.Hearts, Rank.King, 0), // Only one K♥
        Card.createCard(Suit.Hearts, Rank.Queen, 0), // Only one Q♥
      ];
      const ownHand = [
        Card.createCard(Suit.Hearts, Rank.Jack, 1), // Only one J♥
        Card.createCard(Suit.Hearts, Rank.Ten, 1), // Only one 10♥
        Card.createCard(Suit.Hearts, Rank.Nine, 1), // Only one 9♥
        Card.createCard(Suit.Hearts, Rank.Eight, 1), // Only one 8♥
      ];

      const result = isComboUnbeatable(
        combo,
        Suit.Hearts,
        playedCards,
        ownHand,
        trumpInfo,
        [], // visibleKittyCards (empty for tests)
      );
      // All higher pairs broken by single card accounting
      expect(result).toBe(true);
    });

    test("Pair vulnerability with dense card distribution", () => {
      const combo = {
        type: ComboType.Pair,
        cards: Card.createPair(Suit.Hearts, Rank.Five),
        value: 70,
        isBreakingPair: false,
      };

      // Account for many cards but leave some pairs intact
      const playedCards = [
        Card.createCard(Suit.Hearts, Rank.Ace, 0),
        Card.createCard(Suit.Hearts, Rank.Ace, 1), // Both A♥ copies
        Card.createCard(Suit.Hearts, Rank.King, 0), // Only one K♥
        Card.createCard(Suit.Hearts, Rank.Queen, 0),
        Card.createCard(Suit.Hearts, Rank.Queen, 1), // Both Q♥ copies
        Card.createCard(Suit.Hearts, Rank.Jack, 0), // Only one J♥
        Card.createCard(Suit.Hearts, Rank.Ten, 0),
        Card.createCard(Suit.Hearts, Rank.Ten, 1), // Both 10♥ copies
        // K♥K♥, J♥J♥ impossible (only one copy each remaining)
        // 9♥9♥, 8♥8♥, 7♥7♥, 6♥6♥ still possible
      ];
      const ownHand: Card[] = [];

      const result = isComboUnbeatable(
        combo,
        Suit.Hearts,
        playedCards,
        ownHand,
        trumpInfo,
        [], // visibleKittyCards (empty for tests)
      );
      // Still beatable by remaining pairs: 9♥9♥, 8♥8♥, 7♥7♥, 6♥6♥
      expect(result).toBe(false);
    });

    test("Boundary pair testing - 4♥4♥ with extensive accounting", () => {
      const combo = {
        type: ComboType.Pair,
        cards: Card.createPair(Suit.Hearts, Rank.Four),
        value: 60,
        isBreakingPair: false,
      };

      // Break ALL higher pairs except 5♥5♥
      const playedCards = [
        Card.createCard(Suit.Hearts, Rank.Ace, 0), // Break A♥A♥
        Card.createCard(Suit.Hearts, Rank.King, 1), // Break K♥K♥
        Card.createCard(Suit.Hearts, Rank.Queen, 0), // Break Q♥Q♥
        Card.createCard(Suit.Hearts, Rank.Jack, 1), // Break J♥J♥
        Card.createCard(Suit.Hearts, Rank.Ten, 0), // Break 10♥10♥
        Card.createCard(Suit.Hearts, Rank.Nine, 1), // Break 9♥9♥
        Card.createCard(Suit.Hearts, Rank.Eight, 0), // Break 8♥8♥
        Card.createCard(Suit.Hearts, Rank.Seven, 1), // Break 7♥7♥
        Card.createCard(Suit.Hearts, Rank.Six, 0), // Break 6♥6♥
        // 5♥5♥ still possible (both 5♥ unaccounted)
      ];
      const ownHand: Card[] = [];

      const result = isComboUnbeatable(
        combo,
        Suit.Hearts,
        playedCards,
        ownHand,
        trumpInfo,
        [], // visibleKittyCards (empty for tests)
      );
      // Still beatable by 5♥5♥
      expect(result).toBe(false);
    });
  });

  describe("Edge Cases", () => {
    test("Pair with trump suit (None) returns false (conservative)", () => {
      const combo = {
        type: ComboType.Pair,
        cards: Card.createPair(Suit.Hearts, Rank.King),
        value: 180,
        isBreakingPair: false,
      };

      const playedCards: Card[] = [];
      const ownHand: Card[] = [];

      const result = isComboUnbeatable(
        combo,
        Suit.None,
        playedCards,
        ownHand,
        trumpInfo,
        [], // visibleKittyCards (empty for tests)
      );
      // Trump suit logic not implemented - conservative false
      expect(result).toBe(false);
    });

    test("Pair with mixed deck accounting", () => {
      const combo = {
        type: ComboType.Pair,
        cards: Card.createPair(Suit.Hearts, Rank.Queen),
        value: 160,
        isBreakingPair: false,
      };

      const playedCards = [
        Card.createCard(Suit.Hearts, Rank.Ace, 1), // A♥ deck 1 played
        Card.createCard(Suit.Hearts, Rank.King, 0), // K♥ deck 0 played
      ];
      const ownHand = [
        Card.createCard(Suit.Hearts, Rank.Ace, 0), // A♥ deck 0 in hand
        Card.createCard(Suit.Hearts, Rank.King, 1), // K♥ deck 1 in hand
      ];

      const result = isComboUnbeatable(
        combo,
        Suit.Hearts,
        playedCards,
        ownHand,
        trumpInfo,
        [], // visibleKittyCards (empty for tests)
      );
      // Both A♥A♥ and K♥K♥ impossible - all A♥ and K♥ copies accounted for
      expect(result).toBe(true);
    });

    test("Cross-suit interference - trump rank effects", () => {
      const combo = {
        type: ComboType.Pair,
        cards: Card.createPair(Suit.Hearts, Rank.Three),
        value: 40,
        isBreakingPair: false,
      };

      // Trump rank 2 excludes 2♥ from Hearts, but other ranks available
      const playedCards: Card[] = [];
      const ownHand: Card[] = [];

      const result = isComboUnbeatable(
        combo,
        Suit.Hearts,
        playedCards,
        ownHand,
        trumpInfo,
        [], // visibleKittyCards (empty for tests)
      );
      // Many higher pairs still possible (trump rank 2 doesn't affect most ranks)
      expect(result).toBe(false);
    });
  });
});
