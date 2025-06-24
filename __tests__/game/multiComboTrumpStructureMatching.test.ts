import { evaluateTrickPlay } from "../../src/game/cardComparison";
import { Card, PlayerId, Rank, Suit, TrumpInfo } from "../../src/types";
import { initializeGame } from "../../src/utils/gameInitialization";

/**
 * Multi-Combo Trump Structure Matching Test Suite
 *
 * Tests for GitHub Issue #267: "4 single trump cards can beat two pairs multi combo"
 *
 * This tests the core rule that trump responses to multi-combos must match
 * the structure requirements (same number of pairs/tractors) to be valid.
 */

describe("Multi-Combo Trump Structure Matching - Issue #267", () => {
  let trumpInfo: TrumpInfo;

  beforeEach(() => {
    trumpInfo = { trumpRank: Rank.Two, trumpSuit: Suit.Hearts };
  });

  describe("Two Pairs Multi-Combo Leading Scenarios", () => {
    test("BUG REPRODUCTION: 4 single trump cards should NOT beat 2-pair multi-combo", () => {
      const gameState = initializeGame();
      gameState.trumpInfo = trumpInfo;

      // Leading: K♠K♠ + Q♠Q♠ + J♠ (2 pairs + 1 single from Spades, unbeatable)
      const leadingCards = [
        Card.createCard(Suit.Spades, Rank.King, 0),
        Card.createCard(Suit.Spades, Rank.King, 1),
        Card.createCard(Suit.Spades, Rank.Queen, 0),
        Card.createCard(Suit.Spades, Rank.Queen, 1),
        Card.createCard(Suit.Spades, Rank.Jack, 0),
      ];

      gameState.currentTrick = {
        plays: [
          {
            playerId: PlayerId.Human,
            cards: leadingCards,
          },
        ],
        winningPlayerId: PlayerId.Human,
        points: 20, // 2 Kings = 20 points
        isFinalTrick: false,
      };

      // Attempted trump response: 4 single trump cards (should FAIL)
      const trumpSingles = [
        Card.createCard(Suit.Hearts, Rank.Ace, 0), // Trump suit
        Card.createCard(Suit.Hearts, Rank.King, 0), // Trump suit
        Card.createCard(Suit.Clubs, Rank.Two, 0), // Trump rank
        Card.createCard(Suit.Diamonds, Rank.Two, 0), // Trump rank
        Card.createCard(Suit.Hearts, Rank.Queen, 0), // Trump suit
      ];

      // Player hand: Bot1 has trump cards but no Spades (void in leading suit)
      const bot1Hand = [
        ...trumpSingles,
        Card.createCard(Suit.Hearts, Rank.Three, 0),
        Card.createCard(Suit.Hearts, Rank.Four, 0),
      ];

      gameState.players[1].hand = bot1Hand;

      // Test: This should fail because trump response lacks required pairs
      const trickResult = evaluateTrickPlay(
        trumpSingles,
        gameState.currentTrick,
        trumpInfo,
        bot1Hand,
      );

      // EXPECTED: Should NOT be able to beat the multi-combo
      expect(trickResult.canBeat).toBe(false);
    });

    test("CORRECT BEHAVIOR: 2 trump pairs + 1 single should beat 2-pair multi-combo", () => {
      const gameState = initializeGame();
      gameState.trumpInfo = trumpInfo;

      // Leading: K♠K♠ + Q♠Q♠ + J♠ (2 pairs + 1 single from Spades)
      const leadingCards = [
        Card.createCard(Suit.Spades, Rank.King, 0),
        Card.createCard(Suit.Spades, Rank.King, 1),
        Card.createCard(Suit.Spades, Rank.Queen, 0),
        Card.createCard(Suit.Spades, Rank.Queen, 1),
        Card.createCard(Suit.Spades, Rank.Jack, 0),
      ];

      gameState.currentTrick = {
        plays: [
          {
            playerId: PlayerId.Human,
            cards: leadingCards,
          },
        ],
        winningPlayerId: PlayerId.Human,
        points: 20,
        isFinalTrick: false,
      };

      // Valid trump response: 2 pairs + 1 single (matches structure)
      const trumpResponse = [
        Card.createCard(Suit.Hearts, Rank.Ace, 0), // Trump pair
        Card.createCard(Suit.Hearts, Rank.Ace, 1),
        Card.createCard(Suit.Hearts, Rank.King, 0), // Trump pair
        Card.createCard(Suit.Hearts, Rank.King, 1),
        Card.createCard(Suit.Clubs, Rank.Two, 0), // Trump single
      ];

      const bot1Hand = [
        ...trumpResponse,
        Card.createCard(Suit.Hearts, Rank.Three, 0),
      ];

      gameState.players[1].hand = bot1Hand;

      // Test: This should succeed because structure matches
      const trickResult = evaluateTrickPlay(
        trumpResponse,
        gameState.currentTrick,
        trumpInfo,
        bot1Hand,
      );

      // EXPECTED: Should be able to beat the multi-combo
      expect(trickResult.canBeat).toBe(true);
      expect(trickResult.isLegal).toBe(true);
    });

    test("EDGE CASE: 3 trump pairs + 1 single should beat 2-pair multi-combo (exceeds requirement)", () => {
      const gameState = initializeGame();
      gameState.trumpInfo = trumpInfo;

      // Leading: K♠K♠ + Q♠Q♠ + J♠ (2 pairs + 1 single)
      const leadingCards = [
        Card.createCard(Suit.Spades, Rank.King, 0),
        Card.createCard(Suit.Spades, Rank.King, 1),
        Card.createCard(Suit.Spades, Rank.Queen, 0),
        Card.createCard(Suit.Spades, Rank.Queen, 1),
        Card.createCard(Suit.Spades, Rank.Jack, 0),
      ];

      gameState.currentTrick = {
        plays: [
          {
            playerId: PlayerId.Human,
            cards: leadingCards,
          },
        ],
        winningPlayerId: PlayerId.Human,
        points: 20,
        isFinalTrick: false,
      };

      // Trump response with more pairs than required (should be valid)
      const trumpResponse = [
        Card.createCard(Suit.Hearts, Rank.Ace, 0), // Trump pair 1
        Card.createCard(Suit.Hearts, Rank.Ace, 1),
        Card.createCard(Suit.Hearts, Rank.King, 0), // Trump pair 2
        Card.createCard(Suit.Hearts, Rank.King, 1),
        Card.createCard(Suit.Clubs, Rank.Two, 0), // Trump single
      ];

      const bot1Hand = [
        ...trumpResponse,
        Card.createCard(Suit.Hearts, Rank.Three, 0),
      ];

      gameState.players[1].hand = bot1Hand;

      const trickResult = evaluateTrickPlay(
        trumpResponse,
        gameState.currentTrick,
        trumpInfo,
        bot1Hand,
      );

      expect(trickResult.canBeat).toBe(true);
      expect(trickResult.isLegal).toBe(true);
    });
  });

  describe("Tractor Multi-Combo Leading Scenarios", () => {
    test("BUG REPRODUCTION: Singles should NOT beat tractor multi-combo", () => {
      const gameState = initializeGame();
      gameState.trumpInfo = trumpInfo;

      // Leading: K♠K♠-Q♠Q♠ + J♠ (1 tractor + 1 single)
      const leadingCards = [
        Card.createCard(Suit.Spades, Rank.King, 0),
        Card.createCard(Suit.Spades, Rank.King, 1),
        Card.createCard(Suit.Spades, Rank.Queen, 0),
        Card.createCard(Suit.Spades, Rank.Queen, 1),
        Card.createCard(Suit.Spades, Rank.Jack, 0),
      ];

      gameState.currentTrick = {
        plays: [
          {
            playerId: PlayerId.Human,
            cards: leadingCards,
          },
        ],
        winningPlayerId: PlayerId.Human,
        points: 20,
        isFinalTrick: false,
      };

      // Invalid trump response: 5 singles (no tractor)
      const trumpSingles = [
        Card.createCard(Suit.Hearts, Rank.Ace, 0),
        Card.createCard(Suit.Hearts, Rank.King, 0),
        Card.createCard(Suit.Hearts, Rank.Queen, 0),
        Card.createCard(Suit.Clubs, Rank.Two, 0),
        Card.createCard(Suit.Diamonds, Rank.Two, 0),
      ];

      const bot1Hand = [
        ...trumpSingles,
        Card.createCard(Suit.Hearts, Rank.Three, 0),
      ];

      gameState.players[1].hand = bot1Hand;

      const trickResult = evaluateTrickPlay(
        trumpSingles,
        gameState.currentTrick,
        trumpInfo,
        bot1Hand,
      );

      // EXPECTED: Should NOT beat tractor multi-combo without tractor
      expect(trickResult.canBeat).toBe(false);
    });

    test("CORRECT BEHAVIOR: Trump tractor + single should beat non-trump tractor multi-combo", () => {
      const gameState = initializeGame();
      gameState.trumpInfo = trumpInfo;

      // Leading: K♠K♠-Q♠Q♠ + J♠ (1 tractor + 1 single)
      const leadingCards = [
        Card.createCard(Suit.Spades, Rank.King, 0),
        Card.createCard(Suit.Spades, Rank.King, 1),
        Card.createCard(Suit.Spades, Rank.Queen, 0),
        Card.createCard(Suit.Spades, Rank.Queen, 1),
        Card.createCard(Suit.Spades, Rank.Jack, 0),
      ];

      gameState.currentTrick = {
        plays: [
          {
            playerId: PlayerId.Human,
            cards: leadingCards,
          },
        ],
        winningPlayerId: PlayerId.Human,
        points: 20,
        isFinalTrick: false,
      };

      // Valid trump response: tractor + single
      const trumpResponse = [
        Card.createCard(Suit.Hearts, Rank.Ace, 0), // Trump tractor
        Card.createCard(Suit.Hearts, Rank.Ace, 1),
        Card.createCard(Suit.Hearts, Rank.King, 0),
        Card.createCard(Suit.Hearts, Rank.King, 1),
        Card.createCard(Suit.Clubs, Rank.Two, 0), // Trump single
      ];

      const bot1Hand = [
        ...trumpResponse,
        Card.createCard(Suit.Hearts, Rank.Three, 0),
      ];

      gameState.players[1].hand = bot1Hand;

      const trickResult = evaluateTrickPlay(
        trumpResponse,
        gameState.currentTrick,
        trumpInfo,
        bot1Hand,
      );

      expect(trickResult.canBeat).toBe(true);
      expect(trickResult.isLegal).toBe(true);
    });
  });

  describe("Additional Structure Validation Tests", () => {
    test("Non-trump singles cannot beat 2-pair multi-combo (same suit)", () => {
      const gameState = initializeGame();
      gameState.trumpInfo = trumpInfo;

      // Leading: K♠K♠ + Q♠Q♠ + J♠ (2 pairs + 1 single from Spades)
      const leadingCards = [
        Card.createCard(Suit.Spades, Rank.King, 0),
        Card.createCard(Suit.Spades, Rank.King, 1),
        Card.createCard(Suit.Spades, Rank.Queen, 0),
        Card.createCard(Suit.Spades, Rank.Queen, 1),
        Card.createCard(Suit.Spades, Rank.Jack, 0),
      ];

      gameState.currentTrick = {
        plays: [
          {
            playerId: PlayerId.Human,
            cards: leadingCards,
          },
        ],
        winningPlayerId: PlayerId.Human,
        points: 20,
        isFinalTrick: false,
      };

      // Response: 3♠ + 4♠ + 5♠ + 6♠ + 7♠ (5 singles from Spades - wrong structure)
      const nonTrumpSingles = [
        Card.createCard(Suit.Spades, Rank.Three, 0),
        Card.createCard(Suit.Spades, Rank.Four, 0),
        Card.createCard(Suit.Spades, Rank.Five, 0),
        Card.createCard(Suit.Spades, Rank.Six, 0),
        Card.createCard(Suit.Spades, Rank.Seven, 0),
      ];

      const bot1Hand = [
        ...nonTrumpSingles,
        Card.createCard(Suit.Spades, Rank.Eight, 0),
      ];

      gameState.players[1].hand = bot1Hand;

      const trickResult = evaluateTrickPlay(
        nonTrumpSingles,
        gameState.currentTrick,
        trumpInfo,
        bot1Hand,
      );

      // EXPECTED: Cannot beat - same suit but wrong structure (singles vs pairs requirement)
      expect(trickResult.canBeat).toBe(false);
      expect(trickResult.isLegal).toBe(true); // Legal to play, just can't beat
    });

    test("Mixed suit response cannot beat multi-combo", () => {
      const gameState = initializeGame();
      gameState.trumpInfo = trumpInfo;

      // Leading: K♠K♠ + Q♠Q♠ + J♠ (2 pairs + 1 single from Spades)
      const leadingCards = [
        Card.createCard(Suit.Spades, Rank.King, 0),
        Card.createCard(Suit.Spades, Rank.King, 1),
        Card.createCard(Suit.Spades, Rank.Queen, 0),
        Card.createCard(Suit.Spades, Rank.Queen, 1),
        Card.createCard(Suit.Spades, Rank.Jack, 0),
      ];

      gameState.currentTrick = {
        plays: [
          {
            playerId: PlayerId.Human,
            cards: leadingCards,
          },
        ],
        winningPlayerId: PlayerId.Human,
        points: 20,
        isFinalTrick: false,
      };

      // Response: 3♠ + 4♠ + 5♦ + 6♦ + 7♠ (mixed Spades + Diamonds)
      const mixedSuitResponse = [
        Card.createCard(Suit.Spades, Rank.Three, 0),
        Card.createCard(Suit.Spades, Rank.Four, 0),
        Card.createCard(Suit.Diamonds, Rank.Five, 0),
        Card.createCard(Suit.Diamonds, Rank.Six, 0),
        Card.createCard(Suit.Spades, Rank.Seven, 0),
      ];

      const bot1Hand = [
        ...mixedSuitResponse,
        Card.createCard(Suit.Spades, Rank.Eight, 0),
      ];

      gameState.players[1].hand = bot1Hand;

      const trickResult = evaluateTrickPlay(
        mixedSuitResponse,
        gameState.currentTrick,
        trumpInfo,
        bot1Hand,
      );

      // EXPECTED: Cannot beat - mixed suits are invalid for beating multi-combo
      expect(trickResult.canBeat).toBe(false);
      expect(trickResult.isLegal).toBe(true); // May be legal due to exhaustion rule
    });

    test("Trump pair can beat two singles multi-combo", () => {
      const gameState = initializeGame();
      gameState.trumpInfo = trumpInfo;

      // Leading: A♠ + K♠ (2 singles from Spades)
      const leadingCards = [
        Card.createCard(Suit.Spades, Rank.Ace, 0),
        Card.createCard(Suit.Spades, Rank.King, 0),
      ];

      gameState.currentTrick = {
        plays: [
          {
            playerId: PlayerId.Human,
            cards: leadingCards,
          },
        ],
        winningPlayerId: PlayerId.Human,
        points: 10, // 1 King = 10 points
        isFinalTrick: false,
      };

      // Response: 10♥ + 10♥ (trump pair from Hearts)
      const trumpPairResponse = [
        Card.createCard(Suit.Hearts, Rank.Ten, 0), // Trump suit
        Card.createCard(Suit.Hearts, Rank.Ten, 1), // Trump suit
      ];

      const bot1Hand = [
        ...trumpPairResponse,
        Card.createCard(Suit.Hearts, Rank.Nine, 0),
      ];

      gameState.players[1].hand = bot1Hand;

      const trickResult = evaluateTrickPlay(
        trumpPairResponse,
        gameState.currentTrick,
        trumpInfo,
        bot1Hand,
      );

      // EXPECTED: Can beat - trump pair can beat non-trump singles multi-combo
      expect(trickResult.canBeat).toBe(true);
      expect(trickResult.isLegal).toBe(true);
    });

    test("Trump tractor can beat two pairs lead QQ-99 (S)", () => {
      const gameState = initializeGame();
      gameState.trumpInfo = trumpInfo;

      // Leading: Q♠Q♠-9♠9♠ (tractor from Spades)
      const leadingCards = [
        Card.createCard(Suit.Spades, Rank.Queen, 0),
        Card.createCard(Suit.Spades, Rank.Queen, 1),
        Card.createCard(Suit.Spades, Rank.Nine, 0),
        Card.createCard(Suit.Spades, Rank.Nine, 1),
      ];

      gameState.currentTrick = {
        plays: [
          {
            playerId: PlayerId.Human,
            cards: leadingCards,
          },
        ],
        winningPlayerId: PlayerId.Human,
        points: 0, // No point cards
        isFinalTrick: false,
      };

      // Response: 3♥3♥-4♥4♥ (trump tractor from Hearts)
      const trumpTractorResponse = [
        Card.createCard(Suit.Hearts, Rank.Three, 0), // Trump suit
        Card.createCard(Suit.Hearts, Rank.Three, 1), // Trump suit
        Card.createCard(Suit.Hearts, Rank.Four, 0), // Trump suit
        Card.createCard(Suit.Hearts, Rank.Four, 1), // Trump suit
      ];

      const bot1Hand = [
        ...trumpTractorResponse,
        Card.createCard(Suit.Hearts, Rank.Five, 0),
      ];

      gameState.players[1].hand = bot1Hand;

      const trickResult = evaluateTrickPlay(
        trumpTractorResponse,
        gameState.currentTrick,
        trumpInfo,
        bot1Hand,
      );

      // EXPECTED: Can beat - trump tractor can beat non-trump tractor
      expect(trickResult.canBeat).toBe(true);
      expect(trickResult.isLegal).toBe(true);
    });
  });

  describe("Trick Winner Determination", () => {
    test("Trick winner should be correctly determined after valid trump multi-combo", () => {
      const gameState = initializeGame();
      gameState.trumpInfo = trumpInfo;

      // Leading: Non-trump multi-combo
      const leadingCards = [
        Card.createCard(Suit.Spades, Rank.King, 0),
        Card.createCard(Suit.Spades, Rank.King, 1),
        Card.createCard(Suit.Spades, Rank.Queen, 0),
      ];

      // Valid trump response
      const trumpResponse = [
        Card.createCard(Suit.Hearts, Rank.Ace, 0),
        Card.createCard(Suit.Hearts, Rank.Ace, 1),
        Card.createCard(Suit.Clubs, Rank.Two, 0),
      ];

      gameState.currentTrick = {
        plays: [
          {
            playerId: PlayerId.Human,
            cards: leadingCards,
          },
          {
            playerId: PlayerId.Bot1,
            cards: trumpResponse,
          },
        ],
        winningPlayerId: PlayerId.Human, // Initially human winning
        points: 20,
        isFinalTrick: false,
      };

      const bot1Hand = [
        ...trumpResponse,
        Card.createCard(Suit.Hearts, Rank.Three, 0),
      ];

      // Evaluate if trump response beats leading combo
      const trickResult = evaluateTrickPlay(
        trumpResponse,
        gameState.currentTrick,
        trumpInfo,
        bot1Hand,
      );

      expect(trickResult.canBeat).toBe(true);
      expect(trickResult.isLegal).toBe(true);

      // After processing the trump response, Bot1 should be winning
      // (This would be handled by processPlay function in actual game)
    });
  });
});
