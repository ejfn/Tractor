import { identifyCombos } from '../../src/game/gameLogic';
import { ComboType, JokerType, PlayerId, Rank, Suit, TrumpInfo } from '../../src/types';
import { createCard } from '../helpers';

describe('Invalid Trump Rank Pair Bug', () => {
  test('should NOT create pair from different suit trump rank cards', () => {
    // Setup: Trump rank 2, trump suit Spades
    const trumpInfo: TrumpInfo = {
      trumpRank: Rank.Two,
      trumpSuit: Suit.Spades,
    };

    // Create cards: 2♥ and 2♦ (both trump rank, different suits)
    const cards = [
      createCard(Suit.Hearts, Rank.Two), // 2♥ - trump rank card
      createCard(Suit.Diamonds, Rank.Two), // 2♦ - trump rank card
    ];

    const combos = identifyCombos(cards, trumpInfo);

    // DEBUG: Let's see what combinations are actually found
    console.log('DEBUG: All combos found:', combos);
    console.log('DEBUG: Cards input:', cards);
    
    // Should find 2 singles but NO pairs
    const pairs = combos.filter(combo => combo.type === ComboType.Pair);
    const singles = combos.filter(combo => combo.type === ComboType.Single);

    console.log('DEBUG: Pairs found:', pairs);
    console.log('DEBUG: Singles found:', singles);

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
      createCard(Suit.Hearts, Rank.Two), // 2♥ - trump rank card
      createCard(Suit.Hearts, Rank.Two), // 2♥ - identical trump rank card
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
      createCard(Suit.Spades, Rank.Three), // 3♠ - trump suit card
      createCard(Suit.Spades, Rank.Three), // 3♠ - identical trump suit card
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