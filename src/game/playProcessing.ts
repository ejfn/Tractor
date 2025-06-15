import { getAIMove } from "../ai/aiLogic";
import {
  Card,
  ComboType,
  GameState,
  PlayerId,
  Suit,
  Team,
  Trick,
  TrumpInfo,
} from "../types";
import {
  evaluateTrickPlay,
  compareCards,
  compareRanks,
} from "./cardComparison";
import { calculateKittyBonusInfo } from "./kittyManager";
import { isTrump } from "./gameHelpers";
import { identifyCombos, getComboType } from "./comboDetection";
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
// PLAY VALIDATION FUNCTIONS
// ================================

// Get the leading suit from a combo
export const getLeadingSuit = (combo: Card[]): Suit | undefined => {
  // Find the first card that has a suit
  for (const card of combo) {
    if (card.suit) {
      return card.suit;
    }
  }
  return undefined;
};

// Compare two card combinations
export const compareCardCombos = (
  comboA: Card[],
  comboB: Card[],
  trumpInfo: TrumpInfo,
): number => {
  // Check if combos are the same type (singles, pairs, etc.)
  if (comboA.length !== comboB.length) {
    // In proper Tractor/Shengji, this should never happen
    // Combos of different lengths cannot be compared - this is a fundamental rule violation
    throw new Error(
      `Cannot compare combos of different lengths: ${comboA.length} vs ${comboB.length}`,
    );
  }

  // Get combo types
  const typeA = getComboType(comboA, trumpInfo);
  const typeB = getComboType(comboB, trumpInfo);

  // For singles, directly compare cards
  if (comboA.length === 1) {
    return compareCards(comboA[0], comboB[0], trumpInfo);
  }

  // CRITICAL FIX: Check combination type compatibility FIRST before trump status
  // This ensures game rule: combination type takes precedence over trump status
  // For tractors vs non-tractors
  if (typeA === ComboType.Tractor && typeB !== ComboType.Tractor) {
    return 1; // Tractor beats non-tractor
  }
  if (typeA !== ComboType.Tractor && typeB === ComboType.Tractor) {
    return -1; // Non-tractor loses to tractor
  }

  // Pairs always beat singles of the same length (regardless of trump status)
  if (typeA === ComboType.Pair && typeB !== ComboType.Pair) {
    return 1; // Pair beats non-pair
  }
  if (typeA !== ComboType.Pair && typeB === ComboType.Pair) {
    return -1; // Non-pair loses to pair
  }

  // Now that combination types are compatible, check trump status
  // Check if any combo contains trumps
  const aIsTrump = comboA.some((card) => isTrump(card, trumpInfo));
  const bIsTrump = comboB.some((card) => isTrump(card, trumpInfo));

  // If one is trump and the other isn't, trump wins (within same combination type)
  if (aIsTrump && !bIsTrump) return 1;
  if (!aIsTrump && bIsTrump) return -1;

  // For pairs (matching ranks)
  if (typeA === ComboType.Pair && typeB === ComboType.Pair) {
    // If they're the same type, ONLY compare the rank if they're from the same suit
    // Otherwise, in Shengji rules, the leading combo always wins unless trumps are involved
    // (and we've already handled the trump cases above)
    if (comboA[0].rank && comboB[0].rank) {
      // Only compare ranks if from the same suit
      if (
        comboA[0].suit &&
        comboB[0].suit &&
        comboA[0].suit === comboB[0].suit
      ) {
        // If both pairs are trump cards, use trump hierarchy instead of rank comparison
        if (aIsTrump && bIsTrump) {
          return compareCards(comboA[0], comboB[0], trumpInfo);
        }
        // For non-trump pairs from same suit, use rank comparison
        return compareRanks(comboA[0].rank, comboB[0].rank);
      } else {
        // Different suits and both are pairs - if both are trump pairs, compare by trump level
        if (aIsTrump && bIsTrump) {
          return compareCards(comboA[0], comboB[0], trumpInfo);
        }
        // Otherwise, in Shengji rules, the leading combo (comboA) wins
        return 1;
      }
    }
  }

  // For tractors, compare the highest card in the tractor
  if (typeA === ComboType.Tractor && typeB === ComboType.Tractor) {
    // First, check if the tractors are from the same suit
    const suitA = comboA[0].suit;
    const suitB = comboB[0].suit;

    const allSameSuitA = suitA && comboA.every((card) => card.suit === suitA);
    const allSameSuitB = suitB && comboB.every((card) => card.suit === suitB);

    // If both are valid tractors from different suits, the leading combo (comboA) wins
    // (We've already handled the trump cases above)
    if (allSameSuitA && allSameSuitB && suitA !== suitB) {
      return 1; // Leading tractor wins when comparing across different suits
    }

    // If they're from the same suit, compare the highest cards
    // Find the highest card in each tractor
    const maxCardA = comboA.reduce(
      (max, card) => (compareCards(max, card, trumpInfo) > 0 ? max : card),
      comboA[0],
    );

    const maxCardB = comboB.reduce(
      (max, card) => (compareCards(max, card, trumpInfo) > 0 ? max : card),
      comboB[0],
    );

    return compareCards(maxCardA, maxCardB, trumpInfo);
  }

  // If different types of combos but same total cards, should already be handled above
  // This shouldn't happen in proper Shengji

  // Check for a specific case where both are marked as "singles" but one is actually
  // multiple cards of the same suit and the other is mixed suits
  if (comboA.length > 1) {
    // For multi-card plays, the rule in Shengji is that the leading suit's play wins
    // unless beaten by a trump play or a proper combo (like a pair)

    // Get the suit of the leading combo (the one that should win if no trump/proper combo)
    const leadingSuit = getLeadingSuit([...comboA, ...comboB]);

    // If both are non-trump and we have a leading suit,
    // the combo that follows the leading suit wins
    if (leadingSuit && !aIsTrump && !bIsTrump) {
      // Count how many cards match the leading suit in each combo
      const aMatchCount = comboA.filter(
        (card) => card.suit === leadingSuit,
      ).length;
      const bMatchCount = comboB.filter(
        (card) => card.suit === leadingSuit,
      ).length;

      // If one follows the suit better than the other, it wins
      if (aMatchCount > bMatchCount) return 1;
      if (aMatchCount < bMatchCount) return -1;
    }
  }

  // Default fallback: compare highest cards
  const maxCardA = comboA.reduce(
    (max, card) => (compareCards(max, card, trumpInfo) > 0 ? max : card),
    comboA[0],
  );

  const maxCardB = comboB.reduce(
    (max, card) => (compareCards(max, card, trumpInfo) > 0 ? max : card),
    comboB[0],
  );

  return compareCards(maxCardA, maxCardB, trumpInfo);
};

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
      console.error(
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
      state.currentTrick.plays[0]?.cards || [],
      currentPlayer.hand,
      state.trumpInfo,
    );
  }
}
