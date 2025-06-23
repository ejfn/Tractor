import { compareTrumpMultiCombos } from "../../game/cardComparison";
import { getComboType, identifyCombos } from "../../game/comboDetection";
import { calculateCardStrategicValue, isTrump } from "../../game/gameHelpers";
import { detectLeadingMultiCombo } from "../../game/multiComboDetection";
import { isTeammate } from "../utils/aiHelpers";
import {
  Card,
  Combo,
  ComboType,
  GameState,
  PlayerId,
  Suit,
  Trick,
  TrumpInfo,
} from "../../types";

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
 * Main entry point for multi-combo following decisions using systematic algorithm
 */
export function selectMultiComboFollowingPlay(
  playerHand: Card[],
  gameState: GameState,
  playerId: PlayerId,
  validCombos: Combo[],
): MultiComboFollowingResult | null {
  const { currentTrick, trumpInfo } = gameState;

  if (!currentTrick?.plays?.[0]?.cards) {
    return null; // No leading combo to follow
  }

  const leadingCards = currentTrick.plays[0].cards;

  // Check if leading combo is a multi-combo
  const leadingMultiCombo = detectLeadingMultiCombo(leadingCards, trumpInfo);
  if (!leadingMultiCombo.isMultiCombo) {
    return null; // Not a multi-combo lead, use regular following strategy
  }

  // Execute systematic multi-combo following algorithm
  return executeMultiComboFollowingAlgorithm(
    leadingCards,
    playerHand,
    trumpInfo,
    gameState,
    playerId,
  );
}

/**
 * Execute the systematic multi-combo following algorithm
 */
function executeMultiComboFollowingAlgorithm(
  leadingCards: Card[],
  playerHand: Card[],
  trumpInfo: TrumpInfo,
  gameState: GameState,
  playerId: PlayerId,
): MultiComboFollowingResult {
  const leadingSuit = leadingCards[0]?.suit;
  const isLeadingTrump = leadingCards.some((card) => isTrump(card, trumpInfo));

  // Section A: Same-suit following
  if (!isLeadingTrump) {
    const sameSuitResult = trySameSuitFollowing(
      leadingCards,
      playerHand,
      trumpInfo,
      leadingSuit,
    );
    if (sameSuitResult) {
      return sameSuitResult;
    }
  } else {
    // For trump leads, skip to trump following logic
    const trumpResult = tryTrumpFollowing(
      leadingCards,
      playerHand,
      trumpInfo,
      gameState,
      playerId,
    );
    if (trumpResult) {
      return trumpResult;
    }
  }

  // Section B: Trump following (for non-trump leads)
  if (!isLeadingTrump) {
    const trumpResult = tryTrumpFollowing(
      leadingCards,
      playerHand,
      trumpInfo,
      gameState,
      playerId,
    );
    if (trumpResult) {
      return trumpResult;
    }
  }

  // Section C: Cross-suit disposal/contribution
  return selectCrossSuitDisposal(leadingCards, playerHand, trumpInfo);
}

/**
 * Section A: Same-suit following algorithm
 */
function trySameSuitFollowing(
  leadingCards: Card[],
  playerHand: Card[],
  trumpInfo: TrumpInfo,
  leadingSuit: Suit,
): MultiComboFollowingResult | null {
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
    );
  }

  // A3: If leading has pairs/tractors, do I have enough pairs?
  const leadingAnalysis = analyzeComboStructure(leadingCards, trumpInfo);
  const availableAnalysis = analyzeComboStructure(sameSuitCards, trumpInfo);

  if (
    leadingAnalysis.totalPairs > 0 &&
    availableAnalysis.totalPairs < leadingAnalysis.totalPairs
  ) {
    // Same-suit disposal/contribution
    return selectSameSuitDisposal(sameSuitCards, leadingCards, trumpInfo);
  }

  // A4: If leading has tractors, do I have matching tractors?
  if (
    leadingAnalysis.tractors.length > 0 &&
    !canMatchTractorStructure(
      leadingAnalysis.tractors,
      availableAnalysis.tractors,
    )
  ) {
    // Same-suit disposal/contribution
    return selectSameSuitDisposal(sameSuitCards, leadingCards, trumpInfo);
  }

  // A5: Play matching multi-combo
  return playMatchingMultiCombo(sameSuitCards, leadingCards, trumpInfo, false);
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
): MultiComboFollowingResult | null {
  // B1: Do I have remaining trump cards?
  const trumpCards = playerHand.filter((card) => isTrump(card, trumpInfo));

  if (trumpCards.length === 0) {
    return null; // No trump cards, move to cross-suit disposal
  }

  // B2: Do I have enough trump cards (by comparing length)?
  if (trumpCards.length < leadingCards.length) {
    return null; // Not enough trump cards
  }

  // B3: If leading has pairs/tractors, do I have enough trump pairs?
  const leadingAnalysis = analyzeComboStructure(leadingCards, trumpInfo);
  const trumpAnalysis = analyzeComboStructure(trumpCards, trumpInfo);

  if (
    leadingAnalysis.totalPairs > 0 &&
    trumpAnalysis.totalPairs < leadingAnalysis.totalPairs
  ) {
    return null; // Don't have enough trump pairs
  }

  // B4: If leading has tractors, do I have matching trump tractors?
  if (
    leadingAnalysis.tractors.length > 0 &&
    !canMatchTractorStructure(leadingAnalysis.tractors, trumpAnalysis.tractors)
  ) {
    return null; // Don't have matching trump tractors
  }

  // B5: Strategic decision - trump it, beat existing trump, or dispose
  return makeStrategicTrumpDecision(
    trumpCards,
    leadingCards,
    trumpInfo,
    gameState,
    playerHand,
    playerId,
  );
}

