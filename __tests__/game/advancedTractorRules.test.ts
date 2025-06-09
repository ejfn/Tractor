import { 
  getTractorRank, 
  getTractorContext, 
  findAllTractors, 
  isValidTractor,
  getTractorTypeDescription
} from '../../src/game/tractorLogic';
import { ComboType, JokerType, Rank, Suit, TrumpInfo } from '../../src/types';
import { createCard, createJoker } from '../helpers/cards';

/**
 * Advanced Tractor Rules Tests - Issue #177
 * 
 * Tests the new unified tractor-rank system for:
 * 1. Trump suit rank pair + off-suit rank pair tractors
 * 2. Rank-skip tractors (any suit when trump rank creates gap)
 * 3. Multi-pair rank-skip tractors
 * 4. Verification that off-suit rank pairs don't form tractors
 */

describe('Advanced Tractor Rules - Unified Tractor Rank System', () => {
  
  describe('Tractor Rank Calculation', () => {
    const trumpInfo: TrumpInfo = { trumpSuit: Suit.Spades, trumpRank: Rank.Seven };

    test('should assign correct tractor ranks for jokers', () => {
      const bigJoker = createJoker(JokerType.Big, 'bj1');
      const smallJoker = createJoker(JokerType.Small, 'sj1');

      expect(getTractorRank(bigJoker, trumpInfo)).toBe(1020);
      expect(getTractorRank(smallJoker, trumpInfo)).toBe(1019);
    });

    test('should assign correct tractor ranks for trump rank cards', () => {
      const trumpSuitRank = createCard(Suit.Spades, Rank.Seven, 'trump_suit_7');
      const offSuitRank1 = createCard(Suit.Hearts, Rank.Seven, 'off_suit_7h');
      const offSuitRank2 = createCard(Suit.Clubs, Rank.Seven, 'off_suit_7c');

      expect(getTractorRank(trumpSuitRank, trumpInfo)).toBe(1017); // Trump suit rank
      expect(getTractorRank(offSuitRank1, trumpInfo)).toBe(1016); // Off-suit trump rank
      expect(getTractorRank(offSuitRank2, trumpInfo)).toBe(1016); // Off-suit trump rank
    });

    test('should assign correct tractor ranks for regular cards with trump rank bridging', () => {
      const trumpInfo7: TrumpInfo = { trumpSuit: Suit.Spades, trumpRank: Rank.Seven };
      
      // Cards below trump rank (7) should be shifted up by 1, plus Hearts suit offset (100)
      expect(getTractorRank(createCard(Suit.Hearts, Rank.Three, '3h'), trumpInfo7)).toBe(104); // (3+1) + 100
      expect(getTractorRank(createCard(Suit.Hearts, Rank.Four, '4h'), trumpInfo7)).toBe(105); // (4+1) + 100
      expect(getTractorRank(createCard(Suit.Hearts, Rank.Five, '5h'), trumpInfo7)).toBe(106); // (5+1) + 100
      expect(getTractorRank(createCard(Suit.Hearts, Rank.Six, '6h'), trumpInfo7)).toBe(107); // (6+1) + 100

      // Cards above trump rank (7) should remain unchanged, plus Hearts suit offset (100)
      expect(getTractorRank(createCard(Suit.Hearts, Rank.Eight, '8h'), trumpInfo7)).toBe(108); // 8 + 100
      expect(getTractorRank(createCard(Suit.Hearts, Rank.Nine, '9h'), trumpInfo7)).toBe(109); // 9 + 100
      expect(getTractorRank(createCard(Suit.Hearts, Rank.King, 'kh'), trumpInfo7)).toBe(113); // 13 + 100
      expect(getTractorRank(createCard(Suit.Hearts, Rank.Ace, 'ah'), trumpInfo7)).toBe(114); // 14 + 100
    });

    test('should assign correct tractor ranks when trump rank is Ace', () => {
      const trumpInfoAce: TrumpInfo = { trumpSuit: Suit.Hearts, trumpRank: Rank.Ace };
      
      // All regular cards below Ace should be shifted up by 1, plus Spades suit offset (0)
      expect(getTractorRank(createCard(Suit.Spades, Rank.King, 'ks'), trumpInfoAce)).toBe(14); // (13+1) + 0
      expect(getTractorRank(createCard(Suit.Spades, Rank.Queen, 'qs'), trumpInfoAce)).toBe(13); // (12+1) + 0
      expect(getTractorRank(createCard(Suit.Spades, Rank.Three, '3s'), trumpInfoAce)).toBe(4); // (3+1) + 0

      // Trump rank cards
      expect(getTractorRank(createCard(Suit.Hearts, Rank.Ace, 'ah'), trumpInfoAce)).toBe(1017); // Trump suit
      expect(getTractorRank(createCard(Suit.Spades, Rank.Ace, 'as'), trumpInfoAce)).toBe(1016); // Off-suit
    });
  });

  describe('Tractor Context Grouping', () => {
    const trumpInfo: TrumpInfo = { trumpSuit: Suit.Spades, trumpRank: Rank.Seven };

    test('should group jokers in joker context', () => {
      const bigJoker = createJoker(JokerType.Big, 'bj1');
      const smallJoker = createJoker(JokerType.Small, 'sj1');

      expect(getTractorContext(bigJoker, trumpInfo)).toBe('joker');
      expect(getTractorContext(smallJoker, trumpInfo)).toBe('joker');
    });

    test('should group trump rank cards in trump_rank context', () => {
      const trumpSuitRank = createCard(Suit.Spades, Rank.Seven, 'trump_suit_7');
      const offSuitRank = createCard(Suit.Hearts, Rank.Seven, 'off_suit_7');

      expect(getTractorContext(trumpSuitRank, trumpInfo)).toBe('trump_rank');
      expect(getTractorContext(offSuitRank, trumpInfo)).toBe('trump_rank');
    });

    test('should group regular cards by suit', () => {
      const heartCard = createCard(Suit.Hearts, Rank.Six, '6h');
      const spadeCard = createCard(Suit.Spades, Rank.Eight, '8s');

      expect(getTractorContext(heartCard, trumpInfo)).toBe(Suit.Hearts);
      expect(getTractorContext(spadeCard, trumpInfo)).toBe(Suit.Spades);
    });
  });

  describe('Trump Cross-Suit Tractors', () => {
    test('should form tractor with trump suit rank pair + off-suit rank pair', () => {
      const trumpInfo: TrumpInfo = { trumpSuit: Suit.Spades, trumpRank: Rank.Two };
      
      const cards = [
        createCard(Suit.Spades, Rank.Two, 'trump_2s_1'),
        createCard(Suit.Spades, Rank.Two, 'trump_2s_2'),
        createCard(Suit.Hearts, Rank.Two, 'off_2h_1'),
        createCard(Suit.Hearts, Rank.Two, 'off_2h_2'),
      ];

      const tractors = findAllTractors(cards, trumpInfo);
      expect(tractors).toHaveLength(1);
      expect(tractors[0].type).toBe(ComboType.Tractor);
      expect(tractors[0].cards).toHaveLength(4);
      
      const description = getTractorTypeDescription(cards, trumpInfo);
      expect(description).toBe('Trump cross-suit tractor');
    });

    test('should NOT form tractor with only off-suit rank pairs', () => {
      const trumpInfo: TrumpInfo = { trumpSuit: Suit.Spades, trumpRank: Rank.Two };
      
      const cards = [
        createCard(Suit.Hearts, Rank.Two, 'off_2h_1'),
        createCard(Suit.Hearts, Rank.Two, 'off_2h_2'),
        createCard(Suit.Clubs, Rank.Two, 'off_2c_1'),
        createCard(Suit.Clubs, Rank.Two, 'off_2c_2'),
      ];

      const tractors = findAllTractors(cards, trumpInfo);
      expect(tractors).toHaveLength(0); // No tractors should be formed

      expect(isValidTractor(cards, trumpInfo)).toBe(false);
    });

    test('should form tractor with trump suit + off-suit trump rank pairs', () => {
      const trumpInfo: TrumpInfo = { trumpSuit: Suit.Hearts, trumpRank: Rank.King };
      
      const cards = [
        createCard(Suit.Hearts, Rank.King, 'trump_kh_1'),
        createCard(Suit.Hearts, Rank.King, 'trump_kh_2'),
        createCard(Suit.Spades, Rank.King, 'off_ks_1'),
        createCard(Suit.Spades, Rank.King, 'off_ks_2'),
        createCard(Suit.Clubs, Rank.King, 'off_kc_1'),
        createCard(Suit.Clubs, Rank.King, 'off_kc_2'),
      ];

      const tractors = findAllTractors(cards, trumpInfo);
      expect(tractors).toHaveLength(1);
      expect(tractors[0].type).toBe(ComboType.Tractor);
      expect(tractors[0].cards).toHaveLength(4); // Two pairs: off-suit rank (16) + trump suit rank (17)
      
      // Should include trump suit pair and one off-suit pair
      const tractorCardIds = tractors[0].cards.map(card => card.id);
      expect(tractorCardIds).toContain('trump_kh_1');
      expect(tractorCardIds).toContain('trump_kh_2');
      // Should contain one of the off-suit pairs (either Spades or Clubs)
      const hasOffSuitPair = tractorCardIds.includes('off_ks_1') && tractorCardIds.includes('off_ks_2') ||
                            tractorCardIds.includes('off_kc_1') && tractorCardIds.includes('off_kc_2');
      expect(hasOffSuitPair).toBe(true);
    });
  });

  describe('Rank-Skip Tractors', () => {
    test('should form rank-skip tractor when trump rank creates gap', () => {
      const trumpInfo: TrumpInfo = { trumpSuit: Suit.Hearts, trumpRank: Rank.Seven };
      
      const cards = [
        createCard(Suit.Spades, Rank.Six, '6s_1'),
        createCard(Suit.Spades, Rank.Six, '6s_2'),
        createCard(Suit.Spades, Rank.Eight, '8s_1'),
        createCard(Suit.Spades, Rank.Eight, '8s_2'),
      ];

      const tractors = findAllTractors(cards, trumpInfo);
      expect(tractors).toHaveLength(1);
      expect(tractors[0].type).toBe(ComboType.Tractor);
      expect(tractors[0].cards).toHaveLength(4);

      expect(isValidTractor(cards, trumpInfo)).toBe(true);
      
      const description = getTractorTypeDescription(cards, trumpInfo);
      expect(description).toBe('Regular same-suit tractor'); // Appears regular due to bridging
    });

    test('should form multi-pair rank-skip tractor', () => {
      const trumpInfo: TrumpInfo = { trumpSuit: Suit.Hearts, trumpRank: Rank.Seven };
      
      const cards = [
        createCard(Suit.Spades, Rank.Six, '6s_1'),
        createCard(Suit.Spades, Rank.Six, '6s_2'),
        createCard(Suit.Spades, Rank.Eight, '8s_1'),
        createCard(Suit.Spades, Rank.Eight, '8s_2'),
        createCard(Suit.Spades, Rank.Nine, '9s_1'),
        createCard(Suit.Spades, Rank.Nine, '9s_2'),
        createCard(Suit.Spades, Rank.Ten, '10s_1'),
        createCard(Suit.Spades, Rank.Ten, '10s_2'),
      ];

      const tractors = findAllTractors(cards, trumpInfo);
      expect(tractors).toHaveLength(6); // Multiple overlapping tractors
      
      // Should include the full 4-pair tractor
      const fullTractor = tractors.find(t => t.cards.length === 8);
      expect(fullTractor).toBeDefined();
      expect(fullTractor!.type).toBe(ComboType.Tractor);
      expect(fullTractor!.cards).toHaveLength(8); // Four pairs

      expect(isValidTractor(cards, trumpInfo)).toBe(true);
    });

    test('should form mixed consecutive and rank-skip tractor', () => {
      const trumpInfo: TrumpInfo = { trumpSuit: Suit.Hearts, trumpRank: Rank.Seven };
      
      const cards = [
        createCard(Suit.Spades, Rank.Five, '5s_1'),
        createCard(Suit.Spades, Rank.Five, '5s_2'),
        createCard(Suit.Spades, Rank.Six, '6s_1'),
        createCard(Suit.Spades, Rank.Six, '6s_2'),
        createCard(Suit.Spades, Rank.Eight, '8s_1'),
        createCard(Suit.Spades, Rank.Eight, '8s_2'),
      ];

      const tractors = findAllTractors(cards, trumpInfo);
      expect(tractors).toHaveLength(3); // Multiple overlapping tractors
      
      // Should include the full 3-pair tractor
      const fullTractor = tractors.find(t => t.cards.length === 6);
      expect(fullTractor).toBeDefined();
      expect(fullTractor!.type).toBe(ComboType.Tractor);
      expect(fullTractor!.cards).toHaveLength(6); // Three pairs: 5-6-[7]-8

      expect(isValidTractor(cards, trumpInfo)).toBe(true);
    });

    test('should NOT form tractor when gap is not trump rank', () => {
      const trumpInfo: TrumpInfo = { trumpSuit: Suit.Hearts, trumpRank: Rank.Five };
      
      const cards = [
        createCard(Suit.Spades, Rank.Six, '6s_1'),
        createCard(Suit.Spades, Rank.Six, '6s_2'),
        createCard(Suit.Spades, Rank.Eight, '8s_1'),
        createCard(Suit.Spades, Rank.Eight, '8s_2'),
      ];

      const tractors = findAllTractors(cards, trumpInfo);
      expect(tractors).toHaveLength(0); // No tractor - 7 is not trump rank

      expect(isValidTractor(cards, trumpInfo)).toBe(false);
    });
  });

  describe('Joker Tractors', () => {
    test('should form joker tractor with SJ-SJ + BJ-BJ', () => {
      const trumpInfo: TrumpInfo = { trumpSuit: Suit.Hearts, trumpRank: Rank.Seven };
      
      const cards = [
        createJoker(JokerType.Small, 'sj1'),
        createJoker(JokerType.Small, 'sj2'),
        createJoker(JokerType.Big, 'bj1'),
        createJoker(JokerType.Big, 'bj2'),
      ];

      const tractors = findAllTractors(cards, trumpInfo);
      expect(tractors).toHaveLength(1);
      expect(tractors[0].type).toBe(ComboType.Tractor);
      expect(tractors[0].cards).toHaveLength(4);

      expect(isValidTractor(cards, trumpInfo)).toBe(true);
      
      const description = getTractorTypeDescription(cards, trumpInfo);
      expect(description).toBe('Joker tractor');
    });
  });

  describe('Invalid Tractor Combinations', () => {
    test('should NOT form tractor with trump rank + joker pairs', () => {
      const trumpInfo: TrumpInfo = { trumpSuit: Suit.Spades, trumpRank: Rank.Two };
      
      const cards = [
        createCard(Suit.Spades, Rank.Two, 'trump_2s_1'),
        createCard(Suit.Spades, Rank.Two, 'trump_2s_2'),
        createJoker(JokerType.Small, 'sj1'),
        createJoker(JokerType.Small, 'sj2'),
      ];

      const tractors = findAllTractors(cards, trumpInfo);
      expect(tractors).toHaveLength(0); // Different contexts, different tractor ranks

      expect(isValidTractor(cards, trumpInfo)).toBe(false);
    });

    test('should NOT form tractor with non-trump cross-suit pairs', () => {
      const trumpInfo: TrumpInfo = { trumpSuit: Suit.Hearts, trumpRank: Rank.Two };
      
      const cards = [
        createCard(Suit.Spades, Rank.Six, '6s_1'),
        createCard(Suit.Spades, Rank.Six, '6s_2'),
        createCard(Suit.Clubs, Rank.Six, '6c_1'),
        createCard(Suit.Clubs, Rank.Six, '6c_2'),
      ];

      const tractors = findAllTractors(cards, trumpInfo);
      expect(tractors).toHaveLength(0); // Different suits, not trump rank

      expect(isValidTractor(cards, trumpInfo)).toBe(false);
    });

    test('should NOT form tractor with consecutive ranks from different suits', () => {
      const trumpInfo: TrumpInfo = { trumpSuit: Suit.Hearts, trumpRank: Rank.Two };
      
      const cards = [
        createCard(Suit.Spades, Rank.Six, '6s_1'),
        createCard(Suit.Spades, Rank.Six, '6s_2'),
        createCard(Suit.Clubs, Rank.Seven, '7c_1'),
        createCard(Suit.Clubs, Rank.Seven, '7c_2'),
      ];

      const tractors = findAllTractors(cards, trumpInfo);
      expect(tractors).toHaveLength(0); // No tractors should be formed - different suits

      expect(isValidTractor(cards, trumpInfo)).toBe(false);
    });

    test('should NOT form tractor with insufficient cards', () => {
      const trumpInfo: TrumpInfo = { trumpSuit: Suit.Hearts, trumpRank: Rank.Seven };
      
      const cards = [
        createCard(Suit.Spades, Rank.Six, '6s_1'),
        createCard(Suit.Spades, Rank.Six, '6s_2'),
      ];

      expect(isValidTractor(cards, trumpInfo)).toBe(false);
    });

    test('should NOT form tractor with odd number of cards', () => {
      const trumpInfo: TrumpInfo = { trumpSuit: Suit.Hearts, trumpRank: Rank.Seven };
      
      const cards = [
        createCard(Suit.Spades, Rank.Six, '6s_1'),
        createCard(Suit.Spades, Rank.Six, '6s_2'),
        createCard(Suit.Spades, Rank.Eight, '8s_1'),
      ];

      expect(isValidTractor(cards, trumpInfo)).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    test('should handle trump rank at extremes', () => {
      // Trump rank is 3 (low)
      const trumpInfo3: TrumpInfo = { trumpSuit: Suit.Hearts, trumpRank: Rank.Three };
      
      const cards3 = [
        createCard(Suit.Spades, Rank.Two, '2s_1'),
        createCard(Suit.Spades, Rank.Two, '2s_2'),
        createCard(Suit.Spades, Rank.Four, '4s_1'),
        createCard(Suit.Spades, Rank.Four, '4s_2'),
      ];

      expect(isValidTractor(cards3, trumpInfo3)).toBe(true); // 2-[3]-4 bridged

      // Trump rank is Ace (high)
      const trumpInfoAce: TrumpInfo = { trumpSuit: Suit.Hearts, trumpRank: Rank.Ace };
      
      const cardsAce = [
        createCard(Suit.Spades, Rank.King, 'ks_1'),
        createCard(Suit.Spades, Rank.King, 'ks_2'),
        createCard(Suit.Spades, Rank.Queen, 'qs_1'),
        createCard(Suit.Spades, Rank.Queen, 'qs_2'),
      ];

      expect(isValidTractor(cardsAce, trumpInfoAce)).toBe(true); // Q-K consecutive after shift
    });

    test('should handle complex multi-context scenarios', () => {
      const trumpInfo: TrumpInfo = { trumpSuit: Suit.Hearts, trumpRank: Rank.Seven };
      
      const cards = [
        // Trump rank context - should form tractor
        createCard(Suit.Hearts, Rank.Seven, 'trump_7h_1'),
        createCard(Suit.Hearts, Rank.Seven, 'trump_7h_2'),
        createCard(Suit.Spades, Rank.Seven, 'off_7s_1'),
        createCard(Suit.Spades, Rank.Seven, 'off_7s_2'),
        // Regular suit context - should form separate tractor
        createCard(Suit.Clubs, Rank.Six, '6c_1'),
        createCard(Suit.Clubs, Rank.Six, '6c_2'),
        createCard(Suit.Clubs, Rank.Eight, '8c_1'),
        createCard(Suit.Clubs, Rank.Eight, '8c_2'),
      ];

      const tractors = findAllTractors(cards, trumpInfo);
      expect(tractors).toHaveLength(2); // Two separate tractors

      // Each should be valid
      expect(tractors[0].type).toBe(ComboType.Tractor);
      expect(tractors[1].type).toBe(ComboType.Tractor);
    });
  });
});