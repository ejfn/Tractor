import { describe, it, expect, beforeEach } from '@jest/globals';
import { Card } from '../../src/types/card';
import { ComboType, Rank, Suit, TrumpInfo } from '../../src/types';
import { isTrump } from '../../src/game/gameHelpers';
import { analyzeMultiComboComponents, getMultiComboStructure, validateMultiComboSelection } from '../../src/game/multiComboAnalysis';

describe('Multi-Combo Structure Analysis Tests', () => {
  let trumpInfo: TrumpInfo;

  beforeEach(() => {
    trumpInfo = {
      trumpRank: Rank.Two,
      trumpSuit: Suit.Spades,
    };
  });

  describe('Multi-Combo Component Analysis', () => {
    it('Should correctly analyze tractor + singles structure', () => {
      // Create cards: A-A-K-K-Q-J (tractor + singles)
      const spadeApair = Card.createPair(Suit.Spades, Rank.Ace);
      const spadeKpair = Card.createPair(Suit.Spades, Rank.King);
      const spadeQ = Card.createCard(Suit.Spades, Rank.Queen, 0);
      const spadeJ = Card.createCard(Suit.Spades, Rank.Jack, 0);
      
      const hand = [...spadeApair, ...spadeKpair, spadeQ, spadeJ];
      
      // Analyze multi-combo structure
      const components = analyzeMultiComboComponents(hand, trumpInfo);
      const structure = getMultiComboStructure(components, Suit.Spades, true);
      
      expect(structure.components.tractors).toBe(1); // One tractor: A-A-K-K
      expect(structure.components.pairs).toBe(0); // No additional pairs
      expect(structure.components.singles).toBe(2); // Two singles: Q, J
      expect(structure.totalLength).toBe(6);
    });

    it('Should correctly analyze tractor + single structure', () => {
      // Create 5 cards: A-A-K-K-Q (tractor + single)
      const spadeApair = Card.createPair(Suit.Spades, Rank.Ace);
      const spadeKpair = Card.createPair(Suit.Spades, Rank.King);
      const spadeQ = Card.createCard(Suit.Spades, Rank.Queen, 0);
      
      const hand = [...spadeApair, ...spadeKpair, spadeQ];
      
      // Analyze structure components
      const components = analyzeMultiComboComponents(hand, trumpInfo);
      const structure = getMultiComboStructure(components, Suit.Spades, true);
      
      expect(structure.components.tractors).toBe(1); // One tractor: A-A-K-K
      expect(structure.components.pairs).toBe(0); // No additional pairs
      expect(structure.components.singles).toBe(1); // One single: Q
      expect(structure.totalLength).toBe(5);
    });

    it('Should correctly analyze pair + multiple singles structure', () => {
      // Create cards: K♠-K♠ + Q♠ + 9♠ + 7♠ (pair + singles)
      const spadeKpair = Card.createPair(Suit.Spades, Rank.King);
      const spadeQ = Card.createCard(Suit.Spades, Rank.Queen, 0);
      const spade9 = Card.createCard(Suit.Spades, Rank.Nine, 0);
      const spade7 = Card.createCard(Suit.Spades, Rank.Seven, 0);
      
      const hand = [...spadeKpair, spadeQ, spade9, spade7];
      
      // Analyze structure components
      const components = analyzeMultiComboComponents(hand, trumpInfo);
      const structure = getMultiComboStructure(components, Suit.Spades, true);
      
      expect(structure.components.tractors).toBe(0); // No tractors
      expect(structure.components.pairs).toBe(1); // One pair: K-K
      expect(structure.components.singles).toBe(3); // Three singles: Q, 9, 7
      expect(structure.totalLength).toBe(5);
    });

    it('Should correctly analyze complex tractor + pairs + single structure', () => {
      // Create cards: A♠-A♠-K♠-K♠ + 9♠-9♠ + 7♠-7♠ + 5♠ (tractor + pairs + single)
      const spadeApair = Card.createPair(Suit.Spades, Rank.Ace);
      const spadeKpair = Card.createPair(Suit.Spades, Rank.King);
      const spade9pair = Card.createPair(Suit.Spades, Rank.Nine);
      const spade7pair = Card.createPair(Suit.Spades, Rank.Seven);
      const spade5 = Card.createCard(Suit.Spades, Rank.Five, 0);
      
      const hand = [...spadeApair, ...spadeKpair, ...spade9pair, ...spade7pair, spade5];
      
      // Analyze structure components
      const components = analyzeMultiComboComponents(hand, trumpInfo);
      const structure = getMultiComboStructure(components, Suit.Spades, true);
      
      expect(structure.components.tractors).toBe(1); // One tractor: A-A-K-K
      expect(structure.components.pairs).toBe(2); // Two pairs: 9-9, 7-7
      expect(structure.components.singles).toBe(1); // One single: 5
      expect(structure.totalLength).toBe(9);
    });
  });

  describe('Trump Multi-Combo Analysis', () => {
    it('Should correctly analyze trump multi-combo structure', () => {
      // Create trump multi-combo with trump rank cards + trump suit card
      const trump2Hearts = Card.createPair(Suit.Hearts, Rank.Two); // Trump rank pair
      const trumpSpade5 = Card.createCard(Suit.Spades, Rank.Five, 0); // Trump suit single
      
      const hand = [...trump2Hearts, trumpSpade5];
      
      // Verify cards are trump
      expect(isTrump(trump2Hearts[0], trumpInfo)).toBe(true);
      expect(isTrump(trumpSpade5, trumpInfo)).toBe(true);
      
      // Analyze trump multi-combo structure
      const components = analyzeMultiComboComponents(hand, trumpInfo);
      const structure = getMultiComboStructure(components, Suit.Spades, true); // Trump multi-combo
      
      expect(structure.components.pairs).toBe(1); // One trump rank pair
      expect(structure.components.singles).toBe(1); // One trump suit single
      expect(structure.totalLength).toBe(3);
    });
  });

  describe('Structure Validation', () => {
    it('Should validate well-structured multi-combos', () => {
      // Create a well-structured multi-combo: tractor + singles
      const spadeApair = Card.createPair(Suit.Spades, Rank.Ace);
      const spadeKpair = Card.createPair(Suit.Spades, Rank.King);
      const spadeQ = Card.createCard(Suit.Spades, Rank.Queen, 0);
      const spadeJ = Card.createCard(Suit.Spades, Rank.Jack, 0);
      const spade10 = Card.createCard(Suit.Spades, Rank.Ten, 0);
      
      const hand = [...spadeApair, ...spadeKpair, spadeQ, spadeJ, spade10];
      
      // Should be considered well-structured (3+ singles)
      const components = analyzeMultiComboComponents(hand, trumpInfo);
      const structure = getMultiComboStructure(components, Suit.Spades, true);
      
      expect(structure.components.tractors).toBe(1);
      expect(structure.components.singles).toBe(3);
    });

    it('Should identify poorly structured multi-combos', () => {
      // Create a poorly structured multi-combo: pair + single
      const spadeKpair = Card.createPair(Suit.Spades, Rank.King);
      const spadeQ = Card.createCard(Suit.Spades, Rank.Queen, 0);
      
      const hand = [...spadeKpair, spadeQ];
      
      // Should be considered poorly structured (only 1 single)
      const components = analyzeMultiComboComponents(hand, trumpInfo);
      const structure = getMultiComboStructure(components, Suit.Spades, true);
      
      expect(structure.components.pairs).toBe(1);
      expect(structure.components.singles).toBe(1);
    });
  });
});