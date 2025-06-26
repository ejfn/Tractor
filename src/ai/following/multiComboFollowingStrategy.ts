import { compareTrumpMultiCombos } from "../../game/cardComparison";
import { calculateCardStrategicValue, isTrump } from "../../game/cardValue";
import { getComboType, identifyCombos } from "../../game/comboDetection";
import {
  analyzeComboStructure,
  matchesRequiredComponents,
} from "../../game/multiComboAnalysis";
import {
  Card,
  Combo,
  ComboType,
  GameContext,
  GameState,
  MultiCombo,
  PlayerId,
  Trick,
  TrickPosition,
  TrumpInfo,
} from "../../types";
import { createGameContext } from "../aiGameContext";

/**
 * Multi-Combo Following Strategy for AI
 *
 * Implements systematic multi-combo following algorithm:
 * Section A: Same-suit following (availability → length → pairs → tractors)
 * Section B: Trump following (availability → length → pairs → tractors → strategy)
 * Section C: Cross-suit disposal/contribution
 */

export interface MultiComboFollowingResult {
  cards: Card[];
  strategy: "same_suit_match" | "trump_beat" | "disposal" | "no_valid_response";
  reasoning: string;
  canBeat: boolean;
}

/**
 * Execute the systematic multi-combo following algorithm
 */
export function executeMultiComboFollowingAlgorithm(
  leadingCards: Card[],
  playerHand: Card[],
  gameState: GameState,
  playerId: PlayerId,
): MultiComboFollowingResult {
  const trumpInfo = gameState.trumpInfo;
  const context = createGameContext(gameState, playerId);

  // Multi-combo leads are always non-trump, so we follow the standard flow:
  const hasAnyTrump = leadingCards.some((card) => isTrump(card, trumpInfo));
  if (hasAnyTrump) {
    throw new Error("Multi-combo leads cannot contain trump cards");
  }

  // Section A: Same-suit following
  const sameSuitResult = trySameSuitFollowing(
    leadingCards,
    playerHand,
    trumpInfo,
    context,
  );
  if (sameSuitResult) {
    return sameSuitResult;
  }

  // Section B: Trump following (when void in led suit)
  const trumpResult = tryTrumpFollowing(
    leadingCards,
    playerHand,
    trumpInfo,
    gameState,
    playerId,
    context,
  );
  if (trumpResult) {
    return trumpResult;
  }

  // Section C: Cross-suit disposal/contribution
  return selectCrossSuitDisposal(leadingCards, playerHand, trumpInfo, context);
}

/**
 * Generic function to find matching multi-combo from available cards
 * Used by both same-suit and trump following logic
 */
function findMatchingMultiCombo(
  leadingCards: Card[],
  availableCards: Card[],
  trumpInfo: TrumpInfo,
  isTrumpResponse: boolean,
): MultiComboFollowingResult | null {
  // Check if we have enough cards (by comparing length)
  if (availableCards.length < leadingCards.length) {
    return null; // Not enough cards
  }

  // Analyze structure requirements
  const leadingAnalysis = analyzeComboStructure(leadingCards, trumpInfo);
  const availableAnalysis = analyzeComboStructure(availableCards, trumpInfo);

  // Check if analysis succeeded
  if (!leadingAnalysis || !availableAnalysis) {
    return null; // Analysis failed
  }

  // Check if we can match the required structure
  // Same-suit responses: Must match structure exactly (strict rule compliance)
  // Trump responses: More flexible structure matching allowed because:
  //   - Trump responses only need to match total length, not exact structure
  //   - Strategic trump decisions handled later by makeStrategicTrumpDecision
  if (!isTrumpResponse) {
    if (!matchesRequiredComponents(availableAnalysis, leadingAnalysis)) {
      return null; // Cannot match structure requirements for same-suit response
    }
  }

  // Can match structure - create matching multi-combo
  return playMatchingMultiCombo(
    availableCards,
    leadingCards,
    trumpInfo,
    isTrumpResponse,
    true,
  );
}

/**
 * Section A: Same-suit following algorithm
 */
