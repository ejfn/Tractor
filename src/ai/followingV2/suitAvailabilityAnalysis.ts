import { compareCards } from "../../game/cardComparison";
import { calculateCardStrategicValue, isTrump } from "../../game/cardValue";
import { getComboType } from "../../game/comboDetection";
import { getTractorRank } from "../../game/tractorLogic";
import { Card, Combo, ComboType, Suit, TrumpInfo } from "../../types";

/**
 * Suit Availability Analysis - Core component for classifying following scenarios
 *
 * Analyzes the relationship between leading cards and player hand to classify
 * the scenario and determine the appropriate decision path.
 *
 * CRITICAL: Valid combos must be STRICT matches - no disposal fallbacks.
 */

/**
 * Result of suit availability analysis with scenario classification
 */
export interface SuitAvailabilityResult {
  scenario: "valid_combos" | "enough_remaining" | "void" | "insufficient";
  leadingSuit: Suit;
  leadingComboType: ComboType;
  requiredLength: number;

  // Scenario-specific data (non-nullable with sensible defaults)
  validCombos: Combo[]; // For 'valid_combos' - STRICT matches only, empty array otherwise
  remainingCards: Card[]; // For 'enough_remaining'/'insufficient', empty array otherwise
  availableCount: number; // For all scenarios, 0 when not applicable

  // Analysis metadata
  reasoning: string[];
}

/**
 * Analyze suit availability and classify the following scenario
 *
 * This is the core classification function that determines which decision path
 * to take based on the player's ability to respond to the leading combo.
 *
 * STRICT RULES:
 * - valid_combos: Only proper combo type matches (pair for pair, tractor for tractor)
 * - enough_remaining: Has cards but wrong structure → disposal/contribution route
 * - insufficient: Not enough cards → use remaining + cross-suit fill
 * - void: No cards in suit → trump or cross-suit route
 */
export function analyzeSuitAvailability(
  leadingCards: Card[],
  playerHand: Card[],
  trumpInfo: TrumpInfo,
): SuitAvailabilityResult {
  const reasoning: string[] = [];

  // Extract leading information
  const leadingSuit = isTrump(leadingCards[0], trumpInfo)
    ? Suit.None
    : leadingCards[0].suit;
  const leadingComboType = getComboType(leadingCards, trumpInfo);
  const requiredLength = leadingCards.length;

  reasoning.push(`leading_suit_${leadingSuit}`);
  reasoning.push(`leading_combo_${leadingComboType}`);
  reasoning.push(`required_length_${requiredLength}`);

  // Filter available cards in leading suit
  // CRITICAL: For trump suits, include ALL trump cards (cross-suit trump allowed)
  const availableCards = getAvailableCardsInSuit(
    playerHand,
    leadingSuit,
    trumpInfo,
  );

  const availableCount = availableCards.length;
  reasoning.push(`available_count_${availableCount}`);

  // Scenario 1: Void in leading suit
  if (availableCount === 0) {
    reasoning.push("void_in_leading_suit");
    return {
      scenario: "void",
      leadingSuit,
      leadingComboType,
      requiredLength,
      validCombos: [],
      remainingCards: [],
      availableCount,
      reasoning,
    };
  }

  // Scenario 2: Insufficient cards (some but not enough)
  if (availableCount < requiredLength) {
    reasoning.push("insufficient_cards_available");
    return {
      scenario: "insufficient",
      leadingSuit,
      leadingComboType,
      requiredLength,
      validCombos: [],
      remainingCards: availableCards,
      availableCount,
      reasoning,
    };
  }

  // STRICT COMBO ANALYSIS: Find valid combos that can properly respond
  const validCombos = findStrictValidCombos(
    availableCards,
    leadingComboType,
    requiredLength,
    trumpInfo,
    leadingSuit,
  );

  // Scenario 3: Valid combos available (STRICT matches only)
  if (validCombos.length > 0) {
    reasoning.push(`valid_combos_found_${validCombos.length}`);
    reasoning.push(`combo_types_${validCombos.map((c) => c.type).join(",")}`);

    return {
      scenario: "valid_combos",
      leadingSuit,
      leadingComboType,
      requiredLength,
      validCombos,
      remainingCards: [],
      availableCount,
      reasoning,
    };
  }

  // Scenario 4: Enough remaining cards but can't form required combo types
  // This goes to disposal/contribution route
  reasoning.push("enough_cards_wrong_structure");
  return {
    scenario: "enough_remaining",
    leadingSuit,
    leadingComboType,
    requiredLength,
    validCombos: [],
    remainingCards: availableCards,
    availableCount,
    reasoning,
  };
}

/**
 * Get available cards in the specified suit
 *
 * CRITICAL: For trump suits (Suit.None), include ALL trump cards (cross-suit trump allowed)
 */
