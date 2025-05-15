import { useState, useEffect, useRef, useCallback } from 'react';
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

  // Handle AI move logic - using useCallback to prevent dependency cycle
  const handleAIMove = useCallback(() => {
    if (!gameState) {
      console.error("handleAIMove: gameState is null");
      setWaitingForAI(false);
      return;
    }

    // Since we're moving directly to implementation, let's be very explicit
    const playerIndex = gameState.currentPlayerIndex;
    const currentPlayer = gameState.players[playerIndex];
    console.log(`AI Move - Player: ${currentPlayer.name}, Index: ${playerIndex}`);
    
    // Log hand size for debugging
    console.log(`${currentPlayer.name} has ${currentPlayer.hand.length} cards`);

    // Safety check to ensure the current player is an AI
    if (currentPlayer.isHuman) {
      console.warn(`ERROR: handleAIMove called for human player ${currentPlayer.name}`);
      setWaitingForAI(false);
      return;
    }

    try {
      // Create a guaranteed copy of the gameState to avoid any potential issues
      const gameStateCopy = JSON.parse(JSON.stringify(gameState));
      
      // Get AI move with error handling
      console.log(`Getting AI move for ${currentPlayer.name}`);
      const { cards, error } = getAIMoveWithErrorHandling(gameStateCopy);

      if (error) {
        console.error(`Error in AI move logic for ${currentPlayer.name}:`, error);
        setWaitingForAI(false);
      } else if (cards && cards.length > 0) {
        // Process the AI's play - do this directly to avoid any callback issue
        console.log(`AI ${currentPlayer.name} playing ${cards.length} cards`);
        
        // This should trigger the actual game state update
        processPlay(cards);
      } else {
        console.warn(`AI ${currentPlayer.name} returned empty move`);
        
        // Force a fallback move if AI logic returned nothing
        if (currentPlayer.hand.length > 0) {
          console.log(`Using fallback move for ${currentPlayer.name}`);
          processPlay([currentPlayer.hand[0]]);
        } else {
          console.error(`Critical error: ${currentPlayer.name} has no cards in hand`);
          setWaitingForAI(false);
        }
      }
    } catch (error) {
      console.error(`Unexpected error in AI move handling: ${error instanceof Error ? error.message : String(error)}`);
      
      // Always ensure waiting flag is reset
      setWaitingForAI(false);
    }
  }, [gameState, processPlay]);

  // Handle AI turns
  useEffect(() => {
    if (gameState &&
        gameState.gamePhase === 'playing' &&
        !waitingForAI &&
        !showTrickResult && // Don't start a new AI move while showing trick result
        !lastCompletedTrick && // Also don't start a new AI move when there's a completed trick
        !gameState.players[gameState.currentPlayerIndex].isHuman) {

      // Debug log when AI turn is detected
      console.log(`AI Turn detected for ${gameState.players[gameState.currentPlayerIndex].name}`);
      
      // Set a delay for AI move to make the game feel more natural
      setWaitingForAI(true);
      const timer = setTimeout(() => {
        console.log("AI move timer triggered");
        
        // Debug current game state at the time the timer executes
        if (gameState) {
          console.log(`Current player: ${gameState.players[gameState.currentPlayerIndex].name}`);
          console.log(`Current game phase: ${gameState.gamePhase}`);
        }
        
        // Double check that the conditions still apply before executing the move
        // This prevents a race condition with trick completion
        if (gameState?.gamePhase === 'playing' &&
            !gameState.players[gameState.currentPlayerIndex].isHuman) {
          console.log(`Executing AI move for ${gameState.players[gameState.currentPlayerIndex].name}`);
          handleAIMove();
        } else {
          // Reset waiting flag if conditions changed while waiting
          console.log('Conditions changed while waiting for AI move - cancelling');
          setWaitingForAI(false);
        }
      }, 1000); // Reduced from 1500ms for faster testing

      aiTimerRef.current = timer as unknown as NodeJS.Timeout;
    }

    return () => {
      if (aiTimerRef.current) {
        clearTimeout(aiTimerRef.current);
      }
    };
  }, [gameState, waitingForAI, showTrickResult, lastCompletedTrick, handleAIMove]);

  return {
    waitingForAI,
    handleAIMove
  };
}