function trySameSuitFollowing(
  leadingCards: Card[],
  playerHand: Card[],
  trumpInfo: TrumpInfo,
  context: GameContext,
): MultiComboFollowingResult | null {
  const leadingSuit = leadingCards[0]?.suit;
  // A1: Do I have remaining cards in the led suit?
  const sameSuitCards = playerHand.filter(
    (card) => card.suit === leadingSuit && !isTrump(card, trumpInfo),
  );

  if (sameSuitCards.length === 0) {
    return null; // No same-suit cards, move to Section B
  }

  // A2: Do I have enough cards (by comparing length)?
  if (sameSuitCards.length < leadingCards.length) {
    // Use all remaining cards + cross-suit fill
    return createAllRemainingAndFillResponse(
      sameSuitCards,
      playerHand,
      leadingCards,
      trumpInfo,
      context,
    );
  }

  // A3-A5: Try to find matching multi-combo
  const matchingResult = findMatchingMultiCombo(
    leadingCards,
    sameSuitCards,
    trumpInfo,
    false, // Not trump response
  );

  if (matchingResult) {
    return matchingResult;
  }

  // Cannot match structure - use same-suit disposal
  return selectSameSuitDisposal(
    sameSuitCards,
    leadingCards,
    trumpInfo,
    context,
  );
}

/**
 * Section B: Trump following algorithm
 */
function tryTrumpFollowing(
  leadingCards: Card[],
  playerHand: Card[],
  trumpInfo: TrumpInfo,
  gameState: GameState,
  playerId: PlayerId,
  context: GameContext,
): MultiComboFollowingResult | null {
  // B1: Do I have remaining trump cards?
  const trumpCards = playerHand.filter((card) => isTrump(card, trumpInfo));

  if (trumpCards.length < leadingCards.length) {
    return null; // No enough trump cards, move to cross-suit disposal
  }

  // B2-B4: Try to find matching trump multi-combo
  const matchingResult = findMatchingMultiCombo(
    leadingCards,
    trumpCards,
    trumpInfo,
    true, // Trump response
  );

  if (!matchingResult) {
    return null; // Cannot match structure with trump cards
  }

  // B5: Strategic decision - trump it, beat existing trump, or dispose
  return makeStrategicTrumpDecision(
    trumpCards,
    leadingCards,
    trumpInfo,
    gameState,
    playerHand,
    playerId,
    context,
  );
}

/**
 * A2: Use all remaining cards + cross-suit fill
 */
function createAllRemainingAndFillResponse(
  sameSuitCards: Card[],
  playerHand: Card[],
  leadingCards: Card[],
  trumpInfo: TrumpInfo,
  context: GameContext,
): MultiComboFollowingResult {
  const remainingNeeded = leadingCards.length - sameSuitCards.length;
  const otherCards = playerHand.filter(
    (card) => !sameSuitCards.some((same) => same.id === card.id),
  );

  // Sort other cards by strategic value (lowest first for disposal)
  const sortingValue =
    context.trickWinnerAnalysis?.isTeammateWinning &&
    !context.memoryContext?.nextPlayerVoidLed
      ? "contribute"
      : "strategic";
  const sortedOthers = otherCards.sort(
    (a, b) =>
      calculateCardStrategicValue(a, trumpInfo, sortingValue) -
      calculateCardStrategicValue(b, trumpInfo, sortingValue),
  );

  const fillCards = sortedOthers.slice(0, remainingNeeded);
  const responseCards = [...sameSuitCards, ...fillCards];

  return {
    cards: responseCards,
    strategy: "same_suit_match",
    reasoning: `Using all ${sameSuitCards.length} same-suit cards + ${fillCards.length} fill cards`,
    canBeat: false,
  };
}

/**
 * A5 & A3: Same-suit disposal/contribution
 * IMPORTANT: Still prioritize using tractors/pairs first, then fill with singles
 */
