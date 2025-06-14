import {
  Card,
  Combo,
  ComboAnalysis,
  GameContext,
  GameState,
  Rank,
  TrickPosition,
  TrumpInfo,
  TrickWinnerAnalysis,
} from "../../types";
import { selectLowestValueNonPointCombo } from "./strategicDisposal";
import { selectPointContribution } from "./pointContribution";
import {
  analyzeSecondPlayerStrategy,
  selectSecondPlayerContribution,
} from "./secondPlayerStrategy";
import { analyzeThirdPlayerAdvantage } from "./thirdPlayerStrategy";
import { getPointCardPriority } from "../utils/aiHelpers";

/**
 * Teammate Support - Team coordination when teammate is winning
 *
 * Handles point contribution and conservative play when teammate is currently
 * winning the trick. Uses position-specific analysis for optimal support.
 */

/**
 * Main teammate winning handler with position-specific logic
 */
export function handleTeammateWinning(
  comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
  context: GameContext,
  trumpInfo: TrumpInfo,
  gameState: GameState,
): Card[] {
  const trickWinner = context.trickWinnerAnalysis;
  if (!trickWinner) {
    // No trick winner analysis available, fall back to safe play
    return selectLowestValueNonPointCombo(comboAnalyses);
  }

  // Position-specific analysis and contribution logic
  switch (context.trickPosition) {
    case TrickPosition.Fourth:
      // 4th player perfect information analysis
      const shouldContributeFourth = shouldContributePointCards(
        trickWinner,
        comboAnalyses,
        context,
        gameState,
        trumpInfo,
      );
      if (shouldContributeFourth) {
        // Use enhanced 4th player contribution with proper 10 > King > 5 priority
        return selectPointContribution(
          comboAnalyses,
          trumpInfo,
          context,
          gameState,
        );
      }
      break;

    case TrickPosition.Second:
      // Phase 3: Second Player Strategy Enhancement
      const secondPlayerAnalysis = analyzeSecondPlayerStrategy(
        comboAnalyses,
        context,
        trumpInfo,
        gameState,
      );

      if (secondPlayerAnalysis.shouldContribute) {
        return selectSecondPlayerContribution(
          comboAnalyses,
          secondPlayerAnalysis,
          trumpInfo,
          context,
        );
      }
      break;

    case TrickPosition.Third:
      // 3rd Player Strategy Enhancement: Trump conservation when following teammate
      const shouldContributeThird = shouldThirdPlayerContribute(
        trickWinner,
        comboAnalyses,
        context,
        gameState,
        trumpInfo,
      );

      if (shouldContributeThird) {
        const contribution = selectThirdPlayerContribution(
          comboAnalyses,
          trumpInfo,
          context,
          gameState,
        );
        if (contribution) {
          return contribution.cards;
        }
      }
      break;

    case TrickPosition.First:
    default:
      // Standard logic for first position and fallback
      const shouldContributeStandard = shouldContributePointCards(
        trickWinner,
        comboAnalyses,
        context,
        gameState,
        trumpInfo,
      );

      if (shouldContributeStandard) {
        return selectPointContribution(
          comboAnalyses,
          trumpInfo,
          context,
          gameState,
        );
      }
      break;
  }

  // Fallback: Conservative play when not contributing points
  return selectLowestValueNonPointCombo(comboAnalyses);
}

/**
 * Determines whether to contribute point cards when teammate is winning
 */
