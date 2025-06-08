import {
  Combo,
  ComboAnalysis,
  GameContext,
  GameState,
  TrickPosition,
  TrumpInfo,
  ThirdPlayerAnalysis,
  Rank,
} from "../../types";
import { isTrump } from "../../game/gameLogic";

/**
 * Third Player Strategy - Position 3 specific optimizations
 *
 * Handles tactical advantages available to the 3rd player with partial
 * information and tactical positioning for optimal decisions.
 */

/**
 * Analyzes tactical advantages available to the 3rd player
 * Leverages partial information and tactical positioning for optimal decisions
 */
export function analyzeThirdPlayerAdvantage(
  comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
  context: GameContext,
  trumpInfo: TrumpInfo,
  gameState: GameState,
): ThirdPlayerAnalysis {
  if (context.trickPosition !== TrickPosition.Third) {
    throw new Error(
      "analyzeThirdPlayerAdvantage should only be called for 3rd player (TrickPosition.Third)",
    );
  }

  if (!context.trickWinnerAnalysis?.isTeammateWinning) {
    throw new Error(
      "analyzeThirdPlayerAdvantage should only be called when teammate is winning",
    );
  }

  // Analyze teammate's lead strength directly
  const { currentTrick } = gameState;
  if (!currentTrick) {
    throw new Error("analyzeThirdPlayerAdvantage called with no active trick");
  }

  // Get teammate's winning cards
  const trickWinner = context.trickWinnerAnalysis!;
  const winnerId = trickWinner.currentWinner;
  const winningPlay = currentTrick.plays.find(
    (play) => play.playerId === winnerId,
  );
  const teammateCards =
    winningPlay?.cards || currentTrick.plays[0]?.cards || [];

  // Find point combinations for calculating potential
  const pointCombos = comboAnalyses.filter((ca) =>
    ca.combo.cards.some((card) => card.points > 0),
  );

  if (teammateCards.length === 0) {
    throw new Error("No cards found for winning teammate");
  }

  const leadingCard = teammateCards[0];
  const vulnerabilityFactors: string[] = [];
  let leadStrength: "weak" | "moderate" | "strong" = "moderate";

  // Analyze trump vs non-trump
  const isTeammateTrump = isTrump(leadingCard, trumpInfo);
  if (isTeammateTrump) {
    leadStrength = "strong"; // Trump is generally strong
  } else {
    // Non-trump analysis
    if (leadingCard.rank === Rank.Ace) {
      leadStrength = "strong";
    } else if (leadingCard.rank === Rank.King) {
      leadStrength = "moderate";
    } else {
      leadStrength = "weak";
      vulnerabilityFactors.push("low_rank");
    }
  }

  // Check if 4th player can potentially beat
  const isVulnerableToFourthPlayer = !isTeammateTrump; // Simplified heuristic

  // Determine tactical recommendation
  let takeoverRecommendation: "support" | "takeover" | "strategic" = "support";
  if (leadStrength === "weak" && isVulnerableToFourthPlayer) {
    takeoverRecommendation = "takeover";
  } else if (leadStrength === "moderate") {
    takeoverRecommendation = "strategic";
  }

  // Find best point contribution combo using already declared pointCombos
  let optimalCombo: Combo | null = null;
  if (pointCombos.length > 0) {
    // Sort by points and select highest
    const sorted = pointCombos.sort((a, b) => {
      const aPoints = a.combo.cards.reduce(
        (total, card) => total + (card.points || 0),
        0,
      );
      const bPoints = b.combo.cards.reduce(
        (total, card) => total + (card.points || 0),
        0,
      );
      return bPoints - aPoints;
    });
    optimalCombo = sorted[0].combo;
  }

  return {
    teammateLeadStrength: leadStrength,
    takeoverRecommendation,
    pointContributionStrategy:
      takeoverRecommendation === "support" ? "enhanced" : "strategic",
    vulnerabilityFactors,
    riskAssessment: isVulnerableToFourthPlayer ? 0.7 : 0.3,
    pointMaximizationPotential: pointCombos.reduce(
      (total, ca) =>
        total +
        ca.combo.cards.reduce((sum, card) => sum + (card.points || 0), 0),
      0,
    ),
    optimalCombo,
    tacticalAdvantage: true, // 3rd position has tactical benefits
  };
}
