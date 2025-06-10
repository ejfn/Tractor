import { getComboType } from '../../src/game/comboDetection';
import { Card, ComboType, Rank, Suit, TrumpInfo } from '../../src/types';
import { findTractorCards } from '../../src/utils/cardAutoSelection';

describe('Tractor Auto-Selection Bug Fix - Issue #92', () => {
  test('should NOT auto-select 2H-2H-3H-3H as tractor when 2 is trump rank', () => {
    // Test case from Issue #92: 2H-2H-3H-3H should not form a tractor when 2 is trump rank
    // because 2H cards are trump but 3H cards are non-trump
    
    const trumpInfo: TrumpInfo = {
      trumpRank: Rank.Two,
      
      trumpSuit: Suit.Spades // 2H will be trump due to rank, 3H will be non-trump hearts
    };

    const hand = [
      Card.createCard(Suit.Hearts, Rank.Two, 0),
      Card.createCard(Suit.Hearts, Rank.Two, 1), 
      Card.createCard(Suit.Hearts, Rank.Three, 0),
      Card.createCard(Suit.Hearts, Rank.Three, 1)
    ];

    // Test auto-selection - should NOT find a tractor
    const tractorCards = findTractorCards(hand[0], hand, trumpInfo);
    expect(tractorCards).toHaveLength(0);

    // Test validation - should also NOT identify as tractor  
    const comboType = getComboType(hand, trumpInfo);
    expect(comboType).not.toBe(ComboType.Tractor);

    // Both systems should now be aligned
    const autoSelectsAsTractor = tractorCards.length >= 4;
    const validatesAsTractor = comboType === ComboType.Tractor;
    expect(autoSelectsAsTractor).toBe(validatesAsTractor);
  });

  test('should correctly auto-select valid trump suit tractor', () => {
    // Test that valid trump tractors still work correctly
    
    const trumpInfo: TrumpInfo = {
      trumpRank: Rank.Two,
      
      trumpSuit: Suit.Hearts // Hearts is trump suit
    };

    const hand = [
      Card.createCard(Suit.Hearts, Rank.Three, 0),
      Card.createCard(Suit.Hearts, Rank.Three, 1),
      Card.createCard(Suit.Hearts, Rank.Four, 0), 
      Card.createCard(Suit.Hearts, Rank.Four, 1)
    ];

    // Test auto-selection - should find a tractor (all are trump suit)
    const tractorCards = findTractorCards(hand[0], hand, trumpInfo);
    expect(tractorCards).toHaveLength(4);

    // Test validation - should also identify as tractor
    const comboType = getComboType(hand, trumpInfo);
    expect(comboType).toBe(ComboType.Tractor);

    // Both systems should be aligned
    const autoSelectsAsTractor = tractorCards.length >= 4;
    const validatesAsTractor = comboType === ComboType.Tractor;
    expect(autoSelectsAsTractor).toBe(validatesAsTractor);
  });

  test('should correctly auto-select valid non-trump tractor', () => {
    // Test that non-trump tractors still work correctly
    
    const trumpInfo: TrumpInfo = {
      trumpRank: Rank.Two,
      
      trumpSuit: Suit.Spades
    };

    const hand = [
      Card.createCard(Suit.Hearts, Rank.Five, 0),
      Card.createCard(Suit.Hearts, Rank.Five, 1),
      Card.createCard(Suit.Hearts, Rank.Six, 0),
      Card.createCard(Suit.Hearts, Rank.Six, 1)
    ];

    // Test auto-selection - should find a tractor (all non-trump hearts)
    const tractorCards = findTractorCards(hand[0], hand, trumpInfo);
    expect(tractorCards).toHaveLength(4);

    // Test validation - should also identify as tractor
    const comboType = getComboType(hand, trumpInfo);
    expect(comboType).toBe(ComboType.Tractor);

    // Both systems should be aligned
    const autoSelectsAsTractor = tractorCards.length >= 4;
    const validatesAsTractor = comboType === ComboType.Tractor;
    expect(autoSelectsAsTractor).toBe(validatesAsTractor);
  });

  test('should NOT auto-select cross-suit consecutive pairs', () => {
    // Verify that different suits still don't form tractors
    
    const trumpInfo: TrumpInfo = {
      trumpRank: Rank.Two,
      
      trumpSuit: Suit.Spades
    };

    const hand = [
      Card.createCard(Suit.Hearts, Rank.Five, 0),
      Card.createCard(Suit.Hearts, Rank.Five, 1),
      Card.createCard(Suit.Clubs, Rank.Six, 0),
      Card.createCard(Suit.Clubs, Rank.Six, 1)
    ];

    // Test auto-selection - should NOT find a tractor (different suits)
    const tractorCards = findTractorCards(hand[0], hand, trumpInfo);
    expect(tractorCards).toHaveLength(0);

    // Test validation - should also NOT identify as tractor
    const comboType = getComboType(hand, trumpInfo);
    expect(comboType).not.toBe(ComboType.Tractor);

    // Both systems should be aligned
    const autoSelectsAsTractor = tractorCards.length >= 4;
    const validatesAsTractor = comboType === ComboType.Tractor;
    expect(autoSelectsAsTractor).toBe(validatesAsTractor);
  });

  test('should handle trump rank cards from different suits correctly', () => {
    // Test trump rank cards from different suits (both trump, but different categories)
    
    const trumpInfo: TrumpInfo = {
      trumpRank: Rank.Two,
      
      trumpSuit: Suit.Spades
    };

    const hand = [
      Card.createCard(Suit.Hearts, Rank.Two, 0),   // Trump rank in hearts
      Card.createCard(Suit.Hearts, Rank.Two, 1),   // Trump rank in hearts  
      Card.createCard(Suit.Clubs, Rank.Two, 0),    // Trump rank in clubs
      Card.createCard(Suit.Clubs, Rank.Two, 1)     // Trump rank in clubs
    ];

    // Test auto-selection - should NOT find a tractor (different trump categories)
    const tractorCards = findTractorCards(hand[0], hand, trumpInfo);
    expect(tractorCards).toHaveLength(0);

    // Test validation - should also NOT identify as tractor
    const comboType = getComboType(hand, trumpInfo);
    expect(comboType).not.toBe(ComboType.Tractor);

    // Both systems should be aligned
    const autoSelectsAsTractor = tractorCards.length >= 4;
    const validatesAsTractor = comboType === ComboType.Tractor;
    expect(autoSelectsAsTractor).toBe(validatesAsTractor);
  });
});