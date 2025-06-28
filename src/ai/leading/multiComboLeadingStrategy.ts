import { isTrump } from "../../game/cardValue";
import { identifyCombos } from "../../game/comboDetection";
import { analyzeComboStructure } from "../../game/multiComboAnalysis";
import {
  checkOpponentVoidStatus,
  isComboUnbeatable,
} from "../../game/multiComboValidation";
import { Card, GameState, PlayerId, Suit } from "../../types";
import { createCardMemory } from "../aiCardMemory";

/**
 * Multi-Combo Leading Strategy for AI
 *
 * Implements AI selection strategy for multi-combo leading.
 * Uses unbeatable analysis to identify and select optimal multi-combo opportunities.
 */

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
    const structure = analyzeComboStructure(
      mostUnbeatableCards,
      gameState.trumpInfo,
    );

    // Only return if we have multiple component combos (true multi-combo)
    if (structure && structure.combos.length >= 2) {
      // If we have a strong multi-combo structure (pairs or 4+ cards), always play it
      if (
        structure.totalPairs > 0 ||
        structure.totalLength > 3 ||
        structure.totalLength === playerHand.length // last combo
      ) {
        return mostUnbeatableCards;
      }

      // Note: Let's not return weak multi-combos (only singles) unless we have no other options
      // If we have a weak multi-combo (only small singles), decide based on game context
      // const context = createGameContext(gameState, playerId);
      // if (
      //   context.isAttackingTeam ||
      //   context.pointPressure === PointPressure.LOW
      // ) {
      //   return mostUnbeatableCards;
      // }
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
