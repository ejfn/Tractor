import {
  Card,
  ComboType,
  JokerType,
  Rank,
  Suit,
} from '../../src/types';

// ============================================================================
// CARD CREATION UTILITIES
// ============================================================================

/**
 * Creates a standard playing card with automatic point calculation
 */
export const createCard = (suit: Suit, rank: Rank, id?: string): Card => {
  let points = 0;
  if (rank === Rank.Five) points = 5;
  if (rank === Rank.Ten || rank === Rank.King) points = 10;
  
  return { 
    suit, 
    rank, 
    id: id || `${suit.toLowerCase()}_${rank.toLowerCase()}_${Math.random().toString(36).substring(7)}`, 
    points 
  };
};

/**
 * Creates a joker card
 */
export const createJoker = (type: JokerType, id?: string): Card => ({
  joker: type,
  id: id || `${type.toLowerCase()}_joker_${Math.random().toString(36).substring(7)}`,
  points: 0,
  suit: undefined,
  rank: undefined
});

/**
 * Creates multiple cards quickly using a shorthand notation
 * @param specs Array of [suit, rank] or [suit, rank, id] tuples
 */
export const createCards = (specs: Array<[Suit, Rank] | [Suit, Rank, string]>): Card[] => {
  return specs.map(spec => {
    const [suit, rank, id] = spec;
    return createCard(suit, rank, id);
  });
};

/**
 * Creates a pair of identical cards (same suit and rank)
 */
export const createPair = (suit: Suit, rank: Rank, baseId?: string): Card[] => {
  const base = baseId || `${suit.toLowerCase()}_${rank.toLowerCase()}`;
  return [
    createCard(suit, rank, `${base}_1`),
    createCard(suit, rank, `${base}_2`)
  ];
};

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
      cards.push(...createPair(suit, rank));
    }
  }
  
  return cards;
};

// ============================================================================
// COMMON TEST DATA
// ============================================================================

/**
 * Predefined test data for common scenarios
 */
export const testData = {
  // Standard cards for testing
  cards: {
    spadesAce: createCard(Suit.Spades, Rank.Ace, 'spades_ace_1'),
    heartsFive: createCard(Suit.Hearts, Rank.Five, 'hearts_five_1'),
    clubsKing: createCard(Suit.Clubs, Rank.King, 'clubs_king_1'),
    diamondsTen: createCard(Suit.Diamonds, Rank.Ten, 'diamonds_ten_1'),
    bigJoker: createJoker(JokerType.Big, 'big_joker_1'),
    smallJoker: createJoker(JokerType.Small, 'small_joker_1')
  },

  // Standard pairs for testing
  pairs: {
    spadesAces: createPair(Suit.Spades, Rank.Ace),
    heartsTwos: createPair(Suit.Hearts, Rank.Two),
    clubsKings: createPair(Suit.Clubs, Rank.King),
    diamondsFives: createPair(Suit.Diamonds, Rank.Five)
  },

  // Standard tractors for testing
  tractors: {
    spadesThreeFour: createTractor(Suit.Spades, Rank.Three, 2),
    heartsKingAce: createTractor(Suit.Hearts, Rank.King, 2),
    clubsFiveSixSeven: createTractor(Suit.Clubs, Rank.Five, 3)
  }
};