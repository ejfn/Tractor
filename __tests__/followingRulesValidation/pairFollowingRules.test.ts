import { isValidPlay } from '../../src/game/playValidation';
import { Card, JokerType, Rank, Suit, TrumpInfo, PlayerId, GameState } from '../../src/types';
import { createTrumpInfo, createGameState } from '../helpers';

describe('FRV-2: Pair Following Rules', () => {
  const createTestTrumpInfo = (trumpRank: Rank, trumpSuit: Suit): TrumpInfo => ({
    trumpRank,
    trumpSuit, 
  });

  describe('Basic combination length and suit following', () => {
    test('FRV-2.1: Basic combination length validation', () => {
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Spades);
      const leadingCombo = Card.createPair(Suit.Hearts, Rank.Three);
      const playerHand = [
        ...Card.createPair(Suit.Hearts, Rank.Seven),
        Card.createCard(Suit.Clubs, Rank.Eight, 0)
      ];
      const gameState = createGameState({
        trumpInfo,
        currentTrick: {
          plays: [{ playerId: PlayerId.Human, cards: leadingCombo }],
          winningPlayerId: PlayerId.Human,
          points: 0,
        }
      });
      
      // Single card invalid for pair lead
      expect(isValidPlay([playerHand[0]], playerHand, PlayerId.Bot1, gameState)).toBe(false);
      
      // Two cards valid for pair lead
      expect(isValidPlay([playerHand[0], playerHand[1]], playerHand, PlayerId.Bot1, gameState)).toBe(true);
    });

    test('FRV-2.2: Must use same-suit pair when available', () => {
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Spades);
      const leadingCombo = Card.createPair(Suit.Hearts, Rank.Three);
      const playerHand = [
        ...Card.createPair(Suit.Hearts, Rank.Seven),
        Card.createCard(Suit.Hearts, Rank.Eight, 0),
        Card.createCard(Suit.Clubs, Rank.Nine, 0)
      ];
      const gameState = createGameState({
        trumpInfo,
        currentTrick: {
          plays: [{ playerId: PlayerId.Human, cards: leadingCombo }],
          winningPlayerId: PlayerId.Human,
          points: 0,
        }
      });
      
      // Must use the Hearts pair
      expect(isValidPlay([playerHand[0], playerHand[1]], playerHand, PlayerId.Bot1, gameState)).toBe(true);
    });

    test('FRV-2.3: Cannot mix suits when same-suit pair available', () => {
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Spades);
      const leadingCombo = Card.createPair(Suit.Hearts, Rank.Three);
      const playerHand = [
        ...Card.createPair(Suit.Hearts, Rank.Seven),
        Card.createCard(Suit.Hearts, Rank.Eight, 0),
        Card.createCard(Suit.Clubs, Rank.Nine, 0)
      ];
      const gameState = createGameState({
        trumpInfo,
        currentTrick: {
          plays: [{ playerId: PlayerId.Human, cards: leadingCombo }],
          winningPlayerId: PlayerId.Human,
          points: 0,
        }
      });
      
      // Cannot mix Hearts with Clubs when Hearts pair available
      expect(isValidPlay([playerHand[0], playerHand[3]], playerHand, PlayerId.Bot1, gameState)).toBe(false);
    });

    test('FRV-2.4: Must include leading suit when insufficient', () => {
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Spades);
      const leadingCombo = Card.createPair(Suit.Hearts, Rank.Three);
      const playerHand = [
        Card.createCard(Suit.Hearts, Rank.Seven, 0),
        Card.createCard(Suit.Clubs, Rank.Eight, 0),
        Card.createCard(Suit.Diamonds, Rank.Nine, 0)
      ];
      const gameState = createGameState({
        trumpInfo,
        currentTrick: {
          plays: [{ playerId: PlayerId.Human, cards: leadingCombo }],
          winningPlayerId: PlayerId.Human,
          points: 0,
        }
      });
      
      // Must include the Hearts card in play
      expect(isValidPlay([playerHand[0], playerHand[1]], playerHand, PlayerId.Bot1, gameState)).toBe(true);
    });

    test('FRV-2.5: Cannot skip leading suit card', () => {
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Spades);
      const leadingCombo = Card.createPair(Suit.Hearts, Rank.Three);
      const playerHand = [
        Card.createCard(Suit.Hearts, Rank.Seven, 0),
        Card.createCard(Suit.Clubs, Rank.Eight, 0),
        Card.createCard(Suit.Diamonds, Rank.Nine, 0)
      ];
      const gameState = createGameState({
        trumpInfo,
        currentTrick: {
          plays: [{ playerId: PlayerId.Human, cards: leadingCombo }],
          winningPlayerId: PlayerId.Human,
          points: 0,
        }
      });
      
      // Cannot skip the Hearts card
      expect(isValidPlay([playerHand[1], playerHand[2]], playerHand, PlayerId.Bot1, gameState)).toBe(false);
    });

    test('FRV-2.6: Clubs combo valid when no Hearts', () => {
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Spades);
      const leadingCombo = Card.createPair(Suit.Hearts, Rank.Three);
      const playerHand = [
        Card.createCard(Suit.Clubs, Rank.Seven, 0),
        Card.createCard(Suit.Clubs, Rank.Eight, 0),
        Card.createCard(Suit.Diamonds, Rank.Nine, 0)
      ];
      const gameState = createGameState({
        trumpInfo,
        currentTrick: {
          plays: [{ playerId: PlayerId.Human, cards: leadingCombo }],
          winningPlayerId: PlayerId.Human,
          points: 0,
        }
      });
      
      // No Hearts cards, so Clubs combo is valid
      expect(isValidPlay([playerHand[0], playerHand[1]], playerHand, PlayerId.Bot1, gameState)).toBe(true);
    });
  });

  describe('Pair following with different cards', () => {
    test('FRV-2.7: Two different leading suit cards OK', () => {
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Spades);
      const leadingPair = Card.createPair(Suit.Hearts, Rank.King);
      
      // Human has two different hearts (not a pair)
      const playerHand = [
        Card.createCard(Suit.Hearts, Rank.Queen, 0),
        Card.createCard(Suit.Hearts, Rank.Jack, 0),
        Card.createCard(Suit.Spades, Rank.Ace, 0)
      ];
      const gameState = createGameState({
        trumpInfo,
        currentTrick: {
          plays: [{ playerId: PlayerId.Human, cards: leadingPair }],
          winningPlayerId: PlayerId.Human,
          points: 0,
        }
      });
      
      // Two different hearts should be valid
      const selectedCards = [playerHand[0], playerHand[1]];
      
      expect(isValidPlay(selectedCards, playerHand, PlayerId.Bot1, gameState)).toBe(true);
    });

    test('FRV-2.8: Mixed Hearts valid when no pairs available', () => {
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Spades);
      const leadingPair = Card.createPair(Suit.Hearts, Rank.King);
      
      // Human has various hearts but no heart pairs
      const playerHand = [
        Card.createCard(Suit.Hearts, Rank.Queen, 0),
        Card.createCard(Suit.Hearts, Rank.Jack, 0),
        Card.createCard(Suit.Hearts, Rank.Ten, 0),
        Card.createCard(Suit.Spades, Rank.Ace, 0)
      ];
      const gameState = createGameState({
        trumpInfo,
        currentTrick: {
          plays: [{ playerId: PlayerId.Human, cards: leadingPair }],
          winningPlayerId: PlayerId.Human,
          points: 0,
        }
      });
      
      // Should be valid to play any two hearts when no pairs available
      const mixedHeartsPlay = [playerHand[0], playerHand[1]];
      
      expect(isValidPlay(mixedHeartsPlay, playerHand, PlayerId.Bot1, gameState)).toBe(true);
    });
  });

  describe('Cross-suit and void scenarios', () => {
    test('FRV-2.9: Must follow suit when available', () => {
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Hearts);

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

      // Mock player hand that has both the Ace clubs and some diamonds
      const playerHand = [
        ...followingCombo,
        Card.createCard(Suit.Diamonds, Rank.Seven, 0), // Has diamonds, so must follow suit
        Card.createCard(Suit.Diamonds, Rank.Seven, 0),
      ];

      // This should be INVALID - player has diamonds so must follow diamonds, not play clubs
      const gameState = createGameState({
        trumpInfo,
        currentTrick: {
          plays: [{ playerId: PlayerId.Human, cards: leadingCombo }],
          winningPlayerId: PlayerId.Human,
          points: 0,
        }
      });
      
      const isValid = isValidPlay(
        followingCombo,
        playerHand,
        PlayerId.Bot1,
        gameState
      );

      expect(isValid).toBe(false); // Should be false - must follow suit
    });

    test('FRV-2.10: Valid when void in led suit', () => {
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Hearts);

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

      // Mock player hand that has NO diamonds (void in led suit)
      const playerHandVoidInDiamonds = [
        ...followingCombo,
        Card.createCard(Suit.Spades, Rank.Seven, 0), // No diamonds available
        Card.createCard(Suit.Hearts, Rank.Eight, 0),
      ];

      // This should be VALID - player void in diamonds, can play any suit
      const gameState = createGameState({
        trumpInfo,
        currentTrick: {
          plays: [{ playerId: PlayerId.Human, cards: leadingCombo }],
          winningPlayerId: PlayerId.Human,
          points: 0,
        }
      });
      
      const isValid = isValidPlay(
        followingCombo,
        playerHandVoidInDiamonds,
        PlayerId.Bot1,
        gameState
      );

      expect(isValid).toBe(true); // Should be true when void in led suit
    });

    test('FRV-2.11: Trump singles when no trump pairs', () => {
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Spades);
      
      // Leading with a pair of trump suit
      const leadingCombo = Card.createPair(Suit.Spades, Rank.Five);

      // Player hand has trump singles but no trump pairs  
      const playerHand = [
        Card.createCard(Suit.Spades, Rank.Ace, 0), // Trump single
        Card.createCard(Suit.Spades, Rank.Queen, 0), // Trump single  
        Card.createCard(Suit.Hearts, Rank.Seven, 0) // Non-trump
      ];
      const gameState = createGameState({
        trumpInfo,
        currentTrick: {
          plays: [{ playerId: PlayerId.Human, cards: leadingCombo }],
          winningPlayerId: PlayerId.Human,
          points: 0,
        }
      });

      const trumpSinglesPlay = [playerHand[0], playerHand[1]];

      // Should be valid - using trump singles when no trump pairs available
      expect(isValidPlay(trumpSinglesPlay, playerHand, PlayerId.Bot1, gameState)).toBe(true);
    });
  });

  describe('Trump pair following - comprehensive trump unification', () => {
    test('FRV-2.12: Must use joker pairs when leading trump pairs', () => {
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Hearts);
      
      // Leading with trump suit pair
      const leadingCombo = Card.createPair(Suit.Hearts, Rank.Five);
      
      // Player has Big Joker pair + trump singles
      const playerHand = [
        Card.createJoker(JokerType.Big, 0),
        Card.createJoker(JokerType.Big, 1),
        Card.createCard(Suit.Hearts, Rank.Ace, 0), // Trump single
        Card.createCard(Suit.Hearts, Rank.King, 0), // Trump single
        Card.createCard(Suit.Spades, Rank.Queen, 0) // Non-trump
      ];
      const gameState = createGameState({
        trumpInfo,
        currentTrick: {
          plays: [{ playerId: PlayerId.Human, cards: leadingCombo }],
          winningPlayerId: PlayerId.Human,
          points: 0,
        }
      });
      
      // Must use Big Joker pair, not trump singles
      expect(isValidPlay([playerHand[0], playerHand[1]], playerHand, PlayerId.Bot1, gameState)).toBe(true);
      expect(isValidPlay([playerHand[2], playerHand[3]], playerHand, PlayerId.Bot1, gameState)).toBe(false);
    });

    test('FRV-2.13: Must use trump rank pairs when leading trump pairs', () => {
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Hearts);
      
      // Leading with trump suit pair
      const leadingCombo = Card.createPair(Suit.Hearts, Rank.Five);
      
      // Player has trump rank pair (off-suit) + trump singles
      const playerHand = [
        Card.createCard(Suit.Spades, Rank.Two, 0), // Trump rank (off-suit)
        Card.createCard(Suit.Spades, Rank.Two, 1), // Trump rank (off-suit)
        Card.createCard(Suit.Hearts, Rank.Ace, 0), // Trump single
        Card.createCard(Suit.Hearts, Rank.King, 0), // Trump single
        Card.createCard(Suit.Clubs, Rank.Queen, 0) // Non-trump
      ];
      const gameState = createGameState({
        trumpInfo,
        currentTrick: {
          plays: [{ playerId: PlayerId.Human, cards: leadingCombo }],
          winningPlayerId: PlayerId.Human,
          points: 0,
        }
      });
      
      // Must use trump rank pair, not trump singles
      expect(isValidPlay([playerHand[0], playerHand[1]], playerHand, PlayerId.Bot1, gameState)).toBe(true);
      expect(isValidPlay([playerHand[2], playerHand[3]], playerHand, PlayerId.Bot1, gameState)).toBe(false);
    });

    test('FRV-2.14: Must use trump suit pairs when leading trump pairs', () => {
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Hearts);
      
      // Leading with trump suit pair
      const leadingCombo = Card.createPair(Suit.Hearts, Rank.Five);
      
      // Player has trump suit pair + trump singles
      const playerHand = [
        Card.createCard(Suit.Hearts, Rank.Ace, 0), // Trump suit pair
        Card.createCard(Suit.Hearts, Rank.Ace, 1), // Trump suit pair
        Card.createCard(Suit.Hearts, Rank.King, 0), // Trump single
        Card.createCard(Suit.Hearts, Rank.Queen, 0), // Trump single
        Card.createCard(Suit.Clubs, Rank.Jack, 0) // Non-trump
      ];
      const gameState = createGameState({
        trumpInfo,
        currentTrick: {
          plays: [{ playerId: PlayerId.Human, cards: leadingCombo }],
          winningPlayerId: PlayerId.Human,
          points: 0,
        }
      });
      
      // Must use trump suit pair, not trump singles
      expect(isValidPlay([playerHand[0], playerHand[1]], playerHand, PlayerId.Bot1, gameState)).toBe(true);
      expect(isValidPlay([playerHand[2], playerHand[3]], playerHand, PlayerId.Bot1, gameState)).toBe(false);
    });

    test('FRV-2.15: Cannot use non-trump when trump pairs available', () => {
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Hearts);
      
      // Leading with trump suit pair
      const leadingCombo = Card.createPair(Suit.Hearts, Rank.Five);
      
      // Player has trump pair + non-trump pair
      const playerHand = [
        Card.createCard(Suit.Hearts, Rank.Ace, 0), // Trump pair
        Card.createCard(Suit.Hearts, Rank.Ace, 1), // Trump pair
        Card.createCard(Suit.Spades, Rank.King, 0), // Non-trump pair
        Card.createCard(Suit.Spades, Rank.King, 1), // Non-trump pair
        Card.createCard(Suit.Clubs, Rank.Queen, 0) // Non-trump
      ];
      const gameState = createGameState({
        trumpInfo,
        currentTrick: {
          plays: [{ playerId: PlayerId.Human, cards: leadingCombo }],
          winningPlayerId: PlayerId.Human,
          points: 0,
        }
      });
      
      // Must use trump pair, cannot use non-trump pair
      expect(isValidPlay([playerHand[0], playerHand[1]], playerHand, PlayerId.Bot1, gameState)).toBe(true);
      expect(isValidPlay([playerHand[2], playerHand[3]], playerHand, PlayerId.Bot1, gameState)).toBe(false);
    });

    test('FRV-2.16: Trump singles valid when no trump pairs', () => {
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Hearts);
      
      // Leading with trump suit pair
      const leadingCombo = Card.createPair(Suit.Hearts, Rank.Five);
      
      // Player has only trump singles (no trump pairs)
      const playerHand = [
        Card.createJoker(JokerType.Big, 0), // Trump single (only 1 Big Joker)
        Card.createCard(Suit.Hearts, Rank.Ace, 0), // Trump single
        Card.createCard(Suit.Spades, Rank.Two, 0), // Trump rank single
        Card.createCard(Suit.Clubs, Rank.King, 0) // Non-trump
      ];
      const gameState = createGameState({
        trumpInfo,
        currentTrick: {
          plays: [{ playerId: PlayerId.Human, cards: leadingCombo }],
          winningPlayerId: PlayerId.Human,
          points: 0,
        }
      });
      
      // Trump singles valid when no trump pairs
      expect(isValidPlay([playerHand[0], playerHand[1]], playerHand, PlayerId.Bot1, gameState)).toBe(true);
    });

    test('FRV-2.17: Cannot use non-trump singles when trump singles available', () => {
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Hearts);
      
      // Leading with trump suit pair
      const leadingCombo = Card.createPair(Suit.Hearts, Rank.Five);
      
      // Player has trump singles + non-trump singles (no trump pairs)
      const playerHand = [
        Card.createJoker(JokerType.Big, 0), // Trump single
        Card.createCard(Suit.Hearts, Rank.Ace, 0), // Trump single
        Card.createCard(Suit.Spades, Rank.King, 0), // Non-trump single
        Card.createCard(Suit.Clubs, Rank.Queen, 0) // Non-trump single
      ];
      const gameState = createGameState({
        trumpInfo,
        currentTrick: {
          plays: [{ playerId: PlayerId.Human, cards: leadingCombo }],
          winningPlayerId: PlayerId.Human,
          points: 0,
        }
      });
      
      // Must use trump singles, cannot use non-trump singles
      expect(isValidPlay([playerHand[0], playerHand[1]], playerHand, PlayerId.Bot1, gameState)).toBe(true);
      expect(isValidPlay([playerHand[2], playerHand[3]], playerHand, PlayerId.Bot1, gameState)).toBe(false);
    });

    test('FRV-2.18: Non-trump singles valid when no trump cards left', () => {
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Hearts);
      
      // Leading with trump suit pair
      const leadingCombo = Card.createPair(Suit.Hearts, Rank.Five);
      
      // Player has NO trump cards at all
      const playerHand = [
        Card.createCard(Suit.Spades, Rank.King, 0), // Non-trump
        Card.createCard(Suit.Clubs, Rank.Queen, 0), // Non-trump
        Card.createCard(Suit.Diamonds, Rank.Jack, 0), // Non-trump
        Card.createCard(Suit.Spades, Rank.Ten, 0) // Non-trump
      ];
      const gameState = createGameState({
        trumpInfo,
        currentTrick: {
          plays: [{ playerId: PlayerId.Human, cards: leadingCombo }],
          winningPlayerId: PlayerId.Human,
          points: 0,
        }
      });
      
      // Non-trump singles valid when no trump cards available
      expect(isValidPlay([playerHand[0], playerHand[1]], playerHand, PlayerId.Bot1, gameState)).toBe(true);
    });

    test('FRV-2.19: Mixed trump types - joker hierarchy', () => {
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Hearts);
      
      // Leading with trump suit pair
      const leadingCombo = Card.createPair(Suit.Hearts, Rank.Five);
      
      // Player has Small Joker pair + Big Joker single + trump suit singles
      const playerHand = [
        Card.createJoker(JokerType.Small, 0), // Small Joker pair
        Card.createJoker(JokerType.Small, 1), // Small Joker pair
        Card.createJoker(JokerType.Big, 0), // Big Joker single
        Card.createCard(Suit.Hearts, Rank.Ace, 0), // Trump suit single
        Card.createCard(Suit.Spades, Rank.King, 0) // Non-trump
      ];
      const gameState = createGameState({
        trumpInfo,
        currentTrick: {
          plays: [{ playerId: PlayerId.Human, cards: leadingCombo }],
          winningPlayerId: PlayerId.Human,
          points: 0,
        }
      });
      
      // Must use Small Joker pair (available trump pair)
      expect(isValidPlay([playerHand[0], playerHand[1]], playerHand, PlayerId.Bot1, gameState)).toBe(true);
      // Cannot mix Big Joker single with trump suit single when trump pair available
      expect(isValidPlay([playerHand[2], playerHand[3]], playerHand, PlayerId.Bot1, gameState)).toBe(false);
    });

    test('FRV-2.20: Mixed trump singles when no trump pairs', () => {
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Hearts);
      
      // Leading with trump suit pair
      const leadingCombo = Card.createPair(Suit.Hearts, Rank.Five);
      
      // Player has mixed trump singles (no trump pairs)
      const playerHand = [
        Card.createJoker(JokerType.Big, 0), // Big Joker single
        Card.createJoker(JokerType.Small, 0), // Small Joker single
        Card.createCard(Suit.Spades, Rank.Two, 0), // Trump rank (off-suit) single
        Card.createCard(Suit.Hearts, Rank.Ace, 0), // Trump suit single
        Card.createCard(Suit.Clubs, Rank.King, 0) // Non-trump
      ];
      const gameState = createGameState({
        trumpInfo,
        currentTrick: {
          plays: [{ playerId: PlayerId.Human, cards: leadingCombo }],
          winningPlayerId: PlayerId.Human,
          points: 0,
        }
      });
      
      // Can use any trump singles combination when no trump pairs
      expect(isValidPlay([playerHand[0], playerHand[1]], playerHand, PlayerId.Bot1, gameState)).toBe(true);
      expect(isValidPlay([playerHand[0], playerHand[2]], playerHand, PlayerId.Bot1, gameState)).toBe(true);
      expect(isValidPlay([playerHand[1], playerHand[3]], playerHand, PlayerId.Bot1, gameState)).toBe(true);
      // Cannot use non-trump when trump available
      expect(isValidPlay([playerHand[0], playerHand[4]], playerHand, PlayerId.Bot1, gameState)).toBe(false);
    });
  });
});