import {
  Card,
  MixedComboRequirements,
  ComboType,
  Suit,
  TrumpInfo,
} from "../types";
import { identifyCombos } from "./comboDetection";
import { isTrump } from "./gameHelpers";

/**
 * Unified mixed-combo generation system for exhausting scenarios
 * When player can't form required combo type but must follow rules
 * This is the final step - must produce directly playable cards
 */

/**
 * Generate mixed combo following exhausting rules with proper structure priority
 * @param playerHand Player's available cards
 * @param requirements Mixed combo requirements structure
 * @param trumpInfo Trump information
 * @returns Cards to play (guaranteed to be valid and playable)
 */
export function generateMixedCombo(
  playerHand: Card[],
  requirements: MixedComboRequirements,
  trumpInfo: TrumpInfo,
): Card[] {
  const {
    leadComboLength,
    leadSuit,
    leadComboType,
    minimalSameSuitRequirements,
  } = requirements;

  // Determine if we're dealing with trump or regular suit
  const isLeadingTrump = leadSuit === Suit.None; // Trump is represented as Suit.None

  // Get relevant cards (same suit or trump group)
  const relevantCards = isLeadingTrump
    ? playerHand.filter((card) => isTrump(card, trumpInfo))
    : playerHand.filter(
        (card) => card.suit === leadSuit && !isTrump(card, trumpInfo),
      );

  const selectedCards: Card[] = [];

  // Step 1: Apply structure priority for same-suit cards
  if (relevantCards.length > 0) {
    const sameSuitCards = prioritizeStructureCards(
      relevantCards,
      leadComboType,
      minimalSameSuitRequirements,
      trumpInfo,
    );

    // Use ALL relevant cards (exhausting requirement)
    selectedCards.push(...sameSuitCards);
  }

  // Step 2: If we have enough relevant cards, trim to required length
  if (selectedCards.length >= leadComboLength) {
    return selectedCards.slice(0, leadComboLength);
  }

  // Step 3: Fill remaining slots with other cards (trump first, then others)
  const remainingNeeded = leadComboLength - selectedCards.length;
  const usedCards = new Set(selectedCards.map((card) => card.id));
  const otherCards = playerHand.filter((card) => !usedCards.has(card.id));

  // Prioritize trump cards if not leading trump, then other cards
  const trumpCards = otherCards.filter((card) => isTrump(card, trumpInfo));
  const nonTrumpCards = otherCards.filter((card) => !isTrump(card, trumpInfo));

  const fillCards = isLeadingTrump
    ? nonTrumpCards
    : [...trumpCards, ...nonTrumpCards];

  // Add cards to reach required length
  for (let i = 0; i < remainingNeeded && i < fillCards.length; i++) {
    selectedCards.push(fillCards[i]);
  }

  // Must return exactly the required number of cards
  return selectedCards.slice(0, leadComboLength);
}

/**
 * Prioritize same-suit cards based on structure requirements
 * @param sameSuitCards Available cards from the same suit
 * @param leadComboType Type of combo being followed
 * @param requirements Minimal same-suit requirements
 * @param trumpInfo Trump information
 * @returns Prioritized cards (tractors > pairs > singles)
 */
function prioritizeStructureCards(
  sameSuitCards: Card[],
  leadComboType: ComboType,
  requirements: MixedComboRequirements["minimalSameSuitRequirements"],
  trumpInfo: TrumpInfo,
): Card[] {
  const result: Card[] = [];
  const availableCards = [...sameSuitCards];

  // Get all possible combos from same-suit cards
  const combos = identifyCombos(availableCards, trumpInfo);

  // Step 1: Use tractors first (if required or beneficial)
  if (
    leadComboType === ComboType.Tractor ||
    requirements.minTractorCounts > 0
  ) {
    const tractors = combos.filter((combo) => combo.type === ComboType.Tractor);

    for (const tractor of tractors) {
      if (result.length + tractor.cards.length <= sameSuitCards.length) {
        result.push(...tractor.cards);
        // Remove used cards
        tractor.cards.forEach((card) => {
          const index = availableCards.findIndex((c) => c.id === card.id);
          if (index >= 0) availableCards.splice(index, 1);
        });
      }
    }
  }

  // Step 2: Use pairs next (if required or beneficial)
  if (
    leadComboType === ComboType.Pair ||
    leadComboType === ComboType.Tractor ||
    requirements.minPairs > 0
  ) {
    const pairs = combos.filter(
      (combo) =>
        combo.type === ComboType.Pair &&
        combo.cards.every((card) =>
          availableCards.some((available) => available.id === card.id),
        ),
    );

    for (const pair of pairs) {
      if (result.length + pair.cards.length <= sameSuitCards.length) {
        result.push(...pair.cards);
        // Remove used cards
        pair.cards.forEach((card) => {
          const index = availableCards.findIndex((c) => c.id === card.id);
          if (index >= 0) availableCards.splice(index, 1);
        });
      }
    }
  }

  // Step 3: Use remaining singles
  result.push(...availableCards);

  return result;
}

