import {
  GameState,
  GameContext,
  TrickPosition,
  PointPressure,
  PlayerId,
  PlayStyle,
  ComboStrength,
  ComboAnalysis,
  PositionStrategy,
  Combo,
  Card,
  TrumpInfo,
  TrickWinnerAnalysis,
  Rank,
  Trick,
} from "../types";
import { isTrump, calculateCardStrategicValue } from "../game/gameHelpers";
import { compareCards } from "../game/cardComparison";
import { createCardMemory, enhanceGameContextWithMemory } from "./aiCardMemory";

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

  // NEW: Analyze current trick winner for enhanced strategy (only if trick exists)
  const trickWinnerAnalysis = gameState.currentTrick
    ? analyzeTrickWinner(gameState, playerId)
    : undefined;
  const trickPosition = getTrickPosition(gameState, playerId);
  const pointPressure = calculatePointPressure(currentPoints, pointsNeeded);
  const playStyle = determinePlayStyle(
    isAttackingTeam,
    pointPressure,
    cardsRemaining,
  );

  // Phase 3: Enhanced context with memory-based intelligence
  const baseContext = {
    isAttackingTeam,
    currentPoints,
    pointsNeeded,
    cardsRemaining,
    trickPosition,
    pointPressure,
    playStyle,
    ...(trickWinnerAnalysis && { trickWinnerAnalysis }),
  };

  // Integrate card memory for enhanced strategic intelligence
  return enhanceGameContextWithMemory(
    baseContext,
    createCardMemory(gameState),
    gameState,
  );
}

/**
 * NEW: Analyzes the current trick winner for enhanced AI strategy
 * This leverages the new real-time winningPlayerId tracking
 */
export function analyzeTrickWinner(
  gameState: GameState,
  playerId: string,
): TrickWinnerAnalysis {
  const currentTrick = gameState.currentTrick;

  // This function should only be called when there's an active trick
  if (!currentTrick) {
    throw new Error("analyzeTrickWinner called with no active trick");
  }

  const currentWinner =
    currentTrick.winningPlayerId || currentTrick.plays[0]?.playerId;
  const currentPlayer = gameState.players.find((p) => p.id === playerId);
  if (!currentPlayer) {
    throw new Error(`Player ${playerId} not found`);
  }

  // Determine team relationships
  const isSelfWinning = currentWinner === playerId;
  const isTeammateWinning =
    !isSelfWinning && isTeammate(gameState, playerId, currentWinner);
  const isOpponentWinning = !isSelfWinning && !isTeammateWinning;
  const trickPoints = currentTrick.points;

  // Determine if AI can beat current winner (simplified analysis)
  const canBeatCurrentWinner = canPlayerBeatCurrentWinner(
    gameState,
    playerId,
    currentTrick,
  );

  // Strategic decision: should try to beat current winner?
  const shouldTryToBeat = determineIfShouldTryToBeat(
    isTeammateWinning,
    isOpponentWinning,
    trickPoints,
    canBeatCurrentWinner,
    gameState,
    playerId,
  );

  // Strategic decision: should play conservatively?
  const shouldPlayConservatively = determineIfShouldPlayConservatively(
    isTeammateWinning,
    trickPoints,
    gameState,
    playerId,
  );

  return {
    currentWinner,
    isTeammateWinning,
    isOpponentWinning,
    isSelfWinning,
    trickPoints,
    canBeatCurrentWinner,
    shouldTryToBeat,
    shouldPlayConservatively,
  };
}

/**
 * Helper function to determine if two players are teammates
 */
function isTeammate(
  gameState: GameState,
  playerId1: string,
  playerId2: string,
): boolean {
  const player1 = gameState.players.find((p) => p.id === playerId1);
  const player2 = gameState.players.find((p) => p.id === playerId2);
  return player1?.team === player2?.team;
}

/**
 * Determines if the current player can beat the current trick winner
 * (Simplified heuristic - checks if player has stronger cards)
 */
