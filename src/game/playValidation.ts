import {
  Card,
  ComboType,
  GameState,
  MultiComboComponents,
  MultiComboStructure,
  PlayerId,
  Suit,
  TrumpInfo,
} from "../types";
import { gameLogger } from "../utils/gameLogger";
import {
  checkSameSuitPairPreservation,
  checkTractorFollowingPriority,
  getComboType,
  identifyCombos,
} from "./comboDetection";
import { isTrump } from "./gameHelpers";
import { detectLeadingMultiCombo } from "./multiComboDetection";
import { validateMultiComboLead } from "./multiComboLeadingStrategies";

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

// Count total pairs in a combo (including pairs within tractors) - Algorithm Flow Diagram compliance
const countPairsInCombo = (cards: Card[], trumpInfo: TrumpInfo): number => {
  const combos = identifyCombos(cards, trumpInfo);
  let totalPairs = 0;

  combos.forEach((combo) => {
    if (combo.type === ComboType.Pair) {
      totalPairs += 1;
    } else if (combo.type === ComboType.Tractor) {
      totalPairs += combo.cards.length / 2; // Each tractor contributes multiple pairs
    }
  });

  return totalPairs;
};

// Check pair requirements according to Algorithm Flow Diagram (Section A3)
const checkAlgorithmFlowPairRequirements = (
  leadingCards: Card[],
  sameSuitCards: Card[],
  trumpInfo: TrumpInfo,
): boolean => {
  const leadingPairCount = countPairsInCombo(leadingCards, trumpInfo);
  const availablePairCount = countPairsInCombo(sameSuitCards, trumpInfo);

  // If leading has pairs and we don't have enough pairs, we can't properly follow
  if (leadingPairCount > 0 && availablePairCount < leadingPairCount) {
    return false; // Should use sameSuitDisposalOrContribution instead
  }

  return true; // Pair requirements satisfied
};

// Backward validation for multi-combo following
const validateMultiComboFollowingBackward = (
  playedCards: Card[],
  leadingStructure: MultiComboStructure,
  playerHand: Card[],
  trumpInfo: TrumpInfo,
): boolean => {
  // Step 1: Basic length check
  if (playedCards.length !== leadingStructure.components.totalLength) {
    return false;
  }

  // Step 2: Determine relevant suit and cards
  const leadingSuit = leadingStructure.suit;
  const isLeadingTrump = leadingStructure.suit === Suit.None; // Suit.None represents trump multi-combos

  // Get remaining relevant cards (what player still has)
  const relevantSuitCards = isLeadingTrump
    ? playerHand.filter((card) => isTrump(card, trumpInfo))
    : playerHand.filter(
        (card) => card.suit === leadingSuit && !isTrump(card, trumpInfo),
      );

  // Step 3: EXHAUSTION CHECK - If suit is emptied → ALWAYS VALID
  if (relevantSuitCards.length === 0) {
    return true;
  }

  // Step 4: STRUCTURE ANALYSIS - Check if played cards meet requirements
  const playedStructure = analyzePlayedStructure(playedCards, trumpInfo);
  const requiredStructure = leadingStructure.components;

  // Step 5: If requirements already met → Valid
  if (structureMeetsRequirements(playedStructure, requiredStructure)) {
    return true;
  }

  // Step 6: Check if better structure was possible with total available cards
  const couldFormBetter = analyzeRemainingCardPotential(
    relevantSuitCards,
    playedCards,
    requiredStructure,
    trumpInfo,
  );

  // If better was possible → Invalid, otherwise valid (best effort)
  return !couldFormBetter.canFormBetter;
};

// Analyze the structure of played cards
const analyzePlayedStructure = (
  playedCards: Card[],
  trumpInfo: TrumpInfo,
): MultiComboComponents => {
  const combos = identifyCombos(playedCards, trumpInfo);

  let totalPairs = 0;
  let tractorCount = 0;
  const tractorSizes: number[] = [];

  combos.forEach((combo) => {
    if (combo.type === ComboType.Pair) {
      totalPairs += 1; // Each pair combo contributes 1 pair
    } else if (combo.type === ComboType.Tractor) {
      tractorCount++;
      const tractorPairCount = combo.cards.length / 2;
      totalPairs += tractorPairCount;
      tractorSizes.push(tractorPairCount); // Track tractor length in pairs
    }
    // Singles are implicit: totalLength - (totalPairs * 2)
  });

  return {
    totalLength: playedCards.length,
    totalPairs, // Total number of pairs across all combos
    tractors: tractorCount,
    tractorSizes, // Array of tractor lengths (in pairs)
  };
};

// Check if played structure meets requirements
const structureMeetsRequirements = (
  played: MultiComboComponents,
  required: MultiComboComponents,
): boolean => {
  // Check basic requirements
  if (
    played.totalPairs < required.totalPairs ||
    played.tractors < required.tractors ||
    played.totalLength !== required.totalLength
  ) {
    return false;
  }

  // Check tractor lengths if specified
  if (required.tractorSizes && required.tractorSizes.length > 0) {
    if (!played.tractorSizes || played.tractorSizes.length === 0) {
      return false; // Required tractors but played none
    }

    // Sort both arrays to compare properly
    const playedLengths = [...played.tractorSizes].sort((a, b) => b - a);
    const requiredLengths = [...required.tractorSizes].sort((a, b) => b - a);

    // Each required tractor length must be matched or exceeded
    for (let i = 0; i < requiredLengths.length; i++) {
      if (i >= playedLengths.length || playedLengths[i] < requiredLengths[i]) {
        return false;
      }
    }
  }

  return true;
};

