import React, { useEffect } from 'react';
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
    
    initGame,
    handleCardSelect,
    handlePlay,
    handleProcessPlay,
    handleDeclareTrumpSuit,
    handleCheckAITrumpDeclaration,
    handleNextRound,
    startNewGame,
  } = useGameState(gameConfig);

  // Trick results management
  const {
    showTrickResult,
    lastTrickWinner,
    lastTrickPoints,
    lastCompletedTrick,
    // handleTrickCompletion is not used in this component
    handleTrickAnimationComplete
  } = useTrickResults();

  // AI turn handling
  const {
    waitingForAI,
    // handleAIMove is not used directly, handled by the hook internally
  } = useAITurns(
    gameState,
    handleProcessPlay,
    showTrickResult,
    lastCompletedTrick
  );

  // Initialize game on first render
  useEffect(() => {
    initGame();
  }, [initGame]);

  // Check for AI trump declaration
  useEffect(() => {
    if (gameState && gameState.gamePhase === 'declaring' && !showTrumpDeclaration) {
      handleCheckAITrumpDeclaration();
    }
  }, [gameState, gameState?.gamePhase, showTrumpDeclaration, handleCheckAITrumpDeclaration]);

  // Find human player index
  const humanPlayerIndex = gameState?.players.findIndex(p => p.isHuman) ?? -1;

  // The processPlay function in useGameState doesn't return a value,
  // so we can't use it directly to handle trick completion
  // Instead, we rely on the lastCompletedTrick state from useTrickResults

  // When card animations in play area are complete
  const onAnimationComplete = () => {
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
      showTrickResult={showTrickResult}
      lastTrickWinner={lastTrickWinner}
      lastTrickPoints={lastTrickPoints}
      lastCompletedTrick={lastCompletedTrick}
      showRoundComplete={showRoundComplete}
      roundCompleteMessage={roundCompleteMessage}
      teamNames={gameConfig.teamNames}
      
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
      onNextRound={handleNextRound}
      onAnimationComplete={onAnimationComplete}
    />
  );
};

export default GameScreenController;