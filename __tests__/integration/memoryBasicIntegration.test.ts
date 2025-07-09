import { createMemoryContext } from "../../src/ai/aiCardMemory";
import { getAIMove } from "../../src/ai/aiLogic";
import {
  Card,
  GamePhase,
  GameState,
  PlayerId,
  Rank,
  Suit,
  TrumpInfo,
} from "../../src/types";
import { initializeGame } from "../../src/utils/gameInitialization";

/**
 * Phase 4: Basic Memory System Integration Tests
 *
 * Simple integration tests to validate basic memory system functionality
 * without complex analysis modules that might have dependency issues.
 */

describe("Basic Memory System Integration Tests - Phase 4", () => {
  let gameState: GameState;
  let trumpInfo: TrumpInfo;

  beforeEach(() => {
    gameState = initializeGame();
    trumpInfo = {
      trumpRank: Rank.Two,
      trumpSuit: Suit.Hearts,
    };
    gameState.trumpInfo = trumpInfo;
    gameState.gamePhase = GamePhase.Playing;
  });

  describe("Core Memory System Integration", () => {
    it("should create memory system and provide to AI without errors", () => {
      // Add some completed tricks for memory data
      gameState.tricks = [
        {
          plays: [
            {
              playerId: PlayerId.Human,
              cards: [Card.createCard(Suit.Spades, Rank.Ace, 0)],
            },
            {
              playerId: PlayerId.Bot1,
              cards: [Card.createCard(Suit.Spades, Rank.King, 0)],
            },
            {
              playerId: PlayerId.Bot2,
              cards: [Card.createCard(Suit.Spades, Rank.Queen, 0)],
            },
            {
              playerId: PlayerId.Bot3,
              cards: [Card.createCard(Suit.Hearts, Rank.Three, 0)],
            },
          ],
          winningPlayerId: PlayerId.Bot3,
          points: 30,
        },
      ];

      // Test memory creation
      const cardMemory = createMemoryContext(gameState);
      expect(cardMemory).toBeDefined();
      expect(cardMemory.playedCards.length).toBeGreaterThan(0);
      expect(Object.keys(cardMemory.playerMemories)).toHaveLength(4);

      // Give Bot1 some cards to play
      gameState.players[1].hand = [
        Card.createCard(Suit.Clubs, Rank.King, 0),
        Card.createCard(Suit.Diamonds, Rank.Queen, 0),
        Card.createCard(Suit.Hearts, Rank.Five, 0),
      ];

      // Test AI decision with memory context
      gameState.currentPlayerIndex = 1; // Bot1's turn
      const aiDecision = getAIMove(gameState, PlayerId.Bot1);

      expect(aiDecision).toBeDefined();
      expect(Array.isArray(aiDecision)).toBe(true);
      expect(aiDecision.length).toBeGreaterThan(0);
    });

    it("should track card memory across multiple tricks", () => {
      const memoryEvolution: {
        trickCount: number;
        playedCards: number;
        tricksAnalyzed: number;
        trumpCardsPlayed: number;
        pointCardsPlayed: number;
      }[] = [];

      // Simulate 5 tricks and track memory evolution
      const ranks = [Rank.Seven, Rank.Eight, Rank.Nine, Rank.Ten, Rank.Jack];
      for (let i = 0; i < 5; i++) {
        // Add a trick
        const trick = {
          plays: [
            {
              playerId: PlayerId.Human,
              cards: [Card.createCard(Suit.Clubs, ranks[i % ranks.length], 0)],
            },
            {
              playerId: PlayerId.Bot1,
              cards: [
                Card.createCard(Suit.Clubs, ranks[(i + 1) % ranks.length], 0),
              ],
            },
            {
              playerId: PlayerId.Bot2,
              cards: [
                Card.createCard(Suit.Clubs, ranks[(i + 2) % ranks.length], 0),
              ],
            },
            {
              playerId: PlayerId.Bot3,
              cards: [
                Card.createCard(Suit.Clubs, ranks[(i + 3) % ranks.length], 0),
              ],
            },
          ],
          winningPlayerId: PlayerId.Bot3,
          points: i % 2 === 0 ? 10 : 0,
        };
        gameState.tricks.push(trick);

        // Create memory snapshot
        const cardMemory = createMemoryContext(gameState);
        memoryEvolution.push({
          trickCount: i + 1,
          playedCards: cardMemory.playedCards.length,
          tricksAnalyzed: cardMemory.tricksAnalyzed,
          trumpCardsPlayed: cardMemory.trumpCardsPlayed,
          pointCardsPlayed: cardMemory.pointCardsPlayed,
        });
      }

      // Verify memory accumulates correctly
      expect(memoryEvolution[0].playedCards).toBeLessThan(
        memoryEvolution[4].playedCards,
      );
      expect(memoryEvolution[0].tricksAnalyzed).toBeLessThan(
        memoryEvolution[4].tricksAnalyzed,
      );
      expect(memoryEvolution[4].playedCards).toBe(20); // 5 tricks * 4 cards each
      expect(memoryEvolution[4].tricksAnalyzed).toBe(5);
    });

    it("should detect voids when players trump off-suit leads", () => {
      // Setup scenario where Bot1 shows a void
      gameState.tricks = [
        {
          plays: [
            {
              playerId: PlayerId.Human,
              cards: [Card.createCard(Suit.Spades, Rank.King, 0)],
            },
            {
              playerId: PlayerId.Bot1,
              cards: [Card.createCard(Suit.Hearts, Rank.Three, 0)],
            }, // Trump = void
            {
              playerId: PlayerId.Bot2,
              cards: [Card.createCard(Suit.Spades, Rank.Queen, 0)],
            },
            {
              playerId: PlayerId.Bot3,
              cards: [Card.createCard(Suit.Spades, Rank.Jack, 0)],
            },
          ],
          winningPlayerId: PlayerId.Bot1,
          points: 10,
        },
      ];

      const cardMemory = createMemoryContext(gameState);

      // Verify void detection
      const bot1Memory = cardMemory.playerMemories[PlayerId.Bot1];
      expect(bot1Memory).toBeDefined();
      expect(bot1Memory.suitVoids.has(Suit.Spades)).toBe(true);
    });

    it("should maintain performance with realistic memory workload", () => {
      // Add realistic number of tricks (half a round)
      const testRanks = [
        Rank.Seven,
        Rank.Eight,
        Rank.Nine,
        Rank.Ten,
        Rank.Jack,
        Rank.Queen,
        Rank.King,
      ];
      for (let i = 0; i < 12; i++) {
        const trick = {
          plays: [
            {
              playerId: PlayerId.Human,
              cards: [
                Card.createCard(
                  Suit.Diamonds,
                  testRanks[i % testRanks.length],
                  0,
                ),
              ],
            },
            {
              playerId: PlayerId.Bot1,
              cards: [
                Card.createCard(
                  Suit.Diamonds,
                  testRanks[(i + 1) % testRanks.length],
                  0,
                ),
              ],
            },
            {
              playerId: PlayerId.Bot2,
              cards: [
                Card.createCard(
                  Suit.Diamonds,
                  testRanks[(i + 2) % testRanks.length],
                  0,
                ),
              ],
            },
            {
              playerId: PlayerId.Bot3,
              cards: [
                Card.createCard(
                  Suit.Diamonds,
                  testRanks[(i + 3) % testRanks.length],
                  0,
                ),
              ],
            },
          ],
          winningPlayerId: PlayerId.Bot3,
          points: Math.random() > 0.5 ? 10 : 0,
        };
        gameState.tricks.push(trick);
      }

      const startTime = Date.now();

      // Memory operations
      const cardMemory = createMemoryContext(gameState);
      gameState.currentPlayerIndex = 1;
      const aiDecision = getAIMove(gameState, PlayerId.Bot1);

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Performance check
      expect(processingTime).toBeLessThan(500); // Should be fast
      expect(cardMemory.playedCards.length).toBe(48); // 12 tricks * 4 cards
      expect(aiDecision).toBeDefined();
    });

    it("should handle edge cases gracefully", () => {
      // Test with minimal data
      gameState.tricks = [];

      expect(() => {
        const cardMemory = createMemoryContext(gameState);
        expect(cardMemory.playedCards.length).toBe(0);
        expect(cardMemory.tricksAnalyzed).toBe(0);
      }).not.toThrow();

      // Test with empty current trick
      gameState.currentTrick = null;

      expect(() => {
        const aiDecision = getAIMove(gameState, PlayerId.Bot1);
        expect(aiDecision).toBeDefined();
      }).not.toThrow();
    });
  });
});
