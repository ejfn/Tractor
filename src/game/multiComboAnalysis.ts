import { Card, Combo, ComboType, MultiCombo, Suit, TrumpInfo } from "../types";
import { MultiComboDetection } from "../types/combinations";
import { identifyCombos } from "./comboDetection";
import { isTrump } from "./gameHelpers";

/**
 * Multi-Combo Detection for Game Rule Validation
 *
 * This module provides multi-combo detection specifically for game rule enforcement.
 * Should ONLY be used for:
 * 1) Leading multi-combo validation in isValidPlay()
 * 2) Trump responses attempting to beat leading multi-combos in isValidPlay()
 *
 * This is separated from getComboType to avoid context confusion.
 * getComboType handles only straight combo types: Single, Pair, Tractor, Invalid
 *
 * For comprehensive multi-combo analysis, see other functions in this module.
 */

export interface MultiComboDetectionResult {
  isMultiCombo: boolean;
  components?: MultiCombo;
}

/**
 * Group cards by suit or trump group
 * @param cards Cards to group
 * @param trumpInfo Trump information
 * @returns Cards grouped by suit
 */
function groupCardsBySuitOrTrump(
  cards: Card[],
  trumpInfo: TrumpInfo,
): Record<Suit, Card[]> {
  const groups: Record<Suit, Card[]> = {} as Record<Suit, Card[]>;

  cards.forEach((card) => {
    let groupSuit: Suit;

    if (isTrump(card, trumpInfo)) {
      groupSuit = Suit.None; // Use Suit.None for trump cards
    } else if (card.suit) {
      groupSuit = card.suit;
    } else {
      // Should not happen for valid cards, fallback to None
      groupSuit = Suit.None;
    }

    if (!groups[groupSuit]) {
      groups[groupSuit] = [];
    }
    groups[groupSuit].push(card);
  });

  return groups;
}

/**
 * Find optimal decomposition of cards into non-overlapping combos
 * @param cards All cards to decompose
 * @param allCombos All possible combos from these cards
 * @returns Optimal set of non-overlapping combos
 */
function findOptimalComboDecomposition(
  cards: Card[],
  allCombos: Combo[],
): Combo[] {
  // For now, use a simple greedy approach:
  // 1. Prefer tractors over pairs over singles
  // 2. Use largest combos first
  // 3. Fill remaining with smaller combos

  const sortedCombos = allCombos.sort((a, b) => {
    // Sort by combo type priority: Tractor > Pair > Single
    const typePriority = {
      [ComboType.Tractor]: 3,
      [ComboType.Pair]: 2,
      [ComboType.Single]: 1,
      [ComboType.Invalid]: -1, // Should not appear in component analysis
    };

    const priorityDiff = typePriority[b.type] - typePriority[a.type];
    if (priorityDiff !== 0) return priorityDiff;

    // Within same type, prefer larger combos
    return b.cards.length - a.cards.length;
  });

  const usedCardIds = new Set<string>();
  const selectedCombos: Combo[] = [];

  for (const combo of sortedCombos) {
    // Check if any card in this combo is already used
    const hasOverlap = combo.cards.some((card) => usedCardIds.has(card.id));

    if (!hasOverlap) {
      selectedCombos.push(combo);
      combo.cards.forEach((card) => usedCardIds.add(card.id));
    }
  }

  // Verify all cards are accounted for
  if (usedCardIds.size !== cards.length) {
    // Fallback: treat all as singles if optimal decomposition fails
    return cards.map((card) => ({
      type: ComboType.Single,
      cards: [card],
      value: 1,
      isBreakingPair: false,
    }));
  }

  return selectedCombos;
}

/**
 * Simple multi-combo detection for basic validation
 * @param cards Cards to analyze
 * @param trumpInfo Trump information
 * @returns Basic multi-combo detection result
 */
export function detectMultiComboAttempt(
  cards: Card[],
  trumpInfo: TrumpInfo,
): MultiComboDetection {
  // RESTRICTIVE: Only detect actual strategic multi-combos
  // Exhausting scenarios should NOT be detected as multi-combos

  // Must have at least 2 cards to form a multi-combo
  // 2 cards can form multi-combo if they are multiple singles (e.g., A♦K♦)
  // 3+ cards needed for more complex multi-combos (pair + single, etc.)
  if (cards.length < 2) {
    return { isMultiCombo: false };
  }

  // RESTRICTIVE: Multi-combo must be from non-trump suit only
  // Trump "multi-combos" are just trump exhausting, not strategic multi-combos
  const hasAnyTrump = cards.some((card) => isTrump(card, trumpInfo));
  if (hasAnyTrump) {
    return { isMultiCombo: false };
  }

  // Group cards by suit (no trump allowed at this point)
  const cardGroups = groupCardsBySuitOrTrump(cards, trumpInfo);

  // Multi-combo must be from a single non-trump suit
  const suits = Object.keys(cardGroups) as Suit[];
  if (suits.length !== 1 || suits[0] === Suit.None) {
    return { isMultiCombo: false };
  }

  const suit = suits[0];
  const groupCards = cardGroups[suit];

  // 🚨 CRITICAL: MULTI-COMBO = Multiple combos from same suit (e.g., A♥ + K♥ + Q♥ = 3 singles = VALID)
  // Check if selection forms multiple combos (structural requirement)
  const allCombos = identifyCombos(groupCards, trumpInfo);
  const optimalCombos = findOptimalComboDecomposition(groupCards, allCombos);
  if (optimalCombos.length < 2) {
    return { isMultiCombo: false };
  }

  // Create the multi-combo components
  const components = calculateComponentsFromCombos(optimalCombos, trumpInfo);

  return {
    isMultiCombo: true,
    components,
  };
}

