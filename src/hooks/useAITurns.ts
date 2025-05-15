import { useState, useEffect, useRef, useCallback } from 'react';
import { GameState, Card } from '../types/game';
import { getAIMoveWithErrorHandling } from '../utils/gamePlayManager';
import { 
  AI_MOVE_DELAY,
  MOVE_COMPLETION_DELAY
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
  lastCompletedTrick: any | null  // Using any to match original implementation
) {
  const [waitingForAI, setWaitingForAI] = useState(false);
  // Track which AI we're waiting for
  const [waitingPlayerId, setWaitingPlayerId] = useState<string>('');
  
  // Debug monitoring effect removed - was tracking waitingForAI state changes
  const aiTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastProcessedTurnRef = useRef<{ playerIndex: number; timestamp: number } | null>(null);

  // Handle AI move logic - using useCallback to prevent dependency cycle
  const handleAIMove = useCallback(() => {
    if (!gameState) {
      console.error("handleAIMove: gameState is null");
      setWaitingForAI(false);
      setWaitingPlayerId('');
      return;
    }

    // Since we're moving directly to implementation, let's be very explicit
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
    
    // Block if we're showing trick result or have a completed trick waiting
    // This helps prevent "thinking of next trick round is showing before trick result disappears"
    if (showTrickResult || lastCompletedTrick) {
      // AI move blocked while trick result is showing
      setWaitingForAI(false);
      setWaitingPlayerId('');
      return;
    }
    
    const currentPlayer = gameState.players[playerIndex];
    // AI Move - Player: currentPlayer.name, Index: playerIndex
    
    // Special debug data for problem bots (ai1, ai2) removed
    
    // Player hand size: currentPlayer.hand.length

    // Safety check to ensure the current player is an AI
    if (currentPlayer.isHuman) {
      console.warn(`ERROR: handleAIMove called for human player ${currentPlayer.name}`);
      setWaitingForAI(false);
      return;
    }

    // Additional safety checks for ALL bots - double-check game state
    // No special handling - treat all AI players the same
    const botReady = gameState.gamePhase === 'playing' && !showTrickResult;
    
    if (!botReady) {
      console.warn(`${currentPlayer.name} move attempted during invalid game state: phase=${gameState.gamePhase}, showResult=${showTrickResult}`);
      
      setWaitingForAI(false);
      return;
    }
    
    // Bot validated and ready to play

    try {
      // Create a guaranteed copy of the gameState to avoid any potential issues
      const gameStateCopy = JSON.parse(JSON.stringify(gameState));
      
      // Get AI move with error handling
      const { cards, error } = getAIMoveWithErrorHandling(gameStateCopy);

      // Use the AI-calculated move for all bots (removed forced play)
      // This ensures proper game rules are followed

      if (error) {
        console.error(`Error in AI move logic for ${currentPlayer.name}:`, error);
        
        // Don't force any bots to play cards that might violate game rules
        
        // Reset waiting state
        setWaitingForAI(false);
        setWaitingPlayerId('');
        
        // Throw error immediately without delay
        throw new Error(`Fatal game error: AI ${currentPlayer.name} could not make a valid move (${error}). In Tractor, invalid moves are not allowed.`);
      } else if (cards && cards.length > 0) {
        // Process the AI's play - do this directly to avoid any callback issue
        // AI playing cards
        
        // Mark this turn as processed to prevent duplicates
        lastProcessedTurnRef.current = {
          playerIndex,
          timestamp: Date.now()
        };
        
        // This should trigger the actual game state update
        processPlay(cards);
        
        // Reset waiting flag after a delay to allow state updates to propagate
        // and to ensure thinking indicator remains visible long enough
        setTimeout(() => {
          // Only reset if this player is still the current player and we're still waiting
          // This prevents incorrectly resetting during transitions
          if (gameState.currentPlayerIndex === playerIndex && waitingForAI && waitingPlayerId === currentPlayer.id) {
            // Reset waiting state
            setWaitingForAI(false);
            setWaitingPlayerId('');
          } else {
            // Player or state changed - don't reset
          }
        }, MOVE_COMPLETION_DELAY);
      } else {
        console.warn(`AI ${currentPlayer.name} returned empty move`);
        
        // Do not force a move - this could violate game rules
        
        // Reset waiting state
        setWaitingForAI(false);
        setWaitingPlayerId('');
        
        // Throw error immediately without delay
        throw new Error(`Fatal game error: AI ${currentPlayer.name} could not determine a valid move. Empty moves are not allowed in Tractor.`);
      }
    } catch (error) {
      console.error(`Unexpected error in AI move handling: ${error instanceof Error ? error.message : String(error)}`);
      
      // Do NOT use emergency fallback that forces potentially invalid moves
      
      // Reset waiting state
      setWaitingForAI(false);
      setWaitingPlayerId('');
      
      // Throw error immediately without delay
      throw new Error(`Fatal game error: Unexpected error in AI move handling for ${currentPlayer.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [gameState, processPlay, waitingForAI, waitingPlayerId, showTrickResult, lastCompletedTrick]);
  
  // Track player index changes
  const currentPlayerIndexRef = useRef<number | null>(null);
  
  // This effect detects transitions to ANY AI bot (including Bot 3)
  useEffect(() => {
    if (!gameState) return;
    
    // CRITICAL CHECK: Never process player transitions while a trick result is showing
    // or when we have a completed trick that needs to be processed
    if (showTrickResult || lastCompletedTrick) {
      return;
    }
    
    // Player transition detection
    if (currentPlayerIndexRef.current !== null &&
        currentPlayerIndexRef.current !== gameState.currentPlayerIndex) {
      
      // Find player indices
      const prevPlayerIndex = currentPlayerIndexRef.current;
      const currentPlayerIndex = gameState.currentPlayerIndex;
      
      // Get current player
      const currentPlayer = gameState.players[currentPlayerIndex];
      
      // Player transition detected
      
      // IMPORTANT: Block processing during trick results to avoid flashing thinking indicators
      if (showTrickResult || lastCompletedTrick) {
        // Skip processing during trick result display
        currentPlayerIndexRef.current = currentPlayerIndex; // Update the ref but don't process
        return;
      }
      
      // Check if this is a transition to any AI player
      if (!currentPlayer.isHuman) {
        // AI player transition detected
        
        // Only perform this if we're in the playing phase, not showing trick results, and no completed trick
        // Block when showing trick results or when we have a completed trick
        if (gameState.gamePhase === 'playing' && !showTrickResult && !lastCompletedTrick) {
          
          // Set waitingForAI and track the player we're waiting for
          if (!waitingForAI) {
            setWaitingForAI(true);
            setWaitingPlayerId(currentPlayer.id);
          }
          
          // Then delay the actual AI move for better pacing
          setTimeout(() => {
            // Only proceed with move if we're still in a valid state
            if (gameState.gamePhase === 'playing' && !showTrickResult) {
              handleAIMove();
            } else {
              // Reset waiting state if conditions changed
              setWaitingForAI(false);
              setWaitingPlayerId('');
              // No special handling needed
            }
          }, AI_MOVE_DELAY);
        } else {
          // If we're not immediately processing, still check conditions after a brief delay
          // This addresses potential race conditions with game phase or result display
          setTimeout(() => {
            // Check all conditions to ensure we don't show thinking during trick results
            if (gameState.gamePhase === 'playing' && !showTrickResult && !lastCompletedTrick && !waitingForAI) {
              // Delayed showing thinking indicator
              setWaitingForAI(true);
              setWaitingPlayerId(currentPlayer.id);
              
              // Additional delay for the actual move
              setTimeout(() => {
                handleAIMove();
              }, AI_MOVE_DELAY);
            } else {
              // Reset waiting state if conditions not met
              if (waitingForAI && waitingPlayerId === currentPlayer.id) {
                // Reset waiting state
                setWaitingForAI(false);
                setWaitingPlayerId('');
              }
              // Allow normal handling in the other effect
            }
          }, 100); // Much shorter delay for the condition check
        }
      }
      
      // Update ref for next check
      currentPlayerIndexRef.current = currentPlayerIndex;
    } else if (currentPlayerIndexRef.current === null) {
      // Initialize on first run
      currentPlayerIndexRef.current = gameState.currentPlayerIndex;
    }
  }, [gameState?.currentPlayerIndex, gameState?.gamePhase, showTrickResult, lastCompletedTrick, handleAIMove, waitingForAI]);
  
  // Emergency reset mechanism has been removed to avoid hiding underlying issues
  // If there are mismatches between player states, they should be fixed properly at the source

  // The main effect that handles ALL OTHER AI turns (not the special ones)
  useEffect(() => {
    // Skip if no game state
    if (!gameState) return;
    
    // Don't proceed if waiting for AI already, showing trick result, or trick was just completed
    // Block AI turns when the trick result is showing or when we have a completed trick
    if (waitingForAI || 
        showTrickResult || 
        lastCompletedTrick || // Critical to prevent thinking indicators before trick result is fully gone
        gameState.gamePhase !== 'playing') {
      // Skip AI turn during trick result display
      return;
    }
    
    // Check if current player is AI
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (currentPlayer.isHuman) {
      return; // Human player's turn, do nothing
    }
    
    // Current player is an AI player
    
    // Set waitingForAI to true immediately to show thinking indicator
    setWaitingForAI(true);
    setWaitingPlayerId(currentPlayer.id);
    
    // Then delay the actual AI move for better pacing
    setTimeout(() => {
      // Process AI move after a short delay
      handleAIMove();
    }, AI_MOVE_DELAY);
    
    // Cleanup timer on unmount/effect cleanup
    return () => {
      if (aiTimerRef.current) {
        clearTimeout(aiTimerRef.current);
        aiTimerRef.current = null;
      }
    };
  }, [
    gameState?.players,  // Add this to ensure the effect re-runs when players change
    gameState?.currentPlayerIndex, 
    gameState?.gamePhase,
    waitingForAI,
    showTrickResult,
    lastCompletedTrick,
    handleAIMove
  ]);

  return {
    waitingForAI,
    waitingPlayerId,
    handleAIMove
  };
}