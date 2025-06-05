import { Card, GameState, Player, Rank, Suit, Team, Trick, PlayerId, PlayerName, GamePhase, ComboType, TrumpInfo, TeamId, JokerType } from "../../src/types";
import { isValidPlay, identifyCombos, getValidCombinations } from '../../src/game/gameLogic';
import { createCard, createJoker } from '../helpers/cards';

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
  let cardId = 0;
  
  beforeEach(() => {
    cardId = 0;
    
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
        createCard(Suit.Spades, Rank.Seven, 'lead_7s_1'),
        createCard(Suit.Spades, Rank.Seven, 'lead_7s_2'),
        createCard(Suit.Spades, Rank.Eight, 'lead_8s_1'),
        createCard(Suit.Spades, Rank.Eight, 'lead_8s_2')
      ];
      
      // Player hand with matching tractor: 9♠-9♠-10♠-10♠
      const playerHand = [
        createCard(Suit.Spades, Rank.Nine, 'hand_9s_1'),
        createCard(Suit.Spades, Rank.Nine, 'hand_9s_2'),
        createCard(Suit.Spades, Rank.Ten, 'hand_10s_1'),
        createCard(Suit.Spades, Rank.Ten, 'hand_10s_2'),
        createCard(Suit.Hearts, Rank.King, 'hand_hk')
      ];
      
      // Player plays matching tractor
      const playerPlay = [
        createCard(Suit.Spades, Rank.Nine, 'hand_9s_1'),
        createCard(Suit.Spades, Rank.Nine, 'hand_9s_2'),
        createCard(Suit.Spades, Rank.Ten, 'hand_10s_1'),
        createCard(Suit.Spades, Rank.Ten, 'hand_10s_2')
      ];
      
      const isValid = isValidPlay(playerPlay, leadingTractor, playerHand, trumpInfo);
      expect(isValid).toBe(true);
    });

    test('should require all pairs when insufficient for tractor', () => {
      const trumpInfo: TrumpInfo = { trumpSuit: Suit.Hearts, trumpRank: Rank.Two };
      
      // Leading tractor: 7♠-7♠-8♠-8♠ (2 pairs)
      const leadingTractor = [
        createCard(Suit.Spades, Rank.Seven, 'lead_7s_1'),
        createCard(Suit.Spades, Rank.Seven, 'lead_7s_2'),
        createCard(Suit.Spades, Rank.Eight, 'lead_8s_1'),
        createCard(Suit.Spades, Rank.Eight, 'lead_8s_2')
      ];
      
      // Player hand with only 1 pair + singles in Spades
      const playerHand = [
        createCard(Suit.Spades, Rank.Nine, 'hand_9s_1'),
        createCard(Suit.Spades, Rank.Nine, 'hand_9s_2'), // Only 1 pair
        createCard(Suit.Spades, Rank.Ten, 'hand_10s'),
        createCard(Suit.Spades, Rank.Jack, 'hand_js'),
        createCard(Suit.Hearts, Rank.King, 'hand_hk')
      ];
      
      // Player must use all pairs + singles from Spades
      const validPlay = [
        createCard(Suit.Spades, Rank.Nine, 'hand_9s_1'),
        createCard(Suit.Spades, Rank.Nine, 'hand_9s_2'),
        createCard(Suit.Spades, Rank.Ten, 'hand_10s'),
        createCard(Suit.Spades, Rank.Jack, 'hand_js')
      ];
      
      const isValid = isValidPlay(validPlay, leadingTractor, playerHand, trumpInfo);
      expect(isValid).toBe(true);
      
      // Invalid: using cards from other suits when Spades available
      const invalidPlay = [
        createCard(Suit.Spades, Rank.Nine, 'hand_9s_1'),
        createCard(Suit.Spades, Rank.Nine, 'hand_9s_2'),
        createCard(Suit.Hearts, Rank.King, 'hand_hk'),
        createCard(Suit.Spades, Rank.Ten, 'hand_10s')
      ];
      
      const isInvalid = isValidPlay(invalidPlay, leadingTractor, playerHand, trumpInfo);
      expect(isInvalid).toBe(false);
    });

    test('should allow mixed suits when out of leading suit', () => {
      const trumpInfo: TrumpInfo = { trumpSuit: Suit.Hearts, trumpRank: Rank.Two };
      
      // Leading tractor: 7♠-7♠-8♠-8♠
      const leadingTractor = [
        createCard(Suit.Spades, Rank.Seven, 'lead_7s_1'),
        createCard(Suit.Spades, Rank.Seven, 'lead_7s_2'),
        createCard(Suit.Spades, Rank.Eight, 'lead_8s_1'),
        createCard(Suit.Spades, Rank.Eight, 'lead_8s_2')
      ];
      
      // Player hand with NO Spades
      const playerHand = [
        createCard(Suit.Hearts, Rank.Nine, 'hand_9h_1'),
        createCard(Suit.Hearts, Rank.Nine, 'hand_9h_2'),
        createCard(Suit.Clubs, Rank.Ten, 'hand_10c'),
        createCard(Suit.Diamonds, Rank.Jack, 'hand_jd'),
        createCard(Suit.Hearts, Rank.King, 'hand_hk')
      ];
      
      // Player can play any 4 cards (mixed suits allowed)
      const validPlay = [
        createCard(Suit.Hearts, Rank.Nine, 'hand_9h_1'),
        createCard(Suit.Hearts, Rank.Nine, 'hand_9h_2'),
        createCard(Suit.Clubs, Rank.Ten, 'hand_10c'),
        createCard(Suit.Diamonds, Rank.Jack, 'hand_jd')
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
        createCard(Suit.Hearts, Rank.Five, 'lead_5h_1'),
        createCard(Suit.Hearts, Rank.Five, 'lead_5h_2'),
        createCard(Suit.Hearts, Rank.Six, 'lead_6h_1'),
        createCard(Suit.Hearts, Rank.Six, 'lead_6h_2')
      ];
      
      // Player hand with trump rank pairs
      const playerHand = [
        createCard(Suit.Spades, Rank.Two, 'hand_2s_1'),  // Trump rank pair
        createCard(Suit.Spades, Rank.Two, 'hand_2s_2'),
        createCard(Suit.Clubs, Rank.Two, 'hand_2c_1'),   // Trump rank pair
        createCard(Suit.Clubs, Rank.Two, 'hand_2c_2'),
        createCard(Suit.Diamonds, Rank.King, 'hand_kd')
      ];
      
      // Player can use trump rank pairs to follow trump tractor
      const validPlay = [
        createCard(Suit.Spades, Rank.Two, 'hand_2s_1'),
        createCard(Suit.Spades, Rank.Two, 'hand_2s_2'),
        createCard(Suit.Clubs, Rank.Two, 'hand_2c_1'),
        createCard(Suit.Clubs, Rank.Two, 'hand_2c_2')
      ];
      
      const isValid = isValidPlay(validPlay, leadingTrumpTractor, playerHand, trumpInfo);
      expect(isValid).toBe(true);
    });

    test('should handle mixed trump combinations', () => {
      const trumpInfo: TrumpInfo = { trumpSuit: Suit.Hearts, trumpRank: Rank.Two };
      
      // Leading trump tractor: 3 consecutive pairs (6 cards)
      const leadingTrumpTractor = [
        createCard(Suit.Hearts, Rank.Five, 'lead_5h_1'),
        createCard(Suit.Hearts, Rank.Five, 'lead_5h_2'),
        createCard(Suit.Hearts, Rank.Six, 'lead_6h_1'),
        createCard(Suit.Hearts, Rank.Six, 'lead_6h_2'),
        createCard(Suit.Hearts, Rank.Seven, 'lead_7h_1'),
        createCard(Suit.Hearts, Rank.Seven, 'lead_7h_2')
      ];
      
      // Player hand with mixed trump types
      const playerHand = [
        createCard(Suit.Hearts, Rank.Three, 'hand_3h_1'),  // Trump suit pair
        createCard(Suit.Hearts, Rank.Three, 'hand_3h_2'),
        createCard(Suit.Spades, Rank.Two, 'hand_2s_1'),    // Trump rank pair
        createCard(Suit.Spades, Rank.Two, 'hand_2s_2'),
        createJoker(JokerType.Small, 'hand_sj_1'),          // Joker pair
        createJoker(JokerType.Small, 'hand_sj_2'),
        createCard(Suit.Diamonds, Rank.King, 'hand_kd')
      ];
      
      // Player can use all trump pairs (3 types × 2 cards = 6 cards)
      const validPlay = [
        createCard(Suit.Hearts, Rank.Three, 'hand_3h_1'),
        createCard(Suit.Hearts, Rank.Three, 'hand_3h_2'),
        createCard(Suit.Spades, Rank.Two, 'hand_2s_1'),
        createCard(Suit.Spades, Rank.Two, 'hand_2s_2'),
        createJoker(JokerType.Small, 'hand_sj_1'),
        createJoker(JokerType.Small, 'hand_sj_2')
      ];
      
      const isValid = isValidPlay(validPlay, leadingTrumpTractor, playerHand, trumpInfo);
      expect(isValid).toBe(true);
    });

    test('should handle joker pairs in trump combinations', () => {
      const trumpInfo: TrumpInfo = { trumpSuit: Suit.Hearts, trumpRank: Rank.Two };
      
      // Leading trump tractor: 2 pairs
      const leadingTrumpTractor = [
        createCard(Suit.Hearts, Rank.Five, 'lead_5h_1'),
        createCard(Suit.Hearts, Rank.Five, 'lead_5h_2'),
        createCard(Suit.Hearts, Rank.Six, 'lead_6h_1'),
        createCard(Suit.Hearts, Rank.Six, 'lead_6h_2')
      ];
      
      // Player hand with joker pairs
      const playerHand = [
        createJoker(JokerType.Big, 'hand_bj_1'),      // Big Joker pair
        createJoker(JokerType.Big, 'hand_bj_2'),
        createJoker(JokerType.Small, 'hand_sj_1'),    // Small Joker pair
        createJoker(JokerType.Small, 'hand_sj_2'),
        createCard(Suit.Diamonds, Rank.King, 'hand_kd')
      ];
      
      // Player can use joker pairs as trump pairs
      const validPlay = [
        createJoker(JokerType.Big, 'hand_bj_1'),
        createJoker(JokerType.Big, 'hand_bj_2'),
        createJoker(JokerType.Small, 'hand_sj_1'),
        createJoker(JokerType.Small, 'hand_sj_2')
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
        createCard(Suit.Spades, Rank.Seven, 'tractor_7s_1'),
        createCard(Suit.Spades, Rank.Seven, 'tractor_7s_2'),
        createCard(Suit.Spades, Rank.Eight, 'tractor_8s_1'),
        createCard(Suit.Spades, Rank.Eight, 'tractor_8s_2')
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
        createCard(Suit.Spades, Rank.Seven, 'pair1_7s_1'),
        createCard(Suit.Spades, Rank.Seven, 'pair1_7s_2'),
        createCard(Suit.Spades, Rank.Nine, 'pair2_9s_1'),
        createCard(Suit.Spades, Rank.Nine, 'pair2_9s_2')
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
        createJoker(JokerType.Small, 'sj_1'),
        createJoker(JokerType.Small, 'sj_2'),
        createJoker(JokerType.Big, 'bj_1'),
        createJoker(JokerType.Big, 'bj_2')
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
        createCard(Suit.Spades, Rank.Seven, 'spades_7_1'),
        createCard(Suit.Spades, Rank.Seven, 'spades_7_2'),
        createCard(Suit.Hearts, Rank.Eight, 'hearts_8_1'),
        createCard(Suit.Hearts, Rank.Eight, 'hearts_8_2')
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
        createCard(Suit.Spades, Rank.Seven, 'lead_7s_1'),
        createCard(Suit.Spades, Rank.Seven, 'lead_7s_2'),
        createCard(Suit.Spades, Rank.Eight, 'lead_8s_1'),
        createCard(Suit.Spades, Rank.Eight, 'lead_8s_2')
      ];
      
      // Player with exactly 4 cards, all Spades
      const minimalHand = [
        createCard(Suit.Spades, Rank.Three, 'hand_3s'),
        createCard(Suit.Spades, Rank.Four, 'hand_4s'),
        createCard(Suit.Spades, Rank.Five, 'hand_5s'),
        createCard(Suit.Spades, Rank.Six, 'hand_6s')
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
        createCard(Suit.Spades, Rank.Seven, 'lead_7s_1'),
        createCard(Suit.Spades, Rank.Seven, 'lead_7s_2'),
        createCard(Suit.Spades, Rank.Eight, 'lead_8s_1'),
        createCard(Suit.Spades, Rank.Eight, 'lead_8s_2')
      ];
      
      // Player hand with various options
      const playerHand = [
        createCard(Suit.Spades, Rank.Nine, 'hand_9s_1'),
        createCard(Suit.Spades, Rank.Nine, 'hand_9s_2'),
        createCard(Suit.Spades, Rank.Ten, 'hand_10s'),
        createCard(Suit.Spades, Rank.Jack, 'hand_js'),
        createCard(Suit.Hearts, Rank.King, 'hand_hk')
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
        createCard(Suit.Spades, Rank.Seven, 'lead_7s_1'),
        createCard(Suit.Spades, Rank.Seven, 'lead_7s_2'),
        createCard(Suit.Spades, Rank.Eight, 'lead_8s_1'),
        createCard(Suit.Spades, Rank.Eight, 'lead_8s_2'),
        createCard(Suit.Spades, Rank.Nine, 'lead_9s_1'),
        createCard(Suit.Spades, Rank.Nine, 'lead_9s_2')
      ];
      
      // Player with sufficient Spades pairs
      const playerHand = [
        createCard(Suit.Spades, Rank.Ten, 'hand_10s_1'),
        createCard(Suit.Spades, Rank.Ten, 'hand_10s_2'),
        createCard(Suit.Spades, Rank.Jack, 'hand_js_1'),
        createCard(Suit.Spades, Rank.Jack, 'hand_js_2'),
        createCard(Suit.Spades, Rank.Queen, 'hand_qs_1'),
        createCard(Suit.Spades, Rank.Queen, 'hand_qs_2'),
        createCard(Suit.Hearts, Rank.King, 'hand_hk')
      ];
      
      // Player can form responding 3-pair tractor
      const validPlay = [
        createCard(Suit.Spades, Rank.Ten, 'hand_10s_1'),
        createCard(Suit.Spades, Rank.Ten, 'hand_10s_2'),
        createCard(Suit.Spades, Rank.Jack, 'hand_js_1'),
        createCard(Suit.Spades, Rank.Jack, 'hand_js_2'),
        createCard(Suit.Spades, Rank.Queen, 'hand_qs_1'),
        createCard(Suit.Spades, Rank.Queen, 'hand_qs_2')
      ];
      
      const isValid = isValidPlay(validPlay, threePairTractor, playerHand, trumpInfo);
      expect(isValid).toBe(true);
    });

    test('should prioritize trump pairs over non-trump pairs when following trump tractor', () => {
      const trumpInfo: TrumpInfo = { trumpSuit: Suit.Hearts, trumpRank: Rank.Two };
      
      // Leading trump tractor
      const leadingTrumpTractor = [
        createCard(Suit.Hearts, Rank.Five, 'lead_5h_1'),
        createCard(Suit.Hearts, Rank.Five, 'lead_5h_2'),
        createCard(Suit.Hearts, Rank.Six, 'lead_6h_1'),
        createCard(Suit.Hearts, Rank.Six, 'lead_6h_2')
      ];
      
      // Player has both trump and non-trump pairs
      const playerHand = [
        createCard(Suit.Hearts, Rank.Three, 'hand_3h_1'),    // Trump suit pair
        createCard(Suit.Hearts, Rank.Three, 'hand_3h_2'),
        createCard(Suit.Spades, Rank.Two, 'hand_2s_1'),      // Trump rank pair
        createCard(Suit.Spades, Rank.Two, 'hand_2s_2'),
        createCard(Suit.Clubs, Rank.Ace, 'hand_ac_1'),       // Non-trump pair
        createCard(Suit.Clubs, Rank.Ace, 'hand_ac_2'),
        createCard(Suit.Diamonds, Rank.King, 'hand_kd')
      ];
      
      // Valid: using trump pairs
      const trumpPairPlay = [
        createCard(Suit.Hearts, Rank.Three, 'hand_3h_1'),
        createCard(Suit.Hearts, Rank.Three, 'hand_3h_2'),
        createCard(Suit.Spades, Rank.Two, 'hand_2s_1'),
        createCard(Suit.Spades, Rank.Two, 'hand_2s_2')
      ];
      
      const isValidTrump = isValidPlay(trumpPairPlay, leadingTrumpTractor, playerHand, trumpInfo);
      expect(isValidTrump).toBe(true);
      
      // Invalid: mixing trump with non-trump when sufficient trump pairs available
      const mixedPlay = [
        createCard(Suit.Hearts, Rank.Three, 'hand_3h_1'),
        createCard(Suit.Hearts, Rank.Three, 'hand_3h_2'),
        createCard(Suit.Clubs, Rank.Ace, 'hand_ac_1'),
        createCard(Suit.Clubs, Rank.Ace, 'hand_ac_2')
      ];
      
      const isValidMixed = isValidPlay(mixedPlay, leadingTrumpTractor, playerHand, trumpInfo);
      expect(isValidMixed).toBe(false);
    });
  });
});