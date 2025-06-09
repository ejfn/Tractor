/**
 * Regression test for Issue #172: AI violates following rules by playing cross-suit cards
 * when same-suit cards are available
 * 
 * This test validates that AI players properly follow Tractor/Shengji rules when following pairs:
 * 1. Must follow suit and match combination type if possible
 * 2. Must exhaust all cards from leading suit before using other suits
 * 3. Cannot play cross-suit combinations when same-suit cards are available
 */

import { getAIMove } from '../../src/ai/aiLogic';
import { createBasicGameState } from '../helpers';
import { PlayerId, GamePhase, Suit, Rank, Card, JokerType } from '../../src/types';

// Helper function to create cards
const createCardWithPoints = (suit: Suit, rank: Rank, id: string): Card => {
  let points = 0;
  if (rank === Rank.Five) points = 5;
  if (rank === Rank.Ten || rank === Rank.King) points = 10;
  return { suit, rank, id, points };
};

const createJoker = (type: JokerType, id: string): Card => {
  return { joker: type, id, points: 0 };
};

describe('Issue #172: AI Cross-Suit Following Bug', () => {
  
  test('AI should not play cross-suit cards when same-suit pair following is possible', () => {
    const gameState = createBasicGameState();
    
    // Create trick with human leading 7♥-7♥ pair
    gameState.currentTrick = {
      plays: [
        {
          playerId: PlayerId.Human,
          cards: [
            createCardWithPoints(Suit.Hearts, Rank.Seven, 'hearts_7_1'),
            createCardWithPoints(Suit.Hearts, Rank.Seven, 'hearts_7_2')
          ]
        }
      ],
      winningPlayerId: PlayerId.Human,
      points: 0
    };

    // Give AI Bot1 multiple hearts including pairs
    gameState.players[1].hand = [
      createCardWithPoints(Suit.Hearts, Rank.Five, 'hearts_5_1'),   // Hearts available
      createCardWithPoints(Suit.Hearts, Rank.Five, 'hearts_5_2'),   // Hearts pair available
      createCardWithPoints(Suit.Hearts, Rank.Nine, 'hearts_9_1'),   // More hearts
      createCardWithPoints(Suit.Hearts, Rank.Queen, 'hearts_q_1'),  // More hearts
      createCardWithPoints(Suit.Spades, Rank.Eight, 'spades_8_1'),  // Other suit
      createCardWithPoints(Suit.Spades, Rank.Eight, 'spades_8_2'),  // Other suit pair
      createCardWithPoints(Suit.Clubs, Rank.King, 'clubs_k_1'),     // Other suit
      createCardWithPoints(Suit.Diamonds, Rank.Ace, 'diamonds_a_1') // Other suit
    ];

    gameState.currentPlayerIndex = 1; // Bot1's turn to follow

    // AI should follow the pair lead
    const aiResponse = getAIMove(gameState, PlayerId.Bot1);

    // Validate AI response
    expect(aiResponse).toHaveLength(2); // Should play exactly 2 cards (pair)
    
    // Critical validation: Both cards must be from the same suit (Hearts)
    expect(aiResponse[0].suit).toBe(Suit.Hearts);
    expect(aiResponse[1].suit).toBe(Suit.Hearts);
    
    // Additional validation: Should be a proper pair or at least both hearts
    const suits = aiResponse.map(card => card.suit);
    const uniqueSuits = new Set(suits);
    expect(uniqueSuits.size).toBe(1); // All cards from same suit
    expect(uniqueSuits.has(Suit.Hearts)).toBe(true); // Must be hearts
  });

  test('AI should exhaust all hearts before using other suits when following pairs', () => {
    const gameState = createBasicGameState();
    
    // Create trick with human leading K♥-K♥ pair
    gameState.currentTrick = {
      plays: [
        {
          playerId: PlayerId.Human,
          cards: [
            createCardWithPoints(Suit.Hearts, Rank.King, 'hearts_k_1'),
            createCardWithPoints(Suit.Hearts, Rank.King, 'hearts_k_2')
          ]
        }
      ],
      winningPlayerId: PlayerId.Human,
      points: 20 // Two Kings = 20 points
    };

    // AI bot with insufficient hearts for pair but has some hearts
    gameState.players[1].hand = [
      createCardWithPoints(Suit.Hearts, Rank.Three, 'hearts_3_1'),   // Only one heart rank available
      createCardWithPoints(Suit.Hearts, Rank.Seven, 'hearts_7_1'),   // Different heart rank
      createCardWithPoints(Suit.Spades, Rank.Ten, 'spades_10_1'),    // Other suit pair
      createCardWithPoints(Suit.Spades, Rank.Ten, 'spades_10_2'),    // Other suit pair
      createCardWithPoints(Suit.Clubs, Rank.Queen, 'clubs_q_1'),     // Other suit
      createCardWithPoints(Suit.Diamonds, Rank.Ace, 'diamonds_a_1')  // Other suit
    ];

    gameState.currentPlayerIndex = 1; // Bot1's turn to follow

    const aiResponse = getAIMove(gameState, PlayerId.Bot1);

    expect(aiResponse).toHaveLength(2); // Must play 2 cards to follow pair
    
    // Should use all available hearts (2 cards) instead of cross-suit
    const heartsPlayed = aiResponse.filter(card => card.suit === Suit.Hearts);
    expect(heartsPlayed).toHaveLength(2); // Should use both available hearts
    
    // Validate no cross-suit mixing
    const suits = aiResponse.map(card => card.suit);
    const uniqueSuits = new Set(suits);
    expect(uniqueSuits.size).toBe(1); // All cards from same suit
  });

  test('AI should only use cross-suit when completely out of leading suit', () => {
    const gameState = createBasicGameState();
    
    // Create trick with human leading A♥-A♥ pair
    gameState.currentTrick = {
      plays: [
        {
          playerId: PlayerId.Human,
          cards: [
            createCardWithPoints(Suit.Hearts, Rank.Ace, 'hearts_a_1'),
            createCardWithPoints(Suit.Hearts, Rank.Ace, 'hearts_a_2')
          ]
        }
      ],
      winningPlayerId: PlayerId.Human,
      points: 0
    };

    // AI bot with NO hearts - can use other suits
    gameState.players[1].hand = [
      createCardWithPoints(Suit.Spades, Rank.Ten, 'spades_10_1'),    // Other suit pair
      createCardWithPoints(Suit.Spades, Rank.Ten, 'spades_10_2'),    // Other suit pair
      createCardWithPoints(Suit.Clubs, Rank.Queen, 'clubs_q_1'),     // Other suit
      createCardWithPoints(Suit.Diamonds, Rank.King, 'diamonds_k_1'), // Other suit
      createCardWithPoints(Suit.Spades, Rank.Five, 'spades_5_1'),    // Other suit
      createCardWithPoints(Suit.Clubs, Rank.Jack, 'clubs_j_1')       // Other suit
    ];

    gameState.currentPlayerIndex = 1; // Bot1's turn to follow

    const aiResponse = getAIMove(gameState, PlayerId.Bot1);

    expect(aiResponse).toHaveLength(2); // Must play 2 cards
    
    // Verify no hearts were played (since AI has none)
    const heartsPlayed = aiResponse.filter(card => card.suit === Suit.Hearts);
    expect(heartsPlayed).toHaveLength(0);
    
    // This scenario is valid - AI can play from other suits when out of hearts
    // The key is that AI should prioritize pairs from same suit when possible
    const suits = aiResponse.map(card => card.suit);
    
    // If AI plays a pair, it should be from same suit
    if (aiResponse[0].rank === aiResponse[1].rank) {
      const uniqueSuits = new Set(suits);
      expect(uniqueSuits.size).toBe(1); // Pair should be from same suit
    }
  });

  test('AI should prefer same-suit pairs over cross-suit combinations', () => {
    const gameState = createBasicGameState();
    
    // Create trick with human leading 9♦-9♦ pair
    gameState.currentTrick = {
      plays: [
        {
          playerId: PlayerId.Human,
          cards: [
            createCardWithPoints(Suit.Diamonds, Rank.Nine, 'diamonds_9_1'),
            createCardWithPoints(Suit.Diamonds, Rank.Nine, 'diamonds_9_2')
          ]
        }
      ],
      winningPlayerId: PlayerId.Human,
      points: 0
    };

    // AI with multiple options including same-suit pair
    gameState.players[1].hand = [
      createCardWithPoints(Suit.Diamonds, Rank.Jack, 'diamonds_j_1'),  // Diamond available
      createCardWithPoints(Suit.Diamonds, Rank.Jack, 'diamonds_j_2'),  // Diamond pair available
      createCardWithPoints(Suit.Diamonds, Rank.Queen, 'diamonds_q_1'), // More diamonds
      createCardWithPoints(Suit.Hearts, Rank.Eight, 'hearts_8_1'),     // Other suit pair
      createCardWithPoints(Suit.Hearts, Rank.Eight, 'hearts_8_2'),     // Other suit pair
      createCardWithPoints(Suit.Spades, Rank.King, 'spades_k_1'),      // Other suit
      createCardWithPoints(Suit.Clubs, Rank.Ace, 'clubs_a_1')         // Other suit
    ];

    gameState.currentPlayerIndex = 1; // Bot1's turn to follow

    const aiResponse = getAIMove(gameState, PlayerId.Bot1);

    expect(aiResponse).toHaveLength(2);
    
    // AI should prioritize diamond pair over cross-suit play
    expect(aiResponse[0].suit).toBe(Suit.Diamonds);
    expect(aiResponse[1].suit).toBe(Suit.Diamonds);
    
    // Should be the J♦-J♦ pair specifically
    expect(aiResponse[0].rank).toBe(Rank.Jack);
    expect(aiResponse[1].rank).toBe(Rank.Jack);
  });
});