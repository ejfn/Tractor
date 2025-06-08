import { Card, Combo, GameState, Player, PositionStrategy } from "../types";
import {
  createCardMemory,
  enhanceGameContextWithHistoricalMemory,
} from "./aiCardMemory";
import { analyzeCombo, createGameContext } from "./aiGameContext";
import { selectOptimalFollowPlay } from "./following/followingStrategy";
import { selectAdvancedLeadingPlay } from "./leading/leadingStrategy";

/**
 * Main AI strategy function - replaces the class-based approach
 * Unified entry point for all AI card play decisions
 */
export function makeAIPlay(
  gameState: GameState,
  player: Player,
  validCombos: Combo[],
): Card[] {
  const { currentTrick, trumpInfo } = gameState;

  // Create strategic context for this AI player
  const context = createGameContext(gameState, player.id);

  // Phase 4: Enhanced memory context with historical analysis
  const cardMemory = createCardMemory(gameState);
  if (context.memoryContext) {
    context.memoryContext.cardMemory = cardMemory;
  }

  // Apply historical insights when sufficient trick data is available
  if (gameState.tricks.length >= 3) {
    const enhancedContext = enhanceGameContextWithHistoricalMemory(
      context,
      cardMemory,
      gameState,
    );
    // Update context with historical enhancements
    Object.assign(context, enhancedContext);
  }

  // Enhanced Point-Focused Strategy (Issue #61) - Used in leading play selection

  // Determine if leading or following
  if (!currentTrick || currentTrick.plays.length === 0) {
    // LEADING: Use unified advanced leading strategy
    return selectAdvancedLeadingPlay(
      validCombos,
      trumpInfo,
      context,
      gameState,
    );
  } else {
    // Following play with RESTRUCTURED priority chain
    // Convert validCombos to comboAnalyses format using proper analysis
    const comboAnalyses = validCombos.map((combo) => ({
      combo,
      analysis: analyzeCombo(combo, trumpInfo, context),
    }));

    // Use new restructured follow logic
    const restructuredPlay = selectOptimalFollowPlay(
      comboAnalyses,
      context,
      {} as PositionStrategy, // Simplified for now
      trumpInfo,
      gameState,
    );
    return restructuredPlay;
  }
}
