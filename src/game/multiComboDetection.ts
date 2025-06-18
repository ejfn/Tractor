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
import { isComboUnbeatable } from "./multiComboValidation";

/**
 * Multi-Combo Detection Module
 *
 * Handles detection of multi-combo attempts from selected cards.
 * A multi-combo is multiple combination types from the same suit/trump group
 * played simultaneously.
 */

/**
 * Detect if selected cards form a valid multi-combo attempt
 * @param selectedCards Cards selected by player
 * @param trumpInfo Current trump information
 * @param context Optional context for memory-aware detection
 * @returns Multi-combo detection result
 */
export function detectMultiComboAttempt(
  selectedCards: Card[],
  trumpInfo: TrumpInfo,
  context?: {
    gameState?: GameState;
    playerId?: PlayerId;
    leadingStructure?: MultiComboStructure; // For following
    mode?: "ai" | "human"; // AI: maximize unbeatable, Human: validate selection
  },
): MultiComboDetection {
  // Must have at least 3 cards to form a multi-combo
  if (selectedCards.length < 3) {
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

  // Different logic for AI vs Human mode
  if (context?.mode === "ai" && context.gameState && context.playerId) {
    // AI Mode: Find maximum unbeatable multi-combo
    return detectMaximalUnbeatableMultiCombo(
      cards,
      suit,
      trumpInfo,
      context.gameState,
      context.playerId,
    );
  } else if (context?.leadingStructure) {
    // Following Mode: Match leading structure
    return detectFollowingMultiCombo(
      cards,
      suit,
      trumpInfo,
      context.leadingStructure,
    );
  } else {
    // Human Mode: Validate any selection with memory system validation
    return detectHumanMultiComboSelection(cards, suit, trumpInfo, context);
  }
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
 * Check if components represent a valid multi-combo
 * @param components Component combos
 * @returns True if this forms a valid multi-combo
 */
function hasMultipleComboTypes(components: Combo[]): boolean {
  // Multi-combo rule: Multiple unbeatable components from the same suit
  // The key validation (unbeatability) happens elsewhere - this just checks composition

  // Valid multi-combo: 2+ components of any type combination
  // Examples:
  // - 5 singles (all unbeatable)
  // - 3 pairs (all unbeatable)
  // - 1 tractor + 2 singles (all unbeatable)
  // - 2 pairs + 3 singles (all unbeatable)
  // - Any other combination of 2+ components

  return components.length >= 2;
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
      singles: 0,
      pairs: 0,
      tractors: 0,
      tractorSizes: [],
    },
    totalLength: 0,
    isLeading,
  };

  components.forEach((combo) => {
    structure.totalLength += combo.cards.length;

    switch (combo.type) {
      case ComboType.Single:
        structure.components.singles++;
        break;
      case ComboType.Pair:
        structure.components.pairs++;
        break;
      case ComboType.Tractor:
        structure.components.tractors++;
        // Calculate tractor size in pairs
        const tractorPairs = combo.cards.length / 2;
        structure.components.tractorSizes.push(tractorPairs);
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
 * AI Mode: Find maximum unbeatable multi-combo using memory system
 * Only creates one optimal multi-combo per suit to avoid performance issues
 */
function detectMaximalUnbeatableMultiCombo(
  cards: Card[],
  suit: Suit,
  trumpInfo: TrumpInfo,
  gameState: GameState,
  playerId: PlayerId,
): MultiComboDetection {
  const memory = createCardMemory(gameState);
  const currentPlayer = gameState.players.find((p) => p.id === playerId);
  const ownHand = currentPlayer?.hand || [];

  // Find all possible components
  const allComponents = analyzeMultiComboComponents(cards, trumpInfo);

  // Filter to only unbeatable components
  const unbeatableComponents = allComponents.filter((combo) => {
    const result = isComboUnbeatable(
      combo,
      suit,
      memory.playedCards,
      ownHand,
      trumpInfo,
    );
    return result.isUnbeatable;
  });

  // If we have unbeatable components that form multiple types, use all of them
  if (hasMultipleComboTypes(unbeatableComponents)) {
    const structure = getMultiComboStructure(unbeatableComponents, suit, true);
    return {
      isMultiCombo: true,
      structure,
      components: unbeatableComponents,
    };
  }

  return { isMultiCombo: false };
}

/**
 * Following Mode: Try to match the leading structure
 */
function detectFollowingMultiCombo(
  cards: Card[],
  suit: Suit,
  trumpInfo: TrumpInfo,
  leadingStructure: MultiComboStructure,
): MultiComboDetection {
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
 * Human Mode: Validate any selection as potential multi-combo
 * Requires memory system validation to ensure all components are unbeatable
 */
function detectHumanMultiComboSelection(
  cards: Card[],
  suit: Suit,
  trumpInfo: TrumpInfo,
  context?: {
    gameState?: GameState;
    playerId?: PlayerId;
  },
): MultiComboDetection {
  const components = analyzeMultiComboComponents(cards, trumpInfo);

  // Check if human selection has multiple combo types
  if (!hasMultipleComboTypes(components)) {
    return { isMultiCombo: false };
  }

  // Human mode still needs memory system validation to prevent selecting beatable combos
  if (context?.gameState && context.playerId) {
    const memory = createCardMemory(context.gameState);
    const currentPlayer = context.gameState.players.find(
      (p) => p.id === context.playerId,
    );
    const ownHand = currentPlayer?.hand || [];

    // Validate that all components are unbeatable
    const unbeatableComponents = components.filter((combo) => {
      const result = isComboUnbeatable(
        combo,
        suit,
        memory.playedCards,
        ownHand,
        trumpInfo,
      );
      return result.isUnbeatable;
    });

    // Only allow multi-combo if all selected components are unbeatable
    if (unbeatableComponents.length === components.length) {
      const structure = getMultiComboStructure(components, suit, true);
      return {
        isMultiCombo: true,
        structure,
        components,
      };
    } else {
      // Some components are beatable - reject the multi-combo
      return { isMultiCombo: false };
    }
  }

  // Fallback: if no memory context provided, allow any valid structure
  // (This should only happen in testing scenarios)
  const structure = getMultiComboStructure(components, suit, true);
  return {
    isMultiCombo: true,
    structure,
    components,
  };
}

/**
 * Helper function to check if following structure matches leading requirements
 */
function matchesRequiredStructure(
  followingStructure: MultiComboStructure,
  leadingStructure: MultiComboStructure,
): boolean {
  const following = followingStructure.components;
  const required = leadingStructure.components;

  // Must match total length exactly
  if (followingStructure.totalLength !== leadingStructure.totalLength) {
    return false;
  }

  // Must have at least the required number of each component type
  if (following.pairs < required.pairs) {
    return false;
  }

  if (following.tractors < required.tractors) {
    return false;
  }

  // For tractors, check if we have adequate tractor sizes
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
