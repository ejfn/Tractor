import { useState, useEffect, useRef, useCallback } from "react";
import { GameState, Card, Player, TRICK_COMPLETE_PLAYS } from "../types/game";
import { getAIMoveWithErrorHandling } from "../utils/gamePlayManager";
import { AI_MOVE_DELAY } from "../utils/gameTimings";

type ProcessPlayFn = (cards: Card[]) => void;

/**
 * Hook for managing AI turn handling with timers
 * @param gameState Current game state
 * @param processPlay Function to process a play
 * @param showTrickResult Whether trick result is being shown
 * @param lastCompletedTrick Completed trick that might be showing
 * @param showRoundComplete Optional parameter for round completion
 * @param getCurrentPlayerState Function to get current player state
 * @param setThinkingPlayer Function to set thinking player
 * @returns Waiting status and handlers for AI actions
 */
export function useAITurns(
  gameState: GameState | null,
  processPlay: ProcessPlayFn,
  showTrickResult: boolean,
  lastCompletedTrick: any | null, // Using any to match original implementation
  showRoundComplete: boolean = false, // Optional parameter for round completion
  getCurrentPlayerState: (() => Player | null) | null = null,
  setThinkingPlayer: ((playerId: string | undefined) => void) | null = null,
) {
  // Internal state for tracking AI processing - keep for duplicate prevention
  const [processingAI, setProcessingAI] = useState(false);
  const [processingPlayerId, setProcessingPlayerId] = useState<string>("");

  const lastProcessedTurnRef = useRef<{
    playerIndex: number;
    timestamp: number;
  } | null>(null);

  // Derive waiting state from current player state
  const currentPlayerState = getCurrentPlayerState?.();
  const waitingForAI = currentPlayerState?.isThinking ?? false;
  const waitingPlayerId = waitingForAI ? (currentPlayerState?.id ?? "") : "";

  // Handle AI move logic - using useCallback to prevent dependency cycle
  const handleAIMove = useCallback(() => {
    if (!gameState || !getCurrentPlayerState) {
      console.error("handleAIMove: gameState or getCurrentPlayerState is null");
      setProcessingAI(false);
      setProcessingPlayerId("");
      return;
    }

    const currentPlayerState = getCurrentPlayerState();
    if (!currentPlayerState) {
      console.error("handleAIMove: currentPlayerState is null");
      setProcessingAI(false);
      setProcessingPlayerId("");
      return;
    }
    const playerIds = Object.keys(gameState.players);
    const playerIndex = playerIds.findIndex(
      (id) => id === currentPlayerState.id,
    );

    // Make sure we haven't just processed this same player turn
    // This prevents potential duplicate moves if called multiple times
    if (
      lastProcessedTurnRef.current &&
      lastProcessedTurnRef.current.playerIndex === playerIndex &&
      Date.now() - lastProcessedTurnRef.current.timestamp < 500
    ) {
      // Duplicate AI move detected, ignoring
      setProcessingAI(false);
      setProcessingPlayerId("");
      return;
    }

    // Check if current trick is complete but not cleared
    const currentTrickComplete =
      gameState.currentTrick &&
      gameState.currentTrick.plays.length === TRICK_COMPLETE_PLAYS;

    // Block if we're showing trick result, have a completed trick waiting, trick is complete, or round is complete
    // This helps prevent "thinking of next trick round is showing before trick result disappears"
    if (
      showTrickResult ||
      lastCompletedTrick ||
      showRoundComplete ||
      currentTrickComplete
    ) {
      // AI move blocked while trick result is showing, trick complete, or round complete
      setProcessingAI(false);
      setProcessingPlayerId("");
      return;
    }

    const currentPlayer = currentPlayerState;

    // Safety check to ensure the current player is an AI
    if (currentPlayer.isHuman) {
      console.warn(
        `ERROR: handleAIMove called for human player ${currentPlayer.name}`,
      );
      setProcessingAI(false);
      return;
    }

    // Additional safety checks for ALL bots - double-check game state
    // Also check if currentTrick is complete (but not cleared yet)
    const trickComplete =
      gameState.currentTrick &&
      gameState.currentTrick.plays.length === TRICK_COMPLETE_PLAYS;

    const botReady =
      gameState.gamePhase === "playing" &&
      !showTrickResult &&
      !showRoundComplete &&
      !trickComplete; // Don't let AI play if trick is complete but not cleared

    if (!botReady) {
      console.warn(
        `${currentPlayer.name} move attempted during invalid game state: phase=${gameState.gamePhase}, showResult=${showTrickResult}, roundComplete=${showRoundComplete}, trickComplete=${trickComplete}`,
      );

      setProcessingAI(false);
      setProcessingPlayerId("");
      return;
    }

    try {
      // Get AI move with error handling - pass the actual game state
      // The AI logic should not mutate the state, just read from it
      const { cards, error } = getAIMoveWithErrorHandling(
        gameState,
        currentPlayer.id,
      );

      if (error) {
        console.error(
          `Error in AI move logic for ${currentPlayer.name}:`,
          error,
        );

        // Reset processing state
        setProcessingAI(false);
        setProcessingPlayerId("");

        // Throw error immediately without delay
        throw new Error(
          `Fatal game error: AI ${currentPlayer.name} could not make a valid move (${error}). In Tractor, invalid moves are not allowed.`,
        );
      } else if (cards && cards.length > 0) {
        // Mark this turn as processed to prevent duplicates
        lastProcessedTurnRef.current = {
          playerIndex,
          timestamp: Date.now(),
        };

        // This should trigger the actual game state update
        processPlay(cards);

        // Immediately reset the processing state after processing the play
        // The player will change, so we don't need to wait
        setProcessingAI(false);
        setProcessingPlayerId("");

        // Clear thinking indicator
        setThinkingPlayer?.(undefined);
      } else {
        console.warn(`AI ${currentPlayer.name} returned empty move`);

        // Reset processing state
        setProcessingAI(false);
        setProcessingPlayerId("");

        // Throw error immediately without delay
        throw new Error(
          `Fatal game error: AI ${currentPlayer.name} could not determine a valid move. Empty moves are not allowed in Tractor.`,
        );
      }
    } catch (error) {
      console.error(
        `Unexpected error in AI move handling: ${error instanceof Error ? error.message : String(error)}`,
      );

      // Reset processing state
      setProcessingAI(false);
      setProcessingPlayerId("");

      // Throw error immediately without delay
      throw new Error(
        `Fatal game error: Unexpected error in AI move handling for ${currentPlayer.name}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }, [
    gameState,
    processPlay,
    showTrickResult,
    lastCompletedTrick,
    showRoundComplete,
    getCurrentPlayerState,
    setThinkingPlayer,
  ]);

  // Main effect for AI turn detection
  useEffect(() => {
    if (!gameState || !getCurrentPlayerState) return;

    // Check if the current trick is complete but not cleared
    const currentTrickComplete =
      gameState.currentTrick &&
      gameState.currentTrick.plays.length === TRICK_COMPLETE_PLAYS;

    // Block processing if showing trick result, round complete, trick is complete, or not in playing phase
    if (
      showTrickResult ||
      lastCompletedTrick ||
      showRoundComplete ||
      gameState.gamePhase !== "playing" ||
      currentTrickComplete
    ) {
      return;
    }

    const currentPlayerState = getCurrentPlayerState();
    if (!currentPlayerState) {
      return; // No current player, nothing to do
    }
    const currentPlayer = currentPlayerState;

    // If it's a human player's turn, clear any lingering processing state
    if (currentPlayer.isHuman) {
      if (processingAI) {
        setProcessingAI(false);
        setProcessingPlayerId("");
      }
      return;
    }

    // It's an AI player's turn - check if we need to start processing
    if (!processingAI || processingPlayerId !== currentPlayer.id) {
      // Start processing for this AI player
      setProcessingAI(true);
      setProcessingPlayerId(currentPlayer.id);

      // Set thinking indicator
      setThinkingPlayer?.(currentPlayer.id);

      // Schedule the AI move
      setTimeout(() => {
        handleAIMove();
      }, AI_MOVE_DELAY);
    }
  }, [
    gameState?.currentPlayerId,
    gameState?.gamePhase,
    showTrickResult,
    lastCompletedTrick,
    showRoundComplete,
    processingAI,
    processingPlayerId,
    handleAIMove,
    gameState,
    getCurrentPlayerState,
    setThinkingPlayer,
  ]);

  // Clear thinking indicator when game phase changes
  useEffect(() => {
    if (!gameState) return;

    // If game is not in playing phase, clear any processing state
    if (gameState.gamePhase !== "playing" && processingAI) {
      setProcessingAI(false);
      setProcessingPlayerId("");
    }
  }, [gameState, gameState?.gamePhase, processingAI]);

  // Clear processing state on unmount
  useEffect(() => {
    return () => {
      setProcessingAI(false);
      setProcessingPlayerId("");
    };
  }, []);

  return {
    waitingForAI,
    waitingPlayerId,
    handleAIMove,
  };
}
