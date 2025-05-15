import { useState, useRef } from 'react';
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

/**
 * Configuration for the game setup
 */
interface GameConfig {
  playerName: string;
  teamNames: [string, string];
  startingRank: Rank;
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
    if (gameState?.gamePhase !== 'playing') return;
    
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    
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
    
    // Process the play
    handleProcessPlay(selectedCards);
    setSelectedCards([]);
  };

  // Process a play (wrapper around the utility function)
  const handleProcessPlay = (cards: Card[]) => {
    if (!gameState) return;
    
    const result = processPlay(gameState, cards);
    
    // Set the new game state
    setGameState(result.newState);
    
    // If the trick is complete, handle result
    if (result.trickComplete && result.trickWinner && result.completedTrick) {
      // This would typically update trick result display
      // We'll assume this is handled via another hook or by the controller
      
      // Check for end of round (no cards left)
      const allCardsPlayed = result.newState.players.every(p => p.hand.length === 0);
      if (allCardsPlayed) {
        handleEndRound(result.newState);
      }
    }
  };

  // Handle trump suit declaration
  const handleDeclareTrumpSuit = (suit: Suit | null) => {
    if (!gameState) return;
    
    const newState = declareTrumpSuit(gameState, suit);
    setGameState(newState);
    setShowTrumpDeclaration(false);
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
    
    // Initializers
    initGame,
    
    // Actions
    handleCardSelect,
    handlePlay,
    handleProcessPlay,
    handleDeclareTrumpSuit,
    handleCheckAITrumpDeclaration,
    handleNextRound,
    startNewGame,
    
    // Setters
    setGameState,
    setSelectedCards,
    setShowSetup: setShowSetupInternal,
    setShowTrumpDeclaration
  };
}