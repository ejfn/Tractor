import { isValidPlay } from "../../src/game/playValidation";
import { Card, ComboType, GamePhase, GameState, JokerType, Player, PlayerId, PlayerName, Rank, Suit, TeamId, TrumpInfo } from "../../src/types";

/**
 * FRV-1: Trump Group Unification Tests
 * 
 * Tests that ALL trump cards (jokers, trump rank, trump suit) are treated as 
 * unified group when following trump leads.
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

describe('FRV-1: Trump Group Unification Tests', () => {
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
    test('FRV-1.1: should allow tractor when player has matching tractor', () => {
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

    test('FRV-1.2: should require all pairs when insufficient for tractor - valid case', () => {
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
    });

    test('FRV-1.3: should require all pairs when insufficient for tractor - invalid case', () => {
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
      
      // Invalid: using cards from other suits when Spades available
      const invalidPlay = [
        ...Card.createPair(Suit.Spades, Rank.Nine),
        Card.createCard(Suit.Hearts, Rank.King, 0),
        Card.createCard(Suit.Spades, Rank.Ten, 0)
      ];
      
      const isInvalid = isValidPlay(invalidPlay, leadingTractor, playerHand, trumpInfo);
      expect(isInvalid).toBe(false);
    });

    test('FRV-1.4: should allow mixed suits when out of leading suit', () => {
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
    test('FRV-1.5: should recognize trump rank pairs as valid trump pairs', () => {
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

    test('FRV-1.6: should handle mixed trump combinations', () => {
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

    test('FRV-1.7: should handle joker pairs in trump combinations', () => {
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

    test('FRV-1.8: should prioritize trump pairs over non-trump pairs - valid case', () => {
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
    });

    test('FRV-1.9: should prioritize trump pairs over non-trump pairs - invalid case', () => {
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