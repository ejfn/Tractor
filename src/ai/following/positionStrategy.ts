import { gameLogger } from "../../utils/gameLogger";
import {
  calculateCardStrategicValue,
  isBiggestInSuit,
  isTrump,
} from "../../game/cardValue";
import {
  Card,
  Combo,
  ComboAnalysis,
  GameContext,
  GameState,
  PlayerId,
  PositionStrategy,
  Rank,
  Suit,
  TrickPosition,
  TrumpInfo,
} from "../../types";
import { analyze2ndPlayerMemoryContext } from "../aiCardMemory";

/**
 * Unified Position Strategy - Consolidated position-aware following logic
 *
 * Replaces scattered position-specific modules with a single decision route
 * that uses position-aware switches for optimal strategic decisions.
 */

/**
 * Unified position analysis interface
 */
export interface PositionAnalysis {
  position: TrickPosition;
  strategy:
    | "support"
    | "pressure"
    | "block"
    | "setup"
    | "takeover"
    | "conservative";
  optimalCombo: Combo | null;
  reasoning: string[];
  memoryEnhanced: boolean;
  confidenceLevel: number; // 0-1 confidence in decision
}

/**
 * Main unified position-aware following play selection
 *
 * Single decision route with position-aware switches that replaces
 * the scattered position-specific module calls.
 */
export function selectPositionAwareFollowingPlay(
  comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
  context: GameContext,
  _positionStrategy: PositionStrategy,
  trumpInfo: TrumpInfo,
  gameState: GameState,
  currentPlayerId: PlayerId,
): Card[] {
  // Phase 1: Common analysis across all positions
  const analysis = analyzePositionContext(
    comboAnalyses,
    context,
    trumpInfo,
    gameState,
    currentPlayerId,
  );

  gameLogger.debug("ai_following_decision", {
    decisionPoint: "unified_position_strategy",
    player: currentPlayerId,
    position: context.trickPosition,
    strategy: analysis.strategy,
    memoryEnhanced: analysis.memoryEnhanced,
    confidence: analysis.confidenceLevel,
    reasoning: analysis.reasoning,
  });

  // Phase 2: Position-aware decision switch
  switch (context.trickPosition) {
    case TrickPosition.Second:
      return handleSecondPlayerPosition(
        comboAnalyses,
        analysis,
        context,
        trumpInfo,
        gameState,
      );

    case TrickPosition.Third:
      return handleThirdPlayerPosition(
        comboAnalyses,
        analysis,
        context,
        trumpInfo,
        gameState,
      );

    case TrickPosition.Fourth:
      return handleFourthPlayerPosition(
        comboAnalyses,
        analysis,
        context,
        trumpInfo,
        gameState,
      );

    case TrickPosition.First:
    default:
      // Fallback for edge cases (shouldn't happen in following logic)
      gameLogger.warn(
        "position_strategy_fallback",
        { position: context.trickPosition, playerId: currentPlayerId },
        "Unexpected position in following strategy, using fallback",
      );
      return comboAnalyses.length > 0 ? comboAnalyses[0].combo.cards : [];
  }
}

/**
 * Phase 1: Common analysis that applies to all positions
 */
