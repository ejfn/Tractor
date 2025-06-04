import { GameState, PlayerId, Rank, DeclarationType, Suit, TeamId } from "../../src/types";
import { prepareNextRound, endRound } from "../../src/game/gameRoundManager";
import { initializeGame } from "../../src/game/gameLogic";

/**
 * Tests for correct player rotation when starting next round
 * Issue #46: Ensure correct player starts next round based on game rules
 * 
 * Rules:
 * - Attacking team wins: Next player counter-clockwise from previous starter should start
 * - Defending team wins: Other defending player should start
 * 
 * Player order (counter-clockwise): Human (0) → Bot1 (1) → Bot2 (2) → Bot3 (3) → Human (0)
 * Teams: Team A (Human, Bot2), Team B (Bot1, Bot3)
 */

describe("Next Round Starting Player Rotation", () => {
  let gameState: GameState;

  beforeEach(() => {
    gameState = initializeGame();
    gameState.roundNumber = 2; // Not first round to test rotation logic
  });

  /**
   * Helper function to simulate a round end and return both the original state and round result
   */
  function simulateRoundEnd(
    state: GameState,
    attackingTeamPoints: number,
    lastRoundStarterIndex: number
  ): { state: GameState; roundResult: any } {
    const newState = { ...state };
    
    // Set last round starting player
    newState.roundStartingPlayerIndex = lastRoundStarterIndex;
    
    // Set attacking team points
    const attackingTeam = newState.teams.find(t => !t.isDefending);
    if (attackingTeam) {
      attackingTeam.points = attackingTeamPoints;
    }
    
    // Process round end
    const roundResult = endRound(newState);
    
    return { state: newState, roundResult };
  }

  describe("Attacking Team Wins - Counter-clockwise Rotation", () => {
    test("Human starts, attacking wins → Bot1 should start next round", () => {
      // Setup: Human (index 0) started last round, Team B attacking
      const humanStarterIndex = 0;
      gameState.teams[0].isDefending = true;  // Team A defending
      gameState.teams[1].isDefending = false; // Team B attacking
      
      // Attacking team (Team B) wins with 100 points
      const { state: afterRoundEnd, roundResult } = simulateRoundEnd(gameState, 100, humanStarterIndex);
      
      // Prepare next round
      const nextRoundState = prepareNextRound(afterRoundEnd, roundResult);
      
      // Bot1 (index 1) should start - next counter-clockwise from Human (0)
      expect(nextRoundState.currentPlayerIndex).toBe(1);
      expect(nextRoundState.players[1].id).toBe(PlayerId.Bot1);
    });

    test("Bot1 starts, attacking wins → Bot2 should start next round", () => {
      // Setup: Bot1 (index 1) started last round, Team A attacking
      const bot1StarterIndex = 1;
      gameState.teams[0].isDefending = false; // Team A attacking
      gameState.teams[1].isDefending = true;  // Team B defending
      
      // Attacking team (Team A) wins with 80 points
      const { state: afterRoundEnd, roundResult } = simulateRoundEnd(gameState, 80, bot1StarterIndex);
      
      // Prepare next round
      const nextRoundState = prepareNextRound(afterRoundEnd, roundResult);
      
      // Bot2 (index 2) should start - next counter-clockwise from Bot1 (1)
      expect(nextRoundState.currentPlayerIndex).toBe(2);
      expect(nextRoundState.players[2].id).toBe(PlayerId.Bot2);
    });

    test("Bot2 starts, attacking wins → Bot3 should start next round", () => {
      // Setup: Bot2 (index 2) started last round, Team B attacking
      const bot2StarterIndex = 2;
      gameState.teams[0].isDefending = true;  // Team A defending
      gameState.teams[1].isDefending = false; // Team B attacking
      
      // Attacking team (Team B) wins with 120 points
      const { state: afterRoundEnd, roundResult } = simulateRoundEnd(gameState, 120, bot2StarterIndex);
      
      // Prepare next round
      const nextRoundState = prepareNextRound(afterRoundEnd, roundResult);
      
      // Bot3 (index 3) should start - next counter-clockwise from Bot2 (2)
      expect(nextRoundState.currentPlayerIndex).toBe(3);
      expect(nextRoundState.players[3].id).toBe(PlayerId.Bot3);
    });

    test("Bot3 starts, attacking wins → Human should start next round", () => {
      // Setup: Bot3 (index 3) started last round, Team A attacking
      const bot3StarterIndex = 3;
      gameState.teams[0].isDefending = false; // Team A attacking
      gameState.teams[1].isDefending = true;  // Team B defending
      
      // Attacking team (Team A) wins with 90 points
      const { state: afterRoundEnd, roundResult } = simulateRoundEnd(gameState, 90, bot3StarterIndex);
      
      // Prepare next round
      const nextRoundState = prepareNextRound(afterRoundEnd, roundResult);
      
      // Human (index 0) should start - next counter-clockwise from Bot3 (3)
      expect(nextRoundState.currentPlayerIndex).toBe(0);
      expect(nextRoundState.players[0].id).toBe(PlayerId.Human);
    });
  });

  describe("Defending Team Wins - Other Defending Player Starts", () => {
    test("Human starts (defending), defending wins → Bot2 should start next round", () => {
      // Setup: Human (index 0) started last round, Team A defending
      const humanStarterIndex = 0;
      gameState.teams[0].isDefending = true;  // Team A defending (Human, Bot2)
      gameState.teams[1].isDefending = false; // Team B attacking
      
      // Defending team wins (attacking team gets < 80 points)
      const { state: afterRoundEnd, roundResult } = simulateRoundEnd(gameState, 60, humanStarterIndex);
      
      // Prepare next round
      const nextRoundState = prepareNextRound(afterRoundEnd, roundResult);
      
      // Bot2 (index 2) should start - other Team A player
      expect(nextRoundState.currentPlayerIndex).toBe(2);
      expect(nextRoundState.players[2].id).toBe(PlayerId.Bot2);
    });

    test("Bot2 starts (defending), defending wins → Human should start next round", () => {
      // Setup: Bot2 (index 2) started last round, Team A defending
      const bot2StarterIndex = 2;
      gameState.teams[0].isDefending = true;  // Team A defending (Human, Bot2)
      gameState.teams[1].isDefending = false; // Team B attacking
      
      // Defending team wins (attacking team gets 40 points)
      const { state: afterRoundEnd, roundResult } = simulateRoundEnd(gameState, 40, bot2StarterIndex);
      
      // Prepare next round
      const nextRoundState = prepareNextRound(afterRoundEnd, roundResult);
      
      // Human (index 0) should start - other Team A player
      expect(nextRoundState.currentPlayerIndex).toBe(0);
      expect(nextRoundState.players[0].id).toBe(PlayerId.Human);
    });

    test("Bot1 starts (defending), defending wins → Bot3 should start next round", () => {
      // Setup: Bot1 (index 1) started last round, Team B defending
      const bot1StarterIndex = 1;
      gameState.teams[0].isDefending = false; // Team A attacking
      gameState.teams[1].isDefending = true;  // Team B defending (Bot1, Bot3)
      
      // Defending team wins (attacking team gets 0 points)
      const { state: afterRoundEnd, roundResult } = simulateRoundEnd(gameState, 0, bot1StarterIndex);
      
      // Prepare next round
      const nextRoundState = prepareNextRound(afterRoundEnd, roundResult);
      
      // Bot3 (index 3) should start - other Team B player
      expect(nextRoundState.currentPlayerIndex).toBe(3);
      expect(nextRoundState.players[3].id).toBe(PlayerId.Bot3);
    });

    test("Bot3 starts (defending), defending wins → Bot1 should start next round", () => {
      // Setup: Bot3 (index 3) started last round, Team B defending
      const bot3StarterIndex = 3;
      gameState.teams[0].isDefending = false; // Team A attacking
      gameState.teams[1].isDefending = true;  // Team B defending (Bot1, Bot3)
      
      // Defending team wins (attacking team gets 30 points)
      const { state: afterRoundEnd, roundResult } = simulateRoundEnd(gameState, 30, bot3StarterIndex);
      
      // Prepare next round
      const nextRoundState = prepareNextRound(afterRoundEnd, roundResult);
      
      // Bot1 (index 1) should start - other Team B player
      expect(nextRoundState.currentPlayerIndex).toBe(1);
      expect(nextRoundState.players[1].id).toBe(PlayerId.Bot1);
    });
  });

  describe("Edge Cases", () => {
    test("Should handle first round correctly (trump declarer starts)", () => {
      // First round: trump declarer should start
      const firstRoundState = initializeGame();
      firstRoundState.roundNumber = 0; // Will be incremented to 1 by prepareNextRound
      // Set up trump declaration state to indicate Bot2 declared trump
      firstRoundState.trumpDeclarationState = {
        declarationHistory: [],
        declarationWindow: false,
        currentDeclaration: {
          playerId: PlayerId.Bot2,
          rank: firstRoundState.trumpInfo.trumpRank,
          suit: firstRoundState.trumpInfo.trumpSuit || Suit.Hearts,
          type: DeclarationType.Pair,
          cards: [],
          timestamp: Date.now()
        }
      };
      
      // Create a mock round result for first round
      const mockRoundResult = {
        gameOver: false,
        gameWinner: undefined,
        roundCompleteMessage: "Test message",
        attackingTeamWon: false,
        rankChanges: {} as Record<TeamId, Rank>,
        finalPoints: 0,
        pointsBreakdown: ""
      };
      
      const nextRoundState = prepareNextRound(firstRoundState, mockRoundResult);
      
      // Bot2 should start as the trump declarer
      expect(nextRoundState.currentPlayerIndex).toBe(2);
      expect(nextRoundState.players[2].id).toBe(PlayerId.Bot2);
    });

    test("Should handle missing roundStartingPlayerIndex gracefully", () => {
      // Setup without setting roundStartingPlayerIndex
      gameState.teams[0].isDefending = true;  // Team A defending
      gameState.teams[1].isDefending = false; // Team B attacking
      gameState.roundStartingPlayerIndex = -1; // Invalid index
      
      // Attacking team wins
      const { state: afterRoundEnd, roundResult } = simulateRoundEnd(gameState, 100, -1);
      
      // Should not crash and should use fallback logic
      const nextRoundState = prepareNextRound(afterRoundEnd, roundResult);
      
      // Should have a valid player index
      expect(nextRoundState.currentPlayerIndex).toBeGreaterThanOrEqual(0);
      expect(nextRoundState.currentPlayerIndex).toBeLessThan(4);
    });
  });

  describe("Team Role Switching Verification", () => {
    test("When attacking team wins, they become defending team", () => {
      // Setup: Team B attacking
      gameState.teams[0].isDefending = true;  // Team A defending
      gameState.teams[1].isDefending = false; // Team B attacking
      
      // Attacking team (Team B) wins
      const { state: afterRoundEnd, roundResult } = simulateRoundEnd(gameState, 100, 1);
      const nextRoundState = prepareNextRound(afterRoundEnd, roundResult);
      
      // Team roles should switch (verify from the prepared next round state)
      expect(nextRoundState.teams[0].isDefending).toBe(false); // Team A now attacking
      expect(nextRoundState.teams[1].isDefending).toBe(true);  // Team B now defending
    });

    test("When defending team wins, they stay defending", () => {
      // Setup: Team A defending
      gameState.teams[0].isDefending = true;  // Team A defending
      gameState.teams[1].isDefending = false; // Team B attacking
      
      // Defending team wins (attacking gets < 80)
      const { state: afterRoundEnd, roundResult } = simulateRoundEnd(gameState, 50, 0);
      const nextRoundState = prepareNextRound(afterRoundEnd, roundResult);
      
      // Team roles should stay the same (verify from the prepared next round state)
      expect(nextRoundState.teams[0].isDefending).toBe(true);  // Team A still defending
      expect(nextRoundState.teams[1].isDefending).toBe(false); // Team B still attacking
    });
  });
});