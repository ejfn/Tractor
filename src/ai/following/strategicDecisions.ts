import { gameLogger } from "../../utils/gameLogger";
import { createCardMemory } from "../aiCardMemory";
import { analyzePointCardTiming } from "../analysis/pointCardTiming";
import {
  Card,
  CardMemory,
  GameContext,
  GameState,
  PlayerId,
  PointPressure,
  Rank,
  Suit,
  TrickWinnerAnalysis,
  TrumpInfo,
} from "../../types";
import { isTrump } from "../../game/cardValue";

/**
 * Strategic Decision: Memory-Enhanced Beat Current Winner Analysis
 *
 * This function determines if the AI should try to beat the current trick winner
 * using comprehensive memory system integration and sophisticated strategic analysis.
 *
 * Enhanced with:
 * - Memory-based guaranteed winner detection
 * - Trump exhaustion analysis
 * - Dynamic value assessment based on game state
 * - Position-specific strategic considerations
 * - Point pressure adaptation
 */
export function shouldAITryToBeatCurrentWinner(
  trickWinnerAnalysis: TrickWinnerAnalysis,
  gameState: GameState,
  playerId: PlayerId,
  gameContext?: GameContext,
): boolean {
  const {
    isTeammateWinning,
    isOpponentWinning,
    trickPoints,
    canBeatCurrentWinner,
  } = trickWinnerAnalysis;

  // Don't try to beat teammate
  if (isTeammateWinning) return false;

  // Can't beat current winner - no point trying
  if (!canBeatCurrentWinner) return false;

  try {
    // Create memory context if not provided
    const memory =
      gameContext?.memoryContext?.cardMemory || createCardMemory(gameState);

    // Use memory-enhanced strategic decision making
    return shouldTryToBeatWithMemoryAnalysis(
      trickWinnerAnalysis,
      gameState,
      playerId,
      memory,
      gameContext,
    );
  } catch (error) {
    gameLogger.warn(
      "memory_enhanced_beat_decision_failed",
      {
        playerId,
        error: error instanceof Error ? error.message : String(error),
        trickPoints,
        isOpponentWinning,
      },
      "Memory-enhanced beat decision failed, using fallback",
    );

    // Fallback to simplified logic
    return shouldTryToBeatFallback(trickWinnerAnalysis, gameState, playerId);
  }
}

/**
 * Memory-Enhanced Strategic Beat Decision
 *
 * Uses comprehensive memory analysis to make intelligent beating decisions:
 * - Guaranteed winner identification
 * - Trump exhaustion tracking
 * - Strategic value analysis
 * - Position-based considerations
 */