function analyzePositionContext(
  comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
  context: GameContext,
  _trumpInfo: TrumpInfo,
  _gameState: GameState,
  _currentPlayerId: PlayerId,
): PositionAnalysis {
  const reasoning: string[] = [];
  let strategy: PositionAnalysis["strategy"] = "conservative";
  let optimalCombo: Combo | null = null;
  let memoryEnhanced = false;
  let confidenceLevel = 0.5;

  // Common analysis: Points, trump, memory
  const pointCombos = comboAnalyses.filter((ca) =>
    ca.combo.cards.some((card) => card.points > 0),
  );
  // Note: trumpCombos will be used in future position-specific enhancements
  // const trumpCombos = comboAnalyses.filter((ca) => ca.analysis.isTrump);
  const isTeammateWinning =
    context.trickWinnerAnalysis?.isTeammateWinning || false;
  const isOpponentWinning =
    context.trickWinnerAnalysis?.isOpponentWinning || false;
  const trickPoints = context.trickWinnerAnalysis?.trickPoints || 0;

  // Memory enhancement when available
  if (context.memoryContext?.cardMemory) {
    memoryEnhanced = true;
    confidenceLevel += 0.2;
    reasoning.push("memory_enhanced_analysis");
  }

  // Strategic decision logic
  if (isTeammateWinning) {
    strategy = "support";
    reasoning.push("teammate_winning");

    if (pointCombos.length > 0 && trickPoints >= 5) {
      // Find best point contribution
      optimalCombo = pointCombos.reduce((best, current) => {
        const bestPoints = best.combo.cards.reduce(
          (sum, card) => sum + card.points,
          0,
        );
        const currentPoints = current.combo.cards.reduce(
          (sum, card) => sum + card.points,
          0,
        );
        return currentPoints > bestPoints ? current : best;
      }).combo;
      reasoning.push("point_contribution_opportunity");
      confidenceLevel += 0.2;
    }
  } else if (isOpponentWinning) {
    if (
      context.trickWinnerAnalysis?.canBeatCurrentWinner &&
      trickPoints >= 10
    ) {
      strategy = "block";
      reasoning.push("opponent_blocking_valuable_trick");
      confidenceLevel += 0.3;
    } else {
      strategy = "conservative";
      reasoning.push("opponent_winning_conserve");
    }
  } else {
    strategy = "setup";
    reasoning.push("neutral_trick_setup");
  }

  return {
    position: context.trickPosition,
    strategy,
    optimalCombo,
    reasoning,
    memoryEnhanced,
    confidenceLevel,
  };
}

/**
 * Second Player Position Handler
 *
 * Early influence with limited information, emphasis on setting up
 * favorable positions for teammates in positions 3 and 4.
 */
