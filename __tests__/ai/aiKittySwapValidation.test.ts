import { getAIKittySwap } from "../../src/ai/aiLogic";
import { GameState, PlayerId, GamePhase, Suit, Rank } from "../../src/types";
import { createCard } from "../helpers/cards";
import { createGameState, givePlayerCards } from "../helpers/gameStates";

describe("AI Kitty Swap Validation", () => {
  let gameState: GameState;
  let botPlayerId: PlayerId;

  beforeEach(() => {
    gameState = createGameState({
      gamePhase: GamePhase.KittySwap,
      trumpInfo: { trumpRank: Rank.Two, trumpSuit: Suit.Spades }
    });
    botPlayerId = PlayerId.Bot1;
  });

  test("should validate bot has exactly 33 cards before kitty swap", () => {
    // Give bot only 25 cards (should fail)
    const cards = Array(25).fill(null).map((_, index) => 
      createCard(Suit.Hearts, Rank.Three, `card-${index}`)
    );
    gameState = givePlayerCards(gameState, 1, cards);

    expect(() => {
      getAIKittySwap(gameState, botPlayerId);
    }).toThrow("AI kitty swap: expected 33 cards (25 + 8 kitty), got 25");
  });

  test("should validate normal AI kitty swap returns exactly 8 cards", () => {
    // Give bot correct number of cards
    const cards = Array(33).fill(null).map((_, index) => 
      createCard(Suit.Hearts, Rank.Three, `card-${index}`)
    );
    gameState = givePlayerCards(gameState, 1, cards);

    // Normal AI should return exactly 8 cards
    const selectedCards = getAIKittySwap(gameState, botPlayerId);
    expect(selectedCards).toHaveLength(8);
  });

  test("should validate AI selects cards from player's hand", () => {
    // Give bot correct number of cards
    const cards = Array(33).fill(null).map((_, index) => 
      createCard(Suit.Hearts, Rank.Three, `card-${index}`)
    );
    gameState = givePlayerCards(gameState, 1, cards);

    const player = gameState.players.find(p => p.id === botPlayerId)!;
    const handCardIds = player.hand.map(c => c.id);

    // AI should select cards that exist in the player's hand
    const selectedCards = getAIKittySwap(gameState, botPlayerId);
    
    selectedCards.forEach(card => {
      expect(handCardIds).toContain(card.id);
    });
  });

  test("should validate remaining cards would be exactly 25", () => {
    // This test validates the arithmetic: 33 - 8 = 25
    const cards = Array(33).fill(null).map((_, index) => 
      createCard(Suit.Hearts, Rank.Three, `card-${index}`)
    );
    gameState = givePlayerCards(gameState, 1, cards);

    // Normal case should work fine
    const selectedCards = getAIKittySwap(gameState, botPlayerId);
    expect(selectedCards).toHaveLength(8);

    // The arithmetic validation is implicit in the other validations
    // If we get 8 cards and started with 33, we'll end up with 25
    expect(33 - selectedCards.length).toBe(25);
  });

  test("should work correctly with valid 33-card setup", () => {
    // Give bot exactly 33 cards
    const cards = Array(33).fill(null).map((_, index) => 
      createCard(Suit.Hearts, Rank.Three, `card-${index}`)
    );
    gameState = givePlayerCards(gameState, 1, cards);

    // Should work without throwing
    const selectedCards = getAIKittySwap(gameState, botPlayerId);
    
    expect(selectedCards).toHaveLength(8);
    expect(Array.isArray(selectedCards)).toBe(true);
    
    // All selected cards should have valid IDs
    selectedCards.forEach(card => {
      expect(card.id).toBeDefined();
      expect(typeof card.id).toBe('string');
    });
  });
});