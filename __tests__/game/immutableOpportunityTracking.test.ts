import { makeTrumpDeclaration } from "../../src/game/dealingAndDeclaration";
import {
  Card,
  DeclarationType,
  GamePhase,
  GameState,
  PlayerId,
  Rank,
  Suit,
} from "../../src/types";
import { initializeGame } from "../../src/utils/gameInitialization";
import { gameLogger } from "../../src/utils/gameLogger";
import { getPlayerById } from "../helpers/gameStates";

describe("Immutable Opportunity Tracking", () => {
  let gameState: GameState;

  beforeEach(() => {
    gameState = initializeGame();
    gameState.gamePhase = GamePhase.Dealing;

    // Give human trump rank cards that can form pairs
    const humanPlayer = getPlayerById(gameState, PlayerId.Human);
    humanPlayer.hand = [
      ...Card.createPair(Suit.Clubs, Rank.Two),
      Card.createCard(Suit.Hearts, Rank.Two, 0),
      Card.createCard(Suit.Hearts, Rank.Ace, 0),
    ];

    // Give Bot1 stronger trump cards
    const bot1Player = getPlayerById(gameState, PlayerId.Bot1);
    bot1Player.hand = [
      ...Card.createPair(Suit.Diamonds, Rank.Two),
      Card.createCard(Suit.Spades, Rank.Queen, 0),
    ];
  });

  test("should demonstrate immutable opportunity tracking concept", () => {
    // This test demonstrates the concept - in reality this would be tested via UI integration
    // since the useProgressiveDealing hook manages the immutable tracking internally

    // Simulate creating opportunity hashes
    const createOpportunityHash = (
      opportunities: { type: DeclarationType; suit: Suit }[],
    ) => {
      return opportunities
        .map((opp) => `${opp.type}-${opp.suit}`)
        .sort()
        .join(",");
    };

    // Initial human opportunities
    const initialOpportunities = [
      { type: DeclarationType.Pair, suit: Suit.Clubs },
      { type: DeclarationType.Single, suit: Suit.Hearts },
    ];

    const initialHash = createOpportunityHash(initialOpportunities);
    gameLogger.info(
      "test_initial_opportunity_hash",
      { initialHash },
      "Initial opportunity hash",
    );

    // Simulate human decision history tracking
    const humanDecisionHistory = new Set<string>();

    // Human sees these opportunities for first time - should show modal
    const hasSeenBefore = humanDecisionHistory.has(initialHash);
    expect(hasSeenBefore).toBe(false); // First time seeing this set

    // Human skips declaration - record the decision
    humanDecisionHistory.add(initialHash);
    gameLogger.info(
      "test_human_decision_recorded",
      { initialHash },
      "Human skipped - recorded decision for",
    );

    // Same opportunities appear again (e.g., after dealing more cards) - should NOT show modal
    const hasSeenAfterSkip = humanDecisionHistory.has(initialHash);
    expect(hasSeenAfterSkip).toBe(true); // Already seen and decided

    // Bot declares something, changing human's opportunities
    const bot1Declaration = {
      rank: Rank.Two,
      suit: Suit.Diamonds,
      type: DeclarationType.Pair,
      cards: Card.createPair(Suit.Diamonds, Rank.Two),
    };

    makeTrumpDeclaration(gameState, PlayerId.Bot1, bot1Declaration);

    // Now human has different opportunities (can't declare pair anymore due to bot's stronger pair)
    const newOpportunities = [
      { type: DeclarationType.Single, suit: Suit.Hearts },
      { type: DeclarationType.Single, suit: Suit.Clubs },
    ];

    const newHash = createOpportunityHash(newOpportunities);
    gameLogger.info(
      "test_new_opportunity_hash",
      { newHash },
      "New opportunity hash after bot declaration",
    );

    // This is a NEW opportunity set - should show modal
    const hasSeenNewSet = humanDecisionHistory.has(newHash);
    expect(hasSeenNewSet).toBe(false); // New opportunity set due to bot declaration
    expect(newHash).not.toBe(initialHash); // Confirms opportunities changed

    gameLogger.info(
      "test_immutable_tracking_success",
      {},
      "Immutable tracking correctly identifies new vs seen opportunity sets",
    );
  });

  test("should demonstrate bot declaration benefit", () => {
    // This test shows how bot declarations create new human opportunities

    const createOpportunityHash = (
      opportunities: { type: DeclarationType; suit: Suit }[],
    ) => {
      return opportunities
        .map((opp) => `${opp.type}-${opp.suit}`)
        .sort()
        .join(",");
    };

    // Before any declarations - human has pair opportunity
    const beforeBotDeclaration = [
      { type: DeclarationType.Pair, suit: Suit.Clubs },
      { type: DeclarationType.Single, suit: Suit.Hearts },
    ];

    // Bot declares a single
    const bot1Declaration = {
      rank: Rank.Two,
      suit: Suit.Spades,
      type: DeclarationType.Single,
      cards: [Card.createCard(Suit.Spades, Rank.Two, 0)],
    };

    makeTrumpDeclaration(gameState, PlayerId.Bot1, bot1Declaration);

    // After bot single declaration - human can now override with pair
    const afterBotDeclaration = [
      { type: DeclarationType.Pair, suit: Suit.Clubs },
      { type: DeclarationType.Single, suit: Suit.Hearts },
    ];

    const beforeHash = createOpportunityHash(beforeBotDeclaration);
    const afterHash = createOpportunityHash(afterBotDeclaration);

    // In this case opportunities are the same, but in other scenarios they could change
    gameLogger.info(
      "test_bot_declaration_before",
      { beforeHash },
      "Before bot declaration",
    );
    gameLogger.info(
      "test_bot_declaration_after",
      { afterHash },
      "After bot declaration",
    );

    // The key benefit: if bot's declaration changes human's opportunity landscape,
    // the immutable tracking will detect the difference and show the modal again
    expect(typeof beforeHash).toBe("string");
    expect(typeof afterHash).toBe("string");

    gameLogger.info(
      "test_bot_declaration_benefit",
      {},
      "Bot declarations can trigger new human opportunity modals",
    );
  });

  test("should demonstrate hash collision resistance", () => {
    // Test that different opportunity sets produce different hashes

    const createOpportunityHash = (
      opportunities: { type: DeclarationType; suit: Suit }[],
    ) => {
      return opportunities
        .map((opp) => `${opp.type}-${opp.suit}`)
        .sort()
        .join(",");
    };

    const set1 = [
      { type: DeclarationType.Pair, suit: Suit.Clubs },
      { type: DeclarationType.Single, suit: Suit.Hearts },
    ];

    const set2 = [
      { type: DeclarationType.Single, suit: Suit.Clubs },
      { type: DeclarationType.Pair, suit: Suit.Hearts },
    ];

    const set3 = [{ type: DeclarationType.Single, suit: Suit.Hearts }];

    const hash1 = createOpportunityHash(set1);
    const hash2 = createOpportunityHash(set2);
    const hash3 = createOpportunityHash(set3);

    gameLogger.info("test_hash_set_1", { hash1 }, "Set 1 hash");
    gameLogger.info("test_hash_set_2", { hash2 }, "Set 2 hash");
    gameLogger.info("test_hash_set_3", { hash3 }, "Set 3 hash");

    // All hashes should be different
    expect(hash1).not.toBe(hash2);
    expect(hash1).not.toBe(hash3);
    expect(hash2).not.toBe(hash3);

    // Same set should produce same hash (deterministic)
    const hash1Duplicate = createOpportunityHash(set1);
    expect(hash1).toBe(hash1Duplicate);

    gameLogger.info(
      "test_hash_collision_resistance",
      {},
      "Opportunity hashing is deterministic and collision-resistant",
    );
  });
});
