import { Card, GameState, Player } from "../types";
import { gameLogger } from "../utils/gameLogger";
import { createGameContext } from "./aiGameContext";
import {
  selectFollowingPlay,
  selectFollowingPlayAsync,
} from "./following/followingStrategy";
import {
  selectLeadingPlay,
  selectLeadingPlayAsync,
} from "./leading/leadingStrategy";

/**
 * Synchronous AI strategy entry point — rule-based only, no LLM.
 * Used by tests and the sync fallback path.
 */
export function makeAIPlay(gameState: GameState, player: Player): Card[] {
  const { currentTrick, trumpInfo } = gameState;

  if (!currentTrick || currentTrick.plays.length === 0) {
    const leadingPlay = selectLeadingPlay(gameState);
    gameLogger.debug("ai_leading_decision", {
      decisionPoint: "leading_play",
      player: player.id,
      decision: leadingPlay,
    });
    return leadingPlay;
  }

  const context = createGameContext(gameState, player.id);
  const followingPlay = selectFollowingPlay(
    context,
    trumpInfo,
    gameState,
    player.id,
  );
  gameLogger.debug("ai_following_decision", {
    decisionPoint: "following_play",
    player: player.id,
    decision: followingPlay,
  });
  return followingPlay;
}

/**
 * Async AI strategy entry point — routes to async strategy functions that
 * can engage the LLM at genuine ambiguous decision points.
 * Falls back to rule-based picks if LLM is disabled or fails.
 */
export async function makeAIPlayAsync(
  gameState: GameState,
  player: Player,
): Promise<Card[]> {
  const { currentTrick, trumpInfo } = gameState;

  if (!currentTrick || currentTrick.plays.length === 0) {
    const leadingPlay = await selectLeadingPlayAsync(gameState);
    gameLogger.debug("ai_leading_decision_async", {
      decisionPoint: "leading_play_async",
      player: player.id,
      decision: leadingPlay,
    });
    return leadingPlay;
  }

  const context = createGameContext(gameState, player.id);
  const followingPlay = await selectFollowingPlayAsync(
    context,
    trumpInfo,
    gameState,
    player.id,
  );
  gameLogger.debug("ai_following_decision_async", {
    decisionPoint: "following_play_async",
    player: player.id,
    decision: followingPlay,
  });
  return followingPlay;
}
