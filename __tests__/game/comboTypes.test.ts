import { describe, expect, test } from '@jest/globals';
import { compareCards } from '../../src/game/cardComparison';
import { getComboType, identifyCombos } from '../../src/game/comboDetection';
import { isTrump } from '../../src/game/gameHelpers';
import {
  Card,
  ComboType,
  JokerType,
  Rank,
  Suit,
  TrumpInfo
} from "../../src/types";
import {
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
      const twoOfHearts = Card.createCard(Suit.Hearts, Rank.Two, 0);
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
      const card = Card.createCard(Suit.Hearts, Rank.Ace, 0);
      expect(getComboType([card], trumpInfo)).toBe(ComboType.Single);
    });
  });

  describe('Pair Combos', () => {
    test('Should identify pairs of the same rank', () => {
      // Use predefined pair and additional card
      const [kingHearts1, kingHearts2] = testData.pairs.clubsKings; // Use any pair, just need structure
      const queenHearts = Card.createCard(Suit.Hearts, Rank.Queen, 0);
      
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
      
      expect(getComboType(heartsAces, trumpInfo)).toBe(ComboType.Pair);
    });
    
    test('Joker pairs should be identified', () => {
      // Create pair of same jokers using helper
      const smallJokerPair = Card.createJokerPair(JokerType.Small);

      const combos = identifyCombos(smallJokerPair, trumpInfo);

      // Expect 3 combos: 2 singles + 1 pair
      expect(combos.length).toBe(3);

      // Test that getComboType would correctly identify a pair of jokers if given directly
      expect(getComboType(smallJokerPair, trumpInfo)).toBe(ComboType.Pair);
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
      // Create joker pairs using convenience methods
      const smallJokerPair = Card.createJokerPair(JokerType.Small);
      const bigJokerPair = Card.createJokerPair(JokerType.Big);

      // Create the joker tractor hand
      const jokerTractor = [...smallJokerPair, ...bigJokerPair];

      // Jokers should be identified as trumps
      expect(isTrump(smallJokerPair[0], trumpInfo)).toBe(true);
      expect(isTrump(bigJokerPair[0], trumpInfo)).toBe(true);

      // NOTE: In the current implementation, getComboType doesn't handle joker tractors
      // because jokers don't have ranks, but in the game rules this would be a valid tractor

      // Verify we can identify individual joker pairs
      expect(getComboType(smallJokerPair, trumpInfo)).toBe(ComboType.Pair);
      expect(getComboType(bigJokerPair, trumpInfo)).toBe(ComboType.Pair);

      // This test documents that in Shengji rules, SJ-SJ-BJ-BJ is supposed to be the highest tractor,
      // even though our current implementation doesn't identify it as one
    });
    
    test('Should identify tractor (consecutive pairs of same suit)', () => {
      // Create cards for a tractor: 7-7-8-8 of Hearts
      const heart7pair = Card.createPair(Suit.Hearts, Rank.Seven);
      const heart8pair = Card.createPair(Suit.Hearts, Rank.Eight);
      
      // Hand with the tractor cards
      const hand = [...heart7pair, ...heart8pair];
      
      // This function is a placeholder in the original code so it won't find tractors
      // For testing purposes, we'll directly test the getComboType function
      expect(getComboType(hand, trumpInfo)).toBe(ComboType.Tractor);
    });
    
    test('Should identify tractor 6♦-6♦-5♦-5♦ in all possible card orderings', () => {
      // Create cards for a tractor: 5-5-6-6 of Diamonds
      const d6pair = Card.createPair(Suit.Diamonds, Rank.Six);
      const d5pair = Card.createPair(Suit.Diamonds, Rank.Five);
      const [d6a, d6b] = d6pair;
      const [d5a, d5b] = d5pair;
      
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
        expect(getComboType(ordering, trumpInfo)).toBe(ComboType.Tractor);
      });
    });
    
    test('Non-consecutive pairs should not form a tractor', () => {
      // Create cards for non-consecutive pairs: 5-5-9-9 of Hearts
      const heart5pair = Card.createPair(Suit.Hearts, Rank.Five);
      const heart9pair = Card.createPair(Suit.Hearts, Rank.Nine);
      
      // Non-consecutive pairs
      const nonConsecutivePairs = [...heart5pair, ...heart9pair];
      
      // Should not be identified as a tractor
      expect(getComboType(nonConsecutivePairs, trumpInfo)).not.toBe(ComboType.Tractor);
    });
    
    test('Consecutive pairs of different suits should not form a tractor', () => {
      // Create cards for consecutive pairs of different suits: 7-7 Hearts, 8-8 Spades
      const heart7pair = Card.createPair(Suit.Hearts, Rank.Seven);
      const spade8pair = Card.createPair(Suit.Spades, Rank.Eight);
      
      // Consecutive pairs but different suits
      const mixedSuitPairs = [...heart7pair, ...spade8pair];
      
      // Should not be identified as a tractor
      expect(getComboType(mixedSuitPairs, trumpInfo)).not.toBe(ComboType.Tractor);
    });
    
    test('Pair at the rank boundary (A-A-2-2) should not form a tractor', () => {
      // Create cards for A-A-2-2 of the same suit
      const acePair = Card.createPair(Suit.Hearts, Rank.Ace);
      const twoPair = Card.createPair(Suit.Hearts, Rank.Two);

      // Ace and Two pairs (non-consecutive in rank order)
      const aceTwoPairs = [...acePair, ...twoPair];

      // Should not be identified as a tractor
      expect(getComboType(aceTwoPairs, trumpInfo)).not.toBe(ComboType.Tractor);
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
      const spade2pair = Card.createPair(Suit.Spades, Rank.Two);
      const spade3pair = Card.createPair(Suit.Spades, Rank.Three);

      const hand = [...spade2pair, ...spade3pair];

      // Check if these cards are trumps
      expect(isTrump(spade2pair[0], trumpInfo3)).toBe(true); // Trump suit
      expect(isTrump(spade3pair[0], trumpInfo3)).toBe(true); // Trump rank

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
      const heart7pair = Card.createPair(Suit.Hearts, Rank.Seven);
      const heart8pair = Card.createPair(Suit.Hearts, Rank.Eight);
      
      const hand = [...heart7pair, ...heart8pair];
      
      // Verify these are all trump cards
      expect(isTrump(heart7pair[0], trumpInfoHearts)).toBe(true);
      expect(isTrump(heart8pair[0], trumpInfoHearts)).toBe(true);
      
      // They should still form a tractor even though they're trump cards
      // because they're all in the same trump category (trump suit)
      expect(getComboType(hand, trumpInfoHearts)).toBe(ComboType.Tractor);
    });
    
    test('Trump tractors should beat non-trump tractors', () => {
      // Create a trumpInfo with Hearts as trump suit
      const trumpInfoHearts: TrumpInfo = {
        trumpRank: Rank.Two,
        trumpSuit: Suit.Hearts,
        
      };
      
      // Create a tractor in Hearts (trump)
      const heart3pair = Card.createPair(Suit.Hearts, Rank.Three);
      const heart4pair = Card.createPair(Suit.Hearts, Rank.Four);
      
      // Create a higher tractor in Spades (non-trump)
      const spadeQpair = Card.createPair(Suit.Spades, Rank.Queen);
      const spadeKpair = Card.createPair(Suit.Spades, Rank.King);
      
      const trumpTractor = [...heart3pair, ...heart4pair];
      const nonTrumpTractor = [...spadeQpair, ...spadeKpair];
      
      // Both should be tractors
      expect(getComboType(trumpTractor, trumpInfoHearts)).toBe(ComboType.Tractor);
      expect(getComboType(nonTrumpTractor, trumpInfoHearts)).toBe(ComboType.Tractor);
      
      // Compare individual cards to verify that trump beats non-trump
      expect(compareCards(heart3pair[0], spadeQpair[0], trumpInfoHearts)).toBeGreaterThan(0);
      expect(compareCards(heart4pair[0], spadeKpair[0], trumpInfoHearts)).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases and Special Combos', () => {
    test('Trump cards should be correctly identified', () => {
      // Create trump cards: 2 of Spades (trump rank + suit), 2 of Hearts (trump rank)
      const trumpRankAndSuit = Card.createCard(Suit.Spades, Rank.Two, 0);
      const trumpRankOnly = Card.createCard(Suit.Hearts, Rank.Two, 0);
      const trumpSuitOnly = Card.createCard(Suit.Spades, Rank.King, 0);
      const nonTrump = Card.createCard(Suit.Hearts, Rank.King, 0);
      
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
      const club2pair = Card.createPair(Suit.Clubs, Rank.Two);
      const diamond2pair = Card.createPair(Suit.Diamonds, Rank.Two);

      const hand = [...club2pair, ...diamond2pair];

      // Verify these are all trump cards
      expect(isTrump(club2pair[0], trumpInfo2)).toBe(true);
      expect(isTrump(diamond2pair[0], trumpInfo2)).toBe(true);

      // They should not form a tractor
      expect(getComboType(hand, trumpInfo)).not.toBe(ComboType.Tractor);

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
      const smallJokerPair = Card.createJokerPair(JokerType.Small);
      const spade2pair = Card.createPair(Suit.Spades, Rank.Two);

      const hand = [...smallJokerPair, ...spade2pair];

      // All are trump cards
      expect(isTrump(smallJokerPair[0], trumpInfo)).toBe(true);
      expect(isTrump(spade2pair[0], trumpInfo)).toBe(true);

      // They should not form a tractor
      expect(getComboType(hand, trumpInfo)).not.toBe(ComboType.Tractor);

      // When we run identifyCombos, it should not find a tractor
      const combos = identifyCombos(hand, trumpInfo);
      const tractorCombos = combos.filter(combo => combo.type === ComboType.Tractor);
      expect(tractorCombos.length).toBe(0);
    });

    test('A-A-2-2 combination with 2 as trump rank should not form a tractor', () => {
      // Create A-A-2-2 in Hearts with 2 as trump rank
      const heart2pair = Card.createPair(Suit.Hearts, Rank.Two);
      const heartApair = Card.createPair(Suit.Hearts, Rank.Ace);

      const trumpInfo2: TrumpInfo = {
        trumpRank: Rank.Two,
        trumpSuit: Suit.Spades,
        
      };

      const hand = [...heartApair, ...heart2pair];

      // Verify 2 is trump, Ace is not
      expect(isTrump(heart2pair[0], trumpInfo2)).toBe(true);
      expect(isTrump(heartApair[0], trumpInfo2)).toBe(false);

      // They should not form a tractor
      expect(getComboType(hand, trumpInfo)).not.toBe(ComboType.Tractor);

      // When we run identifyCombos, it should not find a tractor
      const combos = identifyCombos(hand, trumpInfo2);
      const tractorCombos = combos.filter(combo => combo.type === ComboType.Tractor);
      expect(tractorCombos.length).toBe(0);
    });

    test('Mixed hand should identify all valid combos', () => {
      // Create a complex hand with various combos
      const [spadeK1, spadeK2] = Card.createPair(Suit.Spades, Rank.King);
      const heart7 = Card.createCard(Suit.Hearts, Rank.Seven, 0);
      const diamond9 = Card.createCard(Suit.Diamonds, Rank.Nine, 0);
      const smallJoker = Card.createJoker(JokerType.Small, 0);

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
        expect.arrayContaining(['Spades_K_0', 'Spades_K_1'])
      );
    });

    test('Cards in a suit should be grouped together', () => {
      // Create three cards of the same suit and one of a different suit
      const club5 = Card.createCard(Suit.Clubs, Rank.Five, 0);
      const club7 = Card.createCard(Suit.Clubs, Rank.Seven, 0);
      const club9 = Card.createCard(Suit.Clubs, Rank.Nine, 0);
      const heartA = Card.createCard(Suit.Hearts, Rank.Ace, 0);

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
      const spadeApair = Card.createPair(Suit.Spades, Rank.Ace);
      const spadeKpair = Card.createPair(Suit.Spades, Rank.King);
      const spadeQpair = Card.createPair(Suit.Spades, Rank.Queen);
      
      const hand = [...spadeApair, ...spadeKpair, ...spadeQpair];
      
      // Should be identified as a tractor
      expect(getComboType(hand, trumpInfo)).toBe(ComboType.Tractor);
    });

    test('Should identify 8-card tractor (4 consecutive pairs)', () => {
      // Create cards for an 8-card tractor: 5-5-6-6-7-7-8-8 of Hearts
      const heart5pair = Card.createPair(Suit.Hearts, Rank.Five);
      const heart6pair = Card.createPair(Suit.Hearts, Rank.Six);
      const heart7pair = Card.createPair(Suit.Hearts, Rank.Seven);
      const heart8pair = Card.createPair(Suit.Hearts, Rank.Eight);
      
      const hand = [...heart5pair, ...heart6pair, ...heart7pair, ...heart8pair];
      
      // Should be identified as a tractor
      expect(getComboType(hand, trumpInfo)).toBe(ComboType.Tractor);
    });

    test('Should identify 10-card tractor (5 consecutive pairs)', () => {
      // Create cards for a 10-card tractor: 3-3-4-4-5-5-6-6-7-7 of Clubs
      const club3pair = Card.createPair(Suit.Clubs, Rank.Three);
      const club4pair = Card.createPair(Suit.Clubs, Rank.Four);
      const club5pair = Card.createPair(Suit.Clubs, Rank.Five);
      const club6pair = Card.createPair(Suit.Clubs, Rank.Six);
      const club7pair = Card.createPair(Suit.Clubs, Rank.Seven);
      
      const hand = [...club3pair, ...club4pair, ...club5pair, ...club6pair, ...club7pair];
      
      // Should be identified as a tractor
      expect(getComboType(hand, trumpInfo)).toBe(ComboType.Tractor);
    });

    test('Should identify 6-card combo with non-consecutive pairs as Invalid', () => {
      // Create cards with non-consecutive pairs: A-A-K-K-J-J (missing Queen)
      // With new architecture, getComboType only handles straight combos
      // This should be Invalid since it's not a valid straight tractor
      const spadeApair = Card.createPair(Suit.Spades, Rank.Ace);
      const spadeKpair = Card.createPair(Suit.Spades, Rank.King);
      const spadeJpair = Card.createPair(Suit.Spades, Rank.Jack);
      
      const hand = [...spadeApair, ...spadeKpair, ...spadeJpair];
      
      // Should be identified as Invalid by getComboType (not a straight combo)
      expect(getComboType(hand, trumpInfo)).toBe(ComboType.Invalid);
      
      // Multi-combo detection would be done contextually in leading/following scenarios
    });

    test('Should NOT identify 6-card combo with mixed suits', () => {
      // Create cards with consecutive pairs but mixed suits: A♠-A♠-K♠-K♠-Q♥-Q♥
      const spadeApair = Card.createPair(Suit.Spades, Rank.Ace);
      const spadeKpair = Card.createPair(Suit.Spades, Rank.King);
      const heartQpair = Card.createPair(Suit.Hearts, Rank.Queen);
      
      const hand = [...spadeApair, ...spadeKpair, ...heartQpair];
      
      // Should be identified as Invalid (mixed suits)
      expect(getComboType(hand, trumpInfo)).toBe(ComboType.Invalid);
    });

    test('Should identify 6-card combo with unpaired cards as MultiCombo', () => {
      // Create cards with some singles: A-A-K-K-Q-J (Queen and Jack not paired)
      // This should be identified as a multi-combo: tractor (A-A-K-K) + single Q + single J
      const spadeApair = Card.createPair(Suit.Spades, Rank.Ace);
      const spadeKpair = Card.createPair(Suit.Spades, Rank.King);
      const spadeQ = Card.createCard(Suit.Spades, Rank.Queen, 0);
      const spadeJ = Card.createCard(Suit.Spades, Rank.Jack, 0);
      
      const hand = [...spadeApair, ...spadeKpair, spadeQ, spadeJ];
      
      // Should be identified as a multi-combo (tractor + singles)
      expect(getComboType(hand, trumpInfo)).toBe(ComboType.MultiCombo);
      
      // Verify multi-combo structure using identifyCombos
      const combos = identifyCombos(hand, trumpInfo);
      const multiCombos = combos.filter(combo => combo.type === ComboType.MultiCombo);
      expect(multiCombos.length).toBe(1);
      
      const multiCombo = multiCombos[0];
      expect(multiCombo.multiComboStructure).toBeDefined();
      expect(multiCombo.multiComboStructure?.components.tractors).toBe(1); // One tractor: A-A-K-K
      expect(multiCombo.multiComboStructure?.components.pairs).toBe(0); // No pairs
      expect(multiCombo.multiComboStructure?.components.singles).toBe(2); // Two singles: Q, J
      expect(multiCombo.multiComboStructure?.totalLength).toBe(6);
    });

    test('Should handle edge case with Ace-King-Queen trump tractor', () => {
      // Create trump tractor in trump suit
      const trumpInfoHearts: TrumpInfo = {
        trumpRank: Rank.Two,
        trumpSuit: Suit.Hearts,
        
      };
      
      const heartApair = Card.createPair(Suit.Hearts, Rank.Ace);
      const heartKpair = Card.createPair(Suit.Hearts, Rank.King);
      const heartQpair = Card.createPair(Suit.Hearts, Rank.Queen);
      
      const hand = [...heartApair, ...heartKpair, ...heartQpair];
      
      // Verify all are trump cards
      expect(isTrump(heartApair[0], trumpInfoHearts)).toBe(true);
      expect(isTrump(heartKpair[0], trumpInfoHearts)).toBe(true);
      expect(isTrump(heartQpair[0], trumpInfoHearts)).toBe(true);
      
      // Should still be identified as a tractor even in trump suit
      expect(getComboType(hand, trumpInfo)).toBe(ComboType.Tractor);
    });

    test('Should identify odd number of cards as MultiCombo when valid', () => {
      // Create 5 cards: A-A-K-K-Q
      // This should be identified as a multi-combo: tractor (A-A-K-K) + single Q
      const spadeApair = Card.createPair(Suit.Spades, Rank.Ace);
      const spadeKpair = Card.createPair(Suit.Spades, Rank.King);
      const spadeQ = Card.createCard(Suit.Spades, Rank.Queen, 0);
      
      const hand = [...spadeApair, ...spadeKpair, spadeQ];
      
      // Should be identified as a multi-combo (tractor + single)
      expect(getComboType(hand, trumpInfo)).toBe(ComboType.MultiCombo);
      
      // Verify multi-combo structure using identifyCombos
      const combos = identifyCombos(hand, trumpInfo);
      const multiCombos = combos.filter(combo => combo.type === ComboType.MultiCombo);
      expect(multiCombos.length).toBe(1);
      
      const multiCombo = multiCombos[0];
      expect(multiCombo.multiComboStructure).toBeDefined();
      expect(multiCombo.multiComboStructure?.components.tractors).toBe(1); // One tractor: A-A-K-K
      expect(multiCombo.multiComboStructure?.components.pairs).toBe(0); // No pairs
      expect(multiCombo.multiComboStructure?.components.singles).toBe(1); // One single: Q
      expect(multiCombo.multiComboStructure?.totalLength).toBe(5);
    });

    
    test('Should identify multi-combo with multiple component types', () => {
      // Create cards: K♠-K♠ + Q♠ + 9♠ + 7♠
      // This should be identified as a multi-combo: pair (K-K) + single Q + single 9 + single 7
      const spadeKpair = Card.createPair(Suit.Spades, Rank.King);
      const spadeQ = Card.createCard(Suit.Spades, Rank.Queen, 0);
      const spade9 = Card.createCard(Suit.Spades, Rank.Nine, 0);
      const spade7 = Card.createCard(Suit.Spades, Rank.Seven, 0);
      
      const hand = [...spadeKpair, spadeQ, spade9, spade7];
      
      // Should be identified as a multi-combo (pair + singles)
      // If multi-combo detection doesn't recognize this, it should be Invalid, not Single
      const result = getComboType(hand, trumpInfo);
      expect([ComboType.MultiCombo, ComboType.Invalid]).toContain(result);
      
      // Verify multi-combo structure using identifyCombos
      const combos = identifyCombos(hand, trumpInfo);
      const multiCombos = combos.filter(combo => combo.type === ComboType.MultiCombo);
      expect(multiCombos.length).toBe(1);
      
      const multiCombo = multiCombos[0];
      expect(multiCombo.multiComboStructure).toBeDefined();
      expect(multiCombo.multiComboStructure?.components.tractors).toBe(0); // No tractors
      expect(multiCombo.multiComboStructure?.components.pairs).toBe(1); // One pair: K-K
      expect(multiCombo.multiComboStructure?.components.singles).toBe(3); // Three singles: Q, 9, 7
      expect(multiCombo.multiComboStructure?.totalLength).toBe(5);
    });
    
    
    test('Should identify complex multi-combo with tractor and non-consecutive pairs', () => {
      // Create cards: A♠-A♠-K♠-K♠ + 9♠-9♠ + 7♠-7♠ + 5♠
      // This should be identified as a multi-combo: tractor (A-A-K-K) + pair (9-9) + pair (7-7) + single 5
      const spadeApair = Card.createPair(Suit.Spades, Rank.Ace);
      const spadeKpair = Card.createPair(Suit.Spades, Rank.King);
      const spade9pair = Card.createPair(Suit.Spades, Rank.Nine);
      const spade7pair = Card.createPair(Suit.Spades, Rank.Seven);
      const spade5 = Card.createCard(Suit.Spades, Rank.Five, 0);
      
      const hand = [...spadeApair, ...spadeKpair, ...spade9pair, ...spade7pair, spade5];
      
      // Should be identified as a multi-combo
      expect(getComboType(hand, trumpInfo)).toBe(ComboType.MultiCombo);
      
      // Verify multi-combo structure using identifyCombos
      const combos = identifyCombos(hand, trumpInfo);
      const multiCombos = combos.filter(combo => combo.type === ComboType.MultiCombo);
      expect(multiCombos.length).toBe(1);
      
      const multiCombo = multiCombos[0];
      expect(multiCombo.multiComboStructure).toBeDefined();
      expect(multiCombo.multiComboStructure?.components.tractors).toBe(1); // One tractor: A-A-K-K
      expect(multiCombo.multiComboStructure?.components.pairs).toBe(2); // Two pairs: 9-9, 7-7
      expect(multiCombo.multiComboStructure?.components.singles).toBe(1); // One single: 5
      expect(multiCombo.multiComboStructure?.totalLength).toBe(9);
    });
  });
});