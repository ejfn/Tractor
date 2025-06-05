import {
  Card,
  ComboType,
  JokerType,
  PlayerId,
  Rank,
  Suit,
  GameState,
  GamePhase,
  TrickWinnerAnalysis,
} from "../../src/types";
import { getAIMove } from '../../src/ai/aiLogic';
import { createAIStrategy } from '../../src/ai/aiStrategy';
import { createGameContext, analyzeTrickWinner } from "../../src/ai/aiGameContext";
import { createBasicGameState, createGameState, createTrick, createCard } from "../helpers";

/**
 * Comprehensive AI Core Tests
 * 
 * This file consolidates core AI functionality tests including:
 * - Basic AI logic and move generation
 * - AI strategy creation and execution
 * - Current trick winner analysis and decision making
 * - Team dynamics and coordination
 * - Edge case handling
 */

// Use shared utility for basic AI testing game state
const createMockGameState = createBasicGameState;

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

describe('AI Core Functionality', () => {
  describe('AI Logic Tests', () => {
    describe('getAIMove function', () => {
      test('AI should return valid move when leading a trick', () => {
        const gameState = createMockGameState();
        
        // Give AI1 some cards
        gameState.players[1].hand = [
          createCardWithPoints(Suit.Hearts, Rank.Six, 'hearts_6_1'),
          createCardWithPoints(Suit.Hearts, Rank.Seven, 'hearts_7_1'),
          createCardWithPoints(Suit.Spades, Rank.Three, 'spades_3_1')
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
          leadingCombo: [createCardWithPoints(Suit.Hearts, Rank.Ace, 'hearts_a_1')],
          plays: [
            {
              playerId: PlayerId.Human,
              cards: [createCardWithPoints(Suit.Hearts, Rank.Ace, 'hearts_a_1')]
            }
          ],
          winningPlayerId: PlayerId.Human,
          points: 0
        };
        
        // Give AI1 cards including a heart
        gameState.players[1].hand = [
          createCardWithPoints(Suit.Hearts, Rank.Six, 'hearts_6_1'),
          createCardWithPoints(Suit.Spades, Rank.Seven, 'spades_7_1'),
          createCardWithPoints(Suit.Clubs, Rank.Three, 'clubs_3_1')
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
          leadingCombo: [createCardWithPoints(Suit.Hearts, Rank.Ace, 'hearts_a_1')],
          plays: [
            {
              playerId: PlayerId.Human,
              cards: [createCardWithPoints(Suit.Hearts, Rank.Ace, 'hearts_a_1')]
            }
          ],
          winningPlayerId: PlayerId.Human,
          points: 0
        };
        
        // Give AI1 cards with NO hearts (forced to play off-suit)
        gameState.players[1].hand = [
          createCardWithPoints(Suit.Spades, Rank.Seven, 'spades_7_1'),
          createCardWithPoints(Suit.Clubs, Rank.Three, 'clubs_3_1'),
          createCardWithPoints(Suit.Diamonds, Rank.Two, 'diamonds_2_1')
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
            createCardWithPoints(Suit.Hearts, Rank.Ace, 'hearts_a_1'),
            createCardWithPoints(Suit.Hearts, Rank.Ace, 'hearts_a_2')
          ],
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
        
        // Give AI1 a pair of hearts
        gameState.players[1].hand = [
          createCardWithPoints(Suit.Hearts, Rank.Six, 'hearts_6_1'),
          createCardWithPoints(Suit.Hearts, Rank.Six, 'hearts_6_2'),
          createCardWithPoints(Suit.Spades, Rank.Seven, 'spades_7_1'),
          createCardWithPoints(Suit.Clubs, Rank.Three, 'clubs_3_1')
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
          leadingCombo: [createCardWithPoints(Suit.Hearts, Rank.Ace, 'hearts_a_1')],
          plays: [
            {
              playerId: PlayerId.Human,
              cards: [createCardWithPoints(Suit.Hearts, Rank.Ace, 'hearts_a_1')]
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
            createCardWithPoints(Suit.Diamonds, Rank.Eight, 'diamonds_8_1'),
            createCardWithPoints(Suit.Diamonds, Rank.Eight, 'diamonds_8_2')
          ],
          plays: [
            {
              playerId: PlayerId.Human,
              cards: [
                createCardWithPoints(Suit.Diamonds, Rank.Eight, 'diamonds_8_1'),
                createCardWithPoints(Suit.Diamonds, Rank.Eight, 'diamonds_8_2')
              ]
            }
          ],
          winningPlayerId: PlayerId.Human,
          points: 0
        };

        // Give AI1 one diamond and several spades
        gameState.players[1].hand = [
          createCardWithPoints(Suit.Diamonds, Rank.Ten, 'diamonds_10_1'),
          createCardWithPoints(Suit.Spades, Rank.Two, 'spades_2_1'),
          createCardWithPoints(Suit.Spades, Rank.Three, 'spades_3_1'),
          createCardWithPoints(Suit.Spades, Rank.Four, 'spades_4_1')
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
            createCardWithPoints(Suit.Diamonds, Rank.Eight, 'diamonds_8_1'),
            createCardWithPoints(Suit.Diamonds, Rank.Eight, 'diamonds_8_2')
          ],
          plays: [
            {
              playerId: PlayerId.Human,
              cards: [
                createCardWithPoints(Suit.Diamonds, Rank.Eight, 'diamonds_8_1'),
                createCardWithPoints(Suit.Diamonds, Rank.Eight, 'diamonds_8_2')
              ]
            }
          ],
          winningPlayerId: PlayerId.Human,
          points: 0
        };

        // Give AI1 a pair of diamonds and some other cards
        gameState.players[1].hand = [
          createCardWithPoints(Suit.Diamonds, Rank.Ten, 'diamonds_10_1'),
          createCardWithPoints(Suit.Diamonds, Rank.Ten, 'diamonds_10_2'),
          createCardWithPoints(Suit.Spades, Rank.Two, 'spades_2_1'),
          createCardWithPoints(Suit.Spades, Rank.Three, 'spades_3_1')
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
          createCardWithPoints(Suit.Hearts, Rank.Six, 'hearts_6_1'),
          createCardWithPoints(Suit.Hearts, Rank.Seven, 'hearts_7_1'),
          createCardWithPoints(Suit.Spades, Rank.Three, 'spades_3_1')
        ];
        
        // Create a simple valid combo for testing
        const validCombos = [
          {
            type: ComboType.Single,
            cards: [createCardWithPoints(Suit.Hearts, Rank.Six, 'hearts_6_1')],
            value: 6
          },
          {
            type: ComboType.Single,
            cards: [createCardWithPoints(Suit.Hearts, Rank.Seven, 'hearts_7_1')],
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
          leadingCombo: [createCardWithPoints(Suit.Clubs, Rank.Ace, 'clubs_ace_1')],
          plays: [
            // Bot1 (opponent) has played
            { playerId: PlayerId.Bot1, cards: [createCardWithPoints(Suit.Clubs, Rank.Three, 'clubs_3_1')] }
          ],
          winningPlayerId: PlayerId.Human, // Human is winning with Ace
          points: 0,
        };

        // It's Bot2's turn (Human's teammate)
        gameState.currentPlayerIndex = 2;
        
        // Bot2 has point cards available
        gameState.players[2].hand = [
          createCardWithPoints(Suit.Clubs, Rank.King, 'clubs_king_1'), // 10 points
          createCardWithPoints(Suit.Clubs, Rank.Ten, 'clubs_ten_1'),  // 10 points
          createCardWithPoints(Suit.Clubs, Rank.Four, 'clubs_4_1'),   // 0 points
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

  describe('Current Trick Winner Strategy', () => {
    let gameState: GameState;

    beforeEach(() => {
      gameState = createGameState({
        gamePhase: GamePhase.Playing,
      });
    });

    describe("Trick Winner Analysis", () => {
      it("should identify when teammate is winning", () => {
        // Setup: Human leads, Bot2 (teammate) is currently winning
        const trick = createTrick(
          PlayerId.Human,
          [createCard(Suit.Spades, Rank.Seven)],
          [
            {
              playerId: PlayerId.Bot1,
              cards: [createCard(Suit.Spades, Rank.Six)],
            },
          ],
          10,
          PlayerId.Bot2 // Teammate is winning
        );

        gameState.currentTrick = trick;

        const analysis = analyzeTrickWinner(gameState, PlayerId.Human);

        expect(analysis.currentWinner).toBe(PlayerId.Bot2);
        expect(analysis.isTeammateWinning).toBe(true);
        expect(analysis.isOpponentWinning).toBe(false);
        expect(analysis.isSelfWinning).toBe(false);
        expect(analysis.trickPoints).toBe(10);
        expect(analysis.shouldPlayConservatively).toBe(true);
      });

      it("should identify when opponent is winning", () => {
        // Setup: Bot1 (opponent) is currently winning
        // Give human player cards that can beat the opponent
        const humanPlayer = gameState.players.find(p => p.id === PlayerId.Human)!;
        humanPlayer.hand = [
          createCard(Suit.Hearts, Rank.Ace), // Can beat the King
          createCard(Suit.Spades, Rank.Three), // Other cards
        ];

        const trick = createTrick(
          PlayerId.Human,
          [createCard(Suit.Hearts, Rank.Seven)],
          [
            {
              playerId: PlayerId.Bot1,
              cards: [createCard(Suit.Hearts, Rank.King)], // 10 points
            },
          ],
          10,
          PlayerId.Bot1 // Opponent is winning
        );

        gameState.currentTrick = trick;

        const analysis = analyzeTrickWinner(gameState, PlayerId.Human);

        expect(analysis.currentWinner).toBe(PlayerId.Bot1);
        expect(analysis.isTeammateWinning).toBe(false);
        expect(analysis.isOpponentWinning).toBe(true);
        expect(analysis.isSelfWinning).toBe(false);
        expect(analysis.trickPoints).toBe(10);
        expect(analysis.shouldTryToBeat).toBe(true); // Should try to beat opponent with points
      });

      it("should identify when self is winning", () => {
        // Setup: Human is currently winning their own led trick
        const trick = createTrick(
          PlayerId.Human,
          [createCard(Suit.Clubs, Rank.Ace)],
          [
            {
              playerId: PlayerId.Bot1,
              cards: [createCard(Suit.Clubs, Rank.Six)],
            },
          ],
          0,
          PlayerId.Human // Self is winning
        );

        gameState.currentTrick = trick;

        const analysis = analyzeTrickWinner(gameState, PlayerId.Human);

        expect(analysis.currentWinner).toBe(PlayerId.Human);
        expect(analysis.isTeammateWinning).toBe(false); // Self winning, not teammate
        expect(analysis.isOpponentWinning).toBe(false); // Self winning, not opponent
        expect(analysis.isSelfWinning).toBe(true);
        expect(analysis.shouldPlayConservatively).toBe(true); // Conservative when no points
      });
    });

    describe("Context Integration", () => {
      it("should include trick winner analysis in game context", () => {
        const trick = createTrick(
          PlayerId.Bot1,
          [createCard(Suit.Hearts, Rank.King)], // 10 points
          [],
          10,
          PlayerId.Bot1
        );

        gameState.currentTrick = trick;

        const context = createGameContext(gameState, PlayerId.Human);

        expect(context.trickWinnerAnalysis).toBeDefined();
        expect(context.trickWinnerAnalysis!.currentWinner).toBe(PlayerId.Bot1);
        expect(context.trickWinnerAnalysis!.isOpponentWinning).toBe(true);
        expect(context.trickWinnerAnalysis!.trickPoints).toBe(10);
      });
    });

    describe("AI Strategy Decision Making", () => {
      it("should play conservatively when teammate is winning", () => {
        // Setup game where Bot2 (teammate) is winning with points
        const humanPlayer = gameState.players.find(p => p.id === PlayerId.Human)!;
        humanPlayer.hand = [
          createCard(Suit.Hearts, Rank.King), // 10 points - valuable
          createCard(Suit.Hearts, Rank.Three), // 0 points - safe
          createCard(Suit.Hearts, Rank.Four), // 0 points - safe
        ];

        const trick = createTrick(
          PlayerId.Bot1,
          [createCard(Suit.Hearts, Rank.Seven)],
          [
            {
              playerId: PlayerId.Bot2, // Teammate
              cards: [createCard(Suit.Hearts, Rank.Ace)], // Winning
            },
          ],
          15,
          PlayerId.Bot2 // Teammate winning
        );

        gameState.currentTrick = trick;
        gameState.currentPlayerIndex = 0; // Human's turn

        const aiMove = getAIMove(gameState, PlayerId.Human);

        // Should contribute points when teammate has strong card
        expect(aiMove).toHaveLength(1);
        expect(aiMove[0].suit).toBe(Suit.Hearts);
        expect(aiMove[0].rank).toBe(Rank.King);
      });

      it("should try to beat opponent when they're winning with points", () => {
        // Setup game where opponent is winning with significant points
        const humanPlayer = gameState.players.find(p => p.id === PlayerId.Human)!;
        humanPlayer.hand = [
          createCard(Suit.Hearts, Rank.Three), // Low card
          createCard(Suit.Hearts, Rank.Ace), // Can beat opponent
        ];

        const trick = createTrick(
          PlayerId.Bot1, // Opponent
          [createCard(Suit.Hearts, Rank.King)], // 10 points
          [],
          10,
          PlayerId.Bot1 // Opponent winning
        );

        gameState.currentTrick = trick;
        gameState.currentPlayerIndex = 0; // Human's turn

        const aiMove = getAIMove(gameState, PlayerId.Human);

        // Should play Ace to beat the King and capture points
        expect(aiMove).toHaveLength(1);
        expect(aiMove[0].suit).toBe(Suit.Hearts);
        expect(aiMove[0].rank).toBe(Rank.Ace);
      });

      it("should not waste high cards when opponent is winning low-value trick", () => {
        // Setup: Opponent winning but no significant points
        const humanPlayer = gameState.players.find(p => p.id === PlayerId.Human)!;
        humanPlayer.hand = [
          createCard(Suit.Hearts, Rank.Three), // Low safe card
          createCard(Suit.Hearts, Rank.Ace), // Valuable card
        ];

        const trick = createTrick(
          PlayerId.Bot1, // Opponent
          [createCard(Suit.Hearts, Rank.Seven)], // No points
          [],
          0, // No points at stake
          PlayerId.Bot1 // Opponent winning
        );

        gameState.currentTrick = trick;
        gameState.currentPlayerIndex = 0; // Human's turn

        const aiMove = getAIMove(gameState, PlayerId.Human);

        // Should play low card, not waste the Ace on a pointless trick
        expect(aiMove).toHaveLength(1);
        expect(aiMove[0].suit).toBe(Suit.Hearts);
        expect(aiMove[0].rank).toBe(Rank.Three);
      });
    });

    describe("Team Dynamics", () => {
      it("should correctly identify team relationships", () => {
        // Human + Bot2 vs Bot1 + Bot3
        const trick = createTrick(
          PlayerId.Bot2, // Teammate
          [createCard(Suit.Spades, Rank.Ace)],
          [],
          5,
          PlayerId.Bot2
        );

        gameState.currentTrick = trick;

        const analysis = analyzeTrickWinner(gameState, PlayerId.Human);

        expect(analysis.isTeammateWinning).toBe(true);
        expect(analysis.shouldPlayConservatively).toBe(true);
      });

      it("should handle complex trick scenarios", () => {
        // Multi-player trick with point collection
        const trick = createTrick(
          PlayerId.Human,
          [createCard(Suit.Diamonds, Rank.Five)], // 5 points
          [
            {
              playerId: PlayerId.Bot1, // Opponent
              cards: [createCard(Suit.Diamonds, Rank.King)], // 10 points, currently winning
            },
            {
              playerId: PlayerId.Bot2, // Teammate
              cards: [createCard(Suit.Diamonds, Rank.Six)], // Low card
            },
          ],
          15, // Total points (5 + 10)
          PlayerId.Bot1 // Opponent currently winning
        );

        gameState.currentTrick = trick;

        const analysis = analyzeTrickWinner(gameState, PlayerId.Bot3);

        expect(analysis.currentWinner).toBe(PlayerId.Bot1);
        expect(analysis.isOpponentWinning).toBe(false); // Bot1 is teammate to Bot3 (both Team B)
        expect(analysis.isTeammateWinning).toBe(true); // Bot1 is teammate to Bot3
        expect(analysis.trickPoints).toBe(15);
        expect(analysis.shouldTryToBeat).toBe(false); // Should not try to beat teammate
      });
    });

    describe("Edge Cases", () => {
      it("should throw error when no current trick", () => {
        gameState.currentTrick = null;

        expect(() => {
          analyzeTrickWinner(gameState, PlayerId.Human);
        }).toThrow("analyzeTrickWinner called with no active trick");
      });

      it("should handle trick with only leader played", () => {
        const trick = createTrick(
          PlayerId.Human,
          [createCard(Suit.Hearts, Rank.Ten)], // 10 points
          [], // No other players have played yet
          10,
          PlayerId.Human // Self is currently winning
        );

        gameState.currentTrick = trick;

        const analysis = analyzeTrickWinner(gameState, PlayerId.Human);

        expect(analysis.currentWinner).toBe(PlayerId.Human);
        expect(analysis.isSelfWinning).toBe(true);
        expect(analysis.trickPoints).toBe(10);
      });
    });
  });
});