import { getAIMove } from "../../src/ai/aiLogic";
import { Card, GamePhase, PlayerId, Rank, Suit, TrumpInfo } from "../../src/types";
import { initializeGame } from "../../src/utils/gameInitialization";

describe("Fourth Player Teammate Competition Bug", () => {
  test("4th player should not beat teammate's winning trump pair with trump rank pair", () => {
    const gameState = initializeGame();
    
    // Set up trump info: Rank 2, Spades trump
    const trumpInfo: TrumpInfo = {
      trumpRank: Rank.Two,
      trumpSuit: Suit.Spades,
    };
    gameState.trumpInfo = trumpInfo;
    gameState.gamePhase = GamePhase.Playing;

    // Create trick: Human leads 7♣-7♣ pair, Bot2 beats with K♠-K♠, Bot1 disposes
    const humanCards = [
      Card.createCard(Suit.Clubs, Rank.Seven, 0),
      Card.createCard(Suit.Clubs, Rank.Seven, 1),
    ];
    
    const bot1Cards = [
      Card.createCard(Suit.Spades, Rank.King, 0), // Trump suit pair - winning
      Card.createCard(Suit.Spades, Rank.King, 1),
    ];
    
    const bot2Cards = [
      Card.createCard(Suit.Hearts, Rank.Three, 0),
      Card.createCard(Suit.Hearts, Rank.Four, 0),
    ];

    gameState.currentTrick = {
      plays: [
        { playerId: PlayerId.Human, cards: humanCards },
        { playerId: PlayerId.Bot1, cards: bot1Cards }, // Teammate winning
        { playerId: PlayerId.Bot2, cards: bot2Cards },
      ],
      points: 0,
      winningPlayerId: PlayerId.Bot1, // Bot1 (teammate of Bot3) is winning
    };

    // Bot3 (4th player) hand - NO CLUBS so can play trump
    const bot3Hand: Card[] = [
      Card.createCard(Suit.Hearts, Rank.Two, 0), // Trump rank pair - valuable!
      Card.createCard(Suit.Hearts, Rank.Two, 1),
      Card.createCard(Suit.Diamonds, Rank.Four, 0), // Low disposal options
      Card.createCard(Suit.Diamonds, Rank.Five, 0),
      Card.createCard(Suit.Hearts, Rank.Eight, 0), // More hearts instead of clubs
      Card.createCard(Suit.Hearts, Rank.Nine, 0),
    ];

    // Set Bot3 as current player (4th position)
    gameState.currentPlayerIndex = 3; // Bot3
    gameState.players[3].hand = bot3Hand;

    // Get AI move for Bot3
    const selectedCards = getAIMove(gameState, PlayerId.Bot3);

    // CRITICAL: Should NOT play trump rank pair (2♥-2♥) against winning teammate
    const playedTrumpRankCards = selectedCards.filter(
      (card) => card.rank === Rank.Two
    );
    
    expect(playedTrumpRankCards.length).toBe(0);
    expect(selectedCards).toHaveLength(2); // Must play pair to match lead

    // Should play low disposal cards instead (diamonds or non-trump hearts)
    const isLowDisposal = selectedCards.every(card => 
      (card.suit === Suit.Diamonds && [Rank.Four, Rank.Five].includes(card.rank)) ||
      (card.suit === Suit.Hearts && [Rank.Eight, Rank.Nine].includes(card.rank)) // Non-trump hearts
    );
    
    expect(isLowDisposal).toBe(true);
  });

  test("4th player should contribute points when teammate winning", () => {
    const gameState = initializeGame();
    
    // Simple trump: Rank 2, Spades trump
    const trumpInfo: TrumpInfo = {
      trumpRank: Rank.Two,
      trumpSuit: Suit.Spades,
    };
    gameState.trumpInfo = trumpInfo;
    gameState.gamePhase = GamePhase.Playing;

    // Single card trick: Human leads Q♣, Bot1 beats with A♠ (trump suit), Bot2 disposes
    gameState.currentTrick = {
      plays: [
        { playerId: PlayerId.Human, cards: [Card.createCard(Suit.Clubs, Rank.Queen, 0)] },
        { playerId: PlayerId.Bot1, cards: [Card.createCard(Suit.Spades, Rank.Ace, 0)] }, // Teammate winning with trump
        { playerId: PlayerId.Bot2, cards: [Card.createCard(Suit.Clubs, Rank.Three, 0)] },
      ],
      points: 0,
      winningPlayerId: PlayerId.Bot1,
    };

    // Bot3 hand: mix of trump and point cards - should contribute points
    const bot3Hand: Card[] = [
      Card.createCard(Suit.Spades, Rank.Two, 0), // Trump rank - valuable, don't waste
      Card.createCard(Suit.Hearts, Rank.King, 0), // Point card (10pts) - SHOULD contribute
      Card.createCard(Suit.Diamonds, Rank.Six, 0), // Low disposal
      Card.createCard(Suit.Diamonds, Rank.Four, 0), // Low disposal
    ];

    gameState.currentPlayerIndex = 3;
    gameState.players[3].hand = bot3Hand;

    const selectedCards = getAIMove(gameState, PlayerId.Bot3);

    // Should NOT waste trump cards
    const playedTrumpCards = selectedCards.filter(card => 
      card.rank === Rank.Two || card.suit === Suit.Spades
    );
    expect(playedTrumpCards.length).toBe(0);
    expect(selectedCards).toHaveLength(1);

    // SHOULD contribute Hearts King when teammate winning
    const playedCard = selectedCards[0];
    expect(playedCard.suit).toBe(Suit.Hearts);
    expect(playedCard.rank).toBe(Rank.King);
    expect(playedCard.points).toBe(10);
  });
});