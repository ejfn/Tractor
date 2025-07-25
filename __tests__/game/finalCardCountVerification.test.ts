import {
  getAIMoveWithErrorHandling,
  processPlay,
} from "../../src/game/playProcessing";
import { Card, Player, Rank } from "../../src/types";
import { gameLogger } from "../../src/utils/gameLogger";
import { createFullyDealtGameState } from "../helpers/gameStates";

describe("Final Card Count Verification", () => {
  test("Bot 3 maintains correct card count throughout extended gameplay", () => {
    const gameState = createFullyDealtGameState();
    let state = gameState;

    // Play 10 complete tricks
    for (let trickNum = 0; trickNum < 10; trickNum++) {
      const trickStartCounts = state.players.map((p: Player) => p.hand.length);

      gameLogger.info(
        "test_trick_start",
        { trickNum: trickNum + 1, cardCounts: trickStartCounts },
        `\nTrick ${trickNum + 1} starting with counts: ${trickStartCounts.join(", ")}`,
      );

      // Play all 4 players
      for (let playNum = 0; playNum < 4; playNum++) {
        const currentPlayer = state.players[state.currentPlayerIndex];
        const bot3Index = state.players.findIndex((p) => p.id === "bot3");
        const bot3Before = state.players[bot3Index].hand.length;

        // Get cards to play
        let cardsToPlay: Card[] = [];
        if (currentPlayer.isHuman) {
          cardsToPlay = [currentPlayer.hand[0]];
        } else {
          const aiMove = getAIMoveWithErrorHandling(state);
          cardsToPlay = aiMove.error ? [currentPlayer.hand[0]] : aiMove.cards;
        }

        // Process the play
        const result = processPlay(state, cardsToPlay);
        state = result.newState;

        const bot3After = state.players[bot3Index].hand.length;

        // Verify Bot 3 only lost cards when it was its turn
        if (
          state.currentPlayerIndex === bot3Index + 1 ||
          (state.currentPlayerIndex === 0 && result.trickComplete)
        ) {
          // Bot 3 just played or trick completed with Bot 3 as last player
          if (bot3Before === bot3After && currentPlayer.id === "bot3") {
            throw new Error(`Bot 3 didn't lose cards when it played!`);
          }
        } else if (bot3Before !== bot3After && currentPlayer.id !== "bot3") {
          throw new Error(
            `Bot 3 lost cards when it wasn't its turn! Player ${currentPlayer.id} was playing.`,
          );
        }

        if (result.trickComplete) {
          gameLogger.info(
            "test_trick_winner",
            { trickWinnerId: result.trickWinnerId },
            `  Trick won by ${result.trickWinnerId}`,
          );
        }
      }

      // Verify equal card counts after each trick
      const trickEndCounts = state.players.map((p: Player) => p.hand.length);
      const uniqueCounts = new Set(trickEndCounts);

      if (uniqueCounts.size > 1) {
        gameLogger.error(
          "test_card_count_imbalance",
          { trickNum: trickNum + 1, cardCounts: trickEndCounts },
          `ERROR: Unequal card counts after trick ${trickNum + 1}`,
        );
        gameLogger.error(
          "test_card_count_details",
          { cardCounts: trickEndCounts },
          `Counts: ${trickEndCounts.join(", ")}`,
        );

        // Show which players have different counts
        const expectedCount = trickEndCounts[0];
        state.players.forEach((player: Player, idx: number) => {
          if (player.hand.length !== expectedCount) {
            gameLogger.error(
              "test_player_count_mismatch",
              {
                playerName: player.id,
                actualCount: player.hand.length,
                expectedCount,
              },
              `  ${player.id} has ${player.hand.length} cards, expected ${expectedCount}`,
            );
          }
        });

        throw new Error("Card count imbalance detected");
      }

      gameLogger.info(
        "test_trick_complete",
        { trickNum: trickNum + 1, cardCount: trickEndCounts[0] },
        `  Trick ${trickNum + 1} complete. All players have ${trickEndCounts[0]} cards.`,
      );
    }

    // Final verification
    const finalCounts = state.players.map((p: Player) => p.hand.length);
    gameLogger.info(
      "test_final_verification",
      { finalCounts },
      `\nFinal card counts after 10 tricks: ${finalCounts.join(", ")}`,
    );

    expect(new Set(finalCounts).size).toBe(1);
    expect(finalCounts[3]).toBe(finalCounts[0]); // Bot 3 has same as Human
  });

  test("Winner correctly becomes next player", () => {
    const gameState = createFullyDealtGameState();
    let state = gameState;

    // Give Bot 3 all the aces to ensure it wins
    const bot3Index = 3;
    const allAces = state.players.flatMap((p: Player) =>
      p.hand.filter((c: Card) => c.rank === Rank.Ace),
    );
    const nonAcesBot3 = state.players[bot3Index].hand.filter(
      (c: Card) => c.rank !== Rank.Ace,
    );
    const otherCards = state.players.flatMap((p: Player, idx: number) =>
      idx !== bot3Index ? p.hand.filter((c: Card) => c.rank !== Rank.Ace) : [],
    );

    // Redistribute cards: Bot 3 gets all aces
    state.players[bot3Index].hand = [
      ...allAces,
      ...nonAcesBot3.slice(0, 25 - allAces.length),
    ];
    state.players.forEach((player: Player, idx: number) => {
      if (idx !== bot3Index) {
        const startIdx = idx * 25;
        player.hand = otherCards.slice(startIdx, startIdx + 25);
      }
    });

    gameLogger.info(
      "test_bot3_aces",
      {
        bot3AceCount: state.players[bot3Index].hand.filter(
          (c: Card) => c.rank === Rank.Ace,
        ).length,
      },
      `Bot 3 has ${state.players[bot3Index].hand.filter((c: Card) => c.rank === Rank.Ace).length} aces`,
    );

    // Play a trick
    const winners: string[] = [];

    for (let playNum = 0; playNum < 4; playNum++) {
      const currentPlayer = state.players[state.currentPlayerIndex];

      let cardsToPlay: Card[] = [];
      if (currentPlayer.isHuman) {
        cardsToPlay = [currentPlayer.hand[0]];
      } else {
        const aiMove = getAIMoveWithErrorHandling(state);
        cardsToPlay = aiMove.error ? [currentPlayer.hand[0]] : aiMove.cards;
      }

      const result = processPlay(state, cardsToPlay);
      state = result.newState;

      if (result.trickComplete) {
        if (!result.trickWinnerId) throw new Error("Trick winner ID missing");
        winners.push(result.trickWinnerId);
        gameLogger.info(
          "test_trick_winner_verification",
          { trickWinnerId: result.trickWinnerId },
          `Trick winner: ${result.trickWinnerId}`,
        );
        gameLogger.info(
          "test_expected_next_player",
          { expectedNextPlayer: result.trickWinnerId },
          `Next player should be: ${result.trickWinnerId}`,
        );
        gameLogger.info(
          "test_actual_next_player",
          { actualNextPlayer: state.players[state.currentPlayerIndex].id },
          `Next player is: ${state.players[state.currentPlayerIndex].id}`,
        );

        // Verify winner is the next player
        expect(state.players[state.currentPlayerIndex].id).toBe(
          result.trickWinnerId,
        );
      }
    }

    expect(winners.length).toBeGreaterThan(0);
  });
});
