import {
  Combo,
  TrumpInfo,
  GameState,
  ComboType,
  GameContext,
  PointPressure,
  PointFocusedContext,
  TrumpConservationStrategy,
  GamePhaseStrategy,
  PointCardStrategy,
  TrumpTiming,
  Rank,
  Player,
} from "../../types";
import { isTrump, isPointCard } from "../../game/gameHelpers";

/**
 * Enhanced Point-Focused AI Strategy Implementation
 * Addresses issue #61 with sophisticated point card collection and trump management
 * Includes integrated early game leading strategy with Ace priority logic
 */

/**
 * Creates a point-focused strategic context based on game state
 */
export function createPointFocusedContext(
  gameState: GameState,
  playerId: string,
  baseContext: GameContext,
): PointFocusedContext {
  const player = gameState.players.find((p) => p.id === playerId);
  if (!player) throw new Error(`Player ${playerId} not found`);

  // Determine game phase based on cards remaining
  const totalStartingCards = Math.max(
    ...gameState.players.map(
      (p) => p.hand.length + (gameState.tricks.length * 4) / 4,
    ),
  );
  const cardsPlayed = gameState.tricks.length * 4;
  const gameProgress = cardsPlayed / (totalStartingCards * 4);

  const gamePhase = determineGamePhase(gameProgress);

  // Calculate team points
  const { teamPoints, opponentPoints } = calculateTeamPoints(
    gameState,
    player.team,
  );

  // Calculate point card density in remaining cards
  const pointCardDensity = calculatePointCardDensity(gameState);

  // Determine point card strategy
  const pointCardStrategy = determinePointCardStrategy(
    teamPoints,
    opponentPoints,
    gamePhase,
    baseContext.isAttackingTeam,
  );

  // Determine trump timing strategy
  const trumpTiming = determineTrumpTiming(
    gamePhase,
    teamPoints,
    opponentPoints,
    pointCardDensity,
    baseContext,
  );

  // Check if partner needs point escape
  const partnerNeedsPointEscape = checkPartnerPointEscape(gameState, player);

  // Determine if team can win without collecting more points
  const canWinWithoutPoints = checkCanWinWithoutPoints(
    teamPoints,
    opponentPoints,
    baseContext.isAttackingTeam,
  );

  return {
    gamePhase,
    pointCardStrategy,
    trumpTiming,
    teamPointsCollected: teamPoints,
    opponentPointsCollected: opponentPoints,
    pointCardDensity,
    partnerNeedsPointEscape,
    canWinWithoutPoints,
  };
}

/**
 * Creates trump conservation strategy based on game context
 */
export function createTrumpConservationStrategy(
  pointContext: PointFocusedContext,
  gameState: GameState,
  trumpInfo: TrumpInfo,
): TrumpConservationStrategy {
  const tricksRemaining = estimateTricksRemaining(gameState);

  // Be more conservative in early game, more aggressive in late game
  const conservationLevel =
    pointContext.gamePhase === GamePhaseStrategy.EarlyGame
      ? "high"
      : pointContext.gamePhase === GamePhaseStrategy.LateGame
        ? "low"
        : "medium";

  const preserveBigJokers = shouldPreserveTrumpType(
    "big_joker",
    conservationLevel,
    tricksRemaining,
    pointContext,
  );

  const preserveSmallJokers = shouldPreserveTrumpType(
    "small_joker",
    conservationLevel,
    tricksRemaining,
    pointContext,
  );

  const preserveTrumpRanks = shouldPreserveTrumpType(
    "trump_rank",
    conservationLevel,
    tricksRemaining,
    pointContext,
  );

  // Minimum tricks remaining before using big trumps
  const minTricksRemainingForBigTrump =
    conservationLevel === "high" ? 6 : conservationLevel === "medium" ? 4 : 2;

  // Trump following priority based on strategy
  const trumpFollowingPriority = determineTrumpFollowingPriority(pointContext);

  return {
    preserveBigJokers,
    preserveSmallJokers,
    preserveTrumpRanks,
    minTricksRemainingForBigTrump,
    trumpFollowingPriority,
  };
}