function shouldTryToBeatWithMemoryAnalysis(
  trickWinnerAnalysis: TrickWinnerAnalysis,
  gameState: GameState,
  playerId: PlayerId,
  memory: CardMemory,
  gameContext?: GameContext,
): boolean {
  const { isOpponentWinning, trickPoints } = trickWinnerAnalysis;
  const player = gameState.players.find((p) => p.id === playerId);

  if (!player || !isOpponentWinning) return false;

  // PRIORITY 1: Always beat for high-value guaranteed points
  if (trickPoints >= 15) {
    gameLogger.debug(
      "strategic_beat_decision",
      { playerId, reason: "high_value_points", trickPoints },
      "Beating opponent for high-value points",
    );
    return true;
  }

  // PRIORITY 2: Memory-enhanced guaranteed winner detection
  if (
    hasGuaranteedWinnersForPoints(
      player.hand,
      gameState.trumpInfo,
      memory,
      gameContext,
      gameState,
    )
  ) {
    gameLogger.debug(
      "strategic_beat_decision",
      {
        playerId,
        reason: "guaranteed_point_collection",
        trickPoints,
      },
      "Beating opponent - have guaranteed point winners available",
    );
    return true;
  }

  // PRIORITY 3: Trump advantage analysis
  if (
    shouldBeatBasedOnTrumpAdvantage(
      player.hand,
      gameState.trumpInfo,
      memory,
      trickPoints,
    )
  ) {
    gameLogger.debug(
      "strategic_beat_decision",
      {
        playerId,
        reason: "trump_advantage",
        trickPoints,
      },
      "Beating opponent - trump advantage detected",
    );
    return true;
  }

  // PRIORITY 4: Point pressure considerations
  const pointPressure = gameContext?.pointPressure || PointPressure.MEDIUM;
  if (shouldBeatBasedOnPressure(trickPoints, pointPressure, gameContext)) {
    gameLogger.debug(
      "strategic_beat_decision",
      {
        playerId,
        reason: "point_pressure",
        pointPressure,
        trickPoints,
      },
      "Beating opponent - point pressure requires action",
    );
    return true;
  }

  // PRIORITY 5: Position-specific strategic considerations
  const currentTrick = gameState.currentTrick;
  if (
    currentTrick &&
    shouldBeatBasedOnPosition(currentTrick.plays.length, trickPoints)
  ) {
    gameLogger.debug(
      "strategic_beat_decision",
      {
        playerId,
        reason: "position_strategy",
        position: currentTrick.plays.length,
        trickPoints,
      },
      "Beating opponent - position-specific strategy",
    );
    return true;
  }

  // PRIORITY 6: Anti-waste check - don't use trump when we have equal non-trump
  if (shouldAvoidWastefulTrumpUsage(gameState, playerId)) {
    gameLogger.debug(
      "strategic_beat_decision",
      {
        playerId,
        reason: "avoid_trump_waste",
        trickPoints,
      },
      "Not beating - would waste trump unnecessarily",
    );
    return false;
  }

  return false;
}

/**
 * Check if player has guaranteed winners that can collect points later
 */
function hasGuaranteedWinnersForPoints(
  hand: Card[],
  trumpInfo: TrumpInfo,
  memory: CardMemory,
  gameContext?: GameContext,
  gameState?: GameState,
): boolean {
  try {
    // Use the proper analysis function with gameState and context
    if (!gameContext || !gameState) return false;

    const pointAnalysis = analyzePointCardTiming(
      memory,
      gameState,
      gameContext,
      trumpInfo,
      gameContext.currentPlayer,
      [], // validCombos - simplified for this use case
    );

    // Check if we have immediate point opportunities
    return pointAnalysis.immediatePointOpportunities.some(
      (opportunity) =>
        opportunity.guaranteedPoints > 0 &&
        opportunity.combo.cards.some((card: Card) =>
          hand.some(
            (handCard) =>
              handCard.suit === card.suit && handCard.rank === card.rank,
          ),
        ),
    );
  } catch {
    return false;
  }
}

/**
 * Analyze trump advantage based on opponent exhaustion
 */
function shouldBeatBasedOnTrumpAdvantage(
  hand: Card[],
  trumpInfo: TrumpInfo,
  memory: CardMemory,
  trickPoints: number,
): boolean {
  // Only consider trump advantage for valuable tricks
  if (trickPoints < 5) return false;

  const trumpCards = hand.filter((card) => isTrump(card, trumpInfo));

  // Need trump cards to leverage trump advantage
  if (trumpCards.length === 0) return false;

  // Simple heuristic: if we have strong trump cards and many trump cards have been played
  const strongTrumpCards = trumpCards.filter((card) => {
    // Consider jokers and trump rank cards as strong
    if (card.joker) return true;
    if (card.rank === trumpInfo.trumpRank) return true;
    if (
      card.suit === trumpInfo.trumpSuit &&
      (card.rank === Rank.Ace || card.rank === Rank.King)
    )
      return true;
    return false;
  });

  // Use memory to check trump depletion
  const trumpCardsPlayed = memory.playedCards.filter((card) =>
    isTrump(card, trumpInfo),
  );
  const trumpDepletion = trumpCardsPlayed.length / 32; // Rough estimate (2 decks = ~32 trump cards)

  // Beat if we have strong trump and high depletion indicates opponents are low on trump
  if (strongTrumpCards.length > 0 && trumpDepletion > 0.5) {
    return true;
  }

  return false;
}

/**
 * Point pressure-based beating decisions
 */
