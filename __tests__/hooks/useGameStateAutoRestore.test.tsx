import { renderHook, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useGameState } from "../../src/hooks/useGameState";
import { initializeGame } from "../../src/utils/gameInitialization";
import { GamePhase, Rank } from "../../src/types";

// Mock AsyncStorage
jest.mock("@react-native-async-storage/async-storage", () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
}));

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe("useGameState Auto-Restoration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAsyncStorage.setItem.mockResolvedValue();
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.removeItem.mockResolvedValue();
  });

  it("should initialize new game when no saved game exists", async () => {
    mockAsyncStorage.getItem.mockResolvedValue(null);

    const { result } = renderHook(() => useGameState());

    // Initially should be initializing
    expect(result.current.isInitializing).toBe(true);
    expect(result.current.gameState).toBeNull();

    // Wait for initialization to complete
    await waitFor(() => {
      expect(result.current.isInitializing).toBe(false);
    });

    // Should have initialized a new game
    expect(result.current.gameState).toBeTruthy();
    expect(result.current.gameState?.gamePhase).toBe(GamePhase.Dealing);
    expect(result.current.gameState?.roundNumber).toBe(1);
  });

  it("should restore saved game when available", async () => {
    // Create a saved game state
    const originalGameState = initializeGame();
    originalGameState.roundNumber = 3;
    originalGameState.gamePhase = GamePhase.Playing;
    originalGameState.teams[0].currentRank = Rank.Five;

    const persistedState = {
      gameState: originalGameState,
      timestamp: Date.now(),
      version: 1,
      gameId: "test_game_restore",
      isComplete: false,
      metadata: {
        roundNumber: 3,
        gamePhase: GamePhase.Playing,
        playerCount: 4,
      },
    };

    mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(persistedState));

    const { result } = renderHook(() => useGameState());

    // Initially should be initializing
    expect(result.current.isInitializing).toBe(true);
    expect(result.current.gameState).toBeNull();

    // Wait for restoration to complete
    await waitFor(() => {
      expect(result.current.isInitializing).toBe(false);
    });

    // Should have restored the saved game and corrected corrupted state
    expect(result.current.gameState).toBeTruthy();
    expect(result.current.gameState?.gamePhase).toBe(GamePhase.RoundEnd); // Corrected from Playing to RoundEnd due to empty hands
    expect(result.current.gameState?.roundNumber).toBe(3);
    expect(result.current.gameState?.teams[0].currentRank).toBe(Rank.Five);
  });

  it("should fallback to new game when restoration fails", async () => {
    // Mock corrupted saved data
    mockAsyncStorage.getItem.mockResolvedValue("invalid json data");

    const { result } = renderHook(() => useGameState());

    // Initially should be initializing
    expect(result.current.isInitializing).toBe(true);
    expect(result.current.gameState).toBeNull();

    // Wait for initialization to complete
    await waitFor(() => {
      expect(result.current.isInitializing).toBe(false);
    });

    // Should have fallen back to new game
    expect(result.current.gameState).toBeTruthy();
    expect(result.current.gameState?.gamePhase).toBe(GamePhase.Dealing);
    expect(result.current.gameState?.roundNumber).toBe(1);
  });

  it("should clear saved game when starting new game", async () => {
    // Start with a saved game
    const originalGameState = initializeGame();
    originalGameState.roundNumber = 2;

    const persistedState = {
      gameState: originalGameState,
      timestamp: Date.now(),
      version: 1,
      gameId: "test_game_clear",
      isComplete: false,
      metadata: {
        roundNumber: 2,
        gamePhase: GamePhase.Dealing,
        playerCount: 4,
      },
    };

    mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(persistedState));

    const { result } = renderHook(() => useGameState());

    // Wait for initial restoration
    await waitFor(() => {
      expect(result.current.isInitializing).toBe(false);
    });

    expect(result.current.gameState?.roundNumber).toBe(2);

    // Start new game
    result.current.startNewGame();

    // Should clear saved game
    await waitFor(() => {
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(
        "tractor_current_game",
      );
    });

    // Should reset to new game state
    await waitFor(
      () => {
        expect(result.current.gameState?.roundNumber).toBe(1);
      },
      { timeout: 2000 },
    );
  });
});
