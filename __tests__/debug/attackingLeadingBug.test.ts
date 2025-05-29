import { getAIMove } from '../../src/ai/aiLogic';
import { initializeGame } from '../../src/game/gameLogic';
import { PlayerId, Rank, Suit, GamePhase } from '../../src/types';
import type { GameState, Card } from '../../src/types';

describe('Attacking Leading Strategy Bug Test', () => {
  it('should NOT lead with trump suit high cards even in desperate attacking scenarios', () => {
    const gameState = initializeGame();
    
    // Setup to trigger attacking team + desperate strategy
    gameState.trumpInfo = {
      declared: true,
      declarerPlayerId: PlayerId.Bot1, // AI declared trump - attacking team
      trumpRank: Rank.Two,
      trumpSuit: Suit.Hearts,
    };

    // Late game scenario with many opponent wins to trigger desperate mode
    gameState.tricks = Array(10).fill(null).map((_, i) => ({
      leadingPlayerId: PlayerId.Human,
      leadingCombo: [{ id: `dummy-${i}-lead`, rank: Rank.King, suit: Suit.Spades, points: 10 }],
      plays: [
        { playerId: PlayerId.Human, cards: [{ id: `dummy-${i}-1`, rank: Rank.King, suit: Suit.Spades, points: 10 }] },
        { playerId: PlayerId.Bot1, cards: [{ id: `dummy-${i}-2`, rank: Rank.Three, suit: Suit.Spades, points: 0 }] },
        { playerId: PlayerId.Bot2, cards: [{ id: `dummy-${i}-3`, rank: Rank.Four, suit: Suit.Spades, points: 0 }] },
        { playerId: PlayerId.Bot3, cards: [{ id: `dummy-${i}-4`, rank: Rank.Five, suit: Suit.Spades, points: 0 }] },
      ],
      points: 10, // High point tricks going to opponents
      winningPlayerId: PlayerId.Human, // Human team winning
    }));

    // AI Bot1 hand designed to trigger desperate attacking strategy
    const aiBotHand: Card[] = [
      // Trump suit high cards that shouldn't be led
      { id: 'ace-hearts', rank: Rank.Ace, suit: Suit.Hearts, points: 0 },     // A♥ (trump suit)
      { id: 'king-hearts', rank: Rank.King, suit: Suit.Hearts, points: 10 },   // K♥ (trump suit)
      { id: '10-hearts', rank: Rank.Ten, suit: Suit.Hearts, points: 10 },      // 10♥ (trump suit)
      
      // Lower alternatives
      { id: '7-spades', rank: Rank.Seven, suit: Suit.Spades, points: 0 },
      { id: '8-clubs', rank: Rank.Eight, suit: Suit.Clubs, points: 0 },
      { id: '9-diamonds', rank: Rank.Nine, suit: Suit.Diamonds, points: 0 },
    ];

    gameState.players[1].hand = aiBotHand;
    gameState.currentPlayerIndex = 1; // Bot 1's turn (attacking team)
    gameState.gamePhase = GamePhase.Playing;
    gameState.currentTrick = null; // Leading

    console.log('=== ATTACKING LEADING STRATEGY TEST ===');
    console.log(`Trump suit: Hearts`);
    console.log(`AI Bot1 (attacking team): ${aiBotHand.map(c => `${c.rank}${c.suit === Suit.Hearts ? '♥' : c.suit === Suit.Spades ? '♠' : c.suit === Suit.Clubs ? '♣' : '♦'}`).join(', ')}`);
    console.log(`Game: Late game, 100 points to opponents (desperate scenario)`);
    console.log(`Expected: Desperate attacking strategy with potential trump priority`);

    const selectedCards = getAIMove(gameState, PlayerId.Bot1);
    const selectedCard = selectedCards[0];
    const cardDisplay = `${selectedCard.rank}${selectedCard.suit === Suit.Hearts ? '♥' : selectedCard.suit === Suit.Spades ? '♠' : selectedCard.suit === Suit.Clubs ? '♣' : '♦'}`;
    
    console.log(`AI selected: ${cardDisplay}`);

    // Check if AI led with trump suit high card
    const ledTrumpSuitHighCard = selectedCard.suit === Suit.Hearts && 
      (selectedCard.rank === Rank.Ace || selectedCard.rank === Rank.King || selectedCard.rank === Rank.Ten);

    if (ledTrumpSuitHighCard) {
      console.log('❌ BUG CONFIRMED: Attacking strategy led with trump suit high card!');
      console.log('This is likely from selectByStrength with preferTrump: true in desperate mode');
    } else {
      console.log('✅ GOOD: Even desperate attacking strategy avoided trump suit high cards');
    }

    // This should ideally pass, but might currently fail
    expect(ledTrumpSuitHighCard).toBe(false);
  });

  it('should test the specific desperate + trump priority code path', () => {
    // Target the exact conditions that trigger the problematic code
    const gameState = initializeGame();
    
    gameState.trumpInfo = {
      declared: true,
      declarerPlayerId: PlayerId.Bot2, // Bot2 declared trump 
      trumpRank: Rank.Two,
      trumpSuit: Suit.Diamonds,
    };

    // Simulate conditions for desperate + trump priority:
    // 1. Late game (many tricks played)
    // 2. Attacking team losing badly  
    // 3. Memory strategy suggests trump exhaustion
    gameState.tricks = Array(12).fill(null).map((_, i) => ({
      leadingPlayerId: PlayerId.Human,
      leadingCombo: [{ id: `dummy-${i}-lead`, rank: Rank.Queen, suit: Suit.Spades, points: 0 }],
      plays: [],
      points: 15,
      winningPlayerId: PlayerId.Human, // Opponents winning everything
    }));

    // Hand with strong trump suit cards
    const aiBotHand: Card[] = [
      { id: 'ace-diamonds', rank: Rank.Ace, suit: Suit.Diamonds, points: 0 },
      { id: 'king-diamonds', rank: Rank.King, suit: Suit.Diamonds, points: 10 },
      { id: '10-diamonds', rank: Rank.Ten, suit: Suit.Diamonds, points: 10 },
      { id: '6-spades', rank: Rank.Six, suit: Suit.Spades, points: 0 },
    ];

    gameState.players[2].hand = aiBotHand;
    gameState.currentPlayerIndex = 2; // Bot 2's turn 
    gameState.gamePhase = GamePhase.Playing;
    gameState.currentTrick = null;

    console.log('\n=== DESPERATE + TRUMP PRIORITY TEST ===');
    console.log(`Trump suit: Diamonds`);
    console.log(`AI hand: ${aiBotHand.map(c => `${c.rank}${c.suit === Suit.Diamonds ? '♦' : c.suit === Suit.Spades ? '♠' : '?'}`).join(', ')}`);
    console.log(`Conditions: Late game, attacking team losing badly (180 points to opponents)`);

    const selectedCards = getAIMove(gameState, PlayerId.Bot2);
    const selectedCard = selectedCards[0];
    const cardDisplay = `${selectedCard.rank}${selectedCard.suit === Suit.Diamonds ? '♦' : selectedCard.suit === Suit.Spades ? '♠' : '?'}`;
    
    console.log(`AI selected: ${cardDisplay}`);

    const ledTrumpHigh = selectedCard.suit === Suit.Diamonds && 
      (selectedCard.rank === Rank.Ace || selectedCard.rank === Rank.King || selectedCard.rank === Rank.Ten);

    if (ledTrumpHigh) {
      console.log('❌ ISSUE: selectByStrength with preferTrump:true led trump suit high card');
      console.log('Source: PlayStyle.Desperate + trumpPriority path in selectAttackingLeadPlay');
    } else {
      console.log('✅ Protected: Even with trump priority, avoided trump suit high cards');
    }

    console.log(`Led trump suit high card: ${ledTrumpHigh}`);
  });
});