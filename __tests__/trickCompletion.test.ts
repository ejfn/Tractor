import { processPlay } from '../src/utils/gamePlayManager';
import { determineTrickWinner } from '../src/utils/gameLogic';
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

const createMockGameState = (): GameState => {
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
    currentPlayerIndex: 0,
    currentTrick: null,
    tricks: [],
    deck: [],
    kittyCards: []
  };
};

// Mock determineTrickWinner
jest.mock('../src/utils/gameLogic', () => ({
  determineTrickWinner: jest.fn(),
  // Need to include other functions that might be imported elsewhere
  isTrump: jest.fn(),
}));

describe('Trick Completion Flow', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should complete a trick when all 4 players have played', () => {
    const mockState = createMockGameState();
    
    // Start a trick with human player
    const humanCard = mockState.players[0].hand[0]; // Spades 5
    let result = processPlay(mockState, [humanCard]);
    
    // Trick is not complete yet
    expect(result.trickComplete).toBe(false);
    expect(result.newState.currentPlayerIndex).toBe(1); // ai1's turn
    
    // AI1 plays a card
    const ai1Card = result.newState.players[1].hand[0]; // Diamonds 3
    result = processPlay(result.newState, [ai1Card]);
    
    // Trick is not complete yet
    expect(result.trickComplete).toBe(false);
    expect(result.newState.currentPlayerIndex).toBe(2); // ai2's turn
    
    // AI2 plays a card
    const ai2Card = result.newState.players[2].hand[0]; // Spades 2
    result = processPlay(result.newState, [ai2Card]);
    
    // Trick is not complete yet
    expect(result.trickComplete).toBe(false);
    expect(result.newState.currentPlayerIndex).toBe(3); // ai3's turn
    
    // Mock determineTrickWinner to return human as winner
    (determineTrickWinner as jest.Mock).mockReturnValue('human');
    
    // AI3 plays the final card
    const ai3Card = result.newState.players[3].hand[0]; // Clubs 4
    result = processPlay(result.newState, [ai3Card]);
    
    // Trick is now complete
    expect(result.trickComplete).toBe(true);
    expect(result.trickWinner).toBe('You'); // human player
    expect(result.trickPoints).toBe(5); // 5 points from Spades 5
    
    // Check that the trick has been saved
    expect(result.newState.tricks).toHaveLength(1);
    
    // UPDATED: currentTrick is no longer cleared immediately, as we keep it visible 
    // for the result display according to our new logic
    expect(result.newState.currentTrick).not.toBeNull();
    
    // Check that currentPlayerIndex is set to the winner
    expect(result.newState.currentPlayerIndex).toBe(0); // human player
    
    // Check the completed trick structure
    const completedTrick = result.completedTrick;
    expect(completedTrick).toBeTruthy();
    
    // Ensure completedTrick exists before accessing its properties (for TypeScript)
    if (completedTrick) {
      // In a 4-player game, a completed trick has:
      // - Exactly 1 leadingCombo (with 1 card for singles)
      // - Exactly 3 plays (one from each other player)
      expect(completedTrick.leadingCombo).toHaveLength(1);
      expect(completedTrick.plays).toHaveLength(3);
      
      // Check that the winning player ID is attached to the trick
      expect(completedTrick.winningPlayerId).toBe('human');
    }
  });

  test('useTrickResults should handle trick completion and clearing properly', async () => {
    // Create a mock trick result handler
    const onTrickResultComplete = jest.fn();
    
    // Mock timers for more predictable tests
    jest.useFakeTimers();
    
    // Render the hook
    const { result, waitForNextUpdate } = renderHook(() => useTrickResults());
    
    // Register our completion callback
    act(() => {
      result.current.setTrickResultCompleteCallback(onTrickResultComplete);
    });
    
    // Create a mock completed trick
    const mockCompletedTrick = {
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
      winningPlayerId: 'human'
    };
    
    // First set the completed trick
    act(() => {
      result.current.setLastCompletedTrick(mockCompletedTrick);
    });
    
    // Then trigger the trick completion handler
    act(() => {
      result.current.handleTrickCompletion('You', 5, mockCompletedTrick);
    });
    
    // Verify result is showing
    expect(result.current.showTrickResult).toBe(true);
    expect(result.current.lastTrickWinner).toBe('You');
    expect(result.current.lastTrickPoints).toBe(5);
    expect(result.current.lastCompletedTrick).toBe(mockCompletedTrick);
    
    // Wait for auto-hide timer to complete (2 seconds)
    act(() => {
      // Fast-forward past the timeout
      jest.advanceTimersByTime(2500);
    });
    
    // Now verify the state after the timer has completed
    expect(result.current.showTrickResult).toBe(false);
    expect(onTrickResultComplete).toHaveBeenCalledTimes(1);
    expect(result.current.lastCompletedTrick).toBeNull();
    
    // Restore timers
    jest.useRealTimers();
  });

  test('useTrickResults should handle the safety timer properly', () => {
    // Create a mock trick result handler
    const onTrickResultComplete = jest.fn();
    
    // Mock timers for more predictable tests
    jest.useFakeTimers();
    
    // Render the hook
    const { result } = renderHook(() => useTrickResults());
    
    // Register our completion callback
    act(() => {
      result.current.setTrickResultCompleteCallback(onTrickResultComplete);
    });
    
    // Create a mock completed trick
    const mockCompletedTrick = {
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
      winningPlayerId: 'human'
    };
    
    // Set the completed trick but DON'T show the result,
    // which should trigger the safety timer
    act(() => {
      result.current.setLastCompletedTrick(mockCompletedTrick);
    });
    
    // Verify initial state
    expect(result.current.showTrickResult).toBe(false);
    expect(result.current.lastCompletedTrick).toBe(mockCompletedTrick);
    
    // Fast-forward past the safety timeout (4 seconds)
    act(() => {
      jest.advanceTimersByTime(4500);
    });
    
    // Safety callback should have been triggered
    expect(onTrickResultComplete).toHaveBeenCalledTimes(1);
    
    // Completed trick should be cleared
    expect(result.current.lastCompletedTrick).toBeNull();
    
    // Restore timers
    jest.useRealTimers();
  });

  test('A full sequence of 4 players completing a trick shows and clears results', () => {
    const mockState = createMockGameState();
    
    // Mock timers for more predictable tests
    jest.useFakeTimers();
    
    // Setup trick result hooks
    const onTrickResultComplete = jest.fn();
    const { result: trickHook } = renderHook(() => useTrickResults());
    
    // Register our completion callback
    act(() => {
      trickHook.current.setTrickResultCompleteCallback(onTrickResultComplete);
    });
    
    // 1. Human player leads
    const humanCard = mockState.players[0].hand[0]; // Spades 5
    let playResult = processPlay(mockState, [humanCard]);
    
    // Check leading play initialized a trick
    expect(playResult.newState.currentTrick).toBeTruthy();
    expect(playResult.trickComplete).toBe(false);
    
    // 2. AI1 plays
    const ai1Card = playResult.newState.players[1].hand[0]; // Diamonds 3
    playResult = processPlay(playResult.newState, [ai1Card]);
    
    // 3. AI2 plays
    const ai2Card = playResult.newState.players[2].hand[0]; // Spades 2
    playResult = processPlay(playResult.newState, [ai2Card]);
    
    // 4. AI3 plays the final card, completing the trick
    // Mock determineTrickWinner to return human as winner
    (determineTrickWinner as jest.Mock).mockReturnValue('human');
    const ai3Card = playResult.newState.players[3].hand[0]; // Clubs 4
    playResult = processPlay(playResult.newState, [ai3Card]);
    
    // Verify the trick is complete
    expect(playResult.trickComplete).toBe(true);
    expect(playResult.trickWinner).toBe('You'); // Human player
    expect(playResult.trickPoints).toBe(5);
    
    // Verify currentTrick still exists (not cleared immediately)
    expect(playResult.newState.currentTrick).not.toBeNull();
    
    // 5. Now handle the completed trick with our UI hooks
    const { completedTrick } = playResult;
    
    expect(completedTrick).toBeTruthy();
    
    // 6. Set the completed trick in UI state
    act(() => {
      trickHook.current.setLastCompletedTrick(completedTrick!);
    });
    
    // 7. Show the trick result
    act(() => {
      trickHook.current.handleTrickCompletion('You', 5, completedTrick!);
    });
    
    // Verify result is showing immediately
    expect(trickHook.current.showTrickResult).toBe(true);
    expect(trickHook.current.lastTrickWinner).toBe('You');
    expect(trickHook.current.lastTrickPoints).toBe(5);
    expect(trickHook.current.lastCompletedTrick).toBe(completedTrick);
    
    // 8. Fast-forward past the auto-hide timer (2 seconds)
    act(() => {
      jest.advanceTimersByTime(2500);
    });
    
    // Result should be hidden after timer
    expect(trickHook.current.showTrickResult).toBe(false);
    
    // Clear state callback should have been called
    expect(onTrickResultComplete).toHaveBeenCalledTimes(1);
    
    // lastCompletedTrick should be cleared
    expect(trickHook.current.lastCompletedTrick).toBeNull();
    
    // Restore timers
    jest.useRealTimers();
  });
});