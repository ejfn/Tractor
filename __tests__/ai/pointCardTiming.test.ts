import { describe, it, expect, beforeEach } from "@jest/globals";
import { analyzePointCardTiming } from "../../src/ai/analysis/pointCardTiming";
import { createCardMemory } from "../../src/ai/aiCardMemory";
import { createGameContext } from "../../src/ai/aiGameContext";
import { initializeGame } from "../../src/utils/gameInitialization";
import { Card } from "../../src/types/card";
import {
  GameState,
  PlayerId,
  Suit,
  Rank,
  TrickPosition,
  ComboType,
} from "../../src/types";

describe("Point Card Timing Optimization", () => {
  let gameState: GameState;

  beforeEach(() => {
    gameState = initializeGame();
  });

  describe("Point Timing Analysis", () => {
    it("should identify immediate point opportunities", () => {
      const cardMemory = createCardMemory(gameState);

      // Set up scenario with guaranteed point winner
      gameState.players[0].hand = [
        Card.createCard(Suit.Hearts, Rank.King, 0), // Point card
        Card.createCard(Suit.Hearts, Rank.Ten, 0), // Point card
        Card.createCard(Suit.Spades, Rank.Ace, 0),
      ];

      // Simulate that both Aces of Hearts have been played
      cardMemory.playedCards.push(
        Card.createCard(Suit.Hearts, Rank.Ace, 0),
        Card.createCard(Suit.Hearts, Rank.Ace, 1),
      );

      const context = createGameContext(gameState, PlayerId.Human);
      context.trickPosition = TrickPosition.First;
      context.currentPlayer = PlayerId.Human;
      if (context.memoryContext) {
        context.memoryContext.cardMemory = cardMemory;
      }

      const validCombos = [
        {
          cards: [Card.createCard(Suit.Hearts, Rank.King, 0)],
          type: ComboType.Single,
          value: 25,
          isBreakingPair: false,
        },
        {
          cards: [Card.createCard(Suit.Hearts, Rank.Ten, 0)],
          type: ComboType.Single,
          value: 20,
          isBreakingPair: false,
        },
      ];

      const pointAnalysis = analyzePointCardTiming(
        cardMemory,
        gameState,
        context,
        gameState.trumpInfo,
        PlayerId.Human,
        validCombos,
      );

      expect(pointAnalysis.immediatePointOpportunities.length).toBeGreaterThan(
        0,
      );
      expect(pointAnalysis.guaranteedPointPlays.length).toBeGreaterThan(0);
      expect(pointAnalysis.memoryBasedPointPriority).toBeGreaterThan(0.5);
    });

    it("should calculate point remaining analysis correctly", () => {
      const cardMemory = createCardMemory(gameState);

      // Simulate some points already played
      cardMemory.playedCards.push(
        Card.createCard(Suit.Hearts, Rank.King, 0), // 10 points
        Card.createCard(Suit.Spades, Rank.King, 0), // 10 points
        Card.createCard(Suit.Clubs, Rank.Ten, 0), // 10 points
        Card.createCard(Suit.Diamonds, Rank.Ten, 0), // 10 points
      );

      const context = createGameContext(gameState, PlayerId.Human);
      context.currentPlayer = PlayerId.Human;
      if (context.memoryContext) {
        context.memoryContext.cardMemory = cardMemory;
      }

      const validCombos = [
        {
          cards: [Card.createCard(Suit.Hearts, Rank.Five, 0)],
          type: ComboType.Single,
          value: 15,
          isBreakingPair: false,
        },
      ];

      const pointAnalysis = analyzePointCardTiming(
        cardMemory,
        gameState,
        context,
        gameState.trumpInfo,
        PlayerId.Human,
        validCombos,
      );

      expect(
        pointAnalysis.pointCardRemainingAnalysis.totalPointsRemaining,
      ).toBe(160);
      expect(
        pointAnalysis.pointCardRemainingAnalysis.pointsByType.kings.remaining,
      ).toBe(6);
      expect(
        pointAnalysis.pointCardRemainingAnalysis.pointsByType.tens.remaining,
      ).toBe(6);
    });

    it("should provide optimal point sequence recommendations", () => {
      const cardMemory = createCardMemory(gameState);

      // Set up hand with multiple point cards
      gameState.players[0].hand = [
        Card.createCard(Suit.Hearts, Rank.King, 0), // 10 points
        Card.createCard(Suit.Hearts, Rank.Ten, 0), // 10 points
        Card.createCard(Suit.Hearts, Rank.Five, 0), // 5 points
        Card.createCard(Suit.Spades, Rank.Ace, 0),
      ];

      const context = createGameContext(gameState, PlayerId.Human);
      context.currentPlayer = PlayerId.Human;
      if (context.memoryContext) {
        context.memoryContext.cardMemory = cardMemory;
      }

      const validCombos = [
        {
          cards: [Card.createCard(Suit.Hearts, Rank.King, 0)],
          type: ComboType.Single,
          value: 25,
          isBreakingPair: false,
        },
        {
          cards: [Card.createCard(Suit.Hearts, Rank.Ten, 0)],
          type: ComboType.Single,
          value: 20,
          isBreakingPair: false,
        },
        {
          cards: [Card.createCard(Suit.Hearts, Rank.Five, 0)],
          type: ComboType.Single,
          value: 15,
          isBreakingPair: false,
        },
      ];

      const pointAnalysis = analyzePointCardTiming(
        cardMemory,
        gameState,
        context,
        gameState.trumpInfo,
        PlayerId.Human,
        validCombos,
      );

      expect(pointAnalysis.optimalPointSequence.length).toBeGreaterThan(0);

      if (pointAnalysis.optimalPointSequence.length > 0) {
        const sequence = pointAnalysis.optimalPointSequence[0];
        expect(sequence.totalExpectedPoints).toBeGreaterThan(0);
        expect(sequence.successProbability).toBeGreaterThan(0);
        expect(sequence.sequence.length).toBeGreaterThan(0);
      }
    });

    it("should assess point collection risks appropriately", () => {
      const cardMemory = createCardMemory(gameState);

      // Set up scenario with suit shortage risk
      gameState.players[0].hand = [
        Card.createCard(Suit.Hearts, Rank.King, 0), // Only one heart - shortage risk
        Card.createCard(Suit.Spades, Rank.Ace, 0),
        Card.createCard(Suit.Spades, Rank.Queen, 0),
        Card.createCard(Suit.Spades, Rank.Jack, 0),
      ];

      const context = createGameContext(gameState, PlayerId.Human);
      context.currentPlayer = PlayerId.Human;
      if (context.memoryContext) {
        context.memoryContext.cardMemory = cardMemory;
      }

      const validCombos = [
        {
          cards: [Card.createCard(Suit.Hearts, Rank.King, 0)],
          type: ComboType.Single,
          value: 25,
          isBreakingPair: false,
        },
      ];

      const pointAnalysis = analyzePointCardTiming(
        cardMemory,
        gameState,
        context,
        gameState.trumpInfo,
        PlayerId.Human,
        validCombos,
      );

      expect(pointAnalysis.riskAssessment.length).toBeGreaterThan(0);

      const suitShortageRisk = pointAnalysis.riskAssessment.find(
        (risk) => risk.riskType === "suit_shortage",
      );

      expect(suitShortageRisk).toBeDefined();
      expect(suitShortageRisk?.urgencyLevel).toBe("high");
      expect(
        suitShortageRisk?.affectedCards.some(
          (card) => card.suit === Suit.Hearts,
        ),
      ).toBe(true);
    });
  });

  describe("Team Coordination", () => {
    it("should identify team point coordination opportunities", () => {
      const cardMemory = createCardMemory(gameState);

      // Set up scenario with point coordination opportunity
      gameState.players[0].hand = [
        Card.createCard(Suit.Hearts, Rank.Ten, 0), // Point card to coordinate
        Card.createCard(Suit.Spades, Rank.Ace, 0),
      ];

      const context = createGameContext(gameState, PlayerId.Human);
      context.currentPlayer = PlayerId.Human;
      if (context.memoryContext) {
        context.memoryContext.cardMemory = cardMemory;
      }

      const validCombos = [
        {
          cards: [Card.createCard(Suit.Hearts, Rank.Ten, 0)],
          type: ComboType.Single,
          value: 20,
          isBreakingPair: false,
        },
      ];

      const pointAnalysis = analyzePointCardTiming(
        cardMemory,
        gameState,
        context,
        gameState.trumpInfo,
        PlayerId.Human,
        validCombos,
      );

      expect(pointAnalysis.teamPointCoordination).toBeDefined();
      expect(
        pointAnalysis.teamPointCoordination.supportStrategies.length,
      ).toBeGreaterThan(0);
      expect(
        pointAnalysis.teamPointCoordination.avoidanceStrategies.length,
      ).toBeGreaterThan(0);
    });
  });

  describe("Endgame Strategy", () => {
    it("should provide endgame point strategy recommendations", () => {
      const cardMemory = createCardMemory(gameState);

      // Simulate late game scenario
      gameState.players.forEach((player) => {
        player.hand = player.hand.slice(0, 3); // Reduce hand size to simulate endgame
      });

      const context = createGameContext(gameState, PlayerId.Human);
      context.currentPlayer = PlayerId.Human;
      if (context.memoryContext) {
        context.memoryContext.cardMemory = cardMemory;
      }

      const validCombos = [
        {
          cards: [Card.createCard(Suit.Hearts, Rank.King, 0)],
          type: ComboType.Single,
          value: 25,
          isBreakingPair: false,
        },
      ];

      const pointAnalysis = analyzePointCardTiming(
        cardMemory,
        gameState,
        context,
        gameState.trumpInfo,
        PlayerId.Human,
        validCombos,
      );

      expect(pointAnalysis.endgamePointStrategy).toBeDefined();
      expect(
        pointAnalysis.endgamePointStrategy.finalTrickImportance,
      ).toBeGreaterThan(0);
      expect(
        pointAnalysis.endgamePointStrategy.kittyBonusConsideration,
      ).toBeGreaterThan(0);
      expect(
        pointAnalysis.endgamePointStrategy.recommendedEndgameSequence.length,
      ).toBeGreaterThan(0);
    });
  });

  describe("Memory-Based Priority Calculation", () => {
    it("should calculate appropriate memory-based priority scores", () => {
      const cardMemory = createCardMemory(gameState);

      // Set up high-priority scenario
      gameState.players[0].hand = [
        Card.createCard(Suit.Hearts, Rank.King, 0),
        Card.createCard(Suit.Hearts, Rank.Ten, 0),
      ];

      // Simulate that higher cards have been played
      cardMemory.playedCards.push(
        Card.createCard(Suit.Hearts, Rank.Ace, 0),
        Card.createCard(Suit.Hearts, Rank.Ace, 1),
      );

      const context = createGameContext(gameState, PlayerId.Human);
      context.currentPlayer = PlayerId.Human;
      if (context.memoryContext) {
        context.memoryContext.cardMemory = cardMemory;
      }

      const validCombos = [
        {
          cards: [Card.createCard(Suit.Hearts, Rank.King, 0)],
          type: ComboType.Single,
          value: 25,
          isBreakingPair: false,
        },
        {
          cards: [Card.createCard(Suit.Hearts, Rank.Ten, 0)],
          type: ComboType.Single,
          value: 20,
          isBreakingPair: false,
        },
      ];

      const pointAnalysis = analyzePointCardTiming(
        cardMemory,
        gameState,
        context,
        gameState.trumpInfo,
        PlayerId.Human,
        validCombos,
      );

      expect(pointAnalysis.memoryBasedPointPriority).toBeGreaterThan(0.7);
      expect(pointAnalysis.guaranteedPointPlays.length).toBeGreaterThan(0);
    });

    it("should handle scenarios with no point opportunities", () => {
      const cardMemory = createCardMemory(gameState);

      // Set up scenario with no point cards
      gameState.players[0].hand = [
        Card.createCard(Suit.Spades, Rank.Seven, 0),
        Card.createCard(Suit.Hearts, Rank.Six, 0),
      ];

      const context = createGameContext(gameState, PlayerId.Human);
      context.currentPlayer = PlayerId.Human;
      if (context.memoryContext) {
        context.memoryContext.cardMemory = cardMemory;
      }

      const validCombos = [
        {
          cards: [Card.createCard(Suit.Spades, Rank.Seven, 0)],
          type: ComboType.Single,
          value: 7,
          isBreakingPair: false,
        },
      ];

      const pointAnalysis = analyzePointCardTiming(
        cardMemory,
        gameState,
        context,
        gameState.trumpInfo,
        PlayerId.Human,
        validCombos,
      );

      expect(pointAnalysis.memoryBasedPointPriority).toBeLessThanOrEqual(0.6);
      expect(pointAnalysis.immediatePointOpportunities).toHaveLength(0);
      expect(pointAnalysis.guaranteedPointPlays).toHaveLength(0);
    });
  });
});
