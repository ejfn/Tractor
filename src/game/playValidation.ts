import {
  Card,
  ComboType,
  GameState,
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
import { analyzeMultiComboComponents } from "./multiComboAnalysis";
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

// Validation for multi-combo following
export const validateMultiComboFollowing = (
  playedCards: Card[],
  leadingStructure: MultiComboStructure,
  playerHand: Card[],
  trumpInfo: TrumpInfo,
): boolean => {
  // Step 1: Basic length check
  if (playedCards.length !== leadingStructure.components.totalLength) {
    return false;
  }

  // Step 2: Leading multi-combos are always non-trump
  const leadingSuit = leadingStructure.suit;

  // Get remaining cards in the leading suit after this play
  const remainingRelevantCards = playerHand.filter(
    (card) =>
      !playedCards.some((played) => played.id === card.id) &&
      card.suit === leadingSuit &&
      !isTrump(card, trumpInfo),
  );

  // Step 3: EXHAUSTION CHECK - If player is void in leading suit AFTER the play → ALWAYS VALID
  // This is the fundamental exhaustion rule in Tractor/Shengji
  if (remainingRelevantCards.length === 0) {
    return true; // Player exhausted the leading suit - always valid regardless of structure
  }

  // Step 4: ANTI-CHEAT VALIDATION - Check if player used best possible structure
  return validateAntiCheatStructure(
    playedCards,
    playerHand,
    leadingStructure,
    trumpInfo,
    leadingSuit,
  );
};

// Anti-cheat validation: Check if player used best possible structure
const validateAntiCheatStructure = (
  playedCards: Card[],
  playerHand: Card[],
  leadingStructure: MultiComboStructure,
  trumpInfo: TrumpInfo,
  leadingSuit: Suit,
): boolean => {
  // Get leading combo requirements
  const requiredTractors = leadingStructure.components.tractors;
  const requiredPairs = leadingStructure.components.totalPairs;

  // Filter relevant cards from player's hand (leading is always non-trump)
  const allRelevantCards = playerHand.filter(
    (card) => card.suit === leadingSuit && !isTrump(card, trumpInfo),
  );

  // Analyze what player actually played from relevant suit
  const playedRelevantCards = playedCards.filter((card) =>
    allRelevantCards.some((relevant) => relevant.id === card.id),
  );
  const playedStructure = analyzeComboStructure(playedRelevantCards, trumpInfo);

  // Analyze best possible structure from all relevant cards
  const bestPossibleStructure = analyzeComboStructure(
    allRelevantCards,
    trumpInfo,
  );

  // Anti-cheat checks following the algorithm

  // EARLY SUCCESS: If player meets or exceeds requirements, they're valid
  if (
    playedStructure.totalPairs >= requiredPairs &&
    playedStructure.tractors >= requiredTractors
  ) {
    // Also check tractor lengths when tractors are present
    if (playedStructure.tractors > 0 && requiredTractors > 0) {
      const requiredLengths = leadingStructure.components.tractorSizes || [];
      const playedLengths = playedStructure.tractorSizes || [];

      // Check if tractor lengths are adequate
      if (!matchesTractorLengths(playedLengths, requiredLengths)) {
        // Tractor lengths inadequate - continue to anti-cheat validation
      } else {
        // Player met all requirements including tractor lengths
        return true;
      }
    } else {
      // No tractors required or played - structure requirements met
      return true;
    }
  }

  // 1) Check pairs: Did player play enough pairs?
  if (playedStructure.totalPairs < requiredPairs) {
    // Could player have played more pairs?
    if (bestPossibleStructure.totalPairs > playedStructure.totalPairs) {
      return false; // Player hiding/breaking pairs - INVALID
    }
    // Genuine shortage - continue to tractor check
  }

  // 2) Check tractors: Did player play enough tractors?
  if (playedStructure.tractors < requiredTractors) {
    // Could player have played more tractors?
    if (bestPossibleStructure.tractors > playedStructure.tractors) {
      return false; // Player hiding/breaking tractors - INVALID
    }
    // Genuine shortage - continue to length check
  }

  // 3) Check tractor lengths: Are tractor lengths optimal?
  if (playedStructure.tractors > 0 && requiredTractors > 0) {
    const requiredLengths = leadingStructure.components.tractorSizes || [];
    const playedLengths = playedStructure.tractorSizes || [];
    const bestPossibleLengths = bestPossibleStructure.tractorSizes || [];

    // Sort lengths in descending order for comparison
    const sortedRequired = [...requiredLengths].sort((a, b) => b - a);
    const sortedPlayed = [...playedLengths].sort((a, b) => b - a);
    const sortedBestPossible = [...bestPossibleLengths].sort((a, b) => b - a);

    // Check if player could use longer tractors
    for (let i = 0; i < sortedRequired.length; i++) {
      if (
        i < sortedBestPossible.length &&
        i < sortedPlayed.length &&
        sortedBestPossible[i] > sortedPlayed[i]
      ) {
        return false; // Using shorter tractors when longer available - INVALID
      }
    }
  }

  return true; // Player used best possible structure - VALID
};

// Analyze the structure of combo cards to get counts
const analyzeComboStructure = (
  cards: Card[],
  trumpInfo: TrumpInfo,
): { totalPairs: number; tractors: number; tractorSizes: number[] } => {
  // Use optimal decomposition to avoid counting overlapping combinations
  const optimalCombos = analyzeMultiComboComponents(cards, trumpInfo);

  let totalPairs = 0;
  let tractorCount = 0;
  const tractorSizes: number[] = [];

  optimalCombos.forEach((combo) => {
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
    totalPairs, // Total number of pairs across all combos (non-overlapping)
    tractors: tractorCount,
    tractorSizes, // Array of tractor lengths (in pairs)
  };
};

// Helper function to check if tractor lengths match requirements
const matchesTractorLengths = (
  playedLengths: number[],
  requiredLengths: number[],
): boolean => {
  // If no tractors required, any played tractors are acceptable
  if (requiredLengths.length === 0) {
    return true;
  }

  // If tractors required but none played, doesn't match
  if (playedLengths.length === 0) {
    return false;
  }

  // Sort lengths in descending order for comparison (longest first)
  const sortedPlayed = [...playedLengths].sort((a, b) => b - a);
  const sortedRequired = [...requiredLengths].sort((a, b) => b - a);

  // Must have at least as many tractors as required
  if (sortedPlayed.length < sortedRequired.length) {
    return false;
  }

  // Each played tractor must be at least as long as the corresponding required tractor
  for (let i = 0; i < sortedRequired.length; i++) {
    if (sortedPlayed[i] < sortedRequired[i]) {
      return false;
    }
  }

  return true;
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
    const hasExactCombo = combos.some(
      (combo) =>
        combo.cards.length === playedCards.length &&
        combo.cards.every((card) =>
          playedCards.some((played) => played.id === card.id),
        ),
    );

    if (hasExactCombo) {
      return true;
    }

    // TRACTOR RULE: Allow leading multiple singles from same suit (exhausting scenarios)
    // BUT cards must be genuinely different (no identical cards allowed)
    const allFromPlayerHand = playedCards.every((played) =>
      playerHand.some((handCard) => handCard.id === played.id),
    );

    if (!allFromPlayerHand) {
      return false;
    }

    // Check for duplicate ranks - this is NEVER allowed in Tractor
    const rankCounts = new Map<string, number>();
    playedCards.forEach((card) => {
      const rankKey = `${card.rank}-${card.suit}`;
      rankCounts.set(rankKey, (rankCounts.get(rankKey) || 0) + 1);
    });

    // If any rank appears more than twice, it's invalid (max pair)
    for (const count of rankCounts.values()) {
      if (count > 2) {
        return false; // Invalid: more than 2 of same rank+suit (e.g., 9♣, 9♣, 9♣)
      }
    }

    // Group played cards by suit
    const nonTrumpPlayedCards = playedCards.filter(
      (card) => !isTrump(card, trumpInfo),
    );
    const trumpPlayedCards = playedCards.filter((card) =>
      isTrump(card, trumpInfo),
    );

    // Case 1: All non-trump cards from same suit (allow multiple singles/pairs)
    if (
      nonTrumpPlayedCards.length === playedCards.length &&
      nonTrumpPlayedCards.length > 1
    ) {
      const firstSuit = nonTrumpPlayedCards[0].suit;
      const allSameSuit = nonTrumpPlayedCards.every(
        (card) => card.suit === firstSuit,
      );

      if (allSameSuit) {
        // Valid: Multiple different cards from same non-trump suit (exhausting scenario)
        return true;
      }
    }

    // Case 2: All trump cards (allow trump exhausting)
    if (
      trumpPlayedCards.length === playedCards.length &&
      trumpPlayedCards.length > 1
    ) {
      // Valid: Multiple different trump cards (trump exhausting scenario)
      return true;
    }

    // Case 3: Single card (always valid if from hand)
    if (playedCards.length === 1) {
      return true;
    }

    return false;
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
    // Following a multi-combo - delegate to the dedicated validation function
    if (!leadingDetection.structure) {
      return false;
    }

    return validateMultiComboFollowing(
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
