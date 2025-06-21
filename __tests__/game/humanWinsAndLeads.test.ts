import { describe, expect, test } from "@jest/globals";
import {
  getAIMoveWithErrorHandling,
  processPlay,
} from "../../src/game/playProcessing";
import { Card, DeckId, GamePhase, Rank, Suit } from "../../src/types";
import { createGameState, givePlayerCards } from "../helpers/gameStates";
import { gameLogger } from "../../src/utils/gameLogger";

describe("Human Wins and Leads Bug", () => {
  test("Human wins first trick and leads second", () => {
    // Create a deterministic game state where human is guaranteed to win first trick
    let gameState = createGameState({
      gamePhase: GamePhase.Playing,
      currentPlayerIndex: 0, // Human starts
    });

    // Give human high cards guaranteed to win
    // Create unique cards by varying suit, rank, and deck ID to ensure ALL cards have unique IDs
    const suits = [Suit.Clubs, Suit.Diamonds, Suit.Hearts, Suit.Spades];
    const ranks = [
      Rank.Three,
      Rank.Four,
      Rank.Five,
      Rank.Six,
      Rank.Seven,
      Rank.Eight,
      Rank.Nine,
      Rank.Ten,
      Rank.Jack,
      Rank.Queen,
    ];

    gameState = givePlayerCards(gameState, 0, [
      Card.createCard(Suit.Spades, Rank.Ace, 0),
      Card.createCard(Suit.Hearts, Rank.Ace, 0),
      Card.createCard(Suit.Spades, Rank.King, 0),
      Card.createCard(Suit.Hearts, Rank.King, 0),
      ...Array.from({ length: 21 }, (_, i) =>
        Card.createCard(suits[i % 4], ranks[i % 10], (i % 2) as DeckId),
      ),
    ]);

    // Give AI players lower cards that cannot beat the human's aces
    gameState = givePlayerCards(
      gameState,
      1,
      Array.from({ length: 25 }, (_, i) =>
        Card.createCard(suits[i % 4], ranks[i % 10], (i % 2) as DeckId),
      ),
    );
    gameState = givePlayerCards(
      gameState,
      2,
      Array.from({ length: 25 }, (_, i) =>
        Card.createCard(
          suits[(i + 1) % 4],
          ranks[(i + 1) % 10],
          (i % 2) as DeckId,
        ),
      ),
    );
    gameState = givePlayerCards(
      gameState,
      3,
      Array.from({ length: 25 }, (_, i) =>
        Card.createCard(
          suits[(i + 2) % 4],
          ranks[(i + 2) % 10],
          (i % 2) as DeckId,
        ),
      ),
    );

    let state = gameState;

    // Play first trick - human leads with Ace of Spades (guaranteed to win with no trump)
    gameLogger.info(
      "test_first_trick_start",
      {},
      "=== First Trick (Human leads and wins) ===",
    );

    // Human plays Ace of Spades
    const humanAce = [state.players[0].hand[0]]; // Ace of Spades

    let result = processPlay(state, humanAce);
    state = result.newState;

    // AI players follow with their lower cards
    for (let play = 1; play < 4; play++) {
      const currentPlayer = state.players[state.currentPlayerIndex];
      const aiMove = getAIMoveWithErrorHandling(state);
      const cardsToPlay = aiMove.error ? [currentPlayer.hand[0]] : aiMove.cards;

      result = processPlay(state, cardsToPlay);
      state = result.newState;
    }

    // Verify human won the trick and all players have 24 cards
    expect(result.trickComplete).toBe(true);
    expect(result.trickWinnerId).toBe("human");
    expect(state.players.map((p) => p.hand.length)).toEqual([24, 24, 24, 24]);

    // Verify human leads the second trick
    expect(state.currentPlayerIndex).toBe(0); // Human should be leading

    gameLogger.info(
      "test_second_trick_start",
      {},
      "=== Second Trick (Human leads again) ===",
    );

    // Human plays another card (Ace of Hearts)
    const humanSecondCard = [state.players[0].hand[0]]; // Ace of Hearts
    const cardCountsBefore = state.players.map((p) => p.hand.length);

    result = processPlay(state, humanSecondCard);
    state = result.newState;

    const cardCountsAfter = state.players.map((p) => p.hand.length);

    // Verify only the human lost a card
    expect(cardCountsBefore[0] - cardCountsAfter[0]).toBe(1); // Human lost 1 card
    expect(cardCountsBefore[1] - cardCountsAfter[1]).toBe(0); // Bot 1 lost 0 cards
    expect(cardCountsBefore[2] - cardCountsAfter[2]).toBe(0); // Bot 2 lost 0 cards
    expect(cardCountsBefore[3] - cardCountsAfter[3]).toBe(0); // Bot 3 lost 0 cards

    gameLogger.info(
      "test_completion_success",
      { cardCountsBefore, cardCountsAfter },
      "Test completed successfully - no card count anomalies detected",
    );
  });
});
