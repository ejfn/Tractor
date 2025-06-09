import {
  Card,
  Combo,
  ComboAnalysis,
  ComboStrength,
  ComboType,
  GameContext,
  Rank,
  TrumpInfo,
} from "../../types";
import { analyzeCombo } from "../aiGameContext";
import { isTrump } from "../../game/gameLogic";

/**
 * AI Helpers - Common utility functions for AI strategy
 *
 * Provides helper functions and common logic used across
 * multiple AI modules and strategy implementations.
 */

/**
 * Check if a player is a teammate based on game context
 */
export function isTeammate(playerId: string, context: GameContext): boolean {
  // In Shengji, Human + Bot2 vs Bot1 + Bot3
  // This is a simplified check - in practice you'd check the game state for team assignments
  const humanTeam = ["human", "bot2"];
  const botTeam = ["bot1", "bot3"];

  // Since we don't have the current AI player ID in context, we need to infer it
  // This is a simplification for the implementation
  return (
    humanTeam.includes(playerId.toLowerCase()) ||
    botTeam.includes(playerId.toLowerCase())
  );
}

/**
 * Select cards by strength preference with trump considerations
 */
export function selectByStrength(
  comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
  preferredStrengths: ComboStrength[],
  preferTrump: boolean,
  trumpInfo?: TrumpInfo,
): Card[] {
  // Filter by preferred strengths
  const preferred = comboAnalyses.filter((ca) =>
    preferredStrengths.includes(ca.analysis.strength),
  );

  if (preferred.length > 0) {
    // TRUMP LEADING PROTECTION: Avoid trump suit high cards (A, K, 10) when leading
    // This prevents wasteful leading with valuable trump cards that opponents might beat
    let safePreferred = preferred;

    if (trumpInfo?.trumpSuit) {
      safePreferred = preferred.filter((ca) => {
        const combo = ca.combo;

        // Check if this combo contains trump suit high cards (Ace, King, or 10)
        const hasTrumpSuitHighCard = combo.cards.some((card) => {
          if (!card.suit || card.joker) return false; // Skip jokers

          // Check if card is trump suit AND high-value (A, K, 10)
          const isTrumpSuit = card.suit === trumpInfo.trumpSuit;
          const isHighCard =
            card.rank === Rank.Ace ||
            card.rank === Rank.King ||
            card.rank === Rank.Ten;

          return isTrumpSuit && isHighCard;
        });

        return !hasTrumpSuitHighCard; // Exclude combos with trump suit high cards
      });
    }

    // Use safe options if available, otherwise prioritize non-trump over trump suit high cards
    let filteredOptions = safePreferred.length > 0 ? safePreferred : preferred;

    // If no safe preferred options and trump protection is needed, expand to all combos and avoid trump suit high cards
    if (safePreferred.length === 0 && trumpInfo?.trumpSuit) {
      // Filter ALL combos to avoid trump suit high cards, regardless of strength
      const allSafeOptions = comboAnalyses.filter((ca) => {
        const combo = ca.combo;
        const hasTrumpSuitHighCard = combo.cards.some((card) => {
          if (!card.suit || card.joker) return false;
          const isTrumpSuit = card.suit === trumpInfo.trumpSuit;
          const isHighCard =
            card.rank === Rank.Ace ||
            card.rank === Rank.King ||
            card.rank === Rank.Ten;
          return isTrumpSuit && isHighCard;
        });
        return !hasTrumpSuitHighCard;
      });

      // Use non-trump suit high card alternatives if available
      if (allSafeOptions.length > 0) {
        filteredOptions = allSafeOptions;
      }
    }

    // Sort by trump preference and value
    const sorted = filteredOptions.sort((a, b) => {
      if (preferTrump && a.analysis.isTrump !== b.analysis.isTrump) {
        return a.analysis.isTrump ? -1 : 1;
      }
      return b.combo.value - a.combo.value;
    });
    return sorted[0].combo.cards;
  }

  // Fallback to any available combo
  const fallback = comboAnalyses.sort((a, b) => a.combo.value - b.combo.value);
  return fallback[0].combo.cards;
}

/**
 * Select probing combo for information gathering
 */
export function selectProbingCombo(
  comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
  trumpInfo: TrumpInfo,
): Card[] {
  // Select combo that maximizes information gathering
  const nonTrump = comboAnalyses.filter((ca) => !ca.analysis.isTrump);
  if (nonTrump.length > 0) {
    // Prefer medium-strength non-trump to probe opponent hands
    const medium = nonTrump.filter(
      (ca) => ca.analysis.strength === ComboStrength.Medium,
    );
    if (medium.length > 0) {
      return medium[0].combo.cards;
    }
    // Fallback to weakest non-trump
    const sorted = nonTrump.sort((a, b) => a.combo.value - b.combo.value);
    return sorted[0].combo.cards;
  }
  // Only trump available - use weakest
  const sorted = comboAnalyses.sort((a, b) => a.combo.value - b.combo.value);
  return sorted[0].combo.cards;
}