function canPlayerBeatCurrentWinner(
  gameState: GameState,
  playerId: string,
  currentTrick: Trick,
): boolean {
  // Simplified implementation - checks if player has trump cards when current winner is non-trump
  // or higher cards when current winner is same suit
  const player = gameState.players.find((p) => p.id === playerId);
  if (!player || !currentTrick) return false;

  // Get current winner's cards directly from the trick
  const winningPlayerId = currentTrick.winningPlayerId;
  const winningPlay = currentTrick.plays.find(
    (play) => play.playerId === winningPlayerId,
  );
  const currentWinnerCards =
    winningPlay?.cards || currentTrick.plays[0]?.cards || [];

  if (currentWinnerCards.length === 0) return false;

  // Get the suit to follow
  const leadingSuit = currentTrick.plays[0]?.cards[0]?.suit;
  if (!leadingSuit) return false;

  // Find cards that can follow the leading suit
  const followingCards = player.hand.filter(
    (card) => card.suit === leadingSuit,
  );

  // Simplified logic: if current winner played non-trump, check if we have trump or higher cards
  const currentWinnerHasTrump = currentWinnerCards.some((card) =>
    isTrump(card, gameState.trumpInfo),
  );

  if (!currentWinnerHasTrump) {
    // Current winner is non-trump, check if we have trump cards or higher same-suit cards
    const hasTrump = player.hand.some((card) =>
      isTrump(card, gameState.trumpInfo),
    );

    // Strategic heuristic: if we're out of leading suit and have trump, we might be able to beat it
    // (Game validation will ensure only legal trump plays are actually allowed)
    if (hasTrump && followingCards.length === 0) return true;

    // Check if we have higher same-suit cards
    const winnerCard = currentWinnerCards[0];
    const hasHigherCard = followingCards.some(
      (card) => compareCards(card, winnerCard, gameState.trumpInfo) > 0,
    );

    return hasHigherCard;
  }

  // Current winner has trump - check if we have higher trump
  const winnerCard = currentWinnerCards[0];
  const trumpCards = player.hand.filter((card) =>
    isTrump(card, gameState.trumpInfo),
  );
  const result = trumpCards.some(
    (card) => compareCards(card, winnerCard, gameState.trumpInfo) > 0,
  );

  return result;
}

/**
 * Determines if AI should try to beat the current winner
 */
function determineIfShouldTryToBeat(
  isTeammateWinning: boolean,
  isOpponentWinning: boolean,
  trickPoints: number,
  canBeatCurrentWinner: boolean,
  gameState: GameState,
  playerId: string,
): boolean {
  // Don't try to beat teammate
  if (isTeammateWinning) return false;

  // Try to beat opponent if we can and there are points worth taking
  if (isOpponentWinning && canBeatCurrentWinner && trickPoints >= 10) {
    return true;
  }

  // Try to beat opponent if we can and it's high-value scenario
  if (isOpponentWinning && canBeatCurrentWinner && trickPoints >= 5) {
    const isAttacking = isPlayerOnAttackingTeam(gameState, playerId);
    // Attacking team should be more aggressive about points
    return isAttacking;
  }

  return false;
}

/**
 * Determines if AI should play conservatively
 */
