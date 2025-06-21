import {
  getAIMoveWithErrorHandling,
  processPlay,
} from "../../src/game/playProcessing";
import { Card } from "../../src/types";
import { createFullyDealtGameState } from "../helpers/gameStates";
import { gameLogger } from "../../src/utils/gameLogger";

describe("Card Count Integration Test", () => {
  test("Track card removal through processPlay", () => {
    // Initialize game with 4 players
    const gameState = createFullyDealtGameState();

    let state = gameState;

    // Log initial state
    gameLogger.info(
      "test_initial_card_counts",
      { playerCounts: state.players.map((p) => p.hand.length) },
      "Initial card counts",
    );
    state.players.forEach((p, idx) => {
      gameLogger.info(
        "test_player_card_count",
        { playerIndex: idx, playerName: p.id, cardCount: p.hand.length },
        `Player ${idx} (${p.id}): ${p.hand.length} cards`,
      );
    });

    // Play one complete trick
    for (let play = 0; play < 4; play++) {
      const currentPlayerIdx = state.currentPlayerIndex;
      const currentPlayer = state.players[currentPlayerIdx];
      gameLogger.info(
        "test_play_start",
        { playNumber: play + 1 },
        `--- Play ${play + 1} ---`,
      );
      gameLogger.info(
        "test_current_player",
        { playerIndex: currentPlayerIdx, playerName: currentPlayer.id },
        `Current player: ${currentPlayerIdx} (${currentPlayer.id})`,
      );
      gameLogger.info(
        "test_card_counts_before",
        { cardCounts: state.players.map((p) => p.hand.length) },
        `Card counts before: ${state.players.map((p) => p.hand.length).join(", ")}`,
      );

      // For simplicity, play the first card
      const cardsToPlay = [currentPlayer.hand[0]];
      gameLogger.info(
        "test_playing_cards",
        {
          cardCount: cardsToPlay.length,
          cardInfo: `${cardsToPlay[0].suit || "JOKER"}${cardsToPlay[0].rank || ""}`,
        },
        `Playing ${cardsToPlay.length} card(s): ${cardsToPlay[0].suit || "JOKER"}${cardsToPlay[0].rank || ""}`,
      );

      // Store card IDs and player indices before the play
      const cardCountsBefore = state.players.map((p) => p.hand.length);
      const cardIdsBefore = state.players.map((p) => p.hand.map((c) => c.id));

      // Process the play
      const result = processPlay(state, cardsToPlay);

      // Update state
      state = result.newState;
      gameLogger.info(
        "test_card_counts_after",
        { cardCounts: state.players.map((p) => p.hand.length) },
        `Card counts after: ${state.players.map((p) => p.hand.length).join(", ")}`,
      );
      gameLogger.info(
        "test_new_current_player",
        { currentPlayerIndex: state.currentPlayerIndex },
        `New current player: ${state.currentPlayerIndex}`,
      );

      // Track changes
      state.players.forEach((player, idx) => {
        const countBefore = cardCountsBefore[idx];
        const countAfter = player.hand.length;
        const cardIdsDiff = cardIdsBefore[idx].filter(
          (id) => !player.hand.some((c) => c.id === id),
        );

        if (countBefore !== countAfter) {
          gameLogger.info(
            "test_player_card_change",
            {
              playerIndex: idx,
              playerName: player.id,
              countBefore,
              countAfter,
              cardsLost: cardIdsDiff.length,
            },
            `  Player ${idx} (${player.id}): ${countBefore} -> ${countAfter} (lost ${cardIdsDiff.length} cards)`,
          );
          if (cardIdsDiff.length > 0) {
            gameLogger.info(
              "test_lost_card_ids",
              { playerIndex: idx, lostCardIds: cardIdsDiff },
              `    Lost card IDs: ${cardIdsDiff.join(", ")}`,
            );
          }

          // Only the player who just played should lose cards
          if (idx !== currentPlayerIdx) {
            gameLogger.error(
              "test_invalid_card_loss",
              {
                playerIndex: idx,
                playerName: player.id,
                currentPlayerIndex: currentPlayerIdx,
              },
              `ERROR: Player ${idx} (${player.id}) lost cards but wasn't the current player!`,
            );
            throw new Error(`Player ${idx} lost cards incorrectly`);
          }
        }
      });

      if (result.trickComplete) {
        gameLogger.info(
          "test_trick_complete",
          { winnerId: result.trickWinnerId },
          `Trick complete! Winner: ${result.trickWinnerId}`,
        );
      }
    }

    // Final verification
    const finalCounts = state.players.map((p) => p.hand.length);
    gameLogger.info(
      "test_final_card_counts",
      { finalCounts },
      `\nFinal card counts: ${finalCounts.join(", ")}`,
    );
    const uniqueCounts = new Set(finalCounts);
    expect(uniqueCounts.size).toBe(1);
  });

  test("Track processPlay with state mutations", () => {
    const gameState = createFullyDealtGameState();

    // Make first play
    gameLogger.info(
      "test_state_mutation_start",
      {},
      "\n=== Testing state mutation ===",
    );
    const originalState = gameState;
    const player0Cards = originalState.players[0].hand.map((c) => c.id);

    gameLogger.info(
      "test_player_0_initial_cards",
      { cardCount: originalState.players[0].hand.length },
      `Player 0 has ${originalState.players[0].hand.length} cards`,
    );

    // Process human play
    const result1 = processPlay(originalState, [
      originalState.players[0].hand[0],
    ]);

    gameLogger.info("test_after_play", {}, `After play:`);
    gameLogger.info(
      "test_original_state_cards",
      { cardCount: originalState.players[0].hand.length },
      `  Original state player 0: ${originalState.players[0].hand.length} cards`,
    );
    gameLogger.info(
      "test_result_state_cards",
      { cardCount: result1.newState.players[0].hand.length },
      `  Result state player 0: ${result1.newState.players[0].hand.length} cards`,
    );

    // Check if original state was mutated
    const player0CardsAfter = originalState.players[0].hand.map((c) => c.id);
    if (player0Cards.length !== player0CardsAfter.length) {
      gameLogger.error(
        "test_original_state_mutated",
        {},
        "ERROR: Original state was mutated!",
      );
      gameLogger.error(
        "test_mutation_details",
        { before: player0Cards.length, after: player0CardsAfter.length },
        `  Before: ${player0Cards.length} cards`,
      );
      gameLogger.error(
        "test_mutation_details_after",
        { after: player0CardsAfter.length },
        `  After: ${player0CardsAfter.length} cards`,
      );
    }

    // Now make another play with the new state
    const currentPlayer =
      result1.newState.players[result1.newState.currentPlayerIndex];

    gameLogger.info(
      "test_next_player_playing",
      {
        playerIndex: result1.newState.currentPlayerIndex,
        playerName: currentPlayer.id,
      },
      `\nPlayer ${result1.newState.currentPlayerIndex} (${currentPlayer.id}) playing...`,
    );
    const cardsBefore = result1.newState.players.map((p) => p.hand.length);

    let cardsToPlay: Card[] = [];
    if (currentPlayer.isHuman) {
      cardsToPlay = [currentPlayer.hand[0]];
    } else {
      const aiMove = getAIMoveWithErrorHandling(result1.newState);
      cardsToPlay = aiMove.error ? [currentPlayer.hand[0]] : aiMove.cards;
    }

    const result2 = processPlay(result1.newState, cardsToPlay);

    gameLogger.info("test_card_counts_comparison", {}, `Card counts:`);
    gameLogger.info(
      "test_card_counts_before_2",
      { cardCounts: cardsBefore },
      `  Before: ${cardsBefore.join(", ")}`,
    );
    gameLogger.info(
      "test_card_counts_after_2",
      { cardCounts: result2.newState.players.map((p) => p.hand.length) },
      `  After: ${result2.newState.players.map((p) => p.hand.length).join(", ")}`,
    );

    // Check each player's card count
    result2.newState.players.forEach((player, idx) => {
      const before = cardsBefore[idx];
      const after = player.hand.length;
      const wasCurrentPlayer = idx === result1.newState.currentPlayerIndex;

      if (wasCurrentPlayer) {
        expect(after).toBe(before - cardsToPlay.length);
      } else {
        if (after !== before) {
          gameLogger.error(
            "test_incorrect_card_loss",
            {
              playerIndex: idx,
              playerName: player.id,
              cardsLost: before - after,
            },
            `ERROR: Player ${idx} (${player.id}) lost ${before - after} cards incorrectly!`,
          );
        }
        expect(after).toBe(before);
      }
    });
  });
});
