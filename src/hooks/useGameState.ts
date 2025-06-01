import { useCallback, useEffect, useRef, useState } from "react";
import { initializeGame } from "../game/gameLogic";
import { processPlay, validatePlay } from "../game/gamePlayManager";
import { endRound, prepareNextRound } from "../game/gameRoundManager";
import { Card, GamePhase, GameState } from "../types";
import { getAutoSelectedCards } from "../utils/cardAutoSelection";
import {
  CARD_SELECTION_DELAY,
  ROUND_COMPLETE_BUFFER,
  TRICK_RESULT_DISPLAY_TIME,
} from "../utils/gameTimings";

// Interface for trick completion data
interface TrickCompletionData {
  winnerId: string;
  points: number;
  completedTrick: any; // Using any to avoid circular dependencies
  timestamp: number;
}

/**
 * Hook for managing the complete game state
 * @returns Game state and state updater functions
 */
export function useGameState() {
  // Core game state
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedCards, setSelectedCards] = useState<Card[]>([]);
  const [isProcessingPlay, setIsProcessingPlay] = useState(false);

  // Game flow control
  const [showSetupInternal, setShowSetupInternal] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<"A" | "B" | null>(null);

  // Round completion
  const [showRoundComplete, setShowRoundComplete] = useState(false);
  const [roundCompleteMessage, setRoundCompleteMessage] = useState("");
  const pendingStateRef = useRef<GameState | null>(null);

  // Ref for trick completion data (used for communication with other hooks)
  const trickCompletionDataRef = useRef<TrickCompletionData | null>(null);

  // Initialize game on component mount if no game state exists
  useEffect(() => {
    if (!showSetupInternal && !gameState) {
      const newGameState = initializeGame();
      setGameState(newGameState);
    }
  }, [showSetupInternal, gameState]);

  // Initialize game (for manual initialization)
  const initGame = useCallback(() => {
    if (!showSetupInternal && !gameState) {
      const newGameState = initializeGame();
      setGameState(newGameState);
    }
  }, [showSetupInternal, gameState]);

  // Handle card selection
  const handleCardSelect = (card: Card) => {
    if (!gameState) return;

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];

    if (gameState.gamePhase !== GamePhase.Playing) return;

    // Only allow current player to select cards
    if (!currentPlayer.isHuman) return;

    // Determine if player is leading this trick
    const isLeading =
      !gameState.currentTrick || gameState.currentTrick.plays.length === 0;

    // Get leading combo if following
    const leadingCombo = gameState.currentTrick?.leadingCombo;

    // Use smart auto-selection logic
    const newSelection = getAutoSelectedCards(
      card,
      currentPlayer.hand,
      selectedCards,
      isLeading,
      leadingCombo,
      gameState.trumpInfo,
    );

    setSelectedCards(newSelection);
  };

  // Handle play button click
  const handlePlay = () => {
    if (!gameState || selectedCards.length === 0 || isProcessingPlay) return;

    // Set processing state to prevent double-taps
    setIsProcessingPlay(true);

    // Check if play is valid
    const isValid = validatePlay(gameState, selectedCards);

    if (!isValid) {
      // Reset processing state on validation error
      setIsProcessingPlay(false);
      // In a real implementation, we'd show an alert or error message
      console.warn(
        "Invalid Play",
        "Please select a valid combination of cards.",
      );
      return;
    }

    // Store the cards locally before processing to avoid race conditions
    const cardsToPlay = [...selectedCards];

    // Add a short delay to allow players to see the selected cards before playing
    setTimeout(() => {
      // Clear selected cards just before processing the play
      setSelectedCards([]);

      // Process the play - this will remove cards from the player's hand
      handleProcessPlay(cardsToPlay);

      // Reset processing state after play is complete
      setIsProcessingPlay(false);
    }, CARD_SELECTION_DELAY);
  };

  // Process a play (wrapper around the utility function)
  const handleProcessPlay = (cards: Card[]) => {
    if (!gameState) return;

    const result = processPlay(gameState, cards);

    // For trick complete scenario, we need to handle things in a specific order
    if (result.trickComplete && result.trickWinnerId && result.completedTrick) {
      // Trick completed - winner and points recorded

      // IMPORTANT: Store trick data in ref BEFORE updating state
      // This ensures the trick result handler can access it immediately
      if (result.completedTrick) {
        // Store trick completion data in a ref
        // IMPORTANT: A completed trick has leadingCombo (first play) + plays (follow plays)
        // For a 4-player game, the plays array should have exactly 3 entries when complete
        trickCompletionDataRef.current = {
          winnerId: result.trickWinnerId,
          points: result.trickPoints || 0,
          completedTrick: {
            ...result.completedTrick,
            // Make sure we deep copy all data to prevent reference issues
            plays: [...result.completedTrick.plays],
            leadingCombo: [...result.completedTrick.leadingCombo],
          },
          timestamp: Date.now(),
        };

        // Completed trick should have plays from all players except the leader
        // This ensures the trick structure is correct for display
      }

      // Now update game state AFTER setting up the trick completion data
      setGameState(result.newState);

      // Check for end of round (no cards left)
      const allCardsPlayed = result.newState.players.every(
        (p) => p.hand.length === 0,
      );
      if (allCardsPlayed) {
        // Set game phase to 'roundEnd' to prevent AI moves
        const endingState = {
          ...result.newState,
          gamePhase: GamePhase.RoundEnd,
        };
        setGameState(endingState);

        // Add delay to ensure trick result displays before round complete modal
        setTimeout(() => {
          handleEndRound(endingState);
        }, TRICK_RESULT_DISPLAY_TIME + ROUND_COMPLETE_BUFFER);
      }
    } else {
      // Regular play (not completing a trick)
      setGameState(result.newState);
    }
  };

  // Handle end of round
  const handleEndRound = (state: GameState) => {
    const result = endRound(state);

    if (result.gameOver) {
      // Set game phase to 'gameOver' to prevent AI moves
      const gameOverState = { ...state, gamePhase: GamePhase.GameOver };
      setGameState(gameOverState);
      setGameOver(true);
      setWinner(result.winner);
    } else {
      setRoundCompleteMessage(result.roundCompleteMessage);
      setShowRoundComplete(true);

      // Store the state to be processed after the modal is dismissed
      pendingStateRef.current = result.newState;
    }
  };

  // Handle proceeding to next round
  const handleNextRound = () => {
    setShowRoundComplete(false);

    // Process the pending state after the modal animation completes
    if (pendingStateRef.current) {
      const nextRoundState = prepareNextRound(pendingStateRef.current);

      setGameState(nextRoundState);
      pendingStateRef.current = null;
    }
  };

  // Handle starting a new game
  const startNewGame = () => {
    setGameState(null);
    setSelectedCards([]);
    setShowSetupInternal(false);
    setGameOver(false);
    setWinner(null);
    pendingStateRef.current = null;

    // Initialize will be called on next render due to dependency changes
  };

  // Function to clear trick after result is displayed
  const handleTrickResultComplete = () => {
    if (gameState) {
      // Now safe to clear currentTrick from game state

      // When a trick is completed, the winning player becomes the next player to lead
      // Derive the winning player index from currentTrick.winningPlayerId
      const winningPlayerIndex = gameState.currentTrick?.winningPlayerId
        ? gameState.players.findIndex(
            (p) => p.id === gameState.currentTrick!.winningPlayerId,
          )
        : -1;

      // Create a new state copy with currentTrick set to null and player index set to the winner
      const newState = {
        ...gameState,
        currentTrick: null,
        currentPlayerIndex:
          winningPlayerIndex >= 0
            ? winningPlayerIndex
            : gameState.currentPlayerIndex,
      };

      // Update the state
      setGameState(newState);

      // The useAITurns hook will detect the currentPlayerIndex change and trigger AI moves automatically
    }
  };

  return {
    // State
    gameState,
    selectedCards,
    showSetup: showSetupInternal,
    gameOver,
    winner,
    showRoundComplete,
    roundCompleteMessage,
    isProcessingPlay,

    // Trick completion data ref (for communication with other hooks)
    trickCompletionDataRef,

    // Initializers
    initGame,

    // Actions
    handleCardSelect,
    handlePlay,
    handleProcessPlay,
    handleNextRound,
    startNewGame,
    handleTrickResultComplete,

    // Setters
    setGameState,
    setSelectedCards,
    setShowSetup: setShowSetupInternal,
  };
}
