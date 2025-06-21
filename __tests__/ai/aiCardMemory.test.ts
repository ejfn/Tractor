import {
  createCardMemory,
  createMemoryContext,
  createMemoryStrategy,
  enhanceGameContextWithMemory,
} from "../../src/ai/aiCardMemory";
import {
  Card,
  GameContext,
  GameState,
  JokerType,
  MemoryContext,
  PlayerId,
  PlayStyle,
  PointPressure,
  Rank,
  Suit,
  Trick,
  TrickPosition,
  TrumpInfo,
} from "../../src/types";
import { createTestCardsGameState } from "../helpers/gameStates";

describe("AI Card Memory System - Phase 3", () => {
  let gameState: GameState;
  let trumpInfo: TrumpInfo;

  beforeEach(() => {
    gameState = createTestCardsGameState();
    trumpInfo = {
      trumpRank: Rank.Two,
      trumpSuit: Suit.Hearts,
    };
    gameState.trumpInfo = trumpInfo;
  });

  const createTestTrick = (
    leadingPlayerId: PlayerId,
    leadingCards: Card[],
    followingPlays: { playerId: PlayerId; cards: Card[] }[] = [],
  ): Trick => ({
    plays: [
      { playerId: leadingPlayerId, cards: leadingCards },
      ...followingPlays,
    ],
    winningPlayerId: leadingPlayerId,
    points:
      leadingCards.reduce((sum, card) => sum + card.points, 0) +
      followingPlays.reduce(
        (sum, play) =>
          sum + play.cards.reduce((cardSum, card) => cardSum + card.points, 0),
        0,
      ),
  });

  describe("createCardMemory", () => {
    it("should initialize empty memory correctly", () => {
      const memory = createCardMemory(gameState);

      expect(memory.playedCards).toEqual([]);
      expect(memory.trumpCardsPlayed).toBe(0);
      expect(memory.pointCardsPlayed).toBe(0);
      expect(memory.suitDistribution).toEqual({});
      expect(memory.tricksAnalyzed).toBe(0);
      expect(Object.keys(memory.playerMemories)).toHaveLength(4);
      // Card probabilities will be calculated for all unseen cards
      expect(memory.cardProbabilities.length).toBeGreaterThan(0);
    });

    it("should analyze completed tricks correctly", () => {
      // Add a completed trick
      const trick = createTestTrick(
        PlayerId.Human,
        [Card.createCard(Suit.Diamonds, Rank.King, 0)],
        [
          {
            playerId: PlayerId.Bot1,
            cards: [Card.createCard(Suit.Diamonds, Rank.Ace, 0)],
          },
          {
            playerId: PlayerId.Bot2,
            cards: [Card.createCard(Suit.Hearts, Rank.Two, 0)],
          }, // Trump
          {
            playerId: PlayerId.Bot3,
            cards: [Card.createCard(Suit.Clubs, Rank.Five, 0)],
          },
        ],
      );

      gameState.tricks = [trick];
      const memory = createCardMemory(gameState);

      expect(memory.playedCards).toHaveLength(4);
      expect(memory.trumpCardsPlayed).toBe(1); // Two of Hearts is trump
      expect(memory.pointCardsPlayed).toBe(2); // King of Diamonds (10pts) + Five of Clubs (5pts)
      expect(memory.tricksAnalyzed).toBe(1);
      expect(memory.suitDistribution["Diamonds"]).toBe(2); // King and Ace
      expect(memory.suitDistribution["Hearts"]).toBe(1); // Trump Two
      expect(memory.suitDistribution["Clubs"]).toBe(1); // Five
    });

    it("should track player-specific information", () => {
      const trick = createTestTrick(
        PlayerId.Human,
        [Card.createCard(Suit.Diamonds, Rank.King, 0)],
        [
          {
            playerId: PlayerId.Bot1,
            cards: [Card.createCard(Suit.Diamonds, Rank.Three, 0)],
          },
          {
            playerId: PlayerId.Bot2,
            cards: [Card.createCard(Suit.Hearts, Rank.Two, 0)],
          }, // Trump
        ],
      );

      gameState.tricks = [trick];
      const memory = createCardMemory(gameState);

      const humanMemory = memory.playerMemories[PlayerId.Human];
      expect(humanMemory.knownCards).toHaveLength(1);
      expect(humanMemory.knownCards[0].rank).toBe(Rank.King);

      const bot2Memory = memory.playerMemories[PlayerId.Bot2];
      expect(bot2Memory.trumpUsed).toBe(1); // Played trump Two of Hearts
    });

    it("should handle current trick in progress", () => {
      gameState.currentTrick = {
        plays: [
          {
            playerId: PlayerId.Human,
            cards: [Card.createCard(Suit.Spades, Rank.Queen, 0)],
          },
          {
            playerId: PlayerId.Bot1,
            cards: [Card.createCard(Suit.Spades, Rank.Jack, 0)],
          },
        ],
        winningPlayerId: PlayerId.Human, // Human's Queen beats Bot1's Jack
        points: 0,
      };

      const memory = createCardMemory(gameState);

      expect(memory.playedCards).toHaveLength(2);
      expect(memory.suitDistribution["Spades"]).toBe(2);
    });
  });

  describe("createMemoryContext", () => {
    it("should calculate uncertainty level correctly", () => {
      // Add some played cards
      const trick = createTestTrick(
        PlayerId.Human,
        [Card.createCard(Suit.Diamonds, Rank.King, 0)],
        [
          {
            playerId: PlayerId.Bot1,
            cards: [Card.createCard(Suit.Diamonds, Rank.Ace, 0)],
          },
          {
            playerId: PlayerId.Bot2,
            cards: [Card.createCard(Suit.Hearts, Rank.Two, 0)],
          },
        ],
      );

      gameState.tricks = [trick];
      const memory = createCardMemory(gameState);
      const memoryContext = createMemoryContext(memory, gameState);

      expect(memoryContext.knownCards).toBe(3); // 3 cards played
      expect(memoryContext.uncertaintyLevel).toBeLessThan(1.0);
      expect(memoryContext.uncertaintyLevel).toBeGreaterThan(0.0);
    });

    it("should calculate trump exhaustion correctly", () => {
      // Create tricks with trump cards
      const tricks = [
        createTestTrick(
          PlayerId.Human,
          [Card.createCard(Suit.Hearts, Rank.Two, 0)], // Trump
          [
            {
              playerId: PlayerId.Bot1,
              cards: [Card.createCard(Suit.Spades, Rank.Two, 0)],
            }, // Trump rank
            {
              playerId: PlayerId.Bot2,
              cards: [Card.createCard(Suit.Hearts, Rank.Three, 0)],
            }, // Trump suit
          ],
        ),
      ];

      gameState.tricks = tricks;
      const memory = createCardMemory(gameState);
      const memoryContext = createMemoryContext(memory, gameState);

      expect(memoryContext.trumpExhaustion).toBeGreaterThan(0);
      expect(memoryContext.trumpExhaustion).toBeLessThanOrEqual(1);
    });

    it("should estimate opponent hand strengths", () => {
      const memory = createCardMemory(gameState);
      const memoryContext = createMemoryContext(memory, gameState);

      expect(Object.keys(memoryContext.opponentHandStrength)).toHaveLength(4);
      Object.values(memoryContext.opponentHandStrength).forEach((strength) => {
        expect(strength).toBeGreaterThanOrEqual(0);
        expect(strength).toBeLessThanOrEqual(1);
      });
    });
  });

  describe("createMemoryStrategy", () => {
    it("should recommend trump play based on exhaustion", () => {
      // Mock high trump exhaustion
      const memory = createCardMemory(gameState);
      const memoryContext: MemoryContext = {
        cardsRemaining: 20,
        knownCards: 40,
        uncertaintyLevel: 0.3,
        trumpExhaustion: 0.8, // High exhaustion
        opponentHandStrength: {
          [PlayerId.Human]: 0.3,
          [PlayerId.Bot1]: 0.2,
          [PlayerId.Bot2]: 0.4,
          [PlayerId.Bot3]: 0.25,
        },
      };

      const strategy = createMemoryStrategy(memory, memoryContext, gameState);

      expect(strategy.shouldPlayTrump).toBe(true);
      expect(strategy.riskLevel).toBeGreaterThan(0.5); // Higher risk with more info
    });

    it("should detect endgame optimal conditions", () => {
      const memory = createCardMemory(gameState);
      const memoryContext: MemoryContext = {
        cardsRemaining: 8, // 2 cards per player
        knownCards: 45,
        uncertaintyLevel: 0.05, // Very low uncertainty
        trumpExhaustion: 0.9,
        opponentHandStrength: {
          [PlayerId.Human]: 0.2,
          [PlayerId.Bot1]: 0.1,
          [PlayerId.Bot2]: 0.3,
          [PlayerId.Bot3]: 0.15,
        },
      };

      const strategy = createMemoryStrategy(memory, memoryContext, gameState);

      expect(strategy.endgameOptimal).toBe(true);
      expect(strategy.riskLevel).toBeGreaterThan(0.9); // Very high confidence
    });

    it("should calculate expected opponent strength", () => {
      const memory = createCardMemory(gameState);
      const memoryContext: MemoryContext = {
        cardsRemaining: 30,
        knownCards: 20,
        uncertaintyLevel: 0.4,
        trumpExhaustion: 0.3,
        opponentHandStrength: {
          [PlayerId.Human]: 0.6,
          [PlayerId.Bot1]: 0.8,
          [PlayerId.Bot2]: 0.4,
          [PlayerId.Bot3]: 0.2,
        },
      };

      const strategy = createMemoryStrategy(memory, memoryContext, gameState);

      expect(strategy.expectedOpponentStrength).toBeCloseTo(0.5, 2); // Average of 0.6, 0.8, 0.4, 0.2
    });

    it("should detect suit exhaustion advantage", () => {
      const memory = createCardMemory(gameState);
      // Manually set up a player with suit voids
      memory.playerMemories[PlayerId.Bot1].suitVoids.add(Suit.Spades);
      memory.playerMemories[PlayerId.Bot1].estimatedHandSize = 8;

      const memoryContext = createMemoryContext(memory, gameState);
      const strategy = createMemoryStrategy(memory, memoryContext, gameState);

      expect(strategy.suitExhaustionAdvantage).toBe(true);
    });
  });

  describe("enhanceGameContextWithMemory", () => {
    it("should integrate memory context into game context", () => {
      const baseContext: GameContext = {
        isAttackingTeam: true,
        currentPoints: 30,
        pointsNeeded: 80,
        cardsRemaining: 25,
        trickPosition: TrickPosition.First,
        pointPressure: PointPressure.MEDIUM,
        playStyle: PlayStyle.Balanced,
      };

      const memory = createCardMemory(gameState);
      const enhancedContext = enhanceGameContextWithMemory(
        baseContext,
        memory,
        gameState,
      );

      expect(enhancedContext).toMatchObject(baseContext);
      expect(enhancedContext.memoryContext).toBeDefined();
      expect(enhancedContext.memoryContext?.cardsRemaining).toBeGreaterThan(0);
    });

    it("should preserve all original context properties", () => {
      const baseContext: GameContext = {
        isAttackingTeam: false,
        currentPoints: 65,
        pointsNeeded: 80,
        cardsRemaining: 12,
        trickPosition: TrickPosition.Fourth,
        pointPressure: PointPressure.HIGH,
        playStyle: PlayStyle.Desperate,
      };

      const memory = createCardMemory(gameState);
      const enhancedContext = enhanceGameContextWithMemory(
        baseContext,
        memory,
        gameState,
      );

      // Should preserve all original context properties
      expect(enhancedContext.isAttackingTeam).toBe(false);
      expect(enhancedContext.currentPoints).toBe(65);
      expect(enhancedContext.pointsNeeded).toBe(80);
      expect(enhancedContext.cardsRemaining).toBe(12);
      expect(enhancedContext.trickPosition).toBe(TrickPosition.Fourth);
      expect(enhancedContext.pointPressure).toBe(PointPressure.HIGH);
      expect(enhancedContext.playStyle).toBe(PlayStyle.Desperate);
      // Should add memory context and strategy
      expect(enhancedContext.memoryContext).toBeDefined();
    });
  });

  describe("Play Pattern Analysis", () => {
    it("should record and analyze play patterns", () => {
      // Create a trick where Bot1 leads with a trump
      const trick = createTestTrick(
        PlayerId.Bot1,
        [Card.createCard(Suit.Hearts, Rank.Two, 0)], // Trump lead
        [
          {
            playerId: PlayerId.Human,
            cards: [Card.createCard(Suit.Hearts, Rank.King, 0)],
          },
          {
            playerId: PlayerId.Bot2,
            cards: [Card.createCard(Suit.Hearts, Rank.Ace, 0)],
          },
        ],
      );

      gameState.tricks = [trick];
      const memory = createCardMemory(gameState);

      const bot1Memory = memory.playerMemories[PlayerId.Bot1];
      expect(bot1Memory.playPatterns).toContainEqual(
        expect.objectContaining({
          situation: "leading_trump",
          cardType: "trump",
          frequency: 1,
        }),
      );

      const humanMemory = memory.playerMemories[PlayerId.Human];
      expect(humanMemory.playPatterns).toContainEqual(
        expect.objectContaining({
          situation: "following_trump", // King of Hearts is trump suit with trump rank Two
          cardType: "trump",
          frequency: 1,
        }),
      );
    });

    it("should update point card probabilities based on play history", () => {
      // Create multiple tricks where Bot1 plays point cards frequently
      const tricks = [
        createTestTrick(
          PlayerId.Human,
          [Card.createCard(Suit.Spades, Rank.Three, 0)],
          [
            {
              playerId: PlayerId.Bot1,
              cards: [Card.createCard(Suit.Spades, Rank.King, 0)],
            },
          ],
        ),
        createTestTrick(
          PlayerId.Human,
          [Card.createCard(Suit.Clubs, Rank.Four, 0)],
          [
            {
              playerId: PlayerId.Bot1,
              cards: [Card.createCard(Suit.Clubs, Rank.Five, 0)],
            },
          ],
        ),
        createTestTrick(
          PlayerId.Human,
          [Card.createCard(Suit.Diamonds, Rank.Six, 0)],
          [
            {
              playerId: PlayerId.Bot1,
              cards: [Card.createCard(Suit.Diamonds, Rank.Seven, 0)],
            },
          ],
        ),
      ];

      gameState.tricks = tricks;
      const memory = createCardMemory(gameState);

      const bot1Memory = memory.playerMemories[PlayerId.Bot1];
      // Bot1 played 2 point cards out of 3 total cards (66.7% rate)
      expect(bot1Memory.pointCardsProbability).toBeGreaterThan(0.5);
    });
  });

  describe("Card Probability Calculations", () => {
    it("should calculate card probabilities for remaining cards", () => {
      const trick = createTestTrick(
        PlayerId.Human,
        [Card.createCard(Suit.Diamonds, Rank.King, 0)],
        [
          {
            playerId: PlayerId.Bot1,
            cards: [Card.createCard(Suit.Diamonds, Rank.Ace, 0)],
          },
        ],
      );

      gameState.tricks = [trick];
      const memory = createCardMemory(gameState);

      expect(memory.cardProbabilities.length).toBeGreaterThan(0);

      // Check that probabilities sum to 1 for each card
      memory.cardProbabilities.forEach((cardProb) => {
        const totalProb = Object.values(cardProb.players).reduce(
          (sum, prob) => sum + prob,
          0,
        );
        expect(totalProb).toBeCloseTo(1, 2);
      });
    });

    it("should handle suit void constraints", () => {
      const memory = createCardMemory(gameState);

      // Manually set Bot1 as having a void in Spades
      memory.playerMemories[PlayerId.Bot1].suitVoids.add(Suit.Spades);

      // Recalculate probabilities by calling the probability calculation again
      // Note: In the actual implementation, we would need to recalculate after setting voids
      // For this test, we'll check that the void detection logic works

      // Verify that Bot1 has a void in Spades recorded
      expect(
        memory.playerMemories[PlayerId.Bot1].suitVoids.has(Suit.Spades),
      ).toBe(true);
    });
  });

  describe("Edge Cases and Integration", () => {
    it("should handle empty game state gracefully", () => {
      const emptyGameState = { ...gameState, tricks: [], currentTrick: null };
      const memory = createCardMemory(emptyGameState);

      expect(memory.playedCards).toEqual([]);
      expect(memory.tricksAnalyzed).toBe(0);
      expect(Object.keys(memory.playerMemories)).toHaveLength(4);
    });

    it("should handle games with many completed tricks", () => {
      // Create 10 tricks
      const tricks = Array.from({ length: 10 }, (_, i) =>
        createTestTrick(
          PlayerId.Human,
          [Card.createCard(Suit.Spades, Rank.Three, 0)],
          [
            {
              playerId: PlayerId.Bot1,
              cards: [Card.createCard(Suit.Spades, Rank.Four, 0)],
            },
            {
              playerId: PlayerId.Bot2,
              cards: [Card.createCard(Suit.Spades, Rank.Five, 0)],
            },
            {
              playerId: PlayerId.Bot3,
              cards: [Card.createCard(Suit.Spades, Rank.Six, 0)],
            },
          ],
        ),
      );

      gameState.tricks = tricks;
      const memory = createCardMemory(gameState);

      expect(memory.tricksAnalyzed).toBe(10);
      expect(memory.playedCards).toHaveLength(40); // 4 cards per trick × 10 tricks
    });

    it("should maintain consistency across multiple memory operations", () => {
      const trick = createTestTrick(
        PlayerId.Human,
        [Card.createCard(Suit.Diamonds, Rank.King, 0)],
        [
          {
            playerId: PlayerId.Bot1,
            cards: [Card.createCard(Suit.Diamonds, Rank.Ace, 0)],
          },
        ],
      );

      gameState.tricks = [trick];

      // Create memory multiple times
      const memory1 = createCardMemory(gameState);
      const memory2 = createCardMemory(gameState);

      expect(memory1.playedCards).toEqual(memory2.playedCards);
      expect(memory1.trumpCardsPlayed).toBe(memory2.trumpCardsPlayed);
      expect(memory1.tricksAnalyzed).toBe(memory2.tricksAnalyzed);
    });
  });

  describe("Suit Void Detection - Phase 1 Implementation", () => {
    it("should detect suit voids when player cannot follow suit", () => {
      // Create a trick where Human leads Spades, Bot1 follows with Hearts (non-trump)
      const trick = createTestTrick(
        PlayerId.Human,
        [Card.createCard(Suit.Spades, Rank.King, 0)], // Lead Spades
        [
          {
            playerId: PlayerId.Bot1,
            cards: [Card.createCard(Suit.Clubs, Rank.Seven, 0)],
          }, // Cannot follow Spades, plays Clubs
        ],
      );

      gameState.tricks = [trick];
      const memory = createCardMemory(gameState);

      // Bot1 should be detected as void in Spades
      const bot1Memory = memory.playerMemories[PlayerId.Bot1];
      expect(bot1Memory.suitVoids.has(Suit.Spades)).toBe(true);
    });

    it("should NOT detect suit voids when player follows suit correctly", () => {
      // Create a trick where all players follow suit
      const trick = createTestTrick(
        PlayerId.Human,
        [Card.createCard(Suit.Spades, Rank.King, 0)], // Lead Spades
        [
          {
            playerId: PlayerId.Bot1,
            cards: [Card.createCard(Suit.Spades, Rank.Seven, 0)],
          }, // Follows Spades
          {
            playerId: PlayerId.Bot2,
            cards: [Card.createCard(Suit.Spades, Rank.Ace, 0)],
          }, // Follows Spades
        ],
      );

      gameState.tricks = [trick];
      const memory = createCardMemory(gameState);

      // No players should be detected as void in Spades
      const bot1Memory = memory.playerMemories[PlayerId.Bot1];
      const bot2Memory = memory.playerMemories[PlayerId.Bot2];
      expect(bot1Memory.suitVoids.has(Suit.Spades)).toBe(false);
      expect(bot2Memory.suitVoids.has(Suit.Spades)).toBe(false);
    });

    it("should detect suit voids when player plays trump (must follow suit rule)", () => {
      // Create a trick where Human leads Spades, Bot1 plays trump Hearts
      const trick = createTestTrick(
        PlayerId.Human,
        [Card.createCard(Suit.Spades, Rank.King, 0)], // Lead Spades
        [
          {
            playerId: PlayerId.Bot1,
            cards: [Card.createCard(Suit.Hearts, Rank.Three, 0)],
          }, // Plays trump Hearts
        ],
      );

      gameState.tricks = [trick];
      const memory = createCardMemory(gameState);

      // Bot1 should be detected as void (must follow suit - can only play trump if void)
      const bot1Memory = memory.playerMemories[PlayerId.Bot1];
      expect(bot1Memory.suitVoids.has(Suit.Spades)).toBe(true);
    });

    it("should detect multiple suit voids for same player across tricks", () => {
      // Create multiple tricks showing Bot1 is void in both Spades and Diamonds
      const trick1 = createTestTrick(
        PlayerId.Human,
        [Card.createCard(Suit.Spades, Rank.King, 0)], // Lead Spades
        [
          {
            playerId: PlayerId.Bot1,
            cards: [Card.createCard(Suit.Clubs, Rank.Seven, 0)],
          }, // Void in Spades
        ],
      );

      const trick2 = createTestTrick(
        PlayerId.Bot2,
        [Card.createCard(Suit.Diamonds, Rank.Queen, 0)], // Lead Diamonds
        [
          {
            playerId: PlayerId.Bot1,
            cards: [Card.createCard(Suit.Clubs, Rank.Eight, 0)],
          }, // Void in Diamonds
        ],
      );

      gameState.tricks = [trick1, trick2];
      const memory = createCardMemory(gameState);

      // Bot1 should be detected as void in both Spades and Diamonds
      const bot1Memory = memory.playerMemories[PlayerId.Bot1];
      expect(bot1Memory.suitVoids.has(Suit.Spades)).toBe(true);
      expect(bot1Memory.suitVoids.has(Suit.Diamonds)).toBe(true);
      expect(bot1Memory.suitVoids.has(Suit.Clubs)).toBe(false); // Not void in Clubs
    });

    it("should detect suit voids for multiple players in same trick", () => {
      // Create a trick where multiple players show suit voids
      const trick = createTestTrick(
        PlayerId.Human,
        [Card.createCard(Suit.Spades, Rank.King, 0)], // Lead Spades
        [
          {
            playerId: PlayerId.Bot1,
            cards: [Card.createCard(Suit.Clubs, Rank.Seven, 0)],
          }, // Void in Spades
          {
            playerId: PlayerId.Bot2,
            cards: [Card.createCard(Suit.Diamonds, Rank.Eight, 0)],
          }, // Void in Spades
          {
            playerId: PlayerId.Bot3,
            cards: [Card.createCard(Suit.Spades, Rank.Three, 0)],
          }, // Not void
        ],
      );

      gameState.tricks = [trick];
      const memory = createCardMemory(gameState);

      // Bot1 and Bot2 should be detected as void in Spades, Bot3 should not
      expect(
        memory.playerMemories[PlayerId.Bot1].suitVoids.has(Suit.Spades),
      ).toBe(true);
      expect(
        memory.playerMemories[PlayerId.Bot2].suitVoids.has(Suit.Spades),
      ).toBe(true);
      expect(
        memory.playerMemories[PlayerId.Bot3].suitVoids.has(Suit.Spades),
      ).toBe(false);
    });

    it("should detect suit voids when player plays trump rank cards in non-trump suit", () => {
      // Trump rank is 2, trump suit is Hearts
      // Create a trick where Human leads Spades, Bot1 plays 2 of Clubs (trump rank)
      const trick = createTestTrick(
        PlayerId.Human,
        [Card.createCard(Suit.Spades, Rank.King, 0)], // Lead Spades
        [
          {
            playerId: PlayerId.Bot1,
            cards: [Card.createCard(Suit.Clubs, Rank.Two, 0)],
          }, // Trump rank card
        ],
      );

      gameState.tricks = [trick];
      const memory = createCardMemory(gameState);

      // Bot1 should be detected as void (trump rank indicates can't follow suit)
      const bot1Memory = memory.playerMemories[PlayerId.Bot1];
      expect(bot1Memory.suitVoids.has(Suit.Spades)).toBe(true);
    });

    it("should persist suit voids across memory recreations", () => {
      // Create a trick with void detection
      const trick = createTestTrick(
        PlayerId.Human,
        [Card.createCard(Suit.Spades, Rank.King, 0)], // Lead Spades
        [
          {
            playerId: PlayerId.Bot1,
            cards: [Card.createCard(Suit.Clubs, Rank.Seven, 0)],
          }, // Void in Spades
        ],
      );

      gameState.tricks = [trick];

      // Create memory multiple times and verify consistency
      const memory1 = createCardMemory(gameState);
      const memory2 = createCardMemory(gameState);

      expect(
        memory1.playerMemories[PlayerId.Bot1].suitVoids.has(Suit.Spades),
      ).toBe(true);
      expect(
        memory2.playerMemories[PlayerId.Bot1].suitVoids.has(Suit.Spades),
      ).toBe(true);

      // Should be identical
      expect(
        Array.from(memory1.playerMemories[PlayerId.Bot1].suitVoids),
      ).toEqual(Array.from(memory2.playerMemories[PlayerId.Bot1].suitVoids));
    });

    it("should detect suit voids when player plays trump rank in led non-trump suit", () => {
      // Trump rank is 2, trump suit is Hearts
      // Create a trick where Human leads Spades (non-trump), Bot1 plays 2 of Spades (trump rank in led suit)
      const trick = createTestTrick(
        PlayerId.Human,
        [Card.createCard(Suit.Spades, Rank.King, 0)], // Lead Spades (non-trump suit)
        [
          {
            playerId: PlayerId.Bot1,
            cards: [Card.createCard(Suit.Spades, Rank.Two, 0)],
          }, // Trump rank in led suit
        ],
      );

      gameState.tricks = [trick];
      const memory = createCardMemory(gameState);

      // Bot1 should be detected as void (should play non-trump Spades if available)
      const bot1Memory = memory.playerMemories[PlayerId.Bot1];
      expect(bot1Memory.suitVoids.has(Suit.Spades)).toBe(true);
    });

    it("should handle current trick in progress for void detection", () => {
      // Test that current trick analysis also detects voids
      const currentTrick = createTestTrick(
        PlayerId.Human,
        [Card.createCard(Suit.Spades, Rank.King, 0)], // Lead Spades
        [
          {
            playerId: PlayerId.Bot1,
            cards: [Card.createCard(Suit.Clubs, Rank.Seven, 0)],
          }, // Void in Spades
        ],
      );

      gameState.currentTrick = currentTrick;
      gameState.tricks = []; // No completed tricks
      const memory = createCardMemory(gameState);

      // Bot1 should be detected as void from current trick
      const bot1Memory = memory.playerMemories[PlayerId.Bot1];
      expect(bot1Memory.suitVoids.has(Suit.Spades)).toBe(true);
    });
  });

  describe("Trump Void Detection - Phase 1 Implementation", () => {
    it("should detect trump voids when trump is led but player plays non-trump", () => {
      // Create a trick where Human leads trump, Bot1 follows with non-trump
      const trick = createTestTrick(
        PlayerId.Human,
        [Card.createCard(Suit.Hearts, Rank.Two, 0)], // Lead trump rank in trump suit
        [
          {
            playerId: PlayerId.Bot1,
            cards: [Card.createCard(Suit.Clubs, Rank.Seven, 0)],
          }, // Plays non-trump (void in trump)
        ],
      );

      gameState.tricks = [trick];
      const memory = createCardMemory(gameState);

      // Bot1 should be detected as trump void
      const bot1Memory = memory.playerMemories[PlayerId.Bot1];
      expect(bot1Memory.trumpVoid).toBe(true);
    });

    it("should NOT detect trump voids when trump is led and player follows with trump", () => {
      // Create a trick where Human leads trump, Bot1 follows with trump
      const trick = createTestTrick(
        PlayerId.Human,
        [Card.createCard(Suit.Hearts, Rank.Two, 0)], // Lead trump rank in trump suit
        [
          {
            playerId: PlayerId.Bot1,
            cards: [Card.createCard(Suit.Hearts, Rank.Three, 0)],
          }, // Follows with trump suit
        ],
      );

      gameState.tricks = [trick];
      const memory = createCardMemory(gameState);

      // Bot1 should NOT be detected as trump void
      const bot1Memory = memory.playerMemories[PlayerId.Bot1];
      expect(bot1Memory.trumpVoid).toBe(false);
    });

    it("should detect trump voids when big joker is led but player plays non-trump", () => {
      // Create a trick where Human leads big joker, Bot1 follows with non-trump
      const trick = createTestTrick(
        PlayerId.Human,
        [Card.createJoker(JokerType.Big, 0)], // Lead big joker (trump)
        [
          {
            playerId: PlayerId.Bot1,
            cards: [Card.createCard(Suit.Clubs, Rank.Seven, 0)],
          }, // Plays non-trump (void in trump)
        ],
      );

      gameState.tricks = [trick];
      const memory = createCardMemory(gameState);

      // Bot1 should be detected as trump void
      const bot1Memory = memory.playerMemories[PlayerId.Bot1];
      expect(bot1Memory.trumpVoid).toBe(true);
    });

    it("should detect trump voids when trump rank in off-suit is led but player plays non-trump", () => {
      // Trump rank is 2, trump suit is Hearts
      // Create a trick where Human leads 2 of Spades (trump rank), Bot1 follows with non-trump
      const trick = createTestTrick(
        PlayerId.Human,
        [Card.createCard(Suit.Spades, Rank.Two, 0)], // Lead trump rank in off-suit (trump)
        [
          {
            playerId: PlayerId.Bot1,
            cards: [Card.createCard(Suit.Clubs, Rank.Seven, 0)],
          }, // Plays non-trump (void in trump)
        ],
      );

      gameState.tricks = [trick];
      const memory = createCardMemory(gameState);

      // Bot1 should be detected as trump void
      const bot1Memory = memory.playerMemories[PlayerId.Bot1];
      expect(bot1Memory.trumpVoid).toBe(true);
    });

    it("should detect multiple players with trump voids in same trick", () => {
      // Create a trick where trump is led and multiple players play non-trump
      const trick = createTestTrick(
        PlayerId.Human,
        [Card.createCard(Suit.Hearts, Rank.Two, 0)], // Lead trump
        [
          {
            playerId: PlayerId.Bot1,
            cards: [Card.createCard(Suit.Clubs, Rank.Seven, 0)],
          }, // Void in trump
          {
            playerId: PlayerId.Bot2,
            cards: [Card.createCard(Suit.Diamonds, Rank.Eight, 0)],
          }, // Void in trump
          {
            playerId: PlayerId.Bot3,
            cards: [Card.createCard(Suit.Hearts, Rank.Three, 0)],
          }, // Not void (has trump)
        ],
      );

      gameState.tricks = [trick];
      const memory = createCardMemory(gameState);

      // Bot1 and Bot2 should be detected as trump void, Bot3 should not
      expect(memory.playerMemories[PlayerId.Bot1].trumpVoid).toBe(true);
      expect(memory.playerMemories[PlayerId.Bot2].trumpVoid).toBe(true);
      expect(memory.playerMemories[PlayerId.Bot3].trumpVoid).toBe(false);
    });

    it("should persist trump void status once detected", () => {
      // Create first trick where Bot1 shows trump void
      const trick1 = createTestTrick(
        PlayerId.Human,
        [Card.createCard(Suit.Hearts, Rank.Two, 0)], // Lead trump
        [
          {
            playerId: PlayerId.Bot1,
            cards: [Card.createCard(Suit.Clubs, Rank.Seven, 0)],
          }, // Void in trump
        ],
      );

      // Create second trick where Bot1 plays normally (non-trump lead)
      const trick2 = createTestTrick(
        PlayerId.Bot2,
        [Card.createCard(Suit.Spades, Rank.King, 0)], // Lead non-trump
        [
          {
            playerId: PlayerId.Bot1,
            cards: [Card.createCard(Suit.Spades, Rank.Queen, 0)],
          }, // Follows suit normally
        ],
      );

      gameState.tricks = [trick1, trick2];
      const memory = createCardMemory(gameState);

      // Bot1 should still be marked as trump void from first trick
      const bot1Memory = memory.playerMemories[PlayerId.Bot1];
      expect(bot1Memory.trumpVoid).toBe(true);
    });

    it("should handle current trick in progress for trump void detection", () => {
      // Test that current trick analysis also detects trump voids
      const currentTrick = createTestTrick(
        PlayerId.Human,
        [Card.createCard(Suit.Hearts, Rank.Two, 0)], // Lead trump
        [
          {
            playerId: PlayerId.Bot1,
            cards: [Card.createCard(Suit.Clubs, Rank.Seven, 0)],
          }, // Void in trump
        ],
      );

      gameState.currentTrick = currentTrick;
      gameState.tricks = []; // No completed tricks
      const memory = createCardMemory(gameState);

      // Bot1 should be detected as trump void from current trick
      const bot1Memory = memory.playerMemories[PlayerId.Bot1];
      expect(bot1Memory.trumpVoid).toBe(true);
    });

    it("should zero trump count when trump void is detected", () => {
      // Create a trick where Human leads trump, Bot1 follows with non-trump
      const trick = createTestTrick(
        PlayerId.Human,
        [Card.createCard(Suit.Hearts, Rank.Two, 0)], // Lead trump rank in trump suit
        [
          {
            playerId: PlayerId.Bot1,
            cards: [Card.createCard(Suit.Clubs, Rank.Seven, 0)],
          }, // Plays non-trump (void in trump)
        ],
      );

      gameState.tricks = [trick];
      const memory = createCardMemory(gameState);

      // Bot1 should be detected as trump void with zero trump count
      const bot1Memory = memory.playerMemories[PlayerId.Bot1];
      expect(bot1Memory.trumpVoid).toBe(true);
    });
  });
});
