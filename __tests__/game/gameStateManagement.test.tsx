import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { View, Text, Button } from 'react-native';
import { useGameState } from '../../src/hooks/useGameState';
import {
  Card,
  Rank,
  Suit,
  JokerType,
  Trick,
  GamePhase,
  PlayerId
} from "../../src/types";
import { createComponentTestGameState } from "../helpers";

// Mock dependencies
jest.mock('../../src/game/comboDetection', () => ({
  identifyCombos: jest.fn(),
}));

jest.mock('../../src/game/playProcessing', () => ({
  isValidPlay: jest.fn(),
}));

jest.mock('../../src/game/gameHelpers', () => ({
  isTrump: jest.fn(),
}));

jest.mock('../../src/utils/gameInitialization', () => ({
  initializeGame: jest.fn(),
}));

const mockInitializeGame = require('../../src/utils/gameInitialization').initializeGame;

jest.mock('../../src/game/playProcessing', () => ({
  processPlay: jest.fn(),
  validatePlay: jest.fn(),
  clearCompletedTrick: jest.fn((state) => ({
    ...state,
    currentTrick: null,
    currentPlayerIndex: 2
  }))
}));


jest.mock('../../src/game/gameRoundManager', () => ({
  prepareNextRound: jest.fn(),
  endRound: jest.fn()
}));

// Test component that uses the useGameState hook
const TestComponent: React.FC<{ onStateChange?: (state: any) => void }> = ({ onStateChange }) => {
  const gameStateHook = useGameState();

  // Call onStateChange whenever state changes
  React.useEffect(() => {
    if (onStateChange) {
      onStateChange(gameStateHook);
    }
  }, [gameStateHook, onStateChange]);

  return (
    <View>
      <Text testID="game-phase">{gameStateHook.gameState?.gamePhase || 'none'}</Text>
      <Text testID="current-player-index">{gameStateHook.gameState?.currentPlayerIndex}</Text>
      <Button 
        testID="trick-complete-button"
        title="Complete Trick" 
        onPress={() => gameStateHook.handleTrickResultComplete()}
      />
      <Button
        testID="select-card-button"
        title="Select Card"
        onPress={() => {
          if (gameStateHook.gameState?.players[0]?.hand[0]) {
            gameStateHook.handleCardSelect(gameStateHook.gameState.players[0].hand[0]);
          }
        }}
      />
    </View>
  );
};

// Use shared utility for component testing game state
const createMockGameState = createComponentTestGameState;

describe('Game State Management', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('handles trick completion correctly', async () => {
    // Setup mock game state
    const mockState = createMockGameState();
    mockState.currentTrick = {
      plays: [
        {
          playerId: PlayerId.Human,
          cards: [Card.createCard(Suit.Spades, Rank.Five, 0)]
        },
        {
          playerId: PlayerId.Bot1,
          cards: [Card.createCard(Suit.Diamonds, Rank.Three, 0)]
        },
        {
          playerId: PlayerId.Bot2,
          cards: [Card.createCard(Suit.Spades, Rank.Two, 0)]
        },
        {
          playerId: PlayerId.Bot3,
          cards: [Card.createCard(Suit.Clubs, Rank.Four, 0)]
        }
      ],
      points: 5,
      winningPlayerId: PlayerId.Bot2 // bot2's Spades 2 wins because 2 is trump rank
    };

    // Mock initializeGame to return our mock state
    mockInitializeGame.mockReturnValue(mockState);

    let currentHookState: any = null;
    
    // Render the test component
    const { getByTestId, rerender } = render(
      <TestComponent 
        onStateChange={(state) => { currentHookState = state; }}
      />
    );

    // Wait for initial state to be set
    await waitFor(() => {
      expect(currentHookState?.gameState).toBeTruthy();
    });

    // The state should already have our mock data from initializeGame
    
    // Trigger trick result complete
    fireEvent.press(getByTestId('trick-complete-button'));
    
    // Check state after completion
    await waitFor(() => {
      expect(currentHookState.gameState.currentPlayerIndex).toBe(2);
      expect(currentHookState.gameState.currentTrick).toBeNull();
    });
  });

  test('initializes game state correctly', async () => {
    const mockState = createMockGameState();
    const mockInitializeGame = require('../../src/utils/gameInitialization').initializeGame;
    mockInitializeGame.mockReturnValue(mockState);

    const { getByTestId } = render(<TestComponent />);

    await waitFor(() => {
      expect(getByTestId('game-phase').props.children).toBe('playing');
      expect(getByTestId('current-player-index').props.children).toBe(0);
    });
  });

  test('handles card selection properly', async () => {
    const mockState = createMockGameState();
    mockState.gamePhase = GamePhase.Playing;
    
    const mockInitializeGame = require('../../src/utils/gameInitialization').initializeGame;
    mockInitializeGame.mockReturnValue(mockState);

    let currentHookState: any = null;
    
    const { getByTestId } = render(
      <TestComponent 
        onStateChange={(state) => { currentHookState = state; }}
      />
    );

    await waitFor(() => {
      expect(currentHookState?.gameState).toBeTruthy();
    });

    // Trigger card selection
    fireEvent.press(getByTestId('select-card-button'));

    await waitFor(() => {
      expect(currentHookState.selectedCards).toHaveLength(1);
      expect(currentHookState.selectedCards[0].suit).toBe(Suit.Spades);
      expect(currentHookState.selectedCards[0].rank).toBe(Rank.Five);
    });
  });
});