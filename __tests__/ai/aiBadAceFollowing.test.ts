import { getAIMove } from '../../src/ai/aiLogic';
import { Card, GamePhase, PlayerId, Rank, Suit } from '../../src/types';
import { initializeGame } from '../../src/utils/gameInitialization';
import { gameLogger } from '../../src/utils/gameLogger';

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
      Card.createCard(Suit.Spades, Rank.Ace, 0),      // Ace that AI shouldn't waste
      Card.createCard(Suit.Spades, Rank.Three, 0),    // Small card (better choice)
      Card.createCard(Suit.Spades, Rank.Four, 0),     // Small card (better choice)
      Card.createCard(Suit.Hearts, Rank.Six, 0),      // Random trump
      Card.createCard(Suit.Clubs, Rank.Nine, 0)       // Random card
    ];
    
    // Opponent (Human) leads with an Ace of Spades - this is unbeatable!
    const leadingAce = Card.createCard(Suit.Spades, Rank.Ace, 0);
    
    gameState.currentTrick = {
      plays: [
        { playerId: PlayerId.Human, cards: [leadingAce] }
      ],
      winningPlayerId: PlayerId.Human,
      points: 0  // No points on table
    };
    gameState.currentPlayerIndex = 1; // Bot1 is next to play
    
    gameLogger.info('test_bad_ace_following_start', { scenario: 'ai_ace_following_behavior' }, '\n=== TESTING AI ACE FOLLOWING BEHAVIOR ===');
    gameLogger.info('test_bad_ace_following_human_led', { leadCard: 'A♠', cardType: 'unbeatable_non_trump_ace' }, 'Human led: A♠ (unbeatable non-trump Ace)');
    gameLogger.info('test_bad_ace_following_bot_hand', { hand: ['A♠', '3♠', '4♠', '6♥', '9♣'] }, 'Bot1 hand: A♠, 3♠, 4♠, 6♥, 9♣');
    gameLogger.info('test_bad_ace_following_expected', { expectedPlay: ['3♠', '4♠'], avoidPlay: 'A♠' }, 'Expected: Bot1 should play smallest spade (3♠ or 4♠), NOT the Ace');
    
    // Get AI move
    const aiMove = getAIMove(gameState, PlayerId.Bot1);
    gameLogger.info('test_bad_ace_following_ai_played', { aiMove: aiMove.map(card => `${card.rank}${card.suit}`) }, `AI played: ${aiMove.map(card => `${card.rank}${card.suit}`).join(', ')}`);
    
    // Check if AI played an Ace (this is the bug)
    const playedAce = aiMove.some(card => card.rank === Rank.Ace);
    
    if (playedAce) {
      gameLogger.error('test_bad_ace_following_bug_detected', { playedAce: true, issue: 'ace_wasted_after_opponent_ace' }, '❌ BUG: AI wasted an Ace after opponent led Ace!');
      gameLogger.error('test_bad_ace_following_suboptimal', { recommendation: 'play_smallest_card' }, '   This is suboptimal - should play smallest card instead');
    } else {
      gameLogger.info('test_bad_ace_following_good_behavior', { playedAce: false, behavior: 'ace_conserved' }, '✅ GOOD: AI conserved its Ace and played a smaller card');
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
      Card.createCard(Suit.Spades, Rank.Ace, 0),      // Ace that can win
      Card.createCard(Suit.Spades, Rank.Three, 0),    // Small card
      Card.createCard(Suit.Hearts, Rank.Six, 0),      // Random trump
      Card.createCard(Suit.Clubs, Rank.Nine, 0)       // Random card
    ];
    
    // Opponent leads with King (beatable with Ace)
    const leadingKing = Card.createCard(Suit.Spades, Rank.King, 0);
    
    gameState.currentTrick = {
      plays: [
        { playerId: PlayerId.Human, cards: [leadingKing] }
      ],
      winningPlayerId: PlayerId.Human,
      points: 10  // King has 10 points - worth collecting!
    };
    gameState.currentPlayerIndex = 1; // Bot1 is next to play
    
    gameLogger.info('test_ace_usage_with_points_start', { scenario: 'ai_ace_usage_with_points' }, '\n=== TESTING AI ACE USAGE WITH POINTS ===');
    gameLogger.info('test_ace_usage_human_led', { leadCard: 'K♠', cardType: 'beatable', points: 10 }, 'Human led: K♠ (beatable, worth 10 points)');
    gameLogger.info('test_ace_usage_bot_hand', { hand: ['A♠', '3♠', '6♥', '9♣'] }, 'Bot1 hand: A♠, 3♠, 6♥, 9♣');
    gameLogger.info('test_ace_usage_expected', { expectedPlay: 'A♠', reason: 'win_10_points' }, 'Expected: Bot1 should play Ace to win the 10 points');
    
    const aiMove = getAIMove(gameState, PlayerId.Bot1);
    gameLogger.info('test_ace_usage_ai_played', { aiMove: aiMove.map(card => `${card.rank}${card.suit}`) }, `AI played: ${aiMove.map(card => `${card.rank}${card.suit}`).join(', ')}`);
    
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
      Card.createCard(Suit.Spades, Rank.Ace, 0),      // Ace pair that shouldn't be wasted
      Card.createCard(Suit.Spades, Rank.Ace, 0),      
      Card.createCard(Suit.Spades, Rank.Three, 0),    // Small pair (better choice)
      Card.createCard(Suit.Spades, Rank.Three, 0),    
      Card.createCard(Suit.Hearts, Rank.Six, 0),      // Trump
      Card.createCard(Suit.Clubs, Rank.Nine, 0)       // Random card
    ];
    
    // Opponent leads with Ace pair (unbeatable!)
    const leadingAcePair = [
      Card.createCard(Suit.Spades, Rank.Ace, 0),
      Card.createCard(Suit.Spades, Rank.Ace, 0)
    ];
    
    gameState.currentTrick = {
      plays: [
        { playerId: PlayerId.Human, cards: leadingAcePair }
      ],
      winningPlayerId: PlayerId.Human,
      points: 0  // No points on table
    };
    gameState.currentPlayerIndex = 1; // Bot1 is next to play
    
    gameLogger.info('test_ace_pair_following_start', { scenario: 'ai_ace_pair_following' }, '\n=== TESTING AI ACE PAIR FOLLOWING ===');
    gameLogger.info('test_ace_pair_human_led', { leadCards: ['A♠', 'A♠'], cardType: 'unbeatable_ace_pair' }, 'Human led: A♠-A♠ (unbeatable Ace pair)');
    gameLogger.info('test_ace_pair_bot_hand', { hand: ['A♠-A♠', '3♠-3♠', '6♥', '9♣'] }, 'Bot1 hand: A♠-A♠, 3♠-3♠, 6♥, 9♣');
    gameLogger.info('test_ace_pair_expected', { expectedPlay: ['3♠', '3♠'], avoidPlay: ['A♠', 'A♠'] }, 'Expected: Bot1 should play 3♠-3♠, NOT waste the Ace pair');
    
    const aiMove = getAIMove(gameState, PlayerId.Bot1);
    gameLogger.info('test_ace_pair_ai_played', { aiMove: aiMove.map(card => `${card.rank}${card.suit}`) }, `AI played: ${aiMove.map(card => `${card.rank}${card.suit}`).join(', ')}`);
    
    // Check if AI wasted the Ace pair
    const playedAces = aiMove.filter(card => card.rank === Rank.Ace).length;
    
    if (playedAces > 0) {
      gameLogger.error('test_ace_pair_bug_detected', { playedAces: playedAces, issue: 'aces_wasted_after_unbeatable_pair' }, '❌ BUG: AI wasted Ace(s) after opponent led unbeatable Ace pair!');
    } else {
      gameLogger.info('test_ace_pair_good_behavior', { playedAces: 0, behavior: 'ace_pair_conserved' }, '✅ GOOD: AI conserved its Ace pair and played smaller cards');
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
      Card.createCard(Suit.Spades, Rank.Ace, 0),      // Ace that shouldn't be wasted
      Card.createCard(Suit.Spades, Rank.Four, 0),     // Small card (better choice)
      Card.createCard(Suit.Hearts, Rank.Six, 0),      // Trump
      Card.createCard(Suit.Clubs, Rank.Nine, 0)       // Random card
    ];
    
    // Create trick where Human led Ace, others followed, now Bot3 plays last
    const leadingAce = Card.createCard(Suit.Spades, Rank.Ace, 0);
    const bot1Play = Card.createCard(Suit.Spades, Rank.King, 0);  // Bot1 played King
    const bot2Play = Card.createCard(Suit.Spades, Rank.Queen, 0); // Bot2 played Queen
    
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
    
    gameLogger.info('test_complex_scenario_start', { scenario: 'complex_multi_player' }, '\n=== TESTING COMPLEX MULTI-PLAYER SCENARIO ===');
    gameLogger.info('test_complex_human_led', { leadCard: 'A♠', status: 'winning' }, 'Human led: A♠ (winning)');
    gameLogger.info('test_complex_bot1_played', { card: 'K♠', points: 10 }, 'Bot1 played: K♠ (10 points)');
    gameLogger.info('test_complex_bot2_played', { card: 'Q♠', points: 0 }, 'Bot2 played: Q♠ (0 points)');
    gameLogger.info('test_complex_bot3_hand', { hand: ['A♠', '4♠', '6♥', '9♣'] }, 'Bot3 hand: A♠, 4♠, 6♥, 9♣');
    gameLogger.info('test_complex_expected', { expectedPlay: '4♠', avoidPlay: 'A♠', reason: 'human_already_winning' }, 'Expected: Bot3 should play 4♠ (smallest), NOT waste Ace since Human is winning');
    
    const aiMove = getAIMove(gameState, PlayerId.Bot3);
    gameLogger.info('test_complex_ai_played', { aiMove: aiMove.map(card => `${card.rank}${card.suit}`) }, `AI played: ${aiMove.map(card => `${card.rank}${card.suit}`).join(', ')}`);
    
    // Bot3 should not waste an Ace when Human's Ace is already winning
    const playedAce = aiMove.some(card => card.rank === Rank.Ace);
    
    if (playedAce) {
      gameLogger.error('test_complex_bug_detected', { playedAce: true, issue: 'ace_wasted_when_opponent_winning' }, '❌ BUG: AI wasted an Ace when opponent was already winning with Ace!');
    } else {
      gameLogger.info('test_complex_good_behavior', { playedAce: false, behavior: 'ace_conserved_opponent_winning' }, '✅ GOOD: AI conserved its Ace since opponent was already winning');
    }
    
    expect(playedAce).toBe(false);
  });
});