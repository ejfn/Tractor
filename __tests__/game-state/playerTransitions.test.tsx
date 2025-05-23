import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { View, Text, Button } from 'react-native';
import { useGameState } from '../../src/hooks/useGameState';
import { useAITurns } from '../../src/hooks/useAITurns';
import { processPlay } from '../../src/utils/gamePlayManager';
import { determineTrickWinner } from '../../src/utils/gameLogic';
import { createComponentTestGameState } from '../helpers/testUtils';
import { 
  GameState, 
  Card, 
  Rank, 
  Suit,
  Player,
  PlayerId,
  PlayerName,
  GamePhase
} from '../../src/types/game';

// Mock dependencies
jest.mock('../../src/utils/gamePlayManager', () => ({
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
jest.mock('../../src/utils/gameLogic', () => ({
  ...jest.requireActual('../../src/utils/gameLogic'),
  determineTrickWinner: jest.fn(),
  identifyCombos: jest.fn(),
  isValidPlay: jest.fn().mockReturnValue(true),
  isTrump: jest.fn(),
  humanHasTrumpRank: jest.fn().mockReturnValue(false)
}));

jest.mock('../../src/utils/trumpManager', () => ({
  declareTrumpSuit: jest.fn(),
  checkAITrumpDeclaration: jest.fn().mockReturnValue({ shouldDeclare: false }),
  humanHasTrumpRank: jest.fn().mockReturnValue(false)
}));

jest.mock('../../src/utils/aiLogic', () => ({
  getAIMove: jest.fn().mockReturnValue([{
    id: 'ai_card',
    suit: 1,
    rank: 4,
    points: 0
  }])
}));

jest.mock('../../src/utils/gameRoundManager', () => ({
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

  // @ts-ignore - Test mock type mismatch
  const aiTurnsHook = useAITurns(
    gameStateHook.gameState,
    gameStateHook.handleProcessPlay,
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
      console.log('Updating state:', gameStateHook.gameState);
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

describe('Player Transitions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Human player winning a trick becomes the next leader', async () => {
    const mockState = createMockGameState(3); // Start with AI3's turn
    
    // Setup a trick in progress
    mockState.currentTrick = {
      leadingPlayerId: PlayerId.Bot1,
      leadingCombo: [createMockCard('diamonds_3_1', Suit.Diamonds, Rank.Three)],
      plays: [
        {
          playerId: PlayerId.Human,
          cards: [createMockCard('spades_5_1', Suit.Spades, Rank.Five, 5)]
        },
        {
          playerId: PlayerId.Bot2,
          cards: [createMockCard('spades_2_1', Suit.Spades, Rank.Two)]
        }
      ],
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

    (determineTrickWinner as jest.Mock).mockReturnValue(PlayerId.Human);

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
      leadingPlayerId: PlayerId.Bot2,
      leadingCombo: [createMockCard('hearts_k_1', Suit.Hearts, Rank.King, 10)],
      plays: [
        {
          playerId: PlayerId.Human,
          cards: [createMockCard('spades_5_1', Suit.Spades, Rank.Five, 5)]
        },
        {
          playerId: PlayerId.Bot1,
          cards: [createMockCard('diamonds_3_1', Suit.Diamonds, Rank.Three)]
        }
      ],
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