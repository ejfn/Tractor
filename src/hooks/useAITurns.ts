import { useState, useEffect, useRef } from 'react';
import { GameState, Card } from '../types/game';
import { getAIMoveWithErrorHandling } from '../utils/gamePlayManager';

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
  lastCompletedTrick: any | null  // Using any to match original implementation
) {
  const [waitingForAI, setWaitingForAI] = useState(false);
  const aiTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Handle AI turns
  useEffect(() => {
    if (gameState &&
        gameState.gamePhase === 'playing' &&
        !waitingForAI &&
        !showTrickResult && // Don't start a new AI move while showing trick result
        !lastCompletedTrick && // Also don't start a new AI move when there's a completed trick
        !gameState.players[gameState.currentPlayerIndex].isHuman) {

      // Set a delay for AI move to make the game feel more natural
      setWaitingForAI(true);
      const timer = setTimeout(() => {
        // Double check that the conditions still apply before executing the move
        // This prevents a race condition with trick completion
        if (gameState?.gamePhase === 'playing' &&
            !gameState.players[gameState.currentPlayerIndex].isHuman) {
          handleAIMove();
        } else {
          // Reset waiting flag if conditions changed while waiting
          setWaitingForAI(false);
        }
      }, 1500);

      aiTimerRef.current = timer as unknown as NodeJS.Timeout;
    }

    return () => {
      if (aiTimerRef.current) {
        clearTimeout(aiTimerRef.current);
      }
    };
  }, [gameState, waitingForAI, showTrickResult, lastCompletedTrick]);

  // Handle AI move logic
  const handleAIMove = () => {
    if (!gameState) return;

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];

    // Safety check to ensure the current player is an AI
    if (currentPlayer.isHuman) {
      console.warn("handleAIMove called for human player");
      setWaitingForAI(false);
      return;
    }

    try {
      // Get AI move with error handling
      const { cards, error } = getAIMoveWithErrorHandling(gameState);

      if (error) {
        console.error("Error in AI move logic:", error);
        
        // Move to next player as emergency recovery
        const newState = { ...gameState };
        newState.currentPlayerIndex = (newState.currentPlayerIndex + 1) % newState.players.length;
        // This would normally update the game state, but we're decoupling that responsibility
        // The caller should handle this through a callback if needed
      } else if (cards.length > 0) {
        // Process the AI's play
        processPlay(cards);
      }
    } catch (error) {
      console.error("Unexpected error in AI move handling:", error);
    }

    setWaitingForAI(false);
  };

  return {
    waitingForAI,
    handleAIMove
  };
}