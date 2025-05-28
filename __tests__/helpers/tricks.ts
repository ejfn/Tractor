import {
  Card,
  Trick,
  PlayerId,
} from '../../src/types';

// ============================================================================
// TRICK CREATION UTILITIES
// ============================================================================

/**
 * Creates a trick with specified properties
 */
export const createTrick = (
  leadingPlayerId: PlayerId,
  leadingCombo: Card[],
  plays: Array<{ playerId: PlayerId; cards: Card[] }> = [],
  points: number = 0,
  winningPlayerId?: PlayerId
): Trick => ({
  leadingPlayerId,
  leadingCombo: [...leadingCombo], // Deep copy
  plays: plays.map(play => ({ ...play, cards: [...play.cards] })), // Deep copy
  points,
  winningPlayerId: winningPlayerId ?? leadingPlayerId // Default to leading player if not specified
});

/**
 * Creates a completed trick with all 4 players having played
 */
export const createCompletedTrick = (
  leadingPlayerId: PlayerId,
  leadingCards: Card[],
  otherPlays: Array<{ playerId: PlayerId; cards: Card[] }>,
  winningPlayerId: PlayerId
): Trick => {
  const totalPoints = [...leadingCards, ...otherPlays.flatMap(p => p.cards)]
    .reduce((sum, card) => sum + card.points, 0);
  
  return createTrick(leadingPlayerId, leadingCards, otherPlays, totalPoints, winningPlayerId);
};