function selectSameSuitDisposal(
  sameSuitCards: Card[],
  leadingCards: Card[],
  trumpInfo: TrumpInfo,
  context: GameContext,
): MultiComboFollowingResult {
  // Find available combinations, prioritizing tractors and pairs
  const availableCombos = identifyCombos(sameSuitCards, trumpInfo);

  // Sort combos by priority: tractors first, then pairs, then singles
  const sortingValue =
    context.trickWinnerAnalysis?.isTeammateWinning &&
    !context.memoryContext?.nextPlayerVoidLed
      ? "contribute"
      : "strategic";
  const sortedCombos = availableCombos.sort((a, b) => {
    const aType = getComboType(a.cards, trumpInfo);
    const bType = getComboType(b.cards, trumpInfo);

    // Priority: Tractor > Pair > Single
    const getPriority = (type: ComboType) => {
      if (type === ComboType.Tractor) return 3;
      if (type === ComboType.Pair) return 2;
      return 1; // Singles
    };

    const priorityDiff = getPriority(aType) - getPriority(bType);
    if (priorityDiff !== 0) return -priorityDiff; // Higher priority first

    // Within same type, use lowest strategic value

    const aValue = a.cards.reduce(
      (sum, card) =>
        sum + calculateCardStrategicValue(card, trumpInfo, sortingValue),
      0,
    );
    const bValue = b.cards.reduce(
      (sum, card) =>
        sum + calculateCardStrategicValue(card, trumpInfo, sortingValue),
      0,
    );
    return aValue - bValue; // Lower value first
  });

  // Select combinations to fill the required length
  const responseCards: Card[] = [];
  const usedCardIds = new Set<string>();
  let remainingNeeded = leadingCards.length;

  for (const combo of sortedCombos) {
    if (remainingNeeded <= 0) break;

    // Check if any cards in this combo are already used
    const comboCardIds = combo.cards.map((card) => card.id);
    const hasUsedCard = comboCardIds.some((id) => usedCardIds.has(id));

    if (!hasUsedCard && combo.cards.length <= remainingNeeded) {
      responseCards.push(...combo.cards);
      comboCardIds.forEach((id) => usedCardIds.add(id));
      remainingNeeded -= combo.cards.length;
    }
  }

  // If we still need more cards, add individual singles by lowest value
  if (remainingNeeded > 0) {
    const usedCardIds = new Set(responseCards.map((card) => card.id));
    const unusedCards = sameSuitCards.filter(
      (card) => !usedCardIds.has(card.id),
    );

    const sortedUnused = unusedCards.sort(
      (a, b) =>
        calculateCardStrategicValue(a, trumpInfo, sortingValue) -
        calculateCardStrategicValue(b, trumpInfo, sortingValue),
    );

    const additionalCards = sortedUnused.slice(0, remainingNeeded);
    responseCards.push(...additionalCards);
  }

  const finalCards = responseCards.slice(0, leadingCards.length);

  return {
    cards: finalCards, // Ensure exact length
    strategy: "same_suit_match",
    reasoning: `Same-suit disposal: using available tractors/pairs first, then lowest singles`,
    canBeat: false,
  };
}

/**
 * A4: Play matching multi-combo
 */
function playMatchingMultiCombo(
  availableCards: Card[],
  leadingCards: Card[],
  trumpInfo: TrumpInfo,
  isTrump: boolean,
  conservationMode: boolean,
): MultiComboFollowingResult {
  // Select combinations that best match the leading structure
  const selectedCards = selectBestMatchingCombination(
    availableCards,
    leadingCards,
    trumpInfo,
    isTrump,
    conservationMode,
  );

  const canBeat =
    isTrump && canBeatLeadingCombo(selectedCards, leadingCards, trumpInfo);

  return {
    cards: selectedCards,
    strategy: isTrump ? "trump_beat" : "same_suit_match",
    reasoning: `Playing matching ${isTrump ? "trump " : ""}multi-combo structure`,
    canBeat,
  };
}

/**
 * B5: Strategic trump decision
 */
function makeStrategicTrumpDecision(
  trumpCards: Card[],
  leadingCards: Card[],
  trumpInfo: TrumpInfo,
  gameState: GameState,
  playerHand: Card[],
  _playerId: PlayerId,
  context: GameContext,
): MultiComboFollowingResult {
  // Check if there's already a trump response to beat
  const currentWinner = getCurrentWinningCombo(gameState.currentTrick);
  const isCurrentWinnerTrump = currentWinner.some((card) =>
    isTrump(card, trumpInfo),
  );

  // Early return: Don't trump if teammate is winning
  if (
    context.trickWinnerAnalysis?.isTeammateWinning &&
    !context.memoryContext?.nextPlayerVoidLed
  ) {
    return selectCrossSuitDisposal(
      leadingCards,
      playerHand,
      trumpInfo,
      context,
    );
  }

  // Opponent is winning - handle trump vs non-trump scenarios
  if (isCurrentWinnerTrump) {
    // Opponent is winning with trump - try to beat them
    const trumpResponse = selectBestMatchingCombination(
      trumpCards,
      leadingCards,
      trumpInfo,
      true,
      false,
    );

    // Two-step check for beating existing trump:
    // 1. Can trump response beat original leading combo? (structure matching)
    const canBeatLeading = canBeatLeadingCombo(
      trumpResponse,
      leadingCards,
      trumpInfo,
    );
    if (canBeatLeading) {
      // 2. Can this trump response beat the previous trump? (strength comparison)
      const canBeatPreviousTrump = compareTrumpMultiCombos(
        trumpResponse,
        currentWinner,
        trumpInfo,
        leadingCards, // Pass leading combo to constrain comparison
      );
      if (canBeatPreviousTrump) {
        // Beat existing trump using the selected trump response
        return {
          cards: trumpResponse,
          strategy: "trump_beat",
          reasoning: `Trump vs trump: using highest trump combos to beat opponent's trump response`,
          canBeat: true,
        };
      }
    }
    // Cannot beat existing trump, use cross-suit disposal
    return selectCrossSuitDisposal(
      leadingCards,
      playerHand,
      trumpInfo,
      context,
    );
  } else {
    // Opponent is winning with non-trump - trump to beat them with conservation
    return playMatchingMultiCombo(
      trumpCards,
      leadingCards,
      trumpInfo,
      true,
      true,
    );
  }
}

