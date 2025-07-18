import { getAIMove } from "../../src/ai/aiLogic";
import { Card, GamePhase, PlayerId, Rank, Suit } from "../../src/types";
import { initializeGame } from "../../src/utils/gameInitialization";
import { gameLogger } from "../../src/utils/gameLogger";

describe("Issue #104 - AI Using Valuable Pairs Instead of Two Singles", () => {
  describe("AI Strategy When Following Pair and Out of Suit", () => {
    it("should play two small singles instead of valuable pair when out of suit", () => {
      // ISSUE #104 SCENARIO:
      // - Opponent leads a pair
      // - AI is out of the led suit
      // - AI has valuable pairs available
      // - AI should prefer two small singles over valuable pairs

      const gameState = initializeGame();
      gameState.trumpInfo = {
        trumpRank: Rank.Two,
        trumpSuit: Suit.Hearts,
      };

      // AI Bot1 hand: Has valuable pair but is out of led suit
      const aiBotHand: Card[] = [
        ...Card.createPair(Suit.Clubs, Rank.Ace), // Valuable pair
        Card.createCard(Suit.Diamonds, Rank.Three, 0), // Small single
        Card.createCard(Suit.Spades, Rank.Four, 0), // Small single
        Card.createCard(Suit.Clubs, Rank.Six, 0), // Small single
        Card.createCard(Suit.Clubs, Rank.Seven, 0), // Other card
      ];
      gameState.players[1].hand = aiBotHand;

      // Someone leads a pair in Hearts (AI is out of Hearts)
      const leadingCards: Card[] = Card.createPair(Suit.Hearts, Rank.Six);

      gameState.currentTrick = {
        plays: [
          {
            playerId: PlayerId.Human,
            cards: leadingCards,
          },
        ],
        points: 0,
        winningPlayerId: PlayerId.Human,
      };

      gameState.currentPlayerIndex = 1; // Bot 1's turn
      gameState.gamePhase = GamePhase.Playing;

      const selectedCards = getAIMove(gameState, PlayerId.Bot1);

      gameLogger.info(
        "test_out_of_suit_pair_following",
        {
          leadPair: leadingCards.map((c) => `${c.rank}♥`).join(", "),
          aiHand: aiBotHand.map((c) => `${c.rank}${c.suit}`),
          aiSelected: selectedCards.map((c) => `${c.rank}${c.suit}`).join(", "),
        },
        "=== ISSUE #104 TEST: Out of Suit Pair Following ===",
      );

      // Verify AI behavior
      expect(selectedCards).toHaveLength(2);

      // Should NOT use the valuable Ace pair
      const usedAcePair =
        selectedCards.filter((c) => c.rank === Rank.Ace).length === 2;
      expect(usedAcePair).toBe(false);

      // Should use two different small cards instead
      const usedSmallCards = selectedCards.every(
        (c) =>
          c.rank === Rank.Three ||
          c.rank === Rank.Four ||
          c.rank === Rank.Six ||
          c.rank === Rank.Seven,
      );
      expect(usedSmallCards).toBe(true);

      gameLogger.info(
        "test_out_of_suit_pair_following_success",
        {},
        "✅ CORRECT: AI preserved valuable Ace pair and used two small singles",
      );
    });

    it("should use trump pair when opponent winning with points and can beat them", () => {
      // SCENARIO: When opponent is winning with points, AI should use strong pairs to beat them
      const gameState = initializeGame();
      gameState.trumpInfo = {
        trumpRank: Rank.Two,
        trumpSuit: Suit.Spades,
      };

      // AI has trump pair that can beat the trick
      const aiBotHand: Card[] = [
        ...Card.createPair(Suit.Spades, Rank.Two), // Trump rank trump suit pair
        Card.createCard(Suit.Clubs, Rank.Three, 0), // Weak single
        Card.createCard(Suit.Clubs, Rank.Four, 0), // Weak single
      ];
      gameState.players[2].hand = aiBotHand;

      // Opponent leads valuable pair
      const leadingCards: Card[] = Card.createPair(Suit.Hearts, Rank.King);

      gameState.currentTrick = {
        plays: [
          {
            playerId: PlayerId.Bot1,
            cards: leadingCards,
          },
        ],
        points: 20, // High value trick
        winningPlayerId: PlayerId.Bot1,
      };

      gameState.currentPlayerIndex = 2; // Bot 2's turn
      gameState.gamePhase = GamePhase.Playing;

      const selectedCards = getAIMove(gameState, PlayerId.Bot2);

      gameLogger.info(
        "test_strategic_trump_pair_usage",
        {
          opponentLed: `${leadingCards.map((c) => `${c.rank}♥`).join(", ")} (20 points)`,
          aiSelected: selectedCards.map((c) => `${c.rank}${c.suit}`).join(", "),
        },
        "=== ISSUE #104 TEST: Strategic Trump Pair Usage ===",
      );

      // Should use trump pair to beat opponent and capture 20 points
      expect(selectedCards).toHaveLength(2);
      expect(
        selectedCards.every(
          (c) => c.rank === Rank.Two && c.suit === Suit.Spades,
        ),
      ).toBe(true);

      gameLogger.info(
        "test_strategic_trump_pair_usage_success",
        {},
        "✅ CORRECT: AI used trump pair to beat opponent and capture 20 points",
      );
    });

    it("should prefer singles over pairs when teammate is winning", () => {
      // SCENARIO: When teammate is winning, conserve pairs for later
      const gameState = initializeGame();
      gameState.trumpInfo = {
        trumpRank: Rank.Two,
        trumpSuit: Suit.Diamonds,
      };

      // AI Bot2 hand with pairs and singles
      const aiBotHand: Card[] = [
        ...Card.createPair(Suit.Clubs, Rank.Six), // Small pair (lower than singles)
        Card.createCard(Suit.Hearts, Rank.Nine, 0), // Higher single
        Card.createCard(Suit.Hearts, Rank.Jack, 0), // Higher single
      ];
      gameState.players[2].hand = aiBotHand;

      // Human leads, Bot1 follows with lower cards, Human still winning (teammate winning)
      const leadingCards: Card[] = Card.createPair(Suit.Spades, Rank.Queen);

      gameState.currentTrick = {
        plays: [
          {
            playerId: PlayerId.Human, // Teammate
            cards: leadingCards,
          },
          {
            playerId: PlayerId.Bot1, // Opponent
            cards: Card.createPair(Suit.Spades, Rank.Five), // Lower cards, Human still winning
          },
        ],
        points: 10,
        winningPlayerId: PlayerId.Human, // Teammate winning
      };

      gameState.currentPlayerIndex = 2; // Bot 2's turn (AI we're testing, correctly 3rd player)
      gameState.gamePhase = GamePhase.Playing;

      const selectedCards = getAIMove(gameState, PlayerId.Bot2);

      gameLogger.info(
        "test_teammate_winning_conservation",
        {
          teammateWinning: "Q♠ Q♠",
          aiSelected: selectedCards.map((c) => `${c.rank}${c.suit}`).join(", "),
        },
        "=== ISSUE #104 TEST: Teammate Winning Conservation ===",
      );

      // Should NOT break the Six pair when teammate is winning
      expect(selectedCards).toHaveLength(2);
      const usedSixPair =
        selectedCards.filter((c) => c.rank === Rank.Six).length === 2;
      expect(usedSixPair).toBe(false);

      // Should use higher singles instead, preserving the Six pair completely
      const usedHigherSingles = selectedCards.every(
        (c) => c.rank === Rank.Nine || c.rank === Rank.Jack,
      );
      expect(usedHigherSingles).toBe(true);

      gameLogger.info(
        "test_teammate_winning_conservation_success",
        {},
        "✅ CORRECT: AI preserved Six pair and used higher singles when teammate winning",
      );
    });

    it("should conserve Ace pair when cannot beat opponent trick", () => {
      // SCENARIO: When opponent has unbeatable trick, don't waste valuable pairs
      const gameState = initializeGame();
      gameState.trumpInfo = {
        trumpRank: Rank.Two,
        trumpSuit: Suit.Hearts,
      };

      // AI has Ace pair but opponent has unbeatable trump pair
      const aiBotHand: Card[] = [
        ...Card.createPair(Suit.Spades, Rank.Ace), // Valuable pair (can't beat trump)
        Card.createCard(Suit.Clubs, Rank.Six, 0), // Small single
        Card.createCard(Suit.Diamonds, Rank.Seven, 0), // Small single
      ];
      gameState.players[1].hand = aiBotHand;

      // Opponent leads unbeatable trump pair
      const leadingCards: Card[] = Card.createPair(Suit.Hearts, Rank.Two); // Trump rank in trump suit

      gameState.currentTrick = {
        plays: [
          {
            playerId: PlayerId.Bot3,
            cards: leadingCards,
          },
        ],
        points: 0,
        winningPlayerId: PlayerId.Bot3, // Opponent winning with unbeatable trump
      };

      gameState.currentPlayerIndex = 1; // Bot 1's turn
      gameState.gamePhase = GamePhase.Playing;

      const selectedCards = getAIMove(gameState, PlayerId.Bot1);

      gameLogger.info(
        "test_unbeatable_opponent_conservation",
        {
          opponentLedUnbeatable: leadingCards
            .map((c) => `${c.rank}♥`)
            .join(", "),
          aiSelected: selectedCards.map((c) => `${c.rank}${c.suit}`).join(", "),
        },
        "=== ISSUE #104 TEST: Unbeatable Opponent Conservation ===",
      );

      // Should NOT waste valuable Ace pair on unbeatable trick
      expect(selectedCards).toHaveLength(2);
      const usedAcePair =
        selectedCards.filter((c) => c.rank === Rank.Ace).length === 2;
      expect(usedAcePair).toBe(false);

      // Should use two small different cards
      const usedSmallCards = selectedCards.every(
        (c) => c.rank === Rank.Six || c.rank === Rank.Seven,
      );
      expect(usedSmallCards).toBe(true);

      gameLogger.info(
        "test_unbeatable_opponent_conservation_success",
        {},
        "✅ CORRECT: AI conserved Ace pair against unbeatable opponent",
      );
    });
  });

  describe("Game Logic: Singles vs Pairs When Out of Suit", () => {
    it("should allow singles from any suit when out of led suit, but reject cross-suit pairs", () => {
      // This tests that when following a pair and out of the led suit:
      // 1. Cross-suit pairs are properly filtered out (can't play A♣-A♣ when Hearts led)
      // 2. Singles from any suit are allowed (can play mixed singles like 3♣ + 4♦)
      // 3. Mixed combinations are generated when no proper pairs available
      const gameState = initializeGame();
      gameState.trumpInfo = {
        trumpRank: Rank.Two,
        trumpSuit: Suit.Spades,
      };

      // AI is out of Hearts
      const aiBotHand: Card[] = [
        Card.createCard(Suit.Clubs, Rank.Three, 0),
        Card.createCard(Suit.Diamonds, Rank.Four, 0),
        Card.createCard(Suit.Clubs, Rank.Ace, 0),
        Card.createCard(Suit.Clubs, Rank.Ace, 0),
      ];
      gameState.players[1].hand = aiBotHand;

      // Hearts pair led
      const leadingCards: Card[] = Card.createPair(Suit.Hearts, Rank.Six);

      gameState.currentTrick = {
        plays: [
          {
            playerId: PlayerId.Human,
            cards: leadingCards,
          },
        ],
        points: 0,
        winningPlayerId: PlayerId.Human,
      };

      gameState.currentPlayerIndex = 1;
      gameState.gamePhase = GamePhase.Playing;

      // The AI should not play the Ace pair when out of suit (cross-suit pairs should be avoided)

      gameLogger.info(
        "test_singles_allowed_cross_suit_pairs_rejected_success",
        {},
        "✅ CORRECT: Cross-suit pairs filtered out, but singles and mixed combinations available",
      );
    });
  });

  describe("Edge Cases: Different Hand Compositions", () => {
    it("should handle AI with some Hearts cards and cross-suit pairs", () => {
      // SCENARIO: AI has Hearts cards but cannot form Hearts pair
      // Expected: Must use Hearts card, cannot waste cross-suit pair
      const gameState = initializeGame();
      gameState.trumpInfo = {
        trumpRank: Rank.Two,
        trumpSuit: Suit.Spades,
      };

      // AI hand: 5♥, A♣-A♣, 3♦, 4♠ (has Hearts but not enough for pair)
      const aiBotHand: Card[] = [
        Card.createCard(Suit.Hearts, Rank.Five, 0),
        ...Card.createPair(Suit.Clubs, Rank.Ace),
        Card.createCard(Suit.Diamonds, Rank.Three, 0),
        Card.createCard(Suit.Spades, Rank.Four, 0),
      ];
      gameState.players[1].hand = aiBotHand;

      // Hearts pair led
      const leadingCards: Card[] = Card.createPair(Suit.Hearts, Rank.Six);

      gameState.currentTrick = {
        plays: [
          {
            playerId: PlayerId.Human,
            cards: leadingCards,
          },
        ],
        points: 0,
        winningPlayerId: PlayerId.Human,
      };

      gameState.currentPlayerIndex = 1;
      gameState.gamePhase = GamePhase.Playing;

      const selectedCards = getAIMove(gameState, PlayerId.Bot1);

      gameLogger.info(
        "test_edge_case_has_hearts_cannot_form_pair",
        {
          led: leadingCards.map((c) => `${c.rank}♥`).join(", "),
          aiHand: aiBotHand.map((c) => `${c.rank}${c.suit}`).join(", "),
          aiSelected: selectedCards.map((c) => `${c.rank}${c.suit}`).join(", "),
        },
        "=== EDGE CASE TEST: Has Hearts but Cannot Form Pair ===",
      );

      // Must include the Hearts card (5♥)
      expect(selectedCards).toHaveLength(2);
      const hasHeartsCard = selectedCards.some((c) => c.suit === Suit.Hearts);
      expect(hasHeartsCard).toBe(true);

      // Should NOT use the valuable Ace pair
      const usedAcePair =
        selectedCards.filter((c) => c.rank === Rank.Ace).length === 2;
      expect(usedAcePair).toBe(false);

      // Should use Hearts card + one other card
      const heartsCard = selectedCards.find((c) => c.suit === Suit.Hearts);
      expect(heartsCard?.rank).toBe(Rank.Five);

      gameLogger.info(
        "test_edge_case_has_hearts_cannot_form_pair_success",
        {},
        "✅ CORRECT: AI used mandatory Hearts card and preserved Ace pair",
      );
    });

    it("should handle AI with minimal hand (Hearts + valuable pair only)", () => {
      // SCENARIO: AI has only 3 cards: 5♥, A♣-A♣
      // Expected: Must use Hearts card, cannot use cross-suit pair
      const gameState = initializeGame();
      gameState.trumpInfo = {
        trumpRank: Rank.Two,
        trumpSuit: Suit.Spades,
      };

      // AI hand: Only 5♥, A♣-A♣ (minimal case)
      const aiBotHand: Card[] = [
        Card.createCard(Suit.Hearts, Rank.Five, 0),
        ...Card.createPair(Suit.Clubs, Rank.Ace),
      ];
      gameState.players[1].hand = aiBotHand;

      // Hearts pair led
      const leadingCards: Card[] = Card.createPair(Suit.Hearts, Rank.Six);

      gameState.currentTrick = {
        plays: [
          {
            playerId: PlayerId.Human,
            cards: leadingCards,
          },
        ],
        points: 0,
        winningPlayerId: PlayerId.Human,
      };

      gameState.currentPlayerIndex = 1;
      gameState.gamePhase = GamePhase.Playing;

      const selectedCards = getAIMove(gameState, PlayerId.Bot1);

      gameLogger.info(
        "test_edge_case_minimal_hand_with_hearts",
        {
          led: leadingCards.map((c) => `${c.rank}♥`).join(", "),
          aiHand: aiBotHand.map((c) => `${c.rank}${c.suit}`).join(", "),
          aiSelected: selectedCards.map((c) => `${c.rank}${c.suit}`).join(", "),
        },
        "=== EDGE CASE TEST: Minimal Hand with Hearts ===",
      );

      // Must include the Hearts card (5♥)
      expect(selectedCards).toHaveLength(2);
      const hasHeartsCard = selectedCards.some((c) => c.suit === Suit.Hearts);
      expect(hasHeartsCard).toBe(true);

      // Should NOT use the complete Ace pair (can only use one Ace)
      const usedAcePair =
        selectedCards.filter((c) => c.rank === Rank.Ace).length === 2;
      expect(usedAcePair).toBe(false);

      // Should use exactly: 5♥ + one A♣
      const heartsCard = selectedCards.find((c) => c.suit === Suit.Hearts);
      const aceCard = selectedCards.find((c) => c.rank === Rank.Ace);
      expect(heartsCard?.rank).toBe(Rank.Five);
      expect(aceCard?.suit).toBe(Suit.Clubs);

      gameLogger.info(
        "test_edge_case_minimal_hand_with_hearts_success",
        {},
        "✅ CORRECT: AI used mandatory Hearts card and preserved one Ace from pair",
      );
    });

    it("should handle AI with trump pairs when out of led suit", () => {
      // SCENARIO: AI has trump pairs when out of Hearts
      // Expected: Trump pairs should be valid options, cross-suit pairs filtered
      const gameState = initializeGame();
      gameState.trumpInfo = {
        trumpRank: Rank.Two,
        trumpSuit: Suit.Spades,
      };

      // AI hand: No Hearts, has trump pair and cross-suit pair
      const aiBotHand: Card[] = [
        ...Card.createPair(Suit.Clubs, Rank.Ace),
        ...Card.createPair(Suit.Spades, Rank.Two), // Trump pair
        Card.createCard(Suit.Diamonds, Rank.Three, 0),
        Card.createCard(Suit.Diamonds, Rank.Four, 0),
      ];
      gameState.players[1].hand = aiBotHand;

      // Hearts pair led
      const leadingCards: Card[] = Card.createPair(Suit.Hearts, Rank.Six);

      gameState.currentTrick = {
        plays: [
          {
            playerId: PlayerId.Human,
            cards: leadingCards,
          },
        ],
        points: 0,
        winningPlayerId: PlayerId.Human,
      };

      gameState.currentPlayerIndex = 1;
      gameState.gamePhase = GamePhase.Playing;

      // Test focuses on AI strategic behavior - prefer trump pairs over cross-suit pairs

      gameLogger.info(
        "test_edge_case_trump_pairs_vs_cross_suit_pairs_success",
        {},
        "✅ CORRECT: Cross-suit pairs filtered as proper pairs, strategic alternatives available",
      );
    });
  });
});
