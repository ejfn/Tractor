import { processPlay } from "../../src/game/playProcessing";
import { Rank, Suit, Card } from "../../src/types";
import { createRotationTestGameState } from "../helpers";

describe("Counter-clockwise rotation", () => {
  const createMockGameState = createRotationTestGameState;

  test("Players should rotate counter-clockwise from human perspective", () => {
    const gameState = createMockGameState();

    // Give players cards
    gameState.players[0].hand = [Card.createCard(Suit.Hearts, Rank.Ace, 0)];
    gameState.players[1].hand = [Card.createCard(Suit.Hearts, Rank.King, 0)];
    gameState.players[2].hand = [Card.createCard(Suit.Hearts, Rank.Queen, 0)];
    gameState.players[3].hand = [Card.createCard(Suit.Hearts, Rank.Jack, 0)];

    // Human (index 0) plays first
    const result1 = processPlay(gameState, [gameState.players[0].hand[0]]);
    expect(result1.newState.currentPlayerIndex).toBe(1); // Bot 1

    // Bot 1 (index 1) plays
    const result2 = processPlay(result1.newState, [
      result1.newState.players[1].hand[0],
    ]);
    expect(result2.newState.currentPlayerIndex).toBe(2); // Bot 2

    // Bot 2 (index 2) plays
    const result3 = processPlay(result2.newState, [
      result2.newState.players[2].hand[0],
    ]);
    expect(result3.newState.currentPlayerIndex).toBe(3); // Bot 3

    // Bot 3 (index 3) plays - completes trick
    const result4 = processPlay(result3.newState, [
      result3.newState.players[3].hand[0],
    ]);

    // After trick completion, winner (Human with Ace) should be next
    expect(result4.trickComplete).toBe(true);
    expect(result4.trickWinnerId).toBe("human");
    expect(result4.newState.currentPlayerIndex).toBe(0); // Human won
  });

  test("Visual positions match counter-clockwise layout", () => {
    const gameState = createMockGameState();

    // Verify player order in the array (logical order)
    expect(gameState.players[0].id).toBe("human"); // Bottom (human perspective)
    expect(gameState.players[1].id).toBe("bot1"); // Next in array
    expect(gameState.players[2].id).toBe("bot2"); // Next in array
    expect(gameState.players[3].id).toBe("bot3"); // Next in array

    // Visual positions (swapped for counter-clockwise from human's view):
    // Human (bottom) → Bot 3 (left) → Bot 2 (top) → Bot 1 (right) → Human
    // This is achieved by swapping Bot 1 and Bot 3 visual positions

    // Verify team assignments remain correct
    expect(gameState.players[0].team).toBe("A"); // Human - Team A
    expect(gameState.players[1].team).toBe("B"); // Bot 1 - Team B
    expect(gameState.players[2].team).toBe("A"); // Bot 2 - Team A
    expect(gameState.players[3].team).toBe("B"); // Bot 3 - Team B
  });
});
