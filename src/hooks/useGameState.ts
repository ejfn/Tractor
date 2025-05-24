import { useState, useRef, useEffect, useCallback } from "react";
import {
  GameState,
  Card,
  Suit,
  Rank,
  PlayerPosition,
  Player,
} from "../types/game";
import { initializeGame } from "../utils/gameLogic";
import { prepareNextRound, endRound } from "../utils/gameRoundManager";
import {
  declareTrumpSuit,
  checkAITrumpDeclaration,
  humanHasTrumpRank,
} from "../utils/trumpManager";
import { processPlay, validatePlay } from "../utils/gamePlayManager";
import {
  TRICK_RESULT_DISPLAY_TIME,
  CARD_SELECTION_DELAY,
  ROUND_COMPLETE_BUFFER,
} from "../utils/gameTimings";

// Interface for trick completion data
interface TrickCompletionData {
  winnerName: string;
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

  // Players are directly from gameState
  const players = gameState?.players || null;

  // Helper methods for player state management
  const getPlayer = useCallback(
    (playerId: string): Player | undefined => {
      return players?.[playerId];
    },
    [players],
  );

  const getPlayerByPosition = useCallback(
    (position: PlayerPosition): Player | undefined => {
      if (!players) return undefined;
      return Object.values(players).find(
        (player) => player.position === position,
      );
    },
    [players],
  );

  const getCurrentPlayer = useCallback((): Player | null => {
    if (!gameState || !players) {
      return null;
    }
    // Find current player using currentPlayerId
    const currentPlayer = players[gameState.currentPlayerId];
    if (!currentPlayer) {
      console.error(`Current player not found: ${gameState.currentPlayerId}`);
      return null;
    }
    return currentPlayer;
  }, [gameState, players]);

  const getHumanPlayer = useCallback((): Player | undefined => {
    if (!players) return undefined;
    return Object.values(players).find((player) => player.isHuman);
  }, [players]);

  const getAllPlayers = useCallback((): Player[] => {
    if (!players) return [];
    // Return in playing order (by players key order)
    return Object.values(players);
  }, [players]);

  const getPlayerIndex = useCallback(
    (playerId: string): number => {
      if (!gameState) return -1;
      const playerIds = Object.keys(gameState.players);
      return playerIds.findIndex((id) => id === playerId);
    },
    [gameState],
  );

  const getNextPlayerId = useCallback(
    (playerId: string): string | null => {
      if (!gameState) return null;
      const playerIds = Object.keys(gameState.players);
      const currentIndex = getPlayerIndex(playerId);
      if (currentIndex === -1) {
        console.error("Player not found:", playerId);
        return null;
      }
      const nextIndex = (currentIndex + 1) % playerIds.length;
      return playerIds[nextIndex];
    },
    [gameState, getPlayerIndex],
  );

  const setCurrentPlayer = useCallback(
    (playerId: string): void => {
      if (!gameState) return;
      setGameState({
        ...gameState,
        currentPlayerId: playerId,
      });
    },
    [gameState],
  );

  const setThinkingPlayer = useCallback(
    (playerId: string | undefined): void => {
      if (!gameState) return;

      // Update all players to clear/set thinking status
      const updatedPlayers = { ...gameState.players };
      Object.keys(updatedPlayers).forEach((id) => {
        updatedPlayers[id] = {
          ...updatedPlayers[id],
          isThinking: id === playerId,
        };
      });

      setGameState({
        ...gameState,
        players: updatedPlayers,
      });
    },
    [gameState],
  );

  const updatePlayer = useCallback(
    (playerId: string, updates: Partial<Omit<Player, "id">>): void => {
      if (!gameState) return;

      // Update the player in gameState
      setGameState({
        ...gameState,
        players: {
          ...gameState.players,
          [playerId]: {
            ...gameState.players[playerId],
            ...updates,
          },
        },
      });
    },
    [gameState],
  );

  // Game flow control
  const [showSetupInternal, setShowSetupInternal] = useState(false);
  const [showTrumpDeclaration, setShowTrumpDeclaration] = useState(false);
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
      initGame();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array for mount only

