import { useState, useEffect, useRef } from "react";
import { GameState, PlayerId, GamePhase, DeclarationType } from "../types";
import {
  dealNextCard,
  isDealingComplete,
  checkDeclarationOpportunities,
  pauseDealing,
  resumeDealing,
  isDealingPaused,
} from "../game/gameLogic";
import {
  makeTrumpDeclaration,
  getPlayerDeclarationOptions,
} from "../game/trumpDeclarationManager";
import { getAITrumpDeclarationDecision } from "../ai/aiTrumpDeclarationStrategy";

interface UseProgressiveDealingProps {
  gameState: GameState | null;
  setGameState: (state: GameState) => void;
  dealingSpeed?: number; // milliseconds between cards
}

export function useProgressiveDealing({
  gameState,
  setGameState,
  dealingSpeed = 500,
}: UseProgressiveDealingProps) {
  const [isDealingInProgress, setIsDealingInProgress] = useState(false);
  const [showDeclarationModal, setShowDeclarationModal] = useState(false);
  const [availableDeclarations, setAvailableDeclarations] = useState<any[]>([]);
  const dealingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const declarationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Start progressive dealing when game phase is Dealing
  useEffect(() => {
    if (gameState?.gamePhase === GamePhase.Dealing && !isDealingInProgress) {
      startProgressiveDealing();
    }
  }, [gameState?.gamePhase]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (dealingIntervalRef.current) {
        clearInterval(dealingIntervalRef.current);
      }
      if (declarationTimeoutRef.current) {
        clearTimeout(declarationTimeoutRef.current);
      }
    };
  }, []);

  const startProgressiveDealing = () => {
    if (!gameState || isDealingInProgress) return;

    setIsDealingInProgress(true);

    const dealNextCardWithDelay = () => {
      if (
        !gameState ||
        isDealingComplete(gameState) ||
        isDealingPaused(gameState)
      ) {
        return;
      }

      // Deal next card
      const newState = dealNextCard(gameState);
      setGameState(newState);

      // Check for declaration opportunities after dealing card
      checkForDeclarationOpportunities(newState);

      // Continue dealing if not complete and not paused
      if (!isDealingComplete(newState) && !isDealingPaused(newState)) {
        dealingIntervalRef.current = setTimeout(
          dealNextCardWithDelay,
          dealingSpeed,
        );
      } else if (isDealingComplete(newState)) {
        setIsDealingInProgress(false);
      }
    };

    // Start the dealing process
    dealingIntervalRef.current = setTimeout(
      dealNextCardWithDelay,
      dealingSpeed,
    );
  };

  const checkForDeclarationOpportunities = (state: GameState) => {
    const opportunities = checkDeclarationOpportunities(state);

    // Check if human player has declaration opportunities
    const humanOpportunities = opportunities.get(PlayerId.Human);
    if (humanOpportunities && humanOpportunities.length > 0) {
      // Pause dealing and show declaration modal
      const pausedState = pauseDealing(state, "trump_declaration");
      setGameState(pausedState);
      setAvailableDeclarations(humanOpportunities);
      setShowDeclarationModal(true);

      // Stop dealing timer
      if (dealingIntervalRef.current) {
        clearTimeout(dealingIntervalRef.current);
        dealingIntervalRef.current = null;
      }
    } else {
      // Check AI declarations
      checkAIDeclarations(state);
    }
  };

  const checkAIDeclarations = (state: GameState) => {
    // Check each AI player for declaration opportunities
    const aiPlayers = state.players.filter((p) => !p.isHuman);

    for (const player of aiPlayers) {
      const aiDecision = getAITrumpDeclarationDecision(
        state,
        player.id as PlayerId,
      );

      if (aiDecision.shouldDeclare && aiDecision.declaration) {
        console.log(`AI ${player.id} decision: ${aiDecision.reasoning}`);
        handleAIDeclaration(
          state,
          player.id as PlayerId,
          aiDecision.declaration,
        );
        break; // Only one AI declares at a time
      }
    }
  };

  const handleAIDeclaration = (
    state: GameState,
    playerId: PlayerId,
    declaration: any,
  ) => {
    try {
      const newState = makeTrumpDeclaration(state, playerId, {
        rank: state.trumpInfo.trumpRank,
        suit: declaration.suit,
        type: declaration.type,
        cards: declaration.cards,
      });

      setGameState(newState);

      // Brief pause to show the AI declaration, then resume dealing
      setTimeout(() => {
        const resumedState = resumeDealing(newState);
        setGameState(resumedState);

        // Resume dealing after AI declaration
        if (!isDealingComplete(resumedState)) {
          startProgressiveDealing();
        }
      }, 1500);
    } catch (error) {
      console.warn("AI declaration failed:", error);
      // Continue dealing on error
      const resumedState = resumeDealing(state);
      setGameState(resumedState);
      startProgressiveDealing();
    }
  };

  const handleHumanDeclaration = (declaration: {
    type: DeclarationType;
    cards: any[];
    suit: any;
  }) => {
    if (!gameState) return;

    try {
      const newState = makeTrumpDeclaration(gameState, PlayerId.Human, {
        rank: gameState.trumpInfo.trumpRank,
        suit: declaration.suit,
        type: declaration.type,
        cards: declaration.cards,
      });

      setGameState(newState);
      setShowDeclarationModal(false);
      setAvailableDeclarations([]);

      // Resume dealing after human declaration
      setTimeout(() => {
        const resumedState = resumeDealing(newState);
        setGameState(resumedState);

        if (!isDealingComplete(resumedState)) {
          startProgressiveDealing();
        }
      }, 1000);
    } catch (error) {
      console.warn("Human declaration failed:", error);
      // Continue without declaration
      handleSkipDeclaration();
    }
  };

  const handleSkipDeclaration = () => {
    if (!gameState) return;

    const resumedState = resumeDealing(gameState);
    setGameState(resumedState);
    setShowDeclarationModal(false);
    setAvailableDeclarations([]);

    // Resume dealing
    if (!isDealingComplete(resumedState)) {
      startProgressiveDealing();
    }
  };

  return {
    isDealingInProgress,
    showDeclarationModal,
    availableDeclarations,
    handleHumanDeclaration,
    handleSkipDeclaration,
  };
}
