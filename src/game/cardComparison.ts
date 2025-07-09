import { Card, Combo, ComboType, Rank, Trick, TrumpInfo } from "../types";
import {
  getRankValue,
  isTrump,
  calculateCardStrategicValue,
} from "./cardValue";
import { getComboType } from "./comboDetection";
import {
  analyzeComboStructure,
  matchesRequiredComponents,
} from "./multiComboAnalysis";

// Get trump hierarchy level (for comparing trumps) using strategic value
const getTrumpLevel = (card: Card, trumpInfo: TrumpInfo): number => {
  // Not a trump
  if (!isTrump(card, trumpInfo)) return 0;

  // Use the strategic value system for consistent trump hierarchy
  return calculateCardStrategicValue(card, trumpInfo, "basic");
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
  const canBeat =
    leadingComboType === ComboType.Invalid
      ? canBeatMultiCombo(
          proposedPlay,
          currentWinningCombo,
          trumpInfo,
          leadingCards,
        )
      : canBeatCombo(proposedPlay, currentWinningCombo, trumpInfo);

  return {
    canBeat,
    isLegal: true,
    strength: canBeat ? 75 : 25, // Simple strength for AI decisions
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
 *
 * ALGORITHM:
 * 1. Analyze leading combo structure to determine highest required combo type
 * 2. Validate that response matches the required structure (pairs/tractors/singles)
 * 3. Find the highest combo type required (tractor > pair > single priority)
 * 4. Extract the highest card of that type from both response and current winner
 * 5. Compare the two highest cards using trump hierarchy
 *
 * KEY RULES:
 * - Response must match leading structure (enforced by matchesRequiredComponents)
 * - Comparison is based on the highest required combo type only
 * - If leading has tractors → compare highest tractors
 * - If leading has pairs (no tractors) → compare highest pairs
 * - If leading has only singles → compare highest singles
 *
 * EXAMPLE:
 * Leading: K♠ + Q♠ (2 singles) → required type = Single
 * Response: A♥A♥ (trump pair) → can beat by providing A♥ as highest single
 * Current: 2♥ + 3♥ (trump singles) → compare A♥ vs highest of (2♥, 3♥) = 3♥
 * Result: A♥ > 3♥ → trump pair beats trump singles
 */
export function compareTrumpMultiCombos(
  responseCards: Card[],
  currentWinningCards: Card[],
  trumpInfo: TrumpInfo,
  leadingCards: Card[],
): boolean {
  // Analyze the leading combo to find the highest required combo type
  const leadingAnalysis = analyzeComboStructure(leadingCards, trumpInfo);
  const responseAnalysis = analyzeComboStructure(responseCards, trumpInfo);

  // For current winning cards: if non-trump, use leading analysis; if trump, analyze normally
  // This handles cases where we're comparing trump vs non-trump multi-combos
  const winningAnalysis = currentWinningCards.some(
    (c) => !isTrump(c, trumpInfo),
  )
    ? leadingAnalysis
    : analyzeComboStructure(currentWinningCards, trumpInfo);

  if (!leadingAnalysis || !responseAnalysis || !winningAnalysis) return false;

  // CRITICAL: Validate structure matching - trump responses must match leading structure
  // This prevents invalid trump responses (e.g., single trump vs pair requirement)
  if (!matchesRequiredComponents(responseAnalysis, leadingAnalysis)) {
    return false; // Response doesn't match leading structure
  }

  // Determine the highest combo type we need to compare based on leading structure
  // Priority hierarchy: Tractor > Pair > Single
  let requiredComboType: ComboType;
  if (leadingAnalysis.tractors > 0) {
    requiredComboType = ComboType.Tractor;
  } else if (leadingAnalysis.totalPairs > 0) {
    requiredComboType = ComboType.Pair;
  } else {
    requiredComboType = ComboType.Single;
  }

  // Extract the highest card of the required type from both multi-combos
  // This is where higher combo types can satisfy lower requirements
  // (e.g., pair can provide highest single card)
  const responseHighest = getHighestComboOfType(
    responseAnalysis.combos,
    requiredComboType,
    trumpInfo,
  );
  const winningHighest = getHighestComboOfType(
    winningAnalysis.combos,
    requiredComboType,
    trumpInfo,
  );

  if (!responseHighest || !winningHighest) {
    return false; // Can't compare if either doesn't have the required type
  }

  // Final comparison: highest card of required type using trump hierarchy
  // Returns true if response card beats current winning card
  return compareCards(responseHighest, winningHighest, trumpInfo) > 0;
}

/**
 * Get the highest combo of a specific type from a list of combos
 * Handles cases where response combo type is higher than required type
 * (e.g., pair can provide highest "single" card)
 *
 * PROBLEM SOLVED:
 * Previously, when leading required "singles" but response had "pairs",
 * the filter logic couldn't find matching combos because it looked for exact type matches.
 * This caused trump pairs to be unable to beat single multi-combos.
 *
 * SOLUTION:
 * Allow higher combo types to satisfy lower requirements by extracting cards:
 * - Tractor requirement: Only tractors qualify (most restrictive)
 * - Pair requirement: Pairs OR tractors qualify (tractors contain pairs)
 * - Single requirement: Any combo qualifies (all combos contain single cards)
 *
 * ALGORITHM:
 * 1. Collect all cards from combos that can satisfy the target type
 * 2. For each target type, apply appropriate filtering rules
 * 3. Find the highest card among all candidate cards using trump comparison
 *
 * EXAMPLES:
 * Target=Single, Combos=[A♥A♥ pair, K♥ single] → candidates=[A♥,A♥,K♥] → highest=A♥
 * Target=Pair, Combos=[A♥A♥ pair, K♥ single] → candidates=[A♥,A♥] → highest=A♥
 * Target=Tractor, Combos=[A♥A♥ pair, K♥ single] → candidates=[] → null
 *
 * MULTI-COMBO SCENARIO:
 * Leading: K♠ + Q♠ (2 singles) → targetType = Single
 * Response: A♥A♥ (trump pair) → candidates = [A♥, A♥] → highest = A♥
 * Result: Trump pair can beat singles by providing its A♥ card
 */
function getHighestComboOfType(
  combos: Combo[],
  targetType: ComboType,
  trumpInfo: TrumpInfo,
): Card | null {
  // Collect all cards that can satisfy the target type requirement
  // Key insight: Higher combo types can provide lower type requirements
  const candidateCards: Card[] = [];

  for (const combo of combos) {
    if (targetType === ComboType.Tractor) {
      // Tractor requirement: ONLY tractors can satisfy (most restrictive)
      // A pair cannot satisfy a tractor requirement
      if (combo.type === ComboType.Tractor) {
        candidateCards.push(...combo.cards);
      }
    } else if (targetType === ComboType.Pair) {
      // Pair requirement: Pairs AND tractors can satisfy
      // Tractors contain pairs, so they can provide pair cards
      if (combo.type === ComboType.Pair || combo.type === ComboType.Tractor) {
        candidateCards.push(...combo.cards);
      }
    } else {
      // Single requirement: ANY combo can satisfy (least restrictive)
      // Pairs have single cards, tractors have single cards, singles are singles
      // This is the key fix: trump pair can beat single multi-combo
      candidateCards.push(...combo.cards);
    }
  }

  if (candidateCards.length === 0) {
    return null; // No combos can satisfy the target type requirement
  }

  // Find the highest card among all candidates using trump hierarchy comparison
  // This ensures we get the strongest card that can satisfy the requirement
  let highest = candidateCards[0];
  for (const card of candidateCards) {
    if (compareCards(card, highest, trumpInfo) > 0) {
      highest = card;
    }
  }

  return highest;
}

/**
 * Handle multi-combo specific beating logic
 */
function canBeatMultiCombo(
  proposedCombo: Card[],
  currentWinningCombo: Card[],
  trumpInfo: TrumpInfo,
  leadingCards: Card[],
): boolean {
  const proposedIsTrump = proposedCombo.every((card) =>
    isTrump(card, trumpInfo),
  );

  // CRITICAL: For multi-combos, only trump can beat non-trump
  if (!proposedIsTrump) {
    return false; // Non-trump cannot beat any multi-combo
  }

  // Trump vs trump multi-combo comparison
  return compareTrumpMultiCombos(
    proposedCombo,
    currentWinningCombo,
    trumpInfo,
    leadingCards, // Pass leading cards for structure constraint
  );
}

/**
 * Handle straight combo beating logic (singles, pairs, tractors)
 */
export function canBeatCombo(
  proposedCombo: Card[],
  currentWinningCombo: Card[],
  trumpInfo: TrumpInfo,
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

  // Same suit or both trump - compare by rank/strength using compareCards
  if (proposedSuit === winningSuit || (proposedIsTrump && winningIsTrump)) {
    return (
      compareCards(proposedCombo[0], currentWinningCombo[0], trumpInfo) > 0
    );
  }

  return false;
}
