import { getAIMove } from "../../src/ai/aiLogic";
import { initializeGame } from "../../src/game/gameLogic";
import { 
  GameState, 
  PlayerId, 
  Rank, 
  Suit, 
  GamePhase,
  GamePhaseStrategy 
} from "../../src/types";
import { 
  createCard, 
  createGameState, 
  createPlayer, 
  createTrumpInfo
} from "../helpers";

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
        createCard(Suit.Hearts, Rank.Ace), // Non-trump Ace - should be played
        createCard(Suit.Hearts, Rank.King),
        createCard(Suit.Clubs, Rank.Queen),
        createCard(Suit.Diamonds, Rank.Jack),
        createCard(Suit.Hearts, Rank.Ten),
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
        createCard(Suit.Spades, Rank.Ace), // Trump suit Ace - should NOT be played
        createCard(Suit.Hearts, Rank.King), // Non-trump King - should be played instead
        createCard(Suit.Clubs, Rank.Queen),
        createCard(Suit.Diamonds, Rank.Jack),
        createCard(Suit.Hearts, Rank.Ten),
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
        createCard(Suit.Hearts, Rank.Ace), // Hearts Ace pair
        createCard(Suit.Hearts, Rank.Ace), // Hearts Ace pair
        createCard(Suit.Clubs, Rank.Ace),  // Clubs Ace single
        createCard(Suit.Diamonds, Rank.King),
        createCard(Suit.Diamonds, Rank.Queen),
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
        createCard(Suit.Hearts, Rank.Ace), // Should be selected despite other logic
        createCard(Suit.Clubs, Rank.Two),  // Trump rank card
        createCard(Suit.Spades, Rank.King), // Trump suit high card
        createCard(Suit.Diamonds, Rank.Ten), // Point card
        createCard(Suit.Hearts, Rank.Five), // Point card
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
          leadingPlayerId: PlayerId.Human,
          leadingCombo: [], 
          plays: [], 
          winningPlayerId: PlayerId.Human,
          points: 15 
        },
        { 
          leadingPlayerId: PlayerId.Bot2,
          leadingCombo: [], 
          plays: [], 
          winningPlayerId: PlayerId.Bot2,
          points: 10 
        },
        { 
          leadingPlayerId: PlayerId.Bot3,
          leadingCombo: [], 
          plays: [], 
          winningPlayerId: PlayerId.Bot3,
          points: 20 
        },
      ]; // Mid-game
      
      // Give Bot1 hand with various cards but no Aces
      const bot1 = gameState.players[1];
      bot1.hand = [
        createCard(Suit.Hearts, Rank.Seven), // Safe card
        createCard(Suit.Clubs, Rank.Eight),  // Safe card
        createCard(Suit.Diamonds, Rank.Nine), // Safe card
        createCard(Suit.Hearts, Rank.Ten),   // Point card
        createCard(Suit.Spades, Rank.King),  // Trump suit high card
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