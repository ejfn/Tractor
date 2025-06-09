import {
  getComboType,
  identifyCombos,
  isTrump,
  compareCards,
  compareCardCombos
} from '../../src/game/gameLogic';
import {
  Card,
  ComboType,
  JokerType,
  Rank,
  Suit,
  TrumpInfo
} from "../../src/types";
import { createCard, createJoker } from '../helpers/cards';

/**
 * Comprehensive Trump System Tests
 * 
 * This file consolidates all trump-related game logic tests including:
 * - Trump pair formation and hierarchy
 * - Trump following rules and validation
 * - Trump strength calculations and comparison
 * - Joker trump integration
 */

describe('Trump System', () => {
  let trumpInfo: TrumpInfo;

  beforeEach(() => {
    trumpInfo = {
      trumpRank: Rank.Four,
      trumpSuit: Suit.Spades,
    };
  });

  describe('Trump Pair Formation', () => {
    test('should identify trump rank pairs in trump suit', () => {
      const fourSpades1 = createCard(Suit.Spades, Rank.Four, 'Spades_4_1');
      const fourSpades2 = createCard(Suit.Spades, Rank.Four, 'Spades_4_2');
      
      const cards = [fourSpades1, fourSpades2];
      const combos = identifyCombos(cards, trumpInfo);
      const pairCombo = combos.find(combo => combo.type === ComboType.Pair);
      
      expect(pairCombo).toBeDefined();
      expect(pairCombo!.type).toBe(ComboType.Pair);
      expect(pairCombo!.cards).toEqual([fourSpades1, fourSpades2]);
    });

    test('should identify trump rank pairs in non-trump suits', () => {
      const fourDiamonds1 = createCard(Suit.Diamonds, Rank.Four, 'Diamonds_4_1');
      const fourDiamonds2 = createCard(Suit.Diamonds, Rank.Four, 'Diamonds_4_2');
      
      const cards = [fourDiamonds1, fourDiamonds2];
      const combos = identifyCombos(cards, trumpInfo);
      const pairCombo = combos.find(combo => combo.type === ComboType.Pair);
      
      expect(pairCombo).toBeDefined();
      expect(pairCombo!.type).toBe(ComboType.Pair);
      expect(pairCombo!.cards).toEqual([fourDiamonds1, fourDiamonds2]);
    });

    test('should identify Big Joker pairs', () => {
      const bigJoker1 = createJoker(JokerType.Big, 'BJ1');
      const bigJoker2 = createJoker(JokerType.Big, 'BJ2');
      
      const cards = [bigJoker1, bigJoker2];
      const combos = identifyCombos(cards, trumpInfo);
      const pairCombo = combos.find(combo => combo.type === ComboType.Pair);
      
      expect(pairCombo).toBeDefined();
      expect(pairCombo!.type).toBe(ComboType.Pair);
      expect(pairCombo!.cards).toEqual([bigJoker1, bigJoker2]);
    });

    test('should identify Small Joker pairs', () => {
      const smallJoker1 = createJoker(JokerType.Small, 'SJ1');
      const smallJoker2 = createJoker(JokerType.Small, 'SJ2');
      
      const cards = [smallJoker1, smallJoker2];
      const combos = identifyCombos(cards, trumpInfo);
      const pairCombo = combos.find(combo => combo.type === ComboType.Pair);
      
      expect(pairCombo).toBeDefined();
      expect(pairCombo!.type).toBe(ComboType.Pair);
      expect(pairCombo!.cards).toEqual([smallJoker1, smallJoker2]);
    });

    test('should identify trump rank pairs across suits', () => {
      const fourSpades = createCard(Suit.Spades, Rank.Four, 'Spades_4');
      const fourDiamonds = createCard(Suit.Diamonds, Rank.Four, 'Diamonds_4');
      
      const cards = [fourSpades, fourDiamonds];
      const combos = identifyCombos(cards, trumpInfo);
      
      // Should identify as two singles AND a cross-suit trump rank pair
      // This is correct behavior according to Tractor rules - all trump cards are treated as same suit
      expect(combos).toHaveLength(3); // 2 singles + 1 pair
      expect(combos.filter(combo => combo.type === ComboType.Single)).toHaveLength(2);
      expect(combos.filter(combo => combo.type === ComboType.Pair)).toHaveLength(1);
      
      // Verify the pair contains both trump rank cards
      const pairCombo = combos.find(combo => combo.type === ComboType.Pair);
      expect(pairCombo!.cards).toHaveLength(2);
      expect(pairCombo!.cards.map(c => c.id).sort()).toEqual(['Spades_4', 'Diamonds_4'].sort());
    });

    test('should not identify mixed joker pairs', () => {
      const bigJoker = createJoker(JokerType.Big, 'BJ');
      const smallJoker = createJoker(JokerType.Small, 'SJ');
      
      const cards = [bigJoker, smallJoker];
      const combos = identifyCombos(cards, trumpInfo);
      
      // Should identify as two singles, not a pair
      expect(combos).toHaveLength(2);
      expect(combos.every(combo => combo.type === ComboType.Single)).toBe(true);
    });
  });

  describe('Trump Hierarchy', () => {
    test('should order trump cards correctly: BJ > SJ > trump rank in trump suit > trump rank in other suits > trump suit cards', () => {
      const trumpInfo: TrumpInfo = { trumpRank: Rank.Two, trumpSuit: Suit.Hearts };
      
      const bigJoker = createJoker(JokerType.Big);
      const smallJoker = createJoker(JokerType.Small);
      const twoHearts = createCard(Suit.Hearts, Rank.Two); // Trump rank in trump suit
      const twoSpades = createCard(Suit.Spades, Rank.Two); // Trump rank in other suit
      const aceHearts = createCard(Suit.Hearts, Rank.Ace); // Trump suit card
      
      // Big Joker > Small Joker
      expect(compareCards(bigJoker, smallJoker, trumpInfo)).toBeGreaterThan(0);
      
      // Small Joker > Trump rank in trump suit
      expect(compareCards(smallJoker, twoHearts, trumpInfo)).toBeGreaterThan(0);
      
      // Trump rank in trump suit > Trump rank in other suits
      expect(compareCards(twoHearts, twoSpades, trumpInfo)).toBeGreaterThan(0);
      
      // Trump rank in other suits > Trump suit cards
      expect(compareCards(twoSpades, aceHearts, trumpInfo)).toBeGreaterThan(0);
    });

    test('should handle trump rank cards in different non-trump suits as equal strength', () => {
      const trumpInfo: TrumpInfo = { trumpRank: Rank.Two, trumpSuit: Suit.Hearts };
      
      const twoSpades = createCard(Suit.Spades, Rank.Two);
      const twoClubs = createCard(Suit.Clubs, Rank.Two);
      const twoDiamonds = createCard(Suit.Diamonds, Rank.Two);
      
      // All trump rank cards in non-trump suits should be equal
      expect(compareCards(twoSpades, twoClubs, trumpInfo)).toBe(0);
      expect(compareCards(twoClubs, twoDiamonds, trumpInfo)).toBe(0);
      expect(compareCards(twoSpades, twoDiamonds, trumpInfo)).toBe(0);
    });

    test('should properly rank trump suit cards by rank', () => {
      const trumpInfo: TrumpInfo = { trumpRank: Rank.Two, trumpSuit: Suit.Hearts };
      
      const aceHearts = createCard(Suit.Hearts, Rank.Ace);
      const kingHearts = createCard(Suit.Hearts, Rank.King);
      const threeHearts = createCard(Suit.Hearts, Rank.Three);
      
      // Higher ranks beat lower ranks within trump suit
      expect(compareCards(aceHearts, kingHearts, trumpInfo)).toBeGreaterThan(0);
      expect(compareCards(kingHearts, threeHearts, trumpInfo)).toBeGreaterThan(0);
      expect(compareCards(aceHearts, threeHearts, trumpInfo)).toBeGreaterThan(0);
    });
  });

  describe('Trump Following Rules', () => {
    test('should require trump cards when trump is led', () => {
      const trumpInfo: TrumpInfo = { trumpRank: Rank.Two, trumpSuit: Suit.Hearts };
      
      const bigJoker = createJoker(JokerType.Big);
      const hand = [
        createCard(Suit.Hearts, Rank.Ace), // Trump suit card
        createCard(Suit.Spades, Rank.Two), // Trump rank card
        createCard(Suit.Clubs, Rank.King), // Non-trump card
        bigJoker
      ];
      
      // When trump is led, player must follow with trump if they have any
      const trumpCards = hand.filter(card => isTrump(card, trumpInfo));
      expect(trumpCards).toHaveLength(3); // Hearts Ace, Spades Two, Big Joker
      
      // All of these are valid trump plays
      trumpCards.forEach(card => {
        expect(isTrump(card, trumpInfo)).toBe(true);
      });
    });

    test('should allow non-trump when no trump cards available', () => {
      const trumpInfo: TrumpInfo = { trumpRank: Rank.Two, trumpSuit: Suit.Hearts };
      
      const hand = [
        createCard(Suit.Spades, Rank.Ace),
        createCard(Suit.Clubs, Rank.King),
        createCard(Suit.Diamonds, Rank.Queen)
      ];
      
      // When player has no trump, they can play any card
      const trumpCards = hand.filter(card => isTrump(card, trumpInfo));
      expect(trumpCards).toHaveLength(0);
      
      // All non-trump cards are valid when no trump available
      hand.forEach(card => {
        expect(isTrump(card, trumpInfo)).toBe(false);
      });
    });

    test('should handle trump pair requirements correctly', () => {
      const trumpInfo: TrumpInfo = { trumpRank: Rank.Two, trumpSuit: Suit.Hearts };
      
      const hand = [
        createCard(Suit.Hearts, Rank.Ace, 'H_A_1'),
        createCard(Suit.Hearts, Rank.Ace, 'H_A_2'), // Trump pair
        createCard(Suit.Spades, Rank.Two, 'S_2_1'),
        createCard(Suit.Spades, Rank.Two, 'S_2_2'), // Trump rank pair
        createCard(Suit.Clubs, Rank.King, 'C_K')
      ];
      
      // Should identify trump pairs correctly
      const combos = identifyCombos(hand.slice(0, 2), trumpInfo); // Hearts Ace pair
      const pairCombo = combos.find(combo => combo.type === ComboType.Pair);
      expect(pairCombo).toBeDefined();
      expect(pairCombo!.type).toBe(ComboType.Pair);
      
      const rankPairCombos = identifyCombos(hand.slice(2, 4), trumpInfo); // Spades Two pair
      const rankPairCombo = rankPairCombos.find(combo => combo.type === ComboType.Pair);
      expect(rankPairCombo).toBeDefined();
      expect(rankPairCombo!.type).toBe(ComboType.Pair);
    });
  });

  describe('Trump Strength Calculations', () => {
    test('should calculate trump combo strength higher than non-trump', () => {
      const trumpInfo: TrumpInfo = { trumpRank: Rank.Two, trumpSuit: Suit.Hearts };
      
      const trumpCards = [
        createCard(Suit.Hearts, Rank.Three, 'H_3_1'),
        createCard(Suit.Hearts, Rank.Three, 'H_3_2')
      ];
      
      const nonTrumpCards = [
        createCard(Suit.Spades, Rank.Ace, 'S_A_1'),
        createCard(Suit.Spades, Rank.Ace, 'S_A_2')
      ];
      
      // Get combo types
      const trumpCombos = identifyCombos(trumpCards, trumpInfo);
      const nonTrumpCombos = identifyCombos(nonTrumpCards, trumpInfo);
      
      // Trump combo should beat non-trump combo of same type
      const comparison = compareCardCombos(trumpCards, nonTrumpCards, trumpInfo);
      expect(comparison).toBeGreaterThan(0);
    });

    test('should handle joker combinations as strongest trump', () => {
      const trumpInfo: TrumpInfo = { trumpRank: Rank.Two, trumpSuit: Suit.Hearts };
      
      const bigJokerCards = [
        createJoker(JokerType.Big, 'BJ1'),
        createJoker(JokerType.Big, 'BJ2')
      ];
      
      const trumpSuitCards = [
        createCard(Suit.Hearts, Rank.Ace, 'H_A_1'),
        createCard(Suit.Hearts, Rank.Ace, 'H_A_2')
      ];
      
      // Get combo types
      const bigJokerCombos = identifyCombos(bigJokerCards, trumpInfo);
      const trumpSuitCombos = identifyCombos(trumpSuitCards, trumpInfo);
      
      // Big Joker pair should beat trump suit pair
      const comparison = compareCardCombos(bigJokerCards, trumpSuitCards, trumpInfo);
      expect(comparison).toBeGreaterThan(0);
    });

    test('should handle mixed trump combinations correctly', () => {
      const trumpInfo: TrumpInfo = { trumpRank: Rank.Two, trumpSuit: Suit.Hearts };
      
      // Test Small Joker pair vs Trump rank pair in trump suit
      const smallJokerCards = [
        createJoker(JokerType.Small, 'SJ1'),
        createJoker(JokerType.Small, 'SJ2')
      ];
      
      const trumpRankCards = [
        createCard(Suit.Hearts, Rank.Two, 'H_2_1'),
        createCard(Suit.Hearts, Rank.Two, 'H_2_2')
      ];
      
      // Get combo types
      const smallJokerCombos = identifyCombos(smallJokerCards, trumpInfo);
      const trumpRankCombos = identifyCombos(trumpRankCards, trumpInfo);
      
      // Small Joker pair should beat trump rank pair
      const comparison = compareCardCombos(smallJokerCards, trumpRankCards, trumpInfo);
      expect(comparison).toBeGreaterThan(0);
    });
  });

  describe('Trump Validation and Edge Cases', () => {
    test('should handle no trump suit scenario', () => {
      const noSuitTrump: TrumpInfo = { trumpRank: Rank.Two };
      
      const twoHearts = createCard(Suit.Hearts, Rank.Two);
      const twoSpades = createCard(Suit.Spades, Rank.Two);
      const bigJoker = createJoker(JokerType.Big);
      const aceHearts = createCard(Suit.Hearts, Rank.Ace);
      
      // Trump rank cards and jokers should be trump
      expect(isTrump(twoHearts, noSuitTrump)).toBe(true);
      expect(isTrump(twoSpades, noSuitTrump)).toBe(true);
      expect(isTrump(bigJoker, noSuitTrump)).toBe(true);
      
      // Regular suit cards should not be trump
      expect(isTrump(aceHearts, noSuitTrump)).toBe(false);
    });

    test('should validate trump info consistency', () => {
      const trumpInfo: TrumpInfo = { trumpRank: Rank.Two, trumpSuit: Suit.Hearts };
      
      // Trump rank in trump suit should be highest trump card (after jokers)
      const twoHearts = createCard(Suit.Hearts, Rank.Two);
      const smallJoker = createJoker(JokerType.Small);
      const aceHearts = createCard(Suit.Hearts, Rank.Ace);
      
      expect(isTrump(twoHearts, trumpInfo)).toBe(true);
      expect(compareCards(smallJoker, twoHearts, trumpInfo)).toBeGreaterThan(0);
      expect(compareCards(twoHearts, aceHearts, trumpInfo)).toBeGreaterThan(0);
    });

    test('should handle empty trump scenarios gracefully', () => {
      const trumpInfo: TrumpInfo = { trumpRank: Rank.Two, trumpSuit: Suit.Hearts };
      
      const emptyCards: Card[] = [];
      const combos = identifyCombos(emptyCards, trumpInfo);
      
      expect(combos).toHaveLength(0);
    });

    test('should handle single card trump combinations', () => {
      const trumpInfo: TrumpInfo = { trumpRank: Rank.Two, trumpSuit: Suit.Hearts };
      
      const singleTrump = [createCard(Suit.Hearts, Rank.Two)];
      const combos = identifyCombos(singleTrump, trumpInfo);
      const singleCombo = combos.find(combo => combo.type === ComboType.Single);
      
      expect(singleCombo).toBeDefined();
      expect(singleCombo!.type).toBe(ComboType.Single);
      expect(isTrump(singleCombo!.cards[0], trumpInfo)).toBe(true);
    });
  });

  describe('Integration with Game Logic', () => {
    test('should integrate trump rules with combination detection', () => {
      const trumpInfo: TrumpInfo = { trumpRank: Rank.Two, trumpSuit: Suit.Hearts };
      
      const mixedCards = [
        createCard(Suit.Hearts, Rank.Two, 'H_2_1'),   // Trump rank in trump suit
        createCard(Suit.Hearts, Rank.Two, 'H_2_2'),   // Trump rank in trump suit (pair)
        createCard(Suit.Spades, Rank.Two, 'S_2_1'),   // Trump rank in other suit
        createCard(Suit.Hearts, Rank.Ace, 'H_A'),     // Trump suit card
        createCard(Suit.Spades, Rank.Ace, 'S_A'),     // Non-trump card
        createJoker(JokerType.Small, 'SJ')            // Joker
      ];
      
      const combos = identifyCombos(mixedCards.slice(0, 2), trumpInfo);
      const pairCombo = combos.find(combo => combo.type === ComboType.Pair);
      expect(pairCombo).toBeDefined();
      expect(pairCombo!.type).toBe(ComboType.Pair);
      
      // Verify all trump cards are correctly identified
      const trumpCards = mixedCards.filter(card => isTrump(card, trumpInfo));
      expect(trumpCards).toHaveLength(5); // All except Spades Ace
    });

    test('should work with complex trump hierarchies', () => {
      const trumpInfo: TrumpInfo = { trumpRank: Rank.Two, trumpSuit: Suit.Hearts };
      
      // Create a complex scenario with all trump types
      const cards = [
        createJoker(JokerType.Big, 'BJ'),
        createJoker(JokerType.Small, 'SJ'),
        createCard(Suit.Hearts, Rank.Two, 'H_2'),      // Trump rank in trump suit
        createCard(Suit.Spades, Rank.Two, 'S_2'),      // Trump rank in other suit
        createCard(Suit.Clubs, Rank.Two, 'C_2'),       // Trump rank in other suit
        createCard(Suit.Hearts, Rank.Ace, 'H_A'),      // Trump suit high card
        createCard(Suit.Hearts, Rank.Three, 'H_3'),    // Trump suit low card
      ];
      
      // Sort by trump strength (highest to lowest)
      const sortedCards = [...cards].sort((a, b) => compareCards(b, a, trumpInfo));
      
      // Verify correct trump hierarchy order
      expect(sortedCards[0].joker).toBe(JokerType.Big);
      expect(sortedCards[1].joker).toBe(JokerType.Small);
      expect(sortedCards[2].suit).toBe(Suit.Hearts);
      expect(sortedCards[2].rank).toBe(Rank.Two);
      expect([Suit.Spades, Suit.Clubs]).toContain(sortedCards[3].suit);
      expect([Suit.Spades, Suit.Clubs]).toContain(sortedCards[4].suit);
      expect(sortedCards[5].suit).toBe(Suit.Hearts);
      expect(sortedCards[5].rank).toBe(Rank.Ace);
      expect(sortedCards[6].suit).toBe(Suit.Hearts);
      expect(sortedCards[6].rank).toBe(Rank.Three);
    });
  });
});