import { GameState, Card, Trick, Team } from "../types";
import { identifyCombos, isValidPlay, evaluateTrickPlay } from "./gameLogic";
import { getAIMove } from "../ai/aiLogic";
import {
  calculateKittyBonus,
  calculateKittyPoints,
  getFinalTrickMultiplier,
} from "./kittyManager";

/**
 * Process a player's play (human or AI)
 * @param state Current game state
 * @param cards The cards being played
 * @returns Object with updated state and trick completion info
 */
export function processPlay(
  state: GameState,
  cards: Card[],
): {
  newState: GameState;
  trickComplete: boolean;
  trickWinnerId?: string;
  trickPoints?: number;
  completedTrick?: Trick;
} {
  // Create a deep copy of the state to avoid mutating the original
  const newState = {
    ...state,
    players: state.players.map((p) => ({
      ...p,
      hand: [...p.hand], // Deep copy the hand array
    })),
    teams: state.teams.map((t) => ({ ...t })) as [Team, Team], // Deep copy teams too
  };
  const currentPlayer = newState.players[newState.currentPlayerIndex];

  // Check if we should start a new trick
  // Rules:
  // 1. If no current trick exists, start a new one
  // 2. If current trick is complete AND this player won it, start a new one
  //    (but only in testing or after the UI has shown the result)
  const isTrickComplete =
    newState.currentTrick &&
    newState.currentTrick.plays.length === newState.players.length - 1;

  // Check if current player is the winner of the last completed trick
  const currentWinner =
    newState.currentTrick?.winningPlayerId ||
    newState.currentTrick?.leadingPlayerId;
  const isWinner =
    currentWinner &&
    newState.players[newState.currentPlayerIndex]?.id === currentWinner;

  if (!newState.currentTrick || (isTrickComplete && isWinner)) {
    // Check if this will be the final trick (all players have exactly enough cards for the combo type)
    const comboLength = cards.length;
    const willBeFinalTrick = newState.players.every(
      (player) => player.hand.length === comboLength,
    );

    // For the first player, create new trick and don't add to plays array
    newState.currentTrick = {
      leadingPlayerId: currentPlayer.id,
      leadingCombo: [...cards],
      plays: [],
      winningPlayerId: currentPlayer.id, // Initially, the leading player is winning
      points: 0,
      isFinalTrick: willBeFinalTrick, // Track if this is the final trick
    } as any; // Type assertion since we're adding a custom property

    // First player is leading the trick
  } else if (newState.currentTrick) {
    // Trick exists - add to plays array
    // Make sure we never add the leading player to the plays array
    // This prevents the duplicate cards issue
    if (currentPlayer.id === newState.currentTrick.leadingPlayerId) {
      // This is the leading player playing again - this should never happen in a normal game
      // Log an error but continue processing
      console.error(
        `Warning: Leading player ${currentPlayer.id} is playing again in the same trick`,
      );
    } else {
      // Add non-leading plays to the plays array
      newState.currentTrick.plays.push({
        playerId: currentPlayer.id,
        cards: [...cards],
      });

      // Check if this play beats the current winner and update winningPlayerId
      if (newState.currentTrick) {
        // Find player index for hand access
        const currentPlayerIndex = newState.players.findIndex(
          (p) => p.id === currentPlayer.id,
        );
        const currentPlayerHand =
          newState.players[currentPlayerIndex]?.hand || [];

        // Use the new context-aware evaluation function
        const trickResult = evaluateTrickPlay(
          cards,
          newState.currentTrick,
          newState.trumpInfo,
          [...currentPlayerHand, ...cards], // Include played cards for validation
        );

        if (trickResult.canBeat) {
          // Current play beats the current winner
          newState.currentTrick.winningPlayerId = currentPlayer.id;
        }
      }
    }
  } else {
    // This should never happen - no current trick but not starting new one
    console.error(
      `Invalid state: no currentTrick for player ${currentPlayer.id}`,
    );
    return {
      newState: state,
      trickComplete: false,
    };
  }

  // Calculate points from this play
  const playPoints = cards.reduce((sum, card) => sum + card.points, 0);
  if (newState.currentTrick) {
    newState.currentTrick.points += playPoints;
  }

  // Check for final trick using the tracked property
  const willBeCompletedTrick = newState.currentTrick
    ? newState.currentTrick.plays.length === newState.players.length - 1
    : false;
  const isThisFinalTrick =
    willBeCompletedTrick &&
    newState.currentTrick &&
    (newState.currentTrick as any).isFinalTrick;

  // Check if this completes a trick - should be plays.length = players.length-1
  // Since the leading player's cards are in leadingCombo, not in the plays array
  if (willBeCompletedTrick && newState.currentTrick) {
    // winningPlayerId is already being tracked throughout the trick, so we can use it directly
    const winningPlayerId =
      newState.currentTrick.winningPlayerId ||
      newState.currentTrick.leadingPlayerId;

    // Add points to the winning team
    const trickWinningPlayer = newState.players.find(
      (p) => p.id === winningPlayerId,
    );
    if (trickWinningPlayer) {
      const winningTeam = newState.teams.find(
        (t) => t.id === trickWinningPlayer.team,
      );
      if (winningTeam) {
        winningTeam.points += newState.currentTrick.points;

        // KITTY BONUS: Check if this is the final trick and calculate kitty bonus
        if (isThisFinalTrick) {
          const kittyBonus = calculateKittyBonus(
            newState,
            newState.currentTrick,
            winningPlayerId,
          );

          // Populate roundEndKittyInfo for round result display
          const kittyPoints = calculateKittyPoints(newState.kittyCards);
          const multiplier = getFinalTrickMultiplier(
            newState.currentTrick,
            newState,
          );
          const finalTrickType =
            multiplier === 4 ? "pairs/tractors" : "singles";

          newState.roundEndKittyInfo = {
            kittyPoints,
            finalTrickType,
            kittyBonus:
              kittyBonus > 0
                ? {
                    bonusPoints: kittyBonus,
                    multiplier,
                  }
                : undefined,
          };

          if (kittyBonus > 0) {
            winningTeam.points += kittyBonus;
          }
        }
      }
    }

    // Save this completed trick
    const completedTrick = {
      ...newState.currentTrick,
    };
    newState.tricks.push(completedTrick);

    // Find winning player index and set them as the next player to lead
    const winningPlayerIndex = newState.players.findIndex(
      (p) => p.id === winningPlayerId,
    );
    newState.currentPlayerIndex = winningPlayerIndex;
  } else {
    // Move to next player
    newState.currentPlayerIndex =
      (newState.currentPlayerIndex + 1) % newState.players.length;
  }

  // Remove played cards from player's hand (for both completing and non-completing plays)
  const playerIndex = newState.players.findIndex(
    (p) => p.id === currentPlayer.id,
  );

  if (playerIndex !== -1) {
    // Create a new hand array without the played cards
    const newHand = newState.players[playerIndex].hand.filter(
      (card) => !cards.some((playedCard) => playedCard.id === card.id),
    );

    // Update the player's hand in the new state
    newState.players[playerIndex].hand = newHand;
  }

  // Return appropriate result based on whether trick was completed
  if (
    newState.currentTrick &&
    newState.currentTrick.plays.length === newState.players.length - 1
  ) {
    // Trick was completed - return the previously saved result
    const completedTrick = newState.tricks[newState.tricks.length - 1];
    const winningPlayerId =
      newState.currentTrick.winningPlayerId ||
      newState.currentTrick.leadingPlayerId;

    return {
      newState,
      trickComplete: true,
      trickWinnerId: winningPlayerId,
      trickPoints: completedTrick.points,
      completedTrick: completedTrick,
    };
  } else {
    return {
      newState,
      trickComplete: false,
    };
  }
}