export function shouldContributePointCards(
  trickWinner: TrickWinnerAnalysis,
  comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
  context: GameContext,
  gameState?: GameState,
  trumpInfo?: TrumpInfo,
): boolean {
  // Check if we have point cards available
  const hasPointCards = comboAnalyses.some((ca) =>
    ca.combo.cards.some((card) => card.points > 0),
  );

  if (!hasPointCards) {
    return false; // Can't contribute what we don't have
  }

  // 🎯 4TH PLAYER ENHANCEMENT: Perfect information with trump conservation
  if (context.trickPosition === TrickPosition.Fourth) {
    // Last player has perfect information - but should be smart about trump conservation

    // Check if we have non-trump point cards available for contribution
    const nonTrumpPointCards = comboAnalyses.filter(
      (ca) =>
        !ca.analysis.isTrump && ca.combo.cards.some((card) => card.points > 0),
    );

    // If teammate is securely winning and we have non-trump point options, prefer those
    if (nonTrumpPointCards.length > 0) {
      return true; // Contribute with non-trump point cards
    }

    // If only trump point cards available, be more conservative
    // Only contribute trump when teammate needs significant help or trick is very valuable
    if (
      gameState?.currentTrick?.points &&
      gameState.currentTrick.points >= 15
    ) {
      return true; // High value trick - worth using trump points
    }

    // For low-value tricks, preserve trump even if teammate winning
    return false; // Conservative trump preservation when teammate securely winning
  }

  // For earlier positions: Conservative play when teammate has reasonable lead
  // Only contribute point cards when teammate needs help or has very strong lead
  const teammateLeadStrength = analyzeTeammateLeadStrength(
    trickWinner,
    gameState,
  );

  // Conservative approach: preserve pairs unless teammate needs help
  if (teammateLeadStrength === "weak") {
    return true; // Help weak teammate
  } else if (teammateLeadStrength === "very_strong") {
    return true; // Maximize points with very strong teammate
  } else {
    return false; // Conservative play with moderate teammate lead
  }
}

/**
 * Analyzes the strength of teammate's current lead
 */
function analyzeTeammateLeadStrength(
  trickWinner: TrickWinnerAnalysis,
  gameState?: GameState,
): "weak" | "moderate" | "very_strong" {
  if (!gameState?.currentTrick) {
    return "moderate";
  }

  const trick = gameState.currentTrick;

  // Get winning cards - find the winning play in the plays array
  const winningPlay = trick.plays.find(
    (p) => p.playerId === trickWinner.currentWinner,
  );
  const winningCards = winningPlay?.cards || [];

  if (winningCards.length === 0) {
    return "moderate";
  }

  const winningCard = winningCards[0];
  const trumpInfo = gameState.trumpInfo;

  // Very strong: Trump cards OR high non-trump cards (Ace, King)
  if (
    winningCard.suit === trumpInfo?.trumpSuit ||
    winningCard.rank === trumpInfo?.trumpRank ||
    winningCard.rank === Rank.Ace ||
    winningCard.rank === Rank.King
  ) {
    return "very_strong";
  }

  // Weak: Low non-trump cards
  if (
    winningCard.rank === Rank.Three ||
    winningCard.rank === Rank.Four ||
    winningCard.rank === Rank.Five ||
    winningCard.rank === Rank.Six
  ) {
    return "weak";
  }

  // Moderate: Everything else (7-A in non-trump suits)
  return "moderate";
}

/**
 * 3rd Player Contribution Logic - Trump conservation with risk assessment
 *
 * Determines whether 3rd player should contribute point cards when teammate is winning.
 * Uses tactical position advantages and risk assessment to balance trump conservation
 * with optimal point collection.
 */
function shouldThirdPlayerContribute(
  trickWinner: TrickWinnerAnalysis,
  comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
  context: GameContext,
  gameState?: GameState,
  trumpInfo?: TrumpInfo,
): boolean {
  // Check if we have point cards available
  const hasPointCards = comboAnalyses.some((ca) =>
    ca.combo.cards.some((card) => card.points > 0),
  );

  if (!hasPointCards) {
    return false; // Can't contribute what we don't have
  }

  // Use 3rd player risk assessment and tactical analysis
  if (!trumpInfo || !gameState) {
    return false; // Cannot analyze without required parameters
  }

  const thirdPlayerAnalysis = analyzeThirdPlayerAdvantage(
    comboAnalyses,
    context,
    trumpInfo,
    gameState,
  );

  // Check if we have non-trump point cards available for contribution
  const nonTrumpPointCards = comboAnalyses.filter(
    (ca) =>
      !ca.analysis.isTrump && ca.combo.cards.some((card) => card.points > 0),
  );

  // If we have non-trump point options, prefer those (similar to 4th player logic)
  if (nonTrumpPointCards.length > 0) {
    // Use risk assessment to determine contribution level
    if (thirdPlayerAnalysis.takeoverRecommendation === "support") {
      return true; // Safe to contribute with non-trump points
    } else if (thirdPlayerAnalysis.takeoverRecommendation === "strategic") {
      // Strategic decision based on trick value and teammate strength
      const currentTrickPoints = gameState?.currentTrick?.points || 0;
      return (
        currentTrickPoints >= 10 || // Moderate value trick
        thirdPlayerAnalysis.teammateLeadStrength === "weak" // Help weak teammate
      );
    }
    // For takeover recommendation, be more conservative with point contribution
    return thirdPlayerAnalysis.teammateLeadStrength === "weak";
  }

  // If only trump point cards available, be very conservative (like 4th player)
  // Only use trump points when:
  // 1. High-value trick (≥15 points) OR
  // 2. High risk situation (≥0.6) AND moderate trick value (≥10 points) OR
  // 3. Teammate is weak AND trick has some value (≥5 points)
  const currentTrickPoints = gameState?.currentTrick?.points || 0;
  const riskLevel = thirdPlayerAnalysis.riskAssessment;

  if (currentTrickPoints >= 15) {
    return true; // High value trick - worth using trump points
  }

  if (riskLevel >= 0.6 && currentTrickPoints >= 10) {
    return true; // High risk situation with moderate trick value
  }

  if (
    thirdPlayerAnalysis.teammateLeadStrength === "weak" &&
    currentTrickPoints >= 5
  ) {
    return true; // Help weak teammate when trick has some value
  }

  // Conservative trump preservation for low-value tricks and safe situations
  return false;
}

