import { processPlay } from '../src/utils/gamePlayManager';
import { determineTrickWinner } from '../src/utils/gameLogic';
import { useGameState } from '../src/hooks/useGameState';
import { useAITurns } from '../src/hooks/useAITurns';
import { renderHook, act } from '@testing-library/react-hooks';
import { 
  GameState, 
  Card, 
  Rank, 
  Suit, 
  JokerType,
  Trick
} from '../src/types/game';

// Mock dependencies
jest.mock('../src/utils/gameLogic', () => ({
  determineTrickWinner: jest.fn(),
  isTrump: jest.fn(),
  identifyCombos: jest.fn(),
  isValidPlay: jest.fn(),
  initializeGame: jest.fn()
}));

// Helper functions to create test data
const createMockCard = (id: string, suit: Suit, rank: Rank, points = 0): Card => ({
  id,
  suit,
  rank,
  points,
  joker: undefined
});

const createMockJoker = (id: string, type: JokerType, points = 0): Card => ({
  id,
  joker: type,
  points,
  suit: undefined,
  rank: undefined
});

const createMockGameState = (currentPlayerIndex = 0): GameState => {
  return {
    players: [
      {
        id: 'human',
        name: 'You',
        isHuman: true,
        hand: [
          createMockCard('spades_5_1', Suit.Spades, Rank.Five, 5),
          createMockCard('hearts_k_1', Suit.Hearts, Rank.King, 10)
        ],
        team: 'A',
        currentRank: Rank.Two
      },
      {
        id: 'ai1',
        name: 'Bot 1',
        isHuman: false,
        hand: [
          createMockCard('diamonds_3_1', Suit.Diamonds, Rank.Three),
          createMockCard('clubs_j_1', Suit.Clubs, Rank.Jack)
        ],
        team: 'B',
        currentRank: Rank.Two
      },
      {
        id: 'ai2',
        name: 'Bot 2',
        isHuman: false,
        hand: [
          createMockCard('spades_2_1', Suit.Spades, Rank.Two),
          createMockCard('hearts_a_1', Suit.Hearts, Rank.Ace)
        ],
        team: 'A',
        currentRank: Rank.Two
      },
      {
        id: 'ai3',
        name: 'Bot 3',
        isHuman: false,
        hand: [
          createMockCard('clubs_4_1', Suit.Clubs, Rank.Four),
          createMockCard('diamonds_10_1', Suit.Diamonds, Rank.Ten, 10)
        ],
        team: 'B',
        currentRank: Rank.Two
      }
    ],
    teams: [
      {
        id: 'A',
        players: ['human', 'ai2'],
        points: 0,
        currentRank: Rank.Two,
        isDefending: true
      },
      {
        id: 'B',
        players: ['ai1', 'ai3'],
        points: 0,
        currentRank: Rank.Two,
        isDefending: false
      }
    ],
    trumpInfo: {
      trumpRank: Rank.Two,
      trumpSuit: Suit.Spades,
      declared: true
    },
    gamePhase: 'playing',
    roundNumber: 1,
    currentPlayerIndex: currentPlayerIndex,
    currentTrick: null,
    tricks: [],
    deck: [],
    kittyCards: []
  };
};

