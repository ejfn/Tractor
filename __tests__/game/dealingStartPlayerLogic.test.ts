import { GameState, PlayerId } from "../../src/types";
import { initializeGame, dealNextCard } from "../../src/game/gameLogic";

/**
 * Tests for dealing start player logic (Issue #115)
 * 
 * Rules:
 * - Round 1: Always start dealing from human player (index 0)
 * - Round 2+: Start dealing from roundStartingPlayerIndex
 */

describe("Dealing Start Player Logic", () => {
  let gameState: GameState;

  beforeEach(() => {
    gameState = initializeGame();
  });

  describe("Round 1 Dealing", () => {
    test("should always start dealing from human player in round 1", () => {
      // Setup round 1
      gameState.roundNumber = 1;
      gameState.roundStartingPlayerIndex = 2; // Bot2, but should be ignored for round 1
      
      // Start dealing
      const stateAfterFirstDeal = dealNextCard(gameState);
      
      // Should start dealing from human player (index 0) regardless of roundStartingPlayerIndex
      // After dealing first card, currentDealingPlayerIndex should point to next player (1)
      expect(stateAfterFirstDeal.dealingState?.currentDealingPlayerIndex).toBe(1);
      expect(stateAfterFirstDeal.dealingState?.startingDealingPlayerIndex).toBe(0);
      
      // Verify human player got the first card
      expect(stateAfterFirstDeal.players[0].hand.length).toBe(1);
      expect(stateAfterFirstDeal.players[1].hand.length).toBe(0);
      expect(stateAfterFirstDeal.players[2].hand.length).toBe(0);
      expect(stateAfterFirstDeal.players[3].hand.length).toBe(0);
    });

    test("should start dealing from human even when roundStartingPlayerIndex is different", () => {
      // Test various roundStartingPlayerIndex values for round 1
      const testCases = [1, 2, 3]; // Bot1, Bot2, Bot3
      
      testCases.forEach(startingPlayerIndex => {
        const testState = initializeGame();
        testState.roundNumber = 1;
        testState.roundStartingPlayerIndex = startingPlayerIndex;
        
        const afterDeal = dealNextCard(testState);
        
        // Should always start from human (0) in round 1
        // After dealing first card, currentDealingPlayerIndex should point to next player (1)
        expect(afterDeal.dealingState?.currentDealingPlayerIndex).toBe(1);
        expect(afterDeal.dealingState?.startingDealingPlayerIndex).toBe(0);
      });
    });
  });

  describe("Round 2+ Dealing", () => {
    test("should start dealing from roundStartingPlayerIndex in round 2", () => {
      // Setup round 2 with Bot1 as starting player
      gameState.roundNumber = 2;
      gameState.roundStartingPlayerIndex = 1; // Bot1
      gameState.dealingState = undefined; // Reset dealing state so it gets re-initialized
      
      // Start dealing
      const stateAfterFirstDeal = dealNextCard(gameState);
      
      // Should start dealing from Bot1 (index 1)
      // After dealing first card to Bot1, currentDealingPlayerIndex should point to next player (2)
      expect(stateAfterFirstDeal.dealingState?.currentDealingPlayerIndex).toBe(2);
      expect(stateAfterFirstDeal.dealingState?.startingDealingPlayerIndex).toBe(1);
      
      // Verify Bot1 got the first card
      expect(stateAfterFirstDeal.players[0].hand.length).toBe(0);
      expect(stateAfterFirstDeal.players[1].hand.length).toBe(1);
      expect(stateAfterFirstDeal.players[2].hand.length).toBe(0);
      expect(stateAfterFirstDeal.players[3].hand.length).toBe(0);
    });

    test("should start dealing from roundStartingPlayerIndex in round 3", () => {
      // Setup round 3 with Bot2 as starting player
      gameState.roundNumber = 3;
      gameState.roundStartingPlayerIndex = 2; // Bot2
      gameState.dealingState = undefined; // Reset dealing state so it gets re-initialized
      
      // Start dealing
      const stateAfterFirstDeal = dealNextCard(gameState);
      
      // Should start dealing from Bot2 (index 2)
      // After dealing first card to Bot2, currentDealingPlayerIndex should point to next player (3)
      expect(stateAfterFirstDeal.dealingState?.currentDealingPlayerIndex).toBe(3);
      expect(stateAfterFirstDeal.dealingState?.startingDealingPlayerIndex).toBe(2);
      
      // Verify Bot2 got the first card
      expect(stateAfterFirstDeal.players[0].hand.length).toBe(0);
      expect(stateAfterFirstDeal.players[1].hand.length).toBe(0);
      expect(stateAfterFirstDeal.players[2].hand.length).toBe(1);
      expect(stateAfterFirstDeal.players[3].hand.length).toBe(0);
    });

    test("should handle all possible starting players in round 2+", () => {
      const testCases = [
        { player: "Human", index: 0, playerId: PlayerId.Human },
        { player: "Bot1", index: 1, playerId: PlayerId.Bot1 },
        { player: "Bot2", index: 2, playerId: PlayerId.Bot2 },
        { player: "Bot3", index: 3, playerId: PlayerId.Bot3 },
      ];
      
      testCases.forEach(({ player, index, playerId }) => {
        const testState = initializeGame();
        testState.roundNumber = 2; // Round 2+
        testState.roundStartingPlayerIndex = index;
        testState.dealingState = undefined; // Reset dealing state so it gets re-initialized
        
        const afterDeal = dealNextCard(testState);
        
        // Should start dealing from the specified player
        // After dealing first card, currentDealingPlayerIndex should point to next player
        const expectedNextPlayerIndex = (index + 1) % 4;
        expect(afterDeal.dealingState?.currentDealingPlayerIndex).toBe(expectedNextPlayerIndex);
        expect(afterDeal.dealingState?.startingDealingPlayerIndex).toBe(index);
        expect(afterDeal.players[index].id).toBe(playerId);
        
        // Verify only that player got the first card
        afterDeal.players.forEach((p, i) => {
          if (i === index) {
            expect(p.hand.length).toBe(1);
          } else {
            expect(p.hand.length).toBe(0);
          }
        });
      });
    });
  });

  describe("Dealing Progression", () => {
    test("should maintain proper dealing order after starting player", () => {
      // Test round 2 starting from Bot2 (index 2)
      gameState.roundNumber = 2;
      gameState.roundStartingPlayerIndex = 2;
      
      // Deal first 4 cards to verify counter-clockwise order
      let currentState = gameState;
      for (let i = 0; i < 4; i++) {
        currentState = dealNextCard(currentState);
      }
      
      // Expected order: Bot2 (2) → Bot3 (3) → Human (0) → Bot1 (1)
      expect(currentState.players[2].hand.length).toBe(1); // Bot2: 1st card
      expect(currentState.players[3].hand.length).toBe(1); // Bot3: 2nd card
      expect(currentState.players[0].hand.length).toBe(1); // Human: 3rd card
      expect(currentState.players[1].hand.length).toBe(1); // Bot1: 4th card
    });

    test("should wrap around correctly when starting from Bot3", () => {
      // Test round 2 starting from Bot3 (index 3)
      gameState.roundNumber = 2;
      gameState.roundStartingPlayerIndex = 3;
      
      // Deal first 4 cards
      let currentState = gameState;
      for (let i = 0; i < 4; i++) {
        currentState = dealNextCard(currentState);
      }
      
      // Expected order: Bot3 (3) → Human (0) → Bot1 (1) → Bot2 (2)
      expect(currentState.players[3].hand.length).toBe(1); // Bot3: 1st card
      expect(currentState.players[0].hand.length).toBe(1); // Human: 2nd card
      expect(currentState.players[1].hand.length).toBe(1); // Bot1: 3rd card
      expect(currentState.players[2].hand.length).toBe(1); // Bot2: 4th card
    });
  });

  describe("Edge Cases", () => {

    test("should handle round 0 as round 1 behavior", () => {
      // Edge case: round 0 should behave like round 1
      gameState.roundNumber = 0;
      gameState.roundStartingPlayerIndex = 2;
      gameState.dealingState = undefined; // Reset dealing state so it gets re-initialized
      
      const afterDeal = dealNextCard(gameState);
      
      // Should start from roundStartingPlayerIndex since roundNumber !== 1 is true for 0
      // After dealing first card to Bot2 (index 2), currentDealingPlayerIndex should point to next player (3)
      expect(afterDeal.dealingState?.currentDealingPlayerIndex).toBe(3);
    });

    test("should maintain dealing state across multiple deals", () => {
      // Test that dealing state persists correctly
      gameState.roundNumber = 2;
      gameState.roundStartingPlayerIndex = 1; // Bot1
      gameState.dealingState = undefined; // Reset dealing state so it gets re-initialized
      
      // First deal - should initialize
      const firstDeal = dealNextCard(gameState);
      expect(firstDeal.dealingState?.startingDealingPlayerIndex).toBe(1);
      
      // Second deal - should preserve starting player info
      const secondDeal = dealNextCard(firstDeal);
      expect(secondDeal.dealingState?.startingDealingPlayerIndex).toBe(1);
      expect(secondDeal.dealingState?.currentDealingPlayerIndex).toBe(3); // Next player after Bot2 (Bot3)
    });
  });
});