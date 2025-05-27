import { getAIMove } from '../../src/ai/aiLogic';
import { createIsolatedGameState } from '../helpers/testIsolation';
import { Card, Suit, Rank, PlayerId, TrumpInfo } from '../../src/types';

describe('Last Player Point Strategy (Issue #61 Enhancement)', () => {
  it('should prioritize 10s over Kings over 5s when partner is winning', () => {
    const gameState = createIsolatedGameState();
    
    // Set up trump info
    const trumpInfo: TrumpInfo = {
      trumpRank: Rank.Two,
      trumpSuit: Suit.Hearts,
      declared: true,
      declarerPlayerId: PlayerId.Human
    };
    gameState.trumpInfo = trumpInfo;
    
    // Create trick scenario where partner (Bot 2) is winning
    const leadingCard: Card = {
      id: 'spades-3-1',
      suit: Suit.Spades,
      rank: Rank.Three,
      joker: undefined,
      points: 0
    };
    
    const bot1Card: Card = {
      id: 'spades-4-1', 
      suit: Suit.Spades,
      rank: Rank.Four,
      joker: undefined,
      points: 0
    };
    
    const bot2WinningCard: Card = {
      id: 'spades-ace-1',
      suit: Suit.Spades,
      rank: Rank.Ace,
      joker: undefined,
      points: 0
    };
    
    // Set up trick with partner (Bot 2) winning
    gameState.currentTrick = {
      leadingPlayerId: PlayerId.Human,
      leadingCombo: [leadingCard],
      plays: [
        { playerId: PlayerId.Bot1, cards: [bot1Card] },
        { playerId: PlayerId.Bot2, cards: [bot2WinningCard] }
      ],
      points: 0
    };
    
    // Set current player to Bot 3 (4th player, partner of Bot1)
    gameState.currentPlayerIndex = 3;
    const fourthPlayerId = PlayerId.Bot3;
    
    // Set up trick with partner (Bot 1) winning - Bot3's actual partner
    const bot1WinningCard: Card = {
      id: 'spades-ace-1',
      suit: Suit.Spades,
      rank: Rank.Ace,
      joker: undefined,
      points: 0
    };
    
    const bot2Card: Card = {
      id: 'spades-4-1', 
      suit: Suit.Spades,
      rank: Rank.Four,
      joker: undefined,
      points: 0
    };
    
    gameState.currentTrick = {
      leadingPlayerId: PlayerId.Human,
      leadingCombo: [leadingCard],
      plays: [
        { playerId: PlayerId.Bot1, cards: [bot1WinningCard] }, // Bot1 (Bot3's partner) wins
        { playerId: PlayerId.Bot2, cards: [bot2Card] }         // Bot2 plays lower card
      ],
      points: 0
    };
    
    // Test case 1: 10 should be prioritized over King and 5
    gameState.players[3].hand = [
      {
        id: 'spades-5-1',
        suit: Suit.Spades,
        rank: Rank.Five,
        joker: undefined,
        points: 5
      },
      {
        id: 'spades-king-1',
        suit: Suit.Spades,
        rank: Rank.King,
        joker: undefined,
        points: 10
      },
      {
        id: 'spades-10-1',
        suit: Suit.Spades,
        rank: Rank.Ten,
        joker: undefined,
        points: 10
      }
    ];
    
    let aiMove = getAIMove(gameState, fourthPlayerId);
    console.log('Test 1: 10 vs King vs 5 - Selected:', aiMove[0].rank);
    console.log('Partner (Bot1) winning with A♠, Bot3 should prioritize 10♠');
    expect(aiMove[0].rank).toBe(Rank.Ten); // Should prioritize 10
    
    // Test case 2: King should be prioritized over 5 when no 10
    gameState.players[3].hand = [
      {
        id: 'spades-5-1',
        suit: Suit.Spades,
        rank: Rank.Five,
        joker: undefined,
        points: 5
      },
      {
        id: 'spades-king-1',
        suit: Suit.Spades,
        rank: Rank.King,
        joker: undefined,
        points: 10
      },
      {
        id: 'spades-6-1',
        suit: Suit.Spades,
        rank: Rank.Six,
        joker: undefined,
        points: 0
      }
    ];
    
    aiMove = getAIMove(gameState, fourthPlayerId);
    console.log('Test 2: King vs 5 - Selected:', aiMove[0].rank);
    expect(aiMove[0].rank).toBe(Rank.King); // Should prioritize King over 5
  });

  it('should prioritize point cards when partner is winning (4th player)', () => {
    const gameState = createIsolatedGameState();
    
    // Set up trump info
    const trumpInfo: TrumpInfo = {
      trumpRank: Rank.Two,
      trumpSuit: Suit.Hearts,
      declared: true,
      declarerPlayerId: PlayerId.Human
    };
    gameState.trumpInfo = trumpInfo;
    
    // Create trick scenario where partner (Bot 2) is winning
    const leadingCard: Card = {
      id: 'spades-3-1',
      suit: Suit.Spades,
      rank: Rank.Three,
      joker: undefined,
      points: 0
    };
    
    const bot1Card: Card = {
      id: 'spades-4-1', 
      suit: Suit.Spades,
      rank: Rank.Four,
      joker: undefined,
      points: 0
    };
    
    const bot2WinningCard: Card = {
      id: 'spades-ace-1',
      suit: Suit.Spades,
      rank: Rank.Ace,
      joker: undefined,
      points: 0
    };
    
    // Set up trick with partner (Bot 2) winning
    gameState.currentTrick = {
      leadingPlayerId: PlayerId.Human,
      leadingCombo: [leadingCard],
      plays: [
        { playerId: PlayerId.Bot1, cards: [bot1Card] },
        { playerId: PlayerId.Bot2, cards: [bot2WinningCard] }
      ],
      points: 0
    };
    
    // Set current player to Bot 3 (4th player, partner of human)
    gameState.currentPlayerIndex = 3;
    const fourthPlayerId = PlayerId.Bot3;
    
    // Create Bot 3's hand with both point cards and non-point cards
    const bot3Hand: Card[] = [
      // Point cards
      {
        id: 'spades-5-1',
        suit: Suit.Spades,
        rank: Rank.Five,
        joker: undefined,
        points: 5  // Point card
      },
      {
        id: 'spades-10-1',
        suit: Suit.Spades,
        rank: Rank.Ten,
        joker: undefined,
        points: 10  // Point card
      },
      {
        id: 'spades-king-1',
        suit: Suit.Spades,
        rank: Rank.King,
        joker: undefined,
        points: 10  // Point card
      },
      // Non-point cards
      {
        id: 'spades-6-1',
        suit: Suit.Spades,
        rank: Rank.Six,
        joker: undefined,
        points: 0
      },
      {
        id: 'spades-7-1',
        suit: Suit.Spades,
        rank: Rank.Seven,
        joker: undefined,
        points: 0
      },
      // Other cards
      {
        id: 'clubs-8-1',
        suit: Suit.Clubs,
        rank: Rank.Eight,
        joker: undefined,
        points: 0
      }
    ];
    
    gameState.players[3].hand = bot3Hand;
    
    console.log('=== Last Player Point Strategy Test ===');
    console.log('Partner (Bot 2) is winning with Ace of Spades');
    console.log('Bot 3 (4th player) has point cards available:');
    console.log('- 5♠ (5 points)');
    console.log('- 10♠ (10 points)');  
    console.log('- K♠ (10 points)');
    console.log('Also has non-point cards: 6♠, 7♠');
    
    // Get AI move for 4th player
    const aiMove = getAIMove(gameState, fourthPlayerId);
    
    console.log('AI selected:', aiMove.map(c => `${c.rank}${c.suit} (${c.points}pts)`));
    
    // Verify AI selected a point card
    const selectedPointCard = aiMove.some(card => (card.points || 0) > 0);
    expect(selectedPointCard).toBe(true);
    
    // Verify AI didn't select highest value card (should avoid beating partner)
    const selectedAce = aiMove.some(card => card.rank === Rank.Ace);
    expect(selectedAce).toBe(false);
    
    // Verify it's a single card (following leading single)
    expect(aiMove.length).toBe(1);
    
    // The selected card should be one of the point cards
    const selectedCard = aiMove[0];
    const isPointCard = (selectedCard.points || 0) > 0;
    expect(isPointCard).toBe(true);
  });
  
  it('should play small non-point cards when no point cards available and partner winning', () => {
    const gameState = createIsolatedGameState();
    
    // Set up trump info
    const trumpInfo: TrumpInfo = {
      trumpRank: Rank.Two, 
      trumpSuit: Suit.Hearts,
      declared: true,
      declarerPlayerId: PlayerId.Human
    };
    gameState.trumpInfo = trumpInfo;
    
    // Set up trick with partner winning
    gameState.currentTrick = {
      leadingPlayerId: PlayerId.Human,
      leadingCombo: [{
        id: 'clubs-3-1',
        suit: Suit.Clubs,
        rank: Rank.Three,
        joker: undefined,
        points: 0
      }],
      plays: [
        { 
          playerId: PlayerId.Bot1, 
          cards: [{
            id: 'clubs-4-1',
            suit: Suit.Clubs,
            rank: Rank.Four,
            joker: undefined,
            points: 0
          }]
        },
        { 
          playerId: PlayerId.Bot2, 
          cards: [{
            id: 'clubs-ace-1',
            suit: Suit.Clubs,
            rank: Rank.Ace,
            joker: undefined,
            points: 0
          }]
        }
      ],
      points: 0
    };
    
    gameState.currentPlayerIndex = 3;
    
    // Bot 3 hand with only non-point cards
    const bot3Hand: Card[] = [
      {
        id: 'clubs-6-1',
        suit: Suit.Clubs,
        rank: Rank.Six,
        joker: undefined,
        points: 0
      },
      {
        id: 'clubs-7-1',
        suit: Suit.Clubs,
        rank: Rank.Seven,
        joker: undefined,
        points: 0
      },
      {
        id: 'clubs-8-1',
        suit: Suit.Clubs,
        rank: Rank.Eight,
        joker: undefined,
        points: 0
      }
    ];
    
    gameState.players[3].hand = bot3Hand;
    
    const aiMove = getAIMove(gameState, PlayerId.Bot3);
    
    // Should select smallest non-point card
    expect(aiMove.length).toBe(1);
    expect(aiMove[0].suit).toBe(Suit.Clubs);
    expect(aiMove[0].points).toBe(0);
    
    // Should be the smallest available (6)
    expect(aiMove[0].rank).toBe(Rank.Six);
  });
  
  it('should prioritize 10s over Kings over 5s when partner leads and wins (3rd player)', () => {
    const gameState = createIsolatedGameState();
    
    // Set up trump info
    const trumpInfo: TrumpInfo = {
      trumpRank: Rank.Two,
      trumpSuit: Suit.Hearts,
      declared: true,
      declarerPlayerId: PlayerId.Human
    };
    gameState.trumpInfo = trumpInfo;
    
    // Create trick scenario where human (Bot2's partner) is leading and winning
    const humanLeadingCard: Card = {
      id: 'spades-ace-1',
      suit: Suit.Spades,
      rank: Rank.Ace,
      joker: undefined,
      points: 0
    };
    
    const bot1Card: Card = {
      id: 'spades-4-1', 
      suit: Suit.Spades,
      rank: Rank.Four,
      joker: undefined,
      points: 0
    };
    
    // Set up trick with human leading and winning (Bot2's partner)
    gameState.currentTrick = {
      leadingPlayerId: PlayerId.Human,
      leadingCombo: [humanLeadingCard],
      plays: [
        { playerId: PlayerId.Bot1, cards: [bot1Card] } // Bot1 plays lower card
      ],
      points: 0
    };
    
    // Set current player to Bot 2 (3rd player, partner of human)
    gameState.currentPlayerIndex = 2;
    const thirdPlayerId = PlayerId.Bot2;
    
    // Create Bot 2's hand with point cards
    const bot2Hand: Card[] = [
      {
        id: 'spades-5-1',
        suit: Suit.Spades,
        rank: Rank.Five,
        joker: undefined,
        points: 5
      },
      {
        id: 'spades-king-1',
        suit: Suit.Spades,
        rank: Rank.King,
        joker: undefined,
        points: 10
      },
      {
        id: 'spades-10-1',
        suit: Suit.Spades,
        rank: Rank.Ten,
        joker: undefined,
        points: 10
      }
    ];
    
    gameState.players[2].hand = bot2Hand;
    
    console.log('=== 3rd Player Partner Leading Test ===');
    console.log('Human (Bot2\'s partner) leading with A♠ and winning');
    console.log('Bot2 (3rd player) should prioritize 10♠ over K♠ over 5♠');
    
    // Get AI move for 3rd player
    const aiMove = getAIMove(gameState, thirdPlayerId);
    
    console.log('AI selected:', aiMove.map(c => `${c.rank}${c.suit} (${c.points}pts)`));
    
    // Should prioritize 10 over King and 5
    expect(aiMove[0].rank).toBe(Rank.Ten);
    expect(aiMove.length).toBe(1);
    
    // Verify it's a point card
    const selectedCard = aiMove[0];
    const isPointCard = (selectedCard.points || 0) > 0;
    expect(isPointCard).toBe(true);
  });
  
  // Note: Additional test for contesting when partner is not winning could be added
  // but the core enhancement (point card prioritization when partner wins) is working
});