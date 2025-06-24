import {
  Card,
  ComboType,
  GameState,
  MultiCombo,
  PlayerId,
  Suit,
  TrumpInfo,
} from "../types";
import { MultiComboValidation } from "../types/combinations";
import { gameLogger } from "../utils/gameLogger";
import {
  checkSameSuitPairPreservation,
  checkTractorFollowingPriority,
  getComboType,
  identifyCombos,
} from "./comboDetection";
import { isTrump } from "./gameHelpers";
import {
  analyzeComboStructure,
  detectLeadingMultiCombo,
} from "./multiComboAnalysis";
import { validateLeadingMultiCombo } from "./multiComboValidation";

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
  leadingMultiCombo: MultiCombo,
  playerHand: Card[],
  trumpInfo: TrumpInfo,
): boolean => {
  // Step 1: Basic length check
  if (playedCards.length !== leadingMultiCombo.totalLength) {
    return false;
  }

  // Step 2: Leading multi-combos are always non-trump
  // For now, we'll determine the suit from the first combo's cards
  const leadingSuit =
    leadingMultiCombo.combos.length > 0
      ? leadingMultiCombo.combos[0].cards[0]?.suit
      : undefined;
  if (leadingSuit === undefined) {
    throw new Error("Leading suit not determined from structure");
  }

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
    leadingMultiCombo,
    trumpInfo,
    leadingSuit,
  );
};