function getAvailableCardsInSuit(
  playerHand: Card[],
  leadingSuit: Suit,
  trumpInfo: TrumpInfo,
): Card[] {
  if (leadingSuit === Suit.None) {
    // For trump leads (Suit.None), return ALL trump cards (including jokers, trump rank, trump suit)
    return playerHand.filter((card) => isTrump(card, trumpInfo));
  } else {
    // For non-trump suits, return only cards of that suit (excluding trump rank cards)
    return playerHand.filter(
      (card) => card.suit === leadingSuit && !isTrump(card, trumpInfo),
    );
  }
}

/**
 * Find STRICT valid combos that can properly respond to the leading combo
 *
 * RULES:
 * - Pair lead → Must have pairs (not just 2 singles)
 * - Tractor lead → Must have tractors (not just pairs)
 * - Single lead → Any cards work
 *
 * NO DISPOSAL FALLBACKS - those go to "enough_remaining" route
 */
function findStrictValidCombos(
  availableCards: Card[],
  leadingComboType: ComboType,
  requiredLength: number,
  trumpInfo: TrumpInfo,
  leadingSuit: Suit,
): Combo[] {
  const validCombos: Combo[] = [];

  switch (leadingComboType) {
    case ComboType.Single:
      // Single lead: Any cards work, create individual single combos
      for (const card of availableCards) {
        validCombos.push({
          type: ComboType.Single,
          cards: [card],
          value: calculateComboValue([card], trumpInfo),
        });
      }
      break;

    case ComboType.Pair:
      // Pair lead: MUST have actual pairs (not just 2 singles)
      const pairs = findPairsInCards(availableCards, trumpInfo);
      const tractors = findTractorsInCards(
        availableCards,
        trumpInfo,
        leadingSuit,
      );

      // Add pairs
      validCombos.push(...pairs);

      // Add tractors (tractors can satisfy pair requirements)
      validCombos.push(...tractors);
      break;

    case ComboType.Tractor:
      // Tractor lead: MUST have actual tractors (not just pairs)
      const availableTractors = findTractorsInCards(
        availableCards,
        trumpInfo,
        leadingSuit,
      );
      validCombos.push(...availableTractors);
      break;

    default:
      // Invalid or multi-combo - treat as singles
      for (const card of availableCards) {
        validCombos.push({
          type: ComboType.Single,
          cards: [card],
          value: calculateComboValue([card], trumpInfo),
        });
      }
      break;
  }

  return validCombos;
}

/**
 * Find all pairs in the available cards (identical cards only)
 */
function findPairsInCards(cards: Card[], trumpInfo: TrumpInfo): Combo[] {
  const pairs: Combo[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < cards.length; i++) {
    if (seen.has(cards[i].commonId)) continue;
    for (let j = i + 1; j < cards.length; j++) {
      if (cards[i].commonId === cards[j].commonId) {
        pairs.push({
          type: ComboType.Pair,
          cards: [cards[i], cards[j]],
          value: calculateComboValue([cards[i], cards[j]], trumpInfo),
        });
        seen.add(cards[i].commonId);
        break;
      }
    }
  }

  return pairs;
}

/**
 * Find all tractors in the available cards
 */
function findTractorsInCards(
  cards: Card[],
  trumpInfo: TrumpInfo,
  leadingSuit: Suit,
): Combo[] {
  const tractors: Combo[] = [];
  const pairs = findPairsInCards(cards, trumpInfo);

  if (pairs.length < 2) {
    return tractors; // Need at least 2 pairs for a tractor
  }

  // Sort pairs by rank for consecutive checking
  const sortedPairs = pairs.sort((a, b) =>
    compareCards(a.cards[0], b.cards[0], trumpInfo),
  );

  // Find consecutive pairs
  for (let i = 0; i < sortedPairs.length - 1; i++) {
    const consecutivePairs = [sortedPairs[i]];

    // Look for consecutive pairs
    for (let j = i + 1; j < sortedPairs.length; j++) {
      const currentPair = sortedPairs[j];
      const lastPair = consecutivePairs[consecutivePairs.length - 1];

      if (
        areConsecutiveRanks(lastPair.cards[0], currentPair.cards[0], trumpInfo)
      ) {
        consecutivePairs.push(currentPair);
      } else {
        break;
      }
    }

    // If we found 2+ consecutive pairs, it's a tractor
    if (consecutivePairs.length >= 2) {
      const tractorCards = consecutivePairs.flatMap((pair) => pair.cards);
      tractors.push({
        type: ComboType.Tractor,
        cards: tractorCards,
        value: calculateComboValue(tractorCards, trumpInfo),
      });
    }
  }

  return tractors;
}

/**
 * Check if two cards have consecutive tractor ranks
 */
function areConsecutiveRanks(
  card1: Card,
  card2: Card,
  trumpInfo: TrumpInfo,
): boolean {
  const rank1 = getTractorRank(card1, trumpInfo);
  const rank2 = getTractorRank(card2, trumpInfo);
  return Math.abs(rank1 - rank2) === 1;
}

/**
 * Calculate combo value for sorting/comparison
 */
function calculateComboValue(cards: Card[], trumpInfo: TrumpInfo): number {
  return cards.reduce(
    (sum, card) => sum + calculateCardStrategicValue(card, trumpInfo, "basic"),
    0,
  );
}
