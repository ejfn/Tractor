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
  getTrumpDeclarationStatus,
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
  // Removed humanSkippedDeclaration state - now using immutable opportunity tracking

  // Immutable tracking of human declaration decisions
  const humanDecisionHistoryRef = useRef<Set<string>>(new Set()); // Track what opportunity sets human has already seen/decided on
  const lastOpportunityHashRef = useRef<string>(""); // Track current opportunity signature
  const humanJustDeclaredRef = useRef<boolean>(false); // Track if human just made a declaration
  const dealingIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const declarationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  // Clean up timers on unmount
  useEffect(() => {
    const dealingInterval = dealingIntervalRef.current;
    const declarationTimeout = declarationTimeoutRef.current;

    return () => {
      if (dealingInterval) {
        clearInterval(dealingInterval);
      }
      if (declarationTimeout) {
        clearTimeout(declarationTimeout);
      }
    };
  }, []);

  // Use useRef to store stable functions that can be called by other callbacks
  const startProgressiveDealingRef = useRef<
    (stateOverride?: GameState) => void
  >(() => {});
  const checkForDeclarationOpportunitiesRef = useRef<
    (state: GameState) => void
  >(() => {});

  const handleAIDeclaration = useCallback(
    (state: GameState, playerId: PlayerId, declaration: any) => {
      try {
        // CRITICAL: Double-check declaration validity just before making the declaration
        // This prevents race conditions where the AI decision was made with stale state
        const currentDeclarationOptions = getPlayerDeclarationOptions(
          state,
          playerId,
        );
        const isValidDeclaration = currentDeclarationOptions.some(
          (option) =>
            option.type === declaration.type &&
            option.suit === declaration.suit,
        );

        if (!isValidDeclaration) {
          console.warn(
            `AI ${playerId} declaration rejected - no longer valid due to state change`,
          );
          console.warn(`Attempted declaration:`, declaration);
          console.warn(`Valid options:`, currentDeclarationOptions);

          // Continue dealing without declaring
          const resumedState = resumeDealing(state);
          setGameState(resumedState);
          setIsDealingInProgress(false);
          setTimeout(() => {
            startProgressiveDealingRef.current(resumedState);
          }, 100);
          return;
        }

        console.log(
          `AI ${playerId} declaration validated - proceeding with:`,
          declaration,
        );

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
              startProgressiveDealingRef.current(resumedState);
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
          startProgressiveDealingRef.current(resumedState);
        }, 100);
      }
    },
    [setGameState, setIsDealingInProgress],
  );

  const checkAIDeclarations = useCallback(
    (state: GameState) => {
      // Check each AI player for declaration opportunities
      const aiPlayers = state.players.filter((p) => !p.isHuman);

      for (const player of aiPlayers) {
        // CRITICAL: Re-check the current trump declaration status before each AI decision
        // This prevents race conditions where multiple AIs make decisions based on stale state
        const currentDeclarationStatus = getTrumpDeclarationStatus(state);

        // Get fresh declaration options based on current state (not stale state)
        const currentDeclarationOptions = getPlayerDeclarationOptions(
          state,
          player.id as PlayerId,
        );

        // If this AI has no valid options due to state changes, skip
        if (currentDeclarationOptions.length === 0) {
          continue;
        }

        const aiDecision = getAITrumpDeclarationDecision(
          state,
          player.id as PlayerId,
        );

        if (aiDecision.shouldDeclare && aiDecision.declaration) {
          console.log(`AI ${player.id} decision: ${aiDecision.reasoning}`);
          console.log(`Current declaration status:`, currentDeclarationStatus);

          handleAIDeclaration(
            state,
            player.id as PlayerId,
            aiDecision.declaration,
          );
          break; // Only one AI declares at a time
        }
      }
    },
    [handleAIDeclaration],
  );

  const createOpportunityHash = useCallback((opportunities: any[]) => {
    // Create a deterministic hash of opportunities including trump context
    return opportunities
      .map((opp) => `${opp.type}-${opp.suit}`)
      .sort()
      .join(",");
  }, []);

  const checkForDeclarationOpportunities = useCallback(
    (state: GameState) => {
      // Skip if human just declared to prevent immediate re-triggering
      if (humanJustDeclaredRef.current) {
        humanJustDeclaredRef.current = false;
        checkAIDeclarations(state);
        return;
      }

      const opportunities = checkDeclarationOpportunities(state);
      const humanOpportunities = opportunities.get(PlayerId.Human);

      if (humanOpportunities && humanOpportunities.length > 0) {
        const currentHash = createOpportunityHash(humanOpportunities);

        // Check if this exact opportunity set has been seen before
        const hasSeenThisSet = humanDecisionHistoryRef.current.has(currentHash);
        const isNewOpportunitySet =
          currentHash !== lastOpportunityHashRef.current;

        // Only show modal for NEW opportunity sets that haven't been seen before
        if (isNewOpportunitySet && !hasSeenThisSet && !showDeclarationModal) {
          console.log(
            `🎯 New human declaration opportunities detected: ${currentHash}`,
          );

          // Update tracking
          lastOpportunityHashRef.current = currentHash;

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
          // Same opportunities already seen/decided upon, or modal already showing
          // Check AI declarations instead
          checkAIDeclarations(state);
        }
      } else {
        // No human opportunities, check AI declarations
        checkAIDeclarations(state);
      }
    },
    [
      createOpportunityHash,
      checkAIDeclarations,
      setGameState,
      showDeclarationModal,
      setAvailableDeclarations,
      setShowDeclarationModal,
    ],
  );

  const startProgressiveDealing = useCallback(
    (stateOverride?: GameState) => {
      const currentState = stateOverride || gameState;
      if (!currentState || isDealingInProgress) return;

      setIsDealingInProgress(true);
      // No longer need skip flag - using immutable opportunity tracking

      // Reset immutable tracking for new dealing session
      humanDecisionHistoryRef.current.clear();
      lastOpportunityHashRef.current = "";
      humanJustDeclaredRef.current = false;

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

        // No longer reset skip flag - rely on immutable opportunity tracking instead

        // Check for declaration opportunities after dealing card
        checkForDeclarationOpportunitiesRef.current(newState);

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
            // Pause for trump declaration opportunity at end of dealing
            const pausedState = pauseDealing(newState, "trump_declaration");
            setGameState(pausedState);
            setAvailableDeclarations(declarationOptions);
            setShowDeclarationModal(true);
            // No need to reset skip flag - using immutable tracking
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
    [
      gameState,
      isDealingInProgress,
      dealingSpeed,
      setGameState,
      setIsDealingInProgress,
      setAvailableDeclarations,
      setShowDeclarationModal,
    ],
  );

  // Update refs to current functions
  useEffect(() => {
    startProgressiveDealingRef.current = startProgressiveDealing;
    checkForDeclarationOpportunitiesRef.current =
      checkForDeclarationOpportunities;
  });

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
      // No longer need skip flag - using immutable opportunity tracking

      // Record that human just declared to prevent immediate re-triggering
      humanJustDeclaredRef.current = true;

      // Add current opportunity set to decision history since human chose to declare
      const currentHash = lastOpportunityHashRef.current;
      if (currentHash) {
        humanDecisionHistoryRef.current.add(currentHash);
        console.log(
          `📝 Human declared - recording decision for: ${currentHash}`,
        );
      }

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
              // No longer reset skip flag - using immutable tracking
              checkForDeclarationOpportunitiesRef.current(newState);

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
                  // No longer reset skip flag - using immutable tracking
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
    // No longer need skip flag - using immutable opportunity tracking

    // Record that human skipped this specific opportunity set
    const currentHash = lastOpportunityHashRef.current;
    if (currentHash) {
      humanDecisionHistoryRef.current.add(currentHash);
      console.log(`🚫 Human skipped - recording decision for: ${currentHash}`);
    }

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
        // No longer reset skip flag - using immutable tracking
        checkForDeclarationOpportunitiesRef.current(newState);

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
            // No longer reset skip flag - using immutable tracking
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
