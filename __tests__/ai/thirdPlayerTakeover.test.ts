import {
  createCardMemory,
  enhanceGameContextWithMemory,
} from "../../src/ai/aiCardMemory";
import { getAIMove } from "../../src/ai/aiLogic";
import { GameState, PlayerId, Rank, Suit, TrumpInfo } from "../../src/types";
import { CardMemory, GameContext } from "../../src/types/ai";
import { Card } from "../../src/types/card";
import { initializeGame } from "../../src/utils/gameInitialization";
import { getPlayerById } from "../helpers/gameStates";

jest.mock("../../src/ai/aiCardMemory", () => ({
  __esModule: true,
  createCardMemory: jest.fn(),
  enhanceGameContextWithMemory: jest.fn(),
}));

const mockCreateCardMemory = createCardMemory as jest.MockedFunction<
  (gameState: GameState) => CardMemory
>;

const mockEnhanceGameContextWithMemory =
  enhanceGameContextWithMemory as jest.MockedFunction<
    (
      baseContext: GameContext,
      memory: CardMemory,
      gameState: GameState,
    ) => GameContext
  >;

// Helper function to create a mock memory with proper structure
function createMockCardMemory(): CardMemory {
  return {
    playedCards: [],
    trumpCardsPlayed: 0,
    pointCardsPlayed: 0,
    suitDistribution: {},
    roundStartCards: 25,
    tricksAnalyzed: 0,
    cardProbabilities: [],
    playerMemories: {
      [PlayerId.Human]: {
        playerId: PlayerId.Human,
        knownCards: [],
        estimatedHandSize: 25,
        suitVoids: new Set(),
        trumpVoid: false,
        trumpUsed: 0,
        pointCardsProbability: 0.5,
        playPatterns: [],
      },
      [PlayerId.Bot1]: {
        playerId: PlayerId.Bot1,
        knownCards: [],
        estimatedHandSize: 25,
        suitVoids: new Set(),
        trumpVoid: false,
        trumpUsed: 0,
        pointCardsProbability: 0.5,
        playPatterns: [],
      },
      [PlayerId.Bot2]: {
        playerId: PlayerId.Bot2,
        knownCards: [],
        estimatedHandSize: 25,
        suitVoids: new Set(),
        trumpVoid: false,
        trumpUsed: 0,
        pointCardsProbability: 0.5,
        playPatterns: [],
      },
      [PlayerId.Bot3]: {
        playerId: PlayerId.Bot3,
        knownCards: [],
        estimatedHandSize: 25,
        suitVoids: new Set(),
        trumpVoid: false,
        trumpUsed: 0,
        pointCardsProbability: 0.5,
        playPatterns: [],
      },
    },
  };
}

