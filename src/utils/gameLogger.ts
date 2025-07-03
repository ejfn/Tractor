import { PlayerId } from "../types";
import { getAppVersion } from "./versioning";

const APP_VERSION: string | undefined = getAppVersion();

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
  sequenceNumber: number;
  appVersion?: string; // Added appVersion field
  gameId?: string;
  roundNumber?: number;
  trickNumber?: number;
  playerId?: PlayerId;
  data?: unknown;
  message?: string;
}

export interface GameLoggerConfig {
  logLevel?: LogLevel;
  enableFileLogging?: boolean;
  enableConsoleLog?: boolean;
  includePlayerHands?: boolean;
  logFileName?: string;
  logDir?: string;
  gameId?: string;
}

class GameLogger {
  private static instance: GameLogger;
  private logLevel: LogLevel = LogLevel.INFO;
  private logDir: string = "logs";
  private gameLogFile: string = "";
  private enableFileLogging: boolean = false;
  private enableConsoleLog: boolean = true;
  private includePlayerHands: boolean = true;
  private currentGameId: string | null = null;
  private sequenceNumber = 0;

  constructor(config?: GameLoggerConfig) {
    if (config) {
      this.configure(config);
    }
  }

  public static getInstance(): GameLogger {
    if (!GameLogger.instance) {
      GameLogger.instance = new GameLogger();
    }
    return GameLogger.instance;
  }

  private setupLogFiles(): void {
    // Only setup file logging in test environments (Node.js) and when enabled
    if (typeof require !== "undefined" && this.enableFileLogging) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const fs = require("fs");
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const path = require("path");

        // Create logs directory if it doesn't exist
        if (!fs.existsSync(this.logDir)) {
          fs.mkdirSync(this.logDir, { recursive: true });
        }

        // Ensure gameLogFile has full path if it's just a filename
        if (this.gameLogFile && !path.isAbsolute(this.gameLogFile)) {
          this.gameLogFile = path.join(this.logDir, this.gameLogFile);
        }
      } catch {
        // File system not available (React Native environment)
        this.gameLogFile = "";
        this.enableFileLogging = false;
      }
    }
  }

  public setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  public setCurrentGameId(gameId: string | null): void {
    this.currentGameId = gameId;
  }

  public isPlayerHandsIncluded(): boolean {
    return this.includePlayerHands;
  }

  public configure(config: GameLoggerConfig): void {
    if (config.logLevel !== undefined) {
      this.logLevel = config.logLevel;
    }

    if (config.logDir !== undefined) {
      this.logDir = config.logDir;
    }

    if (config.gameId !== undefined) {
      this.currentGameId = config.gameId;
    }

    if (config.enableConsoleLog !== undefined) {
      this.enableConsoleLog = config.enableConsoleLog;
    }

    if (config.includePlayerHands !== undefined) {
      this.includePlayerHands = config.includePlayerHands;
    }

    if (config.enableFileLogging) {
      this.enableFileLogging = true;
      if (config.logFileName) {
        if (this.gameLogFile !== config.logFileName) {
          this.sequenceNumber = 0; // Reset sequence on file change
        }
        this.gameLogFile = config.logFileName;
      } else {
        // Generate default filename when file logging is enabled
        const sessionTimestamp = new Date().toISOString().replace(/[:.]/g, "-");
        this.gameLogFile = `${sessionTimestamp}-game.log`;
        this.sequenceNumber = 0;
      }
      this.setupLogFiles();
    }
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
    // Only write to file when file logging is enabled and in Node.js environment
    if (typeof require !== "undefined" && this.enableFileLogging && filePath) {
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

    this.sequenceNumber++;

    const logEntry: LogEntry = {
      timestamp: this.formatTimestamp(),
      level,
      event,
      sequenceNumber: this.sequenceNumber,
      appVersion: APP_VERSION, // Include appVersion
      gameId: this.currentGameId || undefined,
      data,
      message,
    };

    // Write structured JSON to main log file when file logging is enabled
    if (this.enableFileLogging && this.gameLogFile) {
      this.writeToFile(JSON.stringify(logEntry), this.gameLogFile);
    }

    // Console output with formatting (if enabled)
    if (this.enableConsoleLog) {
      this.logToConsole(logEntry);
    }
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

// Export class for creating isolated instances in tests
export { GameLogger };

// Export singleton instance for normal app usage (backward compatibility)
export const gameLogger = GameLogger.getInstance();

// Export static methods for convenience (operate on singleton instance)
export const debug = (event: string, data?: unknown, message?: string) =>
  gameLogger.debug(event, data, message);
export const info = (event: string, data?: unknown, message?: string) =>
  gameLogger.info(event, data, message);
export const warn = (event: string, data?: unknown, message?: string) =>
  gameLogger.warn(event, data, message);
export const error = (event: string, data?: unknown, message?: string) =>
  gameLogger.error(event, data, message);
