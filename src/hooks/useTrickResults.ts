import { useState, useEffect, useRef } from 'react';
import { Trick } from '../types/game';

/**
 * Hook for managing trick completion and result display
 * @returns Trick result state and handler functions
 */
export function useTrickResults() {
  const [showTrickResult, setShowTrickResult] = useState(false);
  const [lastTrickWinner, setLastTrickWinner] = useState('');
  const [lastTrickPoints, setLastTrickPoints] = useState(0);
  const [lastCompletedTrick, setLastCompletedTrick] = useState<Trick & { winningPlayerId?: string } | null>(null);
  
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

  // Auto-hide trick result after a delay and update game state
  useEffect(() => {
    let hideTimer: ReturnType<typeof setTimeout> | null = null;

    if (showTrickResult) {
      // Hide the trick result after a few seconds and continue the game
      hideTimer = setTimeout(() => {
        setShowTrickResult(false);

        // Also clear the lastCompletedTrick to ensure we stop showing
        // the completed trick and allow the next trick to start
        setLastCompletedTrick(null);
      }, 2000);
    }

    return () => {
      if (hideTimer) {
        clearTimeout(hideTimer);
      }
    };
  }, [showTrickResult]);

  // Simpler backup logic - only show once per trick and don't repeatedly trigger
  useEffect(() => {
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;

    // Only run the fallback if:
    // 1. We have a completed trick
    // 2. We're not currently showing the result
    // 3. We haven't already shown the result for this trick
    if (lastCompletedTrick && !showTrickResult && !hasShownResultRef.current) {
      fallbackTimer = setTimeout(() => {
        setShowTrickResult(true);
        hasShownResultRef.current = true; // Mark that we've shown it
      }, 1200); // 1.2 second fallback (much shorter)
    }

    return () => {
      if (fallbackTimer) {
        clearTimeout(fallbackTimer);
      }
    };
  }, [lastCompletedTrick, showTrickResult]);

  // Handle a completed trick
  const handleTrickCompletion = (
    winnerName: string,
    points: number,
    trick: Trick & { winningPlayerId?: string }
  ) => {
    setLastTrickWinner(winnerName);
    setLastTrickPoints(points);

    // Reset showTrickResult to false before setting the new completed trick
    setShowTrickResult(false);

    // Ensure we have the complete trick info before setting state
    if (trick.plays.length === 4) { // Assuming always 4 players
      setLastCompletedTrick(trick);
    } else {
      // This is a fallback that shouldn't normally be needed
      console.warn("Incomplete trick detected in handleTrickCompletion");
      setLastCompletedTrick(trick);
    }
  };

  // Handler for when all cards in trick are animated into position
  const handleTrickAnimationComplete = () => {
    // Only show the trick result after all cards are animated
    if (lastCompletedTrick && !showTrickResult) {
      setShowTrickResult(true);
    }
  };

  return {
    showTrickResult,
    lastTrickWinner,
    lastTrickPoints,
    lastCompletedTrick,
    setLastCompletedTrick,
    handleTrickCompletion,
    handleTrickAnimationComplete
  };
}