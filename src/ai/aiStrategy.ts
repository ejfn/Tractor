import { Card, GameState, Player, PositionStrategy } from "../types";
import { gameLogger } from "../utils/gameLogger";
import { createGameContext } from "./aiGameContext";
import { selectFollowingPlay } from "./following/followingStrategy";
import { selectLeadingPlay } from "./leading/leadingStrategy";

/**
 * Main AI strategy function - replaces the class-based approach
 * Unified entry point for all AI card play decisions
 */
export function makeAIPlay(gameState: GameState, player: Player): Card[] {
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
    // LEADING: Use new scoring-based leading strategy
    const leadingPlay = selectLeadingPlay(gameState);
    gameLogger.debug("ai_leading_decision", {
      decisionPoint: "leading_play",
      player: player.id,
      decision: leadingPlay,
      context,
    });
    return leadingPlay;
  } else {
    // Use enhanced following algorithm V2
    const restructuredPlay = selectFollowingPlay(
      context,
      {} as PositionStrategy,
      trumpInfo,
      gameState,
      player.id,
    );
    gameLogger.debug("ai_following_decision", {
      decisionPoint: "following_play",
      player: player.id,
      decision: restructuredPlay,
      context,
    });
    return restructuredPlay;
  }
}
