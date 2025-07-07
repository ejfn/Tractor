import { getAIMove } from "../../src/ai/aiLogic";
import { GameState, PlayerId, Rank, Suit, TrumpInfo } from "../../src/types";
import { Card } from "../../src/types/card";
import { initializeGame } from "../../src/utils/gameInitialization";
import { getPlayerById } from "../helpers/gameStates";
import { createMockCardMemory, setupMemoryMocking } from "../helpers/mocks";

jest.mock("../../src/ai/aiCardMemory");

describe("Third Player Takeover Logic", () => {
  let gameState: GameState;
  let trumpInfo: TrumpInfo;
  let mockCreateCardMemory: jest.MockedFunction<
    typeof import("../../src/ai/aiCardMemory").createCardMemory
  >;

  beforeEach(() => {
    gameState = initializeGame();
    trumpInfo = { trumpSuit: Suit.Hearts, trumpRank: Rank.Two };
    gameState.trumpInfo = trumpInfo;

    // Set up memory mocking
    const mocks = setupMemoryMocking();
    mockCreateCardMemory = mocks.createCardMemory;
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
    expect(aiMove[0].rank).toBe(Rank.Ace);
  });
});
