import { useState, useEffect, useRef, useCallback } from 'react';
import { GameState, Card } from '../types/game';
import { getAIMoveWithErrorHandling } from '../utils/gamePlayManager';
import { 
  AI_MOVE_DELAY
} from '../utils/gameTimings';

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
  lastCompletedTrick: any | null,  // Using any to match original implementation
  showRoundComplete: boolean = false  // Optional parameter for round completion
) {
  const [waitingForAI, setWaitingForAI] = useState(false);
  // Track which AI we're waiting for
  const [waitingPlayerId, setWaitingPlayerId] = useState<string>('');
  
  const lastProcessedTurnRef = useRef<{ playerIndex: number; timestamp: number } | null>(null);

  // Handle AI move logic - using useCallback to prevent dependency cycle
  const handleAIMove = useCallback(() => {
    if (!gameState) {
      console.error("handleAIMove: gameState is null");
      setWaitingForAI(false);
      setWaitingPlayerId('');
      return;
    }

    const playerIndex = gameState.currentPlayerIndex;
    
    // Make sure we haven't just processed this same player turn
    // This prevents potential duplicate moves if called multiple times
    if (lastProcessedTurnRef.current && 
        lastProcessedTurnRef.current.playerIndex === playerIndex &&
        Date.now() - lastProcessedTurnRef.current.timestamp < 500) {
      // Duplicate AI move detected, ignoring
      setWaitingForAI(false);
      setWaitingPlayerId('');
      return;
    }
    
    // Block if we're showing trick result, have a completed trick waiting, or round is complete
    // This helps prevent "thinking of next trick round is showing before trick result disappears"
    if (showTrickResult || lastCompletedTrick || showRoundComplete) {
      // AI move blocked while trick result is showing or round complete
      setWaitingForAI(false);
      setWaitingPlayerId('');
      return;
    }
    
    const currentPlayer = gameState.players[playerIndex];
    
    // Safety check to ensure the current player is an AI
    if (currentPlayer.isHuman) {
      console.warn(`ERROR: handleAIMove called for human player ${currentPlayer.name}`);
      setWaitingForAI(false);
      return;
    }

    // Additional safety checks for ALL bots - double-check game state
    const botReady = gameState.gamePhase === 'playing' && !showTrickResult && !showRoundComplete;
    
    if (!botReady) {
      console.warn(`${currentPlayer.name} move attempted during invalid game state: phase=${gameState.gamePhase}, showResult=${showTrickResult}, roundComplete=${showRoundComplete}`);
      
      setWaitingForAI(false);
      setWaitingPlayerId('');
      return;
    }

    try {
      // Create a guaranteed copy of the gameState to avoid any potential issues
      const gameStateCopy = JSON.parse(JSON.stringify(gameState));
      
      // Get AI move with error handling
      const { cards, error } = getAIMoveWithErrorHandling(gameStateCopy);

      if (error) {
        console.error(`Error in AI move logic for ${currentPlayer.name}:`, error);
        
        // Reset waiting state
        setWaitingForAI(false);
        setWaitingPlayerId('');
        
        // Throw error immediately without delay
        throw new Error(`Fatal game error: AI ${currentPlayer.name} could not make a valid move (${error}). In Tractor, invalid moves are not allowed.`);
      } else if (cards && cards.length > 0) {
        // Mark this turn as processed to prevent duplicates
        lastProcessedTurnRef.current = {
          playerIndex,
          timestamp: Date.now()
        };
        
        // This should trigger the actual game state update
        processPlay(cards);
        
        // Immediately reset the thinking indicator after processing the play
        // The player will change, so we don't need to wait
        setWaitingForAI(false);
        setWaitingPlayerId('');
      } else {
        console.warn(`AI ${currentPlayer.name} returned empty move`);
        
        // Reset waiting state
        setWaitingForAI(false);
        setWaitingPlayerId('');
        
        // Throw error immediately without delay
        throw new Error(`Fatal game error: AI ${currentPlayer.name} could not determine a valid move. Empty moves are not allowed in Tractor.`);
      }
    } catch (error) {
      console.error(`Unexpected error in AI move handling: ${error instanceof Error ? error.message : String(error)}`);
      
      // Reset waiting state
      setWaitingForAI(false);
      setWaitingPlayerId('');
      
      // Throw error immediately without delay
      throw new Error(`Fatal game error: Unexpected error in AI move handling for ${currentPlayer.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [gameState, processPlay, showTrickResult, lastCompletedTrick, showRoundComplete]);
  
  // Main effect for AI turn detection
  useEffect(() => {
    if (!gameState) return;
    
    // Block processing if showing trick result, round complete, or not playing
    if (showTrickResult || lastCompletedTrick || showRoundComplete || gameState.gamePhase !== 'playing') {
      return;
    }
    
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    
    // If it's a human player's turn, clear any lingering thinking indicators
    if (currentPlayer.isHuman) {
      if (waitingForAI) {
        setWaitingForAI(false);
        setWaitingPlayerId('');
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
    gameState
  ]);
  
  // Clear thinking indicator when game phase changes
  useEffect(() => {
    if (!gameState) return;
    
    // If game is not in playing phase, clear any thinking indicators
    if (gameState.gamePhase !== 'playing' && waitingForAI) {
      setWaitingForAI(false);
      setWaitingPlayerId('');
    }
  }, [gameState, gameState?.gamePhase, waitingForAI]);
  
  // Clear thinking indicator on unmount
  useEffect(() => {
    return () => {
      setWaitingForAI(false);
      setWaitingPlayerId('');
    };
  }, []);

  return {
    waitingForAI,
    waitingPlayerId,
    handleAIMove
  };
}