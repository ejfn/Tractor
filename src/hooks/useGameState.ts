import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { initializeGame } from "../utils/gameInitialization";
import { putbackKittyCards, validateKittySwap } from "../game/kittyManager";
import { processPlay, validatePlay } from "../game/playProcessing";
import { endRound, prepareNextRound } from "../game/gameRoundManager";
import {
  Card,
  GamePhase,
  GameState,
  PlayerId,
  RoundResult,
  Trick,
} from "../types";
import { getAutoSelectedCards } from "../utils/cardAutoSelection";
import { sortCards } from "../utils/cardSorting";
import {
  CARD_SELECTION_DELAY,
  ROUND_COMPLETE_BUFFER,
  TRICK_RESULT_DISPLAY_TIME,
} from "../utils/gameTimings";

// Interface for trick completion data
interface TrickCompletionData {
  winnerId: PlayerId;
  points: number;
  completedTrick: Trick;
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

  // Track previous game phase to detect transitions
  const [previousGamePhase, setPreviousGamePhase] = useState<GamePhase | null>(
    null,
  );

  // Game flow control
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<"A" | "B" | null>(null);

  // Round completion
  const [showRoundComplete, setShowRoundComplete] = useState(false);
  const [roundCompleteMessage, setRoundCompleteMessage] = useState("");
  const pendingStateRef = useRef<GameState | null>(null);

  // Ref for trick completion data (used for communication with other hooks)
  const trickCompletionDataRef = useRef<TrickCompletionData | null>(null);

  // Ref to store kitty cards for pre-selection
  const kittyCardsRef = useRef<Card[]>([]);

  // Initialize game on component mount if no game state exists
  useEffect(() => {
    if (!gameState) {
      const newGameState = initializeGame();
      setGameState(newGameState);
    }
  }, [gameState]);

  // Extract relevant values for kitty swap detection
  const gamePhase = gameState?.gamePhase;
  const currentPlayer = useMemo(() => {
    return gameState?.players?.[gameState.currentPlayerIndex];
  }, [gameState?.players, gameState?.currentPlayerIndex]);

  // Effect to handle KittySwap phase transition and pre-select kitty cards
  useEffect(() => {
    if (!gameState || !currentPlayer) return;

    // Detect transition to KittySwap phase
    if (
      previousGamePhase !== GamePhase.KittySwap &&
      gamePhase === GamePhase.KittySwap
    ) {
      // Only pre-select for human player
      if (currentPlayer.isHuman) {
        // The last 8 cards in the hand are the kitty cards (they were just added)
        const handSize = currentPlayer.hand.length;
        const kittyCards = currentPlayer.hand.slice(handSize - 8);

        // Store kitty cards in ref for later reference
        kittyCardsRef.current = kittyCards;

        // Pre-select the kitty cards
        setSelectedCards(kittyCards);
      }
    }

    // Update previous phase
    setPreviousGamePhase(gamePhase || null);
  }, [gamePhase, currentPlayer, previousGamePhase, gameState]);

  // Initialize game (for manual initialization)
  const initGame = useCallback(() => {
    if (!gameState) {
      const newGameState = initializeGame();
      setGameState(newGameState);
    }
  }, [gameState]);

  // Handle card selection
  const handleCardSelect = (card: Card) => {
    if (!gameState) return;

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];

    // Allow card selection in Playing and KittySwap phases
    if (
      gameState.gamePhase !== GamePhase.Playing &&
      gameState.gamePhase !== GamePhase.KittySwap
    )
      return;

    // Only allow current player to select cards
    if (!currentPlayer.isHuman) return;

