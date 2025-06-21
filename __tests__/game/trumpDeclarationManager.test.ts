import {
  areDeclarationsAllowed,
  finalizeTrumpDeclaration,
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
import { getPlayerById } from "../helpers/gameStates";

describe("Trump Declaration Manager", () => {
  let gameState: GameState;

  beforeEach(() => {
    gameState = initializeGame();

    // Give players specific hands for testing
    const humanPlayer = getPlayerById(gameState, PlayerId.Human);
    const bot1Player = getPlayerById(gameState, PlayerId.Bot1);

    // Give human a trump rank single
    humanPlayer.hand = [
      Card.createCard(Suit.Spades, Rank.Two, 0), // Trump rank
      Card.createCard(Suit.Hearts, Rank.Ace, 0),
      Card.createCard(Suit.Clubs, Rank.King, 0),
    ];

    // Give Bot1 a trump rank pair
    bot1Player.hand = [
      Card.createCard(Suit.Hearts, Rank.Two, 0), // Trump rank
      Card.createCard(Suit.Hearts, Rank.Two, 0), // Trump rank pair
      Card.createCard(Suit.Spades, Rank.Queen, 0),
    ];
  });

  describe("Trump Declaration State Initialization", () => {
    test("should initialize with trump declaration state", () => {
      expect(gameState.trumpDeclarationState).toBeDefined();
      if (gameState.trumpDeclarationState) {
        expect(
          gameState.trumpDeclarationState.currentDeclaration,
        ).toBeUndefined();
        expect(gameState.trumpDeclarationState.declarationHistory).toHaveLength(
          0,
        );
        expect(gameState.trumpDeclarationState.declarationWindow).toBe(true);
      }
    });

    test("should allow declarations initially", () => {
      expect(areDeclarationsAllowed(gameState)).toBe(true);
    });
  });

  describe("Making Declarations", () => {
    test("should allow valid trump declaration", () => {
      const declaration = {
        rank: Rank.Two,
        suit: Suit.Spades,
        type: DeclarationType.Single,
        cards: [Card.createCard(Suit.Spades, Rank.Two, 0)],
      };

      const newState = makeTrumpDeclaration(
        gameState,
        PlayerId.Human,
        declaration,
      );

      expect(newState.trumpDeclarationState?.currentDeclaration).toBeDefined();
      expect(newState.trumpDeclarationState?.currentDeclaration?.playerId).toBe(
        PlayerId.Human,
      );
      expect(newState.trumpDeclarationState?.currentDeclaration?.type).toBe(
        DeclarationType.Single,
      );
      expect(newState.trumpInfo.trumpSuit).toBe(Suit.Spades);
    });

    test("should reject invalid declaration cards", () => {
      const invalidDeclaration = {
        rank: Rank.Two,
        suit: Suit.Spades,
        type: DeclarationType.Single,
        cards: [Card.createCard(Suit.Spades, Rank.Ace, 0)], // Wrong rank
      };

      expect(() => {
        makeTrumpDeclaration(gameState, PlayerId.Human, invalidDeclaration);
      }).toThrow("Invalid declaration cards");
    });

    test("should allow override with stronger combination", () => {
      // First declaration: Human plays single
      const singleDeclaration = {
        rank: Rank.Two,
        suit: Suit.Spades,
        type: DeclarationType.Single,
        cards: [Card.createCard(Suit.Spades, Rank.Two, 0)],
      };

      let newState = makeTrumpDeclaration(
        gameState,
        PlayerId.Human,
        singleDeclaration,
      );

      // Override with pair from Bot1
      const pairDeclaration = {
        rank: Rank.Two,
        suit: Suit.Hearts,
        type: DeclarationType.Pair,
        cards: [
          Card.createCard(Suit.Hearts, Rank.Two, 0),
          Card.createCard(Suit.Hearts, Rank.Two, 0),
        ],
      };

      newState = makeTrumpDeclaration(newState, PlayerId.Bot1, pairDeclaration);

      expect(newState.trumpDeclarationState?.currentDeclaration?.playerId).toBe(
        PlayerId.Bot1,
      );
      expect(newState.trumpDeclarationState?.currentDeclaration?.type).toBe(
        DeclarationType.Pair,
      );
      expect(newState.trumpInfo.trumpSuit).toBe(Suit.Hearts);
      expect(newState.trumpDeclarationState?.declarationHistory).toHaveLength(
        2,
      );
    });

    test("should reject weaker override attempt", () => {
      // First declaration: Bot1 plays pair
      const pairDeclaration = {
        rank: Rank.Two,
        suit: Suit.Hearts,
        type: DeclarationType.Pair,
        cards: [
          Card.createCard(Suit.Hearts, Rank.Two, 0),
          Card.createCard(Suit.Hearts, Rank.Two, 0),
        ],
      };

      const newState = makeTrumpDeclaration(
        gameState,
        PlayerId.Bot1,
        pairDeclaration,
      );

      // Try to override with weaker single
      const weakerDeclaration = {
        rank: Rank.Two,
        suit: Suit.Spades,
        type: DeclarationType.Single,
        cards: [Card.createCard(Suit.Spades, Rank.Two, 0)],
      };

      expect(() => {
        makeTrumpDeclaration(newState, PlayerId.Human, weakerDeclaration);
      }).toThrow("Declaration cannot override current declaration");
    });

    test("should reject equal strength override attempt (pair vs pair)", () => {
      // First declaration: Human plays pair of 2♣
      const firstPairDeclaration = {
        rank: Rank.Two,
        suit: Suit.Clubs,
        type: DeclarationType.Pair,
        cards: [
          Card.createCard(Suit.Clubs, Rank.Two, 0),
          Card.createCard(Suit.Clubs, Rank.Two, 0),
        ],
      };

      const newState = makeTrumpDeclaration(
        gameState,
        PlayerId.Human,
        firstPairDeclaration,
      );

      // Try to override with equal strength pair of 2♦ (should fail)
      const equalStrengthPairDeclaration = {
        rank: Rank.Two,
        suit: Suit.Diamonds,
        type: DeclarationType.Pair,
        cards: [
          Card.createCard(Suit.Diamonds, Rank.Two, 0),
          Card.createCard(Suit.Diamonds, Rank.Two, 0),
        ],
      };

      expect(() => {
        makeTrumpDeclaration(
          newState,
          PlayerId.Bot1,
          equalStrengthPairDeclaration,
        );
      }).toThrow("Declaration cannot override current declaration");
    });

    test("getPlayerDeclarationOptions should filter out equal strength declarations", () => {
      // Setup: Give Bot1 a pair of 2♦
      const bot1Player = getPlayerById(gameState, PlayerId.Bot1);
      bot1Player.hand = [
        Card.createCard(Suit.Diamonds, Rank.Two, 0),
        Card.createCard(Suit.Diamonds, Rank.Two, 0),
        Card.createCard(Suit.Spades, Rank.Queen, 0),
      ];

      // First declaration: Human plays pair of 2♣
      const firstPairDeclaration = {
        rank: Rank.Two,
        suit: Suit.Clubs,
        type: DeclarationType.Pair,
        cards: [
          Card.createCard(Suit.Clubs, Rank.Two, 0),
          Card.createCard(Suit.Clubs, Rank.Two, 0),
        ],
      };

      const newState = makeTrumpDeclaration(
        gameState,
        PlayerId.Human,
        firstPairDeclaration,
      );

      // Bot1 should have NO valid declaration options (their pair is equal strength)
      const bot1Options = getPlayerDeclarationOptions(newState, PlayerId.Bot1);
      expect(bot1Options).toHaveLength(0);
    });
  });

  describe("Declaration Options", () => {
    test("should detect available declaration options for player", () => {
      const humanOptions = getPlayerDeclarationOptions(
        gameState,
        PlayerId.Human,
      );
      const bot1Options = getPlayerDeclarationOptions(gameState, PlayerId.Bot1);

      // Human has single 2♠
      expect(humanOptions).toHaveLength(1);
      expect(humanOptions[0].type).toBe(DeclarationType.Single);
      expect(humanOptions[0].suit).toBe(Suit.Spades);

      // Bot1 has pair 2♥
      expect(bot1Options).toHaveLength(1);
      expect(bot1Options[0].type).toBe(DeclarationType.Pair);
      expect(bot1Options[0].suit).toBe(Suit.Hearts);
    });

    test("should filter out invalid override options", () => {
      // Bot1 makes a pair declaration first
      const pairDeclaration = {
        rank: Rank.Two,
        suit: Suit.Hearts,
        type: DeclarationType.Pair,
        cards: [
          Card.createCard(Suit.Hearts, Rank.Two, 0),
          Card.createCard(Suit.Hearts, Rank.Two, 0),
        ],
      };

      const newState = makeTrumpDeclaration(
        gameState,
        PlayerId.Bot1,
        pairDeclaration,
      );

      // Human should have no valid options (only has single, which is weaker)
      const humanOptions = getPlayerDeclarationOptions(
        newState,
        PlayerId.Human,
      );
      expect(humanOptions).toHaveLength(0);
    });
  });

  describe("Declaration Status", () => {
    test("should return correct status when no declaration exists", () => {
      const currentDeclaration =
        gameState.trumpDeclarationState?.currentDeclaration;
      const declarationHistory =
        gameState.trumpDeclarationState?.declarationHistory || [];

      expect(currentDeclaration).toBeUndefined();
      expect(declarationHistory).toHaveLength(0);
    });

    test("should return correct status when declaration exists", () => {
      const declaration = {
        rank: Rank.Two,
        suit: Suit.Spades,
        type: DeclarationType.Single,
        cards: [Card.createCard(Suit.Spades, Rank.Two, 0)],
      };

      const newState = makeTrumpDeclaration(
        gameState,
        PlayerId.Human,
        declaration,
      );
      const currentDeclaration =
        newState.trumpDeclarationState?.currentDeclaration;
      const declarationHistory =
        newState.trumpDeclarationState?.declarationHistory || [];

      expect(currentDeclaration).toBeDefined();
      expect(currentDeclaration?.playerId).toBe(PlayerId.Human);
      expect(currentDeclaration?.type).toBe(DeclarationType.Single);
      expect(currentDeclaration?.suit).toBe(Suit.Spades);
      expect(declarationHistory).toHaveLength(1);
    });
  });

  describe("Finalization", () => {
    test("should finalize trump declaration and close window", () => {
      const declaration = {
        rank: Rank.Two,
        suit: Suit.Spades,
        type: DeclarationType.Single,
        cards: [Card.createCard(Suit.Spades, Rank.Two, 0)],
      };

      // Set up kitty cards (needed for finalization with trump declarer)
      gameState.kittyCards = [
        Card.createCard(Suit.Clubs, Rank.Three, 0),
        Card.createCard(Suit.Clubs, Rank.Four, 0),
        Card.createCard(Suit.Clubs, Rank.Five, 0),
        Card.createCard(Suit.Clubs, Rank.Six, 0),
        Card.createCard(Suit.Diamonds, Rank.Three, 0),
        Card.createCard(Suit.Diamonds, Rank.Four, 0),
        Card.createCard(Suit.Diamonds, Rank.Five, 0),
        Card.createCard(Suit.Diamonds, Rank.Six, 0),
      ];

      let newState = makeTrumpDeclaration(
        gameState,
        PlayerId.Human,
        declaration,
      );
      newState = finalizeTrumpDeclaration(newState);

      expect(newState.trumpInfo.trumpSuit).toBe(Suit.Spades);
      expect(areDeclarationsAllowed(newState)).toBe(false);

      // After finalization with kitty cards, should be in KittySwap phase
      expect(newState.gamePhase).toBe("kittySwap");

      // In first round: trump declarer becomes round starting player and gets kitty cards
      const humanPlayer = getPlayerById(newState, PlayerId.Human);
      const roundStartingPlayer =
        newState.players[newState.roundStartingPlayerIndex];
      expect(humanPlayer).toBeDefined();
      expect(humanPlayer.id).toBe(roundStartingPlayer.id); // Trump declarer becomes round starter (first round)
      expect(humanPlayer.hand.length).toBe(11); // Original 3 + 8 kitty cards
    });

    test("should finalize with no trump declarer and go to Playing phase", () => {
      // No trump declaration made - finalize should go directly to Playing
      const newState = finalizeTrumpDeclaration(gameState);

      expect(newState.trumpInfo.trumpSuit).toBe(Suit.None);
      expect(areDeclarationsAllowed(newState)).toBe(false);
      expect(newState.gamePhase).toBe("playing");
    });
  });
});
