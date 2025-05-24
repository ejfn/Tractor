import React from "react";
import { StyleSheet, View, Text, Animated } from "react-native";

// Components
import GameTable from "../components/GameTable";
import AIPlayerView from "../components/AIPlayerView";
import HumanPlayerView from "../components/HumanPlayerView";
import CardPlayArea from "../components/CardPlayArea";
import GameStatus from "../components/GameStatus";
import GameSetupScreen from "../components/GameSetupScreen";
import GameOverScreen from "../components/GameOverScreen";
// import TrumpDeclarationModal from '../components/TrumpDeclarationModal'; // Not used anymore
import TrickResultDisplay from "../components/TrickResultDisplay";
import RoundCompleteModal from "../components/RoundCompleteModal";

// Types
import { GameState, Card, Trick, Player } from "../types/game";

// Utils
import { validatePlay } from "../utils/gamePlayManager";

interface GameScreenViewProps {
  // Game state
  gameState: GameState | null;
  selectedCards: Card[];

  // Player data
  players: Record<string, Player> | null;
  currentPlayerId?: string;
  thinkingPlayerId?: string;

  // UI state
  showSetup: boolean;
  showTrumpDeclaration: boolean;
  gameOver: boolean;
  winner: "A" | "B" | null;
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

  // Player data
  players,
  currentPlayerId,
  thinkingPlayerId,

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
  onAnimationComplete,
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
  if (!gameState || !players) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading game...</Text>
      </View>
    );
  }

  // Get players for different positions
  const humanPlayer = Object.values(players).find((player) => player.isHuman);
  const topPlayer = Object.values(players).find(
    (player) => player.position === "top",
  );
  const leftPlayer = Object.values(players).find(
    (player) => player.position === "left",
  );
  const rightPlayer = Object.values(players).find(
    (player) => player.position === "right",
  );

  if (!humanPlayer) {
    return (
      <View style={styles.container}>
        <Text>Error: Human player not found</Text>
      </View>
    );
  }

  const isPlayerCurrentTurn = gameState.currentPlayerId === humanPlayer.id;
  const canPlay = gameState.gamePhase === "playing" && isPlayerCurrentTurn;

  // Check if selected cards are valid to play
  const isValidPlay =
    selectedCards.length > 0 &&
    humanPlayer &&
    validatePlay(gameState, selectedCards, humanPlayer.id);

  // Helper function to get team by teamId
  const getTeam = (teamId: "A" | "B") => gameState.teams[teamId];

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.gameContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        {/* Game status bar above table */}
        <GameStatus
          teams={Object.values(gameState.teams)}
          trumpInfo={gameState.trumpInfo}
          roundNumber={gameState.roundNumber}
          gamePhase={gameState.gamePhase}
        />

        {/* Container with bottom margin */}
        <View style={styles.tableContainer}>
          <GameTable
            topPlayer={
              topPlayer ? (
                <AIPlayerView
                  position="top"
                  player={topPlayer}
                  isDefending={getTeam(topPlayer.teamId)?.isDefending ?? false}
                  isCurrentPlayer={gameState.currentPlayerId === topPlayer.id}
                  waitingForAI={topPlayer.isThinking}
                  showTrickResult={showTrickResult}
                  lastCompletedTrick={lastCompletedTrick}
                  thinkingDots={thinkingDots}
                />
              ) : null
            }
            leftPlayer={
              leftPlayer ? (
                <AIPlayerView
                  position="left"
                  player={leftPlayer}
                  isDefending={getTeam(leftPlayer.teamId)?.isDefending ?? false}
                  isCurrentPlayer={gameState.currentPlayerId === leftPlayer.id}
                  waitingForAI={leftPlayer.isThinking}
                  showTrickResult={showTrickResult}
                  lastCompletedTrick={lastCompletedTrick}
                  thinkingDots={thinkingDots}
                />
              ) : null
            }
            rightPlayer={
              rightPlayer ? (
                <AIPlayerView
                  position="right"
                  player={rightPlayer}
                  isDefending={
                    getTeam(rightPlayer.teamId)?.isDefending ?? false
                  }
                  isCurrentPlayer={gameState.currentPlayerId === rightPlayer.id}
                  waitingForAI={rightPlayer.isThinking}
                  showTrickResult={showTrickResult}
                  lastCompletedTrick={lastCompletedTrick}
                  thinkingDots={thinkingDots}
                />
              ) : null
            }
            bottomPlayer={
              humanPlayer ? (
                <HumanPlayerView
                  player={humanPlayer}
                  isCurrentPlayer={gameState.currentPlayerId === humanPlayer.id}
                  isDefending={
                    getTeam(humanPlayer.teamId)?.isDefending ?? false
                  }
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
                  currentPlayerIndex={
                    humanPlayer
                      ? Object.keys(gameState.players).indexOf(humanPlayer.id)
                      : 0
                  }
                  winningPlayerIndex={
                    gameState?.currentTrick?.winningPlayerId
                      ? Object.keys(gameState.players).indexOf(
                          gameState.currentTrick.winningPlayerId,
                        )
                      : undefined
                  }
                  currentTrick={gameState.currentTrick}
                />
              ) : null
            }
            centerContent={
              <CardPlayArea
                currentTrick={gameState.currentTrick}
                lastCompletedTrick={lastCompletedTrick}
                players={Object.values(gameState.players)}
                trumpInfo={gameState.trumpInfo}
                winningPlayerId={
                  lastCompletedTrick?.winningPlayerId ||
                  gameState.currentTrick?.winningPlayerId
                }
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
    backgroundColor: "transparent",
  },
  bottomSpacing: {
    height: 16,
    width: "100%",
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
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#3F51B5",
  },
});

export default GameScreenView;
