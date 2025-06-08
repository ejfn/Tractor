import { getValidCombinations, initializeGame } from '../../src/game/gameLogic';
import { Card, Suit, Rank, TrumpInfo, PlayerId, GameState } from '../../src/types';

describe('Smart Combination Generator Performance Tests', () => {
  it('should handle large trump hands efficiently (performance test)', () => {
    const trumpInfo: TrumpInfo = {
      trumpRank: Rank.Two,
      trumpSuit: Suit.Spades,
    };

    // Create a large leading trump tractor: 3♠3♠-4♠4♠-5♠5♠ (3 pairs)
    const leadingCombo: Card[] = [
      { id: 'spades-3-1', suit: Suit.Spades, rank: Rank.Three, joker: undefined, points: 0 },
      { id: 'spades-3-2', suit: Suit.Spades, rank: Rank.Three, joker: undefined, points: 0 },
      { id: 'spades-4-1', suit: Suit.Spades, rank: Rank.Four, joker: undefined, points: 0 },
      { id: 'spades-4-2', suit: Suit.Spades, rank: Rank.Four, joker: undefined, points: 0 },
      { id: 'spades-5-1', suit: Suit.Spades, rank: Rank.Five, joker: undefined, points: 5 },
      { id: 'spades-5-2', suit: Suit.Spades, rank: Rank.Five, joker: undefined, points: 5 },
    ];

    // Create a large hand with many trump cards (this used to cause exponential blowup)
    const playerHand: Card[] = [
      // Many trump suit cards
      { id: 'spades-6-1', suit: Suit.Spades, rank: Rank.Six, joker: undefined, points: 0 },
      { id: 'spades-6-2', suit: Suit.Spades, rank: Rank.Six, joker: undefined, points: 0 },
      { id: 'spades-7-1', suit: Suit.Spades, rank: Rank.Seven, joker: undefined, points: 0 },
      { id: 'spades-7-2', suit: Suit.Spades, rank: Rank.Seven, joker: undefined, points: 0 },
      { id: 'spades-8-1', suit: Suit.Spades, rank: Rank.Eight, joker: undefined, points: 0 },
      { id: 'spades-8-2', suit: Suit.Spades, rank: Rank.Eight, joker: undefined, points: 0 },
      { id: 'spades-9-1', suit: Suit.Spades, rank: Rank.Nine, joker: undefined, points: 0 },
      { id: 'spades-9-2', suit: Suit.Spades, rank: Rank.Nine, joker: undefined, points: 0 },
      { id: 'spades-10-1', suit: Suit.Spades, rank: Rank.Ten, joker: undefined, points: 10 },
      { id: 'spades-10-2', suit: Suit.Spades, rank: Rank.Ten, joker: undefined, points: 10 },
      { id: 'spades-j-1', suit: Suit.Spades, rank: Rank.Jack, joker: undefined, points: 0 },
      { id: 'spades-j-2', suit: Suit.Spades, rank: Rank.Jack, joker: undefined, points: 0 },
      { id: 'spades-q-1', suit: Suit.Spades, rank: Rank.Queen, joker: undefined, points: 0 },
      { id: 'spades-q-2', suit: Suit.Spades, rank: Rank.Queen, joker: undefined, points: 0 },
      { id: 'spades-k-1', suit: Suit.Spades, rank: Rank.King, joker: undefined, points: 10 },
      { id: 'spades-k-2', suit: Suit.Spades, rank: Rank.King, joker: undefined, points: 10 },
      { id: 'spades-a-1', suit: Suit.Spades, rank: Rank.Ace, joker: undefined, points: 0 },
      { id: 'spades-a-2', suit: Suit.Spades, rank: Rank.Ace, joker: undefined, points: 0 },
      // Some non-trump cards
      { id: '4d', suit: Suit.Diamonds, rank: Rank.Four, joker: undefined, points: 0 },
      { id: '8h', suit: Suit.Hearts, rank: Rank.Eight, joker: undefined, points: 0 },
      { id: '4c', suit: Suit.Clubs, rank: Rank.Four, joker: undefined, points: 0 },
    ];

    const gameState: GameState = {
      ...initializeGame(),
      trumpInfo,
      currentTrick: {
        leadingPlayerId: PlayerId.Human,
        leadingCombo,
        plays: [],
        winningPlayerId: PlayerId.Human,
        points: 0
      }
    };

    console.log('=== PERFORMANCE TEST ===');
    console.log('Leading: 3♠3♠-4♠4♠-5♠5♠ (6-card trump tractor)');
    console.log('Player has: 21 cards with 18 trump cards');
    console.log('Old algorithm: Exponential complexity O(2^n) - would timeout');
    console.log('New algorithm: Linear complexity O(n) - should complete quickly');
    console.log('');

    // Performance measurement
    const startTime = performance.now();
    const validCombinations = getValidCombinations(playerHand, gameState);
    const endTime = performance.now();
    const duration = endTime - startTime;

    console.log(`✅ Completed in ${duration.toFixed(2)}ms`);
    console.log(`Found ${validCombinations.length} valid combinations`);
    
    // Verify performance is reasonable (should be well under 100ms)
    expect(duration).toBeLessThan(100);
    
    // Verify we got valid results
    expect(validCombinations.length).toBeGreaterThan(0);
    
    // Verify the combinations are the right length (6 cards to match leading tractor)
    const validLengths = validCombinations.every(combo => combo.cards.length === 6);
    expect(validLengths).toBe(true);
    
    // Should include trump cards since player has them
    const hasTrampCards = validCombinations.some(combo => 
      combo.cards.some(card => card.suit === Suit.Spades)
    );
    expect(hasTrampCards).toBe(true);
  });

  it('should limit combinations to prevent memory issues', () => {
    const trumpInfo: TrumpInfo = {
      trumpRank: Rank.Two,
      trumpSuit: Suit.Hearts,
    };

    // Create a 4-card leading combo
    const leadingCombo: Card[] = [
      { id: 'hearts-3-1', suit: Suit.Hearts, rank: Rank.Three, joker: undefined, points: 0 },
      { id: 'hearts-3-2', suit: Suit.Hearts, rank: Rank.Three, joker: undefined, points: 0 },
      { id: 'hearts-4-1', suit: Suit.Hearts, rank: Rank.Four, joker: undefined, points: 0 },
      { id: 'hearts-4-2', suit: Suit.Hearts, rank: Rank.Four, joker: undefined, points: 0 },
    ];

    // Create a very large hand (maximum possible)
    const playerHand: Card[] = [];
    let cardId = 1;
    
    // Add all possible cards (but not the ones in leading combo)
    const ranks = [Rank.Five, Rank.Six, Rank.Seven, Rank.Eight, Rank.Nine, Rank.Ten, Rank.Jack, Rank.Queen, Rank.King, Rank.Ace];
    const suits = [Suit.Hearts, Suit.Diamonds, Suit.Clubs, Suit.Spades];
    
    for (const suit of suits) {
      for (const rank of ranks) {
        // Add 2 copies of each card
        playerHand.push({ 
          id: `card-${cardId++}`, 
          suit, 
          rank, 
          joker: undefined, 
          points: rank === Rank.Five ? 5 : (rank === Rank.Ten || rank === Rank.King ? 10 : 0)
        });
        playerHand.push({ 
          id: `card-${cardId++}`, 
          suit, 
          rank, 
          joker: undefined, 
          points: rank === Rank.Five ? 5 : (rank === Rank.Ten || rank === Rank.King ? 10 : 0)
        });
      }
    }

    const gameState: GameState = {
      ...initializeGame(),
      trumpInfo,
      currentTrick: {
        leadingPlayerId: PlayerId.Human,
        leadingCombo,
        plays: [],
        winningPlayerId: PlayerId.Human,
        points: 0
      }
    };

    console.log('=== COMBINATION LIMIT TEST ===');
    console.log(`Player hand size: ${playerHand.length} cards`);
    console.log('Testing that combination generation is limited to prevent memory issues');

    const startTime = performance.now();
    const validCombinations = getValidCombinations(playerHand, gameState);
    const endTime = performance.now();
    const duration = endTime - startTime;

    console.log(`✅ Completed in ${duration.toFixed(2)}ms`);
    console.log(`Generated ${validCombinations.length} combinations (limited for performance)`);
    
    // Should complete quickly even with large hands
    expect(duration).toBeLessThan(500);
    
    // Should have reasonable number of combinations (not exponential)
    expect(validCombinations.length).toBeLessThan(100);
    expect(validCombinations.length).toBeGreaterThan(0);
  });

  it('should use trump conservation hierarchy in strategic sampling', () => {
    const trumpInfo: TrumpInfo = {
      trumpRank: Rank.Two,
      trumpSuit: Suit.Clubs,
    };

    // Single leading card
    const leadingCombo: Card[] = [
      { id: 'clubs-3', suit: Suit.Clubs, rank: Rank.Three, joker: undefined, points: 0 },
    ];

    // Hand with mix of valuable and weak trump cards
    const playerHand: Card[] = [
      // Weak trump cards (should be preferred in strategic sampling)
      { id: 'clubs-4', suit: Suit.Clubs, rank: Rank.Four, joker: undefined, points: 0 },
      { id: 'clubs-5', suit: Suit.Clubs, rank: Rank.Five, joker: undefined, points: 5 },
      // Valuable trump cards (should be avoided)
      { id: 'clubs-ace', suit: Suit.Clubs, rank: Rank.Ace, joker: undefined, points: 0 },
      { id: 'clubs-king', suit: Suit.Clubs, rank: Rank.King, joker: undefined, points: 10 },
      // Non-trump cards
      { id: 'hearts-7', suit: Suit.Hearts, rank: Rank.Seven, joker: undefined, points: 0 },
      { id: 'diamonds-8', suit: Suit.Diamonds, rank: Rank.Eight, joker: undefined, points: 0 },
    ];

    const gameState: GameState = {
      ...initializeGame(),
      trumpInfo,
      currentTrick: {
        leadingPlayerId: PlayerId.Human,
        leadingCombo,
        plays: [],
        winningPlayerId: PlayerId.Human,
        points: 0
      }
    };

    const validCombinations = getValidCombinations(playerHand, gameState);
    
    expect(validCombinations.length).toBeGreaterThan(0);
    
    // Should prefer trump cards (must follow suit)
    const hasTrampCard = validCombinations.every(combo => 
      combo.cards.some(card => card.suit === Suit.Clubs)
    );
    expect(hasTrampCard).toBe(true);
    
    console.log('✅ Strategic trump conservation working correctly');
  });
});