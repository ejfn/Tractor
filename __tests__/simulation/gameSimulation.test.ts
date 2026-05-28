// Dynamic imports for Node.js modules (test environment only)
import * as fs from "fs";
import * as path from "path";

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
  getAIMoveWithErrorHandlingAsync,
  processPlay,
} from "../../src/game/playProcessing";
import {
  getLLMFallbackStats,
  resetLLMStats,
} from "../../src/ai/llm/llmAIStrategy";
import { Card, GamePhase, GameState, PlayerId, TeamId } from "../../src/types";
import { initializeGame } from "../../src/utils/gameInitialization";
import { gameLogger, LogLevel } from "../../src/utils/gameLogger";
import { GameStats, TestSessionTracker } from "../helpers";

// Load local .env variables specifically for this simulation test run
try {
  const envPath = path.resolve(__dirname, "../../.env");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    const lines = envContent.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1);
        }
        if (process.env[key] === undefined) {
          process.env[key] = val;
        }
      }
    }
  }
} catch {
  // Ignore error
}

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
  const TARGET_GAMES = parseInt(
    process.env.TARGET_GAMES ||
      (process.env.LLM_ENABLED === "true" ? "4" : "3"),
    10,
  ); // Number of games to run for reliability testing
  const LOG_LEVEL_STR = (process.env.LOG_LEVEL || "INFO").toUpperCase();
  const LOG_LEVEL: LogLevel =
    (LogLevel[LOG_LEVEL_STR as keyof typeof LogLevel] as LogLevel) ||
    LogLevel.INFO;
  const GAME_TIMEOUT_SECONDS =
    process.env.LLM_ENABLED === "true"
      ? TARGET_GAMES * 1200 // Extended timeout for live API calls (20 minutes per game)
      : TARGET_GAMES * 10; // Dynamic timeout based on number of games
  const MAX_ROUNDS_PER_GAME = parseInt(process.env.MAX_ROUNDS || "60", 10); // Safety limit for rounds per game

  test(
    "Complete unattended game simulation with AI players",
    async () => {
      // Reset LLM metrics at the start of simulation
      resetLLMStats();

      const targetGames = TARGET_GAMES;
      const maxRoundsPerGame = MAX_ROUNDS_PER_GAME;
      const timestamp = new Date().toISOString();
      const gameId = Date.now();

      // Initialize session tracking with shared timestamp
      const sessionTracker = new TestSessionTracker(timestamp, "logs");

      // Inject configuration into localStorage mock if LLM is enabled
      const originalGetItem = global.localStorage.getItem;
      if (process.env.LLM_ENABLED === "true") {
        const apiKey = process.env.OPENROUTER_API_KEY || "";
        global.localStorage.getItem = jest.fn().mockImplementation((key) => {
          if (key === "tractor_llm_config") {
            return JSON.stringify({
              enabled: true,
              apiKey,
              model:
                process.env.LLM_MODEL ||
                process.env.OPENROUTER_MODEL ||
                "meta-llama/llama-3.3-70b-instruct",
              apiUrl:
                process.env.OPENROUTER_API_URL ||
                "https://openrouter.ai/api/v1/chat/completions",
              timeoutMs: 25000,
              applyToPlayers: ["bot1", "bot2", "bot3"],
            });
          }
          return null;
        });
      }

      try {
        for (let gameNum = 1; gameNum <= targetGames; gameNum++) {
          const padding = String(targetGames).length;
          const paddedGameNum = String(gameNum).padStart(padding, "0");
          const currentGameId = `${gameId}-${paddedGameNum}`;
          let roundCount = 0;
          let gameWinner: TeamId | null = null;
          let gameState: GameState | undefined;

          // Configure the singleton gameLogger to capture all game events to file
          gameLogger.configure({
            logLevel: LOG_LEVEL,
            enableFileLogging: true,
            enableConsoleLog: false, // Disable console output for clean unattended test
            includePlayerHands: false, // Do not log sensitive player hands
            logDir: "logs",
            logFileName: `${timestamp}-game-${paddedGameNum}.log`,
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

              // Check for LLM Telemetry failures and stop immediately if thresholds are exceeded
              if (process.env.LLM_ENABLED === "true") {
                const llmStats = getLLMFallbackStats();

                // Configurable thresholds
                const maxApiErrors = parseInt(process.env.MAX_LLM_API_ERRORS || "3", 10);
                const maxInvalidPlays = parseInt(process.env.MAX_LLM_INVALID_PLAYS || "10", 10);

                if (llmStats.apiErrorFallbacks > maxApiErrors) {
                  throw new Error(
                    `Simulation aborted: API error count (${llmStats.apiErrorFallbacks}) exceeded limit of ${maxApiErrors}.`,
                  );
                }

                const totalInvalids = llmStats.invalidCardRetries + llmStats.invalidCardFallbacks;
                if (totalInvalids > maxInvalidPlays) {
                  throw new Error(
                    `Simulation aborted: Invalid play count (${totalInvalids}) exceeded limit of ${maxInvalidPlays}.`,
                  );
                }
              }

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
              const isIntentionallyLimited = !!process.env.MAX_ROUNDS;

              if (!isIntentionallyLimited) {
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
              } else {
                // Intentionally limited to N rounds - treat as clean success
                sessionTracker.endGame(undefined, {
                  teamA:
                    gameState.teams.find((t) => t.id === "A")?.currentRank ||
                    "2",
                  teamB:
                    gameState.teams.find((t) => t.id === "B")?.currentRank ||
                    "2",
                });
              }
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
        // Restore original localStorage mock
        global.localStorage.getItem = originalGetItem;

        // ALWAYS generate comprehensive summary report - even on failure
        let detailedSummary = sessionTracker.generateSummary();

        // Append LLM metrics if any LLM plays were requested
        const llmStats = getLLMFallbackStats();
        if (llmStats.totalPlaysRequested > 0) {
          detailedSummary += `
🤖 LLM PLAY DECISION TELEMETRY
------------------------------
• Total LLM Plays Requested: ${llmStats.totalPlaysRequested}
• Successful LLM Plays: ${llmStats.successfulPlays} (${llmStats.successRate.toFixed(1)}%)
• LLM Plays API / Timeout Fallbacks: ${llmStats.apiErrorFallbacks}
• LLM Invalid Card Rule Violations Retried: ${llmStats.invalidCardRetries}
• LLM Invalid Card Retries Exhausted Fallbacks: ${llmStats.invalidCardFallbacks}
• Overall Telemetry Success Rate: ${llmStats.successRate.toFixed(1)}%
• Overall Telemetry Fallback Rate: ${llmStats.fallbackRate.toFixed(1)}%
`;
        }

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
      const cardsToPlay = await getPlayerMove(state, currentPlayer.id);

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

async function getPlayerMove(
  gameState: GameState,
  playerId: PlayerId,
): Promise<Card[]> {
  // For unattended testing, all players (including human) use AI logic with error handling
  const result = await getAIMoveWithErrorHandlingAsync(gameState);
  if (result.error) {
    throw new Error(`AI move error for ${playerId}: ${result.error}`);
  }
  return result.cards;
}
