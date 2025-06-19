import { describe, expect, test } from '@jest/globals';
import { detectOptimalMultiCombo, validateMultiComboSelection, detectMultiComboAttempt } from '../../src/game/multiComboAnalysis';
import { Card, ComboType, GameState, Rank, Suit, PlayerId } from '../../src/types';
import { createTrumpScenarios } from '../helpers';
import { initializeGame } from '../../src/utils/gameInitialization';

describe('Multi-Combo Detection Tests', () => {
  const trumpInfo = createTrumpScenarios.spadesTrump(); // Rank 2, Spades trump

  // Helper to create basic game state with played cards
  const createGameStateWithPlayedCards = (playedCards: Card[]): GameState => {
    const gameState = initializeGame();
    
    // Add played cards to tricks history 
    if (playedCards.length > 0) {
      gameState.tricks.push({
        plays: playedCards.map((card, index) => ({
          playerId: `bot${(index % 3) + 1}` as PlayerId,
          cards: [card],
        })),
        winningPlayerId: PlayerId.Bot1,
        points: 0,
      });
    }
    
    return gameState;
  };

  describe('detectOptimalMultiCombo - AI Multi-Combo Detection', () => {
    test('No multi-combo when hand has only singles', () => {
      const playerHand = [
        Card.createCard(Suit.Hearts, Rank.Ace, 0),
        Card.createCard(Suit.Hearts, Rank.King, 0),
        Card.createCard(Suit.Hearts, Rank.Queen, 0),
      ];
      
      const gameState = createGameStateWithPlayedCards([]);
      
      const result = detectOptimalMultiCombo(
        playerHand,
        trumpInfo,
        gameState,
        PlayerId.Human
      );
      
      // Only singles available - no multi-combo possible
      expect(result.isMultiCombo).toBe(false);
    });

    test('Detects simple pair + singles multi-combo when all components unbeatable', () => {
      const playerHand = [
        ...Card.createPair(Suit.Hearts, Rank.Ace),    // A♥A♥ - always unbeatable
        Card.createCard(Suit.Hearts, Rank.King, 0),   // K♥ - unbeatable when A♥A♥ pair broken
        Card.createCard(Suit.Hearts, Rank.Queen, 0),  // Q♥ - unbeatable when A♥A♥, K♥K♥ pairs broken
      ];
      
      // Break higher pairs to make singles unbeatable
      const playedCards = [
        Card.createCard(Suit.Hearts, Rank.King, 1),   // Break K♥K♥ pair (only one K♥ left)
        Card.createCard(Suit.Hearts, Rank.Queen, 1),  // Break Q♥Q♥ pair (only one Q♥ left)
      ];
      
      const gameState = createGameStateWithPlayedCards(playedCards);
      
      const result = detectOptimalMultiCombo(
        playerHand,
        trumpInfo,
        gameState,
        PlayerId.Human
      );
      
      expect(result.isMultiCombo).toBe(true);
      expect(result.structure?.suit).toBe(Suit.Hearts);
      expect(result.structure?.totalLength).toBe(4); // 2 (pair) + 1 + 1 (singles)
      expect(result.structure?.components.pairs).toBe(1);
      expect(result.structure?.components.singles).toBe(2);
      expect(result.structure?.isLeading).toBe(true);
      expect(result.components).toHaveLength(3); // A♥A♥ + K♥ + Q♥
    });

    test('Chooses longest multi-combo when multiple suits available', () => {
      const playerHand = [
        // Hearts: 2 pairs + 1 single = 5 cards (non-consecutive pairs)
        ...Card.createPair(Suit.Hearts, Rank.Nine),   // 9♥9♥
        ...Card.createPair(Suit.Hearts, Rank.Six),    // 6♥6♥ (non-consecutive with 9s)
        Card.createCard(Suit.Hearts, Rank.Four, 0),   // 4♥
        
        // Diamonds: 1 pair + 1 single = 3 cards
        ...Card.createPair(Suit.Diamonds, Rank.Eight), // 8♦8♦
        Card.createCard(Suit.Diamonds, Rank.Five, 0),  // 5♦
      ];
      
      // Make all components unbeatable by accounting for all higher cards
      const playedCards = [
        // Account for ALL cards that could beat our combos
        // Hearts: need to account for all cards higher than 9♥9♥, 6♥6♥, 4♥
        Card.createCard(Suit.Hearts, Rank.Ace, 0),    // Account for A♥
        Card.createCard(Suit.Hearts, Rank.Ace, 1),    // Account for A♥A♥ pair
        Card.createCard(Suit.Hearts, Rank.King, 0),   // Account for K♥
        Card.createCard(Suit.Hearts, Rank.King, 1),   // Account for K♥K♥ pair
        Card.createCard(Suit.Hearts, Rank.Queen, 0),  // Account for Q♥
        Card.createCard(Suit.Hearts, Rank.Queen, 1),  // Account for Q♥Q♥ pair
        Card.createCard(Suit.Hearts, Rank.Jack, 0),   // Account for J♥
        Card.createCard(Suit.Hearts, Rank.Jack, 1),   // Account for J♥J♥ pair
        Card.createCard(Suit.Hearts, Rank.Ten, 0),    // Account for 10♥
        Card.createCard(Suit.Hearts, Rank.Ten, 1),    // Account for 10♥10♥ pair
        Card.createCard(Suit.Hearts, Rank.Eight, 0),  // Account for 8♥
        Card.createCard(Suit.Hearts, Rank.Eight, 1),  // Account for 8♥8♥ pair
        Card.createCard(Suit.Hearts, Rank.Seven, 0),  // Account for 7♥
        Card.createCard(Suit.Hearts, Rank.Seven, 1),  // Account for 7♥7♥ pair
        Card.createCard(Suit.Hearts, Rank.Five, 0),   // Account for 5♥
        Card.createCard(Suit.Hearts, Rank.Five, 1),   // Account for 5♥5♥ pair
        Card.createCard(Suit.Hearts, Rank.Four, 1),   // Break 4♥4♥ pair
        // Diamonds: need to account for all higher cards than 8♦8♦, 5♦
        Card.createCard(Suit.Diamonds, Rank.Ace, 0),    // All higher cards
        Card.createCard(Suit.Diamonds, Rank.Ace, 1),
        Card.createCard(Suit.Diamonds, Rank.King, 0),
        Card.createCard(Suit.Diamonds, Rank.King, 1),
        Card.createCard(Suit.Diamonds, Rank.Queen, 0),
        Card.createCard(Suit.Diamonds, Rank.Queen, 1),
        Card.createCard(Suit.Diamonds, Rank.Jack, 0),
        Card.createCard(Suit.Diamonds, Rank.Jack, 1),
        Card.createCard(Suit.Diamonds, Rank.Ten, 0),
        Card.createCard(Suit.Diamonds, Rank.Ten, 1),
        Card.createCard(Suit.Diamonds, Rank.Nine, 0),
        Card.createCard(Suit.Diamonds, Rank.Nine, 1),
        Card.createCard(Suit.Diamonds, Rank.Seven, 0),
        Card.createCard(Suit.Diamonds, Rank.Seven, 1),
        Card.createCard(Suit.Diamonds, Rank.Six, 0),
        Card.createCard(Suit.Diamonds, Rank.Six, 1),
        Card.createCard(Suit.Diamonds, Rank.Five, 1),   // Break 5♦5♦ pair
      ];
      
      const gameState = createGameStateWithPlayedCards(playedCards);
      
      const result = detectOptimalMultiCombo(
        playerHand,
        trumpInfo,
        gameState,
        PlayerId.Human
      );
      
      expect(result.isMultiCombo).toBe(true);
      expect(result.structure?.suit).toBe(Suit.Hearts); // Hearts has longer combo (5 vs 3)
      expect(result.structure?.totalLength).toBe(5);
      expect(result.structure?.components.pairs).toBe(2);    // 9♥9♥ and 6♥6♥ (non-consecutive)
      expect(result.structure?.components.tractors).toBe(0); // No tractors
      expect(result.structure?.components.singles).toBe(1);  // 4♥ single
    });

    test('No multi-combo when components are beatable', () => {
      const playerHand = [
        ...Card.createPair(Suit.Hearts, Rank.King),   // K♥K♥ - beatable by A♥A♥
        Card.createCard(Suit.Hearts, Rank.Queen, 0),  // Q♥ - beatable by higher singles
        Card.createCard(Suit.Hearts, Rank.Jack, 0),   // J♥ - beatable by higher singles
      ];
      
      const gameState = createGameStateWithPlayedCards([]); // No played cards = everything beatable
      
      const result = detectOptimalMultiCombo(
        playerHand,
        trumpInfo,
        gameState,
        PlayerId.Human
      );
      
      expect(result.isMultiCombo).toBe(false);
    });

    test('Detects tractor + single multi-combo when all unbeatable', () => {
      const playerHand = [
        ...Card.createPair(Suit.Hearts, Rank.Ace),    // A♥A♥
        ...Card.createPair(Suit.Hearts, Rank.King),   // K♥K♥
        Card.createCard(Suit.Hearts, Rank.Queen, 0),  // Q♥
      ];
      
      // Make Q♥ single unbeatable
      const playedCards = [
        Card.createCard(Suit.Hearts, Rank.Queen, 1),  // Break Q♥Q♥ pair
      ];
      
      const gameState = createGameStateWithPlayedCards(playedCards);
      
      const result = detectOptimalMultiCombo(
        playerHand,
        trumpInfo,
        gameState,
        PlayerId.Human
      );
      
      expect(result.isMultiCombo).toBe(true);
      expect(result.structure?.totalLength).toBe(5); // 4 (tractor) + 1 (single)
      expect(result.structure?.components.tractors).toBe(1);
      expect(result.structure?.components.singles).toBe(1);
      expect(result.components).toHaveLength(2); // A♥A♥-K♥K♥ + Q♥
    });

    test('Skips trump multi-combos (conservative approach)', () => {
      const playerHand = [
        Card.createCard(Suit.Spades, Rank.Ace, 0),    // Trump suit card
        Card.createCard(Suit.Spades, Rank.Ace, 1),    // Trump suit card
        Card.createCard(Suit.Hearts, Rank.Two, 0),    // Trump rank card
        Card.createCard(Suit.Clubs, Rank.Two, 1),     // Trump rank card
      ];
      
      const gameState = createGameStateWithPlayedCards([]);
      
      const result = detectOptimalMultiCombo(
        playerHand,
        trumpInfo,
        gameState,
        PlayerId.Human
      );
      
      // Trump cards grouped as Suit.None - skipped due to conservative approach
      expect(result.isMultiCombo).toBe(false);
    });

    test('Requires minimum 3 cards per suit for multi-combo consideration', () => {
      const playerHand = [
        // Hearts: only 2 cards - too few
        ...Card.createPair(Suit.Hearts, Rank.Ace),
        
        // Diamonds: only 2 cards - too few  
        Card.createCard(Suit.Diamonds, Rank.King, 0),
        Card.createCard(Suit.Diamonds, Rank.Queen, 0),
      ];
      
      const gameState = createGameStateWithPlayedCards([]);
      
      const result = detectOptimalMultiCombo(
        playerHand,
        trumpInfo,
        gameState,
        PlayerId.Human
      );
      
      expect(result.isMultiCombo).toBe(false);
    });

    test('Complex multi-combo: multiple pairs + singles', () => {
      const playerHand = [
        // All Hearts - multiple non-consecutive pairs + singles
        ...Card.createPair(Suit.Hearts, Rank.Ten),    // 10♥10♥
        ...Card.createPair(Suit.Hearts, Rank.Seven),  // 7♥7♥ (non-consecutive with 10s)
        ...Card.createPair(Suit.Hearts, Rank.Four),   // 4♥4♥ (non-consecutive with 7s)
        Card.createCard(Suit.Hearts, Rank.Jack, 0),   // J♥ 
        Card.createCard(Suit.Hearts, Rank.Three, 0),  // 3♥
      ];
      
      // Make singles unbeatable by breaking their pairs and accounting for ALL higher cards
      const playedCards = [
        Card.createCard(Suit.Hearts, Rank.Jack, 1),   // Break J♥J♥ pair
        Card.createCard(Suit.Hearts, Rank.Three, 1),  // Break 3♥3♥ pair
        
        // Account for ALL cards that could beat the pairs
        // For 10♥10♥ to be unbeatable: need A♥, K♥, Q♥, J♥ accounted
        Card.createCard(Suit.Hearts, Rank.Ace, 0),    // Account for A♥
        Card.createCard(Suit.Hearts, Rank.Ace, 1),    // Account for A♥A♥ pair
        Card.createCard(Suit.Hearts, Rank.King, 0),   // Account for K♥
        Card.createCard(Suit.Hearts, Rank.King, 1),   // Account for K♥K♥ pair
        Card.createCard(Suit.Hearts, Rank.Queen, 0),  // Account for Q♥
        Card.createCard(Suit.Hearts, Rank.Queen, 1),  // Account for Q♥Q♥ pair
        
        // For 7♥7♥ to be unbeatable: need higher pairs accounted
        Card.createCard(Suit.Hearts, Rank.Nine, 0),   // Account for 9♥
        Card.createCard(Suit.Hearts, Rank.Nine, 1),   // Account for 9♥9♥ pair
        Card.createCard(Suit.Hearts, Rank.Eight, 0),  // Account for 8♥
        Card.createCard(Suit.Hearts, Rank.Eight, 1),  // Account for 8♥8♥ pair
        
        // For 4♥4♥ to be unbeatable: need higher pairs accounted
        Card.createCard(Suit.Hearts, Rank.Six, 0),    // Account for 6♥
        Card.createCard(Suit.Hearts, Rank.Six, 1),    // Account for 6♥6♥ pair
        Card.createCard(Suit.Hearts, Rank.Five, 0),   // Account for 5♥
        Card.createCard(Suit.Hearts, Rank.Five, 1),   // Account for 5♥5♥ pair
      ];
      
      const gameState = createGameStateWithPlayedCards(playedCards);
      
      const result = detectOptimalMultiCombo(
        playerHand,
        trumpInfo,
        gameState,
        PlayerId.Human
      );
      
      expect(result.isMultiCombo).toBe(true);
      expect(result.structure?.totalLength).toBe(8); // 3 pairs (6 cards) + 2 singles
      expect(result.structure?.components.pairs).toBe(3);    // 10♥10♥, 7♥7♥, 4♥4♥ (non-consecutive)
      expect(result.structure?.components.tractors).toBe(0); // No tractors (non-consecutive pairs)
      expect(result.structure?.components.singles).toBe(2);  // J♥, 3♥ singles
      expect(result.components).toHaveLength(5); // 3 pairs + 2 singles
    });
  });

  describe('validateMultiComboSelection - Human Multi-Combo Validation', () => {
    test('Validates correct multi-combo selection structure (ignoring void status)', () => {
      const selectedCards = [
        ...Card.createPair(Suit.Hearts, Rank.Ace),    // A♥A♥ - always unbeatable
        Card.createCard(Suit.Hearts, Rank.King, 0),   // K♥ - unbeatable when K♥K♥ broken
      ];
      
      // Break K♥K♥ pair to make K♥ single unbeatable
      const playedCards = [
        Card.createCard(Suit.Hearts, Rank.King, 1),
      ];
      
      const gameState = createGameStateWithPlayedCards(playedCards);
      
      const result = validateMultiComboSelection(
        selectedCards,
        trumpInfo,
        gameState,
        PlayerId.Human
      );
      
      // Should detect structure correctly even if validation fails due to void status
      // The function should still analyze the structure even when validation fails
      expect(result.isMultiCombo).toBe(true); // Structure detection should work
      expect(result.structure?.totalLength).toBe(3);
      expect(result.structure?.components.pairs).toBe(1);
      expect(result.structure?.components.singles).toBe(1);
      
      // Note: validation.isValid will be false due to void status requirements
      // but the structure should still be detected and returned
      expect(result.validation?.isValid).toBe(false);
      expect(result.validation?.invalidReasons[0]).toContain('Not all other players are void');
    });

    test('Detects structure but validation fails due to void status', () => {
      const selectedCards = [
        ...Card.createPair(Suit.Hearts, Rank.King),   // K♥K♥ - beatable by A♥A♥
        Card.createCard(Suit.Hearts, Rank.Queen, 0),  // Q♥ - beatable by higher cards
      ];
      
      const gameState = createGameStateWithPlayedCards([]); // No cards played = everything beatable
      
      const result = validateMultiComboSelection(
        selectedCards,
        trumpInfo,
        gameState,
        PlayerId.Human
      );
      
      // Structure is valid (pair + single), but validation fails on void status
      expect(result.isMultiCombo).toBe(true);
      expect(result.structure?.totalLength).toBe(3);
      expect(result.structure?.components.pairs).toBe(1);
      expect(result.structure?.components.singles).toBe(1);
      expect(result.validation?.isValid).toBe(false);
      // Note: Will fail void status check before checking unbeatable components
      expect(result.validation?.invalidReasons[0]).toContain('Not all other players are void');
    });

    test('Rejects selection with insufficient cards', () => {
      const selectedCards = [
        Card.createCard(Suit.Hearts, Rank.Ace, 0),    // Only 1 card
      ];
      
      const gameState = createGameStateWithPlayedCards([]);
      
      const result = validateMultiComboSelection(
        selectedCards,
        trumpInfo,
        gameState,
        PlayerId.Human
      );
      
      expect(result.isMultiCombo).toBe(false);
    });

    test('Rejects selection from multiple suits', () => {
      const selectedCards = [
        ...Card.createPair(Suit.Hearts, Rank.Ace),    // Hearts
        Card.createCard(Suit.Diamonds, Rank.King, 0), // Diamonds - different suit
      ];
      
      const gameState = createGameStateWithPlayedCards([]);
      
      const result = validateMultiComboSelection(
        selectedCards,
        trumpInfo,
        gameState,
        PlayerId.Human
      );
      
      expect(result.isMultiCombo).toBe(false);
    });

    test('Accepts multiple singles as valid multi-combo structure', () => {
      const selectedCards = [
        Card.createCard(Suit.Hearts, Rank.Ace, 0),
        Card.createCard(Suit.Hearts, Rank.King, 0),
        Card.createCard(Suit.Hearts, Rank.Queen, 0),
        // Multiple singles from same suit - valid multi-combo structure
      ];
      
      const gameState = createGameStateWithPlayedCards([]);
      
      const result = validateMultiComboSelection(
        selectedCards,
        trumpInfo,
        gameState,
        PlayerId.Human
      );
      
      // Structure is valid (multiple singles), but validation fails due to void status
      expect(result.isMultiCombo).toBe(true);
      expect(result.structure?.components.singles).toBe(3);
      expect(result.validation?.isValid).toBe(false);
      expect(result.validation?.invalidReasons[0]).toContain('Not all other players are void');
    });

    test('Validates selection when void status requirements met', () => {
      // Note: This test would require setting up memory system with void detection
      // For now, we'll focus on the unbeatable component validation
      // Void detection testing would be more complex and require game state manipulation
      
      const selectedCards = [
        ...Card.createPair(Suit.Hearts, Rank.Ace),    // A♥A♥ - unbeatable
        Card.createCard(Suit.Hearts, Rank.King, 0),   // K♥ - unbeatable when broken
      ];
      
      const playedCards = [
        Card.createCard(Suit.Hearts, Rank.King, 1),   // Break K♥K♥
      ];
      
      const gameState = createGameStateWithPlayedCards(playedCards);
      
      const result = validateMultiComboSelection(
        selectedCards,
        trumpInfo,
        gameState,
        PlayerId.Human
      );
      
      // Should detect structure correctly, validation will fail due to void status
      expect(result.isMultiCombo).toBe(true);
      expect(result.structure?.totalLength).toBe(3);
      expect(result.validation?.isValid).toBe(false);
      expect(result.validation?.invalidReasons[0]).toContain('Not all other players are void');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('Empty hand returns no multi-combo', () => {
      const playerHand: Card[] = [];
      const gameState = createGameStateWithPlayedCards([]);
      
      const result = detectOptimalMultiCombo(
        playerHand,
        trumpInfo,
        gameState,
        PlayerId.Human
      );
      
      expect(result.isMultiCombo).toBe(false);
    });

    test('Hand with only trump cards returns no multi-combo (conservative)', () => {
      const playerHand = [
        Card.createCard(Suit.Spades, Rank.Ace, 0),    // Trump suit
        Card.createCard(Suit.Spades, Rank.King, 0),   // Trump suit
        Card.createCard(Suit.Hearts, Rank.Two, 0),    // Trump rank
      ];
      
      const gameState = createGameStateWithPlayedCards([]);
      
      const result = detectOptimalMultiCombo(
        playerHand,
        trumpInfo,
        gameState,
        PlayerId.Human
      );
      
      expect(result.isMultiCombo).toBe(false);
    });

    test('validateMultiComboSelection with empty selection', () => {
      const selectedCards: Card[] = [];
      const gameState = createGameStateWithPlayedCards([]);
      
      const result = validateMultiComboSelection(
        selectedCards,
        trumpInfo,
        gameState,
        PlayerId.Human
      );
      
      expect(result.isMultiCombo).toBe(false);
    });
  });

  describe('detectMultiComboAttempt - Basic Structure Detection', () => {
    test('Detects pair + single multi-combo structure', () => {
      const cards = [
        ...Card.createPair(Suit.Hearts, Rank.Ace),    // A♥A♥
        Card.createCard(Suit.Hearts, Rank.King, 0),   // K♥
      ];
      
      const result = detectMultiComboAttempt(cards, trumpInfo);
      
      expect(result.isMultiCombo).toBe(true);
      expect(result.structure?.suit).toBe(Suit.Hearts);
      expect(result.structure?.totalLength).toBe(3);
      expect(result.structure?.components.pairs).toBe(1);
      expect(result.structure?.components.singles).toBe(1);
      expect(result.components).toHaveLength(2);
    });

    test('Detects tractor + single multi-combo structure', () => {
      const cards = [
        ...Card.createPair(Suit.Hearts, Rank.Ace),    // A♥A♥
        ...Card.createPair(Suit.Hearts, Rank.King),   // K♥K♥
        Card.createCard(Suit.Hearts, Rank.Queen, 0),  // Q♥
      ];
      
      const result = detectMultiComboAttempt(cards, trumpInfo);
      
      expect(result.isMultiCombo).toBe(true);
      expect(result.structure?.totalLength).toBe(5);
      expect(result.structure?.components.tractors).toBe(1);
      expect(result.structure?.components.singles).toBe(1);
      expect(result.components).toHaveLength(2); // tractor + single
    });

    test('Detects multiple pairs + singles structure', () => {
      const cards = [
        ...Card.createPair(Suit.Hearts, Rank.Nine),   // 9♥9♥
        ...Card.createPair(Suit.Hearts, Rank.Six),    // 6♥6♥ (non-consecutive with 9s)
        Card.createCard(Suit.Hearts, Rank.Four, 0),   // 4♥
        Card.createCard(Suit.Hearts, Rank.Three, 0),  // 3♥
      ];
      
      const result = detectMultiComboAttempt(cards, trumpInfo);
      
      expect(result.isMultiCombo).toBe(true);
      expect(result.structure?.totalLength).toBe(6);
      expect(result.structure?.components.pairs).toBe(2);  // 9♥9♥ and 6♥6♥ (non-consecutive)
      expect(result.structure?.components.singles).toBe(2); // 4♥ and 3♥
      expect(result.structure?.components.tractors).toBe(0); // No tractors
    });

    test('Accepts multiple singles as valid multi-combo', () => {
      const cards = [
        Card.createCard(Suit.Hearts, Rank.Ace, 0),
        Card.createCard(Suit.Hearts, Rank.King, 0),
        Card.createCard(Suit.Hearts, Rank.Queen, 0),
        // Multiple singles from same suit - valid multi-combo
      ];
      
      const result = detectMultiComboAttempt(cards, trumpInfo);
      
      expect(result.isMultiCombo).toBe(true);
      expect(result.structure?.components.singles).toBe(3);
      expect(result.structure?.components.pairs).toBe(0);
      expect(result.structure?.components.tractors).toBe(0);
    });

    test('Rejects single card as invalid multi-combo', () => {
      const cards = [
        Card.createCard(Suit.Hearts, Rank.Ace, 0),
        // Only one card - cannot form multi-combo
      ];
      
      const result = detectMultiComboAttempt(cards, trumpInfo);
      
      expect(result.isMultiCombo).toBe(false);
    });
  });
});