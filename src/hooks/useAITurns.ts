import { useCallback, useEffect, useRef, useState } from "react";
import { getAIMoveWithErrorHandling } from "../game/playProcessing";
import { getAIKittySwap } from "../ai/aiLogic";
import { putbackKittyCards } from "../game/kittyManager";
import { Card, GamePhase, GameState, PlayerId, Trick } from "../types";
import { AI_MOVE_DELAY, AI_KITTY_SWAP_DELAY } from "../utils/gameTimings";
import { gameLogger } from "../utils/gameLogger";

type ProcessPlayFn = (cards: Card[]) => void;
type SetGameStateFn = (gameState: GameState) => void;

/**
 * Hook for managing AI turn handling with timers
 * Handles both card play during Playing phase and kitty swap during KittySwap phase
 * @param gameState Current game state
 * @param processPlay Function to process a play during Playing phase
 * @param setGameState Function to update game state during KittySwap phase
 * @param showTrickResult Whether trick result is being shown
 * @param lastCompletedTrick Completed trick that might be showing
 * @param showRoundComplete Whether round complete modal is showing
 * @returns Waiting status and handlers for AI actions
 */
export function useAITurns(
  gameState: GameState | null,
  processPlay: ProcessPlayFn,
  setGameState: SetGameStateFn,
  showTrickResult: boolean,
  lastCompletedTrick: Trick | null,
  showRoundComplete: boolean = false, // Optional parameter for round completion
) {
  const [waitingForAI, setWaitingForAI] = useState(false);
  // Track which AI we're waiting for
  const [waitingPlayerId, setWaitingPlayerId] = useState<PlayerId>(
    "" as PlayerId,
  );

  const lastProcessedTurnRef = useRef<{
    playerIndex: number;
    timestamp: number;
  } | null>(null);

  // Handle AI move logic - using useCallback to prevent dependency cycle
  const handleAIMove = useCallback(() => {
    if (!gameState) {
      gameLogger.error(
        "handle_ai_move_null_state",
        {},
        "handleAIMove: gameState is null",
      );
      setWaitingForAI(false);
      setWaitingPlayerId("" as PlayerId);
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
      setWaitingPlayerId("" as PlayerId);
      return;
    }

    // Check if current trick is complete but not cleared
    const currentTrickComplete =
      gameState.currentTrick &&
      gameState.currentTrick.plays.length === gameState.players.length;

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
      setWaitingPlayerId("" as PlayerId);
      return;
    }

    const currentPlayer = gameState.players[playerIndex];

    // Safety check to ensure the current player is an AI
    if (currentPlayer.isHuman) {
      gameLogger.warn(
        "ai_move_called_for_human",
        { playerId: currentPlayer.id },
        `ERROR: handleAIMove called for human player ${currentPlayer.id}`,
      );
      setWaitingForAI(false);
      return;
    }

    // Additional safety checks for ALL bots - double-check game state
    // Also check if currentTrick is complete (but not cleared yet)
    const trickComplete =
      gameState.currentTrick &&
      gameState.currentTrick.plays.length === gameState.players.length;

    const botReady =
      (gameState.gamePhase === GamePhase.Playing ||
        gameState.gamePhase === GamePhase.KittySwap) &&
      !showTrickResult &&
      !showRoundComplete &&
      !trickComplete; // Don't let AI play if trick is complete but not cleared

    if (!botReady) {
      gameLogger.warn(
        "ai_move_invalid_game_state",
        {
          playerId: currentPlayer.id,
          gamePhase: gameState.gamePhase,
          showTrickResult: showTrickResult,
          showRoundComplete: showRoundComplete,
          trickComplete: trickComplete,
        },
        `${currentPlayer.id} move attempted during invalid game state: phase=${gameState.gamePhase}, showResult=${showTrickResult}, roundComplete=${showRoundComplete}, trickComplete=${trickComplete}`,
      );

      setWaitingForAI(false);
      setWaitingPlayerId("" as PlayerId);
      return;
    }

    try {
      if (gameState.gamePhase === GamePhase.KittySwap) {
        // Handle AI kitty swap
        const selectedCards = getAIKittySwap(gameState, currentPlayer.id);

        if (selectedCards.length === 8) {
          // Mark this turn as processed to prevent duplicates
          lastProcessedTurnRef.current = {
            playerIndex,
            timestamp: Date.now(),
          };

          // Apply kitty swap directly to game state
          const newGameState = putbackKittyCards(
            gameState,
            selectedCards,
            currentPlayer.id,
          );
          setGameState(newGameState);

          // Reset waiting state
          setWaitingForAI(false);
          setWaitingPlayerId("" as PlayerId);
          return;
        } else {
          gameLogger.error(
            "ai_invalid_kitty_swap",
            {
              playerId: currentPlayer.id,
              selectedCardsCount: selectedCards.length,
            },
            `AI ${currentPlayer.id} returned invalid kitty swap: ${selectedCards.length} cards`,
          );
          setWaitingForAI(false);
          setWaitingPlayerId("" as PlayerId);
          return;
        }
      }

      // Handle regular card play during Playing phase
      // Get AI move with error handling - pass the actual game state
      // The AI logic should not mutate the state, just read from it
      const { cards, error } = getAIMoveWithErrorHandling(gameState);

      if (error) {
        gameLogger.error(
          "ai_move_logic_error",
          {
            playerId: currentPlayer.id,
            error: error,
          },
          `Error in AI move logic for ${currentPlayer.id}: ${error}`,
        );

        // Reset waiting state
        setWaitingForAI(false);
        setWaitingPlayerId("" as PlayerId);

        // Throw error immediately without delay
        throw new Error(
          `Fatal game error: AI ${currentPlayer.id} could not make a valid move (${error}). In Tractor, invalid moves are not allowed.`,
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
        setWaitingPlayerId("" as PlayerId);
      } else {
        gameLogger.warn(
          "ai_empty_move",
          {
            playerId: currentPlayer.id,
          },
          `AI ${currentPlayer.id} returned empty move`,
        );

        // Reset waiting state
        setWaitingForAI(false);
        setWaitingPlayerId("" as PlayerId);

        // Throw error immediately without delay
        throw new Error(
          `Fatal game error: AI ${currentPlayer.id} could not determine a valid move. Empty moves are not allowed in Tractor.`,
        );
      }
    } catch (error) {
      gameLogger.error(
        "ai_move_unexpected_error",
        {
          error: error instanceof Error ? error.message : String(error),
          currentPlayerIndex: gameState?.currentPlayerIndex,
        },
        `Unexpected error in AI move handling: ${error instanceof Error ? error.message : String(error)}`,
      );

      // Reset waiting state
      setWaitingForAI(false);
      setWaitingPlayerId("" as PlayerId);

      // Throw error immediately without delay
      throw new Error(
        `Fatal game error: Unexpected error in AI move handling for ${currentPlayer.id}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }, [
    gameState,
    processPlay,
    showTrickResult,
    lastCompletedTrick,
    showRoundComplete,
    setGameState,
  ]);

  // Main effect for AI turn detection
  useEffect(() => {
    if (!gameState) return;

    // Check if the current trick is complete but not cleared
    const currentTrickComplete =
      gameState.currentTrick &&
      gameState.currentTrick.plays.length === gameState.players.length;

    // Block processing if showing trick result, round complete, trick is complete, or not in playing/kittyswap phase
    if (
      showTrickResult ||
      lastCompletedTrick ||
      showRoundComplete ||
      (gameState.gamePhase !== GamePhase.Playing &&
        gameState.gamePhase !== GamePhase.KittySwap) ||
      currentTrickComplete
    ) {
      return;
    }

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];

    // If it's a human player's turn, clear any lingering thinking indicators
    if (currentPlayer.isHuman) {
      if (waitingForAI) {
        setWaitingForAI(false);
        setWaitingPlayerId("" as PlayerId);
      }
      return;
    }

    // It's an AI player's turn - check if we need to show thinking indicator
    if (!waitingForAI || waitingPlayerId !== currentPlayer.id) {
      // Show thinking indicator for this AI player
      setWaitingForAI(true);
      setWaitingPlayerId(currentPlayer.id);

      // Schedule the AI move with appropriate delay based on phase
      const delay =
        gameState.gamePhase === GamePhase.KittySwap
          ? AI_KITTY_SWAP_DELAY
          : AI_MOVE_DELAY;
      setTimeout(() => {
        handleAIMove();
      }, delay);
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

    // If game is not in playing or kittyswap phase, clear any thinking indicators
    if (
      gameState.gamePhase !== GamePhase.Playing &&
      gameState.gamePhase !== GamePhase.KittySwap &&
      waitingForAI
    ) {
      setWaitingForAI(false);
      setWaitingPlayerId("" as PlayerId);
    }
  }, [gameState, gameState?.gamePhase, waitingForAI]);

  // Clear thinking indicator on unmount
  useEffect(() => {
    return () => {
      setWaitingForAI(false);
      setWaitingPlayerId("" as PlayerId);
    };
  }, []);

  return {
    waitingForAI,
    waitingPlayerId,
    handleAIMove,
  };
}