/**
 * Section C: Cross-suit disposal/contribution
 */
function selectCrossSuitDisposal(
  leadingCards: Card[],
  playerHand: Card[],
  trumpInfo: TrumpInfo,
  context: GameContext,
): MultiComboFollowingResult {
  const sortingValue =
    context.trickWinnerAnalysis?.isTeammateWinning &&
    (!context.memoryContext?.nextPlayerVoidLed ||
      context.trickPosition === TrickPosition.Fourth)
      ? "contribute"
      : "strategic";

  // Sort all cards by strategic value (lowest first for disposal)
  const sortedCards = playerHand.sort(
    (a, b) =>
      calculateCardStrategicValue(a, trumpInfo, sortingValue) -
      calculateCardStrategicValue(b, trumpInfo, sortingValue),
  );

  const responseCards = sortedCards.slice(0, leadingCards.length);

  return {
    cards: responseCards,
    strategy: "disposal",
    reasoning: `Cross-suit disposal: playing ${responseCards.length} lowest value cards`,
    canBeat: false,
  };
}

/**
 * Helper function to select best matching combination from available combos
 * IMPORTANT: This function should match the STRUCTURE of the leading combo
 */
function selectBestMatchingCombination(
  availableCards: Card[],
  leadingCards: Card[],
  trumpInfo: TrumpInfo,
  isTrumpResponse: boolean,
  conservationMode: boolean,
): Card[] {
  // Analyze the leading structure to understand what we need to match
  const leadingAnalysis = analyzeComboStructure(leadingCards, trumpInfo);

  // This should not be null in normal flow - multi-combo is already validated
  if (!leadingAnalysis) {
    throw new Error(
      "analyzeComboStructure returned null for validated multi-combo",
    );
  }

  const availableCombos = identifyCombos(availableCards, trumpInfo);

  // For structure matching, we need to select specific combinations that match the lead
  return selectStructureMatchingCards(
    availableCombos,
    leadingAnalysis,
    trumpInfo,
    isTrumpResponse,
    conservationMode,
  );
}

/**
 * Select cards to match the exact structure of the leading combo
 * IMPORTANT: This function prioritizes strategic value when multiple options exist
 */
