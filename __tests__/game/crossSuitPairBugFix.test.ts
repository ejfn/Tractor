import { identifyCombos } from '../../src/game/comboDetection';
import { Card, ComboType, Rank, Suit, TrumpInfo } from '../../src/types';
import { gameLogger } from '../../src/utils/gameLogger';

describe('Cross-Suit Pair Bug Fix', () => {
  test('should NOT form pairs between different suit trump rank cards', () => {
    // Test scenario: 8♠-8♣ should NOT form a pair when 8 is trump rank
    const trumpInfo: TrumpInfo = {
      trumpRank: Rank.Eight,
      trumpSuit: Suit.Spades
    };

    const cards = [
      Card.createCard(Suit.Spades, Rank.Eight, 0),  // 8♠ (trump rank in trump suit)
      Card.createCard(Suit.Clubs, Rank.Eight, 1)    // 8♣ (trump rank in off-suit)
    ];

    gameLogger.info('test_cross_suit_cards', { cards: cards.map(c => `${c.rank}${c.suit} (cardId: ${c.commonId})`) }, 'Testing cards: ' + cards.map(c => `${c.rank}${c.suit} (cardId: ${c.commonId})`).join(', '));

    const combos = identifyCombos(cards, trumpInfo);
    const pairs = combos.filter(c => c.type === ComboType.Pair);

    gameLogger.info('test_pairs_found', { pairsCount: pairs.length }, 'Found pairs: ' + pairs.length);
    if (pairs.length > 0) {
      pairs.forEach(pair => {
        gameLogger.info('test_pair_details', { pairCards: pair.cards.map(c => `${c.rank}${c.suit} (${c.commonId})`) }, 'Pair: ' + pair.cards.map(c => `${c.rank}${c.suit} (${c.commonId})`).join(', '));
      });
    }

    // Should find 0 pairs because 8♠ and 8♣ have different cardIds
    expect(pairs).toHaveLength(0);
    
    // Should find 2 singles (one for each card)
    const singles = combos.filter(c => c.type === ComboType.Single);
    expect(singles).toHaveLength(2);
  });

  test('should form pairs between identical cards from different decks', () => {
    // Test scenario: 8♠-8♠ should form a pair (same cardId, different deckId)
    const trumpInfo: TrumpInfo = {
      trumpRank: Rank.Eight,
      trumpSuit: Suit.Spades
    };

    const cards = [
      Card.createCard(Suit.Spades, Rank.Eight, 0),  // 8♠ from deck 0
      Card.createCard(Suit.Spades, Rank.Eight, 1)   // 8♠ from deck 1
    ];

    gameLogger.info('test_identical_cards', { cards: cards.map(c => `${c.rank}${c.suit} (cardId: ${c.commonId}, deckId: ${c.deckId})`) }, 'Testing identical cards: ' + cards.map(c => `${c.rank}${c.suit} (cardId: ${c.commonId}, deckId: ${c.deckId})`).join(', '));

    const combos = identifyCombos(cards, trumpInfo);
    const pairs = combos.filter(c => c.type === ComboType.Pair);

    gameLogger.info('test_pairs_found', { pairsCount: pairs.length }, 'Found pairs: ' + pairs.length);
    if (pairs.length > 0) {
      pairs.forEach(pair => {
        gameLogger.info('test_pair_details', { pairCards: pair.cards.map(c => `${c.rank}${c.suit} (${c.commonId})`) }, 'Pair: ' + pair.cards.map(c => `${c.rank}${c.suit} (${c.commonId})`).join(', '));
      });
    }

    // Should find 1 pair because both cards have same cardId (Spades_Eight)
    expect(pairs).toHaveLength(1);
    expect(pairs[0].cards).toHaveLength(2);
    
    // Verify the pair uses isIdenticalTo logic
    expect(pairs[0].cards[0].isIdenticalTo(pairs[0].cards[1])).toBe(true);
  });

  test('should handle complex cross-suit trump scenarios correctly', () => {
    // Test scenario: Mix of trump rank cards in different suits
    const trumpInfo: TrumpInfo = {
      trumpRank: Rank.Two,
      trumpSuit: Suit.Hearts
    };

    const cards = [
      Card.createCard(Suit.Hearts, Rank.Two, 0),   // 2♥ (trump rank in trump suit)
      Card.createCard(Suit.Hearts, Rank.Two, 1),   // 2♥ (trump rank in trump suit) - should pair with above
      Card.createCard(Suit.Spades, Rank.Two, 0),   // 2♠ (trump rank in off-suit)
      Card.createCard(Suit.Clubs, Rank.Two, 0),    // 2♣ (trump rank in off-suit) - should NOT pair with 2♠
    ];

    const combos = identifyCombos(cards, trumpInfo);
    const pairs = combos.filter(c => c.type === ComboType.Pair);

    // Should find exactly 1 pair: 2♥-2♥
    expect(pairs).toHaveLength(1);
    
    // Verify the pair is the Hearts trump rank cards
    const heartsPair = pairs.find(p => 
      p.cards.every(card => card.suit === Suit.Hearts && card.rank === Rank.Two)
    );
    expect(heartsPair).toBeDefined();
    
    // Should NOT find pairs between different suits
    const crossSuitPair = pairs.find(p => 
      p.cards[0].suit !== p.cards[1].suit
    );
    expect(crossSuitPair).toBeUndefined();
  });
});