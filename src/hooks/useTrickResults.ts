import { useState, useEffect, useRef } from "react";
import { Trick } from "../types";
import {
  TRICK_RESULT_DISPLAY_TIME,
  STATE_UPDATE_SYNC_DELAY,
} from "../utils/gameTimings";

/**
 * Hook for managing trick completion and result display
 * @returns Trick result state and handler functions
 */
export function useTrickResults() {
  const [showTrickResult, setShowTrickResult] = useState(false);
  const [lastTrickWinner, setLastTrickWinner] = useState("");
  const [lastTrickPoints, setLastTrickPoints] = useState(0);
  const [lastCompletedTrick, setLastCompletedTrick] = useState<
    (Trick & { winningPlayerId?: string }) | null
  >(null);
  const [isTransitioningTricks, setIsTransitioningTricks] = useState(false);

  // Create a callback ref that will be set by the parent component
  // This will be called when it's safe to clear the currentTrick in the game state
  const onTrickResultCompleteRef = useRef<() => void>(() => {});
  // onTrickResultComplete is not currently being used, but keeping for potential future use

  // We'll use a ref to track if we've ever shown the result for this trick
  const hasShownResultRef = useRef(false);

  // Reset the ref when a new trick is completed
  useEffect(() => {
    if (lastCompletedTrick) {
      hasShownResultRef.current = false;
    }
  }, [lastCompletedTrick, lastCompletedTrick?.leadingPlayerId]); // Only reset when a new trick starts

  // When showTrickResult becomes true, mark that we've shown it
  useEffect(() => {
    if (showTrickResult) {
      hasShownResultRef.current = true;
    }
  }, [showTrickResult]);

  // Simple, reliable auto-hide after fixed time
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    if (showTrickResult) {
      // Showing trick result notification

      // Set a timer to hide the result after the display time
      // Just enough time to see who won the trick without slowing gameplay
      timer = setTimeout(() => {
        // Auto-hiding trick result notification

        // We'll clear everything at once to ensure synchronization
        // This ensures the trick result and winner status disappear at the same time

        // Signal to clear the game state
        if (onTrickResultCompleteRef.current) {
          // Clearing game state currentTrick
          onTrickResultCompleteRef.current();
        }

        // Use a single setTimeout to clear both states simultaneously
        // This fixes the issue where winner status and results disappear at different times
        setTimeout(() => {
          // Clearing trick result display and lastCompletedTrick simultaneously
          // Hide the result UI
          setShowTrickResult(false);
          // Clear the completed trick data
          setLastCompletedTrick(null);
          // Mark transition as complete
          setIsTransitioningTricks(false);
        }, STATE_UPDATE_SYNC_DELAY);
      }, TRICK_RESULT_DISPLAY_TIME);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [showTrickResult, lastTrickWinner, lastTrickPoints]);

  // Safety timers have been removed as they might hide underlying issues
  // instead of fixing the root causes

  // Handle a completed trick - simplified to just show result
  const handleTrickCompletion = (
    winnerName: string,
    points: number,
    trick: Trick & { winningPlayerId?: string },
  ) => {
    // Store values for the trick result
    setLastTrickWinner(winnerName);
    setLastTrickPoints(points);

    // Mark that we're transitioning between tricks
    setIsTransitioningTricks(true);

    // Show the result
    setShowTrickResult(true);
  };

  // Handler for when all cards in trick are animated into position
  const handleTrickAnimationComplete = () => {
    // Animation complete callback triggered
  };

  return {
    showTrickResult,
    lastTrickWinner,
    lastTrickPoints,
    lastCompletedTrick,
    isTransitioningTricks,
    setLastCompletedTrick,
    handleTrickCompletion,
    handleTrickAnimationComplete,
    setTrickResultCompleteCallback: (callback: () => void) => {
      onTrickResultCompleteRef.current = callback;
    },
  };
}
