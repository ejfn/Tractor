import { Card, JokerType, Rank, Suit } from "../../src/types";

// ============================================================================
// CARD CREATION UTILITIES
// ============================================================================

/**
 * Creates a tractor (consecutive pairs of same suit)
 */
export const createTractor = (
  suit: Suit,
  startRank: Rank,
  length: number = 2,
): Card[] => {
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
// DECK MANIPULATION UTILITIES
// ============================================================================

/**
 * Moves a specified card to a specified position in a deck
 * Useful for creating deterministic test scenarios where specific cards need to be at specific positions
 *
 * @param deck - The deck to modify (will be modified in-place)
 * @param cardMatcher - Function that returns true for the card to move, or a card object to match by ID
 * @param targetPosition - The position where the card should be moved (0-based index)
 * @returns The modified deck (same reference as input)
 *
 * @example
 * // Move Big Joker to position 0 (human gets first card)
 * moveCardToPosition(deck, card => card.joker === JokerType.Big, 0);
 *
 * // Move a specific card to position 4
 * const specificCard = Card.createCard(Suit.Hearts, Rank.Seven, 0);
 * moveCardToPosition(deck, specificCard, 4);
 */
export const moveCardToPosition = (
  deck: Card[],
  cardMatcher: Card | ((card: Card) => boolean),
  targetPosition: number,
): Card[] => {
  if (targetPosition < 0 || targetPosition >= deck.length) {
    throw new Error(
      `Target position ${targetPosition} is out of bounds for deck of length ${deck.length}`,
    );
  }

  // Convert card object to matcher function
  const matcher =
    typeof cardMatcher === "function"
      ? cardMatcher
      : (card: Card) => card.id === cardMatcher.id;

  // Find the card to move
  const sourceIndex = deck.findIndex(matcher);
  if (sourceIndex === -1) {
    throw new Error("Card not found in deck");
  }

  // If already at target position, no need to move
  if (sourceIndex === targetPosition) {
    return deck;
  }

  // Remove card from current position
  const [cardToMove] = deck.splice(sourceIndex, 1);

  // Insert at target position
  deck.splice(targetPosition, 0, cardToMove);

  return deck;
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
    smallJoker: Card.createJoker(JokerType.Small, 0),
  },

  // Standard pairs for testing
  pairs: {
    spadesAces: Card.createPair(Suit.Spades, Rank.Ace),
    heartsTwos: Card.createPair(Suit.Hearts, Rank.Two),
    clubsKings: Card.createPair(Suit.Clubs, Rank.King),
    diamondsFives: Card.createPair(Suit.Diamonds, Rank.Five),
  },

  // Standard tractors for testing
  tractors: {
    spadesThreeFour: createTractor(Suit.Spades, Rank.Three, 2),
    heartsKingAce: createTractor(Suit.Hearts, Rank.King, 2),
    clubsFiveSixSeven: createTractor(Suit.Clubs, Rank.Five, 3),
  },
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
