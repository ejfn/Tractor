import { Card, TrumpInfo, ComboType, GameState, PlayerId } from "../types";
import {
  identifyCombos,
  checkSameSuitPairPreservation,
  checkTractorFollowingPriority,
  getComboType,
} from "./comboDetection";
import { isTrump } from "./gameHelpers";
import {
  detectMultiComboAttempt,
  isNonTrumpMultiCombo,
} from "./multiComboDetection";
import {
  validateLeadingMultiCombo,
  validateFollowingMultiCombo,
} from "./multiComboValidation";

// Local helper function to avoid circular dependencies
const getLeadingSuit = (combo: Card[]) => {
  // Find the first card that has a suit
  for (const card of combo) {
    if (card.suit) {
      return card.suit;
    }
  }
  return undefined;
};

/**
 * Check if a play is valid following Shengji rules
 * This function is extracted to avoid circular dependencies between
 * playProcessing.ts and combinationGeneration.ts
 */
export const isValidPlay = (
  playedCards: Card[],
  leadingCombo: Card[] | null,
  playerHand: Card[],
  trumpInfo: TrumpInfo,
): boolean => {
  // If no leading combo, any valid combo is acceptable
  if (!leadingCombo) {
    const combos = identifyCombos(playerHand, trumpInfo);
    return combos.some(
      (combo) =>
        combo.cards.length === playedCards.length &&
        combo.cards.every((card) =>
          playedCards.some((played) => played.id === card.id),
        ),
    );
  }

  // Shengji rules: Must match the combination length
  if (playedCards.length !== leadingCombo.length) {
    return false;
  }

  // Get the leading combo's suit
  const leadingSuit = getLeadingSuit(leadingCombo);
  const isLeadingTrump = leadingCombo.some((card) => isTrump(card, trumpInfo));

  // Find available cards in player's hand - UNIFIED APPROACH
  // Treat trump as just another "suit" for consistency
  const relevantCards = isLeadingTrump
    ? playerHand.filter((card) => isTrump(card, trumpInfo))
    : playerHand.filter(
        (card) => card.suit === leadingSuit && !isTrump(card, trumpInfo),
      );

  // Get combo types
  const leadingType = getComboType(leadingCombo, trumpInfo);
  const playedType = getComboType(playedCards, trumpInfo);

  // UNIFIED: Check if player can form matching combo in relevant suit
  const canFormMatchingCombo = relevantCards.length >= leadingCombo.length;

  if (canFormMatchingCombo) {
    const relevantCombos = identifyCombos(relevantCards, trumpInfo);
    const hasMatchingCombo = relevantCombos.some(
      (combo) =>
        combo.type === leadingType &&
        combo.cards.length === leadingCombo.length,
    );

    // If player can form matching combo but didn't use it, invalid
    if (hasMatchingCombo && playedType !== leadingType) {
      return false;
    }
  }

  // UNIFIED LOGIC: Apply same rules regardless of trump vs non-trump

  // 1. Must play from relevant suit if you have cards
  if (relevantCards.length > 0) {
    // Check if all played cards are from the relevant suit (trump or leading suit)
    const allRelevantSuit = playedCards.every((card) =>
      isLeadingTrump
        ? isTrump(card, trumpInfo)
        : card.suit === leadingSuit && !isTrump(card, trumpInfo),
    );

    // If not all from relevant suit, check if we have enough to cover the combo
    if (!allRelevantSuit && relevantCards.length >= leadingCombo.length) {
      return false; // Must play from relevant suit when you have enough
    }
  }

  // 2. Check if player can match same combo type in relevant suit
  const matchingCombos = identifyCombos(relevantCards, trumpInfo).filter(
    (combo) =>
      combo.type === leadingType && combo.cards.length === leadingCombo.length,
  );

  if (matchingCombos.length > 0) {
    // Must play a matching combo in the relevant suit
    // Check if played cards exactly match any valid combination (order independent)
    const isMatchingCombo = matchingCombos.some((combo) => {
      if (combo.cards.length !== playedCards.length) {
        return false;
      }

      // Create frequency maps for both sets of cards
      const comboCardIds = combo.cards.map((card) => card.id).sort();
      const playedCardIds = playedCards.map((card) => card.id).sort();

      // Check if both arrays contain exactly the same card IDs
      return (
        comboCardIds.length === playedCardIds.length &&
        comboCardIds.every((id, index) => id === playedCardIds[index])
      );
    });
    return isMatchingCombo;
  }

  // 3. If can't match combo type but have enough cards of the relevant suit,
  // must play cards of the relevant suit (combo type not enforced)
  if (relevantCards.length >= leadingCombo.length) {
    // Must play cards of the relevant suit
    const allRelevantSuit = playedCards.every((card) =>
      relevantCards.some((handCard) => handCard.id === card.id),
    );

    // UNIFIED: Apply same validation regardless of trump vs non-trump
    if (allRelevantSuit) {
      // Check tractor following priority (pairs before singles)
      if (
        !checkTractorFollowingPriority(
          playedCards,
          leadingCombo,
          playerHand,
          trumpInfo,
        )
      ) {
        return false;
      }

      return checkSameSuitPairPreservation(
        playedCards,
        leadingCombo,
        playerHand,
        trumpInfo,
      );
    }

    return false;
  }

  // 4. If player has some cards of the relevant suit, but not enough for the combo,
  // they must play all the cards they have of that suit
  if (relevantCards.length > 0 && relevantCards.length < leadingCombo.length) {
    // This rule always applies regardless of combo type - must use all relevant suit cards

    // Count how many cards of the relevant suit were played
    const playedRelevantCards = playedCards.filter((card) =>
      isLeadingTrump
        ? isTrump(card, trumpInfo)
        : card.suit === leadingSuit && !isTrump(card, trumpInfo),
    );

    // Must use all available cards of the relevant suit
    const allRelevantCardsPlayed = relevantCards.every((handCard) =>
      playedRelevantCards.some((playedCard) => playedCard.id === handCard.id),
    );

    // Also check that we played exactly the right number of relevant suit cards
    const playedRightNumberOfRelevantCards =
      playedRelevantCards.length === relevantCards.length;

    if (!allRelevantCardsPlayed || !playedRightNumberOfRelevantCards) {
      return false;
    }

    // The remaining cards can be anything to make up the required length
    const playedNonRelevantCount =
      playedCards.length - playedRelevantCards.length;
    const requiredNonRelevantCount = leadingCombo.length - relevantCards.length;

    // Must play exactly the right number of total cards
    if (playedNonRelevantCount !== requiredNonRelevantCount) {
      return false;
    }

    // All cards must be from the player's hand
    const allPlayedFromHand = playedCards.every((card) =>
      playerHand.some((handCard) => handCard.id === card.id),
    );

    // UNIFIED: Apply same validation regardless of trump vs non-trump
    if (allPlayedFromHand) {
      // Check tractor following priority for partial suit following
      if (
        !checkTractorFollowingPriority(
          playedCards,
          leadingCombo,
          playerHand,
          trumpInfo,
        )
      ) {
        return false;
      }

      return checkSameSuitPairPreservation(
        playedCards,
        leadingCombo,
        playerHand,
        trumpInfo,
      );
    }

    return false;
  }

  // 5. If no cards of the relevant suit, can play ANY cards of the correct length,
  // regardless of combo type - the combo type check is only applied when player has
  // enough cards of relevant suit to form a valid combo

  // First, verify all played cards are from the player's hand
  const allPlayedFromHand = playedCards.every((card) =>
    playerHand.some((handCard) => handCard.id === card.id),
  );

  if (!allPlayedFromHand) {
    return false;
  }

  // If we have no cards of the relevant suit, any selection of correct length is valid
  if (relevantCards.length === 0) {
    // Just need to verify the length, which we've already done at the start
    return true;
  }

  // Default - should only reach here in edge cases
  return true;
};

