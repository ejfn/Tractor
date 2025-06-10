import { getAIMove } from '../../src/ai/aiLogic';
import { processPlay } from '../../src/game/playProcessing';
import {
  Card,
  GameState,
  PlayerId,
  Rank,
  Suit
} from "../../src/types";
import { createTestCardsGameState } from "../helpers";

// Mock dependencies
jest.mock('../../src/ai/aiLogic', () => ({
  getAIMove: jest.fn(),
}));

// Use shared utility for test cards game state
const createMockGameState = createTestCardsGameState;


describe('Game Loop Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Game loop should handle AI player with no valid plays', () => {
    const gameState = createMockGameState();
    
    // Create a trick with Hearts as leading suit
    gameState.currentTrick = {
      plays: [
        {
          playerId: PlayerId.Human,
          cards: [Card.createCard(Suit.Hearts, Rank.Ace, 0)]
        }
      ],
      winningPlayerId: PlayerId.Human,
      points: 0
    };
    
    // Give AI1 non-heart cards
    const spadesSevenCard = Card.createCard(Suit.Spades, Rank.Seven, 0);
    gameState.players[1].hand = [
      spadesSevenCard,
      Card.createCard(Suit.Diamonds, Rank.Ten, 0)
    ];
    
    gameState.currentPlayerIndex = 1; // AI1's turn
    
    // Simulate AI returning a valid play
    (getAIMove as jest.Mock).mockReturnValue([spadesSevenCard]);
    
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
    expect(updatedState.currentTrick!.plays[1].playerId).toBe(PlayerId.Bot1);
    expect(updatedState.currentTrick!.plays[1].cards.length).toBe(1);
    
    // Verify card was removed from hand
    expect(updatedState.players[1].hand.length).toBe(1);
    
    // Verify it moved to next player
    expect(updatedState.currentPlayerIndex).toBe(2);
  });

  test('Game loop should handle trick completion and winner determination', () => {
    const gameState = createMockGameState();
    
    // Give all players cards for this trick
    gameState.players[0].hand = [Card.createCard(Suit.Hearts, Rank.Ace, 0)];
    gameState.players[1].hand = [Card.createCard(Suit.Hearts, Rank.King, 0)];
    gameState.players[2].hand = [Card.createCard(Suit.Hearts, Rank.Queen, 0)];
    gameState.players[3].hand = [Card.createCard(Suit.Hearts, Rank.Jack, 0)];
    
    // Start a trick with player 0 leading
    const aceCard = Card.createCard(Suit.Hearts, Rank.Ace, 0);
    gameState.currentTrick = {
      plays: [
        {
          playerId: PlayerId.Human,
          cards: [aceCard]
        }
      ],
      winningPlayerId: PlayerId.Human,
      points: aceCard.points // Start with Ace's points (0)
    };
    
    // Remove the card from player 0's hand
    gameState.players[0].hand = [];
    
    // Player 1's turn
    gameState.currentPlayerIndex = 1;
    
    // Process player 1's move using real game logic
    const processPlayer1Move = () => {
      const move = [Card.createCard(Suit.Hearts, Rank.King, 0)];
      const playResult = processPlay(gameState, move);
      return playResult.newState;
    };
    
    // Process player 2's move using real game logic
    const processPlayer2Move = (state: GameState) => {
      const move = [Card.createCard(Suit.Hearts, Rank.Queen, 0)];
      const playResult = processPlay(state, move);
      return playResult.newState;
    };
    
    // Process player 3's move (completes the trick)
    const processPlayer3Move = (state: GameState) => {
      // Play the Jack of Hearts using real game logic
      const move = [Card.createCard(Suit.Hearts, Rank.Jack, 0)];
      
      // Use real game logic to process the play (this will handle trick completion automatically)
      const playResult = processPlay(state, move);
      
      // processPlay handles everything: trick completion, points, winner determination, etc.
      return playResult.newState;
    };
    
    // Execute the trick sequence
    const stateAfterPlayer1 = processPlayer1Move();
    const stateAfterPlayer2 = processPlayer2Move(stateAfterPlayer1);
    const finalState = processPlayer3Move(stateAfterPlayer2);
    
    // Verify the trick was completed correctly
    expect(finalState.currentTrick).not.toBeNull(); // Trick remains for UI display
    expect(finalState.currentTrick!.plays.length).toBe(4); // All 4 players have played
    expect(finalState.tricks.length).toBe(1);
    
    // Player with Ace should win
    expect(finalState.tricks[0].winningPlayerId).toBe(PlayerId.Human);
    
    // Points should be awarded (10 for King, 0 for others)
    expect(finalState.tricks[0].points).toBe(10);
    expect(finalState.teams[0].points).toBe(10); // Team A won and got 10 points
    
    // Next player should be the winner
    expect(finalState.currentPlayerIndex).toBe(0);
  });
});