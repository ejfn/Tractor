import { getAIMove } from "../../src/ai/aiLogic";
import { getValidCombinations } from "../../src/game/combinationGeneration";
import { isTrump } from "../../src/game/cardValue";
import { isValidPlay } from "../../src/game/playValidation";
import {
  Card,
  GameState,
  PlayerId,
  Rank,
  Suit,
  TeamId,
  TrumpInfo,
} from "../../src/types";
import { createGameState } from "../helpers";

describe("AI Rule Violation Bug - Issue #95", () => {
  test("AI should not play random singles when it cannot form a pair from leading suit", () => {
    // Create a game state where AI must follow a pair but cannot form one from leading suit
    const trumpInfo: TrumpInfo = {
      trumpRank: Rank.Two,

      trumpSuit: Suit.Spades,
    };

    // Create leading combo: pair of Hearts (non-trump)
    const leadingCombo = Card.createPair(Suit.Hearts, Rank.Five);

    // Create AI hand that has some Hearts but cannot form a pair
    const aiHand = [
      Card.createCard(Suit.Hearts, Rank.Three, 0), // One Heart (must play)
      Card.createCard(Suit.Clubs, Rank.Four, 0), // Non-trump, non-Hearts
      Card.createCard(Suit.Clubs, Rank.Six, 0), // Non-trump, non-Hearts
      Card.createCard(Suit.Diamonds, Rank.Seven, 0), // Non-trump, non-Hearts
      Card.createCard(Suit.Diamonds, Rank.Eight, 0), // Non-trump, non-Hearts
    ];

    const gameState: GameState = createGameState({
      trumpInfo,
      currentTrick: {
        plays: [{ playerId: PlayerId.Human, cards: leadingCombo }],
        winningPlayerId: PlayerId.Human,
        points: 10,
      },
      players: [
        { id: PlayerId.Bot1, team: TeamId.B, hand: aiHand, isHuman: false },
      ],
    });

    // Get AI move
    const aiMove = getAIMove(gameState, PlayerId.Bot1);

    // Verify the move follows game rules
    expect(aiMove).toHaveLength(2); // Must play 2 cards to match leading combo

    // The AI must play the Hearts card (H3) as it's the only Hearts card available
    const heartsCard = aiMove.find((card) => card.suit === Suit.Hearts);
    expect(heartsCard).toBeDefined();
    expect(heartsCard?.rank).toBe(Rank.Three);

    // Verify the move is actually valid according to game rules
    const isValid = isValidPlay(aiMove, aiHand, PlayerId.Bot1, gameState);
    expect(isValid).toBe(true);

    // Get all valid combinations and ensure the AI picked one of them
    const validCombos = getValidCombinations(aiHand, gameState);
    expect(validCombos.length).toBeGreaterThan(0);

    // Verify AI picked a valid combination
    const aiMoveIsValid = validCombos.some(
      (combo) =>
        combo.cards.length === aiMove.length &&
        combo.cards.every((card) =>
          aiMove.some((playedCard) => playedCard.id === card.id),
        ),
    );
    expect(aiMoveIsValid).toBe(true);
  });

  test("AI should not violate suit following when no cards of leading suit", () => {
    const trumpInfo: TrumpInfo = {
      trumpRank: Rank.Two,

      trumpSuit: Suit.Spades,
    };

    // Leading combo: pair of Hearts
    const leadingCombo = Card.createPair(Suit.Hearts, Rank.Five);

    // AI has no Hearts at all - can play any cards
    const aiHand = [
      ...Card.createPair(Suit.Clubs, Rank.Four), // Valid pair option
      Card.createCard(Suit.Diamonds, Rank.Seven, 0),
      Card.createCard(Suit.Diamonds, Rank.Eight, 0),
    ];

    const gameState: GameState = createGameState({
      trumpInfo,
      currentTrick: {
        plays: [{ playerId: PlayerId.Human, cards: leadingCombo }],
        winningPlayerId: PlayerId.Human,
        points: 10,
      },
      players: [
        { id: PlayerId.Bot1, team: TeamId.B, hand: aiHand, isHuman: false },
      ],
    });

    const aiMove = getAIMove(gameState, PlayerId.Bot1);

    // Verify move follows rules
    expect(aiMove).toHaveLength(2);
    const isValid = isValidPlay(aiMove, aiHand, PlayerId.Bot1, gameState);
    expect(isValid).toBe(true);
  });

  test("AI should play all cards of leading suit when insufficient for combo", () => {
    const trumpInfo: TrumpInfo = {
      trumpRank: Rank.Two,

      trumpSuit: Suit.Spades,
    };

    // Leading combo: pair of Hearts
    const leadingCombo = Card.createPair(Suit.Hearts, Rank.Five);

    // AI has exactly one Hearts card - must play it plus one other
    const aiHand = [
      Card.createCard(Suit.Hearts, Rank.Three, 0), // Must play this
      Card.createCard(Suit.Clubs, Rank.Four, 0), // Can play this as second card
      Card.createCard(Suit.Diamonds, Rank.Seven, 0),
    ];

    const gameState: GameState = createGameState({
      trumpInfo,
      currentTrick: {
        plays: [{ playerId: PlayerId.Human, cards: leadingCombo }],
        winningPlayerId: PlayerId.Human,
        points: 10,
      },
      players: [
        { id: PlayerId.Bot1, team: TeamId.B, hand: aiHand, isHuman: false },
      ],
    });

    const aiMove = getAIMove(gameState, PlayerId.Bot1);

    // Must play exactly 2 cards
    expect(aiMove).toHaveLength(2);

    // Must include the Hearts card
    const includesHeartsCard = aiMove.some(
      (card) => card.suit === Suit.Hearts && card.rank === Rank.Three,
    );
    expect(includesHeartsCard).toBe(true);

    // Verify it's a valid play
    const isValid = isValidPlay(aiMove, aiHand, PlayerId.Bot1, gameState);
    expect(isValid).toBe(true);
  });

  test("AI should never generate invalid combinations through emergency fallback", () => {
    const trumpInfo: TrumpInfo = {
      trumpRank: Rank.Two,

      trumpSuit: Suit.Spades,
    };

    // Leading combo: tractor in Hearts (requires complex following)
    const leadingCombo = [
      ...Card.createPair(Suit.Hearts, Rank.Five),
      ...Card.createPair(Suit.Hearts, Rank.Six),
    ];

    // AI has partial Hearts but cannot form tractor - should play all Hearts + other cards
    const aiHand = [
      Card.createCard(Suit.Hearts, Rank.Three, 0), // Must play
      Card.createCard(Suit.Hearts, Rank.Seven, 0), // Must play
      Card.createCard(Suit.Clubs, Rank.Four, 0), // Can play as 3rd card
      Card.createCard(Suit.Diamonds, Rank.Eight, 0), // Can play as 4th card
      Card.createCard(Suit.Diamonds, Rank.Nine, 0), // Extra card
    ];

    const gameState: GameState = createGameState({
      trumpInfo,
      currentTrick: {
        plays: [{ playerId: PlayerId.Human, cards: leadingCombo }],
        winningPlayerId: PlayerId.Human,
        points: 20,
      },
      players: [
        { id: PlayerId.Bot1, team: TeamId.B, hand: aiHand, isHuman: false },
      ],
    });

    // This should not throw an error and should return valid moves
    expect(() => {
      const aiMove = getAIMove(gameState, PlayerId.Bot1);

      // Verify move is correct length
      expect(aiMove).toHaveLength(4);

      // Verify move is actually valid
      const isValid = isValidPlay(aiMove, aiHand, PlayerId.Bot1, gameState);
      expect(isValid).toBe(true);

      // Verify it includes both Hearts cards (rule requirement)
      const heartsCardsPlayed = aiMove.filter(
        (card) => card.suit === Suit.Hearts && !isTrump(card, trumpInfo),
      );
      expect(heartsCardsPlayed).toHaveLength(2);
    }).not.toThrow();
  });

  test("AI should handle complex scenarios without falling back to invalid moves", () => {
    const trumpInfo: TrumpInfo = {
      trumpRank: Rank.Ace,

      trumpSuit: Suit.Hearts,
    };

    // Leading combo: trump pair
    const leadingCombo = Card.createPair(Suit.Hearts, Rank.King);

    // AI has some trump but cannot form pair - complex scenario
    const aiHand = [
      Card.createCard(Suit.Hearts, Rank.Three, 0), // Trump card (must play)
      Card.createCard(Suit.Clubs, Rank.Ace, 0), // Trump rank in non-trump suit
      Card.createCard(Suit.Diamonds, Rank.Four, 0), // Non-trump
      Card.createCard(Suit.Diamonds, Rank.Five, 0), // Non-trump
    ];

    const gameState: GameState = createGameState({
      trumpInfo,
      currentTrick: {
        plays: [{ playerId: PlayerId.Human, cards: leadingCombo }],
        winningPlayerId: PlayerId.Human,
        points: 20,
      },
      players: [
        { id: PlayerId.Bot1, team: TeamId.B, hand: aiHand, isHuman: false },
      ],
    });

    expect(() => {
      const aiMove = getAIMove(gameState, PlayerId.Bot1);
      expect(aiMove).toHaveLength(2);

      // Must be valid according to game rules
      const isValid = isValidPlay(aiMove, aiHand, PlayerId.Bot1, gameState);
      expect(isValid).toBe(true);
    }).not.toThrow();
  });
});
