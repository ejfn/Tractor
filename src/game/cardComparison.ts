import {
  Card,
  Combo,
  ComboType,
  JokerType,
  Rank,
  Trick,
  TrumpInfo,
} from "../types";
import { getComboType, identifyCombos } from "./comboDetection";
import { getRankValue, isTrump } from "./gameHelpers";
import {
  analyzeMultiComboComponents,
  detectMultiComboAttempt,
} from "./multiComboAnalysis";

// Get trump hierarchy level (for comparing trumps)
export const getTrumpLevel = (card: Card, trumpInfo: TrumpInfo): number => {
  // Not a trump
  if (!isTrump(card, trumpInfo)) return 0;

  // Red Joker - highest
  if (card.joker === JokerType.Big) return 5;

  // Black Joker - second highest
  if (card.joker === JokerType.Small) return 4;

  // Trump rank card in trump suit - third highest
  if (card.rank === trumpInfo.trumpRank && card.suit === trumpInfo.trumpSuit)
    return 3;

  // Trump rank cards in other suits - fourth highest
  if (card.rank === trumpInfo.trumpRank) return 2;

  // Trump suit cards - fifth highest
  if (trumpInfo.trumpSuit !== undefined && card.suit === trumpInfo.trumpSuit)
    return 1;

  return 0; // Not a trump (shouldn't reach here)
};

// Compare ranks
export const compareRanks = (rankA: Rank, rankB: Rank): number => {
  return getRankValue(rankA) - getRankValue(rankB);
};

// Compare two cards based on trump rules
// WARNING: This function should only be used when cards are from the same suit
// or when comparing trump cards. For cross-suit comparisons in trick context,
// use evaluateTrickPlay() instead.
export const compareCards = (
  cardA: Card,
  cardB: Card,
  trumpInfo: TrumpInfo,
): number => {
  // Validation: Ensure this function is used correctly
  const aIsTrump = isTrump(cardA, trumpInfo);
  const bIsTrump = isTrump(cardB, trumpInfo);

  // Allow comparison if: same suit, or both trump, or one is trump (trump beats non-trump)
  const sameSuit = cardA.suit === cardB.suit;
  const validComparison = sameSuit || aIsTrump || bIsTrump;

  if (!validComparison) {
    throw new Error(
      `compareCards: Invalid comparison between different non-trump suits: ` +
        `${cardA.rank}${cardA.suit} vs ${cardB.rank}${cardB.suit}. ` +
        `Use evaluateTrickPlay() for cross-suit trick comparisons.`,
    );
  }

  // First compare by trump status

  // If only one is trump, it wins
  if (aIsTrump && !bIsTrump) return 1;
  if (!aIsTrump && bIsTrump) return -1;

  // If both are trump, check specific trump hierarchy
  if (aIsTrump && bIsTrump) {
    // Compare using trump hierarchy levels
    const aLevel = getTrumpLevel(cardA, trumpInfo);
    const bLevel = getTrumpLevel(cardB, trumpInfo);

    if (aLevel !== bLevel) {
      return aLevel - bLevel; // Higher level wins
    }

    // Same level trumps - need to handle specific cases
    if (aLevel === 2) {
      // Both are trump rank in non-trump suits - they have equal strength
      // Return 0 to indicate equal strength (first played wins in trick context)
      return 0;
    } else if (aLevel === 1) {
      // Both are trump suit - compare by rank
      return compareRanks(cardA.rank, cardB.rank);
    } else {
      // Same level jokers or trump rank in trump suit - equal strength
      return 0;
    }
  }

  // Non-trump comparison
  // If suits are the same, compare ranks
  if (cardA.suit === cardB.suit) {
    return compareRanks(cardA.rank, cardB.rank);
  }

  // Different suits, and not trumps - equal strength (first played wins)
  return 0;
};

/**
 * Evaluates whether a proposed play can beat the current winning combo in a trick
 * This replaces the context-less compareCards for proper trick-taking game logic
 */
export interface TrickPlayResult {
  canBeat: boolean; // Can this play beat the current winner?
  isLegal: boolean; // Is this a legal play given hand and trick context?
  strength: number; // Relative strength (for AI decision making)
  reason?: string; // Why it can/can't beat (for debugging)
}

