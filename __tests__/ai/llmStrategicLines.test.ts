import {
  Card,
  GamePhase,
  PlayerId,
  Rank,
  Suit,
  TrumpInfo,
} from "../../src/types";
import { createGameContext } from "../../src/ai/aiGameContext";
import {
  generateLeadingLines,
  generateFollowingLines,
} from "../../src/ai/llm/llmStrategicLines";
import { createGameState, givePlayerCards } from "../helpers/gameStates";
import { createTrick } from "../helpers/tricks";
import { createTrumpInfo } from "../helpers/trump";

describe("llmStrategicLines", () => {
  const trumpInfo: TrumpInfo = createTrumpInfo(Rank.Two, Suit.Spades);

  describe("generateLeadingLines", () => {
    it("should cluster hand into max 4 distinct strategic lines (Cash, Develop, Exit, Trump Control)", () => {
      const hand: Card[] = [
        // Cash candidate: Ace of Hearts (boss)
        Card.createCard(Suit.Hearts, Rank.Ace, 0),
        // Develop candidate: Pair of Clubs (non-boss pair)
        ...Card.createPair(Suit.Clubs, Rank.Eight),
        // Exit candidate: Low single Diamond
        Card.createCard(Suit.Diamonds, Rank.Three, 0),
        // Trump candidate: Trump pair
        ...Card.createPair(Suit.Spades, Rank.Nine),
      ];

      const gameState = createGameState({
        trumpInfo,
        gamePhase: GamePhase.Playing,
        currentPlayerIndex: 1, // Bot1
      });
      const stateWithCards = givePlayerCards(gameState, 1, hand);
      const gameContext = createGameContext(stateWithCards, PlayerId.Bot1);

      const lines = generateLeadingLines(
        stateWithCards,
        hand,
        PlayerId.Bot1,
        trumpInfo,
        gameContext,
      );

      expect(lines.length).toBeGreaterThanOrEqual(3);
      expect(lines.length).toBeLessThanOrEqual(4);

      const intents = lines.map((l) => l.intent);
      expect(intents).toContain("cash_winner");
      expect(intents).toContain("develop_suit");
      expect(intents).toContain("trump_control");

      const cashLine = lines.find((l) => l.intent === "cash_winner");
      expect(cashLine).toBeDefined();
      expect(cashLine?.cards[0].rank).toBe(Rank.Ace);
      expect(cashLine?.cards[0].suit).toBe(Suit.Hearts);
      expect(cashLine?.isGuaranteedWinner).toBe(true);
    });

    it("should generate safe exit when hand contains only low singles", () => {
      const hand: Card[] = [
        Card.createCard(Suit.Hearts, Rank.Three, 0),
        Card.createCard(Suit.Diamonds, Rank.Four, 0),
      ];

      const gameState = createGameState({
        trumpInfo,
        gamePhase: GamePhase.Playing,
        currentPlayerIndex: 1,
      });
      const stateWithCards = givePlayerCards(gameState, 1, hand);
      const gameContext = createGameContext(stateWithCards, PlayerId.Bot1);

      const lines = generateLeadingLines(
        stateWithCards,
        hand,
        PlayerId.Bot1,
        trumpInfo,
        gameContext,
      );

      expect(lines.length).toBeGreaterThanOrEqual(1);
      const exitLine = lines.find((l) => l.intent === "safe_exit");
      expect(exitLine).toBeDefined();
      expect(exitLine?.pointsAtStake).toBe(0);
    });
  });

  describe("generateFollowingLines", () => {
    it("should generate ruff, feed, and trash lines when void in led suit", () => {
      // Led: 10 of Hearts (10 pts) by Bot1 (Opponent)
      const leadTrick = createTrick(PlayerId.Bot1, [
        Card.createCard(Suit.Hearts, Rank.Ten, 0),
      ]);

      const hand: Card[] = [
        // Trump to ruff: 4 of Spades
        Card.createCard(Suit.Spades, Rank.Four, 0),
        // Point card to feed: King of Clubs (10 pts)
        Card.createCard(Suit.Clubs, Rank.King, 0),
        // Trash to dump: 3 of Diamonds (0 pts)
        Card.createCard(Suit.Diamonds, Rank.Three, 0),
      ];

      const gameState = createGameState({
        trumpInfo,
        gamePhase: GamePhase.Playing,
        currentPlayerIndex: 2, // Bot2 (Teammate)
        currentTrick: leadTrick,
      });
      const stateWithCards = givePlayerCards(gameState, 2, hand);
      const gameContext = createGameContext(stateWithCards, PlayerId.Bot2);

      const lines = generateFollowingLines(
        stateWithCards,
        hand,
        PlayerId.Bot2,
        trumpInfo,
        gameContext,
      );

      expect(lines.length).toBeGreaterThanOrEqual(2);
      const intents = lines.map((l) => l.intent);
      expect(intents).toContain("ruff_win");
      expect(intents).toContain("dump_trash");

      const ruffLine = lines.find((l) => l.intent === "ruff_win");
      expect(ruffLine?.cards[0].suit).toBe(Suit.Spades);
      expect(ruffLine?.isGuaranteedWinner).toBe(true);

      const trashLine = lines.find((l) => l.intent === "dump_trash");
      expect(trashLine?.cards[0].points).toBe(0);
    });

    it("should generate overtake, feed, and duck lines when following in-suit", () => {
      // Led: 9 of Hearts by Bot1 (Opponent)
      const leadTrick = createTrick(PlayerId.Bot1, [
        Card.createCard(Suit.Hearts, Rank.Nine, 0),
      ]);

      const hand: Card[] = [
        // Winner: Ace of Hearts
        Card.createCard(Suit.Hearts, Rank.Ace, 0),
        // Point card: King of Hearts
        Card.createCard(Suit.Hearts, Rank.King, 0),
        // Duck: 3 of Hearts
        Card.createCard(Suit.Hearts, Rank.Three, 0),
      ];

      const gameState = createGameState({
        trumpInfo,
        gamePhase: GamePhase.Playing,
        currentPlayerIndex: 2,
        currentTrick: leadTrick,
      });
      const stateWithCards = givePlayerCards(gameState, 2, hand);
      const gameContext = createGameContext(stateWithCards, PlayerId.Bot2);

      const lines = generateFollowingLines(
        stateWithCards,
        hand,
        PlayerId.Bot2,
        trumpInfo,
        gameContext,
      );

      expect(lines.length).toBeGreaterThanOrEqual(2);
      const intents = lines.map((l) => l.intent);
      expect(intents).toContain("overtake_win");
      expect(intents).toContain("duck_low");

      const winLine = lines.find((l) => l.intent === "overtake_win");
      expect(winLine?.cards[0].rank).toBe(Rank.King);
    });

    it("should handle single-card following hands", () => {
      const leadTrick = createTrick(PlayerId.Bot1, [
        Card.createCard(Suit.Hearts, Rank.Nine, 0),
      ]);
      const hand: Card[] = [Card.createCard(Suit.Hearts, Rank.Five, 0)];

      const gameState = createGameState({
        trumpInfo,
        gamePhase: GamePhase.Playing,
        currentPlayerIndex: 2,
        currentTrick: leadTrick,
      });
      const stateWithCards = givePlayerCards(gameState, 2, hand);
      const gameContext = createGameContext(stateWithCards, PlayerId.Bot2);

      const lines = generateFollowingLines(
        stateWithCards,
        hand,
        PlayerId.Bot2,
        trumpInfo,
        gameContext,
      );

      expect(lines.length).toBe(1);
      expect(lines[0].cards[0].rank).toBe(Rank.Five);
    });
  });

  describe("Leading edge cases", () => {
    it("should surface unbeatable tractors under cash_winner", () => {
      const hand: Card[] = [
        // Tractor: AA-KK of Clubs
        ...Card.createPair(Suit.Clubs, Rank.Ace),
        ...Card.createPair(Suit.Clubs, Rank.King),
        // Low Diamonds
        Card.createCard(Suit.Diamonds, Rank.Three, 0),
      ];

      const gameState = createGameState({
        trumpInfo,
        gamePhase: GamePhase.Playing,
        currentPlayerIndex: 1,
      });
      const stateWithCards = givePlayerCards(gameState, 1, hand);
      const gameContext = createGameContext(stateWithCards, PlayerId.Bot1);

      const lines = generateLeadingLines(
        stateWithCards,
        hand,
        PlayerId.Bot1,
        trumpInfo,
        gameContext,
      );

      const cashLine = lines.find((l) => l.intent === "cash_winner");
      expect(cashLine).toBeDefined();
      expect(cashLine?.cards.length).toBe(4); // Tractor is 4 cards
      expect(cashLine?.isGuaranteedWinner).toBe(true);
    });
  });
});
