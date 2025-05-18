import { useState, useRef, useEffect } from 'react';
import { GameState, Card, Suit, Rank } from '../types/game';
import { initializeGame } from '../utils/gameLogic';
import { 
  prepareNextRound, 
  endRound 
} from '../utils/gameRoundManager';
import { 
  declareTrumpSuit, 
  checkAITrumpDeclaration, 
  humanHasTrumpRank 
} from '../utils/trumpManager';
import {
  processPlay,
  validatePlay
} from '../utils/gamePlayManager';
// import { MOVE_COMPLETION_DELAY } from '../utils/gameTimings';

/**
 * Configuration for the game setup
 */
interface GameConfig {
  playerName: string;
  teamNames: [string, string];
  startingRank: Rank;
}

// Interface for trick completion data
interface TrickCompletionData {
  winnerName: string;
  points: number;
  completedTrick: any; // Using any to avoid circular dependencies
  timestamp: number;
}

/**
 * Hook for managing the complete game state
 * @param config Game configuration
 * @returns Game state and state updater functions
 */
export function useGameState(config: GameConfig) {
  // Core game state
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedCards, setSelectedCards] = useState<Card[]>([]);
  
  // Game flow control
  const [showSetupInternal, setShowSetupInternal] = useState(false);
  const [showTrumpDeclaration, setShowTrumpDeclaration] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<'A' | 'B' | null>(null);
  
  // Round completion
  const [showRoundComplete, setShowRoundComplete] = useState(false);
  const [roundCompleteMessage, setRoundCompleteMessage] = useState('');
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
        config.playerName,
        config.teamNames,
        config.startingRank
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
    
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    
    // Handle trump declaration mode - select card but don't declare immediately
    if (showTrumpDeclaration && currentPlayer.isHuman) {
      if (card.rank === gameState.trumpInfo.trumpRank && card.suit) {
        // Toggle selection of trump cards
        if (selectedCards.some(c => c.id === card.id)) {
          setSelectedCards([]);
        } else {
          setSelectedCards([card]);
        }
      }
      return;
    }
    
    if (gameState.gamePhase !== 'playing') return;
    
    // Only allow current player to select cards
    if (!currentPlayer.isHuman) return;
    
    // Toggle card selection
    if (selectedCards.some(c => c.id === card.id)) {
      setSelectedCards(selectedCards.filter(c => c.id !== card.id));
    } else {
      setSelectedCards([...selectedCards, card]);
    }
  };

  // Handle play button click
  const handlePlay = () => {
    if (!gameState || selectedCards.length === 0) return;
    
    // Check if play is valid
    const isValid = validatePlay(gameState, selectedCards);
    
    if (!isValid) {
      // In a real implementation, we'd show an alert or error message
      console.warn('Invalid Play', 'Please select a valid combination of cards.');
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
    }, 250); // Short delay just to keep the UI responsive
  };

  // Process a play (wrapper around the utility function)
  const handleProcessPlay = (cards: Card[]) => {
    if (!gameState) return;
    
    const result = processPlay(gameState, cards);
    
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
            leadingCombo: [...result.completedTrick.leadingCombo]
          },
          timestamp: Date.now()
        };
        
        // Completed trick should have plays from all players except the leader
        // This ensures the trick structure is correct for display
      }
      
      // Now update game state AFTER setting up the trick completion data
      setGameState(result.newState);
      
      // Check for end of round (no cards left)
      const allCardsPlayed = result.newState.players.every(p => p.hand.length === 0);
      if (allCardsPlayed) {
        handleEndRound(result.newState);
      }
    } else {
      // Regular play (not completing a trick)
      setGameState(result.newState);
    }
  };

  // Handle trump suit declaration
  const handleDeclareTrumpSuit = (suit: Suit | null) => {
    if (!gameState) return;
    
    const newState = declareTrumpSuit(gameState, suit);
    setGameState(newState);
    setShowTrumpDeclaration(false);
    setSelectedCards([]);
  };
  
  // Confirm trump declaration with selected card
  const handleConfirmTrumpDeclaration = () => {
    if (!gameState || selectedCards.length === 0) return;
    
    const selectedCard = selectedCards[0];
    if (selectedCard.suit) {
      handleDeclareTrumpSuit(selectedCard.suit);
    }
  };

  // Handle check for AI trump declaration
  const handleCheckAITrumpDeclaration = () => {
    if (!gameState || gameState.gamePhase !== 'declaring' || showTrumpDeclaration) return;
    
    // Find the human player
    const humanPlayer = gameState.players.find(p => p.isHuman);
    if (humanPlayer) {
      const hasTrumpRank = humanPlayer.hand.some(
        card => card.rank === gameState.trumpInfo.trumpRank
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
      const nextRoundState = prepareNextRound(
        pendingStateRef.current,
        config.playerName,
        config.teamNames
      );
      
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
      // winningPlayerIndex is set in gamePlayManager.ts when determining the trick winner
      
      // Create a new state copy with currentTrick set to null and player index set to the winner
      const newState = {
        ...gameState,
        currentTrick: null,
        currentPlayerIndex: gameState.winningPlayerIndex ?? gameState.currentPlayerIndex, // Use the winner as next player
        winningPlayerIndex: undefined // Clear the winning player index
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
    showTrumpDeclaration,
    gameOver,
    winner,
    showRoundComplete,
    roundCompleteMessage,
    
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
    setSelectedCards,
    setShowSetup: setShowSetupInternal,
    setShowTrumpDeclaration
  };
}