// Dynamic imports for Node.js modules (test environment only)
import { getAIKittySwap, getAITrumpDeclaration } from "../../src/ai/aiLogic";
import {
  dealNextCard,
  finalizeTrumpDeclaration,
  isDealingComplete,
  makeTrumpDeclaration,
} from "../../src/game/dealingAndDeclaration";
import { endRound, prepareNextRound } from "../../src/game/gameRoundManager";
import { putbackKittyCards } from "../../src/game/kittyManager";
import {
  clearCompletedTrick,
  getAIMoveWithErrorHandling,
  processPlay,
} from "../../src/game/playProcessing";
import { Card, GamePhase, GameState, PlayerId, TeamId } from "../../src/types";
import { initializeGame } from "../../src/utils/gameInitialization";
import { gameLogger, LogLevel } from "../../src/utils/gameLogger";
import { GameStats, TestSessionTracker } from "../helpers";

// TestSessionTracker class is now imported from helpers
// Removed inline class definition in favor of shared helper

/**
 * Unattended Game Simulation Integration Test
 *
 * Runs complete games with all players controlled by AI to validate:
 * - Game completion from start to victory (defend Ace)
 * - AI move validation and rule compliance
 * - State consistency throughout gameplay
 * - Performance and error detection
 *
 * This test is excluded from regular test runs and must be run manually with:
 * npm run test:simulation
 */

describe("Unattended Game Simulation", () => {
  // Test configuration
  const TARGET_GAMES = parseInt(process.env.TARGET_GAMES || "3", 10); // Number of games to run for reliability testing
  const LOG_LEVEL_STR = (process.env.LOG_LEVEL || "INFO").toUpperCase();
  const LOG_LEVEL: LogLevel =
    (LogLevel[LOG_LEVEL_STR as keyof typeof LogLevel] as LogLevel) ||
    LogLevel.INFO;
  const GAME_TIMEOUT_SECONDS = TARGET_GAMES * 10; // Dynamic timeout based on number of games
  const MAX_ROUNDS_PER_GAME = 60; // Safety limit for rounds per game

  test(
    "Complete unattended game simulation with AI players",
    async () => {
      const targetGames = TARGET_GAMES;
      const maxRoundsPerGame = MAX_ROUNDS_PER_GAME;
      const timestamp = new Date().toISOString();
      const gameId = Date.now();

      // Initialize session tracking with shared timestamp
      const sessionTracker = new TestSessionTracker(
        timestamp,
        "simulation_data",
      );

      try {
        for (let gameNum = 1; gameNum <= targetGames; gameNum++) {
          const currentGameId = `${gameId}-${gameNum}`;
          let roundCount = 0;
          let gameWinner: TeamId | null = null;
          let gameState: GameState | undefined;

          // Configure the singleton gameLogger to capture all game events to file
          gameLogger.configure({
            logLevel: LOG_LEVEL,
            enableFileLogging: true,
            enableConsoleLog: false, // Disable console output for clean unattended test
            includePlayerHands: false, // Do not log sensitive player hands
            logDir: "simulation_data",
            logFileName: `${timestamp}-${gameNum}-game.log`,
          });

          try {
            gameLogger.setCurrentGameId(currentGameId);
            sessionTracker.startGame(currentGameId);

            // Initialize game
            gameState = initializeGame();

            // Game loop: continue until victory condition
            while (!gameWinner && roundCount < maxRoundsPerGame) {
              roundCount++;

              // PHASE 1: Progressive Dealing with Trump Declarations
              gameState = await runDealingPhase(gameState, currentGameId);

              // PHASE 2: Kitty Management
              gameState = await runKittyPhase(gameState, currentGameId);

              // PHASE 3: Trick Playing
              gameState = await runPlayingPhase(gameState, currentGameId);

              // PHASE 4: Round End and Scoring
              const roundResult = endRound(gameState);

              // Update round count
              sessionTracker.updateRounds(roundCount);

              // Check for victory condition
              if (roundResult.gameOver && roundResult.gameWinner) {
                gameWinner = roundResult.gameWinner;

                // Capture final team ranks
                const finalTeamRanks = {
                  teamA:
                    gameState.teams.find((t) => t.id === "A")?.currentRank ||
                    "2",
                  teamB:
                    gameState.teams.find((t) => t.id === "B")?.currentRank ||
                    "2",
                };

                sessionTracker.endGame(gameWinner, finalTeamRanks);
                break;
              }

              // Prepare next round
              gameState = prepareNextRound(gameState, roundResult);
            }

            if (!gameWinner) {
              const defendingTeam = gameState.teams.find((t) => t.isDefending);
              const attackingTeam = gameState.teams.find((t) => !t.isDefending);

              sessionTracker.logError(
                roundCount,
                "timeout",
                `Game exceeded maximum rounds (${maxRoundsPerGame})`,
                {
                  defendingTeam: defendingTeam?.id || TeamId.A,
                  attackingTeam: attackingTeam?.id || TeamId.B,
                },
              );
              sessionTracker.logTimeout();
              sessionTracker.endGame();

              // FAIL IMMEDIATELY on timeout
              throw new Error(
                `Game ${gameNum} exceeded maximum rounds (${maxRoundsPerGame})`,
              );
            }
          } catch (error) {
            const defendingTeam = gameState?.teams?.find((t) => t.isDefending);
            const attackingTeam = gameState?.teams?.find((t) => !t.isDefending);

            sessionTracker.logError(
              roundCount,
              "fatal_error",
              error instanceof Error ? error.message : String(error),
              {
                defendingTeam: defendingTeam?.id || TeamId.A,
                attackingTeam: attackingTeam?.id || TeamId.B,
              },
            );

            // FAIL IMMEDIATELY on any error
            throw error;
          }
        }
      } finally {
        // ALWAYS generate comprehensive summary report - even on failure
        const detailedSummary = sessionTracker.generateSummary();
        sessionTracker.writeSummary(detailedSummary);
      }

      // Test assertions - if we reach here, all games completed successfully
      const stats = sessionTracker.getStats();
      expect(stats.gamesCompleted).toBe(targetGames);
      expect(stats.gameStats.length).toBe(targetGames);

      // Verify all games completed successfully
      stats.gameStats.forEach((game: GameStats) => {
        expect(game.status).toBe("completed");
        expect(game.winner).toBeDefined();
        expect(game.rounds).toBeGreaterThan(0);
      });
    },
    TARGET_GAMES * GAME_TIMEOUT_SECONDS * 1000,
  ); // Dynamic timeout based on game count
});

