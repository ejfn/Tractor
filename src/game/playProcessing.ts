import { getAIMove } from "../ai/aiLogic";
import { Card, GameState, PlayerId, Team, Trick } from "../types";
import { gameLogger } from "../utils/gameLogger";
import { evaluateTrickPlay } from "./cardComparison";
import { calculateKittyBonusInfo } from "./kittyManager";
import { isValidPlay } from "./playValidation";

/**
 * Play Processing Module
 *
 * Handles all aspects of card play processing including:
 * - Play validation according to Shengji rules
 * - Play processing and state management
 * - Trick completion and winner determination
 * - AI move generation with error handling
 */

// ================================
// PLAY PROCESSING FUNCTIONS
// ================================

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
  trickWinnerId?: PlayerId;
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

  // Log card play for both AI and human players
  const logData: Record<string, unknown> = {
    playerId: currentPlayer.id,
    isHuman: currentPlayer.isHuman,
    cardsPlayed: cards.map((card) => card.toString()),
    cardsPlayedCount: cards.length,
    handSizeBefore: currentPlayer.hand.length,
    handSizeAfter: currentPlayer.hand.length - cards.length,
    trickNumber: newState.tricks.length + 1,
    roundNumber: newState.roundNumber,
    currentTrickState: newState.currentTrick ? "continuing" : "starting_new",
  };

  if (gameLogger.isPlayerHandsIncluded()) {
    logData.handBefore = currentPlayer.hand.map((card) => card.toString());
  }

  gameLogger.info(
    "card_play",
    logData,
    `${currentPlayer.id} plays: ${cards.map((c) => c.toString()).join(", ")} (${cards.length} cards)`,
  );

  // Check if we should start a new trick
  // Rules:
  // 1. If no current trick exists, start a new one
  // 2. If current trick is complete AND this player won it, start a new one
  //    (but only in testing or after the UI has shown the result)
  const isTrickComplete =
    newState.currentTrick &&
    newState.currentTrick.plays.length === newState.players.length;

  // Check if current player is the winner of the last completed trick
  const currentWinner =
    newState.currentTrick?.winningPlayerId ||
    newState.currentTrick?.plays[0]?.playerId;
  const isWinner =
    currentWinner &&
    newState.players[newState.currentPlayerIndex]?.id === currentWinner;

  if (!newState.currentTrick || (isTrickComplete && isWinner)) {
    // Check if this will be the final trick (all players have exactly enough cards for the combo type)
    const comboLength = cards.length;
    const willBeFinalTrick = newState.players.every(
      (player) => player.hand.length === comboLength,
    );

    // Create new trick with leader as plays[0]
    newState.currentTrick = {
      plays: [
        {
          playerId: currentPlayer.id,
          cards: [...cards],
        },
      ],
      winningPlayerId: currentPlayer.id, // Initially, the leading player is winning
      points: 0,
      isFinalTrick: willBeFinalTrick, // Track if this is the final trick
    };

    // First player is leading the trick
  } else if (newState.currentTrick) {
    // Trick exists - add to plays array
    // Check if this is a duplicate play (should never happen)
    const existingPlay = newState.currentTrick.plays.find(
      (play) => play.playerId === currentPlayer.id,
    );
    if (existingPlay) {
      // This player is playing again - this should never happen in a normal game
      gameLogger.error(
        "duplicate_play_error",
        {
          playerId: currentPlayer.id,
          trickNumber: newState.tricks.length + 1,
        },
        `Warning: Player ${currentPlayer.id} is playing again in the same trick`,
      );
    } else {
      // Add play to the plays array
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
          currentPlayerHand, // Player's current hand (cards not yet removed)
        );

        if (trickResult.canBeat) {
          // Current play beats the current winner
          newState.currentTrick.winningPlayerId = currentPlayer.id;
        }
      }
    }
  } else {
    // This should never happen - no current trick but not starting new one
    gameLogger.error(
      "invalid_trick_state",
      {
        playerId: currentPlayer.id,
        currentPlayerIndex: state.currentPlayerIndex,
        tricksCompleted: state.tricks.length,
      },
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
    ? newState.currentTrick.plays.length === newState.players.length
    : false;
  const isThisFinalTrick =
    willBeCompletedTrick &&
    newState.currentTrick &&
    newState.currentTrick.isFinalTrick;

  // Check if this completes a trick - should be plays.length = players.length
  // Since all players including leader are now in the plays array
  if (willBeCompletedTrick && newState.currentTrick) {
    // winningPlayerId is already being tracked throughout the trick, so we can use it directly
    const winningPlayerId =
      newState.currentTrick.winningPlayerId ||
      newState.currentTrick.plays[0]?.playerId;

    gameLogger.info(
      "trick_completed",
      {
        trickNumber: newState.tricks.length + 1,
        winningPlayer: winningPlayerId,
        trickPoints: newState.currentTrick.points,
        isFinalTrick: isThisFinalTrick,
        allPlays: newState.currentTrick.plays.map((play) => ({
          playerId: play.playerId,
          cards: play.cards.map((card) => card.toString()),
        })),
        roundNumber: newState.roundNumber,
      },
      `Trick ${newState.tricks.length + 1} completed: ${winningPlayerId} wins with ${newState.currentTrick.points} points${isThisFinalTrick ? " (FINAL TRICK)" : ""}`,
    );

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
          const kittyInfo = calculateKittyBonusInfo(
            newState,
            newState.currentTrick,
            winningPlayerId,
          );

          // Populate roundEndKittyInfo for round result display
          // Store kitty bonus info but DON'T add to team points yet - save for round completion
          newState.roundEndKittyInfo = {
            kittyPoints: kittyInfo.kittyPoints,
            finalTrickType: kittyInfo.finalTrickType,
            kittyBonus:
              kittyInfo.bonusPoints > 0
                ? {
                    bonusPoints: kittyInfo.bonusPoints,
                    multiplier: kittyInfo.multiplier,
                  }
                : undefined,
          };

          gameLogger.debug(
            "final_trick_kitty_bonus",
            {
              winningPlayer: winningPlayerId,
              winningTeam: winningTeam.id,
              kittyCards: newState.kittyCards.map((card) => card.toString()),
              kittyPoints: kittyInfo.kittyPoints,
              finalTrickType: kittyInfo.finalTrickType,
              multiplier: kittyInfo.multiplier,
              bonusPoints: kittyInfo.bonusPoints,
              roundNumber: newState.roundNumber,
            },
            `Final trick kitty bonus: ${winningTeam.id} gets ${kittyInfo.bonusPoints} bonus (${kittyInfo.kittyPoints} × ${kittyInfo.multiplier} for ${kittyInfo.finalTrickType})`,
          );

          // NOTE: Kitty bonus points are NOT added to team.points here
          // They will be added during round completion (gameRoundManager.endRound)
          // This allows trick display to show only regular trick points
          // while the full bonus is revealed in the round complete modal
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
    newState.currentTrick.plays.length === newState.players.length
  ) {
    // Trick was completed - return the previously saved result
    const completedTrick = newState.tricks[newState.tricks.length - 1];
    const winningPlayerId =
      newState.currentTrick.winningPlayerId ||
      newState.currentTrick.plays[0]?.playerId;

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
      gameLogger.error(
        "invalid_current_player",
        {
          currentPlayerIndex: state.currentPlayerIndex,
          totalPlayers: state.players.length,
          gamePhase: state.gamePhase,
        },
        `Invalid currentPlayerIndex: ${state.currentPlayerIndex} for ${state.players.length} players`,
      );
      return {
        cards: [],
        error: `Invalid player index: ${state.currentPlayerIndex}`,
      };
    }

    // Get AI move
    const aiMove = getAIMove(state, currentPlayer.id);

    // Validate that we received a valid move
    if (!aiMove || aiMove.length === 0) {
      gameLogger.warn(
        "ai_empty_move",
        {
          playerId: currentPlayer.id,
          handSize: currentPlayer.hand.length,
          trickNumber: state.tricks.length + 1,
        },
        `AI player ${currentPlayer.id} returned an empty move`,
      );

      // Emergency fallback: play cards to match the combo length
      if (currentPlayer.hand.length > 0) {
        const comboLength = state.currentTrick?.plays[0]?.cards?.length || 1;
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

    // CRITICAL: Validate AI move using isValidPlay() guard
    const leadingCards = state.currentTrick?.plays[0]?.cards || null;
    const isValidMove = isValidPlay(
      aiMove,
      currentPlayer.hand,
      currentPlayer.id,
      state,
    );

    if (!isValidMove) {
      // Log error for invalid AI move
      gameLogger.error(
        "ai_invalid_move",
        {
          playerId: currentPlayer.id,
          aiMove: aiMove.map((card) => card.toString()),
          trickNumber: state.tricks.length + 1,
          roundNumber: state.roundNumber,
        },
        `AI player ${currentPlayer.id} attempted invalid move: ${aiMove.map((c) => c.toString()).join(", ")}`,
      );

      // Log detailed debug information for investigation
      gameLogger.info(
        "ai_invalid_move_details",
        {
          playerId: currentPlayer.id,
          playerHand: currentPlayer.hand.map((card) => card.toString()),
          playerHandSize: currentPlayer.hand.length,
          aiMove: aiMove.map((card) => card.toString()),
          currentTrick: state.currentTrick
            ? {
                plays: state.currentTrick.plays.map((play) => ({
                  playerId: play.playerId,
                  cards: play.cards.map((card) => card.toString()),
                })),
                winningPlayerId: state.currentTrick.winningPlayerId,
                points: state.currentTrick.points,
                isFinalTrick: state.currentTrick.isFinalTrick,
              }
            : null,
          leadingCards: leadingCards?.map((card) => card.toString()) || [],
          trumpInfo: {
            trumpRank: state.trumpInfo.trumpRank,
            trumpSuit: state.trumpInfo.trumpSuit,
          },
          trickNumber: state.tricks.length + 1,
          roundNumber: state.roundNumber,
        },
        `Invalid AI move details for ${currentPlayer.id}`,
      );

      // Return both cards (to continue game) and error (for test detection)
      return {
        cards: aiMove,
        error: `Invalid AI move: ${aiMove.map((c) => c.toString()).join(", ")}`,
      };
    }

    return { cards: aiMove };
  } catch (error) {
    gameLogger.error(
      "ai_move_error",
      {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        currentPlayerIndex: state.currentPlayerIndex,
        gamePhase: state.gamePhase,
      },
      "Error in AI move logic",
    );
    return {
      cards: [],
      error: `Error generating AI move: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Clear completed trick and set winner as next player
 * @param state Current game state
 * @returns Updated game state with cleared trick
 */
export function clearCompletedTrick(state: GameState): GameState {
  if (!state.currentTrick) {
    return state;
  }

  // Find winning player index from currentTrick.winningPlayerId
  const winningPlayerId = state.currentTrick.winningPlayerId;
  const winningPlayerIndex = winningPlayerId
    ? state.players.findIndex((p) => p.id === winningPlayerId)
    : -1;

  // Create new state with currentTrick cleared and winner as next player
  return {
    ...state,
    currentTrick: null,
    currentPlayerIndex:
      winningPlayerIndex >= 0 ? winningPlayerIndex : state.currentPlayerIndex,
  };
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

  // Use the comprehensive validation function that handles both leading and following,
  // including multi-combo scenarios
  return isValidPlay(cards, currentPlayer.hand, currentPlayer.id, state);
}
