import { getAIMove } from '../../src/ai/aiLogic';
import { isValidPlay } from '../../src/game/gameLogic';
import { createIsolatedGameState } from '../helpers/testIsolation';
import { Card, Suit, Rank, ComboType, TrumpInfo, PlayerId, JokerType } from '../../src/types';

describe('AI Trump Following Behavior', () => {
  it('should show AI correctly choosing trump singles when trump pairs are led', () => {
    const gameState = createIsolatedGameState();
    
    // Set up trump info: Spades trump, rank 2
    const trumpInfo: TrumpInfo = {
      trumpRank: Rank.Two,
      trumpSuit: Suit.Spades,
      
      
    };
    gameState.trumpInfo = trumpInfo;
    
    // Leading trump pair (6♠-6♠)
    const leadingTrumpPair: Card[] = [
      {
        id: 'spades-6-1',
        suit: Suit.Spades,
        rank: Rank.Six,
        joker: undefined,
        points: 0
      },
      {
        id: 'spades-6-2', 
        suit: Suit.Spades,
        rank: Rank.Six,
        joker: undefined,
        points: 0
      }
    ];
    
    // Set up leading combo
    gameState.currentTrick = {
      plays: [
        { playerId: PlayerId.Human, cards: leadingTrumpPair }
      ],
      winningPlayerId: PlayerId.Human,
      points: 0
    };
    
    // Bot 1 hand: trump singles + attractive non-trump pair
    const bot1Index = 1;
    gameState.currentPlayerIndex = bot1Index;
    
    const bot1Hand: Card[] = [
      // Trump singles (Spades) - cannot form pairs
      {
        id: 'spades-3-1',
        suit: Suit.Spades,
        rank: Rank.Three,
        joker: undefined,
        points: 0
      },
      {
        id: 'spades-4-1',
        suit: Suit.Spades,
        rank: Rank.Four,
        joker: undefined,
        points: 0
      },
      // Attractive non-trump pair (Aces)
      {
        id: 'hearts-ace-1',
        suit: Suit.Hearts,
        rank: Rank.Ace,
        joker: undefined,
        points: 0
      },
      {
        id: 'hearts-ace-2',
        suit: Suit.Hearts,
        rank: Rank.Ace,
        joker: undefined,
        points: 0
      },
      // Other cards
      {
        id: 'clubs-7-1',
        suit: Suit.Clubs,
        rank: Rank.Seven,
        joker: undefined,
        points: 0
      },
      {
        id: 'diamonds-8-1',
        suit: Suit.Diamonds,
        rank: Rank.Eight,
        joker: undefined,
        points: 0
      }
    ];
    
    gameState.players[bot1Index].hand = bot1Hand;
    
    // Get AI move
    const aiMove = getAIMove(gameState, PlayerId.Bot1);
    
    // Check what AI chose
    const aiChoseTrumpSingles = aiMove.every(card => card.suit === Suit.Spades);
    const aiChoseNonTrumpPair = aiMove.length === 2 && 
      aiMove.every(card => card.suit === Suit.Hearts && card.rank === Rank.Ace);
    
    expect(aiChoseTrumpSingles).toBe(true); // AI should choose trump singles
    expect(aiChoseNonTrumpPair).toBe(false); // AI should NOT choose non-trump pair
  });

  it('should handle trump pairs when AI has sufficient trump cards', () => {
    const gameState = createIsolatedGameState();
    
    // Set up trump info: Hearts trump, rank 2
    const trumpInfo: TrumpInfo = {
      trumpRank: Rank.Two,
      trumpSuit: Suit.Hearts,
      
      
    };
    gameState.trumpInfo = trumpInfo;
    
    // Leading trump pair (3♥-3♥)
    const leadingTrumpPair: Card[] = [
      {
        id: 'hearts-3-1',
        suit: Suit.Hearts,
        rank: Rank.Three,
        joker: undefined,
        points: 0
      },
      {
        id: 'hearts-3-2', 
        suit: Suit.Hearts,
        rank: Rank.Three,
        joker: undefined,
        points: 0
      }
    ];
    
    // Set up leading combo
    gameState.currentTrick = {
      plays: [
        { playerId: PlayerId.Human, cards: leadingTrumpPair }
      ],
      winningPlayerId: PlayerId.Human,
      points: 0
    };
    
    // Create AI player hand with both trump cards and non-trump pairs
    const aiPlayerIndex = 1; // Bot 1
    const aiPlayerId = PlayerId.Bot1;
    gameState.currentPlayerIndex = aiPlayerIndex;
    
    const aiHand: Card[] = [
      // Trump cards (Hearts) - has trump pairs available
      {
        id: 'hearts-4-1',
        suit: Suit.Hearts,
        rank: Rank.Four,
        joker: undefined,
        points: 0
      },
      {
        id: 'hearts-4-2',
        suit: Suit.Hearts, 
        rank: Rank.Four,
        joker: undefined,
        points: 0
      },
      {
        id: 'hearts-5-1',
        suit: Suit.Hearts,
        rank: Rank.Five,
        joker: undefined,
        points: 5
      },
      // Non-trump pair (Spades) 
      {
        id: 'spades-6-1',
        suit: Suit.Spades,
        rank: Rank.Six,
        joker: undefined,
        points: 0
      },
      {
        id: 'spades-6-2',
        suit: Suit.Spades,
        rank: Rank.Six,
        joker: undefined,
        points: 0
      },
      // Other cards
      {
        id: 'clubs-7-1',
        suit: Suit.Clubs,
        rank: Rank.Seven,
        joker: undefined,
        points: 0
      }
    ];
    
    gameState.players[aiPlayerIndex].hand = aiHand;
    
    // Test that the non-trump pair would be invalid
    const nonTrumpPair = aiHand.slice(3, 5); // 6♠-6♠
    const isNonTrumpPairValid = isValidPlay(
      nonTrumpPair,
      leadingTrumpPair,
      aiHand,
      trumpInfo
    );
    
    expect(isNonTrumpPairValid).toBe(false); // Should be invalid
    
    // Test that the trump pair would be valid  
    const trumpPair = aiHand.slice(0, 2); // 4♥-4♥
    const isTrumpPairValid = isValidPlay(
      trumpPair,
      leadingTrumpPair, 
      aiHand,
      trumpInfo
    );
    
    expect(isTrumpPairValid).toBe(true); // Should be valid
    
    // Get AI move
    const aiMove = getAIMove(gameState, aiPlayerId);
    
    // AI should select trump cards, not non-trump pair
    const aiMovedTrumpCards = aiMove.every(card => card.suit === Suit.Hearts);
    expect(aiMovedTrumpCards).toBe(true);
    
    // AI move should be valid
    const isAIMoveValid = isValidPlay(
      aiMove,
      leadingTrumpPair,
      aiHand,
      trumpInfo
    );
    
    expect(isAIMoveValid).toBe(true);
    
    // AI should NOT play the non-trump pair
    const playedNonTrumpPair = aiMove.length === 2 && 
      aiMove.every(card => card.suit === Suit.Spades && card.rank === Rank.Six);
    expect(playedNonTrumpPair).toBe(false);
  });
});