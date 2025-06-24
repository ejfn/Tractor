import { getAIMove } from "../../src/ai/aiLogic";
import { executeMultiComboFollowingAlgorithm } from "../../src/ai/following/multiComboFollowingStrategy";
import {
  Card,
  GameState,
  JokerType,
  PlayerId,
  Rank,
  Suit,
  TrumpInfo,
} from "../../src/types";
import { initializeGame } from "../../src/utils/gameInitialization";
import { gameLogger } from "../../src/utils/gameLogger";

/**
 * AI Multi-Combo Following Strategy Tests
 *
 * Tests the AI's decision-making logic when following multi-combo leads.
 * Validates that AI makes intelligent choices for:
 * 1. Same-suit structure matching with optimal card selection
 * 2. Trump opportunity when void in led suit
 * 3. Strategic disposal when can't beat
 */

describe("AI Multi-Combo Following Strategy", () => {
  let trumpInfo: TrumpInfo;
  let gameState: GameState;

  beforeEach(() => {
    trumpInfo = { trumpRank: Rank.Two, trumpSuit: Suit.Hearts };
    gameState = initializeGame();
    gameState.trumpInfo = trumpInfo;
  });

  test("DUPLICATE BUG: AI should not duplicate cards", () => {
    // From logs: Trump is Q spade, Bot3 leads A♦,7♦,7♦,6♦,6♦
    // Bot1 tries to play 3♦,2♦,2♦,2♦,2♦ but only has 2x 2♦

    gameState.trumpInfo = { trumpRank: Rank.Queen, trumpSuit: Suit.Spades };

    // Leading combo from logs: A♦,7♦,7♦,6♦,6♦ (5 cards)
    gameState.currentTrick = {
      plays: [
        {
          playerId: PlayerId.Bot3,
          cards: [
            Card.createCard(Suit.Diamonds, Rank.Ace, 0),
            Card.createCard(Suit.Diamonds, Rank.Seven, 0),
            Card.createCard(Suit.Diamonds, Rank.Seven, 1),
            Card.createCard(Suit.Diamonds, Rank.Six, 0),
            Card.createCard(Suit.Diamonds, Rank.Six, 1),
          ],
        },
      ],
      winningPlayerId: PlayerId.Bot3,
      points: 0,
      isFinalTrick: false,
    };

    // Set up Bot1's hand - exactly as requested
    gameState.players[1].hand = [
      Card.createJoker(JokerType.Big, 0),
      Card.createCard(Suit.Clubs, Rank.Ten, 0),
      Card.createCard(Suit.Clubs, Rank.Four, 0),
      Card.createCard(Suit.Clubs, Rank.Six, 0),
      Card.createCard(Suit.Clubs, Rank.Nine, 0),
      Card.createCard(Suit.Clubs, Rank.Ace, 0),
      Card.createCard(Suit.Diamonds, Rank.Ten, 0),
      Card.createCard(Suit.Diamonds, Rank.Two, 0), // First 2♦
      Card.createCard(Suit.Diamonds, Rank.Two, 1), // Second 2♦ - ONLY 2 EXIST!
      Card.createCard(Suit.Diamonds, Rank.Three, 0),
      Card.createCard(Suit.Diamonds, Rank.Jack, 0),
      Card.createCard(Suit.Diamonds, Rank.King, 0),
      Card.createCard(Suit.Diamonds, Rank.Queen, 0),
      Card.createCard(Suit.Hearts, Rank.Two, 0),
      Card.createCard(Suit.Hearts, Rank.Two, 1),
      Card.createCard(Suit.Hearts, Rank.Eight, 0),
      Card.createCard(Suit.Hearts, Rank.Nine, 0),
      Card.createCard(Suit.Hearts, Rank.Nine, 1),
      Card.createCard(Suit.Hearts, Rank.King, 0),
      Card.createCard(Suit.Spades, Rank.Two, 0),
      Card.createCard(Suit.Spades, Rank.Seven, 0),
      Card.createCard(Suit.Spades, Rank.Ace, 0),
      Card.createCard(Suit.Spades, Rank.King, 0),
      Card.createCard(Suit.Spades, Rank.King, 1),
      Card.createCard(Suit.Spades, Rank.Queen, 0),
    ];

    gameState.currentPlayerIndex = 1; // Bot1's turn

    // Test the FULL AI system
    const aiMove = getAIMove(gameState, PlayerId.Bot1);

    // Check for duplicates
    const cardIds = aiMove.map((c) => c.id);
    const uniqueIds = new Set(cardIds);
    expect(uniqueIds.size).toBe(cardIds.length);
  });

  describe("Same-Suit Structure Matching", () => {
    test("MCF-AI-1: AI should match structure with best strategic cards", () => {
      // Leading multi-combo: K♠K♠ + Q♠ + 8♠ (pair + singles, 4 cards)
      gameState.currentTrick = {
        plays: [
          {
            playerId: PlayerId.Human,
            cards: [
              Card.createCard(Suit.Spades, Rank.King, 0),
              Card.createCard(Suit.Spades, Rank.King, 1),
              Card.createCard(Suit.Spades, Rank.Queen, 0),
              Card.createCard(Suit.Spades, Rank.Eight, 0),
            ],
          },
        ],
        winningPlayerId: PlayerId.Human,
        points: 20,
        isFinalTrick: false,
      };

      // Bot hand: Can form structure but has choices (all < 8 to keep multi-combo valid)
      const playerHand = [
        Card.createCard(Suit.Spades, Rank.Seven, 0), // Lower cards
        Card.createCard(Suit.Spades, Rank.Seven, 1), // Lower pair
        Card.createCard(Suit.Spades, Rank.Six, 0),
        Card.createCard(Suit.Spades, Rank.Six, 1), // Another pair
        Card.createCard(Suit.Spades, Rank.Five, 0),
        Card.createCard(Suit.Spades, Rank.Four, 0),
        Card.createCard(Suit.Clubs, Rank.Nine, 0),
      ];

      const leadingCards = gameState.currentTrick?.plays[0]?.cards;
      if (!leadingCards) {
        throw new Error("No leading cards found in current trick");
      }

      const result = executeMultiComboFollowingAlgorithm(
        leadingCards, // leadingCards
        playerHand,
        gameState,
        PlayerId.Bot1,
      );

      expect(result).not.toBeNull();
      if (!result) return; // Type guard for remaining checks

      expect(result.strategy).toBe("same_suit_match");
      expect(result.cards).toHaveLength(4);
      expect(result.canBeat).toBe(false); // Can't beat with lower cards

      // Should use best available pair structure
      const selectedRanks = result.cards.map((card) => card.rank).sort();
      expect(selectedRanks).toContain(Rank.Seven); // Should use 7♠7♠ pair
    });

    test("MCF-AI-2: AI should use conservative cards when can't beat", () => {
      // Leading multi-combo: A♠A♠ + K♠ + Q♠ (already high)
      gameState.currentTrick = {
        plays: [
          {
            playerId: PlayerId.Human,
            cards: [
              Card.createCard(Suit.Spades, Rank.Ace, 0),
              Card.createCard(Suit.Spades, Rank.Ace, 1),
              Card.createCard(Suit.Spades, Rank.King, 0),
              Card.createCard(Suit.Spades, Rank.Queen, 0),
            ],
          },
        ],
        winningPlayerId: PlayerId.Human,
        points: 20,
        isFinalTrick: false,
      };

      // Bot hand: Lower cards, can't beat
      const playerHand = [
        Card.createCard(Suit.Spades, Rank.Ten, 0), // Point card
        Card.createCard(Suit.Spades, Rank.Ten, 1), // Point pair
        Card.createCard(Suit.Spades, Rank.Seven, 0),
        Card.createCard(Suit.Spades, Rank.Six, 0),
        Card.createCard(Suit.Clubs, Rank.Nine, 0),
      ];

      const leadingCards = gameState.currentTrick?.plays[0]?.cards;
      if (!leadingCards) {
        throw new Error("No leading cards found in current trick");
      }

      const result = executeMultiComboFollowingAlgorithm(
        leadingCards, // leadingCards
        playerHand,
        gameState,
        PlayerId.Bot1,
      );

      expect(result).not.toBeNull();
      if (!result) return; // Type guard for remaining checks

      expect(result.strategy).toBe("same_suit_match");
      expect(result.canBeat).toBe(false);

      // Must use 10s (point cards) since they're the only pair available
      const usedTenPair =
        result.cards.filter((card) => card.rank === Rank.Ten).length === 2;
      expect(usedTenPair).toBe(true); // Must use 10♠-10♠ pair (only pair available)

      // Should use lowest singles to complete the structure
      const usedLowSingles =
        result.cards.filter(
          (card) => card.rank === Rank.Seven || card.rank === Rank.Six,
        ).length >= 2;
      expect(usedLowSingles).toBe(true); // Should use 7♠, 6♠ for singles
    });
  });

  describe("Trump Opportunity When Void", () => {
    test("MCF-AI-3: AI should use trump when void in led suit", () => {
      // Leading non-trump multi-combo: K♠K♠ + Q♠ + 8♠
      gameState.currentTrick = {
        plays: [
          {
            playerId: PlayerId.Human,
            cards: [
              Card.createCard(Suit.Spades, Rank.King, 0),
              Card.createCard(Suit.Spades, Rank.King, 1),
              Card.createCard(Suit.Spades, Rank.Queen, 0),
              Card.createCard(Suit.Spades, Rank.Eight, 0),
            ],
          },
        ],
        winningPlayerId: PlayerId.Human,
        points: 20,
        isFinalTrick: false,
      };

      // Bot hand: Void in Spades, has trump cards
      const playerHand = [
        Card.createCard(Suit.Hearts, Rank.Three, 0), // Trump suit
        Card.createCard(Suit.Hearts, Rank.Three, 1), // Trump pair
        Card.createCard(Suit.Hearts, Rank.Four, 0),
        Card.createCard(Suit.Hearts, Rank.Five, 0),
        Card.createCard(Suit.Clubs, Rank.Nine, 0), // Other suit
      ];

      const leadingCards = gameState.currentTrick?.plays[0]?.cards;
      if (!leadingCards) {
        throw new Error("No leading cards found in current trick");
      }

      const result = executeMultiComboFollowingAlgorithm(
        leadingCards, // leadingCards
        playerHand,
        gameState,
        PlayerId.Bot1,
      );

      expect(result).not.toBeNull();
      if (!result) return; // Type guard for remaining checks

      expect(result.strategy).toBe("trump_beat");
      expect(result.cards).toHaveLength(4);
      expect(result.canBeat).toBe(true);

      // Should use trump cards (Hearts)
      const allTrump = result.cards.every((card) => card.suit === Suit.Hearts);
      expect(allTrump).toBe(true);
    });

    test("MCF-AI-4: AI should use lowest trump when beating non-trump", () => {
      // Leading non-trump multi-combo
      gameState.currentTrick = {
        plays: [
          {
            playerId: PlayerId.Human,
            cards: [
              Card.createCard(Suit.Spades, Rank.King, 0),
              Card.createCard(Suit.Spades, Rank.King, 1),
              Card.createCard(Suit.Spades, Rank.Queen, 0),
            ],
          },
        ],
        winningPlayerId: PlayerId.Human,
        points: 20,
        isFinalTrick: false,
      };

      // Bot hand: Mixed trump quality
      const playerHand = [
        Card.createJoker(JokerType.Big, 0), // High trump
        Card.createJoker(JokerType.Small, 0), // High trump
        Card.createCard(Suit.Hearts, Rank.Three, 0), // Low trump
        Card.createCard(Suit.Hearts, Rank.Three, 1), // Low trump pair
        Card.createCard(Suit.Hearts, Rank.Four, 0), // Low trump
        Card.createCard(Suit.Clubs, Rank.Nine, 0),
      ];

      const leadingCards = gameState.currentTrick?.plays[0]?.cards;
      if (!leadingCards) {
        throw new Error("No leading cards found in current trick");
      }

      const result = executeMultiComboFollowingAlgorithm(
        leadingCards, // leadingCards
        playerHand,
        gameState,
        PlayerId.Bot1,
      );

      expect(result).not.toBeNull();
      if (!result) return; // Type guard for remaining checks
      expect(result.strategy).toBe("trump_beat");

      // Should use low trump cards, not jokers
      const usesJokers = result.cards.some((card) => card.joker);
      expect(usesJokers).toBe(false); // Should conserve jokers

      // Should use 3♥ pair and 4♥
      const usesLowTrump = result.cards.every(
        (card) =>
          card.suit === Suit.Hearts &&
          (card.rank === Rank.Three || card.rank === Rank.Four),
      );
      expect(usesLowTrump).toBe(true);
    });
  });

  describe("Trump vs Trump Multi-Layer Comparison", () => {
    test("MCF-AI-5: AI should beat previous trump response with higher trump", () => {
      // Multi-combo with existing trump response
      gameState.currentTrick = {
        plays: [
          {
            playerId: PlayerId.Human,
            cards: [
              Card.createCard(Suit.Spades, Rank.King, 0),
              Card.createCard(Suit.Spades, Rank.King, 1),
              Card.createCard(Suit.Spades, Rank.Queen, 0),
            ],
          },
          {
            playerId: PlayerId.Bot1,
            cards: [
              Card.createCard(Suit.Hearts, Rank.Three, 0), // Low trump response
              Card.createCard(Suit.Hearts, Rank.Three, 1),
              Card.createCard(Suit.Hearts, Rank.Four, 0),
            ],
          },
        ],
        winningPlayerId: PlayerId.Bot1,
        points: 20,
        isFinalTrick: false,
      };

      // Bot2 hand: Higher trump cards
      const playerHand = [
        Card.createCard(Suit.Hearts, Rank.Ace, 0), // High trump
        Card.createCard(Suit.Hearts, Rank.Ace, 1), // High trump pair
        Card.createCard(Suit.Hearts, Rank.King, 0), // High trump
        Card.createCard(Suit.Hearts, Rank.Queen, 0), // Medium trump
        Card.createCard(Suit.Clubs, Rank.Seven, 0),
      ];

      const leadingCards = gameState.currentTrick?.plays[0]?.cards;
      if (!leadingCards) {
        throw new Error("No leading cards found in current trick");
      }

      const result = executeMultiComboFollowingAlgorithm(
        leadingCards, // leadingCards
        playerHand,
        gameState,
        PlayerId.Bot2,
      );

      expect(result).not.toBeNull();
      if (!result) return; // Type guard for remaining checks
      expect(result.strategy).toBe("trump_beat");
      expect(result.canBeat).toBe(true);

      // Should use Ace pair to beat 3♥ pair
      const hasAcePair =
        result.cards.filter((card) => card.rank === Rank.Ace).length === 2;
      expect(hasAcePair).toBe(true);
    });
  });

  describe("Strategic Disposal When Can't Beat", () => {
    test("MCF-AI-6: AI should dispose lowest value cards when can't beat", () => {
      // Strong leading multi-combo (non-trump as required by game rules)
      gameState.currentTrick = {
        plays: [
          {
            playerId: PlayerId.Human,
            cards: [
              Card.createCard(Suit.Spades, Rank.Ace, 0),
              Card.createCard(Suit.Spades, Rank.Ace, 1),
              Card.createCard(Suit.Spades, Rank.King, 0),
            ],
          },
        ],
        winningPlayerId: PlayerId.Human,
        points: 20,
        isFinalTrick: false,
      };

      // Bot hand: Void in Spades, mixed quality cards, can't beat A♠A♠ + K♠
      // No trump cards to avoid trump opportunity strategy
      const playerHand = [
        Card.createCard(Suit.Diamonds, Rank.Ten, 0), // Point card (valuable)
        Card.createCard(Suit.Diamonds, Rank.King, 0), // High card (valuable)
        Card.createCard(Suit.Clubs, Rank.Seven, 0), // Low card
        Card.createCard(Suit.Clubs, Rank.Six, 0), // Low card
        Card.createCard(Suit.Clubs, Rank.Five, 0), // Low card
        Card.createCard(Suit.Clubs, Rank.Four, 0), // Low card
      ];

      const leadingCards = gameState.currentTrick?.plays[0]?.cards;
      if (!leadingCards) {
        throw new Error("No leading cards found in current trick");
      }

      const result = executeMultiComboFollowingAlgorithm(
        leadingCards, // leadingCards
        playerHand,
        gameState,
        PlayerId.Bot1,
      );

      expect(result).not.toBeNull();
      if (!result) return; // Type guard for remaining checks
      expect(result.strategy).toBe("disposal");
      expect(result.canBeat).toBe(false);

      // Should dispose low cards (7♣, 6♣, 4♣), preserve 10♦ and K♦
      const preservesValueCards = result.cards.every(
        (card) => card.rank !== Rank.Ten && card.rank !== Rank.King,
      );
      expect(preservesValueCards).toBe(true);
    });
  });

  describe("Bug Investigation: Invalid AI Move", () => {
    test("MCF-AI-BUG: AI should use available pair when responding to pair-single multi-combo", () => {
      // Reproduce the exact scenario from logs:
      // Bot1 leads: A♠, K♠, K♠ (pair + single multi-combo)
      // Bot2 has Q♠Q♠ pair available but attempts 8♠, 7♠, 4♠ (invalid)

      trumpInfo = { trumpRank: Rank.Two, trumpSuit: Suit.Clubs };
      gameState.trumpInfo = trumpInfo;

      gameState.currentTrick = {
        plays: [
          {
            playerId: PlayerId.Bot1,
            cards: [
              Card.createCard(Suit.Spades, Rank.Ace, 0),
              Card.createCard(Suit.Spades, Rank.King, 0),
              Card.createCard(Suit.Spades, Rank.King, 1),
            ],
          },
        ],
        winningPlayerId: PlayerId.Bot1,
        points: 20,
        isFinalTrick: false,
      };

      // Bot2's actual hand from logs (simplified to key spades)
      const playerHand = [
        Card.createCard(Suit.Clubs, Rank.Ten, 0),
        Card.createCard(Suit.Clubs, Rank.Six, 0),
        Card.createCard(Suit.Clubs, Rank.Seven, 0),
        Card.createCard(Suit.Clubs, Rank.Seven, 1),
        Card.createCard(Suit.Clubs, Rank.Eight, 0),
        Card.createCard(Suit.Clubs, Rank.Nine, 0),
        Card.createCard(Suit.Clubs, Rank.King, 0),
        Card.createCard(Suit.Clubs, Rank.Queen, 0),
        Card.createCard(Suit.Diamonds, Rank.Three, 0),
        Card.createCard(Suit.Diamonds, Rank.King, 0),
        Card.createCard(Suit.Diamonds, Rank.Queen, 0),
        Card.createCard(Suit.Hearts, Rank.Three, 0),
        Card.createCard(Suit.Hearts, Rank.Four, 0),
        Card.createCard(Suit.Hearts, Rank.Six, 0),
        Card.createCard(Suit.Hearts, Rank.Seven, 0),
        Card.createCard(Suit.Hearts, Rank.Queen, 0),
        Card.createJoker(JokerType.Small, 0),
        Card.createCard(Suit.Spades, Rank.Ten, 0),
        Card.createCard(Suit.Spades, Rank.Four, 0),
        Card.createCard(Suit.Spades, Rank.Seven, 0),
        Card.createCard(Suit.Spades, Rank.Eight, 0),
        Card.createCard(Suit.Spades, Rank.Nine, 0),
        Card.createCard(Suit.Spades, Rank.Ace, 1), // Second Ace
        Card.createCard(Suit.Spades, Rank.Queen, 0),
        Card.createCard(Suit.Spades, Rank.Queen, 1), // Q♠Q♠ pair available!
      ];

      const leadingCards = gameState.currentTrick?.plays[0]?.cards;
      if (!leadingCards) {
        throw new Error("No leading cards found in current trick");
      }

      const result = executeMultiComboFollowingAlgorithm(
        leadingCards, // leadingCards
        playerHand,
        gameState,
        PlayerId.Bot2,
      );

      expect(result).not.toBeNull();
      if (!result) return; // Type guard for remaining checks

      // Log what the AI actually chose for debugging
      gameLogger.info(
        "ai_bug_investigation",
        {
          selectedCards: result.cards.map(
            (c) =>
              `${c.rank}♠${c.suit === Suit.Spades ? "♠" : c.suit === Suit.Hearts ? "♥" : c.suit === Suit.Clubs ? "♣" : "♦"}`,
          ),
          strategy: result.strategy,
          cardCount: result.cards.length,
          hasQueenPair:
            result.cards.filter(
              (card) => card.suit === Suit.Spades && card.rank === Rank.Queen,
            ).length === 2,
        },
        "AI Bug Investigation: What AI actually chose",
      );

      // CRITICAL: AI should use Q♠Q♠ pair to match the structure (pair + single)
      // NOT play 3 singles like 8♠, 7♠, 4♠
      const hasQueenPair =
        result.cards.filter(
          (card) => card.suit === Suit.Spades && card.rank === Rank.Queen,
        ).length === 2;

      expect(hasQueenPair).toBe(true); // Should use Q♠Q♠ pair
      expect(result.cards).toHaveLength(3); // Should match 3-card structure

      // The response should be valid (pair + single structure)
      // Example: Q♠Q♠ + 10♠ or Q♠Q♠ + 9♠
      const spadesCards = result.cards.filter(
        (card) => card.suit === Suit.Spades,
      );
      expect(spadesCards).toHaveLength(3); // All should be spades
    });
  });

  describe("No Valid Response Scenarios", () => {
    test("MCF-AI-7: AI should handle scenarios with no valid multi-combo response", () => {
      // Large multi-combo requiring many cards
      gameState.currentTrick = {
        plays: [
          {
            playerId: PlayerId.Human,
            cards: [
              Card.createCard(Suit.Spades, Rank.Ace, 0),
              Card.createCard(Suit.Spades, Rank.Ace, 1),
              Card.createCard(Suit.Spades, Rank.King, 0),
              Card.createCard(Suit.Spades, Rank.King, 1),
              Card.createCard(Suit.Spades, Rank.Queen, 0),
              Card.createCard(Suit.Spades, Rank.Queen, 1),
            ],
          },
        ],
        winningPlayerId: PlayerId.Human,
        points: 20,
        isFinalTrick: false,
      };

      // Bot hand: Not enough cards to match 6-card structure
      const playerHand = [
        Card.createCard(Suit.Spades, Rank.Jack, 0),
        Card.createCard(Suit.Spades, Rank.Jack, 1),
        Card.createCard(Suit.Hearts, Rank.Seven, 0),
        Card.createCard(Suit.Clubs, Rank.Eight, 0),
      ];

      const leadingCards = gameState.currentTrick?.plays[0]?.cards;
      if (!leadingCards) {
        throw new Error("No leading cards found in current trick");
      }

      const result = executeMultiComboFollowingAlgorithm(
        leadingCards, // leadingCards
        playerHand,
        gameState,
        PlayerId.Bot1,
      );

      // Should return a response but validate the actual cards returned
      expect(result).not.toBeNull();
      if (!result) return;

      // Check that all remaining spades are played (J♠J♠)
      const spadesInResponse = result.cards.filter(
        (card) => card.suit === Suit.Spades,
      );
      expect(spadesInResponse.length).toBe(2); // Should play both J♠ cards

      const jackCount = spadesInResponse.filter(
        (card) => card.rank === Rank.Jack,
      ).length;
      expect(jackCount).toBe(2); // Both should be Jacks
    });
  });
});
