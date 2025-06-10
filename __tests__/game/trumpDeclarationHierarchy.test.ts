import {
  DeclarationType,
  TrumpDeclaration,
  getDeclarationStrength,
  canOverrideDeclaration,
  validateDeclarationCards,
  detectPossibleDeclarations
} from '../../src/types/trumpDeclaration';
import { Card, PlayerId, Rank, Suit, JokerType } from '../../src/types';

describe('Trump Declaration Hierarchy System', () => {
  const trumpRank = Rank.Two;

  describe('Declaration Strength', () => {
    test('should return correct strength values', () => {
      expect(getDeclarationStrength(DeclarationType.Single)).toBe(1);
      expect(getDeclarationStrength(DeclarationType.Pair)).toBe(2);
      expect(getDeclarationStrength(DeclarationType.SmallJokerPair)).toBe(3);
      expect(getDeclarationStrength(DeclarationType.BigJokerPair)).toBe(4);
    });
  });

  describe('Declaration Override Rules', () => {
    test('should allow any declaration when no current declaration exists', () => {
      const newDeclaration: TrumpDeclaration = {
        playerId: PlayerId.Human,
        rank: trumpRank,
        suit: Suit.Spades,
        type: DeclarationType.Single,
        cards: [Card.createCard(Suit.Spades, trumpRank, 0)],
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
        cards: [Card.createCard(Suit.Spades, trumpRank, 0)],
        timestamp: Date.now()
      };

      // Same player, same suit, stronger combination - ALLOWED
      const strengthenSameSuit: TrumpDeclaration = {
        playerId: PlayerId.Human,
        rank: trumpRank,
        suit: Suit.Spades,
        type: DeclarationType.Pair,
        cards: Card.createPair(Suit.Spades, trumpRank),
        timestamp: Date.now() + 1
      };

      expect(canOverrideDeclaration(currentDeclaration, strengthenSameSuit)).toBe(true);

      // Same player, different suit, stronger combination - NOT ALLOWED
      const strengthenDifferentSuit: TrumpDeclaration = {
        playerId: PlayerId.Human,
        rank: trumpRank,
        suit: Suit.Hearts,
        type: DeclarationType.Pair,
        cards: Card.createPair(Suit.Hearts, trumpRank),
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
        cards: [Card.createCard(Suit.Spades, trumpRank, 0)],
        timestamp: Date.now()
      };

      // Different player, different suit, stronger combination - ALLOWED
      const overrideDifferentSuit: TrumpDeclaration = {
        playerId: PlayerId.Bot1,
        rank: trumpRank,
        suit: Suit.Hearts,
        type: DeclarationType.Pair,
        cards: Card.createPair(Suit.Hearts, trumpRank),
        timestamp: Date.now() + 1
      };

      expect(canOverrideDeclaration(currentDeclaration, overrideDifferentSuit)).toBe(true);

      // Different player, same suit, stronger combination - ALLOWED
      const overrideSameSuit: TrumpDeclaration = {
        playerId: PlayerId.Bot1,
        rank: trumpRank,
        suit: Suit.Spades,
        type: DeclarationType.Pair,
        cards: Card.createPair(Suit.Spades, trumpRank),
        timestamp: Date.now() + 1
      };

      expect(canOverrideDeclaration(currentDeclaration, overrideSameSuit)).toBe(true);

      // Different player, weaker combination - NOT ALLOWED
      const weakerOverride: TrumpDeclaration = {
        playerId: PlayerId.Bot1,
        rank: trumpRank,
        suit: Suit.Hearts,
        type: DeclarationType.Single,
        cards: [Card.createCard(Suit.Hearts, trumpRank, 0)],
        timestamp: Date.now() + 1
      };

      expect(canOverrideDeclaration(currentDeclaration, weakerOverride)).toBe(false);
    });

    test('equal strength declarations should NOT override each other', () => {
      // Current declaration: 2♣-2♣ (Pair, strength 2)
      const currentPairDeclaration: TrumpDeclaration = {
        playerId: PlayerId.Human,
        rank: trumpRank,
        suit: Suit.Clubs,
        type: DeclarationType.Pair,
        cards: Card.createPair(Suit.Clubs, trumpRank),
        timestamp: Date.now()
      };

      // Attempted override: 2♦-2♦ (also Pair, strength 2) - should NOT be allowed
      const equalStrengthPair: TrumpDeclaration = {
        playerId: PlayerId.Bot1,
        rank: trumpRank,
        suit: Suit.Diamonds,
        type: DeclarationType.Pair,
        cards: Card.createPair(Suit.Diamonds, trumpRank),
        timestamp: Date.now() + 1
      };

      expect(canOverrideDeclaration(currentPairDeclaration, equalStrengthPair)).toBe(false);

      // Another test case: Single vs Single should also not override
      const currentSingleDeclaration: TrumpDeclaration = {
        playerId: PlayerId.Human,
        rank: trumpRank,
        suit: Suit.Spades,
        type: DeclarationType.Single,
        cards: [Card.createCard(Suit.Spades, trumpRank, 0)],
        timestamp: Date.now()
      };

      const equalStrengthSingle: TrumpDeclaration = {
        playerId: PlayerId.Bot1,
        rank: trumpRank,
        suit: Suit.Hearts,
        type: DeclarationType.Single,
        cards: [Card.createCard(Suit.Hearts, trumpRank, 0)],
        timestamp: Date.now() + 1
      };

      expect(canOverrideDeclaration(currentSingleDeclaration, equalStrengthSingle)).toBe(false);
    });

    test('joker pair beats any trump rank pair', () => {
      const trumpRankPair: TrumpDeclaration = {
        playerId: PlayerId.Human,
        rank: trumpRank,
        suit: Suit.Spades,
        type: DeclarationType.Pair,
        cards: Card.createPair(Suit.Spades, trumpRank),
        timestamp: Date.now()
      };

      const jokerPair: TrumpDeclaration = {
        playerId: PlayerId.Bot1,
        rank: trumpRank, // Rank doesn't matter for jokers
        suit: Suit.Spades, // Suit doesn't matter for jokers
        type: DeclarationType.BigJokerPair,
        cards: [
          Card.createJoker(JokerType.Small, 0),
          Card.createJoker(JokerType.Big, 0)
        ],
        timestamp: Date.now() + 1
      };

      expect(canOverrideDeclaration(trumpRankPair, jokerPair)).toBe(true);
    });
  });

  describe('Declaration Card Validation', () => {
    test('should validate single declarations', () => {
      const validSingle = [Card.createCard(Suit.Spades, trumpRank, 0)];
      expect(validateDeclarationCards(validSingle, DeclarationType.Single, trumpRank)).toBe(true);

      const invalidSingle = [Card.createCard(Suit.Spades, Rank.Three, 0)];
      expect(validateDeclarationCards(invalidSingle, DeclarationType.Single, trumpRank)).toBe(false);

      const tooManyCards = [Card.createCard(Suit.Spades, trumpRank, 0), Card.createCard(Suit.Hearts, trumpRank, 0)];
      expect(validateDeclarationCards(tooManyCards, DeclarationType.Single, trumpRank)).toBe(false);
    });

    test('should validate pair declarations', () => {
      // Valid trump rank pair (same suit)
      const validPair = Card.createPair(Suit.Spades, trumpRank);
      expect(validateDeclarationCards(validPair, DeclarationType.Pair, trumpRank)).toBe(true);

      // Invalid: different suits
      const differentSuits = [Card.createCard(Suit.Spades, trumpRank, 0), Card.createCard(Suit.Hearts, trumpRank, 0)];
      expect(validateDeclarationCards(differentSuits, DeclarationType.Pair, trumpRank)).toBe(false);

      // Invalid: wrong rank
      const wrongRank = Card.createPair(Suit.Spades, Rank.Three);
      expect(validateDeclarationCards(wrongRank, DeclarationType.Pair, trumpRank)).toBe(false);

      // Invalid: mixed joker pair (game rules: only same jokers make pairs)
      const mixedJokerPair = [
        Card.createJoker(JokerType.Small, 0),
        Card.createJoker(JokerType.Big, 0)
      ];
      expect(validateDeclarationCards(mixedJokerPair, DeclarationType.Pair, trumpRank)).toBe(false);
    });

    test('should validate joker pair declarations', () => {
      const validBigJokerPair = Card.createJokerPair(JokerType.Big);
      expect(validateDeclarationCards(validBigJokerPair, DeclarationType.BigJokerPair, trumpRank)).toBe(true);

      const validSmallJokerPair = Card.createJokerPair(JokerType.Small);
      expect(validateDeclarationCards(validSmallJokerPair, DeclarationType.SmallJokerPair, trumpRank)).toBe(true);

      const invalidMixed = [
        Card.createCard(Suit.Spades, trumpRank, 0),
        Card.createJoker(JokerType.Small, 0)
      ];
      expect(validateDeclarationCards(invalidMixed, DeclarationType.BigJokerPair, trumpRank)).toBe(false);
    });
  });

  describe('Declaration Detection', () => {
    test('should detect possible declarations from hand', () => {
      const hand = [
        ...Card.createPair(Suit.Spades, trumpRank),
        Card.createCard(Suit.Hearts, trumpRank, 0),
        ...Card.createJokerPair(JokerType.Big),
        Card.createCard(Suit.Clubs, Rank.Ace, 0)
      ];

      const declarations = detectPossibleDeclarations(hand, trumpRank);

      // Should find joker pair (strongest), spades pair, and hearts single
      expect(declarations).toHaveLength(3);
      
      // Joker pair should be first (strongest)
      expect(declarations[0].type).toBe(DeclarationType.BigJokerPair);
      
      // Spades pair should be second
      expect(declarations[1].type).toBe(DeclarationType.Pair);
      expect(declarations[1].suit).toBe(Suit.Spades);
      
      // Hearts single should be third
      expect(declarations[2].type).toBe(DeclarationType.Single);
      expect(declarations[2].suit).toBe(Suit.Hearts);
    });

    test('should handle hand with no declarable cards', () => {
      const hand = [
        Card.createCard(Suit.Spades, Rank.Ace, 0),
        Card.createCard(Suit.Hearts, Rank.King, 0),
        Card.createCard(Suit.Clubs, Rank.Queen, 0)
      ];

      const declarations = detectPossibleDeclarations(hand, trumpRank);
      expect(declarations).toHaveLength(0);
    });
  });
});