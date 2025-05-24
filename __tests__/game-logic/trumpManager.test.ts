import { 
  declareTrumpSuit, 
  checkAITrumpDeclaration,
  humanHasTrumpRank
} from '../../src/utils/trumpManager';
import { GameState, Suit, Rank, Card } from '../../src/types/game';
import * as aiLogic from '../../src/utils/aiLogic';

// Mock dependencies
jest.mock('../../src/utils/aiLogic', () => ({
  shouldAIDeclare: jest.fn()
}));

// Helper function to create test cards
const createMockCard = (id: string, suit: Suit, rank: Rank, points = 0): Card => ({
  id,
  suit,
  rank,
  points,
  joker: undefined
});

// Create mock game state for testing
const createMockGameState = (): GameState => {
  return {
    players: {
      'player': {
        id: 'player',
        name: 'You',
        isHuman: true,
        hand: [
          createMockCard('spades_5_1', Suit.Spades, Rank.Five, 5),
          createMockCard('hearts_k_1', Suit.Hearts, Rank.King, 10),
          createMockCard('spades_2_1', Suit.Spades, Rank.Two, 0) // Trump rank card
        ],
        teamId: 'A',
        position: 'bottom',
        isThinking: false
      },
      'ai1': {
        id: 'ai1',
        name: 'Bot 1',
        isHuman: false,
        hand: [
          createMockCard('diamonds_3_1', Suit.Diamonds, Rank.Three),
          createMockCard('clubs_j_1', Suit.Clubs, Rank.Jack),
          createMockCard('hearts_2_1', Suit.Hearts, Rank.Two, 0) // Trump rank card
        ],
        teamId: 'B',
        position: 'right',
        isThinking: false
      }
    },
    teams: {
      'A': {
        id: 'A',
        // Note: players list is derived from GameState.players by teamId field
        points: 0,
        currentRank: Rank.Two,
        isDefending: true
      },
      'B': {
        id: 'B',
        // Note: players list is derived from GameState.players by teamId field
        points: 0,
        currentRank: Rank.Two,
        isDefending: false
      }
    },
    trumpInfo: {
      trumpRank: Rank.Two,
      trumpSuit: undefined,
      declared: false,
      declarerPlayerId: undefined
    },
    gamePhase: 'declaring',
    roundNumber: 1,
    currentTrick: null,
    tricks: [],
    deck: [],
    kittyCards: [],
    currentPlayerId: 'player',
    selectedCards: []
  };
};

describe('trumpManager', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('declareTrumpSuit', () => {
    test('should update game state when declaring a trump suit', () => {
      const mockState = createMockGameState();
      const result = declareTrumpSuit(mockState, Suit.Spades, 'player');
      
      // Verify trump suit was set
      expect(result.trumpInfo.trumpSuit).toBe(Suit.Spades);
      
      // Verify declared flag was set
      expect(result.trumpInfo.declared).toBe(true);
      
      // Verify game phase was updated
      expect(result.gamePhase).toBe('playing');
    });

    test('should update game phase without setting trump suit when skipping declaration', () => {
      const mockState = createMockGameState();
      const result = declareTrumpSuit(mockState, null, 'player');
      
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
      mockState.players['ai1'].hand = mockState.players['ai1'].hand.filter(
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
      expect(aiLogic.shouldAIDeclare).toHaveBeenCalledWith(mockState, 'ai1');
    });

    test('should return true and suit when AI should declare', () => {
      const mockState = createMockGameState();
      
      // Mock shouldAIDeclare to return true
      (aiLogic.shouldAIDeclare as jest.Mock).mockReturnValue(true);
      
      const result = checkAITrumpDeclaration(mockState);
      
      expect(result.shouldDeclare).toBe(true);
      expect(result.suit).toBe(Suit.Diamonds); // Diamonds is chosen by the implementation
      
      // Verify shouldAIDeclare was called with correct args
      expect(aiLogic.shouldAIDeclare).toHaveBeenCalledWith(mockState, 'ai1');
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
      mockState.players['player'].hand = mockState.players['player'].hand.filter(
        card => card.rank !== mockState.trumpInfo.trumpRank
      );
      
      const result = humanHasTrumpRank(mockState);
      
      expect(result).toBe(false);
    });

    test('should return false when there is no human player', () => {
      const mockState = createMockGameState();
      
      // Change all players to AI
      Object.values(mockState.players).forEach(player => {
        player.isHuman = false;
      });
      
      const result = humanHasTrumpRank(mockState);
      
      expect(result).toBe(false);
    });
  });
});
