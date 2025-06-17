import {
  Combo,
  ComboAnalysis,
  GameContext,
  GameState,
  TrickPosition,
  TrumpInfo,
  FourthPlayerAnalysis,
  PlayerId,
  ComboStrength,
  Card,
} from "../../types";
import { analyze4thPlayerMemoryContext } from "../aiCardMemory";
import { getPointCardPriority } from "../utils/aiHelpers";

/**
 * Fourth Player Strategy - Position 4 specific optimizations
 *
 * Handles perfect information advantages available to the 4th (last) player
 * with complete visibility of all played cards for optimal decision making.
 */

/**
 * Phase 3: Memory-Enhanced 4th Player Strategy Analysis
 *
 * Combines perfect information advantages with memory-based analysis for optimal
 * decision making. Leverages complete trick visibility plus trump exhaustion
 * analysis for strategic future round positioning.
 */
export function analyzeFourthPlayerAdvantage(
  comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
  context: GameContext,
  trumpInfo: TrumpInfo,
  gameState: GameState,
): FourthPlayerAnalysis {
  if (context.trickPosition !== TrickPosition.Fourth) {
    throw new Error(
      "analyzeFourthPlayerAdvantage should only be called for 4th player (TrickPosition.Fourth)",
    );
  }

  // 4th player has perfect information - all cards are visible
  const pointCardCombos = comboAnalyses.filter((ca) =>
    ca.combo.cards.some((card) => card.points > 0),
  );

  // Enhanced memory analysis when available
  let memoryAnalysis: FourthPlayerMemoryAnalysis | null = null;
  let currentPlayer: PlayerId | null = null;

  if (context.memoryContext?.cardMemory && gameState.currentTrick) {
    currentPlayer = gameState.players[gameState.currentPlayerIndex]?.id || null;

    if (currentPlayer) {
      try {
        const allPlayedCards = gameState.currentTrick.plays.flatMap(
          (play) => play.cards,
        );
        const trickPoints = gameState.currentTrick.points || 0;

        memoryAnalysis = analyze4thPlayerMemoryContext(
          context.memoryContext.cardMemory,
          allPlayedCards,
          trumpInfo,
          currentPlayer,
          trickPoints,
        );
      } catch (error) {
        console.warn("4th player memory analysis failed:", error);
      }
    }
  }

  // Separate trump and non-trump point combinations for strategic selection
  const nonTrumpPointCards = pointCardCombos.filter(
    (ca) => !ca.analysis.isTrump,
  );
  const trumpPointCards = pointCardCombos.filter((ca) => ca.analysis.isTrump);

  // Calculate optimal contribution strategy based on memory analysis
  let optimalContributionStrategy:
    | "maximize"
    | "optimize"
    | "conservative"
    | "minimal" = "maximize";
  let certainWinCards: Combo[] = [];

  if (memoryAnalysis) {
    switch (memoryAnalysis.optimalDecision) {
      case "win":
        optimalContributionStrategy = "maximize";
        // Prioritize highest point combinations
        certainWinCards = pointCardCombos
          .sort((a, b) => {
            const aPoints = a.combo.cards.reduce(
              (sum, card) => sum + (card.points || 0),
              0,
            );
            const bPoints = b.combo.cards.reduce(
              (sum, card) => sum + (card.points || 0),
              0,
            );
            return bPoints - aPoints;
          })
          .slice(0, 3)
          .map((ca) => ca.combo);
        break;

      case "contribute":
        optimalContributionStrategy = "optimize";
        // Use strategic point card priority
        certainWinCards = selectOptimalPointContributions(
          pointCardCombos,
          trumpInfo,
          memoryAnalysis,
        );
        break;

      case "minimize":
        optimalContributionStrategy = "conservative";
        // Prefer non-trump point cards, minimize trump usage
        certainWinCards =
          nonTrumpPointCards.length > 0
            ? [selectLowestValuePointCombo(nonTrumpPointCards)]
            : [selectLowestValuePointCombo(trumpPointCards)];
        break;

      case "lose":
        optimalContributionStrategy = "minimal";
        // Try to avoid giving points if possible, or give minimal points
        certainWinCards = [];
        break;
    }
  } else {
    // Fallback: Basic perfect information strategy
    certainWinCards = pointCardCombos.slice(0, 2).map((ca) => ca.combo);
  }

  const pointMaximizationPotential = pointCardCombos.reduce(
    (total, ca) =>
      total + ca.combo.cards.reduce((sum, card) => sum + (card.points || 0), 0),
    0,
  );

  return {
    certainWinCards: certainWinCards.filter((combo) => combo !== undefined),
    pointMaximizationPotential,
    optimalContributionStrategy,
    teammateSupportOpportunity: pointCardCombos.length > 0,
    guaranteedPointCards: pointCardCombos.map((ca) => ca.combo),
    perfectInformationAdvantage: true,
    // Memory enhancement fields
    memoryAnalysis: memoryAnalysis
      ? {
          optimalDecision: memoryAnalysis.optimalDecision,
          confidenceLevel: memoryAnalysis.confidenceLevel,
          futureRoundAdvantage: memoryAnalysis.futureRoundAdvantage,
          reasoning: memoryAnalysis.reasoning,
        }
      : undefined,
    trumpConservationRecommendation:
      (memoryAnalysis?.futureRoundAdvantage ?? 0) > 0.2
        ? "preserve"
        : "standard",
    nonTrumpPointOptions: nonTrumpPointCards.map((ca) => ca.combo),
    trumpPointOptions: trumpPointCards.map((ca) => ca.combo),
  };
}

