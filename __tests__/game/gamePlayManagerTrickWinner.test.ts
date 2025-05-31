import { processPlay } from '../../src/game/gamePlayManager';
import { createCard } from '../helpers/cards';
import { createGameState } from '../helpers/gameStates';
import { Suit, Rank, GamePhase, PlayerId } from '../../src/types';

describe('GamePlayManager Trick Winner Determination', () => {
  describe('Context-Aware Trick Winner Updates', () => {
    test('Should correctly update trick winner using evaluateTrickPlay', () => {
      // Create initial game state with human leading
      let gameState = createGameState({
        gamePhase: GamePhase.Playing,
        currentPlayerIndex: 0, // Human turn
        trumpInfo: { trumpSuit: Suit.Hearts, trumpRank: Rank.Two,  }
      });

      // Give human some cards including the leading combo
      gameState.players[0].hand = [
        createCard(Suit.Diamonds, Rank.Four, '1'),
        createCard(Suit.Diamonds, Rank.Four, '2'),
        createCard(Suit.Clubs, Rank.King, '1'),
      ];

      // Give Bot1 cards including a stronger combo
      gameState.players[1].hand = [
        createCard(Suit.Diamonds, Rank.Ace, '1'),
        createCard(Suit.Diamonds, Rank.Ace, '2'),
        createCard(Suit.Spades, Rank.King, '1'),
      ];

      // Human leads with 4♦-4♦
      const humanPlay = [
        createCard(Suit.Diamonds, Rank.Four, '1'),
        createCard(Suit.Diamonds, Rank.Four, '2'),
      ];

      const result1 = processPlay(gameState, humanPlay);
      
      // Verify human is initially winning
      expect(result1.newState.currentTrick?.winningPlayerId).toBe(PlayerId.Human);
      expect(result1.trickComplete).toBe(false);

      // Bot1 follows with A♦-A♦ (should beat 4♦-4♦)
      const bot1Play = [
        createCard(Suit.Diamonds, Rank.Ace, '1'),
        createCard(Suit.Diamonds, Rank.Ace, '2'),
      ];

      const result2 = processPlay(result1.newState, bot1Play);
      
      // Verify Bot1 is now winning (A♦-A♦ beats 4♦-4♦ in same suit)
      expect(result2.newState.currentTrick?.winningPlayerId).toBe(PlayerId.Bot1);
      expect(result2.trickComplete).toBe(false);
    });

    test('Should NOT allow different suit pairs to beat each other', () => {
      // Create initial game state with human leading
      let gameState = createGameState({
        gamePhase: GamePhase.Playing,
        currentPlayerIndex: 0, // Human turn
        trumpInfo: { trumpSuit: Suit.Hearts, trumpRank: Rank.Two,  }
      });

      // Give human some cards
      gameState.players[0].hand = [
        createCard(Suit.Diamonds, Rank.Four, '1'),
        createCard(Suit.Diamonds, Rank.Four, '2'),
        createCard(Suit.Clubs, Rank.King, '1'),
      ];

      // Give Bot1 cards from different suit (void in diamonds)
      gameState.players[1].hand = [
        createCard(Suit.Clubs, Rank.Ace, '1'),
        createCard(Suit.Clubs, Rank.Ace, '2'),
        createCard(Suit.Spades, Rank.King, '1'),
      ];

      // Human leads with 4♦-4♦
      const humanPlay = [
        createCard(Suit.Diamonds, Rank.Four, '1'),
        createCard(Suit.Diamonds, Rank.Four, '2'),
      ];

      const result1 = processPlay(gameState, humanPlay);
      
      // Verify human is initially winning
      expect(result1.newState.currentTrick?.winningPlayerId).toBe(PlayerId.Human);

      // Bot1 follows with A♣-A♣ (different suit - should NOT beat 4♦-4♦)
      const bot1Play = [
        createCard(Suit.Clubs, Rank.Ace, '1'),
        createCard(Suit.Clubs, Rank.Ace, '2'),
      ];

      const result2 = processPlay(result1.newState, bot1Play);
      
      // Verify human is still winning (A♣-A♣ cannot beat 4♦-4♦ due to different suits)
      expect(result2.newState.currentTrick?.winningPlayerId).toBe(PlayerId.Human);
      expect(result2.trickComplete).toBe(false);
    });

    test('Trump pairs should beat non-trump pairs regardless of suit', () => {
      // Create initial game state with human leading
      let gameState = createGameState({
        gamePhase: GamePhase.Playing,
        currentPlayerIndex: 0, // Human turn
        trumpInfo: { trumpSuit: Suit.Hearts, trumpRank: Rank.Two,  }
      });

      // Give human non-trump cards
      gameState.players[0].hand = [
        createCard(Suit.Diamonds, Rank.Ace, '1'),
        createCard(Suit.Diamonds, Rank.Ace, '2'),
        createCard(Suit.Clubs, Rank.King, '1'),
      ];

      // Give Bot1 trump cards
      gameState.players[1].hand = [
        createCard(Suit.Hearts, Rank.Three, '1'), // Trump suit
        createCard(Suit.Hearts, Rank.Three, '2'), // Trump suit
        createCard(Suit.Spades, Rank.King, '1'),
      ];

      // Human leads with A♦-A♦ (non-trump)
      const humanPlay = [
        createCard(Suit.Diamonds, Rank.Ace, '1'),
        createCard(Suit.Diamonds, Rank.Ace, '2'),
      ];

      const result1 = processPlay(gameState, humanPlay);
      
      // Verify human is initially winning
      expect(result1.newState.currentTrick?.winningPlayerId).toBe(PlayerId.Human);

      // Bot1 follows with 3♥-3♥ (trump pair - should beat A♦-A♦)
      const bot1Play = [
        createCard(Suit.Hearts, Rank.Three, '1'),
        createCard(Suit.Hearts, Rank.Three, '2'),
      ];

      const result2 = processPlay(result1.newState, bot1Play);
      
      // Verify Bot1 is now winning (trump beats non-trump)
      expect(result2.newState.currentTrick?.winningPlayerId).toBe(PlayerId.Bot1);
      expect(result2.trickComplete).toBe(false);
    });
  });
});