// Analyze if better structure was possible
const analyzeRemainingCardPotential = (
  remainingCards: Card[],
  playedCards: Card[],
  requiredStructure: MultiComboComponents,
  trumpInfo: TrumpInfo,
) => {
  // Check what was actually played first
  const playedStructure = analyzePlayedStructure(playedCards, trumpInfo);

  // If requirements already met, no need to check alternatives
  if (structureMeetsRequirements(playedStructure, requiredStructure)) {
    return { canFormBetter: false };
  }

  // Check if better structure was possible with total available cards
  const totalAvailable = [...playedCards, ...remainingCards];
  const bestPossible = findBestPossibleStructure(
    totalAvailable,
    requiredStructure,
    trumpInfo,
  );

  // Compare if best possible is better than what was played
  if (betterThanPlayed(bestPossible, playedStructure, requiredStructure)) {
    return { canFormBetter: true };
  }

  return { canFormBetter: false };
};

// Find best possible structure from available cards
const findBestPossibleStructure = (
  availableCards: Card[],
  required: MultiComboComponents,
  trumpInfo: TrumpInfo,
): MultiComboComponents => {
  const allCombos = identifyCombos(availableCards, trumpInfo);

  // Try to form the required structure
  let totalPairs = 0;
  let tractorCount = 0;

  // First try to satisfy tractors
  const tractorCombos = allCombos.filter(
    (combo) => combo.type === ComboType.Tractor,
  );
  tractorCount = Math.min(tractorCombos.length, required.tractors || 0);

  // Then try to satisfy pairs (including pairs from tractors)
  const pairCombos = allCombos.filter((combo) => combo.type === ComboType.Pair);

  // Calculate total pairs from tractors
  for (let i = 0; i < tractorCount && i < tractorCombos.length; i++) {
    const tractorLength = tractorCombos[i].cards.length;
    totalPairs += tractorLength / 2; // Each tractor contributes multiple pairs
  }

  // Add standalone pairs
  const standalonePairs = Math.min(
    pairCombos.length,
    Math.max(0, required.totalPairs - totalPairs),
  );
  totalPairs += standalonePairs;

  return {
    totalLength: required.totalLength,
    totalPairs, // Total pairs across all combinations
    tractors: tractorCount,
    tractorSizes: tractorCombos
      .slice(0, tractorCount)
      .map((combo) => combo.cards.length / 2), // Track selected tractor lengths
  };
};

// Check if one structure is better than another for the requirements
const betterThanPlayed = (
  bestPossible: MultiComboComponents,
  played: MultiComboComponents,
  required: MultiComboComponents,
): boolean => {
  // If best possible meets requirements but played doesn't
  const bestMeetsReqs = structureMeetsRequirements(bestPossible, required);
  const playedMeetsReqs = structureMeetsRequirements(played, required);

  return bestMeetsReqs && !playedMeetsReqs;
};

/**
 * Check if a play is valid following Shengji rules
 * This function is extracted to avoid circular dependencies between
 * playProcessing.ts and combinationGeneration.ts
 */
export const isValidPlay = (
  playedCards: Card[],
  playerHand: Card[],
  playerId: PlayerId,
  gameState: GameState,
): boolean => {
  const trumpInfo = gameState.trumpInfo;
  const leadingCombo =
    gameState.currentTrick && gameState.currentTrick.plays.length > 0
      ? gameState.currentTrick.plays[0].cards
      : null;

  // If no leading combo, any valid combo is acceptable (including multi-combo)
  if (!leadingCombo) {
    // Check for leading multi-combo using contextual detection
    const multiComboDetection = detectLeadingMultiCombo(playedCards, trumpInfo);

    if (multiComboDetection.isMultiCombo) {
      gameLogger.debug(
        "multi_combo_lead",
        {
          playerId,
          cardCount: playedCards.length,
        },
        `Player ${playerId} leading multi-combo with ${playedCards.length} cards`,
      );

      // Use comprehensive validation for multi-combo leads
      const validation = validateMultiComboLead(
        playedCards,
        gameState,
        playerId,
      );

      return validation.isValid;
    }

    // Standard combo validation
    const combos = identifyCombos(playerHand, trumpInfo);
    return combos.some(
      (combo) =>
        combo.cards.length === playedCards.length &&
        combo.cards.every((card) =>
          playedCards.some((played) => played.id === card.id),
        ),
    );
  }

  // Get combo types for following validation
  const leadingType = getComboType(leadingCombo, trumpInfo);
  const playedType = getComboType(playedCards, trumpInfo);

  // Multi-combo following validation
  const leadingDetection =
    leadingType === ComboType.Invalid
      ? detectLeadingMultiCombo(leadingCombo, trumpInfo)
      : { isMultiCombo: false };

  if (leadingDetection.isMultiCombo) {
    // Following a multi-combo - use backward validation approach
    if (!leadingDetection.structure) {
      return false;
    }

    return validateMultiComboFollowingBackward(
      playedCards,
      leadingDetection.structure,
      playerHand,
      trumpInfo,
    );
  }

  // Note: Exhausting scenarios with multi-combo patterns are handled by the hierarchical
  // following logic below, not blocked as invalid multi-combo usage.

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

  // (combo types already declared above for multi-combo validation)

  // UNIFIED: Check if player can form matching combo in relevant suit
  const canFormMatchingCombo = relevantCards.length >= leadingCombo.length;

  if (canFormMatchingCombo) {
    // Apply Algorithm Flow Diagram pair requirements check
    if (
      !checkAlgorithmFlowPairRequirements(
        leadingCombo,
        relevantCards,
        trumpInfo,
      )
    ) {
      return false; // Not enough pairs to properly follow
    }

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
