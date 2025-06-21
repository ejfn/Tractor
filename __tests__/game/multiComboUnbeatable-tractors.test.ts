import { describe, expect, test } from "@jest/globals";
import { isComboUnbeatable } from "../../src/game/multiComboValidation";
import { Card, ComboType, Rank, Suit } from "../../src/types";
import { createTrumpScenarios } from "../helpers";

describe("Tractor Cards - isComboUnbeatable Tests", () => {
  const trumpInfo = createTrumpScenarios.spadesTrump(); // Rank 2, Spades trump

  describe("REALISTIC 2-Pair Tractor Tests - Detection Logic", () => {
    test("Tractor A♥A♥-K♥K♥ is ALWAYS unbeatable (highest possible)", () => {
      const combo = {
        type: ComboType.Tractor,
        cards: [
          ...Card.createPair(Suit.Hearts, Rank.Ace),
          ...Card.createPair(Suit.Hearts, Rank.King),
        ],
        value: 480,
        isBreakingPair: false,
      };

      const playedCards: Card[] = [];
      const ownHand = combo.cards;

      const result = isComboUnbeatable(
        combo,
        Suit.Hearts,
        playedCards,
        ownHand,
        trumpInfo,
      );
      // Always unbeatable - no 2-pair tractor higher than A♥A♥-K♥K♥ possible
      expect(result).toBe(true);
    });

    test("Tractor 10♥10♥-9♥9♥ is BEATABLE when higher tractors possible", () => {
      const combo = {
        type: ComboType.Tractor,
        cards: [
          ...Card.createPair(Suit.Hearts, Rank.Ten),
          ...Card.createPair(Suit.Hearts, Rank.Nine),
        ],
        value: 360,
        isBreakingPair: false,
      };

      const playedCards: Card[] = [];
      const ownHand = combo.cards; // We hold 10♥10♥9♥9♥

      const result = isComboUnbeatable(
        combo,
        Suit.Hearts,
        playedCards,
        ownHand,
        trumpInfo,
      );
      // Beatable by: A♥A♥-K♥K♥, K♥K♥-Q♥Q♥, Q♥Q♥-J♥J♥, J♥J♥-10♥10♥ (but we hold 10♥10♥)
      // Actually beatable by: A♥A♥-K♥K♥, K♥K♥-Q♥Q♥, Q♥Q♥-J♥J♥
      expect(result).toBe(false);
    });

    test("Tractor 10♥10♥-9♥9♥ becomes UNBEATABLE when higher tractors blocked by single cards", () => {
      const combo = {
        type: ComboType.Tractor,
        cards: [
          ...Card.createPair(Suit.Hearts, Rank.Ten),
          ...Card.createPair(Suit.Hearts, Rank.Nine),
        ],
        value: 360,
        isBreakingPair: false,
      };

      // Block higher tractors by accounting for ONE card of each rank (breaks the pairs)
      const playedCards = [
        // Block A♥A♥-K♥K♥ by removing one A♥ (breaks A♥A♥ pair)
        Card.createCard(Suit.Hearts, Rank.Ace, 0),
        // Block K♥K♥-Q♥Q♥ by removing one K♥ (breaks K♥K♥ pair)
        Card.createCard(Suit.Hearts, Rank.King, 0),
        // Block Q♥Q♥-J♥J♥ by removing one Q♥ (breaks Q♥Q♥ pair)
        Card.createCard(Suit.Hearts, Rank.Queen, 1),
        // Block J♥J♥-10♥10♥ by removing one J♥ (breaks J♥J♥ pair, and we hold 10♥10♥)
        Card.createCard(Suit.Hearts, Rank.Jack, 0),
      ];
      const ownHand = combo.cards; // We hold 10♥10♥9♥9♥

      const result = isComboUnbeatable(
        combo,
        Suit.Hearts,
        playedCards,
        ownHand,
        trumpInfo,
      );
      // All higher 2-pair tractors blocked by breaking key pairs with single card accounting
      expect(result).toBe(true);
    });

    test("Tractor 8♥8♥-7♥7♥ is BEATABLE with many higher options available", () => {
      const combo = {
        type: ComboType.Tractor,
        cards: [
          ...Card.createPair(Suit.Hearts, Rank.Eight),
          ...Card.createPair(Suit.Hearts, Rank.Seven),
        ],
        value: 280,
        isBreakingPair: false,
      };

      const playedCards: Card[] = [];
      const ownHand = combo.cards; // We hold 8♥8♥7♥7♥

      const result = isComboUnbeatable(
        combo,
        Suit.Hearts,
        playedCards,
        ownHand,
        trumpInfo,
      );
      // Many higher tractors possible: A♥A♥-K♥K♥, K♥K♥-Q♥Q♥, Q♥Q♥-J♥J♥, J♥J♥-10♥10♥, 10♥10♥-9♥9♥, 9♥9♥-8♥8♥ (but we hold 8♥8♥)
      // Actually: A♥A♥-K♥K♥, K♥K♥-Q♥Q♥, Q♥Q♥-J♥J♥, J♥J♥-10♥10♥, 10♥10♥-9♥9♥
      expect(result).toBe(false);
    });

    test("Tractor 8♥8♥-7♥7♥ becomes UNBEATABLE when ONE card from each higher rank accounted", () => {
      const combo = {
        type: ComboType.Tractor,
        cards: [
          ...Card.createPair(Suit.Hearts, Rank.Eight),
          ...Card.createPair(Suit.Hearts, Rank.Seven),
        ],
        value: 280,
        isBreakingPair: false,
      };

      // Account for ONE card from each higher rank to break all higher pairs
      const playedCards = [
        Card.createCard(Suit.Hearts, Rank.Ace, 0), // Break A♥A♥ pair
        Card.createCard(Suit.Hearts, Rank.King, 1), // Break K♥K♥ pair
        Card.createCard(Suit.Hearts, Rank.Queen, 0), // Break Q♥Q♥ pair
        Card.createCard(Suit.Hearts, Rank.Jack, 1), // Break J♥J♥ pair
        Card.createCard(Suit.Hearts, Rank.Ten, 0), // Break 10♥10♥ pair
        Card.createCard(Suit.Hearts, Rank.Nine, 1), // Break 9♥9♥ pair
      ];
      const ownHand = combo.cards; // We hold 8♥8♥7♥7♥

      const result = isComboUnbeatable(
        combo,
        Suit.Hearts,
        playedCards,
        ownHand,
        trumpInfo,
      );
      // All higher pairs broken by single card accounting - no consecutive pair sequences possible
      expect(result).toBe(true);
    });

    test("Tractor 6♥6♥-5♥5♥ is BEATABLE when only some higher pairs broken", () => {
      const combo = {
        type: ComboType.Tractor,
        cards: [
          ...Card.createPair(Suit.Hearts, Rank.Six),
          ...Card.createPair(Suit.Hearts, Rank.Five),
        ],
        value: 240,
        isBreakingPair: false,
      };

      // Break fewer pairs to ensure some consecutive tractors remain possible
      const playedCards = [
        Card.createCard(Suit.Hearts, Rank.Ace, 0), // Break A♥A♥
        Card.createCard(Suit.Hearts, Rank.Ten, 0), // Break 10♥10♥
        Card.createCard(Suit.Hearts, Rank.Eight, 1), // Break 8♥8♥
        // K♥K♥, Q♥Q♥, J♥J♥, 9♥9♥, 7♥7♥ pairs still possible
        // K♥K♥-Q♥Q♥, Q♥Q♥-J♥J♥, J♥J♥-9♥9♥, 9♥9♥-7♥7♥ tractors possible
      ];
      const ownHand = combo.cards; // We hold 6♥6♥5♥5♥

      const result = isComboUnbeatable(
        combo,
        Suit.Hearts,
        playedCards,
        ownHand,
        trumpInfo,
      );
      // Still beatable by: K♥K♥-Q♥Q♥, Q♥Q♥-J♥J♥, J♥J♥-9♥9♥, 9♥9♥-7♥7♥
      expect(result).toBe(false);
    });

    test("Tractor 5♥5♥-4♥4♥ becomes UNBEATABLE with strategic single-card accounting", () => {
      const combo = {
        type: ComboType.Tractor,
        cards: [
          ...Card.createPair(Suit.Hearts, Rank.Five),
          ...Card.createPair(Suit.Hearts, Rank.Four),
        ],
        value: 200,
        isBreakingPair: false,
      };

      // Strategic accounting: break pairs with minimal card accounting
      const playedCards = [
        // Break every other pair to prevent consecutive tractors
        Card.createCard(Suit.Hearts, Rank.Ace, 0), // Break A♥A♥
        Card.createCard(Suit.Hearts, Rank.Queen, 1), // Break Q♥Q♥
        Card.createCard(Suit.Hearts, Rank.Ten, 0), // Break 10♥10♥
        Card.createCard(Suit.Hearts, Rank.Eight, 1), // Break 8♥8♥
        Card.createCard(Suit.Hearts, Rank.Six, 0), // Break 6♥6♥
      ];
      const ownHand = combo.cards; // We hold 5♥5♥4♥4♥

      const result = isComboUnbeatable(
        combo,
        Suit.Hearts,
        playedCards,
        ownHand,
        trumpInfo,
      );
      // No consecutive 2-pair tractors possible: A-K (A broken), K-Q (Q broken), Q-J (Q broken), J-10 (10 broken), 10-9 (10 broken), 9-8 (8 broken), 8-7 (8 broken), 7-6 (6 broken), 6-5 (6 broken)
      expect(result).toBe(true);
    });
  });

  describe("REALISTIC 3-Pair Tractor Tests - Detection Logic", () => {
    test("Tractor A♥A♥-K♥K♥-Q♥Q♥ is ALWAYS unbeatable (highest possible)", () => {
      const combo = {
        type: ComboType.Tractor,
        cards: [
          ...Card.createPair(Suit.Hearts, Rank.Ace),
          ...Card.createPair(Suit.Hearts, Rank.King),
          ...Card.createPair(Suit.Hearts, Rank.Queen),
        ],
        value: 720,
        isBreakingPair: false,
      };

      const playedCards: Card[] = [];
      const ownHand = combo.cards;

      const result = isComboUnbeatable(
        combo,
        Suit.Hearts,
        playedCards,
        ownHand,
        trumpInfo,
      );
      // Always unbeatable - no 3-pair tractor higher than A♥A♥-K♥K♥-Q♥Q♥ possible
      expect(result).toBe(true);
    });

    test("Tractor 9♥9♥-8♥8♥-7♥7♥ is BEATABLE when higher 3-pair tractors possible", () => {
      const combo = {
        type: ComboType.Tractor,
        cards: [
          ...Card.createPair(Suit.Hearts, Rank.Nine),
          ...Card.createPair(Suit.Hearts, Rank.Eight),
          ...Card.createPair(Suit.Hearts, Rank.Seven),
        ],
        value: 480,
        isBreakingPair: false,
      };

      const playedCards: Card[] = [];
      const ownHand = combo.cards; // We hold 9♥9♥8♥8♥7♥7♥

      const result = isComboUnbeatable(
        combo,
        Suit.Hearts,
        playedCards,
        ownHand,
        trumpInfo,
      );
      // Beatable by: A♥A♥-K♥K♥-Q♥Q♥, K♥K♥-Q♥Q♥-J♥J♥, Q♥Q♥-J♥J♥-10♥10♥, J♥J♥-10♥10♥-9♥9♥ (but we hold 9♥9♥)
      // Actually: A♥A♥-K♥K♥-Q♥Q♥, K♥K♥-Q♥Q♥-J♥J♥, Q♥Q♥-J♥J♥-10♥10♥
      expect(result).toBe(false);
    });

    test("Tractor 9♥9♥-8♥8♥-7♥7♥ becomes UNBEATABLE when higher 3-pair sequences blocked by single cards", () => {
      const combo = {
        type: ComboType.Tractor,
        cards: [
          ...Card.createPair(Suit.Hearts, Rank.Nine),
          ...Card.createPair(Suit.Hearts, Rank.Eight),
          ...Card.createPair(Suit.Hearts, Rank.Seven),
        ],
        value: 480,
        isBreakingPair: false,
      };

      // Block all higher 3-pair tractors by breaking key pairs with single card accounting
      const playedCards = [
        // Block A♥A♥-K♥K♥-Q♥Q♥ by removing one A♥ (breaks A♥A♥ pair)
        Card.createCard(Suit.Hearts, Rank.Ace, 0),
        // Block K♥K♥-Q♥Q♥-J♥J♥ by removing one K♥ (breaks K♥K♥ pair)
        Card.createCard(Suit.Hearts, Rank.King, 0),
        // Block Q♥Q♥-J♥J♥-10♥10♥ by removing one Q♥ (breaks Q♥Q♥ pair)
        Card.createCard(Suit.Hearts, Rank.Queen, 1),
        // Block J♥J♥-10♥10♥-9♥9♥ by removing one J♥ (breaks J♥J♥ pair, and we hold 9♥9♥)
        Card.createCard(Suit.Hearts, Rank.Jack, 1),
      ];
      const ownHand = combo.cards; // We hold 9♥9♥8♥8♥7♥7♥

      const result = isComboUnbeatable(
        combo,
        Suit.Hearts,
        playedCards,
        ownHand,
        trumpInfo,
      );
      // All higher 3-pair tractors blocked by single card accounting - no consecutive 3-pair sequences possible above 9♥
      expect(result).toBe(true);
    });

    test("Tractor 7♥7♥-6♥6♥-5♥5♥ is BEATABLE when some higher 3-pair sequences still possible", () => {
      const combo = {
        type: ComboType.Tractor,
        cards: [
          ...Card.createPair(Suit.Hearts, Rank.Seven),
          ...Card.createPair(Suit.Hearts, Rank.Six),
          ...Card.createPair(Suit.Hearts, Rank.Five),
        ],
        value: 420,
        isBreakingPair: false,
      };

      // Break some but not all higher 3-pair sequences
      const playedCards = [
        // Block A♥A♥-K♥K♥-Q♥Q♥ by breaking A♥A♥
        Card.createCard(Suit.Hearts, Rank.Ace, 0),
        // Block Q♥Q♥-J♥J♥-10♥10♥ by breaking Q♥Q♥
        Card.createCard(Suit.Hearts, Rank.Queen, 1),
        // K♥K♥-Q♥Q♥-J♥J♥ blocked because Q♥Q♥ broken
        // But J♥J♥-10♥10♥-9♥9♥, 10♥10♥-9♥9♥-8♥8♥, 9♥9♥-8♥8♥-7♥7♥ still possible
      ];
      const ownHand = combo.cards; // We hold 7♥7♥6♥6♥5♥5♥

      const result = isComboUnbeatable(
        combo,
        Suit.Hearts,
        playedCards,
        ownHand,
        trumpInfo,
      );
      // Still beatable by: J♥J♥-10♥10♥-9♥9♥, 10♥10♥-9♥9♥-8♥8♥, 9♥9♥-8♥8♥-7♥7♥ (but we hold 7♥7♥)
      // Actually beatable by: J♥J♥-10♥10♥-9♥9♥, 10♥10♥-9♥9♥-8♥8♥
      expect(result).toBe(false);
    });

    test("Tractor 6♥6♥-5♥5♥-4♥4♥ is BEATABLE with many higher sequences available", () => {
      const combo = {
        type: ComboType.Tractor,
        cards: [
          ...Card.createPair(Suit.Hearts, Rank.Six),
          ...Card.createPair(Suit.Hearts, Rank.Five),
          ...Card.createPair(Suit.Hearts, Rank.Four),
        ],
        value: 360,
        isBreakingPair: false,
      };

      const playedCards: Card[] = [];
      const ownHand = combo.cards; // We hold 6♥6♥5♥5♥4♥4♥

      const result = isComboUnbeatable(
        combo,
        Suit.Hearts,
        playedCards,
        ownHand,
        trumpInfo,
      );
      // Many higher 3-pair tractors possible: A-K-Q, K-Q-J, Q-J-10, J-10-9, 10-9-8, 9-8-7, 8-7-6 (but we hold 6♥6♥)
      // Actually: A-K-Q, K-Q-J, Q-J-10, J-10-9, 10-9-8, 9-8-7
      expect(result).toBe(false);
    });
  });

  describe("Trump Rank Skipping - REALISTIC Tests", () => {
    test("Tractor Q♥Q♥-10♥10♥ is BEATABLE when trump rank J creates bridge (higher tractors possible)", () => {
      const combo = {
        type: ComboType.Tractor,
        cards: [
          ...Card.createPair(Suit.Hearts, Rank.Queen),
          ...Card.createPair(Suit.Hearts, Rank.Ten),
        ],
        value: 440,
        isBreakingPair: false,
      };

      const trumpInfoJack = createTrumpScenarios.jackTrump();
      const playedCards: Card[] = [];
      const ownHand = combo.cards; // We hold Q♥Q♥10♥10♥

      const result = isComboUnbeatable(
        combo,
        Suit.Hearts,
        playedCards,
        ownHand,
        trumpInfoJack,
      );
      // With trump rank J: Q-[J]-10 becomes consecutive, so Q♥Q♥-10♥10♥ is a valid tractor
      // BUT higher tractors are still possible: A♥A♥-K♥K♥, K♥K♥-Q♥Q♥ (we hold Q♥Q♥ so blocked)
      // Actually beatable by: A♥A♥-K♥K♥
      expect(result).toBe(false);
    });

    test("Tractor Q♥Q♥-10♥10♥ becomes UNBEATABLE when trump rank J creates bridge but higher blocked", () => {
      const combo = {
        type: ComboType.Tractor,
        cards: [
          ...Card.createPair(Suit.Hearts, Rank.Queen),
          ...Card.createPair(Suit.Hearts, Rank.Ten),
        ],
        value: 440,
        isBreakingPair: false,
      };

      const trumpInfoJack = createTrumpScenarios.jackTrump();
      const playedCards = [
        // Block A♥A♥-K♥K♥ by removing both A♥
        Card.createCard(Suit.Hearts, Rank.Ace, 0),
        Card.createCard(Suit.Hearts, Rank.Ace, 1),
        // K♥K♥-Q♥Q♥ already blocked because we hold Q♥Q♥
      ];
      const ownHand = combo.cards; // We hold Q♥Q♥10♥10♥

      const result = isComboUnbeatable(
        combo,
        Suit.Hearts,
        playedCards,
        ownHand,
        trumpInfoJack,
      );
      // With trump rank J: Q-[J]-10 consecutive, but A♥A♥-K♥K♥ blocked, K♥K♥-Q♥Q♥ blocked (we hold Q♥Q♥)
      expect(result).toBe(true);
    });

    test("Tractor 8♥8♥-6♥6♥ is BEATABLE when trump rank 7 creates bridge (higher tractors possible)", () => {
      const combo = {
        type: ComboType.Tractor,
        cards: [
          ...Card.createPair(Suit.Hearts, Rank.Eight),
          ...Card.createPair(Suit.Hearts, Rank.Six),
        ],
        value: 320,
        isBreakingPair: false,
      };

      const trumpInfo7 = createTrumpScenarios.customTrump(
        Rank.Seven,
        Suit.Spades,
      );
      const playedCards: Card[] = [];
      const ownHand = combo.cards; // We hold 8♥8♥6♥6♥

      const result = isComboUnbeatable(
        combo,
        Suit.Hearts,
        playedCards,
        ownHand,
        trumpInfo7,
      );
      // With trump rank 7: 8-[7]-6 becomes consecutive, so 8♥8♥-6♥6♥ is a valid tractor
      // BUT higher tractors are still possible: A♥A♥-K♥K♥, K♥K♥-Q♥Q♥, Q♥Q♥-J♥J♥, J♥J♥-10♥10♥, 10♥10♥-9♥9♥, 9♥9♥-8♥8♥ (we hold 8♥8♥)
      // Actually beatable by: A♥A♥-K♥K♥, K♥K♥-Q♥Q♥, Q♥Q♥-J♥J♥, J♥J♥-10♥10♥, 10♥10♥-9♥9♥
      expect(result).toBe(false);
    });
  });

  describe("Edge Cases and Algorithm Validation", () => {
    test("Tractor with trump suit (None) returns false (conservative approach)", () => {
      const combo = {
        type: ComboType.Tractor,
        cards: [
          ...Card.createPair(Suit.Hearts, Rank.King),
          ...Card.createPair(Suit.Hearts, Rank.Queen),
        ],
        value: 440,
        isBreakingPair: false,
      };

      const playedCards: Card[] = [];
      const ownHand = combo.cards;

      const result = isComboUnbeatable(
        combo,
        Suit.None,
        playedCards,
        ownHand,
        trumpInfo,
      );
      // Trump suit analysis not implemented yet - conservative false
      expect(result).toBe(false);
    });

    test("Tractor becomes unbeatable when trump rank excludes higher cards", () => {
      const combo = {
        type: ComboType.Tractor,
        cards: [
          ...Card.createPair(Suit.Hearts, Rank.King),
          ...Card.createPair(Suit.Hearts, Rank.Queen),
        ],
        value: 440,
        isBreakingPair: false,
      };

      // Trump rank A excludes A♥ from Hearts suit
      const trumpInfoAce = createTrumpScenarios.customTrump(
        Rank.Ace,
        Suit.Spades,
      );
      const playedCards: Card[] = [];
      const ownHand = combo.cards;

      const result = isComboUnbeatable(
        combo,
        Suit.Hearts,
        playedCards,
        ownHand,
        trumpInfoAce,
      );
      // With trump rank A, no Hearts cards higher than K♥ available - K♥K♥-Q♥Q♥ is highest possible
      expect(result).toBe(true);
    });
  });
});
