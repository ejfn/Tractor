import {
  Rank,
  Suit,
  TrumpInfo,
} from '../../src/types';

// ============================================================================
// TRUMP INFO UTILITIES
// ============================================================================

/**
 * Creates trump information
 */
export const createTrumpInfo = (
  trumpRank: Rank = Rank.Two,
  trumpSuit?: Suit,
  declared: boolean = false,
  declarerPlayerId?: string
): TrumpInfo => ({
  trumpRank,
  trumpSuit,
  declared,
  declarerPlayerId
});

/**
 * Creates trump info for common test scenarios
 */
export const createTrumpScenarios = {
  noTrump: () => createTrumpInfo(Rank.Two, undefined, false),
  heartsTrump: () => createTrumpInfo(Rank.Two, Suit.Hearts, true),
  spadesTrump: () => createTrumpInfo(Rank.Two, Suit.Spades, true),
  clubsTrump: () => createTrumpInfo(Rank.Two, Suit.Clubs, true),
  diamondsTrump: () => createTrumpInfo(Rank.Two, Suit.Diamonds, true),
  rankOnly: (rank: Rank) => createTrumpInfo(rank, undefined, false)
};