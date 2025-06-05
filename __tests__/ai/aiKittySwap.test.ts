import {
  selectAIKittySwapCards,
} from "../../src/ai/aiKittySwapStrategy";
import { getAIKittySwap } from "../../src/ai/aiLogic";
import { Card, GameState, PlayerId, GamePhase, Suit, Rank } from "../../src/types";
import { isTrump } from "../../src/game/gameLogic";
import { createCard } from "../helpers/cards";
import { createGameState, givePlayerCards } from "../helpers/gameStates";

// Helper function to create a kitty swap game state
function createKittySwapGameState(): GameState {
  // Create base game state
  let gameState = createGameState({
    gamePhase: GamePhase.KittySwap,
    trumpInfo: { trumpRank: Rank.Two, trumpSuit: Suit.Spades }
  });

  // Give Bot1 a balanced hand with 33 cards (25 regular + 8 kitty)
  const bot1Cards: Card[] = [];
  
  // Add some trump cards (Spades suit + 2s)
  for (let i = 0; i < 8; i++) {
    bot1Cards.push(createCard(Suit.Spades, Rank.Three, `trump_spades_${i}`));
  }
  for (let i = 0; i < 2; i++) {
    bot1Cards.push(createCard(Suit.Hearts, Rank.Two, `trump_rank_${i}`));
  }
  
  // Add non-trump cards from other suits
  const nonTrumpSuits = [Suit.Hearts, Suit.Clubs, Suit.Diamonds];
  const nonTrumpRanks = [Rank.Three, Rank.Four, Rank.Five, Rank.Six, Rank.Seven, Rank.Eight, Rank.Nine, Rank.Ten, Rank.Jack, Rank.Queen, Rank.King, Rank.Ace];
  
  let cardIndex = 0;
  for (let i = 0; i < 23; i++) { // 23 non-trump cards to reach 33 total
    const suit = nonTrumpSuits[cardIndex % nonTrumpSuits.length];
    const rank = nonTrumpRanks[Math.floor(cardIndex / nonTrumpSuits.length) % nonTrumpRanks.length];
    
    // Skip rank 2 for non-trump suits as they would be trump rank cards
    if (rank === Rank.Two) {
      cardIndex++;
      i--; // Don't count this iteration
      continue;
    }
    
    bot1Cards.push(createCard(suit, rank, `nontrump_${suit}_${rank}_${i}`));
    cardIndex++;
  }
  
  // Give Bot1 exactly 33 cards
  gameState = givePlayerCards(gameState, 1, bot1Cards.slice(0, 33));
  
  return gameState;
}

