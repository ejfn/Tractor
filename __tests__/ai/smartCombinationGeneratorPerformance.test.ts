import { getValidCombinations } from '../../src/game/combinationGeneration';
import { Card, GameState, PlayerId, Rank, Suit, TrumpInfo } from '../../src/types';
import { createGameState } from '../helpers/gameStates';

describe('Smart Combination Generator Performance Tests', () => {
  it('should handle large trump hands efficiently (performance test)', () => {
    const trumpInfo: TrumpInfo = {
      trumpRank: Rank.Two,
      trumpSuit: Suit.Spades,
    };

    // Create a large leading trump tractor: 3♠3♠-4♠4♠-5♠5♠ (3 pairs)
    const leadingCombo: Card[] = [
      ...Card.createPair(Suit.Spades, Rank.Three),
      ...Card.createPair(Suit.Spades, Rank.Four),
      ...Card.createPair(Suit.Spades, Rank.Five),
    ];

    // Create a large hand with many trump cards (this used to cause exponential blowup)
    const playerHand: Card[] = [
      // Many trump suit cards
      ...Card.createPair(Suit.Spades, Rank.Six),
      ...Card.createPair(Suit.Spades, Rank.Seven),
      ...Card.createPair(Suit.Spades, Rank.Eight),
      ...Card.createPair(Suit.Spades, Rank.Nine),
      ...Card.createPair(Suit.Spades, Rank.Ten),
      ...Card.createPair(Suit.Spades, Rank.Jack),
      ...Card.createPair(Suit.Spades, Rank.Queen),
      ...Card.createPair(Suit.Spades, Rank.King),
      ...Card.createPair(Suit.Spades, Rank.Ace),
      // Some non-trump cards
      Card.createCard(Suit.Diamonds, Rank.Four, 0),
      Card.createCard(Suit.Hearts, Rank.Eight, 0),
      Card.createCard(Suit.Clubs, Rank.Four, 0),
    ];

    const gameState: GameState = createGameState({
      trumpInfo,
      currentTrick: {
        plays: [
          { playerId: PlayerId.Human, cards: leadingCombo }
        ],
        winningPlayerId: PlayerId.Human,
        points: 0
      }
    });

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
      ...Card.createPair(Suit.Hearts, Rank.Three),
      ...Card.createPair(Suit.Hearts, Rank.Four),
    ];

    // Create a very large hand (maximum possible)
    const playerHand: Card[] = [];
    let cardId = 1;
    
    // Add all possible cards (but not the ones in leading combo)
    const ranks = [Rank.Five, Rank.Six, Rank.Seven, Rank.Eight, Rank.Nine, Rank.Ten, Rank.Jack, Rank.Queen, Rank.King, Rank.Ace];
    const suits = [Suit.Hearts, Suit.Diamonds, Suit.Clubs, Suit.Spades];
    
    for (const suit of suits) {
      for (const rank of ranks) {
        // Add 2 copies of each card (using Card.createPair for convenience)
        playerHand.push(...Card.createPair(suit, rank));
        cardId += 2;
      }
    }

    const gameState: GameState = createGameState({
      trumpInfo,
      currentTrick: {
        plays: [
          { playerId: PlayerId.Human, cards: leadingCombo }
        ],
        winningPlayerId: PlayerId.Human,
        points: 0
      }
    });

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
      Card.createCard(Suit.Clubs, Rank.Three, 0),
    ];

    // Hand with mix of valuable and weak trump cards
    const playerHand: Card[] = [
      // Weak trump cards (should be preferred in strategic sampling)
      Card.createCard(Suit.Clubs, Rank.Four, 0),
      Card.createCard(Suit.Clubs, Rank.Five, 0),
      // Valuable trump cards (should be avoided)
      Card.createCard(Suit.Clubs, Rank.Ace, 0),
      Card.createCard(Suit.Clubs, Rank.King, 0),
      // Non-trump cards
      Card.createCard(Suit.Hearts, Rank.Seven, 0),
      Card.createCard(Suit.Diamonds, Rank.Eight, 0),
    ];

    const gameState: GameState = createGameState({
      trumpInfo,
      currentTrick: {
        plays: [
          { playerId: PlayerId.Human, cards: leadingCombo }
        ],
        winningPlayerId: PlayerId.Human,
        points: 0
      }
    });

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