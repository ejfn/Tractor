import { calculateCardStrategicValue, isTrump } from "../game/cardValue";
import {
  Card,
  CardMemory,
  Combo,
  ComboAnalysis,
  ComboStrength,
  GameContext,
  GameState,
  JokerType,
  PlayerId,
  PlayStyle,
  PointPressure,
  PositionStrategy,
  Rank,
  Suit,
  TrickPosition,
  TrickWinnerAnalysis,
  TrumpInfo,
} from "../types";
import { gameLogger } from "../utils/gameLogger";
import {
  analyzeTrumpDistribution,
  createCardMemory,
  enhanceGameContextWithMemory,
} from "./aiCardMemory";
import { isTeammate } from "./utils/aiHelpers";

/**
 * Analyzes the current game state to provide strategic context for AI decision making
 */

export function createGameContext(
  gameState: GameState,
  playerId: PlayerId,
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
  const pointPressure = calculatePointPressure(
    currentPoints,
    pointsNeeded,
    isAttackingTeam,
  );
  const playStyle = determinePlayStyle(
    isAttackingTeam,
    pointPressure,
    cardsRemaining,
  );

  // Phase 3: Enhanced context with memory-based intelligence
  const baseContext: GameContext = {
    isAttackingTeam,
    currentPoints,
    pointsNeeded,
    cardsRemaining,
    trickPosition,
    pointPressure,
    playStyle,
    currentPlayer: playerId,
    trickWinnerAnalysis,
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
  playerId: PlayerId,
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
  const isLeadWinning = currentWinner === currentTrick.plays[0]?.playerId;
  const isTeammateWinning = isTeammate(gameState, playerId, currentWinner);
  const isOpponentWinning = !isTeammateWinning;
  const trickPoints = currentTrick.points;

  // Determine trump situation
  const leadingCards = currentTrick.plays[0]?.cards || [];
  const winningCards =
    currentTrick.plays.find((play) => play.playerId === currentWinner)?.cards ||
    leadingCards;

  const isTrumpLead = leadingCards.some((card) =>
    isTrump(card, gameState.trumpInfo),
  );
  const isCurrentlyTrumped =
    !isTrumpLead &&
    winningCards.some((card) => isTrump(card, gameState.trumpInfo));

  return {
    currentWinner,
    isTeammateWinning,
    isOpponentWinning,
    isLeadWinning,
    isTrumpLead,
    isCurrentlyTrumped,
    trickPoints,
  };
}

/**
 * Determines if a player is on the attacking team
 * Team A (Human + Bot2) vs Team B (Bot1 + Bot3)
 * The attacking team is determined by which team is NOT defending in the current round
 */
export function isPlayerOnAttackingTeam(
  gameState: GameState,
  playerId: PlayerId,
): boolean {
  // Find the player's team
  const player = gameState.players.find((p) => p.id === playerId);
  if (!player) {
    throw new Error(`Player ${playerId} not found in game state`);
  }

  // Find the team data for this player
  const playerTeam = gameState.teams.find((team) => team.id === player.team);
  if (!playerTeam) {
    throw new Error(`Team ${player.team} not found for player ${playerId}`);
  }

  // Attacking team is the team that is NOT defending
  return !playerTeam.isDefending;
}

/**
 * Calculates total points collected by the attacking team so far
 */
export function getCurrentAttackingPoints(gameState: GameState): number {
  // Find the attacking team (the team that is NOT defending)
  const attackingTeam = gameState.teams.find((team) => !team.isDefending);

  if (!attackingTeam) {
    throw new Error("No attacking team found in game state");
  }

  // Return the current points accumulated by the attacking team
  // This includes points from all completed tricks won by the attacking team
  return attackingTeam.points;
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
  playerId: PlayerId,
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
 * Calculates point pressure based on attacking team's progress and player's team affiliation
 *
 * Point pressure is team-specific:
 * - Attacking team: Low points = HIGH pressure (need to catch up)
 * - Defending team: Low attacking points = LOW pressure (they're winning)
 */
export function calculatePointPressure(
  currentPoints: number,
  pointsNeeded: number,
  isAttackingTeam: boolean,
): PointPressure {
  const progressRatio = currentPoints / pointsNeeded;

  if (isAttackingTeam) {
    // Attacking team: pressure increases as they fall behind
    if (progressRatio < 0.3) {
      return PointPressure.HIGH; // < 24 points - need to catch up urgently
    } else if (progressRatio < 0.7) {
      return PointPressure.MEDIUM; // 24-56 points - moderate pressure
    } else {
      return PointPressure.LOW; // 56+ points - on track or ahead
    }
  } else {
    // Defending team: pressure increases as attacking team catches up
    if (progressRatio < 0.3) {
      return PointPressure.LOW; // < 24 points - defending successfully
    } else if (progressRatio < 0.7) {
      return PointPressure.MEDIUM; // 24-56 points - need to tighten defense
    } else {
      return PointPressure.HIGH; // 56+ points - attacking team close to winning
    }
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
 * @internal This function serves as a fallback for calculateMemoryEnhancedTrumpConservationValue()
 * when memory context is unavailable. It provides the base calculation that memory-enhanced analysis builds upon.
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
    const cardValue = calculateCardStrategicValue(card, trumpInfo, "basic");
    totalValue += cardValue;
  }

  return totalValue;
}

/**
 * Phase 3: Memory-Enhanced Trump Conservation Value
 *
 * Calculates dynamic trump conservation values based on memory analysis of trump exhaustion.
 * Higher exhaustion in opponents makes our trump more valuable to conserve.
 */
export function calculateMemoryEnhancedTrumpConservationValue(
  cards: Card[],
  trumpInfo: TrumpInfo,
  cardMemory?: CardMemory,
): number {
  // Start with base conservation value
  const baseValue = calculateTrumpConservationValue(cards, trumpInfo);

  // If no memory context available, use base calculation
  if (!cardMemory) {
    return baseValue;
  }

  // Use imported trump exhaustion analysis functions

  try {
    // Analyze current trump distribution
    const trumpAnalysis = analyzeTrumpDistribution(cardMemory, trumpInfo);

    // Calculate memory-based enhancement multiplier
    let memoryMultiplier = 1.0;

    // Factor 1: Global trump exhaustion - more exhaustion globally makes trump more valuable
    const globalExhaustion = trumpAnalysis.globalTrumpExhaustion;
    if (globalExhaustion > 0.6) {
      memoryMultiplier += 0.5; // +50% value when globally trump-depleted
    } else if (globalExhaustion > 0.4) {
      memoryMultiplier += 0.3; // +30% value when moderately trump-depleted
    } else if (globalExhaustion > 0.2) {
      memoryMultiplier += 0.1; // +10% value when some trump-depletion
    }

    // Factor 2: Opponent void status - trump becomes critical when opponents are void
    const voidPlayerCount = trumpAnalysis.voidPlayers.length;
    if (voidPlayerCount >= 2) {
      memoryMultiplier += 0.4; // +40% when multiple opponents void
    } else if (voidPlayerCount >= 1) {
      memoryMultiplier += 0.2; // +20% when one opponent void
    }

    // Factor 3: Trump advantage/disadvantage relative to opponents
    // This is calculated per player in calculateTrumpDeploymentTiming, but we can estimate
    const averageOpponentExhaustion =
      Object.entries(trumpAnalysis.playerExhaustion)
        .map(([, exhaustion]) => exhaustion)
        .reduce((sum, exhaustion) => sum + exhaustion, 0) / 4; // All players average

    if (averageOpponentExhaustion > 0.7) {
      memoryMultiplier += 0.3; // +30% when opponents are heavily depleted
    } else if (averageOpponentExhaustion > 0.5) {
      memoryMultiplier += 0.15; // +15% when opponents are moderately depleted
    }

    // Cap the multiplier to prevent extreme values
    memoryMultiplier = Math.min(memoryMultiplier, 2.5); // Max 2.5x base value

    return Math.round(baseValue * memoryMultiplier);
  } catch (error) {
    // Fallback to base calculation if memory analysis fails
    gameLogger.warn(
      "memory_enhanced_trump_conservation_failed",
      {
        error: error instanceof Error ? error.message : String(error),
        baseValue,
      },
      "Memory-enhanced trump conservation failed, using base calculation",
    );
    return baseValue;
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
  // For trump cards, ignore base combo.value and use proper trump hierarchy
  let conservationValue: number;

  if (isTrumpCombo) {
    // Use memory-enhanced trump hierarchy value when available
    if (context.memoryContext?.cardMemory) {
      conservationValue = calculateMemoryEnhancedTrumpConservationValue(
        combo.cards,
        trumpInfo,
        context.memoryContext.cardMemory,
      );
    } else {
      // Fallback to standard trump hierarchy value
      conservationValue = calculateTrumpConservationValue(
        combo.cards,
        trumpInfo,
      );
    }
  } else {
    // For non-trump cards, use base combo.value
    conservationValue = combo.value;
  }

  // Add point value for any point cards
  if (hasPoints) conservationValue += pointValue;
  if (context.cardsRemaining <= 5) conservationValue *= 1.5; // More valuable in endgame

  // Incorporate pair breaking penalty into conservation value
  const isBreakingPair = combo.isBreakingPair ?? false;
  if (isBreakingPair) {
    // Add penalty for breaking pairs - makes this combo less desirable for disposal
    conservationValue += 50; // Penalty makes pair-breaking combos rank higher (less likely to be chosen for disposal)
  }

  return {
    strength,
    isTrump: isTrumpCombo,
    hasPoints,
    pointValue,
    disruptionPotential,
    conservationValue,
    isBreakingPair,
    canBeat: false, // This will be updated by the play validation logic
    relativeStrength: 0, // This will be updated by the play validation logic
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

/**
 * Generate remaining unseen cards for a specific suit or trump group
 *
 * @param suit - The suit to analyze (or Suit.None for all trump cards)
 * @param context - Game context containing all necessary state and memory
 * @param gameState - Current game state
 * @returns Array of unseen cards in the specified suit/trump group
 */
export function getRemainingUnseenCards(
  suit: Suit,
  context: GameContext,
  gameState: GameState,
): Card[] {
  const currentPlayerId = context.currentPlayer;
  const trumpInfo = context.trumpInfo || gameState.trumpInfo;

  if (!trumpInfo) return [];

  const cardMemory =
    context.memoryContext?.cardMemory || createCardMemory(gameState);
  const currentPlayer = gameState.players.find((p) => p.id === currentPlayerId);
  if (!currentPlayer) return [];

  // Generate all cards for the suit/trump group (from 2 decks)
  const allCardsInGroup = generateAllCardsForSuitOrTrump(suit, trumpInfo);

  // Helper to check if card belongs to the target suit/trump group
  const belongsToGroup = (card: Card): boolean =>
    suit === Suit.None
      ? isTrump(card, trumpInfo)
      : !isTrump(card, trumpInfo) && card.suit === suit;

  // Get all seen cards
  const seenCards = new Set<string>();

  // 1. All played cards from memory
  cardMemory.playedCards.forEach((card) => {
    if (belongsToGroup(card)) {
      seenCards.add(card.commonId);
    }
  });

  // 2. Current trick cards (if not already in played cards)
  const currentTrick = gameState.currentTrick;
  if (currentTrick) {
    currentTrick.plays.forEach((play) => {
      play.cards.forEach((card) => {
        if (belongsToGroup(card)) {
          seenCards.add(card.commonId);
        }
      });
    });
  }

  // 3. Current player's hand
  currentPlayer.hand.forEach((card) => {
    if (belongsToGroup(card)) {
      seenCards.add(card.commonId);
    }
  });

  // 4. Kitty cards (if current player is round starter and kitty is visible)
  const isRoundStarter =
    gameState.currentPlayerIndex === gameState.roundStartingPlayerIndex;
  if (isRoundStarter && gameState.kittyCards) {
    gameState.kittyCards.forEach((card) => {
      if (belongsToGroup(card)) {
        seenCards.add(card.commonId);
      }
    });
  }

  // Filter out seen cards
  return allCardsInGroup.filter((card) => !seenCards.has(card.commonId));
}

/**
 * Helper: Generate all cards for a suit or trump group (2 decks)
 */
function generateAllCardsForSuitOrTrump(
  suit: Suit,
  trumpInfo: TrumpInfo,
): Card[] {
  const allCards: Card[] = [];

  if (suit === Suit.None) {
    // Trump group: all trump cards
    // Add jokers (4 total: 2 big, 2 small)
    allCards.push(Card.createJoker(JokerType.Big, 0));
    allCards.push(Card.createJoker(JokerType.Big, 1));
    allCards.push(Card.createJoker(JokerType.Small, 0));
    allCards.push(Card.createJoker(JokerType.Small, 1));

    // Add trump rank cards from all suits (8 total: 2 per suit)
    [Suit.Spades, Suit.Hearts, Suit.Diamonds, Suit.Clubs].forEach((s) => {
      allCards.push(Card.createCard(s, trumpInfo.trumpRank, 0));
      allCards.push(Card.createCard(s, trumpInfo.trumpRank, 1));
    });

    // Add trump suit cards (excluding trump rank, 24 total: 2 per rank)
    if (trumpInfo.trumpSuit) {
      Object.values(Rank).forEach((rank) => {
        if (
          rank !== Rank.None &&
          rank !== trumpInfo.trumpRank &&
          trumpInfo.trumpSuit
        ) {
          allCards.push(Card.createCard(trumpInfo.trumpSuit, rank, 0));
          allCards.push(Card.createCard(trumpInfo.trumpSuit, rank, 1));
        }
      });
    }
  } else {
    // Specific non-trump suit (excluding trump rank cards, 24 total: 2 per rank)
    Object.values(Rank).forEach((rank) => {
      if (rank !== Rank.None && rank !== trumpInfo.trumpRank) {
        allCards.push(Card.createCard(suit, rank, 0));
        allCards.push(Card.createCard(suit, rank, 1));
      }
    });
  }

  return allCards;
}
