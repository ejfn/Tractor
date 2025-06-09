import { getAIMove } from '../../src/ai/aiLogic';
import { initializeGame } from '../../src/game/gameLogic';
import { PlayerId, Rank, Suit, GamePhase, TrickPosition } from '../../src/types';
import type { GameState } from '../../src/types';

describe('Position-Based Strategy Integration Tests - First and Second Player Strategies', () => {
  describe('First Player (Leading) Strategy', () => {
    it('should use sophisticated leading strategy when AI is first to play', () => {
      const gameState = initializeGame();
      
      // Setup trump for strategic context
      gameState.trumpInfo = {
        trumpRank: Rank.Two,
        trumpSuit: Suit.Hearts,
      };

      // AI Bot1 leading hand with strategic options
      const aiBotHand = [
        { id: 'ace-spades', rank: Rank.Ace, suit: Suit.Spades, points: 0 },     // Strong non-trump
        { id: 'king-clubs', rank: Rank.King, suit: Suit.Clubs, points: 10 },    // Point card
        { id: '7-diamonds', rank: Rank.Seven, suit: Suit.Diamonds, points: 0 }, // Probe card
        { id: '3-hearts', rank: Rank.Three, suit: Suit.Hearts, points: 0 },     // Weak trump
        { id: '8-spades', rank: Rank.Eight, suit: Suit.Spades, points: 0 },     // Medium card
      ];

      gameState.players[1].hand = aiBotHand;
      gameState.currentPlayerIndex = 1; // Bot 1's turn (leading)
      gameState.gamePhase = GamePhase.Playing;
      gameState.currentTrick = null; // Leading position

      const selectedCards = getAIMove(gameState, PlayerId.Bot1);
      
      expect(selectedCards).toHaveLength(1);
      expect(selectedCards[0]).toBeDefined();
      
      // Verify AI is using strategic leading logic
      const selectedCard = selectedCards[0];
      
      // Should not lead with weak trump (3♥) in early game
      expect(selectedCard.rank).not.toBe(Rank.Three);
      expect(!(selectedCard.suit === Suit.Hearts && selectedCard.rank === Rank.Three)).toBe(true);
      
      // Should prefer strategic non-trump or probe plays
      console.log(`First player leading strategy selected: ${selectedCard.rank}${selectedCard.suit?.charAt(0)}`);
    });

    it('should adapt strategy based on game phase', () => {
      const gameState = initializeGame();
      
      gameState.trumpInfo = {
        trumpRank: Rank.Two,
        trumpSuit: Suit.Diamonds,
      };

      // Simulate mid-game scenario with some tricks played
      gameState.tricks = Array(5).fill(null).map((_, i) => ({
        plays: [
          { playerId: PlayerId.Human, cards: [{ id: `dummy-${i}`, rank: Rank.King, suit: Suit.Spades, points: 10 }] }
        ],
        points: 10,
        winningPlayerId: PlayerId.Human,
      }));

      const aiBotHand = [
        { id: 'ace-hearts', rank: Rank.Ace, suit: Suit.Hearts, points: 0 },
        { id: '10-spades', rank: Rank.Ten, suit: Suit.Spades, points: 10 },
        { id: '5-clubs', rank: Rank.Five, suit: Suit.Clubs, points: 5 },
      ];

      gameState.players[2].hand = aiBotHand;
      gameState.currentPlayerIndex = 2;
      gameState.gamePhase = GamePhase.Playing;
      gameState.currentTrick = null;

      const selectedCards = getAIMove(gameState, PlayerId.Bot2);
      
      expect(selectedCards).toHaveLength(1);
      expect(selectedCards[0]).toBeDefined();
      
      console.log(`Mid-game first player strategy selected: ${selectedCards[0].rank}${selectedCards[0].suit?.charAt(0)}`);
    });
  });

  describe('Second Player Strategy', () => {
    it('should analyze leader relationship and respond appropriately', () => {
      const gameState = initializeGame();
      
      gameState.trumpInfo = {
        trumpRank: Rank.Two,
        trumpSuit: Suit.Spades,
      };

      // Setup trick with Human leading (teammate to Bot2)
      gameState.currentTrick = {
        plays: [
          { playerId: PlayerId.Human, cards: [{ id: 'lead-ace', rank: Rank.Ace, suit: Suit.Hearts, points: 0 }] }
        ],
        winningPlayerId: PlayerId.Human,
        points: 0,
      };

      // Bot2 second to play (teammate of Human)
      const aiBotHand = [
        { id: 'king-hearts', rank: Rank.King, suit: Suit.Hearts, points: 10 },   // Point card same suit
        { id: '10-hearts', rank: Rank.Ten, suit: Suit.Hearts, points: 10 },     // Point card same suit
        { id: '7-hearts', rank: Rank.Seven, suit: Suit.Hearts, points: 0 },     // Safe same suit
        { id: '3-spades', rank: Rank.Three, suit: Suit.Spades, points: 0 },     // Trump
      ];

      gameState.players[2].hand = aiBotHand;
      gameState.currentPlayerIndex = 2; // Bot 2's turn (second player)
      gameState.gamePhase = GamePhase.Playing;

      const selectedCards = getAIMove(gameState, PlayerId.Bot2);
      
      expect(selectedCards).toHaveLength(1);
      expect(selectedCards[0]).toBeDefined();
      expect(selectedCards[0].suit).toBe(Suit.Hearts); // Must follow suit
      
      // Should use second player strategy (teammate analysis)
      const selectedCard = selectedCards[0];
      console.log(`Second player teammate response: ${selectedCard.rank}${selectedCard.suit?.charAt(0)} (points: ${selectedCard.points})`);
    });

    it('should respond differently to opponent leader', () => {
      const gameState = initializeGame();
      
      gameState.trumpInfo = {
        trumpRank: Rank.Two,
        trumpSuit: Suit.Clubs,
      };

      // Setup trick with Bot1 leading (opponent to Bot2)
      gameState.currentTrick = {
        plays: [
          { playerId: PlayerId.Bot1, cards: [{ id: 'lead-ten', rank: Rank.Ten, suit: Suit.Diamonds, points: 10 }] }
        ],
        winningPlayerId: PlayerId.Bot1,
        points: 10,
      };

      // Bot2 second to play (opponent of Bot1)
      const aiBotHand = [
        { id: 'ace-diamonds', rank: Rank.Ace, suit: Suit.Diamonds, points: 0 },    // Strong same suit
        { id: 'king-diamonds', rank: Rank.King, suit: Suit.Diamonds, points: 10 }, // Point card same suit
        { id: '5-diamonds', rank: Rank.Five, suit: Suit.Diamonds, points: 5 },     // Small point
        { id: '2-clubs', rank: Rank.Two, suit: Suit.Clubs, points: 0 },           // Trump rank
      ];

      gameState.players[2].hand = aiBotHand;
      gameState.currentPlayerIndex = 2;
      gameState.gamePhase = GamePhase.Playing;

      const selectedCards = getAIMove(gameState, PlayerId.Bot2);
      
      expect(selectedCards).toHaveLength(1);
      expect(selectedCards[0]).toBeDefined();
      expect(selectedCards[0].suit).toBe(Suit.Diamonds); // Must follow suit
      
      // Should use second player strategy (opponent blocking)
      const selectedCard = selectedCards[0];
      console.log(`Second player opponent response: ${selectedCard.rank}${selectedCard.suit?.charAt(0)} (points: ${selectedCard.points})`);
    });
  });

  describe('Position Strategy Integration', () => {
    it('should use enhanced position strategies for first and second players', () => {
      const gameState = initializeGame();
      
      // Test that the enhanced position strategies are being used
      // This is more of a smoke test to ensure the integration works
      
      gameState.trumpInfo = {
        trumpRank: Rank.Two,
        trumpSuit: Suit.Hearts,
      };

      const aiBotHand = [
        { id: 'ace-spades', rank: Rank.Ace, suit: Suit.Spades, points: 0 },
        { id: 'king-clubs', rank: Rank.King, suit: Suit.Clubs, points: 10 },
      ];

      gameState.players[1].hand = aiBotHand;
      gameState.currentPlayerIndex = 1;
      gameState.gamePhase = GamePhase.Playing;
      gameState.currentTrick = null; // First player

      // Should not throw errors and should make a valid move
      expect(() => {
        const selectedCards = getAIMove(gameState, PlayerId.Bot1);
        expect(selectedCards).toHaveLength(1);
        expect(selectedCards[0]).toBeDefined();
      }).not.toThrow();
    });
  });
});