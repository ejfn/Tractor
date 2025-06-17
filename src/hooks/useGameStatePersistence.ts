import { useCallback, useEffect, useRef, useMemo } from "react";
import {
  saveGameState,
  loadGameState,
  clearSavedGameState,
  hasSavedGame,
  getSavedGameMetadata,
  GameSaveResult,
  GameLoadResult,
  PersistedGameState,
} from "../utils/gameStatePersistence";
import { GameState, GamePhase } from "../types";
import { gameLogger } from "../utils/gameLogger";

/**
 * Hook for Game State Persistence Integration
 *
 * Provides automatic save/load functionality with integration into existing game state management.
 * Handles auto-save triggers, restoration logic, and error handling.
 */

export interface PersistenceSettings {
  autoSaveEnabled: boolean;
  saveOnTrickComplete: boolean;
  saveOnRoundTransition: boolean;
  saveOnPhaseChange: boolean;
}

export interface PersistenceStatus {
  isLoading: boolean;
  isSaving: boolean;
  lastSaveTime?: number;
  lastSaveResult?: GameSaveResult;
  lastLoadResult?: GameLoadResult;
  error?: string;
}

export interface RestorationData {
  hasRestoredGame: boolean;
  metadata?: PersistedGameState["metadata"];
  timestamp?: number;
}

// Default persistence settings
const DEFAULT_SETTINGS: PersistenceSettings = {
  autoSaveEnabled: true,
  saveOnTrickComplete: true,
  saveOnRoundTransition: true,
  saveOnPhaseChange: true,
};

/**
 * Hook for game state persistence management
 */
