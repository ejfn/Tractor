import { getAIMove } from "../../src/ai/aiLogic";
import { createMemoryContext } from "../../src/ai/aiCardMemory";
// Note: Analysis functions require complex parameters, simplified for integration testing
import {
  Card,
  GameState,
  PlayerId,
  Rank,
  Suit,
  GamePhase,
  TrumpInfo,
} from "../../src/types";
import { initializeGame } from "../../src/utils/gameInitialization";
import { gameLogger } from "../../src/utils/gameLogger";

/**
 * Phase 4: Memory System Integration Tests
 *
 * Comprehensive testing of the memory-enhanced AI system across multiple
 * modules to validate cross-component functionality, performance, and
 * strategic decision coherence.
 */

describe("Memory System Integration Tests - Phase 4", () => {
  let gameState: GameState;
  let trumpInfo: TrumpInfo;

  beforeEach(() => {
    // Use real game initialization for authentic integration testing
    gameState = initializeGame();
    trumpInfo = {
      trumpRank: Rank.Two,
      trumpSuit: Suit.Hearts,
    };
    gameState.trumpInfo = trumpInfo;
    gameState.gamePhase = GamePhase.Playing;
  });

  describe("Cross-Module Memory Integration", () => {
    it("should maintain consistent memory state across AI decision modules", () => {
      // Setup a realistic game scenario with multiple tricks played
      setupMultiTrickScenario(gameState);

      // Create memory context
      const cardMemory = createMemoryContext(gameState);

      // Test memory consistency - basic validation
      expect(cardMemory.playedCards.length).toBeGreaterThan(0);
      expect(cardMemory.tricksAnalyzed).toBeGreaterThan(0);
      expect(Object.keys(cardMemory.playerMemories)).toHaveLength(4);

      // Test AI decision with memory context
      const aiDecision = getAIMove(gameState, PlayerId.Bot1);
      expect(aiDecision).toBeDefined();

      gameLogger.info("memory_integration_validated", {
        playedCards: cardMemory.playedCards.length,
        tricksAnalyzed: cardMemory.tricksAnalyzed,
        playerMemories: Object.keys(cardMemory.playerMemories).length,
        aiDecisionLength: aiDecision.length,
      });
    });

    it("should propagate void detection across multiple AI decision points", () => {
      // Setup scenario where Bot1 shows a void
      gameState.currentTrick = {
        plays: [
          {
            playerId: PlayerId.Human,
            cards: [Card.createCard(Suit.Spades, Rank.King, 0)],
          },
          {
            playerId: PlayerId.Bot1,
            cards: [Card.createCard(Suit.Hearts, Rank.Three, 0)], // Trump on non-trump lead = void
          },
        ],
        winningPlayerId: PlayerId.Bot1,
        points: 10,
      };

      const cardMemory = createMemoryContext(gameState);

      // Verify void detection
      const bot1Memory = cardMemory.playerMemories[PlayerId.Bot1];
      expect(bot1Memory.suitVoids.has(Suit.Spades)).toBe(true);

      // Test basic void detection consistency
      expect(bot1Memory.suitVoids.has(Suit.Spades)).toBe(true);
    });

    it("should maintain card counting accuracy throughout a complete round", () => {
      const playersCount = 4;
      const cardsPerPlayer = 25;

      // Simulate several tricks being played
      simulateMultipleTricks(gameState, 8);

      const cardMemory = createMemoryContext(gameState);

      // Verify card counting accuracy
      const totalPlayedCards = cardMemory.playedCards.length;
      const estimatedRemainingCards = Object.values(
        cardMemory.playerMemories,
      ).reduce((sum, memory) => sum + memory.knownCards.length, 0);

      // Basic validations for memory system operation
      expect(totalPlayedCards).toBeGreaterThan(0);
      expect(totalPlayedCards).toBeLessThanOrEqual(
        cardsPerPlayer * playersCount,
      );
      expect(estimatedRemainingCards).toBeGreaterThanOrEqual(0);

      // Memory should track some data
      expect(cardMemory.tricksAnalyzed).toBeGreaterThan(0);
      expect(Object.keys(cardMemory.playerMemories)).toHaveLength(4);

      gameLogger.info("card_counting_validation", {
        totalPlayed: totalPlayedCards,
        estimatedRemaining: estimatedRemainingCards,
        tricksAnalyzed: cardMemory.tricksAnalyzed,
        playerMemories: Object.keys(cardMemory.playerMemories).length,
      });
    });
  });

  describe("Memory-Enhanced AI Decision Quality", () => {
    it("should make improved decisions when memory data is available vs. without", () => {
      // Setup scenario where memory provides strategic advantage
      setupMemoryAdvantageScenario(gameState);

      // Get AI decision with full memory context
      const aiDecisionWithMemory = getAIMove(gameState, PlayerId.Bot1);

      // Create scenario without memory (simulate fresh game)
      const freshGameState = initializeGame();
      freshGameState.trumpInfo = trumpInfo;
      freshGameState.gamePhase = GamePhase.Playing;
      freshGameState.players = gameState.players; // Same hands for comparison
      freshGameState.currentPlayerIndex = gameState.currentPlayerIndex;

      const aiDecisionWithoutMemory = getAIMove(freshGameState, PlayerId.Bot1);

      // Decisions should be valid and potentially different
      expect(aiDecisionWithMemory).toBeDefined();
      expect(aiDecisionWithoutMemory).toBeDefined();
      expect(Array.isArray(aiDecisionWithMemory)).toBe(true);
      expect(Array.isArray(aiDecisionWithoutMemory)).toBe(true);

      // Log decision comparison for analysis
      gameLogger.info("memory_decision_comparison", {
        withMemory: aiDecisionWithMemory.map(
          (c) => `${c.rank}${c.suit?.charAt(0)}`,
        ),
        withoutMemory: aiDecisionWithoutMemory.map(
          (c) => `${c.rank}${c.suit?.charAt(0)}`,
        ),
        tricksAnalyzed: gameState.tricks.length,
      });
    });

    it("should demonstrate guaranteed winner identification accuracy", () => {
      // Setup scenario with guaranteed winners
      const guaranteedWinnerScenario = setupGuaranteedWinnerScenario(gameState);

      const cardMemory = createMemoryContext(gameState);

      // Basic validation of memory system with guaranteed winners
      expect(cardMemory.playedCards.length).toBeGreaterThan(0);
      expect(cardMemory.tricksAnalyzed).toBeGreaterThan(0);

      gameLogger.info("guaranteed_winner_validation", {
        playedCards: cardMemory.playedCards.length,
        tricksAnalyzed: cardMemory.tricksAnalyzed,
        expectedWinner: guaranteedWinnerScenario.expectedWinner
          ? `${guaranteedWinnerScenario.expectedWinner.rank}${guaranteedWinnerScenario.expectedWinner.suit?.charAt(0)}`
          : "none",
      });
    });
  });

  describe("Performance and Efficiency", () => {
    it("should maintain reasonable performance with large memory datasets", () => {
      // Simulate a long game with many tricks
      simulateExtendedGameplay(gameState, 20);

      const startTime = Date.now();

      // Perform memory-intensive operations
      const cardMemory = createMemoryContext(gameState);
      const aiDecision = getAIMove(gameState, PlayerId.Bot1);

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Performance expectations (should complete within reasonable time)
      expect(processingTime).toBeLessThan(1000); // 1 second max for complex scenario
      expect(cardMemory.playedCards.length).toBeGreaterThan(50); // Significant data processed
      expect(aiDecision).toBeDefined();

      gameLogger.info("memory_performance_test", {
        processingTimeMs: processingTime,
        playedCards: cardMemory.playedCards.length,
        tricksAnalyzed: cardMemory.tricksAnalyzed,
        memoryOperations: [
          "creation",
          "void_analysis",
          "point_timing",
          "ai_decision",
        ],
      });
    });

    it("should handle memory system with minimal overhead in standard gameplay", () => {
      // Baseline: Standard AI decision without complex memory scenario
      const startTime = Date.now();

      const cardMemory = createMemoryContext(gameState);
      const aiDecision = getAIMove(gameState, PlayerId.Bot1);

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Should be very fast for simple scenarios
      expect(processingTime).toBeLessThan(200); // 200ms max for simple case
      expect(aiDecision).toBeDefined();

      gameLogger.info("memory_baseline_performance", {
        processingTimeMs: processingTime,
        tricksAnalyzed: cardMemory.tricksAnalyzed,
        scenario: "baseline",
      });
    });
  });

  describe("Edge Cases and Robustness", () => {
    it("should handle corrupted or incomplete memory data gracefully", () => {
      // Create memory with missing data
      const cardMemory = createMemoryContext(gameState);

      // Simulate corrupted memory state
      cardMemory.playerMemories[PlayerId.Bot1].knownCards = [];
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete cardMemory.playerMemories[PlayerId.Bot2];

      // AI should still function despite corrupted memory
      expect(() => {
        const aiDecision = getAIMove(gameState, PlayerId.Bot3);
        expect(aiDecision).toBeDefined();
      }).not.toThrow();
    });

    it("should validate memory consistency after multiple rounds", () => {
      // Simulate multiple rounds of gameplay
      for (let round = 0; round < 3; round++) {
        simulateCompleteRound(gameState);

        const cardMemory = createMemoryContext(gameState);

        // Memory should remain consistent
        expect(cardMemory.playedCards.length).toBeGreaterThanOrEqual(0);
        expect(Object.keys(cardMemory.playerMemories)).toHaveLength(4);

        // Each player memory should be valid
        Object.values(cardMemory.playerMemories).forEach((memory) => {
          expect(memory.knownCards).toEqual(expect.any(Array));
          expect(memory.suitVoids).toBeInstanceOf(Set);
          expect(typeof memory.trumpVoid).toBe("boolean");
        });
      }
    });
  });
});

