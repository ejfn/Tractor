import {
  analyzeTrickHistory,
  createEnhancedMemoryContext,
  enhanceGameContextWithHistoricalMemory,
} from "../../src/ai/aiCardMemory";
import {
  Card,
  GameContext,
  GameState,
  PlayerId,
  PlayStyle,
  PointPressure,
  Rank,
  Suit,
  Trick,
  TrickPosition,
  TrumpInfo,
} from "../../src/types";
import { createGameState } from "../helpers";

describe("Historical Trick Analysis", () => {
  let gameState: GameState;
  let trumpInfo: TrumpInfo;

  beforeEach(() => {
    gameState = createGameState();
    trumpInfo = { trumpRank: Rank.Two, trumpSuit: Suit.Spades };
    gameState.trumpInfo = trumpInfo;
  });

  describe("analyzeTrickHistory", () => {
    it("should handle empty trick history", () => {
      const analysis = analyzeTrickHistory([], gameState);

      expect(analysis).toBeDefined();
      expect(analysis.opponentLeadingPatterns).toBeDefined();
      expect(analysis.teamCoordinationHistory).toBeDefined();
      expect(analysis.adaptiveBehaviorTrends).toBeDefined();
      expect(analysis.roundProgression).toBeDefined();
      expect(analysis.trickSequencePatterns).toBeDefined();
    });

    it("should analyze opponent leading patterns", () => {
      const tricks: Trick[] = [
        {
          plays: [
            {
              playerId: PlayerId.Bot1,
              cards: [Card.createCard(Suit.Hearts, Rank.Ace, 0)],
            },
            {
              playerId: PlayerId.Human,
              cards: [Card.createCard(Suit.Hearts, Rank.King, 0)],
            },
            {
              playerId: PlayerId.Bot2,
              cards: [Card.createCard(Suit.Hearts, Rank.Queen, 0)],
            },
            {
              playerId: PlayerId.Bot3,
              cards: [Card.createCard(Suit.Hearts, Rank.Jack, 0)],
            },
          ],
          winningPlayerId: PlayerId.Bot1,
          points: 10,
        },
        {
          plays: [
            {
              playerId: PlayerId.Bot1,
              cards: [Card.createCard(Suit.Spades, Rank.Two, 0)],
            }, // Trump lead
            {
              playerId: PlayerId.Human,
              cards: [Card.createCard(Suit.Hearts, Rank.Ten, 0)],
            },
            {
              playerId: PlayerId.Bot2,
              cards: [Card.createCard(Suit.Hearts, Rank.Nine, 0)],
            },
            {
              playerId: PlayerId.Bot3,
              cards: [Card.createCard(Suit.Hearts, Rank.Eight, 0)],
            },
          ],
          winningPlayerId: PlayerId.Bot1,
          points: 15,
        },
      ];

      gameState.tricks = tricks;
      const analysis = analyzeTrickHistory(tricks, gameState);

      const bot1Pattern = analysis.opponentLeadingPatterns[PlayerId.Bot1];
      expect(bot1Pattern).toBeDefined();
      expect(bot1Pattern.trumpLeadFrequency).toBe(0.5); // 1 out of 2 leads was trump
      expect(bot1Pattern.pointCardLeadFrequency).toBe(0); // No point cards led
      expect(bot1Pattern.aggressivenessLevel).toBeGreaterThan(0); // Should show some aggressiveness
    });

    it("should detect team coordination patterns", () => {
      const tricks: Trick[] = [
        {
          plays: [
            {
              playerId: PlayerId.Human,
              cards: [Card.createCard(Suit.Hearts, Rank.Ace, 0)],
            },
            {
              playerId: PlayerId.Bot1,
              cards: [Card.createCard(Suit.Hearts, Rank.King, 0)],
            },
            {
              playerId: PlayerId.Bot2,
              cards: [Card.createCard(Suit.Hearts, Rank.Ten, 0)],
            }, // Teammate contributes points
            {
              playerId: PlayerId.Bot3,
              cards: [Card.createCard(Suit.Hearts, Rank.Jack, 0)],
            },
          ],
          winningPlayerId: PlayerId.Human,
          points: 10,
        },
      ];

      gameState.tricks = tricks;
      const analysis = analyzeTrickHistory(tricks, gameState);

      expect(analysis.teamCoordinationHistory).toBeDefined();
      expect(
        analysis.teamCoordinationHistory.supportFrequency,
      ).toBeGreaterThanOrEqual(0);
      expect(
        analysis.teamCoordinationHistory.cooperationLevel,
      ).toBeGreaterThanOrEqual(0);
    });

    it("should analyze round progression patterns", () => {
      const tricks: Trick[] = [
        // Early trick
        {
          plays: [
            {
              playerId: PlayerId.Bot1,
              cards: [Card.createCard(Suit.Hearts, Rank.Seven, 0)],
            }, // Safe lead
            {
              playerId: PlayerId.Human,
              cards: [Card.createCard(Suit.Hearts, Rank.Eight, 0)],
            },
            {
              playerId: PlayerId.Bot2,
              cards: [Card.createCard(Suit.Hearts, Rank.Nine, 0)],
            },
            {
              playerId: PlayerId.Bot3,
              cards: [Card.createCard(Suit.Hearts, Rank.Ten, 0)],
            },
          ],
          winningPlayerId: PlayerId.Bot3,
          points: 10,
        },
        // Mid trick
        {
          plays: [
            {
              playerId: PlayerId.Bot2,
              cards: [Card.createCard(Suit.Diamonds, Rank.King, 0)],
            }, // Point lead
            {
              playerId: PlayerId.Bot3,
              cards: [Card.createCard(Suit.Diamonds, Rank.Ace, 0)],
            },
            {
              playerId: PlayerId.Human,
              cards: [Card.createCard(Suit.Diamonds, Rank.Queen, 0)],
            },
            {
              playerId: PlayerId.Bot1,
              cards: [Card.createCard(Suit.Diamonds, Rank.Jack, 0)],
            },
          ],
          winningPlayerId: PlayerId.Bot3,
          points: 10,
        },
        // Late trick
        {
          plays: [
            {
              playerId: PlayerId.Human,
              cards: [Card.createCard(Suit.Spades, Rank.Two, 0)],
            }, // Trump lead (aggressive endgame)
            {
              playerId: PlayerId.Bot1,
              cards: [Card.createCard(Suit.Hearts, Rank.Three, 0)],
            },
            {
              playerId: PlayerId.Bot2,
              cards: [Card.createCard(Suit.Hearts, Rank.Four, 0)],
            },
            {
              playerId: PlayerId.Bot3,
              cards: [Card.createCard(Suit.Hearts, Rank.Five, 0)],
            },
          ],
          winningPlayerId: PlayerId.Human,
          points: 5,
        },
      ];

      gameState.tricks = tricks;
      const analysis = analyzeTrickHistory(tricks, gameState);

      expect(analysis.roundProgression).toBeDefined();
      expect(analysis.roundProgression.earlyRoundBehavior).toBeDefined();
      expect(analysis.roundProgression.midRoundBehavior).toBeDefined();
      expect(analysis.roundProgression.endgameBehavior).toBeDefined();
      expect(analysis.roundProgression.consistencyScore).toBeGreaterThanOrEqual(
        0,
      );
      expect(analysis.roundProgression.consistencyScore).toBeLessThanOrEqual(1);
    });

    it("should identify trick sequence patterns", () => {
      const tricks: Trick[] = [
        // Low-value setup trick
        {
          plays: [
            {
              playerId: PlayerId.Human,
              cards: [Card.createCard(Suit.Hearts, Rank.Seven, 0)],
            },
            {
              playerId: PlayerId.Bot1,
              cards: [Card.createCard(Suit.Hearts, Rank.Eight, 0)],
            },
            {
              playerId: PlayerId.Bot2,
              cards: [Card.createCard(Suit.Hearts, Rank.Nine, 0)],
            }, // Teammate wins
            {
              playerId: PlayerId.Bot3,
              cards: [Card.createCard(Suit.Hearts, Rank.Six, 0)],
            },
          ],
          winningPlayerId: PlayerId.Bot2, // Human's teammate
          points: 0,
        },
        // Follow-up trick where teammate leads
        {
          plays: [
            {
              playerId: PlayerId.Bot2,
              cards: [Card.createCard(Suit.Diamonds, Rank.Ace, 0)],
            }, // Teammate from previous trick
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
              cards: [Card.createCard(Suit.Diamonds, Rank.Jack, 0)],
            },
          ],
          winningPlayerId: PlayerId.Bot2,
          points: 20,
        },
      ];

      gameState.tricks = tricks;
      const analysis = analyzeTrickHistory(tricks, gameState);

      expect(analysis.trickSequencePatterns).toBeDefined();
      expect(Array.isArray(analysis.trickSequencePatterns)).toBe(true);
    });
  });

  describe("createEnhancedMemoryContext", () => {
    it("should create enhanced context with historical analysis", () => {
      const tricks: Trick[] = [
        {
          plays: [
            {
              playerId: PlayerId.Bot1,
              cards: [Card.createCard(Suit.Hearts, Rank.Ace, 0)],
            },
            {
              playerId: PlayerId.Human,
              cards: [Card.createCard(Suit.Hearts, Rank.King, 0)],
            },
            {
              playerId: PlayerId.Bot2,
              cards: [Card.createCard(Suit.Hearts, Rank.Queen, 0)],
            },
            {
              playerId: PlayerId.Bot3,
              cards: [Card.createCard(Suit.Hearts, Rank.Jack, 0)],
            },
          ],
          winningPlayerId: PlayerId.Bot1,
          points: 0,
        },
      ];

      gameState.tricks = tricks;
      const mockMemory = {
        playedCards: [],
        trumpCardsPlayed: 0,
        pointCardsPlayed: 0,
        suitDistribution: {},
        playerMemories: {},
        cardProbabilities: [],
        roundStartCards: 25,
        tricksAnalyzed: 1,
      };

      const enhancedContext = createEnhancedMemoryContext(
        mockMemory,
        gameState,
      );

      expect(enhancedContext).toBeDefined();
      expect(enhancedContext.trickHistory).toBeDefined();
      expect(enhancedContext.predictiveModeling).toBeDefined();
      expect(enhancedContext.adaptiveStrategy).toBeDefined();
      expect(enhancedContext.cardsRemaining).toBeDefined();
      expect(enhancedContext.knownCards).toBeDefined();
    });

    it("should generate predictive models for all players", () => {
      const tricks: Trick[] = [
        {
          plays: [
            {
              playerId: PlayerId.Bot1,
              cards: [Card.createCard(Suit.Hearts, Rank.Ace, 0)],
            },
            {
              playerId: PlayerId.Human,
              cards: [Card.createCard(Suit.Hearts, Rank.King, 0)],
            },
            {
              playerId: PlayerId.Bot2,
              cards: [Card.createCard(Suit.Hearts, Rank.Queen, 0)],
            },
            {
              playerId: PlayerId.Bot3,
              cards: [Card.createCard(Suit.Hearts, Rank.Jack, 0)],
            },
          ],
          winningPlayerId: PlayerId.Bot1,
          points: 0,
        },
      ];

      gameState.tricks = tricks;
      const mockMemory = {
        playedCards: [],
        trumpCardsPlayed: 0,
        pointCardsPlayed: 0,
        suitDistribution: {},
        playerMemories: {},
        cardProbabilities: [],
        roundStartCards: 25,
        tricksAnalyzed: 1,
      };

      const enhancedContext = createEnhancedMemoryContext(
        mockMemory,
        gameState,
      );

      expect(enhancedContext.predictiveModeling).toBeDefined();
      expect(Array.isArray(enhancedContext.predictiveModeling)).toBe(true);

      // Should have models for players who have leading patterns
      if ((enhancedContext.predictiveModeling ?? []).length > 0) {
        const model = (enhancedContext.predictiveModeling ?? [])[0];
        expect(model.playerId).toBeDefined();
        expect(model.nextMoveAnalysis).toBeDefined();
        expect(model.handStrengthEstimate).toBeDefined();
        expect(model.strategicIntent).toBeDefined();
        expect(model.reliability).toBeGreaterThanOrEqual(0);
        expect(model.reliability).toBeLessThanOrEqual(1);
      }
    });

    it("should provide adaptive strategy recommendations", () => {
      const tricks: Trick[] = [
        {
          plays: [
            {
              playerId: PlayerId.Bot1,
              cards: [Card.createCard(Suit.Spades, Rank.Two, 0)],
            }, // Aggressive trump lead
            {
              playerId: PlayerId.Human,
              cards: [Card.createCard(Suit.Hearts, Rank.King, 0)],
            },
            {
              playerId: PlayerId.Bot2,
              cards: [Card.createCard(Suit.Hearts, Rank.Queen, 0)],
            },
            {
              playerId: PlayerId.Bot3,
              cards: [Card.createCard(Suit.Hearts, Rank.Jack, 0)],
            },
          ],
          winningPlayerId: PlayerId.Bot1,
          points: 0,
        },
      ];

      gameState.tricks = tricks;
      const mockMemory = {
        playedCards: [],
        trumpCardsPlayed: 1,
        pointCardsPlayed: 0,
        suitDistribution: {},
        playerMemories: {},
        cardProbabilities: [],
        roundStartCards: 25,
        tricksAnalyzed: 1,
      };

      const enhancedContext = createEnhancedMemoryContext(
        mockMemory,
        gameState,
      );

      expect(enhancedContext.adaptiveStrategy).toBeDefined();
      expect(
        enhancedContext.adaptiveStrategy?.recommendedApproach,
      ).toBeDefined();
      expect(
        enhancedContext.adaptiveStrategy?.confidenceLevel,
      ).toBeGreaterThanOrEqual(0);
      expect(
        enhancedContext.adaptiveStrategy?.confidenceLevel,
      ).toBeLessThanOrEqual(1);
      expect(enhancedContext.adaptiveStrategy?.expectedOutcome).toBeDefined();
    });
  });

  describe("enhanceGameContextWithHistoricalMemory", () => {
    it("should enhance context while preserving base properties", () => {
      const baseContext: GameContext = {
        isAttackingTeam: true,
        currentPoints: 40,
        pointsNeeded: 80,
        cardsRemaining: 20,
        trickPosition: TrickPosition.First,
        pointPressure: PointPressure.MEDIUM,
        playStyle: PlayStyle.Balanced,
      };

      const tricks: Trick[] = [
        {
          plays: [
            {
              playerId: PlayerId.Bot1,
              cards: [Card.createCard(Suit.Hearts, Rank.Ace, 0)],
            },
            {
              playerId: PlayerId.Human,
              cards: [Card.createCard(Suit.Hearts, Rank.King, 0)],
            },
            {
              playerId: PlayerId.Bot2,
              cards: [Card.createCard(Suit.Hearts, Rank.Queen, 0)],
            },
            {
              playerId: PlayerId.Bot3,
              cards: [Card.createCard(Suit.Hearts, Rank.Jack, 0)],
            },
          ],
          winningPlayerId: PlayerId.Bot1,
          points: 0,
        },
      ];

      gameState.tricks = tricks;
      const mockMemory = {
        playedCards: [],
        trumpCardsPlayed: 0,
        pointCardsPlayed: 0,
        suitDistribution: {},
        playerMemories: {},
        cardProbabilities: [],
        roundStartCards: 25,
        tricksAnalyzed: 1,
      };

      const enhancedContext = enhanceGameContextWithHistoricalMemory(
        baseContext,
        mockMemory,
        gameState,
      );

      // Should add enhanced memory context with historical analysis
      expect(enhancedContext.memoryContext).toBeDefined();
    });
  });

  describe("Edge Cases", () => {
    it("should handle single trick history", () => {
      const tricks: Trick[] = [
        {
          plays: [
            {
              playerId: PlayerId.Human,
              cards: [Card.createCard(Suit.Hearts, Rank.Ace, 0)],
            },
            {
              playerId: PlayerId.Bot1,
              cards: [Card.createCard(Suit.Hearts, Rank.King, 0)],
            },
            {
              playerId: PlayerId.Bot2,
              cards: [Card.createCard(Suit.Hearts, Rank.Queen, 0)],
            },
            {
              playerId: PlayerId.Bot3,
              cards: [Card.createCard(Suit.Hearts, Rank.Jack, 0)],
            },
          ],
          winningPlayerId: PlayerId.Human,
          points: 0,
        },
      ];

      gameState.tricks = tricks;
      const analysis = analyzeTrickHistory(tricks, gameState);

      expect(analysis).toBeDefined();
      expect(
        analysis.adaptiveBehaviorTrends.behaviorConsistency,
      ).toBeGreaterThanOrEqual(0);
    });

    it("should handle tricks with no points", () => {
      const tricks: Trick[] = [
        {
          plays: [
            {
              playerId: PlayerId.Bot1,
              cards: [Card.createCard(Suit.Hearts, Rank.Seven, 0)],
            },
            {
              playerId: PlayerId.Human,
              cards: [Card.createCard(Suit.Hearts, Rank.Eight, 0)],
            },
            {
              playerId: PlayerId.Bot2,
              cards: [Card.createCard(Suit.Hearts, Rank.Nine, 0)],
            },
            {
              playerId: PlayerId.Bot3,
              cards: [Card.createCard(Suit.Hearts, Rank.Six, 0)],
            },
          ],
          winningPlayerId: PlayerId.Bot2,
          points: 0,
        },
      ];

      gameState.tricks = tricks;
      const analysis = analyzeTrickHistory(tricks, gameState);

      expect(
        analysis.teamCoordinationHistory.cooperationLevel,
      ).toBeGreaterThanOrEqual(0);
      expect(
        analysis.teamCoordinationHistory.cooperationLevel,
      ).toBeLessThanOrEqual(1);
    });

    it("should handle players with no leading history", () => {
      const tricks: Trick[] = [
        {
          plays: [
            {
              playerId: PlayerId.Bot1,
              cards: [Card.createCard(Suit.Hearts, Rank.Ace, 0)],
            },
            {
              playerId: PlayerId.Human,
              cards: [Card.createCard(Suit.Hearts, Rank.King, 0)],
            },
            {
              playerId: PlayerId.Bot2,
              cards: [Card.createCard(Suit.Hearts, Rank.Queen, 0)],
            },
            {
              playerId: PlayerId.Bot3,
              cards: [Card.createCard(Suit.Hearts, Rank.Jack, 0)],
            },
          ],
          winningPlayerId: PlayerId.Bot1,
          points: 0,
        },
      ];

      gameState.tricks = tricks;
      const analysis = analyzeTrickHistory(tricks, gameState);

      // Bot2 and Bot3 never led, should have default patterns
      const bot2Pattern = analysis.opponentLeadingPatterns[PlayerId.Bot2];
      const bot3Pattern = analysis.opponentLeadingPatterns[PlayerId.Bot3];

      expect(bot2Pattern).toBeDefined();
      expect(bot3Pattern).toBeDefined();
      expect(bot2Pattern.trumpLeadFrequency).toBe(0.3); // Default value
      expect(bot3Pattern.aggressivenessLevel).toBe(0.5); // Default value
    });
  });
});