/**
 * Fourth player memory analysis result
 */
interface FourthPlayerMemoryAnalysis {
  optimalDecision: "win" | "lose" | "minimize" | "contribute";
  confidenceLevel: number;
  futureRoundAdvantage: number;
  pointOptimization: {
    maxContribution: number;
    minimalLoss: number;
    optimalBalance: number;
  };
  reasoning: string;
}

/**
 * Selects optimal point contributions based on memory analysis and strategic priorities
 */
function selectOptimalPointContributions(
  pointCardCombos: { combo: Combo; analysis: ComboAnalysis }[],
  _trumpInfo: TrumpInfo,
  memoryAnalysis: FourthPlayerMemoryAnalysis,
): Combo[] {
  // Separate trump and non-trump options
  const nonTrumpOptions = pointCardCombos.filter((ca) => !ca.analysis.isTrump);
  const trumpOptions = pointCardCombos.filter((ca) => ca.analysis.isTrump);

  const selectedCombos: Combo[] = [];

  // Strategy: Prefer non-trump point cards when future advantage is positive
  if (memoryAnalysis.futureRoundAdvantage > 0.1 && nonTrumpOptions.length > 0) {
    // Good future position - use non-trump points and preserve trump
    const bestNonTrump = nonTrumpOptions.sort((a, b) => {
      const aCard = a.combo.cards[0];
      const bCard = b.combo.cards[0];

      // Use point card priority: Ten > King > Five
      const aPriority = getPointCardPriority(aCard);
      const bPriority = getPointCardPriority(bCard);

      if (aPriority !== bPriority) {
        return bPriority - aPriority; // Higher priority first
      }

      // If same priority, prefer higher point value
      const aPoints = a.combo.cards.reduce(
        (sum, card) => sum + (card.points || 0),
        0,
      );
      const bPoints = b.combo.cards.reduce(
        (sum, card) => sum + (card.points || 0),
        0,
      );
      return bPoints - aPoints;
    });

    selectedCombos.push(bestNonTrump[0]?.combo);
  } else if (
    memoryAnalysis.futureRoundAdvantage < -0.1 &&
    trumpOptions.length > 0
  ) {
    // Poor future position - use trump points strategically (get value now)
    const bestTrump = trumpOptions.sort((a, b) => {
      const aPoints = a.combo.cards.reduce(
        (sum, card) => sum + (card.points || 0),
        0,
      );
      const bPoints = b.combo.cards.reduce(
        (sum, card) => sum + (card.points || 0),
        0,
      );
      return bPoints - aPoints; // Highest points first
    });

    selectedCombos.push(bestTrump[0]?.combo);
  } else {
    // Balanced situation - use optimal balance from memory analysis
    const targetContribution = memoryAnalysis.pointOptimization.optimalBalance;

    // Find combination closest to target contribution
    let bestMatch = pointCardCombos[0];
    let bestDifference = Infinity;

    pointCardCombos.forEach((ca) => {
      const comboPoints = ca.combo.cards.reduce(
        (sum, card) => sum + (card.points || 0),
        0,
      );
      const difference = Math.abs(comboPoints - targetContribution);

      if (difference < bestDifference) {
        bestDifference = difference;
        bestMatch = ca;
      }
    });

    selectedCombos.push(bestMatch?.combo);
  }

  return selectedCombos.filter((combo) => combo !== undefined);
}

/**
 * Selects the lowest value point combination for conservative play
 */
function selectLowestValuePointCombo(
  pointCardCombos: { combo: Combo; analysis: ComboAnalysis }[],
): Combo {
  if (pointCardCombos.length === 0) {
    throw new Error("No point card combinations available");
  }

  return pointCardCombos.sort((a, b) => {
    // Sort by total point value (ascending - lowest first)
    const aPoints = a.combo.cards.reduce(
      (sum, card) => sum + (card.points || 0),
      0,
    );
    const bPoints = b.combo.cards.reduce(
      (sum, card) => sum + (card.points || 0),
      0,
    );

    if (aPoints !== bPoints) {
      return aPoints - bPoints;
    }

    // If same point value, prefer non-trump over trump
    if (a.analysis.isTrump !== b.analysis.isTrump) {
      return a.analysis.isTrump ? 1 : -1;
    }

    // If same point value and trump status, prefer lower combo strength
    const strengthOrder = {
      [ComboStrength.Weak]: 0,
      [ComboStrength.Medium]: 1,
      [ComboStrength.Strong]: 2,
      [ComboStrength.Critical]: 3,
    };

    return (
      strengthOrder[a.analysis.strength] - strengthOrder[b.analysis.strength]
    );
  })[0].combo;
}