export function evaluateTrickPlay(
  proposedPlay: Card[],
  currentTrick: Trick,
  trumpInfo: TrumpInfo,
  playerHand: Card[],
): TrickPlayResult {
  // Extract trick context
  const leadingCards = currentTrick.plays[0]?.cards || [];
  const leadingSuit = leadingCards[0]?.suit;
  const leadingComboType = getComboType(leadingCards, trumpInfo);
  const proposedComboType = getComboType(proposedPlay, trumpInfo);

  // Get current winning combo
  const currentWinningCombo = getCurrentWinningCombo(currentTrick);

  // Step 1: Validate combo type matching
  // Allow trump responses to multi-combos (when leadingComboType is Invalid)
  if (
    leadingComboType !== proposedComboType &&
    leadingComboType !== ComboType.Invalid
  ) {
    return {
      canBeat: false,
      isLegal: false,
      strength: -1,
      reason: `Must match combo type: ${leadingComboType} was led`,
    };
  }

  // Step 2: Check if player must follow suit
  const hasLedSuit = playerHand.some((card) => card.suit === leadingSuit);
  const proposedSuit = proposedPlay[0]?.suit;

  if (hasLedSuit && proposedSuit !== leadingSuit) {
    // Player has led suit but playing different suit
    const proposedIsTrump = proposedPlay.every((card) =>
      isTrump(card, trumpInfo),
    );

    if (!proposedIsTrump) {
      return {
        canBeat: false,
        isLegal: false,
        strength: -1,
        reason: `Must follow suit: have ${leadingSuit} but playing ${proposedSuit}`,
      };
    }
  }

  // Step 3: Determine if play can beat current winner
  const canBeat = canComboBeaten(
    proposedPlay,
    currentWinningCombo,
    trumpInfo,
    leadingCards,
  );
  const strength = calculateComboStrength(
    proposedPlay,
    currentWinningCombo,
    trumpInfo,
  );

  return {
    canBeat,
    isLegal: true,
    strength,
    reason: canBeat ? "Can beat current winner" : "Cannot beat current winner",
  };
}

/**
 * Helper function to get the current winning combo from a trick
 */
export function getCurrentWinningCombo(trick: Trick): Card[] {
  if (!trick.winningPlayerId) {
    return trick.plays[0]?.cards || []; // Leader is winning by default
  }

  // Find the winning play
  const winningPlay = trick.plays.find(
    (play) => play.playerId === trick.winningPlayerId,
  );
  return winningPlay ? winningPlay.cards : trick.plays[0]?.cards || [];
}

/**
 * Compare multi-combos when structure matches using trump hierarchy
 * Rule: Get highest value of highest combo-type, if tractor, longest then highest
 */
/**
 * Compare trump multi-combos using highest combo type priority
 * Moved from AI module as this is core game logic, not AI-specific
 */
export function compareTrumpMultiCombos(
  responseCards: Card[],
  currentWinningCards: Card[],
  trumpInfo: TrumpInfo,
  leadingCards: Card[],
): boolean {
  const responseCombos = identifyCombos(responseCards, trumpInfo);
  const winningCombos = identifyCombos(currentWinningCards, trumpInfo);

  // If leading combo is provided, constrain comparison to leading combo types
  const allowedComboTypes: ComboType[] = [];
  const leadingCombos = identifyCombos(leadingCards, trumpInfo);
  const leadingTypes = leadingCombos.map((combo) =>
    getComboType(combo.cards, trumpInfo),
  );
  const hasTracker = leadingTypes.includes(ComboType.Tractor);
  const hasPairs = leadingTypes.includes(ComboType.Pair);
  const hasSingles = leadingTypes.includes(ComboType.Single);

  // Determine allowed combo types based on leading structure
  if (hasTracker) allowedComboTypes.push(ComboType.Tractor);
  if (hasPairs) allowedComboTypes.push(ComboType.Pair);
  if (hasSingles) allowedComboTypes.push(ComboType.Single);

  // Find highest combo type and representative card/pair for comparison
  const getHighestComboForComparison = (combos: Combo[]) => {
    const tractors = combos.filter(
      (c) => getComboType(c.cards, trumpInfo) === ComboType.Tractor,
    );
    const pairs = combos.filter(
      (c) => getComboType(c.cards, trumpInfo) === ComboType.Pair,
    );
    const singles = combos.filter(
      (c) => getComboType(c.cards, trumpInfo) === ComboType.Single,
    );

    // If allowed combo types are specified, only consider those types
    const useTracker = allowedComboTypes.includes(ComboType.Tractor);
    const usePairs = allowedComboTypes.includes(ComboType.Pair);
    const useSingles = allowedComboTypes.includes(ComboType.Single);

    if (tractors.length > 0 && useTracker) {
      // For tractors: find the highest pair from ALL tractor pairs
      let highestPair: Card[] | null = null;

      for (const tractor of tractors) {
        // Each tractor has pairs - find highest pair in this tractor
        const tractorPairs: Card[][] = [];
        for (let i = 0; i < tractor.cards.length; i += 2) {
          if (i + 1 < tractor.cards.length) {
            tractorPairs.push([tractor.cards[i], tractor.cards[i + 1]]);
          }
        }

        // Find highest pair in this tractor
        for (const pair of tractorPairs) {
          if (
            !highestPair ||
            compareCards(pair[0], highestPair[0], trumpInfo) > 0
          ) {
            highestPair = pair;
          }
        }
      }

      return {
        type: ComboType.Tractor,
        representativeCards: highestPair || tractors[0].cards.slice(0, 2),
      };
    }

    if (pairs.length > 0 && usePairs) {
      // Find highest pair
      let highestPair = pairs[0].cards;
      for (const pair of pairs) {
        if (compareCards(pair.cards[0], highestPair[0], trumpInfo) > 0) {
          highestPair = pair.cards;
        }
      }
      return { type: ComboType.Pair, representativeCards: highestPair };
    }

    if (singles.length > 0 && useSingles) {
      // Find highest single
      let highestSingle = singles[0].cards[0];
      for (const single of singles) {
        if (compareCards(single.cards[0], highestSingle, trumpInfo) > 0) {
          highestSingle = single.cards[0];
        }
      }
      return { type: ComboType.Single, representativeCards: [highestSingle] };
    }

    return {
      type: ComboType.Single,
      representativeCards: [combos[0].cards[0]],
    };
  };

  const responseHighest = getHighestComboForComparison(responseCombos);
  const winningHighest = getHighestComboForComparison(winningCombos);

  // Compare combo types first
  if (responseHighest.type !== winningHighest.type) {
    const getTypeValue = (type: ComboType) => {
      if (type === ComboType.Tractor) return 3;
      if (type === ComboType.Pair) return 2;
      return 1;
    };
    const responseWins =
      getTypeValue(responseHighest.type) > getTypeValue(winningHighest.type);
    return responseWins;
  }

  // Same combo type - compare representative cards
  const responseCard = responseHighest.representativeCards[0];
  const winningCard = winningHighest.representativeCards[0];

  const cardComparison = compareCards(responseCard, winningCard, trumpInfo);
  return cardComparison > 0;
}

