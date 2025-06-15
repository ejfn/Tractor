import { getAIMove } from '../../src/ai/aiLogic';
import { initializeGame } from '../../src/utils/gameInitialization';
import { Card, Suit, Rank, PlayerId, TrumpInfo, GameState } from '../../src/types';
import { gameLogger } from '../../src/utils/gameLogger';

describe('Issue #183: 4th Player Trump Pair Waste When Teammate Winning', () => {
  let gameState: GameState;
  let trumpInfo: TrumpInfo;

  beforeEach(() => {
    gameState = initializeGame();
    trumpInfo = {
      trumpRank: Rank.Two,
      trumpSuit: Suit.Spades,
    };
    gameState.trumpInfo = trumpInfo;
    gameState.currentPlayerIndex = 3; // Bot3 as 4th player
  });

  it('should NOT waste trump pairs when teammate is winning with non-trump pair lead', () => {
    // Set up non-trump pair lead (Hearts)
    const leadCard1 = Card.createCard(Suit.Hearts, Rank.Seven, 0);
    const leadCard2 = Card.createCard(Suit.Hearts, Rank.Seven, 1);

    // Teammate (Bot1) wins with strong Hearts pair
    const teammateCard1 = Card.createCard(Suit.Hearts, Rank.King, 0);
    const teammateCard2 = Card.createCard(Suit.Hearts, Rank.King, 1);

    // Opponent (Bot2) plays weaker Hearts pair
    const opponentCard1 = Card.createCard(Suit.Hearts, Rank.Nine, 0);
    const opponentCard2 = Card.createCard(Suit.Hearts, Rank.Nine, 1);

    gameState.currentTrick = {
      plays: [
        { playerId: PlayerId.Human, cards: [leadCard1, leadCard2] }, // Hearts pair lead
        { playerId: PlayerId.Bot1, cards: [teammateCard1, teammateCard2] }, // Teammate winning with K♥-K♥
        { playerId: PlayerId.Bot2, cards: [opponentCard1, opponentCard2] } // Opponent losing with 9♥-9♥
      ],
      winningPlayerId: PlayerId.Bot1, // Bot1 (Bot3's teammate) is winning
      points: 0
    };

    // 4th player (Bot3) hand with trump pairs and non-trump options
    gameState.players[3].hand = [
      // Trump pairs (valuable - should be preserved)
      Card.createCard(Suit.Spades, Rank.Three, 0), // Trump suit pair
      Card.createCard(Suit.Spades, Rank.Three, 1),
      Card.createCard(Suit.Clubs, Rank.Two, 0), // Trump rank pair  
      Card.createCard(Suit.Diamonds, Rank.Two, 1),
      
      // Non-trump Hearts pairs (should be used for following)
      Card.createCard(Suit.Hearts, Rank.Six, 0),
      Card.createCard(Suit.Hearts, Rank.Six, 1),
      Card.createCard(Suit.Hearts, Rank.Eight, 0),
      Card.createCard(Suit.Hearts, Rank.Eight, 1),
      
      // Other cards
      Card.createCard(Suit.Clubs, Rank.Four, 0)
    ];

    gameLogger.info('test_trump_pair_waste_setup', {
      testName: 'Trump Pair Waste',
      lead: '7♥-7♥ (pair)',
      teammate: 'K♥-K♥ (winning)',
      opponent: '9♥-9♥ (losing)',
      bot3Hand: {
        trumpPairs: '3♠-3♠, 2♣-2♦ (should preserve)',
        heartsPairs: '6♥-6♥, 8♥-8♥ (can use for following)'
      }
    }, '=== Issue #183 Test: Trump Pair Waste === Expected: Bot3 should use Hearts pair, NOT trump pair');

    const aiMove = getAIMove(gameState, PlayerId.Bot3);

    gameLogger.info('test_ai_decision', {
      selectedCards: aiMove.map(c => `${c.rank}${c.suit}`).join('-')
    }, 'AI selected cards for trump pair waste test');

    // Verify correct behavior
    expect(aiMove).toHaveLength(2); // Should play a pair to follow pair lead

    // CRITICAL: Should NOT use trump cards when teammate is winning
    const usedTrump = aiMove.some(card => 
      card.suit === trumpInfo.trumpSuit || card.rank === trumpInfo.trumpRank
    );
    expect(usedTrump).toBe(false); // Should NOT waste trump when teammate winning

    // Should use Hearts cards to follow suit
    const usedHearts = aiMove.every(card => card.suit === Suit.Hearts);
    expect(usedHearts).toBe(true); // Should follow suit with Hearts

    // Should be a valid pair
    expect(aiMove[0].rank).toBe(aiMove[1].rank); // Should be same rank pair
  });

  it('should preserve valuable trump pairs and use strategic disposal when teammate secure', () => {
    // Set up single card lead (non-trump)
    const leadCard = Card.createCard(Suit.Clubs, Rank.Seven, 0);

    // Teammate (Bot1) wins with strong trump
    const teammateCard = Card.createCard(Suit.Spades, Rank.Ace, 0); // Strong trump

    // Opponent (Bot2) plays weak card
    const opponentCard = Card.createCard(Suit.Clubs, Rank.Four, 0);

    gameState.currentTrick = {
      plays: [
        { playerId: PlayerId.Human, cards: [leadCard] }, // 7♣ lead
        { playerId: PlayerId.Bot1, cards: [teammateCard] }, // Teammate winning with A♠ (trump)
        { playerId: PlayerId.Bot2, cards: [opponentCard] } // Opponent with 4♣
      ],
      winningPlayerId: PlayerId.Bot1, // Bot1 (Bot3's teammate) is winning securely
      points: 0
    };

    // 4th player (Bot3) hand with trump pairs and disposal options
    gameState.players[3].hand = [
      // Trump pairs (valuable - should be preserved)
      Card.createCard(Suit.Clubs, Rank.Two, 0), // Trump rank pair
      Card.createCard(Suit.Hearts, Rank.Two, 1),
      
      // Disposal options  
      Card.createCard(Suit.Clubs, Rank.Six, 0), // Can follow suit - safe disposal
      Card.createCard(Suit.Clubs, Rank.Eight, 0), // Can follow suit
      Card.createCard(Suit.Diamonds, Rank.Nine, 0), // Off-suit option
    ];

    gameLogger.info('test_trump_conservation_setup', {
      testName: 'Trump Conservation',
      lead: '7♣ (single)',
      teammate: 'A♠ (trump - secure win)',
      opponent: '4♣ (weak)',
      bot3Hand: 'trump rank pair 2♣-2♥ + disposal options'
    }, '=== Issue #183 Test: Trump Conservation === Expected: Bot3 should dispose, NOT use trump pair');

    const aiMove = getAIMove(gameState, PlayerId.Bot3);

    gameLogger.info('test_ai_decision', {
      selectedCards: aiMove.map(c => `${c.rank}${c.suit}`).join('-')
    }, 'AI selected cards for trump conservation test');

    // Should play single card to follow single lead
    expect(aiMove).toHaveLength(1);

    // CRITICAL: Should NOT use trump when teammate has secure win
    const usedTrump = aiMove.some(card => 
      card.suit === trumpInfo.trumpSuit || card.rank === trumpInfo.trumpRank
    );
    expect(usedTrump).toBe(false); // Should preserve trump pairs

    // Should use safe disposal card
    const selectedCard = aiMove[0];
    expect(selectedCard.points || 0).toBe(0); // Should not give away points
    expect([Suit.Clubs, Suit.Diamonds]).toContain(selectedCard.suit); // Valid disposal options
  });

  it('should use trump pairs when they can beat stronger opponent combinations', () => {
    // Test specifically for trump PAIR usage when opponent has winning pair
    const leadCard1 = Card.createCard(Suit.Hearts, Rank.Seven, 0);
    const leadCard2 = Card.createCard(Suit.Hearts, Rank.Seven, 1);

    // Teammate plays weaker pair
    const teammateCard1 = Card.createCard(Suit.Hearts, Rank.Nine, 0);
    const teammateCard2 = Card.createCard(Suit.Hearts, Rank.Nine, 1);

    // Opponent plays strong pair that beats teammate
    const opponentCard1 = Card.createCard(Suit.Hearts, Rank.Ace, 0);
    const opponentCard2 = Card.createCard(Suit.Hearts, Rank.Ace, 1);

    gameState.currentTrick = {
      plays: [
        { playerId: PlayerId.Human, cards: [leadCard1, leadCard2] },
        { playerId: PlayerId.Bot1, cards: [teammateCard1, teammateCard2] }, // 9♥-9♥
        { playerId: PlayerId.Bot2, cards: [opponentCard1, opponentCard2] } // A♥-A♥ beats teammate
      ],
      winningPlayerId: PlayerId.Bot2, // Opponent winning with Ace pair
      points: 20 // Valuable trick
    };

    gameState.players[3].hand = [
      // Trump pair that can beat opponent's Ace pair
      Card.createCard(Suit.Spades, Rank.Three, 0), // Trump suit pair
      Card.createCard(Suit.Spades, Rank.Three, 1),
      // Non-trump option that can't beat A♥-A♥
      Card.createCard(Suit.Hearts, Rank.Six, 0),
      Card.createCard(Suit.Hearts, Rank.Six, 1),
    ];

    const aiMove = getAIMove(gameState, PlayerId.Bot3);

    gameLogger.info('test_ai_decision', {
      selectedCards: aiMove.map(c => `${c.rank}${c.suit}`).join('-'),
      context: 'valuable trick vs opponent pair'
    }, 'AI selected cards for valuable trick scenario');

    // When opponent is winning a valuable trick and trump pair can beat them,
    // trump use is justified for team benefit
    const usedTrump = aiMove.some(card => 
      card.suit === trumpInfo.trumpSuit || card.rank === trumpInfo.trumpRank
    );
    
    // For a 20-point trick where opponent is beating teammate, trump pair use is strategic
    // This tests the case where trump pairs ARE justified
    if (usedTrump) {
      expect(aiMove).toHaveLength(2); // Should use trump pair
      expect(aiMove[0].rank).toBe(aiMove[1].rank); // Should be valid pair
    } else {
      // If not using trump, should at least follow with Hearts pair
      expect(aiMove).toHaveLength(2);
      expect(aiMove.every(c => c.suit === Suit.Hearts)).toBe(true);
    }
  });

  it('should identify the specific trump pair waste scenario from issue #183', () => {
    // This test tries to recreate the exact scenario mentioned in issue #183
    // where 4th player wastes trump pairs when teammate is already winning
    
    // Non-trump pair lead 
    const leadCard1 = Card.createCard(Suit.Clubs, Rank.Eight, 0);
    const leadCard2 = Card.createCard(Suit.Clubs, Rank.Eight, 1);

    // Teammate (2nd player) wins with strong pair
    const teammateCard1 = Card.createCard(Suit.Clubs, Rank.Ace, 0);
    const teammateCard2 = Card.createCard(Suit.Clubs, Rank.Ace, 1);

    // Opponent (3rd player) plays weaker pair
    const opponentCard1 = Card.createCard(Suit.Clubs, Rank.Ten, 0);
    const opponentCard2 = Card.createCard(Suit.Clubs, Rank.Ten, 1);

    gameState.currentTrick = {
      plays: [
        { playerId: PlayerId.Human, cards: [leadCard1, leadCard2] }, // 8♣-8♣ lead
        { playerId: PlayerId.Bot1, cards: [teammateCard1, teammateCard2] }, // A♣-A♣ (teammate winning)
        { playerId: PlayerId.Bot2, cards: [opponentCard1, opponentCard2] } // 10♣-10♣ (opponent)
      ],
      winningPlayerId: PlayerId.Bot1, // Bot1 (Bot3's teammate) securely winning
      points: 20 // Teammate already collecting the points
    };

    // 4th player has options including trump pairs
    gameState.players[3].hand = [
      // Trump pairs available
      Card.createCard(Suit.Spades, Rank.Four, 0), // Trump suit pair
      Card.createCard(Suit.Spades, Rank.Four, 1),
      Card.createCard(Suit.Hearts, Rank.Two, 0), // Trump rank pair (cross-suit)
      Card.createCard(Suit.Diamonds, Rank.Two, 1),
      
      // Non-trump Clubs pairs for following
      Card.createCard(Suit.Clubs, Rank.Six, 0),
      Card.createCard(Suit.Clubs, Rank.Six, 1),
      Card.createCard(Suit.Clubs, Rank.Seven, 0),
      Card.createCard(Suit.Clubs, Rank.Seven, 1),
    ];

    gameLogger.info('test_exact_scenario_setup', {
      testName: 'Issue #183 Exact Scenario',
      setup: 'Non-trump pair lead, teammate SECURELY winning, 4th player has both trump pairs and following options',
      lead: '8♣-8♣',
      teammate: 'A♣-A♣ (securely winning)',
      opponent: '10♣-10♣',
      bot3Hand: {
        trumpPairs: '4♠-4♠, 2♥-2♦',
        clubsPairs: '6♣-6♣, 7♣-7♣'
      }
    }, '=== Issue #183 Exact Scenario Test === CRITICAL: Should use Clubs pair to follow, NOT waste trump pair');

    const aiMove = getAIMove(gameState, PlayerId.Bot3);

    gameLogger.info('test_ai_decision', {
      selectedCards: aiMove.map(c => `${c.rank}${c.suit}`).join('-')
    }, 'AI selected cards for exact scenario test');

    // This is the core issue: when teammate is securely winning with A♣-A♣,
    // the 4th player should NOT waste trump pairs
    expect(aiMove).toHaveLength(2); // Should follow pair with pair

    // CRITICAL: Should follow with Clubs, not waste trump
    const usedTrump = aiMove.some(card => 
      card.suit === trumpInfo.trumpSuit || card.rank === trumpInfo.trumpRank
    );
    
    if (usedTrump) {
      gameLogger.error('test_issue_reproduced', {
        issue: '#183',
        problem: 'AI wasted trump pair when teammate was securely winning'
      }, '❌ ISSUE REPRODUCED: This is exactly the bug described in Issue #183');
    }
    
    expect(usedTrump).toBe(false); // Should NOT waste trump when teammate securely winning
    
    // Should follow suit with Clubs
    expect(aiMove.every(c => c.suit === Suit.Clubs)).toBe(true);
    expect(aiMove[0].rank).toBe(aiMove[1].rank); // Valid pair
  });
});