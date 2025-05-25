import {
  GameState,
  GameContext,
  TrickPosition,
  PointPressure,
  PlayerId,
} from "../types/game";

/**
 * Analyzes the current game state to provide strategic context for AI decision making
 */

export function createGameContext(
  gameState: GameState,
  playerId: string,
): GameContext {
  const isAttackingTeam = isPlayerOnAttackingTeam(gameState, playerId);
  const currentPoints = getCurrentAttackingPoints(gameState);
  const pointsNeeded = 80; // Standard Shengji winning threshold
  const cardsRemaining = calculateCardsRemaining(gameState);
  const trickPosition = getTrickPosition(gameState, playerId);
  const pointPressure = calculatePointPressure(currentPoints, pointsNeeded);

  return {
    isAttackingTeam,
    currentPoints,
    pointsNeeded,
    cardsRemaining,
    trickPosition,
    pointPressure,
  };
}

/**
 * Determines if a player is on the attacking team
 * Team A (Human + Bot2) vs Team B (Bot1 + Bot3)
 * The attacking team is determined by who has the current trump rank
 */
export function isPlayerOnAttackingTeam(
  gameState: GameState,
  playerId: string,
): boolean {
  // In Shengji, the attacking team is determined by trump rank progression
  // For simplicity, we'll use the current round's defending team info
  // Team A (Human + Bot2) attacks when it's their turn to advance rank

  // Find which team should be attacking this round based on round number
  // This is a simplified approach - in real Shengji it's more complex
  const roundNumber = gameState.roundNumber;
  const isTeamATurn = roundNumber % 2 === 1; // Team A attacks on odd rounds

  // Team A: Human (player 0) + Bot2 (player 2)
  // Team B: Bot1 (player 1) + Bot3 (player 3)
  const teamAPlayers = [PlayerId.Human, PlayerId.Bot2];
  const isTeamAPlayer = teamAPlayers.includes(playerId as PlayerId);

  // Player is attacking if they're on the team whose turn it is to attack
  return isTeamAPlayer === isTeamATurn;
}

/**
 * Calculates total points collected by the attacking team so far
 */
export function getCurrentAttackingPoints(gameState: GameState): number {
  // In the current implementation, we need to check team tricks
  // For now, return 0 as a placeholder - this would need integration
  // with the existing scoring system

  // TODO: Integrate with actual scoring system in gameRoundManager.ts
  // This should sum up points from all tricks won by attacking team
  return 0;
}

/**
 * Calculates how many cards are left in the current round
 */
export function calculateCardsRemaining(gameState: GameState): number {
  // Get average cards remaining from all players
  const totalCardsRemaining = gameState.players.reduce(
    (sum, player) => sum + player.hand.length,
    0,
  );
  return Math.floor(totalCardsRemaining / 4); // Average per player
}

/**
 * Determines the player's position in the current trick
 */
export function getTrickPosition(
  gameState: GameState,
  playerId: string,
): TrickPosition {
  const { currentTrick } = gameState;

  if (!currentTrick || currentTrick.plays.length === 0) {
    // Player is leading
    return TrickPosition.First;
  }

  // Count how many players have played (including leader)
  const playsCount = currentTrick.plays.length + 1; // +1 for leader

  // Determine position based on play count
  switch (playsCount) {
    case 1:
      return TrickPosition.First;
    case 2:
      return TrickPosition.Second;
    case 3:
      return TrickPosition.Third;
    case 4:
      return TrickPosition.Fourth;
    default:
      return TrickPosition.First;
  }
}

/**
 * Calculates point pressure based on attacking team's progress
 */
export function calculatePointPressure(
  currentPoints: number,
  pointsNeeded: number,
): PointPressure {
  const progressRatio = currentPoints / pointsNeeded;

  if (progressRatio < 0.3) {
    return PointPressure.LOW; // < 24 points
  } else if (progressRatio < 0.7) {
    return PointPressure.MEDIUM; // 24-56 points
  } else {
    return PointPressure.HIGH; // 56+ points
  }
}

/**
 * Determines if a trick has significant points worth fighting for
 */
export function isTrickWorthFighting(
  gameState: GameState,
  context: GameContext,
): boolean {
  const { currentTrick } = gameState;

  if (!currentTrick) return false;

  // Calculate points in current trick
  const trickPoints = currentTrick.plays.reduce(
    (sum, play) =>
      sum + play.cards.reduce((cardSum, card) => cardSum + card.points, 0),
    0,
  );

  // Add points from leading combo
  const leadingPoints =
    currentTrick.leadingCombo?.reduce((sum, card) => sum + card.points, 0) || 0;

  const totalTrickPoints = trickPoints + leadingPoints;

  // Adjust fighting threshold based on point pressure
  switch (context.pointPressure) {
    case PointPressure.LOW:
      return totalTrickPoints >= 15; // Only fight for big point tricks
    case PointPressure.MEDIUM:
      return totalTrickPoints >= 10; // Fight for moderate point tricks
    case PointPressure.HIGH:
      return totalTrickPoints >= 5; // Fight for any points
    default:
      return totalTrickPoints >= 10;
  }
}