  // Initialize game
  const initGame = () => {
    if (!showSetupInternal && !gameState) {
      const newGameState = initializeGame(
        "You",
        ["Team A", "Team B"],
        Rank.Two,
      );

      setGameState(newGameState);

      // Check if player has trump rank to declare
      if (humanHasTrumpRank(newGameState)) {
        setShowTrumpDeclaration(true);
      }
    }
  };

  // Handle card selection
  const handleCardSelect = (card: Card) => {
    if (!gameState) return;

    const currentPlayer = getCurrentPlayer();
    if (!currentPlayer) return;

    // Handle trump declaration mode - select card but don't declare immediately
    if (showTrumpDeclaration) {
      if (card.rank === gameState.trumpInfo.trumpRank && card.suit) {
        // Toggle selection of trump cards
        if (gameState.selectedCards.some((c) => c.id === card.id)) {
          setGameState({
            ...gameState,
            selectedCards: [],
          });
        } else {
          setGameState({
            ...gameState,
            selectedCards: [card],
          });
        }
      }
      return;
    }

    if (gameState.gamePhase !== "playing") return;

    // Only allow current player to select cards
    if (
      gameState.currentPlayerId !== currentPlayer.id ||
      !currentPlayer.isHuman
    )
      return;

    // Toggle card selection
    if (gameState.selectedCards.some((c) => c.id === card.id)) {
      setGameState({
        ...gameState,
        selectedCards: gameState.selectedCards.filter((c) => c.id !== card.id),
      });
    } else {
      setGameState({
        ...gameState,
        selectedCards: [...gameState.selectedCards, card],
      });
    }
  };

  // Handle play button click
  const handlePlay = () => {
    if (!gameState || gameState.selectedCards.length === 0) return;

    const currentPlayer = getCurrentPlayer();
    if (!currentPlayer) return;

    // Check if play is valid
    const isValid = validatePlay(
      gameState,
      gameState.selectedCards,
      currentPlayer.id,
    );

    if (!isValid) {
      // In a real implementation, we'd show an alert or error message
      console.warn(
        "Invalid Play",
        "Please select a valid combination of cards.",
      );
      return;
    }

    // Store the cards locally before processing to avoid race conditions
    const cardsToPlay = [...gameState.selectedCards];

    // Add a short delay to allow players to see the selected cards before playing
    setTimeout(() => {
      // Clear selected cards just before processing the play
      setGameState((prev) =>
        prev
          ? {
              ...prev,
              selectedCards: [],
            }
          : null,
      );

      // Process the play - this will remove cards from the player's hand
      handleProcessPlay(cardsToPlay);
    }, CARD_SELECTION_DELAY);
  };