/**
 * Calculate component counts from optimal combos
 * @param combos Optimal non-overlapping combos
 * @param trumpInfo Trump information for determining if combos are trump
 * @returns Component statistics with computed total length
 */
function calculateComponentsFromCombos(
  combos: Combo[],
  trumpInfo: TrumpInfo,
): MultiCombo {
  let totalPairs = 0;
  let tractors = 0;
  const tractorSizes: number[] = [];
  let totalTractorPairs = 0;

  // Calculate total length from all combo cards
  const totalLength = combos.reduce(
    (sum, combo) => sum + combo.cards.length,
    0,
  );

  // Determine if this is a trump multi-combo
  const isTrumpMultiCombo =
    combos.length > 0 &&
    combos[0].cards.every((card) => isTrump(card, trumpInfo));

  combos.forEach((combo) => {
    switch (combo.type) {
      case ComboType.Pair:
        totalPairs += 1;
        break;
      case ComboType.Tractor:
        const pairCount = combo.cards.length / 2;
        totalPairs += pairCount;
        totalTractorPairs += pairCount;
        tractors += 1;
        tractorSizes.push(pairCount);
        break;
      case ComboType.Single:
        // Singles counted implicitly
        break;
      default:
        // Other types shouldn't appear in component analysis
        break;
    }
  });

  return {
    totalLength,
    totalPairs,
    tractors,
    tractorSizes,
    totalTractorPairs,
    combos,
    isTrump: isTrumpMultiCombo,
  };
}

/**
 * Analyze cards and return structural components
 * Core function used by AI following strategy
 * Returns null if cards don't form a multi-combo (i.e., only single combo)
 */
export function analyzeComboStructure(
  cards: Card[],
  trumpInfo: TrumpInfo,
  isLeading?: boolean,
): MultiCombo | null {
  // Handle empty cards case
  if (cards.length === 0) {
    return {
      combos: [],
      totalLength: 0,
      totalPairs: 0,
      tractors: 0,
      tractorSizes: [],
      totalTractorPairs: 0,
      isTrump: false,
    };
  }

  // Use existing combo detection to find all possible combos
  const allCombos = identifyCombos(cards, trumpInfo);

  // Find optimal decomposition that uses all cards exactly once
  const combos = findOptimalComboDecomposition(cards, allCombos);

  // Return null if this doesn't represent a multi-combo (less than 2 combos)
  if (isLeading && combos.length < 2) {
    return null;
  }

  // Calculate component counts from the optimal combos
  const components = calculateComponentsFromCombos(combos, trumpInfo);

  return components;
}

/**
 * Check if available components can match required structure
 * Direct comparison without wrapper objects
 */
export function matchesRequiredComponents(
  available: MultiCombo,
  required: MultiCombo,
): boolean {
  // Must match total length exactly
  if (available.totalLength !== required.totalLength) {
    return false;
  }

  // Must have at least the required number of each component type
  // Note: totalPairs includes all pairs (standalone + tractor pairs)
  if (available.totalPairs < required.totalPairs) {
    return false;
  }

  if (available.tractors < required.tractors) {
    return false;
  }

  // For tractors, check if we have adequate tractor pairs
  // Note: This is in addition to the total pairs check above
  if (available.tractors > 0 && required.tractors > 0) {
    if (available.totalTractorPairs < required.totalTractorPairs) {
      return false;
    }

    // Check if the longest available tractor is at least as long as the longest required tractor
    const maxAvailableTractorSize = Math.max(...available.tractorSizes);
    const maxRequiredTractorSize = Math.max(...required.tractorSizes);
    if (maxAvailableTractorSize < maxRequiredTractorSize) {
      return false;
    }
  }

  return true;
}

/**
 * Detect multi-combo for leading validation
 * Only allows well-structured multi-combos from non-trump suits
 */
export const detectLeadingMultiCombo = (
  cards: Card[],
  trumpInfo: TrumpInfo,
): MultiComboDetectionResult => {
  const detection = detectMultiComboAttempt(cards, trumpInfo);

  if (!detection.isMultiCombo || !detection.components) {
    return { isMultiCombo: false };
  }

  // RESTRICTIVE: Only allow leading multi-combos from non-trump suits
  if (detection.components && detection.components.isTrump) {
    return { isMultiCombo: false };
  }

  // Additional validation: All cards must be from same non-trump suit
  const nonTrumpCards = cards.filter((card) => !isTrump(card, trumpInfo));
  if (nonTrumpCards.length > 0) {
    const firstNonTrumpSuit = nonTrumpCards[0].suit;
    const allSameSuit = nonTrumpCards.every(
      (card) => card.suit === firstNonTrumpSuit,
    );
    if (!allSameSuit) {
      return { isMultiCombo: false };
    }
  }

  return {
    isMultiCombo: true,
    components: detection.components,
  };
};
