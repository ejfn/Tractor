import { Card, GameState } from "../types";
import { getValidCombinations } from "../game/gameLogic";
import { createAIStrategy } from "./aiStrategy";

/**
 * Main AI player logic - selects cards to play for a given AI player
 *
 * This function handles:
 * - Card combination generation from player's hand
 * - Valid play filtering based on current trick rules
 * - Strategy delegation to sophisticated 4-phase AI system
 *
 * @param gameState Current game state
 * @param playerId ID of the AI player making the move
 * @returns Array of cards to play
 */
export const getAIMove = (gameState: GameState, playerId: string): Card[] => {
  const player = gameState.players.find((p) => p.id === playerId);
  if (!player) {
    throw new Error(`AI player with ID ${playerId} not found`);
  }

  // Get all valid combinations using the centralized game logic
  const validCombos = getValidCombinations(player.hand, gameState);

  // Handle edge cases gracefully (empty hand, insufficient cards, etc.)
  if (validCombos.length === 0) {
    // Fallback for edge cases: return what cards we have (may be empty)
    if (player.hand.length === 0) {
      return []; // No cards to play
    }

    // If we have cards but no valid combos, there might be an issue with our logic
    // For now, return single cards as emergency fallback
    console.warn(
      `No valid combinations found for AI player ${playerId}, falling back to emergency play`,
    );

    // Return up to the required number of cards, or all cards if fewer available
    const requiredLength = gameState.currentTrick?.leadingCombo?.length || 1;
    const cardsToPlay = Math.min(requiredLength, player.hand.length);
    return player.hand.slice(0, cardsToPlay);
  }

  // Delegate all strategic decisions to the AI strategy layer
  const strategy = createAIStrategy();
  return strategy.makePlay(gameState, player, validCombos);
};

/**
 * AI trump declaration decision logic
 *
 * Determines whether an AI player should declare trump during the dealing phase
 * based on hand strength and suit distribution
 *
 * @param gameState Current game state
 * @param playerId ID of the AI player making the decision
 * @returns True if should declare trump, false otherwise
 */
export const shouldAIDeclare = (
  gameState: GameState,
  playerId: string,
): boolean => {
  const player = gameState.players.find((p) => p.id === playerId);
  if (!player) {
    throw new Error(`AI player with ID ${playerId} not found`);
  }

  const strategy = createAIStrategy();
  return strategy.declareTrumpSuit(gameState, player);
};
