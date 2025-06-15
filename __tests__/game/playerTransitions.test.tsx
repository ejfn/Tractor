import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Button, Text, View } from 'react-native';
import { processPlay } from '../../src/game/playProcessing';
import { useAITurns } from '../../src/hooks/useAITurns';
import { useGameState } from '../../src/hooks/useGameState';
import {
  Card,
  GameState,
  Player,
  PlayerId,
  Rank,
  Suit
} from "../../src/types";
import { createComponentTestGameState } from "../helpers";
import { gameLogger } from '../../src/utils/gameLogger';

// Mock dependencies
jest.mock('../../src/game/comboDetection', () => ({
  ...jest.requireActual('../../src/game/comboDetection'),
  identifyCombos: jest.fn(),
}));

jest.mock('../../src/game/playProcessing', () => ({
  ...jest.requireActual('../../src/game/playProcessing'),
  isValidPlay: jest.fn().mockReturnValue(true),
  processPlay: jest.fn(),
  getAIMoveWithErrorHandling: jest.fn().mockReturnValue({
    cards: [{
      id: 'test_card',
      suit: 1,
      rank: 3,
      points: 0
    }]
  }),
  validatePlay: jest.fn().mockReturnValue(true)
}));

jest.mock('../../src/game/gameHelpers', () => ({
  ...jest.requireActual('../../src/game/gameHelpers'),
  isTrump: jest.fn(),
}));


jest.mock('../../src/ai/aiLogic', () => ({
  getAIMove: jest.fn().mockReturnValue([{
    id: 'ai_card',
    suit: 1,
    rank: 4,
    points: 0
  }])
}));

jest.mock('../../src/game/gameRoundManager', () => ({
  prepareNextRound: jest.fn(),
  endRound: jest.fn()
}));

// Create a test component that uses both hooks
interface TestComponentProps {
  initialState?: GameState;
  onStateChange?: (state: any) => void;
}

const TestComponent: React.FC<TestComponentProps> = ({ initialState, onStateChange }) => {
  const gameStateHook = useGameState();

  const aiTurnsHook = useAITurns(
    gameStateHook.gameState,
    gameStateHook.handleProcessPlay,
    gameStateHook.setGameState,
    false, // showTrickResult
    null,  // lastCompletedTrick
    false  // showRoundComplete
  );

  // Initialize game state
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
      gameLogger.info('test_state_update', { currentPlayerIndex: gameStateHook.gameState?.currentPlayerIndex }, 'Updating state: ' + JSON.stringify(gameStateHook.gameState));
      onStateChange({
        gameState: gameStateHook.gameState,
        aiState: aiTurnsHook
      });
    }
  }, [gameStateHook.gameState, aiTurnsHook, onStateChange]);

  return (
    <View>
      <Text testID="current-player-index">
        {gameStateHook.gameState?.currentPlayerIndex}
      </Text>
      <Text testID="current-player-name">
        {gameStateHook.gameState?.players[gameStateHook.gameState.currentPlayerIndex]?.name}
      </Text>
      <Text testID="winning-player-index">
      </Text>
      <Text testID="ai-thinking">
        {aiTurnsHook.waitingForAI ? 'thinking' : 'idle'}
      </Text>
      <Button
        testID="simulate-play"
        title="Simulate Play"
        onPress={() => {
          if (gameStateHook.gameState) {
            const currentPlayer = gameStateHook.gameState.players[gameStateHook.gameState.currentPlayerIndex];
            if (currentPlayer.hand.length > 0) {
              // Call handleProcessPlay directly to avoid timing issues
              gameStateHook.handleProcessPlay([currentPlayer.hand[0]]);
            }
          }
        }}
      />
    </View>
  );
};

// Helper function to create mock cards
const createMockCard = (id: string, suit: Suit, rank: Rank, points = 0): Card => 
  Card.createCard(suit, rank, 0);

const createMockGameState = (currentPlayerIndex = 0): GameState => {
  const state = createComponentTestGameState();
  state.currentPlayerIndex = currentPlayerIndex;
  return state;
};

