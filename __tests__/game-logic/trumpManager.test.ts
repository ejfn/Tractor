import { PlayerId, Suit } from '../../src/types/game';
import * as aiLogic from '../../src/utils/aiLogic';
import {
  checkAITrumpDeclaration,
  declareTrumpSuit,
  humanHasTrumpRank
} from '../../src/utils/trumpManager';
import { createTrumpDeclarationGameState } from '../helpers/testUtils';

// Mock dependencies
jest.mock('../../src/utils/aiLogic', () => ({
  shouldAIDeclare: jest.fn()
}));

const createMockGameState = createTrumpDeclarationGameState;

describe('trumpManager', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('declareTrumpSuit', () => {
    test('should update game state when declaring a trump suit', () => {
      const mockState = createMockGameState();
      const result = declareTrumpSuit(mockState, Suit.Spades);
      
      // Verify trump suit was set
      expect(result.trumpInfo.trumpSuit).toBe(Suit.Spades);
      
      // Verify declared flag was set
      expect(result.trumpInfo.declared).toBe(true);
      
      // Verify game phase was updated
      expect(result.gamePhase).toBe('playing');
    });

    test('should update game phase without setting trump suit when skipping declaration', () => {
      const mockState = createMockGameState();
      const result = declareTrumpSuit(mockState, null);
      
      // Verify trump suit remains undefined
      expect(result.trumpInfo.trumpSuit).toBeUndefined();
      
      // Verify declared flag was not set
      expect(result.trumpInfo.declared).toBe(false);
      
      // Verify game phase was updated
      expect(result.gamePhase).toBe('playing');
    });
  });

  describe('checkAITrumpDeclaration', () => {
    test('should return false when no AI player has trump rank cards', () => {
      const mockState = createMockGameState();
      
      // Remove trump rank card from AI's hand
      mockState.players[1].hand = mockState.players[1].hand.filter(
        card => card.rank !== mockState.trumpInfo.trumpRank
      );
      
      const result = checkAITrumpDeclaration(mockState);
      
      expect(result.shouldDeclare).toBe(false);
      expect(result.suit).toBeNull();
    });

    test('should return false when AI should not declare', () => {
      const mockState = createMockGameState();
      
      // Mock shouldAIDeclare to return false
      (aiLogic.shouldAIDeclare as jest.Mock).mockReturnValue(false);
      
      const result = checkAITrumpDeclaration(mockState);
      
      expect(result.shouldDeclare).toBe(false);
      expect(result.suit).toBeNull();
      
      // Verify shouldAIDeclare was called with correct args
      expect(aiLogic.shouldAIDeclare).toHaveBeenCalledWith(mockState, PlayerId.Bot1);
    });

    test('should return true and suit when AI should declare', () => {
      const mockState = createMockGameState();
      
      // Mock shouldAIDeclare to return true
      (aiLogic.shouldAIDeclare as jest.Mock).mockReturnValue(true);
      
      const result = checkAITrumpDeclaration(mockState);
      
      expect(result.shouldDeclare).toBe(true);
      expect(result.suit).toBe(Suit.Clubs); // Clubs is chosen by the implementation
      
      // Verify shouldAIDeclare was called with correct args
      expect(aiLogic.shouldAIDeclare).toHaveBeenCalledWith(mockState, PlayerId.Bot1);
    });
  });

  describe('humanHasTrumpRank', () => {
    test('should return true when human has trump rank card', () => {
      const mockState = createMockGameState();
      
      const result = humanHasTrumpRank(mockState);
      
      expect(result).toBe(true);
    });

    test('should return false when human does not have trump rank card', () => {
      const mockState = createMockGameState();
      
      // Remove trump rank card from human's hand
      mockState.players[0].hand = mockState.players[0].hand.filter(
        card => card.rank !== mockState.trumpInfo.trumpRank
      );
      
      const result = humanHasTrumpRank(mockState);
      
      expect(result).toBe(false);
    });

    test('should return false when there is no human player', () => {
      const mockState = createMockGameState();
      
      // Change all players to AI
      mockState.players.forEach(player => {
        player.isHuman = false;
      });
      
      const result = humanHasTrumpRank(mockState);
      
      expect(result).toBe(false);
    });
  });
});