export function compareMultiCombos(
  proposedCombo: Card[],
  currentWinningCombo: Card[],
  trumpInfo: TrumpInfo,
): number {
  // Analyze components of both multi-combos
  const proposedComponents = analyzeMultiComboComponents(
    proposedCombo,
    trumpInfo,
  );
  const winningComponents = analyzeMultiComboComponents(
    currentWinningCombo,
    trumpInfo,
  );

  // Get highest combo type from each multi-combo
  const proposedHighest = getHighestComboComponent(
    proposedComponents,
    trumpInfo,
  );
  const winningHighest = getHighestComboComponent(winningComponents, trumpInfo);

  // Compare by combo type priority: Tractor > Pair > Single
  const proposedTypePriority = getComboTypePriority(proposedHighest.type);
  const winningTypePriority = getComboTypePriority(winningHighest.type);

  if (proposedTypePriority !== winningTypePriority) {
    return proposedTypePriority - winningTypePriority;
  }

  // Same combo type - compare by specific rules
  if (
    proposedHighest.type === ComboType.Tractor &&
    winningHighest.type === ComboType.Tractor
  ) {
    // For tractors: longest first, then highest
    const proposedLength = proposedHighest.cards.length;
    const winningLength = winningHighest.cards.length;

    if (proposedLength !== winningLength) {
      return proposedLength - winningLength;
    }

    // Same length - compare highest cards in tractors
    return compareCards(
      proposedHighest.cards[0],
      winningHighest.cards[0],
      trumpInfo,
    );
  }

  // For pairs and singles: compare highest cards directly
  return compareCards(
    proposedHighest.cards[0],
    winningHighest.cards[0],
    trumpInfo,
  );
}

/**
 * Get the highest value component from a multi-combo
 */
function getHighestComboComponent(
  components: Combo[],
  trumpInfo: TrumpInfo,
): Combo {
  if (components.length === 0) {
    throw new Error("No components found in multi-combo");
  }

  // Sort components by priority: Tractors > Pairs > Singles
  // Then by strength within each type
  const tractors = components.filter((c) => c.type === ComboType.Tractor);
  const pairs = components.filter((c) => c.type === ComboType.Pair);
  const singles = components.filter((c) => c.type === ComboType.Single);

  if (tractors.length > 0) {
    // Return longest tractor, or if same length, highest tractor
    const sortedTractors = tractors.sort((a, b) => {
      if (a.cards.length !== b.cards.length) {
        return b.cards.length - a.cards.length; // Longer first
      }
      // All tractors in multi-combo should be from same suit or trump group
      return compareCards(b.cards[0], a.cards[0], trumpInfo); // Higher first
    });
    return sortedTractors[0];
  }

  if (pairs.length > 0) {
    // Return highest pair - all pairs in multi-combo should be from same suit or trump group
    const sortedPairs = pairs.sort((a, b) => {
      return compareCards(b.cards[0], a.cards[0], trumpInfo);
    });
    return sortedPairs[0];
  }

  // Return highest single - all singles in multi-combo should be from same suit or trump group
  const sortedSingles = singles.sort((a, b) => {
    return compareCards(b.cards[0], a.cards[0], trumpInfo);
  });
  return sortedSingles[0];
}

