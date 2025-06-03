import { useState, useEffect, useRef, useCallback } from "react";
import { GameState, GamePhase, PlayerId } from "../types";
import { dealNextCard, isDealingComplete } from "../game/gameLogic";
import {
  makeTrumpDeclaration,
  getPlayerDeclarationOptions,
  finalizeTrumpDeclaration,
} from "../game/trumpDeclarationManager";
import { getAITrumpDeclarationDecision } from "../ai/aiTrumpDeclarationStrategy";

interface UseProgressiveDealingProps {
  gameState: GameState | null;
  setGameState: (state: GameState) => void;
  dealingSpeed?: number;
}

export function useProgressiveDealing({
  gameState,
  setGameState,
  dealingSpeed = 250,
}: UseProgressiveDealingProps) {
  // Dealing state
  const [isDealingInProgress, setIsDealingInProgress] = useState(false);
  const dealingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentStateRef = useRef<GameState | null>(null);
  const isPausedRef = useRef<boolean>(false);

  // Trump declaration state
  const [currentOpportunitiesHash, setCurrentOpportunitiesHash] =
    useState<string>("");
  const [shouldShowOpportunities, setShouldShowOpportunities] = useState(false);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (dealingTimerRef.current) {
        clearTimeout(dealingTimerRef.current);
      }
    };
  }, []);

  // Create hash of opportunities to detect changes
  const createOpportunityHash = useCallback((opportunities: any[]) => {
    return opportunities
      .map((opp) => `${opp.type}-${opp.suit}`)
      .sort()
      .join(",");
  }, []);

  // References for functions to avoid circular dependencies
  const dealNextCardStepRef = useRef<(currentState: GameState) => void>(null!);
  const resumeDealingRef = useRef<(stateOverride?: GameState) => void>(null!);
  const pauseDealingRef = useRef<() => void>(null!);
  const checkAIDeclarationsRef = useRef<(state: GameState) => boolean>(null!);

  // Deal one card and schedule the next
  const dealNextCardStep = useCallback(
    (currentState: GameState) => {
      // Stop if dealing is complete - PAUSE to show final modal
      if (isDealingComplete(currentState)) {
        setIsDealingInProgress(false);
        isPausedRef.current = true;
        setGameState(currentState);
        return;
      }

      // Deal next card
      const newState = dealNextCard(currentState);
      setGameState(newState);
      currentStateRef.current = newState;

      // Check for trump declaration opportunities after dealing card
      const humanOptions = getPlayerDeclarationOptions(
        newState,
        PlayerId.Human,
      );
      const newHash = createOpportunityHash(humanOptions);

      // Check for AI declarations FIRST (AI is faster and has priority)
      if (checkAIDeclarationsRef.current) {
        const aiMadeDeclaration = checkAIDeclarationsRef.current(newState);
        if (aiMadeDeclaration) {
          return; // AI handled, will resume automatically
        }
      }

      // Check for human opportunities (only if no AI declared)
      if (humanOptions.length > 0 && newHash !== currentOpportunitiesHash) {
        setCurrentOpportunitiesHash(newHash);
        setShouldShowOpportunities(true);
        // Use pause logic directly to avoid dependency issues
        if (dealingTimerRef.current) {
          clearTimeout(dealingTimerRef.current);
          dealingTimerRef.current = null;
        }
        isPausedRef.current = true;
        return;
      } else if (humanOptions.length === 0 && shouldShowOpportunities) {
        // If no opportunities and currently showing, hide it
        setShouldShowOpportunities(false);
      }

      // Schedule next card (only if not paused)
      if (!isPausedRef.current) {
        dealingTimerRef.current = setTimeout(() => {
          dealNextCardStep(newState);
        }, dealingSpeed);
      }
    },
    [
      dealingSpeed,
      createOpportunityHash,
      currentOpportunitiesHash,
      shouldShowOpportunities,
      setGameState,
    ],
  );

  // Update ref
  dealNextCardStepRef.current = dealNextCardStep;

  // Check for AI trump declarations
  const checkAIDeclarations = useCallback(
    (currentState: GameState): boolean => {
      // Check each AI player for trump declaration opportunities
      const aiPlayers = currentState.players.filter((p) => !p.isHuman);

      for (const aiPlayer of aiPlayers) {
        const aiOptions = getPlayerDeclarationOptions(
          currentState,
          aiPlayer.id as PlayerId,
        );

        if (aiOptions.length > 0) {
          // Get AI's decision on whether to declare
          const decision = getAITrumpDeclarationDecision(
            currentState,
            aiPlayer.id as PlayerId,
          );

          if (decision.shouldDeclare && decision.declaration) {
            // Double-check that we're still in dealing phase and not paused
            if (currentState.gamePhase !== "dealing" || isPausedRef.current) {
              continue; // Skip this AI if game state changed
            }

            // AI wants to declare trump
            const newState = makeTrumpDeclaration(
              currentState,
              aiPlayer.id as PlayerId,
              {
                rank: currentState.trumpInfo.trumpRank,
                suit: decision.declaration.suit,
                type: decision.declaration.type,
                cards: decision.declaration.cards,
              },
            );

            setGameState(newState);
            currentStateRef.current = newState;

            // Continue dealing immediately after AI declaration
            // The declaration will be visible in the UI automatically
            setTimeout(() => {
              if (dealNextCardStepRef.current) {
                dealNextCardStepRef.current(newState);
              }
            }, dealingSpeed); // Use normal dealing speed to continue

            return true; // AI made a declaration
          }
        }
      }

      return false; // No AI declarations made
    },
    [setGameState, dealingSpeed],
  );

  // Update ref
  checkAIDeclarationsRef.current = checkAIDeclarations;

  // Start dealing
  const startDealing = useCallback(() => {
    if (
      !gameState ||
      gameState.gamePhase !== GamePhase.Dealing ||
      isDealingInProgress
    ) {
      return;
    }

    setIsDealingInProgress(true);
    isPausedRef.current = false;
    dealNextCardStep(gameState);
  }, [gameState, isDealingInProgress, dealNextCardStep]);

  // Pause dealing
  const pauseDealing = useCallback(() => {
    if (dealingTimerRef.current) {
      clearTimeout(dealingTimerRef.current);
      dealingTimerRef.current = null;
    }
    isPausedRef.current = true;

    // Update the game state's dealing pause state
    if (currentStateRef.current) {
      const pausedState = {
        ...currentStateRef.current,
        dealingState: {
          ...currentStateRef.current.dealingState!,
          paused: true,
          pauseReason: "trump_declaration",
        },
      };
      setGameState(pausedState);
      currentStateRef.current = pausedState;
    }
  }, [setGameState]);

  // Update ref
  pauseDealingRef.current = pauseDealing;

  // Resume dealing
  const resumeDealing = useCallback(
    (stateOverride?: GameState) => {
      if (isPausedRef.current) {
        const stateToUse = stateOverride || currentStateRef.current;
        if (stateToUse && stateToUse.gamePhase === "dealing") {
          // Clear the pause state in game state
          const resumedState = {
            ...stateToUse,
            dealingState: {
              ...stateToUse.dealingState!,
              paused: false,
              pauseReason: undefined,
            },
          };

          currentStateRef.current = resumedState;
          setGameState(resumedState);
          isPausedRef.current = false;

          // If dealing is complete, finalize trump declaration and transition properly
          if (isDealingComplete(resumedState)) {
            const finalizedState = finalizeTrumpDeclaration(resumedState);
            setGameState(finalizedState);
            return;
          }

          // Ensure dealing is marked as in progress
          if (!isDealingInProgress) {
            setIsDealingInProgress(true);
          }
          dealNextCardStep(resumedState);
        }
      }
    },
    [isDealingInProgress, setGameState, dealNextCardStep],
  );

  // Update ref
  resumeDealingRef.current = resumeDealing;

  // Stop dealing
  const stopDealing = useCallback(() => {
    if (dealingTimerRef.current) {
      clearTimeout(dealingTimerRef.current);
      dealingTimerRef.current = null;
    }
    setIsDealingInProgress(false);
    isPausedRef.current = false;
    setShouldShowOpportunities(false);
    setCurrentOpportunitiesHash("");
  }, []);

  // Handle human trump declaration
  const handleHumanDeclaration = useCallback(
    (declaration: any) => {
      if (!gameState) return;

      // Reset the opportunities flag and hash immediately to prevent reappearing
      setShouldShowOpportunities(false);
      setCurrentOpportunitiesHash("");

      // Update game state with the declaration
      const newState = makeTrumpDeclaration(gameState, PlayerId.Human, {
        rank: gameState.trumpInfo.trumpRank,
        suit: declaration.suit,
        type: declaration.type,
        cards: declaration.cards,
      });

      setGameState(newState);
      currentStateRef.current = newState;

      setTimeout(() => {
        if (resumeDealingRef.current) {
          resumeDealingRef.current(newState);
        }
      }, 500);
    },
    [gameState, setGameState],
  );

  // Handle continue without declaration
  const handleContinue = useCallback(() => {
    setShouldShowOpportunities(false);
    if (gameState) {
      setTimeout(() => {
        if (resumeDealingRef.current) {
          resumeDealingRef.current(gameState);
        }
      }, 250);
    }
  }, [gameState]);

  // Handle manual pause (when user taps the progress bar)
  const handleManualPause = useCallback(() => {
    if (!gameState || gameState.gamePhase !== "dealing") return;
    if (pauseDealingRef.current) {
      pauseDealingRef.current();
    }
  }, [gameState]);

  return {
    // Dealing state
    isDealingInProgress,
    isPaused: isPausedRef.current,

    // Dealing controls
    startDealing,
    stopDealing,
    pauseDealing,
    resumeDealing,

    // Trump declaration state
    shouldShowOpportunities,

    // Trump declaration handlers
    handleHumanDeclaration,
    handleContinue,
    handleManualPause,
  };
}
