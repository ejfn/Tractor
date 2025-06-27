import { gameLogger } from "../utils/gameLogger";
import { Card, Combo, GameState, Player, PositionStrategy } from "../types";
import { createCardMemory, enhanceGameContextWithMemory } from "./aiCardMemory";
import { analyzeCombo, createGameContext } from "./aiGameContext";
import { analyzeVoidExploitation } from "./analysis/voidExploitation";
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
  gameLogger.debug("Initial GameContext created", {
    decisionPoint: "initial_context",
    player: player.id,
    context,
  });

  // Phase 4: Enhanced memory context with historical analysis
  const cardMemory = createCardMemory(gameState);
  if (context.memoryContext) {
    context.memoryContext.cardMemory = cardMemory;
  }

  // Apply historical insights when sufficient trick data is available
  if (gameState.tricks.length >= 3) {
    const enhancedContext = enhanceGameContextWithMemory(
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
    } catch {
      // Void exploitation analysis is optional - continue without it
    }
  }

  // Enhanced Point-Focused Strategy (Issue #61) - Used in leading play selection

  // Determine if leading or following
  if (!currentTrick || currentTrick.plays.length === 0) {
    // LEADING: Use unified advanced leading strategy
    const leadingPlay = selectAdvancedLeadingPlay(
      validCombos,
      trumpInfo,
      context,
      gameState,
    );
    gameLogger.debug("AI leading decision", {
      decisionPoint: "leading_play",
      player: player.id,
      decision: leadingPlay,
      context,
    });
    return leadingPlay;
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
    gameLogger.debug("AI following decision", {
      decisionPoint: "following_play",
      player: player.id,
      decision: restructuredPlay,
      context,
    });
    return restructuredPlay;
  }
}
