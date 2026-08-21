import { PlayerId, Suit } from "../../types";

export type RoundStrategyGoal =
  "rush_points" | "conserve_and_control" | "feed_partner" | "kitty_defense";

export type TrumpPolicy =
  "aggressive_ruff" | "strict_conservation" | "draw_trumps";

export interface RoundStrategyPlan {
  goal: RoundStrategyGoal;
  targetSuit?: Suit;
  trumpPolicy: TrumpPolicy;
  reasoning: string;
  lastUpdatedTrick: number;
}

// In-memory persistent plan state across tricks for the current round
const playerRoundPlans = new Map<PlayerId, RoundStrategyPlan>();

/**
 * Gets the active strategic plan for a player.
 * Initializes with a sensible default based on team role if not yet set.
 */
export function getActiveRoundPlan(
  playerId: PlayerId,
  isAttackingTeam: boolean,
  currentTrickNumber: number,
): RoundStrategyPlan {
  const existing = playerRoundPlans.get(playerId);
  if (existing) {
    return existing;
  }

  // Default initial plan
  const defaultPlan: RoundStrategyPlan = {
    goal: isAttackingTeam ? "rush_points" : "conserve_and_control",
    trumpPolicy: "strict_conservation",
    reasoning: isAttackingTeam
      ? "Establish side suits and capture points aggressively toward 80 pts"
      : "Conserve high trumps and deny point tricks to hold attackers under 80 pts",
    lastUpdatedTrick: currentTrickNumber,
  };

  playerRoundPlans.set(playerId, defaultPlan);
  return defaultPlan;
}

/**
 * Updates the active strategic plan for a player.
 */
export function updateActiveRoundPlan(
  playerId: PlayerId,
  plan: Partial<RoundStrategyPlan>,
  currentTrickNumber: number,
): RoundStrategyPlan {
  const current = getActiveRoundPlan(playerId, true, currentTrickNumber);
  const updated: RoundStrategyPlan = {
    ...current,
    ...plan,
    lastUpdatedTrick: currentTrickNumber,
  };

  playerRoundPlans.set(playerId, updated);
  return updated;
}

/**
 * Resets all round strategy plans (called on new round start).
 */
export function resetRoundStrategyPlans(): void {
  playerRoundPlans.clear();
}
