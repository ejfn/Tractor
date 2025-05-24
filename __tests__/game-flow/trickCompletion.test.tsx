import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { View, Text, Button } from 'react-native';
import { useTrickResults } from '../../src/hooks/useTrickResults';
import { useGameState } from '../../src/hooks/useGameState';
import { processPlay } from '../../src/utils/gamePlayManager';
import { determineTrickWinner } from '../../src/utils/gameLogic';
import { 
  GameState, 
  Card, 
  Rank, 
  Suit
} from '../../src/types/game';

// Mock dependencies
jest.mock('../../src/utils/gameLogic', () => ({
  determineTrickWinner: jest.fn(),
  isTrump: jest.fn(),
  initializeGame: jest.fn(() => ({
    players: [{
      id: 'human',
      name: 'Human',
      isHuman: true,
      hand: [{
        id: 'spades_5_1',
        suit: 1, // Spades
        rank: 5,
        points: 5
      }],
      currentRank: 2,
      team: 'A'
    }, {
      id: 'ai1',
      name: 'Bot 1',
      isHuman: false,
      hand: [],
      currentRank: 2,
      team: 'B'
    }, {
      id: 'ai2',
      name: 'Bot 2',
      isHuman: false,
      hand: [],
      currentRank: 2,
      team: 'A'
    }, {
      id: 'ai3',
      name: 'Bot 3',
      isHuman: false,
      hand: [],
      currentRank: 2,
      team: 'B'
    }],
    teams: [{
      id: 'A',
      currentRank: 2,
      points: 0,
      isDefending: true
    }, {
      id: 'B', 
      currentRank: 2,
      points: 0,
      isDefending: false
    }],
    currentPlayerIndex: 0,
    gamePhase: 'playing',
    trumpInfo: {
      trumpRank: 2,
      declared: false
    },
    tricks: [],
    deck: [],
    kittyCards: [],
    roundNumber: 1,
    currentTrick: null
  })),
  identifyCombos: jest.fn(),
  isValidPlay: jest.fn(),
  humanHasTrumpRank: jest.fn().mockReturnValue(false)
}));

jest.mock('../../src/utils/gamePlayManager');

jest.mock('../../src/utils/trumpManager', () => ({
  declareTrumpSuit: jest.fn(),
  checkAITrumpDeclaration: jest.fn().mockReturnValue({ shouldDeclare: false }),
  humanHasTrumpRank: jest.fn().mockReturnValue(false)
}));

jest.mock('../../src/utils/gameRoundManager', () => ({
  prepareNextRound: jest.fn(),
  endRound: jest.fn()
}));

// Test component that uses the hooks
const TestComponent: React.FC<{
  initialState?: GameState,
  onStateChange?: (state: any) => void
}> = ({ initialState, onStateChange }) => {
  const gameStateHook = useGameState();

  const trickResultsHook = useTrickResults();

  // Initialize state if provided
  React.useEffect(() => {
    if (initialState) {
      gameStateHook.setGameState(initialState);
    }
  }, []);

  // Track state changes
  React.useEffect(() => {
    if (onStateChange) {
      onStateChange({
        gameState: gameStateHook.gameState,
        trickResults: trickResultsHook
      });
    }
  }, [gameStateHook.gameState, trickResultsHook, onStateChange]);

  // Connect hooks - need to use useEffect to ensure it's done after render  
  React.useEffect(() => {
    trickResultsHook.setTrickResultCompleteCallback(gameStateHook.handleTrickResultComplete);
  }, [gameStateHook.handleTrickResultComplete, trickResultsHook]);
  
  // Monitor trick completion data
  React.useEffect(() => {
    if (gameStateHook.trickCompletionDataRef.current) {
      const data = gameStateHook.trickCompletionDataRef.current;
      trickResultsHook.handleTrickCompletion(
        data.winnerName,
        data.points,
        data.completedTrick
      );
      trickResultsHook.setLastCompletedTrick(data.completedTrick);
    }
  }, [gameStateHook.gameState, gameStateHook.trickCompletionDataRef, trickResultsHook]);

  return (
    <View>
      <Text testID="phase">{gameStateHook.gameState?.gamePhase}</Text>
      <Text testID="current-player-index">{gameStateHook.gameState?.currentPlayerIndex}</Text>
      <Text testID="show-trick-result">{trickResultsHook.showTrickResult ? 'true' : 'false'}</Text>
      <Text testID="last-trick-winner">{trickResultsHook.lastTrickWinner}</Text>
      <Text testID="last-trick-points">{trickResultsHook.lastTrickPoints}</Text>
      <Text testID="last-completed-trick">{trickResultsHook.lastCompletedTrick ? 'exists' : 'null'}</Text>
      <Button
        testID="play-card"
        title="Play Card"
        onPress={() => {
          if (gameStateHook.gameState) {
            const currentPlayer = gameStateHook.gameState.players[gameStateHook.gameState.currentPlayerIndex];
            if (currentPlayer.hand.length > 0) {
              // Call handleProcessPlay directly to avoid timeout
              gameStateHook.handleProcessPlay([currentPlayer.hand[0]]);
            }
          }
        }}
      />
      <Button
        testID="complete-trick"
        title="Complete Trick"
        onPress={() => {
          const mockCompletedTrick = {
            leadingPlayerId: 'human',
            leadingCombo: [],
            plays: [],
            points: 10
          };
          
          trickResultsHook.handleTrickCompletion('Test Winner', 10, mockCompletedTrick);
          trickResultsHook.setLastCompletedTrick(mockCompletedTrick);
        }}
      />
    </View>
  );
};

