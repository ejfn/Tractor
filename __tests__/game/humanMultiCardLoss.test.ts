import { Card } from "../../src/types";
import {
  processPlay,
  getAIMoveWithErrorHandling,
} from "../../src/game/playProcessing";
import { createFullyDealtGameState } from "../helpers/gameStates";
import { gameLogger } from "../../src/utils/gameLogger";

describe("Human Multi-Card Loss Bug", () => {
  test("Reproduce human losing multiple cards", () => {
    const gameState = createFullyDealtGameState();
    let state = gameState;

    gameLogger.info("test_initial_state", {}, "=== Initial state ===");
    gameLogger.info(
      "test_all_players_cards",
      { cardCounts: state.players.map((p) => p.hand.length) },
      `All players have: ${state.players.map((p) => p.hand.length).join(", ")} cards`,
    );

    // Play first trick - Human wins
    gameLogger.info("test_trick_1_start", {}, "\n=== TRICK 1 ===");
    for (let play = 0; play < 4; play++) {
      const currentPlayer = state.players[state.currentPlayerIndex];
      const cardsBefore = state.players.map((p) => p.hand.length);

      const cardsToPlay = [currentPlayer.hand[0]];
      const result = processPlay(state, cardsToPlay);

      const cardsAfter = result.newState.players.map((p) => p.hand.length);
      gameLogger.info(
        "test_player_card_change",
        {
          playerName: currentPlayer.id,
          before: cardsBefore[state.currentPlayerIndex],
          after: cardsAfter[state.currentPlayerIndex],
        },
        `${currentPlayer.id}: ${cardsBefore[state.currentPlayerIndex]} -> ${cardsAfter[state.currentPlayerIndex]}`,
      );

      state = result.newState;

      if (result.trickComplete) {
        gameLogger.info(
          "test_trick_winner",
          { winnerId: result.trickWinnerId },
          `Winner: ${result.trickWinnerId}`,
        );
      }
    }

    gameLogger.info(
      "test_after_trick_1",
      { cardCounts: state.players.map((p) => p.hand.length) },
      `After trick 1: ${state.players.map((p) => p.hand.length).join(", ")}`,
    );

    // Play second trick - focus on human's turn
    gameLogger.info("test_trick_2_start", {}, "\n=== TRICK 2 ===");

    // First play (should be the previous winner)
    const firstPlayer = state.players[state.currentPlayerIndex];
    gameLogger.info(
      "test_first_player",
      { playerName: firstPlayer.id, playerIndex: state.currentPlayerIndex },
      `\nFirst player: ${firstPlayer.id} (index ${state.currentPlayerIndex})`,
    );
    gameLogger.info(
      "test_cards_before_all",
      { cardCounts: state.players.map((p) => p.hand.length) },
      `Cards before ALL players: ${state.players.map((p) => p.hand.length).join(", ")}`,
    );

    // Get the specific cards the human will play
    let humanCardsToPlay = [];
    if (firstPlayer.isHuman) {
      gameLogger.info(
        "test_human_hand_size",
        { handSize: firstPlayer.hand.length },
        `Human hand size: ${firstPlayer.hand.length}`,
      );
      gameLogger.info(
        "test_human_hand_sample",
        {
          handSample: firstPlayer.hand
            .slice(0, 5)
            .map((c) => `${c.rank}${c.suit || "JOKER"}`)
            .join(", "),
        },
        `Human hand sample: ${firstPlayer.hand
          .slice(0, 5)
          .map((c) => `${c.rank}${c.suit || "JOKER"}`)
          .join(", ")}`,
      );

      // Check if human might play multiple cards (pair, tractor, etc)
      const pairs = [];
      for (let i = 0; i < firstPlayer.hand.length - 1; i++) {
        if (
          firstPlayer.hand[i].rank === firstPlayer.hand[i + 1].rank &&
          firstPlayer.hand[i].suit === firstPlayer.hand[i + 1].suit
        ) {
          pairs.push([firstPlayer.hand[i], firstPlayer.hand[i + 1]]);
        }
      }

      if (pairs.length > 0) {
        gameLogger.info(
          "test_human_pairs",
          { pairCount: pairs.length },
          `Human has ${pairs.length} pairs`,
        );
        humanCardsToPlay = pairs[0]; // Play first pair
      } else {
        humanCardsToPlay = [firstPlayer.hand[0]];
      }
    } else {
      const aiMove = getAIMoveWithErrorHandling(state);
      humanCardsToPlay = aiMove.error ? [firstPlayer.hand[0]] : aiMove.cards;
    }

    gameLogger.info(
      "test_playing_cards",
      { cardCount: humanCardsToPlay.length },
      `Playing ${humanCardsToPlay.length} cards`,
    );

    // Process the play with detailed tracking
    const beforeState = JSON.parse(JSON.stringify(state)); // Deep copy for comparison
    const result = processPlay(state, humanCardsToPlay);

    gameLogger.info(
      "test_after_processing_play",
      {},
      "\nAfter processing play:",
    );
    const cardsAfter = result.newState.players.map((p) => p.hand.length);
    gameLogger.info(
      "test_cards_after_all",
      { cardCounts: cardsAfter },
      `Cards after ALL players: ${cardsAfter.join(", ")}`,
    );

    // Check each player's card change
    for (let i = 0; i < 4; i++) {
      const before = beforeState.players[i].hand.length;
      const after = result.newState.players[i].hand.length;
      const diff = before - after;

      if (diff !== 0) {
        gameLogger.info(
          "test_player_lost_cards",
          { playerIndex: i, playerName: state.players[i].id, cardsLost: diff },
          `Player ${i} (${state.players[i].id}): lost ${diff} cards`,
        );

        if (
          i === state.currentPlayerIndex &&
          diff !== humanCardsToPlay.length
        ) {
          gameLogger.error(
            "test_wrong_card_loss",
            { playerIndex: i, expected: humanCardsToPlay.length, actual: diff },
            `ERROR: Player ${i} should have lost ${humanCardsToPlay.length} cards but lost ${diff}`,
          );
        } else if (i !== state.currentPlayerIndex && diff > 0) {
          gameLogger.error(
            "test_unexpected_card_loss",
            { playerIndex: i, cardsLost: diff },
            `ERROR: Player ${i} wasn't playing but lost ${diff} cards`,
          );
        }
      }
    }

    // Check if this reproduces the bug
    const humanIndex = 0;
    const humanBefore = beforeState.players[humanIndex].hand.length;
    const humanAfter = result.newState.players[humanIndex].hand.length;
    const humanLost = humanBefore - humanAfter;

    if (humanLost > humanCardsToPlay.length) {
      gameLogger.error(
        "test_bug_reproduced",
        { cardsPlayed: humanCardsToPlay.length, cardsLost: humanLost },
        `\nBUG REPRODUCED: Human played ${humanCardsToPlay.length} cards but lost ${humanLost} cards`,
      );

      // Analyze what happened
      gameLogger.info("test_debugging_info", {}, "\nDebugging info:");
      gameLogger.info(
        "test_current_player_index",
        { currentPlayerIndex: state.currentPlayerIndex },
        `Current player index: ${state.currentPlayerIndex}`,
      );
      gameLogger.info(
        "test_human_player_index",
        { humanIndex },
        `Human player index: ${humanIndex}`,
      );
      gameLogger.info(
        "test_cards_played_ids",
        { cardIds: humanCardsToPlay.map((c) => c.id) },
        `Cards played IDs: ${humanCardsToPlay.map((c) => c.id).join(", ")}`,
      );

      // Check the hand differences
      const beforeIds = beforeState.players[humanIndex].hand.map(
        (c: Card) => c.id,
      );
      const afterIds = result.newState.players[humanIndex].hand.map(
        (c: Card) => c.id,
      );
      const lostIds = beforeIds.filter((id: string) => !afterIds.includes(id));

      gameLogger.info(
        "test_lost_card_ids",
        { lostIds },
        `Lost card IDs: ${lostIds.join(", ")}`,
      );
      gameLogger.info(
        "test_expected_to_lose",
        { expectedIds: humanCardsToPlay.map((c: Card) => c.id) },
        `Expected to lose: ${humanCardsToPlay.map((c: Card) => c.id).join(", ")}`,
      );

      const unexpectedLoss = lostIds.filter(
        (id: string) => !humanCardsToPlay.some((c: Card) => c.id === id),
      );
      if (unexpectedLoss.length > 0) {
        gameLogger.error(
          "test_unexpected_cards_lost",
          { unexpectedIds: unexpectedLoss },
          `UNEXPECTED CARDS LOST: ${unexpectedLoss.join(", ")}`,
        );
      }
    }

    // Continue playing to see if pattern continues
    state = result.newState;

    // Play rest of trick 2
    for (let play = 1; play < 4; play++) {
      const currentPlayer = state.players[state.currentPlayerIndex];
      const cardsBefore = state.players.map((p) => p.hand.length);

      let cardsToPlay = [];
      if (currentPlayer.isHuman) {
        cardsToPlay = [currentPlayer.hand[0]];
      } else {
        const aiMove = getAIMoveWithErrorHandling(state);
        cardsToPlay = aiMove.error ? [currentPlayer.hand[0]] : aiMove.cards;
      }

      const result = processPlay(state, cardsToPlay);
      const cardsAfter = result.newState.players.map((p) => p.hand.length);

      gameLogger.info(
        "test_player_card_change_trick2",
        {
          playerName: currentPlayer.id,
          before: cardsBefore[state.currentPlayerIndex],
          after: cardsAfter[state.currentPlayerIndex],
        },
        `${currentPlayer.id}: ${cardsBefore[state.currentPlayerIndex]} -> ${cardsAfter[state.currentPlayerIndex]}`,
      );

      // Check for anomalies
      for (let i = 0; i < 4; i++) {
        const diff = cardsBefore[i] - cardsAfter[i];
        if (diff > 0 && i !== state.currentPlayerIndex) {
          gameLogger.error(
            "test_non_playing_player_lost_cards",
            {
              playerIndex: i,
              playerName: state.players[i].id,
              cardsLost: diff,
            },
            `ERROR: Player ${i} (${state.players[i].id}) lost ${diff} cards but wasn't playing`,
          );
        }
      }

      state = result.newState;
    }

    gameLogger.info(
      "test_after_trick_2",
      { cardCounts: state.players.map((p) => p.hand.length) },
      `\nAfter trick 2: ${state.players.map((p) => p.hand.length).join(", ")}`,
    );

    // Final verification
    const finalCounts = state.players.map((p) => p.hand.length);
    const expectedCount = 25 - 2; // Started with 25, played 2 tricks

    finalCounts.forEach((count, idx) => {
      if (count !== expectedCount) {
        gameLogger.error(
          "test_final_card_count_error",
          {
            playerIndex: idx,
            playerName: state.players[idx].id,
            actualCount: count,
            expectedCount,
          },
          `ERROR: Player ${idx} (${state.players[idx].id}) has ${count} cards, expected ${expectedCount}`,
        );
      }
    });
  });
});
