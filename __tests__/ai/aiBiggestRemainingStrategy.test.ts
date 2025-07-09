import { isBiggestRemainingInSuit } from "../../src/ai/aiCardMemory";
import { Card, Suit, Rank, CardMemory } from "../../src/types";

describe("Memory-Enhanced Biggest Remaining Strategy", () => {
  let memory: CardMemory;

  beforeEach(() => {
    memory = {
      playedCards: [],
      trumpCardsPlayed: 0,
      pointCardsPlayed: 0,
      leadTrumpPairsPlayed: 0,
      suitDistribution: {},
      playerMemories: {},
      cardProbabilities: [],
      roundStartCards: 26,
      tricksAnalyzed: 0,
    };
  });

  describe("isBiggestRemainingInSuit", () => {
    describe("Singles Logic", () => {
      test("King single wins when both Aces played", () => {
        // Both Aces of Hearts played
        memory.playedCards = [
          Card.createCard(Suit.Hearts, Rank.Ace, 0),
          Card.createCard(Suit.Hearts, Rank.Ace, 0),
        ];

        expect(
          isBiggestRemainingInSuit(memory, Suit.Hearts, Rank.King, "single"),
        ).toBe(true);
      });

      test("King single does not win when only one Ace played", () => {
        // Only one Ace of Hearts played
        memory.playedCards = [Card.createCard(Suit.Hearts, Rank.Ace, 0)];

        expect(
          isBiggestRemainingInSuit(memory, Suit.Hearts, Rank.King, "single"),
        ).toBe(false);
      });

      test("Queen single wins when all Aces and Kings played", () => {
        // All Aces and Kings of Spades played
        memory.playedCards = [
          Card.createCard(Suit.Spades, Rank.Ace, 0),
          Card.createCard(Suit.Spades, Rank.Ace, 0),
          Card.createCard(Suit.Spades, Rank.King, 0),
          Card.createCard(Suit.Spades, Rank.King, 0),
        ];

        expect(
          isBiggestRemainingInSuit(memory, Suit.Spades, Rank.Queen, "single"),
        ).toBe(true);
      });

      test("Jack single does not win when only some higher ranks played", () => {
        // Only Aces played, Kings still available
        memory.playedCards = [
          Card.createCard(Suit.Clubs, Rank.Ace, 0),
          Card.createCard(Suit.Clubs, Rank.Ace, 0),
        ];

        expect(
          isBiggestRemainingInSuit(memory, Suit.Clubs, Rank.Jack, "single"),
        ).toBe(false);
      });
    });

    describe("Pairs Logic", () => {
      test("King pair wins when ANY Ace played", () => {
        // Just one Ace of Hearts played (makes A♥-A♥ pair impossible)
        memory.playedCards = [Card.createCard(Suit.Hearts, Rank.Ace, 0)];

        expect(
          isBiggestRemainingInSuit(memory, Suit.Hearts, Rank.King, "pair"),
        ).toBe(true);
      });

      test("Queen pair wins when ANY Ace OR King played", () => {
        // Only one King of Diamonds played (makes K♦-K♦ pair impossible)
        memory.playedCards = [Card.createCard(Suit.Diamonds, Rank.King, 0)];

        expect(
          isBiggestRemainingInSuit(memory, Suit.Diamonds, Rank.Queen, "pair"),
        ).toBe(true);
      });

      test("Queen pair also wins when ANY Ace played", () => {
        // Only one Ace of Diamonds played (makes A♦-A♦ pair impossible)
        memory.playedCards = [Card.createCard(Suit.Diamonds, Rank.Ace, 0)];

        expect(
          isBiggestRemainingInSuit(memory, Suit.Diamonds, Rank.Queen, "pair"),
        ).toBe(true);
      });

      test("Jack pair wins when multiple higher ranks played", () => {
        // One Ace and one King played
        memory.playedCards = [
          Card.createCard(Suit.Spades, Rank.Ace, 0),
          Card.createCard(Suit.Spades, Rank.King, 0),
        ];

        expect(
          isBiggestRemainingInSuit(memory, Suit.Spades, Rank.Jack, "pair"),
        ).toBe(true);
      });

      test("King pair does not win when no higher ranks played", () => {
        // No Aces played yet
        memory.playedCards = [Card.createCard(Suit.Hearts, Rank.Queen, 0)];

        expect(
          isBiggestRemainingInSuit(memory, Suit.Hearts, Rank.King, "pair"),
        ).toBe(false);
      });
    });

    describe("Cross-Suit Independence", () => {
      test("Different suits are independent", () => {
        // Ace of Hearts played, but checking Spades
        memory.playedCards = [Card.createCard(Suit.Hearts, Rank.Ace, 0)];

        expect(
          isBiggestRemainingInSuit(memory, Suit.Spades, Rank.King, "pair"),
        ).toBe(false);
      });
    });

    describe("Edge Cases", () => {
      test("Ace is always biggest (no higher ranks exist)", () => {
        // No cards played
        memory.playedCards = [];

        // Ace should return true since there are no higher ranks to check
        // The for loop never executes, so we reach the final return statement
        expect(
          isBiggestRemainingInSuit(memory, Suit.Hearts, Rank.Ace, "single"),
        ).toBe(true);
        expect(
          isBiggestRemainingInSuit(memory, Suit.Hearts, Rank.Ace, "pair"),
        ).toBe(false); // pair: no higher ranks played = false
      });

      test("Invalid rank returns false", () => {
        expect(
          isBiggestRemainingInSuit(
            memory,
            Suit.Hearts,
            "Invalid" as Rank,
            "single",
          ),
        ).toBe(false);
      });

      test("Three (lowest rank) requires all higher ranks played", () => {
        // All ranks except Three played (both copies each)
        const allHigherRanks = [
          Rank.Ace,
          Rank.King,
          Rank.Queen,
          Rank.Jack,
          Rank.Ten,
          Rank.Nine,
          Rank.Eight,
          Rank.Seven,
          Rank.Six,
          Rank.Five,
          Rank.Four,
        ];

        memory.playedCards = [];
        allHigherRanks.forEach((rank) => {
          memory.playedCards.push(Card.createCard(Suit.Hearts, rank, 0));
          memory.playedCards.push(Card.createCard(Suit.Hearts, rank, 0));
        });

        expect(
          isBiggestRemainingInSuit(memory, Suit.Hearts, Rank.Three, "single"),
        ).toBe(true);
      });
    });
  });

  describe("Strategic Examples", () => {
    test("Real game scenario: Q♥-Q♥ pair guaranteed after K♥ played", () => {
      // Scenario: Opponent played K♥ single, now Q♥-Q♥ pair is guaranteed to win
      memory.playedCards = [
        Card.createCard(Suit.Hearts, Rank.King, 0),
        Card.createCard(Suit.Spades, Rank.Five, 0), // Other cards from different tricks
      ];

      expect(
        isBiggestRemainingInSuit(memory, Suit.Hearts, Rank.Queen, "pair"),
      ).toBe(true);
    });

    test("Real game scenario: 10♠ single guaranteed after all face cards played", () => {
      // Scenario: All Aces, Kings, Queens, Jacks of Spades played
      memory.playedCards = [
        Card.createCard(Suit.Spades, Rank.Ace, 0),
        Card.createCard(Suit.Spades, Rank.Ace, 0),
        Card.createCard(Suit.Spades, Rank.King, 0),
        Card.createCard(Suit.Spades, Rank.King, 0),
        Card.createCard(Suit.Spades, Rank.Queen, 0),
        Card.createCard(Suit.Spades, Rank.Queen, 0),
        Card.createCard(Suit.Spades, Rank.Jack, 0),
        Card.createCard(Suit.Spades, Rank.Jack, 0),
      ];

      expect(
        isBiggestRemainingInSuit(memory, Suit.Spades, Rank.Ten, "single"),
      ).toBe(true);
    });

    test("Priority order verification: Kings vs Others when guaranteed", () => {
      // When K♥ and Q♥ pairs are both guaranteed, verify logic works for both
      memory.playedCards = [
        Card.createCard(Suit.Hearts, Rank.Ace, 0), // Makes both K and Q pairs guaranteed
      ];

      expect(
        isBiggestRemainingInSuit(memory, Suit.Hearts, Rank.King, "pair"),
      ).toBe(true);
      expect(
        isBiggestRemainingInSuit(memory, Suit.Hearts, Rank.Queen, "pair"),
      ).toBe(true);

      // Strategy should prefer King over Queen (handled by priority system in AI)
    });
  });
});
