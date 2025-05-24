/**
 * Game timing constants for consistent game pacing
 *
 * These values control the game's visual rhythm and animations,
 * providing a balance between gameplay speed and user experience.
 * All values are in milliseconds.
 */

// Player move timings
export const AI_MOVE_DELAY = 600; // Delay before AI makes a move (thinking animation time)
export const MOVE_COMPLETION_DELAY = 1000; // Delay after any player's move completes

// Trick result display timings
export const TRICK_RESULT_DISPLAY_TIME = 1500; // Duration to show the trick result notification
export const ANIMATION_COMPLETION_DELAY = 500; // Delay after animations complete before processing next step

// Card animation timings
export const CARD_ANIMATION_FALLBACK = 1000; // Fallback timeout for card animations if callback fails

// UI interaction timings
export const CARD_SELECTION_DELAY = 250; // Delay before processing human card selection
export const ROUND_COMPLETE_BUFFER = 500; // Additional buffer after trick result before round complete modal
export const STATE_UPDATE_SYNC_DELAY = 100; // Short delay to ensure state updates happen together

// Animation loop timings
export const THINKING_DOTS_INTERVAL = 300; // Interval for thinking dots animation loop