// Helper functions for game phases

async function runDealingPhase(
  gameState: GameState,
  _gameId: string,
): Promise<GameState> {
  let state = { ...gameState };

  // Progressive dealing with AI declarations
  while (!isDealingComplete(state)) {
    state = dealNextCard(state);

    // Check for AI trump declarations
    const currentPlayer =
      state.players[state.dealingState?.currentDealingPlayerIndex || 0];
    if (!currentPlayer.isHuman) {
      const declaration = getAITrumpDeclaration(state, currentPlayer.id);
      if (declaration.shouldDeclare && declaration.declaration) {
        // Apply declaration using proper function to ensure logging
        state = makeTrumpDeclaration(state, currentPlayer.id, {
          rank: state.trumpInfo.trumpRank,
          suit: declaration.declaration.suit,
          type: declaration.declaration.type,
          cards: declaration.declaration.cards,
        });
      }
    }
  }

  // Finalize trump declarations
  state = finalizeTrumpDeclaration(state);
  state.gamePhase = GamePhase.KittySwap;

  return state;
}

async function runKittyPhase(
  gameState: GameState,
  _gameId: string,
): Promise<GameState> {
  let state = { ...gameState };

  // Find the player who needs to manage kitty (trump declarer or round starting player)
  const kittyManager = state.players[state.roundStartingPlayerIndex];

  // AI handles kitty swap
  const kittyCards = getAIKittySwap(state, kittyManager.id);

  // Apply kitty swap
  state = putbackKittyCards(state, kittyCards, kittyManager.id);
  state.gamePhase = GamePhase.Playing;

  return state;
}

async function runPlayingPhase(
  gameState: GameState,
  _gameId: string,
): Promise<GameState> {
  let state = { ...gameState };

  // Play until all cards are played
  while (state.players.some((p) => p.hand.length > 0)) {
    // Play one complete trick (4 plays)
    for (let playIndex = 0; playIndex < 4; playIndex++) {
      const currentPlayer = state.players[state.currentPlayerIndex];

      // Get AI move (treating human as AI for unattended test)
      const cardsToPlay = getPlayerMove(state, currentPlayer.id);

      // Process the play
      const result = processPlay(state, cardsToPlay);
      state = result.newState;

      if (result.trickComplete && result.trickWinnerId) {
        // Clear the completed trick and set winner as next player (like real game)
        state = clearCompletedTrick(state);
        break;
      }
    }
  }

  return state;
}

function getPlayerMove(gameState: GameState, playerId: PlayerId): Card[] {
  // For unattended testing, all players (including human) use AI logic with error handling
  const result = getAIMoveWithErrorHandling(gameState);
  if (result.error) {
    throw new Error(`AI move error for ${playerId}: ${result.error}`);
  }
  return result.cards;
}