/**
 * Get the AI's move based on the current game state
 * @param state Current game state
 * @returns Object with the cards to play and any error
 */
export function getAIMoveWithErrorHandling(state: GameState): {
  cards: Card[];
  error?: string;
} {
  try {
    const currentPlayer = state.players[state.currentPlayerIndex];

    // Safety check to ensure we have a valid current player
    if (!currentPlayer) {
      console.error(
        `Invalid currentPlayerIndex: ${state.currentPlayerIndex} for ${state.players.length} players`,
      );
      return {
        cards: [],
        error: `Invalid player index: ${state.currentPlayerIndex}`,
      };
    }

    // Safety check to ensure the current player is an AI
    if (currentPlayer.isHuman) {
      console.warn("getAIMoveWithErrorHandling called for human player");
      return { cards: [], error: "Function called for human player" };
    }

    // Get AI move
    const aiMove = getAIMove(state, currentPlayer.id);

    // Validate that we received a valid move
    if (!aiMove || aiMove.length === 0) {
      console.warn(`AI player ${currentPlayer.id} returned an empty move`);

      // Emergency fallback: play cards to match the combo length
      if (currentPlayer.hand.length > 0) {
        const comboLength = state.currentTrick?.leadingCombo?.length || 1;
        const cardsToPlay = currentPlayer.hand.slice(
          0,
          Math.min(comboLength, currentPlayer.hand.length),
        );
        return { cards: cardsToPlay };
      } else {
        // If AI hand is somehow empty, return error
        return {
          cards: [],
          error: `AI player ${currentPlayer.id} has no cards to play`,
        };
      }
    }

    return { cards: aiMove };
  } catch (error) {
    console.error("Error in AI move logic:", error);
    return {
      cards: [],
      error: `Error generating AI move: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Validate if a play is valid according to game rules
 * @param state Current game state
 * @param cards Cards being played
 * @returns Boolean indicating if the play is valid
 */
export function validatePlay(state: GameState, cards: Card[]): boolean {
  if (!state || cards.length === 0) return false;

  const currentPlayer = state.players[state.currentPlayerIndex];

  if (!state.currentTrick) {
    // Player is leading - any combo is valid
    const combos = identifyCombos(currentPlayer.hand, state.trumpInfo);
    return combos.some(
      (combo) =>
        combo.cards.length === cards.length &&
        combo.cards.every((card) =>
          cards.some((selected) => selected.id === card.id),
        ),
    );
  } else {
    // Player is following - must match the leading combo
    return isValidPlay(
      cards,
      state.currentTrick.leadingCombo,
      currentPlayer.hand,
      state.trumpInfo,
    );
  }
}
