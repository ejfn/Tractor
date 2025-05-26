import {
  DeclarationType,
  TrumpDeclaration,
  getDeclarationStrength,
  canOverrideDeclaration,
  validateDeclarationCards,
  detectPossibleDeclarations
} from '../../src/types/trumpDeclaration';
import { PlayerId, Rank, Suit, JokerType } from '../../src/types';
import { createCard } from '../helpers/cards';

describe('Trump Declaration Hierarchy System', () => {
  const trumpRank = Rank.Two;

  describe('Declaration Strength', () => {
    test('should return correct strength values', () => {
      expect(getDeclarationStrength(DeclarationType.Single)).toBe(1);
      expect(getDeclarationStrength(DeclarationType.Pair)).toBe(2);
      expect(getDeclarationStrength(DeclarationType.JokerPair)).toBe(3);
    });
  });

  describe('Declaration Override Rules', () => {
    test('should allow any declaration when no current declaration exists', () => {
      const newDeclaration: TrumpDeclaration = {
        playerId: PlayerId.Human,
        rank: trumpRank,
        suit: Suit.Spades,
        type: DeclarationType.Single,
        cards: [createCard(Suit.Spades, trumpRank)],
        timestamp: Date.now()
      };

      expect(canOverrideDeclaration(undefined, newDeclaration)).toBe(true);
    });

    test('same player can strengthen in same suit only', () => {
      const currentDeclaration: TrumpDeclaration = {
        playerId: PlayerId.Human,
        rank: trumpRank,
        suit: Suit.Spades,
        type: DeclarationType.Single,
        cards: [createCard(Suit.Spades, trumpRank)],
        timestamp: Date.now()
      };

      // Same player, same suit, stronger combination - ALLOWED
      const strengthenSameSuit: TrumpDeclaration = {
        playerId: PlayerId.Human,
        rank: trumpRank,
        suit: Suit.Spades,
        type: DeclarationType.Pair,
        cards: [createCard(Suit.Spades, trumpRank), createCard(Suit.Spades, trumpRank)],
        timestamp: Date.now() + 1
      };

      expect(canOverrideDeclaration(currentDeclaration, strengthenSameSuit)).toBe(true);

      // Same player, different suit, stronger combination - NOT ALLOWED
      const strengthenDifferentSuit: TrumpDeclaration = {
        playerId: PlayerId.Human,
        rank: trumpRank,
        suit: Suit.Hearts,
        type: DeclarationType.Pair,
        cards: [createCard(Suit.Hearts, trumpRank), createCard(Suit.Hearts, trumpRank)],
        timestamp: Date.now() + 1
      };

      expect(canOverrideDeclaration(currentDeclaration, strengthenDifferentSuit)).toBe(false);
    });

    test('different player can override with any suit if stronger', () => {
      const currentDeclaration: TrumpDeclaration = {
        playerId: PlayerId.Human,
        rank: trumpRank,
        suit: Suit.Spades,
        type: DeclarationType.Single,
        cards: [createCard(Suit.Spades, trumpRank)],
        timestamp: Date.now()
      };

      // Different player, different suit, stronger combination - ALLOWED
      const overrideDifferentSuit: TrumpDeclaration = {
        playerId: PlayerId.Bot1,
        rank: trumpRank,
        suit: Suit.Hearts,
        type: DeclarationType.Pair,
        cards: [createCard(Suit.Hearts, trumpRank), createCard(Suit.Hearts, trumpRank)],
        timestamp: Date.now() + 1
      };

      expect(canOverrideDeclaration(currentDeclaration, overrideDifferentSuit)).toBe(true);

      // Different player, same suit, stronger combination - ALLOWED
      const overrideSameSuit: TrumpDeclaration = {
        playerId: PlayerId.Bot1,
        rank: trumpRank,
        suit: Suit.Spades,
        type: DeclarationType.Pair,
        cards: [createCard(Suit.Spades, trumpRank), createCard(Suit.Spades, trumpRank)],
        timestamp: Date.now() + 1
      };

      expect(canOverrideDeclaration(currentDeclaration, overrideSameSuit)).toBe(true);

      // Different player, weaker combination - NOT ALLOWED
      const weakerOverride: TrumpDeclaration = {
        playerId: PlayerId.Bot1,
        rank: trumpRank,
        suit: Suit.Hearts,
        type: DeclarationType.Single,
        cards: [createCard(Suit.Hearts, trumpRank)],
        timestamp: Date.now() + 1
      };

      expect(canOverrideDeclaration(currentDeclaration, weakerOverride)).toBe(false);
    });

    test('joker pair beats any trump rank pair', () => {
      const trumpRankPair: TrumpDeclaration = {
        playerId: PlayerId.Human,
        rank: trumpRank,
        suit: Suit.Spades,
        type: DeclarationType.Pair,
        cards: [createCard(Suit.Spades, trumpRank), createCard(Suit.Spades, trumpRank)],
        timestamp: Date.now()
      };

      const jokerPair: TrumpDeclaration = {
        playerId: PlayerId.Bot1,
        rank: trumpRank, // Rank doesn't matter for jokers
        suit: Suit.Spades, // Suit doesn't matter for jokers
        type: DeclarationType.JokerPair,
        cards: [
          { suit: undefined, rank: undefined, joker: JokerType.Small, id: 'sj1', points: 0 },
          { suit: undefined, rank: undefined, joker: JokerType.Big, id: 'bj1', points: 0 }
        ],
        timestamp: Date.now() + 1
      };

      expect(canOverrideDeclaration(trumpRankPair, jokerPair)).toBe(true);
    });
  });

  describe('Declaration Card Validation', () => {
    test('should validate single declarations', () => {
      const validSingle = [createCard(Suit.Spades, trumpRank)];
      expect(validateDeclarationCards(validSingle, DeclarationType.Single, trumpRank)).toBe(true);

      const invalidSingle = [createCard(Suit.Spades, Rank.Three)];
      expect(validateDeclarationCards(invalidSingle, DeclarationType.Single, trumpRank)).toBe(false);

      const tooManyCards = [createCard(Suit.Spades, trumpRank), createCard(Suit.Hearts, trumpRank)];
      expect(validateDeclarationCards(tooManyCards, DeclarationType.Single, trumpRank)).toBe(false);
    });

    test('should validate pair declarations', () => {
      // Valid trump rank pair (same suit)
      const validPair = [createCard(Suit.Spades, trumpRank), createCard(Suit.Spades, trumpRank)];
      expect(validateDeclarationCards(validPair, DeclarationType.Pair, trumpRank)).toBe(true);

      // Invalid: different suits
      const differentSuits = [createCard(Suit.Spades, trumpRank), createCard(Suit.Hearts, trumpRank)];
      expect(validateDeclarationCards(differentSuits, DeclarationType.Pair, trumpRank)).toBe(false);

      // Invalid: wrong rank
      const wrongRank = [createCard(Suit.Spades, Rank.Three), createCard(Suit.Spades, Rank.Three)];
      expect(validateDeclarationCards(wrongRank, DeclarationType.Pair, trumpRank)).toBe(false);

      // Valid: joker pair
      const jokerPair = [
        { suit: undefined, rank: undefined, joker: JokerType.Small, id: 'sj1', points: 0 },
        { suit: undefined, rank: undefined, joker: JokerType.Big, id: 'bj1', points: 0 }
      ];
      expect(validateDeclarationCards(jokerPair, DeclarationType.Pair, trumpRank)).toBe(true);
    });

    test('should validate joker pair declarations', () => {
      const validJokerPair = [
        { suit: undefined, rank: undefined, joker: JokerType.Small, id: 'sj1', points: 0 },
        { suit: undefined, rank: undefined, joker: JokerType.Big, id: 'bj1', points: 0 }
      ];
      expect(validateDeclarationCards(validJokerPair, DeclarationType.JokerPair, trumpRank)).toBe(true);

      const invalidMixed = [
        createCard(Suit.Spades, trumpRank),
        { suit: undefined, rank: undefined, joker: JokerType.Small, id: 'sj1', points: 0 }
      ];
      expect(validateDeclarationCards(invalidMixed, DeclarationType.JokerPair, trumpRank)).toBe(false);
    });
  });

  describe('Declaration Detection', () => {
    test('should detect possible declarations from hand', () => {
      const hand = [
        createCard(Suit.Spades, trumpRank),
        createCard(Suit.Spades, trumpRank),
        createCard(Suit.Hearts, trumpRank),
        { suit: undefined, rank: undefined, joker: JokerType.Small, id: 'sj1', points: 0 },
        { suit: undefined, rank: undefined, joker: JokerType.Big, id: 'bj1', points: 0 },
        createCard(Suit.Clubs, Rank.Ace)
      ];

      const declarations = detectPossibleDeclarations(hand, trumpRank);

      // Should find joker pair (strongest), spades pair, and hearts single
      expect(declarations).toHaveLength(3);
      
      // Joker pair should be first (strongest)
      expect(declarations[0].type).toBe(DeclarationType.JokerPair);
      
      // Spades pair should be second
      expect(declarations[1].type).toBe(DeclarationType.Pair);
      expect(declarations[1].suit).toBe(Suit.Spades);
      
      // Hearts single should be third
      expect(declarations[2].type).toBe(DeclarationType.Single);
      expect(declarations[2].suit).toBe(Suit.Hearts);
    });

    test('should handle hand with no declarable cards', () => {
      const hand = [
        createCard(Suit.Spades, Rank.Ace),
        createCard(Suit.Hearts, Rank.King),
        createCard(Suit.Clubs, Rank.Queen)
      ];

      const declarations = detectPossibleDeclarations(hand, trumpRank);
      expect(declarations).toHaveLength(0);
    });
  });
});