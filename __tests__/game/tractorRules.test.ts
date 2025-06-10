import { identifyCombos } from "../../src/game/comboDetection";
import { isValidPlay } from "../../src/game/playValidation";
import { Card, ComboType, GamePhase, GameState, JokerType, Player, PlayerId, PlayerName, Rank, Suit, TeamId, TrumpInfo } from "../../src/types";

/**
 * Comprehensive Tractor Rules Tests
 * 
 * This file consolidates all tractor-related game logic tests including:
 * - Tractor following validation (Issue #71)
 * - Comprehensive tractor following scenarios
 * - Trump tractor validation and formation
 * - Edge cases and complex combinations
 * 
 * Tractor following rules:
 * 1. Must play tractor in the same suit if available  
 * 2. Must play same number of pairs as leading tractor if available
 * 3. Must use all pairs in the same suit if available
 * 4. Use singles in the same suit, when no enough pairs
 * 5. Other small cards from other suits when run out same suit
 * 
 * Trump tractor following: same rules apply, but all trump suit pairs,
 * trump rank pairs, and joker pairs count as pairs.
 */

describe('Tractor Rules', () => {
  let mockState: GameState;
  let humanPlayer: Player;
  
  beforeEach(() => {
    
    humanPlayer = {
      id: PlayerId.Human,
      name: PlayerName.Human,
      hand: [],
      isHuman: true,
      team: TeamId.A,
    };
    
    const ai1: Player = {
      id: PlayerId.Bot1,
      name: PlayerName.Bot1,
      hand: [],
      isHuman: false,
      team: TeamId.B,
    };
    
    mockState = {
      players: [humanPlayer, ai1],
      teams: [
        { id: TeamId.A, points: 0, currentRank: Rank.Two, isDefending: false },
        { id: TeamId.B, points: 0, currentRank: Rank.Two, isDefending: true }
      ],
      gamePhase: GamePhase.Playing,
      currentPlayerIndex: 0,
      roundStartingPlayerIndex: 0,
      trumpInfo: { trumpSuit: Suit.Hearts, trumpRank: Rank.Two },
      roundNumber: 1,
      currentTrick: null,
      tricks: [],
      kittyCards: [],
      deck: []
    };
  });

  describe('Basic Tractor Following Validation', () => {
    test('should allow tractor when player has matching tractor', () => {
      const trumpInfo: TrumpInfo = { trumpSuit: Suit.Hearts, trumpRank: Rank.Two };
      
      // Leading tractor: 7♠-7♠-8♠-8♠
      const leadingTractor = [
        ...Card.createPair(Suit.Spades, Rank.Seven),
        ...Card.createPair(Suit.Spades, Rank.Eight)
      ];
      
      // Player hand with matching tractor: 9♠-9♠-10♠-10♠
      const playerHand = [
        ...Card.createPair(Suit.Spades, Rank.Nine),
        ...Card.createPair(Suit.Spades, Rank.Ten),
        Card.createCard(Suit.Hearts, Rank.King, 0)
      ];
      
      // Player plays matching tractor
      const playerPlay = [
        ...Card.createPair(Suit.Spades, Rank.Nine),
        ...Card.createPair(Suit.Spades, Rank.Ten)
      ];
      
      const isValid = isValidPlay(playerPlay, leadingTractor, playerHand, trumpInfo);
      expect(isValid).toBe(true);
    });

    test('should require all pairs when insufficient for tractor', () => {
      const trumpInfo: TrumpInfo = { trumpSuit: Suit.Hearts, trumpRank: Rank.Two };
      
      // Leading tractor: 7♠-7♠-8♠-8♠ (2 pairs)
      const leadingTractor = [
        ...Card.createPair(Suit.Spades, Rank.Seven),
        ...Card.createPair(Suit.Spades, Rank.Eight)
      ];
      
      // Player hand with only 1 pair + singles in Spades
      const playerHand = [
        ...Card.createPair(Suit.Spades, Rank.Nine), // Only 1 pair
        Card.createCard(Suit.Spades, Rank.Ten, 0),
        Card.createCard(Suit.Spades, Rank.Jack, 0),
        Card.createCard(Suit.Hearts, Rank.King, 0)
      ];
      
      // Player must use all pairs + singles from Spades
      const validPlay = [
        ...Card.createPair(Suit.Spades, Rank.Nine),
        Card.createCard(Suit.Spades, Rank.Ten, 0),
        Card.createCard(Suit.Spades, Rank.Jack, 0)
      ];
      
      const isValid = isValidPlay(validPlay, leadingTractor, playerHand, trumpInfo);
      expect(isValid).toBe(true);
      
      // Invalid: using cards from other suits when Spades available
      const invalidPlay = [
        ...Card.createPair(Suit.Spades, Rank.Nine),
        Card.createCard(Suit.Hearts, Rank.King, 0),
        Card.createCard(Suit.Spades, Rank.Ten, 0)
      ];
      
      const isInvalid = isValidPlay(invalidPlay, leadingTractor, playerHand, trumpInfo);
      expect(isInvalid).toBe(false);
    });

    test('should allow mixed suits when out of leading suit', () => {
      const trumpInfo: TrumpInfo = { trumpSuit: Suit.Hearts, trumpRank: Rank.Two };
      
      // Leading tractor: 7♠-7♠-8♠-8♠
      const leadingTractor = [
        ...Card.createPair(Suit.Spades, Rank.Seven),
        ...Card.createPair(Suit.Spades, Rank.Eight)
      ];
      
      // Player hand with NO Spades
      const playerHand = [
        ...Card.createPair(Suit.Hearts, Rank.Nine),
        Card.createCard(Suit.Clubs, Rank.Ten, 0),
        Card.createCard(Suit.Diamonds, Rank.Jack, 0),
        Card.createCard(Suit.Hearts, Rank.King, 0)
      ];
      
      // Player can play any 4 cards (mixed suits allowed)
      const validPlay = [
        ...Card.createPair(Suit.Hearts, Rank.Nine),
        Card.createCard(Suit.Clubs, Rank.Ten, 0),
        Card.createCard(Suit.Diamonds, Rank.Jack, 0)
      ];
      
      const isValid = isValidPlay(validPlay, leadingTractor, playerHand, trumpInfo);
      expect(isValid).toBe(true);
    });
  });

  describe('Trump Tractor Following', () => {
    test('should recognize trump rank pairs as valid trump pairs', () => {
      const trumpInfo: TrumpInfo = { trumpSuit: Suit.Hearts, trumpRank: Rank.Two };
      
      // Leading trump tractor: 5♥-5♥-6♥-6♥ (trump suit)
      const leadingTrumpTractor = [
        ...Card.createPair(Suit.Hearts, Rank.Five),
        ...Card.createPair(Suit.Hearts, Rank.Six)
      ];
      
      // Player hand with trump rank pairs
      const playerHand = [
        ...Card.createPair(Suit.Spades, Rank.Two),  // Trump rank pair
        ...Card.createPair(Suit.Clubs, Rank.Two),   // Trump rank pair
        Card.createCard(Suit.Diamonds, Rank.King, 0)
      ];
      
      // Player can use trump rank pairs to follow trump tractor
      const validPlay = [
        ...Card.createPair(Suit.Spades, Rank.Two),
        ...Card.createPair(Suit.Clubs, Rank.Two)
      ];
      
      const isValid = isValidPlay(validPlay, leadingTrumpTractor, playerHand, trumpInfo);
      expect(isValid).toBe(true);
    });

    test('should handle mixed trump combinations', () => {
      const trumpInfo: TrumpInfo = { trumpSuit: Suit.Hearts, trumpRank: Rank.Two };
      
      // Leading trump tractor: 3 consecutive pairs (6 cards)
      const leadingTrumpTractor = [
        ...Card.createPair(Suit.Hearts, Rank.Five),
        ...Card.createPair(Suit.Hearts, Rank.Six),
        ...Card.createPair(Suit.Hearts, Rank.Seven)
      ];
      
      // Player hand with mixed trump types
      const playerHand = [
        ...Card.createPair(Suit.Hearts, Rank.Three),  // Trump suit pair
        ...Card.createPair(Suit.Spades, Rank.Two),    // Trump rank pair
        ...Card.createJokerPair(JokerType.Small),     // Joker pair
        Card.createCard(Suit.Diamonds, Rank.King, 0)
      ];
      
      // Player can use all trump pairs (3 types × 2 cards = 6 cards)
      const validPlay = [
        ...Card.createPair(Suit.Hearts, Rank.Three),
        ...Card.createPair(Suit.Spades, Rank.Two),
        ...Card.createJokerPair(JokerType.Small)
      ];
      
      const isValid = isValidPlay(validPlay, leadingTrumpTractor, playerHand, trumpInfo);
      expect(isValid).toBe(true);
    });

    test('should handle joker pairs in trump combinations', () => {
      const trumpInfo: TrumpInfo = { trumpSuit: Suit.Hearts, trumpRank: Rank.Two };
      
      // Leading trump tractor: 2 pairs
      const leadingTrumpTractor = [
        ...Card.createPair(Suit.Hearts, Rank.Five),
        ...Card.createPair(Suit.Hearts, Rank.Six)
      ];
      
      // Player hand with joker pairs
      const playerHand = [
        ...Card.createJokerPair(JokerType.Big),      // Big Joker pair
        ...Card.createJokerPair(JokerType.Small),    // Small Joker pair
        Card.createCard(Suit.Diamonds, Rank.King, 0)
      ];
      
      // Player can use joker pairs as trump pairs
      const validPlay = [
        ...Card.createJokerPair(JokerType.Big),
        ...Card.createJokerPair(JokerType.Small)
      ];
      
      const isValid = isValidPlay(validPlay, leadingTrumpTractor, playerHand, trumpInfo);
      expect(isValid).toBe(true);
    });
  });

  describe('Tractor Formation Validation', () => {
    test('should validate consecutive pairs form tractor', () => {
      const trumpInfo: TrumpInfo = { trumpSuit: Suit.Hearts, trumpRank: Rank.Two };
      
      // Valid tractor: consecutive pairs
      const consecutivePairs = [
        ...Card.createPair(Suit.Spades, Rank.Seven),
        ...Card.createPair(Suit.Spades, Rank.Eight)
      ];
      
      const combos = identifyCombos(consecutivePairs, trumpInfo);
      const tractorCombo = combos.find(combo => combo.type === ComboType.Tractor);
      expect(tractorCombo).toBeDefined();
      expect(tractorCombo!.type).toBe(ComboType.Tractor);
      expect(tractorCombo!.cards).toHaveLength(4);
    });

    test('should reject non-consecutive pairs as tractor', () => {
      const trumpInfo: TrumpInfo = { trumpSuit: Suit.Hearts, trumpRank: Rank.Two };
      
      // Invalid tractor: non-consecutive pairs (7♠-7♠, 9♠-9♠)
      const nonConsecutivePairs = [
        ...Card.createPair(Suit.Spades, Rank.Seven),
        ...Card.createPair(Suit.Spades, Rank.Nine)
      ];
      
      const combos = identifyCombos(nonConsecutivePairs, trumpInfo);
      // Should identify as 2 separate pairs, not a tractor
      const pairCombos = combos.filter(combo => combo.type === ComboType.Pair);
      const tractorCombos = combos.filter(combo => combo.type === ComboType.Tractor);
      expect(pairCombos).toHaveLength(2);
      expect(tractorCombos).toHaveLength(0); // No tractor should be formed
    });

    test('should validate trump tractor formation with jokers', () => {
      const trumpInfo: TrumpInfo = { trumpSuit: Suit.Hearts, trumpRank: Rank.Two };
      
      // Special trump tractor: Small Joker pair + Big Joker pair
      const jokerTractor = [
        ...Card.createJokerPair(JokerType.Small),
        ...Card.createJokerPair(JokerType.Big)
      ];
      
      const combos = identifyCombos(jokerTractor, trumpInfo);
      const tractorCombo = combos.find(combo => combo.type === ComboType.Tractor);
      expect(tractorCombo).toBeDefined();
      expect(tractorCombo!.type).toBe(ComboType.Tractor);
      expect(tractorCombo!.cards).toHaveLength(4);
    });

    test('should handle mixed suit tractor rejection', () => {
      const trumpInfo: TrumpInfo = { trumpSuit: Suit.Hearts, trumpRank: Rank.Two };
      
      // Invalid: pairs from different suits
      const mixedSuitPairs = [
        ...Card.createPair(Suit.Spades, Rank.Seven),
        ...Card.createPair(Suit.Hearts, Rank.Eight)
      ];
      
      const combos = identifyCombos(mixedSuitPairs, trumpInfo);
      // Should identify as 2 separate pairs, not a tractor
      const pairCombos = combos.filter(combo => combo.type === ComboType.Pair);
      const tractorCombos = combos.filter(combo => combo.type === ComboType.Tractor);
      expect(pairCombos).toHaveLength(2);
      expect(tractorCombos).toHaveLength(0); // No tractor should be formed from mixed suits
    });
  });

  describe('Edge Cases and Complex Scenarios', () => {
    test('should handle minimum hand scenarios', () => {
      const trumpInfo: TrumpInfo = { trumpSuit: Suit.Hearts, trumpRank: Rank.Two };
      
      // Leading tractor
      const leadingTractor = [
        ...Card.createPair(Suit.Spades, Rank.Seven),
        ...Card.createPair(Suit.Spades, Rank.Eight)
      ];
      
      // Player with exactly 4 cards, all Spades
      const minimalHand = [
        Card.createCard(Suit.Spades, Rank.Three, 0),
        Card.createCard(Suit.Spades, Rank.Four, 0),
        Card.createCard(Suit.Spades, Rank.Five, 0),
        Card.createCard(Suit.Spades, Rank.Six, 0)
      ];
      
      // Must play all Spades cards
      const validPlay = minimalHand;
      
      const isValid = isValidPlay(validPlay, leadingTractor, minimalHand, trumpInfo);
      expect(isValid).toBe(true);
    });

    test('should validate combination generation for tractor following', () => {
      const trumpInfo: TrumpInfo = { trumpSuit: Suit.Hearts, trumpRank: Rank.Two };
      
      // Leading tractor
      const leadingTractor = [
        ...Card.createPair(Suit.Spades, Rank.Seven),
        ...Card.createPair(Suit.Spades, Rank.Eight)
      ];
      
      // Player hand with various options
      const playerHand = [
        ...Card.createPair(Suit.Spades, Rank.Nine),
        Card.createCard(Suit.Spades, Rank.Ten, 0),
        Card.createCard(Suit.Spades, Rank.Jack, 0),
        Card.createCard(Suit.Hearts, Rank.King, 0)
      ];
      
      // Get valid combinations for tractor following
      const validCombos = identifyCombos(playerHand, trumpInfo);
      
      // Should have valid combinations that follow tractor rules
      expect(validCombos.length).toBeGreaterThan(0);
      
      // Check that we can identify valid pairs from this hand
      const pairCombos = validCombos.filter(combo => combo.type === ComboType.Pair);
      expect(pairCombos.length).toBeGreaterThan(0);
      
      // Check that we have the Spades Nine pair
      const spadesPair = pairCombos.find(combo => 
        combo.cards.length === 2 && 
        combo.cards.every(card => card.suit === Suit.Spades && card.rank === Rank.Nine)
      );
      expect(spadesPair).toBeDefined();
    });

    test('should handle three-pair tractor scenarios', () => {
      const trumpInfo: TrumpInfo = { trumpSuit: Suit.Hearts, trumpRank: Rank.Two };
      
      // Leading 3-pair tractor (6 cards)
      const threePairTractor = [
        ...Card.createPair(Suit.Spades, Rank.Seven),
        ...Card.createPair(Suit.Spades, Rank.Eight),
        ...Card.createPair(Suit.Spades, Rank.Nine)
      ];
      
      // Player with sufficient Spades pairs
      const playerHand = [
        ...Card.createPair(Suit.Spades, Rank.Ten),
        ...Card.createPair(Suit.Spades, Rank.Jack),
        ...Card.createPair(Suit.Spades, Rank.Queen),
        Card.createCard(Suit.Hearts, Rank.King, 0)
      ];
      
      // Player can form responding 3-pair tractor
      const validPlay = [
        ...Card.createPair(Suit.Spades, Rank.Ten),
        ...Card.createPair(Suit.Spades, Rank.Jack),
        ...Card.createPair(Suit.Spades, Rank.Queen)
      ];
      
      const isValid = isValidPlay(validPlay, threePairTractor, playerHand, trumpInfo);
      expect(isValid).toBe(true);
    });

    test('should prioritize trump pairs over non-trump pairs when following trump tractor', () => {
      const trumpInfo: TrumpInfo = { trumpSuit: Suit.Hearts, trumpRank: Rank.Two };
      
      // Leading trump tractor
      const leadingTrumpTractor = [
        ...Card.createPair(Suit.Hearts, Rank.Five),
        ...Card.createPair(Suit.Hearts, Rank.Six)
      ];
      
      // Player has both trump and non-trump pairs
      const playerHand = [
        ...Card.createPair(Suit.Hearts, Rank.Three),    // Trump suit pair
        ...Card.createPair(Suit.Spades, Rank.Two),      // Trump rank pair
        ...Card.createPair(Suit.Clubs, Rank.Ace),       // Non-trump pair
        Card.createCard(Suit.Diamonds, Rank.King, 0)
      ];
      
      // Valid: using trump pairs
      const trumpPairPlay = [
        ...Card.createPair(Suit.Hearts, Rank.Three),
        ...Card.createPair(Suit.Spades, Rank.Two)
      ];
      
      const isValidTrump = isValidPlay(trumpPairPlay, leadingTrumpTractor, playerHand, trumpInfo);
      expect(isValidTrump).toBe(true);
      
      // Invalid: mixing trump with non-trump when sufficient trump pairs available
      const mixedPlay = [
        ...Card.createPair(Suit.Hearts, Rank.Three),
        ...Card.createPair(Suit.Clubs, Rank.Ace)
      ];
      
      const isValidMixed = isValidPlay(mixedPlay, leadingTrumpTractor, playerHand, trumpInfo);
      expect(isValidMixed).toBe(false);
    });
  });
});