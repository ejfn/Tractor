import { getValidCombinations } from "../game/combinationGeneration";
import { Card, GamePhase, GameState, PlayerId } from "../types";
import { sortCards } from "../utils/cardSorting";
import { gameLogger } from "../utils/gameLogger";
import { makeAIPlay } from "./aiStrategy";
import { selectAIKittySwapCards } from "./kittySwap/kittySwapStrategy";
import {
  AIDeclarationDecision,
  getAITrumpDeclarationDecision,
} from "./trumpDeclaration/trumpDeclarationStrategy";

/**
 * AI Logic - Unified Entry Point for All AI Operations
 *
 * This module serves as the single entry point for all AI functionality in the Tractor game.
 * It provides three main functions that handle all AI decision-making:
 *
 * 1. getAIMove() - Card play decisions during game play
 * 2. getAIKittySwap() - Kitty management decisions
 * 3. getAITrumpDeclaration() - Trump declaration decisions during dealing
 *
 * All external code should interact with AI through these functions only.
 */

// Export the AIDeclarationDecision type for external use
export type { AIDeclarationDecision };

/**
 * Main AI trump declaration logic - decides whether to declare trump during dealing
 *
 * Strategic Approach:
 * - Hand quality analysis with suit length prioritization
 * - Timing optimization based on dealing progress
 * - Override strategy for competitive declarations
 * - Team coordination and positioning consideration
 *
 * @param gameState Current game state during dealing phase
 * @param playerId ID of the AI player making the declaration decision
 * @returns Declaration decision with confidence and reasoning
 */
export const getAITrumpDeclaration = (
  gameState: GameState,
  playerId: PlayerId,
): AIDeclarationDecision => {
  return getAITrumpDeclarationDecision(gameState, playerId);
};

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
 * Main AI card play logic - selects cards to play during game play
 *
 * Strategic Approach:
 * - 4-phase AI intelligence with memory and historical analysis
 * - 4-priority decision chain: Team coordination → Opponent blocking → Trick contention → Strategic disposal
 * - Position-based strategy optimization (leading vs following positions 2,3,4)
 * - Advanced combination analysis and trump conservation
 *
 * @param gameState Current game state during play phase
 * @param playerId ID of the AI player making the move
 * @returns Array of cards to play, sorted for consistent presentation
 */
export const getAIMove = (gameState: GameState, playerId: PlayerId): Card[] => {
  const player = gameState.players.find((p) => p.id === playerId);
  if (!player) {
    throw new Error(`AI player with ID ${playerId} not found`);
  }

  // Handle empty hand case (should never happen - indicates game flow bug)
  if (player.hand.length === 0) {
    gameLogger.error(
      "ai_empty_hand_bug",
      {
        playerId,
        gamePhase: gameState.gamePhase,
        currentPlayerIndex: gameState.currentPlayerIndex,
      },
      "AI asked to play with empty hand - game flow bug",
    );
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
      leadingCombo: gameState.currentTrick?.plays[0]?.cards?.map(
        (c) => `${c.rank}${c.suit}`,
      ),
      trumpInfo: gameState.trumpInfo,
      gamePhase: gameState.gamePhase,
    };

    gameLogger.error(
      "ai_no_valid_combinations",
      errorInfo,
      "GAME BUG: No valid combinations found for AI with cards",
    );

    throw new Error(errorInfo.message);
  }

  // Delegate all strategic decisions to the AI strategy layer
  const selectedCards = makeAIPlay(gameState, player, validCombos);

  // Sort selected cards for consistent visual presentation
  return sortCards(selectedCards, gameState.trumpInfo);
};
