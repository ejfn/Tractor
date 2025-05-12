import {
  isValidPlay,
  getLeadingSuit,
  getComboType,
  compareCards
} from '../src/utils/gameLogic';
import {
  Card, 
  Suit, 
  Rank, 
  TrumpInfo,
  ComboType
} from '../src/types/game';

// Helper function to create cards
const createCard = (suit: Suit, rank: Rank, id: string): Card => {
  let points = 0;
  if (rank === Rank.Five) points = 5;
  if (rank === Rank.Ten || rank === Rank.King) points = 10;
  return { suit, rank, id, points };
};

describe('Follow Suit Rules Tests', () => {
  // Standard trump info for tests
  const trumpInfo: TrumpInfo = {
    trumpRank: Rank.Two,
    trumpSuit: Suit.Spades,
    declared: true
  };

  test('Trump rank in trump suit should be higher than trump rank in other suits', () => {
    // Create cards for testing
    const twoOfSpades = createCard(Suit.Spades, Rank.Two, 'spades_2_1');   // Trump rank + Trump suit
    const twoOfHearts = createCard(Suit.Hearts, Rank.Two, 'hearts_2_1');   // Trump rank only
    const aceOfSpades = createCard(Suit.Spades, Rank.Ace, 'spades_a_1');   // Trump suit only
    const aceOfHearts = createCard(Suit.Hearts, Rank.Ace, 'hearts_a_1');   // Non-trump

    // Check hierarchy using getTrumpLevel indirectly through compareCards

    // Trump rank in trump suit > Trump rank in other suit
    expect(compareCards(twoOfSpades, twoOfHearts, trumpInfo)).toBeGreaterThan(0);

    // Trump rank in any suit > Trump suit cards
    expect(compareCards(twoOfHearts, aceOfSpades, trumpInfo)).toBeGreaterThan(0);

    // Trump suit > Non-trump
    expect(compareCards(aceOfSpades, aceOfHearts, trumpInfo)).toBeGreaterThan(0);
  });
  
  test('getLeadingSuit should return the suit of the first card with a suit', () => {
    const combo = [
      createCard(Suit.Hearts, Rank.Ace, 'hearts_a_1'),
      createCard(Suit.Hearts, Rank.King, 'hearts_k_1')
    ];
    
    expect(getLeadingSuit(combo)).toBe(Suit.Hearts);
  });
  
  test('getComboType should correctly identify pairs', () => {
    const pair = [
      createCard(Suit.Hearts, Rank.Ten, 'hearts_10_1'),
      createCard(Suit.Hearts, Rank.Ten, 'hearts_10_2')
    ];
    
    expect(getComboType(pair)).toBe(ComboType.Pair);
  });
  
  test('When leading, any valid combo is acceptable', () => {
    const playerHand = [
      createCard(Suit.Hearts, Rank.Ace, 'hearts_a_1'),
      createCard(Suit.Hearts, Rank.King, 'hearts_k_1'),
      createCard(Suit.Diamonds, Rank.Ten, 'diamonds_10_1')
    ];
    
    const playedCards = [
      createCard(Suit.Hearts, Rank.Ace, 'hearts_a_1')
    ];
    
    // No leading combo (null) means player is leading
    expect(isValidPlay(playedCards, null, playerHand, trumpInfo)).toBe(true);
  });
  
  test('When following, must match the combination length', () => {
    const playerHand = [
      createCard(Suit.Hearts, Rank.Ace, 'hearts_a_1'),
      createCard(Suit.Hearts, Rank.King, 'hearts_k_1'),
      createCard(Suit.Diamonds, Rank.Ten, 'diamonds_10_1')
    ];
    
    const leadingCombo = [
      createCard(Suit.Diamonds, Rank.Eight, 'diamonds_8_1'),
      createCard(Suit.Diamonds, Rank.Eight, 'diamonds_8_2')
    ];
    
    const playedCards = [
      createCard(Suit.Hearts, Rank.Ace, 'hearts_a_1')
    ];
    
    // Played one card when leading combo is a pair - invalid
    expect(isValidPlay(playedCards, leadingCombo, playerHand, trumpInfo)).toBe(false);
  });
  
  test('When following a pair, must play a pair of the same suit if available', () => {
    const playerHand = [
      createCard(Suit.Diamonds, Rank.Ten, 'diamonds_10_1'),
      createCard(Suit.Diamonds, Rank.Ten, 'diamonds_10_2'),
      createCard(Suit.Hearts, Rank.King, 'hearts_k_1')
    ];
    
    const leadingCombo = [
      createCard(Suit.Diamonds, Rank.Eight, 'diamonds_8_1'),
      createCard(Suit.Diamonds, Rank.Eight, 'diamonds_8_2')
    ];
    
    const validPlayedCards = [
      createCard(Suit.Diamonds, Rank.Ten, 'diamonds_10_1'),
      createCard(Suit.Diamonds, Rank.Ten, 'diamonds_10_2')
    ];
    
    const invalidPlayedCards = [
      createCard(Suit.Diamonds, Rank.Ten, 'diamonds_10_1'),
      createCard(Suit.Hearts, Rank.King, 'hearts_k_1')
    ];
    
    // Valid: Played a pair of diamonds when leading combo is a pair of diamonds
    expect(isValidPlay(validPlayedCards, leadingCombo, playerHand, trumpInfo)).toBe(true);
    
    // Invalid: Played one diamond and one heart when a pair of diamonds is available
    expect(isValidPlay(invalidPlayedCards, leadingCombo, playerHand, trumpInfo)).toBe(false);
  });
  
  test('When following and cannot form matching combo, must use all cards of leading suit', () => {
    // Player has one diamond and several hearts
    const playerHand = [
      createCard(Suit.Diamonds, Rank.Ten, 'diamonds_10_1'),
      createCard(Suit.Hearts, Rank.Seven, 'hearts_7_1'),
      createCard(Suit.Hearts, Rank.Eight, 'hearts_8_1'),
      createCard(Suit.Hearts, Rank.Nine, 'hearts_9_1')
    ];
    
    // Leading with a pair of diamonds
    const leadingCombo = [
      createCard(Suit.Diamonds, Rank.Eight, 'diamonds_8_1'),
      createCard(Suit.Diamonds, Rank.Eight, 'diamonds_8_2')
    ];
    
    // Valid: Played the one diamond plus one heart
    const validPlayedCards = [
      createCard(Suit.Diamonds, Rank.Ten, 'diamonds_10_1'),
      createCard(Suit.Hearts, Rank.Seven, 'hearts_7_1')
    ];
    
    // Invalid: Played two hearts, not using the diamond
    const invalidPlayedCards1 = [
      createCard(Suit.Hearts, Rank.Seven, 'hearts_7_1'),
      createCard(Suit.Hearts, Rank.Eight, 'hearts_8_1')
    ];
    
    // Invalid: Played one heart, not using the diamond
    const invalidPlayedCards2 = [
      createCard(Suit.Hearts, Rank.Seven, 'hearts_7_1'),
      createCard(Suit.Hearts, Rank.Eight, 'hearts_8_1')
    ];
    
    expect(isValidPlay(validPlayedCards, leadingCombo, playerHand, trumpInfo)).toBe(true);
    expect(isValidPlay(invalidPlayedCards1, leadingCombo, playerHand, trumpInfo)).toBe(false);
    expect(isValidPlay(invalidPlayedCards2, leadingCombo, playerHand, trumpInfo)).toBe(false);
  });
  
  test('When player has no cards of leading suit, can play any valid combo', () => {
    // Player has no diamonds, only hearts
    const playerHand = [
      createCard(Suit.Hearts, Rank.Seven, 'hearts_7_1'),
      createCard(Suit.Hearts, Rank.Seven, 'hearts_7_2'),
      createCard(Suit.Hearts, Rank.Eight, 'hearts_8_1')
    ];
    
    // Leading with a pair of diamonds
    const leadingCombo = [
      createCard(Suit.Diamonds, Rank.Ten, 'diamonds_10_1'),
      createCard(Suit.Diamonds, Rank.Ten, 'diamonds_10_2')
    ];
    
    // Valid: Played a pair of hearts
    const validPlayedCards1 = [
      createCard(Suit.Hearts, Rank.Seven, 'hearts_7_1'),
      createCard(Suit.Hearts, Rank.Seven, 'hearts_7_2')
    ];
    
    // Valid: Played any two cards from hand
    const validPlayedCards2 = [
      createCard(Suit.Hearts, Rank.Seven, 'hearts_7_1'),
      createCard(Suit.Hearts, Rank.Eight, 'hearts_8_1')
    ];
    
    expect(isValidPlay(validPlayedCards1, leadingCombo, playerHand, trumpInfo)).toBe(true);
    expect(isValidPlay(validPlayedCards2, leadingCombo, playerHand, trumpInfo)).toBe(true);
  });
  
  test('Must play all cards of leading suit even if not enough for the combo', () => {
    // Player has two diamonds and one heart
    const playerHand = [
      createCard(Suit.Diamonds, Rank.Ten, 'diamonds_10_1'),
      createCard(Suit.Diamonds, Rank.Jack, 'diamonds_j_1'),
      createCard(Suit.Hearts, Rank.Seven, 'hearts_7_1')
    ];
    
    // Leading with three diamonds
    const leadingCombo = [
      createCard(Suit.Diamonds, Rank.Eight, 'diamonds_8_1'),
      createCard(Suit.Diamonds, Rank.Eight, 'diamonds_8_2'),
      createCard(Suit.Diamonds, Rank.Eight, 'diamonds_8_3')
    ];
    
    // Valid: Used both diamonds plus one heart
    const validPlayedCards = [
      createCard(Suit.Diamonds, Rank.Ten, 'diamonds_10_1'),
      createCard(Suit.Diamonds, Rank.Jack, 'diamonds_j_1'),
      createCard(Suit.Hearts, Rank.Seven, 'hearts_7_1')
    ];
    
    // Invalid: Used only one diamond
    const invalidPlayedCards1 = [
      createCard(Suit.Diamonds, Rank.Ten, 'diamonds_10_1'),
      createCard(Suit.Hearts, Rank.Seven, 'hearts_7_1'),
      createCard(Suit.Hearts, Rank.Seven, 'hearts_7_2') // Not in hand
    ];
    
    // Invalid: Used no diamonds
    const invalidPlayedCards2 = [
      createCard(Suit.Hearts, Rank.Seven, 'hearts_7_1'),
      createCard(Suit.Hearts, Rank.Eight, 'hearts_8_1'), // Not in hand
      createCard(Suit.Hearts, Rank.Nine, 'hearts_9_1')   // Not in hand
    ];
    
    expect(isValidPlay(validPlayedCards, leadingCombo, playerHand, trumpInfo)).toBe(true);
    expect(isValidPlay(invalidPlayedCards1, leadingCombo, playerHand, trumpInfo)).toBe(false);
    expect(isValidPlay(invalidPlayedCards2, leadingCombo, playerHand, trumpInfo)).toBe(false);
  });
});