// Helper to create mock cards
const createMockCard = (id: string, suit: Suit, rank: Rank, points = 0): Card => ({
  id,
  suit,
  rank,
  points
});

// Create mock game state
const createMockGameState = (currentPlayerIndex = 0): GameState => {
  return {
    players: [
      {
        id: 'human',
        name: 'Human',
        isHuman: true,
        hand: [
          createMockCard('spades_5_1', Suit.Spades, Rank.Five, 5),
          createMockCard('hearts_k_1', Suit.Hearts, Rank.King, 10)
        ],
        team: 'A'
      },
      {
        id: 'ai1',
        name: 'Bot 1',
        isHuman: false,
        hand: [
          createMockCard('diamonds_3_1', Suit.Diamonds, Rank.Three),
          createMockCard('clubs_j_1', Suit.Clubs, Rank.Jack)
        ],
        team: 'B'
      },
      {
        id: 'ai2',
        name: 'Bot 2',
        isHuman: false,
        hand: [
          createMockCard('spades_2_1', Suit.Spades, Rank.Two),
          createMockCard('hearts_q_1', Suit.Hearts, Rank.Queen)
        ],
        team: 'A'
      },
      {
        id: 'ai3',
        name: 'Bot 3',
        isHuman: false,
        hand: [
          createMockCard('clubs_4_1', Suit.Clubs, Rank.Four),
          createMockCard('diamonds_6_1', Suit.Diamonds, Rank.Six)
        ],
        team: 'B'
      }
    ],
    teams: [
      { id: 'A', currentRank: Rank.Two, isDefending: true, points: 0 },
      { id: 'B', currentRank: Rank.Two, isDefending: false, points: 0 }
    ],
    trumpInfo: {
      trumpRank: Rank.Two,
      declared: false,
      trumpSuit: undefined
    },
    gamePhase: 'playing',
    currentPlayerIndex: currentPlayerIndex,
    currentTrick: null,
    deck: [],
    kittyCards: [],
    tricks: [],
    roundNumber: 1
  };
};

