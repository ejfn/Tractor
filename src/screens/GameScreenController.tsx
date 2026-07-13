import React, { useCallback, useEffect, useRef, useState } from "react";

// Hooks
import { useAITurns } from "../hooks/useAITurns";
import { useThinkingDots, useUIAnimations } from "../hooks/useAnimations";
import { useGameState } from "../hooks/useGameState";
import { useProgressiveDealing } from "../hooks/useProgressiveDealing";
import { useTrickResults } from "../hooks/useTrickResults";

// Game logic
import { GamePhase } from "../types";
import { DEALING_SPEED } from "../utils/gameTimings";

// LLM config
import {
  getLLMConfig,
  isLLMEnabled,
  LLMConfig,
  saveLLMConfig,
} from "../ai/llm/llmConfig";
import { subscribeToLLMNotifications } from "../ai/llm/llmAIStrategy";

// Translations
import {
  useGameTranslation,
  useCommonTranslation,
} from "../hooks/useTranslation";
import { getPlayerDisplayName } from "../utils/translationHelpers";
import { GameTranslationKey } from "../locales/types";

// View component
import GameScreenView from "./GameScreenView";

/**
 * Controller component for the game screen
 * Manages game state and logic, using hooks to coordinate functionality
 */
const GameScreenController: React.FC = () => {
  // Animations
  const { fadeAnim, slideAnim } = useUIAnimations(true);

  // Get thinking dots for AI thinking animation
  const { dots: thinkingDots } = useThinkingDots();

  // Game state and actions
  const {
    gameState,
    selectedCards,
    showRoundComplete,
    isProcessingPlay,
    trickCompletionData,
    roundResultRef,

    handleCardSelect,
    handlePlay,
    handleKittySwap,
    handleProcessPlay,
    handleNextRound,
    startNewGame,
    handleTrickResultComplete,
    setGameState,
  } = useGameState();

  // Trick results management
  const {
    showTrickResult,
    lastTrickWinnerId,
    lastTrickPoints,
    lastCompletedTrick,
    setLastCompletedTrick,
    handleTrickCompletion,
    handleTrickAnimationComplete,
    setTrickResultCompleteCallback,
  } = useTrickResults();

  // AI turn handling
  const {
    waitingForAI,
    waitingPlayerId,
    // handleAIMove is not used directly, handled by the hook internally
  } = useAITurns(
    gameState,
    handleProcessPlay,
    setGameState,
    showTrickResult,
    lastCompletedTrick,
    showRoundComplete,
  );

  // Progressive dealing with trump declarations
  const {
    isDealingInProgress,
    startDealing,
    shouldShowOpportunities,
    handleHumanDeclaration,
    handleContinue,
    handleManualPause,
  } = useProgressiveDealing({
    gameState,
    setGameState,
    dealingSpeed: DEALING_SPEED,
  });

  // ── AI Config Modal ────────────────────────────────────────────────────────

  const { t: tGame } = useGameTranslation();
  const { t: tCommon } = useCommonTranslation();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [llmConfig, setLlmConfig] = useState<LLMConfig>(() => getLLMConfig());
  const [llmActive, setLlmActive] = useState<boolean>(() => isLLMEnabled());

  const [activeAlert, setActiveAlert] = useState<{
    message: string;
    isPersistent: boolean;
  } | null>(null);

  // Listen for LLM fallback and auto-disable events
  useEffect(() => {
    const unsubscribe = subscribeToLLMNotifications((event) => {
      if (event.kind === "single_fallback") {
        const player = gameState?.players.find((p) => p.id === event.playerId);
        const botName = player
          ? getPlayerDisplayName(tCommon, player)
          : String(event.playerId);
        const reasonText = tGame(
          `llm.reasons.${event.reason}` as GameTranslationKey,
        );
        const message = tGame("llm.fallbackWarning" as GameTranslationKey, {
          botName,
          model: event.model,
          reason: reasonText,
        });

        setActiveAlert({
          message,
          isPersistent: false,
        });

        // Auto-dismiss temporary alerts after 5 seconds
        setTimeout(() => {
          setActiveAlert((prev) => {
            if (prev && !prev.isPersistent && prev.message === message) {
              return null;
            }
            return prev;
          });
        }, 5000);
      } else if (event.kind === "auto_disabled") {
        const message = tGame("llm.autoDisabledWarning" as GameTranslationKey, {
          model: event.model,
          count: event.consecutiveFailures,
        });

        setLlmActive(false);
        setActiveAlert({
          message,
          isPersistent: true,
        });
      }
    });

    return unsubscribe;
  }, [gameState, tGame, tCommon]);

  const handleOpenSettings = useCallback(() => {
    // Always re-read current config when opening (handles mid-game changes)
    setLlmConfig(getLLMConfig());
    setIsSettingsOpen(true);
  }, []);

  const handleCloseSettings = useCallback(() => {
    setIsSettingsOpen(false);
  }, []);

  const handleSaveSettings = useCallback((newConfig: LLMConfig) => {
    saveLLMConfig(newConfig);
    setLlmConfig(newConfig);
    setLlmActive(newConfig.enabled && !!newConfig.apiKey);
    setIsSettingsOpen(false);
  }, []);

  // Set up callback for when trick result display is complete
  useEffect(() => {
    setTrickResultCompleteCallback(() => {
      handleTrickResultComplete();
    });
  }, [setTrickResultCompleteCallback, handleTrickResultComplete]);

  // Start dealing when game phase is dealing
  useEffect(() => {
    if (gameState?.gamePhase === GamePhase.Dealing && !isDealingInProgress) {
      startDealing();
    }
  }, [gameState?.gamePhase, startDealing, isDealingInProgress]);

  // Find human player index
  const humanPlayerIndex = gameState?.players.findIndex((p) => p.isHuman) ?? -1;

  // Use a ref to track the last processed trick completion timestamp
  const lastProcessedTrickTimestampRef = useRef<number>(0);

  // Process trick completion reactively when trickCompletionData changes
  useEffect(() => {
    if (!trickCompletionData) return;

    // Only process if this is a new trick completion (check timestamp)
    if (
      trickCompletionData.timestamp > lastProcessedTrickTimestampRef.current
    ) {
      const { winnerId, points, completedTrick, timestamp } =
        trickCompletionData;

      // Update the last processed timestamp
      lastProcessedTrickTimestampRef.current = timestamp;

      // Save the completed trick and show the trick result
      if (completedTrick) {
        setLastCompletedTrick(completedTrick);
        handleTrickCompletion(winnerId, points, completedTrick);
      }
    }
  }, [trickCompletionData, handleTrickCompletion, setLastCompletedTrick]);

  // When card animations in play area are complete
  const onAnimationComplete = useCallback(() => {
    handleTrickAnimationComplete();
  }, [handleTrickAnimationComplete]);

  return (
    <GameScreenView
      // Game state
      gameState={gameState}
      selectedCards={selectedCards}
      humanPlayerIndex={humanPlayerIndex}
      // UI state
      waitingForAI={waitingForAI}
      waitingPlayerId={waitingPlayerId}
      showTrickResult={showTrickResult}
      lastTrickWinnerId={lastTrickWinnerId}
      lastTrickPoints={lastTrickPoints}
      lastCompletedTrick={lastCompletedTrick}
      roundResultRef={roundResultRef}
      isProcessingPlay={isProcessingPlay}
      // Animations
      fadeAnim={fadeAnim}
      slideAnim={slideAnim}
      thinkingDots={thinkingDots}
      // AI config
      isLLMActive={llmActive}
      llmConfig={llmConfig}
      isSettingsOpen={isSettingsOpen}
      onOpenSettings={handleOpenSettings}
      onCloseSettings={handleCloseSettings}
      onSaveSettings={handleSaveSettings}
      // Alerts
      activeAlert={activeAlert}
      onDismissAlert={() => setActiveAlert(null)}
      // Handlers
      onCardSelect={handleCardSelect}
      onPlayCards={handlePlay}
      onKittySwap={handleKittySwap}
      onStartNewGame={startNewGame}
      onNextRound={handleNextRound}
      onAnimationComplete={onAnimationComplete}
      onHumanDeclaration={handleHumanDeclaration}
      onContinue={handleContinue}
      onManualPause={handleManualPause}
      shouldShowOpportunities={shouldShowOpportunities}
    />
  );
};

export default GameScreenController;
