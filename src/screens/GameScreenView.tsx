import React from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

// Hooks
import { useCommonTranslation } from "../hooks/useTranslation";

// Components
import AIConfigModal from "../components/AIConfigModal";
import AIPlayerView from "../components/AIPlayerView";
import CardPlayArea from "../components/CardPlayArea";
import { ExpandableTrumpDeclaration } from "../components/ExpandableTrumpDeclaration";
import GameStatus from "../components/GameStatus";
import GameTable from "../components/GameTable";
import HumanPlayerView from "../components/HumanPlayerView";
import RoundCompleteModal from "../components/RoundCompleteModal";
import TrickResultDisplay from "../components/TrickResultDisplay";

// Types
import {
  Card,
  DeclarationOpportunity,
  GamePhase,
  GameState,
  PlayerId,
  RoundResult,
  Trick,
} from "../types";
import { LLMConfig } from "../ai/llm/llmConfig";

// Utils
import { validatePlay } from "../game/playProcessing";
import { sortCards } from "../utils/cardSorting";

interface GameScreenViewProps {
  // Game state
  gameState: GameState | null;
  selectedCards: Card[];
  humanPlayerIndex: number;

  // UI state
  waitingForAI: boolean;
  waitingPlayerId: PlayerId;
  showTrickResult: boolean;
  lastTrickWinnerId: PlayerId;
  lastTrickPoints: number;
  lastCompletedTrick: (Trick & { winningPlayerId?: string }) | null;
  roundResultRef: React.RefObject<RoundResult | null>;
  isProcessingPlay: boolean;

  // Animations
  fadeAnim: Animated.Value;
  slideAnim: Animated.Value;
  thinkingDots: {
    dot1: Animated.Value;
    dot2: Animated.Value;
    dot3: Animated.Value;
  };

  // AI config
  isLLMActive: boolean;
  llmConfig: LLMConfig;
  isSettingsOpen: boolean;
  onOpenSettings: () => void;
  onCloseSettings: () => void;
  onSaveSettings: (config: LLMConfig) => void;

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
  waitingForAI,
  waitingPlayerId,
  showTrickResult,
  lastTrickWinnerId,
  lastTrickPoints,
  lastCompletedTrick,
  roundResultRef,
  isProcessingPlay,

  // Animations
  fadeAnim,
  slideAnim,
  thinkingDots,

  // AI config
  isLLMActive,
  llmConfig,
  isSettingsOpen,
  onOpenSettings,
  onCloseSettings,
  onSaveSettings,

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
  const { t: tCommon } = useCommonTranslation();

  // Team ID for each player - memoized to prevent recreation on every render
  // Defined at the top to satisfy Rules of Hooks (runs before early returns)
  const getPlayerTeam = React.useCallback(
    (playerId: PlayerId) => {
      if (!gameState) return undefined;
      const player = gameState.players.find((p) => p.id === playerId);
      if (!player) return undefined;
      return gameState.teams.find((t) => t.id === player.team);
    },
    [gameState],
  );

  // Loading state
  if (!gameState) {
    return (
      <View style={styles.loadingContainer}>
        <Text>{tCommon("loading")}</Text>
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
          onStartNewGame={onStartNewGame}
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
                  isCurrentPlayer={gameState.currentPlayerIndex === ai2Index}
                  waitingForAI={
                    waitingForAI && waitingPlayerId === PlayerId.Bot2
                  }
                  showTrickResult={showTrickResult}
                  lastCompletedTrick={lastCompletedTrick}
                  thinkingDots={thinkingDots}
                  isRoundStartingPlayer={isAI2RoundStartingPlayer}
                  isLLM={isLLMActive}
                  onPress={onOpenSettings}
                />
              ) : null
            }
            leftPlayer={
              ai3 && ai3Team ? (
                <AIPlayerView
                  position="left"
                  player={ai3}
                  isDefending={ai3Team.isDefending}
                  isCurrentPlayer={gameState.currentPlayerIndex === ai3Index}
                  waitingForAI={
                    waitingForAI && waitingPlayerId === PlayerId.Bot3
                  }
                  showTrickResult={showTrickResult}
                  lastCompletedTrick={lastCompletedTrick}
                  thinkingDots={thinkingDots}
                  isRoundStartingPlayer={isAI3RoundStartingPlayer}
                  isLLM={isLLMActive}
                  onPress={onOpenSettings}
                />
              ) : null
            }
            rightPlayer={
              ai1 && ai1Team ? (
                <AIPlayerView
                  position="right"
                  player={ai1}
                  isDefending={ai1Team.isDefending}
                  isCurrentPlayer={gameState.currentPlayerIndex === ai1Index}
                  waitingForAI={
                    waitingForAI && waitingPlayerId === PlayerId.Bot1
                  }
                  showTrickResult={showTrickResult}
                  lastCompletedTrick={lastCompletedTrick}
                  thinkingDots={thinkingDots}
                  isRoundStartingPlayer={isAI1RoundStartingPlayer}
                  isLLM={isLLMActive}
                  onPress={onOpenSettings}
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
                  isLLM={isLLMActive}
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
          onNewGame={onStartNewGame}
          kittyCards={sortCards(gameState.kittyCards, gameState.trumpInfo)}
          humanTeamId={humanPlayer.team}
        />
      )}
      {/* AI Config Modal - rendered outside AnimatedView for proper overlay */}
      <AIConfigModal
        visible={isSettingsOpen}
        currentConfig={llmConfig}
        onSave={onSaveSettings}
        onClose={onCloseSettings}
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
