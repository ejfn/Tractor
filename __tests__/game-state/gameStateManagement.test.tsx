import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { View, Text, Button } from 'react-native';
import { useGameState } from '../../src/hooks/useGameState';
import {
  GameState,
  Card,
  Rank,
  Suit,
  JokerType,
  Trick
} from '../../src/types/game';

// Mock dependencies
jest.mock('../../src/utils/gameLogic', () => ({
  initializeGame: jest.fn(),
  identifyCombos: jest.fn(),
  isValidPlay: jest.fn(),
  determineTrickWinner: jest.fn(),
  isTrump: jest.fn(),
  humanHasTrumpRank: jest.fn().mockReturnValue(false)
}));

const mockInitializeGame = require('../../src/utils/gameLogic').initializeGame;

jest.mock('../../src/utils/gamePlayManager', () => ({
  processPlay: jest.fn(),
  validatePlay: jest.fn()
}));

jest.mock('../../src/utils/trumpManager', () => ({
  declareTrumpSuit: jest.fn(),
  checkAITrumpDeclaration: jest.fn().mockReturnValue({ shouldDeclare: false }),
  humanHasTrumpRank: jest.fn().mockReturnValue(false)
}));

jest.mock('../../src/utils/gameRoundManager', () => ({
  prepareNextRound: jest.fn(),
  endRound: jest.fn()
}));

// Test component that uses the useGameState hook
const TestComponent: React.FC<{ onStateChange?: (state: any) => void }> = ({ onStateChange }) => {
  const gameStateHook = useGameState({
    playerName: 'Test Player',
    teamNames: ['Team A', 'Team B'],
    startingRank: Rank.Two
  });

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
      <Text testID="winning-player-index">{gameStateHook.gameState?.winningPlayerIndex}</Text>
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

// Helper functions
const createMockCard = (id: string, suit: Suit, rank: Rank, points = 0): Card => ({
  id,
  suit,
  rank,
  points
});

const createMockJoker = (id: string, type: JokerType, points = 0): Card => ({
  id,
  joker: type,
  points,
  suit: undefined,
  rank: undefined
});

// Create a mock game state
const createMockGameState = (): GameState => {
  return {
    players: [
      {
        id: 'human',
        name: 'Test Player',
        hand: [
          createMockCard('spades_5_1', Suit.Spades, Rank.Five, 5),
          createMockCard('hearts_k_1', Suit.Hearts, Rank.King, 10)
        ],
        isHuman: true,
        team: 'A',
        currentRank: Rank.Two
      },
      {
        id: 'ai1',
        name: 'Bot 1',
        hand: [
          createMockCard('diamonds_3_1', Suit.Diamonds, Rank.Three),
          createMockCard('clubs_j_1', Suit.Clubs, Rank.Jack)
        ],
        isHuman: false,
        team: 'B',
        currentRank: Rank.Two
      },
      {
        id: 'ai2',
        name: 'Bot 2',
        hand: [
          createMockCard('spades_2_1', Suit.Spades, Rank.Two),
          createMockCard('hearts_q_1', Suit.Hearts, Rank.Queen)
        ],
        isHuman: false,
        team: 'A',
        currentRank: Rank.Two
      },
      {
        id: 'ai3',
        name: 'Bot 3',
        hand: [
          createMockCard('clubs_4_1', Suit.Clubs, Rank.Four),
          createMockCard('diamonds_6_1', Suit.Diamonds, Rank.Six)
        ],
        isHuman: false,
        team: 'B',
        currentRank: Rank.Two
      }
    ],
    teams: [
      { id: 'A', currentRank: Rank.Two, isDefending: true, players: ['human', 'ai2'], points: 0 },
      { id: 'B', currentRank: Rank.Two, isDefending: false, players: ['ai1', 'ai3'], points: 0 }
    ],
    currentPlayerIndex: 0,
    trumpInfo: {
      trumpRank: Rank.Two,
      declared: false,
      trumpSuit: undefined
    },
    gamePhase: 'playing' as const,
    deck: [],
    currentTrick: null,
    kittyCards: [],
    tricks: [],
    roundNumber: 1
  };
};

describe('Game State Management', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('winningPlayerIndex is properly stored and used in handleTrickResultComplete', async () => {
    // Setup mock game state
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
      points: 5
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
    expect(currentHookState.gameState.winningPlayerIndex).toBe(2);
    
    // Check initial state
    expect(getByTestId('winning-player-index').props.children).toBe(2);
    
    // Trigger trick result complete
    fireEvent.press(getByTestId('trick-complete-button'));
    
    // Check state after completion
    await waitFor(() => {
      expect(currentHookState.gameState.currentPlayerIndex).toBe(2);
      expect(currentHookState.gameState.currentTrick).toBeNull();
      expect(currentHookState.gameState.winningPlayerIndex).toBeUndefined();
    });
  });

  test('initializes game state correctly', async () => {
    const mockState = createMockGameState();
    const mockInitializeGame = require('../../src/utils/gameLogic').initializeGame;
    mockInitializeGame.mockReturnValue(mockState);

    const { getByTestId } = render(<TestComponent />);

    await waitFor(() => {
      expect(getByTestId('game-phase').props.children).toBe('playing');
      expect(getByTestId('current-player-index').props.children).toBe(0);
    });
  });

  test('handles card selection properly', async () => {
    const mockState = createMockGameState();
    mockState.gamePhase = 'playing';
    
    const mockInitializeGame = require('../../src/utils/gameLogic').initializeGame;
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
      expect(currentHookState.selectedCards[0].id).toBe('spades_5_1');
    });
  });
});