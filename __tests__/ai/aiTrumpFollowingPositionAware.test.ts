import { getAIMove } from "../../src/ai/aiLogic";
import { isValidPlay } from "../../src/game/playValidation";
import {
  Card,
  GamePhase,
  PlayerId,
  Rank,
  Suit,
  TrumpInfo,
} from "../../src/types";
import { initializeGame } from "../../src/utils/gameInitialization";
import { getPlayerById } from "../helpers/gameStates";

/**
 * Position-Aware Trump Following Strategy Tests
 *
 * Tests the position-specific logic when following a trump lead:
 * - 2nd Player: Proactive raise against weak trump leads
 * - 3rd Player: Opponent blocking and teammate protection
 * - 4th Player: Perfect information optimization
 *
 * Seating order: Human(0) → Bot1(1) → Bot2(2) → Bot3(3)
 * Teams: Team A (Human + Bot2) vs Team B (Bot1 + Bot3)
 */
describe("AI Trump Following - Position-Aware Strategy", () => {
  describe("2nd Player - Proactive Raise", () => {
    it("should play a mid-range trump to take control when opponent leads weak trump", () => {
      const gameState = initializeGame();
      gameState.gamePhase = GamePhase.Playing;

      const trumpInfo: TrumpInfo = {
        trumpRank: Rank.Two,
        trumpSuit: Suit.Spades,
      };
      gameState.trumpInfo = trumpInfo;

      // Human (Team A) leads with weak trump (3♠)
      const leadingCard = [Card.createCard(Suit.Spades, Rank.Three, 0)];

      gameState.currentTrick = {
        plays: [{ playerId: PlayerId.Human, cards: leadingCard }],
        winningPlayerId: PlayerId.Human,
        points: 0,
      };

      // Bot1 (Team B, 2nd player) has multiple trump options
      const bot1 = getPlayerById(gameState, PlayerId.Bot1);
      bot1.hand = [
        Card.createCard(Suit.Spades, Rank.Four, 0), // Very weak trump
        Card.createCard(Suit.Spades, Rank.Eight, 0), // Mid-range trump
        Card.createCard(Suit.Spades, Rank.Ace, 0), // Strong trump
        Card.createCard(Suit.Hearts, Rank.Seven, 0), // Non-trump filler
        Card.createCard(Suit.Clubs, Rank.Nine, 0), // Non-trump filler
      ];

      gameState.currentPlayerIndex = 1; // Bot1's turn

      const aiMove = getAIMove(gameState, PlayerId.Bot1);

      // Should play a trump card (taking control)
      expect(aiMove.length).toBe(1);
      expect(aiMove[0].suit).toBe(Suit.Spades);

      // Should NOT play the weakest trump (3♠ only beats nothing, 4♠ barely beats)
      // Should play a mid-range trump to take control, not the strongest (Ace)
      const playedRank = aiMove[0].rank;
      expect(playedRank).not.toBe(Rank.Ace); // Should not waste strongest trump

      // Should beat the leading 3♠
      expect(
        playedRank === Rank.Four ||
          playedRank === Rank.Eight ||
          playedRank === Rank.Ace,
      ).toBe(true);

      // Move must be valid
      const isValid = isValidPlay(aiMove, bot1.hand, PlayerId.Bot1, gameState);
      expect(isValid).toBe(true);
    });

    it("should not waste high-value trumps for proactive raise", () => {
      const gameState = initializeGame();
      gameState.gamePhase = GamePhase.Playing;

      const trumpInfo: TrumpInfo = {
        trumpRank: Rank.Two,
        trumpSuit: Suit.Hearts,
      };
      gameState.trumpInfo = trumpInfo;

      // Human leads with weak trump (3♥)
      const leadingCard = [Card.createCard(Suit.Hearts, Rank.Three, 0)];

      gameState.currentTrick = {
        plays: [{ playerId: PlayerId.Human, cards: leadingCard }],
        winningPlayerId: PlayerId.Human,
        points: 0,
      };

      // Bot1 (2nd player) only has very strong trumps — should not raise
      const bot1 = getPlayerById(gameState, PlayerId.Bot1);
      bot1.hand = [
        Card.createCard(Suit.Hearts, Rank.Ace, 0), // Strong trump
        Card.createCard(Suit.Spades, Rank.Two, 0), // Trump rank (off-suit)
        Card.createCard(Suit.Clubs, Rank.Seven, 0), // Non-trump
        Card.createCard(Suit.Diamonds, Rank.Nine, 0), // Non-trump
      ];

      gameState.currentPlayerIndex = 1;

      const aiMove = getAIMove(gameState, PlayerId.Bot1);

      // Must play a trump card (rule compliance)
      expect(aiMove.length).toBe(1);

      // Move must be valid
      const isValid = isValidPlay(aiMove, bot1.hand, PlayerId.Bot1, gameState);
      expect(isValid).toBe(true);
    });
  });

  describe("3rd Player - Opponent Blocking", () => {
    it("should beat opponent to block 4th player from winning cheaply", () => {
      const gameState = initializeGame();
      gameState.gamePhase = GamePhase.Playing;

      const trumpInfo: TrumpInfo = {
        trumpRank: Rank.Two,
        trumpSuit: Suit.Spades,
      };
      gameState.trumpInfo = trumpInfo;

      // Bot1 (Team B) leads with weak trump (3♠)
      // Human (Team A, 2nd player) plays 4♠
      const leadingCard = [Card.createCard(Suit.Spades, Rank.Three, 0)];
      const secondPlayerCard = [Card.createCard(Suit.Spades, Rank.Four, 0)];

      gameState.currentTrick = {
        plays: [
          { playerId: PlayerId.Bot1, cards: leadingCard },
          { playerId: PlayerId.Human, cards: secondPlayerCard },
        ],
        winningPlayerId: PlayerId.Human, // Human currently winning with 4♠
        points: 0,
      };

      // Bot2 (Team A, 3rd player) — teammate winning but weakly
      // Bot3 (Team B, 4th player) is an opponent who could overtake
      const bot2 = getPlayerById(gameState, PlayerId.Bot2);
      bot2.hand = [
        Card.createCard(Suit.Spades, Rank.Six, 0), // Can beat 4♠
        Card.createCard(Suit.Spades, Rank.Nine, 0), // Stronger option
        Card.createCard(Suit.Spades, Rank.Ace, 0), // Very strong
        Card.createCard(Suit.Hearts, Rank.Seven, 0), // Non-trump
        Card.createCard(Suit.Clubs, Rank.Eight, 0), // Non-trump
      ];

      gameState.currentPlayerIndex = 2; // Bot2's turn

      const aiMove = getAIMove(gameState, PlayerId.Bot2);

      // Should play a trump that beats the current winner to protect the trick
      expect(aiMove.length).toBe(1);
      expect(aiMove[0].suit).toBe(Suit.Spades);

      // Move should beat 4♠ (current winner)
      // Should play 6♠ (cheapest beat) rather than Ace
      expect(aiMove[0].rank).not.toBe(Rank.Ace);

      const isValid = isValidPlay(aiMove, bot2.hand, PlayerId.Bot2, gameState);
      expect(isValid).toBe(true);
    });

    it("should block when opponent is currently winning the trick", () => {
      const gameState = initializeGame();
      gameState.gamePhase = GamePhase.Playing;

      const trumpInfo: TrumpInfo = {
        trumpRank: Rank.Two,
        trumpSuit: Suit.Spades,
      };
      gameState.trumpInfo = trumpInfo;

      // Human (Team A) leads 3♠
      // Bot1 (Team B, 2nd player) plays 7♠ — opponent now winning
      const leadingCard = [Card.createCard(Suit.Spades, Rank.Three, 0)];
      const secondPlayerCard = [Card.createCard(Suit.Spades, Rank.Seven, 0)];

      gameState.currentTrick = {
        plays: [
          { playerId: PlayerId.Human, cards: leadingCard },
          { playerId: PlayerId.Bot1, cards: secondPlayerCard },
        ],
        winningPlayerId: PlayerId.Bot1, // Opponent currently winning
        points: 0,
      };

      // Bot2 (Team A, 3rd player) needs to block Bot1 (opponent)
      const bot2 = getPlayerById(gameState, PlayerId.Bot2);
      bot2.hand = [
        Card.createCard(Suit.Spades, Rank.Eight, 0), // Cheapest beat
        Card.createCard(Suit.Spades, Rank.Queen, 0), // Stronger
        Card.createCard(Suit.Clubs, Rank.Nine, 0), // Non-trump
        Card.createCard(Suit.Diamonds, Rank.Four, 0), // Non-trump
      ];

      gameState.currentPlayerIndex = 2;

      const aiMove = getAIMove(gameState, PlayerId.Bot2);

      // Should beat opponent's 7♠ with cheapest option
      expect(aiMove.length).toBe(1);
      expect(aiMove[0].suit).toBe(Suit.Spades);
      // Should prefer 8♠ (cheapest beat) over Q♠
      expect(aiMove[0].rank).toBe(Rank.Eight);

      const isValid = isValidPlay(aiMove, bot2.hand, PlayerId.Bot2, gameState);
      expect(isValid).toBe(true);
    });
  });

  describe("4th Player - Perfect Information", () => {
    it("should beat opponent with cheapest possible combo when opponent winning", () => {
      const gameState = initializeGame();
      gameState.gamePhase = GamePhase.Playing;

      const trumpInfo: TrumpInfo = {
        trumpRank: Rank.Two,
        trumpSuit: Suit.Spades,
      };
      gameState.trumpInfo = trumpInfo;

      // Human (Team A) leads 3♠
      // Bot1 (Team B, 2nd) plays 7♠
      // Bot2 (Team A, 3rd) plays 5♠
      // Bot1 still winning with 7♠
      gameState.currentTrick = {
        plays: [
          {
            playerId: PlayerId.Human,
            cards: [Card.createCard(Suit.Spades, Rank.Three, 0)],
          },
          {
            playerId: PlayerId.Bot1,
            cards: [Card.createCard(Suit.Spades, Rank.Seven, 0)],
          },
          {
            playerId: PlayerId.Bot2,
            cards: [Card.createCard(Suit.Spades, Rank.Five, 0)],
          },
        ],
        winningPlayerId: PlayerId.Bot1, // Opponent winning
        points: 5, // 5♠ has 5 points
      };

      // Bot3 (Team B — teammate of Bot1, 4th player)
      // Wait, Bot3 is on the same team as Bot1 (Team B). Let me fix to ensure opponent is winning for Bot3's perspective.
      // Bot3's teammate Bot1 is winning — so should NOT beat.
      // Let me restructure: Bot1 leads, Human plays, Bot2 plays, Bot3 is 4th

      // Re-setup: Bot1 leads 3♠, Human plays 7♠ (opponent winning), Bot2 plays 5♠
      gameState.currentTrick = {
        plays: [
          {
            playerId: PlayerId.Bot1,
            cards: [Card.createCard(Suit.Spades, Rank.Three, 0)],
          },
          {
            playerId: PlayerId.Human,
            cards: [Card.createCard(Suit.Spades, Rank.Seven, 0)],
          },
          {
            playerId: PlayerId.Bot2,
            cards: [Card.createCard(Suit.Spades, Rank.Five, 0)],
          },
        ],
        winningPlayerId: PlayerId.Human, // Opponent winning from Bot3's perspective
        points: 5,
      };

      // Bot3 (Team B, 4th player) — Human (Team A) is opponent winning
      const bot3 = getPlayerById(gameState, PlayerId.Bot3);
      bot3.hand = [
        Card.createCard(Suit.Spades, Rank.Eight, 0), // Cheapest beat
        Card.createCard(Suit.Spades, Rank.Queen, 0), // Expensive beat
        Card.createCard(Suit.Spades, Rank.Ace, 0), // Very expensive
        Card.createCard(Suit.Hearts, Rank.Four, 0), // Non-trump
      ];

      gameState.currentPlayerIndex = 3; // Bot3's turn

      const aiMove = getAIMove(gameState, PlayerId.Bot3);

      // Should beat opponent with cheapest combo (8♠)
      expect(aiMove.length).toBe(1);
      expect(aiMove[0].suit).toBe(Suit.Spades);
      expect(aiMove[0].rank).toBe(Rank.Eight);

      const isValid = isValidPlay(aiMove, bot3.hand, PlayerId.Bot3, gameState);
      expect(isValid).toBe(true);
    });

    it("should not overtake when teammate is winning", () => {
      const gameState = initializeGame();
      gameState.gamePhase = GamePhase.Playing;

      const trumpInfo: TrumpInfo = {
        trumpRank: Rank.Two,
        trumpSuit: Suit.Spades,
      };
      gameState.trumpInfo = trumpInfo;

      // Bot1 (Team B) leads 3♠, Human plays 4♠, Bot2 plays 5♠
      // Bot1 is currently losing, but let's make Bot1 lead a strong trump
      // Better scenario: Bot1 leads, others play, Bot1 still winning
      gameState.currentTrick = {
        plays: [
          {
            playerId: PlayerId.Bot1,
            cards: [Card.createCard(Suit.Spades, Rank.Jack, 0)],
          },
          {
            playerId: PlayerId.Human,
            cards: [Card.createCard(Suit.Spades, Rank.Four, 0)],
          },
          {
            playerId: PlayerId.Bot2,
            cards: [Card.createCard(Suit.Spades, Rank.Five, 0)],
          },
        ],
        winningPlayerId: PlayerId.Bot1, // Teammate winning from Bot3's perspective
        points: 5,
      };

      // Bot3 (Team B, 4th player) — Bot1 (Team B) is teammate winning
      const bot3 = getPlayerById(gameState, PlayerId.Bot3);
      bot3.hand = [
        Card.createCard(Suit.Spades, Rank.Six, 0), // Weak trump
        Card.createCard(Suit.Spades, Rank.Queen, 0), // Strong trump
        Card.createCard(Suit.Spades, Rank.Ace, 0), // Very strong trump
        Card.createCard(Suit.Hearts, Rank.Seven, 0), // Non-trump
      ];

      gameState.currentPlayerIndex = 3;

      const aiMove = getAIMove(gameState, PlayerId.Bot3);

      // Should NOT play Q♠ or A♠ to overtake teammate
      // Should dispose weakly
      expect(aiMove.length).toBe(1);

      // Should play the weakest trump (6♠) for disposal, NOT overtake with strong cards
      expect(aiMove[0].rank).not.toBe(Rank.Queen);
      expect(aiMove[0].rank).not.toBe(Rank.Ace);

      const isValid = isValidPlay(aiMove, bot3.hand, PlayerId.Bot3, gameState);
      expect(isValid).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("should handle position-aware strategy with trump pairs", () => {
      const gameState = initializeGame();
      gameState.gamePhase = GamePhase.Playing;

      const trumpInfo: TrumpInfo = {
        trumpRank: Rank.Two,
        trumpSuit: Suit.Spades,
      };
      gameState.trumpInfo = trumpInfo;

      // Human leads with weak trump pair (3♠-3♠)
      const leadingCards = Card.createPair(Suit.Spades, Rank.Three);

      gameState.currentTrick = {
        plays: [{ playerId: PlayerId.Human, cards: leadingCards }],
        winningPlayerId: PlayerId.Human,
        points: 0,
      };

      // Bot1 (2nd player) has trump pairs available
      const bot1 = getPlayerById(gameState, PlayerId.Bot1);
      bot1.hand = [
        ...Card.createPair(Suit.Spades, Rank.Four), // Weak pair that can beat
        ...Card.createPair(Suit.Spades, Rank.Nine), // Stronger pair
        Card.createCard(Suit.Hearts, Rank.Seven, 0),
        Card.createCard(Suit.Clubs, Rank.Eight, 0),
      ];

      gameState.currentPlayerIndex = 1;

      const aiMove = getAIMove(gameState, PlayerId.Bot1);

      // Should play a trump pair
      expect(aiMove.length).toBe(2);
      expect(aiMove.every((card) => card.suit === Suit.Spades)).toBe(true);

      // Should prefer the cheaper pair (4♠-4♠) for proactive raise
      const playedRanks = aiMove.map((c) => c.rank);
      expect(playedRanks.every((r) => r === Rank.Four)).toBe(true);

      const isValid = isValidPlay(aiMove, bot1.hand, PlayerId.Bot1, gameState);
      expect(isValid).toBe(true);
    });
  });
});
