import { declareTrumpSuit } from '../../src/game/trumpManager';
import { getAutoSelectedCards } from '../../src/utils/cardAutoSelection';
import { createIsolatedGameState } from '../helpers/testIsolation';
import { Card, Suit, Rank, GamePhase } from '../../src/types';

describe('Issue #78: Auto-select after trump declaration skip', () => {
  it('should enable auto-selection after skipping trump declaration', () => {
    // Create initial game state
    const gameState = createIsolatedGameState();
    
    // Ensure we're in declaring phase initially
    gameState.gamePhase = GamePhase.Declaring;
    gameState.trumpInfo.declared = false;
    
    console.log('Initial state - declared:', gameState.trumpInfo.declared);
    console.log('Initial phase:', gameState.gamePhase);
    
    // Skip trump declaration (pass null)
    const stateAfterSkip = declareTrumpSuit(gameState, null);
    
    console.log('After skip - declared:', stateAfterSkip.trumpInfo.declared);
    console.log('After skip phase:', stateAfterSkip.gamePhase);
    
    // Verify trump declaration is marked as complete
    expect(stateAfterSkip.trumpInfo.declared).toBe(true);
    expect(stateAfterSkip.gamePhase).toBe(GamePhase.Playing);
    
    // Create test cards for auto-selection
    const testCards: Card[] = [
      {
        id: 'hearts-5-1',
        suit: Suit.Hearts,
        rank: Rank.Five,
        joker: undefined,
        points: 5
      },
      {
        id: 'hearts-5-2', 
        suit: Suit.Hearts,
        rank: Rank.Five,
        joker: undefined,
        points: 5
      },
      {
        id: 'hearts-6-1',
        suit: Suit.Hearts,
        rank: Rank.Six,
        joker: undefined,
        points: 0
      }
    ];
    
    // Test auto-selection with the fixed trump info
    const autoSelected = getAutoSelectedCards(
      testCards[0], // Click first 5 of Hearts
      testCards,
      [], // No current selection
      true, // Leading
      undefined, // No leading combo
      stateAfterSkip.trumpInfo // Use the fixed trump info
    );
    
    console.log('Auto-selected cards:', autoSelected.map(c => `${c.rank}${c.suit}`));
    
    // Should auto-select the pair of 5s
    expect(autoSelected.length).toBe(2);
    expect(autoSelected).toContainEqual(testCards[0]);
    expect(autoSelected).toContainEqual(testCards[1]);
  });
  
  it('should enable auto-selection after declaring a trump suit', () => {
    // Create initial game state
    const gameState = createIsolatedGameState();
    gameState.gamePhase = GamePhase.Declaring;
    gameState.trumpInfo.declared = false;
    
    // Declare Hearts as trump
    const stateAfterDeclaration = declareTrumpSuit(gameState, Suit.Hearts);
    
    // Verify trump declaration is complete
    expect(stateAfterDeclaration.trumpInfo.declared).toBe(true);
    expect(stateAfterDeclaration.trumpInfo.trumpSuit).toBe(Suit.Hearts);
    expect(stateAfterDeclaration.gamePhase).toBe(GamePhase.Playing);
    
    // Test auto-selection works with declared trump
    const testCards: Card[] = [
      {
        id: 'spades-7-1',
        suit: Suit.Spades,
        rank: Rank.Seven,
        joker: undefined,
        points: 0
      },
      {
        id: 'spades-7-2',
        suit: Suit.Spades, 
        rank: Rank.Seven,
        joker: undefined,
        points: 0
      }
    ];
    
    const autoSelected = getAutoSelectedCards(
      testCards[0],
      testCards,
      [],
      true,
      undefined,
      stateAfterDeclaration.trumpInfo
    );
    
    // Should auto-select the pair
    expect(autoSelected.length).toBe(2);
    expect(autoSelected).toContainEqual(testCards[0]);
    expect(autoSelected).toContainEqual(testCards[1]);
  });
});