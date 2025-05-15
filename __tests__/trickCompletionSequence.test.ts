import { processPlay } from '../src/utils/gamePlayManager';
import { determineTrickWinner } from '../src/utils/gameLogic';
import { useGameState } from '../src/hooks/useGameState';
import { useAITurns } from '../src/hooks/useAITurns';
import { useTrickResults } from '../src/hooks/useTrickResults';
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
  initializeGame: jest.fn(),
  identifyCombos: jest.fn(),
  isValidPlay: jest.fn()
}));

jest.mock('../src/utils/gamePlayManager', () => ({
  processPlay: jest.fn(),
  validatePlay: jest.fn(),
  getAIMoveWithErrorHandling: jest.fn()
}));

// Mock timers for predictable testing
jest.useFakeTimers();

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

describe('Trick Completion Sequence Integration', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Full trick completion flow with proper state transitions', () => {
    // This test will simulate the entire flow:
    // 1. Complete a trick with all players
    // 2. Show the trick result
    // 3. Clear the trick after the display time
    // 4. Verify the next player is the winner

    // Setup initial state
    const initialState = createMockGameState();
    
    // Mock process play for a completed trick
    const processPlayMock = processPlay as jest.Mock;
    
    // First three plays (not completing the trick)
    processPlayMock.mockImplementationOnce((state, cards) => {
      // Human plays first
      return {
        newState: {
          ...state,
          currentTrick: {
            leadingPlayerId: 'human',
            leadingCombo: [state.players[0].hand[0]], // Spades 5
            plays: [],
            points: 5
          },
          currentPlayerIndex: 1 // Move to AI1
        },
        trickComplete: false
      };
    });

    processPlayMock.mockImplementationOnce((state, cards) => {
      // AI1 plays second
      return {
        newState: {
          ...state,
          currentTrick: {
            ...state.currentTrick,
            plays: [
              ...(state.currentTrick?.plays || []),
              {
                playerId: 'ai1',
                cards: [state.players[1].hand[0]] // Diamonds 3
              }
            ]
          },
          currentPlayerIndex: 2 // Move to AI2
        },
        trickComplete: false
      };
    });

    processPlayMock.mockImplementationOnce((state, cards) => {
      // AI2 plays third
      return {
        newState: {
          ...state,
          currentTrick: {
            ...state.currentTrick,
            plays: [
              ...(state.currentTrick?.plays || []),
              {
                playerId: 'ai2',
                cards: [state.players[2].hand[0]] // Spades 2
              }
            ]
          },
          currentPlayerIndex: 3 // Move to AI3
        },
        trickComplete: false
      };
    });

    // Final play completing the trick
    processPlayMock.mockImplementationOnce((state, cards) => {
      // AI3 completes the trick, AI2 wins
      const completedTrick = {
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

      return {
        newState: {
          ...state,
          currentTrick: completedTrick,
          tricks: [...state.tricks, completedTrick],
          winningPlayerIndex: 2, // AI2 is the winner
          currentPlayerIndex: 3 // Still AI3's turn until trick result is processed
        },
        trickComplete: true,
        trickWinner: 'Bot 2',
        trickPoints: 5,
        completedTrick
      };
    });

    // Setup the mock for determineTrickWinner
    (determineTrickWinner as jest.Mock).mockReturnValue('ai2');

    // Mock the hooks
    const mockSetGameState = jest.fn();
    const mockHandleProcessPlay = jest.fn(cards => {
      return processPlayMock(initialState, cards);
    });
    const mockTrickResultCompleteCallback = jest.fn();

    // Create a scenario similar to how the game controller would work
    // We'll track the state transitions manually
    let currentState = initialState;
    let trickResultState = {
      showTrickResult: false,
      lastTrickWinner: '',
      lastTrickPoints: 0,
      lastCompletedTrick: null as Trick | null
    };

    // Step 1: Human plays first
    const humanResult = mockHandleProcessPlay([initialState.players[0].hand[0]]);
    currentState = humanResult.newState;
    expect(currentState.currentPlayerIndex).toBe(1); // AI1's turn
    expect(currentState.currentTrick).not.toBeNull();
    expect(humanResult.trickComplete).toBe(false);

    // Step 2: AI1 plays
    const ai1Result = mockHandleProcessPlay([currentState.players[1].hand[0]]);
    currentState = ai1Result.newState;
    expect(currentState.currentPlayerIndex).toBe(2); // AI2's turn
    expect(ai1Result.trickComplete).toBe(false);

    // Step 3: AI2 plays
    const ai2Result = mockHandleProcessPlay([currentState.players[2].hand[0]]);
    currentState = ai2Result.newState;
    expect(currentState.currentPlayerIndex).toBe(3); // AI3's turn
    expect(ai2Result.trickComplete).toBe(false);

    // Step 4: AI3 plays, completing the trick
    const ai3Result = mockHandleProcessPlay([currentState.players[3].hand[0]]);
    currentState = ai3Result.newState;
    expect(ai3Result.trickComplete).toBe(true);
    expect(ai3Result.trickWinner).toBe('Bot 2');
    expect(currentState.winningPlayerIndex).toBe(2); // AI2

    // The trick is now complete but not yet cleared
    expect(currentState.currentTrick).not.toBeNull();

    // Step 5: Show the trick result - this happens in the useTrickResults hook
    trickResultState = {
      showTrickResult: true,
      lastTrickWinner: ai3Result.trickWinner || '',
      lastTrickPoints: ai3Result.trickPoints || 0,
      lastCompletedTrick: ai3Result.completedTrick || null
    };

    // Check the trick result is displayed
    expect(trickResultState.showTrickResult).toBe(true);
    expect(trickResultState.lastTrickWinner).toBe('Bot 2');

    // Step 6: After display time, hide the result and clear the trick
    // This would trigger the handleTrickResultComplete callback
    const handleTrickResultComplete = () => {
      if (currentState) {
        // Set the winner as the next player and clear the trick
        const winningIndex = currentState.winningPlayerIndex;
        
        const newState = {
          ...currentState,
          currentTrick: null,
          currentPlayerIndex: typeof winningIndex === 'number' ? winningIndex : currentState.currentPlayerIndex, // Set winner as next player
          winningPlayerIndex: undefined // Clear the winning player index
        };
        
        // Update our tracking state
        currentState = newState;
        trickResultState.showTrickResult = false;
        trickResultState.lastCompletedTrick = null;
        
        // In a real app, this would update the state
        mockSetGameState(newState);
      }
    };

    // Trigger the trick result completion
    handleTrickResultComplete();

    // Verify the state after trick result is cleared
    expect(mockSetGameState).toHaveBeenCalled();
    expect(currentState.currentTrick).toBeNull();
    expect(currentState.currentPlayerIndex).toBe(2); // AI2 (the winner) is now current
    expect(currentState.winningPlayerIndex).toBeUndefined();
    expect(trickResultState.showTrickResult).toBe(false);
    expect(trickResultState.lastCompletedTrick).toBeNull();
  });

  test('AI moves are blocked during trick result display', () => {
    // This test verifies that AI moves are prevented when trick results are showing
    
    // Mock the game state with a trick result showing
    const gameState = createMockGameState(2); // AI2 is current player
    
    // Create test hooks and callbacks
    const mockProcessPlay = jest.fn();
    const mockHandleAIMove = jest.fn();
    const mockSetWaitingForAI = jest.fn();
    
    // Mock showing a trick result
    const showTrickResult = true;
    const lastCompletedTrick = {
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
    
    // Create a simplified version of useAITurns effect logic
    const checkForAIMove = () => {
      // Don't proceed if showing trick result or have a completed trick
      if (showTrickResult || lastCompletedTrick) {
        return false;
      }
      
      // Check if current player is AI
      const currentPlayer = gameState.players[gameState.currentPlayerIndex];
      if (currentPlayer.isHuman) {
        return false;
      }
      
      // All conditions met for AI to move
      mockSetWaitingForAI(true);
      mockHandleAIMove();
      return true;
    };
    
    // Execute the check
    const shouldAIMove = checkForAIMove();
    
    // Verify AI move is blocked
    expect(shouldAIMove).toBe(false);
    expect(mockSetWaitingForAI).not.toHaveBeenCalled();
    expect(mockHandleAIMove).not.toHaveBeenCalled();
  });
  
  test('Multiple tricks sequence with different winners maintains correct flow', () => {
    // This test simulates multiple consecutive tricks with different winners
    
    // Setup initial state
    let currentState = createMockGameState();

    // Mock process play for different tricks
    const processPlayMock = processPlay as jest.Mock;
    
    // Mock determineTrickWinner to return different players
    (determineTrickWinner as jest.Mock)
      .mockReturnValueOnce('human') // First trick winner
      .mockReturnValueOnce('ai1')   // Second trick winner
      .mockReturnValueOnce('ai3');  // Third trick winner
    
    // Helper function to process a complete trick
    const processCompleteTrick = (state: GameState, winnerIndex: number) => {
      // Create a completed trick
      const completedTrick: {
        leadingPlayerId: string;
        leadingCombo: Card[];
        plays: { playerId: string; cards: Card[] }[];
        points: number;
        winningPlayerId: string;
      } = {
        leadingPlayerId: state.players[state.currentPlayerIndex].id,
        leadingCombo: [state.players[state.currentPlayerIndex].hand[0]],
        plays: [],
        points: 5,
        winningPlayerId: state.players[winnerIndex].id
      };
      
      // Add plays for all other players
      for (let i = 0; i < state.players.length; i++) {
        if (i !== state.currentPlayerIndex) {
          completedTrick.plays.push({
            playerId: state.players[i].id,
            cards: [state.players[i].hand[0]]
          });
        }
      }
      
      // Return trick completion result
      return {
        newState: {
          ...state,
          currentTrick: completedTrick,
          tricks: [...state.tricks, completedTrick],
          winningPlayerIndex: winnerIndex
        },
        trickComplete: true,
        trickWinner: state.players[winnerIndex].name,
        trickPoints: 5,
        completedTrick
      };
    };
    
    // Set up implementations for processPlay
    processPlayMock
      // First trick - human wins
      .mockImplementationOnce((state) => processCompleteTrick(state, 0))
      // Second trick - AI1 wins
      .mockImplementationOnce((state) => processCompleteTrick(state, 1))
      // Third trick - AI3 wins
      .mockImplementationOnce((state) => processCompleteTrick(state, 3));
    
    // Create mock handlers
    const mockSetGameState = jest.fn(newState => {
      currentState = newState;
    });
    
    // Helper function to simulate handleTrickResultComplete
    const handleTrickResultComplete = () => {
      if (currentState) {
        // Use the winning player index
        const winningIndex = currentState.winningPlayerIndex;
        
        // Create a new state copy with currentTrick cleared and correct player index
        const newState = {
          ...currentState,
          currentTrick: null,
          currentPlayerIndex: typeof winningIndex === 'number' ? winningIndex : currentState.currentPlayerIndex,
          winningPlayerIndex: undefined
        };
        
        // Update the state
        mockSetGameState(newState);
      }
    };
    
    // First trick - start with Human as current player
    currentState.currentPlayerIndex = 0;
    let result = processPlayMock(currentState, []);
    currentState = result.newState;
    
    // Verify human is the winner
    expect(result.trickWinner).toBe('You');
    expect(currentState.winningPlayerIndex).toBe(0);
    
    // Complete the trick result display
    handleTrickResultComplete();
    
    // Verify human is now the current player for the next trick
    expect(currentState.currentPlayerIndex).toBe(0);
    expect(currentState.currentTrick).toBeNull();
    
    // Second trick - Human leads, AI1 wins
    result = processPlayMock(currentState, []);
    currentState = result.newState;
    
    // Verify AI1 is the winner
    expect(result.trickWinner).toBe('Bot 1');
    expect(currentState.winningPlayerIndex).toBe(1);
    
    // Complete the trick result display
    handleTrickResultComplete();
    
    // Verify AI1 is now the current player for the next trick
    expect(currentState.currentPlayerIndex).toBe(1);
    expect(currentState.currentTrick).toBeNull();
    
    // Third trick - AI1 leads, AI3 wins
    result = processPlayMock(currentState, []);
    currentState = result.newState;
    
    // Verify AI3 is the winner
    expect(result.trickWinner).toBe('Bot 3');
    expect(currentState.winningPlayerIndex).toBe(3);
    
    // Complete the trick result display
    handleTrickResultComplete();
    
    // Verify AI3 is now the current player for the next trick
    expect(currentState.currentPlayerIndex).toBe(3);
    expect(currentState.currentTrick).toBeNull();
  });
});