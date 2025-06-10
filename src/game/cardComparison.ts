import { Card, JokerType, Rank, Suit, Trick, TrumpInfo } from "../types";
import { getRankValue, isTrump } from "./gameHelpers";
import { getComboType } from "./comboDetection";

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
  if (leadingComboType !== proposedComboType) {
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
    leadingSuit,
    trumpInfo,
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
 * Core logic: Can proposedCombo beat currentWinningCombo?
 */
export function canComboBeaten(
  proposedCombo: Card[],
  currentWinningCombo: Card[],
  leadingSuit: Suit | undefined,
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

  // Same suit or both trump - compare by rank/strength
  if (proposedSuit === winningSuit || (proposedIsTrump && winningIsTrump)) {
    // Use existing compareCards for same-suit/trump comparison
    return (
      compareCards(proposedCombo[0], currentWinningCombo[0], trumpInfo) > 0
    );
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
