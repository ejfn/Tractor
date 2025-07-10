import { getAIMove } from "../../src/ai/aiLogic";
import {
  Card,
  GamePhase,
  GameState,
  JokerType,
  PlayerId,
  Rank,
  Suit,
  TrumpInfo,
} from "../../src/types";
import { initializeGame } from "../../src/utils/gameInitialization";
import { gameLogger } from "../../src/utils/gameLogger";

describe("Issue 206: AI Joker Conservation Strategy", () => {
  let gameState: GameState;
  let trumpInfo: TrumpInfo;

  beforeEach(() => {
    gameState = initializeGame();
    trumpInfo = {
      trumpRank: Rank.Two,
      trumpSuit: Suit.Hearts,
    };
    gameState.trumpInfo = trumpInfo;
    gameState.gamePhase = GamePhase.Playing;
  });

  it("should NOT waste Small Joker pair when opponent winning with Big Joker pair", () => {
    // Issue 206 scenario: Bot2 should conserve Small Jokers when Bot1 has Big Jokers

    // Human leads Diamond 6 pair
    const leadingPair = [
      Card.createCard(Suit.Diamonds, Rank.Six, 0),
      Card.createCard(Suit.Diamonds, Rank.Six, 1),
    ];

    // Bot1 plays Big Joker pair (opponent winning)
    const bot1BigJokers = [
      Card.createJoker(JokerType.Big, 0),
      Card.createJoker(JokerType.Big, 1),
    ];

    gameState.currentTrick = {
      plays: [
        { playerId: PlayerId.Human, cards: leadingPair },
        { playerId: PlayerId.Bot1, cards: bot1BigJokers },
      ],
      winningPlayerId: PlayerId.Bot1, // Bot1 (opponent) is winning
      points: 0,
    };

    // Set Bot2 as current player (3rd position)
    gameState.currentPlayerIndex = 2;
    const bot2Player = gameState.players[2];

    // Bot2 is out of Hearts AND Diamonds - must play cross-suit
    bot2Player.hand = [
      // Small Joker pair (valuable trump - should NOT waste)
      Card.createJoker(JokerType.Small, 0),
      Card.createJoker(JokerType.Small, 1),
      // Other cards Bot2 could play instead (NO DIAMONDS)
      Card.createCard(Suit.Clubs, Rank.Three, 0),
      Card.createCard(Suit.Clubs, Rank.Four, 1),
      Card.createCard(Suit.Spades, Rank.Five, 0),
      Card.createCard(Suit.Spades, Rank.Six, 0),
    ];

    gameLogger.info(
      "test_joker_conservation_setup",
      {
        testCase: "small_joker_pair_conservation",
        humanLead: "6♦6♦",
        bot1Play: "Big Joker pair",
        bot2Hand: "Small Joker pair, 3♣, 4♣, 5♠, 6♠",
      },
      "=== Issue 206: Joker Conservation Test ===",
    );
    gameLogger.info(
      "test_scenario_details",
      {
        leadCards: "6♦6♦",
        opponentCards: "Big Joker pair",
        playerHand: "Small Joker pair, 3♣, 4♣, 5♠, 6♠",
        noDiamonds: true,
      },
      "Human led: 6♦6♦ (Diamond pair)",
    );
    gameLogger.info(
      "test_scenario_details",
      {
        opponentWinning: true,
        opponentCards: "Big Joker pair",
      },
      "Bot1 played: Big Joker pair (opponent winning)",
    );
    gameLogger.info(
      "test_scenario_details",
      {
        bot2Hand: ["Small Joker pair", "3♣", "4♣", "5♠", "6♠"],
        outOfSuit: "diamonds",
      },
      "Bot2 hand: Small Joker pair, 3♣, 4♣, 5♠, 6♠ (NO DIAMONDS)",
    );
    gameLogger.info(
      "test_expectation",
      {
        expectedBehavior: "conserve_small_jokers",
        alternativePlay: "clubs_pair",
      },
      "Expected: Bot2 should conserve Small Jokers, play Clubs pair instead",
    );

    const aiMove = getAIMove(gameState, PlayerId.Bot2);

    gameLogger.info(
      "test_ai_decision",
      {
        aiMove: aiMove.map((c) =>
          c.joker ? `${c.joker}Joker` : `${c.rank}${c.suit}`,
        ),
      },
      "AI selected: " +
        aiMove
          .map((c) => (c.joker ? `${c.joker}Joker` : `${c.rank}${c.suit}`))
          .join(", "),
    );

    // Verify AI did NOT waste Small Jokers
    const usedSmallJokers = aiMove.filter(
      (c) => c.joker === JokerType.Small,
    ).length;
    const usedClubsPair = aiMove.filter(
      (c) =>
        c.suit === Suit.Clubs &&
        (c.rank === Rank.Three || c.rank === Rank.Four),
    ).length;

    gameLogger.info(
      "test_joker_analysis",
      {
        smallJokersUsed: usedSmallJokers,
        clubsCardsUsed: usedClubsPair,
      },
      "Small Jokers used: " + usedSmallJokers,
    );
    gameLogger.info(
      "test_joker_analysis",
      {
        smallJokersUsed: usedSmallJokers,
        clubsCardsUsed: usedClubsPair,
      },
      "Clubs cards used: " + usedClubsPair,
    );

    // CRITICAL: Should NOT use Small Jokers when opponent winning with Big Jokers
    expect(usedSmallJokers).toBe(0); // Should not waste Small Jokers
    expect(usedClubsPair).toBe(2); // Should use Clubs pair instead
    expect(aiMove).toHaveLength(2); // Correct response length

    gameLogger.info(
      "test_joker_conservation_success",
      {
        testPassed: true,
        conservationBehavior: "small_jokers_conserved",
        opponentThreat: "big_jokers",
      },
      "✅ AI correctly conserves Small Jokers when opponent has Big Jokers",
    );
  });

  it("should conserve Small Jokers when out of trump suit against Big Joker singles", () => {
    // Test single Small Joker conservation against single Big Joker

    const leadingSingle = [Card.createCard(Suit.Diamonds, Rank.Six, 0)];
    const bot1BigJoker = [Card.createJoker(JokerType.Big, 0)];

    gameState.currentTrick = {
      plays: [
        { playerId: PlayerId.Human, cards: leadingSingle },
        { playerId: PlayerId.Bot1, cards: bot1BigJoker },
      ],
      winningPlayerId: PlayerId.Bot1, // Bot1 winning with Big Joker
      points: 0,
    };

    gameState.currentPlayerIndex = 2;
    const bot2Player = gameState.players[2];

    // Bot2 has Small Joker but should conserve it (out of Diamonds)
    bot2Player.hand = [
      Card.createJoker(JokerType.Small, 0),
      Card.createCard(Suit.Clubs, Rank.Three, 0),
      Card.createCard(Suit.Spades, Rank.Four, 0),
      Card.createCard(Suit.Hearts, Rank.Seven, 0), // Trump suit, but lower than jokers
    ];

    gameLogger.info(
      "test_single_card_conservation",
      {
        testCase: "single_joker_conservation",
        opponentCard: "Big Joker single",
        expectedBehavior: "conserve_small_joker",
      },
      "\n=== Single Card Conservation Test ===",
    );
    gameLogger.info(
      "test_single_card_strategy",
      {
        opponentWinning: true,
        opponentCard: "Big Joker single",
        playerCard: "Small Joker available",
      },
      "Bot1 winning with Big Joker single, Bot2 should not waste Small Joker",
    );

    const aiMove = getAIMove(gameState, PlayerId.Bot2);

    gameLogger.info(
      "test_ai_decision",
      {
        aiMove: aiMove.map((c) =>
          c.joker ? `${c.joker}Joker` : `${c.rank}${c.suit}`,
        ),
        opponentThreat: "Big Joker single",
      },
      "AI selected: " +
        aiMove
          .map((c) => (c.joker ? `${c.joker}Joker` : `${c.rank}${c.suit}`))
          .join(", "),
    );

    // Should not use Small Joker against unbeatable Big Joker
    const usedSmallJoker = aiMove.some((c) => c.joker === JokerType.Small);
    expect(usedSmallJoker).toBe(false);
    expect(aiMove).toHaveLength(1);

    gameLogger.info(
      "test_single_joker_conservation_success",
      {
        testPassed: true,
        conservationBehavior: "single_small_joker_conserved",
        opponentThreat: "big_joker_single",
      },
      "✅ AI conserves Single Small Joker against Big Joker",
    );
  });

  it("should recognize trump hierarchy: Big Joker > Small Joker > Trump Rank > Trump Suit", () => {
    // Test AI understanding of complete trump hierarchy for conservation decisions

    const leadingSingle = [Card.createCard(Suit.Diamonds, Rank.Six, 0)];

    // Test different trump hierarchy scenarios
    const scenarios = [
      {
        name: "Big Joker vs Small Joker",
        opponentCard: Card.createJoker(JokerType.Big, 0),
        bot2Trump: Card.createJoker(JokerType.Small, 0),
        shouldConserve: true,
      },
      {
        name: "Small Joker vs Trump Rank",
        opponentCard: Card.createJoker(JokerType.Small, 0),
        bot2Trump: Card.createCard(Suit.Spades, Rank.Two, 0), // Trump rank in non-trump suit
        shouldConserve: true,
      },
      {
        name: "Trump Rank vs Trump Suit",
        opponentCard: Card.createCard(Suit.Clubs, Rank.Two, 0), // Trump rank
        bot2Trump: Card.createCard(Suit.Hearts, Rank.Ace, 0), // Trump suit
        shouldConserve: true,
      },
    ];

    scenarios.forEach((scenario, index) => {
      gameLogger.info(
        "test_trump_hierarchy",
        {
          testNumber: index + 1,
          scenarioName: scenario.name,
          testCase: "trump_hierarchy_conservation",
        },
        `\n=== Hierarchy Test ${index + 1}: ${scenario.name} ===`,
      );

      const testGameState = { ...gameState };
      testGameState.currentTrick = {
        plays: [
          { playerId: PlayerId.Human, cards: leadingSingle },
          { playerId: PlayerId.Bot1, cards: [scenario.opponentCard] },
        ],
        winningPlayerId: PlayerId.Bot1,
        points: 0,
      };

      testGameState.currentPlayerIndex = 2;
      testGameState.players[2].hand = [
        scenario.bot2Trump,
        Card.createCard(Suit.Clubs, Rank.Seven, 0), // Alternative (no Diamonds)
        Card.createCard(Suit.Spades, Rank.Three, 0),
      ];

      const aiMove = getAIMove(testGameState, PlayerId.Bot2);
      const usedTrump = aiMove.some(
        (c) =>
          (c.joker && c.joker === scenario.bot2Trump.joker) ||
          (c.rank === scenario.bot2Trump.rank &&
            c.suit === scenario.bot2Trump.suit),
      );

      gameLogger.info(
        "test_hierarchy_comparison",
        {
          opponentCard:
            scenario.opponentCard.joker ||
            `${scenario.opponentCard.rank}${scenario.opponentCard.suit}`,
          bot2Trump:
            scenario.bot2Trump.joker ||
            `${scenario.bot2Trump.rank}${scenario.bot2Trump.suit}`,
        },
        `Opponent: ${scenario.opponentCard.joker || `${scenario.opponentCard.rank}${scenario.opponentCard.suit}`}`,
      );
      gameLogger.info(
        "test_hierarchy_comparison",
        {
          opponentCard:
            scenario.opponentCard.joker ||
            `${scenario.opponentCard.rank}${scenario.opponentCard.suit}`,
          bot2Trump:
            scenario.bot2Trump.joker ||
            `${scenario.bot2Trump.rank}${scenario.bot2Trump.suit}`,
        },
        `Bot2 trump: ${scenario.bot2Trump.joker || `${scenario.bot2Trump.rank}${scenario.bot2Trump.suit}`}`,
      );
      gameLogger.info(
        "test_hierarchy_ai_decision",
        {
          aiMove: aiMove.map((c) => c.joker || `${c.rank}${c.suit}`),
          scenarioName: scenario.name,
        },
        `AI selected: ${aiMove.map((c) => c.joker || `${c.rank}${c.suit}`).join("")}`,
      );
      gameLogger.info(
        "test_hierarchy_result",
        {
          shouldConserve: scenario.shouldConserve,
          actuallyConserved: !usedTrump,
          usedTrump: usedTrump,
          scenarioName: scenario.name,
        },
        `Should conserve: ${scenario.shouldConserve}, Actually conserved: ${!usedTrump}`,
      );

      if (scenario.shouldConserve) {
        expect(usedTrump).toBe(false); // Should conserve weaker trump
      }
    });

    gameLogger.info(
      "test_trump_hierarchy_success",
      {
        testPassed: true,
        conservationBehavior: "trump_hierarchy_respected",
        scenariosCompleted: scenarios.length,
      },
      "✅ AI understands trump hierarchy for conservation decisions",
    );
  });
});
