import { getAIKittySwap } from "../../src/ai/aiLogic";
import {
  selectAIKittySwapCards,
} from "../../src/ai/kittySwap/kittySwapStrategy";
import { isTrump } from "../../src/game/gameHelpers";
import { Card, DeckId, GamePhase, GameState, PlayerId, Rank, Suit } from "../../src/types";
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
    bot1Cards.push(Card.createCard(Suit.Spades, Rank.Three, i % 2 as DeckId));
  }
  for (let i = 0; i < 2; i++) {
    bot1Cards.push(Card.createCard(Suit.Hearts, Rank.Two, i as DeckId));
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
    
    bot1Cards.push(Card.createCard(suit, rank, i % 2 as DeckId));
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
        simpleNonPointCards.push(Card.createCard(Suit.Hearts, Rank.Three, i % 2 as DeckId));
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
        longTrumpHand.push(Card.createCard(Suit.Spades, Rank.Three, i % 2 as DeckId));
      }
      
      // Add only 7 non-trump cards (insufficient for kitty - need 8)
      for (let i = 0; i < 7; i++) {
        longTrumpHand.push(Card.createCard(Suit.Hearts, Rank.Four, i % 2 as DeckId));
      }
      
      // Add 8 more trump cards to reach 33 total (18 + 7 + 8 = 33)
      for (let i = 18; i < 26; i++) {
        longTrumpHand.push(Card.createCard(Suit.Spades, Rank.Four, i % 2 as DeckId));
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
        strategicHand.push(Card.createCard(Suit.Spades, Rank.Three, i % 2 as DeckId));
      }
      
      // Add Hearts with Ace and King (preserve this suit - valuable)
      strategicHand.push(Card.createCard(Suit.Hearts, Rank.Ace, 0));
      strategicHand.push(Card.createCard(Suit.Hearts, Rank.King, 0)); 
      strategicHand.push(Card.createCard(Suit.Hearts, Rank.Queen, 0));
      
      // Add Clubs with weak cards (elimination candidate)
      strategicHand.push(Card.createCard(Suit.Clubs, Rank.Three, 0));
      strategicHand.push(Card.createCard(Suit.Clubs, Rank.Four, 0));
      strategicHand.push(Card.createCard(Suit.Clubs, Rank.Six, 0));
      
      // Add Diamonds with weak cards (elimination candidate)  
      strategicHand.push(Card.createCard(Suit.Diamonds, Rank.Three, 0));
      strategicHand.push(Card.createCard(Suit.Diamonds, Rank.Seven, 0));
      
      // Add mixed weak cards to reach 33 (need 17 more cards: 8 trump + 3 hearts + 3 clubs + 2 diamonds = 16, need 33 total)
      for (let i = 0; i < 17; i++) {
        strategicHand.push(Card.createCard(Suit.Hearts, Rank.Eight, i % 2 as DeckId));
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
        Card.createCard(Suit.Hearts, Rank.Three, index % 2 as DeckId)
      );
      gameState = givePlayerCards(gameState, 1, cards);

      expect(() => {
        getAIKittySwap(gameState, botPlayerId);
      }).toThrow("AI kitty swap: expected 33 cards (25 + 8 kitty), got 25");
    });

    test("should validate normal AI kitty swap returns exactly 8 cards", () => {
      // Give bot correct number of cards
      const cards = Array(33).fill(null).map((_, index) => 
        Card.createCard(Suit.Hearts, Rank.Three, index % 2 as DeckId)
      );
      gameState = givePlayerCards(gameState, 1, cards);

      // Normal AI should return exactly 8 cards
      const selectedCards = getAIKittySwap(gameState, botPlayerId);
      expect(selectedCards).toHaveLength(8);
    });

    test("should validate AI selects cards from player's hand", () => {
      // Give bot correct number of cards
      const cards = Array(33).fill(null).map((_, index) => 
        Card.createCard(Suit.Hearts, Rank.Three, index % 2 as DeckId)
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
        Card.createCard(Suit.Hearts, Rank.Three, index % 2 as DeckId)
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
        Card.createCard(Suit.Hearts, Rank.Three, index % 2 as DeckId)
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

  describe("Trump Hierarchy Logic", () => {
    test("should prefer weak trump suit cards over strong trump rank cards when forced to dispose trump", () => {
      const player = gameState.players.find(p => p.id === botPlayerId)!;
      
      // Create hand with only trump cards to force trump disposal
      const trumpOnlyHand: Card[] = [];
      
      // Add high-value trump cards that should be preserved
      trumpOnlyHand.push(Card.createCard(Suit.Hearts, Rank.Two, 0)); // Trump rank in off-suit (conservation: 70)
      trumpOnlyHand.push(Card.createCard(Suit.Spades, Rank.Two, 0)); // Trump rank in trump suit (conservation: 80)
      trumpOnlyHand.push(Card.createCard(Suit.Spades, Rank.Ace, 0)); // Trump suit Ace (conservation: 60)
      trumpOnlyHand.push(Card.createCard(Suit.Spades, Rank.King, 0)); // Trump suit King (conservation: 55)
      
      // Add low-value trump cards that should be disposed
      for (let i = 0; i < 29; i++) {
        trumpOnlyHand.push(Card.createCard(Suit.Spades, Rank.Three, i % 2 as DeckId)); // Trump suit 3 (conservation: 5)
      }
      
      player.hand = trumpOnlyHand;
      
      const selectedCards = selectAIKittySwapCards(gameState, botPlayerId);
      
      expect(selectedCards).toHaveLength(8);
      
      // All selected cards should be weak trump cards (3♠)
      selectedCards.forEach(card => {
        expect(card.rank).toBe(Rank.Three);
        expect(card.suit).toBe(Suit.Spades);
      });
      
      // Should NOT dispose trump rank cards or high trump suit cards
      const trumpRankHeart = player.hand.find(c => c.rank === Rank.Two && c.suit === Suit.Hearts);
      const trumpRankSpade = player.hand.find(c => c.rank === Rank.Two && c.suit === Suit.Spades);
      const trumpAce = player.hand.find(c => c.rank === Rank.Ace && c.suit === Suit.Spades);
      const trumpKing = player.hand.find(c => c.rank === Rank.King && c.suit === Suit.Spades);
      
      expect(selectedCards).not.toContain(trumpRankHeart);
      expect(selectedCards).not.toContain(trumpRankSpade);
      expect(selectedCards).not.toContain(trumpAce);
      expect(selectedCards).not.toContain(trumpKing);
    });

    test("should never dispose critical trump combinations (pairs/tractors)", () => {
      const player = gameState.players.find(p => p.id === botPlayerId)!;
      
      // Create hand with trump pairs and tractors
      const criticalTrumpHand: Card[] = [];
      
      // Add trump pairs (should be preserved)
      criticalTrumpHand.push(...Card.createPair(Suit.Spades, Rank.Queen));
      criticalTrumpHand.push(...Card.createPair(Suit.Spades, Rank.Jack));
      
      // Add non-trump weak cards (should be disposed)
      for (let i = 0; i < 29; i++) {
        criticalTrumpHand.push(Card.createCard(Suit.Hearts, Rank.Three, i % 2 as DeckId));
      }
      
      player.hand = criticalTrumpHand;
      
      const selectedCards = selectAIKittySwapCards(gameState, botPlayerId);
      
      expect(selectedCards).toHaveLength(8);
      
      // Should not dispose any trump cards since we have enough non-trump cards
      const trumpCardsInKitty = selectedCards.filter(card => isTrump(card, gameState.trumpInfo));
      expect(trumpCardsInKitty).toHaveLength(0);
      
      // All selected cards should be weak non-trump cards
      selectedCards.forEach(card => {
        expect(card.rank).toBe(Rank.Three);
        expect(card.suit).toBe(Suit.Hearts);
      });
    });

    test("should use ComboStrength analysis for disposal prioritization", () => {
      const player = gameState.players.find(p => p.id === botPlayerId)!;
      
      // Create hand with mixed strength cards
      const mixedStrengthHand: Card[] = [];
      
      // Add critical strength cards (should be preserved)
      mixedStrengthHand.push(Card.createCard(Suit.Hearts, Rank.Two, 0)); // Critical trump
      mixedStrengthHand.push(Card.createCard(Suit.Hearts, Rank.Ace, 0)); // Strong non-trump
      mixedStrengthHand.push(Card.createCard(Suit.Hearts, Rank.King, 0)); // Strong non-trump
      
      // Add more weak strength cards to ensure they get selected over medium cards
      for (let i = 0; i < 25; i++) {
        mixedStrengthHand.push(Card.createCard(Suit.Diamonds, Rank.Seven, i % 2 as DeckId)); // Weak
      }
      
      // Add medium strength cards (point cards) - fewer of them so weak gets priority
      mixedStrengthHand.push(Card.createCard(Suit.Clubs, Rank.Ten, 0)); // Medium (points)
      mixedStrengthHand.push(Card.createCard(Suit.Clubs, Rank.Five, 0)); // Medium (points)
      mixedStrengthHand.push(Card.createCard(Suit.Clubs, Rank.Nine, 0)); // Non-point
      mixedStrengthHand.push(Card.createCard(Suit.Clubs, Rank.Eight, 0)); // Non-point
      mixedStrengthHand.push(Card.createCard(Suit.Clubs, Rank.Six, 0)); // Non-point
      
      player.hand = mixedStrengthHand;
      
      const selectedCards = selectAIKittySwapCards(gameState, botPlayerId);
      
      expect(selectedCards).toHaveLength(8);
      
      // Should prefer weak strength cards (7♦) over medium point cards
      const weakCardsInKitty = selectedCards.filter(card => 
        card.rank === Rank.Seven && card.suit === Suit.Diamonds
      );
      const pointCardsInKitty = selectedCards.filter(card => card.points > 0);
      
      // Should dispose more weak cards than point cards
      expect(weakCardsInKitty.length).toBeGreaterThan(pointCardsInKitty.length);
      
      // Should preserve critical and strong cards
      const criticalTrump = player.hand.find(c => c.rank === Rank.Two && c.suit === Suit.Hearts);
      const strongAce = player.hand.find(c => c.rank === Rank.Ace && c.suit === Suit.Hearts);
      const strongKing = player.hand.find(c => c.rank === Rank.King && c.suit === Suit.Hearts);
      
      expect(selectedCards).not.toContain(criticalTrump);
      expect(selectedCards).not.toContain(strongAce);
      expect(selectedCards).not.toContain(strongKing);
    });

    test("should factor trump conservation values into suit elimination decisions", () => {
      const player = gameState.players.find(p => p.id === botPlayerId)!;
      
      // Create scenario where trump consideration affects suit elimination
      const suitEliminationHand: Card[] = [];
      
      // Add one suit with high-value trump cards (should NOT be eliminated)
      suitEliminationHand.push(Card.createCard(Suit.Spades, Rank.Ace, 0)); // High conservation value
      suitEliminationHand.push(Card.createCard(Suit.Spades, Rank.King, 0)); // High conservation value
      suitEliminationHand.push(Card.createCard(Suit.Spades, Rank.Three, 0)); // Low conservation value
      
      // Add another suit with weak non-trump cards (should be eliminated)
      suitEliminationHand.push(Card.createCard(Suit.Clubs, Rank.Seven, 0));
      suitEliminationHand.push(Card.createCard(Suit.Clubs, Rank.Eight, 0));
      suitEliminationHand.push(Card.createCard(Suit.Clubs, Rank.Nine, 0));
      
      // Fill with other cards
      for (let i = 0; i < 27; i++) {
        suitEliminationHand.push(Card.createCard(Suit.Hearts, Rank.Four, i % 2 as DeckId));
      }
      
      player.hand = suitEliminationHand;
      
      const selectedCards = selectAIKittySwapCards(gameState, botPlayerId);
      
      expect(selectedCards).toHaveLength(8);
      
      // Should prefer eliminating non-trump Clubs suit over trump Spades suit
      const clubsCardsInKitty = selectedCards.filter(card => card.suit === Suit.Clubs);
      const spadesCardsInKitty = selectedCards.filter(card => card.suit === Suit.Spades);
      
      // Clubs should be preferred for elimination
      expect(clubsCardsInKitty.length).toBeGreaterThan(0);
      
      // Should avoid disposing high-value trump cards
      const trumpAce = suitEliminationHand.find(c => c.rank === Rank.Ace && c.suit === Suit.Spades);
      const trumpKing = suitEliminationHand.find(c => c.rank === Rank.King && c.suit === Suit.Spades);
      
      expect(selectedCards).not.toContain(trumpAce);
      expect(selectedCards).not.toContain(trumpKing);
    });
  });
});