/**
 * 3rd Player Contribution Selection - Optimal card selection with trump conservation
 *
 * Selects optimal point contribution for 3rd player, prioritizing non-trump point cards
 * and using strategic value assessment for trump point cards.
 */
function selectThirdPlayerContribution(
  comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
  trumpInfo: TrumpInfo,
  context: GameContext,
  gameState: GameState,
): Combo | null {
  // Get 3rd player analysis for strategic decision making
  const thirdPlayerAnalysis = analyzeThirdPlayerAdvantage(
    comboAnalyses,
    context,
    trumpInfo,
    gameState,
  );

  // Filter point card combinations
  const pointCardCombos = comboAnalyses.filter((ca) =>
    ca.combo.cards.some((card) => card.points > 0),
  );

  if (pointCardCombos.length === 0) {
    return null; // No point cards available
  }

  // Prioritize non-trump point cards (similar to 4th player strategy)
  const nonTrumpPointCombos = pointCardCombos.filter(
    (ca) => !ca.analysis.isTrump,
  );

  // If we have non-trump point cards, prefer those
  if (nonTrumpPointCombos.length > 0) {
    // Sort by strategic priority: Ten > King > Five (even when same point value)
    return nonTrumpPointCombos.sort((a, b) => {
      const aCard = a.combo.cards[0];
      const bCard = b.combo.cards[0];

      const aPriority = getPointCardPriority(aCard);
      const bPriority = getPointCardPriority(bCard);

      if (aPriority !== bPriority) {
        return bPriority - aPriority; // Higher priority first
      }

      // If same priority, sort by point value
      const aPoints = a.combo.cards.reduce(
        (total, card) => total + (card.points || 0),
        0,
      );
      const bPoints = b.combo.cards.reduce(
        (total, card) => total + (card.points || 0),
        0,
      );
      return bPoints - aPoints;
    })[0].combo;
  }

  // If only trump point cards available, use strategic selection
  // Consider risk level and teammate strength for trump card usage
  if (
    thirdPlayerAnalysis.riskAssessment >= 0.6 ||
    thirdPlayerAnalysis.teammateLeadStrength === "weak"
  ) {
    // High risk or weak teammate - use trump points strategically
    return pointCardCombos.sort((a, b) => {
      const aPoints = a.combo.cards.reduce(
        (total, card) => total + (card.points || 0),
        0,
      );
      const bPoints = b.combo.cards.reduce(
        (total, card) => total + (card.points || 0),
        0,
      );
      return bPoints - aPoints; // Highest points first
    })[0].combo;
  }

  // Low risk with strong teammate - conservative trump usage
  // Select lowest value trump point combination to minimize waste
  return pointCardCombos.sort((a, b) => {
    const aPoints = a.combo.cards.reduce(
      (total, card) => total + (card.points || 0),
      0,
    );
    const bPoints = b.combo.cards.reduce(
      (total, card) => total + (card.points || 0),
      0,
    );
    return aPoints - bPoints; // Lowest points first (minimize trump waste)
  })[0].combo;
}