describe('Player Transitions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Human player winning a trick becomes the next leader', async () => {
    const mockState = createMockGameState(3); // Start with AI3's turn
    
    // Setup a trick in progress
    mockState.currentTrick = {
      plays: [
        {
          playerId: PlayerId.Bot1,
          cards: [createMockCard('diamonds_3_1', Suit.Diamonds, Rank.Three)]
        },
        {
          playerId: PlayerId.Human,
          cards: [createMockCard('spades_5_1', Suit.Spades, Rank.Five, 5)]
        },
        {
          playerId: PlayerId.Bot2,
          cards: [createMockCard('spades_2_1', Suit.Spades, Rank.Two)]
        }
      ],
      winningPlayerId: PlayerId.Bot2,
      points: 5
    };

    // Mock processPlay to complete the trick
    (processPlay as jest.Mock).mockImplementation((state, cards) => {
      const updatedState = {
        ...state,
        currentPlayerIndex: 0, // Human becomes next player
        currentTrick: null, // Trick is cleared after completion
        players: state.players.map((p: Player) => ({
          ...p,
          hand: p.id === PlayerId.Bot3 ? p.hand.filter((c: Card) => c.id !== cards[0].id) : p.hand
        }))
      };
      
      return {
        newState: updatedState,
        trickComplete: true,
        trickWinner: 'You',
        trickPoints: 5,
        completedTrick: {
          ...state.currentTrick,
          plays: [
            ...state.currentTrick!.plays,
            {
              playerId: PlayerId.Bot3,
              cards: [cards[0]]
            }
          ]
        }
      };
    });


    let stateChanges: any[] = [];
    
    const { getByTestId, debug } = render(
      <TestComponent 
        initialState={mockState}
        onStateChange={(state) => stateChanges.push(state)}
      />
    );

    // Wait for initial state
    await waitFor(() => {
      expect(stateChanges.length).toBeGreaterThan(0);
    });

    // Simulate the play
    fireEvent.press(getByTestId('simulate-play'));

    // Wait for state update after play
    await waitFor(() => {
      const latestState = stateChanges[stateChanges.length - 1];
    }, { timeout: 3000 });

    // Verify the human is set as next player after trick completion
    await waitFor(() => {
      const finalState = stateChanges[stateChanges.length - 1];
      expect(finalState.gameState.currentPlayerIndex).toBe(0);
    }, { timeout: 3000 });
  });


  test('Trick winner becomes next player after completion', async () => {
    const mockState = createMockGameState(3); // Start with AI3 about to complete a trick
    
    // Set up current trick
    mockState.currentTrick = {
      plays: [
        {
          playerId: PlayerId.Bot2,
          cards: [createMockCard('hearts_k_1', Suit.Hearts, Rank.King, 10)]
        },
        {
          playerId: PlayerId.Human,
          cards: [createMockCard('spades_5_1', Suit.Spades, Rank.Five, 5)]
        },
        {
          playerId: PlayerId.Bot1,
          cards: [createMockCard('diamonds_3_1', Suit.Diamonds, Rank.Three)]
        }
      ],
      winningPlayerId: PlayerId.Bot2,
      points: 15
    };

    // Mock processPlay to complete trick with Bot 2 as winner
    (processPlay as jest.Mock).mockImplementation((state, cards) => {
      const updatedState = {
        ...state,
        currentPlayerIndex: 2, // Bot 2 becomes next player
        currentTrick: null,
        players: state.players.map((p: Player) => ({
          ...p,
          hand: p.id === PlayerId.Bot3 ? p.hand.filter((c: Card) => c.id !== cards[0].id) : p.hand
        }))
      };
      
      return {
        newState: updatedState,
        trickComplete: true,
        trickWinner: 'Bot 2',
        trickPoints: 15
      };
    });

    let stateChanges: any[] = [];
    
    const { getByTestId } = render(
      <TestComponent 
        initialState={mockState}
        onStateChange={(state) => stateChanges.push(state)}
      />
    );

    // Wait for initial state
    await waitFor(() => {
      expect(stateChanges.length).toBeGreaterThan(0);
    });

    // Simulate the final play that completes the trick
    fireEvent.press(getByTestId('simulate-play'));

    // Wait for state to be updated with winner
    await waitFor(() => {
      const latestState = stateChanges[stateChanges.length - 1];
    }, { timeout: 3000 });

    // Verify winning player becomes current player after trick
    await waitFor(() => {
      const finalState = stateChanges[stateChanges.length - 1];
      expect(finalState.gameState.currentPlayerIndex).toBe(2);
    }, { timeout: 3000 });
  });
});