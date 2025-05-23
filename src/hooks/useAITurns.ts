import { useState, useEffect, useRef, useCallback } from "react";
import { GameState, Card, GamePhase } from "../types/game";
import { getAIMoveWithErrorHandling } from "../utils/gamePlayManager";
import { AI_MOVE_DELAY } from "../utils/gameTimings";

type ProcessPlayFn = (cards: Card[]) => void;

/**
 * Hook for managing AI turn handling with timers
 * @param gameState Current game state
 * @param processPlay Function to process a play
 * @param showTrickResult Whether trick result is being shown
 * @param lastCompletedTrick Completed trick that might be showing
 * @returns Waiting status and handlers for AI actions
 */
export function useAITurns(
  gameState: GameState | null,
  processPlay: ProcessPlayFn,
  showTrickResult: boolean,
  lastCompletedTrick: any | null, // Using any to match original implementation
  showRoundComplete: boolean = false, // Optional parameter for round completion
) {
  const [waitingForAI, setWaitingForAI] = useState(false);
  // Track which AI we're waiting for
  const [waitingPlayerId, setWaitingPlayerId] = useState<string>("");

  const lastProcessedTurnRef = useRef<{
    playerIndex: number;
    timestamp: number;
  } | null>(null);

  // Handle AI move logic - using useCallback to prevent dependency cycle
  const handleAIMove = useCallback(() => {
    if (!gameState) {
      console.error("handleAIMove: gameState is null");
      setWaitingForAI(false);
      setWaitingPlayerId("");
      return;
    }

    const playerIndex = gameState.currentPlayerIndex;

    // Make sure we haven't just processed this same player turn
    // This prevents potential duplicate moves if called multiple times
    if (
      lastProcessedTurnRef.current &&
      lastProcessedTurnRef.current.playerIndex === playerIndex &&
      Date.now() - lastProcessedTurnRef.current.timestamp < 500
    ) {
      // Duplicate AI move detected, ignoring
      setWaitingForAI(false);
      setWaitingPlayerId("");
      return;
    }

    // Check if current trick is complete but not cleared
    const currentTrickComplete =
      gameState.currentTrick &&
      gameState.currentTrick.plays.length === gameState.players.length - 1;

    // Block if we're showing trick result, have a completed trick waiting, trick is complete, or round is complete
    // This helps prevent "thinking of next trick round is showing before trick result disappears"
    if (
      showTrickResult ||
      lastCompletedTrick ||
      showRoundComplete ||
      currentTrickComplete
    ) {
      // AI move blocked while trick result is showing, trick complete, or round complete
      setWaitingForAI(false);
      setWaitingPlayerId("");
      return;
    }

    const currentPlayer = gameState.players[playerIndex];

    // Safety check to ensure the current player is an AI
    if (currentPlayer.isHuman) {
      console.warn(
        `ERROR: handleAIMove called for human player ${currentPlayer.name}`,
      );
      setWaitingForAI(false);
      return;
    }

    // Additional safety checks for ALL bots - double-check game state
    // Also check if currentTrick is complete (but not cleared yet)
    const trickComplete =
      gameState.currentTrick &&
      gameState.currentTrick.plays.length === gameState.players.length - 1;

    const botReady =
      gameState.gamePhase === GamePhase.Playing &&
      !showTrickResult &&
      !showRoundComplete &&
      !trickComplete; // Don't let AI play if trick is complete but not cleared

    if (!botReady) {
      console.warn(
        `${currentPlayer.name} move attempted during invalid game state: phase=${gameState.gamePhase}, showResult=${showTrickResult}, roundComplete=${showRoundComplete}, trickComplete=${trickComplete}`,
      );

      setWaitingForAI(false);
      setWaitingPlayerId("");
      return;
    }

    try {
      // Get AI move with error handling - pass the actual game state
      // The AI logic should not mutate the state, just read from it
      const { cards, error } = getAIMoveWithErrorHandling(gameState);

      if (error) {
        console.error(
          `Error in AI move logic for ${currentPlayer.name}:`,
          error,
        );

        // Reset waiting state
        setWaitingForAI(false);
        setWaitingPlayerId("");

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

        // Immediately reset the thinking indicator after processing the play
        // The player will change, so we don't need to wait
        setWaitingForAI(false);
        setWaitingPlayerId("");
      } else {
        console.warn(`AI ${currentPlayer.name} returned empty move`);

        // Reset waiting state
        setWaitingForAI(false);
        setWaitingPlayerId("");

        // Throw error immediately without delay
        throw new Error(
          `Fatal game error: AI ${currentPlayer.name} could not determine a valid move. Empty moves are not allowed in Tractor.`,
        );
      }
    } catch (error) {
      console.error(
        `Unexpected error in AI move handling: ${error instanceof Error ? error.message : String(error)}`,
      );

      // Reset waiting state
      setWaitingForAI(false);
      setWaitingPlayerId("");

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
  ]);

  // Main effect for AI turn detection
  useEffect(() => {
    if (!gameState) return;

    // Check if the current trick is complete but not cleared
    const currentTrickComplete =
      gameState.currentTrick &&
      gameState.currentTrick.plays.length === gameState.players.length - 1;

    // Block processing if showing trick result, round complete, trick is complete, or not in playing phase
    if (
      showTrickResult ||
      lastCompletedTrick ||
      showRoundComplete ||
      gameState.gamePhase !== GamePhase.Playing ||
      currentTrickComplete
    ) {
      return;
    }

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];

    // If it's a human player's turn, clear any lingering thinking indicators
    if (currentPlayer.isHuman) {
      if (waitingForAI) {
        setWaitingForAI(false);
        setWaitingPlayerId("");
      }
      return;
    }

    // It's an AI player's turn - check if we need to show thinking indicator
    if (!waitingForAI || waitingPlayerId !== currentPlayer.id) {
      // Show thinking indicator for this AI player
      setWaitingForAI(true);
      setWaitingPlayerId(currentPlayer.id);

      // Schedule the AI move
      setTimeout(() => {
        handleAIMove();
      }, AI_MOVE_DELAY);
    }
  }, [
    gameState?.currentPlayerIndex,
    gameState?.gamePhase,
    showTrickResult,
    lastCompletedTrick,
    showRoundComplete,
    waitingForAI,
    waitingPlayerId,
    handleAIMove,
    gameState,
  ]);

  // Clear thinking indicator when game phase changes
  useEffect(() => {
    if (!gameState) return;

    // If game is not in playing phase, clear any thinking indicators
    if (gameState.gamePhase !== GamePhase.Playing && waitingForAI) {
      setWaitingForAI(false);
      setWaitingPlayerId("");
    }
  }, [gameState, gameState?.gamePhase, waitingForAI]);

  // Clear thinking indicator on unmount
  useEffect(() => {
    return () => {
      setWaitingForAI(false);
      setWaitingPlayerId("");
    };
  }, []);

  return {
    waitingForAI,
    waitingPlayerId,
    handleAIMove,
  };
}
