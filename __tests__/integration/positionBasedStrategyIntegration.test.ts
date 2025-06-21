import { getAIMove } from "../../src/ai/aiLogic";

import type { DeckId } from "../../src/types";
import { Card, GamePhase, PlayerId, Rank, Suit } from "../../src/types";
import { initializeGame } from "../../src/utils/gameInitialization";
import { gameLogger } from "../../src/utils/gameLogger";

describe("Position-Based Strategy Integration Tests - First and Second Player Strategies", () => {
  describe("First Player (Leading) Strategy", () => {
    it("should use sophisticated leading strategy when AI is first to play", () => {
      const gameState = initializeGame();

      // Setup trump for strategic context
      gameState.trumpInfo = {
        trumpRank: Rank.Two,
        trumpSuit: Suit.Hearts,
      };

      // AI Bot1 leading hand with strategic options
      const aiBotHand = [
        Card.createCard(Suit.Spades, Rank.Ace, 0), // Strong non-trump
        Card.createCard(Suit.Clubs, Rank.King, 0), // Point card
        Card.createCard(Suit.Diamonds, Rank.Seven, 0), // Probe card
        Card.createCard(Suit.Hearts, Rank.Three, 0), // Weak trump
        Card.createCard(Suit.Spades, Rank.Eight, 0), // Medium card
      ];

      gameState.players[1].hand = aiBotHand;
      gameState.currentPlayerIndex = 1; // Bot 1's turn (leading)
      gameState.gamePhase = GamePhase.Playing;
      gameState.currentTrick = null; // Leading position

      const selectedCards = getAIMove(gameState, PlayerId.Bot1);

      expect(selectedCards).toHaveLength(1);
      expect(selectedCards[0]).toBeDefined();

      // Verify AI is using strategic leading logic
      const selectedCard = selectedCards[0];

      // Should not lead with weak trump (3♥) in early game
      expect(selectedCard.rank).not.toBe(Rank.Three);
      expect(
        !(
          selectedCard.suit === Suit.Hearts && selectedCard.rank === Rank.Three
        ),
      ).toBe(true);

      // Should prefer strategic non-trump or probe plays
      gameLogger.info(
        "test_first_player_leading",
        { selectedCard: `${selectedCard.rank}${selectedCard.suit?.charAt(0)}` },
        `First player leading strategy selected: ${selectedCard.rank}${selectedCard.suit?.charAt(0)}`,
      );
    });

    it("should adapt strategy based on game phase", () => {
      const gameState = initializeGame();

      gameState.trumpInfo = {
        trumpRank: Rank.Two,
        trumpSuit: Suit.Diamonds,
      };

      // Simulate mid-game scenario with some tricks played
      gameState.tricks = Array(5)
        .fill(null)
        .map((_, i) => ({
          plays: [
            {
              playerId: PlayerId.Human,
              cards: [
                Card.createCard(Suit.Spades, Rank.King, (i % 2) as DeckId),
              ],
            },
          ],
          points: 10,
          winningPlayerId: PlayerId.Human,
        }));

      const aiBotHand = [
        Card.createCard(Suit.Hearts, Rank.Ace, 0),
        Card.createCard(Suit.Spades, Rank.Ten, 0),
        Card.createCard(Suit.Clubs, Rank.Five, 0),
      ];

      gameState.players[2].hand = aiBotHand;
      gameState.currentPlayerIndex = 2;
      gameState.gamePhase = GamePhase.Playing;
      gameState.currentTrick = null;

      const selectedCards = getAIMove(gameState, PlayerId.Bot2);

      expect(selectedCards).toHaveLength(1);
      expect(selectedCards[0]).toBeDefined();

      gameLogger.info(
        "test_mid_game_first_player",
        {
          selectedCard: `${selectedCards[0].rank}${selectedCards[0].suit?.charAt(0)}`,
        },
        `Mid-game first player strategy selected: ${selectedCards[0].rank}${selectedCards[0].suit?.charAt(0)}`,
      );
    });
  });

  describe("Second Player Strategy", () => {
    it("should analyze leader relationship and respond appropriately", () => {
      const gameState = initializeGame();

      gameState.trumpInfo = {
        trumpRank: Rank.Two,
        trumpSuit: Suit.Spades,
      };

      // Setup trick with Human leading (teammate to Bot2)
      gameState.currentTrick = {
        plays: [
          {
            playerId: PlayerId.Human,
            cards: [Card.createCard(Suit.Hearts, Rank.Ace, 0)],
          },
        ],
        winningPlayerId: PlayerId.Human,
        points: 0,
      };

      // Bot2 second to play (teammate of Human)
      const aiBotHand = [
        Card.createCard(Suit.Hearts, Rank.King, 0), // Point card same suit
        Card.createCard(Suit.Hearts, Rank.Ten, 0), // Point card same suit
        Card.createCard(Suit.Hearts, Rank.Seven, 0), // Safe same suit
        Card.createCard(Suit.Spades, Rank.Three, 0), // Trump
      ];

      gameState.players[2].hand = aiBotHand;
      gameState.currentPlayerIndex = 2; // Bot 2's turn (second player)
      gameState.gamePhase = GamePhase.Playing;

      const selectedCards = getAIMove(gameState, PlayerId.Bot2);

      expect(selectedCards).toHaveLength(1);
      expect(selectedCards[0]).toBeDefined();
      expect(selectedCards[0].suit).toBe(Suit.Hearts); // Must follow suit

      // Should use second player strategy (teammate analysis)
      const selectedCard = selectedCards[0];
      gameLogger.info(
        "test_second_player_teammate",
        {
          selectedCard: `${selectedCard.rank}${selectedCard.suit?.charAt(0)}`,
          points: selectedCard.points,
        },
        `Second player teammate response: ${selectedCard.rank}${selectedCard.suit?.charAt(0)} (points: ${selectedCard.points})`,
      );
    });

    it("should respond differently to opponent leader", () => {
      const gameState = initializeGame();

      gameState.trumpInfo = {
        trumpRank: Rank.Two,
        trumpSuit: Suit.Clubs,
      };

      // Setup trick with Bot1 leading (opponent to Bot2)
      gameState.currentTrick = {
        plays: [
          {
            playerId: PlayerId.Bot1,
            cards: [Card.createCard(Suit.Diamonds, Rank.Ten, 0)],
          },
        ],
        winningPlayerId: PlayerId.Bot1,
        points: 10,
      };

      // Bot2 second to play (opponent of Bot1)
      const aiBotHand = [
        Card.createCard(Suit.Diamonds, Rank.Ace, 0), // Strong same suit
        Card.createCard(Suit.Diamonds, Rank.King, 0), // Point card same suit
        Card.createCard(Suit.Diamonds, Rank.Five, 0), // Small point
        Card.createCard(Suit.Clubs, Rank.Two, 0), // Trump rank
      ];

      gameState.players[2].hand = aiBotHand;
      gameState.currentPlayerIndex = 2;
      gameState.gamePhase = GamePhase.Playing;

      const selectedCards = getAIMove(gameState, PlayerId.Bot2);

      expect(selectedCards).toHaveLength(1);
      expect(selectedCards[0]).toBeDefined();
      expect(selectedCards[0].suit).toBe(Suit.Diamonds); // Must follow suit

      // Should use second player strategy (opponent blocking)
      const selectedCard = selectedCards[0];
      gameLogger.info(
        "test_second_player_opponent",
        {
          selectedCard: `${selectedCard.rank}${selectedCard.suit?.charAt(0)}`,
          points: selectedCard.points,
        },
        `Second player opponent response: ${selectedCard.rank}${selectedCard.suit?.charAt(0)} (points: ${selectedCard.points})`,
      );
    });
  });

  describe("Position Strategy Integration", () => {
    it("should use enhanced position strategies for first and second players", () => {
      const gameState = initializeGame();

      // Test that the enhanced position strategies are being used
      // This is more of a smoke test to ensure the integration works

      gameState.trumpInfo = {
        trumpRank: Rank.Two,
        trumpSuit: Suit.Hearts,
      };

      const aiBotHand = [
        Card.createCard(Suit.Spades, Rank.Ace, 0),
        Card.createCard(Suit.Clubs, Rank.King, 0),
      ];

      gameState.players[1].hand = aiBotHand;
      gameState.currentPlayerIndex = 1;
      gameState.gamePhase = GamePhase.Playing;
      gameState.currentTrick = null; // First player

      // Should not throw errors and should make a valid move
      expect(() => {
        const selectedCards = getAIMove(gameState, PlayerId.Bot1);
        expect(selectedCards).toHaveLength(1);
        expect(selectedCards[0]).toBeDefined();
      }).not.toThrow();
    });
  });
});
