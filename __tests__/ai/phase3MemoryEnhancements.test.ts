import {
  analyze2ndPlayerMemoryContext,
  analyze3rdPlayerMemoryContext,
  analyzeTrumpDistribution,
  calculateTrumpDeploymentTiming,
  createCardMemory,
  getTrumpExhaustionLevel,
} from "../../src/ai/aiCardMemory";
import {
  Card,
  CardMemory,
  GameState,
  PlayerId,
  Rank,
  Suit,
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

      // Fourth player memory analysis function has been removed as it was unused
    });
  });
});
