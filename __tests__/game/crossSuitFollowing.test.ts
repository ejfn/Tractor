import { isValidPlay } from '../../src/game/playValidation';
import { Card, ComboType, Rank, Suit } from '../../src/types';
import { createGameState } from '../helpers/gameStates';

describe('FRV-6: Cross-Suit Following Rules', () => {
  const mockGameState = createGameState();
  const trumpInfo = { trumpSuit: Suit.Hearts, trumpRank: Rank.Two };

  describe('Cross-suit following validation', () => {
    test('FRV-6.1: Following different suit pair should be invalid when non-trump', () => {
      // Set up a trick where 4♦-4♦ is led
      const leadingCombo = [
        Card.createCard(Suit.Diamonds, Rank.Four, 0),
        Card.createCard(Suit.Diamonds, Rank.Four, 0),
      ];

      // Try to follow with A♣-A♣
      const followingCombo = [
        Card.createCard(Suit.Clubs, Rank.Ace, 0),
        Card.createCard(Suit.Clubs, Rank.Ace, 0),
      ];

      // Mock a game state with this trick
      const gameStateWithTrick = {
        ...mockGameState,
        currentTrick: {
          leadingPlayerId: 'bot1',
          leadingCombo: leadingCombo,
          leadingComboType: ComboType.Pair,
          plays: [],
          winningPlayerId: 'bot1',
          points: 0,
        },
        trumpInfo,
      };

      // Mock player hand that has both the Ace clubs and some diamonds
      const playerHand = [
        ...followingCombo,
        Card.createCard(Suit.Diamonds, Rank.Seven, 0), // Has diamonds, so must follow suit
        Card.createCard(Suit.Diamonds, Rank.Seven, 0),
      ];

      // This should be INVALID - player has diamonds so must follow diamonds, not play clubs
      const isValid = isValidPlay(
        followingCombo,
        leadingCombo,
        playerHand,
        trumpInfo
      );

      expect(isValid).toBe(false); // Should be false - must follow suit
    });

    test('FRV-6.2: Following different suit pair should be valid only when void in led suit', () => {
      // Set up a trick where 4♦-4♦ is led
      const leadingCombo = [
        Card.createCard(Suit.Diamonds, Rank.Four, 0),
        Card.createCard(Suit.Diamonds, Rank.Four, 0),
      ];

      // Try to follow with A♣-A♣
      const followingCombo = [
        Card.createCard(Suit.Clubs, Rank.Ace, 0),
        Card.createCard(Suit.Clubs, Rank.Ace, 0),
      ];

      // Mock a game state with this trick
      const gameStateWithTrick = {
        ...mockGameState,
        currentTrick: {
          leadingPlayerId: 'bot1',
          leadingCombo: leadingCombo,
          leadingComboType: ComboType.Pair,
          plays: [],
          winningPlayerId: 'bot1',
          points: 0,
        },
        trumpInfo,
      };

      // Mock player hand that has NO diamonds (void in led suit)
      const playerHandVoidInDiamonds = [
        ...followingCombo,
        Card.createCard(Suit.Spades, Rank.Seven, 0), // No diamonds available
        Card.createCard(Suit.Hearts, Rank.Eight, 0),
      ];

      // This should be VALID - player void in diamonds, can play any suit
      const isValid = isValidPlay(
        followingCombo,
        leadingCombo,
        playerHandVoidInDiamonds,
        trumpInfo
      );

      expect(isValid).toBe(true); // Should be true when void in led suit
    });

    test('FRV-6.3: Following different suit when trump suit skipped should follow same rules', () => {
      // Trump suit skipped scenario: No trump suit, only trump rank and jokers are trump
      const skippedTrumpInfo = { trumpSuit: Suit.None, trumpRank: Rank.King };

      // Set up a trick where 4♦-4♦ is led (non-trump suit)
      const leadingCombo = [
        Card.createCard(Suit.Diamonds, Rank.Four, 0),
        Card.createCard(Suit.Diamonds, Rank.Four, 0),
      ];

      // Try to follow with A♣-A♣ (different non-trump suit)
      const followingCombo = [
        Card.createCard(Suit.Clubs, Rank.Ace, 0),
        Card.createCard(Suit.Clubs, Rank.Ace, 0),
      ];

      const gameStateWithSkippedTrump = {
        ...mockGameState,
        currentTrick: {
          leadingPlayerId: 'bot1',
          leadingCombo: leadingCombo,
          leadingComboType: ComboType.Pair,
          plays: [],
          winningPlayerId: 'bot1',
          points: 0,
        },
        trumpInfo: skippedTrumpInfo,
      };

      // Player hand with diamonds available - must follow suit
      const playerHand = [
        ...followingCombo,
        Card.createCard(Suit.Diamonds, Rank.Seven, 0),
        Card.createCard(Suit.Diamonds, Rank.Seven, 0),
      ];

      // Should be invalid - must follow diamonds even when trump suit skipped
      const isValid = isValidPlay(
        followingCombo,
        leadingCombo,
        playerHand,
        skippedTrumpInfo
      );

      expect(isValid).toBe(false); // Must follow suit regardless of trump declaration
    });
  });
});