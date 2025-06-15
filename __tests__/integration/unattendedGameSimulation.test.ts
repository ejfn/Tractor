

import * as fs from 'fs';
import * as path from 'path';
import { getAIKittySwap, getAITrumpDeclaration } from '../../src/ai/aiLogic';
import { dealNextCard, finalizeTrumpDeclaration, isDealingComplete } from '../../src/game/dealingAndDeclaration';
import { endRound, prepareNextRound } from '../../src/game/gameRoundManager';
import { putbackKittyCards } from '../../src/game/kittyManager';
import { clearCompletedTrick, getAIMoveWithErrorHandling, processPlay } from '../../src/game/playProcessing';
import { GamePhase, GameState, PlayerId, TeamId } from '../../src/types';
import { initializeGame } from '../../src/utils/gameInitialization';
import { gameLogger, LogLevel } from '../../src/utils/gameLogger';
import { disableUnattendedTestMode, enableUnattendedTestMode } from '../../src/utils/testModeOverrides';

// Test session tracking interfaces
interface GameStats {
  gameId: string;
  startTime: number;
  endTime?: number;
  rounds: number;
  winner?: TeamId;
  errorRound?: number;
  errorPhase?: string;
  errorTeamRoles?: {
    defendingTeam: TeamId;
    attackingTeam: TeamId;
  };
  errorMessage?: string;
  status: 'completed' | 'timeout' | 'error';
}

interface SessionStats {
  sessionStartTime: number;
  gamesCompleted: number;
  gameStats: GameStats[];
}

// Test session tracking
class TestSessionTracker {
  private sessionStats: SessionStats;
  private currentGameStats: GameStats | null = null;
  private summaryLogFile: string;

  constructor() {
    this.sessionStats = {
      sessionStartTime: Date.now(),
      gamesCompleted: 0,
      gameStats: [],
    };
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.summaryLogFile = path.join('logs', `${timestamp}-summary.txt`);
  }

  startGame(gameId: string): void {
    this.currentGameStats = {
      gameId,
      startTime: Date.now(),
      rounds: 0,
      status: 'completed',
    };
  }

  endGame(winner?: TeamId): void {
    if (this.currentGameStats) {
      this.currentGameStats.endTime = Date.now();
      this.currentGameStats.winner = winner;
      this.sessionStats.gameStats.push({ ...this.currentGameStats });
      
      if (this.currentGameStats.status === 'completed') {
        this.sessionStats.gamesCompleted++;
      }
    }
    this.currentGameStats = null;
  }

  updateRounds(rounds: number): void {
    if (this.currentGameStats) {
      this.currentGameStats.rounds = rounds;
    }
  }

  logError(errorRound: number, errorPhase: string, errorMessage: string, teamRoles?: { defendingTeam: TeamId; attackingTeam: TeamId }): void {
    if (this.currentGameStats) {
      this.currentGameStats.errorRound = errorRound;
      this.currentGameStats.errorPhase = errorPhase;
      this.currentGameStats.errorMessage = errorMessage;
      this.currentGameStats.errorTeamRoles = teamRoles;
      this.currentGameStats.status = 'error';
    }
  }

  logTimeout(): void {
    if (this.currentGameStats) {
      this.currentGameStats.status = 'timeout';
    }
  }

