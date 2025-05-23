import React from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

// Components
import AIPlayerView from "../components/AIPlayerView";
import CardPlayArea from "../components/CardPlayArea";
import GameOverScreen from "../components/GameOverScreen";
import GameSetupScreen from "../components/GameSetupScreen";
import GameStatus from "../components/GameStatus";
import GameTable from "../components/GameTable";
import HumanPlayerView from "../components/HumanPlayerView";
// import TrumpDeclarationModal from '../components/TrumpDeclarationModal'; // Not used anymore
import RoundCompleteModal from "../components/RoundCompleteModal";
import TrickResultDisplay from "../components/TrickResultDisplay";

// Types
import { Card, GameState, PlayerId, Trick, GamePhase } from "../types/game";

// Utils
import { validatePlay } from "../utils/gamePlayManager";

interface GameScreenViewProps {
  // Game state
  gameState: GameState | null;
  selectedCards: Card[];
  humanPlayerIndex: number;

  // UI state
  showSetup: boolean;
  showTrumpDeclaration: boolean;
  gameOver: boolean;
  winner: "A" | "B" | null;
  waitingForAI: boolean;
  waitingPlayerId: string;
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
  humanPlayerIndex,

  // UI state
  showSetup,
  showTrumpDeclaration,
  gameOver,
  winner,
  waitingForAI,
  waitingPlayerId,
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
  if (!gameState) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading game...</Text>
      </View>
    );
  }

  // Get data for view components
  const humanPlayer = gameState.players[humanPlayerIndex];

  const ai1 = gameState.players.find((p) => p.id === PlayerId.Bot1);
  const ai2 = gameState.players.find((p) => p.id === PlayerId.Bot2);
  const ai3 = gameState.players.find((p) => p.id === PlayerId.Bot3);

  const isPlayerCurrentTurn = gameState.currentPlayerIndex === humanPlayerIndex;
  const canPlay =
    gameState.gamePhase === GamePhase.Playing && isPlayerCurrentTurn;

  // Check if selected cards are valid to play
  const isValidPlay =
    selectedCards.length > 0 && validatePlay(gameState, selectedCards);

  // Team ID for each player
  const getPlayerTeam = (playerId: string) => {
    const player = gameState.players.find((p) => p.id === playerId);
    if (!player) return undefined;
    return gameState.teams.find((t) => t.id === player.team);
  };

  const ai1Team = getPlayerTeam(PlayerId.Bot1);
  const ai2Team = getPlayerTeam(PlayerId.Bot2);
  const ai3Team = getPlayerTeam(PlayerId.Bot3);
  const humanTeam = getPlayerTeam(humanPlayer.id);

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
          teams={gameState.teams}
          trumpInfo={gameState.trumpInfo}
          roundNumber={gameState.roundNumber}
          gamePhase={gameState.gamePhase}
        />

        {/* Container with bottom margin */}
        <View style={styles.tableContainer}>
          <GameTable
            topPlayer={
              ai2 && ai2Team ? (
                <AIPlayerView
                  position="top"
                  player={ai2}
                  isDefending={ai2Team.isDefending}
                  isCurrentPlayer={
                    gameState.currentPlayerIndex ===
                    gameState.players.findIndex((p) => p.id === PlayerId.Bot2)
                  }
                  waitingForAI={
                    waitingForAI && waitingPlayerId === PlayerId.Bot2
                  }
                  showTrickResult={showTrickResult}
                  lastCompletedTrick={lastCompletedTrick}
                  thinkingDots={thinkingDots}
                />
              ) : null
            }
            leftPlayer={
              ai3 && ai3Team ? (
                <AIPlayerView
                  position="left"
                  player={ai3}
                  isDefending={ai3Team.isDefending}
                  isCurrentPlayer={
                    gameState.currentPlayerIndex ===
                    gameState.players.findIndex((p) => p.id === PlayerId.Bot3)
                  }
                  waitingForAI={
                    waitingForAI && waitingPlayerId === PlayerId.Bot3
                  }
                  showTrickResult={showTrickResult}
                  lastCompletedTrick={lastCompletedTrick}
                  thinkingDots={thinkingDots}
                />
              ) : null
            }
            rightPlayer={
              ai1 && ai1Team ? (
                <AIPlayerView
                  position="right"
                  player={ai1}
                  isDefending={ai1Team.isDefending}
                  isCurrentPlayer={
                    gameState.currentPlayerIndex ===
                    gameState.players.findIndex((p) => p.id === PlayerId.Bot1)
                  }
                  waitingForAI={
                    waitingForAI && waitingPlayerId === PlayerId.Bot1
                  }
                  showTrickResult={showTrickResult}
                  lastCompletedTrick={lastCompletedTrick}
                  thinkingDots={thinkingDots}
                />
              ) : null
            }
            bottomPlayer={
              humanPlayer && humanTeam ? (
                <HumanPlayerView
                  player={humanPlayer}
                  isCurrentPlayer={isPlayerCurrentTurn}
                  isDefending={humanTeam.isDefending}
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
                  currentPlayerIndex={gameState.currentPlayerIndex}
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
