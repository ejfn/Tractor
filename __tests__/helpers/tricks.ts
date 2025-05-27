import {
  Card,
  Trick,
} from '../../src/types';

// ============================================================================
// TRICK CREATION UTILITIES
// ============================================================================

/**
 * Creates a trick with specified properties
 */
export const createTrick = (
  leadingPlayerId: string,
  leadingCombo: Card[],
  plays: Array<{ playerId: string; cards: Card[] }> = [],
  points: number = 0,
  winningPlayerId?: string
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
  leadingPlayerId: string,
  leadingCards: Card[],
  otherPlays: Array<{ playerId: string; cards: Card[] }>,
  winningPlayerId: string
): Trick => {
  const totalPoints = [...leadingCards, ...otherPlays.flatMap(p => p.cards)]
    .reduce((sum, card) => sum + card.points, 0);
  
  return createTrick(leadingPlayerId, leadingCards, otherPlays, totalPoints, winningPlayerId);
};