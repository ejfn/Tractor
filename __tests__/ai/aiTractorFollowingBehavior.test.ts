import { getAIMove } from "../../src/ai/aiLogic";
import { isValidPlay } from "../../src/game/playValidation";
import {
  Card,
  GamePhase,
  JokerType,
  PlayerId,
  Rank,
  Suit,
} from "../../src/types";
import { initializeGame } from "../../src/utils/gameInitialization";
import { gameLogger } from "../../src/utils/gameLogger";
import { getPlayerById } from "../helpers";

/**
 * Comprehensive AI tractor following behavior tests
 *
 * This includes the original fix for issue #71 plus comprehensive testing
 * of all tractor following rules:
 * 1. AI should properly follow tractor hierarchy: tractors -> pairs -> singles
 * 2. Same suit priority order (tractors → pairs → remaining pairs → singles → other suits)
 * 3. Trump suit special rules (trump suit pairs, trump rank pairs, joker pairs)
 * 4. Cross-suit trump victory (same combo type when zero cards in leading suit)
 * 5. AI strategic decision-making within the rule framework
 */
describe("AI Tractor Following Behavior", () => {
  describe("Issue #71: AI Tractor Following Rules", () => {
    test("AI plays valid moves when following trump tractors", () => {
      gameLogger.info(
        "test_issue_71_verification",
        {},
        "VERIFYING FIX FOR ISSUE #71: AI TRACTOR FOLLOWING",
      );

      // Initialize game with Hearts as trump (rank 2)
      const gameState = initializeGame();
      gameState.gamePhase = GamePhase.Playing;
      gameState.trumpInfo = {
        trumpSuit: Suit.Hearts,
        trumpRank: Rank.Two,
      };

      // Find players
      const bot1Player = getPlayerById(gameState, PlayerId.Bot1);
      // Bot1 has trump cards that could form pairs
      bot1Player.hand = [
        ...Card.createPair(Suit.Hearts, Rank.Seven), // Hearts pair (trump suit)
        ...Card.createPair(Suit.Hearts, Rank.Eight), // Hearts pair (trump suit)
        Card.createCard(Suit.Hearts, Rank.Nine, 0), // Single trump
        ...Card.createPair(Suit.Spades, Rank.Two), // Trump rank pair in other suit
        Card.createCard(Suit.Clubs, Rank.Ten, 0),
      ];

      // Human leads with Hearts tractor (trump suit tractor)
      const leadingTractor = [
        ...Card.createPair(Suit.Hearts, Rank.Five),
        ...Card.createPair(Suit.Hearts, Rank.Six),
      ];

      gameState.currentTrick = {
        plays: [{ playerId: PlayerId.Human, cards: leadingTractor }],
        winningPlayerId: PlayerId.Human,
        points: 10,
      };
      gameState.currentPlayerIndex = 1; // Bot1 is at index 1

      gameLogger.info(
        "test_tractor_following_setup",
        { tractor: "5♥-5♥-6♥-6♥" },
        "Human led Hearts tractor: 5♥-5♥-6♥-6♥ (trump suit tractor)",
      );
      gameLogger.info(
        "test_bot_hand_analysis",
        {
          hand: bot1Player.hand.map((card) => `${card.suit}-${card.rank}`),
          heartsPairs: "7♥-7♥ and 8♥-8♥",
        },
        "Bot1 hand and available Hearts pairs",
      );

      // Get AI move - should now be valid
      const aiMove = getAIMove(gameState, PlayerId.Bot1);
      gameLogger.info(
        "test_ai_move_result",
        { cards: aiMove.map((card) => `${card.suit}-${card.rank}`) },
        "AI move result",
      );

      // Check if the move is valid
      const isValid = isValidPlay(
        aiMove,
        bot1Player.hand,
        PlayerId.Bot1,
        gameState,
      );
      gameLogger.info(
        "test_move_validation",
        { isValid },
        "AI move validation result",
      );

      if (isValid) {
        gameLogger.info(
          "test_fix_confirmation",
          {},
          "FIX CONFIRMED: AI now generates VALID moves!",
        );

        // Check if AI properly used pairs instead of singles
        const hasHeartsPairs =
          aiMove.filter((card) => card.suit === Suit.Hearts).length === 4 &&
          aiMove.filter(
            (card) => card.rank === Rank.Seven && card.suit === Suit.Hearts,
          ).length === 2 &&
          aiMove.filter(
            (card) => card.rank === Rank.Eight && card.suit === Suit.Hearts,
          ).length === 2;

        if (hasHeartsPairs) {
          gameLogger.info(
            "test_optimal_play_confirmation",
            { cards: "[7♥, 7♥, 8♥, 8♥]" },
            "PERFECT: AI properly played Hearts pairs as expected!",
          );
        } else {
          gameLogger.warn(
            "test_suboptimal_play_warning",
            {},
            "AI played valid but suboptimal move - might be using trump rank pairs or other valid combination",
          );
        }
      } else {
        gameLogger.error(
          "test_regression_detected",
          {},
          "REGRESSION: AI is still generating invalid moves!",
        );
      }

      // The fix should make AI moves valid
      expect(isValid).toBe(true); // AI move should now be valid!
      expect(aiMove.length).toBe(4); // AI returns correct length

      // Additional verification: AI should prioritize trump suit pairs when available
      const trumpSuitCards = aiMove.filter((card) => card.suit === Suit.Hearts);
      expect(trumpSuitCards.length).toBeGreaterThan(0); // Should use some trump suit cards
    });

    test("AI follows proper hierarchy: tractors > pairs > singles", () => {
      gameLogger.info(
        "test_hierarchy_validation",
        {},
        "TESTING AI HIERARCHY: Tractors > Pairs > Singles",
      );

      const gameState = initializeGame();
      gameState.gamePhase = GamePhase.Playing;
      gameState.trumpInfo = {
        trumpSuit: Suit.Hearts,
        trumpRank: Rank.Two,
      };

      const bot1Player = getPlayerById(gameState, PlayerId.Bot1);
      // Bot1 has a trump tractor available
      bot1Player.hand = [
        ...Card.createPair(Suit.Hearts, Rank.Seven), // Hearts pair
        ...Card.createPair(Suit.Hearts, Rank.Eight), // Hearts pair (consecutive = tractor!)
        Card.createCard(Suit.Hearts, Rank.Nine, 0),
        Card.createCard(Suit.Hearts, Rank.Ten, 0), // Singles
        Card.createCard(Suit.Clubs, Rank.King, 0),
      ];

      // Human leads with non-trump tractor
      const leadingTractor = [
        ...Card.createPair(Suit.Spades, Rank.Five),
        ...Card.createPair(Suit.Spades, Rank.Six),
      ];

      gameState.currentTrick = {
        plays: [{ playerId: PlayerId.Human, cards: leadingTractor }],
        winningPlayerId: PlayerId.Human,
        points: 10,
      };
      gameState.currentPlayerIndex = 1; // Bot1 is at index 1

      gameLogger.info(
        "test_cross_suit_scenario",
        { leadingSuit: "Spades", aiTrumpSuit: "Hearts" },
        "Human led Spades tractor (non-trump), AI has Hearts tractor available",
      );

      const aiMove = getAIMove(gameState, PlayerId.Bot1);
      gameLogger.info(
        "test_ai_hierarchy_move",
        { cards: aiMove.map((card) => `${card.suit}-${card.rank}`) },
        "AI hierarchy test move result",
      );

      const isValid = isValidPlay(
        aiMove,
        bot1Player.hand,
        PlayerId.Bot1,
        gameState,
      );
      gameLogger.info(
        "test_hierarchy_validation_result",
        { isValid },
        "AI hierarchy move validation result",
      );

      // AI should play the trump tractor if possible (7♥-7♥-8♥-8♥)
      const isTrumpTractor =
        aiMove.length === 4 &&
        aiMove.filter(
          (card) => card.rank === Rank.Seven && card.suit === Suit.Hearts,
        ).length === 2 &&
        aiMove.filter(
          (card) => card.rank === Rank.Eight && card.suit === Suit.Hearts,
        ).length === 2;

      if (isTrumpTractor) {
        gameLogger.info(
          "test_trump_tractor_priority",
          {},
          "EXCELLENT: AI prioritized trump tractor over other options!",
        );
      }

      expect(isValid).toBe(true);
      expect(aiMove.length).toBe(4);
    });
  });

  describe("AI Priority Order Compliance", () => {
    test("AI prioritizes tractors over pairs when both available", () => {
      const gameState = initializeGame();
      gameState.gamePhase = GamePhase.Playing;
      gameState.trumpInfo = {
        trumpSuit: Suit.Hearts,
        trumpRank: Rank.Two,
      };

      const bot1Player = getPlayerById(gameState, PlayerId.Bot1);

      // Bot1 has both: consecutive pairs (tractor) AND non-consecutive pairs
      bot1Player.hand = [
        ...Card.createPair(Suit.Spades, Rank.Seven), // Consecutive
        ...Card.createPair(Suit.Spades, Rank.Eight), // pair (tractor)
        ...Card.createPair(Suit.Spades, Rank.Jack), // Non-consecutive
        Card.createCard(Suit.Spades, Rank.Queen, 0), // Single to complete hand
        Card.createCard(Suit.Clubs, Rank.Ace, 0),
      ];

      // Human leads with Spades tractor
      const leadingTractor = [
        ...Card.createPair(Suit.Spades, Rank.Five),
        ...Card.createPair(Suit.Spades, Rank.Six),
      ];

      gameState.currentTrick = {
        plays: [{ playerId: PlayerId.Human, cards: leadingTractor }],
        winningPlayerId: PlayerId.Human,
        points: 0,
      };
      gameState.currentPlayerIndex = 1; // Bot1

      const aiMove = getAIMove(gameState, PlayerId.Bot1);

      // AI should prioritize the tractor (7♠-7♠-8♠-8♠) over non-consecutive pairs
      const playedTractor =
        aiMove.length === 4 &&
        aiMove.filter(
          (card) => card.rank === Rank.Seven && card.suit === Suit.Spades,
        ).length === 2 &&
        aiMove.filter(
          (card) => card.rank === Rank.Eight && card.suit === Suit.Spades,
        ).length === 2;

      expect(playedTractor).toBe(true);
      expect(aiMove.length).toBe(4);

      // Verify all cards are from spades (following suit)
      const allSpades = aiMove.every((card) => card.suit === Suit.Spades);
      expect(allSpades).toBe(true);
    });

    test("AI uses all available pairs when insufficient for tractor", () => {
      const gameState = initializeGame();
      gameState.gamePhase = GamePhase.Playing;
      gameState.trumpInfo = {
        trumpSuit: Suit.Hearts,
        trumpRank: Rank.Two,
      };

      const bot1Player = getPlayerById(gameState, PlayerId.Bot1);
      // Bot1 has only 1 pair + singles in the led suit
      bot1Player.hand = [
        Card.createCard(Suit.Spades, Rank.Seven, 0),
        Card.createCard(Suit.Spades, Rank.Seven, 1), // Only 1 pair
        Card.createCard(Suit.Spades, Rank.Nine, 0),
        Card.createCard(Suit.Spades, Rank.Ten, 0), // Singles
        Card.createCard(Suit.Clubs, Rank.Ace, 0),
        Card.createCard(Suit.Clubs, Rank.King, 0),
      ];

      // Human leads with Spades tractor (needs 2 pairs)
      const leadingTractor = [
        Card.createCard(Suit.Spades, Rank.Five, 0),
        Card.createCard(Suit.Spades, Rank.Five, 1),
        Card.createCard(Suit.Spades, Rank.Six, 0),
        Card.createCard(Suit.Spades, Rank.Six, 1),
      ];

      gameState.currentTrick = {
        plays: [{ playerId: PlayerId.Human, cards: leadingTractor }],
        winningPlayerId: PlayerId.Human,
        points: 0,
      };
      gameState.currentPlayerIndex = 1; // Bot1

      const aiMove = getAIMove(gameState, PlayerId.Bot1);

      // AI should use the 1 available pair + 2 singles from Spades
      const usedPair =
        aiMove.filter(
          (card) => card.rank === Rank.Seven && card.suit === Suit.Spades,
        ).length === 2;
      const usedSpadesSingles =
        aiMove.filter(
          (card) =>
            card.suit === Suit.Spades &&
            [Rank.Nine, Rank.Ten].includes(card.rank),
        ).length === 2;

      expect(usedPair).toBe(true);
      expect(usedSpadesSingles).toBe(true);
      expect(aiMove.length).toBe(4);

      // All cards should be from Spades (following suit)
      const allSpades = aiMove.every((card) => card.suit === Suit.Spades);
      expect(allSpades).toBe(true);
    });
  });

  describe("AI Trump Recognition and Priority", () => {
    test("AI correctly recognizes and prioritizes trump rank pairs", () => {
      const gameState = initializeGame();
      gameState.gamePhase = GamePhase.Playing;
      gameState.trumpInfo = {
        trumpSuit: Suit.Hearts,
        trumpRank: Rank.Two,
      };

      const bot1Player = getPlayerById(gameState, PlayerId.Bot1);

      // Bot1 has trump rank pairs and non-trump pairs
      bot1Player.hand = [
        ...Card.createPair(Suit.Spades, Rank.Two), // Trump rank pair
        ...Card.createPair(Suit.Clubs, Rank.Two), // Trump rank pair
        ...Card.createPair(Suit.Diamonds, Rank.Three), // Non-trump pair
        Card.createCard(Suit.Clubs, Rank.Ace, 0),
      ];

      // Human leads with trump tractor (Hearts trump suit)
      const leadingTrumpTractor = [
        ...Card.createPair(Suit.Hearts, Rank.Five),
        ...Card.createPair(Suit.Hearts, Rank.Six),
      ];

      gameState.currentTrick = {
        plays: [{ playerId: PlayerId.Human, cards: leadingTrumpTractor }],
        winningPlayerId: PlayerId.Human,
        points: 0,
      };
      gameState.currentPlayerIndex = 1; // Bot1

      const aiMove = getAIMove(gameState, PlayerId.Bot1);

      // AI should prioritize trump rank pairs over non-trump pairs
      const usedTrumpRankPairs =
        aiMove.filter((card) => card.rank === Rank.Two).length === 4; // Used both trump rank pairs
      const avoidedNonTrumpPair = !aiMove.some(
        (card) => card.rank === Rank.Three && card.suit === Suit.Diamonds,
      );

      expect(usedTrumpRankPairs).toBe(true);
      expect(avoidedNonTrumpPair).toBe(true);
      expect(aiMove.length).toBe(4);
    });

    test("AI correctly handles mixed trump combinations (suit + rank + joker pairs)", () => {
      const gameState = initializeGame();
      gameState.gamePhase = GamePhase.Playing;
      gameState.trumpInfo = {
        trumpSuit: Suit.Hearts,
        trumpRank: Rank.Two,
      };

      const bot1Player = getPlayerById(gameState, PlayerId.Bot1);

      // Bot1 has mixed trump combinations
      bot1Player.hand = [
        ...Card.createPair(Suit.Hearts, Rank.Seven), // Trump suit pair
        ...Card.createPair(Suit.Spades, Rank.Two), // Trump rank pair
        ...Card.createJokerPair(JokerType.Small), // Joker pair
        Card.createCard(Suit.Clubs, Rank.Ace, 0),
      ];

      // Human leads with trump tractor (3 consecutive pairs = 6 cards)
      const leadingTrumpTractor = [
        ...Card.createPair(Suit.Hearts, Rank.Five),
        ...Card.createPair(Suit.Hearts, Rank.Six),
        ...Card.createPair(Suit.Hearts, Rank.Seven),
      ];

      gameState.currentTrick = {
        plays: [{ playerId: PlayerId.Human, cards: leadingTrumpTractor }],
        winningPlayerId: PlayerId.Human,
        points: 0,
      };
      gameState.currentPlayerIndex = 1; // Bot1

      const aiMove = getAIMove(gameState, PlayerId.Bot1);

      // AI should use all trump pairs (all 3 types of trump pairs)
      const usedTrumpSuitPair =
        aiMove.filter(
          (card) => card.rank === Rank.Seven && card.suit === Suit.Hearts,
        ).length === 2;
      const usedTrumpRankPair =
        aiMove.filter(
          (card) => card.rank === Rank.Two && card.suit === Suit.Spades,
        ).length === 2;
      const usedJokerPair =
        aiMove.filter((card) => card.joker === JokerType.Small).length === 2;

      expect(usedTrumpSuitPair).toBe(true);
      expect(usedTrumpRankPair).toBe(true);
      expect(usedJokerPair).toBe(true);
      expect(aiMove.length).toBe(6);
    });
  });

  describe("AI Cross-Suit Trump Victory Strategy", () => {
    test("AI uses trump tractor to beat non-trump tractor when out of leading suit", () => {
      const gameState = initializeGame();
      gameState.gamePhase = GamePhase.Playing;
      gameState.trumpInfo = {
        trumpSuit: Suit.Hearts,
        trumpRank: Rank.Two,
      };

      const bot1Player = getPlayerById(gameState, PlayerId.Bot1);

      // Bot1 has NO Spades but has a trump tractor
      bot1Player.hand = [
        ...Card.createPair(Suit.Hearts, Rank.Seven), // Trump tractor
        ...Card.createPair(Suit.Hearts, Rank.Eight), // (consecutive pairs)
        Card.createCard(Suit.Clubs, Rank.Ace, 0),
        Card.createCard(Suit.Diamonds, Rank.King, 0),
      ];

      // Human leads with Spades tractor (non-trump)
      const leadingTractor = [
        ...Card.createPair(Suit.Spades, Rank.Five),
        ...Card.createPair(Suit.Spades, Rank.Six),
      ];

      gameState.currentTrick = {
        plays: [{ playerId: PlayerId.Human, cards: leadingTractor }],
        winningPlayerId: PlayerId.Human,
        points: 0,
      };
      gameState.currentPlayerIndex = 1; // Bot1

      const aiMove = getAIMove(gameState, PlayerId.Bot1);

      gameLogger.info(
        "test_cross_suit_trump_debug",
        {
          aiHand: bot1Player.hand.map((c) => `${c.rank}${c.suit}`).join(", "),
          ledTractor: leadingTractor
            .map((c) => `${c.rank}${c.suit}`)
            .join(", "),
          aiSelected: aiMove.map((c) => `${c.rank}${c.suit}`).join(", "),
        },
        "DEBUG: AI Tractor Following Test",
      );

      // AI should use trump tractor to win (same combo type beats non-trump)
      const playedTrumpTractor =
        aiMove.length === 4 &&
        aiMove.filter(
          (card) => card.rank === Rank.Seven && card.suit === Suit.Hearts,
        ).length === 2 &&
        aiMove.filter(
          (card) => card.rank === Rank.Eight && card.suit === Suit.Hearts,
        ).length === 2;

      gameLogger.info(
        "test_trump_tractor_expectation",
        { playedTrumpTractor },
        "Expected trump tractor validation result",
      );
      expect(playedTrumpTractor).toBe(true);
      expect(aiMove.length).toBe(4);

      // All cards should be trump
      const allTrump = aiMove.every((card) => card.suit === Suit.Hearts);
      expect(allTrump).toBe(true);
    });

    test("AI chooses strategic combinations when out of leading suit with no exact match", () => {
      const gameState = initializeGame();
      gameState.gamePhase = GamePhase.Playing;
      gameState.trumpInfo = {
        trumpSuit: Suit.Hearts,
        trumpRank: Rank.Two,
      };

      const bot1Player = getPlayerById(gameState, PlayerId.Bot1);

      // Bot1 has NO Spades and cannot form a tractor (only 1 trump pair + singles)
      bot1Player.hand = [
        ...Card.createPair(Suit.Hearts, Rank.Seven), // Trump pair
        Card.createCard(Suit.Hearts, Rank.Nine, 0),
        Card.createCard(Suit.Hearts, Rank.Ten, 0), // Trump singles
        Card.createCard(Suit.Clubs, Rank.Ace, 0),
        Card.createCard(Suit.Diamonds, Rank.King, 0),
      ];

      // Human leads with Spades tractor
      const leadingTractor = [
        ...Card.createPair(Suit.Spades, Rank.Five),
        ...Card.createPair(Suit.Spades, Rank.Six),
      ];

      gameState.currentTrick = {
        plays: [{ playerId: PlayerId.Human, cards: leadingTractor }],
        winningPlayerId: PlayerId.Human,
        points: 0,
      };
      gameState.currentPlayerIndex = 1; // Bot1

      const aiMove = getAIMove(gameState, PlayerId.Bot1);

      // AI should make a strategic choice (likely use trump cards for advantage)
      expect(aiMove.length).toBe(4);

      // Should prioritize trump cards over non-trump when possible
      const trumpCardCount = aiMove.filter(
        (card) => card.suit === Suit.Hearts,
      ).length;
      expect(trumpCardCount).toBeGreaterThan(0); // Should use some trump cards
    });
  });

  describe("AI 2-Pair Tractor Response Strategy", () => {
    test("AI response to 2-pair trump tractor with mixed trump combinations", () => {
      const gameState = initializeGame();
      gameState.gamePhase = GamePhase.Playing;
      gameState.trumpInfo = {
        trumpSuit: Suit.Hearts,
        trumpRank: Rank.Two,
      };

      const bot1Player = getPlayerById(gameState, PlayerId.Bot1);

      // Bot1 has mixed trump combinations
      bot1Player.hand = [
        Card.createCard(Suit.Hearts, Rank.Seven, 0),
        Card.createCard(Suit.Hearts, Rank.Seven, 1), // Trump suit pair
        Card.createCard(Suit.Spades, Rank.Two, 0),
        Card.createCard(Suit.Spades, Rank.Two, 1), // Trump rank pair
        Card.createJoker(JokerType.Small, 0),
        Card.createJoker(JokerType.Small, 1), // Joker pair
        Card.createCard(Suit.Clubs, Rank.Ace, 0),
      ];

      // Human leads with 2-pair trump tractor (5♥-5♥-6♥-6♥)
      const leadingTrumpTractor = [
        Card.createCard(Suit.Hearts, Rank.Five, 0),
        Card.createCard(Suit.Hearts, Rank.Five, 1),
        Card.createCard(Suit.Hearts, Rank.Six, 0),
        Card.createCard(Suit.Hearts, Rank.Six, 1),
      ];

      gameState.currentTrick = {
        plays: [{ playerId: PlayerId.Human, cards: leadingTrumpTractor }],
        winningPlayerId: PlayerId.Human,
        points: 0,
      };
      gameState.currentPlayerIndex = 1; // Bot1

      const aiMove = getAIMove(gameState, PlayerId.Bot1);

      // Analyze what the AI chose
      const usedTrumpSuitPair =
        aiMove.filter(
          (card) => card.rank === Rank.Seven && card.suit === Suit.Hearts,
        ).length === 2;
      const usedTrumpRankPair =
        aiMove.filter(
          (card) => card.rank === Rank.Two && card.suit === Suit.Spades,
        ).length === 2;
      const usedJokerPair =
        aiMove.filter((card) => card.joker === JokerType.Small).length === 2;

      // Expected: AI should use exactly 2 pairs (4 cards) from its trump combinations
      expect(aiMove.length).toBe(4);

      // All cards should be trump
      const allTrump = aiMove.every(
        (card) =>
          card.suit === Suit.Hearts || card.rank === Rank.Two || card.joker,
      );
      expect(allTrump).toBe(true);

      // Should use exactly 2 pairs worth of cards
      const totalPairs =
        (usedTrumpSuitPair ? 1 : 0) +
        (usedTrumpRankPair ? 1 : 0) +
        (usedJokerPair ? 1 : 0);
      expect(totalPairs).toBe(2);
    });

    test("AI trump pair priority: trump suit > trump rank > jokers", () => {
      const gameState = initializeGame();
      gameState.gamePhase = GamePhase.Playing;
      gameState.trumpInfo = {
        trumpSuit: Suit.Hearts,
        trumpRank: Rank.Two,
      };

      const bot1Player = getPlayerById(gameState, PlayerId.Bot1);
      // Bot1 has multiple trump pairs to choose from
      bot1Player.hand = [
        Card.createCard(Suit.Hearts, Rank.Three, 0),
        Card.createCard(Suit.Hearts, Rank.Three, 1), // Low trump suit pair
        Card.createCard(Suit.Hearts, Rank.Seven, 0),
        Card.createCard(Suit.Hearts, Rank.Seven, 1), // Mid trump suit pair
        ...Card.createPair(Suit.Spades, Rank.Two), // Trump rank pair
        ...Card.createJokerPair(JokerType.Small), // Joker pair
        Card.createCard(Suit.Clubs, Rank.Ace, 0),
      ];

      // Human leads with 2-pair trump tractor
      const leadingTrumpTractor = [
        Card.createCard(Suit.Hearts, Rank.Five, 0),
        Card.createCard(Suit.Hearts, Rank.Five, 1),
        Card.createCard(Suit.Hearts, Rank.Six, 0),
        Card.createCard(Suit.Hearts, Rank.Six, 1),
      ];

      gameState.currentTrick = {
        plays: [{ playerId: PlayerId.Human, cards: leadingTrumpTractor }],
        winningPlayerId: PlayerId.Human,
        points: 0,
      };
      gameState.currentPlayerIndex = 1; // Bot1

      const aiMove = getAIMove(gameState, PlayerId.Bot1);

      // Check which pairs the AI chose
      const usedLowTrumpSuit =
        aiMove.filter(
          (card) => card.rank === Rank.Three && card.suit === Suit.Hearts,
        ).length === 2;
      const usedMidTrumpSuit =
        aiMove.filter(
          (card) => card.rank === Rank.Seven && card.suit === Suit.Hearts,
        ).length === 2;
      const usedTrumpRank =
        aiMove.filter(
          (card) => card.rank === Rank.Two && card.suit === Suit.Spades,
        ).length === 2;
      const usedJokers =
        aiMove.filter((card) => card.joker === JokerType.Small).length === 2;

      // Verify basic requirements
      expect(aiMove.length).toBe(4);
      const allTrump = aiMove.every(
        (card) =>
          card.suit === Suit.Hearts || card.rank === Rank.Two || card.joker,
      );
      expect(allTrump).toBe(true);

      // AI should prioritize trump suit pairs over trump rank pairs and jokers
      const usedTrumpSuitPairs =
        (usedLowTrumpSuit ? 1 : 0) + (usedMidTrumpSuit ? 1 : 0);
      expect(usedTrumpSuitPairs).toBe(2); // Should use both trump suit pairs available
      expect(usedTrumpRank).toBe(false); // Should not use trump rank pair when trump suit available
      expect(usedJokers).toBe(false); // Should not use jokers when trump suit available
    });
  });

  describe("AI Rank-Skip Tractor Recognition", () => {
    test("AI correctly follows rank-skip tractor when trump rank creates gap", () => {
      const gameState = initializeGame();
      gameState.gamePhase = GamePhase.Playing;
      gameState.trumpInfo = {
        trumpSuit: Suit.Clubs,
        trumpRank: Rank.Four, // 4s are trump, creating gap in sequences
      };

      const bot3Player = getPlayerById(gameState, PlayerId.Bot3);

      // Bot3 has diamonds that can form valid tractor responses
      bot3Player.hand = [
        Card.createCard(Suit.Clubs, Rank.Ten, 0), // Trump suit card
        Card.createCard(Suit.Clubs, Rank.Five, 0), // Trump suit card
        Card.createCard(Suit.Clubs, Rank.Nine, 0), // Trump suit card
        Card.createCard(Suit.Clubs, Rank.Ace, 0), // Trump suit card
        Card.createCard(Suit.Clubs, Rank.Ace, 0), // Trump suit card
        Card.createCard(Suit.Clubs, Rank.Jack, 0), // Trump suit card
        Card.createCard(Suit.Diamonds, Rank.Six, 0),
        Card.createCard(Suit.Diamonds, Rank.Seven, 0),
        Card.createCard(Suit.Diamonds, Rank.Eight, 0),
        Card.createCard(Suit.Diamonds, Rank.Nine, 0),
        Card.createCard(Suit.Diamonds, Rank.Nine, 1), // Can form pairs
        Card.createCard(Suit.Diamonds, Rank.Jack, 0),
        Card.createCard(Suit.Diamonds, Rank.Jack, 1), // Can form pairs
        Card.createCard(Suit.Diamonds, Rank.Queen, 0),
        Card.createCard(Suit.Diamonds, Rank.Queen, 1), // Can form pairs
        Card.createCard(Suit.Hearts, Rank.Four, 0), // Trump rank card
        Card.createCard(Suit.Hearts, Rank.Seven, 0),
        Card.createCard(Suit.Hearts, Rank.Eight, 0),
        Card.createCard(Suit.Spades, Rank.Five, 0),
        Card.createCard(Suit.Spades, Rank.Seven, 0),
        Card.createCard(Suit.Spades, Rank.Ace, 0),
        Card.createCard(Suit.Spades, Rank.Queen, 0),
      ];

      // Bot1 leads with rank-skip tractor: 5♦5♦-3♦3♦
      // (5-[4]-3 where trump rank 4 bridges the gap)
      const leadingRankSkipTractor = [
        ...Card.createPair(Suit.Diamonds, Rank.Five),
        ...Card.createPair(Suit.Diamonds, Rank.Three),
      ];

      // Bot2 also plays to match simulation scenario
      const bot2Cards = [
        Card.createCard(Suit.Spades, Rank.Nine, 0),
        Card.createCard(Suit.Spades, Rank.Eight, 0),
        Card.createCard(Suit.Hearts, Rank.Eight, 0),
        Card.createCard(Suit.Hearts, Rank.Three, 0),
      ];

      gameState.currentTrick = {
        plays: [
          { playerId: PlayerId.Bot1, cards: leadingRankSkipTractor },
          { playerId: PlayerId.Human, cards: bot2Cards }, // Bot2 played after Bot1
        ],
        winningPlayerId: PlayerId.Bot1,
        points: 10,
      };
      gameState.currentPlayerIndex = 3; // Bot3 is at index 3

      gameLogger.info(
        "test_rank_skip_tractor_scenario",
        {
          leadingCombo: "5♦5♦-3♦3♦",
          trumpRank: "4",
          trumpSuit: "Clubs",
          playerHand: bot3Player.hand
            .map((c) => `${c.rank}${c.suit}`)
            .join(", "),
        },
        "Rank-skip tractor scenario: 5♦5♦-3♦3♦ with trump rank 4 creating gap",
      );

      const aiMove = getAIMove(gameState, PlayerId.Bot3);

      gameLogger.info(
        "test_ai_rank_skip_response",
        {
          aiMove: aiMove.map((c) => `${c.rank}${c.suit}`).join(", "),
          moveLength: aiMove.length,
        },
        "AI response to rank-skip tractor",
      );

      // Verify the move is valid
      const isValid = isValidPlay(
        aiMove,
        bot3Player.hand,
        PlayerId.Bot3,
        gameState,
      );

      expect(isValid).toBe(true);
      expect(aiMove.length).toBe(4);

      // AI should use diamonds to follow suit when possible
      const diamondCards = aiMove.filter((card) => card.suit === Suit.Diamonds);

      // If AI uses diamonds, it should form a valid tractor (consecutive pairs)
      if (diamondCards.length === 4) {
        // Check if AI formed a proper tractor from diamonds
        const jackCount = aiMove.filter(
          (card) => card.rank === Rank.Jack && card.suit === Suit.Diamonds,
        ).length;
        const queenCount = aiMove.filter(
          (card) => card.rank === Rank.Queen && card.suit === Suit.Diamonds,
        ).length;

        // Should have formed exactly 1 tractor (consecutive pairs)
        const hasValidTractor = jackCount === 2 && queenCount === 2; // J♦J♦-Q♦Q♦ tractor (consecutive)

        expect(hasValidTractor).toBe(true);

        gameLogger.info(
          "test_rank_skip_success",
          { usedDiamondTractor: true },
          "SUCCESS: AI correctly formed diamond tractor for rank-skip tractor",
        );
      } else {
        // If AI couldn't use diamonds, should be due to exhaustion or trump strategy
        gameLogger.info(
          "test_rank_skip_fallback",
          {
            diamondCount: diamondCards.length,
            trumpUsed:
              aiMove.filter(
                (card) => card.suit === Suit.Clubs || card.rank === Rank.Four,
              ).length > 0,
          },
          "AI used non-diamond strategy (trump or mixed suits)",
        );
      }
    });
  });

  describe("AI Strategic Decision Making", () => {
    test("AI conserves high trump when cannot win but uses trump when leading is trump", () => {
      const gameState = initializeGame();
      gameState.gamePhase = GamePhase.Playing;
      gameState.trumpInfo = {
        trumpSuit: Suit.Hearts,
        trumpRank: Rank.Two,
      };

      const bot1Player = getPlayerById(gameState, PlayerId.Bot1);

      // Bot1 has trump cards but cannot beat a high trump tractor
      bot1Player.hand = [
        ...Card.createPair(Suit.Hearts, Rank.Three), // Low trump pair
        ...Card.createPair(Suit.Hearts, Rank.Four), // Low trump pair
        Card.createCard(Suit.Hearts, Rank.Five, 0), // Low trump single
        Card.createCard(Suit.Clubs, Rank.Ace, 0),
      ];

      // Human leads with high trump tractor (A♥-A♥-K♥-K♥)
      const leadingHighTrumpTractor = [
        ...Card.createPair(Suit.Hearts, Rank.Ace),
        ...Card.createPair(Suit.Hearts, Rank.King),
      ];

      gameState.currentTrick = {
        plays: [{ playerId: PlayerId.Human, cards: leadingHighTrumpTractor }],
        winningPlayerId: PlayerId.Human,
        points: 0,
      };
      gameState.currentPlayerIndex = 1; // Bot1

      const aiMove = getAIMove(gameState, PlayerId.Bot1);

      // AI should use trump cards (rule: must follow trump) but use low ones
      expect(aiMove.length).toBe(4);

      // All cards should be trump (following trump lead)
      const allTrump = aiMove.every((card) => card.suit === Suit.Hearts);
      expect(allTrump).toBe(true);

      // Should use pairs when available (proper tractor following)
      const usedPairs =
        aiMove.filter((card) => card.rank === Rank.Three).length === 2 &&
        aiMove.filter((card) => card.rank === Rank.Four).length === 2;
      expect(usedPairs).toBe(true);
    });
  });

  describe("Bug Reproduction: Emergency Fallback Critical", () => {
    test("reproduces exact scenario from game log with hand order from log", () => {
      // Exact reproduction test for the bug where AI selects invalid combination
      // Hand order from log: "8♠","9♠","6♣","3♠","6♣","7♣","7♠","K♦","4♣","5♠","SJ","7♣","4♣"
      const gameState = initializeGame();

      // Set exact conditions from log
      gameState.currentPlayerIndex = 1; // Bot1's turn
      gameState.gamePhase = GamePhase.Playing;
      gameState.roundNumber = 3;

      // Set exact trump info from log
      gameState.trumpInfo = {
        trumpRank: Rank.Three,
        trumpSuit: Suit.Clubs,
      };

      // Set Bot1's exact hand from log in exact order
      const bot1Player = getPlayerById(gameState, PlayerId.Bot1);
      bot1Player.hand = [
        Card.createCard(Suit.Spades, Rank.Eight, 0), // 8♠
        Card.createCard(Suit.Spades, Rank.Nine, 0), // 9♠
        Card.createCard(Suit.Clubs, Rank.Six, 0), // 6♣
        Card.createCard(Suit.Spades, Rank.Three, 0), // 3♠ (trump rank)
        Card.createCard(Suit.Clubs, Rank.Six, 1), // 6♣ (second copy)
        Card.createCard(Suit.Clubs, Rank.Seven, 0), // 7♣
        Card.createCard(Suit.Spades, Rank.Seven, 0), // 7♠
        Card.createCard(Suit.Diamonds, Rank.King, 0), // K♦
        Card.createCard(Suit.Clubs, Rank.Four, 0), // 4♣
        Card.createCard(Suit.Spades, Rank.Five, 0), // 5♠
        Card.createJoker(JokerType.Small, 0), // SJ
        Card.createCard(Suit.Clubs, Rank.Seven, 1), // 7♣ (second copy)
        Card.createCard(Suit.Clubs, Rank.Four, 1), // 4♣ (second copy)
      ];

      // Set exact current trick from log: Bot3 leads 9♣9♣8♣8♣, Human follows K♣K♣10♣10♣
      gameState.currentTrick = {
        plays: [
          {
            playerId: PlayerId.Bot3,
            cards: [
              ...Card.createPair(Suit.Clubs, Rank.Nine), // 9♣9♣
              ...Card.createPair(Suit.Clubs, Rank.Eight), // 8♣8♣
            ],
          },
          {
            playerId: PlayerId.Human,
            cards: [
              ...Card.createPair(Suit.Clubs, Rank.King), // K♣K♣
              ...Card.createPair(Suit.Clubs, Rank.Ten), // 10♣10♣
            ],
          },
        ],
        winningPlayerId: PlayerId.Bot3, // From log (current winner)
        points: 40,
        isFinalTrick: false,
      };

      gameLogger.info(
        "bug_reproduction_test",
        {
          handOrder: bot1Player.hand.map((c) => c.getDisplayName()),
          leadingTractor: "9♣9♣8♣8♣",
          expectedTractor: "6♣6♣7♣7♣",
          trumpInfo: gameState.trumpInfo,
        },
        "Reproducing exact scenario from game log",
      );

      // Get AI move
      const aiMove = getAIMove(gameState, PlayerId.Bot1);

      gameLogger.info(
        "bug_reproduction_result",
        {
          aiSelected: aiMove.map((c) => c.getDisplayName()),
          expectedValid: ["6♣", "6♣", "7♣", "7♣"],
        },
        "AI move result from exact reproduction",
      );

      // Verify the move is valid
      const isValid = isValidPlay(
        aiMove,
        bot1Player.hand,
        PlayerId.Bot1,
        gameState,
      );

      expect(isValid).toBe(true);
      expect(aiMove.length).toBe(4);

      // The AI should select the trump tractor 6♣6♣7♣7♣
      const aiMoveNames = aiMove.map((c) => c.getDisplayName()).sort();
      const expectedTractor = ["6♣", "6♣", "7♣", "7♣"].sort();

      // Log the comparison for debugging
      gameLogger.info(
        "bug_reproduction_expectation",
        {
          expected: expectedTractor,
          actual: aiMoveNames,
          match:
            JSON.stringify(aiMoveNames) === JSON.stringify(expectedTractor),
        },
        "Expected vs actual move comparison",
      );

      expect(aiMoveNames).toEqual(expectedTractor);
    });
  });
});
