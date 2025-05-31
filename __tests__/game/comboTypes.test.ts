import {
  identifyCombos,
  getComboType,
  isTrump,
  compareCards
} from '../../src/game/gameLogic';
import {
  Suit, 
  Rank, 
  JokerType,
  ComboType,
  TrumpInfo
} from "../../src/types";
import { describe, test, expect } from '@jest/globals';
import {
  createCard,
  createJoker,
  createTrumpScenarios,
  testData
} from "../helpers";

describe('Combo Type Identification Tests', () => {
  // Standard trump info for tests
  const trumpInfo = createTrumpScenarios.spadesTrump();

  describe('Single Card Combos', () => {
    test('Every card should be identifiable as a Single', () => {
      // Use predefined test cards
      const aceOfSpades = testData.cards.spadesAce;
      const twoOfHearts = createCard(Suit.Hearts, Rank.Two);
      const bigJoker = testData.cards.bigJoker;
      
      // Test with individual cards
      const combos1 = identifyCombos([aceOfSpades], trumpInfo);
      const combos2 = identifyCombos([twoOfHearts], trumpInfo);
      const combos3 = identifyCombos([bigJoker], trumpInfo);
      
      // Each should yield exactly one Single combo
      expect(combos1.length).toBe(1);
      expect(combos1[0].type).toBe(ComboType.Single);
      expect(combos1[0].cards.length).toBe(1);
      expect(combos1[0].cards[0].suit).toBe(Suit.Spades);
      expect(combos1[0].cards[0].rank).toBe(Rank.Ace);
      
      expect(combos2.length).toBe(1);
      expect(combos2[0].type).toBe(ComboType.Single);
      
      expect(combos3.length).toBe(1);
      expect(combos3[0].type).toBe(ComboType.Single);
    });
    
    test('getComboType should identify Singles', () => {
      const card = createCard(Suit.Hearts, Rank.Ace, 'hearts_a_1');
      expect(getComboType([card])).toBe(ComboType.Single);
    });
  });

  describe('Pair Combos', () => {
    test('Should identify pairs of the same rank', () => {
      // Use predefined pair and additional card
      const [kingHearts1, kingHearts2] = testData.pairs.clubsKings; // Use any pair, just need structure
      const queenHearts = createCard(Suit.Hearts, Rank.Queen);
      
      // Test with a valid pair
      const validPairHand = [kingHearts1, kingHearts2, queenHearts];
      const combos = identifyCombos(validPairHand, trumpInfo);
      
      // Should identify singles and the pair
      expect(combos.length).toBeGreaterThanOrEqual(4); // 3 singles + 1 pair
      
      // Check that the pair was found
      const pairCombos = combos.filter(combo => combo.type === ComboType.Pair);
      expect(pairCombos.length).toBe(1);
      expect(pairCombos[0].cards.length).toBe(2);
      expect(pairCombos[0].cards[0].rank).toBe(pairCombos[0].cards[1].rank);
    });
    
    test('getComboType should identify Pairs', () => {
      const heartsAces = testData.pairs.spadesAces; // Use predefined pair
      
      expect(getComboType(heartsAces)).toBe(ComboType.Pair);
    });
    
    test('Joker pairs should be identified', () => {
      // Create pair of same jokers using helper
      const smallJokerPair = [
        createJoker(JokerType.Small, 'small_joker_1'),
        createJoker(JokerType.Small, 'small_joker_2')
      ];

      const combos = identifyCombos(smallJokerPair, trumpInfo);

      // Expect 3 combos: 2 singles + 1 pair
      expect(combos.length).toBe(3);

      // Test that getComboType would correctly identify a pair of jokers if given directly
      expect(getComboType(smallJokerPair)).toBe(ComboType.Pair);
    });
    
    test('Different jokers should not form a pair', () => {
      // Use predefined jokers
      const smallJoker = testData.cards.smallJoker;
      const bigJoker = testData.cards.bigJoker;
      
      const hand = [smallJoker, bigJoker];
      const combos = identifyCombos(hand, trumpInfo);
      
      // Should only have singles, no pairs
      const pairCombos = combos.filter(combo => combo.type === ComboType.Pair);
      expect(pairCombos.length).toBe(0);
    });
  });

  describe('Tractor Combos', () => {
    test('Joker tractor: SJ-SJ-BJ-BJ conceptually forms a tractor', () => {
      // Create joker pairs
      const smallJoker1 = createJoker(JokerType.Small, 'small_joker_1');
      const smallJoker2 = createJoker(JokerType.Small, 'small_joker_2');
      const bigJoker1 = createJoker(JokerType.Big, 'big_joker_1');
      const bigJoker2 = createJoker(JokerType.Big, 'big_joker_2');

      // Create the joker tractor hand
      const jokerTractor = [smallJoker1, smallJoker2, bigJoker1, bigJoker2];

      // Jokers should be identified as trumps
      expect(isTrump(smallJoker1, trumpInfo)).toBe(true);
      expect(isTrump(bigJoker1, trumpInfo)).toBe(true);

      // NOTE: In the current implementation, getComboType doesn't handle joker tractors
      // because jokers don't have ranks, but in the game rules this would be a valid tractor

      // Verify we can identify individual joker pairs
      expect(getComboType([smallJoker1, smallJoker2])).toBe(ComboType.Pair);
      expect(getComboType([bigJoker1, bigJoker2])).toBe(ComboType.Pair);

      // This test documents that in Shengji rules, SJ-SJ-BJ-BJ is supposed to be the highest tractor,
      // even though our current implementation doesn't identify it as one
    });
    
    test('Should identify tractor (consecutive pairs of same suit)', () => {
      // Create cards for a tractor: 7-7-8-8 of Hearts
      const heart7a = createCard(Suit.Hearts, Rank.Seven, 'hearts_7_1');
      const heart7b = createCard(Suit.Hearts, Rank.Seven, 'hearts_7_2');
      const heart8a = createCard(Suit.Hearts, Rank.Eight, 'hearts_8_1');
      const heart8b = createCard(Suit.Hearts, Rank.Eight, 'hearts_8_2');
      
      // Hand with the tractor cards
      const hand = [heart7a, heart7b, heart8a, heart8b];
      
      // This function is a placeholder in the original code so it won't find tractors
      // For testing purposes, we'll directly test the getComboType function
      expect(getComboType(hand)).toBe(ComboType.Tractor);
    });
    
    test('Should identify tractor 6♦-6♦-5♦-5♦ in all possible card orderings', () => {
      // Create cards for a tractor: 5-5-6-6 of Diamonds
      const d6a = createCard(Suit.Diamonds, Rank.Six, 'diamonds_6_1');
      const d6b = createCard(Suit.Diamonds, Rank.Six, 'diamonds_6_2');
      const d5a = createCard(Suit.Diamonds, Rank.Five, 'diamonds_5_1');
      const d5b = createCard(Suit.Diamonds, Rank.Five, 'diamonds_5_2');
      
      // All possible permutations of 4 cards
      const allOrderings = [
        [d5a, d5b, d6a, d6b], // 5566
        [d5a, d5b, d6b, d6a], // 5565 (swapped 6s)
        [d5b, d5a, d6a, d6b], // 5566 (swapped 5s)
        [d5b, d5a, d6b, d6a], // 5565 (swapped both)
        [d5a, d6a, d5b, d6b], // 5656
        [d5a, d6a, d6b, d5b], // 5665
        [d5a, d6b, d5b, d6a], // 5656 (different)
        [d5a, d6b, d6a, d5b], // 5665 (different)
        [d5b, d6a, d5a, d6b], // 5656 (different)
        [d5b, d6a, d6b, d5a], // 5665 (different)
        [d5b, d6b, d5a, d6a], // 5656 (different)
        [d5b, d6b, d6a, d5a], // 5665 (different)
        [d6a, d6b, d5a, d5b], // 6655
        [d6a, d6b, d5b, d5a], // 6655 (swapped 5s)
        [d6b, d6a, d5a, d5b], // 6655 (swapped 6s)
        [d6b, d6a, d5b, d5a], // 6655 (swapped both)
        [d6a, d5a, d6b, d5b], // 6565
        [d6a, d5a, d5b, d6b], // 6556
        [d6a, d5b, d6b, d5a], // 6565 (different)
        [d6a, d5b, d5a, d6b], // 6556 (different)
        [d6b, d5a, d6a, d5b], // 6565 (different)
        [d6b, d5a, d5b, d6a], // 6556 (different)
        [d6b, d5b, d6a, d5a], // 6565 (different)
        [d6b, d5b, d5a, d6a], // 6556 (different)
      ];
      
      // All orderings should be recognized as tractors
      allOrderings.forEach((ordering, index) => {
        const orderString = ordering.map(c => c.rank === Rank.Five ? '5' : '6').join('');
        expect(getComboType(ordering)).toBe(ComboType.Tractor);
      });
    });
    
    test('Non-consecutive pairs should not form a tractor', () => {
      // Create cards for non-consecutive pairs: 5-5-9-9 of Hearts
      const heart5a = createCard(Suit.Hearts, Rank.Five, 'hearts_5_1');
      const heart5b = createCard(Suit.Hearts, Rank.Five, 'hearts_5_2');
      const heart9a = createCard(Suit.Hearts, Rank.Nine, 'hearts_9_1');
      const heart9b = createCard(Suit.Hearts, Rank.Nine, 'hearts_9_2');
      
      // Non-consecutive pairs
      const nonConsecutivePairs = [heart5a, heart5b, heart9a, heart9b];
      
      // Should not be identified as a tractor
      expect(getComboType(nonConsecutivePairs)).not.toBe(ComboType.Tractor);
    });
    
    test('Consecutive pairs of different suits should not form a tractor', () => {
      // Create cards for consecutive pairs of different suits: 7-7 Hearts, 8-8 Spades
      const heart7a = createCard(Suit.Hearts, Rank.Seven, 'hearts_7_1');
      const heart7b = createCard(Suit.Hearts, Rank.Seven, 'hearts_7_2');
      const spade8a = createCard(Suit.Spades, Rank.Eight, 'spades_8_1');
      const spade8b = createCard(Suit.Spades, Rank.Eight, 'spades_8_2');
      
      // Consecutive pairs but different suits
      const mixedSuitPairs = [heart7a, heart7b, spade8a, spade8b];
      
      // Should not be identified as a tractor
      expect(getComboType(mixedSuitPairs)).not.toBe(ComboType.Tractor);
    });
    
    test('Pair at the rank boundary (A-A-2-2) should not form a tractor', () => {
      // Create cards for A-A-2-2 of the same suit
      const aceA = createCard(Suit.Hearts, Rank.Ace, 'hearts_a_1');
      const aceB = createCard(Suit.Hearts, Rank.Ace, 'hearts_a_2');
      const twoA = createCard(Suit.Hearts, Rank.Two, 'hearts_2_1');
      const twoB = createCard(Suit.Hearts, Rank.Two, 'hearts_2_2');

      // Ace and Two pairs (non-consecutive in rank order)
      const aceTwoPairs = [aceA, aceB, twoA, twoB];

      // Should not be identified as a tractor
      expect(getComboType(aceTwoPairs)).not.toBe(ComboType.Tractor);
    });

    test('Trump cards of different levels should not form a tractor', () => {
      // Special case: When 3 is trump rank, 2♠-2♠-3♠-3♠ should not form a tractor
      // even though they're consecutive ranks and same suit

      // Create a trumpInfo where 3 is the trump rank and Spades is trump suit
      const trumpInfo3: TrumpInfo = {
        trumpRank: Rank.Three,
        trumpSuit: Suit.Spades,
        
      };

      // Create the cards
      const spade2a = createCard(Suit.Spades, Rank.Two, 'spades_2_1');
      const spade2b = createCard(Suit.Spades, Rank.Two, 'spades_2_2');
      const spade3a = createCard(Suit.Spades, Rank.Three, 'spades_3_1');
      const spade3b = createCard(Suit.Spades, Rank.Three, 'spades_3_2');

      const hand = [spade2a, spade2b, spade3a, spade3b];

      // Check if these cards are trumps
      expect(isTrump(spade2a, trumpInfo3)).toBe(true); // Trump suit
      expect(isTrump(spade3a, trumpInfo3)).toBe(true); // Trump rank

      // When we run identifyCombos, it should not find a tractor
      const combos = identifyCombos(hand, trumpInfo3);

      // No tractors should be found
      const tractorCombos = combos.filter(combo => combo.type === ComboType.Tractor);
      expect(tractorCombos.length).toBe(0);

      // Should find two separate pairs
      const pairCombos = combos.filter(combo => combo.type === ComboType.Pair);
      expect(pairCombos.length).toBe(2);
    });
    
    test('Trump suit tractor: should form a tractor within the trump suit', () => {
      // Create a trumpInfo with Hearts as trump suit
      const trumpInfoHearts: TrumpInfo = {
        trumpRank: Rank.Two,
        trumpSuit: Suit.Hearts,
        
      };
      
      // Create 7-7-8-8 of Hearts (the trump suit)
      const heart7a = createCard(Suit.Hearts, Rank.Seven, 'hearts_7_1');
      const heart7b = createCard(Suit.Hearts, Rank.Seven, 'hearts_7_2');
      const heart8a = createCard(Suit.Hearts, Rank.Eight, 'hearts_8_1');
      const heart8b = createCard(Suit.Hearts, Rank.Eight, 'hearts_8_2');
      
      const hand = [heart7a, heart7b, heart8a, heart8b];
      
      // Verify these are all trump cards
      expect(isTrump(heart7a, trumpInfoHearts)).toBe(true);
      expect(isTrump(heart8a, trumpInfoHearts)).toBe(true);
      
      // They should still form a tractor even though they're trump cards
      // because they're all in the same trump category (trump suit)
      expect(getComboType(hand)).toBe(ComboType.Tractor);
    });
    
    test('Trump tractors should beat non-trump tractors', () => {
      // Create a trumpInfo with Hearts as trump suit
      const trumpInfoHearts: TrumpInfo = {
        trumpRank: Rank.Two,
        trumpSuit: Suit.Hearts,
        
      };
      
      // Create a tractor in Hearts (trump)
      const heart3a = createCard(Suit.Hearts, Rank.Three, 'hearts_3_1');
      const heart3b = createCard(Suit.Hearts, Rank.Three, 'hearts_3_2');
      const heart4a = createCard(Suit.Hearts, Rank.Four, 'hearts_4_1');
      const heart4b = createCard(Suit.Hearts, Rank.Four, 'hearts_4_2');
      
      // Create a higher tractor in Spades (non-trump)
      const spadeQa = createCard(Suit.Spades, Rank.Queen, 'spades_q_1');
      const spadeQb = createCard(Suit.Spades, Rank.Queen, 'spades_q_2');
      const spadeKa = createCard(Suit.Spades, Rank.King, 'spades_k_1');
      const spadeKb = createCard(Suit.Spades, Rank.King, 'spades_k_2');
      
      const trumpTractor = [heart3a, heart3b, heart4a, heart4b];
      const nonTrumpTractor = [spadeQa, spadeQb, spadeKa, spadeKb];
      
      // Both should be tractors
      expect(getComboType(trumpTractor)).toBe(ComboType.Tractor);
      expect(getComboType(nonTrumpTractor)).toBe(ComboType.Tractor);
      
      // Compare individual cards to verify that trump beats non-trump
      expect(compareCards(heart3a, spadeQa, trumpInfoHearts)).toBeGreaterThan(0);
      expect(compareCards(heart4a, spadeKa, trumpInfoHearts)).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases and Special Combos', () => {
    test('Trump cards should be correctly identified', () => {
      // Create trump cards: 2 of Spades (trump rank + suit), 2 of Hearts (trump rank)
      const trumpRankAndSuit = createCard(Suit.Spades, Rank.Two, 'spades_2_1');
      const trumpRankOnly = createCard(Suit.Hearts, Rank.Two, 'hearts_2_1');
      const trumpSuitOnly = createCard(Suit.Spades, Rank.King, 'spades_k_1');
      const nonTrump = createCard(Suit.Hearts, Rank.King, 'hearts_k_1');
      
      // Check trump status
      expect(isTrump(trumpRankAndSuit, trumpInfo)).toBe(true);
      expect(isTrump(trumpRankOnly, trumpInfo)).toBe(true);
      expect(isTrump(trumpSuitOnly, trumpInfo)).toBe(true);
      expect(isTrump(nonTrump, trumpInfo)).toBe(false);
    });

    test('Same-rank trump cards from different suits should not form a tractor', () => {
      // Create a trumpInfo with 2 as trump rank and Spades as trump suit
      const trumpInfo2: TrumpInfo = {
        trumpRank: Rank.Two,
        trumpSuit: Suit.Spades,
        
      };

      // Create pairs of 2s from different suits (all are trump due to rank)
      const club2a = createCard(Suit.Clubs, Rank.Two, 'clubs_2_1');
      const club2b = createCard(Suit.Clubs, Rank.Two, 'clubs_2_2');
      const diamond2a = createCard(Suit.Diamonds, Rank.Two, 'diamonds_2_1');
      const diamond2b = createCard(Suit.Diamonds, Rank.Two, 'diamonds_2_2');

      const hand = [club2a, club2b, diamond2a, diamond2b];

      // Verify these are all trump cards
      expect(isTrump(club2a, trumpInfo2)).toBe(true);
      expect(isTrump(diamond2a, trumpInfo2)).toBe(true);

      // They should not form a tractor
      expect(getComboType(hand)).not.toBe(ComboType.Tractor);

      // They should be identified as separate pairs in identifyCombos
      const combos = identifyCombos(hand, trumpInfo2);
      const tractorCombos = combos.filter(combo => combo.type === ComboType.Tractor);
      expect(tractorCombos.length).toBe(0);

      // Should find pairs, but no tractors
      const pairCombos = combos.filter(combo => combo.type === ComboType.Pair);
      expect(pairCombos.length).toBeGreaterThan(0);
    });

    test('Joker combinations with trump cards should not form tractors', () => {
      // Create a mix of jokers and trump cards
      const smallJoker1 = createJoker(JokerType.Small, 'small_joker_1');
      const smallJoker2 = createJoker(JokerType.Small, 'small_joker_2');
      const spade2a = createCard(Suit.Spades, Rank.Two, 'spades_2_1');
      const spade2b = createCard(Suit.Spades, Rank.Two, 'spades_2_2');

      const hand = [smallJoker1, smallJoker2, spade2a, spade2b];

      // All are trump cards
      expect(isTrump(smallJoker1, trumpInfo)).toBe(true);
      expect(isTrump(spade2a, trumpInfo)).toBe(true);

      // They should not form a tractor
      expect(getComboType(hand)).not.toBe(ComboType.Tractor);

      // When we run identifyCombos, it should not find a tractor
      const combos = identifyCombos(hand, trumpInfo);
      const tractorCombos = combos.filter(combo => combo.type === ComboType.Tractor);
      expect(tractorCombos.length).toBe(0);
    });

    test('A-A-2-2 combination with 2 as trump rank should not form a tractor', () => {
      // Create A-A-2-2 in Hearts with 2 as trump rank
      const heart2a = createCard(Suit.Hearts, Rank.Two, 'hearts_2_1');
      const heart2b = createCard(Suit.Hearts, Rank.Two, 'hearts_2_2');
      const heartAa = createCard(Suit.Hearts, Rank.Ace, 'hearts_a_1');
      const heartAb = createCard(Suit.Hearts, Rank.Ace, 'hearts_a_2');

      const trumpInfo2: TrumpInfo = {
        trumpRank: Rank.Two,
        trumpSuit: Suit.Spades,
        
      };

      const hand = [heartAa, heartAb, heart2a, heart2b];

      // Verify 2 is trump, Ace is not
      expect(isTrump(heart2a, trumpInfo2)).toBe(true);
      expect(isTrump(heartAa, trumpInfo2)).toBe(false);

      // They should not form a tractor
      expect(getComboType(hand)).not.toBe(ComboType.Tractor);

      // When we run identifyCombos, it should not find a tractor
      const combos = identifyCombos(hand, trumpInfo2);
      const tractorCombos = combos.filter(combo => combo.type === ComboType.Tractor);
      expect(tractorCombos.length).toBe(0);
    });

    test('Mixed hand should identify all valid combos', () => {
      // Create a complex hand with various combos
      const spadeK1 = createCard(Suit.Spades, Rank.King, 'spades_k_1');
      const spadeK2 = createCard(Suit.Spades, Rank.King, 'spades_k_2');
      const heart7 = createCard(Suit.Hearts, Rank.Seven, 'hearts_7_1');
      const diamond9 = createCard(Suit.Diamonds, Rank.Nine, 'diamonds_9_1');
      const smallJoker = createJoker(JokerType.Small, 'small_joker_1');

      const mixedHand = [spadeK1, spadeK2, heart7, diamond9, smallJoker];
      const combos = identifyCombos(mixedHand, trumpInfo);

      // Should find 5 singles + 1 pair
      expect(combos.length).toBe(6);

      // Check that each card is identified as a single
      expect(combos.filter(c => c.type === ComboType.Single).length).toBe(5);

      // Check that the pair is found
      const pairCombos = combos.filter(c => c.type === ComboType.Pair);
      expect(pairCombos.length).toBe(1);
      expect(pairCombos[0].cards.map(c => c.id)).toEqual(
        expect.arrayContaining(['spades_k_1', 'spades_k_2'])
      );
    });

    test('Cards in a suit should be grouped together', () => {
      // Create three cards of the same suit and one of a different suit
      const club5 = createCard(Suit.Clubs, Rank.Five, 'clubs_5_1');
      const club7 = createCard(Suit.Clubs, Rank.Seven, 'clubs_7_1');
      const club9 = createCard(Suit.Clubs, Rank.Nine, 'clubs_9_1');
      const heartA = createCard(Suit.Hearts, Rank.Ace, 'hearts_a_1');

      const hand = [club5, heartA, club7, club9];
      const combos = identifyCombos(hand, trumpInfo);

      // We expect 4 singles - no other combinations
      expect(combos.filter(c => c.type === ComboType.Single).length).toBe(4);
      expect(combos.length).toBe(4);
    });
  });

  describe('Longer Tractor Validation', () => {
    test('Should identify 6-card tractor (A-A-K-K-Q-Q)', () => {
      // Create cards for a 6-card tractor: A-A-K-K-Q-Q of Spades
      const spadeAa = createCard(Suit.Spades, Rank.Ace, 'spades_a_1');
      const spadeAb = createCard(Suit.Spades, Rank.Ace, 'spades_a_2');
      const spadeKa = createCard(Suit.Spades, Rank.King, 'spades_k_1');
      const spadeKb = createCard(Suit.Spades, Rank.King, 'spades_k_2');
      const spadeQa = createCard(Suit.Spades, Rank.Queen, 'spades_q_1');
      const spadeQb = createCard(Suit.Spades, Rank.Queen, 'spades_q_2');
      
      const hand = [spadeAa, spadeAb, spadeKa, spadeKb, spadeQa, spadeQb];
      
      // Should be identified as a tractor
      expect(getComboType(hand)).toBe(ComboType.Tractor);
    });

    test('Should identify 8-card tractor (4 consecutive pairs)', () => {
      // Create cards for an 8-card tractor: 5-5-6-6-7-7-8-8 of Hearts
      const heart5a = createCard(Suit.Hearts, Rank.Five, 'hearts_5_1');
      const heart5b = createCard(Suit.Hearts, Rank.Five, 'hearts_5_2');
      const heart6a = createCard(Suit.Hearts, Rank.Six, 'hearts_6_1');
      const heart6b = createCard(Suit.Hearts, Rank.Six, 'hearts_6_2');
      const heart7a = createCard(Suit.Hearts, Rank.Seven, 'hearts_7_1');
      const heart7b = createCard(Suit.Hearts, Rank.Seven, 'hearts_7_2');
      const heart8a = createCard(Suit.Hearts, Rank.Eight, 'hearts_8_1');
      const heart8b = createCard(Suit.Hearts, Rank.Eight, 'hearts_8_2');
      
      const hand = [heart5a, heart5b, heart6a, heart6b, heart7a, heart7b, heart8a, heart8b];
      
      // Should be identified as a tractor
      expect(getComboType(hand)).toBe(ComboType.Tractor);
    });

    test('Should identify 10-card tractor (5 consecutive pairs)', () => {
      // Create cards for a 10-card tractor: 3-3-4-4-5-5-6-6-7-7 of Clubs
      const club3a = createCard(Suit.Clubs, Rank.Three, 'clubs_3_1');
      const club3b = createCard(Suit.Clubs, Rank.Three, 'clubs_3_2');
      const club4a = createCard(Suit.Clubs, Rank.Four, 'clubs_4_1');
      const club4b = createCard(Suit.Clubs, Rank.Four, 'clubs_4_2');
      const club5a = createCard(Suit.Clubs, Rank.Five, 'clubs_5_1');
      const club5b = createCard(Suit.Clubs, Rank.Five, 'clubs_5_2');
      const club6a = createCard(Suit.Clubs, Rank.Six, 'clubs_6_1');
      const club6b = createCard(Suit.Clubs, Rank.Six, 'clubs_6_2');
      const club7a = createCard(Suit.Clubs, Rank.Seven, 'clubs_7_1');
      const club7b = createCard(Suit.Clubs, Rank.Seven, 'clubs_7_2');
      
      const hand = [club3a, club3b, club4a, club4b, club5a, club5b, club6a, club6b, club7a, club7b];
      
      // Should be identified as a tractor
      expect(getComboType(hand)).toBe(ComboType.Tractor);
    });

    test('Should NOT identify 6-card combo with non-consecutive pairs', () => {
      // Create cards with non-consecutive pairs: A-A-K-K-J-J (missing Queen)
      const spadeAa = createCard(Suit.Spades, Rank.Ace, 'spades_a_1');
      const spadeAb = createCard(Suit.Spades, Rank.Ace, 'spades_a_2');
      const spadeKa = createCard(Suit.Spades, Rank.King, 'spades_k_1');
      const spadeKb = createCard(Suit.Spades, Rank.King, 'spades_k_2');
      const spadeJa = createCard(Suit.Spades, Rank.Jack, 'spades_j_1');
      const spadeJb = createCard(Suit.Spades, Rank.Jack, 'spades_j_2');
      
      const hand = [spadeAa, spadeAb, spadeKa, spadeKb, spadeJa, spadeJb];
      
      // Should NOT be identified as a tractor
      expect(getComboType(hand)).toBe(ComboType.Single);
    });

    test('Should NOT identify 6-card combo with mixed suits', () => {
      // Create cards with consecutive pairs but mixed suits: A♠-A♠-K♠-K♠-Q♥-Q♥
      const spadeAa = createCard(Suit.Spades, Rank.Ace, 'spades_a_1');
      const spadeAb = createCard(Suit.Spades, Rank.Ace, 'spades_a_2');
      const spadeKa = createCard(Suit.Spades, Rank.King, 'spades_k_1');
      const spadeKb = createCard(Suit.Spades, Rank.King, 'spades_k_2');
      const heartQa = createCard(Suit.Hearts, Rank.Queen, 'hearts_q_1');
      const heartQb = createCard(Suit.Hearts, Rank.Queen, 'hearts_q_2');
      
      const hand = [spadeAa, spadeAb, spadeKa, spadeKb, heartQa, heartQb];
      
      // Should NOT be identified as a tractor
      expect(getComboType(hand)).toBe(ComboType.Single);
    });

    test('Should NOT identify 6-card combo with unpaired cards', () => {
      // Create cards with some singles: A-A-K-K-Q-J (Queen and Jack not paired)
      const spadeAa = createCard(Suit.Spades, Rank.Ace, 'spades_a_1');
      const spadeAb = createCard(Suit.Spades, Rank.Ace, 'spades_a_2');
      const spadeKa = createCard(Suit.Spades, Rank.King, 'spades_k_1');
      const spadeKb = createCard(Suit.Spades, Rank.King, 'spades_k_2');
      const spadeQ = createCard(Suit.Spades, Rank.Queen, 'spades_q_1');
      const spadeJ = createCard(Suit.Spades, Rank.Jack, 'spades_j_1');
      
      const hand = [spadeAa, spadeAb, spadeKa, spadeKb, spadeQ, spadeJ];
      
      // Should NOT be identified as a tractor
      expect(getComboType(hand)).toBe(ComboType.Single);
    });

    test('Should handle edge case with Ace-King-Queen trump tractor', () => {
      // Create trump tractor in trump suit
      const trumpInfoHearts: TrumpInfo = {
        trumpRank: Rank.Two,
        trumpSuit: Suit.Hearts,
        
      };
      
      const heartAa = createCard(Suit.Hearts, Rank.Ace, 'hearts_a_1');
      const heartAb = createCard(Suit.Hearts, Rank.Ace, 'hearts_a_2');
      const heartKa = createCard(Suit.Hearts, Rank.King, 'hearts_k_1');
      const heartKb = createCard(Suit.Hearts, Rank.King, 'hearts_k_2');
      const heartQa = createCard(Suit.Hearts, Rank.Queen, 'hearts_q_1');
      const heartQb = createCard(Suit.Hearts, Rank.Queen, 'hearts_q_2');
      
      const hand = [heartAa, heartAb, heartKa, heartKb, heartQa, heartQb];
      
      // Verify all are trump cards
      expect(isTrump(heartAa, trumpInfoHearts)).toBe(true);
      expect(isTrump(heartKa, trumpInfoHearts)).toBe(true);
      expect(isTrump(heartQa, trumpInfoHearts)).toBe(true);
      
      // Should still be identified as a tractor even in trump suit
      expect(getComboType(hand)).toBe(ComboType.Tractor);
    });

    test('Should handle odd number of cards (not valid tractor)', () => {
      // Create 5 cards that would be a tractor if they were paired
      const spadeAa = createCard(Suit.Spades, Rank.Ace, 'spades_a_1');
      const spadeAb = createCard(Suit.Spades, Rank.Ace, 'spades_a_2');
      const spadeKa = createCard(Suit.Spades, Rank.King, 'spades_k_1');
      const spadeKb = createCard(Suit.Spades, Rank.King, 'spades_k_2');
      const spadeQ = createCard(Suit.Spades, Rank.Queen, 'spades_q_1');
      
      const hand = [spadeAa, spadeAb, spadeKa, spadeKb, spadeQ];
      
      // Should NOT be identified as a tractor (odd number of cards)
      expect(getComboType(hand)).toBe(ComboType.Single);
    });

    test('Should handle 3-card groups (not valid tractor)', () => {
      // Create cards where one rank has 3 cards: A-A-A-K-K-Q
      const spadeAa = createCard(Suit.Spades, Rank.Ace, 'spades_a_1');
      const spadeAb = createCard(Suit.Spades, Rank.Ace, 'spades_a_2');
      const spadeAc = createCard(Suit.Spades, Rank.Ace, 'spades_a_3');
      const spadeKa = createCard(Suit.Spades, Rank.King, 'spades_k_1');
      const spadeKb = createCard(Suit.Spades, Rank.King, 'spades_k_2');
      const spadeQ = createCard(Suit.Spades, Rank.Queen, 'spades_q_1');
      
      const hand = [spadeAa, spadeAb, spadeAc, spadeKa, spadeKb, spadeQ];
      
      // Should NOT be identified as a tractor (not all pairs)
      expect(getComboType(hand)).toBe(ComboType.Single);
    });
  });
});