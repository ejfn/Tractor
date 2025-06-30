import {
  analyze2ndPlayerMemoryContext,
  analyze3rdPlayerMemoryContext,
  analyze4thPlayerMemoryContext,
  analyzeTrumpDistribution,
  calculateTrumpDeploymentTiming,
  createCardMemory,
  getTrumpExhaustionLevel,
} from "../../src/ai/aiCardMemory";
import { calculateMemoryEnhanced3rdPlayerRisk } from "../../src/ai/following/thirdPlayerRiskAnalysis";
import {
  Card,
  CardMemory,
  GameContext,
  GameState,
  PlayerId,
  PlayStyle,
  PointPressure,
  Rank,
  Suit,
  TrickPosition,
  TrumpInfo,
} from "../../src/types";
import { createTestCardsGameState } from "../helpers/gameStates";

describe("Phase 3: Memory Enhancement System", () => {
  let gameState: GameState;
  let trumpInfo: TrumpInfo;
  let cardMemory: CardMemory;

  beforeEach(() => {
    gameState = createTestCardsGameState();
    trumpInfo = {
      trumpRank: Rank.Two,
      trumpSuit: Suit.Hearts,
    };
    gameState.trumpInfo = trumpInfo;
    cardMemory = createCardMemory(gameState);
  });

  describe("Trump Exhaustion Tracking", () => {
    it("should calculate trump exhaustion level correctly", () => {
      const exhaustionLevel = getTrumpExhaustionLevel(
        cardMemory,
        PlayerId.Human,
        trumpInfo,
      );

      expect(exhaustionLevel).toBeGreaterThanOrEqual(0);
      expect(exhaustionLevel).toBeLessThanOrEqual(1);
    });

    it("should analyze trump distribution across all players", () => {
      const analysis = analyzeTrumpDistribution(cardMemory, trumpInfo);

      expect(analysis.globalTrumpExhaustion).toBeGreaterThanOrEqual(0);
      expect(analysis.globalTrumpExhaustion).toBeLessThanOrEqual(1);
      expect(Object.keys(analysis.playerExhaustion)).toHaveLength(4);
      expect(analysis.voidPlayers).toBeInstanceOf(Array);
    });

    it("should calculate trump deployment timing recommendations", () => {
      const timing = calculateTrumpDeploymentTiming(
        cardMemory,
        PlayerId.Human,
        trumpInfo,
      );

      expect(["never", "critical", "strategic", "aggressive"]).toContain(
        timing.recommendedDeployment,
      );
      expect(timing.trumpAdvantage).toBeGreaterThanOrEqual(0);
      expect(timing.reasoning).toBeDefined();
      expect(typeof timing.shouldConserveTrump).toBe("boolean");
    });
  });

  describe("Position-Specific Memory Analysis", () => {
    const leadingCards = [Card.createCard(Suit.Diamonds, Rank.King, 0)];

    it("should analyze 2nd player memory context", () => {
      const analysis = analyze2ndPlayerMemoryContext(
        cardMemory,
        leadingCards,
        trumpInfo,
        PlayerId.Human,
      );

      expect(analysis.opponentVoidProbabilities).toBeDefined();
      expect(typeof analysis.trumpExhaustionAdvantage).toBe("number");
      expect(["low", "moderate", "high"]).toContain(
        analysis.recommendedInfluenceLevel,
      );
      expect(["support", "pressure", "block", "setup"]).toContain(
        analysis.optimalResponseStrategy,
      );
      expect(analysis.reasoning).toBeDefined();
    });

    it("should analyze 3rd player memory context", () => {
      const secondPlayerCards = [Card.createCard(Suit.Diamonds, Rank.Ace, 0)];

      const analysis = analyze3rdPlayerMemoryContext(
        cardMemory,
        leadingCards,
        secondPlayerCards,
        trumpInfo,
        PlayerId.Human,
      );

      expect(analysis.finalPlayerPrediction).toBeDefined();
      expect(analysis.finalPlayerPrediction.playerId).toBeDefined();
      expect(typeof analysis.finalPlayerPrediction.likelyVoid).toBe("boolean");
      expect(typeof analysis.finalPlayerPrediction.trumpAdvantage).toBe(
        "number",
      );
      expect(["weak", "moderate", "strong"]).toContain(
        analysis.finalPlayerPrediction.predictedResponse,
      );

      expect(typeof analysis.optimalTakeoverOpportunity).toBe("boolean");
      expect(analysis.riskAssessment).toBeGreaterThanOrEqual(0);
      expect(analysis.riskAssessment).toBeLessThanOrEqual(1);
      expect(["support", "takeover", "conservative", "strategic"]).toContain(
        analysis.recommendedAction,
      );
    });

    it("should analyze 4th player memory context", () => {
      const allPlayedCards = [
        Card.createCard(Suit.Diamonds, Rank.King, 0),
        Card.createCard(Suit.Diamonds, Rank.Ace, 0),
        Card.createCard(Suit.Hearts, Rank.Two, 0), // Trump
      ];

      const analysis = analyze4thPlayerMemoryContext(
        cardMemory,
        allPlayedCards,
        trumpInfo,
        PlayerId.Human,
        15, // High point trick
      );

      expect(["win", "lose", "minimize", "contribute"]).toContain(
        analysis.optimalDecision,
      );
      expect(analysis.confidenceLevel).toBeGreaterThanOrEqual(0);
      expect(analysis.confidenceLevel).toBeLessThanOrEqual(1);
      expect(typeof analysis.futureRoundAdvantage).toBe("number");
      expect(analysis.pointOptimization).toBeDefined();
      expect(analysis.pointOptimization.maxContribution).toBeGreaterThanOrEqual(
        0,
      );
      expect(analysis.reasoning).toBeDefined();
    });
  });

  describe("Enhanced Risk Assessment", () => {
    it("should calculate memory-enhanced 3rd player risk", () => {
      const leadingCards = [Card.createCard(Suit.Diamonds, Rank.King, 0)];
      const secondPlayerCards = [Card.createCard(Suit.Diamonds, Rank.Ace, 0)];

      const context: GameContext = {
        isAttackingTeam: true,
        currentPoints: 35,
        pointsNeeded: 80,
        cardsRemaining: 15,
        pointPressure: PointPressure.MEDIUM,
        playStyle: PlayStyle.Balanced,
        trickPosition: TrickPosition.Third,
        trickWinnerAnalysis: undefined,
        memoryContext: {
          cardsRemaining: 15,
          knownCards: 10,
          uncertaintyLevel: 0.3,
          trumpExhaustion: 0.4,
          opponentHandStrength: {
            bot1: 0.6,
            bot2: 0.5,
            bot3: 0.7,
          },
          cardMemory,
        },
        currentPlayer: PlayerId.Human,
      };

      const riskAnalysis = calculateMemoryEnhanced3rdPlayerRisk(
        leadingCards,
        secondPlayerCards,
        trumpInfo,
        PlayerId.Human,
        context,
      );

      expect(riskAnalysis.finalRiskAssessment).toBeGreaterThanOrEqual(0);
      expect(riskAnalysis.finalRiskAssessment).toBeLessThanOrEqual(1);
      expect(riskAnalysis.memoryFactors).toBeDefined();
      expect(riskAnalysis.memoryFactors.confidenceLevel).toBeGreaterThanOrEqual(
        0,
      );
      expect(riskAnalysis.memoryFactors.confidenceLevel).toBeLessThanOrEqual(1);
      expect(["support", "takeover", "conservative", "strategic"]).toContain(
        riskAnalysis.recommendedAction,
      );
      expect(riskAnalysis.reasoning).toBeDefined();
    });
  });

  describe("Memory System Integration", () => {
    it("should handle missing memory context gracefully", () => {
      // Test fallback behavior when memory context is not available
      expect(() => {
        getTrumpExhaustionLevel(cardMemory, PlayerId.Human, trumpInfo);
      }).not.toThrow();

      expect(() => {
        analyzeTrumpDistribution(cardMemory, trumpInfo);
      }).not.toThrow();
    });

    it("should provide consistent analysis across position functions", () => {
      const leadingCards = [Card.createCard(Suit.Diamonds, Rank.King, 0)];

      // All position analyses should succeed without errors
      expect(() => {
        analyze2ndPlayerMemoryContext(
          cardMemory,
          leadingCards,
          trumpInfo,
          PlayerId.Human,
        );
      }).not.toThrow();

      const secondPlayerCards = [Card.createCard(Suit.Diamonds, Rank.Ace, 0)];
      expect(() => {
        analyze3rdPlayerMemoryContext(
          cardMemory,
          leadingCards,
          secondPlayerCards,
          trumpInfo,
          PlayerId.Human,
        );
      }).not.toThrow();

      const allPlayedCards = [...leadingCards, ...secondPlayerCards];
      expect(() => {
        analyze4thPlayerMemoryContext(
          cardMemory,
          allPlayedCards,
          trumpInfo,
          PlayerId.Human,
          10,
        );
      }).not.toThrow();
    });
  });
});
