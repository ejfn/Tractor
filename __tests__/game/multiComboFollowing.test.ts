import { evaluateTrickPlay } from "../../src/game/cardComparison";
import { isValidPlay } from "../../src/game/playValidation";
import {
  Card,
  JokerType,
  PlayerId,
  Rank,
  Suit,
  TrumpInfo,
} from "../../src/types";
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
        plays: [
          {
            playerId: PlayerId.Human,
            cards: [
              Card.createCard(Suit.Spades, Rank.King, 0),
              Card.createCard(Suit.Spades, Rank.King, 1),
              Card.createCard(Suit.Spades, Rank.Queen, 0),
              Card.createCard(Suit.Spades, Rank.Eight, 0),
            ],
          },
        ],
        winningPlayerId: PlayerId.Human,
        points: 10,
        isFinalTrick: false,
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

      expect(
        isValidPlay(validResponse, playerHand, PlayerId.Bot1, gameState),
      ).toBe(true);

      // Invalid: Wrong length
      const wrongLength = [
        Card.createCard(Suit.Spades, Rank.Seven, 0),
        Card.createCard(Suit.Spades, Rank.Seven, 1),
        Card.createCard(Suit.Spades, Rank.Six, 0),
      ];

      expect(
        isValidPlay(wrongLength, playerHand, PlayerId.Bot1, gameState),
      ).toBe(false);

      // Invalid: Wrong structure (4 singles instead of pair + singles)
      const wrongStructure = [
        Card.createCard(Suit.Spades, Rank.Seven, 0),
        Card.createCard(Suit.Spades, Rank.Six, 0),
        Card.createCard(Suit.Spades, Rank.Five, 0),
        Card.createCard(Suit.Clubs, Rank.Ace, 0),
      ];

      expect(
        isValidPlay(wrongStructure, playerHand, PlayerId.Bot1, gameState),
      ).toBe(false);
    });

    test("MCF-1B: Non-trump tractor in multi-combo must be followed with tractor", () => {
      const gameState = initializeGame();
      gameState.trumpInfo = trumpInfo;

      // Leading non-trump multi-combo: A♠A♠-K♠K♠ + Q♠ (1 tractor + 1 single = 5 cards)
      gameState.currentTrick = {
        plays: [
          {
            playerId: PlayerId.Human,
            cards: [
              Card.createCard(Suit.Spades, Rank.Ace, 0),
              Card.createCard(Suit.Spades, Rank.Ace, 1),
              Card.createCard(Suit.Spades, Rank.King, 0),
              Card.createCard(Suit.Spades, Rank.King, 1),
              Card.createCard(Suit.Spades, Rank.Queen, 0),
            ],
          },
        ],
        winningPlayerId: PlayerId.Human,
        points: 30, // A+A+K+K = 30 points
        isFinalTrick: false,
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

      expect(
        isValidPlay(validTractorResponse, playerHand, PlayerId.Bot1, gameState),
      ).toBe(true);

      // Invalid: Wrong structure (2 pairs + 1 single instead of 1 tractor + 1 single)
      // Use non-consecutive pairs to ensure it's not a tractor
      const wrongStructurePairs = [
        Card.createCard(Suit.Spades, Rank.Jack, 0),
        Card.createCard(Suit.Spades, Rank.Jack, 1),
        Card.createCard(Suit.Spades, Rank.Nine, 0),
        Card.createCard(Suit.Spades, Rank.Nine, 1),
        Card.createCard(Suit.Spades, Rank.Eight, 0),
      ];

      expect(
        isValidPlay(wrongStructurePairs, playerHand, PlayerId.Bot1, gameState),
      ).toBe(false);

      // Invalid: Wrong structure (5 singles instead of 1 tractor + 1 single)
      const wrongStructureSingles = [
        Card.createCard(Suit.Spades, Rank.Jack, 0),
        Card.createCard(Suit.Spades, Rank.Ten, 0),
        Card.createCard(Suit.Spades, Rank.Nine, 0),
        Card.createCard(Suit.Spades, Rank.Eight, 0),
        Card.createCard(Suit.Clubs, Rank.Ace, 0),
      ];

      expect(
        isValidPlay(
          wrongStructureSingles,
          playerHand,
          PlayerId.Bot1,
          gameState,
        ),
      ).toBe(false);
    });
  });

  describe("Trump Beating Non-Trump Multi-Combos", () => {
    test("MCF-2: Trump can beat non-trump multi-combo when void in led suit", () => {
      const gameState = initializeGame();
      gameState.trumpInfo = trumpInfo;

      // Leading non-trump multi-combo: K♠K♠ + Q♠ + 8♠
      gameState.currentTrick = {
        plays: [
          {
            playerId: PlayerId.Human,
            cards: [
              Card.createCard(Suit.Spades, Rank.King, 0),
              Card.createCard(Suit.Spades, Rank.King, 1),
              Card.createCard(Suit.Spades, Rank.Queen, 0),
              Card.createCard(Suit.Spades, Rank.Eight, 0),
            ],
          },
        ],
        winningPlayerId: PlayerId.Human,
        points: 10,
        isFinalTrick: false,
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
      expect(
        isValidPlay(trumpResponse, playerHand, PlayerId.Bot1, gameState),
      ).toBe(true);

      // 2. Should actually beat the non-trump multi-combo
      if (!gameState.currentTrick) throw new Error("Current trick not found");
      const result = evaluateTrickPlay(
        trumpResponse,
        gameState.currentTrick,
        trumpInfo,
        playerHand,
      );

      expect(result.canBeat).toBe(true); // Trump should beat non-trump
      expect(result.isLegal).toBe(true);
    });

    test("MCF-3: Trump response valid when void due to exhaustion rule", () => {
      const gameState = initializeGame();
      gameState.trumpInfo = trumpInfo;

      // Leading: Multi-combo K♠K♠ + Q♠Q♠ + J♠ + 9♠9♠ (1 tractor + 1 pair + 1 single = 7 cards)
      const kingPair = Card.createPair(Suit.Spades, Rank.King);
      const queenPair = Card.createPair(Suit.Spades, Rank.Queen);
      const ninePair = Card.createPair(Suit.Spades, Rank.Nine);

      gameState.currentTrick = {
        plays: [
          {
            playerId: PlayerId.Human,
            cards: [
              ...kingPair, // K♠K♠
              ...queenPair, // Q♠Q♠
              Card.createCard(Suit.Spades, Rank.Jack, 0), // J♠
              ...ninePair, // 9♠9♠
            ],
          },
        ],
        winningPlayerId: PlayerId.Human,
        points: 0,
        isFinalTrick: false,
      };

      const threePair = Card.createPair(Suit.Hearts, Rank.Three);
      const fourPair = Card.createPair(Suit.Hearts, Rank.Four);
      const fivePair = Card.createPair(Suit.Hearts, Rank.Five);
      const sevenPair = Card.createPair(Suit.Hearts, Rank.Seven);

      const playerHand = [
        ...threePair, // 3♥3♥
        ...fourPair, // 4♥4♥
        ...fivePair, // 5♥5♥
        Card.createCard(Suit.Hearts, Rank.Six, 0), // 6♥
        ...sevenPair, // 7♥7♥
        Card.createCard(Suit.Hearts, Rank.Eight, 0), // 8♥
      ];

      // Valid: Trump multi-combo matching structure (1 tractor + 1 pair + 1 single = 7 cards)
      const validTrumpMultiCombo = [
        ...threePair, // Tractor: 3♥3♥-4♥4♥
        ...fourPair,
        ...fivePair, // Pair: 5♥5♥
        Card.createCard(Suit.Hearts, Rank.Eight, 0), // Single: 8♥
      ];

      expect(
        isValidPlay(validTrumpMultiCombo, playerHand, PlayerId.Bot1, gameState),
      ).toBe(true);

      // Valid: Player is void in Spades (led suit) and can play any trump cards of matching length
      // Even though structure is different (3 pairs + 1 single vs 1 tractor + 1 pair + 1 single),
      // exhaustion rule allows any combination when void in led suit
      const validExhaustionResponse = [
        ...threePair, // 3♥3♥ (pair)
        ...fivePair, // 5♥5♥ (pair) - skipping 4♥ to avoid tractor
        ...sevenPair, // 7♥7♥ (pair)
        Card.createCard(Suit.Hearts, Rank.Eight, 0), // 8♥ (single)
      ];

      expect(
        isValidPlay(
          validExhaustionResponse,
          playerHand,
          PlayerId.Bot1,
          gameState,
        ),
      ).toBe(true);
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
            ],
          },
          {
            playerId: PlayerId.Bot1,
            cards: [
              Card.createCard(Suit.Hearts, Rank.Three, 0),
              Card.createCard(Suit.Hearts, Rank.Three, 1),
              Card.createCard(Suit.Hearts, Rank.Four, 0),
              Card.createCard(Suit.Hearts, Rank.Five, 0),
            ],
          },
        ],
        winningPlayerId: PlayerId.Bot1,
        points: 10,
        isFinalTrick: false,
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
      expect(
        isValidPlay(higherTrumpResponse, playerHand, PlayerId.Bot2, gameState),
      ).toBe(true);

      // 2. Should actually beat the previous trump response
      if (!gameState.currentTrick) throw new Error("Current trick not found");
      const result = evaluateTrickPlay(
        higherTrumpResponse,
        gameState.currentTrick,
        trumpInfo,
        playerHand,
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
            ],
          },
          {
            playerId: PlayerId.Bot1,
            cards: [
              Card.createCard(Suit.Hearts, Rank.Ace, 0),
              Card.createCard(Suit.Hearts, Rank.Ace, 1),
              Card.createCard(Suit.Hearts, Rank.King, 0),
              Card.createCard(Suit.Hearts, Rank.Queen, 0),
            ],
          },
        ],
        winningPlayerId: PlayerId.Bot1,
        points: 10,
        isFinalTrick: false,
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
      expect(
        isValidPlay(jokerResponse, playerHand, PlayerId.Bot2, gameState),
      ).toBe(true);

      // 2. Should actually beat the previous trump response
      const result = evaluateTrickPlay(
        jokerResponse,
        gameState.currentTrick,
        trumpInfo,
        playerHand,
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
            ],
          },
          {
            playerId: PlayerId.Bot1,
            cards: [
              Card.createCard(Suit.Hearts, Rank.Ace, 0),
              Card.createCard(Suit.Hearts, Rank.Ace, 1),
              Card.createCard(Suit.Hearts, Rank.King, 0),
            ],
          },
        ],
        winningPlayerId: PlayerId.Bot1,
        points: 0,
        isFinalTrick: false,
      };

      // Bot2 hand: Trump rank cards from same off-suit + joker
      const trumpRankPair = Card.createPair(Suit.Clubs, Rank.Two); // Valid trump rank pair from same suit
      const playerHand = [
        ...trumpRankPair, // 2♣2♣ - Valid trump rank pair
        Card.createJoker(JokerType.Small, 0), // Small joker
        Card.createCard(Suit.Hearts, Rank.Seven, 0),
        Card.createCard(Suit.Diamonds, Rank.Three, 0),
      ];

      // Trump rank pair response (valid same-suit trump rank pair)
      const trumpRankResponse = [
        ...trumpRankPair, // 2♣2♣ - Valid trump rank pair beats A♥A♥
        Card.createJoker(JokerType.Small, 0), // Small joker for structure match
      ];

      // 1. Should be valid play
      expect(
        isValidPlay(trumpRankResponse, playerHand, PlayerId.Bot2, gameState),
      ).toBe(true);

      // 2. Should actually beat the previous trump response
      const result = evaluateTrickPlay(
        trumpRankResponse,
        gameState.currentTrick,
        trumpInfo,
        playerHand,
      );

      expect(result.canBeat).toBe(true); // Trump rank pair should beat trump suit pair
      expect(result.isLegal).toBe(true);
    });
  });

  describe("Mixed Combo-Types Edge Cases", () => {
    test("MCF-EC-1: Complex mixed combo-types (tractor + pair + singles)", () => {
      const gameState = initializeGame();
      gameState.trumpInfo = trumpInfo;

      // Leading: Complex mixed multi-combo: A♠A♠-K♠K♠ + Q♠Q♠ + J♠ + 10♠ + 9♠ (tractor + pair + singles, 8 cards)
      gameState.currentTrick = {
        plays: [
          {
            playerId: PlayerId.Human,
            cards: [
              Card.createCard(Suit.Spades, Rank.Ace, 0),
              Card.createCard(Suit.Spades, Rank.Ace, 1),
              Card.createCard(Suit.Spades, Rank.King, 0),
              Card.createCard(Suit.Spades, Rank.King, 1),
              Card.createCard(Suit.Spades, Rank.Queen, 0),
              Card.createCard(Suit.Spades, Rank.Queen, 1),
              Card.createCard(Suit.Spades, Rank.Jack, 0),
              Card.createCard(Suit.Spades, Rank.Ten, 0),
            ],
          },
        ],
        winningPlayerId: PlayerId.Human,
        points: 40, // A+A+K+K+Q+Q = 40 points
        isFinalTrick: false,
      };

      const playerHand = [
        Card.createCard(Suit.Spades, Rank.Nine, 0),
        Card.createCard(Suit.Spades, Rank.Nine, 1),
        Card.createCard(Suit.Spades, Rank.Eight, 0),
        Card.createCard(Suit.Spades, Rank.Eight, 1),
        Card.createCard(Suit.Spades, Rank.Seven, 0),
        Card.createCard(Suit.Spades, Rank.Seven, 1),
        Card.createCard(Suit.Spades, Rank.Six, 0),
        Card.createCard(Suit.Spades, Rank.Five, 0),
        Card.createCard(Suit.Clubs, Rank.Ace, 0),
      ];

      // Valid: Matching complex structure (tractor + pair + singles, 8 cards)
      const validComplexResponse = [
        Card.createCard(Suit.Spades, Rank.Nine, 0),
        Card.createCard(Suit.Spades, Rank.Nine, 1),
        Card.createCard(Suit.Spades, Rank.Eight, 0),
        Card.createCard(Suit.Spades, Rank.Eight, 1),
        Card.createCard(Suit.Spades, Rank.Seven, 0),
        Card.createCard(Suit.Spades, Rank.Seven, 1),
        Card.createCard(Suit.Spades, Rank.Six, 0),
        Card.createCard(Suit.Spades, Rank.Five, 0),
      ];

      expect(
        isValidPlay(validComplexResponse, playerHand, PlayerId.Bot1, gameState),
      ).toBe(true);

      // Invalid: Wrong structure (3 pairs + 2 singles instead of 1 tractor + 1 pair + 2 singles)
      const wrongComplexStructure = [
        Card.createCard(Suit.Spades, Rank.Nine, 0),
        Card.createCard(Suit.Spades, Rank.Nine, 1), // First pair (non-consecutive with third pair)
        Card.createCard(Suit.Spades, Rank.Eight, 0),
        Card.createCard(Suit.Spades, Rank.Eight, 1), // Second pair (consecutive with first)
        Card.createCard(Suit.Spades, Rank.Six, 0), // Third pair (non-consecutive, breaks tractor)
        Card.createCard(Suit.Spades, Rank.Six, 1), // This creates 3 separate pairs instead of tractor
        Card.createCard(Suit.Spades, Rank.Seven, 0), // Single
        Card.createCard(Suit.Spades, Rank.Five, 0), // Single
      ];

      expect(
        isValidPlay(
          wrongComplexStructure,
          playerHand,
          PlayerId.Bot1,
          gameState,
        ),
      ).toBe(false);
    });

    test("MCF-EC-2: Mixed trump combo-types beating non-trump", () => {
      const gameState = initializeGame();
      gameState.trumpInfo = trumpInfo;

      // Leading: Mixed non-trump combo: A♠A♠ + K♠ + Q♠ (pair + singles, 4 cards)
      gameState.currentTrick = {
        plays: [
          {
            playerId: PlayerId.Human,
            cards: [
              Card.createCard(Suit.Spades, Rank.Ace, 0),
              Card.createCard(Suit.Spades, Rank.Ace, 1),
              Card.createCard(Suit.Spades, Rank.King, 0),
              Card.createCard(Suit.Spades, Rank.Queen, 0),
            ],
          },
        ],
        winningPlayerId: PlayerId.Human,
        points: 30, // A+A+K = 30 points
        isFinalTrick: false,
      };

      // Bot hand: Void in Spades, has mixed trump types
      const trumpRankPair = Card.createPair(Suit.Clubs, Rank.Two);
      const playerHand = [
        ...trumpRankPair, // 2♣2♣ - Trump rank pair
        Card.createCard(Suit.Hearts, Rank.Ace, 0), // Trump suit card
        Card.createJoker(JokerType.Small, 0), // Joker
        Card.createCard(Suit.Diamonds, Rank.Seven, 0),
      ];

      // Valid: Mixed trump types response (trump rank pair + trump suit + joker)
      const mixedTrumpResponse = [
        ...trumpRankPair, // 2♣2♣ - Trump rank pair
        Card.createCard(Suit.Hearts, Rank.Ace, 0), // Trump suit card
        Card.createJoker(JokerType.Small, 0), // Joker
      ];

      expect(
        isValidPlay(mixedTrumpResponse, playerHand, PlayerId.Bot1, gameState),
      ).toBe(true);

      // Should beat non-trump multi-combo
      const result = evaluateTrickPlay(
        mixedTrumpResponse,
        gameState.currentTrick,
        trumpInfo,
        playerHand,
      );

      expect(result.canBeat).toBe(true);
      expect(result.isLegal).toBe(true);
    });
  });

  describe("Trump vs Trump Mixed Combo-Types", () => {
    test("MCF-EC-5: Mixed trump combo beats another mixed trump combo", () => {
      const gameState = initializeGame();
      gameState.trumpInfo = trumpInfo;

      // Previous trump responses: Mixed trump combo already played
      gameState.currentTrick = {
        plays: [
          {
            playerId: PlayerId.Human,
            cards: [
              Card.createCard(Suit.Spades, Rank.King, 0), // Non-trump lead
              Card.createCard(Suit.Spades, Rank.King, 1),
              Card.createCard(Suit.Spades, Rank.Queen, 0),
              Card.createCard(Suit.Spades, Rank.Jack, 0),
            ],
          },
          {
            playerId: PlayerId.Bot1,
            cards: [
              Card.createCard(Suit.Hearts, Rank.Three, 0), // First trump response: trump suit
              Card.createCard(Suit.Hearts, Rank.Three, 1), // pair + singles
              Card.createCard(Suit.Hearts, Rank.Four, 0),
              Card.createCard(Suit.Hearts, Rank.Five, 0),
            ],
          },
        ],
        winningPlayerId: PlayerId.Bot1,
        points: 20,
        isFinalTrick: false,
      };

      // Bot2 hand: Higher mixed trump types
      const trumpRankPair = Card.createPair(Suit.Clubs, Rank.Two);
      const playerHand = [
        ...trumpRankPair, // 2♣2♣ - Higher trump rank pair
        Card.createJoker(JokerType.Small, 0), // Joker (highest)
        Card.createCard(Suit.Hearts, Rank.Ace, 0), // Trump suit card
        Card.createCard(Suit.Diamonds, Rank.Seven, 0),
      ];

      // Higher mixed trump response: trump rank pair + joker beats trump suit pair + cards
      const higherMixedTrump = [
        ...trumpRankPair, // 2♣2♣ - Trump rank pair beats 3♥3♥
        Card.createJoker(JokerType.Small, 0), // Joker beats 4♥
        Card.createCard(Suit.Hearts, Rank.Ace, 0), // A♥ beats 5♥
      ];

      expect(
        isValidPlay(higherMixedTrump, playerHand, PlayerId.Bot2, gameState),
      ).toBe(true);

      // Should beat previous trump response
      const result = evaluateTrickPlay(
        higherMixedTrump,
        gameState.currentTrick,
        trumpInfo,
        playerHand,
      );

      expect(result.canBeat).toBe(true); // 2♣2♣ + Small Joker + A♥ beats 3♥3♥ + 4♥ + 5♥
      expect(result.isLegal).toBe(true);
    });

    test("MCF-EC-6: Joker-dominated mixed combo vs trump rank dominated combo", () => {
      const gameState = initializeGame();
      gameState.trumpInfo = trumpInfo;

      // Previous: Trump rank dominated response
      gameState.currentTrick = {
        plays: [
          {
            playerId: PlayerId.Human,
            cards: [
              Card.createCard(Suit.Spades, Rank.Ace, 0), // Non-trump tractor + single
              Card.createCard(Suit.Spades, Rank.Ace, 1),
              Card.createCard(Suit.Spades, Rank.King, 0),
              Card.createCard(Suit.Spades, Rank.King, 1),
              Card.createCard(Suit.Spades, Rank.Queen, 0),
            ],
          },
          {
            playerId: PlayerId.Bot1,
            cards: [
              Card.createCard(Suit.Clubs, Rank.Two, 0), // Trump rank tractor (2♣2♣-2♠2♠)
              Card.createCard(Suit.Clubs, Rank.Two, 1),
              Card.createCard(Suit.Hearts, Rank.Two, 0), // (Trump rank in trump suit)
              Card.createCard(Suit.Hearts, Rank.Two, 1),
              Card.createCard(Suit.Hearts, Rank.Ace, 0), // Trump suit single
            ],
          },
        ],
        winningPlayerId: PlayerId.Bot1,
        points: 30,
        isFinalTrick: false,
      };

      // Bot2 hand: Joker-dominated response
      const playerHand = [
        Card.createJoker(JokerType.Big, 0), // Big joker
        Card.createJoker(JokerType.Big, 1), // Big joker pair
        Card.createJoker(JokerType.Small, 0), // Small joker
        Card.createJoker(JokerType.Small, 1), // Small joker pair
        Card.createCard(Suit.Hearts, Rank.King, 0), // Trump suit
        Card.createCard(Suit.Diamonds, Rank.Seven, 0),
      ];

      // Joker-dominated response: Big Joker tractor + Small Joker single
      const jokerDominatedResponse = [
        Card.createJoker(JokerType.Big, 0), // Big Joker tractor
        Card.createJoker(JokerType.Big, 1),
        Card.createJoker(JokerType.Small, 0),
        Card.createJoker(JokerType.Small, 1),
        Card.createCard(Suit.Hearts, Rank.King, 0), // Trump suit single
      ];

      expect(
        isValidPlay(
          jokerDominatedResponse,
          playerHand,
          PlayerId.Bot2,
          gameState,
        ),
      ).toBe(true);

      // Should beat trump rank dominated response
      const result = evaluateTrickPlay(
        jokerDominatedResponse,
        gameState.currentTrick,
        trumpInfo,
        playerHand,
      );

      expect(result.canBeat).toBe(true); // Big Joker tractor beats trump rank tractor
      expect(result.isLegal).toBe(true);
    });
  });

  describe("Edge Cases and Invalid Attempts", () => {
    test("MCF-BUG: Single + 2-pair tractor multi-combo following should be valid", () => {
      const gameState = initializeGame();
      gameState.trumpInfo = { trumpRank: Rank.Queen, trumpSuit: Suit.None };

      // Leading multi-combo: A♣ + J♣J♣-10♣10♣ (single + 2-pair tractor, 5 cards)
      // This is a valid multi-combo lead (each component unbeatable)
      gameState.currentTrick = {
        plays: [
          {
            playerId: PlayerId.Bot1,
            cards: [
              Card.createCard(Suit.Clubs, Rank.Ace, 0), // A♣ (single)
              Card.createCard(Suit.Clubs, Rank.Jack, 0), // J♣J♣ (pair 1 of tractor)
              Card.createCard(Suit.Clubs, Rank.Jack, 1),
              Card.createCard(Suit.Clubs, Rank.Ten, 0), // 10♣10♣ (pair 2 of tractor)
              Card.createCard(Suit.Clubs, Rank.Ten, 1),
            ],
          },
        ],
        winningPlayerId: PlayerId.Bot1,
        points: 20,
        isFinalTrick: false,
      };

      // Bot3's hand: Has valid multi-combo response components
      const playerHand = [
        Card.createCard(Suit.Clubs, Rank.Two, 0), // 2♣
        Card.createCard(Suit.Clubs, Rank.Two, 1), // 2♣ (pair)
        Card.createCard(Suit.Clubs, Rank.Three, 0), // 3♣
        Card.createCard(Suit.Clubs, Rank.Three, 1), // 3♣ (pair)
        Card.createCard(Suit.Clubs, Rank.Four, 0), // 4♣
        Card.createCard(Suit.Clubs, Rank.Four, 1), // 4♣ (pair)
        Card.createCard(Suit.Clubs, Rank.Five, 0), // 5♣
        Card.createCard(Suit.Clubs, Rank.King, 0), // K♣
        Card.createCard(Suit.Clubs, Rank.King, 1), // K♣ (pair)
        Card.createCard(Suit.Diamonds, Rank.Ten, 0),
        Card.createCard(Suit.Diamonds, Rank.Five, 0),
        Card.createCard(Suit.Diamonds, Rank.Six, 0),
        Card.createCard(Suit.Diamonds, Rank.Seven, 0),
        Card.createCard(Suit.Diamonds, Rank.Ace, 0),
        Card.createCard(Suit.Hearts, Rank.Four, 0),
        Card.createCard(Suit.Hearts, Rank.Six, 0),
        Card.createCard(Suit.Hearts, Rank.Eight, 0),
        Card.createCard(Suit.Hearts, Rank.Jack, 0),
        Card.createCard(Suit.Hearts, Rank.King, 0),
        Card.createJoker(JokerType.Small, 0),
        Card.createCard(Suit.Spades, Rank.Five, 0),
        Card.createCard(Suit.Spades, Rank.Six, 0),
        Card.createCard(Suit.Spades, Rank.Six, 1),
        Card.createCard(Suit.Spades, Rank.Jack, 0),
        Card.createCard(Suit.Spades, Rank.King, 0),
      ];

      // Bot3's attempted response: 4♣ + 3♣3♣-2♣2♣ (single + 2-pair tractor, 5 cards)
      // This matches the leading structure exactly and should be valid
      const validMultiComboResponse = [
        Card.createCard(Suit.Clubs, Rank.Four, 0), // 4♣ (single)
        Card.createCard(Suit.Clubs, Rank.Three, 0), // 3♣3♣ (pair 1 of tractor)
        Card.createCard(Suit.Clubs, Rank.Three, 1),
        Card.createCard(Suit.Clubs, Rank.Two, 0), // 2♣2♣ (pair 2 of tractor)
        Card.createCard(Suit.Clubs, Rank.Two, 1),
      ];

      // This should be valid - matches structure and length of leading multi-combo
      expect(
        isValidPlay(
          validMultiComboResponse,
          playerHand,
          PlayerId.Bot3,
          gameState,
        ),
      ).toBe(true);

      // Verify this correctly follows multi-combo structure rules
      const result = evaluateTrickPlay(
        validMultiComboResponse,
        gameState.currentTrick,
        gameState.trumpInfo,
        playerHand,
      );

      expect(result.isLegal).toBe(true);
      // Bot3's response should not beat bot1's lead (bot1 has higher cards)
      expect(result.canBeat).toBe(false); // 4♣ + 3♣3♣-2♣2♣ < A♣ + J♣J♣-10♣10♣
    });

    test("MCF-7: Cannot respond with non-matching structure when have matching cards", () => {
      const gameState = initializeGame();
      gameState.trumpInfo = trumpInfo;

      // Leading pair + single
      gameState.currentTrick = {
        plays: [
          {
            playerId: PlayerId.Human,
            cards: [
              Card.createCard(Suit.Spades, Rank.King, 0),
              Card.createCard(Suit.Spades, Rank.King, 1),
              Card.createCard(Suit.Spades, Rank.Queen, 0),
            ],
          },
        ],
        winningPlayerId: PlayerId.Human,
        points: 10,
        isFinalTrick: false,
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

      expect(
        isValidPlay(invalidResponse, playerHand, PlayerId.Bot1, gameState),
      ).toBe(false);

      // Valid: Uses available pair
      const validResponse = [
        Card.createCard(Suit.Spades, Rank.Jack, 0),
        Card.createCard(Suit.Spades, Rank.Jack, 1),
        Card.createCard(Suit.Spades, Rank.Ten, 0),
      ];

      expect(
        isValidPlay(validResponse, playerHand, PlayerId.Bot1, gameState),
      ).toBe(true);
    });

    test("MCF-8: Mixed trump types valid in multi-combo structure", () => {
      const gameState = initializeGame();
      gameState.trumpInfo = trumpInfo;

      // Leading multi-combo: pair + singles (3 cards)
      gameState.currentTrick = {
        plays: [
          {
            playerId: PlayerId.Human,
            cards: [
              Card.createCard(Suit.Spades, Rank.King, 0),
              Card.createCard(Suit.Spades, Rank.King, 1),
              Card.createCard(Suit.Spades, Rank.Queen, 0),
            ],
          },
        ],
        winningPlayerId: PlayerId.Human,
        points: 0,
        isFinalTrick: false,
      };

      // Player has mixed trump types (void in spades)
      const trumpRankPair = Card.createPair(Suit.Clubs, Rank.Two); // Valid trump rank pair from same suit
      const playerHand = [
        Card.createCard(Suit.Hearts, Rank.Ace, 0), // Trump suit card
        Card.createCard(Suit.Hearts, Rank.King, 0), // Trump suit card
        ...trumpRankPair, // 2♣2♣ - Valid trump rank pair
        Card.createCard(Suit.Diamonds, Rank.Seven, 0), // Other suit
      ];

      // Valid: Mixed trump response with trump pair + single (matching structure)
      const mixedTrumpResponse = [
        ...trumpRankPair, // 2♣2♣ - Valid trump rank pair
        Card.createCard(Suit.Hearts, Rank.Ace, 0), // Trump suit card (single)
      ];

      expect(
        isValidPlay(mixedTrumpResponse, playerHand, PlayerId.Bot1, gameState),
      ).toBe(true);
    });

    test("BUG-FollowSuit: Should not allow mixed-suit play when holding lead suit cards", () => {
      const gameState = initializeGame();
      // Set trump to something other than Clubs or Hearts to keep it simple
      gameState.trumpInfo = { trumpRank: Rank.Two, trumpSuit: Suit.Spades };

      // Bot 1 leads a multi-combo of Clubs
      gameState.currentTrick = {
        plays: [
          {
            playerId: PlayerId.Bot1,
            cards: [
              Card.createCard(Suit.Clubs, Rank.King, 0),
              Card.createCard(Suit.Clubs, Rank.Queen, 0),
              Card.createCard(Suit.Clubs, Rank.Nine, 0),
              Card.createCard(Suit.Clubs, Rank.Nine, 1),
            ],
          },
        ],
        winningPlayerId: PlayerId.Bot1,
        points: 10,
        isFinalTrick: false,
      };

      // Human's hand contains cards of the lead suit (Clubs) and other suits
      const humanHand = [
        Card.createCard(Suit.Clubs, Rank.Queen, 1), // Has lead suit
        Card.createCard(Suit.Clubs, Rank.Six, 0), // Has lead suit
        Card.createCard(Suit.Hearts, Rank.Ten, 0),
        Card.createCard(Suit.Hearts, Rank.Ten, 1),
        Card.createCard(Suit.Clubs, Rank.Ten, 0),
        Card.createCard(Suit.Diamonds, Rank.Five, 0),
      ];

      // Human attempts to play a mixed-suit hand, which should be illegal
      const illegalMixedPlay = [
        Card.createCard(Suit.Hearts, Rank.Ten, 0),
        Card.createCard(Suit.Hearts, Rank.Ten, 1),
        Card.createCard(Suit.Clubs, Rank.Ten, 0),
        Card.createCard(Suit.Diamonds, Rank.Five, 0),
      ];

      // This play should be invalid because the player has not exhausted their Clubs
      expect(
        isValidPlay(illegalMixedPlay, humanHand, PlayerId.Human, gameState),
      ).toBe(false);

      const betterHumanHand = [
        Card.createCard(Suit.Clubs, Rank.Queen, 1),
        Card.createCard(Suit.Clubs, Rank.Six, 0),
        Card.createCard(Suit.Clubs, Rank.Ten, 0),
        Card.createCard(Suit.Clubs, Rank.Five, 0), // 4th club
        Card.createCard(Suit.Hearts, Rank.Ten, 0),
        Card.createCard(Suit.Hearts, Rank.Ten, 1),
        Card.createCard(Suit.Diamonds, Rank.Five, 0),
      ];

      const validClubPlay = [
        Card.createCard(Suit.Clubs, Rank.Queen, 1),
        Card.createCard(Suit.Clubs, Rank.Six, 0),
        Card.createCard(Suit.Clubs, Rank.Ten, 0),
        Card.createCard(Suit.Clubs, Rank.Five, 0),
      ];

      // This play should be valid
      expect(
        isValidPlay(validClubPlay, betterHumanHand, PlayerId.Human, gameState),
      ).toBe(true);
    });
  });
});