  // Process a play (wrapper around the utility function)
  const handleProcessPlay = (cards: Card[]) => {
    if (!gameState) return;

    const currentPlayer = getCurrentPlayer();
    if (!currentPlayer) return;
    const result = processPlay(gameState, cards, currentPlayer.id);

    // For trick complete scenario, we need to handle things in a specific order
    if (result.trickComplete && result.trickWinner && result.completedTrick) {
      // Trick completed - winner and points recorded

      // IMPORTANT: Store trick data in ref BEFORE updating state
      // This ensures the trick result handler can access it immediately
      if (result.completedTrick) {
        // Store trick completion data in a ref
        // IMPORTANT: A completed trick has leadingCombo (first play) + plays (follow plays)
        // For a 4-player game, the plays array should have exactly 3 entries when complete
        trickCompletionDataRef.current = {
          winnerName: result.trickWinner,
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
      const allCardsPlayed = Object.values(result.newState.players).every(
        (p) => p.hand.length === 0,
      );
      if (allCardsPlayed) {
        // Set game phase to 'roundEnd' to prevent AI moves
        const endingState = {
          ...result.newState,
          gamePhase: "roundEnd" as const,
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

  // Handle trump suit declaration
  const handleDeclareTrumpSuit = (suit: Suit | null) => {
    if (!gameState) return;

    const currentPlayer = getCurrentPlayer();
    if (!currentPlayer) return;
    const newState = declareTrumpSuit(gameState, suit, currentPlayer.id);

    setGameState({
      ...newState,
      selectedCards: [],
    });
    setShowTrumpDeclaration(false);
  };

  // Confirm trump declaration with selected card
  const handleConfirmTrumpDeclaration = () => {
    if (!gameState || gameState.selectedCards.length === 0) return;

    const selectedCard = gameState.selectedCards[0];
    if (selectedCard.suit) {
      handleDeclareTrumpSuit(selectedCard.suit);
    }
  };

  // Handle check for AI trump declaration
  const handleCheckAITrumpDeclaration = () => {
    if (
      !gameState ||
      gameState.gamePhase !== "declaring" ||
      showTrumpDeclaration
    )
      return;

    // Find the human player
    const humanPlayer = Object.values(gameState.players).find((p) => p.isHuman);
    if (humanPlayer) {
      const hasTrumpRank = humanPlayer.hand.some(
        (card) => card.rank === gameState.trumpInfo.trumpRank,
      );

      // If human doesn't have trump rank, let AI check
      if (!hasTrumpRank) {
        const { shouldDeclare, suit } = checkAITrumpDeclaration(gameState);

        if (shouldDeclare && suit) {
          handleDeclareTrumpSuit(suit);
        }
      }
    }
  };

  // Handle end of round
  const handleEndRound = (state: GameState) => {
    const result = endRound(state);

    if (result.gameOver) {
      // Set game phase to 'gameOver' to prevent AI moves
      const gameOverState = { ...state, gamePhase: "gameOver" as const };
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
      const nextRoundState = prepareNextRound(pendingStateRef.current, "You", [
        "Team A",
        "Team B",
      ]);

      setGameState(nextRoundState);
      pendingStateRef.current = null;

      // Check for trump declaration
      if (humanHasTrumpRank(nextRoundState)) {
        setShowTrumpDeclaration(true);
      }
    }
  };

  // Handle starting a new game
  const startNewGame = () => {
    setGameState(null);
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

      // When a trick is completed, clear the current trick
      // The winning player is already set as the current player in gamePlayManager
      const newState = {
        ...gameState,
        currentTrick: null,
      };

      // Set compatibility fields from PlayerStateManager
      // Current player is tracked by PlayerStateManager

      // Update the state
      setGameState(newState);

      // The useAITurns hook will detect the player state change and trigger AI moves automatically
    }
  };

  return {
    // State
    gameState,
    selectedCards: gameState?.selectedCards || [],
    showSetup: showSetupInternal,
    showTrumpDeclaration,
    gameOver,
    winner,
    showRoundComplete,
    roundCompleteMessage,
    teamNames: ["Team A", "Team B"] as [string, string],

    // Player management (unified)
    players,
    currentPlayerId: gameState?.currentPlayerId,
    trickLeaderId: gameState?.currentTrick?.leadingPlayerId,
    trickWinnerId: gameState?.currentTrick?.winningPlayerId,
    trumpDeclarerId: gameState?.trumpInfo.declarerPlayerId,
    thinkingPlayerId: players
      ? Object.values(players).find((p) => p.isThinking)?.id
      : undefined,

    // Player methods
    getPlayer,
    getPlayerByPosition,
    getCurrentPlayer,
    getHumanPlayer,
    getAllPlayers,
    getPlayerIndex,
    getNextPlayerId,
    setCurrentPlayer,
    setThinkingPlayer,
    updatePlayer,

    // Trick completion data ref (for communication with other hooks)
    trickCompletionDataRef,

    // Initializers
    initGame,

    // Actions
    handleCardSelect,
    handlePlay,
    handleProcessPlay,
    handleDeclareTrumpSuit,
    handleConfirmTrumpDeclaration,
    handleCheckAITrumpDeclaration,
    handleNextRound,
    startNewGame,
    handleTrickResultComplete,

    // Setters
    setGameState,
    setSelectedCards: (cards: Card[]) => {
      if (gameState) {
        setGameState({
          ...gameState,
          selectedCards: cards,
        });
      }
    },
    setShowSetup: setShowSetupInternal,
    setShowTrumpDeclaration,
  };
}