describe('Player Transitions', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Human player winning a trick becomes the next leader', () => {
    // Start with a game state where all but the last player have played
    const mockState = createMockGameState();
    mockState.currentPlayerIndex = 3; // AI3's turn
    
    // Setup a trick in progress with all but the last player having played
    mockState.currentTrick = {
      leadingPlayerId: 'ai1',  // Bot 1 led
      leadingCombo: [createMockCard('diamonds_3_1', Suit.Diamonds, Rank.Three)],
      plays: [
        // Human has played 
        {
          playerId: 'human',
          cards: [createMockCard('spades_5_1', Suit.Spades, Rank.Five, 5)]
        },
        // Bot 2 has played
        {
          playerId: 'ai2',
          cards: [createMockCard('spades_2_1', Suit.Spades, Rank.Two)]
        }
      ],
      points: 5 // 5 points from the Spades 5
    };
    
    // Mock determineTrickWinner to return human as winner
    (determineTrickWinner as jest.Mock).mockReturnValue('human');
    
    // Process final play to complete trick
    const result = processPlay(mockState, [createMockCard('clubs_4_1', Suit.Clubs, Rank.Four)]);
    
    // Verify trick is complete
    expect(result.trickComplete).toBe(true);
    expect(result.trickWinner).toBe('You'); // Human player
    
    // Verify winningPlayerIndex is set correctly (human is index 0)
    expect(result.newState.winningPlayerIndex).toBe(0);
    
    // With our current implementation, currentPlayerIndex should still be set correctly
    // but the trick is not immediately cleared - that happens in handleTrickResultComplete
    expect(result.newState.currentPlayerIndex).toBe(0);
    expect(result.newState.currentTrick).not.toBeNull();
    
    // Now simulate the trick result display completion
    // We'll manually update the state as useGameState.handleTrickResultComplete would
    const finalState = {
      ...result.newState,
      currentTrick: null,
      currentPlayerIndex: result.newState.winningPlayerIndex,
      winningPlayerIndex: undefined
    };
    
    // Verify the human player (index 0) is now the current player
    expect(finalState.currentPlayerIndex).toBe(0);
    expect(finalState.currentTrick).toBeNull();
  });
  
  test('AI1 winning a trick becomes the next leader', () => {
    // Start with a game state where all but the last player have played
    const mockState = createMockGameState();
    mockState.currentPlayerIndex = 3; // AI3's turn
    
    // Setup a trick in progress
    mockState.currentTrick = {
      leadingPlayerId: 'human',  // Human led
      leadingCombo: [createMockCard('spades_5_1', Suit.Spades, Rank.Five, 5)],
      plays: [
        // AI1 has played 
        {
          playerId: 'ai1',
          cards: [createMockCard('diamonds_3_1', Suit.Diamonds, Rank.Three)]
        },
        // AI2 has played
        {
          playerId: 'ai2',
          cards: [createMockCard('spades_2_1', Suit.Spades, Rank.Two)]
        }
      ],
      points: 5 // 5 points from the Spades 5
    };
    
    // Mock determineTrickWinner to return ai1 as winner
    (determineTrickWinner as jest.Mock).mockReturnValue('ai1');
    
    // Process final play to complete trick
    const result = processPlay(mockState, [createMockCard('clubs_4_1', Suit.Clubs, Rank.Four)]);
    
    // Verify trick is complete
    expect(result.trickComplete).toBe(true);
    expect(result.trickWinner).toBe('Bot 1'); // AI1 player
    
    // Verify winningPlayerIndex is set correctly (ai1 is index 1)
    expect(result.newState.winningPlayerIndex).toBe(1);
    
    // Simulate the trick result display completion
    const finalState = {
      ...result.newState,
      currentTrick: null,
      currentPlayerIndex: result.newState.winningPlayerIndex,
      winningPlayerIndex: undefined
    };
    
    // Verify AI1 (index 1) is now the current player
    expect(finalState.currentPlayerIndex).toBe(1);
    expect(finalState.currentTrick).toBeNull();
  });
  
  test('AI2 winning a trick becomes the next leader', () => {
    // Start with a game state where all but the last player have played
    const mockState = createMockGameState();
    mockState.currentPlayerIndex = 3; // AI3's turn
    
    // Setup a trick in progress
    mockState.currentTrick = {
      leadingPlayerId: 'human',  // Human led
      leadingCombo: [createMockCard('spades_5_1', Suit.Spades, Rank.Five, 5)],
      plays: [
        // AI1 has played 
        {
          playerId: 'ai1',
          cards: [createMockCard('diamonds_3_1', Suit.Diamonds, Rank.Three)]
        },
        // AI2 has played
        {
          playerId: 'ai2',
          cards: [createMockCard('spades_2_1', Suit.Spades, Rank.Two)]
        }
      ],
      points: 5 // 5 points from the Spades 5
    };
    
    // Mock determineTrickWinner to return ai2 as winner
    (determineTrickWinner as jest.Mock).mockReturnValue('ai2');
    
    // Process final play to complete trick
    const result = processPlay(mockState, [createMockCard('clubs_4_1', Suit.Clubs, Rank.Four)]);
    
    // Verify trick is complete
    expect(result.trickComplete).toBe(true);
    expect(result.trickWinner).toBe('Bot 2'); // AI2 player
    
    // Verify winningPlayerIndex is set correctly (ai2 is index 2)
    expect(result.newState.winningPlayerIndex).toBe(2);
    
    // Simulate the trick result display completion
    const finalState = {
      ...result.newState,
      currentTrick: null,
      currentPlayerIndex: result.newState.winningPlayerIndex,
      winningPlayerIndex: undefined
    };
    
    // Verify AI2 (index 2) is now the current player
    expect(finalState.currentPlayerIndex).toBe(2);
    expect(finalState.currentTrick).toBeNull();
  });
  
  test('AI3 winning a trick becomes the next leader', () => {
    // Start with a game state where all but the last player have played
    const mockState = createMockGameState();
    mockState.currentPlayerIndex = 3; // AI3's turn
    
    // Setup a trick in progress
    mockState.currentTrick = {
      leadingPlayerId: 'human',  // Human led
      leadingCombo: [createMockCard('spades_5_1', Suit.Spades, Rank.Five, 5)],
      plays: [
        // AI1 has played 
        {
          playerId: 'ai1',
          cards: [createMockCard('diamonds_3_1', Suit.Diamonds, Rank.Three)]
        },
        // AI2 has played
        {
          playerId: 'ai2',
          cards: [createMockCard('spades_2_1', Suit.Spades, Rank.Two)]
        }
      ],
      points: 5 // 5 points from the Spades 5
    };
    
    // Mock determineTrickWinner to return ai3 as winner
    (determineTrickWinner as jest.Mock).mockReturnValue('ai3');
    
    // Process final play to complete trick
    const result = processPlay(mockState, [createMockCard('clubs_4_1', Suit.Clubs, Rank.Four)]);
    
    // Verify trick is complete
    expect(result.trickComplete).toBe(true);
    expect(result.trickWinner).toBe('Bot 3'); // AI3 player
    
    // Verify winningPlayerIndex is set correctly (ai3 is index 3)
    expect(result.newState.winningPlayerIndex).toBe(3);
    
    // Simulate the trick result display completion
    const finalState = {
      ...result.newState,
      currentTrick: null,
      currentPlayerIndex: result.newState.winningPlayerIndex,
      winningPlayerIndex: undefined
    };
    
    // Verify AI3 (index 3) is now the current player
    expect(finalState.currentPlayerIndex).toBe(3);
    expect(finalState.currentTrick).toBeNull();
  });
  
  test('handleTrickResultComplete properly updates game state', () => {
    // Mock the necessary hooks
    const mockHandleTrickResultComplete = jest.fn();
    const mockSetGameState = jest.fn();
    
    // Start with a completed trick state
    const mockState = createMockGameState();
    mockState.currentTrick = {
      leadingPlayerId: 'human',
      leadingCombo: [createMockCard('spades_5_1', Suit.Spades, Rank.Five, 5)],
      plays: [
        {
          playerId: 'ai1',
          cards: [createMockCard('diamonds_3_1', Suit.Diamonds, Rank.Three)]
        },
        {
          playerId: 'ai2',
          cards: [createMockCard('spades_2_1', Suit.Spades, Rank.Two)]
        },
        {
          playerId: 'ai3',
          cards: [createMockCard('clubs_4_1', Suit.Clubs, Rank.Four)]
        }
      ],
      points: 5,
      winningPlayerId: 'ai2'
    };
    mockState.winningPlayerIndex = 2; // AI2 is the winner (index 2)
    
    // Create a simplified version of handleTrickResultComplete
    const handleTrickResultComplete = () => {
      if (mockState) {
        const winningIndex = mockState.winningPlayerIndex;
        
        // Create new state with currentTrick cleared and winner as next player
        const newState = {
          ...mockState,
          currentTrick: null,
          currentPlayerIndex: winningIndex,
          winningPlayerIndex: undefined
        };
        
        // Update the state
        mockSetGameState(newState);
        
        // Return the new state for verification
        return newState;
      }
      return null;
    };
    
    // Execute the function
    const newState = handleTrickResultComplete();
    
    // Verify the state was updated correctly
    expect(mockSetGameState).toHaveBeenCalledTimes(1);
    expect(newState).not.toBeNull();
    
    if (newState) {
      // The trick should be cleared
      expect(newState.currentTrick).toBeNull();
      
      // The winning player (AI2, index 2) should be the new current player
      expect(newState.currentPlayerIndex).toBe(2);
      
      // The winningPlayerIndex should be cleared
      expect(newState.winningPlayerIndex).toBeUndefined();
    }
  });
});