function shouldBeatBasedOnPressure(
  trickPoints: number,
  pointPressure: PointPressure,
  gameContext?: GameContext,
): boolean {
  const cardsRemaining = gameContext?.cardsRemaining || 10;

  switch (pointPressure) {
    case PointPressure.HIGH:
      // High pressure: contest any points, especially late game
      return trickPoints >= (cardsRemaining <= 5 ? 0 : 5);

    case PointPressure.MEDIUM:
      // Medium pressure: contest medium+ value tricks
      return trickPoints >= 10;

    case PointPressure.LOW:
      // Low pressure: only contest high-value tricks
      return trickPoints >= 15;

    default:
      return trickPoints >= 10;
  }
}

/**
 * Position-specific strategic beating decisions
 */
function shouldBeatBasedOnPosition(
  position: number,
  trickPoints: number,
): boolean {
  switch (position) {
    case 1: // 2nd player
      // More aggressive early to establish position
      return trickPoints >= 5;

    case 2: // 3rd player
      // Tactical position - consider future threats
      return trickPoints >= 5;

    case 3: // 4th player
      // Perfect information - contest any winnable points
      return trickPoints >= 0;

    default:
      return false;
  }
}

/**
 * Anti-waste check: avoid using trump when we have equal-strength non-trump cards
 */
function shouldAvoidWastefulTrumpUsage(
  gameState: GameState,
  playerId: PlayerId,
): boolean {
  const player = gameState.players.find((p) => p.id === playerId);
  const currentTrick = gameState.currentTrick;
  if (!player || !currentTrick) return false;

  // Get current winner's cards
  const winningPlayerId = currentTrick.winningPlayerId;
  const winningPlay = currentTrick.plays.find(
    (play) => play.playerId === winningPlayerId,
  );
  const currentWinnerCards = winningPlay?.cards || [];
  if (currentWinnerCards.length === 0) return false;

  // Only apply to single card scenarios for now
  if (currentWinnerCards.length !== 1) return false;

  const winnerCard = currentWinnerCards[0];

  // Check if we have the same card (equal strength) in our hand
  const equalStrengthCard = player.hand.find(
    (card) =>
      card.suit === winnerCard.suit &&
      card.rank === winnerCard.rank &&
      !isTrump(card, gameState.trumpInfo),
  );

  return !!equalStrengthCard;
}

/**
 * Fallback decision logic when memory analysis fails
 *
 * Uses simplified heuristics as a safety net
 */
function shouldTryToBeatFallback(
  trickWinnerAnalysis: TrickWinnerAnalysis,
  gameState: GameState,
  playerId: PlayerId,
): boolean {
  const { isOpponentWinning, trickPoints, canBeatCurrentWinner } =
    trickWinnerAnalysis;

  if (!isOpponentWinning || !canBeatCurrentWinner) return false;

  // Simple fallback: beat for any decent points
  if (trickPoints >= 10) return true;

  // Beat for medium points if late in game
  const player = gameState.players.find((p) => p.id === playerId);
  if (player && player.hand.length <= 5 && trickPoints >= 5) {
    return true;
  }

  // Conservative fallback for low-value tricks
  return false;
}

/**
 * Checks if AI should try to establish suit dominance
 */
export function shouldEstablishSuit(
  gameState: GameState,
  playerId: PlayerId,
  leadingSuit: Suit,
  trumpInfo: TrumpInfo,
): boolean {
  const player = gameState.players.find((p) => p.id === playerId);
  if (!player) return false;

  // Don't try to establish trump suits (already strong)
  if (leadingSuit === trumpInfo.trumpSuit) return false;

  // Get cards in leading suit (non-trump)
  const suitCards = player.hand.filter(
    (card) => card.suit === leadingSuit && !isTrump(card, trumpInfo),
  );

  // Need at least 3 cards to consider establishment
  if (suitCards.length < 3) return false;

  // Check for strong cards (Ace, King, Queen)
  const strongCards = suitCards.filter(
    (card) =>
      card.rank === Rank.Ace ||
      card.rank === Rank.King ||
      card.rank === Rank.Queen,
  );

  // Establish if we have 2+ strong cards in the suit
  return strongCards.length >= 2;
}
