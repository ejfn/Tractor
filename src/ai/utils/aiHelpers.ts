import {
  Card,
  Combo,
  ComboAnalysis,
  GameState,
  PlayerId,
  Rank,
  TrumpInfo,
} from "../../types";

/**
 * AI Helpers - Common utility functions for AI strategy
 *
 * Provides helper functions and common logic used across
 * multiple AI modules and strategy implementations.
 */

/**
 * Get strategic priority for point card contribution
 *
 * Prioritizes Ten > King > Five even when same point value,
 * to preserve stronger cards (King) for later use.
 */
export function getPointCardPriority(card: Card): number {
  if (card.rank === Rank.Ten) return 3; // Prefer Ten over King (same points, but preserve King)
  if (card.rank === Rank.King) return 2;
  if (card.rank === Rank.Five) return 1;
  return 0;
}

/**
 * Select disruptive combo for opponent interference
 */
export function selectDisruptiveCombo(
  comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
  _trumpInfo: TrumpInfo,
): Card[] {
  // Select combo with highest disruption potential
  const sorted = comboAnalyses.sort(
    (a, b) => b.analysis.disruptionPotential - a.analysis.disruptionPotential,
  );
  return sorted[0].combo.cards;
}

/**
 * Check if two players are teammates
 *
 * Players are teammates if they're on the same team.
 * Teams: Human + Bot2 vs Bot1 + Bot3
 */
export function isTeammate(
  gameState: GameState,
  playerId1: PlayerId,
  playerId2: PlayerId,
): boolean {
  // Get both players from gameState
  const player1 = gameState.players.find((p) => p.id === playerId1);
  const player2 = gameState.players.find((p) => p.id === playerId2);

  if (!player1 || !player2) {
    return false;
  }

  // Players are teammates if they're on the same team
  return player1.team === player2.team;
}
