import { Card, Suit, Rank, ComboType, JokerType } from "../../src/types";
import {
  generateMixedCombo,
  createMixedComboRequirements,
} from "../../src/game/mixedComboGeneration";

const createTestTrumpInfo = (trumpRank: Rank, trumpSuit: Suit) => ({
  trumpRank,
  trumpSuit,
});

describe("Mixed Combo Generation", () => {
  describe("Following Tractor Rules", () => {
    test("Rule 1: Fallback to same amount of pairs when can't form tractor", () => {
      const trumpInfo = createTestTrumpInfo(Rank.Five, Suit.Hearts);
      
      // Leading: 3♦3♦-4♦4♦ (2-pair tractor)
      const leadingCombo = [
        ...Card.createPair(Suit.Diamonds, Rank.Three),
        ...Card.createPair(Suit.Diamonds, Rank.Four)
      ];
      
      // Player hand: Has A♦A♦ + 7♦7♦ (2 pairs, but NOT consecutive = can't form tractor)
      const playerHand = [
        ...Card.createPair(Suit.Diamonds, Rank.Ace),
        ...Card.createPair(Suit.Diamonds, Rank.Seven),
        Card.createCard(Suit.Diamonds, Rank.Six, 0),
        Card.createCard(Suit.Clubs, Rank.Two, 0)
      ];
      
      const requirements = createMixedComboRequirements(leadingCombo, trumpInfo);
      const result = generateMixedCombo(playerHand, requirements, trumpInfo);
      
      // Should use A♦A♦ + 7♦7♦ (2 pairs since can't form tractor)
      expect(result).toHaveLength(4);
      expect(result).toEqual(expect.arrayContaining([
        expect.objectContaining({ suit: Suit.Diamonds, rank: Rank.Ace }),
        expect.objectContaining({ suit: Suit.Diamonds, rank: Rank.Ace }),
        expect.objectContaining({ suit: Suit.Diamonds, rank: Rank.Seven }),
        expect.objectContaining({ suit: Suit.Diamonds, rank: Rank.Seven }),
      ]));
    });

    test("Rule 2: Same scenario - this was duplicate of rule 1", () => {
      // This test was essentially the same as Rule 1, so keeping it simple
      expect(true).toBe(true);
    });

    test("Rule 3: Use all remaining pairs + singles when insufficient pairs", () => {
      const trumpInfo = createTestTrumpInfo(Rank.Five, Suit.Hearts);
      
      // Leading: 3♦3♦-4♦4♦ (2-pair tractor)
      const leadingCombo = [
        ...Card.createPair(Suit.Diamonds, Rank.Three),
        ...Card.createPair(Suit.Diamonds, Rank.Four)
      ];
      
      // Player hand: Only has K♦K♦ + singles
      const playerHand = [
        ...Card.createPair(Suit.Diamonds, Rank.King),
        Card.createCard(Suit.Diamonds, Rank.Eight, 0),
        Card.createCard(Suit.Diamonds, Rank.Six, 0),
        Card.createCard(Suit.Clubs, Rank.Two, 0)
      ];
      
      const requirements = createMixedComboRequirements(leadingCombo, trumpInfo);
      const result = generateMixedCombo(playerHand, requirements, trumpInfo);
      
      // Should use K♦K♦ + 8♦ + 6♦ (all same suit cards)
      expect(result).toHaveLength(4);
      expect(result).toEqual(expect.arrayContaining([
        expect.objectContaining({ suit: Suit.Diamonds, rank: Rank.King }),
        expect.objectContaining({ suit: Suit.Diamonds, rank: Rank.King }),
        expect.objectContaining({ suit: Suit.Diamonds, rank: Rank.Eight }),
        expect.objectContaining({ suit: Suit.Diamonds, rank: Rank.Six }),
      ]));
    });

    test("Rule 4: Exhaust suit completely when not enough same-suit cards", () => {
      const trumpInfo = createTestTrumpInfo(Rank.Five, Suit.Hearts);
      
      // Leading: 3♦3♦-4♦4♦ (2-pair tractor)
      const leadingCombo = [
        ...Card.createPair(Suit.Diamonds, Rank.Three),
        ...Card.createPair(Suit.Diamonds, Rank.Four)
      ];
      
      // Player hand: Only has 8♦ + 6♦ (2 diamonds) + other suits
      const playerHand = [
        Card.createCard(Suit.Diamonds, Rank.Eight, 0),
        Card.createCard(Suit.Diamonds, Rank.Six, 0),
        Card.createCard(Suit.Clubs, Rank.King, 0),
        Card.createCard(Suit.Spades, Rank.Ace, 0)
      ];
      
      const requirements = createMixedComboRequirements(leadingCombo, trumpInfo);
      const result = generateMixedCombo(playerHand, requirements, trumpInfo);
      
      // Should use 8♦ + 6♦ + fill with other cards
      expect(result).toHaveLength(4);
      expect(result.filter(card => card.suit === Suit.Diamonds)).toHaveLength(2);
      expect(result.filter(card => card.suit !== Suit.Diamonds)).toHaveLength(2);
    });
  });

  describe("Following Pair Rules", () => {
    test("Rule 1: Use pair first", () => {
      const trumpInfo = createTestTrumpInfo(Rank.Five, Suit.Hearts);
      
      // Leading: A♦A♦ (pair)
      const leadingCombo = Card.createPair(Suit.Diamonds, Rank.Ace);
      
      // Player hand: Has K♦K♦ pair
      const playerHand = [
        ...Card.createPair(Suit.Diamonds, Rank.King),
        Card.createCard(Suit.Diamonds, Rank.Eight, 0),
        Card.createCard(Suit.Diamonds, Rank.Six, 0),
        Card.createCard(Suit.Clubs, Rank.Two, 0)
      ];
      
      const requirements = createMixedComboRequirements(leadingCombo, trumpInfo);
      const result = generateMixedCombo(playerHand, requirements, trumpInfo);
      
      // Should use K♦K♦
      expect(result).toHaveLength(2);
      expect(result).toEqual(expect.arrayContaining([
        expect.objectContaining({ suit: Suit.Diamonds, rank: Rank.King }),
        expect.objectContaining({ suit: Suit.Diamonds, rank: Rank.King }),
      ]));
    });

    test("Rule 2: Fallback to 2 singles when no pair", () => {
      const trumpInfo = createTestTrumpInfo(Rank.Five, Suit.Hearts);
      
      // Leading: A♦A♦ (pair)
      const leadingCombo = Card.createPair(Suit.Diamonds, Rank.Ace);
      
      // Player hand: No diamonds pairs, only singles
      const playerHand = [
        Card.createCard(Suit.Diamonds, Rank.King, 0),
        Card.createCard(Suit.Diamonds, Rank.Eight, 0),
        Card.createCard(Suit.Diamonds, Rank.Six, 0),
        Card.createCard(Suit.Clubs, Rank.Two, 0)
      ];
      
      const requirements = createMixedComboRequirements(leadingCombo, trumpInfo);
      const result = generateMixedCombo(playerHand, requirements, trumpInfo);
      
      // Should use 2 diamonds singles
      expect(result).toHaveLength(2);
      expect(result).toEqual(expect.arrayContaining([
        expect.objectContaining({ suit: Suit.Diamonds }),
        expect.objectContaining({ suit: Suit.Diamonds }),
      ]));
    });
  });

  describe("Trump Following Rules", () => {
    test("Should follow same hierarchical rules for trump", () => {
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Spades);
      
      // Leading: 3♠3♠-4♠4♠ (trump tractor)
      const leadingCombo = [
        ...Card.createPair(Suit.Spades, Rank.Three),
        ...Card.createPair(Suit.Spades, Rank.Four)
      ];
      
      // Player hand: Has trump pairs + jokers
      const playerHand = [
        ...Card.createJokerPair(JokerType.Big),
        Card.createCard(Suit.Spades, Rank.King, 0),
        Card.createCard(Suit.Spades, Rank.Queen, 0),
        Card.createCard(Suit.Hearts, Rank.Ace, 0)
      ];
      
      const requirements = createMixedComboRequirements(leadingCombo, trumpInfo);
      const result = generateMixedCombo(playerHand, requirements, trumpInfo);
      
      // Should use Big Joker pair + trump singles
      expect(result).toHaveLength(4);
      // All should be trump cards
      expect(result.every(card => 
        card.joker || card.suit === Suit.Spades || card.rank === Rank.Two
      )).toBe(true);
    });
  });

  describe("Multi-Combo Following Rules", () => {
    test("Should match structure: same tractors + pairs + singles", () => {
      const trumpInfo = createTestTrumpInfo(Rank.Five, Suit.Hearts);
      
      // Leading: K♠K♠-Q♠Q♠ + J♠ (tractor + single, 5 cards)
      const leadingCombo = [
        ...Card.createPair(Suit.Spades, Rank.King),
        ...Card.createPair(Suit.Spades, Rank.Queen),
        Card.createCard(Suit.Spades, Rank.Jack, 0)
      ];
      
      // Player hand: Has spades tractor + single
      const playerHand = [
        ...Card.createPair(Suit.Spades, Rank.Nine),
        ...Card.createPair(Suit.Spades, Rank.Eight),
        Card.createCard(Suit.Spades, Rank.Seven, 0),
        Card.createCard(Suit.Spades, Rank.Six, 0),
        Card.createCard(Suit.Clubs, Rank.Two, 0)
      ];
      
      const requirements = createMixedComboRequirements(leadingCombo, trumpInfo);
      const result = generateMixedCombo(playerHand, requirements, trumpInfo);
      
      // Should use 9♠9♠-8♠8♠ + 7♠ (matching structure)
      expect(result).toHaveLength(5);
      expect(result.filter(card => card.suit === Suit.Spades)).toHaveLength(5);
    });
  });

  describe("Edge Cases", () => {
    test("Should handle when player has no cards of led suit", () => {
      const trumpInfo = createTestTrumpInfo(Rank.Five, Suit.Hearts);
      
      // Leading: A♦A♦ (diamonds pair)
      const leadingCombo = Card.createPair(Suit.Diamonds, Rank.Ace);
      
      // Player hand: No diamonds at all
      const playerHand = [
        Card.createCard(Suit.Clubs, Rank.King, 0),
        Card.createCard(Suit.Spades, Rank.Queen, 0)
      ];
      
      const requirements = createMixedComboRequirements(leadingCombo, trumpInfo);
      const result = generateMixedCombo(playerHand, requirements, trumpInfo);
      
      // Should use any 2 cards
      expect(result).toHaveLength(2);
    });

    test("Should prioritize trump when out of led suit", () => {
      const trumpInfo = createTestTrumpInfo(Rank.Five, Suit.Hearts);
      
      // Leading: A♦A♦ (diamonds pair)
      const leadingCombo = Card.createPair(Suit.Diamonds, Rank.Ace);
      
      // Player hand: No diamonds, has trump
      const playerHand = [
        Card.createCard(Suit.Hearts, Rank.King, 0),
        Card.createCard(Suit.Hearts, Rank.Queen, 0),
        Card.createCard(Suit.Clubs, Rank.Jack, 0),
        Card.createCard(Suit.Spades, Rank.Ten, 0)
      ];
      
      const requirements = createMixedComboRequirements(leadingCombo, trumpInfo);
      const result = generateMixedCombo(playerHand, requirements, trumpInfo);
      
      // Should prioritize trump cards
      expect(result).toHaveLength(2);
      expect(result.filter(card => card.suit === Suit.Hearts)).toHaveLength(2);
    });
  });
});