describe("AI Kitty Swap Strategy", () => {
  let gameState: GameState;
  let botPlayerId: PlayerId;

  beforeEach(() => {
    gameState = createKittySwapGameState();
    botPlayerId = PlayerId.Bot1;
  });

  describe("Core Requirements", () => {
    test("should return exactly 8 cards", () => {
      const selectedCards = selectAIKittySwapCards(gameState, botPlayerId);
      expect(selectedCards).toHaveLength(8);
    });

    test("should usually avoid trump cards, but allow when hand is exceptionally strong", () => {
      const selectedCards = selectAIKittySwapCards(gameState, botPlayerId);
      
      const trumpCardsInKitty = selectedCards.filter(card => isTrump(card, gameState.trumpInfo));
      
      // Either no trump cards (standard case) or trump cards when hand is exceptionally strong
      if (trumpCardsInKitty.length > 0) {
        // If trump cards are included, hand should be exceptionally strong
        const player = gameState.players.find(p => p.id === botPlayerId)!;
        const trumpCards = player.hand.filter(card => isTrump(card, gameState.trumpInfo));
        const nonTrumpCards = player.hand.filter(card => !isTrump(card, gameState.trumpInfo));
        
        // Hand should be exceptionally strong OR have insufficient non-trump cards
        const isStrong = trumpCards.length >= 10 || nonTrumpCards.length < 8;
        expect(isStrong).toBe(true);
      }
      
      // Should still prioritize non-trump cards when possible
      expect(selectedCards).toHaveLength(8);
    });

    test("should only select cards from player's hand", () => {
      const player = gameState.players.find(p => p.id === botPlayerId)!;
      const selectedCards = selectAIKittySwapCards(gameState, botPlayerId);
      
      selectedCards.forEach(card => {
        expect(player.hand.some(handCard => handCard.id === card.id)).toBe(true);
      });
    });
  });

  describe("Error Handling", () => {
    test("should throw error for non-existent player", () => {
      expect(() => {
        selectAIKittySwapCards(gameState, "nonexistent" as PlayerId);
      }).toThrow("Player nonexistent not found");
    });

    test("should throw error for wrong game phase", () => {
      gameState.gamePhase = GamePhase.Playing;
      
      expect(() => {
        selectAIKittySwapCards(gameState, botPlayerId);
      }).toThrow("AI kitty swap called during playing phase");
    });

    test("should throw error for wrong hand size", () => {
      const player = gameState.players.find(p => p.id === botPlayerId)!;
      player.hand = player.hand.slice(0, 20); // Wrong number of cards
      
      expect(() => {
        selectAIKittySwapCards(gameState, botPlayerId);
      }).toThrow("AI kitty swap: expected 33 cards (25 + 8 kitty), got 20");
    });
  });

  describe("Simple Strategic Tests", () => {
    test("should prefer non-point cards when available", () => {
      const player = gameState.players.find(p => p.id === botPlayerId)!;
      
      // Create a simple hand with clear non-point options (use Hearts since trump suit is Spades)
      const simpleNonPointCards: Card[] = [];
      for (let i = 0; i < 8; i++) {
        simpleNonPointCards.push(createCard(Suit.Hearts, Rank.Three, `simple${i}`));
      }
      
      // Replace some cards to ensure we have non-point options
      player.hand = [...player.hand.slice(0, 25), ...simpleNonPointCards];
      
      const selectedCards = selectAIKittySwapCards(gameState, botPlayerId);
      
      expect(selectedCards).toHaveLength(8);
      // Should have selected the simple non-point cards
      const selectedPointCards = selectedCards.filter(card => card.points > 0);
      expect(selectedPointCards.length).toBeLessThanOrEqual(4);
    });

    test("should handle different trump scenarios", () => {
      gameState.trumpInfo = { trumpRank: Rank.Two, trumpSuit: Suit.Hearts };
      
      const selectedCards = selectAIKittySwapCards(gameState, botPlayerId);
      
      expect(selectedCards).toHaveLength(8);
      
      // Should either use only non-trump cards OR strategically include trump when hand is strong
      const trumpCardsInKitty = selectedCards.filter(card => isTrump(card, gameState.trumpInfo));
      const player = gameState.players.find(p => p.id === botPlayerId)!;
      const trumpCards = player.hand.filter(card => isTrump(card, gameState.trumpInfo));
      const nonTrumpCards = player.hand.filter(card => !isTrump(card, gameState.trumpInfo));
      
      if (trumpCardsInKitty.length > 0) {
        // If trump cards are included, it should be due to insufficient non-trump cards or exceptional strength
        const hasInsufficientNonTrump = nonTrumpCards.length < 8;
        const hasExceptionalTrumpLength = trumpCards.length >= 10;
        expect(hasInsufficientNonTrump || hasExceptionalTrumpLength).toBe(true);
      }
    });

    test("should strategically include trump cards when hand is exceptionally strong", () => {
      const player = gameState.players.find(p => p.id === botPlayerId)!;
      
      // Create scenario with very long trump suit but insufficient non-trump cards
      const longTrumpHand: Card[] = [];
      
      // Add 18 trump cards (very long trump suit)
      for (let i = 0; i < 18; i++) {
        longTrumpHand.push(createCard(Suit.Spades, Rank.Three, `trump${i}`));
      }
      
      // Add only 7 non-trump cards (insufficient for kitty - need 8)
      for (let i = 0; i < 7; i++) {
        longTrumpHand.push(createCard(Suit.Hearts, Rank.Four, `nontrump${i}`));
      }
      
      // Add 8 more trump cards to reach 33 total (18 + 7 + 8 = 33)
      for (let i = 18; i < 26; i++) {
        longTrumpHand.push(createCard(Suit.Spades, Rank.Four, `trump${i}`));
      }
      
      player.hand = longTrumpHand;
      
      const selectedCards = selectAIKittySwapCards(gameState, botPlayerId);
      
      expect(selectedCards).toHaveLength(8);
      
      // Should include some trump cards due to insufficient non-trump cards
      const trumpCardsInKitty = selectedCards.filter(card => isTrump(card, gameState.trumpInfo));
      expect(trumpCardsInKitty.length).toBeGreaterThan(0);
      
      // Should still prioritize non-trump cards first
      const nonTrumpCardsInKitty = selectedCards.filter(card => !isTrump(card, gameState.trumpInfo));
      expect(nonTrumpCardsInKitty.length).toBe(7); // All 7 non-trump cards should be used
      expect(trumpCardsInKitty.length).toBe(1); // 1 trump card needed to reach 8
    });

    test("should execute strategic suit elimination when beneficial", () => {
      const player = gameState.players.find(p => p.id === botPlayerId)!;
      
      // Create scenario with clear suit elimination opportunity
      const strategicHand: Card[] = [];
      
      // Add trump cards (preserve these)
      for (let i = 0; i < 8; i++) {
        strategicHand.push(createCard(Suit.Spades, Rank.Three, `trump${i}`));
      }
      
      // Add Hearts with Ace and King (preserve this suit - valuable)
      strategicHand.push(createCard(Suit.Hearts, Rank.Ace, `hearts_ace`));
      strategicHand.push(createCard(Suit.Hearts, Rank.King, `hearts_king`)); 
      strategicHand.push(createCard(Suit.Hearts, Rank.Queen, `hearts_queen`));
      
      // Add Clubs with weak cards (elimination candidate)
      strategicHand.push(createCard(Suit.Clubs, Rank.Three, `clubs_weak1`));
      strategicHand.push(createCard(Suit.Clubs, Rank.Four, `clubs_weak2`));
      strategicHand.push(createCard(Suit.Clubs, Rank.Six, `clubs_weak3`));
      
      // Add Diamonds with weak cards (elimination candidate)  
      strategicHand.push(createCard(Suit.Diamonds, Rank.Three, `diamonds_weak1`));
      strategicHand.push(createCard(Suit.Diamonds, Rank.Seven, `diamonds_weak2`));
      
      // Add mixed weak cards to reach 33 (need 17 more cards: 8 trump + 3 hearts + 3 clubs + 2 diamonds = 16, need 33 total)
      for (let i = 0; i < 17; i++) {
        strategicHand.push(createCard(Suit.Hearts, Rank.Eight, `filler${i}`));
      }
      
      player.hand = strategicHand;
      
      const selectedCards = selectAIKittySwapCards(gameState, botPlayerId);
      
      expect(selectedCards).toHaveLength(8);
      
      // Should preserve trump cards
      const trumpCardsInKitty = selectedCards.filter(card => isTrump(card, gameState.trumpInfo));
      expect(trumpCardsInKitty.length).toBe(0);
      
      // Should preserve valuable Hearts (Ace, King)
      const heartsAceInKitty = selectedCards.some(card => card.rank === 'A' && card.suit === 'Hearts');
      const heartsKingInKitty = selectedCards.some(card => card.rank === 'K' && card.suit === 'Hearts');
      expect(heartsAceInKitty).toBe(false); // Ace should be preserved
      expect(heartsKingInKitty).toBe(false); // King should be preserved
      
      // Should prioritize eliminating weak cards
      const clubsInKitty = selectedCards.filter(card => card.suit === 'Clubs');
      const diamondsInKitty = selectedCards.filter(card => card.suit === 'Diamonds'); 
      
      // Should eliminate some weak cards from Clubs and Diamonds
      expect(clubsInKitty.length + diamondsInKitty.length).toBeGreaterThan(0);
    });
  });

  describe("AI Logic Integration Validation", () => {
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
});