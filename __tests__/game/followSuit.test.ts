import {
  isValidPlay,
  getLeadingSuit,
  getComboType,
  compareCards,
  isTrump,
  compareCardCombos
} from '../../src/game/gameLogic';
import {
  Card, 
  Suit, 
  Rank, 
  TrumpInfo,
  ComboType
} from "../../src/types";

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
  
  test('When player has no cards of leading suit, any same-length combo can be played', () => {
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

    // Valid: Played a proper pair of hearts (same rank)
    const validPair = [
      createCard(Suit.Hearts, Rank.Seven, 'hearts_7_1'),
      createCard(Suit.Hearts, Rank.Seven, 'hearts_7_2')
    ];

    // Also Valid: Played any two cards since player has no leading suit
    const validMix = [
      createCard(Suit.Hearts, Rank.Seven, 'hearts_7_1'),
      createCard(Suit.Hearts, Rank.Eight, 'hearts_8_1')
    ];

    // Verify the combo types
    expect(getComboType(validPair)).toBe(ComboType.Pair);
    expect(getComboType(validMix)).toBe(ComboType.Single);

    // Both plays should be valid since player has no cards of leading suit
    expect(isValidPlay(validPair, leadingCombo, playerHand, trumpInfo)).toBe(true);
    expect(isValidPlay(validMix, leadingCombo, playerHand, trumpInfo)).toBe(true);
    
    // Test case for key scenario: two cards from same suit but not a pair (different ranks)
    // when played against a leading pair
    const specialCase = {
      playerHand: [
        createCard(Suit.Hearts, Rank.Seven, 'hearts_7_1'),
        createCard(Suit.Hearts, Rank.Eight, 'hearts_8_1'),
        createCard(Suit.Clubs, Rank.Nine, 'clubs_9_1')
      ],
      leadingCombo: [
        createCard(Suit.Diamonds, Rank.Ten, 'diamonds_10_1'),
        createCard(Suit.Diamonds, Rank.Ten, 'diamonds_10_2')
      ],
      playedCards: [
        createCard(Suit.Hearts, Rank.Seven, 'hearts_7_1'),
        createCard(Suit.Hearts, Rank.Eight, 'hearts_8_1')
      ]
    };
    
    // The played cards are two hearts of different ranks (not a proper pair)
    // This should be valid when the player has no diamonds
    expect(getComboType(specialCase.playedCards)).toBe(ComboType.Single);  // Not a pair
    expect(isValidPlay(
      specialCase.playedCards, 
      specialCase.leadingCombo, 
      specialCase.playerHand, 
      trumpInfo
    )).toBe(true);
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

  test('A♠-Q♠ cannot beat a leading 5♠-5♠ when 2♠ is trump', () => {
    // NOTE: This test verifies that two single trump cards cannot win against a trump pair,
    // even though the play is valid. "Cannot beat" refers to winning the trick, not validity.
    
    // Player has A♠ and Q♠ in hand (both trump cards due to trump suit)
    const playerHand = [
      createCard(Suit.Spades, Rank.Ace, 'spades_a_1'),
      createCard(Suit.Spades, Rank.Queen, 'spades_q_1'),
      createCard(Suit.Hearts, Rank.Seven, 'hearts_7_1')
    ];

    // Leading with a pair of 5♠
    const leadingCombo = [
      createCard(Suit.Spades, Rank.Five, 'spades_5_1'),
      createCard(Suit.Spades, Rank.Five, 'spades_5_2')
    ];

    // Playing A♠-Q♠ (which is not a valid pair, just two singles)
    const playedCards = [
      createCard(Suit.Spades, Rank.Ace, 'spades_a_1'),
      createCard(Suit.Spades, Rank.Queen, 'spades_q_1')
    ];

    // First, confirm both cards are trumps
    expect(isTrump(playedCards[0], trumpInfo)).toBe(true);
    expect(isTrump(playedCards[1], trumpInfo)).toBe(true);

    // Verify this doesn't form a valid pair
    expect(getComboType(playedCards)).not.toBe(ComboType.Pair);
    expect(getComboType(playedCards)).toBe(ComboType.Single);

    // The play is VALID (player has trumps and must play them)
    expect(isValidPlay(playedCards, leadingCombo, playerHand, trumpInfo)).toBe(true);

    // BUT it cannot win against the leading pair
    // compareCardCombos returns positive if first combo wins, negative if second wins
    const comparisonResult = compareCardCombos(leadingCombo, playedCards, trumpInfo);
    expect(comparisonResult).toBeGreaterThan(0); // Leading pair wins

    // For comparison, a valid pair would be allowed
    const validPairHand = [
      createCard(Suit.Spades, Rank.Ace, 'spades_a_1'),
      createCard(Suit.Hearts, Rank.Seven, 'hearts_7_1'),
      createCard(Suit.Hearts, Rank.Seven, 'hearts_7_2')
    ];

    const validPairPlay = [
      createCard(Suit.Hearts, Rank.Seven, 'hearts_7_1'),
      createCard(Suit.Hearts, Rank.Seven, 'hearts_7_2')
    ];

    // Confirm a proper pair would be allowed
    expect(getComboType(validPairPlay)).toBe(ComboType.Pair);
    expect(isValidPlay(validPairPlay, leadingCombo, validPairHand, trumpInfo)).toBe(true);
  });
});