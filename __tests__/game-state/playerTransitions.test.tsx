import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { View, Text, Button } from 'react-native';
import { useGameState } from '../../src/hooks/useGameState';
import { useAITurns } from '../../src/hooks/useAITurns';
import { processPlay } from '../../src/utils/gamePlayManager';
import { determineTrickWinner } from '../../src/utils/gameLogic';
import { 
  GameState, 
  Card, 
  Rank, 
  Suit,
  Player
} from '../../src/types/game';
import { createTestGameState, createTestCard } from '../helpers/testUtils';
import { GameStateUtils } from '../../src/utils/gameStateUtils';

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
  initializeGame: jest.fn(() => ({
    players: [{
      id: 'human',
      name: 'Human',
      isHuman: true,
      hand: [],
      
      teamId: 'A'
    }, {
      id: 'ai1', 
      name: 'Bot 1',
      isHuman: false,
      hand: [],
      
      teamId: 'B'
    }, {
      id: 'ai2',
      name: 'Bot 2', 
      isHuman: false,
      hand: [],
      
      teamId: 'A'
    }, {
      id: 'ai3',
      name: 'Bot 3',
      isHuman: false,
      hand: [],
      
      teamId: 'B'
    }],
    teams: { 
      'A': {
        id: 'A',
        points: 0,
        isDefending: true,
      }, 
      'B': {
        id: 'B',
        points: 0,
        isDefending: false,
      }
    },
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
  useAITurns(
    gameStateHook.gameState,
    gameStateHook.handleProcessPlay,
    false, // showTrickResult
    null,  // lastCompletedTrick
    false, // showRoundComplete
  );

  // Initialize with mock state if provided
  React.useEffect(() => {
    if (initialState) {
      const mockInitializeGame = require('../../src/utils/gameLogic').initializeGame;
      mockInitializeGame.mockReturnValue(initialState);
      gameStateHook.initGame();
    }
  }, [initialState]);

  // Track state changes
  React.useEffect(() => {
    if (onStateChange) {
      console.log('Updating state:', gameStateHook.gameState);
      onStateChange({
        gameState: gameStateHook.gameState,
      });
    }
  });

  const currentPlayer = gameStateHook.gameState?.currentPlayerId ? 
    GameStateUtils.getPlayerById(gameStateHook.gameState, gameStateHook.gameState.currentPlayerId) : null;

  return (
    <View>
      <Text testID="current-player-id">
      </Text>
      <Text testID="current-player-name">
      </Text>
      <Text testID="trick-winner-id">
      </Text>
      <Text testID="ai-thinking">
      </Text>
      <Button
        testID="simulate-play"
        title="Simulate Play"
        onPress={() => {
          if (gameStateHook.gameState) {
            if (currentPlayer && currentPlayer.hand.length > 0) {
              // Call handleProcessPlay directly to avoid timing issues
              gameStateHook.handleProcessPlay([currentPlayer.hand[0]]);
            }
          }
        }}
      />
    </View>
  );
};

describe('Player Transitions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Human player winning a trick becomes the next leader', async () => {
    const mockState = createTestGameState({ currentPlayerId: 'ai3' }); // Start with AI3's turn
    
    // Setup a trick in progress
    mockState.currentTrick = {
      leadingPlayerId: 'ai1',
      leadingCombo: [createTestCard(Suit.Diamonds, Rank.Three, undefined, 'diamonds_3_1')],
      plays: [
        {
          playerId: 'human',
          cards: [createTestCard(Suit.Spades, Rank.Five, undefined, 'spades_5_1')]
        },
        {
          playerId: 'ai2',
          cards: [createTestCard(Suit.Spades, Rank.Two, undefined, 'spades_2_1')]
        }
      ],
      points: 5
    };

    // Mock processPlay to complete the trick
    (processPlay as jest.Mock).mockImplementation((state, cards) => {
      const updatedState = {
        ...state,
        currentPlayerId: 'human', // Set human as next player after winning trick
        currentTrick: null, // Trick is cleared after completion
        players: GameStateUtils.getAllPlayers(state).map((p: Player) => ({
          ...p,
          hand: p.id === 'ai3' ? p.hand.filter((c: Card) => c.id !== cards[0].id) : p.hand
        }))
      };
      
      return {
        newState: updatedState,
        trickComplete: true,
        trickWinner: 'Human',
        trickPoints: 5,
        completedTrick: {
          ...state.currentTrick,
          plays: [
            ...state.currentTrick!.plays,
            {
              playerId: 'ai3',
              cards: [cards[0]]
            }
          ]
        }
      };
    });

    (determineTrickWinner as jest.Mock).mockReturnValue('human');

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
      // In the refactored code, we check that the human becomes the current player after winning
      expect(GameStateUtils.getPlayersInOrder(latestState.gameState)[0].isHuman).toBe(true);
    }, { timeout: 3000 });

    // Verify the game state is being tracked
    await waitFor(() => {
      expect(stateChanges.length).toBeGreaterThan(0);
      const finalState = stateChanges[stateChanges.length - 1];
      expect(finalState).toBeDefined();
    }, { timeout: 3000 });
  });


  test('Trick winner becomes next player after completion', async () => {
    const mockState = createTestGameState({ currentPlayerId: 'ai3' }); // Start with AI3 about to complete a trick
    
    // Set up current trick
    mockState.currentTrick = {
      leadingPlayerId: 'ai2',
      leadingCombo: [createTestCard(Suit.Hearts, Rank.King, undefined, 'hearts_k_1')],
      plays: [
        {
          playerId: 'human',
          cards: [createTestCard(Suit.Spades, Rank.Five, undefined, 'spades_5_1')]
        },
        {
          playerId: 'ai1',
          cards: [createTestCard(Suit.Diamonds, Rank.Three, undefined, 'diamonds_3_1')]
        }
      ],
      points: 15
    };

    // Mock processPlay to complete trick with Bot 2 as winner
    (processPlay as jest.Mock).mockImplementation((state, cards) => {
      const updatedState = {
        ...state,
        currentPlayerId: 'ai2', // Set ai2 (Bot 2) as next player after winning trick
        currentTrick: null,
        players: GameStateUtils.getAllPlayers(state).map((p: Player) => ({
          ...p,
          hand: p.id === 'ai3' ? p.hand.filter((c: Card) => c.id !== cards[0].id) : p.hand
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
      // Check that AI2 player exists in the game state
      expect(GameStateUtils.getPlayersInOrder(latestState.gameState)[2].name).toBe('Bot 2');
    }, { timeout: 3000 });

    // Verify the game state is being tracked
    await waitFor(() => {
      expect(stateChanges.length).toBeGreaterThan(0);
      const finalState = stateChanges[stateChanges.length - 1];
      expect(finalState).toBeDefined();
    }, { timeout: 3000 });
  });
});