function determineIfShouldPlayConservatively(
  isTeammateWinning: boolean,
  trickPoints: number,
  gameState: GameState,
  playerId: string,
): boolean {
  // If teammate is winning, decide between conservative play vs point contribution
  if (isTeammateWinning) {
    const player = gameState.players.find((p) => p.id === playerId);
    if (!player) return true;

    const hasHighValuePointCards = player.hand.some(
      (card) =>
        (card.rank === Rank.Ten || card.rank === Rank.King) && card.points > 0,
    );

    const hasLowValueCards = player.hand.some((card) => card.points === 0);

    // Special case: Last player (4th position) should maximize point contribution
    const currentTrick = gameState.currentTrick;
    if (currentTrick && currentTrick.plays.length === 3) {
      // This is the 4th player (last to play) - plays[0]=leader, plays[1]=2nd, plays[2]=3rd, current=4th
      // Focus on optimal point contribution rather than conservation
      return false;
    }

    // For earlier positions: if we have both high and low value cards, be conservative
    if (hasHighValuePointCards && hasLowValueCards) {
      return true; // Play conservatively (save high-value cards)
    }

    // If we only have high-value cards, we must contribute them
    if (hasHighValuePointCards && !hasLowValueCards) {
      return false; // Must contribute high-value cards
    }

    // Default to conservative when teammate winning
    return true;
  }

  // Play conservatively if there are no significant points at stake
  if (trickPoints < 5) return true;

  // Play conservatively if we're defending and doing well
  const isAttacking = isPlayerOnAttackingTeam(gameState, playerId);
  if (!isAttacking) {
    const attackingPoints = getCurrentAttackingPoints(gameState);
    // If attacking team is struggling, be conservative as defender
    if (attackingPoints < 40) return true;
  }

  return false;
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

  if (!currentTrick) {
    // Player is leading
    return TrickPosition.First;
  }

  // Check if this player has already played in the trick
  const playerPlayIndex = currentTrick.plays.findIndex(
    (play) => play.playerId === playerId,
  );

  if (playerPlayIndex !== -1) {
    // Player has already played, return their actual position
    switch (playerPlayIndex) {
      case 0:
        return TrickPosition.First; // Leader
      case 1:
        return TrickPosition.Second;
      case 2:
        return TrickPosition.Third;
      case 3:
        return TrickPosition.Fourth;
      default:
        return TrickPosition.First; // Fallback
    }
  }

  // Player hasn't played yet, determine their upcoming position
  switch (currentTrick.plays.length) {
    case 0:
      return TrickPosition.First; // First player (leader)
    case 1:
      return TrickPosition.Second; // Second player (first follower)
    case 2:
      return TrickPosition.Third; // Third player (second follower)
    case 3:
      return TrickPosition.Fourth; // Fourth player (third follower)
    default:
      return TrickPosition.First; // Fallback
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
 * Calculate trump conservation value based on trump hierarchy
 *
 * Trump Hierarchy (highest to lowest):
 * 1. Big Joker (100)
 * 2. Small Joker (90)
 * 3. Trump rank in trump suit (80)
 * 4. Trump rank in off-suits (70)
 * 5. Trump suit: A(60), K(55), Q(50), J(45), 10(40), 9(35), 8(30), 7(25), 6(20), 5(15), 4(10), 3(5)
 */
function calculateTrumpConservationValue(
  cards: Card[],
  trumpInfo: TrumpInfo,
): number {
  let totalValue = 0;

  for (const card of cards) {
    const cardValue = calculateCardStrategicValue(
      card,
      trumpInfo,
      "conservation",
    );
    totalValue += cardValue;
  }

  return totalValue;
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
  // For trump cards, ignore base combo.value and use proper trump hierarchy
  let conservationValue: number;

  if (isTrumpCombo) {
    // Use proper trump hierarchy value - ignore misleading base combo.value
    conservationValue = calculateTrumpConservationValue(combo.cards, trumpInfo);
  } else {
    // For non-trump cards, use base combo.value
    conservationValue = combo.value;
  }

  // Add point value for any point cards
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
 * Gets position-based strategy matrix
 */
export function getPositionStrategy(
  position: TrickPosition,
  playStyle: PlayStyle,
): PositionStrategy {
  const baseStrategies: Record<TrickPosition, PositionStrategy> = {
    [TrickPosition.First]: {
      informationGathering: 0.9, // Enhanced - sophisticated probe strategy with game phase adaptation
      riskTaking: 0.6, // Enhanced - strategic risk based on phase (probe/aggressive/control/endgame)
      partnerCoordination: 0.3, // Enhanced - strategic setup for teammate positions
      disruptionFocus: 0.8, // Enhanced - comprehensive opponent probing and information gathering
    },
    [TrickPosition.Second]: {
      informationGathering: 0.7, // Enhanced - leverages leader analysis for strategic decisions
      riskTaking: 0.6, // Enhanced - leader relationship-based risk assessment
      partnerCoordination: 0.6, // Enhanced - strategic response based on leader (teammate vs opponent)
      disruptionFocus: 0.7, // Enhanced - blocking potential and setup opportunities
    },
    [TrickPosition.Third]: {
      informationGathering: 0.2, // Enhanced - has sufficient info from first two players for tactical decisions
      riskTaking: 0.8, // Enhanced - can make informed tactical decisions including takeovers
      partnerCoordination: 0.9, // Enhanced - critical position for teammate optimization and takeover analysis
      disruptionFocus: 0.6, // Enhanced - tactical opportunities for both teammate support and opponent disruption
    },
    [TrickPosition.Fourth]: {
      informationGathering: 1.0, // Perfect information available
      riskTaking: 0.9, // High - can make optimal decisions
      partnerCoordination: 1.0, // Can optimize teammate support
      disruptionFocus: 0.8, // High - perfect counter opportunities
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

  // Add points from leading combo (plays[0])
  const leadingPoints =
    currentTrick.plays[0]?.cards?.reduce((sum, card) => sum + card.points, 0) ||
    0;

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

// Note: analyzeTeammateLeadSecurity functionality has been consolidated into
// ThirdPlayerAnalysis in aiStrategy.ts to reduce redundancy

// Note: assessFourthPlayerThreat functionality has been consolidated into
// ThirdPlayerAnalysis in aiStrategy.ts to reduce redundancy

// Note: calculateCurrentTrickPoints functionality has been consolidated into
// ThirdPlayerAnalysis in aiStrategy.ts to reduce redundancy

// Note: calculatePotentialAdditionalPoints functionality has been consolidated into
// ThirdPlayerAnalysis in aiStrategy.ts to reduce redundancy

// Note: calculateSupportValue functionality has been consolidated into
// ThirdPlayerAnalysis in aiStrategy.ts to reduce redundancy

// Note: shouldRecommendTakeover functionality has been consolidated into
// ThirdPlayerAnalysis in aiStrategy.ts to reduce redundancy
