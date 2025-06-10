import { getAIMove } from '../../src/ai/aiLogic';
import { Card, GamePhase, JokerType, PlayerId, Rank, Suit } from '../../src/types';
import { initializeGame } from '../../src/utils/gameInitialization';

/**
 * Test case for GitHub Issue #176: AI doesn't use all pairs from trump group when following a trump tractor
 * 
 * Issue: When AI player can't form tractor in the trump group, it should dispose all the pairs 
 * from trump group including joker pairs and rank pairs as well as any trump suit pairs. 
 * And of course start from weakest.
 */
describe('Issue #176: AI Trump Pair Disposal Bug', () => {
  it('should use all available trump pairs when following trump tractor and cannot form tractor', () => {
    console.log('\n🐛 TESTING ISSUE #176: AI Trump Pair Disposal Bug');
    
    const gameState = initializeGame();
    gameState.gamePhase = GamePhase.Playing;
    gameState.trumpInfo = {
      trumpSuit: Suit.Hearts,
      trumpRank: Rank.Two,
    };

    const bot1Player = gameState.players.find(p => p.id === PlayerId.Bot1)!;
    
    // Bot1 has multiple trump pairs but cannot form a tractor
    // Should use ALL trump pairs starting from weakest when following trump tractor
    bot1Player.hand = [
      // Trump suit pairs (weakest)
      Card.createCard(Suit.Hearts, Rank.Three, 0),
      Card.createCard(Suit.Hearts, Rank.Three, 0),
      Card.createCard(Suit.Hearts, Rank.Five, 0),
      Card.createCard(Suit.Hearts, Rank.Five, 0),
      
      // Trump rank pairs (medium strength)
      Card.createCard(Suit.Spades, Rank.Two, 0),
      Card.createCard(Suit.Spades, Rank.Two, 0),
      
      // Joker pairs (strongest)
      Card.createJoker(JokerType.Small, 0),
      Card.createJoker(JokerType.Small, 0),
      
      // Non-trump card
      Card.createCard(Suit.Clubs, Rank.Ace, 0),
    ];

    // Human leads with a trump tractor requiring 4 cards (2 pairs)
    const leadingTrumpTractor = [
      Card.createCard(Suit.Hearts, Rank.Nine, 0),
      Card.createCard(Suit.Hearts, Rank.Nine, 0),
      Card.createCard(Suit.Hearts, Rank.Ten, 0),
      Card.createCard(Suit.Hearts, Rank.Ten, 0),
    ];

    gameState.currentTrick = {
      plays: [
        { playerId: PlayerId.Human, cards: leadingTrumpTractor }
      ],
      winningPlayerId: PlayerId.Human,
      points: 20
    };
    gameState.currentPlayerIndex = 1; // Bot1 is at index 1

    console.log('Human led trump tractor: 9♥-9♥-10♥-10♥ (4 cards, 2 pairs)');
    console.log('Bot1 trump pairs available:');
    console.log('  - 3♥-3♥ (trump suit pair, weakest)');
    console.log('  - 5♥-5♥ (trump suit pair with points)');
    console.log('  - 2♠-2♠ (trump rank pair)');
    console.log('  - SJ-SJ (small joker pair)');
    console.log('Bot1 cannot form a trump tractor but has 4 trump pairs (8 cards)');

    const aiMove = getAIMove(gameState, PlayerId.Bot1);
    console.log('AI selected:', aiMove.map(card => 
      card.joker ? `${card.joker}Joker` : `${card.rank}${card.suit}`
    ).join(', '));

    // Verify AI played exactly 4 cards (matching tractor length)
    expect(aiMove.length).toBe(4);

    // Verify all played cards are trump cards
    const allTrump = aiMove.every(card => 
      card.suit === Suit.Hearts || // Trump suit
      card.rank === Rank.Two ||    // Trump rank
      card.joker                   // Jokers
    );
    expect(allTrump).toBe(true);

    // Check which pairs were used
    const used3Hearts = aiMove.filter(card => 
      card.rank === Rank.Three && card.suit === Suit.Hearts
    ).length;
    const used5Hearts = aiMove.filter(card => 
      card.rank === Rank.Five && card.suit === Suit.Hearts
    ).length;
    const used2Spades = aiMove.filter(card => 
      card.rank === Rank.Two && card.suit === Suit.Spades
    ).length;
    const usedSmallJokers = aiMove.filter(card => 
      card.joker === JokerType.Small
    ).length;

    console.log('Pairs used in AI move:');
    console.log(`  - 3♥ cards: ${used3Hearts}/2`);
    console.log(`  - 5♥ cards: ${used5Hearts}/2`);
    console.log(`  - 2♠ cards: ${used2Spades}/2`);
    console.log(`  - Small Jokers: ${usedSmallJokers}/2`);

    // Count complete pairs used (each pair = 2 cards)
    const completePairsUsed = Math.floor(used3Hearts / 2) + 
                             Math.floor(used5Hearts / 2) + 
                             Math.floor(used2Spades / 2) + 
                             Math.floor(usedSmallJokers / 2);

    console.log(`Complete pairs used: ${completePairsUsed}/4 available`);

    // ✅ ISSUE #176 FIX REQUIREMENT:
    // AI should use EXACTLY 2 pairs (4 cards) starting from weakest trump pairs
    expect(completePairsUsed).toBe(2); // Should use exactly 2 pairs for 4-card tractor

    // ✅ PRIORITY ORDER: Should start from weakest trump pairs
    // The AI should prioritize: 3♥-3♥ (weakest) first, then choose next weakest
    expect(used3Hearts).toBe(2); // Should definitely use the weakest trump suit pair

    // The second pair should be the next weakest available
    // Expected priority: 3♥-3♥ > 5♥-5♥ > 2♠-2♠ > SJ-SJ
    const usedSecondWeakest = used5Hearts === 2; // Should use 5♥-5♥ as second choice
    expect(usedSecondWeakest).toBe(true);

    console.log('✅ AI correctly used weakest trump pairs in priority order');
  });

  it('should use all trump pairs when following trump tractor that requires 6 cards', () => {
    console.log('\n🎯 TESTING: 6-card trump tractor following with all trump pairs');
    
    const gameState = initializeGame();
    gameState.gamePhase = GamePhase.Playing;
    gameState.trumpInfo = {
      trumpSuit: Suit.Spades,
      trumpRank: Rank.Ace,
    };

    const bot2Player = gameState.players.find(p => p.id === PlayerId.Bot2)!;
    
    // Bot2 has exactly 3 trump pairs (6 cards) but they're not consecutive (no tractor)
    bot2Player.hand = [
      // Trump suit pairs
      Card.createCard(Suit.Spades, Rank.Three, 0),
      Card.createCard(Suit.Spades, Rank.Three, 0),
      Card.createCard(Suit.Spades, Rank.Seven, 0),
      Card.createCard(Suit.Spades, Rank.Seven, 0),
      
      // Trump rank pair
      Card.createCard(Suit.Hearts, Rank.Ace, 0),
      Card.createCard(Suit.Hearts, Rank.Ace, 0),
      
      // Non-trump filler
      Card.createCard(Suit.Clubs, Rank.King, 0),
    ];

    // Human leads with 3-pair trump tractor (6 cards)
    const leadingTrumpTractor = [
      Card.createCard(Suit.Spades, Rank.Nine, 0),
      Card.createCard(Suit.Spades, Rank.Nine, 0),
      Card.createCard(Suit.Spades, Rank.Ten, 0),
      Card.createCard(Suit.Spades, Rank.Ten, 0),
      Card.createCard(Suit.Spades, Rank.Jack, 0),
      Card.createCard(Suit.Spades, Rank.Jack, 0),
    ];

    gameState.currentTrick = {
      plays: [
        { playerId: PlayerId.Human, cards: leadingTrumpTractor }
      ],
      winningPlayerId: PlayerId.Human,
      points: 20
    };
    gameState.currentPlayerIndex = 2; // Bot2 is at index 2

    console.log('Human led trump tractor: 9♠-9♠-10♠-10♠-J♠-J♠ (6 cards, 3 pairs)');
    console.log('Bot2 has exactly 3 trump pairs but non-consecutive');

    const aiMove = getAIMove(gameState, PlayerId.Bot2);
    console.log('AI selected:', aiMove.map(card => 
      `${card.rank}${card.suit}`
    ).join(', '));

    // Verify AI played exactly 6 cards
    expect(aiMove.length).toBe(6);

    // Verify all played cards are trump cards
    const allTrump = aiMove.every(card => 
      card.suit === Suit.Spades || // Trump suit
      card.rank === Rank.Ace       // Trump rank
    );
    expect(allTrump).toBe(true);

    // Check if all 3 trump pairs were used
    const used3Spades = aiMove.filter(card => 
      card.rank === Rank.Three && card.suit === Suit.Spades
    ).length;
    const used7Spades = aiMove.filter(card => 
      card.rank === Rank.Seven && card.suit === Suit.Spades
    ).length;
    const usedAceHearts = aiMove.filter(card => 
      card.rank === Rank.Ace && card.suit === Suit.Hearts
    ).length;

    console.log(`Used 3♠: ${used3Spades}/2, 7♠: ${used7Spades}/2, A♥: ${usedAceHearts}/2`);

    // ✅ ISSUE #176 FIX: Should use ALL available trump pairs
    expect(used3Spades).toBe(2);
    expect(used7Spades).toBe(2);
    expect(usedAceHearts).toBe(2);

    console.log('✅ AI correctly used all 3 trump pairs when following 6-card trump tractor');
  });

  it('should prioritize trump pairs in conservation order when mixed types available', () => {
    console.log('\n🔄 TESTING: Trump pair conservation priority order');
    
    const gameState = initializeGame();
    gameState.gamePhase = GamePhase.Playing;
    gameState.trumpInfo = {
      trumpSuit: Suit.Diamonds,
      trumpRank: Rank.Two,
    };

    const bot3Player = gameState.players.find(p => p.id === PlayerId.Bot3)!;
    
    // Bot3 has multiple trump pair types with clear conservation hierarchy
    bot3Player.hand = [
      // Weakest: Low trump suit pairs
      Card.createCard(Suit.Diamonds, Rank.Three, 0),
      Card.createCard(Suit.Diamonds, Rank.Three, 0),
      Card.createCard(Suit.Diamonds, Rank.Four, 0),
      Card.createCard(Suit.Diamonds, Rank.Four, 0),
      
      // Medium: Trump rank pairs in off-suits  
      Card.createCard(Suit.Hearts, Rank.Two, 0),
      Card.createCard(Suit.Hearts, Rank.Two, 0),
      
      // Strongest: Joker pairs
      Card.createJoker(JokerType.Big, 0),
      Card.createJoker(JokerType.Big, 0),
    ];

    // Human leads with 2-pair trump tractor
    const leadingTrumpTractor = [
      Card.createCard(Suit.Diamonds, Rank.King, 0),
      Card.createCard(Suit.Diamonds, Rank.King, 0),
      Card.createCard(Suit.Diamonds, Rank.Ace, 0),
      Card.createCard(Suit.Diamonds, Rank.Ace, 0),
    ];

    gameState.currentTrick = {
      plays: [
        { playerId: PlayerId.Human, cards: leadingTrumpTractor }
      ],
      winningPlayerId: PlayerId.Human,
      points: 20
    };
    gameState.currentPlayerIndex = 3; // Bot3 is at index 3

    console.log('Human led trump tractor: K♦-K♦-A♦-A♦ (4 cards, 2 pairs)');
    console.log('Bot3 conservation hierarchy: 3♦-3♦ < 4♦-4♦ < 2♥-2♥ < BJ-BJ');

    const aiMove = getAIMove(gameState, PlayerId.Bot3);
    console.log('AI selected:', aiMove.map(card => 
      card.joker ? `${card.joker}Joker` : `${card.rank}${card.suit}`
    ).join(', '));

    // Verify AI played exactly 4 cards
    expect(aiMove.length).toBe(4);

    // Check conservation priority order
    const used3Diamonds = aiMove.filter(card => 
      card.rank === Rank.Three && card.suit === Suit.Diamonds
    ).length;
    const used4Diamonds = aiMove.filter(card => 
      card.rank === Rank.Four && card.suit === Suit.Diamonds
    ).length;
    const used2Hearts = aiMove.filter(card => 
      card.rank === Rank.Two && card.suit === Suit.Hearts
    ).length;
    const usedBigJokers = aiMove.filter(card => 
      card.joker === JokerType.Big
    ).length;

    console.log('Conservation choices:');
    console.log(`  - 3♦ (weakest): ${used3Diamonds}/2`);
    console.log(`  - 4♦: ${used4Diamonds}/2`);
    console.log(`  - 2♥: ${used2Hearts}/2`);
    console.log(`  - BJ (strongest): ${usedBigJokers}/2`);

    // ✅ ISSUE #176 FIX: Should prioritize weakest pairs first
    // Expected: Use 3♦-3♦ and 4♦-4♦ (two weakest trump suit pairs)
    expect(used3Diamonds).toBe(2); // Must use weakest
    expect(used4Diamonds).toBe(2); // Must use second weakest
    expect(used2Hearts).toBe(0);   // Should NOT use trump rank pairs when trump suit available
    expect(usedBigJokers).toBe(0); // Should NOT use strongest pairs

    console.log('✅ AI correctly prioritized weakest trump suit pairs over stronger options');
  });

  it('should use all trump pairs before any trump singles when insufficient pairs available', () => {
    console.log('\n⚠️  EDGE CASE: Trump pairs + singles when insufficient pairs for tractor');
    
    const gameState = initializeGame();
    gameState.gamePhase = GamePhase.Playing;
    gameState.trumpInfo = {
      trumpSuit: Suit.Spades,
      trumpRank: Rank.King,
    };

    const bot2Player = gameState.players.find(p => p.id === PlayerId.Bot2)!;
    
    // Bot2 has trump pairs but also some singles
    // This tests if AI correctly uses ALL pairs before ANY singles
    bot2Player.hand = [
      // Trump suit pairs (should be used first)
      Card.createCard(Suit.Spades, Rank.Three, 0),
      Card.createCard(Suit.Spades, Rank.Three, 0),
      Card.createCard(Suit.Spades, Rank.Four, 0),
      Card.createCard(Suit.Spades, Rank.Four, 0),
      
      // Trump suit singles (should be used to fill remaining slots)
      Card.createCard(Suit.Spades, Rank.Five, 0),
      Card.createCard(Suit.Spades, Rank.Six, 0),
      Card.createCard(Suit.Spades, Rank.Seven, 0),
      
      // Trump rank pairs (should be avoided if trump suit available)
      Card.createCard(Suit.Hearts, Rank.King, 0),
      Card.createCard(Suit.Hearts, Rank.King, 0),
      
      // Non-trump
      Card.createCard(Suit.Clubs, Rank.Ace, 0),
    ];

    // Human leads with 8-card trump tractor (4 pairs) - Bot2 needs 8 cards but only has 2 pairs
    const leadingTrumpTractor = [
      Card.createCard(Suit.Spades, Rank.Eight, 0),
      Card.createCard(Suit.Spades, Rank.Eight, 0),
      Card.createCard(Suit.Spades, Rank.Nine, 0),
      Card.createCard(Suit.Spades, Rank.Nine, 0),
      Card.createCard(Suit.Spades, Rank.Ten, 0),
      Card.createCard(Suit.Spades, Rank.Ten, 0),
      Card.createCard(Suit.Spades, Rank.Jack, 0),
      Card.createCard(Suit.Spades, Rank.Jack, 0),
    ];

    gameState.currentTrick = {
      plays: [
        { playerId: PlayerId.Human, cards: leadingTrumpTractor }
      ],
      winningPlayerId: PlayerId.Human,
      points: 20
    };
    gameState.currentPlayerIndex = 2; // Bot2 is at index 2

    console.log('Human led 8-card trump tractor: 8♠-8♠-9♠-9♠-10♠-10♠-J♠-J♠');
    console.log('Bot2 has 3 trump pairs + 3 trump singles (need 8 cards total)');
    console.log('Expected: ALL 3 trump pairs (3♠-3♠, 4♠-4♠, K♥-K♥) + 2 weakest singles (5♠, 6♠)');

    const aiMove = getAIMove(gameState, PlayerId.Bot2);
    console.log('AI selected:', aiMove.map(card => 
      `${card.rank}${card.suit}`
    ).join(', '));

    // Verify AI played exactly 8 cards
    expect(aiMove.length).toBe(8);

    // Verify all played cards are trump cards
    const allTrump = aiMove.every(card => 
      card.suit === Suit.Spades || // Trump suit
      card.rank === Rank.King      // Trump rank
    );
    expect(allTrump).toBe(true);

    // Count usage of trump suit cards
    const used3Spades = aiMove.filter(card => 
      card.rank === Rank.Three && card.suit === Suit.Spades
    ).length;
    const used4Spades = aiMove.filter(card => 
      card.rank === Rank.Four && card.suit === Suit.Spades
    ).length;
    const used5Spades = aiMove.filter(card => 
      card.rank === Rank.Five && card.suit === Suit.Spades
    ).length;
    const used6Spades = aiMove.filter(card => 
      card.rank === Rank.Six && card.suit === Suit.Spades
    ).length;
    const used7Spades = aiMove.filter(card => 
      card.rank === Rank.Seven && card.suit === Suit.Spades
    ).length;
    const usedKingHearts = aiMove.filter(card => 
      card.rank === Rank.King && card.suit === Suit.Hearts
    ).length;

    console.log('Trump usage analysis:');
    console.log(`  - 3♠ pair: ${used3Spades}/2 (must use all)`);
    console.log(`  - 4♠ pair: ${used4Spades}/2 (must use all)`);
    console.log(`  - K♥ pair: ${usedKingHearts}/2 (trump rank pair - must use all)`);
    console.log(`  - 5♠ single: ${used5Spades}/1`);
    console.log(`  - 6♠ single: ${used6Spades}/1`);
    console.log(`  - 7♠ single: ${used7Spades}/1`);

    // ✅ ISSUE #176 RULE: Must use ALL trump pairs before ANY trump singles
    expect(used3Spades).toBe(2); // Must use complete trump suit pair
    expect(used4Spades).toBe(2); // Must use complete trump suit pair  
    expect(usedKingHearts).toBe(2); // Must use complete trump rank pair
    
    // Should use 2 trump singles to complete 8 cards (3 pairs + 2 singles = 8)
    const totalSinglesUsed = used5Spades + used6Spades + used7Spades;
    expect(totalSinglesUsed).toBe(2); // Need 2 more cards after 3 pairs (6 cards)

    // Verify no singles from pairs were broken
    expect(used3Spades % 2).toBe(0); // Should not break 3♠ pair
    expect(used4Spades % 2).toBe(0); // Should not break 4♠ pair
    expect(usedKingHearts % 2).toBe(0); // Should not break K♥ pair

    console.log('✅ AI correctly used ALL trump pairs (suit + rank) before trump singles');
  });
});