/**
 * Enhanced 4th Player Point Contribution Selection
 *
 * Uses memory analysis and perfect information to select optimal point contribution
 * when teammate is winning, balancing immediate gains with future round positioning.
 */
export function selectFourthPlayerPointContribution(
  comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
  context: GameContext,
  trumpInfo: TrumpInfo,
  gameState: GameState,
): Card[] {
  const analysis = analyzeFourthPlayerAdvantage(
    comboAnalyses,
    context,
    trumpInfo,
    gameState,
  );

  // If we have certain win cards from memory analysis, use those
  if (analysis.certainWinCards.length > 0) {
    return analysis.certainWinCards[0].cards;
  }

  // Filter point card combinations
  const pointCardCombos = comboAnalyses.filter((ca) =>
    ca.combo.cards.some((card) => card.points > 0),
  );

  if (pointCardCombos.length === 0) {
    // No point cards available - this shouldn't happen in normal teammate support
    return comboAnalyses.length > 0 ? comboAnalyses[0].combo.cards : [];
  }

  // Use memory-enhanced strategy based on analysis
  switch (analysis.optimalContributionStrategy) {
    case "maximize":
      // Use highest priority point combination (respect Ten > King > Five priority)
      return pointCardCombos.sort((a, b) => {
        const aCard = a.combo.cards[0];
        const bCard = b.combo.cards[0];

        const aPriority = getPointCardPriority(aCard);
        const bPriority = getPointCardPriority(bCard);

        if (aPriority !== bPriority) {
          return bPriority - aPriority; // Higher priority first
        }

        // If same priority, prefer higher point value
        const aPoints = a.combo.cards.reduce(
          (sum, card) => sum + (card.points || 0),
          0,
        );
        const bPoints = b.combo.cards.reduce(
          (sum, card) => sum + (card.points || 0),
          0,
        );
        return bPoints - aPoints;
      })[0].combo.cards;

    case "optimize":
      // Use strategic point card selection with priority
      if (analysis.nonTrumpPointOptions.length > 0) {
        // Prefer non-trump point cards with proper priority
        const nonTrumpCombos = pointCardCombos.filter(
          (ca) => !ca.analysis.isTrump,
        );
        return nonTrumpCombos.sort((a, b) => {
          const aCard = a.combo.cards[0];
          const bCard = b.combo.cards[0];

          const aPriority = getPointCardPriority(aCard);
          const bPriority = getPointCardPriority(bCard);

          return bPriority - aPriority; // Higher priority first
        })[0].combo.cards;
      } else {
        // Use trump point cards with priority-based selection (not lowest value)
        return pointCardCombos.sort((a, b) => {
          const aCard = a.combo.cards[0];
          const bCard = b.combo.cards[0];

          const aPriority = getPointCardPriority(aCard);
          const bPriority = getPointCardPriority(bCard);

          return bPriority - aPriority; // Higher priority first
        })[0].combo.cards;
      }

    case "conservative":
      // Still use point card priority but prefer non-trump options
      if (analysis.nonTrumpPointOptions.length > 0) {
        const nonTrumpCombos = pointCardCombos.filter(
          (ca) => !ca.analysis.isTrump,
        );
        return nonTrumpCombos.sort((a, b) => {
          const aCard = a.combo.cards[0];
          const bCard = b.combo.cards[0];

          const aPriority = getPointCardPriority(aCard);
          const bPriority = getPointCardPriority(bCard);

          return bPriority - aPriority; // Higher priority first
        })[0].combo.cards;
      } else {
        // Use lowest value trump point combination to minimize waste
        return selectLowestValuePointCombo(pointCardCombos).cards;
      }

    case "minimal":
      // Try to avoid contributing points, but if forced, use minimal
      return selectLowestValuePointCombo(pointCardCombos).cards;

    default:
      // Fallback to highest priority point combination
      return pointCardCombos.sort((a, b) => {
        const aCard = a.combo.cards[0];
        const bCard = b.combo.cards[0];

        const aPriority = getPointCardPriority(aCard);
        const bPriority = getPointCardPriority(bCard);

        if (aPriority !== bPriority) {
          return bPriority - aPriority; // Higher priority first
        }

        // If same priority, prefer higher point value
        const aPoints = a.combo.cards.reduce(
          (sum, card) => sum + (card.points || 0),
          0,
        );
        const bPoints = b.combo.cards.reduce(
          (sum, card) => sum + (card.points || 0),
          0,
        );
        return bPoints - aPoints;
      })[0].combo.cards;
  }
}