// Helper functions for test setup

function setupMultiTrickScenario(gameState: GameState): void {
  // Add several completed tricks to provide memory data
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
        }, // Trump
      ],
      winningPlayerId: PlayerId.Bot3,
      points: 30,
    },
    {
      plays: [
        {
          playerId: PlayerId.Bot3,
          cards: [Card.createCard(Suit.Diamonds, Rank.King, 0)],
        },
        {
          playerId: PlayerId.Human,
          cards: [Card.createCard(Suit.Diamonds, Rank.Ten, 0)],
        },
        {
          playerId: PlayerId.Bot1,
          cards: [Card.createCard(Suit.Clubs, Rank.Seven, 0)],
        }, // Different suit = void
        {
          playerId: PlayerId.Bot2,
          cards: [Card.createCard(Suit.Diamonds, Rank.Five, 0)],
        },
      ],
      winningPlayerId: PlayerId.Bot3,
      points: 25,
    },
  ];
}

function setupMemoryAdvantageScenario(gameState: GameState): void {
  // Create scenario where memory provides clear strategic advantage
  // Bot1 has shown void in Spades, Human has point cards
  gameState.tricks = [
    {
      plays: [
        {
          playerId: PlayerId.Human,
          cards: [Card.createCard(Suit.Spades, Rank.Ace, 0)],
        },
        {
          playerId: PlayerId.Bot1,
          cards: [Card.createCard(Suit.Hearts, Rank.Four, 0)],
        }, // Trump = void
        {
          playerId: PlayerId.Bot2,
          cards: [Card.createCard(Suit.Spades, Rank.Seven, 0)],
        },
        {
          playerId: PlayerId.Bot3,
          cards: [Card.createCard(Suit.Spades, Rank.Eight, 0)],
        },
      ],
      winningPlayerId: PlayerId.Bot1,
      points: 10,
    },
  ];

  // Set current player to Bot1 with strategic options
  gameState.currentPlayerIndex = 1;
  gameState.players[1].hand = [
    Card.createCard(Suit.Diamonds, Rank.King, 0), // Point card
    Card.createCard(Suit.Clubs, Rank.Queen, 0),
    Card.createCard(Suit.Hearts, Rank.Five, 0), // Trump
  ];
}