/**
 * Analyze combo structure to count pairs, tractors, and singles
 */
interface ComboStructureAnalysis {
  totalPairs: number;
  tractors: { length: number; pairs: number }[];
  singles: number;
  totalCards: number;
}

function analyzeComboStructure(
  cards: Card[],
  trumpInfo: TrumpInfo,
): ComboStructureAnalysis {
  // For multi-combo structure analysis, we need to identify the actual intended structure
  // without double-counting cards that appear in both pairs and singles

  // First, identify all possible combinations
  const allCombos = identifyCombos(cards, trumpInfo);

  // Filter to get only pairs and tractors (higher priority combinations)
  const pairsAndTractors = allCombos.filter((combo) => {
    const type = getComboType(combo.cards, trumpInfo);
    return type === ComboType.Pair || type === ComboType.Tractor;
  });

  // Track which cards are already used in pairs/tractors
  const usedCardIds = new Set<string>();
  let totalPairs = 0;
  const tractors: { length: number; pairs: number }[] = [];

  // Process pairs and tractors first
  pairsAndTractors.forEach((combo) => {
    const comboType = getComboType(combo.cards, trumpInfo);

    // Only count if none of these cards are already used
    const comboCardIds = combo.cards.map((c) => c.id);
    const hasUsedCard = comboCardIds.some((id) => usedCardIds.has(id));

    if (!hasUsedCard) {
      if (comboType === ComboType.Pair) {
        totalPairs += 1;
        comboCardIds.forEach((id) => usedCardIds.add(id));
      } else if (comboType === ComboType.Tractor) {
        const pairCount = combo.cards.length / 2;
        totalPairs += pairCount;
        tractors.push({ length: combo.cards.length, pairs: pairCount });
        comboCardIds.forEach((id) => usedCardIds.add(id));
      }
    }
  });

  // Count remaining cards as singles
  const remainingCards = cards.filter((card) => !usedCardIds.has(card.id));
  const singles = remainingCards.length;

  return {
    totalPairs,
    tractors,
    singles,
    totalCards: cards.length,
  };
}

/**
 * Check if available tractors can match required tractor structure
 */
function canMatchTractorStructure(
  requiredTractors: { length: number; pairs: number }[],
  availableTractors: { length: number; pairs: number }[],
): boolean {
  // Calculate total pairs required and available
  const totalRequiredPairs = requiredTractors.reduce(
    (sum, tractor) => sum + tractor.pairs,
    0,
  );
  const totalAvailablePairs = availableTractors.reduce(
    (sum, tractor) => sum + tractor.pairs,
    0,
  );

  // Check if we have enough pairs total
  if (totalAvailablePairs < totalRequiredPairs) {
    return false;
  }

  // Check if longest available tractor can match longest required tractor
  if (requiredTractors.length > 0 && availableTractors.length > 0) {
    const longestRequiredLength = Math.max(
      ...requiredTractors.map((t) => t.length),
    );
    const longestAvailableLength = Math.max(
      ...availableTractors.map((t) => t.length),
    );

    if (longestAvailableLength < longestRequiredLength) {
      return false;
    }
  }

  return true;
}

/**
 * A2: Use all remaining cards + cross-suit fill
 */
