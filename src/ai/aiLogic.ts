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
