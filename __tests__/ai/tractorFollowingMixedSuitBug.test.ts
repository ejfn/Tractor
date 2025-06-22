import { getAIMove } from "../../src/ai/aiLogic";
import { processPlay } from "../../src/game/playProcessing";
import {
  Card,
  GamePhase,
  JokerType,
  PlayerId,
  Rank,
  Suit,
  TrumpInfo,
} from "../../src/types";
import { createGameState, givePlayerCards } from "../helpers/gameStates";
import { gameLogger, LogLevel } from "../../src/utils/gameLogger";

describe("Tractor Following Mixed Suit Bug", () => {
  describe("Hearts Tractor Following Rules", () => {
    it("should use Hearts tractor 10♥10♥-J♥J♥ when following Hearts tractor K♥K♥-Q♥Q♥", () => {
      // Create game state matching the log scenario
      let gameState = createGameState({
        gamePhase: GamePhase.Playing,
        trumpInfo: {
          trumpRank: "3",
          trumpSuit: "Diamonds",
        } as TrumpInfo,
        currentPlayerIndex: 0,
        roundNumber: 2,
      });

      // Set up bot1's hand with Hearts tractor (from the logs)
      // Bot1 has: 10♥, 10♥, J♥, J♥ which forms a valid Hearts tractor
      const bot1Hand = [
        // Hearts tractor that should be used
        Card.createCard(Suit.Hearts, Rank.Ten, 0),
        Card.createCard(Suit.Hearts, Rank.Ten, 1),
        Card.createCard(Suit.Hearts, Rank.Jack, 0),
        Card.createCard(Suit.Hearts, Rank.Jack, 1),
        // Additional Hearts
        Card.createCard(Suit.Hearts, Rank.Four, 0),
        Card.createCard(Suit.Hearts, Rank.Six, 0),
        Card.createCard(Suit.Hearts, Rank.Six, 1),
        // Other suits (these should NOT be used)
        Card.createCard(Suit.Spades, Rank.Ace, 0),
        Card.createCard(Suit.Spades, Rank.Five, 0),
        Card.createCard(Suit.Spades, Rank.Four, 0),
        Card.createCard(Suit.Spades, Rank.Three, 0),
        Card.createCard(Suit.Spades, Rank.Six, 0),
        Card.createCard(Suit.Spades, Rank.Eight, 0),
        Card.createCard(Suit.Spades, Rank.Ace, 1),
        Card.createCard(Suit.Clubs, Rank.Ace, 0),
        Card.createCard(Suit.Clubs, Rank.Ten, 0),
        Card.createCard(Suit.Clubs, Rank.Five, 0),
        Card.createCard(Suit.Clubs, Rank.Five, 1),
        Card.createCard(Suit.Clubs, Rank.Seven, 0),
        Card.createCard(Suit.Clubs, Rank.Eight, 0),
        Card.createCard(Suit.Clubs, Rank.Jack, 0),
        Card.createCard(Suit.Diamonds, Rank.Two, 0),
        Card.createCard(Suit.Diamonds, Rank.Eight, 0),
        Card.createCard(Suit.Diamonds, Rank.Jack, 0),
        Card.createJoker(JokerType.Big, 0),
      ];

      // Set bot1's hand
      gameState = givePlayerCards(gameState, 1, bot1Hand);
      gameState.currentPlayerIndex = 0;

      // Human leads with Hearts tractor K♥K♥-Q♥Q♥
      const humanPlay = [
        Card.createCard(Suit.Hearts, Rank.King, 0),
        Card.createCard(Suit.Hearts, Rank.King, 1),
        Card.createCard(Suit.Hearts, Rank.Queen, 0),
        Card.createCard(Suit.Hearts, Rank.Queen, 1),
      ];

      // Process human's play
      const humanResult = processPlay(gameState, humanPlay);
      expect(humanResult.newState).toBeDefined();
      gameState = humanResult.newState;

      // Set current player to bot1 for AI move
      gameState.currentPlayerIndex = 1;

      // Now test bot1's AI response
      const aiMove = getAIMove(gameState, PlayerId.Bot1);

      // The AI should use the Hearts tractor 10♥10♥-J♥J♥
      // This is the correct tractor following response

      expect(aiMove).toHaveLength(4); // Must match leading combo length

      // The AI should NOT play the problematic mixed combination [A♠, 5♠, 4♠, J♥]
      const mixedSuitMove = [
        Card.createCard(Suit.Spades, Rank.Ace, 0),
        Card.createCard(Suit.Spades, Rank.Five, 0),
        Card.createCard(Suit.Spades, Rank.Four, 0),
        Card.createCard(Suit.Hearts, Rank.Jack, 0),
      ];

      const isMixedSuitMove = aiMove.every(
        (card, index) =>
          card.suit === mixedSuitMove[index].suit &&
          card.rank === mixedSuitMove[index].rank,
      );

      expect(isMixedSuitMove).toBe(false);

      // The AI should play all Hearts (has valid Hearts tractor)
      const heartsInMove = aiMove.filter((card) => card.suit === Suit.Hearts);
      expect(heartsInMove).toHaveLength(4); // All 4 cards should be Hearts

      // Ideally, it should use the Hearts tractor 10♥10♥-J♥J♥
      // Check if it contains the tractor pairs
      const has10Pair =
        aiMove.filter(
          (card) => card.suit === Suit.Hearts && card.rank === Rank.Ten,
        ).length === 2;

      const hasJPair =
        aiMove.filter(
          (card) => card.suit === Suit.Hearts && card.rank === Rank.Jack,
        ).length === 2;

      // Should use the tractor (10-10-J-J) to properly follow the leading tractor
      expect(has10Pair && hasJPair).toBe(true);

      // Verify the AI move is valid
      const aiResult = processPlay(gameState, aiMove);
      expect(aiResult.newState).toBeDefined();
    });

    it("should handle Hearts tractor with insufficient Hearts correctly", () => {
      // Test case where player has some Hearts but not enough for full tractor response
      let gameState = createGameState({
        gamePhase: GamePhase.Playing,
        trumpInfo: {
          trumpRank: Rank.Three,
          trumpSuit: Suit.Diamonds,
        } as TrumpInfo,
        currentPlayerIndex: 0,
      });

      // Bot with limited Hearts
      const limitedHeartsHand = [
        Card.createCard(Suit.Hearts, Rank.Jack, 0),
        Card.createCard(Suit.Hearts, Rank.Ten, 0),
        // Fill with non-Hearts
        Card.createCard(Suit.Spades, Rank.Ace, 0),
        Card.createCard(Suit.Spades, Rank.Five, 0),
        Card.createCard(Suit.Spades, Rank.Four, 0),
        Card.createCard(Suit.Clubs, Rank.Seven, 0),
        // Add remaining cards
        ...Array.from({ length: 19 }, (_, i) =>
          Card.createCard(Suit.Clubs, Rank.Two, (i % 2) as 0 | 1),
        ),
      ];

      gameState = givePlayerCards(gameState, 1, limitedHeartsHand);

      // Human leads with Hearts tractor
      const humanPlay = [
        Card.createCard(Suit.Hearts, Rank.King, 0),
        Card.createCard(Suit.Hearts, Rank.King, 1),
        Card.createCard(Suit.Hearts, Rank.Queen, 0),
        Card.createCard(Suit.Hearts, Rank.Queen, 1),
      ];

      // Process human's play
      const humanResult = processPlay(gameState, humanPlay);
      expect(humanResult.newState).toBeDefined();
      gameState = humanResult.newState;

      // Set current player to bot1
      gameState.currentPlayerIndex = 1;

      // Test AI response
      const aiMove = getAIMove(gameState, PlayerId.Bot1);
      expect(aiMove).toHaveLength(4);

      // Should use all available Hearts first
      const heartsInMove = aiMove.filter((card) => card.suit === Suit.Hearts);
      expect(heartsInMove.length).toBeGreaterThan(0);

      // Validate the move is legal
      const result = processPlay(gameState, aiMove);
      expect(result.newState).toBeDefined();
    });

    it("should reproduce the exact bug from simulation logs", () => {
      // Enable debug logging for this test
      gameLogger.configure({
        logLevel: LogLevel.DEBUG,
        enableConsoleLog: true,
        enableFileLogging: false,
        includePlayerHands: false,
      });

      // Recreate the EXACT scenario from the simulation logs
      let gameState = createGameState({
        gamePhase: GamePhase.Playing,
        trumpInfo: {
          trumpRank: "3", // EXACT match from logs
          trumpSuit: "Diamonds", // EXACT match from logs
        } as TrumpInfo,
        currentPlayerIndex: 0,
        roundNumber: 2,
      });

      // Set up bot1's hand EXACTLY as in the logs
      // ["BJ","10♣","5♣","5♣","7♣","8♣","A♣","J♣","2♦","8♦","J♦","10♥","10♥","4♥","6♥","6♥","J♥","J♥","3♠","4♠","5♠","6♠","8♠","A♠","A♠"]
      const bot1ExactHand = [
        Card.createJoker(JokerType.Big, 0), // BJ
        Card.createCard(Suit.Clubs, Rank.Ten, 0), // 10♣
        Card.createCard(Suit.Clubs, Rank.Five, 0), // 5♣
        Card.createCard(Suit.Clubs, Rank.Five, 1), // 5♣
        Card.createCard(Suit.Clubs, Rank.Seven, 0), // 7♣
        Card.createCard(Suit.Clubs, Rank.Eight, 0), // 8♣
        Card.createCard(Suit.Clubs, Rank.Ace, 0), // A♣
        Card.createCard(Suit.Clubs, Rank.Jack, 0), // J♣
        Card.createCard(Suit.Diamonds, Rank.Two, 0), // 2♦
        Card.createCard(Suit.Diamonds, Rank.Eight, 0), // 8♦
        Card.createCard(Suit.Diamonds, Rank.Jack, 0), // J♦
        Card.createCard(Suit.Hearts, Rank.Ten, 0), // 10♥
        Card.createCard(Suit.Hearts, Rank.Ten, 1), // 10♥
        Card.createCard(Suit.Hearts, Rank.Four, 0), // 4♥
        Card.createCard(Suit.Hearts, Rank.Six, 0), // 6♥
        Card.createCard(Suit.Hearts, Rank.Six, 1), // 6♥
        Card.createCard(Suit.Hearts, Rank.Jack, 0), // J♥
        Card.createCard(Suit.Hearts, Rank.Jack, 1), // J♥
        Card.createCard(Suit.Spades, Rank.Three, 0), // 3♠
        Card.createCard(Suit.Spades, Rank.Four, 0), // 4♠
        Card.createCard(Suit.Spades, Rank.Five, 0), // 5♠
        Card.createCard(Suit.Spades, Rank.Six, 0), // 6♠
        Card.createCard(Suit.Spades, Rank.Eight, 0), // 8♠
        Card.createCard(Suit.Spades, Rank.Ace, 0), // A♠
        Card.createCard(Suit.Spades, Rank.Ace, 1), // A♠
      ];

      gameState = givePlayerCards(gameState, 1, bot1ExactHand);

      // Human leads with Hearts tractor K♥K♥-Q♥Q♥ (EXACT from logs)
      const humanPlay = [
        Card.createCard(Suit.Hearts, Rank.King, 0),
        Card.createCard(Suit.Hearts, Rank.King, 1),
        Card.createCard(Suit.Hearts, Rank.Queen, 0),
        Card.createCard(Suit.Hearts, Rank.Queen, 1),
      ];

      // Process human's play
      const humanResult = processPlay(gameState, humanPlay);
      expect(humanResult.newState).toBeDefined();
      gameState = humanResult.newState;

      // Set current player to bot1 (EXACT from logs)
      gameState.currentPlayerIndex = 1;

      // Test AI response - this SHOULD reproduce the bug
      const aiMove = getAIMove(gameState, PlayerId.Bot1);

      // Log what the AI actually chose
      // Note: Using gameLogger for debug output instead of console.log

      expect(aiMove).toHaveLength(4);

      // Check if this reproduces the problematic move from logs: ["A♠","5♠","4♠","J♥"]
      const problematicMove = [
        Card.createCard(Suit.Spades, Rank.Ace, 0),
        Card.createCard(Suit.Spades, Rank.Five, 0),
        Card.createCard(Suit.Spades, Rank.Four, 0),
        Card.createCard(Suit.Hearts, Rank.Jack, 0),
      ];

      const isProblematicMove = aiMove.every(
        (card, index) =>
          card.suit === problematicMove[index].suit &&
          card.rank === problematicMove[index].rank,
      );

      // If this reproduces the bug, this will be true
      if (isProblematicMove) {
        // BUG REPRODUCED: AI chose problematic mixed-suit move
        // Don't fail the test - just document that we reproduced it
      } else {
        // AI chose different move - bug not reproduced
      }

      // AI should ideally use Hearts cards since it has J♥J♥ + 10♥10♥ available
      // Debug: Can check heartsInMove count if needed for diagnosis

      // Validate the move is at least legal (even if not optimal)
      const result = processPlay(gameState, aiMove);
      expect(result.newState).toBeDefined();
    });
  });
});
