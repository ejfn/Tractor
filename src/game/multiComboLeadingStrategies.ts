import { createCardMemory } from "../ai/aiCardMemory";
import { Card, GameState, PlayerId, Suit } from "../types";
import { MultiComboValidation } from "../types/combinations";
import { identifyCombos } from "./comboDetection";
import { isTrump } from "./gameHelpers";
import {
  analyzeMultiComboComponents,
  getMultiComboStructure,
} from "./multiComboAnalysis";
import {
  checkOpponentVoidStatus,
  isComboUnbeatable,
  validateLeadingMultiCombo,
} from "./multiComboValidation";

/**
 * Multi-Combo Leading Strategies Module
 *
 * Implements both human validation tool and AI selection strategy for multi-combo leading.
 */

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
  const components = analyzeMultiComboComponents(
    selectedCards,
    gameState.trumpInfo,
  );
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

/**
 * AI Selection Strategy: Find and select multi-combo from unbeatable cards
 * @param playerHand Player's current hand
 * @param gameState Current game state
 * @param playerId Player attempting to lead
 * @returns Selected cards for multi-combo or null if none found
 */
export function selectAIMultiComboLead(
  playerHand: Card[],
  gameState: GameState,
  playerId: PlayerId,
): Card[] | null {
  // IMPORTANT: This function should ONLY return results for true unbeatable multi-combo scenarios
  // It should NOT interfere with normal leading logic (pairs, singles, etc.)

  let mostUnbeatableCards: Card[] = [];

  // Check each non-trump suit for unbeatable multi-combo opportunities
  for (const suit of [Suit.Hearts, Suit.Diamonds, Suit.Clubs, Suit.Spades]) {
    if (suit === gameState.trumpInfo.trumpSuit) continue; // Skip trump suit

    // Use proper unbeatable analysis instead of simple void check
    const unbeatableCards = getAllUnbeatableCardsInSuit(
      suit,
      playerHand,
      gameState,
      playerId,
    );

    // Select suit with most unbeatable cards total count
    if (unbeatableCards.length > mostUnbeatableCards.length) {
      mostUnbeatableCards = unbeatableCards;
    }
  }

  // Analyze structure to ensure we have a valid multi-combo (multiple components)
  if (mostUnbeatableCards.length > 1) {
    const components = analyzeMultiComboComponents(
      mostUnbeatableCards,
      gameState.trumpInfo,
    );

    // Only return if we have multiple component combos (true multi-combo)
    if (components.length >= 2) {
      const suit = mostUnbeatableCards[0].suit;
      const structure = getMultiComboStructure(components, suit, true);

      // If we have a strong multi-combo structure (pairs or 4+ cards), always play it
      if (
        structure.components.totalPairs > 0 ||
        structure.components.totalLength > 3 ||
        structure.components.totalLength === playerHand.length // last combo
      ) {
        return mostUnbeatableCards;
      }

      // If we have a weak multi-combo (only small singles), determine by game stage and role
      let weakComboChance = 0;
      const cardsLeft = playerHand.length;

      if (cardsLeft > 18) {
        weakComboChance = 1;
      } else if (cardsLeft > 12) {
        weakComboChance = 0.7;
      } else if (cardsLeft > 6) {
        weakComboChance = 0.5;
      } else {
        weakComboChance = 0.2;
      }

      if (Math.random() < weakComboChance) {
        return mostUnbeatableCards;
      }
    }
  }

  return null;
}

/**
 * Get all unbeatable cards in a specific suit for AI analysis
 * @param suit Target suit
 * @param playerHand Player's hand
 * @param gameState Current game state
 * @param playerId Player ID
 * @returns All unbeatable cards in the suit
 */
function getAllUnbeatableCardsInSuit(
  suit: Suit,
  playerHand: Card[],
  gameState: GameState,
  playerId: PlayerId,
): Card[] {
  // Get all cards in this suit from player's hand
  const suitCards = playerHand.filter(
    (card) => card.suit === suit && !isTrump(card, gameState.trumpInfo),
  );

  if (suitCards.length === 0) {
    return [];
  }

  // Check if all other players are void - if so, ALL cards are unbeatable
  const voidStatus = checkOpponentVoidStatus(suit, gameState, playerId);
  if (voidStatus.allOpponentsVoid) {
    return suitCards; // All cards unbeatable
  }

  // Otherwise, check each combo individually
  const allCombos = identifyCombos(suitCards, gameState.trumpInfo);
  const unbeatableCards: Card[] = [];

  // Determine if current player can see kitty cards
  const currentPlayerIndex = gameState.players.findIndex(
    (p) => p.id === playerId,
  );
  const isRoundStarter =
    currentPlayerIndex === gameState.roundStartingPlayerIndex;
  const visibleKittyCards = isRoundStarter ? gameState.kittyCards : [];

  for (const combo of allCombos) {
    const memory = createCardMemory(gameState);
    const isUnbeatable = isComboUnbeatable(
      combo,
      suit,
      memory.playedCards,
      playerHand,
      gameState.trumpInfo,
      visibleKittyCards,
    );

    if (isUnbeatable) {
      unbeatableCards.push(...combo.cards);
    }
  }

  // Remove duplicates (cards can be in multiple combos)
  const uniqueCards = Array.from(
    new Map(unbeatableCards.map((card) => [card.id, card])).values(),
  );

  return uniqueCards;
}
