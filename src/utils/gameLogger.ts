import { PlayerId } from "../types";

/**
 * Simple Game Logging System
 *
 * Provides basic logging functionality:
 * - Multiple log levels (DEBUG, INFO, WARN, ERROR)
 * - Structured JSON output for easy parsing
 * - File output with timestamps
 * - Console output with formatting
 */

export enum LogLevel {
  DEBUG = "DEBUG",
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  event: string;
  gameId?: string;
  roundNumber?: number;
  trickNumber?: number;
  playerId?: PlayerId;
  data?: unknown;
  message?: string;
}

class GameLogger {
  private static instance: GameLogger;
  private logLevel: LogLevel = LogLevel.INFO;
  private logDir: string = "logs";
  private sessionTimestamp: string;
  private gameLogFile: string = "";
  private isTestMode: boolean = false;
  private currentGameId: string | null = null;

  constructor() {
    this.sessionTimestamp = new Date().toISOString().replace(/[:.]/g, "-");
    this.setupLogFiles();
  }

  public static getInstance(): GameLogger {
    if (!GameLogger.instance) {
      GameLogger.instance = new GameLogger();
    }
    return GameLogger.instance;
  }

  private setupLogFiles(): void {
    // Only setup file logging in test environments (Node.js)
    if (typeof require !== "undefined") {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const fs = require("fs");
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const path = require("path");

        // Create logs directory if it doesn't exist
        if (!fs.existsSync(this.logDir)) {
          fs.mkdirSync(this.logDir, { recursive: true });
        }

        // Set up session-level files
        this.gameLogFile = path.join(
          this.logDir,
          `${this.sessionTimestamp}-game.log`,
        );
      } catch {
        // File system not available (React Native environment)
        this.gameLogFile = "";
      }
    } else {
      // File system not available (React Native environment)
      this.gameLogFile = "";
    }
  }

  public setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  public setTestMode(enabled: boolean): void {
    this.isTestMode = enabled;
  }

  public setCurrentGameId(gameId: string | null): void {
    this.currentGameId = gameId;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [
      LogLevel.DEBUG,
      LogLevel.INFO,
      LogLevel.WARN,
      LogLevel.ERROR,
    ];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const requestedLevelIndex = levels.indexOf(level);
    return requestedLevelIndex >= currentLevelIndex;
  }

  private formatTimestamp(): string {
    return new Date().toISOString();
  }

  private writeToFile(content: string, filePath: string): void {
    // Only write to file in test environments (Node.js)
    if (typeof require !== "undefined" && filePath) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const fs = require("fs");
        fs.appendFileSync(filePath, content + "\n");
      } catch (error) {
        console.error(`Failed to write to log file ${filePath}:`, error);
      }
    }
  }

  private log(
    level: LogLevel,
    event: string,
    data?: unknown,
    message?: string,
  ): void {
    if (!this.shouldLog(level)) return;

    const logEntry: LogEntry = {
      timestamp: this.formatTimestamp(),
      level,
      event,
      gameId: this.currentGameId || undefined,
      data,
      message,
    };

    // Write structured JSON to main log file (includes all levels including errors)
    if (this.isTestMode) {
      this.writeToFile(JSON.stringify(logEntry), this.gameLogFile);
    }

    // Console output with formatting
    this.logToConsole(logEntry);
  }

  private logToConsole(entry: LogEntry): void {
    const timestamp = entry.timestamp.split("T")[1]?.split(".")[0] || "";
    const gameId = entry.gameId ? `[${entry.gameId}] ` : "";
    const level = entry.level.padEnd(5);

    let colorCode = "";
    const resetCode = "\x1b[0m";

    switch (entry.level) {
      case LogLevel.DEBUG:
        colorCode = "\x1b[36m";
        break; // Cyan
      case LogLevel.INFO:
        colorCode = "\x1b[32m";
        break; // Green
      case LogLevel.WARN:
        colorCode = "\x1b[33m";
        break; // Yellow
      case LogLevel.ERROR:
        colorCode = "\x1b[31m";
        break; // Red
    }

    const message = entry.message || "";
    const dataStr = entry.data ? ` | ${JSON.stringify(entry.data)}` : "";

    console.log(
      `${colorCode}[${timestamp}] ${level} ${gameId}${entry.event}${resetCode}${message ? ` - ${message}` : ""}${dataStr}`,
    );
  }

  public debug(event: string, data?: unknown, message?: string): void {
    this.log(LogLevel.DEBUG, event, data, message);
  }

  public info(event: string, data?: unknown, message?: string): void {
    this.log(LogLevel.INFO, event, data, message);
  }

  public warn(event: string, data?: unknown, message?: string): void {
    this.log(LogLevel.WARN, event, data, message);
  }

  public error(event: string, data?: unknown, message?: string): void {
    this.log(LogLevel.ERROR, event, data, message);
  }
}

// Export singleton instance
export const gameLogger = GameLogger.getInstance();

// Export static methods for convenience
export const debug = (event: string, data?: unknown, message?: string) =>
  gameLogger.debug(event, data, message);
export const info = (event: string, data?: unknown, message?: string) =>
  gameLogger.info(event, data, message);
export const warn = (event: string, data?: unknown, message?: string) =>
  gameLogger.warn(event, data, message);
export const error = (event: string, data?: unknown, message?: string) =>
  gameLogger.error(event, data, message);