    if (gameState.gamePhase === GamePhase.KittySwap) {
      // Simple selection/deselection for kitty swap
      const isSelected = selectedCards.some(
        (selected) => selected.id === card.id,
      );

      if (isSelected) {
        // Deselect the card
        setSelectedCards(
          selectedCards.filter((selected) => selected.id !== card.id),
        );
      } else {
        // Select the card (if not already at max 8)
        if (selectedCards.length < 8) {
          setSelectedCards([...selectedCards, card]);
        }
      }
    } else {
      // Normal playing phase - use smart auto-selection logic
      // Determine if player is leading this trick
      const isLeading =
        !gameState.currentTrick || gameState.currentTrick.plays.length === 0;

      // Get leading cards if following
      const leadingCards = gameState.currentTrick?.plays[0]?.cards;

      // Use smart auto-selection logic
      const newSelection = getAutoSelectedCards(
        card,
        currentPlayer.hand,
        selectedCards,
        isLeading,
        leadingCards,
        gameState.trumpInfo,
      );

      setSelectedCards(newSelection);
    }
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

    // Store the cards locally and sort them for consistent visual presentation
    const cardsToPlay = sortCards([...selectedCards], gameState.trumpInfo);

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

  // Handle kitty swap
  const handleKittySwap = () => {
    if (!gameState || gameState.gamePhase !== GamePhase.KittySwap) return;

    if (!validateKittySwap(selectedCards)) {
      console.warn("Invalid Kitty Swap", "Please select exactly 8 cards.");
      return;
    }

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (!currentPlayer.isHuman) return;

    try {
      // Put back selected cards to kitty and transition to playing phase
      const newGameState = putbackKittyCards(
        gameState,
        selectedCards,
        currentPlayer.id,
      );
      setGameState(newGameState);
      setSelectedCards([]);
    } catch (error) {
      console.error("Kitty swap failed:", error);
    }
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

  // Store round result for processing after modal dismissal
  const roundResultRef = useRef<RoundResult | null>(null);

  // Handle end of round
  const handleEndRound = (state: GameState) => {
    const roundResult = endRound(state);

    if (roundResult.gameOver) {
      // Set game phase to 'gameOver' to prevent AI moves
      const gameOverState = { ...state, gamePhase: GamePhase.GameOver };
      setGameState(gameOverState);
      setGameOver(true);
      setWinner(roundResult.gameWinner || null);
    } else {
      setRoundCompleteMessage(roundResult.roundCompleteMessage);
      setShowRoundComplete(true);

      // Store the round result and current state for processing after modal dismissal
      roundResultRef.current = roundResult;
      pendingStateRef.current = state; // Store current state, not modified state
    }
  };

  // Handle proceeding to next round
  const handleNextRound = () => {
    setShowRoundComplete(false);

    // Process the pending state and round result after the modal animation completes
    if (pendingStateRef.current && roundResultRef.current) {
      const nextRoundState = prepareNextRound(
        pendingStateRef.current,
        roundResultRef.current,
      );

      setGameState(nextRoundState);
      pendingStateRef.current = null;
      roundResultRef.current = null;
    }
  };

  // Handle starting a new game
  const startNewGame = () => {
    setGameState(null);
    setSelectedCards([]);
    setGameOver(false);
    setWinner(null);
    setShowRoundComplete(false);
    setRoundCompleteMessage("");
    setPreviousGamePhase(null);
    pendingStateRef.current = null;
    roundResultRef.current = null;
    kittyCardsRef.current = [];

    // Initialize will be called on next render due to dependency changes
  };

  // Function to clear trick after result is displayed
  const handleTrickResultComplete = () => {
    if (gameState) {
      // Now safe to clear currentTrick from game state

      // When a trick is completed, the winning player becomes the next player to lead
      // Derive the winning player index from currentTrick.winningPlayerId
      const currentTrick = gameState.currentTrick;
      const winningPlayerIndex = currentTrick?.winningPlayerId
        ? gameState.players.findIndex(
            (p) => p.id === currentTrick.winningPlayerId,
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
    gameOver,
    winner,
    showRoundComplete,
    roundCompleteMessage,
    isProcessingPlay,

    // Trick completion data ref (for communication with other hooks)
    trickCompletionDataRef,

    // Round result ref (for round complete modal)
    roundResultRef,

    // Initializers
    initGame,

    // Actions
    handleCardSelect,
    handlePlay,
    handleKittySwap,
    handleProcessPlay,
    handleNextRound,
    startNewGame,
    handleTrickResultComplete,

    // Setters
    setGameState,
    setSelectedCards,
  };
}
