import { getAIMove } from '../../src/ai/aiLogic';
import { initializeGame } from '../../src/game/gameLogic';
import { PlayerId, GamePhase, Suit, Rank } from '../../src/types';
import { createCard } from '../helpers/cards';

/**
 * Test for issue #61 comment: AI playing Ace after leading Ace
 * 
 * Problem: When opponent leads an Ace (unbeatable), AI should play smallest cards,
 * not waste its own Aces which can't win anyway.
 */
describe('Issue #61: AI Bad Ace Following', () => {
  test('AI should not play Ace after opponent leads Ace', () => {
    // Set up game state
    let gameState = initializeGame();
    gameState.gamePhase = GamePhase.Playing;
    gameState.trumpInfo = {
      trumpSuit: Suit.Hearts,
      trumpRank: Rank.Two,
    };
    
    // Find AI player
    const bot1Player = gameState.players.find(p => p.id === PlayerId.Bot1)!;
    
    // Give Bot1 an Ace and some small cards
    bot1Player.hand = [
      createCard(Suit.Spades, Rank.Ace),      // Ace that AI shouldn't waste
      createCard(Suit.Spades, Rank.Three),    // Small card (better choice)
      createCard(Suit.Spades, Rank.Four),     // Small card (better choice)
      createCard(Suit.Hearts, Rank.Six),      // Random trump
      createCard(Suit.Clubs, Rank.Nine)       // Random card
    ];
    
    // Opponent (Human) leads with an Ace of Spades - this is unbeatable!
    const leadingAce = createCard(Suit.Spades, Rank.Ace);
    
    gameState.currentTrick = {
      plays: [
        { playerId: PlayerId.Human, cards: [leadingAce] }
      ],
      winningPlayerId: PlayerId.Human,
      points: 0  // No points on table
    };
    gameState.currentPlayerIndex = 1; // Bot1 is next to play
    
    console.log('\n=== TESTING AI ACE FOLLOWING BEHAVIOR ===');
    console.log('Human led: A♠ (unbeatable non-trump Ace)');
    console.log('Bot1 hand: A♠, 3♠, 4♠, 6♥, 9♣');
    console.log('Expected: Bot1 should play smallest spade (3♠ or 4♠), NOT the Ace');
    
    // Get AI move
    const aiMove = getAIMove(gameState, PlayerId.Bot1);
    console.log('AI played:', aiMove.map(card => `${card.rank}${card.suit}`));
    
    // Check if AI played an Ace (this is the bug)
    const playedAce = aiMove.some(card => card.rank === Rank.Ace);
    
    if (playedAce) {
      console.log('❌ BUG: AI wasted an Ace after opponent led Ace!');
      console.log('   This is suboptimal - should play smallest card instead');
    } else {
      console.log('✅ GOOD: AI conserved its Ace and played a smaller card');
    }
    
    // The AI should NOT play an Ace when following an unbeatable Ace
    expect(playedAce).toBe(false);
    
    // The AI should play a small card instead
    const playedSmallCard = aiMove.some(card => 
      card.rank === Rank.Three || card.rank === Rank.Four
    );
    expect(playedSmallCard).toBe(true);
  });
  
  test('AI should play Ace when there are points on the table worth collecting', () => {
    // Set up game state where using an Ace makes sense
    let gameState = initializeGame();
    gameState.gamePhase = GamePhase.Playing;
    gameState.trumpInfo = {
      trumpSuit: Suit.Hearts,
      trumpRank: Rank.Two,
    };
    
    const bot1Player = gameState.players.find(p => p.id === PlayerId.Bot1)!;
    
    // Give Bot1 an Ace and other cards
    bot1Player.hand = [
      createCard(Suit.Spades, Rank.Ace),      // Ace that can win
      createCard(Suit.Spades, Rank.Three),    // Small card
      createCard(Suit.Hearts, Rank.Six),      // Random trump
      createCard(Suit.Clubs, Rank.Nine)       // Random card
    ];
    
    // Opponent leads with King (beatable with Ace)
    const leadingKing = createCard(Suit.Spades, Rank.King);
    
    gameState.currentTrick = {
      plays: [
        { playerId: PlayerId.Human, cards: [leadingKing] }
      ],
      winningPlayerId: PlayerId.Human,
      points: 10  // King has 10 points - worth collecting!
    };
    gameState.currentPlayerIndex = 1; // Bot1 is next to play
    
    console.log('\n=== TESTING AI ACE USAGE WITH POINTS ===');
    console.log('Human led: K♠ (beatable, worth 10 points)');
    console.log('Bot1 hand: A♠, 3♠, 6♥, 9♣');
    console.log('Expected: Bot1 should play Ace to win the 10 points');
    
    const aiMove = getAIMove(gameState, PlayerId.Bot1);
    console.log('AI played:', aiMove.map(card => `${card.rank}${card.suit}`));
    
    // In this case, playing the Ace makes sense to collect points
    const playedAce = aiMove.some(card => card.rank === Rank.Ace);
    expect(playedAce).toBe(true);
  });
  
  test('AI should not waste Ace pair after opponent leads Ace pair', () => {
    // Test more complex scenario: Ace pair vs Ace pair
    let gameState = initializeGame();
    gameState.gamePhase = GamePhase.Playing;
    gameState.trumpInfo = {
      trumpSuit: Suit.Hearts,
      trumpRank: Rank.Two,
    };
    
    const bot1Player = gameState.players.find(p => p.id === PlayerId.Bot1)!;
    
    // Give Bot1 an Ace pair and some small pairs
    bot1Player.hand = [
      createCard(Suit.Spades, Rank.Ace),      // Ace pair that shouldn't be wasted
      createCard(Suit.Spades, Rank.Ace),      
      createCard(Suit.Spades, Rank.Three),    // Small pair (better choice)
      createCard(Suit.Spades, Rank.Three),    
      createCard(Suit.Hearts, Rank.Six),      // Trump
      createCard(Suit.Clubs, Rank.Nine)       // Random card
    ];
    
    // Opponent leads with Ace pair (unbeatable!)
    const leadingAcePair = [
      createCard(Suit.Spades, Rank.Ace),
      createCard(Suit.Spades, Rank.Ace)
    ];
    
    gameState.currentTrick = {
      plays: [
        { playerId: PlayerId.Human, cards: leadingAcePair }
      ],
      winningPlayerId: PlayerId.Human,
      points: 0  // No points on table
    };
    gameState.currentPlayerIndex = 1; // Bot1 is next to play
    
    console.log('\n=== TESTING AI ACE PAIR FOLLOWING ===');
    console.log('Human led: A♠-A♠ (unbeatable Ace pair)');
    console.log('Bot1 hand: A♠-A♠, 3♠-3♠, 6♥, 9♣');
    console.log('Expected: Bot1 should play 3♠-3♠, NOT waste the Ace pair');
    
    const aiMove = getAIMove(gameState, PlayerId.Bot1);
    console.log('AI played:', aiMove.map(card => `${card.rank}${card.suit}`));
    
    // Check if AI wasted the Ace pair
    const playedAces = aiMove.filter(card => card.rank === Rank.Ace).length;
    
    if (playedAces > 0) {
      console.log('❌ BUG: AI wasted Ace(s) after opponent led unbeatable Ace pair!');
    } else {
      console.log('✅ GOOD: AI conserved its Ace pair and played smaller cards');
    }
    
    // Should not play any Aces
    expect(playedAces).toBe(0);
    
    // Should play the small pair instead  
    const playedSmallPair = aiMove.filter(card => card.rank === Rank.Three).length;
    expect(playedSmallPair).toBe(2);
  });
  
  test('Complex scenario: Multi-player trick with Aces already played', () => {
    // Test scenario where previous players already played cards
    let gameState = initializeGame();
    gameState.gamePhase = GamePhase.Playing;
    gameState.trumpInfo = {
      trumpSuit: Suit.Hearts,
      trumpRank: Rank.Two,
    };
    
    const bot3Player = gameState.players.find(p => p.id === PlayerId.Bot3)!; // Bot3 is last to play
    
    // Give Bot3 an Ace and small cards
    bot3Player.hand = [
      createCard(Suit.Spades, Rank.Ace),      // Ace that shouldn't be wasted
      createCard(Suit.Spades, Rank.Four),     // Small card (better choice)
      createCard(Suit.Hearts, Rank.Six),      // Trump
      createCard(Suit.Clubs, Rank.Nine)       // Random card
    ];
    
    // Create trick where Human led Ace, others followed, now Bot3 plays last
    const leadingAce = createCard(Suit.Spades, Rank.Ace);
    const bot1Play = createCard(Suit.Spades, Rank.King);  // Bot1 played King
    const bot2Play = createCard(Suit.Spades, Rank.Queen); // Bot2 played Queen
    
    gameState.currentTrick = {
      plays: [
        { playerId: PlayerId.Human, cards: [leadingAce] },
        { playerId: PlayerId.Bot1, cards: [bot1Play] },
        { playerId: PlayerId.Bot2, cards: [bot2Play] }
      ],
      winningPlayerId: PlayerId.Human, // Human's Ace is still winning
      points: 20  // King + Queen = 20 points, but Human's Ace is winning
    };
    gameState.currentPlayerIndex = 3; // Bot3 is next (last to play)
    
    console.log('\n=== TESTING COMPLEX MULTI-PLAYER SCENARIO ===');
    console.log('Human led: A♠ (winning)');
    console.log('Bot1 played: K♠ (10 points)');
    console.log('Bot2 played: Q♠ (0 points)');
    console.log('Bot3 hand: A♠, 4♠, 6♥, 9♣');
    console.log('Expected: Bot3 should play 4♠ (smallest), NOT waste Ace since Human is winning');
    
    const aiMove = getAIMove(gameState, PlayerId.Bot3);
    console.log('AI played:', aiMove.map(card => `${card.rank}${card.suit}`));
    
    // Bot3 should not waste an Ace when Human's Ace is already winning
    const playedAce = aiMove.some(card => card.rank === Rank.Ace);
    
    if (playedAce) {
      console.log('❌ BUG: AI wasted an Ace when opponent was already winning with Ace!');
    } else {
      console.log('✅ GOOD: AI conserved its Ace since opponent was already winning');
    }
    
    expect(playedAce).toBe(false);
  });
});