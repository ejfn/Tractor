import {
  Card,
  Combo,
  ComboAnalysis,
  ComboType,
  ComboStrength,
  GameContext,
  GameState,
  PositionStrategy,
  Rank,
  TrumpInfo,
  TrickWinnerAnalysis,
} from "../../types";
import { isTrump } from "../../game/cardValue";
import { getComboType } from "../../game/comboDetection";
import {
  selectOptimalWinningCombo,
  selectAggressiveBeatPlay,
} from "./trickContention";
import { isBiggestRemainingInSuit } from "../aiCardMemory";
import { VoidExploitationAnalysis } from "../analysis/voidExploitation";

/**
 * Opponent Blocking - Strategic countering when opponent is winning
 *
 * Handles blocking opponent point collection with strategic card management.
 * Uses trump conservation hierarchy and point avoidance when can't beat opponent.
 */

/**
 * Main opponent winning handler with strategic blocking logic
 */
export function handleOpponentWinning(
  comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
  context: GameContext,
  trickWinner: TrickWinnerAnalysis,
  trumpInfo: TrumpInfo,
  gameState: GameState,
): Card[] | null {
  // MEMORY ENHANCEMENT: Check for guaranteed winners first, but only for valuable tricks AND when we can beat the opponent
  if (
    context.memoryContext?.cardMemory &&
    trickWinner.trickPoints >= 10 &&
    trickWinner.canBeatCurrentWinner
  ) {
    const guaranteedWinner = selectMemoryGuaranteedWinner(
      comboAnalyses,
      context,
      trumpInfo,
    );
    if (guaranteedWinner) {
      return guaranteedWinner;
    }
  }

  // Advanced Void Exploitation Blocking
  if (context.memoryContext && context.memoryContext.voidExploitation) {
    const voidAnalysis = context.memoryContext.voidExploitation;
    const voidBasedBlock = selectVoidExploitationBlock(
      comboAnalyses,
      voidAnalysis,
      trickWinner,
      trumpInfo,
    );
    if (voidBasedBlock) {
      return voidBasedBlock;
    }
  }

  // Can't beat opponent - use strategic disposal
  if (!trickWinner.canBeatCurrentWinner) {
    return selectStrategicPointAvoidance(comboAnalyses, trumpInfo);
  }

  // Check for trump combos that match leading combo type for strategic dominance
  const leadingCards = gameState?.currentTrick?.plays[0]?.cards;
  if (leadingCards) {
    const leadingIsTrump = leadingCards.some((card) =>
      isTrump(card, trumpInfo),
    );

    if (!leadingIsTrump) {
      // Non-trump led - check for proper trump combos that match type
      const leadingComboType = getComboType(leadingCards, trumpInfo);
      const matchingTrumpCombos = comboAnalyses.filter(
        (ca) =>
          ca.combo.cards.every((card) => isTrump(card, trumpInfo)) &&
          ca.combo.type === leadingComboType &&
          ca.combo.type !== ComboType.Single,
      );

      // Prioritize trump tractors/pairs over mixed combos for strategic dominance
      if (matchingTrumpCombos.length > 0) {
        return selectOptimalWinningCombo(
          matchingTrumpCombos,
          context,
          {} as PositionStrategy,
          trumpInfo,
          gameState,
        );
      }
    }
  }

  // High-value tricks: contest with any available combo
  if (trickWinner.trickPoints >= 10) {
    return selectOptimalWinningCombo(
      comboAnalyses,
      context,
      {} as PositionStrategy,
      trumpInfo,
      gameState,
    );
  }

  // Medium-value tricks: contest if strategically sound
  if (trickWinner.trickPoints >= 5 && trickWinner.shouldTryToBeat) {
    return selectAggressiveBeatPlay(comboAnalyses, context);
  }

  // Low-value tricks: use strategic disposal
  return selectStrategicPointAvoidance(comboAnalyses, trumpInfo);
}

/**
 * Strategic point avoidance when opponent is winning
 * Uses hierarchical disposal to minimize damage
 */
export function selectStrategicPointAvoidance(
  comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
  _trumpInfo: TrumpInfo,
): Card[] {
  // Priority 1: Non-trump, non-point, non-Ace cards (safest disposal)
  const safeCards = comboAnalyses.filter(
    (ca) =>
      !ca.analysis.isTrump &&
      !ca.combo.cards.some((card) => (card.points || 0) > 0) &&
      !ca.combo.cards.some((card) => card.rank === Rank.Ace),
  );

  if (safeCards.length > 0) {
    const sorted = safeCards.sort((a, b) => a.combo.value - b.combo.value);
    return sorted[0].combo.cards;
  }

  // Priority 2: Non-trump, non-point cards (lose Ace but avoid giving points)
  const nonTrumpNonPoint = comboAnalyses.filter(
    (ca) =>
      !ca.analysis.isTrump &&
      !ca.combo.cards.some((card) => (card.points || 0) > 0),
  );

  if (nonTrumpNonPoint.length > 0) {
    const sorted = nonTrumpNonPoint.sort(
      (a, b) => a.combo.value - b.combo.value,
    );
    return sorted[0].combo.cards;
  }

  // Priority 3: Non-trump (even if point cards - better than trump)
  const nonTrump = comboAnalyses.filter((ca) => !ca.analysis.isTrump);
  if (nonTrump.length > 0) {
    const sorted = nonTrump.sort((a, b) => a.combo.value - b.combo.value);
    return sorted[0].combo.cards;
  }

  // Last resort: trump cards (only if no non-trump available)
  const sorted = comboAnalyses.sort(
    (a, b) => a.analysis.conservationValue - b.analysis.conservationValue,
  );
  return sorted[0].combo.cards;
}

