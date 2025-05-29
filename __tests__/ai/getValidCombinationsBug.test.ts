import { getValidCombinations, initializeGame } from '../../src/game/gameLogic';
import { Card, Suit, Rank, TrumpInfo, PlayerId, GameState } from '../../src/types';

describe('getValidCombinations Bug Reproduction', () => {
  it('should NEVER return empty array - reproduce the exact bug scenario', () => {
    // Reproduce the exact bug scenario from the error log
    const trumpInfo: TrumpInfo = {
      trumpRank: Rank.Two,
      trumpSuit: Suit.Spades,
      declared: true,
      declarerPlayerId: PlayerId.Human
    };

    // Leading combo: 10♠-10♠ (trump pair)
    const leadingCombo: Card[] = [
      {
        id: 'spades-10-1',
        suit: Suit.Spades,
        rank: Rank.Ten,
        joker: undefined,
        points: 10
      },
      {
        id: 'spades-10-2', 
        suit: Suit.Spades,
        rank: Rank.Ten,
        joker: undefined,
        points: 10
      }
    ];

    // Bot1's hand from the error log - only ONE trump card (9♠)
    const playerHand: Card[] = [
      { id: '4d', suit: Suit.Diamonds, rank: Rank.Four, joker: undefined, points: 0 },
      { id: '8h', suit: Suit.Hearts, rank: Rank.Eight, joker: undefined, points: 0 },
      { id: '4c', suit: Suit.Clubs, rank: Rank.Four, joker: undefined, points: 0 },
      { id: '10d', suit: Suit.Diamonds, rank: Rank.Ten, joker: undefined, points: 10 },
      { id: 'kd', suit: Suit.Diamonds, rank: Rank.King, joker: undefined, points: 10 },
      { id: 'ac1', suit: Suit.Clubs, rank: Rank.Ace, joker: undefined, points: 0 },
      { id: '6c', suit: Suit.Clubs, rank: Rank.Six, joker: undefined, points: 0 },
      { id: '6h', suit: Suit.Hearts, rank: Rank.Six, joker: undefined, points: 0 },
      { id: '7d', suit: Suit.Diamonds, rank: Rank.Seven, joker: undefined, points: 0 },
      { id: '9d', suit: Suit.Diamonds, rank: Rank.Nine, joker: undefined, points: 0 },
      { id: '3d', suit: Suit.Diamonds, rank: Rank.Three, joker: undefined, points: 0 },
      { id: '8d', suit: Suit.Diamonds, rank: Rank.Eight, joker: undefined, points: 0 },
      { id: 'qc1', suit: Suit.Clubs, rank: Rank.Queen, joker: undefined, points: 0 },
      { id: '6d', suit: Suit.Diamonds, rank: Rank.Six, joker: undefined, points: 0 },
      { id: 'kc', suit: Suit.Clubs, rank: Rank.King, joker: undefined, points: 10 },
      { id: '10c1', suit: Suit.Clubs, rank: Rank.Ten, joker: undefined, points: 10 },
      { id: 'qc2', suit: Suit.Clubs, rank: Rank.Queen, joker: undefined, points: 0 },
      { id: '9s', suit: Suit.Spades, rank: Rank.Nine, joker: undefined, points: 0 }, // ONLY trump card
      { id: '10c2', suit: Suit.Clubs, rank: Rank.Ten, joker: undefined, points: 10 },
      { id: 'ah1', suit: Suit.Hearts, rank: Rank.Ace, joker: undefined, points: 0 },
      { id: 'ah2', suit: Suit.Hearts, rank: Rank.Ace, joker: undefined, points: 0 }
    ];

    // Create a minimal game state
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

    console.log('=== BUG REPRODUCTION TEST ===');
    console.log('Leading: 10♠-10♠ (trump pair)');
    console.log('Player has: 21 cards with only ONE trump (9♠)');
    console.log('Expected: Must use trump single + another card');
    console.log('');

    // This is the line that's failing in the actual game
    console.log('About to call getValidCombinations...');
    const validCombinations = getValidCombinations(playerHand, gameState);
    console.log('getValidCombinations completed');

    console.log('getValidCombinations returned:', validCombinations.length, 'combinations');
    if (validCombinations.length === 0) {
      console.log('🐛 BUG CONFIRMED: getValidCombinations returned empty array!');
      console.log('This should NEVER happen in Tractor - there should always be a valid play');
    } else {
      console.log('✅ Valid combinations found:', validCombinations.map(c => 
        c.cards.map(card => `${card.rank}${card.suit}`).join('-')
      ));
    }

    // CRITICAL: This should NEVER be empty - there should always be a valid play
    expect(validCombinations.length).toBeGreaterThan(0);
    
    // The combination should use the trump single (9♠) + another card
    const foundValidCombo = validCombinations.some(combo => 
      combo.cards.length === 2 && 
      combo.cards.some(card => card.rank === Rank.Nine && card.suit === Suit.Spades)
    );
    
    expect(foundValidCombo).toBe(true);
  });
});