export function useGameStatePersistence(
  gameState: GameState | null,
  settings: Partial<PersistenceSettings> = {},
) {
  const persistenceSettings = useMemo(
    () => ({ ...DEFAULT_SETTINGS, ...settings }),
    [settings],
  );

  // State tracking
  const statusRef = useRef<PersistenceStatus>({
    isLoading: false,
    isSaving: false,
  });

  // Track previous game state for change detection
  const previousGameStateRef = useRef<GameState | null>(null);
  const lastAutoSaveRef = useRef<number>(0);

  // Minimum time between auto-saves (prevent excessive saving)
  const MIN_SAVE_INTERVAL = 2000; // 2 seconds

  /**
   * Manual save function with status tracking
   */
  const saveGame = useCallback(
    async (gameStateToSave?: GameState): Promise<GameSaveResult> => {
      const targetGameState = gameStateToSave || gameState;

      if (!targetGameState) {
        const result = { success: false, error: "No game state to save" };
        statusRef.current.lastSaveResult = result;
        return result;
      }

      // Update status
      statusRef.current.isSaving = true;
      statusRef.current.error = undefined;

      try {
        const result = await saveGameState(targetGameState);

        // Update status
        statusRef.current.isSaving = false;
        statusRef.current.lastSaveResult = result;
        statusRef.current.lastSaveTime = result.savedAt;

        if (result.success) {
          lastAutoSaveRef.current = Date.now();
          gameLogger.info("manual_save_success", {
            gamePhase: targetGameState.gamePhase,
            roundNumber: targetGameState.roundNumber,
          });
        } else {
          statusRef.current.error = result.error;
          gameLogger.warn("manual_save_failed", { error: result.error });
        }

        return result;
      } catch (error) {
        statusRef.current.isSaving = false;
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        statusRef.current.error = errorMessage;

        const result = { success: false, error: errorMessage };
        statusRef.current.lastSaveResult = result;
        return result;
      }
    },
    [gameState],
  );

  /**
   * Load saved game function
   */
  const loadGame = useCallback(async (): Promise<GameLoadResult> => {
    statusRef.current.isLoading = true;
    statusRef.current.error = undefined;

    try {
      const result = await loadGameState();

      statusRef.current.isLoading = false;
      statusRef.current.lastLoadResult = result;

      if (!result.success) {
        statusRef.current.error = result.error;
        gameLogger.warn("load_game_failed", { error: result.error });
      } else {
        gameLogger.info("load_game_success", {
          gamePhase: result.gameState?.gamePhase,
          roundNumber: result.gameState?.roundNumber,
          savedAt: result.timestamp
            ? new Date(result.timestamp).toISOString()
            : "unknown",
        });
      }

      return result;
    } catch (error) {
      statusRef.current.isLoading = false;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      statusRef.current.error = errorMessage;

      const result = { success: false, error: errorMessage };
      statusRef.current.lastLoadResult = result;
      return result;
    }
  }, []);

  /**
   * Clear saved game
   */
  const clearSavedGame = useCallback(async (): Promise<boolean> => {
    try {
      const success = await clearSavedGameState();

      if (success) {
        statusRef.current.lastSaveTime = undefined;
        statusRef.current.lastSaveResult = undefined;
        gameLogger.info("saved_game_cleared");
      }

      return success;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      statusRef.current.error = errorMessage;
      gameLogger.warn("clear_saved_game_failed", { error: errorMessage });
      return false;
    }
  }, []);

  /**
   * Check for existing saved game
   */
  const checkForSavedGame = useCallback(async (): Promise<RestorationData> => {
    try {
      const hasGame = await hasSavedGame();

      if (hasGame) {
        const metadata = await getSavedGameMetadata();
        const loadResult = await loadGameState();

        return {
          hasRestoredGame: true,
          metadata: metadata || undefined,
          timestamp: loadResult.timestamp,
        };
      }

      return { hasRestoredGame: false };
    } catch (error) {
      gameLogger.warn("check_saved_game_failed", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return { hasRestoredGame: false };
    }
  }, []);

  /**
   * Auto-save logic with change detection
   */
  const triggerAutoSave = useCallback(
    async (reason: string) => {
      if (!persistenceSettings.autoSaveEnabled || !gameState) {
        return;
      }

      // Prevent excessive saves
      const now = Date.now();
      if (now - lastAutoSaveRef.current < MIN_SAVE_INTERVAL) {
        gameLogger.debug("auto_save_throttled", {
          reason,
          timeSinceLastSave: now - lastAutoSaveRef.current,
        });
        return;
      }

      // Skip auto-save for completed games (game over)
      if (gameState.gamePhase === GamePhase.GameOver) {
        gameLogger.debug("auto_save_skipped_game_over", { reason });
        return;
      }

      gameLogger.debug("auto_save_triggered", {
        reason,
        gamePhase: gameState.gamePhase,
      });

      const result = await saveGame(gameState);

      if (result.success) {
        gameLogger.info("auto_save_success", {
          reason,
          gamePhase: gameState.gamePhase,
          roundNumber: gameState.roundNumber,
        });
      }
    },
    [gameState, persistenceSettings.autoSaveEnabled, saveGame],
  );

  /**
   * Auto-save effect - monitors game state changes and triggers saves
   */
  useEffect(() => {
    const previousGameState = previousGameStateRef.current;
    const currentGameState = gameState;

    // Update ref for next comparison
    previousGameStateRef.current = currentGameState;

    // Skip if no current game state or no previous state to compare
    if (!currentGameState || !previousGameState) {
      return;
    }

    // Detect significant changes that should trigger auto-save

    // 1. Phase changes
    if (
      persistenceSettings.saveOnPhaseChange &&
      previousGameState.gamePhase !== currentGameState.gamePhase
    ) {
      triggerAutoSave(
        `phase_change_${previousGameState.gamePhase}_to_${currentGameState.gamePhase}`,
      );
      return;
    }

    // 2. Round transitions
    if (
      persistenceSettings.saveOnRoundTransition &&
      previousGameState.roundNumber !== currentGameState.roundNumber
    ) {
      triggerAutoSave(
        `round_transition_${previousGameState.roundNumber}_to_${currentGameState.roundNumber}`,
      );
      return;
    }

    // 3. Trick completion (new trick added to history)
    if (
      persistenceSettings.saveOnTrickComplete &&
      previousGameState.tricks.length !== currentGameState.tricks.length
    ) {
      triggerAutoSave(`trick_completed_${currentGameState.tricks.length}`);
      return;
    }

    // 4. Current player changes (during active play)
    if (
      currentGameState.gamePhase === GamePhase.Playing &&
      previousGameState.currentPlayerIndex !==
        currentGameState.currentPlayerIndex
    ) {
      triggerAutoSave(`player_turn_${currentGameState.currentPlayerIndex}`);
      return;
    }
  }, [gameState, persistenceSettings, triggerAutoSave]);

  /**
   * Get current persistence status
   */
  const getStatus = useCallback((): PersistenceStatus => {
    return { ...statusRef.current };
  }, []);

  /**
   * Get current settings
   */
  const getSettings = useCallback((): PersistenceSettings => {
    return persistenceSettings;
  }, [persistenceSettings]);

  return {
    // Core functions
    saveGame,
    loadGame,
    clearSavedGame,
    checkForSavedGame,

    // Manual auto-save trigger
    triggerAutoSave,

    // Status and settings
    getStatus,
    getSettings,

    // Current status (snapshot)
    status: statusRef.current,
    settings: persistenceSettings,
  };
}

/**
 * Utility hook for restoration flow
 */
export function useGameRestoration() {
  /**
   * Check if there's a saved game and return restoration options
   */
  const checkRestoration = useCallback(async (): Promise<{
    shouldRestore: boolean;
    metadata?: PersistedGameState["metadata"];
    timestamp?: number;
  }> => {
    try {
      const hasGame = await hasSavedGame();

      if (!hasGame) {
        return { shouldRestore: false };
      }

      const metadata = await getSavedGameMetadata();
      const loadResult = await loadGameState();

      // Only suggest restoration for valid, recent saves
      if (loadResult.success && metadata) {
        return {
          shouldRestore: true,
          metadata,
          timestamp: loadResult.timestamp,
        };
      }

      return { shouldRestore: false };
    } catch (error) {
      gameLogger.warn("restoration_check_failed", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return { shouldRestore: false };
    }
  }, []);

  return {
    checkRestoration,
  };
}
