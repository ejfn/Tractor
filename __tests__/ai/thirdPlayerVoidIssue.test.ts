import { getAIMove } from "../../src/ai/aiLogic";
import { Card, PlayerId, Rank, Suit, TrumpInfo } from "../../src/types";
import { initializeGame } from "../../src/utils/gameInitialization";
import { gameLogger } from "../../src/utils/gameLogger";

describe("3rd Player Void Issue - Both 3rd and 4th Players Void", () => {
  it("should NOT contribute point cards when both 3rd and 4th players are void of led suit", () => {
    const gameState = initializeGame();

    // Set up trump info
    const trumpInfo: TrumpInfo = {
      trumpRank: Rank.Two,
      trumpSuit: Suit.Hearts,
    };
    gameState.trumpInfo = trumpInfo;

    // Create trick scenario where teammate is leading Spades (both Bot2 and Bot3 are void)
    const humanLeadingCard: Card = Card.createCard(Suit.Spades, Rank.Ace, 0);
    const bot1Card: Card = Card.createCard(Suit.Spades, Rank.Four, 0);

    // Set up trick with human leading and winning
    gameState.currentTrick = {
      plays: [
        { playerId: PlayerId.Human, cards: [humanLeadingCard] },
        { playerId: PlayerId.Bot1, cards: [bot1Card] },
      ],
      points: 0,
      winningPlayerId: PlayerId.Human,
    };

    // Set current player to Bot2 (3rd player, partner of human)
    gameState.currentPlayerIndex = 2;
    const thirdPlayerId = PlayerId.Bot2;

    // Bot2 hand: VOID in Spades, has point cards in other suits
    const bot2Hand: Card[] = [
      // No Spades cards (void)
      Card.createCard(Suit.Clubs, Rank.Ten, 0), // 10 point card
      Card.createCard(Suit.Clubs, Rank.King, 0), // 10 point card
      Card.createCard(Suit.Diamonds, Rank.Five, 0), // 5 point card
      Card.createCard(Suit.Hearts, Rank.Three, 0), // Trump card
      Card.createCard(Suit.Hearts, Rank.Four, 0), // Trump card
    ];

    // Bot3 hand: ALSO VOID in Spades, has trump cards
    const bot3Hand: Card[] = [
      // No Spades cards (void)
      Card.createCard(Suit.Hearts, Rank.Ace, 0), // High trump
      Card.createCard(Suit.Hearts, Rank.King, 0), // High trump
      Card.createCard(Suit.Clubs, Rank.Seven, 0),
      Card.createCard(Suit.Diamonds, Rank.Eight, 0),
      Card.createCard(Suit.Diamonds, Rank.Nine, 0),
    ];

    // Set up players with void information
    gameState.players[2].hand = bot2Hand; // Bot2 (3rd player)
    gameState.players[3].hand = bot3Hand; // Bot3 (4th player)

    // Add previous tricks to establish void status in memory
    gameState.tricks = [
      {
        plays: [
          {
            playerId: PlayerId.Human,
            cards: [Card.createCard(Suit.Spades, Rank.Queen, 0)],
          },
          {
            playerId: PlayerId.Bot1,
            cards: [Card.createCard(Suit.Spades, Rank.Jack, 0)],
          },
          {
            playerId: PlayerId.Bot2,
            cards: [Card.createCard(Suit.Hearts, Rank.Five, 0)],
          }, // Bot2 trumped
          {
            playerId: PlayerId.Bot3,
            cards: [Card.createCard(Suit.Hearts, Rank.Six, 0)],
          }, // Bot3 trumped
        ],
        points: 0,
        winningPlayerId: PlayerId.Bot3,
      },
    ];

    // Get AI decision for Bot2 (3rd player)
    const aiDecision = getAIMove(gameState, thirdPlayerId);

    gameLogger.info("3rd_player_void_scenario", {
      aiDecision: aiDecision.map(
        (card) => `${card.rank}${card.suit?.charAt(0)}`,
      ),
      bot2Hand: bot2Hand.map((card) => `${card.rank}${card.suit?.charAt(0)}`),
      bot3Hand: bot3Hand.map((card) => `${card.rank}${card.suit?.charAt(0)}`),
      scenario: "both_3rd_4th_void_spades",
    });

    // ASSERTION: Should NOT contribute point cards since 4th player can trump in
    // Expected: Should play trump card (not point card) since both are void
    const playedCard = aiDecision[0];

    // Bot2 should NOT play point cards (Clubs 10, King, or Diamonds 5)
    expect(playedCard.points || 0).toBe(0);

    // Should play trump card since both 3rd and 4th are void
    expect(playedCard.suit).toBe(Suit.Hearts); // Trump suit

    // Should play a low trump card to conserve high ones
    expect(playedCard.rank).toEqual(expect.stringMatching(/^(3|4)$/));
  });

  it("should contribute point cards when only 3rd player is void but 4th player can follow suit", () => {
    const gameState = initializeGame();

    // Set up trump info
    const trumpInfo: TrumpInfo = {
      trumpRank: Rank.Two,
      trumpSuit: Suit.Hearts,
    };
    gameState.trumpInfo = trumpInfo;

    // Create trick scenario where teammate is leading Spades
    const humanLeadingCard: Card = Card.createCard(Suit.Spades, Rank.Ace, 0);
    const bot1Card: Card = Card.createCard(Suit.Spades, Rank.Four, 0);

    gameState.currentTrick = {
      plays: [
        { playerId: PlayerId.Human, cards: [humanLeadingCard] },
        { playerId: PlayerId.Bot1, cards: [bot1Card] },
      ],
      points: 0,
      winningPlayerId: PlayerId.Human,
    };

    gameState.currentPlayerIndex = 2;
    const thirdPlayerId = PlayerId.Bot2;

    // Bot2 hand: VOID in Spades, has point cards
    const bot2Hand: Card[] = [
      Card.createCard(Suit.Clubs, Rank.Ten, 0), // 10 point card
      Card.createCard(Suit.Clubs, Rank.King, 0), // 10 point card
      Card.createCard(Suit.Diamonds, Rank.Five, 0), // 5 point card
      Card.createCard(Suit.Hearts, Rank.Three, 0), // Trump card
    ];

    // Bot3 hand: CAN FOLLOW Spades (not void)
    const bot3Hand: Card[] = [
      Card.createCard(Suit.Spades, Rank.Seven, 0), // Can follow suit
      Card.createCard(Suit.Spades, Rank.Eight, 0), // Can follow suit
      Card.createCard(Suit.Clubs, Rank.Seven, 0),
      Card.createCard(Suit.Diamonds, Rank.Eight, 0),
    ];

    gameState.players[2].hand = bot2Hand; // Bot2 (3rd player)
    gameState.players[3].hand = bot3Hand; // Bot3 (4th player)

    // Previous trick shows Bot2 is void but Bot3 can follow
    gameState.tricks = [
      {
        plays: [
          {
            playerId: PlayerId.Human,
            cards: [Card.createCard(Suit.Spades, Rank.Queen, 0)],
          },
          {
            playerId: PlayerId.Bot1,
            cards: [Card.createCard(Suit.Spades, Rank.Jack, 0)],
          },
          {
            playerId: PlayerId.Bot2,
            cards: [Card.createCard(Suit.Hearts, Rank.Five, 0)],
          }, // Bot2 trumped (void)
          {
            playerId: PlayerId.Bot3,
            cards: [Card.createCard(Suit.Spades, Rank.Nine, 0)],
          }, // Bot3 followed suit
        ],
        points: 0,
        winningPlayerId: PlayerId.Human,
      },
    ];

    const aiDecision = getAIMove(gameState, thirdPlayerId);

    gameLogger.info("3rd_player_safe_scenario", {
      aiDecision: aiDecision.map(
        (card) => `${card.rank}${card.suit?.charAt(0)}`,
      ),
      scenario: "3rd_void_4th_can_follow",
    });

    // In this case, it's safer to contribute point cards since 4th player can follow suit
    const playedCard = aiDecision[0];

    // Should contribute point cards when safe to do so
    expect(playedCard.points).toBeGreaterThan(0);
  });
});
