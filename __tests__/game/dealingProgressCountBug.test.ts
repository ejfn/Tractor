import { dealNextCard, getDealingProgress } from "../../src/game/dealingAndDeclaration";
import { GameState } from "../../src/types";
import { initializeGame } from "../../src/utils/gameInitialization";

/**
 * Tests for dealing progress count fix (Issue #115)
 * 
 * Fixed bug in getDealingProgress function where it incorrectly calculated
 * the number of cards dealt by using currentDealingPlayerIndex directly.
 * The index represents the NEXT player to receive a card, not the count
 * of cards already dealt.
 */

describe("Dealing Progress Count (Fixed)", () => {
  let gameState: GameState;

  beforeEach(() => {
    gameState = initializeGame();
  });

  describe("Progress Count Accuracy", () => {
    test("should correctly calculate progress when starting from non-zero player", () => {
      // Setup round 2 starting from Bot2 (index 2) - this exposed the original bug
      gameState.roundNumber = 2;
      gameState.roundStartingPlayerIndex = 2; // Bot2
      gameState.dealingState = undefined; // Reset dealing state
      
      // Initial state - no cards dealt yet
      let progress = getDealingProgress(gameState);
      expect(progress.current).toBe(0);
      
      // Deal first card to Bot2 (index 2)
      gameState = dealNextCard(gameState);
      progress = getDealingProgress(gameState);
      
      // Fixed: Should correctly show 1 card dealt (was 3 before fix)
      expect(progress.current).toBe(1);
      expect(gameState.dealingState?.currentDealingPlayerIndex).toBe(3); // Next player
    });

    test("should demonstrate inconsistent progress when starting from different players", () => {
      console.log("=== TESTING ALL STARTING PLAYERS ===");
      
      // Test all possible starting players to find the pattern
      for (let startingPlayer = 0; startingPlayer < 4; startingPlayer++) {
        console.log(`\n--- Starting from Player ${startingPlayer} ---`);
        
        let testState = initializeGame();
        testState.roundNumber = 2;
        testState.roundStartingPlayerIndex = startingPlayer;
        testState.dealingState = undefined;
        
        const progressValues = [];
        for (let i = 0; i < 4; i++) {
          const beforeProgress = getDealingProgress(testState);
          testState = dealNextCard(testState);
          const afterProgress = getDealingProgress(testState);
          progressValues.push(afterProgress.current);
          
          console.log(`  Card ${i + 1}: progress = ${afterProgress.current}`);
        }
        
        const isSequential = progressValues.every((val, idx) => val === idx + 1);
        console.log(`  Sequential? ${isSequential} (${progressValues.join(', ')})`);
        
        // Also test what happens if we check progress at the very beginning
        const initialState = initializeGame();
        initialState.roundNumber = 2;
        initialState.roundStartingPlayerIndex = startingPlayer;
        initialState.dealingState = undefined;
        const initialProgress = getDealingProgress(initialState);
        console.log(`  Initial progress before any dealing: ${initialProgress.current}/${initialProgress.total}`);
      }
    });

    test("should correctly track progress across multiple starting players", () => {
      const testCases = [0, 1, 2, 3]; // All possible starting players

      testCases.forEach((startingPlayerIndex) => {
        const testState = initializeGame();
        testState.roundNumber = 2;
        testState.roundStartingPlayerIndex = startingPlayerIndex;
        testState.dealingState = undefined;

        // Deal 4 cards (one per player) and verify progress
        let currentState = testState;
        for (let cardNum = 1; cardNum <= 4; cardNum++) {
          currentState = dealNextCard(currentState);
          const progress = getDealingProgress(currentState);
          
          // Progress should always match the number of cards dealt
          expect(progress.current).toBe(cardNum);
        }
      });
    });

    test("should handle multiple rounds correctly", () => {
      // Setup round 2 starting from Bot1 (index 1)
      gameState.roundNumber = 2;
      gameState.roundStartingPlayerIndex = 1;
      gameState.dealingState = undefined;

      // Deal multiple rounds worth of cards
      const playersCount = 4;
      for (let round = 0; round < 3; round++) {
        for (let player = 0; player < playersCount; player++) {
          gameState = dealNextCard(gameState);
          const progress = getDealingProgress(gameState);
          const expectedCards = round * playersCount + player + 1;
          expect(progress.current).toBe(expectedCards);
        }
      }
    });
  });
});