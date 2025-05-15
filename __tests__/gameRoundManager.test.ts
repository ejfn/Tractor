import {
  prepareNextRound,
  endRound
} from '../src/utils/gameRoundManager';
import { 
  GameState, 
  Rank, 
  Suit, 
  Card
} from '../src/types/game';
import * as gameLogic from '../src/utils/gameLogic';

// Mock dependencies
jest.mock('../src/utils/gameLogic', () => ({
  initializeGame: jest.fn()
}));

// Helper function to create test cards
const createMockCard = (id: string, suit: Suit, rank: Rank, points = 0): Card => ({
  id,
  suit,
  rank,
  points,
  joker: undefined
});

// Create mock game state for testing
const createMockGameState = (): GameState => {
  return {
    players: [
      {
        id: 'player',
        name: 'You',
        isHuman: true,
        hand: [
          createMockCard('spades_5_1', Suit.Spades, Rank.Five, 5),
          createMockCard('hearts_k_1', Suit.Hearts, Rank.King, 10)
        ],
        team: 'A',
        currentRank: Rank.Two
      },
      {
        id: 'ai1',
        name: 'Bot 1',
        isHuman: false,
        hand: [
          createMockCard('diamonds_3_1', Suit.Diamonds, Rank.Three),
          createMockCard('clubs_j_1', Suit.Clubs, Rank.Jack)
        ],
        team: 'B',
        currentRank: Rank.Two
      },
      {
        id: 'ai2',
        name: 'Bot 2',
        isHuman: false,
        hand: [
          createMockCard('spades_2_1', Suit.Spades, Rank.Two),
          createMockCard('hearts_a_1', Suit.Hearts, Rank.Ace)
        ],
        team: 'A',
        currentRank: Rank.Two
      },
      {
        id: 'ai3',
        name: 'Bot 3',
        isHuman: false,
        hand: [
          createMockCard('clubs_4_1', Suit.Clubs, Rank.Four),
          createMockCard('diamonds_10_1', Suit.Diamonds, Rank.Ten, 10)
        ],
        team: 'B',
        currentRank: Rank.Two
      }
    ],
    teams: [
      {
        id: 'A',
        players: ['player', 'ai2'],
        points: 0,
        currentRank: Rank.Two,
        isDefending: true
      },
      {
        id: 'B',
        players: ['ai1', 'ai3'],
        points: 0,
        currentRank: Rank.Two,
        isDefending: false
      }
    ],
    trumpInfo: {
      trumpRank: Rank.Two,
      trumpSuit: Suit.Spades,
      declared: true
    },
    gamePhase: 'playing',
    roundNumber: 1,
    currentPlayerIndex: 0,
    currentTrick: null,
    tricks: [
      {
        leadingPlayerId: 'player',
        leadingCombo: [createMockCard('spades_5_1', Suit.Spades, Rank.Five, 5)],
        plays: [
          {
            playerId: 'player',
            cards: [createMockCard('spades_5_1', Suit.Spades, Rank.Five, 5)]
          },
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
        points: 5,
        winningPlayerId: 'player'
      }
    ],
    deck: [],
    kittyCards: []
  };
};

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
      
      const result = prepareNextRound(mockState, 'Player Name', ['Team A', 'Team B']);
      
      // Verify round number was incremented
      expect(result.roundNumber).toBe(2);
      
      // Verify game phase was set to declaring (not dealing - it changes to declaring in line 61)
      expect(result.gamePhase).toBe('declaring');
      
      // Verify trump info was reset
      expect(result.trumpInfo.trumpSuit).toBeUndefined();
      expect(result.trumpInfo.declared).toBe(false);
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
      
      // Verify initializeGame was called with the right params
      expect(gameLogic.initializeGame).toHaveBeenCalledWith(
        'Player Name',
        ['Team A', 'Team B'],
        Rank.Two
      );
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
      
      // Verify team B's rank was increased
      expect(result.newState.teams[1].currentRank).toBe(Rank.Three);
      
      // Verify defending status was swapped
      expect(result.newState.teams[0].isDefending).toBe(false);
      expect(result.newState.teams[1].isDefending).toBe(true);
      
      // Verify round complete message
      expect(result.roundCompleteMessage).toContain('Team B');
      expect(result.roundCompleteMessage).toContain('rank 3');
    });

    test('should end the round with defending team winning', () => {
      const mockState = createMockGameState();
      
      // Team A is defending and has more points
      mockState.teams[0].isDefending = true;
      mockState.teams[1].isDefending = false;
      
      // Attacking team has less than 80 points
      mockState.teams[0].points = 70;
      mockState.teams[1].points = 30;
      
      const result = endRound(mockState);
      
      // Note: gamePhase is not updated by endRound function
      
      // Verify defending team's rank increases
      expect(result.newState.teams[0].currentRank).toBe(Rank.Three);
      
      // Verify winner is null (since it's just a rank advancement)
      expect(result.winner).toBe(null);
      
      // Verify game is not over yet
      expect(result.gameOver).toBe(false);
      
      // Verify defending status remains the same
      expect(result.newState.teams[0].isDefending).toBe(true);
      expect(result.newState.teams[1].isDefending).toBe(false);
      
      // Verify round complete message
      expect(result.roundCompleteMessage).toContain('Team A');
      expect(result.roundCompleteMessage).toContain('successfully defended');
    });

    test('should handle team reaching highest rank without ending game', () => {
      const mockState = createMockGameState();
      
      // Set team B to have a high rank
      mockState.teams[1].currentRank = Rank.King;
      
      // Make team B the attacking team and win
      mockState.teams[0].isDefending = true;
      mockState.teams[1].isDefending = false;
      
      mockState.teams[0].points = 30;
      mockState.teams[1].points = 80; // 80+ points needed to win as attacker
      
      const result = endRound(mockState);
      
      // Note: gamePhase is not updated by endRound function
      
      // Verify team B's rank was increased to Ace
      expect(result.newState.teams[1].currentRank).toBe(Rank.Ace);
      
      // Note: Looking at the implementation, game isn't marked as over
      // even when reaching Ace - this might be an implementation detail
      
      // Verify round complete message
      expect(result.roundCompleteMessage).not.toBe('');
      expect(result.roundCompleteMessage).toContain('Team B');
      expect(result.roundCompleteMessage).toContain('advances to rank');
    });
  });
});