function handleSecondPlayerPosition(
  comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
  analysis: PositionAnalysis,
  context: GameContext,
  trumpInfo: TrumpInfo,
  gameState: GameState,
): Card[] {
  const leadingCards = gameState.currentTrick?.plays[0]?.cards;
  if (!leadingCards || leadingCards.length === 0) {
    return comboAnalyses.length > 0 ? comboAnalyses[0].combo.cards : [];
  }

  const leadingSuit = leadingCards[0].suit;
  const leadingCard = leadingCards[0];

  // Memory-enhanced analysis when available
  if (
    analysis.memoryEnhanced &&
    context.memoryContext?.cardMemory &&
    context.currentPlayer
  ) {
    try {
      const memoryAnalysis = analyze2ndPlayerMemoryContext(
        context.memoryContext.cardMemory,
        leadingCards,
        trumpInfo,
        context.currentPlayer,
      );

      // Use memory insights to refine strategy
      if (memoryAnalysis.optimalResponseStrategy === "pressure") {
        analysis.strategy = "pressure";
        analysis.reasoning.push("memory_suggests_pressure");
      } else if (memoryAnalysis.optimalResponseStrategy === "block") {
        analysis.strategy = "block";
        analysis.reasoning.push("memory_suggests_blocking");
      }
    } catch (error) {
      gameLogger.warn(
        "second_player_memory_analysis_failed",
        { error: error instanceof Error ? error.message : String(error) },
        "2nd player memory analysis failed, using fallback",
      );
    }
  }

  // Priority 1: Same-suit following (non-trump leads)
  if (!isTrump(leadingCard, trumpInfo)) {
    const sameSuitCombos = comboAnalyses.filter(
      (ca) =>
        ca.combo.cards.length > 0 &&
        ca.combo.cards[0].suit === leadingSuit &&
        !ca.analysis.isTrump,
    );

    if (sameSuitCombos.length > 0) {
      // Second player strategy: Play highest available in same suit
      const sortedCombos = sameSuitCombos.sort((a, b) => {
        const aValue = calculateCardStrategicValue(
          a.combo.cards[0],
          trumpInfo,
          "basic",
        );
        const bValue = calculateCardStrategicValue(
          b.combo.cards[0],
          trumpInfo,
          "basic",
        );
        return bValue - aValue; // Highest first
      });

      gameLogger.debug("ai_following_decision", {
        decisionPoint: "second_player_same_suit",
        strategy: "play_highest_available",
        selectedCard: `${sortedCombos[0].combo.cards[0].rank}${sortedCombos[0].combo.cards[0].suit}`,
      });

      return sortedCombos[0].combo.cards;
    }
  }

  // Priority 2: Trump response when void in leading suit
  const trumpCombos = comboAnalyses.filter((ca) => ca.analysis.isTrump);
  if (trumpCombos.length > 0 && !isTrump(leadingCard, trumpInfo)) {
    // Assess point potential for trump conservation decision
    const remainingPointPotential = estimateRemainingPointPotential(
      leadingSuit,
      context,
    );

    if (remainingPointPotential >= 20) {
      // High point potential - use medium value trump
      const mediumTrumpCombos = trumpCombos.filter(
        (ca) =>
          ca.analysis.conservationValue >= 110 &&
          ca.analysis.conservationValue < 200,
      );

      if (mediumTrumpCombos.length > 0) {
        const sortedMediumTrump = mediumTrumpCombos.sort(
          (a, b) => a.analysis.conservationValue - b.analysis.conservationValue,
        );

        gameLogger.debug("ai_following_decision", {
          decisionPoint: "second_player_trump",
          strategy: "medium_trump_for_high_points",
          pointPotential: remainingPointPotential,
        });

        return sortedMediumTrump[0].combo.cards;
      }
    }

    // Low point potential or no medium trump - use lowest trump
    const sortedTrumpCombos = trumpCombos.sort(
      (a, b) => a.analysis.conservationValue - b.analysis.conservationValue,
    );

    gameLogger.debug("ai_following_decision", {
      decisionPoint: "second_player_trump",
      strategy: "low_trump_conservation",
      pointPotential: remainingPointPotential,
    });

    return sortedTrumpCombos[0].combo.cards;
  }

  // Priority 3: Optimal combo from analysis or fallback
  if (analysis.optimalCombo) {
    return analysis.optimalCombo.cards;
  }

  return comboAnalyses.length > 0 ? comboAnalyses[0].combo.cards : [];
}

/**
 * Third Player Position Handler
 *
 * Tactical advantages with partial information, including takeover analysis
 * and enhanced teammate support strategies.
 */
function handleThirdPlayerPosition(
  comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
  analysis: PositionAnalysis,
  context: GameContext,
  trumpInfo: TrumpInfo,
  gameState: GameState,
): Card[] {
  const currentTrick = gameState.currentTrick;
  if (!currentTrick) {
    return comboAnalyses.length > 0 ? comboAnalyses[0].combo.cards : [];
  }

  // Enhanced takeover analysis when teammate is winning
  if (
    analysis.strategy === "support" &&
    context.trickWinnerAnalysis?.isTeammateWinning
  ) {
    const takeoverAnalysis = analyzeThirdPlayerTakeoverOpportunity(
      currentTrick,
      context,
      trumpInfo,
      comboAnalyses,
    );

    if (takeoverAnalysis.shouldTakeover) {
      analysis.strategy = "takeover";
      analysis.reasoning.push("takeover_weak_teammate_lead");
      analysis.reasoning.push(...takeoverAnalysis.reasons);

      // Find strongest combo for takeover
      const strongestCombo = findStrongestCombo(comboAnalyses, trumpInfo);
      if (strongestCombo) {
        gameLogger.debug("ai_following_decision", {
          decisionPoint: "third_player_takeover",
          teammateLeadStrength: takeoverAnalysis.teammateStrength,
          vulnerabilityFactors: takeoverAnalysis.vulnerabilityFactors,
        });

        return strongestCombo.cards;
      }
    }
  }

  // Standard support or blocking logic
  if (analysis.optimalCombo) {
    return analysis.optimalCombo.cards;
  }

  // Find point contribution if supporting
  if (analysis.strategy === "support") {
    const pointCombos = comboAnalyses.filter((ca) =>
      ca.combo.cards.some((card) => card.points > 0),
    );

    if (pointCombos.length > 0) {
      const bestPointCombo = pointCombos.sort((a, b) => {
        const aPoints = a.combo.cards.reduce(
          (sum, card) => sum + card.points,
          0,
        );
        const bPoints = b.combo.cards.reduce(
          (sum, card) => sum + card.points,
          0,
        );
        return bPoints - aPoints;
      })[0];

      return bestPointCombo.combo.cards;
    }
  }

  return comboAnalyses.length > 0 ? comboAnalyses[0].combo.cards : [];
}

