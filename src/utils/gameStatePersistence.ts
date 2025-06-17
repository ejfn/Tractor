import AsyncStorage from "@react-native-async-storage/async-storage";
import { GameState, GamePhase, Card } from "../types";
import { gameLogger } from "./gameLogger";

/**
 * Game State Persistence - Local Storage Integration
 *
 * Provides automatic game state persistence using AsyncStorage with user-friendly
 * restoration options on app startup.
 */

/**
 * Recursively deserialize a game state, converting plain Card objects back to Card instances
 */
function deserializeGameState(gameState: unknown): GameState {
  // Deep clone the game state to avoid modifying the original
  const deserializedState = JSON.parse(JSON.stringify(gameState)) as GameState;

  // Deserialize cards in player hands
  if (deserializedState.players && Array.isArray(deserializedState.players)) {
    deserializedState.players.forEach((player) => {
      if (player.hand && Array.isArray(player.hand)) {
        player.hand = player.hand.map(Card.deserializeCard);
      }
    });
  }

  // Deserialize cards in kittyCards
  if (
    deserializedState.kittyCards &&
    Array.isArray(deserializedState.kittyCards)
  ) {
    deserializedState.kittyCards = deserializedState.kittyCards.map(
      Card.deserializeCard,
    );
  }

  // Deserialize cards in trump declarations
  if (deserializedState.trumpDeclarationState) {
    // Deserialize current declaration cards
    if (deserializedState.trumpDeclarationState.currentDeclaration) {
      const currentDecl =
        deserializedState.trumpDeclarationState.currentDeclaration;
      if (currentDecl.cards && Array.isArray(currentDecl.cards)) {
        currentDecl.cards = currentDecl.cards.map(Card.deserializeCard);
      }
    }

    // Deserialize declaration history cards
    if (deserializedState.trumpDeclarationState.declarationHistory) {
      deserializedState.trumpDeclarationState.declarationHistory.forEach(
        (declaration) => {
          if (declaration.cards && Array.isArray(declaration.cards)) {
            declaration.cards = declaration.cards.map(Card.deserializeCard);
          }
        },
      );
    }
  }

  // Deserialize cards in dealing state
  if (deserializedState.dealingState) {
    if (deserializedState.dealingState.lastDealtCard) {
      deserializedState.dealingState.lastDealtCard = Card.deserializeCard(
        deserializedState.dealingState.lastDealtCard,
      );
    }
  }

  // Deserialize cards in current trick
  if (deserializedState.currentTrick) {
    // Deserialize cards in plays
    if (
      deserializedState.currentTrick.plays &&
      Array.isArray(deserializedState.currentTrick.plays)
    ) {
      deserializedState.currentTrick.plays.forEach((play) => {
        if (play.cards && Array.isArray(play.cards)) {
          play.cards = play.cards.map(Card.deserializeCard);
        }
      });
    }
  }

  // Deserialize cards in tricks history
  if (deserializedState.tricks && Array.isArray(deserializedState.tricks)) {
    deserializedState.tricks.forEach((trick) => {
      // Deserialize cards in historical plays
      if (trick.plays && Array.isArray(trick.plays)) {
        trick.plays.forEach((play) => {
          if (play.cards && Array.isArray(play.cards)) {
            play.cards = play.cards.map(Card.deserializeCard);
          }
        });
      }
    });
  }

  return deserializedState as GameState;
}

export interface PersistedGameState {
  gameState: GameState;
  timestamp: number;
  version: string; // For migration compatibility
  gameId: string; // Unique identifier
  isComplete: boolean;
  metadata: {
    roundNumber: number;
    gamePhase: GamePhase;
    playerCount: number;
    estimatedTimeRemaining?: number; // Optional future enhancement
  };
}

export interface GameSaveResult {
  success: boolean;
  error?: string;
  savedAt?: number;
}

export interface GameLoadResult {
  success: boolean;
  gameState?: GameState;
  metadata?: PersistedGameState["metadata"];
  error?: string;
  timestamp?: number;
}

// Storage keys
const STORAGE_KEYS = {
  CURRENT_GAME: "tractor_current_game",
  GAME_SETTINGS: "tractor_game_settings",
  LAST_SAVE_TIME: "tractor_last_save_time",
} as const;

// Current version for migration compatibility
const PERSISTENCE_VERSION = "1.0.0";

/**
 * Storage Manager - AsyncStorage wrapper with error handling
 */