function selectStructureMatchingCards(
  availableCombos: Combo[],
  leadingAnalysis: MultiCombo,
  trumpInfo: TrumpInfo,
  isTrumpResponse: boolean,
  conservationMode: boolean,
): Card[] {
  const selectedCards: Card[] = [];
  const usedCardIds = new Set<string>();

  // Sort function for strategic value (lowest first)
  const sortByStrategicValue = (a: Combo, b: Combo) => {
    const aValue = a.cards.reduce(
      (sum, card) =>
        sum + calculateCardStrategicValue(card, trumpInfo, "basic"),
      0,
    );
    const bValue = b.cards.reduce(
      (sum, card) =>
        sum + calculateCardStrategicValue(card, trumpInfo, "basic"),
      0,
    );
    return aValue - bValue;
  };

  // Helper function to move highest value combo to front for optimal trump usage
  const moveHighestToFront = (combos: Combo[]) => {
    if (combos.length > 0) {
      const highest = combos.pop(); // Remove last item (highest value)
      if (highest) {
        combos.unshift(highest); // Add to front
      }
    }
  };

  // Filter and sort combos by type and strategic value (always lowest first)
  const availableTractors = availableCombos
    .filter(
      (combo) => getComboType(combo.cards, trumpInfo) === ComboType.Tractor,
    )
    .sort(sortByStrategicValue);

  // For trump responses, move highest tractor to front (optimal trump usage)
  if (isTrumpResponse && !conservationMode && leadingAnalysis.tractors > 0) {
    moveHighestToFront(availableTractors);
  }

  const availablePairs = availableCombos
    .filter((combo) => getComboType(combo.cards, trumpInfo) === ComboType.Pair)
    .sort(sortByStrategicValue);

  // For trump responses to pair leads, move highest pair to front
  if (
    isTrumpResponse &&
    !conservationMode &&
    leadingAnalysis.tractors === 0 &&
    leadingAnalysis.totalPairs > 0
  ) {
    moveHighestToFront(availablePairs);
  }

  const availableSingles = availableCombos
    .filter(
      (combo) => getComboType(combo.cards, trumpInfo) === ComboType.Single,
    )
    .sort(sortByStrategicValue);

  // For trump responses to single leads, move highest single to front
  if (
    isTrumpResponse &&
    !conservationMode &&
    leadingAnalysis.tractors === 0 &&
    leadingAnalysis.totalPairs === 0
  ) {
    moveHighestToFront(availableSingles);
  }

  // 1. Match tractors first (if leading has tractors)
  let tractorsNeeded = leadingAnalysis.tractors;
  for (const tractor of availableTractors) {
    if (tractorsNeeded <= 0) break;

    const tractorCards = tractor.cards.map((c) => c.id);
    const hasUsedCard = tractorCards.some((id) => usedCardIds.has(id));

    if (!hasUsedCard) {
      selectedCards.push(...tractor.cards);
      tractor.cards.forEach((card) => usedCardIds.add(card.id));
      tractorsNeeded--;
    }
  }

  // 2. Match remaining pairs (total pairs - pairs already used in tractors)
  const remainingPairsNeeded =
    leadingAnalysis.totalPairs - leadingAnalysis.totalTractorPairs;
  let pairsSelected = 0;

  for (const pair of availablePairs) {
    if (pairsSelected >= remainingPairsNeeded) break;

    const pairCards = pair.cards.map((c) => c.id);
    const hasUsedCard = pairCards.some((id) => usedCardIds.has(id));

    if (!hasUsedCard) {
      selectedCards.push(...pair.cards);
      pair.cards.forEach((card) => usedCardIds.add(card.id));
      pairsSelected++;
    }
  }

  // 3. Fill remaining with singles (lowest strategic value first)
  const remainingSinglesNeeded =
    leadingAnalysis.totalLength - selectedCards.length;
  let singlesSelected = 0;

  for (const single of availableSingles) {
    if (singlesSelected >= remainingSinglesNeeded) break;

    const singleCard = single.cards[0];
    if (!usedCardIds.has(singleCard.id)) {
      selectedCards.push(singleCard);
      usedCardIds.add(singleCard.id);
      singlesSelected++;
    }
  }

  return selectedCards;
}

/**
 * Check if trump cards can beat leading combo (trump vs non-trump structure matching)
 */
function canBeatLeadingCombo(
  responseCards: Card[],
  leadingCards: Card[],
  trumpInfo: TrumpInfo,
): boolean {
  // 1. All trump? no -> false (can't beat), yes -> next
  const allTrump = responseCards.every((card) => isTrump(card, trumpInfo));
  if (!allTrump) {
    return false;
  }

  // 2. Same length? no -> false (can't beat)
  if (responseCards.length !== leadingCards.length) {
    return false;
  }

  // Analyze structure of both combos
  const leadingAnalysis = analyzeComboStructure(leadingCards, trumpInfo);
  const trumpAnalysis = analyzeComboStructure(responseCards, trumpInfo);

  // Check if analysis succeeded
  if (!leadingAnalysis || !trumpAnalysis) {
    return false; // Analysis failed
  }

  // 3. Check if trump cards can match the required structure
  if (!matchesRequiredComponents(trumpAnalysis, leadingAnalysis)) {
    return false; // Can't beat - can't match structure requirements
  }

  // 4. true (can beat) - trump with matching structure always beats non-trump
  return true;
}

/**
 * Get current winning combo from trick
 */
function getCurrentWinningCombo(trickData: Trick | null): Card[] {
  if (!trickData?.winningPlayerId) {
    return trickData?.plays?.[0]?.cards || [];
  }

  const winningPlay = trickData.plays?.find(
    (play) => play.playerId === trickData.winningPlayerId,
  );
  return winningPlay ? winningPlay.cards : trickData.plays?.[0]?.cards || [];
}