/**
 * Enhanced early-game non-trump leading strategy for point escape
 * Includes integrated Ace-priority logic for optimal early game leading
 * IMPORTANT: This strategy focuses on non-trump leading and should not interfere with trump strategies
 */
export function selectEarlyGameLeadingPlay(
  validCombos: Combo[],
  trumpInfo: TrumpInfo,
  pointContext: PointFocusedContext,
  gameState: GameState,
): Combo | null {
  if (pointContext.gamePhase !== GamePhaseStrategy.EarlyGame) {
    return null; // Use this only in early game
  }

  // Strategy: Lead with high non-trump cards to let partner escape point cards
  // ALWAYS avoid leading with trump cards in early game, regardless of declaration status
  const nonTrumpCombos = validCombos.filter(
    (combo) => !combo.cards.some((card) => isTrump(card, trumpInfo)),
  );

  if (nonTrumpCombos.length === 0) {
    // When only trump options available, let trump-specific strategies handle it
    // This prevents this non-trump strategy from making suboptimal trump decisions
    return null; // Defer to trump-optimized strategies
  }

  // STEP 1: Priority for Ace combos - they're guaranteed winners in early game
  const aceCombos = nonTrumpCombos.filter((combo) =>
    combo.cards.every((card) => card.rank === Rank.Ace),
  );

  if (aceCombos.length > 0) {
    // Sort Ace combos by type preference: pairs > singles
    const acePairs = aceCombos.filter((combo) => combo.type === ComboType.Pair);
    const aceSingles = aceCombos.filter(
      (combo) => combo.type === ComboType.Single,
    );

    // Prefer Ace pairs over Ace singles - they're harder to beat
    if (acePairs.length > 0) {
      return acePairs[0];
    }
    if (aceSingles.length > 0) {
      return aceSingles[0];
    }
  }

  // STEP 2: If no Aces, prioritize high cards by combination type and rank strength
  // Sort by combo value (which already considers card strength within suit)
  const sortedByStrength = nonTrumpCombos.sort((a, b) => b.value - a.value);

  // Prefer pairs and tractors over singles when leading high
  const tractorCombos = sortedByStrength.filter(
    (combo) => combo.type === ComboType.Tractor,
  );
  const pairCombos = sortedByStrength.filter(
    (combo) => combo.type === ComboType.Pair,
  );
  const singleCombos = sortedByStrength.filter(
    (combo) => combo.type === ComboType.Single,
  );

  // Return the highest strength combination, preferring tractors > pairs > singles
  if (tractorCombos.length > 0) return tractorCombos[0];
  if (pairCombos.length > 0) return pairCombos[0];
  return singleCombos[0];
}

// Helper Functions

function determineGamePhase(gameProgress: number): GamePhaseStrategy {
  if (gameProgress <= 0.25) return GamePhaseStrategy.EarlyGame;
  if (gameProgress <= 0.75) return GamePhaseStrategy.MidGame;
  return GamePhaseStrategy.LateGame;
}

function calculateTeamPoints(
  gameState: GameState,
  team: "A" | "B",
): { teamPoints: number; opponentPoints: number } {
  let teamPoints = 0;
  let opponentPoints = 0;

  gameState.tricks.forEach((trick) => {
    const winnerPlayer = gameState.players.find(
      (p) => p.id === trick.winningPlayerId,
    );
    if (winnerPlayer) {
      if (winnerPlayer.team === team) {
        teamPoints += trick.points;
      } else {
        opponentPoints += trick.points;
      }
    }
  });

  return { teamPoints, opponentPoints };
}

