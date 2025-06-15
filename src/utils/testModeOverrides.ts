/**
 * Test Mode Overrides
 *
 * Provides speed optimizations and behavior modifications for unattended testing
 */

// Simple boolean flag for unattended test mode
let unattendedTestModeEnabled = false;

// Check if we're specifically in unattended game test mode
export const isUnattendedTestMode = (): boolean => {
  return unattendedTestModeEnabled;
};

// Override game timings for speed in test mode
export const getTestTimings = () => {
  if (isUnattendedTestMode()) {
    return {
      AI_MOVE_DELAY: 0,
      AI_KITTY_SWAP_DELAY: 0,
      MOVE_COMPLETION_DELAY: 0,
      TRICK_RESULT_DISPLAY_TIME: 0,
      ANIMATION_COMPLETION_DELAY: 0,
      CARD_ANIMATION_FALLBACK: 0,
      CARD_SELECTION_DELAY: 0,
      ROUND_COMPLETE_BUFFER: 0,
      STATE_UPDATE_SYNC_DELAY: 0,
      THINKING_DOTS_INTERVAL: 0,
    };
  }

  // Return null to use original timings from gameTimings.ts
  return null;
};

// Enable test mode for components that need special behavior
export const enableUnattendedTestMode = (): void => {
  unattendedTestModeEnabled = true;
};

export const disableUnattendedTestMode = (): void => {
  unattendedTestModeEnabled = false;
};