describe("Third Player Takeover Logic", () => {
  let gameState: GameState;
  let trumpInfo: TrumpInfo;

  beforeEach(() => {
    gameState = initializeGame();
    trumpInfo = { trumpSuit: Suit.Hearts, trumpRank: Rank.Two };
    gameState.trumpInfo = trumpInfo;

    // Reset mocks before each test
    mockCreateCardMemory.mockClear();
    mockEnhanceGameContextWithMemory.mockClear();

    // Set up default mock implementations
    mockCreateCardMemory.mockImplementation(createMockCardMemory);

    // Mock enhanceGameContextWithMemory to add memory context
    mockEnhanceGameContextWithMemory.mockImplementation(
      (baseContext: GameContext, memory: CardMemory) => ({
        ...baseContext,
        memoryContext: {
          cardMemory: memory,
          cardsRemaining: 25,
          knownCards: 0,
          uncertaintyLevel: 0.5,
          trumpExhaustion: 0.2,
          opponentHandStrength: {},
        },
      }),
    );
  });

  it("should take over a weak lead with a stronger card in the same suit", () => {
    gameState.currentTrick = {
      plays: [
        {
          playerId: PlayerId.Human,
          cards: [Card.createCard(Suit.Spades, Rank.Seven, 0)],
        },
        {
          playerId: PlayerId.Bot1,
          cards: [Card.createCard(Suit.Spades, Rank.Three, 0)],
        },
      ],
      points: 0,
      winningPlayerId: PlayerId.Human,
    };
    gameState.currentPlayerIndex = 2; // Bot2's turn (3rd player)
    const bot2 = getPlayerById(gameState, PlayerId.Bot2);
    bot2.hand = [Card.createCard(Suit.Spades, Rank.King, 0)];

    const aiMove = getAIMove(gameState, PlayerId.Bot2);

    expect(aiMove[0].rank).toBe(Rank.King);
    expect(aiMove[0].suit).toBe(Suit.Spades);
  });

  it("should trump with point trump if next opponent is not void and points are intermediate", () => {
    gameState.currentTrick = {
      plays: [
        {
          playerId: PlayerId.Human,
          cards: [Card.createCard(Suit.Spades, Rank.King, 0)],
        },
        {
          playerId: PlayerId.Bot1,
          cards: [Card.createCard(Suit.Spades, Rank.Three, 0)],
        },
      ],
      points: 5, // Intermediate points
      winningPlayerId: PlayerId.Human,
    };
    gameState.currentPlayerIndex = 2; // Bot2's turn
    const bot2 = getPlayerById(gameState, PlayerId.Bot2);
    bot2.hand = [
      Card.createCard(Suit.Hearts, Rank.Three, 0), // Non-point trump
      Card.createCard(Suit.Hearts, Rank.Ten, 0), // Point trump
    ];

    // Set up specific memory mock for this test
    const memory = createMockCardMemory();
    memory.playerMemories[PlayerId.Bot2].suitVoids.add(Suit.Spades);
    // Bot3 (4th player) is NOT void in Spades (default state)
    mockCreateCardMemory.mockReturnValue(memory);

    const aiMove = getAIMove(gameState, PlayerId.Bot2);

    expect(aiMove[0].suit).toBe(Suit.Hearts); // Trump
    expect(aiMove[0].rank).toBe(Rank.Ten);
  });

  it("should trump with a non-point trump if the next opponent IS void and no points in trick", () => {
    gameState.currentTrick = {
      plays: [
        {
          playerId: PlayerId.Human,
          cards: [Card.createCard(Suit.Spades, Rank.Queen, 0)],
        },
        {
          playerId: PlayerId.Bot1,
          cards: [Card.createCard(Suit.Spades, Rank.Three, 0)],
        },
      ],
      points: 0, // No points in trick
      winningPlayerId: PlayerId.Human,
    };
    gameState.currentPlayerIndex = 2; // Bot2's turn
    const bot2 = getPlayerById(gameState, PlayerId.Bot2);
    bot2.hand = [
      Card.createCard(Suit.Hearts, Rank.Three, 0), // Non-point trump
      Card.createCard(Suit.Hearts, Rank.King, 0), // Point trump
    ];

    // Set up specific memory mock for this test
    const memory = createMockCardMemory();
    memory.playerMemories[PlayerId.Bot2].suitVoids.add(Suit.Spades);
    // Mock memory: Bot3 (4th player) IS void in Spades
    memory.playerMemories[PlayerId.Bot3].suitVoids.add(Suit.Spades);
    mockCreateCardMemory.mockReturnValue(memory);

    const aiMove = getAIMove(gameState, PlayerId.Bot2);

    expect(aiMove[0].suit).toBe(Suit.Hearts); // Trump
    expect(aiMove[0].rank).toBe(Rank.Three);
  });

  it("should trump with a higher trump if the next opponent IS void and high points in trick", () => {
    gameState.currentTrick = {
      plays: [
        {
          playerId: PlayerId.Human,
          cards: [Card.createCard(Suit.Spades, Rank.King, 0)],
        },
        {
          playerId: PlayerId.Bot1,
          cards: [Card.createCard(Suit.Spades, Rank.Five, 0)],
        },
      ],
      points: 15, // High points in trick
      winningPlayerId: PlayerId.Human,
    };
    gameState.currentPlayerIndex = 2; // Bot2's turn
    const bot2 = getPlayerById(gameState, PlayerId.Bot2);
    bot2.hand = [
      Card.createCard(Suit.Hearts, Rank.Three, 0), // Non-point trump
      Card.createCard(Suit.Hearts, Rank.Ace, 0), // High trump
    ];

    // Set up specific memory mock for this test
    const memory = createMockCardMemory();
    memory.playerMemories[PlayerId.Bot2].suitVoids.add(Suit.Spades);
    // Mock memory: Bot3 (4th player) IS void in Spades
    memory.playerMemories[PlayerId.Bot3].suitVoids.add(Suit.Spades);
    mockCreateCardMemory.mockReturnValue(memory);

    const aiMove = getAIMove(gameState, PlayerId.Bot2);

    expect(aiMove[0].suit).toBe(Suit.Hearts); // Trump
    expect(aiMove[0].rank).toBe(Rank.Ace);
  });

  it("should trump with a trump > 10 if the next opponent IS void and intermediate points in trick", () => {
    gameState.currentTrick = {
      plays: [
        {
          playerId: PlayerId.Human,
          cards: [Card.createCard(Suit.Spades, Rank.King, 0)],
        },
        {
          playerId: PlayerId.Bot1,
          cards: [Card.createCard(Suit.Spades, Rank.Three, 0)],
        },
      ],
      points: 10, // Intermediate points
      winningPlayerId: PlayerId.Human,
    };
    gameState.currentPlayerIndex = 2; // Bot2's turn
    const bot2 = getPlayerById(gameState, PlayerId.Bot2);
    bot2.hand = [
      Card.createCard(Suit.Hearts, Rank.Three, 0), // Non-point trump
      Card.createCard(Suit.Hearts, Rank.Jack, 0), // Value > 10 trump
      Card.createCard(Suit.Hearts, Rank.Ace, 0), // High trump
    ];

    // Set up specific memory mock for this test
    const memory = createMockCardMemory();
    memory.playerMemories[PlayerId.Bot2].suitVoids.add(Suit.Spades);
    // Mock memory: Bot3 (4th player) IS void in Spades
    memory.playerMemories[PlayerId.Bot3].suitVoids.add(Suit.Spades);
    mockCreateCardMemory.mockReturnValue(memory);

    const aiMove = getAIMove(gameState, PlayerId.Bot2);

    expect(aiMove[0].suit).toBe(Suit.Hearts); // Trump
    expect(aiMove[0].rank).toBe(Rank.Jack);
  });
});
