import {
  Card,
  GamePhase,
  PlayerId,
  Rank,
  Suit,
  TrumpInfo,
} from "../../src/types";
import { createGameContext } from "../../src/ai/aiGameContext";
import { detectStrategicInflection } from "../../src/ai/llm/llmInflectionDetector";
import { getActiveRoundPlan } from "../../src/ai/llm/llmPlanState";
import { createGameState, givePlayerCards } from "../helpers/gameStates";
import { createCompletedTrick } from "../helpers/tricks";
import { createTrumpInfo } from "../helpers/trump";

describe("llmInflectionDetector", () => {
  const trumpInfo: TrumpInfo = createTrumpInfo(Rank.Two, Suit.Spades);

  it("should trigger alert when attacking score crosses 60 pts", () => {
    const hand = Array.from({ length: 15 }, (_, i) =>
      Card.createCard(Suit.Hearts, Rank.Three, 0),
    );

    const gameState = createGameState({
      trumpInfo,
      gamePhase: GamePhase.Playing,
      currentPlayerIndex: 1, // Bot1
    });
    // Set attacking team (teams[1]) points to 65
    gameState.teams[1].points = 65;

    const stateWithCards = givePlayerCards(gameState, 1, hand);
    const gameContext = createGameContext(stateWithCards, PlayerId.Bot1);
    const plan = getActiveRoundPlan(PlayerId.Bot1, true, 10);

    const alert = detectStrategicInflection(
      stateWithCards,
      PlayerId.Bot1,
      plan,
      gameContext,
    );

    expect(alert).toBeDefined();
    expect(alert).toContain("65/80 pts");
  });

  it("should trigger alert when hand size is <= 7 cards (endgame kitty defense)", () => {
    const hand = [
      Card.createCard(Suit.Hearts, Rank.Three, 0),
      Card.createCard(Suit.Hearts, Rank.Four, 0),
      Card.createCard(Suit.Diamonds, Rank.Five, 0),
    ]; // 3 cards

    const gameState = createGameState({
      trumpInfo,
      gamePhase: GamePhase.Playing,
      currentPlayerIndex: 1,
    });
    const stateWithCards = givePlayerCards(gameState, 1, hand);
    const gameContext = createGameContext(stateWithCards, PlayerId.Bot1);
    const plan = getActiveRoundPlan(PlayerId.Bot1, true, 20);

    const alert = detectStrategicInflection(
      stateWithCards,
      PlayerId.Bot1,
      plan,
      gameContext,
    );

    expect(alert).toBeDefined();
    expect(alert).toContain("Endgame reached");
  });

  it("should trigger alert when opponent unexpectedly ruffed team lead on last trick", () => {
    const hand = Array.from({ length: 15 }, (_, i) =>
      Card.createCard(Suit.Hearts, Rank.Three, 0),
    );

    // Last trick: Human led Ace of Hearts, won by Bot1 (Opponent) with 3 of Spades (trump)
    const trick1 = createCompletedTrick(
      PlayerId.Human,
      [Card.createCard(Suit.Hearts, Rank.Ace, 0)],
      [
        {
          playerId: PlayerId.Bot1,
          cards: [Card.createCard(Suit.Spades, Rank.Three, 0)], // Trump ruff
        },
        {
          playerId: PlayerId.Bot2,
          cards: [Card.createCard(Suit.Hearts, Rank.Eight, 0)],
        },
        {
          playerId: PlayerId.Bot3,
          cards: [Card.createCard(Suit.Hearts, Rank.Nine, 0)],
        },
      ],
      PlayerId.Bot1,
    );

    const gameState = createGameState({
      trumpInfo,
      gamePhase: GamePhase.Playing,
      currentPlayerIndex: 0,
      tricks: [trick1],
    });

    const stateWithCards = givePlayerCards(gameState, 0, hand);
    const gameContext = createGameContext(stateWithCards, PlayerId.Human);
    const plan = getActiveRoundPlan(PlayerId.Human, true, 2);

    const alert = detectStrategicInflection(
      stateWithCards,
      PlayerId.Human,
      plan,
      gameContext,
    );

    expect(alert).toBeDefined();
    expect(alert).toContain("RUFFED your team's Hearts lead");
  });
});
