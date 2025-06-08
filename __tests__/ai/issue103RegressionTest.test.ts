import { getAIMove } from '../../src/ai/aiLogic';
import { initializeGame } from '../../src/game/gameLogic';
import { PlayerId, Rank, Suit, GamePhase, JokerType } from '../../src/types';
import type { GameState, Card } from '../../src/types';

describe('Issue #103 Regression Test - AI Wasting Valuable Trump Rank Cards', () => {
  it('should reproduce Issue #103: AI plays rank card when it cannot beat the winning card', () => {
    // EXACT SCENARIO FROM ISSUE #103:
    // 1. Someone leads a strong card (doesn't matter who)
    // 2. AI has rank cards that CANNOT beat the winning card
    // 3. AI incorrectly wastes rank card instead of playing weak trump

    const gameState = initializeGame();
    gameState.trumpInfo = {
      
      
      trumpRank: Rank.Two, // Rank 2 is trump
      trumpSuit: Suit.Spades,
    };

    // SCENARIO: Someone leads Big Joker (unbeatable)
    const leadingCard: Card = {
      id: 'big-joker-lead',
      joker: JokerType.Big,
      points: 0
    };

    // AI Bot has trump rank cards that CANNOT beat Big Joker
    const aiBotHand: Card[] = [
      { id: '2-hearts', rank: Rank.Two, suit: Suit.Hearts, points: 0 }, // Trump rank off-suit - CANNOT beat Big Joker (VALUABLE - should preserve)
      { id: '2-clubs', rank: Rank.Two, suit: Suit.Clubs, points: 0 },  // Trump rank off-suit - CANNOT beat Big Joker (VALUABLE - should preserve)  
      { id: '3-spades', rank: Rank.Three, suit: Suit.Spades, points: 0 }, // Weak trump suit (SHOULD PLAY THIS)
      { id: '4-spades', rank: Rank.Four, suit: Suit.Spades, points: 0 },   // Weak trump suit
      { id: 'ace-diamonds', rank: Rank.Ace, suit: Suit.Diamonds, points: 0 }, // Non-trump
    ];
    gameState.players[1].hand = aiBotHand;

    // Trick state: Someone leads Big Joker (unbeatable by any rank card)
    gameState.currentTrick = {
      plays: [
        {
          playerId: PlayerId.Human,
          cards: [leadingCard],
        }
      ],
      points: 0,
      winningPlayerId: PlayerId.Human, // Human winning with Big Joker (unbeatable)
    };

    gameState.currentPlayerIndex = 1; // Bot 1's turn
    gameState.gamePhase = GamePhase.Playing;

    // Get AI move
    const selectedCards = getAIMove(gameState, PlayerId.Bot1);
    const selectedCard = selectedCards[0];

    console.log('=== ISSUE #103 REPRODUCTION TEST ===');
    console.log(`Leading card: Big Joker (unbeatable)`);
    console.log(`AI has options:`, aiBotHand.map(c => `${c.rank}${c.suit}`));
    console.log(`AI selected: ${selectedCard.rank}${selectedCard.suit}`);
    console.log(`Key point: AI rank cards (2♥, 2♣) CANNOT beat Big Joker - should not waste them`);
    console.log('');

    // CHECK FOR BUG: Is AI playing a valuable rank card when it can't win?
    const isPlayingRankCard = selectedCard.rank === Rank.Two;
    const isPlayingWeakTrump = selectedCard.rank === Rank.Three && selectedCard.suit === Suit.Spades;

    if (isPlayingRankCard) {
      console.log('❌ BUG REPRODUCED: AI is wasting valuable rank card!');
      console.log(`   Playing: ${selectedCard.rank}${selectedCard.suit} (rank card)`);
      console.log(`   Should play: 3♠ (weak trump suit card)`);
      
      // This test should FAIL to show the bug exists
      fail(`Issue #103 reproduced: AI played rank card ${selectedCard.rank}${selectedCard.suit} instead of weak trump 3♠`);
    } else if (isPlayingWeakTrump) {
      console.log('✅ CORRECT BEHAVIOR: AI played weak trump suit card');
      console.log(`   Correctly playing: ${selectedCard.rank}${selectedCard.suit}`);
      
      // This should pass when bug is fixed
      expect(selectedCard.rank).toBe(Rank.Three);
      expect(selectedCard.suit).toBe(Suit.Spades);
    } else {
      console.log('❓ UNEXPECTED: AI played something else');
      console.log(`   AI played: ${selectedCard.rank}${selectedCard.suit}`);
      fail(`Unexpected AI choice: ${selectedCard.rank}${selectedCard.suit}`);
    }
  });

  it('should reproduce Issue #103 with different trump suits to verify bug pattern', () => {
    // Test with Hearts trump to see if bug persists across different trump suits
    const gameState = initializeGame();
    gameState.trumpInfo = {
      
      
      trumpRank: Rank.Three, // Rank 3 is trump
      trumpSuit: Suit.Hearts,
    };

    // Opponent leads 3♥ (trump rank in trump suit)
    const leadingCard: Card = {
      id: '3-hearts-lead',
      rank: Rank.Three,
      suit: Suit.Hearts,
      points: 0
    };

    // AI has rank cards and weak trump
    const aiBotHand: Card[] = [
      { id: '3-spades', rank: Rank.Three, suit: Suit.Spades, points: 0 }, // Trump rank off-suit (VALUABLE)
      { id: '3-clubs', rank: Rank.Three, suit: Suit.Clubs, points: 0 },  // Trump rank off-suit (VALUABLE)
      { id: '4-hearts', rank: Rank.Four, suit: Suit.Hearts, points: 0 }, // Weak trump suit (SHOULD PLAY)
      { id: '5-hearts', rank: Rank.Five, suit: Suit.Hearts, points: 5 }, // Trump suit with points
    ];
    gameState.players[2].hand = aiBotHand;

    gameState.currentTrick = {
      plays: [
        {
          playerId: PlayerId.Bot1,
          cards: [leadingCard],
        }
      ],
      points: 0,
      winningPlayerId: PlayerId.Bot1, // Bot1 (opponent to Bot2) leading
    };

    gameState.currentPlayerIndex = 2; // Bot 2's turn
    gameState.gamePhase = GamePhase.Playing;

    const selectedCards = getAIMove(gameState, PlayerId.Bot2);
    const selectedCard = selectedCards[0];

    console.log('=== ISSUE #103 VARIANT TEST ===');
    console.log(`Opponent led: 3♥ (trump rank in trump suit)`);
    console.log(`AI selected: ${selectedCard.rank}${selectedCard.suit}`);

    // Check if AI is playing rank cards when it should play weak trump
    const isWastingRankCard = selectedCard.rank === Rank.Three;
    
    if (isWastingRankCard) {
      fail(`Issue #103 variant: AI wasted rank card ${selectedCard.rank}${selectedCard.suit} instead of weak trump 4♥`);
    }

    // Should play 4♥ (weak trump suit)
    expect(selectedCard.rank).toBe(Rank.Four);
    expect(selectedCard.suit).toBe(Suit.Hearts);
  });
});