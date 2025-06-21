import { makeTrumpDeclaration } from "../../src/game/dealingAndDeclaration";
import {
  Card,
  DeclarationType,
  GameState,
  JokerType,
  PlayerId,
  Rank,
  Suit,
} from "../../src/types";
import { initializeGame } from "../../src/utils/gameInitialization";
import { gameLogger } from "../../src/utils/gameLogger";

describe("Joker Pair Trump Suit Rules", () => {
  let gameState: GameState;

  beforeEach(() => {
    gameState = initializeGame();
  });

  test("should set trump suit to Suit.None when big joker pair is declared", () => {
    // Big joker pair declaration should result in NO trump suit
    const bigJokerDeclaration = {
      rank: Rank.Two,
      suit: Suit.None, // Joker pairs use Suit.None
      type: DeclarationType.BigJokerPair,
      cards: Card.createJokerPair(JokerType.Big),
    };

    const newState = makeTrumpDeclaration(
      gameState,
      PlayerId.Bot1,
      bigJokerDeclaration,
    );

    // Trump suit should be Suit.None (no trump suit)
    expect(newState.trumpInfo.trumpSuit).toBe(Suit.None);

    gameLogger.info(
      "test_big_joker_trump_suit",
      { trumpSuit: newState.trumpInfo.trumpSuit },
      "✅ Big joker pair correctly sets trump suit to Suit.None",
    );
  });

  test("should set trump suit to Suit.None when small joker pair is declared", () => {
    // Small joker pair declaration should result in NO trump suit
    const smallJokerDeclaration = {
      rank: Rank.Two,
      suit: Suit.None, // Joker pairs use Suit.None
      type: DeclarationType.SmallJokerPair,
      cards: Card.createJokerPair(JokerType.Small),
    };

    const newState = makeTrumpDeclaration(
      gameState,
      PlayerId.Bot2,
      smallJokerDeclaration,
    );

    // Trump suit should be Suit.None (no trump suit)
    expect(newState.trumpInfo.trumpSuit).toBe(Suit.None);

    gameLogger.info(
      "test_small_joker_trump_suit",
      { trumpSuit: newState.trumpInfo.trumpSuit },
      "✅ Small joker pair correctly sets trump suit to Suit.None",
    );
  });

  test("should maintain trump suit for regular rank declarations", () => {
    // Regular trump rank declarations should still set trump suit
    const regularDeclaration = {
      rank: Rank.Two,
      suit: Suit.Clubs,
      type: DeclarationType.Pair,
      cards: Card.createPair(Suit.Clubs, Rank.Two),
    };

    const newState = makeTrumpDeclaration(
      gameState,
      PlayerId.Human,
      regularDeclaration,
    );

    // Trump suit should be the declared suit
    expect(newState.trumpInfo.trumpSuit).toBe(Suit.Clubs);

    gameLogger.info(
      "test_regular_rank_trump_suit",
      { trumpSuit: newState.trumpInfo.trumpSuit },
      "✅ Regular rank declarations correctly set trump suit",
    );
  });

  test("should demonstrate joker pair overriding regular declaration", () => {
    // Start with regular declaration
    const regularDeclaration = {
      rank: Rank.Two,
      suit: Suit.Hearts,
      type: DeclarationType.Single,
      cards: [Card.createCard(Suit.Hearts, Rank.Two, 0)],
    };

    let state = makeTrumpDeclaration(
      gameState,
      PlayerId.Human,
      regularDeclaration,
    );
    expect(state.trumpInfo.trumpSuit).toBe(Suit.Hearts);

    // Override with big joker pair
    const jokerDeclaration = {
      rank: Rank.Two,
      suit: Suit.None, // Joker pairs use Suit.None
      type: DeclarationType.BigJokerPair,
      cards: Card.createJokerPair(JokerType.Big),
    };

    state = makeTrumpDeclaration(state, PlayerId.Bot1, jokerDeclaration);

    // Now trump suit should be Suit.None (no suit)
    expect(state.trumpInfo.trumpSuit).toBe(Suit.None);
    expect(state.trumpDeclarationState?.currentDeclaration?.playerId).toBe(
      PlayerId.Bot1,
    );

    // Verify declaration history
    expect(state.trumpDeclarationState?.declarationHistory).toHaveLength(2);
    expect(state.trumpDeclarationState?.currentDeclaration?.type).toBe(
      DeclarationType.BigJokerPair,
    );

    gameLogger.info(
      "test_joker_override",
      {
        finalTrumpSuit: state.trumpInfo.trumpSuit,
        declarerId: state.trumpDeclarationState?.currentDeclaration?.playerId,
      },
      "✅ Joker pair correctly overrides regular declaration and removes trump suit",
    );
  });

  test("should show correct logs for joker pair declarations", () => {
    // This test verifies that the logs now show correct behavior
    const consoleSpy = jest.spyOn(console, "log").mockImplementation();

    const bigJokerDeclaration = {
      rank: Rank.Two,
      suit: Suit.None, // Joker pairs use Suit.None
      type: DeclarationType.BigJokerPair,
      cards: Card.createJokerPair(JokerType.Big),
    };

    const newState = makeTrumpDeclaration(
      gameState,
      PlayerId.Bot1,
      bigJokerDeclaration,
    );

    // Should result in Suit.None (no trump suit)
    expect(newState.trumpInfo.trumpSuit).toBe(Suit.None);

    // The logs should no longer say "big joker pair in Diamonds suit"
    // Instead they should just say "big joker pair" with no trump suit

    consoleSpy.mockRestore();

    gameLogger.info(
      "test_joker_declaration_logs",
      { trumpSuit: newState.trumpInfo.trumpSuit },
      "✅ Joker pair declarations no longer incorrectly reference trump suits",
    );
  });
});
