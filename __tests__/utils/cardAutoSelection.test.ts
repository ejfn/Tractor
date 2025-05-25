import {
  findPairCards,
  findTractorCards,
  getAutoSelectedCards
} from '../../src/utils/cardAutoSelection';
import { Card, Suit, Rank, TrumpInfo, JokerType, ComboType } from '../../src/types/game';
import { createCard, createJoker, createPair, createTrumpInfo } from '../helpers/testUtils';

describe('Card Auto-Selection Utils', () => {
  describe('findPairCards', () => {
    test('should find regular pair cards', () => {
      const hand = [
        createCard(Suit.Hearts, Rank.King, 'hk1'),
        createCard(Suit.Hearts, Rank.King, 'hk2'),
        createCard(Suit.Spades, Rank.Ace),
        createCard(Suit.Clubs, Rank.Five),
      ];
      
      const targetCard = hand[0]; // First King of Hearts
      const pairs = findPairCards(targetCard, hand);
      
      expect(pairs).toHaveLength(2);
      expect(pairs).toContain(hand[0]);
      expect(pairs).toContain(hand[1]);
    });

    test('should find joker pairs', () => {
      const hand = [
        createJoker(JokerType.Small, 'sj1'),
        createJoker(JokerType.Small, 'sj2'),
        createJoker(JokerType.Big),
        createCard(Suit.Hearts, Rank.Ace),
      ];
      
      const targetCard = hand[0]; // First Small Joker
      const pairs = findPairCards(targetCard, hand);
      
      expect(pairs).toHaveLength(2);
      expect(pairs).toContain(hand[0]);
      expect(pairs).toContain(hand[1]);
    });

    test('should return only target card if no pairs exist', () => {
      const hand = [
        createCard(Suit.Hearts, Rank.King),
        createCard(Suit.Spades, Rank.Queen),
        createCard(Suit.Clubs, Rank.Ace),
      ];
      
      const targetCard = hand[0];
      const pairs = findPairCards(targetCard, hand);
      
      expect(pairs).toHaveLength(1);
      expect(pairs).toContain(targetCard);
    });

    test('should not include cards of same rank but different suit', () => {
      const hand = [
        createCard(Suit.Hearts, Rank.King),
        createCard(Suit.Spades, Rank.King), // Same rank, different suit
        createCard(Suit.Clubs, Rank.Ace),
      ];
      
      const targetCard = hand[0];
      const pairs = findPairCards(targetCard, hand);
      
      expect(pairs).toHaveLength(1);
      expect(pairs).toContain(targetCard);
    });
  });

  describe('findTractorCards', () => {
    const trumpInfo = createTrumpInfo(Rank.Two, Suit.Spades, true);

    test('should find regular tractor (consecutive pairs)', () => {
      const hand = [
        ...createPair(Suit.Hearts, Rank.Seven),
        ...createPair(Suit.Hearts, Rank.Eight),
        createCard(Suit.Spades, Rank.Ace),
      ];
      
      const targetCard = hand[0]; // Seven of Hearts
      const tractor = findTractorCards(targetCard, hand, trumpInfo);
      
      expect(tractor).toHaveLength(4);
      // Should include both 7-7 and 8-8 pairs
      const ranks = tractor.map(c => c.rank);
      expect(ranks.filter(r => r === Rank.Seven)).toHaveLength(2);
      expect(ranks.filter(r => r === Rank.Eight)).toHaveLength(2);
    });

    test('should find joker tractor', () => {
      const hand = [
        createJoker(JokerType.Small, 'sj1'),
        createJoker(JokerType.Small, 'sj2'),
        createJoker(JokerType.Big, 'bj1'),
        createJoker(JokerType.Big, 'bj2'),
        createCard(Suit.Hearts, Rank.Ace),
      ];
      
      const targetCard = hand[0]; // Small Joker
      const tractor = findTractorCards(targetCard, hand, trumpInfo);
      
      expect(tractor).toHaveLength(4);
      expect(tractor.filter(c => c.joker === JokerType.Small)).toHaveLength(2);
      expect(tractor.filter(c => c.joker === JokerType.Big)).toHaveLength(2);
    });

    test('should return empty array for non-consecutive pairs', () => {
      const hand = [
        ...createPair(Suit.Hearts, Rank.Seven),
        ...createPair(Suit.Hearts, Rank.Nine), // Gap - no Eight
        createCard(Suit.Spades, Rank.Ace),
      ];
      
      const targetCard = hand[0]; // Seven of Hearts
      const tractor = findTractorCards(targetCard, hand, trumpInfo);
      
      expect(tractor).toHaveLength(0);
    });

    test('should return empty array for different suits', () => {
      const hand = [
        ...createPair(Suit.Hearts, Rank.Seven),
        ...createPair(Suit.Spades, Rank.Eight), // Different suit
      ];
      
      const targetCard = hand[0]; // Seven of Hearts
      const tractor = findTractorCards(targetCard, hand, trumpInfo);
      
      expect(tractor).toHaveLength(0);
    });

    test('should find longer tractors', () => {
      const hand = [
        ...createPair(Suit.Hearts, Rank.Five),
        ...createPair(Suit.Hearts, Rank.Six),
        ...createPair(Suit.Hearts, Rank.Seven),
        createCard(Suit.Spades, Rank.Ace),
      ];
      
      const targetCard = hand[0]; // Five of Hearts
      const tractor = findTractorCards(targetCard, hand, trumpInfo);
      
      expect(tractor).toHaveLength(6); // Three consecutive pairs
      const ranks = tractor.map(c => c.rank);
      expect(ranks.filter(r => r === Rank.Five)).toHaveLength(2);
      expect(ranks.filter(r => r === Rank.Six)).toHaveLength(2);
      expect(ranks.filter(r => r === Rank.Seven)).toHaveLength(2);
    });
  });

  describe('getAutoSelectedCards', () => {
    const trumpInfo = createTrumpInfo(Rank.Two, Suit.Spades, true);

    test('should toggle off already selected card', () => {
      const hand = [createCard(Suit.Hearts, Rank.King)];
      const currentSelection = [hand[0]];
      
      const result = getAutoSelectedCards(
        hand[0], hand, currentSelection, true, undefined, trumpInfo
      );
      
      expect(result).toHaveLength(0);
    });

    test('should auto-select pair when leading', () => {
      const hand = [
        ...createPair(Suit.Hearts, Rank.King),
        createCard(Suit.Spades, Rank.Ace),
      ];
      
      const result = getAutoSelectedCards(
        hand[0], hand, [], true, undefined, trumpInfo
      );
      
      expect(result).toHaveLength(2);
      expect(result).toContain(hand[0]);
      expect(result).toContain(hand[1]);
    });

    test('should auto-select tractor when leading', () => {
      const hand = [
        ...createPair(Suit.Hearts, Rank.Seven),
        ...createPair(Suit.Hearts, Rank.Eight),
        createCard(Suit.Spades, Rank.Ace),
      ];
      
      const result = getAutoSelectedCards(
        hand[0], hand, [], true, undefined, trumpInfo
      );
      
      expect(result).toHaveLength(4); // Tractor takes priority over pair
    });

    test('should auto-select pair when tapping card that can form pair while following pair', () => {
      const hand = [
        ...createPair(Suit.Hearts, Rank.King),
        createCard(Suit.Hearts, Rank.Ace),
      ];
      
      const leadingCombo = createPair(Suit.Spades, Rank.Queen);
      
      // Click on the first King - should auto-select both Kings
      const result = getAutoSelectedCards(
        hand[0], hand, [], false, leadingCombo, trumpInfo
      );
      
      expect(result).toHaveLength(2);
      expect(result).toContain(hand[0]);
      expect(result).toContain(hand[1]);
    });

    test('should auto-select tractor when tapping card that can form tractor while following tractor', () => {
      const hand = [
        ...createPair(Suit.Hearts, Rank.Seven),
        ...createPair(Suit.Hearts, Rank.Eight),
        createCard(Suit.Hearts, Rank.Nine),
      ];
      
      const leadingCombo = [
        ...createPair(Suit.Spades, Rank.King),
        ...createPair(Suit.Spades, Rank.Ace)
      ];
      
      // Click on Seven of Hearts - should auto-select the 7-7-8-8 tractor
      const result = getAutoSelectedCards(
        hand[0], hand, [], false, leadingCombo, trumpInfo
      );
      
      expect(result).toHaveLength(4);
    });

    test('should select single card when no combinations available', () => {
      const hand = [
        createCard(Suit.Hearts, Rank.King),
        createCard(Suit.Spades, Rank.Queen),
        createCard(Suit.Clubs, Rank.Ace),
      ];
      
      const result = getAutoSelectedCards(
        hand[0], hand, [], true, undefined, trumpInfo
      );
      
      expect(result).toHaveLength(1);
      expect(result).toContain(hand[0]);
    });

    test('should handle trump declaration mode by appending to selection', () => {
      const hand = [createCard(Suit.Hearts, Rank.Two)];
      const trumpInfoUndeclared = createTrumpInfo(Rank.Two, undefined, false);
      const existingSelection = [createCard(Suit.Spades, Rank.King)];
      
      const result = getAutoSelectedCards(
        hand[0], hand, existingSelection, true, undefined, trumpInfoUndeclared
      );
      
      expect(result).toHaveLength(2);
      expect(result).toContain(hand[0]);
      expect(result).toContain(existingSelection[0]);
    });

    test('should append auto-selected pair to existing selection', () => {
      const hand = [
        ...createPair(Suit.Hearts, Rank.King),
        createCard(Suit.Spades, Rank.Ace),
      ];
      const existingSelection = [createCard(Suit.Clubs, Rank.Queen)];
      
      const result = getAutoSelectedCards(
        hand[0], hand, existingSelection, true, undefined, trumpInfo
      );
      
      expect(result).toHaveLength(3); // existing + pair
      expect(result).toContain(existingSelection[0]); // Keep existing
      expect(result).toContain(hand[0]); // Add pair
      expect(result).toContain(hand[1]);
    });

    test('should append auto-selected tractor to existing selection', () => {
      const hand = [
        ...createPair(Suit.Hearts, Rank.Seven),
        ...createPair(Suit.Hearts, Rank.Eight),
        createCard(Suit.Spades, Rank.Ace),
      ];
      const existingSelection = [createCard(Suit.Clubs, Rank.Queen)];
      
      const result = getAutoSelectedCards(
        hand[0], hand, existingSelection, true, undefined, trumpInfo
      );
      
      expect(result).toHaveLength(5); // existing + tractor
      expect(result).toContain(existingSelection[0]); // Keep existing
      // Should contain all tractor cards
      expect(result).toContain(hand[0]);
      expect(result).toContain(hand[1]);
      expect(result).toContain(hand[2]);
      expect(result).toContain(hand[3]);
    });

    test('should not add duplicate cards when appending', () => {
      const pairCards = createPair(Suit.Hearts, Rank.King);
      const hand = [...pairCards, createCard(Suit.Spades, Rank.Ace)];
      const existingSelection = [pairCards[1]]; // Already have second card of pair
      
      const result = getAutoSelectedCards(
        pairCards[0], hand, existingSelection, true, undefined, trumpInfo
      );
      
      expect(result).toHaveLength(2); // Should not duplicate
      expect(result).toContain(pairCards[0]);
      expect(result).toContain(pairCards[1]);
    });

    test('should fall back to single selection when following pair but clicked card cannot form pair', () => {
      const hand = [
        createCard(Suit.Hearts, Rank.King),
        createCard(Suit.Spades, Rank.Queen),
      ];
      
      const leadingCombo = createPair(Suit.Clubs, Rank.Ace);
      
      // Click on King of Hearts - no pair available, should select single card
      const result = getAutoSelectedCards(
        hand[0], hand, [], false, leadingCombo, trumpInfo
      );
      
      expect(result).toHaveLength(1);
      expect(result).toContain(hand[0]);
    });

    test('should fall back to single selection when following tractor but clicked card cannot form tractor', () => {
      const hand = [
        createCard(Suit.Hearts, Rank.King),
        createCard(Suit.Spades, Rank.Queen),
        createCard(Suit.Clubs, Rank.Ace),
      ];
      
      const leadingCombo = [
        ...createPair(Suit.Spades, Rank.King),
        ...createPair(Suit.Spades, Rank.Ace)
      ];
      
      // Click on King of Hearts - no tractor available, should select single card
      const result = getAutoSelectedCards(
        hand[0], hand, [], false, leadingCombo, trumpInfo
      );
      
      expect(result).toHaveLength(1);
      expect(result).toContain(hand[0]);
    });
  });

});