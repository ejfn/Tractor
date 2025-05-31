import { compareCardCombos } from '../../src/game/gameLogic';
import { Suit, Rank, TrumpInfo } from '../../src/types';
import { createCard } from '../helpers/cards';

/**
 * Test for issue #74: Trump rank pair should win trump suit pair
 * 
 * Expected trump hierarchy:
 * BJ > SJ > Trump rank in trump suit > trump rank in other suits > other trump suit cards
 * 
 * Bug: When comparing pairs from the same trump suit, the system was using rank comparison
 * instead of trump hierarchy, causing trump suit pairs to incorrectly beat trump rank pairs.
 * 
 * Example from issue:
 * - Trump: 2♦ (rank 2, Diamonds suit)
 * - Expected: 2♦-2♦ should beat 9♦-9♦
 * - Actual (before fix): 2♦-2♦ was losing to 9♦-9♦
 */
describe('Issue #74: Trump Hierarchy Bug Fix', () => {
  test('Exact issue reproduction: 2♦-2♦ should beat 9♦-9♦ when 2♦ is trump', () => {
    // Set up trump as described in issue: 2(D) is trump
    const trumpInfo: TrumpInfo = { 
      trumpRank: Rank.Two, 
      
      trumpSuit: Suit.Diamonds 
    };
    
    // Create the exact cards from the issue
    const diamonds2_1 = createCard(Suit.Diamonds, Rank.Two);   // Trump rank in trump suit
    const diamonds2_2 = createCard(Suit.Diamonds, Rank.Two);   
    const diamonds9_1 = createCard(Suit.Diamonds, Rank.Nine);  // Trump suit card
    const diamonds9_2 = createCard(Suit.Diamonds, Rank.Nine);  
    
    const trumpRankPair = [diamonds2_1, diamonds2_2];  // 2♦-2♦ 
    const trumpSuitPair = [diamonds9_1, diamonds9_2];  // 9♦-9♦
    
    // This is the exact comparison from the issue description
    const result = compareCardCombos(trumpRankPair, trumpSuitPair, trumpInfo);
    
    // Expected behavior: 2♦-2♦ > 9♦-9♦ (should return positive)
    expect(result).toBeGreaterThan(0);
  });
  
  test('Trump hierarchy is consistent across different trump configurations', () => {
    // Test with different trump rank and suit to ensure fix is general
    const trumpInfo: TrumpInfo = { 
      trumpRank: Rank.Five, 
      
      trumpSuit: Suit.Hearts 
    };
    
    const hearts5_1 = createCard(Suit.Hearts, Rank.Five);    // Trump rank in trump suit (highest)
    const hearts5_2 = createCard(Suit.Hearts, Rank.Five);    
    const hearts10_1 = createCard(Suit.Hearts, Rank.Ten);    // Trump suit card (lower)
    const hearts10_2 = createCard(Suit.Hearts, Rank.Ten);    
    
    const trumpRankPair = [hearts5_1, hearts5_2];    // 5♥-5♥
    const trumpSuitPair = [hearts10_1, hearts10_2];  // 10♥-10♥
    
    const result = compareCardCombos(trumpRankPair, trumpSuitPair, trumpInfo);
    
    // Trump rank pair should always beat trump suit pair
    expect(result).toBeGreaterThan(0);
  });
  
  test('Cross-suit trump pairs still work correctly', () => {
    // Ensure fix doesn't break cross-suit trump comparisons
    const trumpInfo: TrumpInfo = { 
      trumpRank: Rank.Ace, 
      
      trumpSuit: Suit.Spades 
    };
    
    const spades2_1 = createCard(Suit.Spades, Rank.Two);    // Trump suit card
    const spades2_2 = createCard(Suit.Spades, Rank.Two);    
    const heartsA_1 = createCard(Suit.Hearts, Rank.Ace);    // Trump rank in other suit
    const heartsA_2 = createCard(Suit.Hearts, Rank.Ace);    
    
    const trumpSuitPair = [spades2_1, spades2_2];   // 2♠-2♠ (trump suit)
    const trumpRankPair = [heartsA_1, heartsA_2];   // A♥-A♥ (trump rank in other suit)
    
    const result = compareCardCombos(trumpRankPair, trumpSuitPair, trumpInfo);
    
    // Trump rank in other suits beats trump suit cards
    expect(result).toBeGreaterThan(0);
  });
});