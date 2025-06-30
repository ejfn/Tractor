import { getAIMove } from "../../src/ai/aiLogic";
import { Card, PlayerId, Rank, Suit, TrumpInfo } from "../../src/types";
import { initializeGame } from "../../src/utils/gameInitialization";

/**
 * Tests for 3rd player void logic fixes:
 * 1. When 2nd player already trumped - 3rd should beat trump, not contribute points
 * 2. When both 3rd and 4th players are void - 3rd should minimize damage
 */

describe("Third Player Void Logic", () => {
  let trumpInfo: TrumpInfo;

  beforeEach(() => {
    trumpInfo = {
      trumpSuit: Suit.Hearts,
      trumpRank: Rank.Two,
    };
  });

  describe("Scenario 1: Second Player Already Trumped", () => {
    it("should beat trump instead of contributing points when 2nd player trumped and 3rd player void", () => {
      const gameState = initializeGame();
      gameState.trumpInfo = trumpInfo;

      // Human leads 10♠, Bot1 trumps with 3♥
      const humanLeadingCard = Card.createCard(Suit.Spades, Rank.Ten, 0);
      const bot1TrumpCard = Card.createCard(Suit.Hearts, Rank.Three, 0);

      gameState.currentTrick = {
        plays: [
          { playerId: PlayerId.Human, cards: [humanLeadingCard] },
          { playerId: PlayerId.Bot1, cards: [bot1TrumpCard] },
        ],
        points: 10,
        winningPlayerId: PlayerId.Human, // Human still winning (teammate)
      };

      // Set current player to Bot2 (3rd player)
      gameState.currentPlayerIndex = 2;

      // Bot2 hand: void in Spades, has trump that can beat 3♥ and point cards
      const bot2Hand = [
        Card.createCard(Suit.Hearts, Rank.King, 0), // Trump point card
        Card.createCard(Suit.Hearts, Rank.Ace, 0), // Trump ace (can beat 3♥)
        Card.createCard(Suit.Clubs, Rank.Five, 0), // Non-trump point card
        Card.createCard(Suit.Diamonds, Rank.Seven, 0), // Non-trump
      ];

      gameState.players[2].hand = bot2Hand;

      // Get AI decision
      const aiDecision = getAIMove(gameState, PlayerId.Bot2);

      // Should use trump to beat opponent's trump, not contribute points
      expect(aiDecision).toHaveLength(1);
      expect(aiDecision[0].suit).toBe(Suit.Hearts);
      // Should use trump, preferably the ace to beat 3♥
    });

    it("should still contribute points when 2nd player trumped but 3rd player has leading suit", () => {
      const gameState = initializeGame();
      gameState.trumpInfo = trumpInfo;

      // Human leads 10♠, Bot1 trumps with 3♥
      const humanLeadingCard = Card.createCard(Suit.Spades, Rank.Ten, 0);
      const bot1TrumpCard = Card.createCard(Suit.Hearts, Rank.Three, 0);

      gameState.currentTrick = {
        plays: [
          { playerId: PlayerId.Human, cards: [humanLeadingCard] },
          { playerId: PlayerId.Bot1, cards: [bot1TrumpCard] },
        ],
        points: 10,
        winningPlayerId: PlayerId.Human,
      };

      gameState.currentPlayerIndex = 2;

      // Bot2 hand: HAS Spades (not void)
      const bot2Hand = [
        Card.createCard(Suit.Spades, Rank.King, 0), // Leading suit point card
        Card.createCard(Suit.Hearts, Rank.Ace, 0), // Trump ace
        Card.createCard(Suit.Clubs, Rank.Five, 0), // Non-trump point card
      ];

      gameState.players[2].hand = bot2Hand;

      const aiDecision = getAIMove(gameState, PlayerId.Bot2);

      // Should contribute K♠ since not void in leading suit
      expect(aiDecision).toHaveLength(1);
      expect(aiDecision[0].suit).toBe(Suit.Spades);
      expect(aiDecision[0].rank).toBe(Rank.King);
    });
  });

  describe("Scenario 2: Both 3rd and 4th Players Void", () => {
    it("should not contribute points when both 3rd and 4th players are void", () => {
      const gameState = initializeGame();
      gameState.trumpInfo = trumpInfo;

      // Human leads 10♠, Bot1 plays 9♠
      const humanLeadingCard = Card.createCard(Suit.Spades, Rank.Ten, 0);
      const bot1Card = Card.createCard(Suit.Spades, Rank.Nine, 0);

      gameState.currentTrick = {
        plays: [
          { playerId: PlayerId.Human, cards: [humanLeadingCard] },
          { playerId: PlayerId.Bot1, cards: [bot1Card] },
        ],
        points: 10,
        winningPlayerId: PlayerId.Human,
      };

      gameState.currentPlayerIndex = 2;

      // Bot2 hand: void in Spades, has point cards
      const bot2Hand = [
        Card.createCard(Suit.Hearts, Rank.King, 0), // Trump point card
        Card.createCard(Suit.Clubs, Rank.Five, 0), // Non-trump point card
        Card.createCard(Suit.Diamonds, Rank.Seven, 0), // Non-trump safe card
      ];

      // Bot3 hand: also void in Spades
      const bot3Hand = [
        Card.createCard(Suit.Hearts, Rank.Ace, 0), // Trump ace
        Card.createCard(Suit.Clubs, Rank.Six, 0), // Non-trump
      ];

      gameState.players[2].hand = bot2Hand;
      gameState.players[3].hand = bot3Hand;

      const aiDecision = getAIMove(gameState, PlayerId.Bot2);

      // Should not contribute points - should play safe card
      expect(aiDecision).toHaveLength(1);
      expect(aiDecision[0].points).toBe(0);
    });

    it("should contribute safely when only 4th player is void but 3rd has leading suit", () => {
      const gameState = initializeGame();
      gameState.trumpInfo = trumpInfo;

      // Human leads 10♠, Bot1 plays 9♠
      const humanLeadingCard = Card.createCard(Suit.Spades, Rank.Ten, 0);
      const bot1Card = Card.createCard(Suit.Spades, Rank.Nine, 0);

      gameState.currentTrick = {
        plays: [
          { playerId: PlayerId.Human, cards: [humanLeadingCard] },
          { playerId: PlayerId.Bot1, cards: [bot1Card] },
        ],
        points: 10,
        winningPlayerId: PlayerId.Human,
      };

      gameState.currentPlayerIndex = 2;

      // Bot2 hand: HAS Spades
      const bot2Hand = [
        Card.createCard(Suit.Spades, Rank.King, 0), // Leading suit point card
        Card.createCard(Suit.Hearts, Rank.King, 0), // Trump point card
        Card.createCard(Suit.Clubs, Rank.Five, 0), // Non-trump point card
      ];

      // Bot3 hand: void in Spades
      const bot3Hand = [
        Card.createCard(Suit.Hearts, Rank.Ace, 0), // Trump ace
        Card.createCard(Suit.Clubs, Rank.Six, 0), // Non-trump
      ];

      gameState.players[2].hand = bot2Hand;
      gameState.players[3].hand = bot3Hand;

      const aiDecision = getAIMove(gameState, PlayerId.Bot2);

      // Should contribute K♠ safely since we have leading suit
      expect(aiDecision).toHaveLength(1);
      expect(aiDecision[0].suit).toBe(Suit.Spades);
      expect(aiDecision[0].rank).toBe(Rank.King);
    });
  });
});