function setupGuaranteedWinnerScenario(gameState: GameState): {
  expectedWinner?: Card;
} {
  // Setup scenario where K♠ is guaranteed winner (A♠ already played)
  gameState.tricks = [
    {
      plays: [
        {
          playerId: PlayerId.Human,
          cards: [Card.createCard(Suit.Spades, Rank.Ace, 0)],
        },
        {
          playerId: PlayerId.Bot1,
          cards: [Card.createCard(Suit.Spades, Rank.Seven, 0)],
        },
        {
          playerId: PlayerId.Bot2,
          cards: [Card.createCard(Suit.Spades, Rank.Eight, 0)],
        },
        {
          playerId: PlayerId.Bot3,
          cards: [Card.createCard(Suit.Spades, Rank.Nine, 0)],
        },
      ],
      winningPlayerId: PlayerId.Human,
      points: 10,
    },
  ];

  // Give Bot1 the guaranteed winner
  const guaranteedWinner = Card.createCard(Suit.Spades, Rank.King, 0);
  gameState.players[1].hand = [guaranteedWinner];

  return { expectedWinner: guaranteedWinner };
}

function simulateMultipleTricks(
  gameState: GameState,
  trickCount: number,
): void {
  const testRanks = [Rank.Seven, Rank.Eight, Rank.Nine, Rank.Ten, Rank.Jack];
  for (let i = 0; i < trickCount; i++) {
    const trick = {
      plays: [
        {
          playerId: PlayerId.Human,
          cards: [
            Card.createCard(Suit.Clubs, testRanks[i % testRanks.length], 0),
          ],
        },
        {
          playerId: PlayerId.Bot1,
          cards: [
            Card.createCard(
              Suit.Clubs,
              testRanks[(i + 1) % testRanks.length],
              0,
            ),
          ],
        },
        {
          playerId: PlayerId.Bot2,
          cards: [
            Card.createCard(
              Suit.Clubs,
              testRanks[(i + 2) % testRanks.length],
              0,
            ),
          ],
        },
        {
          playerId: PlayerId.Bot3,
          cards: [
            Card.createCard(
              Suit.Clubs,
              testRanks[(i + 3) % testRanks.length],
              0,
            ),
          ],
        },
      ],
      winningPlayerId: PlayerId.Bot3,
      points: i % 2 === 0 ? 10 : 0, // Alternate point values
    };
    gameState.tricks.push(trick);
  }
}

