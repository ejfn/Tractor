import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Animated,
} from 'react-native';

// Components
import GameTable from '../components/GameTable';
import AIPlayerView from '../components/AIPlayerView';
import HumanPlayerView from '../components/HumanPlayerView';
import CardPlayArea from '../components/CardPlayArea';
import GameStatus from '../components/GameStatus';
import GameSetupScreen from '../components/GameSetupScreen';
import GameOverScreen from '../components/GameOverScreen';
// import TrumpDeclarationModal from '../components/TrumpDeclarationModal'; // Not used anymore
import TrickResultDisplay from '../components/TrickResultDisplay';
import RoundCompleteModal from '../components/RoundCompleteModal';

// Types
import { GameState, Card, Trick } from '../types/game';
import { PlayerStateManager } from '../types/playerState';

// Utils
import { validatePlay } from '../utils/gamePlayManager';

interface GameScreenViewProps {
  // Game state
  gameState: GameState | null;
  selectedCards: Card[];
  playerStateManager: PlayerStateManager | null;
  
  // UI state
  showSetup: boolean;
  showTrumpDeclaration: boolean;
  gameOver: boolean;
  winner: 'A' | 'B' | null;
  showTrickResult: boolean;
  lastTrickWinner: string;
  lastTrickPoints: number;
  lastCompletedTrick: (Trick & { winningPlayerId?: string }) | null;
  showRoundComplete: boolean;
  roundCompleteMessage: string;
  teamNames: [string, string];
  isTransitioningTricks: boolean;
  
  // Animations
  fadeAnim: Animated.Value;
  scaleAnim: Animated.Value;
  slideAnim: Animated.Value;
  thinkingDots: {
    dot1: Animated.Value;
    dot2: Animated.Value;
    dot3: Animated.Value;
  };
  
  // Handlers
  onCardSelect: (card: Card) => void;
  onPlayCards: () => void;
  onStartNewGame: () => void;
  onDeclareTrumpSuit: (suit: any) => void;
  onConfirmTrumpDeclaration: () => void;
  onNextRound: () => void;
  onAnimationComplete: () => void;
}

/**
 * Presentation component for the game screen
 */
