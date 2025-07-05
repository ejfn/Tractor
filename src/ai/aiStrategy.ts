import { Card, Combo, GameState, Player, PositionStrategy } from "../types";
import { gameLogger } from "../utils/gameLogger";
import { analyzeCombo, createGameContext } from "./aiGameContext";
import { selectFollowingPlay } from "./following/followingStrategy";
import { selectFollowingPlay as selectFollowingPlayV2 } from "./followingV2/followingStrategy";
import { selectLeadingPlay } from "./leading/leadingStrategy";

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

  // Enhanced Point-Focused Strategy (Issue #61) - Used in leading play selection

  // Determine if leading or following
  if (!currentTrick || currentTrick.plays.length === 0) {
    // LEADING: Use unified leading strategy
    const leadingPlay = selectLeadingPlay(
      validCombos,
      trumpInfo,
      context,
      gameState,
    );
    gameLogger.debug("ai_leading_decision", {
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

    // Feature toggle for enhanced following algorithm
    const USE_ENHANCED_FOLLOWING = true; // Toggle to switch between V1 and V2

    let restructuredPlay: Card[];

    if (USE_ENHANCED_FOLLOWING) {
      // V2: Enhanced following algorithm (no fallback - V2 handles its own errors)
      restructuredPlay = selectFollowingPlayV2(
        comboAnalyses,
        context,
        {} as PositionStrategy,
        trumpInfo,
        gameState,
        player.id,
      );
    } else {
      // V1: Original following algorithm
      restructuredPlay = selectFollowingPlay(
        comboAnalyses,
        context,
        {} as PositionStrategy,
        trumpInfo,
        gameState,
        player.id,
      );
    }
    gameLogger.debug("ai_following_decision", {
      decisionPoint: "following_play",
      player: player.id,
      decision: restructuredPlay,
      context,
    });
    return restructuredPlay;
  }
}
