import { Card, Combo, GameState, Player, PositionStrategy } from "../types";
import {
  createCardMemory,
  enhanceGameContextWithHistoricalMemory,
} from "./aiCardMemory";
import { analyzeCombo, createGameContext } from "./aiGameContext";
import { selectOptimalFollowPlay } from "./following/followingStrategy";
import { selectAdvancedLeadingPlay } from "./leading/leadingStrategy";
import { analyzeVoidExploitation } from "./analysis/voidExploitation";

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

  // Phase 3: Advanced Void Exploitation Analysis
  let voidExploitationAnalysis = null;
  if (context.memoryContext?.cardMemory && gameState.tricks.length >= 2) {
    try {
      voidExploitationAnalysis = analyzeVoidExploitation(
        context.memoryContext.cardMemory,
        gameState,
        context,
        trumpInfo,
        player.id,
      );

      // Integrate void exploitation insights into context
      if (context.memoryContext) {
        context.memoryContext.voidExploitation = voidExploitationAnalysis;
      }
    } catch (error) {
      console.warn("Void exploitation analysis failed:", error);
    }
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
      player.id,
    );
    return restructuredPlay;
  }
}