  generateSummary(): string {
    const totalTime = Date.now() - this.sessionStats.sessionStartTime;
    const totalGames = this.sessionStats.gameStats.length;
    const successfulGames = this.sessionStats.gamesCompleted;
    const failedGames = totalGames - successfulGames;

    let summary = `
UNATTENDED GAME SIMULATION - DETAILED SUMMARY
=============================================

📊 SESSION OVERVIEW
-------------------
• Games Completed: ${successfulGames}
• Games Failed: ${failedGames}
• Total Games: ${totalGames}
• Total Duration: ${(totalTime / 1000).toFixed(2)}s
• Average Game Time: ${successfulGames > 0 ? (totalTime / successfulGames / 1000).toFixed(2) : 'N/A'}s

`;

    // Game-by-game breakdown
    summary += `🎮 GAME-BY-GAME BREAKDOWN
------------------------\n`;

    this.sessionStats.gameStats.forEach((game, index) => {
      const duration = game.endTime ? ((game.endTime - game.startTime) / 1000).toFixed(1) : 'N/A';
      const statusEmoji = game.status === 'completed' ? '✅' : game.status === 'timeout' ? '⏰' : '❌';

      summary += `
${statusEmoji} Game ${index + 1} (${game.gameId})
   Status: ${game.status.toUpperCase()}
   Rounds: ${game.rounds}
   Duration: ${duration}s`;

      if (game.winner) {
        summary += `
   Winner: Team ${game.winner}`;
      }

      if (game.status === 'error' || game.status === 'timeout') {
        summary += `
   ⚠️  ERROR DETAILS:
      Round: ${game.errorRound || 'Unknown'}
      Phase: ${game.errorPhase || 'Unknown'}`;

        if (game.errorTeamRoles) {
          summary += `
      Team Roles: ${game.errorTeamRoles.defendingTeam} defending, ${game.errorTeamRoles.attackingTeam} attacking`;
        }

        if (game.errorMessage) {
          summary += `
      Message: ${game.errorMessage}`;
        }
      }
      summary += '\n';
    });

    // Error analysis
    if (failedGames > 0) {
      summary += `
🚨 ERROR ANALYSIS
----------------`;

      const errorsByPhase: Record<string, number> = {};
      const errorsByRound: Record<number, number> = {};

      this.sessionStats.gameStats.filter(game => game.status === 'error').forEach(game => {
        if (game.errorPhase) {
          errorsByPhase[game.errorPhase] = (errorsByPhase[game.errorPhase] || 0) + 1;
        }
        if (game.errorRound) {
          errorsByRound[game.errorRound] = (errorsByRound[game.errorRound] || 0) + 1;
        }
      });

      if (Object.keys(errorsByPhase).length > 0) {
        summary += `
• Errors by Phase:`;
        Object.entries(errorsByPhase).forEach(([phase, count]) => {
          summary += `
  - ${phase}: ${count} error(s)`;
        });
      }

      if (Object.keys(errorsByRound).length > 0) {
        summary += `
• Errors by Round:`;
        Object.entries(errorsByRound).forEach(([round, count]) => {
          summary += `
  - Round ${round}: ${count} error(s)`;
        });
      }
    }

    summary += `

📁 LOG FILES
------------
• Game Log: ${gameLogger['gameLogFile']} (unified timeline with all events including errors)
• Summary: ${this.summaryLogFile}

🔍 NEXT STEPS
-------------`;

    if (failedGames > 0) {
      summary += `
• Review error log for AI rule violations and game logic issues
• Check patterns in error phases and rounds
• Investigate team role configurations that lead to errors`;
    } else {
      summary += `
• All games completed successfully! 🎉
• Review main log for performance patterns
• Consider increasing test complexity or game count`;
    }

    summary += `
• Analyze AI decision patterns in main log
• Verify card counting and game state consistency
`;

    return summary;
  }

  writeSummary(summary: string): void {
    try {
      fs.writeFileSync(this.summaryLogFile, summary);
    } catch (error) {
      console.error('Failed to write summary file:', error);
    }
    
    console.log('\n' + '='.repeat(80));
    console.log(summary);
    console.log('='.repeat(80));
  }

  getStats(): SessionStats {
    return this.sessionStats;
  }
}

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
 * npm run test:integration
 */

