import {
  getAIMove,
  shouldAIDeclare,
  createAIStrategy
} from '../../src/utils/aiLogic';
import {
  Card,
  GameState,
  Rank,
  Suit,
  JokerType,
  Trick,
  ComboType
} from '../../src/types/game';
import { 
  createAITestGameState, 
  createTestCard, 
  setPlayerCards,
  createSequentialCards 
} from '../helpers/testUtils';
import { GameStateUtils } from '../../src/utils/gameStateUtils';

// Create a mock game state for testing

// Helper function to create cards
const createCard = (suit: Suit, rank: Rank, id: string): Card => 
  createTestCard(suit, rank, undefined, id);

const createJoker = (type: JokerType, id: string): Card => {
  return { joker: type, id, points: 0 };
};

describe('AI Logic Tests', () => {
  describe('getAIMove function', () => {
    test('AI should return valid move when leading a trick', () => {
      const gameState = createAITestGameState();
      
      // Give AI1 some cards
      const ai1Player = GameStateUtils.getPlayerById(gameState, 'ai1');
      ai1Player.hand = [
        createTestCard(Suit.Hearts, Rank.Six, undefined, 'hearts_6_1'),
        createTestCard(Suit.Hearts, Rank.Seven, undefined, 'hearts_7_1'),
        createTestCard(Suit.Spades, Rank.Three, undefined, 'spades_3_1')
      ];
      
      // AI1's turn will be determined by trick state
      
      // AI is leading, so any valid combo is acceptable
      const move = getAIMove(gameState, 'ai1');
      
      // AI should return a valid move
      expect(move).toBeDefined();
      expect(move.length).toBeGreaterThan(0);
      
      // All cards should be from AI's hand
      move.forEach(card => {
        const inHand = ai1Player.hand.some(c => c.id === card.id);
        expect(inHand).toBe(true);
      });
    });
    
    test('AI should follow suit correctly', () => {
      const gameState = createAITestGameState();
      
      // Create a trick with Hearts as the leading suit
      gameState.currentTrick = {
        leadingPlayerId: 'player',
        leadingCombo: [createTestCard(Suit.Hearts, Rank.Ace, undefined, 'hearts_a_1')],
        plays: [
          {
            playerId: 'player',
            cards: [createTestCard(Suit.Hearts, Rank.Ace, undefined, 'hearts_a_1')]
          }
        ],
        points: 0
      };
      
      // Give AI1 cards including a heart
      const ai1Player = GameStateUtils.getPlayerById(gameState, 'ai1');
      ai1Player.hand = [
        createTestCard(Suit.Hearts, Rank.Six, undefined, 'hearts_6_1'),
        createTestCard(Suit.Spades, Rank.Seven, undefined, 'spades_7_1'),
        createTestCard(Suit.Clubs, Rank.Three, undefined, 'clubs_3_1')
      ];
      
      // AI1's turn will be determined by trick state
      
      const move = getAIMove(gameState, 'ai1');
      
      // AI should play the heart card since it must follow suit
      expect(move.length).toBe(1);
      expect(move[0].suit).toBe(Suit.Hearts);
    });
    
    test('AI should handle forced play when no valid combos exist', () => {
      const gameState = createAITestGameState();
      
      // Create a trick with Hearts as the leading suit
      gameState.currentTrick = {
        leadingPlayerId: 'player',
        leadingCombo: [createTestCard(Suit.Hearts, Rank.Ace, undefined, 'hearts_a_1')],
        plays: [
          {
            playerId: 'player',
            cards: [createTestCard(Suit.Hearts, Rank.Ace, undefined, 'hearts_a_1')]
          }
        ],
        points: 0
      };
      
      // Give AI1 cards with NO hearts (forced to play off-suit)
      const ai1Player = GameStateUtils.getPlayerById(gameState, 'ai1');
      ai1Player.hand = [
        createTestCard(Suit.Spades, Rank.Seven, undefined, 'spades_7_1'),
        createTestCard(Suit.Clubs, Rank.Three, undefined, 'clubs_3_1'),
        createTestCard(Suit.Diamonds, Rank.Two, undefined, 'diamonds_2_1')
      ];
      
      // AI1's turn will be determined by trick state
      
      const move = getAIMove(gameState, 'ai1');
      
      // AI should play one card as required
      expect(move.length).toBe(1);
      // Card should be from AI's hand
      const inHand = ai1Player.hand.some(c => c.id === move[0].id);
      expect(inHand).toBe(true);
    });

    test('AI should handle case with multiple card combos', () => {
      const gameState = createAITestGameState();
      
      // Create a trick with a pair as the leading combo
      gameState.currentTrick = {
        leadingPlayerId: 'player',
        leadingCombo: [
          createTestCard(Suit.Hearts, Rank.Ace, undefined, 'hearts_a_1'),
          createTestCard(Suit.Hearts, Rank.Ace, undefined, 'hearts_a_2')
        ],
        plays: [
          {
            playerId: 'player',
            cards: [
              createTestCard(Suit.Hearts, Rank.Ace, undefined, 'hearts_a_1'),
              createTestCard(Suit.Hearts, Rank.Ace, undefined, 'hearts_a_2')
            ]
          }
        ],
        points: 0
      };
      
      // Give AI1 a pair of hearts
      const ai1Player = GameStateUtils.getPlayerById(gameState, 'ai1');
      ai1Player.hand = [
        createTestCard(Suit.Hearts, Rank.Six, undefined, 'hearts_6_1'),
        createTestCard(Suit.Hearts, Rank.Six, undefined, 'hearts_6_2'),
        createTestCard(Suit.Spades, Rank.Seven, undefined, 'spades_7_1'),
        createTestCard(Suit.Clubs, Rank.Three, undefined, 'clubs_3_1')
      ];
      
      // AI1's turn will be determined by trick state
      
      const move = getAIMove(gameState, 'ai1');
      
      // AI should play a pair of hearts
      expect(move.length).toBe(2);
      expect(move[0].suit).toBe(Suit.Hearts);
      expect(move[1].suit).toBe(Suit.Hearts);
      expect(move[0].rank).toBe(move[1].rank);
    });

    test('AI should handle case with few cards remaining', () => {
      const gameState = createAITestGameState();
      
      // Create a trick with a pair as leading combo
      gameState.currentTrick = {
        leadingPlayerId: 'player',
        leadingCombo: [
          createTestCard(Suit.Hearts, Rank.Ace, undefined, 'hearts_a_1'),
          createTestCard(Suit.Hearts, Rank.Ace, undefined, 'hearts_a_2')
        ],
        plays: [
          {
            playerId: 'player',
            cards: [
              createTestCard(Suit.Hearts, Rank.Ace, undefined, 'hearts_a_1'),
              createTestCard(Suit.Hearts, Rank.Ace, undefined, 'hearts_a_2')
            ]
          }
        ],
        points: 0
      };
      
      // NOTE: This test intentionally triggers a console warning
      // The warning "AI player ai1 doesn't have enough cards" is expected
      // Give AI1 only one card (not enough to follow the pair)
      const ai1Player = GameStateUtils.getPlayerById(gameState, 'ai1');
      ai1Player.hand = [
        createTestCard(Suit.Hearts, Rank.Six, undefined, 'hearts_6_1')
      ];
      
      // AI1's turn will be determined by trick state
      
      const move = getAIMove(gameState, 'ai1');
      
      // AI should return whatever card it has, even if not enough cards
      expect(move.length).toBe(1);
      expect(move[0].suit).toBe(Suit.Hearts);
    });

    test('AI should handle case with no cards', () => {
      const gameState = createAITestGameState();

      // Create a trick
      gameState.currentTrick = {
        leadingPlayerId: 'player',
        leadingCombo: [createTestCard(Suit.Hearts, Rank.Ace, undefined, 'hearts_a_1')],
        plays: [
          {
            playerId: 'player',
            cards: [createTestCard(Suit.Hearts, Rank.Ace, undefined, 'hearts_a_1')]
          }
        ],
        points: 0
      };

      // NOTE: This test intentionally triggers a console warning
      // The warning "AI player ai1 doesn't have enough cards" is expected
      // Give AI1 no cards (edge case)
      const ai1Player = GameStateUtils.getPlayerById(gameState, 'ai1');
      ai1Player.hand = [];

      // AI1's turn will be determined by trick state

      const move = getAIMove(gameState, 'ai1');

      // AI should return empty array
      expect(move).toBeDefined();
      expect(move.length).toBe(0);
    });

    test('AI should play all cards of leading suit when cannot form matching combo', () => {
      const gameState = createAITestGameState();

      // Create a trick with a pair as the leading combo
      gameState.currentTrick = {
        leadingPlayerId: 'player',
        leadingCombo: [
          createTestCard(Suit.Diamonds, Rank.Eight, undefined, 'diamonds_8_1'),
          createTestCard(Suit.Diamonds, Rank.Eight, undefined, 'diamonds_8_2')
        ],
        plays: [
          {
            playerId: 'player',
            cards: [
              createTestCard(Suit.Diamonds, Rank.Eight, undefined, 'diamonds_8_1'),
              createTestCard(Suit.Diamonds, Rank.Eight, undefined, 'diamonds_8_2')
            ]
          }
        ],
        points: 0
      };

      // Give AI1 one diamond and several spades
      const ai1Player = GameStateUtils.getPlayerById(gameState, 'ai1');
      ai1Player.hand = [
        createTestCard(Suit.Diamonds, Rank.Ten, undefined, 'diamonds_10_1'),
        createTestCard(Suit.Spades, Rank.Two, undefined, 'spades_2_1'),
        createTestCard(Suit.Spades, Rank.Three, undefined, 'spades_3_1'),
        createTestCard(Suit.Spades, Rank.Four, undefined, 'spades_4_1')
      ];

      // AI1's turn will be determined by trick state

      const move = getAIMove(gameState, 'ai1');

      // AI must play the one diamond it has plus one other card
      expect(move.length).toBe(2);

      // First card must be the diamond
      expect(move.some(card => card.suit === Suit.Diamonds)).toBe(true);

      // Count the diamonds played
      const diamondsPlayed = move.filter(card => card.suit === Suit.Diamonds).length;
      expect(diamondsPlayed).toBe(1); // Must play exactly 1 diamond
    });

    test('AI should play matching combo in leading suit when available', () => {
      const gameState = createAITestGameState();

      // Create a trick with a pair as the leading combo
      gameState.currentTrick = {
        leadingPlayerId: 'player',
        leadingCombo: [
          createTestCard(Suit.Diamonds, Rank.Eight, undefined, 'diamonds_8_1'),
          createTestCard(Suit.Diamonds, Rank.Eight, undefined, 'diamonds_8_2')
        ],
        plays: [
          {
            playerId: 'player',
            cards: [
              createTestCard(Suit.Diamonds, Rank.Eight, undefined, 'diamonds_8_1'),
              createTestCard(Suit.Diamonds, Rank.Eight, undefined, 'diamonds_8_2')
            ]
          }
        ],
        points: 0
      };

      // Give AI1 a pair of diamonds and some other cards
      const ai1Player = GameStateUtils.getPlayerById(gameState, 'ai1');
      ai1Player.hand = [
        createTestCard(Suit.Diamonds, Rank.Ten, undefined, 'diamonds_10_1'),
        createTestCard(Suit.Diamonds, Rank.Ten, undefined, 'diamonds_10_2'),
        createTestCard(Suit.Spades, Rank.Two, undefined, 'spades_2_1'),
        createTestCard(Suit.Spades, Rank.Three, undefined, 'spades_3_1')
      ];

      // AI1's turn will be determined by trick state

      const move = getAIMove(gameState, 'ai1');

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
      const gameState = createAITestGameState();
      const strategy = createAIStrategy();
      
      // Give AI1 some cards
      const ai1Player = GameStateUtils.getPlayerById(gameState, 'ai1');
      ai1Player.hand = [
        createTestCard(Suit.Hearts, Rank.Six, undefined, 'hearts_6_1'),
        createTestCard(Suit.Hearts, Rank.Seven, undefined, 'hearts_7_1'),
        createTestCard(Suit.Spades, Rank.Three, undefined, 'spades_3_1')
      ];
      
      // Create a simple valid combo for testing
      const validCombos = [
        {
          type: ComboType.Single,
          cards: [createTestCard(Suit.Hearts, Rank.Six, undefined, 'hearts_6_1')],
          value: 6
        },
        {
          type: ComboType.Single,
          cards: [createTestCard(Suit.Hearts, Rank.Seven, undefined, 'hearts_7_1')],
          value: 7
        }
      ];

      const move = strategy.makePlay(gameState, ai1Player, validCombos, 1);
      
      // Move should exist and be valid
      expect(move).toBeDefined();
      expect(move.length).toBe(1);
      expect(validCombos.some(combo => combo.cards[0].id === move[0].id)).toBe(true);
    });
  });
});