function createAllRemainingAndFillResponse(
  sameSuitCards: Card[],
  playerHand: Card[],
  leadingCards: Card[],
  trumpInfo: TrumpInfo,
): MultiComboFollowingResult {
  const remainingNeeded = leadingCards.length - sameSuitCards.length;
  const otherCards = playerHand.filter(
    (card) => !sameSuitCards.some((same) => same.id === card.id),
  );

  // Sort other cards by strategic value (lowest first for disposal)
  const sortedOthers = otherCards.sort(
    (a, b) =>
      calculateCardStrategicValue(a, trumpInfo, "strategic") -
      calculateCardStrategicValue(b, trumpInfo, "strategic"),
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
): MultiComboFollowingResult {
  // Find available combinations, prioritizing tractors and pairs
  const availableCombos = identifyCombos(sameSuitCards, trumpInfo);

  // Sort combos by priority: tractors first, then pairs, then singles
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
        sum + calculateCardStrategicValue(card, trumpInfo, "strategic"),
      0,
    );
    const bValue = b.cards.reduce(
      (sum, card) =>
        sum + calculateCardStrategicValue(card, trumpInfo, "strategic"),
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
        calculateCardStrategicValue(a, trumpInfo, "strategic") -
        calculateCardStrategicValue(b, trumpInfo, "strategic"),
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
): MultiComboFollowingResult {
  // Find best matching combination that mirrors the leading structure
  const combos = identifyCombos(availableCards, trumpInfo);

  // Select combinations that best match the leading structure
  const selectedCards = selectBestMatchingCombination(
    combos,
    leadingCards,
    trumpInfo,
  );

  const canBeat =
    isTrump || canBeatLeadingCombo(selectedCards, leadingCards, trumpInfo);

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
  playerId: PlayerId,
): MultiComboFollowingResult {
  // Check if there's already a trump response to beat
  const currentWinner = getCurrentWinningCombo(gameState.currentTrick);
  const isCurrentWinnerTrump = currentWinner.some((card) =>
    isTrump(card, trumpInfo),
  );

  // Get current winning player for teammate analysis
  const currentWinningPlayerId =
    gameState.currentTrick?.winningPlayerId ||
    gameState.currentTrick?.plays?.[0]?.playerId;

  const isTeammateWinning =
    currentWinningPlayerId &&
    isTeammate(gameState, playerId, currentWinningPlayerId);

  // Early return: Don't trump if teammate is winning
  if (isTeammateWinning) {
    return selectCrossSuitDisposal(leadingCards, playerHand, trumpInfo);
  }

  // Opponent is winning - handle trump vs non-trump scenarios
  if (isCurrentWinnerTrump) {
    // Opponent is winning with trump - try to beat them
    const trumpResponse = selectOptimalTrumpBeatingCards(
      trumpCards,
      leadingCards,
      trumpInfo,
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
    return selectCrossSuitDisposal(leadingCards, playerHand, trumpInfo);
  } else {
    // Opponent is winning with non-trump - trump to beat them
    return playMatchingMultiCombo(trumpCards, leadingCards, trumpInfo, true);
  }
}

/**
 * Section C: Cross-suit disposal/contribution
 */
function selectCrossSuitDisposal(
  leadingCards: Card[],
  playerHand: Card[],
  trumpInfo: TrumpInfo,
): MultiComboFollowingResult {
  // Sort all cards by strategic value (lowest first for disposal)
  const sortedCards = playerHand.sort(
    (a, b) =>
      calculateCardStrategicValue(a, trumpInfo, "strategic") -
      calculateCardStrategicValue(b, trumpInfo, "strategic"),
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
  availableCombos: Combo[],
  leadingCards: Card[],
  trumpInfo: TrumpInfo,
): Card[] {
  // Analyze the leading structure to understand what we need to match
  const leadingAnalysis = analyzeComboStructure(leadingCards, trumpInfo);

  // For structure matching, we need to select specific combinations that match the lead
  return selectStructureMatchingCards(
    availableCombos,
    leadingAnalysis,
    trumpInfo,
  );
}

/**
 * Select cards to match the exact structure of the leading combo
 * IMPORTANT: This function prioritizes strategic value when multiple options exist
 */
function selectStructureMatchingCards(
  availableCombos: Combo[],
  leadingAnalysis: ComboStructureAnalysis,
  trumpInfo: TrumpInfo,
  _prioritizeLowest: boolean = false, // true for trump beating, false for same-suit
): Card[] {
  const selectedCards: Card[] = [];
  const usedCardIds = new Set<string>();

  // Sort function for strategic value
  const sortByStrategicValue = (a: Combo, b: Combo) => {
    const aValue = a.cards.reduce(
      (sum, card) =>
        sum + calculateCardStrategicValue(card, trumpInfo, "strategic"),
      0,
    );
    const bValue = b.cards.reduce(
      (sum, card) =>
        sum + calculateCardStrategicValue(card, trumpInfo, "strategic"),
      0,
    );
    // For trump beating, use lowest value; for same-suit disposal, use lowest value too
    return aValue - bValue;
  };

  // Filter and sort combos by type and strategic value
  const availableTractors = availableCombos
    .filter(
      (combo) => getComboType(combo.cards, trumpInfo) === ComboType.Tractor,
    )
    .sort(sortByStrategicValue);

  const availablePairs = availableCombos
    .filter((combo) => getComboType(combo.cards, trumpInfo) === ComboType.Pair)
    .sort(sortByStrategicValue);

  const availableSingles = availableCombos
    .filter(
      (combo) => getComboType(combo.cards, trumpInfo) === ComboType.Single,
    )
    .sort(sortByStrategicValue);

  // 1. Match tractors first (if leading has tractors)
  for (const requiredTractor of leadingAnalysis.tractors) {
    // Find the best matching tractor (lowest strategic value)
    const matchingTractor = availableTractors.find((tractor) => {
      const tractorCards = tractor.cards.map((c) => c.id);
      const hasUsedCard = tractorCards.some((id) => usedCardIds.has(id));
      return !hasUsedCard && tractor.cards.length >= requiredTractor.length;
    });

    if (matchingTractor) {
      selectedCards.push(...matchingTractor.cards);
      matchingTractor.cards.forEach((card) => usedCardIds.add(card.id));
    }
  }

  // 2. Match remaining pairs (total pairs - pairs already used in tractors)
  const remainingPairsNeeded =
    leadingAnalysis.totalPairs -
    leadingAnalysis.tractors.reduce((sum, t) => sum + t.pairs, 0);
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
  const remainingSinglesNeeded = leadingAnalysis.singles;
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

  // 3. If leading combo contains pairs or tractors, does trump contain same amount of pairs?
  if (leadingAnalysis.totalPairs > 0) {
    if (trumpAnalysis.totalPairs < leadingAnalysis.totalPairs) {
      return false; // Can't beat - not enough trump pairs
    }
  }

  // 4. If leading combo contains tractors, does trump contain same number of tractors with same length?
  if (leadingAnalysis.tractors.length > 0) {
    if (
      !canMatchTractorStructure(
        leadingAnalysis.tractors,
        trumpAnalysis.tractors,
      )
    ) {
      return false; // Can't beat - can't match tractor structure
    }
  }

  // 5. true (can beat) - trump with matching structure always beats non-trump
  return true;
}

/**
 * Select optimal trump cards for beating - prioritizes tractors, pairs, then singles
 * Uses HIGHEST strategic values for trump vs trump comparisons
 */
function selectOptimalTrumpBeatingCards(
  availableCards: Card[],
  leadingCards: Card[],
  trumpInfo: TrumpInfo,
): Card[] {
  // Find available combinations, prioritizing tractors and pairs
  const availableCombos = identifyCombos(availableCards, trumpInfo);

  // Sort combos by priority: tractors first, then pairs, then singles
  // BUT use HIGHEST values for trump beating (opposite of disposal)
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

    // Within same type, use HIGHEST strategic value for trump beating
    const aValue = a.cards.reduce(
      (sum, card) =>
        sum + calculateCardStrategicValue(card, trumpInfo, "strategic"),
      0,
    );
    const bValue = b.cards.reduce(
      (sum, card) =>
        sum + calculateCardStrategicValue(card, trumpInfo, "strategic"),
      0,
    );
    return bValue - aValue; // Higher value first for trump beating
  });

  // Select combinations to fill the required length, avoiding card reuse
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

  // If we still need more cards, add individual singles by HIGHEST value
  if (remainingNeeded > 0) {
    const usedCardIds = new Set(responseCards.map((card) => card.id));
    const unusedCards = availableCards.filter(
      (card) => !usedCardIds.has(card.id),
    );
    const sortedUnused = unusedCards.sort(
      (a, b) =>
        calculateCardStrategicValue(b, trumpInfo, "strategic") -
        calculateCardStrategicValue(a, trumpInfo, "strategic"),
    );

    responseCards.push(...sortedUnused.slice(0, remainingNeeded));
  }

  return responseCards.slice(0, leadingCards.length); // Ensure exact length
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