describe('Unattended Game Integration', () => {

  // Test configuration
  const TARGET_GAMES = 1; // Number of games to run for reliability testing
  const GAME_TIMEOUT_SECONDS = 30; // Timeout per game in seconds
  const MAX_ROUNDS_PER_GAME = 50; // Safety limit for rounds per game

  beforeAll(() => {
    // Enable test mode for speed optimizations
    enableUnattendedTestMode();
    
    // Configure logging for debug analysis
    gameLogger.setLogLevel(LogLevel.DEBUG);
    gameLogger.setTestMode(true);
  });

  afterAll(() => {
    disableUnattendedTestMode();
  });

  test('Complete unattended game simulation with AI players', async () => {
    const targetGames = TARGET_GAMES;
    const maxRoundsPerGame = MAX_ROUNDS_PER_GAME;
    const startTime = Date.now();
    const gameId = `game-${Date.now()}`;

    // Initialize session tracking
    const sessionTracker = new TestSessionTracker();
    gameLogger.info('test_session_start', {
      targetGames,
      maxRoundsPerGame,
      timestamp: new Date().toISOString()
    });

    for (let gameNum = 1; gameNum <= targetGames; gameNum++) {
      const currentGameId = `${gameId}-${gameNum}`;
      let roundCount = 0;
      let gameWinner: TeamId | null = null;
      let gameState: GameState | undefined;
      
      try {
        gameLogger.setCurrentGameId(currentGameId);
        sessionTracker.startGame(currentGameId);
        gameLogger.info('game_start', {
          gameId: currentGameId,
          teams: {
            A: { players: ['human', 'bot2'], defending: true },
            B: { players: ['bot1', 'bot3'], defending: false }
          },
          players: ['human', 'bot1', 'bot2', 'bot3'],
          timestamp: new Date().toISOString()
        });

        // Initialize game
        gameState = initializeGame();

        // Game loop: continue until victory condition
        while (!gameWinner && roundCount < maxRoundsPerGame) {
          roundCount++;
          
          const defendingTeam = gameState.teams.find(t => t.isDefending);
          const attackingTeam = gameState.teams.find(t => !t.isDefending);
          
          // Round tracking happens automatically in game phases
          

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
            gameLogger.info('game_end', {
              gameId: currentGameId,
              winner: gameWinner,
              rounds: roundCount,
              duration_ms: Date.now() - startTime
            });
            sessionTracker.endGame(gameWinner);
            break;
          }

          // Prepare next round
          gameState = prepareNextRound(gameState, roundResult);
        }

        if (!gameWinner) {
          const defendingTeam = gameState.teams.find(t => t.isDefending);
          const attackingTeam = gameState.teams.find(t => !t.isDefending);
          
          sessionTracker.logError(
            roundCount, 
            'timeout', 
            `Game exceeded maximum rounds (${maxRoundsPerGame})`,
            {
              defendingTeam: defendingTeam?.id || TeamId.A,
              attackingTeam: attackingTeam?.id || TeamId.B
            }
          );
          sessionTracker.logTimeout();
          sessionTracker.endGame();
          
          // FAIL IMMEDIATELY on timeout
          throw new Error(`Game ${gameNum} exceeded maximum rounds (${maxRoundsPerGame})`);
        }

      } catch (error) {
        const defendingTeam = gameState?.teams?.find((t: any) => t.isDefending);
        const attackingTeam = gameState?.teams?.find((t: any) => !t.isDefending);
        
        sessionTracker.logError(
          roundCount,
          'fatal_error',
          error instanceof Error ? error.message : String(error),
          {
            defendingTeam: defendingTeam?.id || TeamId.A,
            attackingTeam: attackingTeam?.id || TeamId.B
          }
        );
        sessionTracker.endGame();
        
        // FAIL IMMEDIATELY on any error
        throw error;
      }
    }

    // Generate comprehensive summary report
    const detailedSummary = sessionTracker.generateSummary();
    sessionTracker.writeSummary(detailedSummary);

    // Test assertions - if we reach here, all games completed successfully
    const stats = sessionTracker.getStats();
    expect(stats.gamesCompleted).toBe(targetGames);
    expect(stats.gameStats.length).toBe(targetGames);
    
    // Verify all games completed successfully
    stats.gameStats.forEach((game, index) => {
      expect(game.status).toBe('completed');
      expect(game.winner).toBeDefined();
      expect(game.rounds).toBeGreaterThan(0);
    });
  }, TARGET_GAMES * GAME_TIMEOUT_SECONDS * 1000); // Dynamic timeout based on game count
});

// Helper functions for game phases

async function runDealingPhase(gameState: GameState, gameId: string): Promise<GameState> {
  let state = { ...gameState };
  
  // Progressive dealing with AI declarations
  while (!isDealingComplete(state)) {
    state = dealNextCard(state);
    
    // Check for AI trump declarations
    const currentPlayer = state.players[state.dealingState?.currentDealingPlayerIndex || 0];
    if (!currentPlayer.isHuman) {
      const declaration = getAITrumpDeclaration(state, currentPlayer.id);
      if (declaration.shouldDeclare && declaration.declaration) {
        // Apply declaration to state (simplified)
        state.trumpDeclarationState!.currentDeclaration = {
          playerId: currentPlayer.id,
          rank: gameState.trumpInfo.trumpRank,
          suit: declaration.declaration.suit,
          type: declaration.declaration.type,
          cards: declaration.declaration.cards,
          timestamp: Date.now()
        };
      }
    }
  }
  
  // Finalize trump declarations
  state = finalizeTrumpDeclaration(state);
  state.gamePhase = GamePhase.KittySwap;
  
  return state;
}

async function runKittyPhase(gameState: GameState, gameId: string): Promise<GameState> {
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

async function runPlayingPhase(gameState: GameState, gameId: string): Promise<GameState> {
  let state = { ...gameState };
  let trickNumber = 0;
  
  // Play until all cards are played
  while (state.players.some(p => p.hand.length > 0)) {
    trickNumber++;
    
    const leadingPlayer = state.players[state.currentPlayerIndex];
    
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

function getPlayerMove(gameState: GameState, playerId: PlayerId): any[] {
  // For unattended testing, all players (including human) use AI logic with error handling
  const result = getAIMoveWithErrorHandling(gameState);
  if (result.error) {
    throw new Error(`AI move error for ${playerId}: ${result.error}`);
  }
  return result.cards;
}