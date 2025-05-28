import {
  Card,
  ComboType,
  JokerType,
  PlayerId,
  Rank,
  Suit
} from "../../src/types";
import { getAIMove } from '../../src/ai/aiLogic';
import { createAIStrategy } from '../../src/ai/aiStrategy';
import { createBasicGameState } from "../helpers";

// Use shared utility for basic AI testing game state
const createMockGameState = createBasicGameState;

// Helper function to create cards
const createCard = (suit: Suit, rank: Rank, id: string): Card => {
  let points = 0;
  if (rank === Rank.Five) points = 5;
  if (rank === Rank.Ten || rank === Rank.King) points = 10;
  return { suit, rank, id, points };
};

const createJoker = (type: JokerType, id: string): Card => {
  return { joker: type, id, points: 0 };
};

describe('AI Logic Tests', () => {
  describe('getAIMove function', () => {
    test('AI should return valid move when leading a trick', () => {
      const gameState = createMockGameState();
      
      // Give AI1 some cards
      gameState.players[1].hand = [
        createCard(Suit.Hearts, Rank.Six, 'hearts_6_1'),
        createCard(Suit.Hearts, Rank.Seven, 'hearts_7_1'),
        createCard(Suit.Spades, Rank.Three, 'spades_3_1')
      ];
      
      gameState.currentPlayerIndex = 1; // AI1's turn
      
      // AI is leading, so any valid combo is acceptable
      const move = getAIMove(gameState, PlayerId.Bot1);
      
      // AI should return a valid move
      expect(move).toBeDefined();
      expect(move.length).toBeGreaterThan(0);
      
      // All cards should be from AI's hand
      move.forEach(card => {
        const inHand = gameState.players[1].hand.some(c => c.id === card.id);
        expect(inHand).toBe(true);
      });
    });
    
    test('AI should follow suit correctly', () => {
      const gameState = createMockGameState();
      
      // Create a trick with Hearts as the leading suit
      gameState.currentTrick = {
        leadingPlayerId: PlayerId.Human,
        leadingCombo: [createCard(Suit.Hearts, Rank.Ace, 'hearts_a_1')],
        plays: [
          {
            playerId: PlayerId.Human,
            cards: [createCard(Suit.Hearts, Rank.Ace, 'hearts_a_1')]
          }
        ],
        winningPlayerId: PlayerId.Human,
        points: 0
      };
      
      // Give AI1 cards including a heart
      gameState.players[1].hand = [
        createCard(Suit.Hearts, Rank.Six, 'hearts_6_1'),
        createCard(Suit.Spades, Rank.Seven, 'spades_7_1'),
        createCard(Suit.Clubs, Rank.Three, 'clubs_3_1')
      ];
      
      gameState.currentPlayerIndex = 1; // AI1's turn
      
      const move = getAIMove(gameState, PlayerId.Bot1);
      
      // AI should play the heart card since it must follow suit
      expect(move.length).toBe(1);
      expect(move[0].suit).toBe(Suit.Hearts);
    });
    
    test('AI should handle forced play when no valid combos exist', () => {
      const gameState = createMockGameState();
      
      // Create a trick with Hearts as the leading suit
      gameState.currentTrick = {
        leadingPlayerId: PlayerId.Human,
        leadingCombo: [createCard(Suit.Hearts, Rank.Ace, 'hearts_a_1')],
        plays: [
          {
            playerId: PlayerId.Human,
            cards: [createCard(Suit.Hearts, Rank.Ace, 'hearts_a_1')]
          }
        ],
        winningPlayerId: PlayerId.Human,
        points: 0
      };
      
      // Give AI1 cards with NO hearts (forced to play off-suit)
      gameState.players[1].hand = [
        createCard(Suit.Spades, Rank.Seven, 'spades_7_1'),
        createCard(Suit.Clubs, Rank.Three, 'clubs_3_1'),
        createCard(Suit.Diamonds, Rank.Two, 'diamonds_2_1')
      ];
      
      gameState.currentPlayerIndex = 1; // AI1's turn
      
      const move = getAIMove(gameState, PlayerId.Bot1);
      
      // AI should play one card as required
      expect(move.length).toBe(1);
      // Card should be from AI's hand
      const inHand = gameState.players[1].hand.some(c => c.id === move[0].id);
      expect(inHand).toBe(true);
    });

    test('AI should handle case with multiple card combos', () => {
      const gameState = createMockGameState();
      
      // Create a trick with a pair as the leading combo
      gameState.currentTrick = {
        leadingPlayerId: PlayerId.Human,
        leadingCombo: [
          createCard(Suit.Hearts, Rank.Ace, 'hearts_a_1'),
          createCard(Suit.Hearts, Rank.Ace, 'hearts_a_2')
        ],
        plays: [
          {
            playerId: PlayerId.Human,
            cards: [
              createCard(Suit.Hearts, Rank.Ace, 'hearts_a_1'),
              createCard(Suit.Hearts, Rank.Ace, 'hearts_a_2')
            ]
          }
        ],
        winningPlayerId: PlayerId.Human,
        points: 0
      };
      
      // Give AI1 a pair of hearts
      gameState.players[1].hand = [
        createCard(Suit.Hearts, Rank.Six, 'hearts_6_1'),
        createCard(Suit.Hearts, Rank.Six, 'hearts_6_2'),
        createCard(Suit.Spades, Rank.Seven, 'spades_7_1'),
        createCard(Suit.Clubs, Rank.Three, 'clubs_3_1')
      ];
      
      gameState.currentPlayerIndex = 1; // AI1's turn
      
      const move = getAIMove(gameState, PlayerId.Bot1);
      
      // AI should play a pair of hearts
      expect(move.length).toBe(2);
      expect(move[0].suit).toBe(Suit.Hearts);
      expect(move[1].suit).toBe(Suit.Hearts);
      expect(move[0].rank).toBe(move[1].rank);
    });

    test('AI should handle case with no cards', () => {
      const gameState = createMockGameState();

      // Create a trick
      gameState.currentTrick = {
        leadingPlayerId: PlayerId.Human,
        leadingCombo: [createCard(Suit.Hearts, Rank.Ace, 'hearts_a_1')],
        plays: [
          {
            playerId: PlayerId.Human,
            cards: [createCard(Suit.Hearts, Rank.Ace, 'hearts_a_1')]
          }
        ],
        winningPlayerId: PlayerId.Human,
        points: 0
      };

      // NOTE: This test intentionally triggers a console warning
      // The warning "AI player bot1 doesn't have enough cards" is expected
      // Give AI1 no cards (edge case)
      gameState.players[1].hand = [];

      gameState.currentPlayerIndex = 1; // AI1's turn

      const move = getAIMove(gameState, PlayerId.Bot1);

      // AI should return empty array
      expect(move).toBeDefined();
      expect(move.length).toBe(0);
    });

    test('AI should play all cards of leading suit when cannot form matching combo', () => {
      const gameState = createMockGameState();

      // Create a trick with a pair as the leading combo
      gameState.currentTrick = {
        leadingPlayerId: PlayerId.Human,
        leadingCombo: [
          createCard(Suit.Diamonds, Rank.Eight, 'diamonds_8_1'),
          createCard(Suit.Diamonds, Rank.Eight, 'diamonds_8_2')
        ],
        plays: [
          {
            playerId: PlayerId.Human,
            cards: [
              createCard(Suit.Diamonds, Rank.Eight, 'diamonds_8_1'),
              createCard(Suit.Diamonds, Rank.Eight, 'diamonds_8_2')
            ]
          }
        ],
        winningPlayerId: PlayerId.Human,
        points: 0
      };

      // Give AI1 one diamond and several spades
      gameState.players[1].hand = [
        createCard(Suit.Diamonds, Rank.Ten, 'diamonds_10_1'),
        createCard(Suit.Spades, Rank.Two, 'spades_2_1'),
        createCard(Suit.Spades, Rank.Three, 'spades_3_1'),
        createCard(Suit.Spades, Rank.Four, 'spades_4_1')
      ];

      gameState.currentPlayerIndex = 1; // AI1's turn

      const move = getAIMove(gameState, PlayerId.Bot1);

      // AI must play the one diamond it has plus one other card
      expect(move.length).toBe(2);

      // First card must be the diamond
      expect(move.some(card => card.suit === Suit.Diamonds)).toBe(true);

      // Count the diamonds played
      const diamondsPlayed = move.filter(card => card.suit === Suit.Diamonds).length;
      expect(diamondsPlayed).toBe(1); // Must play exactly 1 diamond
    });

    test('AI should play matching combo in leading suit when available', () => {
      const gameState = createMockGameState();

      // Create a trick with a pair as the leading combo
      gameState.currentTrick = {
        leadingPlayerId: PlayerId.Human,
        leadingCombo: [
          createCard(Suit.Diamonds, Rank.Eight, 'diamonds_8_1'),
          createCard(Suit.Diamonds, Rank.Eight, 'diamonds_8_2')
        ],
        plays: [
          {
            playerId: PlayerId.Human,
            cards: [
              createCard(Suit.Diamonds, Rank.Eight, 'diamonds_8_1'),
              createCard(Suit.Diamonds, Rank.Eight, 'diamonds_8_2')
            ]
          }
        ],
        winningPlayerId: PlayerId.Human,
        points: 0
      };

      // Give AI1 a pair of diamonds and some other cards
      gameState.players[1].hand = [
        createCard(Suit.Diamonds, Rank.Ten, 'diamonds_10_1'),
        createCard(Suit.Diamonds, Rank.Ten, 'diamonds_10_2'),
        createCard(Suit.Spades, Rank.Two, 'spades_2_1'),
        createCard(Suit.Spades, Rank.Three, 'spades_3_1')
      ];

      gameState.currentPlayerIndex = 1; // AI1's turn

      const move = getAIMove(gameState, PlayerId.Bot1);

      // AI must play the pair of diamonds
      expect(move.length).toBe(2);

      // All cards must be diamonds
      expect(move.every(card => card.suit === Suit.Diamonds)).toBe(true);

      // They should be a pair (same rank)
      expect(move[0].rank).toBe(move[1].rank);
    });
  });

  describe('AI Strategy Tests', () => {
    test('Easy strategy should always return a move', () => {
      const gameState = createMockGameState();
      const strategy = createAIStrategy();
      
      // Give AI1 some cards
      gameState.players[1].hand = [
        createCard(Suit.Hearts, Rank.Six, 'hearts_6_1'),
        createCard(Suit.Hearts, Rank.Seven, 'hearts_7_1'),
        createCard(Suit.Spades, Rank.Three, 'spades_3_1')
      ];
      
      // Create a simple valid combo for testing
      const validCombos = [
        {
          type: ComboType.Single,
          cards: [createCard(Suit.Hearts, Rank.Six, 'hearts_6_1')],
          value: 6
        },
        {
          type: ComboType.Single,
          cards: [createCard(Suit.Hearts, Rank.Seven, 'hearts_7_1')],
          value: 7
        }
      ];

      const move = strategy.makePlay(gameState, gameState.players[1], validCombos);
      
      // Move should exist and be valid
      expect(move).toBeDefined();
      expect(move.length).toBe(1);
      expect(validCombos.some(combo => combo.cards[0].id === move[0].id)).toBe(true);
    });

    it('should contribute point cards when Human teammate leads with Ace', () => {
      // Create game state where Human has led with Ace and Bot2 (teammate) is following
      const gameState = createMockGameState();
      
      // Set up the trick: Human leads with Ace
      gameState.currentTrick = {
        leadingPlayerId: PlayerId.Human,
        leadingCombo: [createCard(Suit.Clubs, Rank.Ace, 'clubs_ace_1')],
        plays: [
          // Bot1 (opponent) has played
          { playerId: PlayerId.Bot1, cards: [createCard(Suit.Clubs, Rank.Three, 'clubs_3_1')] }
        ],
        winningPlayerId: PlayerId.Human, // Human is winning with Ace
        points: 0,
      };

      // It's Bot2's turn (Human's teammate)
      gameState.currentPlayerIndex = 2;
      
      // Bot2 has point cards available
      gameState.players[2].hand = [
        createCard(Suit.Clubs, Rank.King, 'clubs_king_1'), // 10 points
        createCard(Suit.Clubs, Rank.Ten, 'clubs_ten_1'),  // 10 points
        createCard(Suit.Clubs, Rank.Four, 'clubs_4_1'),   // 0 points
      ];

      // Get AI move for Bot2
      const move = getAIMove(gameState, PlayerId.Bot2);
      
      // Bot2 should contribute point cards (King or Ten, not Four)
      expect(move).toBeDefined();
      expect(move.length).toBe(1);
      
      const playedCard = move[0];
      expect(playedCard.points).toBeGreaterThan(0); // Should be a point card
      expect([Rank.King, Rank.Ten]).toContain(playedCard.rank); // Should be King or Ten
    });
  });
});