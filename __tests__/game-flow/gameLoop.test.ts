import { getAIMove } from '../../src/utils/aiLogic';
import {
  isValidPlay,
  determineTrickWinner,
  calculateTrickPoints
} from '../../src/utils/gameLogic';
import {
  GameState,
  Card,
  Rank,
  Suit
} from '../../src/types/game';

// Mock dependencies
jest.mock('../../src/utils/aiLogic', () => ({
  getAIMove: jest.fn(),
}));

// Create mock game state
const createMockGameState = (): GameState => {
  return {
    players: [
      {
        id: 'player',
        name: 'Human',
        isHuman: true,
        hand: [],
        team: 'A'
      },
      {
        id: 'ai1',
        name: 'Bot 1',
        isHuman: false,
        hand: [],
        team: 'B'
      },
      {
        id: 'ai2',
        name: 'Bot 2',
        isHuman: false,
        hand: [],
        team: 'A'
      },
      {
        id: 'ai3',
        name: 'Bot 3',
        isHuman: false,
        hand: [],
        team: 'B'
      }
    ],
    teams: [
      {
        id: 'A',
        currentRank: Rank.Two,
        points: 0,
        isDefending: true
      },
      {
        id: 'B',
        currentRank: Rank.Two,
        points: 0,
        isDefending: false
      }
    ],
    deck: [],
    kittyCards: [],
    currentTrick: null,
    trumpInfo: {
      trumpRank: Rank.Two,
      declared: false
    },
    tricks: [],
    roundNumber: 1,
    currentPlayerIndex: 0,
    gamePhase: 'playing'
  };
};

// Helper function to create cards
const createCard = (suit: Suit, rank: Rank, id: string): Card => {
  let points = 0;
  if (rank === Rank.Five) points = 5;
  if (rank === Rank.Ten || rank === Rank.King) points = 10;
  return { suit, rank, id, points };
};

describe('Game Loop Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Game loop should handle AI player with no valid plays', () => {
    const gameState = createMockGameState();
    
    // Create a trick with Hearts as leading suit
    gameState.currentTrick = {
      leadingPlayerId: 'player',
      leadingCombo: [createCard(Suit.Hearts, Rank.Ace, 'hearts_a_1')],
      plays: [
        {
          playerId: 'player',
          cards: [createCard(Suit.Hearts, Rank.Ace, 'hearts_a_1')]
        }
      ],
      points: 0
    };
    
    // Give AI1 non-heart cards
    gameState.players[1].hand = [
      createCard(Suit.Spades, Rank.Seven, 'spades_7_1'),
      createCard(Suit.Diamonds, Rank.Ten, 'diamonds_10_1')
    ];
    
    gameState.currentPlayerIndex = 1; // AI1's turn
    
    // Simulate AI returning a valid play
    (getAIMove as jest.Mock).mockReturnValue([createCard(Suit.Spades, Rank.Seven, 'spades_7_1')]);
    
    // Simulate processing the AI move (from EnhancedGameScreen)
    const processAIMove = () => {
      const newState = { ...gameState };
      const currentPlayer = newState.players[newState.currentPlayerIndex];
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
      
      // Move to next player
      newState.currentPlayerIndex = (newState.currentPlayerIndex + 1) % newState.players.length;
      
      return newState;
    };
    
    const updatedState = processAIMove();
    
    // Verify AI played a card
    expect(updatedState.currentTrick!.plays.length).toBe(2);
    expect(updatedState.currentTrick!.plays[1].playerId).toBe('ai1');
    expect(updatedState.currentTrick!.plays[1].cards.length).toBe(1);
    
    // Verify card was removed from hand
    expect(updatedState.players[1].hand.length).toBe(1);
    
    // Verify it moved to next player
    expect(updatedState.currentPlayerIndex).toBe(2);
  });

  test('Game loop should handle trick completion and winner determination', () => {
    const gameState = createMockGameState();
    
    // Give all players cards for this trick
    gameState.players[0].hand = [createCard(Suit.Hearts, Rank.Ace, 'hearts_a_1')];
    gameState.players[1].hand = [createCard(Suit.Hearts, Rank.King, 'hearts_k_1')];
    gameState.players[2].hand = [createCard(Suit.Hearts, Rank.Queen, 'hearts_q_1')];
    gameState.players[3].hand = [createCard(Suit.Hearts, Rank.Jack, 'hearts_j_1')];
    
    // Start a trick with player 0 leading
    gameState.currentTrick = {
      leadingPlayerId: 'player',
      leadingCombo: [createCard(Suit.Hearts, Rank.Ace, 'hearts_a_1')],
      plays: [
        {
          playerId: 'player',
          cards: [createCard(Suit.Hearts, Rank.Ace, 'hearts_a_1')]
        }
      ],
      points: 0
    };
    
    // Remove the card from player 0's hand
    gameState.players[0].hand = [];
    
    // Player 1's turn
    gameState.currentPlayerIndex = 1;
    
    // Process player 1's move
    const processPlayer1Move = () => {
      const newState = { ...gameState };
      const currentPlayer = newState.players[newState.currentPlayerIndex];
      
      // Play the King of Hearts
      const move = [createCard(Suit.Hearts, Rank.King, 'hearts_k_1')];
      
      // Add to trick
      newState.currentTrick!.plays.push({
        playerId: currentPlayer.id,
        cards: [...move]
      });
      
      // Remove played cards from hand
      currentPlayer.hand = currentPlayer.hand.filter(
        card => !move.some(played => played.id === card.id)
      );
      
      // Move to next player
      newState.currentPlayerIndex = (newState.currentPlayerIndex + 1) % newState.players.length;
      
      return newState;
    };
    
    // Process player 2's move
    const processPlayer2Move = (state: GameState) => {
      const newState = { ...state };
      const currentPlayer = newState.players[newState.currentPlayerIndex];
      
      // Play the Queen of Hearts
      const move = [createCard(Suit.Hearts, Rank.Queen, 'hearts_q_1')];
      
      // Add to trick
      newState.currentTrick!.plays.push({
        playerId: currentPlayer.id,
        cards: [...move]
      });
      
      // Remove played cards from hand
      currentPlayer.hand = currentPlayer.hand.filter(
        card => !move.some(played => played.id === card.id)
      );
      
      // Move to next player
      newState.currentPlayerIndex = (newState.currentPlayerIndex + 1) % newState.players.length;
      
      return newState;
    };
    
    // Process player 3's move (completes the trick)
    const processPlayer3Move = (state: GameState) => {
      const newState = { ...state };
      const currentPlayer = newState.players[newState.currentPlayerIndex];
      
      // Play the Jack of Hearts
      const move = [createCard(Suit.Hearts, Rank.Jack, 'hearts_j_1')];
      
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
      const winningPlayer = newState.players.find(p => p.id === winningPlayerId);
      const winningTeam = winningPlayer ? 
        newState.teams.find(t => t.id === winningPlayer.team) :
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
      
      // Set next player to winner
      newState.currentPlayerIndex = newState.players.findIndex(p => p.id === winningPlayerId);
      
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
    expect(finalState.teams[0].points).toBe(10); // Team A won and got 10 points
    
    // Next player should be the winner
    expect(finalState.currentPlayerIndex).toBe(0);
  });
});