/**
 * Fourth Player Position Handler
 *
 * Perfect information advantage for optimal decision making.
 */
function handleFourthPlayerPosition(
  comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
  analysis: PositionAnalysis,
  context: GameContext,
  _trumpInfo: TrumpInfo,
  _gameState: GameState,
): Card[] {
  // Fourth player has perfect information - use it optimally
  const canBeat = context.trickWinnerAnalysis?.canBeatCurrentWinner || false;
  const trickPoints = context.trickWinnerAnalysis?.trickPoints || 0;

  // Perfect information point maximization
  if (analysis.strategy === "support" && canBeat && trickPoints >= 5) {
    // Find best point contribution with minimal card waste
    const pointCombos = comboAnalyses.filter((ca) =>
      ca.combo.cards.some((card) => card.points > 0),
    );

    if (pointCombos.length > 0) {
      // Use 10 > King > 5 priority for optimal point contribution
      const bestPointCombo = pointCombos.sort((a, b) => {
        const aPriority = getPointCardPriority(a.combo.cards);
        const bPriority = getPointCardPriority(b.combo.cards);
        return bPriority - aPriority;
      })[0];

      gameLogger.debug("ai_following_decision", {
        decisionPoint: "fourth_player_optimal_contribution",
        points: trickPoints,
        strategy: "perfect_information_maximize",
      });

      return bestPointCombo.combo.cards;
    }
  }

  // Conservative play when can't or shouldn't beat
  if (!canBeat || analysis.strategy === "conservative") {
    // Find lowest value combo to minimize waste
    const safeCombo = comboAnalyses.sort(
      (a, b) => a.analysis.conservationValue - b.analysis.conservationValue,
    )[0];

    return safeCombo ? safeCombo.combo.cards : [];
  }

  // Use optimal combo from analysis
  if (analysis.optimalCombo) {
    return analysis.optimalCombo.cards;
  }

  return comboAnalyses.length > 0 ? comboAnalyses[0].combo.cards : [];
}

/**
 * Analyze third player takeover opportunity
 */
