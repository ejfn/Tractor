import {
  Card,
  Combo,
  TrumpInfo,
  GameState,
  ComboType,
  JokerType,
  GameContext,
  PointPressure,
  PointFocusedContext,
  TrumpConservationStrategy,
  GamePhaseStrategy,
  PointCardStrategy,
  TrumpTiming,
} from "../types";
import { isTrump, compareCards, isPointCard } from "../game/gameLogic";

/**
 * Enhanced Point-Focused AI Strategy Implementation
 * Addresses issue #61 with sophisticated point card collection and trump management
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
  const nonTrumpCombos = validCombos.filter(
    (combo) => !combo.cards.some((card) => isTrump(card, trumpInfo)),
  );

  if (nonTrumpCombos.length === 0) {
    return null; // No non-trump options available
  }

  // Prioritize high cards in different suits to probe opponent hands
  const sortedBySuitAndStrength = nonTrumpCombos.sort((a, b) => {
    const aHighCard = getHighestCard(a.cards, trumpInfo);
    const bHighCard = getHighestCard(b.cards, trumpInfo);
    return compareCards(bHighCard, aHighCard, trumpInfo);
  });

  // Prefer pairs and tractors over singles when leading high
  const tractorCombos = sortedBySuitAndStrength.filter(
    (combo) => combo.type === ComboType.Tractor,
  );
  const pairCombos = sortedBySuitAndStrength.filter(
    (combo) => combo.type === ComboType.Pair,
  );
  const singleCombos = sortedBySuitAndStrength.filter(
    (combo) => combo.type === ComboType.Single,
  );

  // Return the highest strength combination, preferring tractors > pairs > singles
  if (tractorCombos.length > 0) return tractorCombos[0];
  if (pairCombos.length > 0) return pairCombos[0];
  return singleCombos[0];
}

/**
 * Enhanced partner coordination for point card following
 */
export function selectPartnerCoordinatedPlay(
  validCombos: Combo[],
  trumpInfo: TrumpInfo,
  pointContext: PointFocusedContext,
  gameState: GameState,
  leadingCombo: Card[],
): Combo | null {
  const currentTrick = gameState.currentTrick;
  if (!currentTrick) return null;

  // Check if partner is leading and likely to win
  const partnerTeam = getPartnerTeam(gameState, getCurrentPlayerId(gameState));
  const isPartnerLeading =
    partnerTeam && currentTrick.leadingPlayerId === partnerTeam.id;
  const isPartnerLikelyWinning = isPartnerLeading; // Simplified for now

  if (!isPartnerLikelyWinning) {
    return null; // Use regular strategy
  }

  // Partner is winning, so help them by following with point cards
  const pointCardCombos = validCombos.filter((combo) =>
    combo.cards.some((card) => isPointCard(card)),
  );

  if (pointCardCombos.length === 0) {
    return null; // No point cards to contribute
  }

  // Sort point card combos by point value (highest first)
  const sortedByPoints = pointCardCombos.sort((a, b) => {
    const aPoints = calculateComboPoints(a.cards);
    const bPoints = calculateComboPoints(b.cards);
    return bPoints - aPoints;
  });

  // Follow with the highest point value combo that matches the lead
  const matchingType = getComboType(leadingCombo);
  const matchingCombos = sortedByPoints.filter(
    (combo) => combo.type === matchingType,
  );

  return matchingCombos.length > 0 ? matchingCombos[0] : sortedByPoints[0];
}

/**
 * Intelligent trump following to avoid waste
 */
export function selectIntelligentTrumpFollow(
  validCombos: Combo[],
  trumpInfo: TrumpInfo,
  conservationStrategy: TrumpConservationStrategy,
  pointContext: PointFocusedContext,
  leadingCombo: Card[],
): Combo | null {
  // Only apply when following trump leads
  const isLeadingTrump = leadingCombo.some((card) => isTrump(card, trumpInfo));
  if (!isLeadingTrump) return null;

  const trumpCombos = validCombos.filter((combo) =>
    combo.cards.some((card) => isTrump(card, trumpInfo)),
  );

  if (trumpCombos.length === 0) return null;

  // Filter out trump cards we want to preserve
  const filteredTrumpCombos = trumpCombos.filter(
    (combo) =>
      !shouldPreserveCombo(
        combo,
        conservationStrategy,
        pointContext,
        trumpInfo,
      ),
  );

  if (filteredTrumpCombos.length === 0) {
    // If we must play trump and all are preservation-worthy,
    // play the lowest value trump
    return getLowestTrumpCombo(trumpCombos, trumpInfo);
  }

  // Play the lowest appropriate trump
  return getLowestTrumpCombo(filteredTrumpCombos, trumpInfo);
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

function checkPartnerPointEscape(gameState: GameState, player: any): boolean {
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

function getHighestCard(cards: Card[], trumpInfo: TrumpInfo): Card {
  return cards.reduce((highest, card) =>
    compareCards(card, highest, trumpInfo) > 0 ? card : highest,
  );
}

function getComboType(cards: Card[]): ComboType {
  if (cards.length === 1) return ComboType.Single;
  if (cards.length === 2) return ComboType.Pair;
  return ComboType.Tractor;
}

function calculateComboPoints(cards: Card[]): number {
  return cards.reduce((sum, card) => sum + card.points, 0);
}

function getPartnerTeam(gameState: GameState, playerId: string): any {
  const player = gameState.players.find((p) => p.id === playerId);
  if (!player) return null;

  return gameState.players.find(
    (p) => p.team === player.team && p.id !== player.id,
  );
}

function getCurrentPlayerId(gameState: GameState): string {
  return gameState.players[gameState.currentPlayerIndex].id;
}

function shouldPreserveCombo(
  combo: Combo,
  conservationStrategy: TrumpConservationStrategy,
  pointContext: PointFocusedContext,
  trumpInfo: TrumpInfo,
): boolean {
  if (pointContext.trumpTiming === TrumpTiming.Emergency) return false;

  const hasBigJoker = combo.cards.some((card) => card.joker === JokerType.Big);
  const hasSmallJoker = combo.cards.some(
    (card) => card.joker === JokerType.Small,
  );
  const hasTrumpRank = combo.cards.some(
    (card) => card.rank === trumpInfo.trumpRank,
  );

  return (
    (hasBigJoker && conservationStrategy.preserveBigJokers) ||
    (hasSmallJoker && conservationStrategy.preserveSmallJokers) ||
    (hasTrumpRank && conservationStrategy.preserveTrumpRanks)
  );
}

function getLowestTrumpCombo(combos: Combo[], trumpInfo: TrumpInfo): Combo {
  return combos.reduce((lowest, combo) => {
    const lowestCard = getHighestCard(lowest.cards, trumpInfo);
    const comboCard = getHighestCard(combo.cards, trumpInfo);
    return compareCards(lowestCard, comboCard, trumpInfo) < 0 ? lowest : combo;
  });
}
