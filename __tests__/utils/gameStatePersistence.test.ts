import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  saveGameState,
  loadGameState,
  clearSavedGameState,
  hasSavedGame,
  getSavedGameMetadata,
  getStorageStats,
} from '../../src/utils/gameStatePersistence';
import { initializeGame } from '../../src/utils/gameInitialization';
import { GamePhase, Rank } from '../../src/types';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
}));

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('Game State Persistence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAsyncStorage.setItem.mockResolvedValue();
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.removeItem.mockResolvedValue();
  });

  describe('saveGameState', () => {
    it('should successfully save a valid game state', async () => {
      const gameState = initializeGame();
      gameState.gamePhase = GamePhase.Playing;
      gameState.roundNumber = 3;

      const result = await saveGameState(gameState);

      expect(result.success).toBe(true);
      expect(result.savedAt).toBeDefined();
      expect(mockAsyncStorage.setItem).toHaveBeenCalledTimes(2); // Game state + last save time
    });

    it('should handle storage errors gracefully', async () => {
      const gameState = initializeGame();
      mockAsyncStorage.setItem.mockRejectedValue(new Error('Storage full'));

      const result = await saveGameState(gameState);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to write to storage');
    });

    it('should create valid persisted state structure', async () => {
      const gameState = initializeGame();
      gameState.roundNumber = 2;
      
      let savedData: string;
      mockAsyncStorage.setItem.mockImplementation(async (key, value) => {
        if (key === 'tractor_current_game') {
          savedData = value;
        }
      });

      await saveGameState(gameState);

      const persistedState = JSON.parse(savedData!);
      expect(persistedState).toHaveProperty('gameState');
      expect(persistedState).toHaveProperty('timestamp');
      expect(persistedState).toHaveProperty('version');
      expect(persistedState).toHaveProperty('gameId');
      expect(persistedState).toHaveProperty('isComplete');
      expect(persistedState).toHaveProperty('metadata');
      
      expect(persistedState.metadata.roundNumber).toBe(2);
      expect(persistedState.metadata.playerCount).toBe(4);
    });
  });

  describe('loadGameState', () => {
    it('should successfully load a valid game state', async () => {
      const originalGameState = initializeGame();
      originalGameState.roundNumber = 5;
      originalGameState.gamePhase = GamePhase.Playing;

      // Create valid persisted state
      const persistedState = {
        gameState: originalGameState,
        timestamp: Date.now(),
        version: '1.0.0',
        gameId: 'test_game_123',
        isComplete: false,
        metadata: {
          roundNumber: 5,
          gamePhase: GamePhase.Playing,
          playerCount: 4,
        }
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(persistedState));

      const result = await loadGameState();

      expect(result.success).toBe(true);
      expect(result.gameState).toBeDefined();
      expect(result.gameState!.roundNumber).toBe(5);
      expect(result.gameState!.gamePhase).toBe(GamePhase.Playing);
      expect(result.metadata?.roundNumber).toBe(5);
    });

    it('should return error when no saved game exists', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const result = await loadGameState();

      expect(result.success).toBe(false);
      expect(result.error).toBe('No saved game found');
    });

    it('should reject invalid persisted state', async () => {
      // Invalid state - missing required fields
      const invalidState = {
        gameState: { invalid: true },
        timestamp: Date.now(),
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(invalidState));

      const result = await loadGameState();

      expect(result.success).toBe(false);
      expect(result.error).toContain('validation failed');
    });

    it('should reject corrupted JSON data', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('invalid json data {');

      const result = await loadGameState();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid saved game data format');
    });

    it('should reject old saved games', async () => {
      const oldGameState = initializeGame();
      
      // Create state that's too old (8 days ago)
      const oldTimestamp = Date.now() - (8 * 24 * 60 * 60 * 1000);
      const persistedState = {
        gameState: oldGameState,
        timestamp: oldTimestamp,
        version: '1.0.0',
        gameId: 'old_game_123',
        isComplete: false,
        metadata: {
          roundNumber: 1,
          gamePhase: GamePhase.Playing,
          playerCount: 4,
        }
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(persistedState));

      const result = await loadGameState();

      expect(result.success).toBe(false);
      expect(result.error).toContain('validation failed');
    });
  });

  describe('clearSavedGameState', () => {
    it('should successfully clear saved game', async () => {
      const result = await clearSavedGameState();

      expect(result).toBe(true);
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('tractor_current_game');
    });

    it('should handle storage errors when clearing', async () => {
      mockAsyncStorage.removeItem.mockRejectedValue(new Error('Remove failed'));

      const result = await clearSavedGameState();

      expect(result).toBe(false);
    });
  });

  describe('hasSavedGame', () => {
    it('should return true when saved game exists', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('some saved data');

      const result = await hasSavedGame();

      expect(result).toBe(true);
    });

    it('should return false when no saved game exists', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const result = await hasSavedGame();

      expect(result).toBe(false);
    });
  });

  describe('getSavedGameMetadata', () => {
    it('should return metadata for valid saved game', async () => {
      const gameState = initializeGame();
      const persistedState = {
        gameState,
        timestamp: Date.now(),
        version: '1.0.0',
        gameId: 'test_123',
        isComplete: false,
        metadata: {
          roundNumber: 3,
          gamePhase: GamePhase.Playing,
          playerCount: 4,
        }
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(persistedState));

      const metadata = await getSavedGameMetadata();

      expect(metadata).toBeDefined();
      expect(metadata!.roundNumber).toBe(3);
      expect(metadata!.gamePhase).toBe(GamePhase.Playing);
      expect(metadata!.playerCount).toBe(4);
    });

    it('should return null for invalid saved game', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('invalid data');

      const metadata = await getSavedGameMetadata();

      expect(metadata).toBeNull();
    });
  });

  describe('getStorageStats', () => {
    it('should return storage statistics', async () => {
      const testData = 'test game data';
      const lastSaveTime = Date.now().toString();
      
      mockAsyncStorage.getItem
        .mockResolvedValueOnce(testData) // For current game
        .mockResolvedValueOnce(lastSaveTime); // For last save time

      const stats = await getStorageStats();

      expect(stats.hasSavedGame).toBe(true);
      expect(stats.dataSize).toBe(testData.length);
      expect(stats.lastSaveTime).toBe(parseInt(lastSaveTime, 10));
    });

    it('should handle storage errors in stats', async () => {
      // Mock both calls to getItem to reject immediately (no retry delays)
      mockAsyncStorage.getItem
        .mockRejectedValueOnce(new Error('Storage error'))
        .mockRejectedValueOnce(new Error('Storage error'));

      const stats = await getStorageStats();

      expect(stats.hasSavedGame).toBe(false);
      expect(stats.dataSize).toBeUndefined();
      expect(stats.lastSaveTime).toBeUndefined();
    });
  });

  describe('Game State Validation', () => {
    it('should validate complete game state structure', async () => {
      const gameState = initializeGame();
      
      // Modify game state to test validation
      gameState.roundNumber = 4;
      gameState.gamePhase = GamePhase.KittySwap;
      gameState.teams[0].currentRank = Rank.Five;
      gameState.currentPlayerIndex = 2;

      const saveResult = await saveGameState(gameState);
      expect(saveResult.success).toBe(true);

      // Mock the saved data for loading
      const persistedState = {
        gameState,
        timestamp: Date.now(),
        version: '1.0.0',
        gameId: 'valid_game_456',
        isComplete: false,
        metadata: {
          roundNumber: 4,
          gamePhase: GamePhase.KittySwap,
          playerCount: 4,
        }
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(persistedState));

      const loadResult = await loadGameState();
      expect(loadResult.success).toBe(true);
      expect(loadResult.gameState!.roundNumber).toBe(4);
      expect(loadResult.gameState!.gamePhase).toBe(GamePhase.KittySwap);
      expect(loadResult.gameState!.teams[0].currentRank).toBe(Rank.Five);
    });

    it('should reject game state with invalid player count', async () => {
      const gameState = initializeGame();
      // Remove a player to make invalid
      gameState.players = gameState.players.slice(0, 3);

      const persistedState = {
        gameState,
        timestamp: Date.now(),
        version: '1.0.0',
        gameId: 'invalid_players',
        isComplete: false,
        metadata: {
          roundNumber: 1,
          gamePhase: GamePhase.Playing,
          playerCount: 3, // Invalid
        }
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(persistedState));

      const result = await loadGameState();
      expect(result.success).toBe(false);
    });

    it('should reject game state with invalid team count', async () => {
      const gameState = initializeGame();
      // Remove a team to make invalid
      gameState.teams = [gameState.teams[0]] as any;

      const persistedState = {
        gameState,
        timestamp: Date.now(),
        version: '1.0.0',
        gameId: 'invalid_teams',
        isComplete: false,
        metadata: {
          roundNumber: 1,
          gamePhase: GamePhase.Playing,
          playerCount: 4,
        }
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(persistedState));

      const result = await loadGameState();
      expect(result.success).toBe(false);
    });
  });
});