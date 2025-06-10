import {
  Card,
  ComboType,
  DeckId,
  JokerType,
  Rank,
  Suit,
} from '../../src/types';

// ============================================================================
// CARD CREATION UTILITIES
// ============================================================================


/**
 * Creates a tractor (consecutive pairs of same suit)
 */
export const createTractor = (suit: Suit, startRank: Rank, length: number = 2): Card[] => {
  const ranks = Object.values(Rank);
  const startIndex = ranks.indexOf(startRank);
  const cards: Card[] = [];
  
  for (let i = 0; i < length; i++) {
    const rank = ranks[startIndex + i];
    if (rank) {
      cards.push(...Card.createPair(suit, rank));
    }
  }
  
  return cards;
};

// ============================================================================
// COMMON TEST DATA
// ============================================================================

/**
 * Predefined test data for common scenarios
 * Uses Card class directly - no unnecessary wrappers
 */
export const testData = {
  // Standard cards for testing
  cards: {
    spadesAce: Card.createCard(Suit.Spades, Rank.Ace, 0),
    heartsFive: Card.createCard(Suit.Hearts, Rank.Five, 0),
    clubsKing: Card.createCard(Suit.Clubs, Rank.King, 0),
    diamondsTen: Card.createCard(Suit.Diamonds, Rank.Ten, 0),
    bigJoker: Card.createJoker(JokerType.Big, 0),
    smallJoker: Card.createJoker(JokerType.Small, 0)
  },

  // Standard pairs for testing
  pairs: {
    spadesAces: Card.createPair(Suit.Spades, Rank.Ace),
    heartsTwos: Card.createPair(Suit.Hearts, Rank.Two),
    clubsKings: Card.createPair(Suit.Clubs, Rank.King),
    diamondsFives: Card.createPair(Suit.Diamonds, Rank.Five)
  },

  // Standard tractors for testing
  tractors: {
    spadesThreeFour: createTractor(Suit.Spades, Rank.Three, 2),
    heartsKingAce: createTractor(Suit.Hearts, Rank.King, 2),
    clubsFiveSixSeven: createTractor(Suit.Clubs, Rank.Five, 3)
  }
};

// ============================================================================
// MIGRATION NOTE
// ============================================================================

/**
 * OLD HELPERS REMOVED:
 * - createCard() - use Card.createCard() directly
 * - createJoker() - use Card.createJoker() directly
 * - createCards() - use Card.createCard() directly in tests
 * 
 * SIMPLE REPLACEMENT:
 * Old: createCard(Suit.Hearts, Rank.Ace, 'some_id')
 * New: Card.createCard(Suit.Hearts, Rank.Ace, 0)
 * 
 * OLD PATTERN: Random IDs, complex wrappers, duplication
 * NEW PATTERN: Direct Card class usage, deterministic DeckIds (0|1)
 */