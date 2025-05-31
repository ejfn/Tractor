import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { View, Text, Button } from 'react-native';
import { useTrickResults } from '../../src/hooks/useTrickResults';
import { useGameState } from '../../src/hooks/useGameState';
import { processPlay } from '../../src/game/gamePlayManager';
import { createComponentTestGameState } from "../helpers";
import { 
  GameState, 
  Card, 
  Rank, 
  Suit,
  PlayerId,
  PlayerName
} from "../../src/types";

// Mock dependencies
jest.mock('../../src/game/gameLogic', () => ({
  ...jest.requireActual('../../src/game/gameLogic'),
  isTrump: jest.fn(),
  identifyCombos: jest.fn(),
  isValidPlay: jest.fn(),
  humanHasTrumpRank: jest.fn().mockReturnValue(false)
}));

jest.mock('../../src/game/gamePlayManager');


jest.mock('../../src/game/gameRoundManager', () => ({
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

  // Initialize state
  React.useEffect(() => {
    if (initialState) {
      gameStateHook.setGameState(initialState);
    } else {
      gameStateHook.initGame();
    }
  }, [initialState]);

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
  // Add a ref to track last processed timestamp (like the real implementation)
  const lastProcessedTrickTimestampRef = React.useRef(0);

  React.useEffect(() => {
    if (!gameStateHook.trickCompletionDataRef.current) return;

    // Only process if this is a new trick completion (check timestamp)
    if (
      gameStateHook.trickCompletionDataRef.current.timestamp >
      lastProcessedTrickTimestampRef.current
    ) {
      const data = gameStateHook.trickCompletionDataRef.current;
      
      // Update the last processed timestamp
      lastProcessedTrickTimestampRef.current = data.timestamp;
      
      // Set completed trick first
      trickResultsHook.setLastCompletedTrick(data.completedTrick);
      
      // Then trigger trick completion handling
      trickResultsHook.handleTrickCompletion(
        data.winnerId,
        data.points,
        data.completedTrick
      );
    }
  }, [
    gameStateHook.gameState?.currentPlayerIndex,
    gameStateHook.trickCompletionDataRef,
    trickResultsHook.handleTrickCompletion,
    trickResultsHook.setLastCompletedTrick,
    gameStateHook.gameState?.currentTrick,
  ]);

  return (
    <View>
      <Text testID="phase">{gameStateHook.gameState?.gamePhase}</Text>
      <Text testID="current-player-index">{gameStateHook.gameState?.currentPlayerIndex}</Text>
      <Text testID="show-trick-result">{trickResultsHook.showTrickResult ? 'true' : 'false'}</Text>
      <Text testID="last-trick-winner">{trickResultsHook.lastTrickWinnerId}</Text>
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
            leadingPlayerId: PlayerId.Human,
            leadingCombo: [],
            plays: [],
            winningPlayerId: PlayerId.Human,
            points: 10
          };
          
          trickResultsHook.handleTrickCompletion('test-winner-id', 10, mockCompletedTrick);
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

const createMockGameState = (currentPlayerIndex = 0): GameState => {
  const state = createComponentTestGameState();
  state.currentPlayerIndex = currentPlayerIndex;
  return state;
};

describe('Trick Completion Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should complete a trick when all 4 players have played', async () => {
    const mockState = createMockGameState();
    
    let stateHistory: any[] = [];
    
    const { getByTestId } = render(
      <TestComponent 
        initialState={mockState}
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
        { playerId: 'bot1', cards: [createMockCard('diamonds_3_1', Suit.Diamonds, Rank.Three)] },
        { playerId: 'bot2', cards: [createMockCard('spades_2_1', Suit.Spades, Rank.Two)] },
        { playerId: 'bot3', cards: [createMockCard('clubs_4_1', Suit.Clubs, Rank.Four)] }
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
      trickWinnerId: 'human',
      trickPoints: 5,
      completedTrick: mockTrick
    });

    // Simulate playing a card
    fireEvent.press(getByTestId('play-card'));
    
    // Verify trick is complete and result is shown
    await waitFor(() => {
      expect(stateHistory[stateHistory.length - 1].trickResults.showTrickResult).toBe(true);
      expect(stateHistory[stateHistory.length - 1].trickResults.lastTrickWinnerId).toBe('human');
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
      expect(latestState.trickResults.lastTrickWinnerId).toBe('test-winner-id');
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