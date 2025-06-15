import { identifyCombos } from '../../src/game/comboDetection';
import { Card, ComboType, Rank, Suit, TrumpInfo } from '../../src/types';
import { gameLogger } from '../../src/utils/gameLogger';

describe('Invalid Trump Rank Pair Bug', () => {
  test('should NOT create pair from different suit trump rank cards', () => {
    // Setup: Trump rank 2, trump suit Spades
    const trumpInfo: TrumpInfo = {
      trumpRank: Rank.Two,
      trumpSuit: Suit.Spades,
    };

    // Create cards: 2♥ and 2♦ (both trump rank, different suits)
    const cards = [
      Card.createCard(Suit.Hearts, Rank.Two, 0), // 2♥ - trump rank card
      Card.createCard(Suit.Diamonds, Rank.Two, 0), // 2♦ - trump rank card
    ];

    const combos = identifyCombos(cards, trumpInfo);

    // DEBUG: Let's see what combinations are actually found
    gameLogger.info('test_combo_debug', {
      allCombos: combos,
      cardsInput: cards
    }, 'DEBUG: All combos found and cards input');
    
    // Should find 2 singles but NO pairs
    const pairs = combos.filter(combo => combo.type === ComboType.Pair);
    const singles = combos.filter(combo => combo.type === ComboType.Single);

    gameLogger.info('test_combo_results', {
      pairsFound: pairs,
      singlesFound: singles
    }, 'DEBUG: Pairs and singles found');

    expect(singles).toHaveLength(2);
    expect(pairs).toHaveLength(0); // Should NOT find pairs from different suits

    // Verify singles are correct
    expect(singles[0].cards[0]).toEqual(expect.objectContaining({
      rank: Rank.Two,
      suit: Suit.Hearts
    }));
    expect(singles[1].cards[0]).toEqual(expect.objectContaining({
      rank: Rank.Two, 
      suit: Suit.Diamonds
    }));
  });

  test('should create pair from identical trump rank cards (same suit)', () => {
    // Setup: Trump rank 2, trump suit Spades  
    const trumpInfo: TrumpInfo = {
      trumpRank: Rank.Two,
      trumpSuit: Suit.Spades,
    };

    // Create cards: two 2♥ cards (identical)
    const cards = [
      Card.createCard(Suit.Hearts, Rank.Two, 0), // 2♥ - trump rank card
      Card.createCard(Suit.Hearts, Rank.Two, 1), // 2♥ - identical trump rank card
    ];

    const combos = identifyCombos(cards, trumpInfo);

    // Should find 2 singles AND 1 pair
    const pairs = combos.filter(combo => combo.type === ComboType.Pair);
    const singles = combos.filter(combo => combo.type === ComboType.Single);

    expect(singles).toHaveLength(2);
    expect(pairs).toHaveLength(1); // Should correctly find identical pair

    // Verify pair contains identical cards
    expect(pairs[0].cards).toHaveLength(2);
    expect(pairs[0].cards[0]).toEqual(expect.objectContaining({
      rank: Rank.Two,
      suit: Suit.Hearts
    }));
    expect(pairs[0].cards[1]).toEqual(expect.objectContaining({
      rank: Rank.Two,
      suit: Suit.Hearts
    }));
  });

  test('should create pair from trump suit cards (same rank and suit)', () => {
    // Setup: Trump rank 2, trump suit Spades
    const trumpInfo: TrumpInfo = {
      trumpRank: Rank.Two,
      trumpSuit: Suit.Spades,
    };

    // Create cards: two 3♠ cards (trump suit cards)
    const cards = [
      Card.createCard(Suit.Spades, Rank.Three, 0), // 3♠ - trump suit card
      Card.createCard(Suit.Spades, Rank.Three, 1), // 3♠ - identical trump suit card
    ];

    const combos = identifyCombos(cards, trumpInfo);

    // Should find 2 singles AND 1 pair
    const pairs = combos.filter(combo => combo.type === ComboType.Pair);
    const singles = combos.filter(combo => combo.type === ComboType.Single);

    expect(singles).toHaveLength(2);
    expect(pairs).toHaveLength(1); // Should correctly find identical pair

    // Verify pair contains identical cards
    expect(pairs[0].cards).toHaveLength(2);
    expect(pairs[0].cards[0]).toEqual(expect.objectContaining({
      rank: Rank.Three,
      suit: Suit.Spades
    }));
    expect(pairs[0].cards[1]).toEqual(expect.objectContaining({
      rank: Rank.Three,
      suit: Suit.Spades
    }));
  });
});