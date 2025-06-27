// Dynamic imports for Node.js modules (test environment only)
import * as fs from "fs";
import * as path from "path";
import { TeamId } from "../../src/types";
import { gameLogger } from "../../src/utils/gameLogger";

// Test session tracking interfaces
export interface GameStats {
  gameId: string;
  startTime: number;
  endTime?: number;
  rounds: number;
  winner?: TeamId;
  finalTeamRanks?: {
    teamA: string;
    teamB: string;
  };
  errorRound?: number;
  errorPhase?: string;
  errorTeamRoles?: {
    defendingTeam: TeamId;
    attackingTeam: TeamId;
  };
  errorMessage?: string;
  status: "completed" | "timeout" | "error";
}

export interface SessionStats {
  sessionStartTime: number;
  gamesCompleted: number;
  gameStats: GameStats[];
}

// Test session tracking
export class TestSessionTracker {
  private sessionStats: SessionStats;
  private currentGameStats: GameStats | null = null;
  private summaryLogFile: string;
  private timestamp: string;
  private logDir: string;

  constructor(timestamp: string, logDir = "logs") {
    this.sessionStats = {
      sessionStartTime: Date.now(),
      gamesCompleted: 0,
      gameStats: [],
    };
    this.timestamp = timestamp;
    this.logDir = logDir;
    this.summaryLogFile = path.join(this.logDir, `${timestamp}-summary.txt`);
  }

  startGame(gameId: string): void {
    this.currentGameStats = {
      gameId,
      startTime: Date.now(),
      rounds: 0,
      status: "error", // Default until completed
    };
  }

  updateRounds(rounds: number): void {
    if (this.currentGameStats) {
      this.currentGameStats.rounds = rounds;
    }
  }

  endGame(
    winner?: TeamId,
    finalTeamRanks?: { teamA: string; teamB: string },
  ): void {
    if (this.currentGameStats) {
      this.currentGameStats.endTime = Date.now();
      this.currentGameStats.status = "completed";
      this.currentGameStats.winner = winner;
      this.currentGameStats.finalTeamRanks = finalTeamRanks;
      this.sessionStats.gameStats.push(this.currentGameStats);
      this.sessionStats.gamesCompleted++;
      this.currentGameStats = null;
    }
  }

  logError(
    round: number,
    phase: string,
    message: string,
    teamRoles?: { defendingTeam: TeamId; attackingTeam: TeamId },
  ): void {
    if (this.currentGameStats) {
      this.currentGameStats.errorRound = round;
      this.currentGameStats.errorPhase = phase;
      this.currentGameStats.errorMessage = message;
      this.currentGameStats.errorTeamRoles = teamRoles;
      this.currentGameStats.status = "error";
    }
  }

  logTimeout(): void {
    if (this.currentGameStats) {
      this.currentGameStats.status = "timeout";
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
• Average Game Time: ${successfulGames > 0 ? (totalTime / successfulGames / 1000).toFixed(2) : "N/A"}s

`;

    // Game-by-game breakdown
    summary += `🎮 GAME-BY-GAME BREAKDOWN
------------------------\n`;

    this.sessionStats.gameStats.forEach((game, index) => {
      const duration = game.endTime
        ? ((game.endTime - game.startTime) / 1000).toFixed(1)
        : "N/A";

      const statusEmoji =
        game.status === "completed"
          ? "✅"
          : game.status === "timeout"
            ? "⏰"
            : "❌";

      summary += `
${statusEmoji} Game ${index + 1} (${game.gameId})
   Status: ${game.status.toUpperCase()}
   Rounds: ${game.rounds}
   Duration: ${duration}s`;

      if (game.winner) {
        summary += `
   Winner: Team ${game.winner}`;
      }

      if (game.finalTeamRanks && game.winner) {
        const otherTeam = game.winner === "A" ? "B" : "A";
        const otherTeamRank =
          game.winner === "A"
            ? game.finalTeamRanks.teamB
            : game.finalTeamRanks.teamA;
        summary += `
   Team ${otherTeam}: ${otherTeamRank}`;
      }

      if (game.status === "error" || game.status === "timeout") {
        summary += `
   ⚠️  ERROR DETAILS:
      Round: ${game.errorRound || "Unknown"}
      Phase: ${game.errorPhase || "Unknown"}`;

        if (game.errorTeamRoles) {
          summary += `
      Team Roles: ${game.errorTeamRoles.defendingTeam} defending, ${game.errorTeamRoles.attackingTeam} attacking`;
        }

        if (game.errorMessage) {
          summary += `
      Message: ${game.errorMessage}`;
        }
      }
      summary += "\n";
    });

    // Error analysis
    if (failedGames > 0) {
      summary += `
🚨 ERROR ANALYSIS
----------------`;

      const errorsByPhase: Record<string, number> = {};
      const errorsByRound: Record<number, number> = {};

      this.sessionStats.gameStats
        .filter((game) => game.status === "error" || game.status === "timeout")
        .forEach((game) => {
          if (game.errorPhase) {
            errorsByPhase[game.errorPhase] =
              (errorsByPhase[game.errorPhase] || 0) + 1;
          }
          if (game.errorRound !== undefined) {
            errorsByRound[game.errorRound] =
              (errorsByRound[game.errorRound] || 0) + 1;
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
• Game Log: ${this.logDir}/${this.timestamp}-x-game.log (unified timeline with all events including errors)
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
      gameLogger.error(
        "test_summary_write_failed",
        { error },
        "Failed to write summary file: " + String(error),
      );
    }
  }

  getStats(): SessionStats {
    return this.sessionStats;
  }
}
