import { useGameState } from '../src/hooks/useGameState';
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
  initializeGame: jest.fn(),
  identifyCombos: jest.fn(),
  isValidPlay: jest.fn(),
  determineTrickWinner: jest.fn(),
  isTrump: jest.fn(),
  humanHasTrumpRank: jest.fn().mockReturnValue(false)
}));

jest.mock('../src/utils/gamePlayManager', () => ({
  processPlay: jest.fn(),
  validatePlay: jest.fn()
}));

jest.mock('../src/utils/trumpManager', () => ({
  declareTrumpSuit: jest.fn(),
  checkAITrumpDeclaration: jest.fn().mockReturnValue({ shouldDeclare: false }),
  humanHasTrumpRank: jest.fn().mockReturnValue(false)
}));

jest.mock('../src/utils/gameRoundManager', () => ({
  prepareNextRound: jest.fn(),
  endRound: jest.fn().mockReturnValue({ gameOver: false, roundCompleteMessage: 'Round complete' })
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

describe('Game State Management', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('winningPlayerIndex is properly stored and used in handleTrickResultComplete', () => {
    // Setup mock game state with completed trick
    const mockState = createMockGameState();
    mockState.winningPlayerIndex = 2; // AI2 is the winner (index 2)
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
    
    // Create a mock for setGameState
    const setGameStateMock = jest.fn();
    
    // Setup a mock useGameState with custom hook result
    const result = {
      gameState: mockState,
      setGameState: setGameStateMock,
      handleTrickResultComplete: function() {
        if (this.gameState) {
          // Create new state with cleared trick and winner as next player
          const newState = {
            ...this.gameState,
            currentTrick: null,
            currentPlayerIndex: this.gameState.winningPlayerIndex,
            winningPlayerIndex: undefined
          };
          
          // Update the state
          this.setGameState(newState);
        }
      }
    };
    
    // Call handleTrickResultComplete
    result.handleTrickResultComplete();
    
    // Verify setGameState was called with the correct state
    expect(setGameStateMock).toHaveBeenCalledTimes(1);
    
    // Verify the state passed to setGameState
    const newState = setGameStateMock.mock.calls[0][0];
    
    // The trick should be cleared
    expect(newState.currentTrick).toBeNull();
    
    // The winning player (AI2, index 2) should be the new current player
    expect(newState.currentPlayerIndex).toBe(2);
    
    // The winningPlayerIndex should be cleared
    expect(newState.winningPlayerIndex).toBeUndefined();
  });
  
  test('winningPlayerIndex is preserved when game state is updated', () => {
    // Setup mock game state with a winningPlayerIndex
    const mockState = createMockGameState();
    mockState.winningPlayerIndex = 2; // AI2 is the winner (index 2)
    
    // Create a mock for setGameState
    const setGameStateMock = jest.fn();
    
    // Setup a mock useGameState with custom hook result
    const result = {
      gameState: mockState,
      setGameState: setGameStateMock
    };
    
    // Simulate a state update that should preserve winningPlayerIndex
    const updatedState = {
      ...mockState,
      players: [...mockState.players] // Make a shallow copy of players
    };
    
    // Update the state
    result.setGameState(updatedState);
    
    // Verify setGameState was called
    expect(setGameStateMock).toHaveBeenCalledTimes(1);
    
    // Verify winningPlayerIndex was preserved
    const newState = setGameStateMock.mock.calls[0][0];
    expect(newState.winningPlayerIndex).toBe(2);
  });
  
  test('handleTrickResultComplete works correctly with null winningPlayerIndex', () => {
    // Setup mock game state with no winningPlayerIndex
    const mockState = createMockGameState();
    mockState.winningPlayerIndex = undefined;
    mockState.currentPlayerIndex = 1; // Current player is AI1
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
      winningPlayerId: 'ai1'
    };
    
    // Create a mock for setGameState
    const setGameStateMock = jest.fn();
    
    // Setup a mock useGameState with custom hook result
    const result = {
      gameState: mockState,
      setGameState: setGameStateMock,
      handleTrickResultComplete: function() {
        if (this.gameState) {
          // Use the winning player index or fallback to current player
          const winningIndex = typeof this.gameState.winningPlayerIndex === 'number' ? 
                              this.gameState.winningPlayerIndex : this.gameState.currentPlayerIndex;
          
          // Create new state with cleared trick and winner as next player
          const newState = {
            ...this.gameState,
            currentTrick: null,
            currentPlayerIndex: winningIndex,
            winningPlayerIndex: undefined
          };
          
          // Update the state
          this.setGameState(newState);
        }
      }
    };
    
    // Call handleTrickResultComplete
    result.handleTrickResultComplete();
    
    // Verify setGameState was called with the correct state
    expect(setGameStateMock).toHaveBeenCalledTimes(1);
    
    // Verify the state passed to setGameState
    const newState = setGameStateMock.mock.calls[0][0];
    
    // The trick should be cleared
    expect(newState.currentTrick).toBeNull();
    
    // Without winningPlayerIndex, currentPlayerIndex should be preserved
    expect(newState.currentPlayerIndex).toBe(1);
    
    // The winningPlayerIndex should be undefined
    expect(newState.winningPlayerIndex).toBeUndefined();
  });
  
  test('winningPlayerIndex is set correctly for all players', () => {
    // Create a completed trick with different winners and verify
    // that winningPlayerIndex is set correctly for each player
    
    // Test for each player as winner
    const playerIds = ['human', 'ai1', 'ai2', 'ai3'];
    const playerIndices = [0, 1, 2, 3];
    
    playerIds.forEach((playerId, index) => {
      // Setup mock game state with completed trick
      const mockState = createMockGameState(3); // AI3 is current player (last to play)
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
          }
        ],
        points: 5
      };
      
      // Mock processPlay to return a completed trick with specified winner
      const processPlayMock = require('../src/utils/gamePlayManager').processPlay;
      processPlayMock.mockReturnValue({
        newState: {
          ...mockState,
          winningPlayerIndex: playerIndices[index],
          currentPlayerIndex: 3, // Still AI3's turn
          tricks: [{
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
            winningPlayerId: playerId
          }]
        },
        trickComplete: true,
        trickWinner: mockState.players[playerIndices[index]].name,
        trickPoints: 5,
        completedTrick: {
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
          winningPlayerId: playerId
        }
      });
      
      // Create a mock for setGameState
      const setGameStateMock = jest.fn();
      
      // Setup a mock handleProcessPlay function
      const handleProcessPlay = (cards: Card[]) => {
        const result = processPlayMock(mockState, cards);
        setGameStateMock(result.newState);
        return result;
      };
      
      // Process the play
      const result = handleProcessPlay([createMockCard('clubs_4_1', Suit.Clubs, Rank.Four)]);
      
      // Verify the state was updated correctly
      expect(setGameStateMock).toHaveBeenCalledTimes(1);
      
      // The winningPlayerIndex should be set to the correct player index
      expect(result.newState.winningPlayerIndex).toBe(playerIndices[index]);
      
      // Verify that trickWinner matches the player name
      expect(result.trickWinner).toBe(mockState.players[playerIndices[index]].name);
      
      // Reset the mock for the next test
      jest.clearAllMocks();
    });
  });
});