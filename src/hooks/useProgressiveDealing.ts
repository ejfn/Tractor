import { useState, useEffect, useRef, useCallback } from "react";
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
  const [humanSkippedDeclaration, setHumanSkippedDeclaration] = useState(false);
  const lastShownOpportunitiesRef = useRef<string>(""); // Track what opportunities were last shown
  const dealingIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const declarationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      const dealingInterval = dealingIntervalRef.current;
      const declarationTimeout = declarationTimeoutRef.current;

      if (dealingInterval) {
        clearInterval(dealingInterval);
      }
      if (declarationTimeout) {
        clearTimeout(declarationTimeout);
      }
    };
  }, []);

  const handleAIDeclaration = useCallback(
    (state: GameState, playerId: PlayerId, declaration: any) => {
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
          setIsDealingInProgress(false);

          // Resume dealing after AI declaration
          if (!isDealingComplete(resumedState)) {
            setTimeout(() => {
              startProgressiveDealing(resumedState);
            }, 100);
          }
        }, 1500);
      } catch (error) {
        console.warn("AI declaration failed:", error);
        // Continue dealing on error
        const resumedState = resumeDealing(state);
        setGameState(resumedState);
        setIsDealingInProgress(false);
        setTimeout(() => {
          startProgressiveDealing(resumedState);
        }, 100);
      }
    },
    [],
  );

  const checkAIDeclarations = useCallback((state: GameState) => {
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
  }, []);

  const checkForDeclarationOpportunities = useCallback(
    (state: GameState) => {
      const opportunities = checkDeclarationOpportunities(state);

      // Check if human player has declaration opportunities
      const humanOpportunities = opportunities.get(PlayerId.Human);
      if (humanOpportunities && humanOpportunities.length > 0) {
        // Create a signature of current opportunities to compare with previously shown ones
        const currentOpportunitiesSignature = humanOpportunities
          .map((opp) => `${opp.type}-${opp.suit}`)
          .sort()
          .join(",");

        // Only show modal if opportunities have changed AND human hasn't skipped this specific set
        if (
          currentOpportunitiesSignature !== lastShownOpportunitiesRef.current
        ) {
          lastShownOpportunitiesRef.current = currentOpportunitiesSignature;

          // Reset skip flag when new opportunities arise (different from what was previously shown)
          setHumanSkippedDeclaration(false);

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
        } else if (!humanSkippedDeclaration && !showDeclarationModal) {
          // Same opportunities but human hasn't been asked yet (first time)
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
        }
      } else {
        // Check AI declarations
        checkAIDeclarations(state);
      }
    },
    [humanSkippedDeclaration, showDeclarationModal],
  );

  const startProgressiveDealing = useCallback(
    (stateOverride?: GameState) => {
      const currentState = stateOverride || gameState;
      if (!currentState || isDealingInProgress) return;

      setIsDealingInProgress(true);
      setHumanSkippedDeclaration(false); // Reset skip flag when starting new dealing
      lastShownOpportunitiesRef.current = ""; // Reset shown opportunities for new dealing

      const dealNextCardWithDelay = (dealState?: GameState) => {
        // Use passed state or the initial current state
        const stateToUse = dealState || currentState;

        if (
          !stateToUse ||
          isDealingComplete(stateToUse) ||
          isDealingPaused(stateToUse)
        ) {
          return;
        }

        // Deal next card
        const newState = dealNextCard(stateToUse);
        setGameState(newState);

        // Reset skip flag when a new card is dealt - allows new declaration opportunities
        setHumanSkippedDeclaration(false);

        // Check for declaration opportunities after dealing card
        checkForDeclarationOpportunities(newState);

        // Continue dealing if not complete and not paused
        if (!isDealingComplete(newState) && !isDealingPaused(newState)) {
          dealingIntervalRef.current = setTimeout(
            () => dealNextCardWithDelay(newState),
            dealingSpeed,
          );
        } else if (isDealingComplete(newState)) {
          setIsDealingInProgress(false);

          // Check for ALL available opportunities (including previously skipped ones)
          const declarationOptions = getPlayerDeclarationOptions(
            newState,
            PlayerId.Human,
          );

          if (declarationOptions && declarationOptions.length > 0) {
            // Pause for trump declaration opportunity
            const pausedState = pauseDealing(newState, "trump_declaration");
            setGameState(pausedState);
            setAvailableDeclarations(declarationOptions);
            setShowDeclarationModal(true);
            setHumanSkippedDeclaration(false);
          } else {
            // No opportunities, transition to playing phase
            const playingState = { ...newState, gamePhase: GamePhase.Playing };
            setGameState(playingState);
          }
        }
      };

      // Start the dealing process
      dealingIntervalRef.current = setTimeout(
        () => dealNextCardWithDelay(),
        dealingSpeed,
      );
    },
    [gameState, isDealingInProgress, dealingSpeed],
  );

  // Start progressive dealing when game phase is Dealing
  useEffect(() => {
    if (gameState?.gamePhase === GamePhase.Dealing && !isDealingInProgress) {
      startProgressiveDealing();
    }
  }, [gameState?.gamePhase, isDealingInProgress, startProgressiveDealing]);

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
      setHumanSkippedDeclaration(false); // Reset skip flag after declaration

      // Resume dealing after human declaration
      setTimeout(() => {
        const resumedState = resumeDealing(newState);

        // Check if this was the final opportunity (dealing completed)
        if (isDealingComplete(resumedState)) {
          console.log(
            "Declaration made at end of dealing - transitioning to Playing phase",
          );
          // Transition to playing phase since dealing is complete
          const playingState = {
            ...resumedState,
            gamePhase: GamePhase.Playing,
          };
          setGameState(playingState);
          return;
        } else {
          console.log(
            "Declaration made during dealing - continuing to deal cards",
          );
        }

        setGameState(resumedState);

        // Continue dealing directly (same approach as skip handler)
        setTimeout(() => {
          if (!isDealingComplete(resumedState)) {
            setIsDealingInProgress(true);

            const dealNextCardWithDelay = (dealState?: GameState) => {
              const stateToUse = dealState || resumedState;

              if (
                !stateToUse ||
                isDealingComplete(stateToUse) ||
                isDealingPaused(stateToUse)
              ) {
                setIsDealingInProgress(false);
                return;
              }

              const newState = dealNextCard(stateToUse);
              setGameState(newState);
              setHumanSkippedDeclaration(false);
              checkForDeclarationOpportunities(newState);

              if (!isDealingComplete(newState) && !isDealingPaused(newState)) {
                dealingIntervalRef.current = setTimeout(
                  () => dealNextCardWithDelay(newState),
                  dealingSpeed,
                );
              } else if (isDealingComplete(newState)) {
                setIsDealingInProgress(false);

                const declarationOptions = getPlayerDeclarationOptions(
                  newState,
                  PlayerId.Human,
                );

                if (declarationOptions && declarationOptions.length > 0) {
                  const pausedState = pauseDealing(
                    newState,
                    "trump_declaration",
                  );
                  setGameState(pausedState);
                  setAvailableDeclarations(declarationOptions);
                  setShowDeclarationModal(true);
                  setHumanSkippedDeclaration(false);
                } else {
                  const playingState = {
                    ...newState,
                    gamePhase: GamePhase.Playing,
                  };
                  setGameState(playingState);
                }
              }
            };

            dealingIntervalRef.current = setTimeout(
              () => dealNextCardWithDelay(),
              dealingSpeed,
            );
          }
        }, 100);
      }, 1000);
    } catch (error) {
      console.warn("Human declaration failed:", error);
      // Continue without declaration
      handleSkipDeclaration();
    }
  };

  const handleManualPause = () => {
    if (!gameState || isDealingPaused(gameState)) return;

    // Clear dealing timer
    if (dealingIntervalRef.current) {
      clearTimeout(dealingIntervalRef.current);
      dealingIntervalRef.current = null;
    }

    // Pause dealing and show declaration modal
    const pausedState = pauseDealing(gameState, "trump_declaration");
    setGameState(pausedState);

    // Get human's declaration options (even if empty, we want to show the modal)
    const humanOpportunities =
      checkDeclarationOpportunities(pausedState).get(PlayerId.Human) || [];
    setAvailableDeclarations(humanOpportunities);

    // Always show the modal when manually paused, even if no declarations available
    setShowDeclarationModal(true);
    setIsDealingInProgress(false);
  };

  const handleSkipDeclaration = () => {
    if (!gameState) return;

    setShowDeclarationModal(false);
    setAvailableDeclarations([]);
    setHumanSkippedDeclaration(true); // Prevent modal from re-appearing

    const resumedState = resumeDealing(gameState);
    setGameState(resumedState);

    // Check if dealing is complete after resuming - if so, transition to Playing phase
    if (isDealingComplete(resumedState)) {
      const playingState = { ...resumedState, gamePhase: GamePhase.Playing };
      setGameState(playingState);
      return;
    }

    // Simply restart the dealing timer with the resumed state
    if (!isDealingComplete(resumedState)) {
      setIsDealingInProgress(true);

      // Use the same dealNextCardWithDelay function from startProgressiveDealing
      const dealNextCardWithDelay = (dealState?: GameState) => {
        const stateToUse = dealState || resumedState;

        if (
          !stateToUse ||
          isDealingComplete(stateToUse) ||
          isDealingPaused(stateToUse)
        ) {
          setIsDealingInProgress(false);
          return;
        }

        const newState = dealNextCard(stateToUse);
        setGameState(newState);
        setHumanSkippedDeclaration(false);
        checkForDeclarationOpportunities(newState);

        if (!isDealingComplete(newState) && !isDealingPaused(newState)) {
          dealingIntervalRef.current = setTimeout(
            () => dealNextCardWithDelay(newState),
            dealingSpeed,
          );
        } else if (isDealingComplete(newState)) {
          setIsDealingInProgress(false);

          const declarationOptions = getPlayerDeclarationOptions(
            newState,
            PlayerId.Human,
          );

          if (declarationOptions && declarationOptions.length > 0) {
            const pausedState = pauseDealing(newState, "trump_declaration");
            setGameState(pausedState);
            setAvailableDeclarations(declarationOptions);
            setShowDeclarationModal(true);
            setHumanSkippedDeclaration(false);
          } else {
            const playingState = { ...newState, gamePhase: GamePhase.Playing };
            setGameState(playingState);
          }
        }
      };

      dealingIntervalRef.current = setTimeout(
        () => dealNextCardWithDelay(),
        dealingSpeed,
      );
    }
  };

  return {
    isDealingInProgress,
    showDeclarationModal,
    availableDeclarations,
    handleHumanDeclaration,
    handleSkipDeclaration,
    handleManualPause,
  };
}