const GameScreenView: React.FC<GameScreenViewProps> = ({
  // Game state
  gameState,
  selectedCards,
  playerStateManager,
  
  // UI state
  showSetup,
  showTrumpDeclaration,
  gameOver,
  winner,
  showTrickResult,
  lastTrickWinner,
  lastTrickPoints,
  lastCompletedTrick,
  showRoundComplete,
  roundCompleteMessage,
  teamNames,
  isTransitioningTricks,
  
  // Animations
  fadeAnim,
  scaleAnim,
  slideAnim,
  thinkingDots,
  
  // Handlers
  onCardSelect,
  onPlayCards,
  onStartNewGame,
  onDeclareTrumpSuit,
  onConfirmTrumpDeclaration,
  onNextRound,
  onAnimationComplete
}) => {
  // Setup screen with animations
  if (showSetup) {
    return (
      <GameSetupScreen
        onStartGame={onStartNewGame}
        fadeAnim={fadeAnim}
        scaleAnim={scaleAnim}
      />
    );
  }
  
  // Game over screen
  if (gameOver) {
    return (
      <GameOverScreen
        winner={winner}
        teamNames={teamNames}
        onNewGame={onStartNewGame}
        fadeAnim={fadeAnim}
        scaleAnim={scaleAnim}
      />
    );
  }
  
  
  // Loading state
  if (!gameState || !playerStateManager) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading game...</Text>
      </View>
    );
  }
  
  // Get player states using the manager
  const humanPlayerState = playerStateManager.getHumanPlayerState();
  const topPlayerState = playerStateManager.getPlayerStateByPosition('top');
  const leftPlayerState = playerStateManager.getPlayerStateByPosition('left');
  const rightPlayerState = playerStateManager.getPlayerStateByPosition('right');
  
  if (!humanPlayerState) {
    return (
      <View style={styles.container}>
        <Text>Error: Human player not found</Text>
      </View>
    );
  }
  
  const isPlayerCurrentTurn = humanPlayerState.isCurrentTurn;
  const canPlay = gameState.gamePhase === 'playing' && isPlayerCurrentTurn;
  
  // Check if selected cards are valid to play
  const humanPlayer = gameState.players.find(p => p.isHuman);
  const isValidPlay = selectedCards.length > 0 && humanPlayer && validatePlay(gameState, selectedCards, humanPlayer.id);
  
  return (
    <View style={styles.container}>
      <Animated.View style={[
        styles.gameContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateX: slideAnim }]
        }
      ]}>
        {/* Game status bar above table */}
        <GameStatus
          teams={gameState.teams}
          trumpInfo={gameState.trumpInfo}
          roundNumber={gameState.roundNumber}
          gamePhase={gameState.gamePhase}
        />


        {/* Container with bottom margin */}
        <View style={styles.tableContainer}>
          <GameTable
            topPlayer={
              topPlayerState ? (
                <AIPlayerView
                  position="top"
                  player={topPlayerState.player}
                  isDefending={topPlayerState.team.isDefending}
                  isCurrentPlayer={topPlayerState.isCurrentTurn}
                  waitingForAI={topPlayerState.isThinking}
                  showTrickResult={showTrickResult}
                  lastCompletedTrick={lastCompletedTrick}
                  thinkingDots={thinkingDots}
                />
              ) : null
            }
            leftPlayer={
              leftPlayerState ? (
                <AIPlayerView
                  position="left"
                  player={leftPlayerState.player}
                  isDefending={leftPlayerState.team.isDefending}
                  isCurrentPlayer={leftPlayerState.isCurrentTurn}
                  waitingForAI={leftPlayerState.isThinking}
                  showTrickResult={showTrickResult}
                  lastCompletedTrick={lastCompletedTrick}
                  thinkingDots={thinkingDots}
                />
              ) : null
            }
            rightPlayer={
              rightPlayerState ? (
                <AIPlayerView
                  position="right"
                  player={rightPlayerState.player}
                  isDefending={rightPlayerState.team.isDefending}
                  isCurrentPlayer={rightPlayerState.isCurrentTurn}
                  waitingForAI={rightPlayerState.isThinking}
                  showTrickResult={showTrickResult}
                  lastCompletedTrick={lastCompletedTrick}
                  thinkingDots={thinkingDots}
                />
              ) : null
            }
            bottomPlayer={
              humanPlayerState ? (
                <HumanPlayerView
                  player={humanPlayerState.player}
                  isCurrentPlayer={humanPlayerState.isCurrentTurn}
                  isDefending={humanPlayerState.team.isDefending}
                  selectedCards={selectedCards}
                  onCardSelect={onCardSelect}
                  onPlayCards={onPlayCards}
                  canPlay={canPlay}
                  isValidPlay={isValidPlay}
                  trumpInfo={gameState.trumpInfo}
                  showTrickResult={showTrickResult}
                  lastCompletedTrick={lastCompletedTrick}
                  thinkingDots={thinkingDots}
                  trumpDeclarationMode={showTrumpDeclaration}
                  onSkipTrumpDeclaration={() => onDeclareTrumpSuit(null)}
                  onConfirmTrumpDeclaration={onConfirmTrumpDeclaration}
                  currentPlayerIndex={humanPlayer ? gameState.players.indexOf(humanPlayer) : 0}
                  winningPlayerIndex={playerStateManager?.trickWinnerId ? gameState.players.findIndex(p => p.id === playerStateManager.trickWinnerId) : undefined}
                  currentTrick={gameState.currentTrick}
                />
              ) : null
            }
            centerContent={
              <CardPlayArea
                currentTrick={gameState.currentTrick}
                lastCompletedTrick={lastCompletedTrick}
                players={gameState.players}
                trumpInfo={gameState.trumpInfo}
                winningPlayerId={lastCompletedTrick?.winningPlayerId || gameState.currentTrick?.winningPlayerId}
                onAnimationComplete={onAnimationComplete}
              />
            }
            trickResult={
              <TrickResultDisplay
                visible={showTrickResult}
                winnerName={lastTrickWinner}
                points={lastTrickPoints}
              />
            }
          />
        </View>

        {/* Bottom spacing view */}
        <View style={styles.bottomSpacing} />

        {/* Trump declaration modal - removed in favor of in-hand selection
        <TrumpDeclarationModal
          visible={!!gameState && showTrumpDeclaration}
          trumpInfo={gameState?.trumpInfo || { trumpRank: Rank.Two, declared: false }}
          onDeclareSuit={onDeclareTrumpSuit}
          fadeAnim={fadeAnim}
          scaleAnim={scaleAnim}
        />
        */}
        
      </Animated.View>
      
      {/* Round complete modal - outside of AnimatedView */}
      <RoundCompleteModal
        visible={showRoundComplete}
        message={roundCompleteMessage}
        onNextRound={onNextRound}
        fadeAnim={fadeAnim}
        scaleAnim={scaleAnim}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  bottomSpacing: {
    height: 16,
    width: '100%',
  },
  gameContainer: {
    flex: 1,
    padding: 0,
    paddingTop: 0,
    marginTop: 5,
  },
  tableContainer: {
    flex: 1,
    marginBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#3F51B5',
  },
});

export default GameScreenView;