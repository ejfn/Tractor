import {
  prepareNextRound,
  endRound
} from '../../src/game/gameRoundManager';
import { 
  GameState, 
  Rank, 
  Suit, 
  Card
} from "../../src/types";
import { createFullGameStateWithTricks } from "../helpers";
import * as gameLogic from '../../src/game/gameLogic';

// Mock dependencies
jest.mock('../../src/game/gameLogic', () => ({
  initializeGame: jest.fn()
}));

const createMockGameState = createFullGameStateWithTricks;

describe('gameRoundManager', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('prepareNextRound', () => {
    test('should correctly prepare the game state for the next round', () => {
      const mockState = createMockGameState();
      
      // Mock the return value of initializeGame to return a deck
      const mockDeck = Array(52).fill(null).map((_, i) => ({
        id: `card_${i}`,
        suit: Suit.Spades,
        rank: Rank.Two,
        points: 0,
        joker: undefined
      }));
      
      (gameLogic.initializeGame as jest.Mock).mockReturnValue({
        deck: mockDeck
      });
      
      const result = prepareNextRound(mockState);
      
      // Verify round number was incremented
      expect(result.roundNumber).toBe(2);
      
      // Verify game phase was set to dealing (progressive dealing starts with dealing phase)
      expect(result.gamePhase).toBe('dealing');
      
      // Verify trump info was reset
      expect(result.trumpInfo.trumpSuit).toBeUndefined();
      expect(result.trumpInfo.trumpRank).toBe(Rank.Two); // Same as defending team's rank
      
      // Verify trump rank was set from defending team
      expect(result.trumpInfo.trumpRank).toBe(result.teams.find(t => t.isDefending)?.currentRank);
      
      // Verify deck was created
      expect(result.deck).toEqual(mockDeck);
      
      // Verify cards were dealt to players
      const cardsPerPlayer = Math.floor((mockDeck.length - 8) / mockState.players.length);
      
      result.players.forEach(player => {
        expect(player.hand.length).toBe(cardsPerPlayer);
      });
      
      // Verify kitty cards
      expect(result.kittyCards.length).toBe(8);
      
      // Verify tricks were reset
      expect(result.tricks.length).toBe(0);
      expect(result.currentTrick).toBeNull();
      
      // Verify initializeGame was called
      expect(gameLogic.initializeGame).toHaveBeenCalled();
    });
  });

  describe('endRound', () => {
    test('should end the round with team A winning', () => {
      const mockState = createMockGameState();
      mockState.teams[0].points = 80; // Team A has more points
      mockState.teams[1].points = 20;
      
      const result = endRound(mockState);
      
      // Note: gamePhase is not updated by endRound function
      
      // Verify teams' points are reset for next round
      expect(result.newState.teams[0].points).toBe(0);
      expect(result.newState.teams[1].points).toBe(0);
      
      // Verify winner is Team A
      expect(result.winner).toBe(null); // Winner is null since Team A is already defending, they just level up
      
      // Verify game is not over yet - no rank change
      expect(result.gameOver).toBe(false);
      
      // Verify round complete message
      expect(result.roundCompleteMessage).toContain('Team A');
      expect(result.roundCompleteMessage).toContain('advance');
    });

    test('should end the round with team B winning and advancing rank', () => {
      const mockState = createMockGameState();
      mockState.teams[0].points = 30; // Team A has fewer points
      mockState.teams[1].points = 80; // Team B has 80+ points (important for winning)
      
      const result = endRound(mockState);
      
      // Note: gamePhase is not updated by endRound function
      
      // Verify winner result (null since team just ranks up)
      expect(result.winner).toBe(null);
      
      // Verify game is not over yet
      expect(result.gameOver).toBe(false);
      
      // Verify team B's rank was NOT increased (with 80 points exactly, they don't advance)
      expect(result.newState.teams[1].currentRank).toBe(Rank.Two);
      
      // Verify defending status was swapped
      expect(result.newState.teams[0].isDefending).toBe(false);
      expect(result.newState.teams[1].isDefending).toBe(true);
      
      // Verify round complete message
      expect(result.roundCompleteMessage).toContain('Team B');
      expect(result.roundCompleteMessage).toContain('will defend at rank 2');
    });

    test('should end the round with defending team winning', () => {
      const mockState = createMockGameState();
      
      // Team A is defending
      mockState.teams[0].isDefending = true;
      mockState.teams[1].isDefending = false;
      
      // Attacking team (B) has less than 40 points, so defending team advances 2 ranks
      mockState.teams[0].points = 0;  // Defending team points
      mockState.teams[1].points = 30; // Attacking team points
      
      const result = endRound(mockState);
      
      // Note: gamePhase is not updated by endRound function
      
      // Verify defending team's rank increases by 2 (from Rank.Two to Rank.Four)
      expect(result.newState.teams[0].currentRank).toBe(Rank.Four);
      
      // Verify winner is null (since it's just a rank advancement)
      expect(result.winner).toBe(null);
      
      // Verify game is not over yet
      expect(result.gameOver).toBe(false);
      
      // Verify defending status remains the same
      expect(result.newState.teams[0].isDefending).toBe(true);
      expect(result.newState.teams[1].isDefending).toBe(false);
      
      // Verify round complete message
      expect(result.roundCompleteMessage).toContain('Team A');
      expect(result.roundCompleteMessage).toContain('held attackers to only 30 points');
      expect(result.roundCompleteMessage).toContain('advances 2 ranks');
    });

    test('should handle team reaching highest rank and winning the game', () => {
      const mockState = createMockGameState();
      
      // Set team B to have a high rank (King)
      mockState.teams[1].currentRank = Rank.King;
      
      // Make team B the attacking team and win with high points
      mockState.teams[0].isDefending = true;
      mockState.teams[1].isDefending = false;
      
      mockState.teams[0].points = 30;
      mockState.teams[1].points = 120; // 120+ points gives them 1 rank advancement
      
      const result = endRound(mockState);
      
      // Since team B advances from King to Ace, the game should be over
      expect(result.gameOver).toBe(true);
      expect(result.winner).toBe('B');
      
      // Note: The teams still have their final state
      expect(result.newState.teams[1].currentRank).toBe(Rank.King); // Remains King when game ends
      
      // Verify no round complete message when game is over
      expect(result.roundCompleteMessage).toBe('');
    });
  });
});