import { getAIMove } from "../../src/ai/aiLogic";
import { Card, PlayerId, Rank, Suit, TrumpInfo } from "../../src/types";
import { initializeGame } from "../../src/utils/gameInitialization";
import { createMockCardMemory, setupMemoryMocking } from "../helpers/mocks";

jest.mock("../../src/ai/aiCardMemory");

/**
 * Comprehensive tests for 3rd player void logic fixes:
 * 1. When 2nd player already trumped - 3rd should beat trump, not contribute points
 * 2. When both 3rd and 4th players are void - 3rd should use strategic trump to force 4th player
 *
 * This file consolidates and replaces the previous thirdPlayerVoidIssue.test.ts with
 * improved memory mocking, better test structure, and correct strategic expectations.
 */

describe("Third Player Void Logic", () => {
  let trumpInfo: TrumpInfo;
  let mockCreateCardMemory: jest.MockedFunction<
    typeof import("../../src/ai/aiCardMemory").createMemoryContext
  >;

  beforeEach(() => {
    trumpInfo = {
      trumpSuit: Suit.Hearts,
      trumpRank: Rank.Two,
    };

    // Set up memory mocking
    const mocks = setupMemoryMocking();
    mockCreateCardMemory = mocks.createMemoryContext;
  });

  describe("Scenario 1: Second Player Already Trumped", () => {
    it("should beat trump instead of contributing points when 2nd player trumped and 3rd player void", () => {
      const gameState = initializeGame();
      gameState.trumpInfo = trumpInfo;

      // Human leads 10♠, Bot1 trumps with 3♥
      const humanLeadingCard = Card.createCard(Suit.Spades, Rank.Ten, 0);
      const bot1TrumpCard = Card.createCard(Suit.Hearts, Rank.Three, 0);

      gameState.currentTrick = {
        plays: [
          { playerId: PlayerId.Human, cards: [humanLeadingCard] },
          { playerId: PlayerId.Bot1, cards: [bot1TrumpCard] },
        ],
        points: 10,
        winningPlayerId: PlayerId.Bot1,
      };

      // Set current player to Bot2 (3rd player)
      gameState.currentPlayerIndex = 2;

      // Bot2 hand: void in Spades, has trump that can beat 3♥ and point cards
      const bot2Hand = [
        Card.createCard(Suit.Hearts, Rank.King, 0), // Trump point card
        Card.createCard(Suit.Hearts, Rank.Ace, 0), // Trump ace (can beat 3♥)
        Card.createCard(Suit.Clubs, Rank.Five, 0), // Non-trump point card
        Card.createCard(Suit.Diamonds, Rank.Seven, 0), // Non-trump
      ];

      gameState.players[2].hand = bot2Hand;

      // Get AI decision
      const aiDecision = getAIMove(gameState, PlayerId.Bot2);

      // Should use trump to beat opponent's trump, not contribute points
      expect(aiDecision).toHaveLength(1);
      expect(aiDecision[0].suit).toBe(Suit.Hearts);
      // Should use trump, preferably the ace to beat 3♥
    });

    it("should still contribute points when 2nd player trumped but 3rd player has leading suit", () => {
      const gameState = initializeGame();
      gameState.trumpInfo = trumpInfo;

      // Human leads 10♠, Bot1 trumps with 3♥
      const humanLeadingCard = Card.createCard(Suit.Spades, Rank.Ten, 0);
      const bot1TrumpCard = Card.createCard(Suit.Hearts, Rank.Three, 0);

      gameState.currentTrick = {
        plays: [
          { playerId: PlayerId.Human, cards: [humanLeadingCard] },
          { playerId: PlayerId.Bot1, cards: [bot1TrumpCard] },
        ],
        points: 10,
        winningPlayerId: PlayerId.Human,
      };

      gameState.currentPlayerIndex = 2;

      // Bot2 hand: HAS Spades (not void)
      const bot2Hand = [
        Card.createCard(Suit.Spades, Rank.King, 0), // Leading suit point card
        Card.createCard(Suit.Hearts, Rank.Ace, 0), // Trump ace
        Card.createCard(Suit.Clubs, Rank.Five, 0), // Non-trump point card
      ];

      gameState.players[2].hand = bot2Hand;

      const aiDecision = getAIMove(gameState, PlayerId.Bot2);

      // Should contribute K♠ since not void in leading suit
      expect(aiDecision).toHaveLength(1);
      expect(aiDecision[0].suit).toBe(Suit.Spades);
      expect(aiDecision[0].rank).toBe(Rank.King);
    });
  });

  describe("Scenario 2: Both 3rd and 4th Players Void", () => {
    it("should not contribute points when both 3rd and 4th players are void", () => {
      const gameState = initializeGame();
      gameState.trumpInfo = trumpInfo;

      // Human leads 10♠, Bot1 plays 9♠
      const humanLeadingCard = Card.createCard(Suit.Spades, Rank.Ten, 0);
      const bot1Card = Card.createCard(Suit.Spades, Rank.Nine, 0);

      gameState.currentTrick = {
        plays: [
          { playerId: PlayerId.Human, cards: [humanLeadingCard] },
          { playerId: PlayerId.Bot1, cards: [bot1Card] },
        ],
        points: 10,
        winningPlayerId: PlayerId.Human,
      };

      gameState.currentPlayerIndex = 2;

      // Bot2 hand: void in Spades, has both high and low trump options
      const bot2Hand = [
        Card.createCard(Suit.Hearts, Rank.Queen, 0), // High trump (can beat Bot3's Ace trump)
        Card.createCard(Suit.Hearts, Rank.Three, 0), // Low trump card
        Card.createCard(Suit.Clubs, Rank.Five, 0), // Non-trump point card
        Card.createCard(Suit.Diamonds, Rank.Seven, 0), // Non-trump safe card
      ];

      gameState.players[2].hand = bot2Hand;

      // Set up specific memory mock for this test - both Bot2 and Bot3 are void in Spades
      const memory = createMockCardMemory();
      memory.playerMemories[PlayerId.Bot2].suitVoids.add(Suit.Spades);
      memory.playerMemories[PlayerId.Bot3].suitVoids.add(Suit.Spades);
      mockCreateCardMemory.mockReturnValue(memory);

      const aiDecision = getAIMove(gameState, PlayerId.Bot2);

      // Should play strategic trump to force 4th player to use higher trump
      expect(aiDecision).toHaveLength(1);
      expect(aiDecision[0].suit).toBe(Suit.Hearts); // Should trump
      expect(aiDecision[0].rank).toBe(Rank.Queen); // Should play Queen to force higher trump
    });

    it("should contribute safely when only 4th player is void but 3rd has leading suit", () => {
      const gameState = initializeGame();
      gameState.trumpInfo = trumpInfo;

      // Human leads 10♠, Bot1 plays 9♠
      const humanLeadingCard = Card.createCard(Suit.Spades, Rank.Ten, 0);
      const bot1Card = Card.createCard(Suit.Spades, Rank.Nine, 0);

      gameState.currentTrick = {
        plays: [
          { playerId: PlayerId.Human, cards: [humanLeadingCard] },
          { playerId: PlayerId.Bot1, cards: [bot1Card] },
        ],
        points: 10,
        winningPlayerId: PlayerId.Human,
      };

      gameState.currentPlayerIndex = 2;

      // Bot2 hand: HAS Spades
      const bot2Hand = [
        Card.createCard(Suit.Spades, Rank.King, 0), // Leading suit point card
        Card.createCard(Suit.Hearts, Rank.King, 0), // Trump point card
        Card.createCard(Suit.Clubs, Rank.Five, 0), // Non-trump point card
      ];

      // Bot3 hand: void in Spades
      const bot3Hand = [
        Card.createCard(Suit.Hearts, Rank.Ace, 0), // Trump ace
        Card.createCard(Suit.Clubs, Rank.Six, 0), // Non-trump
      ];

      gameState.players[2].hand = bot2Hand;
      gameState.players[3].hand = bot3Hand;

      const aiDecision = getAIMove(gameState, PlayerId.Bot2);

      // Should contribute K♠ safely since we have leading suit
      expect(aiDecision).toHaveLength(1);
      expect(aiDecision[0].suit).toBe(Suit.Spades);
      expect(aiDecision[0].rank).toBe(Rank.King);
    });
  });

  describe("Additional Legacy Scenarios", () => {
    it("should NOT contribute point cards when both 3rd and 4th players are void (legacy test)", () => {
      const gameState = initializeGame();
      gameState.trumpInfo = trumpInfo;

      // Create trick scenario where teammate is leading Spades (both Bot2 and Bot3 are void)
      const humanLeadingCard = Card.createCard(Suit.Spades, Rank.Ace, 0);
      const bot1Card = Card.createCard(Suit.Spades, Rank.Four, 0);

      // Set up trick with human leading and winning
      gameState.currentTrick = {
        plays: [
          { playerId: PlayerId.Human, cards: [humanLeadingCard] },
          { playerId: PlayerId.Bot1, cards: [bot1Card] },
        ],
        points: 0,
        winningPlayerId: PlayerId.Human,
      };

      gameState.currentPlayerIndex = 2;

      // Bot2 hand: VOID in Spades, has point cards in other suits + trump options
      const bot2Hand = [
        Card.createCard(Suit.Clubs, Rank.Ten, 0), // 10 point card
        Card.createCard(Suit.Clubs, Rank.King, 0), // 10 point card
        Card.createCard(Suit.Diamonds, Rank.Five, 0), // 5 point card
        Card.createCard(Suit.Hearts, Rank.Three, 0), // Low trump card
        Card.createCard(Suit.Hearts, Rank.Four, 0), // Low trump card
      ];

      gameState.players[2].hand = bot2Hand;

      // Add previous tricks to establish void status in memory
      gameState.tricks = [
        {
          plays: [
            {
              playerId: PlayerId.Human,
              cards: [Card.createCard(Suit.Spades, Rank.Queen, 0)],
            },
            {
              playerId: PlayerId.Bot1,
              cards: [Card.createCard(Suit.Spades, Rank.Jack, 0)],
            },
            {
              playerId: PlayerId.Bot2,
              cards: [Card.createCard(Suit.Hearts, Rank.Five, 0)],
            }, // Bot2 trumped
            {
              playerId: PlayerId.Bot3,
              cards: [Card.createCard(Suit.Hearts, Rank.Six, 0)],
            }, // Bot3 trumped
          ],
          points: 0,
          winningPlayerId: PlayerId.Bot3,
        },
      ];

      // Set up specific memory mock for this test - both Bot2 and Bot3 are void in Spades
      const memory = createMockCardMemory();
      memory.playerMemories[PlayerId.Bot2].suitVoids.add(Suit.Spades);
      memory.playerMemories[PlayerId.Bot3].suitVoids.add(Suit.Spades);
      mockCreateCardMemory.mockReturnValue(memory);

      const aiDecision = getAIMove(gameState, PlayerId.Bot2);
      const playedCard = aiDecision[0];

      // Should NOT play point cards (Clubs 10, King, or Diamonds 5)
      expect(playedCard.points || 0).toBe(0);

      // Should play trump card since both 3rd and 4th are void
      expect(playedCard.suit).toBe(Suit.Hearts); // Trump suit

      // Should play a low trump card to conserve high ones
      expect([Rank.Three, Rank.Four]).toContain(playedCard.rank);
    });

    it("should contribute point cards when only 3rd player is void but 4th player can follow suit (legacy test)", () => {
      const gameState = initializeGame();
      gameState.trumpInfo = trumpInfo;

      // Create trick scenario where teammate is leading Spades
      const humanLeadingCard = Card.createCard(Suit.Spades, Rank.Ace, 0);
      const bot1Card = Card.createCard(Suit.Spades, Rank.Four, 0);

      gameState.currentTrick = {
        plays: [
          { playerId: PlayerId.Human, cards: [humanLeadingCard] },
          { playerId: PlayerId.Bot1, cards: [bot1Card] },
        ],
        points: 0,
        winningPlayerId: PlayerId.Human,
      };

      gameState.currentPlayerIndex = 2;

      // Bot2 hand: VOID in Spades, has point cards
      const bot2Hand = [
        Card.createCard(Suit.Clubs, Rank.Ten, 0), // 10 point card
        Card.createCard(Suit.Clubs, Rank.King, 0), // 10 point card
        Card.createCard(Suit.Diamonds, Rank.Five, 0), // 5 point card
        Card.createCard(Suit.Hearts, Rank.Three, 0), // Trump card
      ];

      gameState.players[2].hand = bot2Hand;

      // Previous trick shows Bot2 is void but Bot3 can follow
      gameState.tricks = [
        {
          plays: [
            {
              playerId: PlayerId.Human,
              cards: [Card.createCard(Suit.Spades, Rank.Queen, 0)],
            },
            {
              playerId: PlayerId.Bot1,
              cards: [Card.createCard(Suit.Spades, Rank.Jack, 0)],
            },
            {
              playerId: PlayerId.Bot2,
              cards: [Card.createCard(Suit.Hearts, Rank.Five, 0)],
            }, // Bot2 trumped (void)
            {
              playerId: PlayerId.Bot3,
              cards: [Card.createCard(Suit.Spades, Rank.Nine, 0)],
            }, // Bot3 followed suit
          ],
          points: 0,
          winningPlayerId: PlayerId.Human,
        },
      ];

      // Set up specific memory mock - only Bot2 is void in Spades
      const memory = createMockCardMemory();
      memory.playerMemories[PlayerId.Bot2].suitVoids.add(Suit.Spades);
      // Bot3 is NOT void in Spades (default state)
      mockCreateCardMemory.mockReturnValue(memory);

      const aiDecision = getAIMove(gameState, PlayerId.Bot2);
      const playedCard = aiDecision[0];

      // Should contribute point cards when safe to do so
      expect(playedCard.points).toBeGreaterThan(0);
    });
  });
});
