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
    case TrickPosition.Third:
      // 3rd player tactical analysis
      const shouldContributeThird = shouldContributePointCards(
        trickWinner,
        comboAnalyses,
        context,
        gameState,
        trumpInfo,
      );

      if (shouldContributeThird) {
        // Use same point contribution logic as 4th player for consistency
        return selectPointContribution(
          comboAnalyses,
          trumpInfo,
          context,
          gameState,
        );
      }
      break;

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

  // 🎯 4TH PLAYER ENHANCEMENT: Perfect information point contribution
  if (context.trickPosition === TrickPosition.Fourth) {
    // Last player has perfect information - maximize point contribution when teammate winning
    return true; // Always contribute when teammate winning and we're last
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