const StorageManager = {
  MAX_RETRIES: 3,
  RETRY_DELAY: 100, // ms

  /**
   * Simple delay utility
   */
  delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  },

  /**
   * Safely store data with retry logic
   */
  async setItem(key: string, value: string, retries = 0): Promise<boolean> {
    try {
      await AsyncStorage.setItem(key, value);
      return true;
    } catch (error) {
      gameLogger.warn("storage_set_error", {
        key,
        error: error instanceof Error ? error.message : "Unknown error",
        attempt: retries + 1,
      });

      if (retries < this.MAX_RETRIES) {
        await this.delay(this.RETRY_DELAY * (retries + 1));
        return this.setItem(key, value, retries + 1);
      }

      return false;
    }
  },

  /**
   * Safely retrieve data with retry logic
   */
  async getItem(key: string, retries = 0): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      gameLogger.warn("storage_get_error", {
        key,
        error: error instanceof Error ? error.message : "Unknown error",
        attempt: retries + 1,
      });

      if (retries < this.MAX_RETRIES) {
        await this.delay(this.RETRY_DELAY * (retries + 1));
        return this.getItem(key, retries);
      }

      return null;
    }
  },

  /**
   * Remove data from storage
   */
  async removeItem(key: string): Promise<boolean> {
    try {
      await AsyncStorage.removeItem(key);
      return true;
    } catch (error) {
      gameLogger.warn("storage_remove_error", {
        key,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return false;
    }
  },
};

/**
 * Validation Service - Saved state integrity checking
 */
const ValidationService = {
  /**
   * Validate core game state structure
   */
  validateGameState(gameState: unknown): boolean {
    if (!gameState || typeof gameState !== "object") {
      return false;
    }

    const state = gameState as Record<string, unknown>;

    // Check essential fields
    const required = [
      "players",
      "teams",
      "gamePhase",
      "roundNumber",
      "currentPlayerIndex",
    ];
    for (const field of required) {
      if (!(field in state)) {
        gameLogger.warn("validation_gamestate_missing_field", { field });
        return false;
      }
    }

    // Validate players array
    if (!Array.isArray(state.players) || state.players.length !== 4) {
      gameLogger.warn("validation_invalid_players", {
        playersType: typeof state.players,
        playersLength: Array.isArray(state.players)
          ? state.players.length
          : "not array",
      });
      return false;
    }

    // Validate teams array
    if (!Array.isArray(state.teams) || state.teams.length !== 2) {
      gameLogger.warn("validation_invalid_teams", {
        teamsType: typeof state.teams,
        teamsLength: Array.isArray(state.teams)
          ? state.teams.length
          : "not array",
      });
      return false;
    }

    // Validate game phase
    const validPhases = Object.values(GamePhase);
    if (!validPhases.includes(state.gamePhase as GamePhase)) {
      gameLogger.warn("validation_invalid_game_phase", {
        gamePhase: state.gamePhase,
        validPhases,
      });
      return false;
    }

    // Validate player index
    const currentPlayerIndex = state.currentPlayerIndex as number;
    if (currentPlayerIndex < 0 || currentPlayerIndex >= 4) {
      gameLogger.warn("validation_invalid_player_index", {
        currentPlayerIndex,
      });
      return false;
    }

    return true;
  },

  /**
   * Validate that a persisted game state is valid and can be safely restored
   */
  validatePersistedState(
    persistedState: unknown,
  ): persistedState is PersistedGameState {
    try {
      // Basic structure validation
      if (!persistedState || typeof persistedState !== "object") {
        return false;
      }

      const state = persistedState as Record<string, unknown>;

      const required = [
        "gameState",
        "timestamp",
        "version",
        "gameId",
        "isComplete",
        "metadata",
      ];
      for (const field of required) {
        if (!(field in state)) {
          gameLogger.warn("validation_missing_field", { field });
          return false;
        }
      }

      // Version compatibility check
      if (state.version !== PERSISTENCE_VERSION) {
        gameLogger.warn("validation_version_mismatch", {
          saved: state.version,
          current: PERSISTENCE_VERSION,
        });
        // For now, reject different versions. Future: implement migration
        return false;
      }

      // Game state validation
      const gameState = state.gameState;
      if (!this.validateGameState(gameState)) {
        return false;
      }

      // Timestamp validation (not too old)
      const now = Date.now();
      const savedTime = state.timestamp as number;
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

      if (now - savedTime > maxAge) {
        gameLogger.warn("validation_state_too_old", {
          savedTime,
          now,
          ageInDays: (now - savedTime) / (24 * 60 * 60 * 1000),
        });
        return false;
      }

      return true;
    } catch (error) {
      gameLogger.warn("validation_error", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return false;
    }
  },
};

/**
 * Core save function with error handling and validation
 */
export async function saveGameState(
  gameState: GameState,
): Promise<GameSaveResult> {
  try {
    const startTime = Date.now();

    // Skip saving if game is complete
    const isComplete = gameState.gamePhase === GamePhase.GameOver;

    // Create persisted state object
    const persistedState: PersistedGameState = {
      gameState,
      timestamp: Date.now(),
      version: PERSISTENCE_VERSION,
      gameId: generateGameId(gameState),
      isComplete,
      metadata: {
        roundNumber: gameState.roundNumber,
        gamePhase: gameState.gamePhase,
        playerCount: gameState.players.length,
      },
    };

    // Serialize with error handling
    const serializedState = JSON.stringify(persistedState);

    // Save to storage
    const success = await StorageManager.setItem(
      STORAGE_KEYS.CURRENT_GAME,
      serializedState,
    );

    if (success) {
      // Update last save time
      await StorageManager.setItem(
        STORAGE_KEYS.LAST_SAVE_TIME,
        Date.now().toString(),
      );

      const saveTime = Date.now() - startTime;
      gameLogger.info("game_state_saved", {
        gamePhase: gameState.gamePhase,
        roundNumber: gameState.roundNumber,
        saveTimeMs: saveTime,
        dataSize: serializedState.length,
      });

      return { success: true, savedAt: persistedState.timestamp };
    } else {
      return { success: false, error: "Failed to write to storage" };
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    gameLogger.error("save_game_state_error", { error: errorMessage });

    return {
      success: false,
      error: `Serialization error: ${errorMessage}`,
    };
  }
}

/**
 * Core load function with validation
 */
export async function loadGameState(): Promise<GameLoadResult> {
  try {
    const startTime = Date.now();

    // Retrieve from storage
    const serializedState = await StorageManager.getItem(
      STORAGE_KEYS.CURRENT_GAME,
    );

    if (!serializedState) {
      return { success: false, error: "No saved game found" };
    }

    // Parse with error handling
    let persistedState: unknown;
    try {
      persistedState = JSON.parse(serializedState);
    } catch (parseError) {
      gameLogger.warn("load_parse_error", {
        error:
          parseError instanceof Error ? parseError.message : "Parse failed",
      });
      return { success: false, error: "Invalid saved game data format" };
    }

    // Validate the loaded state
    if (!ValidationService.validatePersistedState(persistedState)) {
      return { success: false, error: "Saved game data validation failed" };
    }

    const loadTime = Date.now() - startTime;
    gameLogger.info("game_state_loaded", {
      gamePhase: persistedState.gameState.gamePhase,
      roundNumber: persistedState.gameState.roundNumber,
      loadTimeMs: loadTime,
      savedAt: new Date(persistedState.timestamp).toISOString(),
    });

    // Deserialize the game state to restore Card class instances
    const deserializedGameState = deserializeGameState(
      persistedState.gameState,
    );

    return {
      success: true,
      gameState: deserializedGameState,
      metadata: persistedState.metadata,
      timestamp: persistedState.timestamp,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    gameLogger.error("load_game_state_error", { error: errorMessage });

    return {
      success: false,
      error: `Load error: ${errorMessage}`,
    };
  }
}

/**
 * Clear saved game state
 */
export async function clearSavedGameState(): Promise<boolean> {
  try {
    const success = await StorageManager.removeItem(STORAGE_KEYS.CURRENT_GAME);

    if (success) {
      gameLogger.info("game_state_cleared");
    }

    return success;
  } catch (error) {
    gameLogger.error("clear_game_state_error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return false;
  }
}

/**
 * Check if a saved game exists
 */
export async function hasSavedGame(): Promise<boolean> {
  try {
    const serializedState = await StorageManager.getItem(
      STORAGE_KEYS.CURRENT_GAME,
    );
    return serializedState !== null;
  } catch (error) {
    gameLogger.warn("has_saved_game_error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return false;
  }
}

/**
 * Get metadata about saved game without loading full state
 */
export async function getSavedGameMetadata(): Promise<
  PersistedGameState["metadata"] | null
> {
  try {
    const serializedState = await StorageManager.getItem(
      STORAGE_KEYS.CURRENT_GAME,
    );

    if (!serializedState) {
      return null;
    }

    const persistedState = JSON.parse(serializedState);

    if (ValidationService.validatePersistedState(persistedState)) {
      return persistedState.metadata;
    }

    return null;
  } catch (error) {
    gameLogger.warn("get_saved_game_metadata_error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return null;
  }
}

/**
 * Generate unique game ID based on game state
 */
function generateGameId(gameState: GameState): string {
  // Create a simple but unique ID based on game characteristics
  const teamRanks = gameState.teams.map((team) => team.currentRank).join("-");
  const timestamp = Date.now();
  const roundNumber = gameState.roundNumber;

  return `game_${timestamp}_r${roundNumber}_${teamRanks}`;
}

/**
 * Development/debug function to get storage statistics
 */
export async function getStorageStats(): Promise<{
  hasSavedGame: boolean;
  lastSaveTime?: number;
  dataSize?: number;
}> {
  try {
    // Get both values in parallel and handle errors independently
    const [serializedState, lastSaveTimeStr] = await Promise.allSettled([
      StorageManager.getItem(STORAGE_KEYS.CURRENT_GAME),
      StorageManager.getItem(STORAGE_KEYS.LAST_SAVE_TIME),
    ]);

    const gameData =
      serializedState.status === "fulfilled" ? serializedState.value : null;
    const saveTimeData =
      lastSaveTimeStr.status === "fulfilled" ? lastSaveTimeStr.value : null;

    return {
      hasSavedGame: gameData !== null,
      lastSaveTime: saveTimeData ? parseInt(saveTimeData, 10) : undefined,
      dataSize: gameData ? gameData.length : undefined,
    };
  } catch {
    return { hasSavedGame: false };
  }
}
