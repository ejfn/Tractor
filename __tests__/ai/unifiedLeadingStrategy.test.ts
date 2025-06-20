import { getAIMove } from "../../src/ai/aiLogic";

import {
  Card,
  GamePhase,
  PlayerId,
  Rank,
  Suit
} from "../../src/types";
import { initializeGame } from "../../src/utils/gameInitialization";

describe("Unified Leading Strategy", () => {
  describe("Priority 1: Early Game Ace Leading", () => {
    it("should prioritize non-trump Aces when leading in early game", () => {
      // Use real game initialization and modify specific player hand
      const gameState = initializeGame();
      
      // Set to playing phase with no tricks (early game)
      gameState.gamePhase = GamePhase.Playing;
      gameState.currentPlayerIndex = 1; // Bot1 leading
      gameState.tricks = []; // Early game
      
      // Give Bot1 a hand with non-trump Ace
      const bot1 = gameState.players[1];
      bot1.hand = [
        Card.createCard(Suit.Hearts, Rank.Ace, 0), // Non-trump Ace - should be played
        Card.createCard(Suit.Hearts, Rank.King, 0),
        Card.createCard(Suit.Clubs, Rank.Queen, 0),
        Card.createCard(Suit.Diamonds, Rank.Jack, 0),
        Card.createCard(Suit.Hearts, Rank.Ten, 0),
      ];

      const selectedCards = getAIMove(gameState, PlayerId.Bot1);

      // Should select the Ace of Hearts (non-trump Ace)
      expect(selectedCards).toHaveLength(1);
      expect(selectedCards[0].rank).toBe(Rank.Ace);
      expect(selectedCards[0].suit).toBe(Suit.Hearts);
    });

    it("should NOT play trump suit Aces when leading (they should be saved)", () => {
      // Use real game initialization
      const gameState = initializeGame();
      
      // Set to playing phase with no tricks (early game)
      gameState.gamePhase = GamePhase.Playing;
      gameState.currentPlayerIndex = 1; // Bot1 leading
      gameState.tricks = []; // Early game
      // Ensure trump suit is Spades
      gameState.trumpInfo.trumpSuit = Suit.Spades;
      
      // Give Bot1 a hand with trump suit Ace
      const bot1 = gameState.players[1];
      bot1.hand = [
        Card.createCard(Suit.Spades, Rank.Ace, 0), // Trump suit Ace - should NOT be played
        Card.createCard(Suit.Hearts, Rank.King, 0), // Non-trump King - should be played instead
        Card.createCard(Suit.Clubs, Rank.Queen, 0),
        Card.createCard(Suit.Diamonds, Rank.Jack, 0),
        Card.createCard(Suit.Hearts, Rank.Ten, 0),
      ];

      const selectedCards = getAIMove(gameState, PlayerId.Bot1);

      // Should NOT select trump suit Ace - should play other high card instead
      expect(selectedCards).toHaveLength(1);
      expect(selectedCards[0].rank).not.toBe(Rank.Ace);
      expect(selectedCards[0].suit).not.toBe(Suit.Spades);
      // Should prefer King of Hearts or other high non-trump
      expect([Rank.King, Rank.Queen, Rank.Jack].includes(selectedCards[0].rank!)).toBe(true);
    });

    it("should prefer non-trump Ace pairs over non-trump Ace singles", () => {
      // Use real game initialization
      const gameState = initializeGame();
      
      // Set to playing phase with no tricks (early game)
      gameState.gamePhase = GamePhase.Playing;
      gameState.currentPlayerIndex = 1; // Bot1 leading
      gameState.tricks = []; // Early game
      
      // Give Bot1 a hand with both Ace pair and single
      const bot1 = gameState.players[1];
      bot1.hand = [
        Card.createCard(Suit.Hearts, Rank.Ace, 0), // Hearts Ace pair
        Card.createCard(Suit.Hearts, Rank.Ace, 1), // Hearts Ace pair
        Card.createCard(Suit.Clubs, Rank.Ace, 0),  // Clubs Ace single
        Card.createCard(Suit.Diamonds, Rank.King, 0),
        Card.createCard(Suit.Diamonds, Rank.Queen, 0),
      ];

      const selectedCards = getAIMove(gameState, PlayerId.Bot1);

      // Should select Ace pair over Ace single
      expect(selectedCards).toHaveLength(2);
      expect(selectedCards[0].rank).toBe(Rank.Ace);
      expect(selectedCards[1].rank).toBe(Rank.Ace);
      expect(selectedCards[0].suit).toBe(selectedCards[1].suit); // Same suit pair
    });
  });

  describe("Strategy Integration", () => {
    it("should follow single priority chain without bypassing Ace logic", () => {
      // Use real game initialization
      const gameState = initializeGame();
      
      // Set to playing phase with no tricks (early game)
      gameState.gamePhase = GamePhase.Playing;
      gameState.currentPlayerIndex = 1; // Bot1 leading
      gameState.tricks = []; // Early game should prioritize Aces
      
      // Give Bot1 complex hand with Ace and other high cards
      const bot1 = gameState.players[1];
      bot1.hand = [
        Card.createCard(Suit.Hearts, Rank.Ace, 0), // Should be selected despite other logic
        Card.createCard(Suit.Clubs, Rank.Two, 0),  // Trump rank card
        Card.createCard(Suit.Spades, Rank.King, 0), // Trump suit high card
        Card.createCard(Suit.Diamonds, Rank.Ten, 0), // Point card
        Card.createCard(Suit.Hearts, Rank.Five, 0), // Point card
      ];

      const selectedCards = getAIMove(gameState, PlayerId.Bot1);

      // Should select non-trump Ace despite having trump cards and point cards
      expect(selectedCards).toHaveLength(1);
      expect(selectedCards[0].rank).toBe(Rank.Ace);
      expect(selectedCards[0].suit).toBe(Suit.Hearts);
    });
  });

  describe("Fallback Behavior", () => {
    it("should make AI decisions when no early game Aces or special conditions", () => {
      // Use real game initialization
      const gameState = initializeGame();
      
      // Set to mid-game (not early game, so no Ace priority)
      gameState.gamePhase = GamePhase.Playing;
      gameState.currentPlayerIndex = 1; // Bot1 leading
      gameState.tricks = [
        { 
          plays: [
            { playerId: PlayerId.Human, cards: [] }
          ], 
          winningPlayerId: PlayerId.Human,
          points: 15 
        },
        { 
          plays: [
            { playerId: PlayerId.Bot2, cards: [] }
          ], 
          winningPlayerId: PlayerId.Bot2,
          points: 10 
        },
        { 
          plays: [
            { playerId: PlayerId.Bot3, cards: [] }
          ], 
          winningPlayerId: PlayerId.Bot3,
          points: 20 
        },
      ]; // Mid-game
      
      // Give Bot1 hand with various cards but no Aces
      const bot1 = gameState.players[1];
      bot1.hand = [
        Card.createCard(Suit.Hearts, Rank.Seven, 0), // Safe card
        Card.createCard(Suit.Clubs, Rank.Eight, 0),  // Safe card
        Card.createCard(Suit.Diamonds, Rank.Nine, 0), // Safe card
        Card.createCard(Suit.Hearts, Rank.Ten, 0),   // Point card
        Card.createCard(Suit.Spades, Rank.King, 0),  // Trump suit high card
      ];

      const selectedCards = getAIMove(gameState, PlayerId.Bot1);

      // Should select a single card (no special combinations available)
      expect(selectedCards).toHaveLength(1);
      // Should NOT select trump rank cards (2s) since they're valuable
      expect(selectedCards[0].rank).not.toBe(Rank.Two);
      // Verify it makes a decision (any card from the hand is valid)
      expect(bot1.hand.some(card => card.id === selectedCards[0].id)).toBe(true);
    });
  });
});