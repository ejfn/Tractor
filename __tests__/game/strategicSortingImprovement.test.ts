import { getValidCombinations } from "../../src/game/combinationGeneration";
import { calculateCardStrategicValue } from "../../src/game/gameHelpers";
import {
  Card,
  GamePhase,
  JokerType,
  PlayerId,
  Rank,
  Suit,
} from "../../src/types";
import { initializeGame } from "../../src/utils/gameInitialization";
import { gameLogger } from "../../src/utils/gameLogger";

describe("Strategic Sorting Improvement Test", () => {
  it("should preserve point cards and trump cards in mixed combinations", () => {
    // Test scenario: AI has point cards and should avoid wasting them
    const gameState = initializeGame();
    gameState.trumpInfo = {
      trumpRank: Rank.Two,
      trumpSuit: Suit.Spades,
    };

    // AI hand with point cards that should be preserved
    const aiBotHand: Card[] = [
      Card.createCard(Suit.Clubs, Rank.Three, 0), // Weakest
      Card.createCard(Suit.Clubs, Rank.Four, 0), // Weak
      Card.createCard(Suit.Diamonds, Rank.Five, 0), // POINT CARD!
      Card.createCard(Suit.Diamonds, Rank.Ten, 0), // POINT CARD!
      Card.createCard(Suit.Clubs, Rank.Ace, 0), // Valuable Ace
    ];

    gameState.players[1].hand = aiBotHand;

    // Hearts pair led (AI is out of Hearts)
    const leadingCards: Card[] = Card.createPair(Suit.Hearts, Rank.Six);

    gameState.currentTrick = {
      plays: [{ playerId: PlayerId.Human, cards: leadingCards }],
      points: 0,
      winningPlayerId: PlayerId.Human,
    };

    gameState.currentPlayerIndex = 1;
    gameState.gamePhase = GamePhase.Playing;

    // Get valid combinations
    const validCombos = getValidCombinations(aiBotHand, gameState);

    gameLogger.info(
      "test_strategic_sorting_start",
      {},
      "=== STRATEGIC SORTING TEST ===",
    );
    gameLogger.info(
      "test_ai_hand",
      {
        hand: aiBotHand.map((c) => ({
          rank: c.rank,
          suit: c.suit,
          points: c.points,
        })),
      },
      `AI hand: ${aiBotHand.map((c) => `${c.rank}${c.suit}(${c.points}pts)`).join(", ")}`,
    );
    gameLogger.info(
      "test_led_combo",
      { ledType: "Hearts pair" },
      `Led: Hearts pair`,
    );
    gameLogger.info(
      "test_valid_combinations",
      { count: validCombos.length },
      `Valid combinations (${validCombos.length}):`,
    );

    validCombos.forEach((combo, i) => {
      const cards = combo.cards
        .map((c) => `${c.rank}${c.suit}(${c.points}pts)`)
        .join(", ");
      gameLogger.info(
        "test_combination_option",
        { index: i + 1, cards, type: combo.type },
        `  ${i + 1}: [${cards}] - type: ${combo.type}`,
      );
    });

    // Find the intelligent combo (should prioritize weakest cards)
    const intelligentCombo = validCombos[0]; // First combo should be the intelligent one
    expect(intelligentCombo).toBeDefined();

    const selectedCards = intelligentCombo.cards;
    const totalPoints = selectedCards.reduce(
      (sum, card) => sum + (card.points || 0),
      0,
    );

    gameLogger.info(
      "test_intelligent_selection",
      {
        selectedCards: selectedCards.map((c) => ({
          rank: c.rank,
          suit: c.suit,
        })),
      },
      `\n✅ Intelligent selection: ${selectedCards.map((c) => `${c.rank}${c.suit}`).join(", ")}`,
    );
    gameLogger.info(
      "test_points_wasted",
      { totalPoints },
      `✅ Total points wasted: ${totalPoints} (should be 0)`,
    );

    const has5 = selectedCards.some((c) => c.rank === Rank.Five);
    const has10 = selectedCards.some((c) => c.rank === Rank.Ten);
    const hasAce = selectedCards.some((c) => c.rank === Rank.Ace);

    gameLogger.info(
      "test_preserved_5pts",
      { preserved: !has5 },
      `✅ Preserved 5pts card: ${!has5 ? "YES" : "NO"}`,
    );
    gameLogger.info(
      "test_preserved_10pts",
      { preserved: !has10 },
      `✅ Preserved 10pts card: ${!has10 ? "YES" : "NO"}`,
    );
    gameLogger.info(
      "test_preserved_ace",
      { preserved: !hasAce },
      `✅ Preserved Ace: ${!hasAce ? "YES" : "NO"}`,
    );

    // Verify the strategic sorting is working
    expect(totalPoints).toBe(0); // Should not waste any point cards
    expect(has5).toBe(false); // Should preserve 5-point card
    expect(has10).toBe(false); // Should preserve 10-point card
    expect(hasAce).toBe(false); // Should preserve Ace

    // Should use the weakest cards (3 and 4)
    expect(selectedCards.some((c) => c.rank === Rank.Three)).toBe(true);
    expect(selectedCards.some((c) => c.rank === Rank.Four)).toBe(true);
  });

  it("should preserve trump cards using conservation hierarchy", () => {
    // Test trump card preservation
    const gameState = initializeGame();
    gameState.trumpInfo = {
      trumpRank: Rank.Two,
      trumpSuit: Suit.Spades,
    };

    // AI hand with mix of trump and non-trump cards
    const aiBotHand: Card[] = [
      Card.createCard(Suit.Clubs, Rank.Three, 0), // Weak non-trump
      Card.createCard(Suit.Clubs, Rank.Four, 0), // Weak non-trump
      Card.createCard(Suit.Spades, Rank.Three, 0), // Weakest trump (value: 5)
      Card.createCard(Suit.Hearts, Rank.Two, 0), // Valuable trump rank (value: 70)
      Card.createCard(Suit.Spades, Rank.Ace, 0), // Valuable trump suit (value: 60)
    ];

    gameState.players[1].hand = aiBotHand;

    // Hearts pair led (AI is out of Hearts but has trump)
    const leadingCards: Card[] = [
      Card.createCard(Suit.Hearts, Rank.Six, 0),
      Card.createCard(Suit.Hearts, Rank.Six, 0),
    ];

    gameState.currentTrick = {
      plays: [{ playerId: PlayerId.Human, cards: leadingCards }],
      points: 0,
      winningPlayerId: PlayerId.Human,
    };

    gameState.currentPlayerIndex = 1;
    gameState.gamePhase = GamePhase.Playing;

    const validCombos = getValidCombinations(aiBotHand, gameState);

    gameLogger.info(
      "test_trump_conservation_start",
      {},
      "\n=== TRUMP CONSERVATION TEST ===",
    );
    gameLogger.info(
      "test_trump_ai_hand",
      { hand: aiBotHand.map((c) => ({ rank: c.rank, suit: c.suit })) },
      `AI hand: ${aiBotHand.map((c) => `${c.rank}${c.suit}`).join(", ")}`,
    );
    gameLogger.info(
      "test_trump_valid_combinations",
      { count: validCombos.length },
      `Valid combinations (${validCombos.length}):`,
    );

    validCombos.forEach((combo, i) => {
      const cards = combo.cards.map((c) => `${c.rank}${c.suit}`).join(", ");
      gameLogger.info(
        "test_combination_option",
        { index: i + 1, cards, type: combo.type },
        `  ${i + 1}: [${cards}] - type: ${combo.type}`,
      );
    });

    // Should prefer weakest cards over valuable trump cards
    const intelligentCombo = validCombos[0];
    expect(intelligentCombo).toBeDefined();

    const selectedCards = intelligentCombo.cards;
    gameLogger.info(
      "test_trump_intelligent_selection",
      {
        selectedCards: selectedCards.map((c) => ({
          rank: c.rank,
          suit: c.suit,
        })),
      },
      `\n✅ Intelligent selection: ${selectedCards.map((c) => `${c.rank}${c.suit}`).join(", ")}`,
    );

    // Should preserve valuable trump cards (2♥, A♠) and use weak cards (3♣, 4♣)
    const usedValuableTrump = selectedCards.some(
      (c) =>
        (c.rank === Rank.Two && c.suit === Suit.Hearts) ||
        (c.rank === Rank.Ace && c.suit === Suit.Spades),
    );
    expect(usedValuableTrump).toBe(false);

    // Should use weak non-trump cards preferentially
    const usedWeakNonTrump = selectedCards.filter(
      (c) =>
        (c.rank === Rank.Three || c.rank === Rank.Four) &&
        c.suit === Suit.Clubs,
    ).length;
    expect(usedWeakNonTrump).toBeGreaterThan(0);

    gameLogger.info(
      "test_trump_preserved",
      { preserved: true },
      `✅ Preserved valuable trump cards: YES`,
    );
    gameLogger.info(
      "test_weak_cards_used",
      { usedWeakNonTrump, used: usedWeakNonTrump > 0 },
      `✅ Used weak non-trump cards: ${usedWeakNonTrump > 0 ? "YES" : "NO"}`,
    );
  });

  it("should have consistent strategic value calculation across modes", () => {
    // Test our shared strategic value function
    const trumpInfo = {
      trumpRank: Rank.Two,
      trumpSuit: Suit.Spades,
    };

    const testCards: Card[] = [
      Card.createJoker(JokerType.Big, 0),
      Card.createCard(Suit.Spades, Rank.Two, 0), // Trump rank in trump suit
      Card.createCard(Suit.Hearts, Rank.Ten, 0), // Point card
      Card.createCard(Suit.Clubs, Rank.Ace, 0), // Ace
      Card.createCard(Suit.Diamonds, Rank.Three, 0), // Weak card
    ];

    gameLogger.info(
      "test_shared_function_start",
      {},
      "\n=== SHARED FUNCTION TEST ===",
    );
    testCards.forEach((card) => {
      const comboValue = calculateCardStrategicValue(card, trumpInfo, "combo");
      const conservationValue = calculateCardStrategicValue(
        card,
        trumpInfo,
        "conservation",
      );
      const strategicValue = calculateCardStrategicValue(
        card,
        trumpInfo,
        "strategic",
      );

      gameLogger.info(
        "test_card_values",
        {
          card: card.rank || card.joker,
          suit: card.suit,
          comboValue,
          conservationValue,
          strategicValue,
        },
        `${card.rank || card.joker}${card.suit || ""}: combo=${comboValue}, conservation=${conservationValue}, strategic=${strategicValue}`,
      );
    });

    // Verify Big Joker has highest values in all modes
    const bigJoker = testCards[0];
    const comboValue = calculateCardStrategicValue(
      bigJoker,
      trumpInfo,
      "combo",
    );
    const conservationValue = calculateCardStrategicValue(
      bigJoker,
      trumpInfo,
      "conservation",
    );
    const strategicValue = calculateCardStrategicValue(
      bigJoker,
      trumpInfo,
      "strategic",
    );

    expect(comboValue).toBe(1000); // Combo mode
    expect(conservationValue).toBe(100); // Conservation mode
    expect(strategicValue).toBe(1200); // Strategic mode (includes trump bonus)

    // Verify point card gets point bonus in strategic mode
    const pointCard = testCards[2]; // 10♥ with 10 points
    const pointCardStrategic = calculateCardStrategicValue(
      pointCard,
      trumpInfo,
      "strategic",
    );
    expect(pointCardStrategic).toBe(110); // Should include point bonus (10 * 10 = 100) + rank value (10)

    gameLogger.info(
      "test_shared_function_success",
      {},
      "✅ Shared strategic value function working correctly across all modes",
    );
  });
});
