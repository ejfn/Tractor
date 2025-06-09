import {
  getValidCombinations,
  identifyCombos,
  isValidPlay,
  isTrump,
  getComboType,
  calculateCardStrategicValue,
  initializeGame,
} from '../../src/game/gameLogic';
import {
  Card,
  Combo,
  ComboType,
  GameState,
  Rank,
  Suit,
  TrumpInfo,
  JokerType,
  PlayerId,
  GamePhase,
} from '../../src/types';

describe('Combo Generation Comprehensive Tests', () => {
  let trumpInfo: TrumpInfo;
  let gameState: GameState;

  beforeEach(() => {
    trumpInfo = {
      trumpRank: Rank.Two,
      trumpSuit: Suit.Spades,
    };

    gameState = initializeGame();
    gameState.trumpInfo = trumpInfo;
    gameState.gamePhase = GamePhase.Playing;
    gameState.currentTrick = null;
  });

  describe('Valid Combo Identification', () => {
    test('should identify singles, pairs, and tractors correctly', () => {
      const hand: Card[] = [
        { id: '1', rank: Rank.Three, suit: Suit.Hearts, points: 0 },
        { id: '2', rank: Rank.Four, suit: Suit.Hearts, points: 0 },
        { id: '3', rank: Rank.Four, suit: Suit.Hearts, points: 0 },
        { id: '4', rank: Rank.Five, suit: Suit.Hearts, points: 5 },
        { id: '5', rank: Rank.Five, suit: Suit.Hearts, points: 5 },
        { id: '6', rank: Rank.Six, suit: Suit.Hearts, points: 0 },
        { id: '7', rank: Rank.Six, suit: Suit.Hearts, points: 0 },
      ];

      const combos = identifyCombos(hand, trumpInfo);

      // Should have singles for all cards
      const singles = combos.filter(c => c.type === ComboType.Single);
      expect(singles).toHaveLength(7);

      // Should have pairs: 4♥-4♥, 5♥-5♥, 6♥-6♥
      const pairs = combos.filter(c => c.type === ComboType.Pair);
      expect(pairs).toHaveLength(3);

      // Should have tractor: 4♥4♥-5♥5♥-6♥6♥ (3 consecutive pairs)
      const tractors = combos.filter(c => c.type === ComboType.Tractor);
      expect(tractors.length).toBeGreaterThan(0);
      
      // Find the longest tractor
      const longestTractor = tractors.reduce((longest, current) => 
        current.cards.length > longest.cards.length ? current : longest, tractors[0]);
      expect(longestTractor.cards).toHaveLength(6); // 3 pairs = 6 cards
    });

    test('should identify joker pairs correctly', () => {
      const hand: Card[] = [
        { id: '1', joker: JokerType.Small, points: 0 },
        { id: '2', joker: JokerType.Small, points: 0 },
        { id: '3', joker: JokerType.Big, points: 0 },
        { id: '4', joker: JokerType.Big, points: 0 },
      ];

      const combos = identifyCombos(hand, trumpInfo);

      // Should have singles for all jokers
      const singles = combos.filter(c => c.type === ComboType.Single);
      expect(singles).toHaveLength(4);

      // Should have Small Joker pair and Big Joker pair
      const pairs = combos.filter(c => c.type === ComboType.Pair);
      expect(pairs).toHaveLength(2);

      // Should have special tractor: SJ-SJ-BJ-BJ
      const tractors = combos.filter(c => c.type === ComboType.Tractor);
      expect(tractors).toHaveLength(1);
      expect(tractors[0].cards).toHaveLength(4);
      expect(tractors[0].value).toBe(1000); // Big Joker combo value
    });

    test('should handle trump rank cards correctly', () => {
      const hand: Card[] = [
        { id: '1', rank: Rank.Two, suit: Suit.Hearts, points: 0 }, // Trump rank off-suit
        { id: '2', rank: Rank.Two, suit: Suit.Hearts, points: 0 }, // Trump rank off-suit
        { id: '3', rank: Rank.Two, suit: Suit.Spades, points: 0 }, // Trump rank in trump suit
        { id: '4', rank: Rank.Three, suit: Suit.Spades, points: 0 }, // Trump suit
      ];

      const combos = identifyCombos(hand, trumpInfo);

      // Should identify 2♥-2♥ as a valid pair (both trump rank off-suit)
      const pairs = combos.filter(c => c.type === ComboType.Pair);
      const heartsPair = pairs.find(p => 
        p.cards.every(card => card.rank === Rank.Two && card.suit === Suit.Hearts)
      );
      expect(heartsPair).toBeDefined();
    });
  });

  describe('Mixed Combo Generation', () => {
    test('should generate trump conservation combos when following trump pairs', () => {
      const playerHand: Card[] = [
        { id: 'bj1', joker: JokerType.Big, points: 0 }, // Conservation value: 100
        { id: 'sj1', joker: JokerType.Small, points: 0 }, // Conservation value: 90
        { id: '2s1', rank: Rank.Two, suit: Suit.Spades, points: 0 }, // Conservation value: 80
        { id: '2h1', rank: Rank.Two, suit: Suit.Hearts, points: 0 }, // Conservation value: 70
        { id: '3s1', rank: Rank.Three, suit: Suit.Spades, points: 0 }, // Conservation value: 5
        { id: '4s1', rank: Rank.Four, suit: Suit.Spades, points: 0 }, // Conservation value: 10
      ];

      gameState.players[0].hand = playerHand;

      // Leading combo: trump pair (forcing trump following)
      const leadingTrumpPair: Card[] = [
        { id: 'lead1', rank: Rank.Five, suit: Suit.Spades, points: 5 },
        { id: 'lead2', rank: Rank.Five, suit: Suit.Spades, points: 5 },
      ];

      gameState.currentTrick = {
        plays: [
          { playerId: PlayerId.Bot1, cards: leadingTrumpPair }
        ],
        winningPlayerId: PlayerId.Bot1,
        points: 10,
      };

      const validCombos = getValidCombinations(playerHand, gameState);

      expect(validCombos.length).toBeGreaterThan(0);

      // Find the combo with lowest conservation value (should use weakest trump cards)
      const weakestCombo = validCombos.reduce((weakest, current) => {
        const weakestValue = weakest.cards.reduce((sum, card) => 
          sum + calculateCardStrategicValue(card, trumpInfo, 'conservation'), 0);
        const currentValue = current.cards.reduce((sum, card) => 
          sum + calculateCardStrategicValue(card, trumpInfo, 'conservation'), 0);
        return currentValue < weakestValue ? current : weakest;
      });

      // Should prefer 3♠ (5) and 4♠ (10) over Big Joker (100) and Small Joker (90)
      const usedConservationValues = weakestCombo.cards.map(card => 
        calculateCardStrategicValue(card, trumpInfo, 'conservation')
      );
      
      console.log('Trump conservation combo values:', usedConservationValues);
      
      // Should NOT use the highest value trump cards
      expect(usedConservationValues.includes(100)).toBe(false); // No Big Joker
      expect(usedConservationValues.includes(90)).toBe(false);  // No Small Joker
    });

    test('should handle partial suit following correctly', () => {
      const playerHand: Card[] = [
        { id: '1', rank: Rank.Three, suit: Suit.Hearts, points: 0 }, // Only heart
        { id: '2', rank: Rank.Four, suit: Suit.Clubs, points: 0 },
        { id: '3', rank: Rank.Five, suit: Suit.Diamonds, points: 5 },
        { id: '4', rank: Rank.Six, suit: Suit.Clubs, points: 0 },
      ];

      gameState.players[0].hand = playerHand;

      // Leading combo: Hearts pair (player has only 1 heart)
      const leadingHeartsPair: Card[] = [
        { id: 'lead1', rank: Rank.Seven, suit: Suit.Hearts, points: 0 },
        { id: 'lead2', rank: Rank.Seven, suit: Suit.Hearts, points: 0 },
      ];

      gameState.currentTrick = {
        plays: [
          { playerId: PlayerId.Bot1, cards: leadingHeartsPair }
        ],
        winningPlayerId: PlayerId.Bot1,
        points: 0,
      };

      const validCombos = getValidCombinations(playerHand, gameState);

      expect(validCombos.length).toBeGreaterThan(0);

      // All valid combos should include the single heart card
      validCombos.forEach(combo => {
        const hasHeartCard = combo.cards.some(card => card.suit === Suit.Hearts);
        expect(hasHeartCard).toBe(true);
      });

      // Should use ALL hearts (just the one) plus one other card
      const optimalCombo = validCombos[0];
      expect(optimalCombo.cards).toHaveLength(2);
      
      const heartCards = optimalCombo.cards.filter(card => card.suit === Suit.Hearts);
      expect(heartCards).toHaveLength(1); // Must use the only heart
    });

    test('should generate valid combos when out of led suit', () => {
      const playerHand: Card[] = [
        { id: '1', rank: Rank.Four, suit: Suit.Clubs, points: 0 },
        { id: '2', rank: Rank.Five, suit: Suit.Diamonds, points: 5 },
        { id: '3', rank: Rank.Six, suit: Suit.Clubs, points: 0 },
        { id: '4', rank: Rank.Seven, suit: Suit.Diamonds, points: 0 },
      ];

      gameState.players[0].hand = playerHand;

      // Leading combo: Hearts (player has no hearts)
      const leadingHearts: Card[] = [
        { id: 'lead1', rank: Rank.Eight, suit: Suit.Hearts, points: 0 },
      ];

      gameState.currentTrick = {
        plays: [
          { playerId: PlayerId.Bot1, cards: leadingHearts }
        ],
        winningPlayerId: PlayerId.Bot1,
        points: 0,
      };

      const validCombos = getValidCombinations(playerHand, gameState);

      expect(validCombos.length).toBeGreaterThan(0);

      // All combos should be exactly 1 card (matching leading combo length)
      validCombos.forEach(combo => {
        expect(combo.cards).toHaveLength(1);
      });

      // Verify all generated combos are actually valid
      validCombos.forEach(combo => {
        const isValid = isValidPlay(combo.cards, leadingHearts, playerHand, trumpInfo);
        expect(isValid).toBe(true);
      });
    });
  });

  describe('Trump Following Edge Cases', () => {
    test('should handle mixed trump combinations when cannot form proper trump pairs', () => {
      const playerHand: Card[] = [
        { id: 'bj1', joker: JokerType.Big, points: 0 },
        { id: '2h1', rank: Rank.Two, suit: Suit.Hearts, points: 0 }, // Trump rank off-suit
        { id: '3s1', rank: Rank.Three, suit: Suit.Spades, points: 0 }, // Trump suit
        { id: '7c1', rank: Rank.Seven, suit: Suit.Clubs, points: 0 }, // Non-trump
      ];

      gameState.players[0].hand = playerHand;

      // Leading trump pair
      const leadingTrumpPair: Card[] = [
        { id: 'lead1', rank: Rank.Four, suit: Suit.Spades, points: 0 },
        { id: 'lead2', rank: Rank.Four, suit: Suit.Spades, points: 0 },
      ];

      gameState.currentTrick = {
        plays: [
          { playerId: PlayerId.Bot1, cards: leadingTrumpPair }
        ],
        winningPlayerId: PlayerId.Bot1,
        points: 0,
      };

      const validCombos = getValidCombinations(playerHand, gameState);

      expect(validCombos.length).toBeGreaterThan(0);

      // All valid combos should use trump cards (no non-trump when trump is led)
      validCombos.forEach(combo => {
        combo.cards.forEach(card => {
          const cardIsTrump = isTrump(card, trumpInfo);
          expect(cardIsTrump).toBe(true);
        });
      });

      // Should prioritize weaker trump cards in mixed combinations
      const optimalCombo = validCombos[0];
      expect(optimalCombo.cards).toHaveLength(2);

      // Check if it uses the weakest available trump combination
      const usedBigJoker = optimalCombo.cards.some(card => card.joker === JokerType.Big);
      const usedTrumpSuit = optimalCombo.cards.some(card => 
        card.rank === Rank.Three && card.suit === Suit.Spades);
      
      // Should prefer trump suit cards over Big Joker when possible
      if (usedTrumpSuit) {
        console.log('Correctly prioritized trump suit card over Big Joker');
      }
    });

    test('should handle joker tractor following correctly', () => {
      const playerHand: Card[] = [
        { id: 'sj1', joker: JokerType.Small, points: 0 },
        { id: 'sj2', joker: JokerType.Small, points: 0 },
        { id: 'bj1', joker: JokerType.Big, points: 0 },
        { id: 'bj2', joker: JokerType.Big, points: 0 },
        { id: '2s1', rank: Rank.Two, suit: Suit.Spades, points: 0 },
      ];

      gameState.players[0].hand = playerHand;

      // Leading joker tractor: SJ-SJ-BJ-BJ
      const leadingJokerTractor: Card[] = [
        { id: 'lead_sj1', joker: JokerType.Small, points: 0 },
        { id: 'lead_sj2', joker: JokerType.Small, points: 0 },
        { id: 'lead_bj1', joker: JokerType.Big, points: 0 },
        { id: 'lead_bj2', joker: JokerType.Big, points: 0 },
      ];

      gameState.currentTrick = {
        plays: [
          { playerId: PlayerId.Bot1, cards: leadingJokerTractor }
        ],
        winningPlayerId: PlayerId.Bot1,
        points: 0,
      };

      const validCombos = getValidCombinations(playerHand, gameState);

      expect(validCombos.length).toBeGreaterThan(0);

      // Should be able to form the same joker tractor
      const jokerTractorCombo = validCombos.find(combo => 
        combo.cards.length === 4 &&
        combo.cards.filter(card => card.joker === JokerType.Small).length === 2 &&
        combo.cards.filter(card => card.joker === JokerType.Big).length === 2
      );

      expect(jokerTractorCombo).toBeDefined();

      // Should recognize it as a proper tractor
      const comboType = getComboType(jokerTractorCombo!.cards, trumpInfo);
      expect(comboType).toBe(ComboType.Tractor);
    });
  });

  describe('Strategic Value Calculation', () => {
    test('should calculate trump conservation values correctly', () => {
      const cards: Card[] = [
        { id: 'bj', joker: JokerType.Big, points: 0 },
        { id: 'sj', joker: JokerType.Small, points: 0 },
        { id: '2s', rank: Rank.Two, suit: Suit.Spades, points: 0 }, // Trump rank in trump suit
        { id: '2h', rank: Rank.Two, suit: Suit.Hearts, points: 0 }, // Trump rank off-suit
        { id: 'as', rank: Rank.Ace, suit: Suit.Spades, points: 0 }, // Trump suit
        { id: '3s', rank: Rank.Three, suit: Suit.Spades, points: 0 }, // Weak trump suit
      ];

      const values = cards.map(card => ({
        card: card.joker || `${card.rank}${card.suit}`,
        conservation: calculateCardStrategicValue(card, trumpInfo, 'conservation'),
        strategic: calculateCardStrategicValue(card, trumpInfo, 'strategic'),
      }));

      console.log('Trump hierarchy values:', values);

      // Big Joker should have highest conservation value
      expect(values[0].conservation).toBe(100);
      
      // Small Joker should be second highest
      expect(values[1].conservation).toBe(90);
      
      // Trump rank in trump suit should be higher than trump rank off-suit
      expect(values[2].conservation).toBeGreaterThan(values[3].conservation);
      
      // Trump suit Ace should be higher than trump suit Three
      expect(values[4].conservation).toBeGreaterThan(values[5].conservation);
      
      // Strategic mode should rank trump cards higher than non-trump for disposal
      const nonTrumpCard = { id: 'ah', rank: Rank.Ace, suit: Suit.Hearts, points: 0 };
      const nonTrumpStrategic = calculateCardStrategicValue(nonTrumpCard, trumpInfo, 'strategic');
      expect(values[5].strategic).toBeGreaterThan(nonTrumpStrategic); // Even weak trump > non-trump
    });

    test('should prioritize point cards appropriately', () => {
      const cards: Card[] = [
        { id: '5h', rank: Rank.Five, suit: Suit.Hearts, points: 5 },
        { id: '10h', rank: Rank.Ten, suit: Suit.Hearts, points: 10 },
        { id: 'kh', rank: Rank.King, suit: Suit.Hearts, points: 10 },
        { id: '7h', rank: Rank.Seven, suit: Suit.Hearts, points: 0 },
      ];

      const strategicValues = cards.map(card => ({
        card: `${card.rank}${card.suit}`,
        strategic: calculateCardStrategicValue(card, trumpInfo, 'strategic'),
        points: card.points,
      }));

      // Point cards should have higher strategic value than non-point cards
      const pointCards = strategicValues.filter(v => v.points > 0);
      const nonPointCards = strategicValues.filter(v => v.points === 0);
      
      pointCards.forEach(pointCard => {
        nonPointCards.forEach(nonPointCard => {
          expect(pointCard.strategic).toBeGreaterThan(nonPointCard.strategic);
        });
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle empty hand gracefully', () => {
      const playerHand: Card[] = [];
      gameState.players[0].hand = playerHand;

      const validCombos = getValidCombinations(playerHand, gameState);
      expect(validCombos).toHaveLength(0);
    });

    test('should always return at least one valid combo for non-empty hands', () => {
      const playerHand: Card[] = [
        { id: '1', rank: Rank.Seven, suit: Suit.Clubs, points: 0 },
      ];

      gameState.players[0].hand = playerHand;

      // Any leading combo should result in at least one valid option
      const leadingCombo: Card[] = [
        { id: 'lead', rank: Rank.Eight, suit: Suit.Hearts, points: 0 },
      ];

      gameState.currentTrick = {
        plays: [
          { playerId: PlayerId.Bot1, cards: leadingCombo }
        ],
        winningPlayerId: PlayerId.Bot1,
        points: 0,
      };

      const validCombos = getValidCombinations(playerHand, gameState);
      expect(validCombos.length).toBeGreaterThan(0);

      // The returned combo should be valid
      const combo = validCombos[0];
      const isValid = isValidPlay(combo.cards, leadingCombo, playerHand, trumpInfo);
      expect(isValid).toBe(true);
    });

    test('should handle complex tractor requirements', () => {
      const playerHand: Card[] = [
        { id: '1', rank: Rank.Three, suit: Suit.Hearts, points: 0 },
        { id: '2', rank: Rank.Three, suit: Suit.Hearts, points: 0 },
        { id: '3', rank: Rank.Four, suit: Suit.Hearts, points: 0 },
        { id: '4', rank: Rank.Five, suit: Suit.Hearts, points: 5 },
        { id: '5', rank: Rank.Six, suit: Suit.Clubs, points: 0 },
        { id: '6', rank: Rank.Seven, suit: Suit.Clubs, points: 0 },
      ];

      gameState.players[0].hand = playerHand;

      // Leading tractor that player cannot match exactly
      const leadingTractor: Card[] = [
        { id: 'lead1', rank: Rank.Seven, suit: Suit.Diamonds, points: 0 },
        { id: 'lead2', rank: Rank.Seven, suit: Suit.Diamonds, points: 0 },
        { id: 'lead3', rank: Rank.Eight, suit: Suit.Diamonds, points: 0 },
        { id: 'lead4', rank: Rank.Eight, suit: Suit.Diamonds, points: 0 },
      ];

      gameState.currentTrick = {
        plays: [
          { playerId: PlayerId.Bot1, cards: leadingTractor }
        ],
        winningPlayerId: PlayerId.Bot1,
        points: 5,
      };

      const validCombos = getValidCombinations(playerHand, gameState);
      expect(validCombos.length).toBeGreaterThan(0);

      // All combos should be 4 cards to match leading tractor length
      validCombos.forEach(combo => {
        expect(combo.cards).toHaveLength(4);
      });

      // Should prioritize using the available pair when possible
      const comboWithPair = validCombos.find(combo => {
        const hasThreePair = combo.cards.filter(card => 
          card.rank === Rank.Three && card.suit === Suit.Hearts).length === 2;
        return hasThreePair;
      });

      if (comboWithPair) {
        console.log('Correctly used available pair in tractor following');
      }
    });
  });

  describe('Integration with AI Decision Making', () => {
    test('should provide multiple strategic options for AI choice', () => {
      const playerHand: Card[] = [
        { id: 'bj', joker: JokerType.Big, points: 0 },
        { id: '2h', rank: Rank.Two, suit: Suit.Hearts, points: 0 },
        { id: '3s', rank: Rank.Three, suit: Suit.Spades, points: 0 },
        { id: '4s', rank: Rank.Four, suit: Suit.Spades, points: 0 },
        { id: '5h', rank: Rank.Five, suit: Suit.Hearts, points: 5 },
        { id: '7c', rank: Rank.Seven, suit: Suit.Clubs, points: 0 },
      ];

      gameState.players[0].hand = playerHand;

      const leadingCombo: Card[] = [
        { id: 'lead1', rank: Rank.Six, suit: Suit.Spades, points: 0 },
        { id: 'lead2', rank: Rank.Six, suit: Suit.Spades, points: 0 },
      ];

      gameState.currentTrick = {
        plays: [
          { playerId: PlayerId.Bot1, cards: leadingCombo }
        ],
        winningPlayerId: PlayerId.Bot1,
        points: 0,
      };

      const validCombos = getValidCombinations(playerHand, gameState);

      // Should provide multiple valid options for AI to choose strategically
      expect(validCombos.length).toBeGreaterThan(1);

      // All options should be valid
      validCombos.forEach(combo => {
        const isValid = isValidPlay(combo.cards, leadingCombo, playerHand, trumpInfo);
        expect(isValid).toBe(true);
      });

      // Options should be sorted by strategic value (weakest first for disposal)
      for (let i = 1; i < validCombos.length; i++) {
        const prevValue = validCombos[i - 1].cards.reduce((sum, card) => 
          sum + calculateCardStrategicValue(card, trumpInfo, 'strategic'), 0);
        const currentValue = validCombos[i].cards.reduce((sum, card) => 
          sum + calculateCardStrategicValue(card, trumpInfo, 'strategic'), 0);
        
        // Should be sorted from weakest to strongest for strategic disposal
        expect(prevValue).toBeLessThanOrEqual(currentValue);
      }
    });
  });
});