import React from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

// Components
import AIPlayerView from "../components/AIPlayerView";
import CardPlayArea from "../components/CardPlayArea";
import GameOverScreen from "../components/GameOverScreen";
import GameStatus from "../components/GameStatus";
import GameTable from "../components/GameTable";
import HumanPlayerView from "../components/HumanPlayerView";
import RoundCompleteModal from "../components/RoundCompleteModal";
import TrickResultDisplay from "../components/TrickResultDisplay";
import { ExpandableTrumpDeclaration } from "../components/ExpandableTrumpDeclaration";

// Types
import {
  Card,
  GameState,
  PlayerId,
  Trick,
  GamePhase,
  RoundResult,
  DeclarationOpportunity,
} from "../types";

// Utils
import { validatePlay } from "../game/playProcessing";
import { sortCards } from "../utils/cardSorting";

interface GameScreenViewProps {
  // Game state
  gameState: GameState | null;
  selectedCards: Card[];
  humanPlayerIndex: number;

  // UI state
  gameOver: boolean;
  winner: "A" | "B" | null;
  waitingForAI: boolean;
  waitingPlayerId: PlayerId;
  showTrickResult: boolean;
  lastTrickWinnerId: PlayerId;
  lastTrickPoints: number;
  lastCompletedTrick: (Trick & { winningPlayerId?: string }) | null;
  showRoundComplete: boolean;
  roundResultRef: React.RefObject<RoundResult | null>;
  teamNames: [string, string];
  isProcessingPlay: boolean;

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
  onKittySwap: () => void;
  onStartNewGame: () => void;
  onNextRound: () => void;
  onAnimationComplete: () => void;
  onHumanDeclaration: (declaration: DeclarationOpportunity) => void;
  onContinue: () => void;
  onManualPause: () => void;
  shouldShowOpportunities: boolean;
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
  gameOver,
  winner,
  waitingForAI,
  waitingPlayerId,
  showTrickResult,
  lastTrickWinnerId,
  lastTrickPoints,
  lastCompletedTrick,
  showRoundComplete,
  roundResultRef,
  teamNames,
  isProcessingPlay,

  // Animations
  fadeAnim,
  scaleAnim,
  slideAnim,
  thinkingDots,

  // Handlers
  onCardSelect,
  onPlayCards,
  onKittySwap,
  onStartNewGame,
  onNextRound,
  onAnimationComplete,
  onHumanDeclaration,
  onContinue,
  onManualPause,
  shouldShowOpportunities,
}) => {
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
  const canInteract =
    (gameState.gamePhase === GamePhase.Playing ||
      gameState.gamePhase === GamePhase.KittySwap) &&
    isPlayerCurrentTurn &&
    !isProcessingPlay;

  // Check if selected cards are valid to play
  const isValidPlay =
    selectedCards.length > 0 && validatePlay(gameState, selectedCards);

  // Team ID for each player
  const getPlayerTeam = (playerId: PlayerId) => {
    const player = gameState.players.find((p) => p.id === playerId);
    if (!player) return undefined;
    return gameState.teams.find((t) => t.id === player.team);
  };

  const ai1Team = getPlayerTeam(PlayerId.Bot1);
  const ai2Team = getPlayerTeam(PlayerId.Bot2);
  const ai3Team = getPlayerTeam(PlayerId.Bot3);
  const humanTeam = getPlayerTeam(humanPlayer.id);

  // Crown display: always use the stable roundStartingPlayerIndex
  const roundStartingPlayerIndex = gameState.roundStartingPlayerIndex;

  // Calculate AI player indices once for efficiency and consistency
  const ai1Index = gameState.players.findIndex((p) => p.id === PlayerId.Bot1);
  const ai2Index = gameState.players.findIndex((p) => p.id === PlayerId.Bot2);
  const ai3Index = gameState.players.findIndex((p) => p.id === PlayerId.Bot3);

  const isHumanRoundStartingPlayer =
    roundStartingPlayerIndex === humanPlayerIndex;
  const isAI1RoundStartingPlayer = roundStartingPlayerIndex === ai1Index;
  const isAI2RoundStartingPlayer = roundStartingPlayerIndex === ai2Index;
  const isAI3RoundStartingPlayer = roundStartingPlayerIndex === ai3Index;

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
                  isRoundStartingPlayer={isAI2RoundStartingPlayer}
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
                  isRoundStartingPlayer={isAI3RoundStartingPlayer}
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
                  isRoundStartingPlayer={isAI1RoundStartingPlayer}
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
                  canPlay={canInteract}
                  isValidPlay={isValidPlay}
                  trumpInfo={gameState.trumpInfo}
                  showTrickResult={showTrickResult}
                  lastCompletedTrick={lastCompletedTrick || undefined}
                  thinkingDots={thinkingDots}
                  currentPlayerIndex={gameState.currentPlayerIndex}
                  currentTrick={gameState.currentTrick || undefined}
                  isRoundStartingPlayer={isHumanRoundStartingPlayer}
                  gamePhase={gameState.gamePhase}
                  onKittySwap={onKittySwap}
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
                winnerId={lastTrickWinnerId}
                points={lastTrickPoints}
                gameState={gameState}
              />
            }
          />
        </View>

        {/* Bottom spacing view */}
        <View style={styles.bottomSpacing} />
      </Animated.View>

      {/* Expandable trump declaration component */}
      {gameState.gamePhase === GamePhase.Dealing && (
        <ExpandableTrumpDeclaration
          gameState={gameState}
          onDeclaration={onHumanDeclaration}
          onContinue={onContinue}
          onPause={onManualPause}
          shouldShowOpportunities={shouldShowOpportunities}
        />
      )}

      {/* Round complete modal - outside of AnimatedView */}
      {roundResultRef.current && (
        <RoundCompleteModal
          roundResult={roundResultRef.current}
          onNextRound={onNextRound}
          fadeAnim={fadeAnim}
          scaleAnim={scaleAnim}
          kittyCards={
            gameState?.roundEndKittyInfo && gameState.kittyCards
              ? sortCards(gameState.kittyCards, gameState.trumpInfo)
              : undefined
          }
        />
      )}
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