describe('Trick Completion Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should complete a trick when all 4 players have played', async () => {
    const mockState = createMockGameState();
    
    // Mock initializeGame to return our state
    const mockInitializeGame = require('../../src/utils/gameLogic').initializeGame;
    mockInitializeGame.mockReturnValue(mockState);
    
    let stateHistory: any[] = [];
    
    const { getByTestId } = render(
      <TestComponent 
        onStateChange={(state) => stateHistory.push(state)}
      />
    );

    // Wait for initial render
    await waitFor(() => {
      expect(stateHistory.length).toBeGreaterThan(0);
    });

    // Mock processPlay to simulate a complete trick
    const mockTrick = {
      leadingPlayerId: 'human',
      leadingCombo: [createMockCard('spades_5_1', Suit.Spades, Rank.Five, 5)],
      plays: [
        { playerId: 'ai1', cards: [createMockCard('diamonds_3_1', Suit.Diamonds, Rank.Three)] },
        { playerId: 'ai2', cards: [createMockCard('spades_2_1', Suit.Spades, Rank.Two)] },
        { playerId: 'ai3', cards: [createMockCard('clubs_4_1', Suit.Clubs, Rank.Four)] }
      ],
      points: 5
    };
    
    (processPlay as jest.Mock).mockReturnValue({
      newState: {
        ...stateHistory[stateHistory.length - 1].gameState,
        currentPlayerIndex: 0,
        currentTrick: null // Trick should be null after completion
      },
      trickComplete: true,
      trickWinner: 'You',
      trickPoints: 5,
      completedTrick: mockTrick
    });

    // Simulate playing a card
    fireEvent.press(getByTestId('play-card'));
    
    // Verify trick is complete and result is shown
    await waitFor(() => {
      expect(stateHistory[stateHistory.length - 1].trickResults.showTrickResult).toBe(true);
      expect(stateHistory[stateHistory.length - 1].trickResults.lastTrickWinner).toBe('You');
    });
  });

  test('should show trick result and then clear it', async () => {
    let stateHistory: any[] = [];
    
    const { getByTestId } = render(
      <TestComponent 
        onStateChange={(state) => stateHistory.push(state)}
      />
    );

    // Wait for initial state
    await waitFor(() => {
      expect(stateHistory.length).toBeGreaterThan(0);
    });

    // Initially no trick result
    expect(getByTestId('show-trick-result').props.children).toBe('false');
    expect(getByTestId('last-completed-trick').props.children).toBe('null');

    // Complete a trick using the button
    fireEvent.press(getByTestId('complete-trick'));

    // Result should be shown
    await waitFor(() => {
      const latestState = stateHistory[stateHistory.length - 1];
      expect(latestState.trickResults.showTrickResult).toBe(true);
      expect(latestState.trickResults.lastTrickWinner).toBe('Test Winner');
      expect(latestState.trickResults.lastTrickPoints).toBe(10);
      expect(latestState.trickResults.lastCompletedTrick).toBeTruthy();
    });

    // Wait for result to be hidden (should happen after 2 seconds)
    await waitFor(() => {
      const latestState = stateHistory[stateHistory.length - 1];
      expect(latestState.trickResults.showTrickResult).toBe(false);
    }, { timeout: 3000 });

    // Completed trick should be cleared after result is hidden
    await waitFor(() => {
      const latestState = stateHistory[stateHistory.length - 1];
      expect(latestState.trickResults.lastCompletedTrick).toBeNull();
    });
  });

  test('should handle trick result display timing correctly', async () => {
    let stateHistory: any[] = [];
    
    const { getByTestId } = render(
      <TestComponent 
        onStateChange={(state) => stateHistory.push(state)}
      />
    );

    // Wait for initial state
    await waitFor(() => {
      expect(stateHistory.length).toBeGreaterThan(0);
    });

    // Complete a trick
    fireEvent.press(getByTestId('complete-trick'));

    // Verify the sequence:
    // 1. Result is shown
    await waitFor(() => {
      const latestState = stateHistory[stateHistory.length - 1];
      expect(latestState.trickResults.showTrickResult).toBe(true);
      expect(latestState.trickResults.lastCompletedTrick).toBeTruthy();
    });

    // 2. Result stays visible for the duration
    await new Promise(resolve => setTimeout(resolve, 1000));
    const midState = stateHistory[stateHistory.length - 1];
    expect(midState.trickResults.showTrickResult).toBe(true);

    // 3. Result is hidden after timeout
    await waitFor(() => {
      const latestState = stateHistory[stateHistory.length - 1];
      expect(latestState.trickResults.showTrickResult).toBe(false);
    }, { timeout: 2000 });

    // 4. Completed trick is cleared
    await waitFor(() => {
      const latestState = stateHistory[stateHistory.length - 1];
      expect(latestState.trickResults.lastCompletedTrick).toBeNull();
    });
  });
});