/**
 * Select disruptive combo for opponent interference
 */
export function selectDisruptiveCombo(
  comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
  trumpInfo: TrumpInfo,
): Card[] {
  // Select combo with highest disruption potential
  const sorted = comboAnalyses.sort(
    (a, b) => b.analysis.disruptionPotential - a.analysis.disruptionPotential,
  );
  return sorted[0].combo.cards;
}

/**
 * Select maximum disruption combo (aggressive approach)
 */
export function selectMaxDisruptionCombo(
  comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
  trumpInfo: TrumpInfo,
): Card[] {
  // Maximum disruption - prefer trump tractors/pairs
  const trump = comboAnalyses.filter((ca) => ca.analysis.isTrump);
  if (trump.length > 0) {
    const tractors = trump.filter((ca) => ca.combo.type === ComboType.Tractor);
    if (tractors.length > 0) {
      return tractors.sort((a, b) => b.combo.value - a.combo.value)[0].combo
        .cards;
    }
    const pairs = trump.filter((ca) => ca.combo.type === ComboType.Pair);
    if (pairs.length > 0) {
      return pairs.sort((a, b) => b.combo.value - a.combo.value)[0].combo.cards;
    }
    return trump.sort((a, b) => b.combo.value - a.combo.value)[0].combo.cards;
  }

  // No trump - use highest disruption potential
  return selectDisruptiveCombo(comboAnalyses, trumpInfo);
}

/**
 * Filter combos by trump conservation rules
 */
export function filterByTrumpConservation(
  combos: Combo[],
  conservation: any, // TrumpConservationStrategy
  pointContext: any, // PointFocusedContext
  trumpInfo: TrumpInfo,
): Combo[] {
  return combos.filter((combo) => {
    // Allow all non-trump combos
    const hasTrump = combo.cards.some((card) => isTrump(card, trumpInfo));
    if (!hasTrump) return true;

    // Check conservation rules for trump combos
    const hasBigJoker = combo.cards.some((card) => card.joker === "Big");
    const hasSmallJoker = combo.cards.some((card) => card.joker === "Small");
    const hasTrumpRank = combo.cards.some(
      (card) => card.rank === trumpInfo.trumpRank,
    );

    // Apply conservation rules
    if (hasBigJoker && conservation.preserveBigJokers) return false;
    if (hasSmallJoker && conservation.preserveSmallJokers) return false;
    if (hasTrumpRank && conservation.preserveTrumpRanks) return false;

    return true;
  });
}

/**
 * Select optimal combo from filtered options
 */
export function selectOptimalFromFiltered(
  combos: Combo[],
  trumpInfo: TrumpInfo,
  context: GameContext,
): Card[] {
  if (combos.length === 0) {
    throw new Error("Cannot select from empty combo list");
  }

  // TRUMP LEADING PROTECTION: Filter out trump suit high cards when leading
  let safeCombos = combos;
  if (trumpInfo?.trumpSuit) {
    const safeOptions = combos.filter((combo) => {
      const hasTrumpSuitHighCard = combo.cards.some((card) => {
        if (!card.suit || card.joker) return false;
        const isTrumpSuit = card.suit === trumpInfo.trumpSuit;
        const isHighCard =
          card.rank === Rank.Ace ||
          card.rank === Rank.King ||
          card.rank === Rank.Ten;
        return isTrumpSuit && isHighCard;
      });
      return !hasTrumpSuitHighCard;
    });

    // Use safe options if available, otherwise use all combos (emergency fallback)
    if (safeOptions.length > 0) {
      safeCombos = safeOptions;
    }
  }

  // Sort by combo strength and strategic value
  const sortedCombos = safeCombos.sort((a, b) => {
    const aAnalysis = analyzeCombo(a, trumpInfo, context);
    const bAnalysis = analyzeCombo(b, trumpInfo, context);

    // Prioritize by strength and strategic value
    const aScore = calculateComboScore(aAnalysis);
    const bScore = calculateComboScore(bAnalysis);

    return bScore - aScore;
  });

  return sortedCombos[0].cards;
}

/**
 * Calculate strategic score for combo analysis
 */
function calculateComboScore(analysis: ComboAnalysis): number {
  let score = 0;

  // Base score from strength
  switch (analysis.strength) {
    case ComboStrength.Critical:
      score += 4;
      break;
    case ComboStrength.Strong:
      score += 3;
      break;
    case ComboStrength.Medium:
      score += 2;
      break;
    case ComboStrength.Weak:
      score += 1;
      break;
  }

  // Bonuses
  if (analysis.isTrump) score += 1;
  if (analysis.hasPoints) score += 0.5;

  // Strategic value
  score += analysis.disruptionPotential * 0.3;
  score += analysis.conservationValue * 0.2;

  return score;
}
