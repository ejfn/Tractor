import { getValidCombinations } from '../../src/game/combinationGeneration';
import { Card, GameState, PlayerId, Rank, Suit, TrumpInfo } from '../../src/types';
import { createGameState } from '../helpers/gameStates';

describe('getValidCombinations Bug Reproduction', () => {
  it('should NEVER return empty array - reproduce the exact bug scenario', () => {
    // Reproduce the exact bug scenario from the error log
    const trumpInfo: TrumpInfo = {
      trumpRank: Rank.Two,
      trumpSuit: Suit.Spades,
      
      
    };

    // Leading combo: 10♠-10♠ (trump pair)
    const leadingCombo: Card[] = Card.createPair(Suit.Spades, Rank.Ten);

    // Bot1's hand from the error log - only ONE trump card (9♠)
    const playerHand: Card[] = [
      Card.createCard(Suit.Diamonds, Rank.Four, 0),
      Card.createCard(Suit.Hearts, Rank.Eight, 0),
      Card.createCard(Suit.Clubs, Rank.Four, 0),
      Card.createCard(Suit.Diamonds, Rank.Ten, 0),
      Card.createCard(Suit.Diamonds, Rank.King, 0),
      Card.createCard(Suit.Clubs, Rank.Ace, 0),
      Card.createCard(Suit.Clubs, Rank.Six, 0),
      Card.createCard(Suit.Hearts, Rank.Six, 0),
      Card.createCard(Suit.Diamonds, Rank.Seven, 0),
      Card.createCard(Suit.Diamonds, Rank.Nine, 0),
      Card.createCard(Suit.Diamonds, Rank.Three, 0),
      Card.createCard(Suit.Diamonds, Rank.Eight, 0),
      Card.createCard(Suit.Clubs, Rank.Queen, 0),
      Card.createCard(Suit.Diamonds, Rank.Six, 0),
      Card.createCard(Suit.Clubs, Rank.King, 0),
      Card.createCard(Suit.Clubs, Rank.Ten, 0),
      Card.createCard(Suit.Clubs, Rank.Queen, 1),
      Card.createCard(Suit.Spades, Rank.Nine, 0), // ONLY trump card
      Card.createCard(Suit.Clubs, Rank.Ten, 1),
      ...Card.createPair(Suit.Hearts, Rank.Ace)
    ];

    // Create a minimal game state
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