import {
  Card,
  Combo,
  ComboType,
  GameContext,
  GameState,
  PlayerId,
  TrumpInfo,
} from "../../types";
import { gameLogger } from "../../utils/gameLogger";
import {
  selectCardsByStrategicValue,
  selectComboByStrategicValue,
} from "./strategicSelection";
import { SuitAvailabilityResult } from "./suitAvailabilityAnalysis";
import { shouldContributeToTeammate } from "./teammateAnalysis";

/**
 * Same Suit Decision Module
 *
 * Handles the enough_remaining scenario where players have cards in the leading suit
 * but cannot form proper combos. Pure same-suit decision making.
 */

/**
 * Handle enough remaining scenario - SAME-SUIT decision
 *
 * Player has cards in the leading suit but cannot form proper combos.
 * Strategy:
 * 1. Try to form the best possible combo structure (pairs, tractors) first
 * 2. Use shouldContribute decision to choose between contributing vs disposing
 * 3. Fill to required length with remaining same-suit cards
 */
export function handleEnoughRemainingScenario(
  analysis: SuitAvailabilityResult,
  context: GameContext,
  trumpInfo: TrumpInfo,
  gameState: GameState,
  currentPlayerId: PlayerId,
): Card[] {
  if (!analysis.remainingCards || analysis.remainingCards.length === 0) {
    gameLogger.warn("following_no_remaining_cards", {
      player: currentPlayerId,
    });
    return [];
  }

  gameLogger.debug("following_enough_remaining_analysis", {
    player: currentPlayerId,
    remainingCount: analysis.remainingCards.length,
    requiredLength: analysis.requiredLength,
    leadingComboType: analysis.leadingComboType,
    trickPoints: context.trickWinnerAnalysis?.trickPoints ?? 0,
  });

  // Decision: Should contribute to teammate or dispose?
  const shouldContribute = shouldContributeToTeammate(
    context,
    gameState,
    currentPlayerId,
  );

  // Try to form best combo structure first
  const selectedCards = selectBestComboStructure(
    analysis.remainingCards,
    analysis.leadingComboType,
    analysis.requiredLength,
    trumpInfo,
    shouldContribute,
  );

  gameLogger.debug("following_enough_remaining_result", {
    player: currentPlayerId,
    shouldContribute,
    reason: shouldContribute
      ? "teammate_winning_and_safe"
      : "strategic_disposal",
    selectedCards: selectedCards.map((c) => c.toString()),
  });

  return selectedCards;
}

// =============== HELPER FUNCTIONS ===============

/**
 * Select best combo structure from same-suit cards
 *
 * Strategy:
 * 1. Calculate required pairs from leading combo type
 * 2. Select pairs first to meet pair requirements
 * 3. Fill the rest with remaining cards to meet length requirement
 */
function selectBestComboStructure(
  remainingCards: Card[],
  leadingComboType: ComboType,
  requiredLength: number,
  trumpInfo: TrumpInfo,
  shouldContribute: boolean,
): Card[] {
  // Calculate how many pairs we need based on leading combo type and length
  const requiredPairs = getRequiredPairs(leadingComboType, requiredLength);

  const selectedCards: Card[] = [];
  let availableCards = [...remainingCards];

  // Step 1: Select required pairs first
  if (requiredPairs > 0) {
    const allPairCombos = findAllPairs(availableCards);

    if (allPairCombos.length > 0) {
      const bestPairCards = selectComboByStrategicValue(
        allPairCombos,
        trumpInfo,
        shouldContribute ? "contribute" : "strategic",
        "lowest",
        requiredPairs,
      );

      selectedCards.push(...bestPairCards);

      // Remove used cards from available pool
      availableCards = availableCards.filter(
        (card) => !bestPairCards.some((used) => used.id === card.id),
      );
    }
  }

  // Step 2: Fill remaining length with unused cards
  const shortfall = requiredLength - selectedCards.length;
  if (shortfall > 0) {
    const fillCards = selectCardsByStrategicValue(
      availableCards,
      trumpInfo,
      shouldContribute ? "contribute" : "strategic",
      "lowest",
      shortfall,
    );
    selectedCards.push(...fillCards);
  }

  return selectedCards;
}

/**
 * Get number of pairs required based on leading combo type and length
 */
function getRequiredPairs(
  leadingComboType: ComboType,
  requiredLength: number,
): number {
  switch (leadingComboType) {
    case ComboType.Pair:
      return 1;
    case ComboType.Tractor:
      return Math.floor(requiredLength / 2); // Tractor pairs = length / 2
    default:
      return 0; // Singles don't require pairs
  }
}

/**
 * Find all possible pairs from available cards and return as Combo objects
 */
function findAllPairs(cards: Card[]): Combo[] {
  // Group cards by commonId
  const commonIdGroups = new Map<string, Card[]>();
  cards.forEach((card) => {
    const key = card.commonId;
    if (!commonIdGroups.has(key)) {
      commonIdGroups.set(key, []);
    }
    commonIdGroups.get(key)?.push(card);
  });

  // Create Combo objects for each pair
  const pairCombos: Combo[] = [];
  commonIdGroups.forEach((group) => {
    if (group.length >= 2) {
      pairCombos.push({
        type: ComboType.Pair,
        cards: [group[0], group[1]],
        value: 0, // Will be calculated by strategic value functions
      });
    }
  });

  return pairCombos;
}
