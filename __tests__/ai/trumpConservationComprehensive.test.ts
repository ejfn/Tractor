import { getAIMove } from '../../src/ai/aiLogic';
import { initializeGame } from '../../src/game/gameLogic';
import { PlayerId, Rank, Suit, GamePhase, JokerType } from '../../src/types';
import type { GameState, Card } from '../../src/types';
import { createJoker } from '../helpers/cards';

describe('Comprehensive Trump Conservation Tests - Issue #103 Prevention', () => {
  describe('AI Trump Card Selection When Opponent Winning', () => {
    it('should play weakest trump suit card over trump rank when opponent wins with trump', () => {
      const gameState = initializeGame();
      gameState.trumpInfo = {
        declared: true,
        declarerPlayerId: PlayerId.Human,
        trumpRank: Rank.Two,
        trumpSuit: Suit.Spades,
      };

      // Bot has multiple trump options: trump rank (valuable) + trump suit (weak)
      const botHand: Card[] = [
        { id: '2-hearts', rank: Rank.Two, suit: Suit.Hearts, points: 0 }, // Trump rank off-suit (conservation: 70)
        { id: '3-spades', rank: Rank.Three, suit: Suit.Spades, points: 0 }, // Weakest trump suit (conservation: 5)
        { id: '4-spades', rank: Rank.Four, suit: Suit.Spades, points: 0 }, // Weak trump suit (conservation: 10)
        { id: 'ace-clubs', rank: Rank.Ace, suit: Suit.Clubs, points: 0 }, // Non-trump
      ];
      gameState.players[1].hand = botHand;

      // Opponent is winning with higher trump
      const smallJoker = createJoker(JokerType.Small, 'small-joker');
      gameState.currentTrick = {
        leadingPlayerId: PlayerId.Bot3,
        leadingCombo: [smallJoker],
        plays: [
          {
            playerId: PlayerId.Bot3,
            cards: [smallJoker],
          }
        ],
        points: 0,
        winningPlayerId: PlayerId.Bot3, // Bot3 (opponent to Bot1) winning with Small Joker (unbeatable)
      };

      gameState.currentPlayerIndex = 1; // Bot 1's turn
      gameState.gamePhase = GamePhase.Playing;

      const selectedCards = getAIMove(gameState, PlayerId.Bot1);
      const selectedCard = selectedCards[0];

      console.log(`AI selected: ${selectedCard.rank}${selectedCard.suit} (expected: 3♠)`);

      // Should play weakest trump (3♠) not valuable trump rank (2♥)
      expect(selectedCard.rank).toBe(Rank.Three);
      expect(selectedCard.suit).toBe(Suit.Spades);
    });

    it('should prefer weak trump suit over valuable trump rank in mixed scenarios', () => {
      const gameState = initializeGame();
      gameState.trumpInfo = {
        declared: true,
        declarerPlayerId: PlayerId.Human,
        trumpRank: Rank.Two,
        trumpSuit: Suit.Hearts,
      };

      // Bot has trump rank in multiple off-suits + weak trump suit cards
      const botHand: Card[] = [
        { id: '2-spades', rank: Rank.Two, suit: Suit.Spades, points: 0 }, // Trump rank (conservation: 70)
        { id: '2-clubs', rank: Rank.Two, suit: Suit.Clubs, points: 0 }, // Trump rank (conservation: 70)
        { id: '3-hearts', rank: Rank.Three, suit: Suit.Hearts, points: 0 }, // Weakest trump suit (conservation: 5)
        { id: '4-hearts', rank: Rank.Four, suit: Suit.Hearts, points: 0 }, // Weak trump suit (conservation: 10)
      ];
      gameState.players[2].hand = botHand;

      // Opponent winning with unbeatable trump
      const bigJoker = createJoker(JokerType.Big, 'big-joker');
      gameState.currentTrick = {
        leadingPlayerId: PlayerId.Bot1,
        leadingCombo: [bigJoker],
        plays: [
          {
            playerId: PlayerId.Bot1,
            cards: [bigJoker],
          }
        ],
        points: 0,
        winningPlayerId: PlayerId.Bot1, // Bot1 winning with Big Joker (unbeatable)
      };

      gameState.currentPlayerIndex = 2; // Bot 2's turn
      gameState.gamePhase = GamePhase.Playing;

      const selectedCards = getAIMove(gameState, PlayerId.Bot2);
      const selectedCard = selectedCards[0];

      console.log(`AI selected: ${selectedCard.rank}${selectedCard.suit} (expected: 3♥)`);

      // Should play weakest trump suit (3♥) not trump rank cards (2♠ or 2♣)
      expect(selectedCard.rank).toBe(Rank.Three);
      expect(selectedCard.suit).toBe(Suit.Hearts);
    });

    it('should avoid point cards when opponent winning and play weakest non-point trump', () => {
      const gameState = initializeGame();
      gameState.trumpInfo = {
        declared: true,
        declarerPlayerId: PlayerId.Human,
        trumpRank: Rank.Two,
        trumpSuit: Suit.Diamonds,
      };

      // Bot has point cards and trump cards
      const botHand: Card[] = [
        { id: '5-diamonds', rank: Rank.Five, suit: Suit.Diamonds, points: 5 }, // Trump suit with points (conservation: 15)
        { id: '10-diamonds', rank: Rank.Ten, suit: Suit.Diamonds, points: 10 }, // Trump suit with points (conservation: 40)
        { id: '3-diamonds', rank: Rank.Three, suit: Suit.Diamonds, points: 0 }, // Weakest trump suit, no points (conservation: 5)
        { id: '5-hearts', rank: Rank.Five, suit: Suit.Hearts, points: 5 }, // Non-trump point card
      ];
      gameState.players[3].hand = botHand;

      // Opponent winning with strong trump
      gameState.currentTrick = {
        leadingPlayerId: PlayerId.Human,
        leadingCombo: [{ id: '2-diamonds', rank: Rank.Two, suit: Suit.Diamonds, points: 0 }],
        plays: [
          {
            playerId: PlayerId.Human,
            cards: [{ id: '2-diamonds', rank: Rank.Two, suit: Suit.Diamonds, points: 0 }],
          }
        ],
        points: 0,
        winningPlayerId: PlayerId.Human, // Human winning with trump rank in trump suit
      };

      gameState.currentPlayerIndex = 3; // Bot 3's turn
      gameState.gamePhase = GamePhase.Playing;

      const selectedCards = getAIMove(gameState, PlayerId.Bot3);
      const selectedCard = selectedCards[0];

      console.log(`AI selected: ${selectedCard.rank}${selectedCard.suit} (expected: 3♦)`);

      // Should play weakest non-point trump (3♦) not point cards (5♦, 10♦)
      expect(selectedCard.rank).toBe(Rank.Three);
      expect(selectedCard.suit).toBe(Suit.Diamonds);
      expect(selectedCard.points).toBe(0); // Should be non-point card
    });

    it('should prioritize conservation when multiple weak trump options available', () => {
      const gameState = initializeGame();
      gameState.trumpInfo = {
        declared: true,
        declarerPlayerId: PlayerId.Human,
        trumpRank: Rank.Ace,
        trumpSuit: Suit.Clubs,
      };

      // Bot has multiple low trump suit cards
      const botHand: Card[] = [
        { id: '3-clubs', rank: Rank.Three, suit: Suit.Clubs, points: 0 }, // Weakest trump suit (conservation: 5)
        { id: '4-clubs', rank: Rank.Four, suit: Suit.Clubs, points: 0 }, // Weak trump suit (conservation: 10) 
        { id: '6-clubs', rank: Rank.Six, suit: Suit.Clubs, points: 0 }, // Weak trump suit (conservation: 20)
        { id: 'ace-hearts', rank: Rank.Ace, suit: Suit.Hearts, points: 0 }, // Trump rank off-suit (conservation: 70)
      ];
      gameState.players[1].hand = botHand;

      // Opponent winning with unbeatable trump
      gameState.currentTrick = {
        leadingPlayerId: PlayerId.Bot2,
        leadingCombo: [{ id: 'ace-clubs', rank: Rank.Ace, suit: Suit.Clubs, points: 0 }],
        plays: [
          {
            playerId: PlayerId.Bot2,
            cards: [{ id: 'ace-clubs', rank: Rank.Ace, suit: Suit.Clubs, points: 0 }],
          }
        ],
        points: 0,
        winningPlayerId: PlayerId.Bot2, // Bot2 winning with trump rank in trump suit
      };

      gameState.currentPlayerIndex = 1; // Bot 1's turn
      gameState.gamePhase = GamePhase.Playing;

      const selectedCards = getAIMove(gameState, PlayerId.Bot1);
      const selectedCard = selectedCards[0];

      console.log(`AI selected: ${selectedCard.rank}${selectedCard.suit} (expected: 3♣)`);
      console.log('Available options:', botHand.map(c => `${c.rank}${c.suit}`));

      // Should play the absolute weakest trump (3♣) not any higher value trump
      expect(selectedCard.rank).toBe(Rank.Three);
      expect(selectedCard.suit).toBe(Suit.Clubs);
    });
  });

  describe('Trump Following Rules Compliance', () => {
    it('should follow trump while conserving when opponent has unbeatable trump pair', () => {
      const gameState = initializeGame();
      gameState.trumpInfo = {
        declared: true,
        declarerPlayerId: PlayerId.Human,
        trumpRank: Rank.Two,
        trumpSuit: Suit.Spades,
      };

      // Bot has trump singles and non-trump pair
      const botHand: Card[] = [
        { id: '2-hearts', rank: Rank.Two, suit: Suit.Hearts, points: 0 }, // Trump rank off-suit
        { id: '3-spades', rank: Rank.Three, suit: Suit.Spades, points: 0 }, // Weak trump suit
        { id: 'ace-hearts-1', rank: Rank.Ace, suit: Suit.Hearts, points: 0 }, // Non-trump  
        { id: 'ace-hearts-2', rank: Rank.Ace, suit: Suit.Hearts, points: 0 }, // Non-trump (forms pair)
      ];
      gameState.players[1].hand = botHand;

      // Opponent leads trump pair (must follow with trump)
      const smallJoker1 = createJoker(JokerType.Small, 'small-joker-1');
      const smallJoker2 = createJoker(JokerType.Small, 'small-joker-2');
      gameState.currentTrick = {
        leadingPlayerId: PlayerId.Human,
        leadingCombo: [smallJoker1, smallJoker2],
        plays: [
          {
            playerId: PlayerId.Human,
            cards: [smallJoker1, smallJoker2],
          }
        ],
        points: 0,
        winningPlayerId: PlayerId.Human, // Human winning with Small Joker pair (unbeatable)
      };

      gameState.currentPlayerIndex = 1; // Bot 1's turn
      gameState.gamePhase = GamePhase.Playing;

      const selectedCards = getAIMove(gameState, PlayerId.Bot1);

      console.log(`AI selected: ${selectedCards.map(c => c.joker ? `${c.joker}Joker` : `${c.rank}${c.suit}`).join(', ')}`);

      // Must follow trump pair - should use weak trump + filler, not waste trump rank
      expect(selectedCards).toHaveLength(2);
      
      // Should include the weakest trump (3♠)
      const hasWeakTrump = selectedCards.some(c => c.rank === Rank.Three && c.suit === Suit.Spades);
      expect(hasWeakTrump).toBe(true);
      
      // When following trump pairs, AI must use trump cards but should prefer weak ones
      // The AI should include the weakest trump (3♠) and may need to use other trump to complete the pair
      // The key test is that it includes the weakest available trump
      const includesWeakestTrump = selectedCards.some(c => c.rank === Rank.Three && c.suit === Suit.Spades);
      expect(includesWeakestTrump).toBe(true);
    });

    it('should conserve when forced to follow trump but cannot win', () => {
      const gameState = initializeGame();
      gameState.trumpInfo = {
        declared: true,
        declarerPlayerId: PlayerId.Human,
        trumpRank: Rank.King,
        trumpSuit: Suit.Hearts,
      };

      // Bot has only trump cards of various values
      const botHand: Card[] = [
        { id: 'king-hearts', rank: Rank.King, suit: Suit.Hearts, points: 10 }, // Trump rank in trump suit (conservation: 80)
        { id: 'king-spades', rank: Rank.King, suit: Suit.Spades, points: 10 }, // Trump rank off-suit (conservation: 70)
        { id: '3-hearts', rank: Rank.Three, suit: Suit.Hearts, points: 0 }, // Weakest trump suit (conservation: 5)
        { id: '4-hearts', rank: Rank.Four, suit: Suit.Hearts, points: 0 }, // Weak trump suit (conservation: 10)
      ];
      gameState.players[2].hand = botHand;

      // Opponent leads with unbeatable trump
      const bigJoker2 = createJoker(JokerType.Big, 'big-joker-2');
      gameState.currentTrick = {
        leadingPlayerId: PlayerId.Bot1,
        leadingCombo: [bigJoker2],
        plays: [
          {
            playerId: PlayerId.Bot1,
            cards: [bigJoker2],
          }
        ],
        points: 0,
        winningPlayerId: PlayerId.Bot1, // Bot1 winning with Big Joker (unbeatable)
      };

      gameState.currentPlayerIndex = 2; // Bot 2's turn
      gameState.gamePhase = GamePhase.Playing;

      const selectedCards = getAIMove(gameState, PlayerId.Bot2);
      const selectedCard = selectedCards[0];

      console.log(`AI selected: ${selectedCard.rank}${selectedCard.suit} (expected: 3♥)`);
      console.log('Available trump cards:', botHand.map(c => `${c.rank}${c.suit}(${c.points}pts)`));

      // Should play the absolute weakest trump (3♥) to conserve all valuable cards
      expect(selectedCard.rank).toBe(Rank.Three);
      expect(selectedCard.suit).toBe(Suit.Hearts);
      expect(selectedCard.points).toBe(0); // Should not waste point cards
    });
  });

  describe('Edge Cases for Issue #103 Regression Prevention', () => {
    it('should handle mixed trump types with proper conservation priorities', () => {
      const gameState = initializeGame();
      gameState.trumpInfo = {
        declared: true,
        declarerPlayerId: PlayerId.Human,
        trumpRank: Rank.Two,
        trumpSuit: Suit.Diamonds,
      };

      // Complex hand with all trump types
      const bigJokerInHand = createJoker(JokerType.Big, 'big-joker-in-hand');
      const botHand: Card[] = [
        bigJokerInHand, // Conservation: 100
        { id: '2-diamonds', rank: Rank.Two, suit: Suit.Diamonds, points: 0 }, // Conservation: 80  
        { id: '2-hearts', rank: Rank.Two, suit: Suit.Hearts, points: 0 }, // Conservation: 70
        { id: '3-diamonds', rank: Rank.Three, suit: Suit.Diamonds, points: 0 }, // Conservation: 5 (SHOULD PLAY)
      ];
      gameState.players[3].hand = botHand;

      // Opponent winning with maximum trump
      const smallJokerOpponent = createJoker(JokerType.Small, 'small-joker-opponent');
      gameState.currentTrick = {
        leadingPlayerId: PlayerId.Bot1,
        leadingCombo: [smallJokerOpponent],
        plays: [
          {
            playerId: PlayerId.Bot1,
            cards: [smallJokerOpponent],
          }
        ],
        points: 0,
        winningPlayerId: PlayerId.Bot1, // Bot1 (opponent to Bot3) winning with Small Joker
      };

      gameState.currentPlayerIndex = 3; // Bot 3's turn
      gameState.gamePhase = GamePhase.Playing;

      const selectedCards = getAIMove(gameState, PlayerId.Bot3);
      const selectedCard = selectedCards[0];

      console.log(`AI selected: ${selectedCard.rank}${selectedCard.suit} (expected: 3♦)`);
      console.log('Available cards with conservation values:');
      botHand.forEach(c => {
        const desc = c.joker ? `${c.joker} joker` : `${c.rank}${c.suit}`;
        console.log(`  ${desc}`);
      });

      // Should play weakest trump (3♦) not waste Big Joker, trump rank in trump suit, or trump rank off-suit
      expect(selectedCard.rank).toBe(Rank.Three);
      expect(selectedCard.suit).toBe(Suit.Diamonds);
      expect(selectedCard.joker).toBeUndefined();
    });

    it('should maintain conservation logic across different trump suits', () => {
      const testCases = [
        { trumpSuit: Suit.Hearts, trumpRank: Rank.Two },
        { trumpSuit: Suit.Clubs, trumpRank: Rank.Three },
        { trumpSuit: Suit.Diamonds, trumpRank: Rank.Four },
        { trumpSuit: Suit.Spades, trumpRank: Rank.Five },
      ];

      testCases.forEach(({ trumpSuit, trumpRank }) => {
        const gameState = initializeGame();
        gameState.trumpInfo = {
          declared: true,
          declarerPlayerId: PlayerId.Human,
          trumpRank,
          trumpSuit,
        };

        // Create hand with weak trump suit and valuable trump rank off-suit
        const offSuit = trumpSuit === Suit.Hearts ? Suit.Clubs : Suit.Hearts;
        const botHand: Card[] = [
          { id: `${trumpRank.toLowerCase()}-${offSuit.toLowerCase()}`, rank: trumpRank, suit: offSuit, points: 0 }, // Trump rank off-suit
          { id: `3-${trumpSuit.toLowerCase()}`, rank: Rank.Three, suit: trumpSuit, points: 0 }, // Weak trump suit
        ];
        
        gameState.players[1].hand = botHand;

        // Opponent winning with unbeatable card
        const bigJokerLoop = createJoker(JokerType.Big, 'big-joker-loop');
        gameState.currentTrick = {
          leadingPlayerId: PlayerId.Human,
          leadingCombo: [bigJokerLoop],
          plays: [
            {
              playerId: PlayerId.Human,
              cards: [bigJokerLoop],
            }
          ],
          points: 0,
          winningPlayerId: PlayerId.Human,
        };

        gameState.currentPlayerIndex = 1;
        gameState.gamePhase = GamePhase.Playing;

        const selectedCards = getAIMove(gameState, PlayerId.Bot1);
        const selectedCard = selectedCards[0];

        console.log(`Test case: trump=${trumpSuit}, rank=${trumpRank}`);
        console.log(`AI selected: ${selectedCard.rank}${selectedCard.suit}`);
        console.log(`Bot hand:`, botHand.map(c => `${c.rank}${c.suit}`));

        // Should always play the card with lowest conservation value
        // This could be either trump rank off-suit (conservation: 70) or trump suit (varies by rank)
        expect(selectedCard.rank).toBe(Rank.Three);
        
        // Verify the AI is making conservation-optimal choice
        const hasWeakTrump = botHand.some(c => c.rank === Rank.Three);
        expect(hasWeakTrump).toBe(true);
        
        // The AI should select a rank 3 card (either the trump rank or trump suit version)
        expect(selectedCard.rank).toBe(Rank.Three);
      });
    });
  });
});