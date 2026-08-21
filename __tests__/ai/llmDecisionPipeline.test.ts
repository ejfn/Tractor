import {
  Card,
  GamePhase,
  JokerType,
  PlayerId,
  Rank,
  Suit,
  TrumpInfo,
} from "../../src/types";
import { initializeGame } from "../../src/utils/gameInitialization";
import { createGameContext } from "../../src/ai/aiGameContext";
import {
  decomposeHand,
  formatPerceptionBlock,
} from "../../src/ai/llm/llmPerception";
import { generateLegalActionSpace } from "../../src/ai/llm/llmActionSpace";
import { buildCompactTrickPrompt } from "../../src/ai/llm/llmPromptTemplates";
import { getPlayerById } from "../helpers/gameStates";

describe("LLM 4-Layer Decision Pipeline", () => {
  const trumpInfo: TrumpInfo = {
    trumpSuit: Suit.Spades,
    trumpRank: Rank.Two,
  };

  describe("Layer 1: Perception Engine", () => {
    it("should decompose hand into structured trump and off-suit components", () => {
      const hand = [
        Card.createJoker(JokerType.Big, 0),
        Card.createCard(Suit.Spades, Rank.Two, 0), // Trump Rank
        Card.createCard(Suit.Spades, Rank.Ace, 0),
        Card.createCard(Suit.Spades, Rank.Eight, 0),
        Card.createCard(Suit.Spades, Rank.Eight, 1), // Trump Pair
        Card.createCard(Suit.Spades, Rank.Ten, 0), // Trump Middle (10pt)
        Card.createCard(Suit.Spades, Rank.Three, 0), // Trump Low
        Card.createCard(Suit.Hearts, Rank.Ace, 0), // Off-suit Boss
        Card.createCard(Suit.Hearts, Rank.King, 0), // Off-suit (10pt)
        Card.createCard(Suit.Hearts, Rank.King, 1), // Off-suit Pair
        Card.createCard(Suit.Hearts, Rank.Four, 0),
        Card.createCard(Suit.Clubs, Rank.Five, 0), // Off-suit (5pt)
        Card.createCard(Suit.Diamonds, Rank.Three, 0),
      ];

      const decomposed = decomposeHand(hand, trumpInfo);

      // Trump group verification
      expect(decomposed.trump.bosses.length).toBe(3); // BJ, 2♠, A♠
      expect(decomposed.trump.pairs.length).toBe(1); // [8♠, 8♠]
      expect(decomposed.trump.middles.length).toBe(1); // 10♠
      expect(decomposed.trump.lows.length).toBe(1); // 3♠

      // Off-suit verification
      expect(decomposed.offSuits[Suit.Hearts].bosses.length).toBe(1); // A♥
      expect(decomposed.offSuits[Suit.Hearts].pairs.length).toBe(1); // [K♥, K♥]
      expect(decomposed.offSuits[Suit.Hearts].singles.length).toBe(1); // 4♥
    });

    it("should format a compact perception text block under 200 words", () => {
      const gameState = initializeGame();
      gameState.gamePhase = GamePhase.Playing;
      gameState.trumpInfo = trumpInfo;

      const hand = [
        Card.createCard(Suit.Spades, Rank.Eight, 0),
        Card.createCard(Suit.Hearts, Rank.King, 0),
      ];
      gameState.players[0].hand = hand;

      const context = createGameContext(gameState, PlayerId.Human);
      const perceptionBlock = formatPerceptionBlock(
        gameState,
        PlayerId.Human,
        hand,
        trumpInfo,
        context,
      );

      expect(perceptionBlock).toContain("=== MATCH SITUATION ===");
      expect(perceptionBlock).toContain("=== YOUR STRUCTURED HAND ===");
      expect(perceptionBlock).toContain("Trump");
      expect(perceptionBlock.length).toBeLessThan(1000);
    });
  });

  describe("Layer 2: Legal Action Space Generator", () => {
    it("should generate distinct lead actions (bosses, trump tiers, safe exits)", () => {
      const gameState = initializeGame();
      gameState.gamePhase = GamePhase.Playing;
      gameState.trumpInfo = trumpInfo;

      const hand = [
        Card.createCard(Suit.Hearts, Rank.Ace, 0), // Boss
        Card.createCard(Suit.Clubs, Rank.Ace, 0), // Boss in other suit
        Card.createJoker(JokerType.Big, 0), // Trump Master
        Card.createCard(Suit.Diamonds, Rank.Three, 0), // Safe Exit
      ];
      gameState.players[1].hand = hand;
      gameState.currentPlayerIndex = 1;

      const context = createGameContext(gameState, PlayerId.Bot1);
      const actions = generateLegalActionSpace(
        gameState,
        hand,
        PlayerId.Bot1,
        trumpInfo,
        context,
      );

      expect(actions.length).toBeGreaterThanOrEqual(3);
      // Indexes must be sequential starting at 1
      expect(actions[0].index).toBe(1);
      expect(actions[1].index).toBe(2);

      // Verify Boss leads exist
      const hasHeartsBoss = actions.some((a) => a.label.includes("A♥"));
      const hasClubsBoss = actions.some((a) => a.label.includes("A♣"));
      expect(hasHeartsBoss || hasClubsBoss).toBe(true);
    });

    it("should generate Ceiling Raise, Cheap Win, and 0-Pt Duck in following turns", () => {
      const gameState = initializeGame();
      gameState.gamePhase = GamePhase.Playing;
      gameState.trumpInfo = trumpInfo;

      // Opponent leads 3♠
      gameState.currentTrick = {
        plays: [
          {
            playerId: PlayerId.Human,
            cards: [Card.createCard(Suit.Spades, Rank.Three, 0)],
          },
        ],
        winningPlayerId: PlayerId.Human,
        points: 0,
      };
      gameState.currentPlayerIndex = 1;

      const bot1 = getPlayerById(gameState, PlayerId.Bot1);
      const hand = [
        Card.createCard(Suit.Spades, Rank.Seven, 0), // Low winner (7 over 3)
        Card.createCard(Suit.Spades, Rank.Queen, 0), // Ceiling raise (Queen)
        Card.createCard(Suit.Spades, Rank.Ace, 0), // Boss Ace
      ];
      bot1.hand = hand;

      const context = createGameContext(gameState, PlayerId.Bot1);
      const actions = generateLegalActionSpace(
        gameState,
        hand,
        PlayerId.Bot1,
        trumpInfo,
        context,
      );

      expect(actions.length).toBeGreaterThanOrEqual(2);
      const labels = actions.map((a) => a.label);
      // Must include both Ceiling Raise and Cheap Win
      expect(
        labels.some((l) => l.includes("Raise Ceiling") || l.includes("Q♠")),
      ).toBe(true);
      expect(
        labels.some((l) => l.includes("Win Cheaply") || l.includes("7♠")),
      ).toBe(true);
    });
  });

  describe("Layer 3: Prompt Construction", () => {
    it("should build an ultra-compact prompt with perception and action list", () => {
      const perception =
        "=== MATCH SITUATION ===\nRole: Attackers\n=== HAND ===\nTrump: [BJ]";
      const actions = [
        {
          index: 1,
          label: "Command with BJ",
          cards: [Card.createJoker(JokerType.Big, 0)],
          points: 0,
          description: "Forces trumps",
        },
        {
          index: 2,
          label: "Exit 3♦",
          cards: [Card.createCard(Suit.Diamonds, Rank.Three, 0)],
          points: 0,
          description: "Passes lead",
        },
      ];

      const prompt = buildCompactTrickPrompt(perception, actions);

      expect(prompt.system).toContain("Grandmaster AI");
      expect(prompt.user).toContain("1: Command with BJ");
      expect(prompt.user).toContain("2: Exit 3♦");
      expect(prompt.user).toContain("actionIndex");
      expect(prompt.user.length).toBeLessThan(1200); // <300 tokens
    });
  });
});
