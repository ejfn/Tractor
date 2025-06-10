import { getAIKittySwap } from "../../src/ai/aiLogic";
import { putbackKittyCards } from "../../src/game/kittyManager";
import { finalizeTrumpDeclaration } from "../../src/game/dealingAndDeclaration";
import { GameState, PlayerId, GamePhase, Card, Suit, Rank } from "../../src/types";
import { createGameState } from "../helpers/gameStates";

describe("Bot Kitty Swap Bug", () => {
  let gameState: GameState;

  beforeEach(() => {
    // Create a game state where a bot becomes the round starting player
    gameState = createGameState();
    gameState.gamePhase = GamePhase.Dealing;

    // Set Bot1 as the round starting player (trump declarer)
    gameState.roundStartingPlayerIndex = 1; // Bot1 index
    gameState.currentPlayerIndex = 1; // Bot1 is current player

    // Give all players 25 cards each (normal 2-deck Tractor distribution)
    gameState.players.forEach((player, index) => {
      player.hand = Array(25).fill(null).map((_, cardIndex) => 
        Card.createCard(Suit.Hearts, Rank.Two, 0)
      );
    });

    // Create kitty with 8 cards
    gameState.kittyCards = Array(8).fill(null).map((_, index) => 
      Card.createCard(Suit.Spades, Rank.Three, 0)
    );
  });

  test("should handle bot kitty swap correctly", () => {
    // Finalize trump declaration - this should give kitty to Bot1 and transition to KittySwap
    const stateAfterDealing = finalizeTrumpDeclaration(gameState);

    // Verify Bot1 got the kitty cards and game is in KittySwap phase
    expect(stateAfterDealing.gamePhase).toBe(GamePhase.KittySwap);
    expect(stateAfterDealing.currentPlayerIndex).toBe(1); // Bot1
    expect(stateAfterDealing.players[1].hand).toHaveLength(33); // 25 + 8 kitty cards

    // Verify other players still have 25 cards
    expect(stateAfterDealing.players[0].hand).toHaveLength(25); // Human
    expect(stateAfterDealing.players[2].hand).toHaveLength(25); // Bot2
    expect(stateAfterDealing.players[3].hand).toHaveLength(25); // Bot3

    // Now test AI kitty swap
    const selectedCards = getAIKittySwap(stateAfterDealing, PlayerId.Bot1);
    
    // Verify AI selected exactly 8 cards
    expect(selectedCards).toHaveLength(8);

    // Apply the kitty swap
    const stateAfterSwap = putbackKittyCards(
      stateAfterDealing,
      selectedCards,
      PlayerId.Bot1
    );

    // Verify game transitioned to Playing phase
    expect(stateAfterSwap.gamePhase).toBe(GamePhase.Playing);

    // Verify Bot1 now has 25 cards (33 - 8)
    expect(stateAfterSwap.players[1].hand).toHaveLength(25);

    // Verify kitty contains the selected cards
    expect(stateAfterSwap.kittyCards).toHaveLength(8);
    expect(stateAfterSwap.kittyCards).toEqual(selectedCards);

    // Verify all players have the correct number of cards
    stateAfterSwap.players.forEach((player, index) => {
      expect(player.hand.length).toBe(25);
    });
  });

  test("should detect when bot has wrong number of cards after dealing", () => {
    // Simulate a bug where bot doesn't get kitty cards
    const buggyState = { ...gameState };
    buggyState.gamePhase = GamePhase.KittySwap;
    buggyState.currentPlayerIndex = 1; // Bot1
    // Bot1 still has only 25 cards instead of 33 (didn't get kitty)

    // This should throw an error
    expect(() => {
      getAIKittySwap(buggyState, PlayerId.Bot1);
    }).toThrow("AI kitty swap: expected 33 cards (25 + 8 kitty), got 25");
  });

  test("should handle bot kitty swap when bot is not round starting player", () => {
    // Set Human as round starting player
    gameState.roundStartingPlayerIndex = 0; // Human
    gameState.currentPlayerIndex = 0; // Human

    const stateAfterDealing = finalizeTrumpDeclaration(gameState);

    // Verify Human got the kitty cards
    expect(stateAfterDealing.gamePhase).toBe(GamePhase.KittySwap);
    expect(stateAfterDealing.currentPlayerIndex).toBe(0); // Human
    expect(stateAfterDealing.players[0].hand).toHaveLength(33); // Human has 25 + 8

    // Verify bots still have 25 cards
    expect(stateAfterDealing.players[1].hand).toHaveLength(25); // Bot1
    expect(stateAfterDealing.players[2].hand).toHaveLength(25); // Bot2
    expect(stateAfterDealing.players[3].hand).toHaveLength(25); // Bot3

    // Bot kitty swap should fail since Bot1 is not the current player
    expect(() => {
      getAIKittySwap(stateAfterDealing, PlayerId.Bot1);
    }).toThrow("AI kitty swap: expected 33 cards (25 + 8 kitty), got 25");
  });

  test("should validate bot has exactly 25 cards after kitty swap", () => {
    // Start with proper setup
    const stateAfterDealing = finalizeTrumpDeclaration(gameState);
    
    // Get AI kitty swap selection  
    const selectedCards = getAIKittySwap(stateAfterDealing, PlayerId.Bot1);
    
    // Test normal case - should work fine
    const stateAfterSwap = putbackKittyCards(
      stateAfterDealing,
      selectedCards,
      PlayerId.Bot1
    );
    
    // Verify bot has exactly 25 cards
    expect(stateAfterSwap.players[1].hand).toHaveLength(25);
    
    // Test error case - manually create invalid scenario
    const invalidState = { ...stateAfterDealing };
    // Remove one extra card to simulate bug where AI would have 24 cards after swap
    invalidState.players[1].hand = invalidState.players[1].hand.slice(0, 32); // 32 - 8 = 24
    
    // This should throw an error
    expect(() => {
      putbackKittyCards(invalidState, selectedCards.slice(0, 7), PlayerId.Bot1); // Only remove 7 cards instead of 8
    }).toThrow("Must select exactly 8 cards for kitty swap, but 7 were selected");
    
    // Test another error case - simulate selecting wrong number of cards that would result in wrong hand size
    const anotherInvalidState = { ...stateAfterDealing };
    // Create scenario where removing 8 cards would leave wrong number
    anotherInvalidState.players[1].hand = anotherInvalidState.players[1].hand.slice(0, 32); // Start with 32 cards
    
    // Get valid cards from the reduced hand to avoid "cards not found" error
    const validCardsFromReducedHand = anotherInvalidState.players[1].hand.slice(0, 8);
    
    expect(() => {
      putbackKittyCards(anotherInvalidState, validCardsFromReducedHand, PlayerId.Bot1); // Remove 8 from 32 = 24 (wrong!)
    }).toThrow("After kitty swap, player bot1 should have 25 cards, but has");
  });
});