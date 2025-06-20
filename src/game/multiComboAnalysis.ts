import {
  Card,
  Combo,
  ComboType,
  GameState,
  MultiComboStructure,
  PlayerId,
  Suit,
  TrumpInfo,
} from "../types";
import { MultiComboDetection } from "../types/combinations";
import { identifyCombos } from "./comboDetection";
import { isTrump } from "./gameHelpers";
import { createCardMemory } from "../ai/aiCardMemory";
import {
  isComboUnbeatable,
  validateLeadingMultiCombo,
} from "./multiComboValidation";

/**
 * Multi-Combo Detection Module
 *
 * Handles detection of multi-combo attempts from selected cards.
 * A multi-combo is multiple combination types from the same suit/trump group
 * played simultaneously.
 */

/**
 * AI Multi-Combo Detection: Find maximum unbeatable multi-combo using memory system
 * @param playerHand All cards in player's hand
 * @param trumpInfo Current trump information
 * @param gameState Current game state for memory system
 * @param playerId Player ID for memory context
 * @returns Optimal multi-combo detection result
 */
export function detectOptimalMultiCombo(
  playerHand: Card[],
  trumpInfo: TrumpInfo,
  gameState: GameState,
  playerId: PlayerId,
): MultiComboDetection {
  const memory = createCardMemory(gameState);
  const ownHand = playerHand;

  // Group hand by suit/trump
  const cardGroups = groupCardsBySuitOrTrump(playerHand, trumpInfo);

  let bestMultiCombo: MultiComboDetection = { isMultiCombo: false };
  let maxLength = 0;

  // Check each suit for potential multi-combos
  for (const [suit, cards] of Object.entries(cardGroups)) {
    if (cards.length < 2) continue; // Need at least 2 cards for multi-combo

    // Find all possible unbeatable components in this suit
    const allComponents = analyzeMultiComboComponents(cards, trumpInfo);
    const unbeatableComponents = allComponents.filter((combo) => {
      return isComboUnbeatable(
        combo,
        suit as Suit,
        memory.playedCards,
        ownHand,
        trumpInfo,
      );
    });

    // Check if we have multiple unbeatable components
    if (unbeatableComponents.length >= 2) {
      const totalLength = unbeatableComponents.reduce(
        (sum, comp) => sum + comp.cards.length,
        0,
      );

      // Keep the longest valid multi-combo
      if (totalLength > maxLength) {
        maxLength = totalLength;
        const structure = getMultiComboStructure(
          unbeatableComponents,
          suit as Suit,
          true,
        );
        bestMultiCombo = {
          isMultiCombo: true,
          structure,
          components: unbeatableComponents,
        };
      }
    }
  }

  return bestMultiCombo;
}

/**
 * Human Multi-Combo Validation: Validate player's card selection
 * @param selectedCards Cards selected by human player
 * @param trumpInfo Current trump information
 * @param gameState Current game state for memory system
 * @param playerId Player ID for memory context
 * @returns Validation result
 */
