import { getAIMove } from '../../src/ai/aiLogic';
import { initializeGame } from '../../src/game/gameLogic';
import { PlayerId, Rank, Suit, GamePhase, ComboType } from '../../src/types';
import type { GameState, Card } from '../../src/types';

describe('Issue #104 - AI Using Valuable Pairs Instead of Two Singles', () => {
  describe('AI Strategy When Following Pair and Out of Suit', () => {
    it('should play two small singles instead of valuable pair when out of suit', () => {
      // ISSUE #104 SCENARIO: 
      // - Opponent leads a pair
      // - AI is out of the led suit
      // - AI has valuable pairs available
      // - AI should prefer two small singles over valuable pairs

      const gameState = initializeGame();
      gameState.trumpInfo = {
        
        
        trumpRank: Rank.Two,
        trumpSuit: Suit.Hearts,
      };

      // AI Bot1 hand: Has valuable pair but is out of led suit
      const aiBotHand: Card[] = [
        { id: 'ace-clubs-1', rank: Rank.Ace, suit: Suit.Clubs, points: 0 }, // Valuable pair
        { id: 'ace-clubs-2', rank: Rank.Ace, suit: Suit.Clubs, points: 0 }, // Valuable pair
        { id: '3-diamonds', rank: Rank.Three, suit: Suit.Diamonds, points: 0 }, // Small single
        { id: '4-spades', rank: Rank.Four, suit: Suit.Spades, points: 0 }, // Small single
        { id: '6-clubs', rank: Rank.Six, suit: Suit.Clubs, points: 0 }, // Small single
        { id: '7-clubs', rank: Rank.Seven, suit: Suit.Clubs, points: 0 }, // Other card
      ];
      gameState.players[1].hand = aiBotHand;

      // Someone leads a pair in Hearts (AI is out of Hearts)
      const leadingCards: Card[] = [
        { id: '6-hearts-1', rank: Rank.Six, suit: Suit.Hearts, points: 0 },
        { id: '6-hearts-2', rank: Rank.Six, suit: Suit.Hearts, points: 0 },
      ];

      gameState.currentTrick = {
        leadingPlayerId: PlayerId.Human,
        leadingCombo: leadingCards,
        plays: [
          {
            playerId: PlayerId.Human,
            cards: leadingCards,
          },
        ],
        points: 0,
        winningPlayerId: PlayerId.Human,
      };

      gameState.currentPlayerIndex = 1; // Bot 1's turn
      gameState.gamePhase = GamePhase.Playing;

      const selectedCards = getAIMove(gameState, PlayerId.Bot1);

      console.log('=== ISSUE #104 TEST: Out of Suit Pair Following ===');
      console.log(`Led pair: ${leadingCards.map(c => `${c.rank}♥`).join(', ')}`);
      console.log(`AI hand:`, aiBotHand.map(c => `${c.rank}${c.suit}`));
      console.log(`AI selected: ${selectedCards.map(c => `${c.rank}${c.suit}`).join(', ')}`);

      // Verify AI behavior
      expect(selectedCards).toHaveLength(2);

      // Should NOT use the valuable Ace pair
      const usedAcePair = selectedCards.filter(c => c.rank === Rank.Ace).length === 2;
      expect(usedAcePair).toBe(false);

      // Should use two different small cards instead
      const usedSmallCards = selectedCards.every(c => 
        c.rank === Rank.Three || c.rank === Rank.Four || c.rank === Rank.Six || c.rank === Rank.Seven
      );
      expect(usedSmallCards).toBe(true);

      console.log('✅ CORRECT: AI preserved valuable Ace pair and used two small singles');
    });

    it('should use trump pair when opponent winning with points and can beat them', () => {
      // SCENARIO: When opponent is winning with points, AI should use strong pairs to beat them
      const gameState = initializeGame();
      gameState.trumpInfo = {
        
        
        trumpRank: Rank.Two,
        trumpSuit: Suit.Spades,
      };

      // AI has trump pair that can beat the trick
      const aiBotHand: Card[] = [
        { id: '2-spades-1', rank: Rank.Two, suit: Suit.Spades, points: 0 }, // Trump rank trump suit pair
        { id: '2-spades-2', rank: Rank.Two, suit: Suit.Spades, points: 0 }, // Trump rank trump suit pair
        { id: '3-clubs', rank: Rank.Three, suit: Suit.Clubs, points: 0 }, // Weak single
        { id: '4-clubs', rank: Rank.Four, suit: Suit.Clubs, points: 0 }, // Weak single
      ];
      gameState.players[2].hand = aiBotHand;

      // Opponent leads valuable pair
      const leadingCards: Card[] = [
        { id: 'king-hearts-1', rank: Rank.King, suit: Suit.Hearts, points: 10 },
        { id: 'king-hearts-2', rank: Rank.King, suit: Suit.Hearts, points: 10 },
      ];

      gameState.currentTrick = {
        leadingPlayerId: PlayerId.Bot1, // Opponent
        leadingCombo: leadingCards,
        plays: [
          {
            playerId: PlayerId.Bot1,
            cards: leadingCards,
          },
        ],
        points: 20, // High value trick
        winningPlayerId: PlayerId.Bot1,
      };

      gameState.currentPlayerIndex = 2; // Bot 2's turn
      gameState.gamePhase = GamePhase.Playing;

      const selectedCards = getAIMove(gameState, PlayerId.Bot2);

      console.log('=== ISSUE #104 TEST: Strategic Trump Pair Usage ===');
      console.log(`Opponent led: ${leadingCards.map(c => `${c.rank}♥`).join(', ')} (20 points)`);
      console.log(`AI selected: ${selectedCards.map(c => `${c.rank}${c.suit}`).join(', ')}`);

      // Should use trump pair to beat opponent and capture 20 points
      expect(selectedCards).toHaveLength(2);
      expect(selectedCards.every(c => c.rank === Rank.Two && c.suit === Suit.Spades)).toBe(true);

      console.log('✅ CORRECT: AI used trump pair to beat opponent and capture 20 points');
    });

    it('should prefer singles over pairs when teammate is winning', () => {
      // SCENARIO: When teammate is winning, conserve pairs for later
      const gameState = initializeGame();
      gameState.trumpInfo = {
        
        
        trumpRank: Rank.Two,
        trumpSuit: Suit.Diamonds,
      };

      // AI Bot3 hand with pairs and singles
      const aiBotHand: Card[] = [
        { id: 'king-clubs-1', rank: Rank.King, suit: Suit.Clubs, points: 10 }, // Valuable pair
        { id: 'king-clubs-2', rank: Rank.King, suit: Suit.Clubs, points: 10 }, // Valuable pair
        { id: '3-hearts', rank: Rank.Three, suit: Suit.Hearts, points: 0 }, // Small single
        { id: '4-hearts', rank: Rank.Four, suit: Suit.Hearts, points: 0 }, // Small single
      ];
      gameState.players[3].hand = aiBotHand;

      // Teammate Bot1 is winning with moderate cards (not "very strong")
      const leadingCards: Card[] = [
        { id: '5-spades-1', rank: Rank.Five, suit: Suit.Spades, points: 5 },
        { id: '5-spades-2', rank: Rank.Five, suit: Suit.Spades, points: 5 },
      ];

      gameState.currentTrick = {
        leadingPlayerId: PlayerId.Human,
        leadingCombo: leadingCards,
        plays: [
          {
            playerId: PlayerId.Human,
            cards: leadingCards,
          },
          {
            playerId: PlayerId.Bot1, // Teammate
            cards: [
              { id: 'queen-spades-1', rank: Rank.Queen, suit: Suit.Spades, points: 0 },
              { id: 'queen-spades-2', rank: Rank.Queen, suit: Suit.Spades, points: 0 },
            ]
          },
        ],
        points: 10,
        winningPlayerId: PlayerId.Bot1, // Teammate winning
      };

      gameState.currentPlayerIndex = 3; // Bot 3's turn (AI we're testing)
      gameState.gamePhase = GamePhase.Playing;

      const selectedCards = getAIMove(gameState, PlayerId.Bot3);

      console.log('=== ISSUE #104 TEST: Teammate Winning Conservation ===');
      console.log(`Teammate winning with: Q♠ Q♠`);
      console.log(`AI selected: ${selectedCards.map(c => `${c.rank}${c.suit}`).join(', ')}`);

      // Should NOT waste valuable King pair when teammate is winning
      expect(selectedCards).toHaveLength(2);
      const usedKingPair = selectedCards.filter(c => c.rank === Rank.King).length === 2;
      expect(usedKingPair).toBe(false);

      // Should use small singles instead
      const usedSmallCards = selectedCards.every(c => 
        c.rank === Rank.Three || c.rank === Rank.Four
      );
      expect(usedSmallCards).toBe(true);

      console.log('✅ CORRECT: AI conserved valuable King pair when teammate winning');
    });

    it('should conserve Ace pair when cannot beat opponent trick', () => {
      // SCENARIO: When opponent has unbeatable trick, don't waste valuable pairs
      const gameState = initializeGame();
      gameState.trumpInfo = {
        
        
        trumpRank: Rank.Two,
        trumpSuit: Suit.Hearts,
      };

      // AI has Ace pair but opponent has unbeatable trump pair
      const aiBotHand: Card[] = [
        { id: 'ace-spades-1', rank: Rank.Ace, suit: Suit.Spades, points: 0 }, // Valuable pair (can't beat trump)
        { id: 'ace-spades-2', rank: Rank.Ace, suit: Suit.Spades, points: 0 }, // Valuable pair (can't beat trump)
        { id: '6-clubs', rank: Rank.Six, suit: Suit.Clubs, points: 0 }, // Small single
        { id: '7-diamonds', rank: Rank.Seven, suit: Suit.Diamonds, points: 0 }, // Small single
      ];
      gameState.players[1].hand = aiBotHand;

      // Opponent leads unbeatable trump pair
      const leadingCards: Card[] = [
        { id: '2-hearts-1', rank: Rank.Two, suit: Suit.Hearts, points: 0 }, // Trump rank in trump suit
        { id: '2-hearts-2', rank: Rank.Two, suit: Suit.Hearts, points: 0 }, // Trump rank in trump suit
      ];

      gameState.currentTrick = {
        leadingPlayerId: PlayerId.Bot3, // Opponent
        leadingCombo: leadingCards,
        plays: [
          {
            playerId: PlayerId.Bot3,
            cards: leadingCards,
          },
        ],
        points: 0,
        winningPlayerId: PlayerId.Bot3, // Opponent winning with unbeatable trump
      };

      gameState.currentPlayerIndex = 1; // Bot 1's turn
      gameState.gamePhase = GamePhase.Playing;

      const selectedCards = getAIMove(gameState, PlayerId.Bot1);

      console.log('=== ISSUE #104 TEST: Unbeatable Opponent Conservation ===');
      console.log(`Opponent led unbeatable: ${leadingCards.map(c => `${c.rank}♥`).join(', ')}`);
      console.log(`AI selected: ${selectedCards.map(c => `${c.rank}${c.suit}`).join(', ')}`);

      // Should NOT waste valuable Ace pair on unbeatable trick
      expect(selectedCards).toHaveLength(2);
      const usedAcePair = selectedCards.filter(c => c.rank === Rank.Ace).length === 2;
      expect(usedAcePair).toBe(false);

      // Should use two small different cards
      const usedSmallCards = selectedCards.every(c => 
        c.rank === Rank.Six || c.rank === Rank.Seven
      );
      expect(usedSmallCards).toBe(true);

      console.log('✅ CORRECT: AI conserved Ace pair against unbeatable opponent');
    });
  });

  describe('Mixed Combinations Support', () => {
    it('should have mixed combinations available when out of suit following pair', () => {
      // This tests the game logic side of Issue #104 fix
      const gameState = initializeGame();
      gameState.trumpInfo = {
        
        
        trumpRank: Rank.Two,
        trumpSuit: Suit.Spades,
      };

      // AI is out of Hearts
      const aiBotHand: Card[] = [
        { id: '3-clubs', rank: Rank.Three, suit: Suit.Clubs, points: 0 },
        { id: '4-diamonds', rank: Rank.Four, suit: Suit.Diamonds, points: 0 },
        { id: 'ace-clubs-1', rank: Rank.Ace, suit: Suit.Clubs, points: 0 },
        { id: 'ace-clubs-2', rank: Rank.Ace, suit: Suit.Clubs, points: 0 },
      ];
      gameState.players[1].hand = aiBotHand;

      // Hearts pair led
      const leadingCards: Card[] = [
        { id: '6-hearts-1', rank: Rank.Six, suit: Suit.Hearts, points: 0 },
        { id: '6-hearts-2', rank: Rank.Six, suit: Suit.Hearts, points: 0 },
      ];

      gameState.currentTrick = {
        leadingPlayerId: PlayerId.Human,
        leadingCombo: leadingCards,
        plays: [
          {
            playerId: PlayerId.Human,
            cards: leadingCards,
          },
        ],
        points: 0,
        winningPlayerId: PlayerId.Human,
      };

      gameState.currentPlayerIndex = 1;
      gameState.gamePhase = GamePhase.Playing;

      // Get valid combinations - should include mixed options
      const { getValidCombinations } = require('../../src/game/gameLogic');
      const validCombos = getValidCombinations(aiBotHand, gameState);

      console.log('=== ISSUE #104 TEST: Mixed Combinations Availability ===');
      console.log(`Led: ${leadingCards.map(c => `${c.rank}♥`).join(', ')}`);
      console.log(`Valid combos: ${validCombos.length}`);
      validCombos.forEach((combo: any, i: number) => {
        console.log(`  ${i + 1}: ${combo.cards.map((c: any) => `${c.rank}${c.suit}`).join(', ')} (${combo.type})`);
      });

      // Should have multiple options including mixed combinations
      expect(validCombos.length).toBeGreaterThan(1);

      // Should NOT include the Ace pair when out of suit (proper fix)
      const acePairCombo = validCombos.find((combo: any) => 
        combo.cards.length === 2 && 
        combo.cards.every((c: any) => c.rank === Rank.Ace)
      );
      expect(acePairCombo).toBeUndefined(); // Cross-suit pairs should be filtered out

      // Should include mixed single combinations
      const mixedCombos = validCombos.filter((combo: any) => 
        combo.cards.length === 2 && 
        combo.cards[0].rank !== combo.cards[1].rank
      );
      expect(mixedCombos.length).toBeGreaterThan(0);

      console.log('✅ CORRECT: Game logic provides both pair and mixed combination options');
    });
  });

  describe('Edge Cases: Different Hand Compositions', () => {
    it('should handle AI with some Hearts cards and cross-suit pairs', () => {
      // SCENARIO: AI has Hearts cards but cannot form Hearts pair
      // Expected: Must use Hearts card, cannot waste cross-suit pair
      const gameState = initializeGame();
      gameState.trumpInfo = {
        
        
        trumpRank: Rank.Two,
        trumpSuit: Suit.Spades,
      };

      // AI hand: 5♥, A♣-A♣, 3♦, 4♠ (has Hearts but not enough for pair)
      const aiBotHand: Card[] = [
        { id: '5-hearts', rank: Rank.Five, suit: Suit.Hearts, points: 5 },
        { id: 'ace-clubs-1', rank: Rank.Ace, suit: Suit.Clubs, points: 0 },
        { id: 'ace-clubs-2', rank: Rank.Ace, suit: Suit.Clubs, points: 0 },
        { id: '3-diamonds', rank: Rank.Three, suit: Suit.Diamonds, points: 0 },
        { id: '4-spades', rank: Rank.Four, suit: Suit.Spades, points: 0 },
      ];
      gameState.players[1].hand = aiBotHand;

      // Hearts pair led
      const leadingCards: Card[] = [
        { id: '6-hearts-1', rank: Rank.Six, suit: Suit.Hearts, points: 0 },
        { id: '6-hearts-2', rank: Rank.Six, suit: Suit.Hearts, points: 0 },
      ];

      gameState.currentTrick = {
        leadingPlayerId: PlayerId.Human,
        leadingCombo: leadingCards,
        plays: [
          {
            playerId: PlayerId.Human,
            cards: leadingCards,
          },
        ],
        points: 0,
        winningPlayerId: PlayerId.Human,
      };

      gameState.currentPlayerIndex = 1;
      gameState.gamePhase = GamePhase.Playing;

      const selectedCards = getAIMove(gameState, PlayerId.Bot1);

      console.log('=== EDGE CASE TEST: Has Hearts but Cannot Form Pair ===');
      console.log(`Led: ${leadingCards.map(c => `${c.rank}♥`).join(', ')}`);
      console.log(`AI hand: ${aiBotHand.map(c => `${c.rank}${c.suit}`).join(', ')}`);
      console.log(`AI selected: ${selectedCards.map(c => `${c.rank}${c.suit}`).join(', ')}`);

      // Must include the Hearts card (5♥)
      expect(selectedCards).toHaveLength(2);
      const hasHeartsCard = selectedCards.some(c => c.suit === Suit.Hearts);
      expect(hasHeartsCard).toBe(true);

      // Should NOT use the valuable Ace pair
      const usedAcePair = selectedCards.filter(c => c.rank === Rank.Ace).length === 2;
      expect(usedAcePair).toBe(false);

      // Should use Hearts card + one other card
      const heartsCard = selectedCards.find(c => c.suit === Suit.Hearts);
      expect(heartsCard?.rank).toBe(Rank.Five);

      console.log('✅ CORRECT: AI used mandatory Hearts card and preserved Ace pair');
    });

    it('should handle AI with minimal hand (Hearts + valuable pair only)', () => {
      // SCENARIO: AI has only 3 cards: 5♥, A♣-A♣
      // Expected: Must use Hearts card, cannot use cross-suit pair
      const gameState = initializeGame();
      gameState.trumpInfo = {
        
        
        trumpRank: Rank.Two,
        trumpSuit: Suit.Spades,
      };

      // AI hand: Only 5♥, A♣-A♣ (minimal case)
      const aiBotHand: Card[] = [
        { id: '5-hearts', rank: Rank.Five, suit: Suit.Hearts, points: 5 },
        { id: 'ace-clubs-1', rank: Rank.Ace, suit: Suit.Clubs, points: 0 },
        { id: 'ace-clubs-2', rank: Rank.Ace, suit: Suit.Clubs, points: 0 },
      ];
      gameState.players[1].hand = aiBotHand;

      // Hearts pair led
      const leadingCards: Card[] = [
        { id: '6-hearts-1', rank: Rank.Six, suit: Suit.Hearts, points: 0 },
        { id: '6-hearts-2', rank: Rank.Six, suit: Suit.Hearts, points: 0 },
      ];

      gameState.currentTrick = {
        leadingPlayerId: PlayerId.Human,
        leadingCombo: leadingCards,
        plays: [
          {
            playerId: PlayerId.Human,
            cards: leadingCards,
          },
        ],
        points: 0,
        winningPlayerId: PlayerId.Human,
      };

      gameState.currentPlayerIndex = 1;
      gameState.gamePhase = GamePhase.Playing;

      const selectedCards = getAIMove(gameState, PlayerId.Bot1);

      console.log('=== EDGE CASE TEST: Minimal Hand with Hearts ===');
      console.log(`Led: ${leadingCards.map(c => `${c.rank}♥`).join(', ')}`);
      console.log(`AI hand: ${aiBotHand.map(c => `${c.rank}${c.suit}`).join(', ')}`);
      console.log(`AI selected: ${selectedCards.map(c => `${c.rank}${c.suit}`).join(', ')}`);

      // Must include the Hearts card (5♥)
      expect(selectedCards).toHaveLength(2);
      const hasHeartsCard = selectedCards.some(c => c.suit === Suit.Hearts);
      expect(hasHeartsCard).toBe(true);

      // Should NOT use the complete Ace pair (can only use one Ace)
      const usedAcePair = selectedCards.filter(c => c.rank === Rank.Ace).length === 2;
      expect(usedAcePair).toBe(false);

      // Should use exactly: 5♥ + one A♣
      const heartsCard = selectedCards.find(c => c.suit === Suit.Hearts);
      const aceCard = selectedCards.find(c => c.rank === Rank.Ace);
      expect(heartsCard?.rank).toBe(Rank.Five);
      expect(aceCard?.suit).toBe(Suit.Clubs);

      console.log('✅ CORRECT: AI used mandatory Hearts card and preserved one Ace from pair');
    });

    it('should handle AI with trump pairs when out of led suit', () => {
      // SCENARIO: AI has trump pairs when out of Hearts
      // Expected: Trump pairs should be valid options, cross-suit pairs filtered
      const gameState = initializeGame();
      gameState.trumpInfo = {
        
        
        trumpRank: Rank.Two,
        trumpSuit: Suit.Spades,
      };

      // AI hand: No Hearts, has trump pair and cross-suit pair
      const aiBotHand: Card[] = [
        { id: 'ace-clubs-1', rank: Rank.Ace, suit: Suit.Clubs, points: 0 },
        { id: 'ace-clubs-2', rank: Rank.Ace, suit: Suit.Clubs, points: 0 },
        { id: '2-spades-1', rank: Rank.Two, suit: Suit.Spades, points: 0 }, // Trump pair
        { id: '2-spades-2', rank: Rank.Two, suit: Suit.Spades, points: 0 }, // Trump pair
        { id: '3-diamonds', rank: Rank.Three, suit: Suit.Diamonds, points: 0 },
        { id: '4-diamonds', rank: Rank.Four, suit: Suit.Diamonds, points: 0 },
      ];
      gameState.players[1].hand = aiBotHand;

      // Hearts pair led
      const leadingCards: Card[] = [
        { id: '6-hearts-1', rank: Rank.Six, suit: Suit.Hearts, points: 0 },
        { id: '6-hearts-2', rank: Rank.Six, suit: Suit.Hearts, points: 0 },
      ];

      gameState.currentTrick = {
        leadingPlayerId: PlayerId.Human,
        leadingCombo: leadingCards,
        plays: [
          {
            playerId: PlayerId.Human,
            cards: leadingCards,
          },
        ],
        points: 0,
        winningPlayerId: PlayerId.Human,
      };

      gameState.currentPlayerIndex = 1;
      gameState.gamePhase = GamePhase.Playing;

      // Test valid combinations logic
      const { getValidCombinations } = require('../../src/game/gameLogic');
      const validCombos = getValidCombinations(aiBotHand, gameState);

      console.log('=== EDGE CASE TEST: Trump Pairs vs Cross-Suit Pairs ===');
      console.log(`Led: ${leadingCards.map(c => `${c.rank}♥`).join(', ')}`);
      console.log(`AI hand: ${aiBotHand.map(c => `${c.rank}${c.suit}`).join(', ')}`);
      console.log(`Valid combos: ${validCombos.length}`);
      validCombos.forEach((combo: any, i: number) => {
        console.log(`  ${i + 1}: ${combo.cards.map((c: any) => `${c.rank}${c.suit}`).join(', ')} (${combo.type})`);
      });

      // Should NOT include the Ace pair as a proper pair combo
      const acePairCombo = validCombos.find((combo: any) => 
        combo.cards.length === 2 && 
        combo.cards.every((c: any) => c.rank === Rank.Ace && c.suit === Suit.Clubs) &&
        combo.type === ComboType.Pair
      );
      expect(acePairCombo).toBeUndefined();

      // The Ace pair might appear in mixed combinations but should be discouraged
      // The key test is that we have strategic alternatives that preserve pairs
      
      // Should have diverse mixed combinations (different ranks AND suits)
      const diverseMixedCombos = validCombos.filter((combo: any) => 
        combo.cards.length === 2 && 
        combo.cards[0].rank !== combo.cards[1].rank && // Different ranks
        combo.cards[0].suit !== combo.cards[1].suit    // Different suits
      );
      expect(diverseMixedCombos.length).toBeGreaterThan(0);

      console.log('✅ CORRECT: Cross-suit pairs filtered as proper pairs, strategic mixed options available');
    });
  });
});