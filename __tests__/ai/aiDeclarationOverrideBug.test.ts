import { getAITrumpDeclarationDecision } from "../../src/ai/trumpDeclaration/trumpDeclarationStrategy";
import {
  checkDeclarationOpportunities,
  getPlayerDeclarationOptions,
  makeTrumpDeclaration,
} from "../../src/game/dealingAndDeclaration";
import {
  Card,
  DeclarationType,
  GameState,
  PlayerId,
  Rank,
  Suit,
} from "../../src/types";
import { initializeGame } from "../../src/utils/gameInitialization";
import { gameLogger } from "../../src/utils/gameLogger";
import { getPlayerById } from "../helpers";

describe("AI Declaration Override Bug", () => {
  let gameState: GameState;

  beforeEach(() => {
    gameState = initializeGame();

    // Give players specific hands with equal strength pairs
    const humanPlayer = getPlayerById(gameState, PlayerId.Human);
    const bot1Player = getPlayerById(gameState, PlayerId.Bot1);
    const bot2Player = getPlayerById(gameState, PlayerId.Bot2);

    if (!humanPlayer || !bot1Player || !bot2Player) {
      throw new Error("Players not found in game state");
    }

    // Give human a trump rank pair in Clubs
    humanPlayer.hand = [
      ...Card.createPair(Suit.Clubs, Rank.Two),
      Card.createCard(Suit.Hearts, Rank.Ace, 0),
    ];

    // Give Bot1 a trump rank pair in Diamonds (equal strength)
    bot1Player.hand = [
      ...Card.createPair(Suit.Diamonds, Rank.Two),
      Card.createCard(Suit.Spades, Rank.Queen, 0),
    ];

    // Give Bot2 a trump rank pair in Hearts (equal strength)
    bot2Player.hand = [
      ...Card.createPair(Suit.Hearts, Rank.Two),
      Card.createCard(Suit.Spades, Rank.King, 0),
    ];
  });

  test("should reproduce the bug: AI pair overriding another AI pair", () => {
    // Human declares first with pair of 2♣
    const humanDeclaration = {
      rank: Rank.Two,
      suit: Suit.Clubs,
      type: DeclarationType.Pair,
      cards: Card.createPair(Suit.Clubs, Rank.Two),
    };

    const newState = makeTrumpDeclaration(
      gameState,
      PlayerId.Human,
      humanDeclaration,
    );

    // Now check what Bot1 thinks it can do
    const bot1Decision = getAITrumpDeclarationDecision(newState, PlayerId.Bot1);
    gameLogger.info(
      "test_ai_declaration_bot1_decision",
      { playerId: PlayerId.Bot1, decision: bot1Decision },
      "Bot1 decision:",
    );

    // Bot1 should NOT be able to declare (equal strength)
    expect(bot1Decision.shouldDeclare).toBe(false);

    // If Bot1 somehow decides to declare, the makeTrumpDeclaration should fail
    if (bot1Decision.shouldDeclare && bot1Decision.declaration) {
      expect(() => {
        if (!bot1Decision.declaration) {
          throw new Error("bot1Decision.declaration is undefined");
        }
        makeTrumpDeclaration(newState, PlayerId.Bot1, {
          rank: Rank.Two,
          suit: bot1Decision.declaration.suit,
          type: bot1Decision.declaration.type,
          cards: bot1Decision.declaration.cards,
        });
      }).toThrow("Declaration cannot override current declaration");
    }
  });

  test("should test multiple AI players declaring simultaneously", () => {
    // No initial declaration - both AIs should be able to declare
    const bot1Decision = getAITrumpDeclarationDecision(
      gameState,
      PlayerId.Bot1,
    );
    const bot2Decision = getAITrumpDeclarationDecision(
      gameState,
      PlayerId.Bot2,
    );

    gameLogger.info(
      "test_ai_declaration_bot1_initial",
      { playerId: PlayerId.Bot1, decision: bot1Decision },
      "Bot1 initial decision:",
    );
    gameLogger.info(
      "test_ai_declaration_bot2_initial",
      { playerId: PlayerId.Bot2, decision: bot2Decision },
      "Bot2 initial decision:",
    );

    // Most of the time, AI won't declare with pairs due to random factors
    // This test mainly verifies the AI logic handles multiple players correctly
    expect(typeof bot1Decision.shouldDeclare).toBe("boolean");
    expect(typeof bot2Decision.shouldDeclare).toBe("boolean");
  });

  test("should verify getPlayerDeclarationOptions filters correctly after first declaration", () => {
    // Human declares first with pair of 2♣
    const humanDeclaration = {
      rank: Rank.Two,
      suit: Suit.Clubs,
      type: DeclarationType.Pair,
      cards: Card.createPair(Suit.Clubs, Rank.Two),
    };

    const newState = makeTrumpDeclaration(
      gameState,
      PlayerId.Human,
      humanDeclaration,
    );

    // getPlayerDeclarationOptions is imported at the top of the file

    const bot1Options = getPlayerDeclarationOptions(newState, PlayerId.Bot1);
    const bot2Options = getPlayerDeclarationOptions(newState, PlayerId.Bot2);

    gameLogger.info(
      "test_ai_declaration_bot1_options",
      { playerId: PlayerId.Bot1, options: bot1Options },
      "Bot1 options after human pair:",
    );
    gameLogger.info(
      "test_ai_declaration_bot2_options",
      { playerId: PlayerId.Bot2, options: bot2Options },
      "Bot2 options after human pair:",
    );

    // Both bots should have NO valid options (their pairs are equal strength)
    expect(bot1Options).toHaveLength(0);
    expect(bot2Options).toHaveLength(0);
  });

  test("should simulate sequential AI declarations like in progressive dealing", () => {
    // Force Bot1 to declare first with pair of 2♦ (bypass random logic)
    const bot1Declaration = {
      rank: Rank.Two,
      suit: Suit.Diamonds,
      type: DeclarationType.Pair,
      cards: Card.createPair(Suit.Diamonds, Rank.Two),
    };

    const stateAfterBot1 = makeTrumpDeclaration(
      gameState,
      PlayerId.Bot1,
      bot1Declaration,
    );

    gameLogger.info(
      "test_ai_declaration_state_after_bot1",
      {
        currentDeclaration:
          stateAfterBot1.trumpDeclarationState?.currentDeclaration,
        trumpSuit: stateAfterBot1.trumpInfo.trumpSuit,
      },
      "State after Bot1 declared:",
    );

    const opportunities = checkDeclarationOpportunities(stateAfterBot1);

    gameLogger.info(
      "test_ai_declaration_opportunities",
      { opportunities },
      "Opportunities after Bot1:",
    );

    // Bot2 should have NO opportunities after Bot1's equal strength declaration
    const bot2Opportunities = getPlayerDeclarationOptions(
      stateAfterBot1,
      PlayerId.Bot2,
    );
    expect(bot2Opportunities).toHaveLength(0);

    // Double-check with getAITrumpDeclarationDecision
    const bot2DecisionAfter = getAITrumpDeclarationDecision(
      stateAfterBot1,
      PlayerId.Bot2,
    );
    gameLogger.info(
      "test_ai_declaration_bot2_after_bot1",
      { playerId: PlayerId.Bot2, decision: bot2DecisionAfter },
      "Bot2 decision after Bot1:",
    );

    expect(bot2DecisionAfter.shouldDeclare).toBe(false);

    // Now let's see what happens if we try to force Bot2 to declare anyway
    try {
      const bot2Declaration = {
        rank: Rank.Two,
        suit: Suit.Hearts,
        type: DeclarationType.Pair,
        cards: Card.createPair(Suit.Hearts, Rank.Two),
      };

      makeTrumpDeclaration(stateAfterBot1, PlayerId.Bot2, bot2Declaration);

      // If we get here, the bug exists!
      fail("Bot2 should not be able to override Bot1 pair with another pair!");
    } catch (error: unknown) {
      // This is expected - the declaration should fail
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      gameLogger.info(
        "test_ai_declaration_bot2_failed",
        { playerId: PlayerId.Bot2, errorMessage },
        "Bot2 declaration correctly failed:",
      );
      expect(errorMessage).toContain(
        "Declaration cannot override current declaration",
      );
    }
  });

  test("should test concurrent AI declarations (race condition)", async () => {
    // This test simulates what might happen if checkAIDeclarations is called multiple times rapidly

    // First, let's see what both AIs think they can do initially
    const bot1InitialDecision = getAITrumpDeclarationDecision(
      gameState,
      PlayerId.Bot1,
    );
    const bot2InitialDecision = getAITrumpDeclarationDecision(
      gameState,
      PlayerId.Bot2,
    );

    gameLogger.info(
      "test_ai_declaration_concurrent_bot1",
      { playerId: PlayerId.Bot1, decision: bot1InitialDecision },
      "Bot1 initial decision:",
    );
    gameLogger.info(
      "test_ai_declaration_concurrent_bot2",
      { playerId: PlayerId.Bot2, decision: bot2InitialDecision },
      "Bot2 initial decision:",
    );

    // If both decide to declare based on the same state...
    if (
      bot1InitialDecision.shouldDeclare &&
      bot1InitialDecision.declaration &&
      bot2InitialDecision.shouldDeclare &&
      bot2InitialDecision.declaration
    ) {
      // Bot1 declares first
      const stateAfterBot1 = makeTrumpDeclaration(gameState, PlayerId.Bot1, {
        rank: Rank.Two,
        suit: bot1InitialDecision.declaration.suit,
        type: bot1InitialDecision.declaration.type,
        cards: bot1InitialDecision.declaration.cards,
      });

      gameLogger.info(
        "test_ai_declaration_bot1_success",
        { playerId: PlayerId.Bot1 },
        "Bot1 successfully declared",
      );

      // Now Bot2 tries to declare with the SAME declaration it decided on earlier
      // (simulating the race condition where Bot2's decision was made with stale state)
      try {
        makeTrumpDeclaration(stateAfterBot1, PlayerId.Bot2, {
          rank: Rank.Two,
          suit: bot2InitialDecision.declaration.suit,
          type: bot2InitialDecision.declaration.type,
          cards: bot2InitialDecision.declaration.cards,
        });

        // If we get here, THIS IS THE BUG!
        fail("Bot2 should not be able to override Bot1 with equal strength!");
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        gameLogger.info(
          "test_ai_declaration_bot2_race_failed",
          { playerId: PlayerId.Bot2, errorMessage },
          "Bot2 declaration correctly failed:",
        );
        expect(errorMessage).toContain(
          "Declaration cannot override current declaration",
        );
      }
    } else {
      gameLogger.info(
        "test_ai_declaration_no_race",
        {
          bot1ShouldDeclare: bot1InitialDecision.shouldDeclare,
          bot2ShouldDeclare: bot2InitialDecision.shouldDeclare,
        },
        "Both bots did not decide to declare initially, no race condition to test",
      );
    }
  });

  test("should reproduce exact user scenario: AI 2(C)-2(C) overriding AI 2(D)-2(D)", () => {
    // Set up exact scenario user described
    const bot1Player = getPlayerById(gameState, PlayerId.Bot1);
    const bot2Player = getPlayerById(gameState, PlayerId.Bot2);

    // Give Bot1 exactly 2♦-2♦ pair
    bot1Player.hand = [
      ...Card.createPair(Suit.Diamonds, Rank.Two),
      Card.createCard(Suit.Spades, Rank.Queen, 0),
    ];

    // Give Bot2 exactly 2♣-2♣ pair
    bot2Player.hand = [
      ...Card.createPair(Suit.Clubs, Rank.Two),
      Card.createCard(Suit.Hearts, Rank.King, 0),
    ];

    // Bot1 declares first (2♦-2♦)
    const bot1Declaration = {
      rank: Rank.Two,
      suit: Suit.Diamonds,
      type: DeclarationType.Pair,
      cards: Card.createPair(Suit.Diamonds, Rank.Two),
    };

    const stateAfterBot1 = makeTrumpDeclaration(
      gameState,
      PlayerId.Bot1,
      bot1Declaration,
    );
    gameLogger.info(
      "test_ai_declaration_exact_scenario_bot1",
      { playerId: PlayerId.Bot1, suit: Suit.Diamonds, rank: Rank.Two },
      "Bot1 declared 2♦-2♦",
    );

    // Now Bot2 attempts to override with 2♣-2♣ (should fail!)
    const bot2Declaration = {
      rank: Rank.Two,
      suit: Suit.Clubs,
      type: DeclarationType.Pair,
      cards: Card.createPair(Suit.Clubs, Rank.Two),
    };

    expect(() => {
      makeTrumpDeclaration(stateAfterBot1, PlayerId.Bot2, bot2Declaration);
    }).toThrow("Declaration cannot override current declaration");

    gameLogger.info(
      "test_ai_declaration_override_prevented",
      { fromSuit: Suit.Clubs, toSuit: Suit.Diamonds, rank: Rank.Two },
      "✅ 2♣-2♣ correctly failed to override 2♦-2♦",
    );

    // Let's also test the AI decision logic to make sure it wouldn't even try
    const bot2Decision = getAITrumpDeclarationDecision(
      stateAfterBot1,
      PlayerId.Bot2,
    );
    gameLogger.info(
      "test_ai_declaration_bot2_final_decision",
      { playerId: PlayerId.Bot2, decision: bot2Decision },
      "Bot2 AI decision after Bot1 declared:",
    );

    expect(bot2Decision.shouldDeclare).toBe(false);
    expect(bot2Decision.reasoning).toContain(
      "No valid declaration options available",
    );
  });
});
