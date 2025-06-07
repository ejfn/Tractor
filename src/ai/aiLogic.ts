import { getValidCombinations } from "../game/gameLogic";
import { Card, GameState, GamePhase, PlayerId } from "../types";
import { createAIStrategy } from "./aiStrategy";
import { selectAIKittySwapCards } from "./aiKittySwapStrategy";
import { sortCards } from "../utils/cardSorting";

/**
 * Main AI kitty swap logic - selects 8 cards to put back into kitty
 *
 * Refined Strategic Approach:
 * - USUALLY avoid trump cards, but allow when hands are exceptionally strong:
 *   * Very long trump suit (10+ cards) with strong combinations
 *   * Strong hands in other suits (tractors, big pairs) that shouldn't be sacrificed
 * - PREFER non-point cards, but allow strategic point cards if needed
 * - Focus on weak cards from non-trump suits as primary targets
 * - Attempt suit elimination for strategic advantage
 * - Preserve pairs, tractors, and high cards for play phase
 *
 * @param gameState Current game state
 * @param playerId ID of the AI player making the kitty swap
 * @returns Array of 8 cards to put back into kitty
 */
export const getAIKittySwap = (
  gameState: GameState,
  playerId: PlayerId,
): Card[] => {
  const player = gameState.players.find((p) => p.id === playerId);
  if (!player) {
    throw new Error(`AI player with ID ${playerId} not found`);
  }

  if (gameState.gamePhase !== GamePhase.KittySwap) {
    throw new Error(`AI kitty swap called during ${gameState.gamePhase} phase`);
  }

  if (player.hand.length !== 33) {
    throw new Error(
      `AI kitty swap: expected 33 cards (25 + 8 kitty), got ${player.hand.length}`,
    );
  }

  const selectedCards = selectAIKittySwapCards(gameState, playerId);

  // Validate AI selected exactly 8 cards
  if (selectedCards.length !== 8) {
    throw new Error(
      `AI kitty swap: AI must select exactly 8 cards, but selected ${selectedCards.length}`,
    );
  }

  // Validate all selected cards are actually in the player's hand
  const selectedCardIds = selectedCards.map((c) => c.id);
  const handCardIds = player.hand.map((c) => c.id);
  const invalidCards = selectedCardIds.filter(
    (id) => !handCardIds.includes(id),
  );

  if (invalidCards.length > 0) {
    throw new Error(
      `AI kitty swap: AI selected cards not in player's hand: ${invalidCards.join(", ")}`,
    );
  }

  // Validate that removing selected cards would leave exactly 25 cards
  const remainingCardCount = player.hand.length - selectedCards.length;
  if (remainingCardCount !== 25) {
    throw new Error(
      `AI kitty swap: After removing ${selectedCards.length} cards, player would have ${remainingCardCount} cards instead of 25`,
    );
  }

  return selectedCards;
};

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

  // Handle empty hand case (should never happen - indicates game flow bug)
  if (player.hand.length === 0) {
    console.warn("AI asked to play with empty hand - game flow bug", {
      playerId,
      gamePhase: gameState.gamePhase,
      currentPlayerIndex: gameState.currentPlayerIndex,
    });
    return []; // Safety fallback
  }

  // Get all valid combinations using the centralized game logic
  const validCombos = getValidCombinations(player.hand, gameState);

  // Handle bug case: player has cards but no valid combinations found
  if (validCombos.length === 0) {
    const errorInfo = {
      message:
        "Game bug detected: AI cannot make a valid move. Please restart and report this issue.",
      debugInfo: `Player ${playerId} has ${player.hand.length} cards but no valid combinations found`,
      playerHand: player.hand.map((c) => `${c.rank}${c.suit}`),
      leadingCombo: gameState.currentTrick?.leadingCombo?.map(
        (c) => `${c.rank}${c.suit}`,
      ),
      trumpInfo: gameState.trumpInfo,
      gamePhase: gameState.gamePhase,
    };

    console.error(
      "GAME BUG: No valid combinations found for AI with cards",
      errorInfo,
    );

    const error = new Error(errorInfo.message);
    (error as any).isUserFriendly = true;
    (error as any).canReport = true;
    (error as any).debugInfo = errorInfo;
    throw error;
  }

  // Delegate all strategic decisions to the AI strategy layer
  const strategy = createAIStrategy();
  const selectedCards = strategy.makePlay(gameState, player, validCombos);

  // Sort selected cards for consistent visual presentation
  return sortCards(selectedCards, gameState.trumpInfo);
};