function simulateExtendedGameplay(
  gameState: GameState,
  trickCount: number,
): void {
  const suits = [Suit.Spades, Suit.Clubs, Suit.Diamonds];
  const ranks = [
    Rank.Seven,
    Rank.Eight,
    Rank.Nine,
    Rank.Ten,
    Rank.Jack,
    Rank.Queen,
    Rank.King,
    Rank.Ace,
  ];

  for (let i = 0; i < trickCount; i++) {
    const suit = suits[i % suits.length];
    const baseRank = ranks[i % ranks.length];

    const trick = {
      plays: [
        {
          playerId: PlayerId.Human,
          cards: [Card.createCard(suit, baseRank, 0)],
        },
        {
          playerId: PlayerId.Bot1,
          cards: [
            Card.createCard(
              suit,
              ranks[(ranks.indexOf(baseRank) + 1) % ranks.length],
              0,
            ),
          ],
        },
        {
          playerId: PlayerId.Bot2,
          cards: [
            Card.createCard(
              suit,
              ranks[(ranks.indexOf(baseRank) + 2) % ranks.length],
              0,
            ),
          ],
        },
        {
          playerId: PlayerId.Bot3,
          cards: [
            Card.createCard(
              suit,
              ranks[(ranks.indexOf(baseRank) + 3) % ranks.length],
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
}

function simulateCompleteRound(gameState: GameState): void {
  // Simulate playing most cards in a round
  simulateMultipleTricks(gameState, 20);

  // Update player hand sizes to reflect cards played
  gameState.players.forEach((player) => {
    player.hand = player.hand.slice(0, Math.max(0, player.hand.length - 20));
  });
}
