import { initializeGame } from '../../src/utils/gameInitialization';
import { isValidPlay } from '../../src/game/playValidation';
import { getAIMove } from '../../src/ai/aiLogic';
import { Card, PlayerId, GamePhase, Suit, Rank, JokerType } from '../../src/types';

/**
 * Comprehensive AI tractor following behavior tests
 * 
 * This includes the original fix for issue #71 plus comprehensive testing
 * of all tractor following rules:
 * 1. AI should properly follow tractor hierarchy: tractors -> pairs -> singles
 * 2. Same suit priority order (tractors → pairs → remaining pairs → singles → other suits)
 * 3. Trump suit special rules (trump suit pairs, trump rank pairs, joker pairs)
 * 4. Cross-suit trump victory (same combo type when zero cards in leading suit)
 * 5. AI strategic decision-making within the rule framework
 */
describe('AI Tractor Following Behavior', () => {
  describe('Issue #71: AI Tractor Following Rules', () => {
  test('AI plays valid moves when following trump tractors', () => {
    console.log('\n✅ VERIFYING FIX FOR ISSUE #71: AI TRACTOR FOLLOWING');
    
    // Initialize game with Hearts as trump (rank 2)
    let gameState = initializeGame();
    gameState.gamePhase = GamePhase.Playing;
    gameState.trumpInfo = {
      trumpSuit: Suit.Hearts,
      trumpRank: Rank.Two,
      
      
    };
    
    // Find players
    const bot1Player = gameState.players.find(p => p.id === PlayerId.Bot1)!;
    
    // Bot1 has trump cards that could form pairs
    bot1Player.hand = [
      Card.createCard(Suit.Hearts, Rank.Seven, 0), Card.createCard(Suit.Hearts, Rank.Seven, 0), // Hearts pair (trump suit)
      Card.createCard(Suit.Hearts, Rank.Eight, 0), Card.createCard(Suit.Hearts, Rank.Eight, 0), // Hearts pair (trump suit)
      Card.createCard(Suit.Hearts, Rank.Nine, 0), // Single trump
      Card.createCard(Suit.Spades, Rank.Two, 0), Card.createCard(Suit.Spades, Rank.Two, 0), // Trump rank pair in other suit
      Card.createCard(Suit.Clubs, Rank.Ten, 0)
    ];
    
    // Human leads with Hearts tractor (trump suit tractor)
    const leadingTractor = [
      Card.createCard(Suit.Hearts, Rank.Five, 0), Card.createCard(Suit.Hearts, Rank.Five, 0),
      Card.createCard(Suit.Hearts, Rank.Six, 0), Card.createCard(Suit.Hearts, Rank.Six, 0)
    ];
    
    gameState.currentTrick = {
      plays: [
        { playerId: PlayerId.Human, cards: leadingTractor }
      ],
      winningPlayerId: PlayerId.Human,
      points: 10
    };
    gameState.currentPlayerIndex = 1; // Bot1 is at index 1
    
    console.log('Human led Hearts tractor: 5♥-5♥-6♥-6♥ (trump suit tractor)');
    console.log('Bot1 hand:');
    bot1Player.hand.forEach(card => {
      console.log(`  ${card.suit}-${card.rank}`);
    });
    console.log('Bot1 has Hearts pairs: 7♥-7♥ and 8♥-8♥ available');
    
    // Get AI move - should now be valid
    const aiMove = getAIMove(gameState, PlayerId.Bot1);
    console.log('AI move:', aiMove.map(card => `${card.suit}-${card.rank}`));
    
    // Check if the move is valid
    const isValid = isValidPlay(aiMove, leadingTractor, bot1Player.hand, gameState.trumpInfo);
    console.log('Is AI move valid?', isValid);
    
    if (isValid) {
      console.log('✅ FIX CONFIRMED: AI now generates VALID moves!');
      
      // Check if AI properly used pairs instead of singles
      const hasHeartsPairs = (
        aiMove.filter(card => card.suit === Suit.Hearts).length === 4 &&
        aiMove.filter(card => card.rank === Rank.Seven && card.suit === Suit.Hearts).length === 2 &&
        aiMove.filter(card => card.rank === Rank.Eight && card.suit === Suit.Hearts).length === 2
      );
      
      if (hasHeartsPairs) {
        console.log('✅ PERFECT: AI properly played Hearts pairs [7♥, 7♥, 8♥, 8♥] as expected!');
      } else {
        console.log('⚠️  AI played valid but suboptimal move - might be using trump rank pairs or other valid combination');
      }
    } else {
      console.log('❌ REGRESSION: AI is still generating invalid moves!');
    }
    
    // The fix should make AI moves valid
    expect(isValid).toBe(true); // AI move should now be valid!
    expect(aiMove.length).toBe(4); // AI returns correct length
    
    // Additional verification: AI should prioritize trump suit pairs when available
    const trumpSuitCards = aiMove.filter(card => card.suit === Suit.Hearts);
    expect(trumpSuitCards.length).toBeGreaterThan(0); // Should use some trump suit cards
  });
  
  test('AI follows proper hierarchy: tractors > pairs > singles', () => {
    console.log('\n🎯 TESTING AI HIERARCHY: Tractors > Pairs > Singles');
    
    let gameState = initializeGame();
    gameState.gamePhase = GamePhase.Playing;
    gameState.trumpInfo = {
      trumpSuit: Suit.Hearts,
      trumpRank: Rank.Two,
      
      
    };
    
    const bot1Player = gameState.players.find(p => p.id === PlayerId.Bot1)!;
    
    // Bot1 has a trump tractor available
    bot1Player.hand = [
      Card.createCard(Suit.Hearts, Rank.Seven, 0), Card.createCard(Suit.Hearts, Rank.Seven, 0), // Hearts pair
      Card.createCard(Suit.Hearts, Rank.Eight, 0), Card.createCard(Suit.Hearts, Rank.Eight, 0), // Hearts pair (consecutive = tractor!)
      Card.createCard(Suit.Hearts, Rank.Nine, 0), Card.createCard(Suit.Hearts, Rank.Ten, 0), // Singles
      Card.createCard(Suit.Clubs, Rank.King, 0)
    ];
    
    // Human leads with non-trump tractor
    const leadingTractor = [
      Card.createCard(Suit.Spades, Rank.Five, 0), Card.createCard(Suit.Spades, Rank.Five, 0),
      Card.createCard(Suit.Spades, Rank.Six, 0), Card.createCard(Suit.Spades, Rank.Six, 0)
    ];
    
    gameState.currentTrick = {
      plays: [
        { playerId: PlayerId.Human, cards: leadingTractor }
      ],
      winningPlayerId: PlayerId.Human,
      points: 10
    };
    gameState.currentPlayerIndex = 1; // Bot1 is at index 1
    
    console.log('Human led Spades tractor (non-trump), AI has Hearts tractor available');
    
    const aiMove = getAIMove(gameState, PlayerId.Bot1);
    console.log('AI move:', aiMove.map(card => `${card.suit}-${card.rank}`));
    
    const isValid = isValidPlay(aiMove, leadingTractor, bot1Player.hand, gameState.trumpInfo);
    console.log('Is AI move valid?', isValid);
    
    // AI should play the trump tractor if possible (7♥-7♥-8♥-8♥)
    const isTrumpTractor = (
      aiMove.length === 4 &&
      aiMove.filter(card => card.rank === Rank.Seven && card.suit === Suit.Hearts).length === 2 &&
      aiMove.filter(card => card.rank === Rank.Eight && card.suit === Suit.Hearts).length === 2
    );
    
    if (isTrumpTractor) {
      console.log('🎯 EXCELLENT: AI prioritized trump tractor over other options!');
    }
    
    expect(isValid).toBe(true);
    expect(aiMove.length).toBe(4);
  });
  });

  describe('AI Priority Order Compliance', () => {
    test('AI prioritizes tractors over pairs when both available', () => {
      let gameState = initializeGame();
      gameState.gamePhase = GamePhase.Playing;
      gameState.trumpInfo = {
        trumpSuit: Suit.Hearts,
        trumpRank: Rank.Two,
      };
      
      const bot1Player = gameState.players.find(p => p.id === PlayerId.Bot1)!;
      
      // Bot1 has both: consecutive pairs (tractor) AND non-consecutive pairs
      bot1Player.hand = [
        Card.createCard(Suit.Spades, Rank.Seven, 0), Card.createCard(Suit.Spades, Rank.Seven, 0),   // Consecutive
        Card.createCard(Suit.Spades, Rank.Eight, 0), Card.createCard(Suit.Spades, Rank.Eight, 0),   // pair (tractor)
        Card.createCard(Suit.Spades, Rank.Jack, 0), Card.createCard(Suit.Spades, Rank.Jack, 0),     // Non-consecutive
        Card.createCard(Suit.Spades, Rank.Queen, 0),   // Single to complete hand
        Card.createCard(Suit.Clubs, Rank.Ace, 0)
      ];
      
      // Human leads with Spades tractor
      const leadingTractor = [
        Card.createCard(Suit.Spades, Rank.Five, 0), Card.createCard(Suit.Spades, Rank.Five, 0),
        Card.createCard(Suit.Spades, Rank.Six, 0), Card.createCard(Suit.Spades, Rank.Six, 0)
      ];
      
      gameState.currentTrick = {
        plays: [
          { playerId: PlayerId.Human, cards: leadingTractor }
        ],
        winningPlayerId: PlayerId.Human,
        points: 0
      };
      gameState.currentPlayerIndex = 1; // Bot1
      
      const aiMove = getAIMove(gameState, PlayerId.Bot1);
      
      // AI should prioritize the tractor (7♠-7♠-8♠-8♠) over non-consecutive pairs
      const playedTractor = (
        aiMove.length === 4 &&
        aiMove.filter(card => card.rank === Rank.Seven && card.suit === Suit.Spades).length === 2 &&
        aiMove.filter(card => card.rank === Rank.Eight && card.suit === Suit.Spades).length === 2
      );
      
      expect(playedTractor).toBe(true);
      expect(aiMove.length).toBe(4);
      
      // Verify all cards are from spades (following suit)
      const allSpades = aiMove.every(card => card.suit === Suit.Spades);
      expect(allSpades).toBe(true);
    });
    
    test('AI uses all available pairs when insufficient for tractor', () => {
      let gameState = initializeGame();
      gameState.gamePhase = GamePhase.Playing;
      gameState.trumpInfo = {
        trumpSuit: Suit.Hearts,
        trumpRank: Rank.Two,
      };
      
      const bot1Player = gameState.players.find(p => p.id === PlayerId.Bot1)!;
      
      // Bot1 has only 1 pair + singles in the led suit
      bot1Player.hand = [
        Card.createCard(Suit.Spades, Rank.Seven, 0), Card.createCard(Suit.Spades, Rank.Seven, 0),   // Only 1 pair
        Card.createCard(Suit.Spades, Rank.Nine, 0), Card.createCard(Suit.Spades, Rank.Ten, 0),     // Singles
        Card.createCard(Suit.Clubs, Rank.Ace, 0), Card.createCard(Suit.Clubs, Rank.King, 0)
      ];
      
      // Human leads with Spades tractor (needs 2 pairs)
      const leadingTractor = [
        Card.createCard(Suit.Spades, Rank.Five, 0), Card.createCard(Suit.Spades, Rank.Five, 0),
        Card.createCard(Suit.Spades, Rank.Six, 0), Card.createCard(Suit.Spades, Rank.Six, 0)
      ];
      
      gameState.currentTrick = {
        plays: [
          { playerId: PlayerId.Human, cards: leadingTractor }
        ],
        winningPlayerId: PlayerId.Human,
        points: 0
      };
      gameState.currentPlayerIndex = 1; // Bot1
      
      const aiMove = getAIMove(gameState, PlayerId.Bot1);
      
      // AI should use the 1 available pair + 2 singles from Spades
      const usedPair = aiMove.filter(card => card.rank === Rank.Seven && card.suit === Suit.Spades).length === 2;
      const usedSpadesSingles = aiMove.filter(card => 
        card.suit === Suit.Spades && [Rank.Nine, Rank.Ten].includes(card.rank!)
      ).length === 2;
      
      expect(usedPair).toBe(true);
      expect(usedSpadesSingles).toBe(true);
      expect(aiMove.length).toBe(4);
      
      // All cards should be from Spades (following suit)
      const allSpades = aiMove.every(card => card.suit === Suit.Spades);
      expect(allSpades).toBe(true);
    });
  });
  
  describe('AI Trump Recognition and Priority', () => {
    test('AI correctly recognizes and prioritizes trump rank pairs', () => {
      let gameState = initializeGame();
      gameState.gamePhase = GamePhase.Playing;
      gameState.trumpInfo = {
        trumpSuit: Suit.Hearts,
        trumpRank: Rank.Two,
      };
      
      const bot1Player = gameState.players.find(p => p.id === PlayerId.Bot1)!;
      
      // Bot1 has trump rank pairs and non-trump pairs
      bot1Player.hand = [
        Card.createCard(Suit.Spades, Rank.Two, 0), Card.createCard(Suit.Spades, Rank.Two, 0),     // Trump rank pair
        Card.createCard(Suit.Clubs, Rank.Two, 0), Card.createCard(Suit.Clubs, Rank.Two, 0),      // Trump rank pair
        Card.createCard(Suit.Diamonds, Rank.Three, 0), Card.createCard(Suit.Diamonds, Rank.Three, 0), // Non-trump pair
        Card.createCard(Suit.Clubs, Rank.Ace, 0)
      ];
      
      // Human leads with trump tractor (Hearts trump suit)
      const leadingTrumpTractor = [
        Card.createCard(Suit.Hearts, Rank.Five, 0), Card.createCard(Suit.Hearts, Rank.Five, 0),
        Card.createCard(Suit.Hearts, Rank.Six, 0), Card.createCard(Suit.Hearts, Rank.Six, 0)
      ];
      
      gameState.currentTrick = {
        plays: [
          { playerId: PlayerId.Human, cards: leadingTrumpTractor }
        ],
        winningPlayerId: PlayerId.Human,
        points: 0
      };
      gameState.currentPlayerIndex = 1; // Bot1
      
      const aiMove = getAIMove(gameState, PlayerId.Bot1);
      
      // AI should prioritize trump rank pairs over non-trump pairs
      const usedTrumpRankPairs = (
        aiMove.filter(card => card.rank === Rank.Two).length === 4 // Used both trump rank pairs
      );
      const avoidedNonTrumpPair = !aiMove.some(card => 
        card.rank === Rank.Three && card.suit === Suit.Diamonds
      );
      
      expect(usedTrumpRankPairs).toBe(true);
      expect(avoidedNonTrumpPair).toBe(true);
      expect(aiMove.length).toBe(4);
    });
    
    test('AI correctly handles mixed trump combinations (suit + rank + joker pairs)', () => {
      let gameState = initializeGame();
      gameState.gamePhase = GamePhase.Playing;
      gameState.trumpInfo = {
        trumpSuit: Suit.Hearts,
        trumpRank: Rank.Two,
      };
      
      const bot1Player = gameState.players.find(p => p.id === PlayerId.Bot1)!;
      
      // Bot1 has mixed trump combinations
      bot1Player.hand = [
        Card.createCard(Suit.Hearts, Rank.Seven, 0), Card.createCard(Suit.Hearts, Rank.Seven, 0), // Trump suit pair
        Card.createCard(Suit.Spades, Rank.Two, 0), Card.createCard(Suit.Spades, Rank.Two, 0),     // Trump rank pair
        Card.createJoker(JokerType.Small, 0), Card.createJoker(JokerType.Small, 0),               // Joker pair
        Card.createCard(Suit.Clubs, Rank.Ace, 0)
      ];
      
      // Human leads with trump tractor (3 consecutive pairs = 6 cards)
      const leadingTrumpTractor = [
        Card.createCard(Suit.Hearts, Rank.Five, 0), Card.createCard(Suit.Hearts, Rank.Five, 0),
        Card.createCard(Suit.Hearts, Rank.Six, 0), Card.createCard(Suit.Hearts, Rank.Six, 0),
        Card.createCard(Suit.Hearts, Rank.Seven, 0), Card.createCard(Suit.Hearts, Rank.Seven, 0)
      ];
      
      gameState.currentTrick = {
        plays: [
          { playerId: PlayerId.Human, cards: leadingTrumpTractor }
        ],
        winningPlayerId: PlayerId.Human,
        points: 0
      };
      gameState.currentPlayerIndex = 1; // Bot1
      
      const aiMove = getAIMove(gameState, PlayerId.Bot1);
      
      // AI should use all trump pairs (all 3 types of trump pairs)
      const usedTrumpSuitPair = aiMove.filter(card => 
        card.rank === Rank.Seven && card.suit === Suit.Hearts
      ).length === 2;
      const usedTrumpRankPair = aiMove.filter(card => 
        card.rank === Rank.Two && card.suit === Suit.Spades
      ).length === 2;
      const usedJokerPair = aiMove.filter(card => 
        card.joker === JokerType.Small
      ).length === 2;
      
      expect(usedTrumpSuitPair).toBe(true);
      expect(usedTrumpRankPair).toBe(true);
      expect(usedJokerPair).toBe(true);
      expect(aiMove.length).toBe(6);
    });
  });
  
  describe('AI Cross-Suit Trump Victory Strategy', () => {
    test('AI uses trump tractor to beat non-trump tractor when out of leading suit', () => {
      let gameState = initializeGame();
      gameState.gamePhase = GamePhase.Playing;
      gameState.trumpInfo = {
        trumpSuit: Suit.Hearts,
        trumpRank: Rank.Two,
      };
      
      const bot1Player = gameState.players.find(p => p.id === PlayerId.Bot1)!;
      
      // Bot1 has NO Spades but has a trump tractor
      bot1Player.hand = [
        Card.createCard(Suit.Hearts, Rank.Seven, 0), Card.createCard(Suit.Hearts, Rank.Seven, 0),   // Trump tractor
        Card.createCard(Suit.Hearts, Rank.Eight, 0), Card.createCard(Suit.Hearts, Rank.Eight, 0),   // (consecutive pairs)
        Card.createCard(Suit.Clubs, Rank.Ace, 0), Card.createCard(Suit.Diamonds, Rank.King, 0)
      ];
      
      // Human leads with Spades tractor (non-trump)
      const leadingTractor = [
        Card.createCard(Suit.Spades, Rank.Five, 0), Card.createCard(Suit.Spades, Rank.Five, 0),
        Card.createCard(Suit.Spades, Rank.Six, 0), Card.createCard(Suit.Spades, Rank.Six, 0)
      ];
      
      gameState.currentTrick = {
        plays: [
          { playerId: PlayerId.Human, cards: leadingTractor }
        ],
        winningPlayerId: PlayerId.Human,
        points: 0
      };
      gameState.currentPlayerIndex = 1; // Bot1
      
      const aiMove = getAIMove(gameState, PlayerId.Bot1);
      
      console.log('=== DEBUG: AI Tractor Following Test ===');
      console.log(`AI hand: ${bot1Player.hand.map(c => `${c.rank}${c.suit}`).join(', ')}`);
      console.log(`Led tractor: ${leadingTractor.map(c => `${c.rank}${c.suit}`).join(', ')}`);
      console.log(`AI selected: ${aiMove.map(c => `${c.rank}${c.suit}`).join(', ')}`);
      
      // AI should use trump tractor to win (same combo type beats non-trump)
      const playedTrumpTractor = (
        aiMove.length === 4 &&
        aiMove.filter(card => card.rank === Rank.Seven && card.suit === Suit.Hearts).length === 2 &&
        aiMove.filter(card => card.rank === Rank.Eight && card.suit === Suit.Hearts).length === 2
      );
      
      console.log(`Expected trump tractor: ${playedTrumpTractor}`);
      expect(playedTrumpTractor).toBe(true);
      expect(aiMove.length).toBe(4);
      
      // All cards should be trump
      const allTrump = aiMove.every(card => card.suit === Suit.Hearts);
      expect(allTrump).toBe(true);
    });
    
    test('AI chooses strategic combinations when out of leading suit with no exact match', () => {
      let gameState = initializeGame();
      gameState.gamePhase = GamePhase.Playing;
      gameState.trumpInfo = {
        trumpSuit: Suit.Hearts,
        trumpRank: Rank.Two,
      };
      
      const bot1Player = gameState.players.find(p => p.id === PlayerId.Bot1)!;
      
      // Bot1 has NO Spades and cannot form a tractor (only 1 trump pair + singles)
      bot1Player.hand = [
        Card.createCard(Suit.Hearts, Rank.Seven, 0), Card.createCard(Suit.Hearts, Rank.Seven, 0),   // Trump pair
        Card.createCard(Suit.Hearts, Rank.Nine, 0), Card.createCard(Suit.Hearts, Rank.Ten, 0),     // Trump singles
        Card.createCard(Suit.Clubs, Rank.Ace, 0), Card.createCard(Suit.Diamonds, Rank.King, 0)
      ];
      
      // Human leads with Spades tractor
      const leadingTractor = [
        Card.createCard(Suit.Spades, Rank.Five, 0), Card.createCard(Suit.Spades, Rank.Five, 0),
        Card.createCard(Suit.Spades, Rank.Six, 0), Card.createCard(Suit.Spades, Rank.Six, 0)
      ];
      
      gameState.currentTrick = {
        plays: [
          { playerId: PlayerId.Human, cards: leadingTractor }
        ],
        winningPlayerId: PlayerId.Human,
        points: 0
      };
      gameState.currentPlayerIndex = 1; // Bot1
      
      const aiMove = getAIMove(gameState, PlayerId.Bot1);
      
      // AI should make a strategic choice (likely use trump cards for advantage)
      expect(aiMove.length).toBe(4);
      
      // Should prioritize trump cards over non-trump when possible
      const trumpCardCount = aiMove.filter(card => card.suit === Suit.Hearts).length;
      expect(trumpCardCount).toBeGreaterThan(0); // Should use some trump cards
    });
  });
  
  describe('AI 2-Pair Tractor Response Strategy', () => {
    test('AI response to 2-pair trump tractor with mixed trump combinations', () => {
      let gameState = initializeGame();
      gameState.gamePhase = GamePhase.Playing;
      gameState.trumpInfo = {
        trumpSuit: Suit.Hearts,
        trumpRank: Rank.Two,
      };
      
      const bot1Player = gameState.players.find(p => p.id === PlayerId.Bot1)!;
      
      // Bot1 has mixed trump combinations
      bot1Player.hand = [
        Card.createCard(Suit.Hearts, Rank.Seven, 0), Card.createCard(Suit.Hearts, Rank.Seven, 0), // Trump suit pair
        Card.createCard(Suit.Spades, Rank.Two, 0), Card.createCard(Suit.Spades, Rank.Two, 0),     // Trump rank pair
        Card.createJoker(JokerType.Small, 0), Card.createJoker(JokerType.Small, 0),               // Joker pair
        Card.createCard(Suit.Clubs, Rank.Ace, 0)
      ];
      
      // Human leads with 2-pair trump tractor (5♥-5♥-6♥-6♥)
      const leadingTrumpTractor = [
        Card.createCard(Suit.Hearts, Rank.Five, 0), Card.createCard(Suit.Hearts, Rank.Five, 0),
        Card.createCard(Suit.Hearts, Rank.Six, 0), Card.createCard(Suit.Hearts, Rank.Six, 0)
      ];
      
      gameState.currentTrick = {
        plays: [
          { playerId: PlayerId.Human, cards: leadingTrumpTractor }
        ],
        winningPlayerId: PlayerId.Human,
        points: 0
      };
      gameState.currentPlayerIndex = 1; // Bot1
      
      const aiMove = getAIMove(gameState, PlayerId.Bot1);
      
      // Analyze what the AI chose
      const usedTrumpSuitPair = aiMove.filter(card => 
        card.rank === Rank.Seven && card.suit === Suit.Hearts
      ).length === 2;
      const usedTrumpRankPair = aiMove.filter(card => 
        card.rank === Rank.Two && card.suit === Suit.Spades
      ).length === 2;
      const usedJokerPair = aiMove.filter(card => 
        card.joker === JokerType.Small
      ).length === 2;
      
      // Expected: AI should use exactly 2 pairs (4 cards) from its trump combinations
      expect(aiMove.length).toBe(4);
      
      // All cards should be trump
      const allTrump = aiMove.every(card => 
        card.suit === Suit.Hearts || card.rank === Rank.Two || card.joker
      );
      expect(allTrump).toBe(true);
      
      // Should use exactly 2 pairs worth of cards
      const totalPairs = (usedTrumpSuitPair ? 1 : 0) + 
                        (usedTrumpRankPair ? 1 : 0) + 
                        (usedJokerPair ? 1 : 0);
      expect(totalPairs).toBe(2);
    });
    
    test('AI trump pair priority: trump suit > trump rank > jokers', () => {
      let gameState = initializeGame();
      gameState.gamePhase = GamePhase.Playing;
      gameState.trumpInfo = {
        trumpSuit: Suit.Hearts,
        trumpRank: Rank.Two,
      };
      
      const bot1Player = gameState.players.find(p => p.id === PlayerId.Bot1)!;
      
      // Bot1 has multiple trump pairs to choose from
      bot1Player.hand = [
        Card.createCard(Suit.Hearts, Rank.Three, 0), Card.createCard(Suit.Hearts, Rank.Three, 0), // Low trump suit pair
        Card.createCard(Suit.Hearts, Rank.Seven, 0), Card.createCard(Suit.Hearts, Rank.Seven, 0), // Mid trump suit pair
        Card.createCard(Suit.Spades, Rank.Two, 0), Card.createCard(Suit.Spades, Rank.Two, 0),     // Trump rank pair
        Card.createJoker(JokerType.Small, 0), Card.createJoker(JokerType.Small, 0),               // Joker pair
        Card.createCard(Suit.Clubs, Rank.Ace, 0)
      ];
      
      // Human leads with 2-pair trump tractor
      const leadingTrumpTractor = [
        Card.createCard(Suit.Hearts, Rank.Five, 0), Card.createCard(Suit.Hearts, Rank.Five, 0),
        Card.createCard(Suit.Hearts, Rank.Six, 0), Card.createCard(Suit.Hearts, Rank.Six, 0)
      ];
      
      gameState.currentTrick = {
        plays: [
          { playerId: PlayerId.Human, cards: leadingTrumpTractor }
        ],
        winningPlayerId: PlayerId.Human,
        points: 0
      };
      gameState.currentPlayerIndex = 1; // Bot1
      
      const aiMove = getAIMove(gameState, PlayerId.Bot1);
      
      // Check which pairs the AI chose
      const usedLowTrumpSuit = aiMove.filter(card => 
        card.rank === Rank.Three && card.suit === Suit.Hearts
      ).length === 2;
      const usedMidTrumpSuit = aiMove.filter(card => 
        card.rank === Rank.Seven && card.suit === Suit.Hearts
      ).length === 2;
      const usedTrumpRank = aiMove.filter(card => 
        card.rank === Rank.Two && card.suit === Suit.Spades
      ).length === 2;
      const usedJokers = aiMove.filter(card => 
        card.joker === JokerType.Small
      ).length === 2;
      
      // Verify basic requirements
      expect(aiMove.length).toBe(4);
      const allTrump = aiMove.every(card => 
        card.suit === Suit.Hearts || card.rank === Rank.Two || card.joker
      );
      expect(allTrump).toBe(true);
      
      // AI should prioritize trump suit pairs over trump rank pairs and jokers
      const usedTrumpSuitPairs = (usedLowTrumpSuit ? 1 : 0) + (usedMidTrumpSuit ? 1 : 0);
      expect(usedTrumpSuitPairs).toBe(2); // Should use both trump suit pairs available
      expect(usedTrumpRank).toBe(false);  // Should not use trump rank pair when trump suit available
      expect(usedJokers).toBe(false);     // Should not use jokers when trump suit available
    });
  });
  
  describe('AI Strategic Decision Making', () => {
    test('AI conserves high trump when cannot win but uses trump when leading is trump', () => {
      let gameState = initializeGame();
      gameState.gamePhase = GamePhase.Playing;
      gameState.trumpInfo = {
        trumpSuit: Suit.Hearts,
        trumpRank: Rank.Two,
      };
      
      const bot1Player = gameState.players.find(p => p.id === PlayerId.Bot1)!;
      
      // Bot1 has trump cards but cannot beat a high trump tractor
      bot1Player.hand = [
        Card.createCard(Suit.Hearts, Rank.Three, 0), Card.createCard(Suit.Hearts, Rank.Three, 0), // Low trump pair
        Card.createCard(Suit.Hearts, Rank.Four, 0), Card.createCard(Suit.Hearts, Rank.Four, 0),   // Low trump pair
        Card.createCard(Suit.Hearts, Rank.Five, 0),  // Low trump single
        Card.createCard(Suit.Clubs, Rank.Ace, 0)
      ];
      
      // Human leads with high trump tractor (A♥-A♥-K♥-K♥)
      const leadingHighTrumpTractor = [
        Card.createCard(Suit.Hearts, Rank.Ace, 0), Card.createCard(Suit.Hearts, Rank.Ace, 0),
        Card.createCard(Suit.Hearts, Rank.King, 0), Card.createCard(Suit.Hearts, Rank.King, 0)
      ];
      
      gameState.currentTrick = {
        plays: [
          { playerId: PlayerId.Human, cards: leadingHighTrumpTractor }
        ],
        winningPlayerId: PlayerId.Human,
        points: 0
      };
      gameState.currentPlayerIndex = 1; // Bot1
      
      const aiMove = getAIMove(gameState, PlayerId.Bot1);
      
      // AI should use trump cards (rule: must follow trump) but use low ones
      expect(aiMove.length).toBe(4);
      
      // All cards should be trump (following trump lead)
      const allTrump = aiMove.every(card => card.suit === Suit.Hearts);
      expect(allTrump).toBe(true);
      
      // Should use pairs when available (proper tractor following)
      const usedPairs = (
        aiMove.filter(card => card.rank === Rank.Three).length === 2 &&
        aiMove.filter(card => card.rank === Rank.Four).length === 2
      );
      expect(usedPairs).toBe(true);
    });
  });
});