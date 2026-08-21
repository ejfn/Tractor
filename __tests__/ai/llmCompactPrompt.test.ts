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
  buildCompactLLMPrompt,
  parseCompactLLMResponse,
} from "../../src/ai/llm/llmCompactPrompt";
import { StrategicLine } from "../../src/ai/llm/llmStrategicLines";
import { getActiveRoundPlan } from "../../src/ai/llm/llmPlanState";
import { createGameState, givePlayerCards } from "../helpers/gameStates";
import { createTrumpInfo } from "../helpers/trump";

describe("llmCompactPrompt", () => {
  const trumpInfo: TrumpInfo = createTrumpInfo(Rank.Two, Suit.Spades);

  const mockLines: StrategicLine[] = [
    {
      id: "A",
      intent: "cash_winner",
      label: "Cash Boss (A♦)",
      description: "Guaranteed winner, claims 10 pts",
      cards: [Card.createCard(Suit.Diamonds, Rank.Ace, 0)],
      pointsAtStake: 10,
      isGuaranteedWinner: true,
    },
    {
      id: "B",
      intent: "safe_exit",
      label: "Safe Exit (3♣)",
      description: "Passes lead at 0 pt risk",
      cards: [Card.createCard(Suit.Clubs, Rank.Three, 0)],
      pointsAtStake: 0,
      isGuaranteedWinner: false,
    },
  ];

  it("should generate ultra-compact prompt with less than 400 words", () => {
    const hand = [
      Card.createCard(Suit.Diamonds, Rank.Ace, 0),
      Card.createCard(Suit.Clubs, Rank.Three, 0),
    ];

    const gameState = createGameState({
      trumpInfo,
      gamePhase: GamePhase.Playing,
      currentPlayerIndex: 1,
    });
    const stateWithCards = givePlayerCards(gameState, 1, hand);
    const gameContext = createGameContext(stateWithCards, PlayerId.Bot1);
    const plan = getActiveRoundPlan(PlayerId.Bot1, true, 1);

    const prompt = buildCompactLLMPrompt(
      stateWithCards,
      PlayerId.Bot1,
      hand,
      mockLines,
      plan,
      gameContext,
    );

    expect(prompt.system).toBeDefined();
    expect(prompt.user).toContain("[Line A]");
    expect(prompt.user).toContain("[Line B]");

    // Word count check
    const wordCount = prompt.user.split(/\s+/).length;
    expect(wordCount).toBeLessThan(150); // Very compact!
  });

  it("should parse standard JSON responses correctly", () => {
    const rawResponse = JSON.stringify({
      line: "A",
      strategy: "rush_points",
      reason: "Cash Ace to bank 10 pts",
    });

    const { selectedLine, parsedResponse } = parseCompactLLMResponse(
      rawResponse,
      mockLines,
    );

    expect(selectedLine).toBeDefined();
    expect(selectedLine?.id).toBe("A");
    expect(parsedResponse?.strategy).toBe("rush_points");
  });

  it("should parse markdown code-fenced JSON responses", () => {
    const rawResponse =
      '```json\n{\n  "line": "B",\n  "strategy": "conserve_and_control",\n  "reason": "Save trumps"\n}\n```';

    const { selectedLine } = parseCompactLLMResponse(rawResponse, mockLines);

    expect(selectedLine).toBeDefined();
    expect(selectedLine?.id).toBe("B");
  });

  it("should fall back gracefully to regex if JSON is slightly malformed", () => {
    const rawResponse = 'I think Line A is best. { "line": "A" }';

    const { selectedLine } = parseCompactLLMResponse(rawResponse, mockLines);

    expect(selectedLine).toBeDefined();
    expect(selectedLine?.id).toBe("A");
  });
});
