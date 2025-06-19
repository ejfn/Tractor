import { evaluateTrickPlay } from "../../src/game/cardComparison";
import { isValidPlay } from "../../src/game/playValidation";
import { Card, JokerType, PlayerId, Rank, Suit, TrumpInfo } from "../../src/types";
import { initializeGame } from "../../src/utils/gameInitialization";

/**
 * Multi-Combo Following Rules Test Suite
 * 
 * Tests comprehensive multi-combo following scenarios including:
 * 1. Same-suit structure matching (teammate vs opponent strategy)
 * 2. Trump beating non-trump multi-combos when void
 * 3. Multi-layer trump vs trump comparison
 * 4. Edge cases and invalid attempts
 */

describe("Multi-Combo Following Rules", () => {
  let trumpInfo: TrumpInfo;
  
  beforeEach(() => {
    trumpInfo = { trumpRank: Rank.Two, trumpSuit: Suit.Hearts };
  });

  describe("Same-Suit Structure Matching", () => {
    test("MCF-1: Must match exact structure and length", () => {
      const gameState = initializeGame();
      gameState.trumpInfo = trumpInfo;
      
      // Set up leading multi-combo: K♠K♠ + Q♠ + 8♠ (pair + singles, 4 cards)
      gameState.currentTrick = {
        plays: [{
          playerId: PlayerId.Human,
          cards: [
            Card.createCard(Suit.Spades, Rank.King, 0),
            Card.createCard(Suit.Spades, Rank.King, 1),
            Card.createCard(Suit.Spades, Rank.Queen, 0),
            Card.createCard(Suit.Spades, Rank.Eight, 0),
          ]
        }],
        winningPlayerId: PlayerId.Human,
        points: 10,
        isFinalTrick: false
      };
      
      const playerHand = [
        Card.createCard(Suit.Spades, Rank.Seven, 0),
        Card.createCard(Suit.Spades, Rank.Seven, 1),
        Card.createCard(Suit.Spades, Rank.Six, 0),
        Card.createCard(Suit.Spades, Rank.Five, 0),
        Card.createCard(Suit.Clubs, Rank.Ace, 0),
      ];
      
      // Valid: Same structure (pair + singles, 4 cards)
      const validResponse = [
        Card.createCard(Suit.Spades, Rank.Seven, 0),
        Card.createCard(Suit.Spades, Rank.Seven, 1),
        Card.createCard(Suit.Spades, Rank.Six, 0),
        Card.createCard(Suit.Spades, Rank.Five, 0),
      ];
      
      expect(isValidPlay(validResponse, playerHand, PlayerId.Bot1, gameState)).toBe(true);
      
      // Invalid: Wrong length
      const wrongLength = [
        Card.createCard(Suit.Spades, Rank.Seven, 0),
        Card.createCard(Suit.Spades, Rank.Seven, 1),
        Card.createCard(Suit.Spades, Rank.Six, 0),
      ];
      
      expect(isValidPlay(wrongLength, playerHand, PlayerId.Bot1, gameState)).toBe(false);
      
      // Invalid: Wrong structure (4 singles instead of pair + singles)
      const wrongStructure = [
        Card.createCard(Suit.Spades, Rank.Seven, 0),
        Card.createCard(Suit.Spades, Rank.Six, 0),
        Card.createCard(Suit.Spades, Rank.Five, 0),
        Card.createCard(Suit.Clubs, Rank.Ace, 0),
      ];
      
      expect(isValidPlay(wrongStructure, playerHand, PlayerId.Bot1, gameState)).toBe(false);
    });

    test("MCF-1B: Non-trump tractor in multi-combo must be followed with tractor", () => {
      const gameState = initializeGame();
      gameState.trumpInfo = trumpInfo;
      
      // Leading non-trump multi-combo: A♠A♠-K♠K♠ + Q♠ (1 tractor + 1 single = 5 cards)
      gameState.currentTrick = {
        plays: [{
          playerId: PlayerId.Human,
          cards: [
            Card.createCard(Suit.Spades, Rank.Ace, 0),
            Card.createCard(Suit.Spades, Rank.Ace, 1),
            Card.createCard(Suit.Spades, Rank.King, 0),
            Card.createCard(Suit.Spades, Rank.King, 1),
            Card.createCard(Suit.Spades, Rank.Queen, 0),
          ]
        }],
        winningPlayerId: PlayerId.Human,
        points: 30, // A+A+K+K = 30 points
        isFinalTrick: false
      };
      
      const playerHand = [
        Card.createCard(Suit.Spades, Rank.Jack, 0),
        Card.createCard(Suit.Spades, Rank.Jack, 1),
        Card.createCard(Suit.Spades, Rank.Ten, 0),
        Card.createCard(Suit.Spades, Rank.Ten, 1),
        Card.createCard(Suit.Spades, Rank.Nine, 0),
        Card.createCard(Suit.Spades, Rank.Eight, 0),
        Card.createCard(Suit.Clubs, Rank.Ace, 0),
      ];
      
      // Valid: Matching structure (1 tractor + 1 single = 5 cards)
      const validTractorResponse = [
        Card.createCard(Suit.Spades, Rank.Jack, 0),
        Card.createCard(Suit.Spades, Rank.Jack, 1),
        Card.createCard(Suit.Spades, Rank.Ten, 0),
        Card.createCard(Suit.Spades, Rank.Ten, 1),
        Card.createCard(Suit.Spades, Rank.Nine, 0),
      ];
      
      expect(isValidPlay(validTractorResponse, playerHand, PlayerId.Bot1, gameState)).toBe(true);
      
      // Invalid: Wrong structure (2 pairs + 1 single instead of 1 tractor + 1 single)
      // Use non-consecutive pairs to ensure it's not a tractor
      const wrongStructurePairs = [
        Card.createCard(Suit.Spades, Rank.Jack, 0),
        Card.createCard(Suit.Spades, Rank.Jack, 1),
        Card.createCard(Suit.Spades, Rank.Nine, 0),
        Card.createCard(Suit.Spades, Rank.Nine, 1),
        Card.createCard(Suit.Spades, Rank.Eight, 0),
      ];
      
      expect(isValidPlay(wrongStructurePairs, playerHand, PlayerId.Bot1, gameState)).toBe(false);
      
      // Invalid: Wrong structure (5 singles instead of 1 tractor + 1 single)  
      const wrongStructureSingles = [
        Card.createCard(Suit.Spades, Rank.Jack, 0),
        Card.createCard(Suit.Spades, Rank.Ten, 0),
        Card.createCard(Suit.Spades, Rank.Nine, 0),
        Card.createCard(Suit.Spades, Rank.Eight, 0),
        Card.createCard(Suit.Clubs, Rank.Ace, 0),
      ];
      
      expect(isValidPlay(wrongStructureSingles, playerHand, PlayerId.Bot1, gameState)).toBe(false);
    });
  });

  describe("Trump Beating Non-Trump Multi-Combos", () => {
    test("MCF-2: Trump can beat non-trump multi-combo when void in led suit", () => {
      const gameState = initializeGame();
      gameState.trumpInfo = trumpInfo;
      
      // Leading non-trump multi-combo: K♠K♠ + Q♠ + 8♠
      gameState.currentTrick = {
        plays: [{
          playerId: PlayerId.Human, 
          cards: [
            Card.createCard(Suit.Spades, Rank.King, 0),
            Card.createCard(Suit.Spades, Rank.King, 1),
            Card.createCard(Suit.Spades, Rank.Queen, 0),
            Card.createCard(Suit.Spades, Rank.Eight, 0),
          ]
        }],
        winningPlayerId: PlayerId.Human,
        points: 10,
        isFinalTrick: false
      };
      
      // Bot hand: Void in Spades, has trump cards
      const playerHand = [
        Card.createCard(Suit.Hearts, Rank.Three, 0),
        Card.createCard(Suit.Hearts, Rank.Three, 1),
        Card.createCard(Suit.Hearts, Rank.Four, 0),
        Card.createCard(Suit.Hearts, Rank.Five, 0),
        Card.createCard(Suit.Clubs, Rank.Ace, 0),
      ];
      
      // Valid: Trump response with matching structure
      const trumpResponse = [
        Card.createCard(Suit.Hearts, Rank.Three, 0),
        Card.createCard(Suit.Hearts, Rank.Three, 1),
        Card.createCard(Suit.Hearts, Rank.Four, 0),
        Card.createCard(Suit.Hearts, Rank.Five, 0),
      ];
      
      // 1. Should be valid play
      expect(isValidPlay(trumpResponse, playerHand, PlayerId.Bot1, gameState)).toBe(true);
      
      // 2. Should actually beat the non-trump multi-combo
      const result = evaluateTrickPlay(
        trumpResponse,
        gameState.currentTrick!,
        trumpInfo,
        playerHand
      );
      
      expect(result.canBeat).toBe(true); // Trump should beat non-trump
      expect(result.isLegal).toBe(true);
    });

    test("MCF-3: Trump response must still match structure", () => {
      const gameState = initializeGame();
      gameState.trumpInfo = trumpInfo;
      
      // Leading: Multi-combo K♠K♠ + Q♠Q♠ + J♠ + 9♠9♠ (1 tractor + 1 pair + 1 single = 7 cards)
      const kingPair = Card.createPair(Suit.Spades, Rank.King);
      const queenPair = Card.createPair(Suit.Spades, Rank.Queen);
      const ninePair = Card.createPair(Suit.Spades, Rank.Nine);
      
      gameState.currentTrick = {
        plays: [{
          playerId: PlayerId.Human,
          cards: [
            ...kingPair,      // K♠K♠
            ...queenPair,     // Q♠Q♠
            Card.createCard(Suit.Spades, Rank.Jack, 0),  // J♠
            ...ninePair,      // 9♠9♠
          ]
        }],
        winningPlayerId: PlayerId.Human,
        points: 0,
        isFinalTrick: false
      };
      
      const threePair = Card.createPair(Suit.Hearts, Rank.Three);
      const fourPair = Card.createPair(Suit.Hearts, Rank.Four);
      const fivePair = Card.createPair(Suit.Hearts, Rank.Five);
      const sevenPair = Card.createPair(Suit.Hearts, Rank.Seven);
      
      const playerHand = [
        ...threePair,     // 3♥3♥
        ...fourPair,      // 4♥4♥ 
        ...fivePair,      // 5♥5♥
        Card.createCard(Suit.Hearts, Rank.Six, 0),    // 6♥
        ...sevenPair,     // 7♥7♥
        Card.createCard(Suit.Hearts, Rank.Eight, 0),  // 8♥
      ];
      
      // Valid: Trump multi-combo matching structure (1 tractor + 1 pair + 1 single = 7 cards)
      const validTrumpMultiCombo = [
        ...threePair,     // Tractor: 3♥3♥-4♥4♥
        ...fourPair,
        ...fivePair,      // Pair: 5♥5♥
        Card.createCard(Suit.Hearts, Rank.Eight, 0), // Single: 8♥
      ];
      
      expect(isValidPlay(validTrumpMultiCombo, playerHand, PlayerId.Bot1, gameState)).toBe(true);
      
      // Invalid: Wrong structure (3 pairs + 1 single instead of 1 tractor + 1 pair + 1 single)
      // Use non-consecutive pairs to ensure no tractor formation
      const wrongTrumpStructure = [
        ...threePair,     // 3♥3♥ (pair)
        ...fivePair,      // 5♥5♥ (pair) - skipping 4♥ to avoid tractor
        ...sevenPair,     // 7♥7♥ (pair)
        Card.createCard(Suit.Hearts, Rank.Eight, 0),  // 8♥ (single)
      ];
      
      expect(isValidPlay(wrongTrumpStructure, playerHand, PlayerId.Bot1, gameState)).toBe(false);
    });
  });

  describe("Multi-Layer Trump vs Trump Comparison", () => {
    test("MCF-4: Later trump player can beat earlier trump response", () => {
      const gameState = initializeGame();
      gameState.trumpInfo = trumpInfo;
      
      // Leading non-trump multi-combo + first trump response
      gameState.currentTrick = {
        plays: [
          {
            playerId: PlayerId.Human,
            cards: [
              Card.createCard(Suit.Spades, Rank.King, 0),
              Card.createCard(Suit.Spades, Rank.King, 1),
              Card.createCard(Suit.Spades, Rank.Queen, 0),
              Card.createCard(Suit.Spades, Rank.Eight, 0),
            ]
          },
          {
            playerId: PlayerId.Bot1,
            cards: [
              Card.createCard(Suit.Hearts, Rank.Three, 0),
              Card.createCard(Suit.Hearts, Rank.Three, 1),
              Card.createCard(Suit.Hearts, Rank.Four, 0),
              Card.createCard(Suit.Hearts, Rank.Five, 0),
            ]
          }
        ],
        winningPlayerId: PlayerId.Bot1,
        points: 10,
        isFinalTrick: false
      };
      
      // Bot2 hand: Higher trump cards
      const playerHand = [
        Card.createCard(Suit.Hearts, Rank.Ace, 0),
        Card.createCard(Suit.Hearts, Rank.Ace, 1),
        Card.createCard(Suit.Hearts, Rank.King, 0),
        Card.createCard(Suit.Hearts, Rank.Queen, 0),
        Card.createCard(Suit.Clubs, Rank.Seven, 0),
      ];
      
      // Higher trump response (A♥A♥ beats 3♥3♥)
      const higherTrumpResponse = [
        Card.createCard(Suit.Hearts, Rank.Ace, 0),
        Card.createCard(Suit.Hearts, Rank.Ace, 1),
        Card.createCard(Suit.Hearts, Rank.King, 0),
        Card.createCard(Suit.Hearts, Rank.Queen, 0),
      ];
      
      // 1. Should be valid play
      expect(isValidPlay(higherTrumpResponse, playerHand, PlayerId.Bot2, gameState)).toBe(true);
      
      // 2. Should actually beat the previous trump response
      const result = evaluateTrickPlay(
        higherTrumpResponse,
        gameState.currentTrick!,
        trumpInfo,
        playerHand
      );
      
      expect(result.canBeat).toBe(true); // A♥A♥+K♥+Q♥ should beat 3♥3♥+4♥+5♥
      expect(result.isLegal).toBe(true);
    });

    test("MCF-5: Joker pairs beat trump suit pairs", () => {
      const gameState = initializeGame();
      gameState.trumpInfo = trumpInfo;
      
      // Multi-combo trick with trump suit pair response
      gameState.currentTrick = {
        plays: [
          {
            playerId: PlayerId.Human,
            cards: [
              Card.createCard(Suit.Spades, Rank.King, 0),
              Card.createCard(Suit.Spades, Rank.King, 1),
              Card.createCard(Suit.Spades, Rank.Queen, 0),
              Card.createCard(Suit.Spades, Rank.Eight, 0),
            ]
          },
          {
            playerId: PlayerId.Bot1,
            cards: [
              Card.createCard(Suit.Hearts, Rank.Ace, 0),
              Card.createCard(Suit.Hearts, Rank.Ace, 1),
              Card.createCard(Suit.Hearts, Rank.King, 0),
              Card.createCard(Suit.Hearts, Rank.Queen, 0),
            ]
          }
        ],
        winningPlayerId: PlayerId.Bot1,
        points: 10,
        isFinalTrick: false
      };
      
      // Bot2 hand: Jokers
      const playerHand = [
        Card.createJoker(JokerType.Big, 0),
        Card.createJoker(JokerType.Big, 1),
        Card.createJoker(JokerType.Small, 0),
        Card.createCard(Suit.Hearts, Rank.Seven, 0),
        Card.createCard(Suit.Clubs, Rank.Seven, 0),
      ];
      
      // Big Joker pair response
      const jokerResponse = [
        Card.createJoker(JokerType.Big, 0),
        Card.createJoker(JokerType.Big, 1),
        Card.createJoker(JokerType.Small, 0),
        Card.createCard(Suit.Hearts, Rank.Seven, 0),
      ];
      
      // 1. Should be valid play
      expect(isValidPlay(jokerResponse, playerHand, PlayerId.Bot2, gameState)).toBe(true);
      
      // 2. Should actually beat the previous trump response
      const result = evaluateTrickPlay(
        jokerResponse,
        gameState.currentTrick!,
        trumpInfo,
        playerHand
      );
      
      expect(result.canBeat).toBe(true); // Big Joker pair should beat A♥A♥ pair
      expect(result.isLegal).toBe(true);
    });

    test("MCF-6: Trump rank pairs beat trump suit pairs", () => {
      const gameState = initializeGame();
      gameState.trumpInfo = trumpInfo;
      
      // Previous trump suit response
      gameState.currentTrick = {
        plays: [
          {
            playerId: PlayerId.Human,
            cards: [
              Card.createCard(Suit.Spades, Rank.King, 0),
              Card.createCard(Suit.Spades, Rank.King, 1),
              Card.createCard(Suit.Spades, Rank.Queen, 0),
            ]
          },
          {
            playerId: PlayerId.Bot1,
            cards: [
              Card.createCard(Suit.Hearts, Rank.Ace, 0),
              Card.createCard(Suit.Hearts, Rank.Ace, 1),
              Card.createCard(Suit.Hearts, Rank.King, 0),
            ]
          }
        ],
        winningPlayerId: PlayerId.Bot1,
        points: 0,
        isFinalTrick: false
      };
      
      // Bot2 hand: Trump rank cards from same off-suit + joker
      const trumpRankPair = Card.createPair(Suit.Clubs, Rank.Two); // Valid trump rank pair from same suit
      const playerHand = [
        ...trumpRankPair,                           // 2♣2♣ - Valid trump rank pair
        Card.createJoker(JokerType.Small, 0),       // Small joker
        Card.createCard(Suit.Hearts, Rank.Seven, 0),
        Card.createCard(Suit.Diamonds, Rank.Three, 0),
      ];
      
      // Trump rank pair response (valid same-suit trump rank pair)
      const trumpRankResponse = [
        ...trumpRankPair,                           // 2♣2♣ - Valid trump rank pair beats A♥A♥
        Card.createJoker(JokerType.Small, 0),       // Small joker for structure match
      ];
      
      // 1. Should be valid play
      expect(isValidPlay(trumpRankResponse, playerHand, PlayerId.Bot2, gameState)).toBe(true);
      
      // 2. Should actually beat the previous trump response
      const result = evaluateTrickPlay(
        trumpRankResponse,
        gameState.currentTrick!,
        trumpInfo,
        playerHand
      );
      
      expect(result.canBeat).toBe(true); // Trump rank pair should beat trump suit pair
      expect(result.isLegal).toBe(true);
    });
  });

  describe("Edge Cases and Invalid Attempts", () => {
    test("MCF-7: Cannot respond with non-matching structure when have matching cards", () => {
      const gameState = initializeGame();
      gameState.trumpInfo = trumpInfo;
      
      // Leading pair + single
      gameState.currentTrick = {
        plays: [{
          playerId: PlayerId.Human,
          cards: [
            Card.createCard(Suit.Spades, Rank.King, 0),
            Card.createCard(Suit.Spades, Rank.King, 1),
            Card.createCard(Suit.Spades, Rank.Queen, 0),
          ]
        }],
        winningPlayerId: PlayerId.Human, 
        points: 10,
        isFinalTrick: false
      };
      
      // Player has enough cards to match structure
      const playerHand = [
        Card.createCard(Suit.Spades, Rank.Jack, 0),
        Card.createCard(Suit.Spades, Rank.Jack, 1),
        Card.createCard(Suit.Spades, Rank.Ten, 0),
        Card.createCard(Suit.Spades, Rank.Nine, 0),
      ];
      
      // Invalid: Has pair but plays 3 singles instead
      const invalidResponse = [
        Card.createCard(Suit.Spades, Rank.Jack, 0),
        Card.createCard(Suit.Spades, Rank.Ten, 0),
        Card.createCard(Suit.Spades, Rank.Nine, 0),
      ];
      
      expect(isValidPlay(invalidResponse, playerHand, PlayerId.Bot1, gameState)).toBe(false);
      
      // Valid: Uses available pair
      const validResponse = [
        Card.createCard(Suit.Spades, Rank.Jack, 0),
        Card.createCard(Suit.Spades, Rank.Jack, 1),
        Card.createCard(Suit.Spades, Rank.Ten, 0),
      ];
      
      expect(isValidPlay(validResponse, playerHand, PlayerId.Bot1, gameState)).toBe(true);
    });

    test("MCF-8: Mixed trump types valid in multi-combo structure", () => {
      const gameState = initializeGame();
      gameState.trumpInfo = trumpInfo;
      
      // Leading multi-combo: pair + singles (3 cards)
      gameState.currentTrick = {
        plays: [{
          playerId: PlayerId.Human,
          cards: [
            Card.createCard(Suit.Spades, Rank.King, 0),
            Card.createCard(Suit.Spades, Rank.King, 1),
            Card.createCard(Suit.Spades, Rank.Queen, 0),
          ]
        }],
        winningPlayerId: PlayerId.Human,
        points: 0,
        isFinalTrick: false
      };
      
      // Player has mixed trump types (void in spades)
      const trumpRankPair = Card.createPair(Suit.Clubs, Rank.Two); // Valid trump rank pair from same suit
      const playerHand = [
        Card.createCard(Suit.Hearts, Rank.Ace, 0),    // Trump suit card
        Card.createCard(Suit.Hearts, Rank.King, 0),   // Trump suit card  
        ...trumpRankPair,                             // 2♣2♣ - Valid trump rank pair
        Card.createCard(Suit.Diamonds, Rank.Seven, 0), // Other suit
      ];
      
      // Valid: Mixed trump response with trump pair + single (matching structure)
      const mixedTrumpResponse = [
        ...trumpRankPair,                             // 2♣2♣ - Valid trump rank pair
        Card.createCard(Suit.Hearts, Rank.Ace, 0),   // Trump suit card (single)
      ];
      
      expect(isValidPlay(mixedTrumpResponse, playerHand, PlayerId.Bot1, gameState)).toBe(true);
    });
  });
});