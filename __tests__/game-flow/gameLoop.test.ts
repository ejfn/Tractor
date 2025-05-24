import { getAIMove } from '../../src/utils/aiLogic';
import {
  isValidPlay,
  determineTrickWinner,
  calculateTrickPoints
} from '../../src/utils/gameLogic';
import { GameStateUtils } from '../../src/utils/gameStateUtils';
import {
  GameState,
  Card,
  Rank,
  Suit
} from '../../src/types/game';
import { createTestGameState, createTestCard } from '../helpers/testUtils';

// Mock dependencies
jest.mock('../../src/utils/aiLogic', () => ({
  getAIMove: jest.fn(),
}));

describe('Game Loop Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Game loop should handle AI player with no valid plays', () => {
    const gameState = createTestGameState();
    
    // Create a trick with Hearts as leading suit
    gameState.currentTrick = {
      leadingPlayerId: 'player',
      leadingCombo: [createTestCard(Suit.Hearts, Rank.Ace, undefined, 'hearts_a_1')],
      plays: [
        {
          playerId: 'player',
          cards: [createTestCard(Suit.Hearts, Rank.Ace, undefined, 'hearts_a_1')]
        }
      ],
      points: 0
    };
    
    // Give AI1 non-heart cards
    GameStateUtils.getPlayersInOrder(gameState)[1].hand = [
      createTestCard(Suit.Spades, Rank.Seven, undefined, 'spades_7_1'),
      createTestCard(Suit.Diamonds, Rank.Ten, undefined, 'diamonds_10_1')
    ];
    
    // Set up trick gameState to simulate AI1's turn
    gameState.currentTrick!.plays = [
      {
        playerId: 'player',
        cards: [createTestCard(Suit.Hearts, Rank.Ace, undefined, 'hearts_a_1')]
      }
    ];
    
    // Simulate AI returning a valid play
    (getAIMove as jest.Mock).mockReturnValue([createTestCard(Suit.Spades, Rank.Seven, undefined, 'spades_7_1')]);
    
    // Simulate processing the AI move (from EnhancedGameScreen)
    const processAIMove = () => {
      const newState = { ...gameState };
      // Calculate current player (AI1 in this test)
      const currentPlayerIndex = 1;
      const currentPlayer = GameStateUtils.getPlayersInOrder(newState)[currentPlayerIndex];
      const aiMove = getAIMove(newState, currentPlayer.id);
      
      // Check if we got a valid move
      expect(aiMove).toBeDefined();
      expect(aiMove.length).toBe(1);
      
      // Add to trick
      newState.currentTrick!.plays.push({
        playerId: currentPlayer.id,
        cards: [...aiMove]
      });
      
      // Remove played cards from hand
      currentPlayer.hand = currentPlayer.hand.filter(
        card => !aiMove.some(played => played.id === card.id)
      );
      
      // Move to next player would be handled by the actual game logic
      
      return newState;
    };
    
    const updatedState = processAIMove();
    
    // Verify AI played a card
    expect(updatedState.currentTrick!.plays.length).toBe(2);
    expect(updatedState.currentTrick!.plays[1].playerId).toBe('ai1');
    expect(updatedState.currentTrick!.plays[1].cards.length).toBe(1);
    
    // Verify card was removed from hand
    expect(GameStateUtils.getPlayersInOrder(updatedState)[1].hand.length).toBe(1);
    
    // Verify trick gameState was updated correctly
    expect(updatedState.currentTrick!.plays.length).toBe(2);
  });

  test('Game loop should handle trick completion and winner determination', () => {
    const gameState = createTestGameState();
    
    // Give all players cards for this trick
    GameStateUtils.getPlayersInOrder(gameState)[0].hand = [createTestCard(Suit.Hearts, Rank.Ace, undefined, 'hearts_a_1')];
    GameStateUtils.getPlayersInOrder(gameState)[1].hand = [createTestCard(Suit.Hearts, Rank.King, undefined, 'hearts_k_1')];
    GameStateUtils.getPlayersInOrder(gameState)[2].hand = [createTestCard(Suit.Hearts, Rank.Queen, undefined, 'hearts_q_1')];
    GameStateUtils.getPlayersInOrder(gameState)[3].hand = [createTestCard(Suit.Hearts, Rank.Jack, undefined, 'hearts_j_1')];
    
    // Start a trick with player 0 leading
    gameState.currentTrick = {
      leadingPlayerId: 'player',
      leadingCombo: [createTestCard(Suit.Hearts, Rank.Ace, undefined, 'hearts_a_1')],
      plays: [
        {
          playerId: 'player',
          cards: [createTestCard(Suit.Hearts, Rank.Ace, undefined, 'hearts_a_1')]
        }
      ],
      points: 0
    };
    
    // Remove the card from player 0's hand
    GameStateUtils.getPlayersInOrder(gameState)[0].hand = [];
    
    // Player 1's turn (simulated by trick gameState)
    
    // Process player 1's move
    const processPlayer1Move = () => {
      const newState = { ...gameState };
      // Player 1's turn
      const currentPlayerIndex = 1;
      const currentPlayer = GameStateUtils.getPlayersInOrder(newState)[currentPlayerIndex];
      
      // Play the King of Hearts
      const move = [createTestCard(Suit.Hearts, Rank.King, undefined, 'hearts_k_1')];
      
      // Add to trick
      newState.currentTrick!.plays.push({
        playerId: currentPlayer.id,
        cards: [...move]
      });
      
      // Remove played cards from hand
      currentPlayer.hand = currentPlayer.hand.filter(
        card => !move.some(played => played.id === card.id)
      );
      
      // Move to next player would be handled by the actual game logic
      
      return newState;
    };
    
    // Process player 2's move
    const processPlayer2Move = (gameState: GameState) => {
      const newState = { ...gameState };
      // Player 2's turn
      const currentPlayerIndex = 2;
      const currentPlayer = GameStateUtils.getPlayersInOrder(newState)[currentPlayerIndex];
      
      // Play the Queen of Hearts
      const move = [createTestCard(Suit.Hearts, Rank.Queen, undefined, 'hearts_q_1')];
      
      // Add to trick
      newState.currentTrick!.plays.push({
        playerId: currentPlayer.id,
        cards: [...move]
      });
      
      // Remove played cards from hand
      currentPlayer.hand = currentPlayer.hand.filter(
        card => !move.some(played => played.id === card.id)
      );
      
      // Move to next player would be handled by the actual game logic
      
      return newState;
    };
    
    // Process player 3's move (completes the trick)
    const processPlayer3Move = (gameState: GameState) => {
      const newState = { ...gameState };
      // Player 3's turn
      const currentPlayerIndex = 3;
      const currentPlayer = GameStateUtils.getPlayersInOrder(newState)[currentPlayerIndex];
      
      // Play the Jack of Hearts
      const move = [createTestCard(Suit.Hearts, Rank.Jack, undefined, 'hearts_j_1')];
      
      // Add to trick
      newState.currentTrick!.plays.push({
        playerId: currentPlayer.id,
        cards: [...move]
      });
      
      // Remove played cards from hand
      currentPlayer.hand = currentPlayer.hand.filter(
        card => !move.some(played => played.id === card.id)
      );
      
      // Determine trick winner
      const winningPlayerId = determineTrickWinner(newState.currentTrick!, newState.trumpInfo);
      
      // Calculate points
      const trickPoints = calculateTrickPoints(newState.currentTrick!);
      
      // Find winning team
      const winningPlayer = GameStateUtils.getAllPlayers(newState).find(p => p.id === winningPlayerId);
      const winningTeam = winningPlayer ? 
        newState.teams[winningPlayer.teamId] :
        null;
      
      if (winningTeam) {
        winningTeam.points += trickPoints;
      }
      
      // Store completed trick
      newState.currentTrick!.winningPlayerId = winningPlayerId;
      newState.currentTrick!.points = trickPoints;
      newState.tricks.push({ ...newState.currentTrick! });
      
      // Start a new trick
      newState.currentTrick = null;
      
      // Winner becomes the next player (stored in trick for reference)
      
      return newState;
    };
    
    // Execute the trick sequence
    const stateAfterPlayer1 = processPlayer1Move();
    const stateAfterPlayer2 = processPlayer2Move(stateAfterPlayer1);
    const finalState = processPlayer3Move(stateAfterPlayer2);
    
    // Verify the trick was completed correctly
    expect(finalState.currentTrick).toBeNull();
    expect(finalState.tricks.length).toBe(1);
    
    // Player with Ace should win
    expect(finalState.tricks[0].winningPlayerId).toBe('player');
    
    // Points should be awarded (10 for King, 0 for others)
    expect(finalState.tricks[0].points).toBe(10);
    expect(finalState.teams['A'].points).toBe(10); // Team A won and got 10 points
    
    // Winner stored in completed trick
    expect(finalState.tricks[0].winningPlayerId).toBe('player');
  });
});