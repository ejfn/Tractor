import { useState, useEffect, useRef } from "react";
import { GameState, GamePhase } from "../types";
import { dealNextCard, isDealingComplete } from "../game/gameLogic";

interface UseSimpleDealingProps {
  gameState: GameState | null;
  setGameState: (state: GameState) => void;
  dealingSpeed?: number;
}

export function useSimpleDealing({
  gameState,
  setGameState,
  dealingSpeed = 500,
}: UseSimpleDealingProps) {
  const [isDealingInProgress, setIsDealingInProgress] = useState(false);
  const dealingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentStateRef = useRef<GameState | null>(null);
  const isPausedRef = useRef<boolean>(false);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (dealingTimerRef.current) {
        clearTimeout(dealingTimerRef.current);
      }
    };
  }, []);

  // Start dealing
  const startDealing = () => {
    if (
      !gameState ||
      gameState.gamePhase !== GamePhase.Dealing ||
      isDealingInProgress
    ) {
      return;
    }

    setIsDealingInProgress(true);
    dealNextCardStep(gameState);
  };

  // Deal one card and schedule the next
  const dealNextCardStep = (currentState: GameState) => {
    // Stop if dealing is complete - PAUSE to show final modal
    if (isDealingComplete(currentState)) {
      setIsDealingInProgress(false);
      isPausedRef.current = true; // PAUSE instead of completing
      setGameState(currentState);
      return;
    }

    // Deal next card
    const newState = dealNextCard(currentState);
    setGameState(newState);
    currentStateRef.current = newState;

    // Schedule next card (only if not paused)
    if (!isPausedRef.current) {
      dealingTimerRef.current = setTimeout(() => {
        dealNextCardStep(newState);
      }, dealingSpeed);
    }
  };

  // Pause dealing
  const pauseDealing = () => {
    if (dealingTimerRef.current) {
      clearTimeout(dealingTimerRef.current);
      dealingTimerRef.current = null;
    }
    isPausedRef.current = true;
  };

  // Resume dealing
  const resumeDealing = (stateOverride?: GameState) => {
    // More forgiving resume logic - if we have a state to work with and we're paused, resume
    if (isPausedRef.current) {
      const stateToUse = stateOverride || currentStateRef.current;
      if (stateToUse && stateToUse.gamePhase === "dealing") {
        currentStateRef.current = stateToUse; // Update the ref with the latest state
        isPausedRef.current = false;

        // If dealing is complete, transition to playing
        if (isDealingComplete(stateToUse)) {
          const playingState = { ...stateToUse, gamePhase: GamePhase.Playing };
          setGameState(playingState);
          return;
        }

        // Ensure dealing is marked as in progress
        if (!isDealingInProgress) {
          setIsDealingInProgress(true);
        }
        dealNextCardStep(stateToUse);
      }
    }
  };

  // Stop dealing
  const stopDealing = () => {
    if (dealingTimerRef.current) {
      clearTimeout(dealingTimerRef.current);
      dealingTimerRef.current = null;
    }
    setIsDealingInProgress(false);
    isPausedRef.current = false;
  };

  return {
    isDealingInProgress,
    isPaused: isPausedRef.current,
    startDealing,
    stopDealing,
    pauseDealing,
    resumeDealing,
  };
}
