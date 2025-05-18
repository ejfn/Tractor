import React, { useEffect, useRef } from 'react';
import { Rank } from '../types/game';

// Hooks
import { useGameState } from '../hooks/useGameState';
import { useUIAnimations, useThinkingDots } from '../hooks/useAnimations';
import { useTrickResults } from '../hooks/useTrickResults';
import { useAITurns } from '../hooks/useAITurns';


// View component
import GameScreenView from './GameScreenView';

/**
 * Controller component for the game screen
 * Manages game state and logic, using hooks to coordinate functionality
 */
const GameScreenController: React.FC = () => {
  // Game configuration
  const gameConfig = {
    playerName: 'You',
    teamNames: ['Team A', 'Team B'] as [string, string],
    startingRank: Rank.Two
  };

  // Animations
  const { fadeAnim, scaleAnim, slideAnim } = useUIAnimations(true);
  
  // Get thinking dots for AI thinking animation
  const { dots: thinkingDots } = useThinkingDots();

  // Game state and actions
  const {
    gameState,
    selectedCards,
    showSetup,
    showTrumpDeclaration,
    gameOver,
    winner,
    showRoundComplete,
    roundCompleteMessage,
    trickCompletionDataRef,
    
    initGame,
    handleCardSelect,
    handlePlay,
    handleProcessPlay,
    handleDeclareTrumpSuit,
    handleConfirmTrumpDeclaration,
    handleCheckAITrumpDeclaration,
    handleNextRound,
    startNewGame,
    handleTrickResultComplete, // Make sure this is imported
  } = useGameState(gameConfig);

  // Trick results management
  const {
    showTrickResult,
    lastTrickWinner,
    lastTrickPoints,
    lastCompletedTrick,
    isTransitioningTricks,
    setLastCompletedTrick,
    handleTrickCompletion,
    handleTrickAnimationComplete,
    setTrickResultCompleteCallback
  } = useTrickResults();

  // AI turn handling
  const {
    waitingForAI,
    waitingPlayerId,
    // handleAIMove is not used directly, handled by the hook internally
  } = useAITurns(
    gameState,
    handleProcessPlay,
    showTrickResult,
    lastCompletedTrick,
    showRoundComplete
  );

  // Initialize game on first render
  useEffect(() => {
    initGame();
    
    // Set up the trick result completion callback
    // This will be called when it's safe to clear currentTrick from the game state
    // Set up callback for when trick result display is complete
    setTrickResultCompleteCallback(() => {
      handleTrickResultComplete();
    });
  }, [initGame, setTrickResultCompleteCallback, handleTrickResultComplete]);

  // Check for AI trump declaration
  useEffect(() => {
    if (gameState && gameState.gamePhase === 'declaring' && !showTrumpDeclaration) {
      handleCheckAITrumpDeclaration();
    }
  }, [gameState, gameState?.gamePhase, showTrumpDeclaration, handleCheckAITrumpDeclaration]);
  
  // We've removed the player change detector - keeping it simple

  // Find human player index
  const humanPlayerIndex = gameState?.players.findIndex(p => p.isHuman) ?? -1;

  // Use a ref to track the last processed trick completion timestamp
  const lastProcessedTrickTimestampRef = useRef<number>(0);
  
  // Monitor the trick completion data ref for changes
  useEffect(() => {
    if (!trickCompletionDataRef.current) return;
    
    // Only process if this is a new trick completion (check timestamp)
    if (trickCompletionDataRef.current.timestamp > lastProcessedTrickTimestampRef.current) {
      const { winnerName, points, completedTrick, timestamp } = trickCompletionDataRef.current;
      // Detected completed trick
      
      // Update the last processed timestamp
      lastProcessedTrickTimestampRef.current = timestamp;
      
      // FUNDAMENTALLY IMPORTANT: Process completed trick immediately and synchronously
      // No delays or state transitions that could cause flickering
      if (completedTrick && handleTrickCompletion && setLastCompletedTrick) {
        // 1. First save the completed trick at the CardPlayArea level - absolutely critical
        // IMPORTANT: In a 4-player game, a completed trick has:
        // - One leading play stored in leadingCombo
        // - Three follow plays stored in the plays array
        // So we expect exactly 3 plays for a 4-player game (not 4, not 5)
        // 1. First save the completed trick
        setLastCompletedTrick(completedTrick);
        
        // 2. Now show the trick result
        handleTrickCompletion(winnerName, points, completedTrick);
        
        // No extra defensive timers needed anymore - keeping it simple
      }
    }
  }, [gameState?.currentPlayerIndex, trickCompletionDataRef, handleTrickCompletion, setLastCompletedTrick, gameState?.currentTrick, handleTrickResultComplete]);

  // When card animations in play area are complete
  const onAnimationComplete = () => {
    // Handle completed card animations
    handleTrickAnimationComplete();
  };

  return (
    <GameScreenView
      // Game state
      gameState={gameState}
      selectedCards={selectedCards}
      humanPlayerIndex={humanPlayerIndex}
      
      // UI state
      showSetup={showSetup}
      showTrumpDeclaration={showTrumpDeclaration}
      gameOver={gameOver}
      winner={winner}
      waitingForAI={waitingForAI}
      waitingPlayerId={waitingPlayerId}
      showTrickResult={showTrickResult}
      lastTrickWinner={lastTrickWinner}
      lastTrickPoints={lastTrickPoints}
      lastCompletedTrick={lastCompletedTrick}
      showRoundComplete={showRoundComplete}
      roundCompleteMessage={roundCompleteMessage}
      teamNames={gameConfig.teamNames}
      isTransitioningTricks={isTransitioningTricks}
      
      // Animations
      fadeAnim={fadeAnim}
      scaleAnim={scaleAnim}
      slideAnim={slideAnim}
      thinkingDots={thinkingDots}
      
      // Handlers
      onCardSelect={handleCardSelect}
      onPlayCards={handlePlay}
      onStartNewGame={startNewGame}
      onDeclareTrumpSuit={handleDeclareTrumpSuit}
      onConfirmTrumpDeclaration={handleConfirmTrumpDeclaration}
      onNextRound={handleNextRound}
      onAnimationComplete={onAnimationComplete}
    />
  );
};

export default GameScreenController;