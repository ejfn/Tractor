import {
  GameState,
  GameContext,
  TrickPosition,
  PointPressure,
  PlayerId,
  PlayStyle,
  ComboStrength,
  ComboAnalysis,
  TrickAnalysis,
  PositionStrategy,
  Combo,
  Card,
  TrumpInfo,
} from "../types/game";
import { isTrump, compareCards } from "./gameLogic";

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
  const playStyle = determinePlayStyle(
    isAttackingTeam,
    pointPressure,
    cardsRemaining,
  );

  return {
    isAttackingTeam,
    currentPoints,
    pointsNeeded,
    cardsRemaining,
    trickPosition,
    pointPressure,
    playStyle,
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
 * Determines the optimal play style based on game context
 */
export function determinePlayStyle(
  isAttackingTeam: boolean,
  pointPressure: PointPressure,
  cardsRemaining: number,
): PlayStyle {
  // End-game urgency
  if (cardsRemaining <= 3) {
    return pointPressure === PointPressure.HIGH
      ? PlayStyle.Desperate
      : PlayStyle.Aggressive;
  }

  // Team role and pressure-based strategy
  if (isAttackingTeam) {
    switch (pointPressure) {
      case PointPressure.HIGH:
        return PlayStyle.Desperate; // Need points urgently
      case PointPressure.MEDIUM:
        return PlayStyle.Aggressive; // Push for points
      case PointPressure.LOW:
      default:
        return PlayStyle.Balanced; // Build position
    }
  } else {
    // Defending team
    switch (pointPressure) {
      case PointPressure.HIGH:
        return PlayStyle.Desperate; // Block everything
      case PointPressure.MEDIUM:
        return PlayStyle.Aggressive; // Active defense
      case PointPressure.LOW:
      default:
        return PlayStyle.Conservative; // Patient defense
    }
  }
}

/**
 * Analyzes a combo's strategic value
 */
export function analyzeCombo(
  combo: Combo,
  trumpInfo: TrumpInfo,
  context: GameContext,
): ComboAnalysis {
  const isTrumpCombo = combo.cards.some((card) => isTrump(card, trumpInfo));
  const pointValue = combo.cards.reduce((sum, card) => sum + card.points, 0);
  const hasPoints = pointValue > 0;

  // Determine strength based on card values and trump status
  let strength: ComboStrength;
  if (isTrumpCombo && combo.value > 80) {
    strength = ComboStrength.Critical;
  } else if (combo.value > 60 || (isTrumpCombo && combo.value > 40)) {
    strength = ComboStrength.Strong;
  } else if (combo.value > 30) {
    strength = ComboStrength.Medium;
  } else {
    strength = ComboStrength.Weak;
  }

  // Calculate disruption potential (how much this can mess up opponents)
  let disruptionPotential = 0;
  if (isTrumpCombo) disruptionPotential += 30;
  if (combo.type === "Tractor") disruptionPotential += 20;
  if (combo.type === "Pair") disruptionPotential += 10;

  // Calculate conservation value (how valuable it is to keep)
  let conservationValue = combo.value;
  if (isTrumpCombo) conservationValue += 20;
  if (hasPoints) conservationValue += pointValue;
  if (context.cardsRemaining <= 5) conservationValue *= 1.5; // More valuable in endgame

  return {
    strength,
    isTrump: isTrumpCombo,
    hasPoints,
    pointValue,
    disruptionPotential,
    conservationValue,
  };
}

/**
 * Analyzes the current trick state for strategic decisions
 */
export function analyzeTrick(
  gameState: GameState,
  playerId: string,
  validCombos: Combo[],
): TrickAnalysis {
  const { currentTrick, players, trumpInfo } = gameState;

  if (!currentTrick) {
    return {
      currentWinner: null,
      winningCombo: null,
      totalPoints: 0,
      canWin: validCombos.length > 0,
      shouldContest: false,
      partnerStatus: "not_played",
    };
  }

  // Calculate total points in trick
  const totalPoints =
    currentTrick.plays.reduce(
      (sum, play) =>
        sum + play.cards.reduce((cardSum, card) => cardSum + card.points, 0),
      0,
    ) +
    (currentTrick.leadingCombo?.reduce((sum, card) => sum + card.points, 0) ||
      0);

  // Find current winner
  let currentWinner = currentTrick.leadingPlayerId;
  let winningCombo = currentTrick.leadingCombo || [];

  for (const play of currentTrick.plays) {
    if (isStrongerCombo(play.cards, winningCombo, trumpInfo)) {
      currentWinner = play.playerId;
      winningCombo = play.cards;
    }
  }

  // Check partner status
  const currentPlayerIndex = players.findIndex((p) => p.id === playerId);
  const partnerIndex = (currentPlayerIndex + 2) % 4;
  const partnerId = players[partnerIndex].id;

  let partnerStatus: "winning" | "losing" | "not_played" = "not_played";
  const partnerPlayed =
    currentTrick.plays.some((play) => play.playerId === partnerId) ||
    currentTrick.leadingPlayerId === partnerId;

  if (partnerPlayed) {
    partnerStatus = currentWinner === partnerId ? "winning" : "losing";
  }

  // Determine if this AI can win
  const canWin = validCombos.some((combo) =>
    isStrongerCombo(combo.cards, winningCombo, trumpInfo),
  );

  // Strategic decision on whether to contest
  const shouldContest = determineShouldContest(
    totalPoints,
    partnerStatus,
    canWin,
    gameState,
    playerId,
  );

  return {
    currentWinner,
    winningCombo,
    totalPoints,
    canWin,
    shouldContest,
    partnerStatus,
  };
}

/**
 * Gets position-based strategy matrix
 */
export function getPositionStrategy(
  position: TrickPosition,
  playStyle: PlayStyle,
): PositionStrategy {
  const baseStrategies: Record<TrickPosition, PositionStrategy> = {
    [TrickPosition.First]: {
      informationGathering: 0.8, // Leading - probe opponent hands
      riskTaking: 0.4, // Moderate risk when leading
      partnerCoordination: 0.2, // Partner hasn't played yet
      disruptionFocus: 0.6, // Can set the tone
    },
    [TrickPosition.Second]: {
      informationGathering: 0.6, // Some info from leader
      riskTaking: 0.5, // Balanced approach
      partnerCoordination: 0.4, // Partner might be 3rd or 4th
      disruptionFocus: 0.5, // Can still influence trick
    },
    [TrickPosition.Third]: {
      informationGathering: 0.4, // Good info from first two
      riskTaking: 0.6, // More info allows calculated risks
      partnerCoordination: 0.7, // Partner likely visible
      disruptionFocus: 0.4, // Limited disruption options
    },
    [TrickPosition.Fourth]: {
      informationGathering: 0.2, // Perfect information
      riskTaking: 0.8, // Can make optimal decisions
      partnerCoordination: 0.9, // Full partner visibility
      disruptionFocus: 0.3, // Just win or conserve
    },
  };

  const baseStrategy = baseStrategies[position];

  // Adjust based on play style
  const styleMultipliers: Record<
    PlayStyle,
    { risk: number; disruption: number; coordination: number }
  > = {
    [PlayStyle.Conservative]: { risk: 0.7, disruption: 0.8, coordination: 1.2 },
    [PlayStyle.Balanced]: { risk: 1.0, disruption: 1.0, coordination: 1.0 },
    [PlayStyle.Aggressive]: { risk: 1.4, disruption: 1.3, coordination: 0.9 },
    [PlayStyle.Desperate]: { risk: 1.8, disruption: 1.5, coordination: 0.7 },
  };

  const multiplier = styleMultipliers[playStyle];

  return {
    informationGathering: baseStrategy.informationGathering,
    riskTaking: Math.min(1.0, baseStrategy.riskTaking * multiplier.risk),
    partnerCoordination: Math.min(
      1.0,
      baseStrategy.partnerCoordination * multiplier.coordination,
    ),
    disruptionFocus: Math.min(
      1.0,
      baseStrategy.disruptionFocus * multiplier.disruption,
    ),
  };
}

// Helper functions

function isStrongerCombo(
  combo1: Card[],
  combo2: Card[],
  trumpInfo: TrumpInfo,
): boolean {
  if (combo1.length !== combo2.length) return false;

  const combo1HasTrump = combo1.some((card) => isTrump(card, trumpInfo));
  const combo2HasTrump = combo2.some((card) => isTrump(card, trumpInfo));

  if (combo1HasTrump && !combo2HasTrump) return true;
  if (!combo1HasTrump && combo2HasTrump) return false;

  // Compare highest cards
  const highest1 = combo1.reduce((highest, card) =>
    compareCards(highest, card, trumpInfo) > 0 ? highest : card,
  );
  const highest2 = combo2.reduce((highest, card) =>
    compareCards(highest, card, trumpInfo) > 0 ? highest : card,
  );

  return compareCards(highest1, highest2, trumpInfo) > 0;
}

function determineShouldContest(
  totalPoints: number,
  partnerStatus: "winning" | "losing" | "not_played",
  canWin: boolean,
  gameState: GameState,
  playerId: string,
): boolean {
  const context = createGameContext(gameState, playerId);

  // Don't contest if partner is winning
  if (partnerStatus === "winning") return false;

  // Can't contest if we can't win
  if (!canWin) return false;

  // Contest based on points and strategy
  switch (context.playStyle) {
    case PlayStyle.Desperate:
      return totalPoints >= 5; // Fight for any points
    case PlayStyle.Aggressive:
      return totalPoints >= 10;
    case PlayStyle.Balanced:
      return totalPoints >= 15;
    case PlayStyle.Conservative:
      return totalPoints >= 20; // Only big point tricks
    default:
      return totalPoints >= 15;
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
