import { getAIMove } from "../../src/ai/aiLogic";
import { Card, PlayerId, Rank, Suit, TrumpInfo } from "../../src/types";
import { initializeGame } from "../../src/utils/gameInitialization";
import { createMockCardMemory, setupMemoryMocking } from "../helpers/mocks";

jest.mock("../../src/ai/aiCardMemory");

/**
 * Enhanced Second Player Strategy Tests
 *
 * Tests for the improved 2nd player following behavior focusing on:
 * 1. Same-suit following decisions based on who led the card
 * 2. Strategic trump selection when void in the led suit
 * 3. Point potential assessment and opponent void analysis
 *
 * Team relationships in Tractor:
 * - Team A: Human + Bot2
 * - Team B: Bot1 + Bot3
 */

describe("Enhanced Second Player Strategy", () => {
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

  describe("Same-Suit Following - Opponent Led", () => {
    it("should play highest card when opponent leads (limited visibility)", () => {
      const gameState = initializeGame();
      gameState.trumpInfo = trumpInfo;

      // Human (opponent of Bot1) leads 9♠
      const opponentLeadingCard = Card.createCard(Suit.Spades, Rank.Nine, 0);

      gameState.currentTrick = {
        plays: [{ playerId: PlayerId.Human, cards: [opponentLeadingCard] }],
        points: 0,
        winningPlayerId: PlayerId.Human,
      };

      gameState.currentPlayerIndex = 1; // Bot1

      // Bot1 hand: has multiple cards that can beat 9♠
      const bot1Hand = [
        Card.createCard(Suit.Spades, Rank.Ace, 0), // Highest card
        Card.createCard(Suit.Spades, Rank.Ten, 0), // Lower card
        Card.createCard(Suit.Spades, Rank.King, 0), // Medium high card
        Card.createCard(Suit.Hearts, Rank.Four, 0), // Trump card
      ];

      gameState.players[1].hand = bot1Hand;

      const aiDecision = getAIMove(gameState, PlayerId.Bot1);

      // Should play A♠ (highest card to maximize win chance with limited visibility)
      expect(aiDecision).toHaveLength(1);
      expect(aiDecision[0].suit).toBe(Suit.Spades);
      expect(aiDecision[0].rank).toBe(Rank.Ace);
    });

    it("should play lowest card when cannot beat opponent", () => {
      const gameState = initializeGame();
      gameState.trumpInfo = trumpInfo;

      // Human (opponent) leads A♠ (very high)
      const opponentLeadingCard = Card.createCard(Suit.Spades, Rank.Ace, 0);

      gameState.currentTrick = {
        plays: [{ playerId: PlayerId.Human, cards: [opponentLeadingCard] }],
        points: 0,
        winningPlayerId: PlayerId.Human,
      };

      gameState.currentPlayerIndex = 1; // Bot1

      // Bot1 hand: has only lower Spades cards
      const bot1Hand = [
        Card.createCard(Suit.Spades, Rank.King, 0), // Cannot beat A♠
        Card.createCard(Suit.Spades, Rank.Three, 0), // Lowest card
        Card.createCard(Suit.Spades, Rank.Seven, 0), // Medium low card
        Card.createCard(Suit.Hearts, Rank.Five, 0), // Trump card
      ];

      gameState.players[1].hand = bot1Hand;

      const aiDecision = getAIMove(gameState, PlayerId.Bot1);

      // Should play 3♠ (lowest card) to minimize loss
      expect(aiDecision).toHaveLength(1);
      expect(aiDecision[0].suit).toBe(Suit.Spades);
      expect(aiDecision[0].rank).toBe(Rank.Three);
    });
  });

  describe("Strategic Trump Selection When Void", () => {
    it("should use strategic trump when teammate led and Bot1 is void", () => {
      const gameState = initializeGame();
      gameState.trumpInfo = trumpInfo;

      // Bot3 (teammate) leads 9♠
      const teammateLeadingCard = Card.createCard(Suit.Spades, Rank.Nine, 0);

      gameState.currentTrick = {
        plays: [{ playerId: PlayerId.Bot3, cards: [teammateLeadingCard] }],
        points: 0,
        winningPlayerId: PlayerId.Bot3,
      };

      gameState.currentPlayerIndex = 1; // Bot1

      // Bot1 hand: void in Spades, has trump options
      const bot1Hand = [
        Card.createCard(Suit.Hearts, Rank.Queen, 0), // High trump
        Card.createCard(Suit.Hearts, Rank.Four, 0), // Low trump
        Card.createCard(Suit.Clubs, Rank.King, 0), // Non-trump point card
        Card.createCard(Suit.Diamonds, Rank.Six, 0), // Non-trump
      ];

      gameState.players[1].hand = bot1Hand;

      // Set up memory: high point potential in Spades (few played)
      const memory = createMockCardMemory();
      memory.playerMemories[PlayerId.Bot1].suitVoids.add(Suit.Spades);
      // Very few Spades points played - high remaining potential
      memory.playedCards = [];
      mockCreateCardMemory.mockReturnValue(memory);

      const aiDecision = getAIMove(gameState, PlayerId.Bot1);

      // Should use trump to support teammate (since void in Spades)
      expect(aiDecision).toHaveLength(1);
      expect(aiDecision[0].suit).toBe(Suit.Hearts);
      // Should use strategic trump based on point potential
      expect([Rank.Queen, Rank.Four]).toContain(aiDecision[0].rank);
    });
  });
});
