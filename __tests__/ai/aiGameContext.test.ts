import {
  createGameContext,
  isPlayerOnAttackingTeam,
  calculatePointPressure,
  getTrickPosition,
  isTrickWorthFighting,
} from "../../src/ai/aiGameContext";
import {
  PlayerId,
  TrickPosition,
  PointPressure,
  GamePhase,
} from "../../src/types";
import { createTestCardsGameState } from "../helpers/gameStates";

describe("AI Game Context", () => {
  let gameState: any;

  beforeEach(() => {
    gameState = createTestCardsGameState();
    gameState.gamePhase = GamePhase.Playing;
  });

  describe("isPlayerOnAttackingTeam", () => {
    it("should correctly identify Team A players (Human + Bot2) as attacking on odd rounds", () => {
      gameState.roundNumber = 1; // Odd round - Team A attacks
      
      expect(isPlayerOnAttackingTeam(gameState, PlayerId.Human)).toBe(true);
      expect(isPlayerOnAttackingTeam(gameState, PlayerId.Bot2)).toBe(true);
      expect(isPlayerOnAttackingTeam(gameState, PlayerId.Bot1)).toBe(false);
      expect(isPlayerOnAttackingTeam(gameState, PlayerId.Bot3)).toBe(false);
    });

    it("should correctly identify Team B players (Bot1 + Bot3) as attacking on even rounds", () => {
      gameState.roundNumber = 2; // Even round - Team B attacks
      
      expect(isPlayerOnAttackingTeam(gameState, PlayerId.Human)).toBe(false);
      expect(isPlayerOnAttackingTeam(gameState, PlayerId.Bot2)).toBe(false);
      expect(isPlayerOnAttackingTeam(gameState, PlayerId.Bot1)).toBe(true);
      expect(isPlayerOnAttackingTeam(gameState, PlayerId.Bot3)).toBe(true);
    });
  });

  describe("calculatePointPressure", () => {
    it("should return LOW pressure for less than 30% of points", () => {
      expect(calculatePointPressure(20, 80)).toBe(PointPressure.LOW);
      expect(calculatePointPressure(0, 80)).toBe(PointPressure.LOW);
      expect(calculatePointPressure(23, 80)).toBe(PointPressure.LOW);
    });

    it("should return MEDIUM pressure for 30-70% of points", () => {
      expect(calculatePointPressure(24, 80)).toBe(PointPressure.MEDIUM);
      expect(calculatePointPressure(40, 80)).toBe(PointPressure.MEDIUM);
      expect(calculatePointPressure(55, 80)).toBe(PointPressure.MEDIUM);
    });

    it("should return HIGH pressure for 70%+ of points", () => {
      expect(calculatePointPressure(56, 80)).toBe(PointPressure.HIGH);
      expect(calculatePointPressure(70, 80)).toBe(PointPressure.HIGH);
      expect(calculatePointPressure(79, 80)).toBe(PointPressure.HIGH);
    });
  });

  describe("getTrickPosition", () => {
    it("should return First when no trick exists", () => {
      gameState.currentTrick = null;
      expect(getTrickPosition(gameState, PlayerId.Human)).toBe(TrickPosition.First);
    });

    it("should return First when trick has no plays", () => {
      gameState.currentTrick = {
        leadingPlayerId: PlayerId.Human,
        leadingCombo: [],
        plays: [],
      };
      expect(getTrickPosition(gameState, PlayerId.Human)).toBe(TrickPosition.First);
    });

    it("should return correct positions based on play count", () => {
      gameState.currentTrick = {
        leadingPlayerId: PlayerId.Human,
        leadingCombo: [],
        plays: [],
      };
      
      // First player (leader)
      expect(getTrickPosition(gameState, PlayerId.Human)).toBe(TrickPosition.First);
      
      // Second player
      gameState.currentTrick.plays = [{ playerId: PlayerId.Bot1, cards: [] }];
      expect(getTrickPosition(gameState, PlayerId.Bot2)).toBe(TrickPosition.Second);
      
      // Third player
      gameState.currentTrick.plays = [
        { playerId: PlayerId.Bot1, cards: [] },
        { playerId: PlayerId.Bot2, cards: [] },
      ];
      expect(getTrickPosition(gameState, PlayerId.Bot3)).toBe(TrickPosition.Third);
      
      // Fourth player
      gameState.currentTrick.plays = [
        { playerId: PlayerId.Bot1, cards: [] },
        { playerId: PlayerId.Bot2, cards: [] },
        { playerId: PlayerId.Bot3, cards: [] },
      ];
      expect(getTrickPosition(gameState, PlayerId.Human)).toBe(TrickPosition.Fourth);
    });
  });

  describe("createGameContext", () => {
    it("should create complete game context for attacking team player", () => {
      gameState.roundNumber = 1; // Team A attacks
      gameState.currentTrick = null;
      
      const context = createGameContext(gameState, PlayerId.Human);
      
      expect(context.isAttackingTeam).toBe(true);
      expect(context.currentPoints).toBe(0); // Placeholder value
      expect(context.pointsNeeded).toBe(80);
      expect(context.cardsRemaining).toBeGreaterThan(0);
      expect(context.trickPosition).toBe(TrickPosition.First);
      expect(context.pointPressure).toBe(PointPressure.LOW);
    });

    it("should create complete game context for defending team player", () => {
      gameState.roundNumber = 1; // Team A attacks, so Bot1 defends
      gameState.currentTrick = null;
      
      const context = createGameContext(gameState, PlayerId.Bot1);
      
      expect(context.isAttackingTeam).toBe(false);
      expect(context.currentPoints).toBe(0); // Placeholder value
      expect(context.pointsNeeded).toBe(80);
      expect(context.cardsRemaining).toBeGreaterThan(0);
      expect(context.trickPosition).toBe(TrickPosition.First);
      expect(context.pointPressure).toBe(PointPressure.LOW);
    });
  });

  describe("isTrickWorthFighting", () => {
    beforeEach(() => {
      gameState.currentTrick = {
        leadingPlayerId: PlayerId.Human,
        leadingCombo: [{ points: 5 }], // 5 points from leading combo
        plays: [
          { playerId: PlayerId.Bot1, cards: [{ points: 10 }] }, // 10 points
        ],
      };
    });

    it("should consider trick worth fighting with LOW pressure and high points", () => {
      const context = createGameContext(gameState, PlayerId.Human);
      context.pointPressure = PointPressure.LOW;
      
      // Total points: 5 + 10 = 15, threshold for LOW is 15
      expect(isTrickWorthFighting(gameState, context)).toBe(true);
    });

    it("should not consider trick worth fighting with LOW pressure and low points", () => {
      gameState.currentTrick.leadingCombo = [{ points: 0 }];
      gameState.currentTrick.plays = [{ playerId: PlayerId.Bot1, cards: [{ points: 5 }] }];
      
      const context = createGameContext(gameState, PlayerId.Human);
      context.pointPressure = PointPressure.LOW;
      
      // Total points: 0 + 5 = 5, threshold for LOW is 15
      expect(isTrickWorthFighting(gameState, context)).toBe(false);
    });

    it("should have lower threshold for MEDIUM pressure", () => {
      gameState.currentTrick.leadingCombo = [{ points: 0 }];
      gameState.currentTrick.plays = [{ playerId: PlayerId.Bot1, cards: [{ points: 10 }] }];
      
      const context = createGameContext(gameState, PlayerId.Human);
      context.pointPressure = PointPressure.MEDIUM;
      
      // Total points: 0 + 10 = 10, threshold for MEDIUM is 10
      expect(isTrickWorthFighting(gameState, context)).toBe(true);
    });

    it("should have lowest threshold for HIGH pressure", () => {
      gameState.currentTrick.leadingCombo = [{ points: 0 }];
      gameState.currentTrick.plays = [{ playerId: PlayerId.Bot1, cards: [{ points: 5 }] }];
      
      const context = createGameContext(gameState, PlayerId.Human);
      context.pointPressure = PointPressure.HIGH;
      
      // Total points: 0 + 5 = 5, threshold for HIGH is 5
      expect(isTrickWorthFighting(gameState, context)).toBe(true);
    });
  });
});