/**
 * Create mixed combo requirements from leading combo information
 * @param leadingCombo The combo being followed
 * @param trumpInfo Trump information
 * @returns Requirements structure for mixed combo generation
 */
export function createMixedComboRequirements(
  leadingCombo: Card[],
  trumpInfo: TrumpInfo,
): MixedComboRequirements {
  // Determine lead suit
  const isLeadingTrump = leadingCombo.some((card) => isTrump(card, trumpInfo));
  const leadSuit = isLeadingTrump
    ? Suit.None // Use None to represent trump group
    : leadingCombo[0].suit;

  // Get combo type and structure
  const combos = identifyCombos(leadingCombo, trumpInfo);
  const leadingComboInfo = combos.find(
    (combo) =>
      combo.cards.length === leadingCombo.length &&
      combo.cards.every((card) =>
        leadingCombo.some((led) => led.id === card.id),
      ),
  );

  const leadComboType = leadingComboInfo?.type || ComboType.Invalid;

  // Set minimal requirements based on combo type
  const minTractorCounts = 0;
  const minTractorLength = 0;
  let minPairs = 0;

  if (leadComboType === ComboType.Tractor) {
    // For tractors, try to use pairs from same suit first
    minPairs = Math.floor(leadingCombo.length / 2);
  } else if (leadComboType === ComboType.Pair) {
    // For pairs, try to use pairs from same suit first
    minPairs = 1;
  }

  return {
    leadComboType,
    leadComboLength: leadingCombo.length,
    leadSuit,
    minimalSameSuitRequirements: {
      minTractorCounts,
      minTractorLength,
      minPairs,
      exhaustAllSameSuit: true, // Always exhaust same suit first
    },
  };
}

/**
 * Validate mixed combo following rules
 * @param playedCards Cards that were played
 * @param playerHand Player's full hand
 * @param requirements Mixed combo requirements
 * @param trumpInfo Trump information
 * @returns True if the played cards follow mixed combo rules properly
 */
export function validateMixedCombo(
  playedCards: Card[],
  playerHand: Card[],
  requirements: MixedComboRequirements,
  trumpInfo: TrumpInfo,
): boolean {
  const { leadComboLength, leadSuit } = requirements;

  // Basic validation: correct length
  if (playedCards.length !== leadComboLength) {
    return false;
  }

  // Basic validation: all cards from player's hand
  const allFromHand = playedCards.every((played) =>
    playerHand.some((handCard) => handCard.id === played.id),
  );
  if (!allFromHand) {
    return false;
  }

  // Check exhaustion rules
  return validateExhaustionRules(playedCards, playerHand, leadSuit, trumpInfo);
}

/**
 * Validate that exhaustion rules are followed properly
 * @param playedCards Cards that were played
 * @param playerHand Player's full hand
 * @param leadSuit The suit being led (or Suit.None for trump)
 * @param trumpInfo Trump information
 * @returns True if exhaustion rules are followed
 */
function validateExhaustionRules(
  playedCards: Card[],
  playerHand: Card[],
  leadSuit: Suit,
  trumpInfo: TrumpInfo,
): boolean {
  const isLeadingTrump = leadSuit === Suit.None;

  // Get relevant cards from player's hand (same suit or trump group)
  const relevantCards = isLeadingTrump
    ? playerHand.filter((card) => isTrump(card, trumpInfo))
    : playerHand.filter(
        (card) => card.suit === leadSuit && !isTrump(card, trumpInfo),
      );

  // Get relevant cards from played cards
  const playedRelevantCards = playedCards.filter((card) =>
    isLeadingTrump
      ? isTrump(card, trumpInfo)
      : card.suit === leadSuit && !isTrump(card, trumpInfo),
  );

  // Rule 1: If player has relevant cards but not enough for full combo,
  // must use ALL relevant cards
  if (relevantCards.length > 0 && relevantCards.length < playedCards.length) {
    // Must use all relevant cards
    const allRelevantUsed = relevantCards.every((relevant) =>
      playedRelevantCards.some((played) => played.id === relevant.id),
    );

    if (!allRelevantUsed) {
      return false;
    }

    // Must use exactly the right number of relevant cards
    if (playedRelevantCards.length !== relevantCards.length) {
      return false;
    }
  }

  // Rule 2: If player has enough relevant cards for full combo,
  // can use any subset but must be from relevant cards first
  if (relevantCards.length >= playedCards.length) {
    // All played cards should be from relevant cards
    const allPlayedFromRelevant = playedCards.every((played) =>
      relevantCards.some((relevant) => relevant.id === played.id),
    );

    return allPlayedFromRelevant;
  }

  // Rule 3: If no relevant cards, any cards are valid
  if (relevantCards.length === 0) {
    return true;
  }

  return true;
}