/**
 * Enhanced validation that includes multi-combo support
 * @param playedCards Cards being played
 * @param leadingCombo Leading combination (null if leading)
 * @param playerHand Player's full hand
 * @param trumpInfo Trump information
 * @param gameState Current game state (for multi-combo validation)
 * @param playerId Player attempting the play (for multi-combo validation)
 * @returns True if the play is valid
 */
export const isValidPlayWithMultiCombo = (
  playedCards: Card[],
  leadingCombo: Card[] | null,
  playerHand: Card[],
  trumpInfo: TrumpInfo,
  gameState?: GameState,
  playerId?: PlayerId,
): boolean => {
  // Check for multi-combo attempts
  const playedType = getComboType(playedCards, trumpInfo);

  if (playedType === ComboType.MultiCombo) {
    if (!leadingCombo) {
      // Leading multi-combo validation
      if (!gameState || !playerId) {
        return false; // Need game state and player ID for multi-combo validation
      }

      const multiComboDetection = detectMultiComboAttempt(
        playedCards,
        trumpInfo,
      );
      if (
        !multiComboDetection.isMultiCombo ||
        !multiComboDetection.components ||
        !multiComboDetection.structure
      ) {
        return false;
      }

      // Phase 1: Only allow leading multi-combos from non-trump suits
      if (!isNonTrumpMultiCombo(multiComboDetection.structure)) {
        return false;
      }

      // Validate using memory system and void detection
      const validation = validateLeadingMultiCombo(
        multiComboDetection.components,
        multiComboDetection.structure.suit,
        gameState,
        playerId,
      );

      return validation.isValid;
    } else {
      // Following multi-combo validation
      const leadingType = getComboType(leadingCombo, trumpInfo);

      if (leadingType !== ComboType.MultiCombo) {
        return false; // Can't follow non-multi-combo with multi-combo
      }

      // Get leading multi-combo structure
      const leadingDetection = detectMultiComboAttempt(leadingCombo, trumpInfo);
      if (!leadingDetection.isMultiCombo || !leadingDetection.structure) {
        return false;
      }

      // Validate following multi-combo structure match
      const followingValidation = validateFollowingMultiCombo(
        playedCards,
        leadingDetection.structure,
        playerHand,
        trumpInfo,
      );

      return followingValidation.isValid;
    }
  }

  // If leading combo is multi-combo but played cards are not, check if valid following
  if (leadingCombo) {
    const leadingType = getComboType(leadingCombo, trumpInfo);
    if (leadingType === ComboType.MultiCombo) {
      // Following a multi-combo with non-multi-combo
      // This could be valid if player exhausts suit cards and uses trump/other suits

      // Get leading multi-combo structure for validation
      const leadingDetection = detectMultiComboAttempt(leadingCombo, trumpInfo);
      if (!leadingDetection.isMultiCombo || !leadingDetection.structure) {
        return false;
      }

      // Validate following multi-combo structure match
      const followingValidation = validateFollowingMultiCombo(
        playedCards,
        leadingDetection.structure,
        playerHand,
        trumpInfo,
      );

      return followingValidation.isValid;
    }
  }

  // Fall back to existing validation for non-multi-combo plays
  return isValidPlay(playedCards, leadingCombo, playerHand, trumpInfo);
};
