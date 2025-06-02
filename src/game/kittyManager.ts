import { GameState, PlayerId, GamePhase, Card, Trick } from "../types";

/**
 * Picks up kitty cards for the round starting player
 * Adds the 8 kitty cards to the round starting player's hand and transitions to KittySwap phase
 */
export const pickupKittyCards = (
  gameState: GameState,
  roundStartingPlayerId: PlayerId,
): { newState: GameState; kittyCards: Card[] } => {
  const newState = { ...gameState };

  // Find the round starting player
  const roundStartingPlayer = newState.players.find(
    (p) => p.id === roundStartingPlayerId,
  );
  if (!roundStartingPlayer) {
    throw new Error(`Round starting player ${roundStartingPlayerId} not found`);
  }

  if (newState.kittyCards.length !== 8) {
    throw new Error(
      `Expected 8 kitty cards, but found ${newState.kittyCards.length}`,
    );
  }

  // Store reference to the kitty cards for pre-selection
  const kittyCards = [...newState.kittyCards];

  // Add kitty cards to round starting player's hand
  roundStartingPlayer.hand = [
    ...roundStartingPlayer.hand,
    ...newState.kittyCards,
  ];

  // Transition to KittySwap phase
  newState.gamePhase = GamePhase.KittySwap;

  // Set current player to the round starting player for the swap
  const roundStartingPlayerIndex = newState.players.findIndex(
    (p) => p.id === roundStartingPlayerId,
  );
  newState.currentPlayerIndex = roundStartingPlayerIndex;

  return { newState, kittyCards };
};

/**
 * Validates that exactly 8 cards are selected for kitty swap
 */
export const validateKittySwap = (selectedCards: Card[]): boolean => {
  return selectedCards.length === 8;
};

/**
 * Puts back selected cards to the kitty and transitions to Playing phase
 * Returns the selected cards to the kitty and removes them from the player's hand
 */
export const putbackKittyCards = (
  gameState: GameState,
  selectedCards: Card[],
  playerId: PlayerId,
): GameState => {
  if (!validateKittySwap(selectedCards)) {
    throw new Error(
      `Must select exactly 8 cards for kitty swap, but ${selectedCards.length} were selected`,
    );
  }

  const newState = { ...gameState };

  // Find the player putting back cards
  const player = newState.players.find((p) => p.id === playerId);
  if (!player) {
    throw new Error(`Player ${playerId} not found`);
  }

  // Verify all selected cards are in the player's hand
  const selectedCardIds = selectedCards.map((c) => c.id);
  const handCardIds = player.hand.map((c) => c.id);
  const invalidCards = selectedCardIds.filter(
    (id) => !handCardIds.includes(id),
  );

  if (invalidCards.length > 0) {
    throw new Error(
      `Selected cards not found in player's hand: ${invalidCards.join(", ")}`,
    );
  }

  // Remove selected cards from player's hand
  player.hand = player.hand.filter(
    (card) => !selectedCardIds.includes(card.id),
  );

  // Put selected cards back to kitty
  newState.kittyCards = [...selectedCards];

  // Transition to Playing phase
  newState.gamePhase = GamePhase.Playing;

  return newState;
};

/**
 * Gets the total point value of cards in the kitty
 */
export const calculateKittyPoints = (kittyCards: Card[]): number => {
  return kittyCards.reduce((total, card) => total + card.points, 0);
};

/**
 * Determines if this is the final trick of the round
 * Final trick occurs when all players have exactly one card left
 */
export const isFinalTrick = (gameState: GameState): boolean => {
  // Check if all players have exactly 1 card left
  return gameState.players.every((player) => player.hand.length === 1);
};

/**
 * Analyzes the type of the final trick (singles vs pairs/tractors)
 * Returns the multiplier for kitty scoring: 2x for singles, 4x for pairs/tractors
 */
export const getFinalTrickMultiplier = (finalTrick: Trick): number => {
  const leadingComboLength = finalTrick.leadingCombo.length;

  // Singles = 1 card, everything else (pairs/tractors) = multiple cards
  return leadingComboLength === 1 ? 2 : 4;
};

/**
 * Calculates the kitty bonus points if attacking team wins the final trick
 * Returns 0 if defending team wins, or kitty points × multiplier if attacking team wins
 */
export const calculateKittyBonus = (
  gameState: GameState,
  finalTrick: Trick,
  finalTrickWinnerId: PlayerId,
): number => {
  const kittyPoints = calculateKittyPoints(gameState.kittyCards);

  // Find the winning player's team
  const winningPlayer = gameState.players.find(
    (p) => p.id === finalTrickWinnerId,
  );
  if (!winningPlayer) return 0;

  const winningTeam = gameState.teams.find((t) => t.id === winningPlayer.team);
  if (!winningTeam) return 0;

  // Only attacking team gets kitty bonus
  if (winningTeam.isDefending) {
    return 0; // Defending team wins final trick = no kitty bonus
  }

  // Attacking team wins final trick = apply multiplier
  const multiplier = getFinalTrickMultiplier(finalTrick);
  return kittyPoints * multiplier;
};