function analyzeThirdPlayerTakeoverOpportunity(
  currentTrick: {
    plays: { playerId: string; cards: Card[] }[];
    winningPlayerId: string;
  },
  _context: GameContext,
  trumpInfo: TrumpInfo,
  _comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
): {
  shouldTakeover: boolean;
  teammateStrength: "weak" | "moderate" | "strong";
  vulnerabilityFactors: string[];
  reasons: string[];
} {
  const winningPlay = currentTrick.plays.find(
    (play) => play.playerId === currentTrick.winningPlayerId,
  );
  const teammateCards =
    winningPlay?.cards || currentTrick.plays[0]?.cards || [];

  if (teammateCards.length === 0) {
    return {
      shouldTakeover: false,
      teammateStrength: "moderate",
      vulnerabilityFactors: [],
      reasons: ["no_teammate_cards_found"],
    };
  }

  const leadingCard = teammateCards[0];
  const vulnerabilityFactors: string[] = [];
  const reasons: string[] = [];
  let teammateStrength: "weak" | "moderate" | "strong" = "moderate";

  // Analyze teammate lead strength
  const strategicValue = calculateCardStrategicValue(
    leadingCard,
    trumpInfo,
    "basic",
  );
  const isTeammateTrump = isTrump(leadingCard, trumpInfo);

  if (isTeammateTrump) {
    if (strategicValue >= 170) {
      teammateStrength = "strong"; // Jokers, trump rank cards
    } else if (strategicValue > 110) {
      teammateStrength = "moderate"; // High trump suit cards
    } else {
      teammateStrength = "weak"; // Low trump (forced play)
      vulnerabilityFactors.push("low_trump_forced_play");
      reasons.push("teammate_used_weak_trump");
    }
  } else {
    if (isBiggestInSuit(leadingCard, trumpInfo)) {
      teammateStrength = "strong"; // Biggest in suit
    } else if (strategicValue > 10) {
      teammateStrength = "moderate"; // Queen, Jack level
    } else {
      teammateStrength = "weak"; // 10 and below
      vulnerabilityFactors.push("low_rank_card");
      reasons.push("teammate_played_low_rank");
    }
  }

  // Check if fourth player can potentially beat (simplified heuristic)
  const isVulnerableToFourthPlayer = !isTeammateTrump;
  if (isVulnerableToFourthPlayer) {
    vulnerabilityFactors.push("vulnerable_to_fourth_player");
    reasons.push("non_trump_vulnerable");
  }

  // Takeover recommendation logic
  const shouldTakeover =
    teammateStrength === "weak" && isVulnerableToFourthPlayer;

  return {
    shouldTakeover,
    teammateStrength,
    vulnerabilityFactors,
    reasons,
  };
}

/**
 * Find the strongest combo for aggressive play
 */
function findStrongestCombo(
  comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
  trumpInfo: TrumpInfo,
): Combo | null {
  if (comboAnalyses.length === 0) return null;

  // Prefer trump combos, then highest strategic value
  const trumpCombos = comboAnalyses.filter((ca) => ca.analysis.isTrump);
  if (trumpCombos.length > 0) {
    return trumpCombos.sort(
      (a, b) => b.analysis.conservationValue - a.analysis.conservationValue,
    )[0].combo;
  }

  // Fall back to highest non-trump combo
  return comboAnalyses.sort((a, b) => {
    const aValue = calculateCardStrategicValue(
      a.combo.cards[0],
      trumpInfo,
      "basic",
    );
    const bValue = calculateCardStrategicValue(
      b.combo.cards[0],
      trumpInfo,
      "basic",
    );
    return bValue - aValue;
  })[0].combo;
}

/**
 * Estimate remaining point potential in a suit for trump conservation decisions
 */
function estimateRemainingPointPotential(
  leadingSuit: Suit,
  context: GameContext,
): number {
  // Base points per suit: 2 fives (10) + 2 tens (20) + 2 kings (20) = 50 total
  const basePoints = 50;

  if (context.memoryContext?.cardMemory) {
    // Use memory to subtract already played points
    const playedPointsInSuit = context.memoryContext.cardMemory.playedCards
      .filter((card) => card.suit === leadingSuit)
      .reduce((total, card) => total + card.points, 0);

    return Math.max(0, basePoints - playedPointsInSuit);
  }

  // Conservative estimate when no memory available
  return Math.floor(basePoints * 0.7);
}

/**
 * Calculate point card priority: 10s > Kings > 5s
 */
function getPointCardPriority(cards: Card[]): number {
  let priority = 0;

  for (const card of cards) {
    if (card.rank === Rank.Ten) {
      priority += 30; // Highest priority for 10s (10 points each)
    } else if (card.rank === Rank.King) {
      priority += 20; // Medium priority for Kings (10 points each)
    } else if (card.rank === Rank.Five) {
      priority += 10; // Lowest priority for 5s (5 points each)
    }
  }

  return priority;
}
