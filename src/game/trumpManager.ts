import { GameState, Suit, GamePhase } from "../types";
import { shouldAIDeclare } from "../ai/aiLogic";

/**
 * Handles the declaration of a trump suit
 * @param state Current game state
 * @param suit The suit being declared as trump, or null if skipping
 * @returns Updated game state with trump information
 */
export function declareTrumpSuit(
  state: GameState,
  suit: Suit | null,
): GameState {
  const newState = { ...state };

  if (suit) {
    newState.trumpInfo.trumpSuit = suit;
    newState.trumpInfo.declared = true;

    // Record the player who declared trump
    const currentPlayer = newState.players[newState.currentPlayerIndex];
    newState.trumpInfo.declarerPlayerId = currentPlayer.id;
  } else {
    // Trump declaration was skipped - mark as declared to complete the phase
    newState.trumpInfo.declared = true;
  }

  // Save the starting player for this round when transitioning to Playing phase
  // This ensures we capture the correct starting player before any AI rotation during declaring
  newState.lastRoundStartingPlayerIndex = newState.currentPlayerIndex;

  newState.gamePhase = GamePhase.Playing;
  return newState;
}

/**
 * Determine if any AI player should declare a trump suit
 * @param state Current game state
 * @returns Object with decision and suit to declare
 */
export function checkAITrumpDeclaration(state: GameState): {
  shouldDeclare: boolean;
  suit: Suit | null;
} {
  // Find the first AI player with a trump rank card
  const aiWithTrump = state.players.find(
    (p) =>
      !p.isHuman &&
      p.hand.some((card) => card.rank === state.trumpInfo.trumpRank),
  );

  if (!aiWithTrump) {
    return { shouldDeclare: false, suit: null };
  }

  // Check if AI should declare based on strategy
  const shouldDeclare = shouldAIDeclare(state, aiWithTrump.id);

  if (!shouldDeclare) {
    return { shouldDeclare: false, suit: null };
  }

  // Determine most common suit in AI's hand
  const suitCounts = aiWithTrump.hand.reduce(
    (counts, card) => {
      if (card.suit) {
        counts[card.suit] = (counts[card.suit] || 0) + 1;
      }
      return counts;
    },
    {} as Record<string, number>,
  );

  // Find the most common suit
  let maxSuit = Suit.Spades;
  let maxCount = 0;

  Object.entries(suitCounts).forEach(([suit, count]) => {
    if (count > maxCount) {
      maxCount = count;
      maxSuit = suit as Suit;
    }
  });

  return { shouldDeclare: true, suit: maxSuit };
}

/**
 * Check if a human player's hand has trump rank cards
 * @param state Current game state
 * @returns Boolean indicating if the human has trump rank cards
 */
export function humanHasTrumpRank(state: GameState): boolean {
  const humanPlayer = state.players.find((p) => p.isHuman);
  if (!humanPlayer) return false;

  return humanPlayer.hand.some(
    (card) => card.rank === state.trumpInfo.trumpRank,
  );
}
