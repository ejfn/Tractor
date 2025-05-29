import {
  GameState,
  PlayerId,
  GamePhase,
  Card,
  Suit,
  Rank,
  TrickWinnerAnalysis,
} from "../../src/types";
import { createGameContext, analyzeTrickWinner } from "../../src/ai/aiGameContext";
import { getAIMove } from "../../src/ai/aiLogic";
import { createGameState, createTrick, createCard } from "../helpers";

describe("AI Current Trick Winner Strategy", () => {
  let gameState: GameState;

  beforeEach(() => {
    gameState = createGameState({
      gamePhase: GamePhase.Playing,
    });
  });

  describe("Trick Winner Analysis", () => {
    it("should identify when teammate is winning", () => {
      // Setup: Human leads, Bot2 (teammate) is currently winning
      const trick = createTrick(
        PlayerId.Human,
        [createCard(Suit.Spades, Rank.Seven)],
        [
          {
            playerId: PlayerId.Bot1,
            cards: [createCard(Suit.Spades, Rank.Six)],
          },
        ],
        10,
        PlayerId.Bot2 // Teammate is winning
      );

      gameState.currentTrick = trick;

      const analysis = analyzeTrickWinner(gameState, PlayerId.Human);

      expect(analysis.currentWinner).toBe(PlayerId.Bot2);
      expect(analysis.isTeammateWinning).toBe(true);
      expect(analysis.isOpponentWinning).toBe(false);
      expect(analysis.isSelfWinning).toBe(false);
      expect(analysis.trickPoints).toBe(10);
      expect(analysis.shouldPlayConservatively).toBe(true);
    });

    it("should identify when opponent is winning", () => {
      // Setup: Bot1 (opponent) is currently winning
      // Give human player cards that can beat the opponent
      const humanPlayer = gameState.players.find(p => p.id === PlayerId.Human)!;
      humanPlayer.hand = [
        createCard(Suit.Hearts, Rank.Ace), // Can beat the King
        createCard(Suit.Spades, Rank.Three), // Other cards
      ];

      const trick = createTrick(
        PlayerId.Human,
        [createCard(Suit.Hearts, Rank.Seven)],
        [
          {
            playerId: PlayerId.Bot1,
            cards: [createCard(Suit.Hearts, Rank.King)], // 10 points
          },
        ],
        10,
        PlayerId.Bot1 // Opponent is winning
      );

      gameState.currentTrick = trick;

      const analysis = analyzeTrickWinner(gameState, PlayerId.Human);

      expect(analysis.currentWinner).toBe(PlayerId.Bot1);
      expect(analysis.isTeammateWinning).toBe(false);
      expect(analysis.isOpponentWinning).toBe(true);
      expect(analysis.isSelfWinning).toBe(false);
      expect(analysis.trickPoints).toBe(10);
      expect(analysis.shouldTryToBeat).toBe(true); // Should try to beat opponent with points
    });

    it("should identify when self is winning", () => {
      // Setup: Human is currently winning their own led trick
      const trick = createTrick(
        PlayerId.Human,
        [createCard(Suit.Clubs, Rank.Ace)],
        [
          {
            playerId: PlayerId.Bot1,
            cards: [createCard(Suit.Clubs, Rank.Six)],
          },
        ],
        0,
        PlayerId.Human // Self is winning
      );

      gameState.currentTrick = trick;

      const analysis = analyzeTrickWinner(gameState, PlayerId.Human);

      expect(analysis.currentWinner).toBe(PlayerId.Human);
      expect(analysis.isTeammateWinning).toBe(false); // Self winning, not teammate
      expect(analysis.isOpponentWinning).toBe(false); // Self winning, not opponent
      expect(analysis.isSelfWinning).toBe(true);
      expect(analysis.shouldPlayConservatively).toBe(true); // Conservative when no points
    });
  });

  describe("Context Integration", () => {
    it("should include trick winner analysis in game context", () => {
      const trick = createTrick(
        PlayerId.Bot1,
        [createCard(Suit.Hearts, Rank.King)], // 10 points
        [],
        10,
        PlayerId.Bot1
      );

      gameState.currentTrick = trick;

      const context = createGameContext(gameState, PlayerId.Human);

      expect(context.trickWinnerAnalysis).toBeDefined();
      expect(context.trickWinnerAnalysis!.currentWinner).toBe(PlayerId.Bot1);
      expect(context.trickWinnerAnalysis!.isOpponentWinning).toBe(true);
      expect(context.trickWinnerAnalysis!.trickPoints).toBe(10);
    });
  });

  describe("AI Strategy Decision Making", () => {
    it("should play conservatively when teammate is winning", () => {
      // Setup game where Bot2 (teammate) is winning with points
      const humanPlayer = gameState.players.find(p => p.id === PlayerId.Human)!;
      humanPlayer.hand = [
        createCard(Suit.Hearts, Rank.King), // 10 points - valuable
        createCard(Suit.Hearts, Rank.Three), // 0 points - safe
        createCard(Suit.Hearts, Rank.Four), // 0 points - safe
      ];

      const trick = createTrick(
        PlayerId.Bot1,
        [createCard(Suit.Hearts, Rank.Seven)],
        [
          {
            playerId: PlayerId.Bot2, // Teammate
            cards: [createCard(Suit.Hearts, Rank.Ace)], // Winning
          },
        ],
        15,
        PlayerId.Bot2 // Teammate winning
      );

      gameState.currentTrick = trick;
      gameState.currentPlayerIndex = 0; // Human's turn

      const aiMove = getAIMove(gameState, PlayerId.Human);

      // Should play the lowest value card, not the King
      expect(aiMove).toHaveLength(1);
      expect(aiMove[0].suit).toBe(Suit.Hearts);
      expect(aiMove[0].rank).toBe(Rank.Three);
    });

    it("should try to beat opponent when they're winning with points", () => {
      // Setup game where opponent is winning with significant points
      const humanPlayer = gameState.players.find(p => p.id === PlayerId.Human)!;
      humanPlayer.hand = [
        createCard(Suit.Hearts, Rank.Three), // Low card
        createCard(Suit.Hearts, Rank.Ace), // Can beat opponent
      ];

      const trick = createTrick(
        PlayerId.Bot1, // Opponent
        [createCard(Suit.Hearts, Rank.King)], // 10 points
        [],
        10,
        PlayerId.Bot1 // Opponent winning
      );

      gameState.currentTrick = trick;
      gameState.currentPlayerIndex = 0; // Human's turn

      const aiMove = getAIMove(gameState, PlayerId.Human);

      // Should play Ace to beat the King and capture points
      expect(aiMove).toHaveLength(1);
      expect(aiMove[0].suit).toBe(Suit.Hearts);
      expect(aiMove[0].rank).toBe(Rank.Ace);
    });

    it("should not waste high cards when opponent is winning low-value trick", () => {
      // Setup: Opponent winning but no significant points
      const humanPlayer = gameState.players.find(p => p.id === PlayerId.Human)!;
      humanPlayer.hand = [
        createCard(Suit.Hearts, Rank.Three), // Low safe card
        createCard(Suit.Hearts, Rank.Ace), // Valuable card
      ];

      const trick = createTrick(
        PlayerId.Bot1, // Opponent
        [createCard(Suit.Hearts, Rank.Seven)], // No points
        [],
        0, // No points at stake
        PlayerId.Bot1 // Opponent winning
      );

      gameState.currentTrick = trick;
      gameState.currentPlayerIndex = 0; // Human's turn

      const aiMove = getAIMove(gameState, PlayerId.Human);

      // Should play low card, not waste the Ace on a pointless trick
      expect(aiMove).toHaveLength(1);
      expect(aiMove[0].suit).toBe(Suit.Hearts);
      expect(aiMove[0].rank).toBe(Rank.Three);
    });
  });

  describe("Team Dynamics", () => {
    it("should correctly identify team relationships", () => {
      // Human + Bot2 vs Bot1 + Bot3
      const trick = createTrick(
        PlayerId.Bot2, // Teammate
        [createCard(Suit.Spades, Rank.Ace)],
        [],
        5,
        PlayerId.Bot2
      );

      gameState.currentTrick = trick;

      const analysis = analyzeTrickWinner(gameState, PlayerId.Human);

      expect(analysis.isTeammateWinning).toBe(true);
      expect(analysis.shouldPlayConservatively).toBe(true);
    });

    it("should handle complex trick scenarios", () => {
      // Multi-player trick with point collection
      const trick = createTrick(
        PlayerId.Human,
        [createCard(Suit.Diamonds, Rank.Five)], // 5 points
        [
          {
            playerId: PlayerId.Bot1, // Opponent
            cards: [createCard(Suit.Diamonds, Rank.King)], // 10 points, currently winning
          },
          {
            playerId: PlayerId.Bot2, // Teammate
            cards: [createCard(Suit.Diamonds, Rank.Six)], // Low card
          },
        ],
        15, // Total points (5 + 10)
        PlayerId.Bot1 // Opponent currently winning
      );

      gameState.currentTrick = trick;

      const analysis = analyzeTrickWinner(gameState, PlayerId.Bot3);

      expect(analysis.currentWinner).toBe(PlayerId.Bot1);
      expect(analysis.isOpponentWinning).toBe(false); // Bot1 is teammate to Bot3 (both Team B)
      expect(analysis.isTeammateWinning).toBe(true); // Bot1 is teammate to Bot3
      expect(analysis.trickPoints).toBe(15);
      expect(analysis.shouldTryToBeat).toBe(false); // Should not try to beat teammate
    });
  });

  describe("Edge Cases", () => {
    it("should throw error when no current trick", () => {
      gameState.currentTrick = null;

      expect(() => {
        analyzeTrickWinner(gameState, PlayerId.Human);
      }).toThrow("analyzeTrickWinner called with no active trick");
    });

    it("should handle trick with only leader played", () => {
      const trick = createTrick(
        PlayerId.Human,
        [createCard(Suit.Hearts, Rank.Ten)], // 10 points
        [], // No other players have played yet
        10,
        PlayerId.Human // Self is currently winning
      );

      gameState.currentTrick = trick;

      const analysis = analyzeTrickWinner(gameState, PlayerId.Human);

      expect(analysis.currentWinner).toBe(PlayerId.Human);
      expect(analysis.isSelfWinning).toBe(true);
      expect(analysis.trickPoints).toBe(10);
    });
  });
});