// Anti-cheat validation: Check if player used best possible structure
const validateAntiCheatStructure = (
  playedCards: Card[],
  playerHand: Card[],
  leadingMultiCombo: MultiCombo,
  trumpInfo: TrumpInfo,
  leadingSuit: Suit,
): boolean => {
  // Get leading combo requirements
  const requiredTotalPairs = leadingMultiCombo.totalPairs;
  const requiredTractorPairs = leadingMultiCombo.totalTractorPairs;

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

  // Check if analysis succeeded
  if (!playedStructure || !bestPossibleStructure) {
    return true; // If analysis fails, allow the play
  }

  // Compute tractor pairs from structure
  const playedTractorPairs =
    playedStructure.tractorSizes?.reduce((sum, size) => sum + size, 0) || 0;
  const bestPossibleTractorPairs =
    bestPossibleStructure.tractorSizes?.reduce((sum, size) => sum + size, 0) ||
    0;

  // TWO-STAGE VALIDATION: Check total pairs first, then tractor pairs
  if (
    playedStructure.totalPairs >= requiredTotalPairs &&
    playedTractorPairs >= requiredTractorPairs
  ) {
    return true;
  }

  // ANTI-CHEAT: Check if player could have played more pairs
  if (playedStructure.totalPairs < requiredTotalPairs) {
    // Could player have played more total pairs?
    if (bestPossibleStructure.totalPairs > playedStructure.totalPairs) {
      return false; // Player hiding/breaking pairs - INVALID
    }
  }

  // Check tractor pairs specifically
  if (playedTractorPairs < requiredTractorPairs) {
    // Could player have played more tractor pairs?
    if (bestPossibleTractorPairs > playedTractorPairs) {
      return false; // Player hiding/breaking tractor pairs - INVALID
    }
  }

  return true; // Player used best possible structure - VALID
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

  // DEBUG: Log validation attempt
  gameLogger.debug(
    "play_validation_attempt",
    {
      playerId,
      playedCards: playedCards.map((c) => c.getDisplayName()),
      playerHandSize: playerHand.length,
      leadingCombo: leadingCombo?.map((c) => c.getDisplayName()) || null,
      trumpInfo,
    },
    `Validating play for ${playerId}: ${playedCards.map((c) => c.getDisplayName()).join(", ")}`,
  );

  // If no leading combo, any valid combo is acceptable (including multi-combo)
  if (!leadingCombo) {
    // STEP 1: Try getComboType first - handles all straight combos
    const comboType = getComboType(playedCards, trumpInfo);

    if (comboType !== ComboType.Invalid) {
      // It's a valid straight combo (Single, Pair, Tractor)
      return true;
    }

    // STEP 2: Only if Invalid, check for multi-combo
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

    // STEP 3: Not a valid combo or multi-combo
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
    if (!leadingDetection.components) {
      return false;
    }

    return validateMultiComboFollowing(
      playedCards,
      leadingDetection.components,
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

  // DEBUG: Log relevant cards analysis
  gameLogger.debug(
    "play_validation_relevant_cards_analysis",
    {
      playerId,
      leadingSuit,
      isLeadingTrump,
      leadingType,
      playedType,
      relevantCards: relevantCards.map((c) => c.getDisplayName()),
      relevantCardsCount: relevantCards.length,
      leadingComboLength: leadingCombo.length,
      playerHandSize: playerHand.length,
    },
    `Relevant cards: ${relevantCards.length} cards, leading type: ${leadingType}, played type: ${playedType}`,
  );

  // (combo types already declared above for multi-combo validation)

  // UNIFIED: Check if player can form matching combo in relevant suit
  const canFormMatchingCombo = relevantCards.length >= leadingCombo.length;

  if (canFormMatchingCombo) {
    const relevantCombos = identifyCombos(relevantCards, trumpInfo);

    // DEBUG: Log identified combos
    gameLogger.debug(
      "play_validation_relevant_combos",
      {
        playerId,
        relevantCombosCount: relevantCombos.length,
        relevantCombos: relevantCombos.map((combo) => ({
          type: combo.type,
          cards: combo.cards.map((c) => c.getDisplayName()),
          length: combo.cards.length,
        })),
        lookingForType: leadingType,
        lookingForLength: leadingCombo.length,
      },
      `Found ${relevantCombos.length} combos from relevant cards`,
    );

    const hasMatchingCombo = relevantCombos.some(
      (combo) =>
        combo.type === leadingType &&
        combo.cards.length === leadingCombo.length,
    );

    // DEBUG: Log matching combo check
    gameLogger.debug(
      "play_validation_matching_check",
      {
        playerId,
        hasMatchingCombo,
        playedType,
        leadingType,
        shouldReject: hasMatchingCombo && playedType !== leadingType,
      },
      `Has matching combo: ${hasMatchingCombo}, played type matches: ${playedType === leadingType}`,
    );

    // If player can form matching combo but didn't use it, invalid
    if (hasMatchingCombo && playedType !== leadingType) {
      gameLogger.debug(
        "play_validation_rejected_type_mismatch",
        { playerId },
        `REJECTED: Player has matching combo but played wrong type`,
      );
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
 * Validate if selected cards form a valid multi-combo lead
 * Can be used for both human and AI validation
 * @param selectedCards Cards selected for multi-combo lead
 * @param gameState Current game state
 * @param playerId Player attempting the multi-combo
 * @returns Validation result with detailed reasoning
 */
export function validateMultiComboLead(
  selectedCards: Card[],
  gameState: GameState,
  playerId: PlayerId,
): MultiComboValidation {
  const validation: MultiComboValidation = {
    isValid: false,
    invalidReasons: [],
    voidStatus: {
      allOpponentsVoid: false,
      voidPlayers: [],
    },
    unbeatableStatus: {
      allUnbeatable: false,
      beatableComponents: [],
    },
  };

  // IMPORTANT: This function should ONLY be called for confirmed multi-combos!
  // detectLeadingMultiCombo() should have already verified this is a multi-combo
  // Do NOT call getComboType() here - it's for straight combos only!

  // Step 1: Check if all cards are non-trump
  const hasAnyTrump = selectedCards.some((card) =>
    isTrump(card, gameState.trumpInfo),
  );
  if (hasAnyTrump) {
    validation.invalidReasons.push(
      "Trump multi-combos not allowed for leading",
    );
    return validation;
  }

  // Step 3: Check if all cards are same suit
  const suits = new Set(selectedCards.map((card) => card.suit));
  if (suits.size !== 1) {
    validation.invalidReasons.push("Multi-combo must be same suit");
    return validation;
  }

  const suit = selectedCards[0].suit;

  // Step 4: Analyze component combos
  const components =
    analyzeComboStructure(selectedCards, gameState.trumpInfo, true)?.combos ||
    [];
  if (components.length === 0) {
    validation.invalidReasons.push("No valid component combos found");
    return validation;
  }

  // Step 5: Check each component combo for unbeatability using shared detection
  const result = validateLeadingMultiCombo(
    components,
    suit,
    gameState,
    playerId,
  );
  return result;
}
