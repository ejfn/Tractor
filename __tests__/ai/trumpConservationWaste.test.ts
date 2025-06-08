import { getAIMove } from "../../src/ai/aiLogic";
import { initializeGame } from "../../src/game/gameLogic";
import { 
  GameState, 
  PlayerId, 
  Rank, 
  Suit, 
  GamePhase,
  JokerType,
  ComboType 
} from "../../src/types";
import { 
  createCard, 
  createJoker 
} from "../helpers";

describe("Trump Conservation - Avoid Wasting Big Trump", () => {
  describe("Following Trump Pairs When Can't Form Pairs", () => {
    it("should use weak trump suit cards instead of jokers when following trump pairs", () => {
      // Create game where trump pairs are led and AI must follow but can't form pairs
      const gameState = initializeGame();
      
      // Set up active trump pair trick
      gameState.gamePhase = GamePhase.Playing;
      gameState.currentPlayerIndex = 2; // Bot2 following
      gameState.trumpInfo.trumpSuit = Suit.Spades;
      gameState.trumpInfo.trumpRank = Rank.Two;
      
      // Create trick with trump pair led
      gameState.currentTrick = {
        plays: [
          {
            playerId: PlayerId.Human,
            cards: [
              createCard(Suit.Spades, Rank.Two), // Trump rank in trump suit
              createCard(Suit.Spades, Rank.Two), // Trump rank in trump suit (pair)
            ]
          },
          {
            playerId: PlayerId.Bot1,
            cards: [
              createCard(Suit.Hearts, Rank.Two), // Trump rank in off-suit
              createCard(Suit.Clubs, Rank.Two),  // Trump rank in off-suit
            ]
          }
        ],
        winningPlayerId: PlayerId.Human,
        points: 0
      };
      
      // Give Bot2 trump cards but NO pairs (forced to play trump singles)
      const bot2 = gameState.players[2];
      bot2.hand = [
        createJoker(JokerType.Big),         // Valuable trump - should NOT be played
        createJoker(JokerType.Small),       // Valuable trump - should NOT be played
        createCard(Suit.Hearts, Rank.Two),  // Trump rank - should NOT be played
        createCard(Suit.Spades, Rank.Three), // Weak trump suit card - SHOULD be played
        createCard(Suit.Spades, Rank.Four),  // Weak trump suit card - alternative choice
        createCard(Suit.Hearts, Rank.King),  // Non-trump card
      ];

      const selectedCards = getAIMove(gameState, PlayerId.Bot2);

      // Debug: Log what was selected
      console.log("Selected cards:", selectedCards.map(card => ({
        suit: card.suit,
        rank: card.rank,
        joker: card.joker,
        points: card.points
      })));


      // Should select 2 cards (to match leading pair type)
      expect(selectedCards).toHaveLength(2);
      
      // AI is forced to play 2 cards but can't form pairs
      // Should use WEAKEST available trump cards by conservation hierarchy
      // Trump conservation values: BJ(100) > SJ(90) > 2♥(70) > 3♠(5) > 4♠(10)
      // Should prioritize: 3♠ (5) and 4♠ (10) over any high-value trump
      
      const selectedTrumpValues = selectedCards.map(card => {
        if (card.joker === JokerType.Big) return 100;
        if (card.joker === JokerType.Small) return 90;
        if (card.rank === Rank.Two) return 70;
        if (card.suit === Suit.Spades && card.rank === Rank.Three) return 5;
        if (card.suit === Suit.Spades && card.rank === Rank.Four) return 10;
        return 0; // Non-trump
      });
      
      // Should use the 2 LOWEST conservation value cards available
      // Expected: 3♠ (5) and 4♠ (10) instead of Big Joker (100) and Small Joker (90)
      expect(selectedTrumpValues.includes(100)).toBe(false); // No Big Joker
      expect(selectedTrumpValues.includes(90)).toBe(false);  // No Small Joker
      expect(selectedTrumpValues.includes(70)).toBe(false);  // No trump rank
      
      // Should use weak trump suit cards (3♠, 4♠) by conservation hierarchy
      expect(selectedTrumpValues.includes(5)).toBe(true);   // Should have 3♠
      expect(selectedTrumpValues.includes(10)).toBe(true);  // Should have 4♠
    });

    it("should prefer non-trump cards over any trump when following trump but can't form proper combinations", () => {
      // Create game where AI must follow trump but has no trump pairs/tractors
      const gameState = initializeGame();
      
      gameState.gamePhase = GamePhase.Playing;
      gameState.currentPlayerIndex = 3; // Bot3 following
      gameState.trumpInfo.trumpSuit = Suit.Hearts;
      gameState.trumpInfo.trumpRank = Rank.Two;
      
      // Trump tractor led
      gameState.currentTrick = {
        plays: [
          {
            playerId: PlayerId.Human,
            cards: [
              createCard(Suit.Hearts, Rank.Three), // Trump suit tractor
              createCard(Suit.Hearts, Rank.Three),
              createCard(Suit.Hearts, Rank.Four),
              createCard(Suit.Hearts, Rank.Four),
            ]
          },
          {
            playerId: PlayerId.Bot1,
            cards: [
              createJoker(JokerType.Big),
              createJoker(JokerType.Small),
              createCard(Suit.Hearts, Rank.Two),
              createCard(Suit.Hearts, Rank.Two),
            ]
          },
          {
            playerId: PlayerId.Bot2,
            cards: [
              createCard(Suit.Hearts, Rank.Five),
              createCard(Suit.Hearts, Rank.Six),
              createCard(Suit.Hearts, Rank.Seven),
              createCard(Suit.Hearts, Rank.Eight),
            ]
          }
        ],
        winningPlayerId: PlayerId.Bot1,
        points: 0
      };
      
      // Give Bot3 mixed cards with valuable trump but no trump combinations
      const bot3 = gameState.players[3];
      bot3.hand = [
        createJoker(JokerType.Big),           // Valuable trump
        createCard(Suit.Clubs, Rank.Two),    // Trump rank in off-suit
        createCard(Suit.Hearts, Rank.Ace),   // Trump suit high card
        createCard(Suit.Spades, Rank.Seven), // Non-trump safe card
        createCard(Suit.Clubs, Rank.Nine),   // Non-trump safe card
        createCard(Suit.Diamonds, Rank.Jack), // Non-trump safe card
        createCard(Suit.Spades, Rank.Queen),  // Non-trump safe card
      ];

      const selectedCards = getAIMove(gameState, PlayerId.Bot3);

      // Should select 4 cards to match tractor
      expect(selectedCards).toHaveLength(4);
      
      // Should prefer non-trump cards over any trump
      const trumpCardsUsed = selectedCards.filter(card => 
        card.joker || 
        card.rank === Rank.Two || 
        card.suit === Suit.Hearts
      );
      
      // Should minimize trump usage (prefer using all non-trump if possible)
      expect(trumpCardsUsed.length).toBeLessThan(3); // Should try to avoid wasting trump
    });

    it("should use trump conservation hierarchy when forced to play only trump cards", () => {
      // Scenario where AI has ONLY trump cards and must dispose some
      const gameState = initializeGame();
      
      gameState.gamePhase = GamePhase.Playing;
      gameState.currentPlayerIndex = 1; // Bot1 following
      gameState.trumpInfo.trumpSuit = Suit.Diamonds;
      gameState.trumpInfo.trumpRank = Rank.Two;
      
      // Trump single led
      gameState.currentTrick = {
        plays: [
          {
            playerId: PlayerId.Human,
            cards: [createJoker(JokerType.Big)]
          }
        ],
        winningPlayerId: PlayerId.Human,
        points: 0
      };
      
      // Give Bot1 ONLY trump cards with mixed conservation values
      const bot1 = gameState.players[1];
      bot1.hand = [
        createJoker(JokerType.Big),           // Conservation value: 100
        createJoker(JokerType.Small),         // Conservation value: 90  
        createCard(Suit.Diamonds, Rank.Two), // Conservation value: 80
        createCard(Suit.Hearts, Rank.Two),   // Conservation value: 70
        createCard(Suit.Diamonds, Rank.Ace), // Conservation value: 60
        createCard(Suit.Diamonds, Rank.Three), // Conservation value: 5 - WEAKEST
      ];

      const selectedCards = getAIMove(gameState, PlayerId.Bot1);

      // Should select 1 card
      expect(selectedCards).toHaveLength(1);
      
      // Should use WEAKEST trump card by conservation hierarchy (3♦)
      expect(selectedCards[0].suit).toBe(Suit.Diamonds);
      expect(selectedCards[0].rank).toBe(Rank.Three);
      
      // Should NOT waste high-value trump cards
      expect(selectedCards[0].joker).toBeUndefined();
      expect(selectedCards[0].rank).not.toBe(Rank.Two);
      expect(selectedCards[0].rank).not.toBe(Rank.Ace);
    });
  });
});