function calculatePointCardDensity(gameState: GameState): number {
  const allRemainingCards = gameState.players.flatMap((p) => p.hand);
  const pointCards = allRemainingCards.filter((card) => isPointCard(card));
  return allRemainingCards.length > 0
    ? pointCards.length / allRemainingCards.length
    : 0;
}

function determinePointCardStrategy(
  teamPoints: number,
  opponentPoints: number,
  gamePhase: GamePhaseStrategy,
  isAttackingTeam: boolean,
): PointCardStrategy {
  if (isAttackingTeam) {
    // Attacking team needs points
    if (teamPoints < 40) return PointCardStrategy.Aggressive;
    if (teamPoints >= 80) return PointCardStrategy.Conservative;
    return gamePhase === GamePhaseStrategy.EarlyGame
      ? PointCardStrategy.Escape
      : PointCardStrategy.Aggressive;
  } else {
    // Defending team wants to prevent points
    if (opponentPoints >= 60) return PointCardStrategy.Block;
    return gamePhase === GamePhaseStrategy.EarlyGame
      ? PointCardStrategy.Escape
      : PointCardStrategy.Conservative;
  }
}

function determineTrumpTiming(
  gamePhase: GamePhaseStrategy,
  teamPoints: number,
  opponentPoints: number,
  pointCardDensity: number,
  baseContext: GameContext,
): TrumpTiming {
  if (baseContext.pointPressure === PointPressure.HIGH) {
    return TrumpTiming.Emergency;
  }

  if (gamePhase === GamePhaseStrategy.EarlyGame) {
    return pointCardDensity > 0.3 ? TrumpTiming.Flush : TrumpTiming.Preserve;
  }

  if (gamePhase === GamePhaseStrategy.LateGame) {
    return TrumpTiming.Control;
  }

  // Mid-game strategy
  const pointGap = Math.abs(teamPoints - opponentPoints);
  return pointGap > 20 ? TrumpTiming.Control : TrumpTiming.Preserve;
}

function checkPartnerPointEscape(
  gameState: GameState,
  player: Player,
): boolean {
  const partner = gameState.players.find(
    (p) => p.team === player.team && p.id !== player.id,
  );
  if (!partner) return false;

  const partnerPointCards = partner.hand.filter((card) => isPointCard(card));
  return partnerPointCards.length >= 3; // Partner has many point cards
}

function checkCanWinWithoutPoints(
  teamPoints: number,
  opponentPoints: number,
  isAttackingTeam: boolean,
): boolean {
  if (isAttackingTeam) {
    return teamPoints >= 80; // Already have enough points
  } else {
    return opponentPoints < 80 && teamPoints + opponentPoints < 120; // Can prevent opponent from getting 80
  }
}

function estimateTricksRemaining(gameState: GameState): number {
  const averageHandSize =
    gameState.players.reduce((sum, player) => sum + player.hand.length, 0) /
    gameState.players.length;
  return Math.ceil(averageHandSize);
}

function shouldPreserveTrumpType(
  trumpType: "big_joker" | "small_joker" | "trump_rank",
  conservationLevel: "high" | "medium" | "low",
  tricksRemaining: number,
  pointContext: PointFocusedContext,
): boolean {
  if (pointContext.trumpTiming === TrumpTiming.Emergency) return false;
  if (conservationLevel === "low") return false;

  const minTricks =
    trumpType === "big_joker" ? 6 : trumpType === "small_joker" ? 4 : 3;
  return tricksRemaining >= minTricks;
}

function determineTrumpFollowingPriority(
  pointContext: PointFocusedContext,
): "minimal" | "moderate" | "aggressive" {
  switch (pointContext.trumpTiming) {
    case TrumpTiming.Emergency:
      return "aggressive";
    case TrumpTiming.Control:
      return "moderate";
    case TrumpTiming.Flush:
      return "moderate";
    case TrumpTiming.Preserve:
      return "minimal";
    default:
      return "moderate";
  }
}