/**
 * Get priority level for combo types (higher number = higher priority)
 */
function getComboTypePriority(type: ComboType): number {
  switch (type) {
    case ComboType.Tractor:
      return 3;
    case ComboType.Pair:
      return 2;
    case ComboType.Single:
      return 1;
    default:
      return 0;
  }
}

/**
 * Core logic: Can proposedCombo beat currentWinningCombo?
 */
function canComboBeaten(
  proposedCombo: Card[],
  currentWinningCombo: Card[],
  trumpInfo: TrumpInfo,
  leadingCards: Card[],
): boolean {
  const proposedSuit = proposedCombo[0]?.suit;
  const winningSuit = currentWinningCombo[0]?.suit;

  const proposedIsTrump = proposedCombo.every((card) =>
    isTrump(card, trumpInfo),
  );
  const winningIsTrump = currentWinningCombo.every((card) =>
    isTrump(card, trumpInfo),
  );

  // Trump beats non-trump
  if (proposedIsTrump && !winningIsTrump) {
    return true;
  }

  // Non-trump cannot beat trump
  if (!proposedIsTrump && winningIsTrump) {
    return false;
  }

  // Different suits (both non-trump) - cannot beat
  if (proposedSuit !== winningSuit && !proposedIsTrump && !winningIsTrump) {
    return false;
  }

  // Same suit or both trump - compare by rank/strength
  if (proposedSuit === winningSuit || (proposedIsTrump && winningIsTrump)) {
    // Check if these are actual multi-combos (multiple separate combos from same suit)
    const proposedIsMultiCombo = detectMultiComboAttempt(
      proposedCombo,
      trumpInfo,
    ).isMultiCombo;
    const winningIsMultiCombo = detectMultiComboAttempt(
      currentWinningCombo,
      trumpInfo,
    ).isMultiCombo;

    if (proposedIsMultiCombo && winningIsMultiCombo) {
      // For trump vs trump multi-combo comparison, use specialized logic
      if (proposedIsTrump && winningIsTrump) {
        return compareTrumpMultiCombos(
          proposedCombo,
          currentWinningCombo,
          trumpInfo,
          leadingCards, // Pass leading cards for structure constraint
        );
      } else {
        // Use general multi-combo comparison logic
        const multiComboResult = compareMultiCombos(
          proposedCombo,
          currentWinningCombo,
          trumpInfo,
        );
        return multiComboResult > 0;
      }
    } else {
      // Use existing compareCards for simple combos (singles, pairs, tractors)
      return (
        compareCards(proposedCombo[0], currentWinningCombo[0], trumpInfo) > 0
      );
    }
  }

  return false;
}

/**
 * Calculate relative strength for AI decision making
 * This function handles cross-suit comparisons safely for trick context
 */
export function calculateComboStrength(
  proposedCombo: Card[],
  currentWinningCombo: Card[],
  trumpInfo: TrumpInfo,
): number {
  const proposedSuit = proposedCombo[0]?.suit;
  const winningSuit = currentWinningCombo[0]?.suit;

  const proposedIsTrump = proposedCombo.every((card) =>
    isTrump(card, trumpInfo),
  );
  const winningIsTrump = currentWinningCombo.every((card) =>
    isTrump(card, trumpInfo),
  );

  // For cross-suit trick comparisons, use trump-aware strength calculation
  if (proposedSuit !== winningSuit && !proposedIsTrump && !winningIsTrump) {
    // Different non-trump suits - cannot beat, assign low strength
    return 25;
  }

  // Same suit or trump involved - safe to use compareCards
  const comparison = compareCards(
    proposedCombo[0],
    currentWinningCombo[0],
    trumpInfo,
  );

  // Normalize to 0-100 scale for AI use
  if (comparison > 0) return 75 + Math.min(comparison * 5, 25); // 75-100 for winning
  if (comparison === 0) return 50; // 50 for equal
  return Math.max(25 + comparison * 5, 0); // 0-25 for losing
}
