import { finalizeTrumpDeclaration } from "../../src/game/dealingAndDeclaration";
import { Card, GamePhase, Suit, Rank } from "../../src/types";
import { createGameState } from "../helpers/gameStates";
import { gameLogger } from "../../src/utils/gameLogger";

describe("Bot Kitty Swap Integration", () => {
  test("should handle complete flow when bot becomes round starting player", () => {
    // Create a game state simulating dealing completion where Bot1 is the round starting player
    const gameState = createGameState();
    gameState.gamePhase = GamePhase.Dealing;
    gameState.roundStartingPlayerIndex = 1; // Bot1 is round starting player (trump declarer)
    gameState.currentPlayerIndex = 1; // Bot1 is current player

    // Give all players proper hands (17 cards each)
    gameState.players.forEach((player, index) => {
      player.hand = Array(17)
        .fill(null)
        .map((_, cardIndex) => Card.createCard(Suit.Hearts, Rank.Two, 0));
    });

    // Create kitty with 8 cards
    gameState.kittyCards = Array(8)
      .fill(null)
      .map((_, index) => Card.createCard(Suit.Spades, Rank.Three, 0));

    // Simulate the GameScreenController logic: when dealing completes, finalize trump declaration
    const finalizedState = finalizeTrumpDeclaration(gameState);

    // Verify the flow worked correctly:

    // 1. Should transition to KittySwap phase
    expect(finalizedState.gamePhase).toBe(GamePhase.KittySwap);

    // 2. Bot1 should be current player
    expect(finalizedState.currentPlayerIndex).toBe(1);

    // 3. Bot1 should have 25 cards (17 original + 8 kitty)
    expect(finalizedState.players[1].hand).toHaveLength(25);

    // 4. Other players should still have 17 cards
    expect(finalizedState.players[0].hand).toHaveLength(17); // Human
    expect(finalizedState.players[2].hand).toHaveLength(17); // Bot2
    expect(finalizedState.players[3].hand).toHaveLength(17); // Bot3

    // 5. Kitty should still contain the original cards (they stay for scoring)
    expect(finalizedState.kittyCards).toHaveLength(8);

    gameLogger.info(
      "test_bot_kitty_swap_success",
      {
        handSize: finalizedState.players[1].hand.length,
        currentPlayer:
          finalizedState.players[finalizedState.currentPlayerIndex].id,
        gamePhase: finalizedState.gamePhase,
      },
      "✅ Bot kitty swap flow test completed successfully",
    );
    gameLogger.debug(
      "test_bot1_hand_size",
      { handSize: finalizedState.players[1].hand.length },
      `Bot1 hand size: ${finalizedState.players[1].hand.length}`,
    );
    gameLogger.debug(
      "test_current_player",
      {
        currentPlayer:
          finalizedState.players[finalizedState.currentPlayerIndex].id,
      },
      `Current player: ${finalizedState.players[finalizedState.currentPlayerIndex].id}`,
    );
    gameLogger.debug(
      "test_game_phase",
      { gamePhase: finalizedState.gamePhase },
      `Game phase: ${finalizedState.gamePhase}`,
    );
  });

  test("should handle flow when human is round starting player", () => {
    // Create a game state where human is the round starting player
    const gameState = createGameState();
    gameState.gamePhase = GamePhase.Dealing;
    gameState.roundStartingPlayerIndex = 0; // Human is round starting player
    gameState.currentPlayerIndex = 0; // Human is current player

    // Give all players proper hands
    gameState.players.forEach((player, index) => {
      player.hand = Array(17)
        .fill(null)
        .map((_, cardIndex) => Card.createCard(Suit.Hearts, Rank.Two, 0));
    });

    // Create kitty with 8 cards
    gameState.kittyCards = Array(8)
      .fill(null)
      .map((_, index) => Card.createCard(Suit.Spades, Rank.Three, 0));

    // Simulate the GameScreenController logic
    const finalizedState = finalizeTrumpDeclaration(gameState);

    // Verify the flow:

    // 1. Should transition to KittySwap phase
    expect(finalizedState.gamePhase).toBe(GamePhase.KittySwap);

    // 2. Human should be current player
    expect(finalizedState.currentPlayerIndex).toBe(0);

    // 3. Human should have 25 cards
    expect(finalizedState.players[0].hand).toHaveLength(25);

    // 4. Bots should still have 17 cards
    expect(finalizedState.players[1].hand).toHaveLength(17); // Bot1
    expect(finalizedState.players[2].hand).toHaveLength(17); // Bot2
    expect(finalizedState.players[3].hand).toHaveLength(17); // Bot3

    gameLogger.debug(
      "test_human_kitty_swap_success",
      {},
      "✅ Human kitty swap flow test completed successfully",
    );
  });

  test("should work with different bot as round starting player", () => {
    // Test with Bot3 as round starting player
    const gameState = createGameState();
    gameState.gamePhase = GamePhase.Dealing;
    gameState.roundStartingPlayerIndex = 3; // Bot3 is round starting player
    gameState.currentPlayerIndex = 3; // Bot3 is current player

    // Give all players proper hands
    gameState.players.forEach((player, index) => {
      player.hand = Array(17)
        .fill(null)
        .map((_, cardIndex) => Card.createCard(Suit.Hearts, Rank.Two, 0));
    });

    // Create kitty with 8 cards
    gameState.kittyCards = Array(8)
      .fill(null)
      .map((_, index) => Card.createCard(Suit.Spades, Rank.Three, 0));

    const finalizedState = finalizeTrumpDeclaration(gameState);

    // Verify Bot3 got the kitty
    expect(finalizedState.gamePhase).toBe(GamePhase.KittySwap);
    expect(finalizedState.currentPlayerIndex).toBe(3);
    expect(finalizedState.players[3].hand).toHaveLength(25); // Bot3 has kitty
    expect(finalizedState.players[0].hand).toHaveLength(17); // Human
    expect(finalizedState.players[1].hand).toHaveLength(17); // Bot1
    expect(finalizedState.players[2].hand).toHaveLength(17); // Bot2

    gameLogger.debug(
      "test_bot3_kitty_swap_success",
      {},
      "✅ Bot3 kitty swap flow test completed successfully",
    );
  });
});
