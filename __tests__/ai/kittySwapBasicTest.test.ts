import {
  GameState,
  PlayerId,
  TeamId,
  Suit,
  Rank,
  TrumpInfo,
  GamePhase,
} from "../../src/types";
import { selectAIKittySwapCards } from "../../src/ai/kittySwap/kittySwapStrategy";
import { Card } from "../../src/types/card";
import { gameLogger } from "../../src/utils/gameLogger";

describe("AI Kitty Swap Basic Test", () => {
  test("Bot2 should select exactly 8 cards from 33-card hand - 10 runs", () => {
    // Create trump info: Hearts trump suit, rank 2 trump
    const trumpInfo: TrumpInfo = {
      trumpRank: Rank.Two,
      trumpSuit: Suit.Hearts,
    };

    // Create a realistic 33-card hand for Bot2 (25 original + 8 kitty)
    const bot2Hand: Card[] = [
      // Hearts (trump suit) - should be excluded
      Card.createCard(Suit.Hearts, Rank.Three, 0),
      Card.createCard(Suit.Hearts, Rank.Four, 1),
      Card.createCard(Suit.Hearts, Rank.Five, 0),
      Card.createCard(Suit.Hearts, Rank.Six, 1),
      Card.createCard(Suit.Hearts, Rank.Seven, 0),

      // Trump rank cards (2s) - should be excluded
      Card.createCard(Suit.Spades, Rank.Two, 0),
      Card.createCard(Suit.Clubs, Rank.Two, 1),

      // Aces and Kings - should be excluded
      Card.createCard(Suit.Spades, Rank.Ace, 0),
      Card.createCard(Suit.Clubs, Rank.King, 1),
      Card.createCard(Suit.Diamonds, Rank.Ace, 0),

      // Pairs - big pairs should be excluded
      Card.createCard(Suit.Spades, Rank.Queen, 0),
      Card.createCard(Suit.Spades, Rank.Queen, 1), // Queen pair
      Card.createCard(Suit.Clubs, Rank.Jack, 0),
      Card.createCard(Suit.Clubs, Rank.Jack, 1), // Jack pair

      // Small pairs - should be excluded
      Card.createCard(Suit.Diamonds, Rank.Eight, 0),
      Card.createCard(Suit.Diamonds, Rank.Eight, 1), // 8 pair

      // Disposable cards (non-trump, non-Ace/King, small ranks, no pairs)
      Card.createCard(Suit.Spades, Rank.Three, 0),
      Card.createCard(Suit.Spades, Rank.Four, 1),
      Card.createCard(Suit.Spades, Rank.Six, 0),
      Card.createCard(Suit.Spades, Rank.Seven, 1),
      Card.createCard(Suit.Clubs, Rank.Three, 0),
      Card.createCard(Suit.Clubs, Rank.Four, 1),
      Card.createCard(Suit.Clubs, Rank.Five, 0),
      Card.createCard(Suit.Clubs, Rank.Six, 1),
      Card.createCard(Suit.Clubs, Rank.Seven, 0),
      Card.createCard(Suit.Diamonds, Rank.Three, 1),
      Card.createCard(Suit.Diamonds, Rank.Four, 0),
      Card.createCard(Suit.Diamonds, Rank.Six, 1),
      Card.createCard(Suit.Diamonds, Rank.Seven, 0),
      Card.createCard(Suit.Diamonds, Rank.Nine, 1),

      // Point cards (10s and 5s) - disposable but less preferred
      Card.createCard(Suit.Spades, Rank.Ten, 0),
      Card.createCard(Suit.Clubs, Rank.Ten, 1),
      Card.createCard(Suit.Diamonds, Rank.Five, 0),
    ];

    // Verify we have 33 cards
    expect(bot2Hand).toHaveLength(33);

    // Create game state with Bot2
    const gameState: GameState = {
      players: [
        { id: PlayerId.Human, hand: [], isHuman: true, team: TeamId.A },
        { id: PlayerId.Bot1, hand: [], isHuman: false, team: TeamId.B },
        { id: PlayerId.Bot2, hand: bot2Hand, isHuman: false, team: TeamId.A },
        { id: PlayerId.Bot3, hand: [], isHuman: false, team: TeamId.B },
      ],
      teams: [
        { id: TeamId.A, currentRank: Rank.Two, points: 0, isDefending: false },
        { id: TeamId.B, currentRank: Rank.Two, points: 0, isDefending: true },
      ],
      deck: [],
      kittyCards: [],
      currentTrick: null,
      trumpInfo,
      tricks: [],
      roundNumber: 1,
      currentPlayerIndex: 2,
      roundStartingPlayerIndex: 2,
      gamePhase: GamePhase.Playing,
    };

    // Run the test 10 times to check consistency
    for (let run = 1; run <= 10; run++) {
      gameLogger.info(
        "test_kitty_swap_run_start",
        { run },
        `\n--- Run ${run} ---`,
      );

      // Test kitty swap selection
      const selectedCards = selectAIKittySwapCards(gameState, PlayerId.Bot2);

      // Verify exactly 8 cards selected
      expect(selectedCards).toHaveLength(8);

      // Verify no duplicates
      const cardIds = selectedCards.map((card) => card.id);
      const uniqueCardIds = new Set(cardIds);
      expect(uniqueCardIds.size).toBe(8);

      // Verify all selected cards are from the original hand
      selectedCards.forEach((card) => {
        expect(bot2Hand.some((handCard) => handCard.id === card.id)).toBe(true);
      });

      // Verify no trump cards are selected
      const selectedTrumpCards = selectedCards.filter(
        (card) => card.suit === Suit.Hearts || card.rank === Rank.Two,
      );
      expect(selectedTrumpCards).toHaveLength(0);

      // Verify no Aces or Kings are selected
      const selectedHighCards = selectedCards.filter(
        (card) => card.rank === Rank.Ace || card.rank === Rank.King,
      );
      expect(selectedHighCards).toHaveLength(0);

      // Log the selection for inspection
      gameLogger.info(
        "test_kitty_swap_selected_cards",
        {
          run,
          selectedCards: selectedCards.map(
            (card) =>
              `${card.rank}${card.suit === Suit.Hearts ? "♥" : card.suit === Suit.Diamonds ? "♦" : card.suit === Suit.Clubs ? "♣" : "♠"}`,
          ),
        },
        "Selected cards for disposal:",
      );

      // Verify preference for non-point cards
      const selectedPointCards = selectedCards.filter(
        (card) => card.points > 0,
      );
      gameLogger.info(
        "test_kitty_swap_point_cards_selected",
        {
          run,
          pointCardsCount: selectedPointCards.length,
        },
        "Point cards selected:",
      );

      // Should prefer non-point cards when possible
      const availableNonPointCards = bot2Hand.filter(
        (card) =>
          card.points === 0 &&
          card.suit !== Suit.Hearts && // not trump suit
          card.rank !== Rank.Two && // not trump rank
          card.rank !== Rank.Ace &&
          card.rank !== Rank.King, // not biggest cards
      ).length;

      gameLogger.info(
        "test_kitty_swap_available_disposable_cards",
        {
          run,
          availableNonPointCards,
        },
        "Available non-point disposable cards:",
      );
    }
  });
});
