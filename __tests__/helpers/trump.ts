import {
  Rank,
  Suit,
  TrumpInfo,
  PlayerId,
} from '../../src/types';

// ============================================================================
// TRUMP INFO UTILITIES
// ============================================================================

/**
 * Creates trump information
 */
export const createTrumpInfo = (
  trumpRank: Rank = Rank.Two,
  trumpSuit?: Suit
): TrumpInfo => ({
  trumpRank,
  trumpSuit
});

/**
 * Creates trump info for common test scenarios
 */
export const createTrumpScenarios = {
  noTrump: () => createTrumpInfo(Rank.Two, undefined),
  heartsTrump: () => createTrumpInfo(Rank.Two, Suit.Hearts),
  spadesTrump: () => createTrumpInfo(Rank.Two, Suit.Spades),
  clubsTrump: () => createTrumpInfo(Rank.Two, Suit.Clubs),
  diamondsTrump: () => createTrumpInfo(Rank.Two, Suit.Diamonds),
  jackTrump: () => createTrumpInfo(Rank.Jack, Suit.Spades),
  rankOnly: (rank: Rank) => createTrumpInfo(rank, undefined),
  customTrump: (rank: Rank, suit: Suit) => createTrumpInfo(rank, suit)
};