export function validateMultiComboSelection(
  selectedCards: Card[],
  trumpInfo: TrumpInfo,
  gameState: GameState,
  playerId: PlayerId,
): MultiComboDetection {
  // Must have at least 2 cards to form a multi-combo
  // 2 cards can form multi-combo if they are multiple singles (e.g., A♦K♦)
  if (selectedCards.length < 2) {
    return { isMultiCombo: false };
  }

  // Group cards by suit/trump
  const cardGroups = groupCardsBySuitOrTrump(selectedCards, trumpInfo);

  // Multi-combo must be from a single suit or all trump
  const suits = Object.keys(cardGroups) as Suit[];
  if (suits.length !== 1) {
    return { isMultiCombo: false };
  }

  const suit = suits[0];
  const cards = cardGroups[suit];

  // Check if selection forms multiple combos (structural requirement)
  const components = analyzeMultiComboComponents(cards, trumpInfo);
  if (components.length < 2) {
    return { isMultiCombo: false };
  }

  // Create structure - we have a valid multi-combo structure
  const structure = getMultiComboStructure(components, suit, true);

  // Use validation system to check if this is a legal play
  const validation = validateLeadingMultiCombo(
    components,
    suit,
    gameState,
    playerId,
  );

  // Return structure information - structure is valid even if validation fails
  // The validation failure is about game state (void status), not structure
  return {
    isMultiCombo: true, // Structure is valid multi-combo
    structure,
    components,
    validation,
  };
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
 * Analyze cards to identify component combos within potential multi-combo
 * @param cards Cards from same suit/trump group
 * @param trumpInfo Trump information
 * @returns Individual combos identified within the group
 */
export function analyzeMultiComboComponents(
  cards: Card[],
  trumpInfo: TrumpInfo,
): Combo[] {
  // Use existing combo detection to find all possible combos
  const allCombos = identifyCombos(cards, trumpInfo);

  // For multi-combo detection, we want to find the optimal decomposition
  // that uses all cards exactly once with maximum combination value
  return findOptimalComboDecomposition(cards, allCombos);
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
      [ComboType.MultiCombo]: 0, // Should not appear in component analysis
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
 * Create multi-combo structure from component combos
 * @param components Individual combos within multi-combo
 * @param suit Suit (Suit.None for trump multi-combos)
 * @param isLeading Whether this is a leading multi-combo
 * @returns Multi-combo structure
 */
export function getMultiComboStructure(
  components: Combo[],
  suit: Suit,
  isLeading: boolean,
): MultiComboStructure {
  const structure: MultiComboStructure = {
    suit,
    components: {
      totalPairs: 0,
      tractors: 0,
      tractorSizes: [],
      totalLength: 0,
    },
    isLeading,
  };

  components.forEach((combo) => {
    structure.components.totalLength += combo.cards.length;

    switch (combo.type) {
      case ComboType.Single:
        // Singles are calculated implicitly: totalLength - (totalPairs * 2)
        break;
      case ComboType.Pair:
        structure.components.totalPairs++; // Count standalone pairs
        break;
      case ComboType.Tractor:
        structure.components.tractors++;
        // Calculate tractor size in pairs
        const tractorPairs = combo.cards.length / 2;
        structure.components.tractorSizes.push(tractorPairs);
        // IMPORTANT: Add tractor pairs to total pairs count
        structure.components.totalPairs += tractorPairs;
        break;
      default:
        // MultiCombo should not appear as a component
        break;
    }
  });

  return structure;
}

/**
 * Check if a suit represents trump cards
 * @param suit Suit from multi-combo structure
 * @returns True if this represents trump cards
 */
export function isTrumpMultiCombo(suit: Suit): boolean {
  return suit === Suit.None;
}

/**
 * Check if multi-combo is from non-trump suit (required for leading)
 * @param structure Multi-combo structure
 * @returns True if from non-trump suit
 */
export function isNonTrumpMultiCombo(structure: MultiComboStructure): boolean {
  return structure.suit !== Suit.None;
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

  // Check if selection forms multiple combos (structural requirement)
  const components = analyzeMultiComboComponents(groupCards, trumpInfo);
  if (components.length < 2) {
    return { isMultiCombo: false };
  }

  // Create structure - if we have multiple combos from same suit, it's a multi-combo
  const structure = getMultiComboStructure(components, suit, true);

  return {
    isMultiCombo: true,
    structure,
    components,
  };
}

/**
 * Following Multi-Combo Detection: Check if cards can follow a leading multi-combo
 * @param selectedCards Cards selected to follow
 * @param leadingStructure Structure of the leading multi-combo
 * @param trumpInfo Current trump information
 * @returns Detection result for following
 */
export function detectFollowingMultiCombo(
  selectedCards: Card[],
  leadingStructure: MultiComboStructure,
  trumpInfo: TrumpInfo,
): MultiComboDetection {
  // Group cards by suit/trump
  const cardGroups = groupCardsBySuitOrTrump(selectedCards, trumpInfo);

  // Multi-combo must be from a single suit or all trump
  const suits = Object.keys(cardGroups) as Suit[];
  if (suits.length !== 1) {
    return { isMultiCombo: false };
  }

  const suit = suits[0];
  const cards = cardGroups[suit];

  // Analyze components
  const components = analyzeMultiComboComponents(cards, trumpInfo);
  const structure = getMultiComboStructure(components, suit, false);

  // Check if this matches the leading structure requirements
  if (matchesRequiredStructure(structure, leadingStructure)) {
    return {
      isMultiCombo: true,
      structure,
      components,
    };
  }

  return { isMultiCombo: false };
}

/**
 * Helper function to check if following structure matches leading requirements
 */
export function matchesRequiredStructure(
  followingStructure: MultiComboStructure,
  leadingStructure: MultiComboStructure,
): boolean {
  const following = followingStructure.components;
  const required = leadingStructure.components;

  // Must match total length exactly
  if (followingStructure.components.totalLength !== leadingStructure.components.totalLength) {
    return false;
  }

  // Must have at least the required number of each component type
  // Note: totalPairs includes all pairs (standalone + tractor pairs)
  if (following.totalPairs < required.totalPairs) {
    return false;
  }

  if (following.tractors < required.tractors) {
    return false;
  }

  // For tractors, check if we have adequate tractor sizes
  // Note: This is in addition to the total pairs check above
  if (following.tractors > 0 && required.tractors > 0) {
    const followingTractorPairs = following.tractorSizes.reduce(
      (sum, size) => sum + size,
      0,
    );
    const requiredTractorPairs = required.tractorSizes.reduce(
      (sum, size) => sum + size,
      0,
    );

    if (followingTractorPairs < requiredTractorPairs) {
      return false;
    }
  }

  return true;
}
