import { compareCards } from '../../src/game/cardComparison';
import { isValidPlay } from '../../src/game/playValidation';
import { Card, ComboType, Rank, Suit } from '../../src/types';
import { createGameState } from '../helpers/gameStates';

describe('Different Suit Pair Comparison Bug', () => {
  const mockGameState = createGameState();
  const trumpInfo = { trumpSuit: Suit.Hearts, trumpRank: Rank.Two };

  describe('Non-trump pairs from different suits', () => {
    test('A♣-A♣ pair should NOT beat 4♦-4♦ pair (different suits, both non-trump)', () => {
      // Create the cards
      const aceClubs1 = Card.createCard(Suit.Clubs, Rank.Ace, 0);
      const aceClubs2 = Card.createCard(Suit.Clubs, Rank.Ace, 0);
      const fourDiamonds1 = Card.createCard(Suit.Diamonds, Rank.Four, 0);
      const fourDiamonds2 = Card.createCard(Suit.Diamonds, Rank.Four, 0);

      // Verify neither are trump
      expect(aceClubs1.suit).toBe(Suit.Clubs);
      expect(fourDiamonds1.suit).toBe(Suit.Diamonds);
      expect(trumpInfo.trumpSuit).toBe(Suit.Hearts); // Different from both

      // Test that compareCards correctly rejects cross-suit non-trump comparisons
      expect(() => {
        compareCards(aceClubs1, fourDiamonds1, trumpInfo);
      }).toThrow('compareCards: Invalid comparison between different non-trump suits');
      
      // The protection ensures different suits cannot be compared directly
      // For trick logic, use evaluateTrickPlay() instead
    });

    test('Following different suit pair should be invalid when non-trump', () => {
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

    test('Following different suit pair should be valid only when void in led suit', () => {
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

    test('Trump pair should beat non-trump pair regardless of suit', () => {
      // Set up a trick where 4♦-4♦ is led (non-trump)
      const leadingCombo = [
        Card.createCard(Suit.Diamonds, Rank.Four, 0),
        Card.createCard(Suit.Diamonds, Rank.Four, 0),
      ];

      // Follow with trump pair (Hearts is trump suit)
      const trumpPair = [
        Card.createCard(Suit.Hearts, Rank.Three, 0),
        Card.createCard(Suit.Hearts, Rank.Three, 0),
      ];

      // Individual card comparison - trump should beat non-trump
      const trumpCard = trumpPair[0];
      const nonTrumpCard = leadingCombo[0];
      
      const comparison = compareCards(trumpCard, nonTrumpCard, trumpInfo);
      expect(comparison).toBeGreaterThan(0); // Trump should beat non-trump
    });
  });

  describe('Same suit pair comparisons', () => {
    test('Higher rank pair should beat lower rank pair in same suit', () => {
      const aceSpades1 = Card.createCard(Suit.Spades, Rank.Ace, 0);
      const aceSpades2 = Card.createCard(Suit.Spades, Rank.Ace, 0);
      const fourSpades1 = Card.createCard(Suit.Spades, Rank.Four, 0);
      const fourSpades2 = Card.createCard(Suit.Spades, Rank.Four, 0);

      // Same suit comparison - Ace should beat 4
      const comparison = compareCards(aceSpades1, fourSpades1, trumpInfo);
      expect(comparison).toBeGreaterThan(0); // Ace should beat 4 in same suit
    });

    test('A♠-A♠ should beat 4♠-4♠ when both are same suit non-trump', () => {
      // This should work correctly - same suit, higher rank wins
      const aceSpadesPair = [
        Card.createCard(Suit.Spades, Rank.Ace, 0),
        Card.createCard(Suit.Spades, Rank.Ace, 0),
      ];
      const fourSpadesPair = [
        Card.createCard(Suit.Spades, Rank.Four, 0),
        Card.createCard(Suit.Spades, Rank.Four, 0),
      ];

      const comparison = compareCards(aceSpadesPair[0], fourSpadesPair[0], trumpInfo);
      expect(comparison).toBeGreaterThan(0);
    });
  });

  describe('Trump suit skipped scenarios', () => {
    // When trump suit is skipped, only trump rank and jokers are trump
    const skippedTrumpInfo = { trumpSuit: undefined, trumpRank: Rank.Two };

    test('A♣-A♣ should NOT beat 4♥-4♥ when trump suit skipped (both non-trump)', () => {
      // No trump suit declared, so Heart cards are regular
      const aceClubs1 = Card.createCard(Suit.Clubs, Rank.Ace, 0);
      const aceClubs2 = Card.createCard(Suit.Clubs, Rank.Ace, 0);
      const fourHearts1 = Card.createCard(Suit.Hearts, Rank.Four, 0);
      const fourHearts2 = Card.createCard(Suit.Hearts, Rank.Four, 0);

      // Neither should be trump since trump suit is not declared
      expect(aceClubs1.suit).toBe(Suit.Clubs);
      expect(fourHearts1.suit).toBe(Suit.Hearts);
      expect(skippedTrumpInfo.trumpSuit).toBe(undefined);

      // Test that compareCards correctly rejects cross-suit non-trump comparisons
      expect(() => {
        compareCards(aceClubs1, fourHearts1, skippedTrumpInfo);
      }).toThrow('compareCards: Invalid comparison between different non-trump suits');
    });

    test('2♠-2♠ should beat A♣-A♣ when trump suit skipped (trump rank vs non-trump)', () => {
      // 2s are trump rank, so they're trump even when trump suit is skipped
      const twoSpades1 = Card.createCard(Suit.Spades, Rank.Two, 0);
      const twoSpades2 = Card.createCard(Suit.Spades, Rank.Two, 0);
      const aceClubs1 = Card.createCard(Suit.Clubs, Rank.Ace, 0);
      const aceClubs2 = Card.createCard(Suit.Clubs, Rank.Ace, 0);

      // Trump rank (2♠) should beat non-trump (A♣)
      const comparison = compareCards(twoSpades1, aceClubs1, skippedTrumpInfo);
      expect(comparison).toBeGreaterThan(0); // Trump rank should beat non-trump
    });

    test('2♥-2♥ should be trump when trump suit skipped', () => {
      // Even though no trump suit is declared, 2♥ is still trump rank
      const twoHearts1 = Card.createCard(Suit.Hearts, Rank.Two, 0);
      const fourHearts1 = Card.createCard(Suit.Hearts, Rank.Four, 0);

      // 2♥ should be trump (trump rank), but 4♥ should NOT be trump (regular heart)
      const twoHeartsComparison = compareCards(twoHearts1, fourHearts1, skippedTrumpInfo);
      expect(twoHeartsComparison).toBeGreaterThan(0); // 2♥ (trump rank) beats 4♥ (regular)
    });

    test('Following different suit when trump skipped should follow same rules', () => {
      // Set up a trick where 4♦-4♦ is led
      const leadingCombo = [
        Card.createCard(Suit.Diamonds, Rank.Four, 0),
        Card.createCard(Suit.Diamonds, Rank.Four, 0),
      ];

      // Try to follow with A♣-A♣ (different suit, both non-trump)
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