/**
 * Memory-enhanced: Select guaranteed winning combos for opponent blocking
 * Uses card memory to identify combinations that are certain to win
 */
function selectMemoryGuaranteedWinner(
  comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
  context: GameContext,
  trumpInfo: TrumpInfo,
): Card[] | null {
  if (!context.memoryContext?.cardMemory) return null;

  // Find combos with guaranteed winning cards
  const guaranteedWinners: {
    combo: { combo: Combo; analysis: ComboAnalysis };
    priority: number;
  }[] = [];

  comboAnalyses.forEach((comboAnalysis) => {
    const firstCard = comboAnalysis.combo.cards[0];
    if (!firstCard.rank || !firstCard.suit || isTrump(firstCard, trumpInfo)) {
      return; // Skip trump or invalid cards for blocking strategy
    }

    const comboType =
      comboAnalysis.combo.type === ComboType.Pair ? "pair" : "single";
    const isBiggestRemaining =
      context.memoryContext?.cardMemory &&
      firstCard.rank &&
      isBiggestRemainingInSuit(
        context.memoryContext.cardMemory,
        firstCard.suit,
        firstCard.rank,
        comboType,
      );

    if (isBiggestRemaining) {
      let priority = 0;

      // For opponent blocking: prioritize stopping their points
      // High cards get priority for blocking
      if (firstCard.rank === Rank.Ace) {
        priority += 50; // Aces are excellent blockers
      } else if (firstCard.rank === Rank.King) {
        priority += 40; // Kings are good blockers
      } else if (firstCard.rank === Rank.Queen) {
        priority += 30; // Queens are decent blockers
      }

      // Bonus for non-point cards (avoid giving points while blocking)
      if (!firstCard.points || firstCard.points === 0) {
        priority += 20;
      }

      guaranteedWinners.push({
        combo: comboAnalysis,
        priority,
      });
    }
  });

  if (guaranteedWinners.length > 0) {
    // Sort by priority: highest first
    guaranteedWinners.sort((a, b) => b.priority - a.priority);
    return guaranteedWinners[0].combo.combo.cards;
  }

  return null;
}

/**
 * Void Exploitation Blocking - Use void knowledge to block opponents strategically
 */
function selectVoidExploitationBlock(
  comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
  voidAnalysis: VoidExploitationAnalysis,
  trickWinner: TrickWinnerAnalysis,
  trumpInfo: TrumpInfo,
): Card[] | null {
  // Only apply void exploitation if the opponent is winning
  if (!trickWinner.isOpponentWinning) {
    return null;
  }

  // Look for opportunities to force opponents into difficult positions
  const blockingOpportunities = voidAnalysis.exploitableVoids.filter(
    (opportunity) =>
      opportunity.exploitationType === "force_trump" &&
      opportunity.successProbability > 0.7,
  );

  if (blockingOpportunities.length > 0) {
    const bestOpportunity = blockingOpportunities[0];

    // Find a combo that can be used for this blocking strategy
    const blockingCombo = comboAnalyses.find(
      (ca) =>
        ca.combo.cards.some((card) =>
          bestOpportunity.exploitationCards.some(
            (exploitCard) =>
              card.suit === exploitCard.suit && card.rank === exploitCard.rank,
          ),
        ) && !ca.analysis.isTrump, // Prefer non-trump for blocking
    );

    if (blockingCombo && trickWinner.canBeatCurrentWinner) {
      return blockingCombo.combo.cards;
    }
  }

  // Check for defensive void management
  const voidRisks = voidAnalysis.voidRiskAssessment.filter(
    (risk) => risk.urgency === "high" || risk.urgency === "immediate",
  );

  if (voidRisks.length > 0) {
    // Play conservatively to avoid revealing our own voids
    const safeBlockingCombos = comboAnalyses.filter(
      (ca) =>
        !ca.analysis.isTrump &&
        !ca.analysis.hasPoints &&
        ca.analysis.strength !== ComboStrength.Critical,
    );

    if (safeBlockingCombos.length > 0) {
      return safeBlockingCombos[0].combo.cards;
    }
  }

  return null;
}
