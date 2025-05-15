import {
  processPlay,
  validatePlay,
  getAIMoveWithErrorHandling
} from '../src/utils/gamePlayManager';
import { 
  GameState, 
  Card, 
  Rank, 
  Suit, 
  JokerType, 
  TrumpInfo 
} from '../src/types/game';
import * as gameLogic from '../src/utils/gameLogic';
import * as aiLogic from '../src/utils/aiLogic';

// Mock dependencies
jest.mock('../src/utils/gameLogic', () => ({
  identifyCombos: jest.fn(),
  isValidPlay: jest.fn(),
  determineTrickWinner: jest.fn()
}));

jest.mock('../src/utils/aiLogic', () => ({
  getAIMove: jest.fn()
}));

// Helper functions to create test data
const createMockCard = (id: string, suit: Suit, rank: Rank, points = 0): Card => ({
  id,
  suit,
  rank,
  points,
  joker: undefined
});

const createMockJoker = (id: string, type: JokerType, points = 0): Card => ({
  id,
  joker: type,
  points,
  suit: undefined,
  rank: undefined
});

const createMockGameState = (): GameState => {
  return {
    players: [
      {
        id: 'human',
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
        players: ['human', 'ai2'],
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
    tricks: [],
    deck: [],
    kittyCards: []
  };
};

describe('gamePlayManager', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processPlay', () => {
    test('should process a play and update the game state correctly', () => {
      const mockState = createMockGameState();
      const cardsToPlay = [mockState.players[0].hand[0]]; // Spades 5
      
      // Initial play - should create a new trick
      const result = processPlay(mockState, cardsToPlay);
      
      // Verify the state was updated correctly
      expect(result.newState.currentTrick).toBeTruthy();
      expect(result.newState.currentTrick?.leadingPlayerId).toBe('human');
      expect(result.newState.currentTrick?.leadingCombo).toEqual(cardsToPlay);
      expect(result.newState.currentTrick?.plays).toHaveLength(1);
      expect(result.newState.currentTrick?.plays[0].playerId).toBe('human');
      expect(result.newState.currentTrick?.plays[0].cards).toEqual(cardsToPlay);
      expect(result.newState.currentTrick?.points).toBe(5); // 5 points from the card
      
      // Verify the card was removed from the player's hand
      expect(result.newState.players[0].hand).toHaveLength(1);
      expect(result.newState.players[0].hand[0].id).toBe('hearts_k_1');
      
      // Verify the current player was advanced
      expect(result.newState.currentPlayerIndex).toBe(1);
      
      // Verify the trick is not complete yet
      expect(result.trickComplete).toBe(false);
    });

    test('should complete a trick when all players have played', () => {
      const mockState = createMockGameState();
      
      // Setup a trick in progress with 3 players already having played
      mockState.currentTrick = {
        leadingPlayerId: 'ai3',
        leadingCombo: [createMockCard('clubs_4_1', Suit.Clubs, Rank.Four)],
        plays: [
          {
            playerId: 'ai3',
            cards: [createMockCard('clubs_4_1', Suit.Clubs, Rank.Four)]
          },
          {
            playerId: 'human',
            cards: [createMockCard('spades_5_1', Suit.Spades, Rank.Five, 5)]
          },
          {
            playerId: 'ai1',
            cards: [createMockCard('clubs_j_1', Suit.Clubs, Rank.Jack)]
          }
        ],
        points: 5 // 5 points from the Spades 5
      };
      
      // Setup the current player to be the last player in the trick
      mockState.currentPlayerIndex = 2; // ai2
      
      // Mock determineTrickWinner to return ai1
      (gameLogic.determineTrickWinner as jest.Mock).mockReturnValue('ai1');
      
      // Process the play for the last player in the trick
      const cardsToPlay = [mockState.players[2].hand[0]]; // Spades 2
      const result = processPlay(mockState, cardsToPlay);
      
      // Verify the trick is complete
      expect(result.trickComplete).toBe(true);
      expect(result.trickWinner).toBe('Bot 1'); // ai1
      expect(result.trickPoints).toBe(5); // 5 points from the Spades 5
      
      // Verify the trick was added to the tricks array
      expect(result.newState.tricks).toHaveLength(1);
      
      // Verify the current trick was cleared
      expect(result.newState.currentTrick).toBeNull();
      
      // Verify the currentPlayerIndex was updated to the winning player
      expect(result.newState.currentPlayerIndex).toBe(1); // ai1
      
      // Verify points were awarded to the winning team
      expect(result.newState.teams[1].points).toBe(5); // Team B (ai1's team)
    });
  });

  describe('validatePlay', () => {
    test('should validate a play when leading a trick', () => {
      const mockState = createMockGameState();
      mockState.currentTrick = null; // Leading a trick
      
      const cardsToPlay = [mockState.players[0].hand[0]]; // Spades 5
      
      // Mock identifyCombos to return a valid combo
      (gameLogic.identifyCombos as jest.Mock).mockReturnValue([
        { type: 'Single', cards: cardsToPlay }
      ]);
      
      const result = validatePlay(mockState, cardsToPlay);
      
      // Verify identifyCombos was called with the player's hand
      expect(gameLogic.identifyCombos).toHaveBeenCalledWith(
        mockState.players[0].hand,
        mockState.trumpInfo
      );
      
      expect(result).toBe(true);
    });

    test('should validate a play when following a trick', () => {
      const mockState = createMockGameState();
      
      // Setup a trick in progress
      mockState.currentTrick = {
        leadingPlayerId: 'ai3',
        leadingCombo: [createMockCard('clubs_4_1', Suit.Clubs, Rank.Four)],
        plays: [
          {
            playerId: 'ai3',
            cards: [createMockCard('clubs_4_1', Suit.Clubs, Rank.Four)]
          }
        ],
        points: 0
      };
      
      const cardsToPlay = [mockState.players[0].hand[0]]; // Spades 5
      
      // Mock isValidPlay to return true
      (gameLogic.isValidPlay as jest.Mock).mockReturnValue(true);
      
      const result = validatePlay(mockState, cardsToPlay);
      
      // Verify isValidPlay was called with the correct parameters
      expect(gameLogic.isValidPlay).toHaveBeenCalledWith(
        cardsToPlay,
        mockState.currentTrick.leadingCombo,
        mockState.players[0].hand,
        mockState.trumpInfo
      );
      
      expect(result).toBe(true);
    });

    test('should return false for invalid plays', () => {
      const mockState = createMockGameState();
      
      // Return false for invalid plays
      expect(validatePlay(mockState, [])).toBe(false);
      
      // Setup state to be null
      expect(validatePlay(null as unknown as GameState, [createMockCard('spades_5_1', Suit.Spades, Rank.Five)])).toBe(false);
    });
  });

  describe('getAIMoveWithErrorHandling', () => {
    test('should return AI move when successful', () => {
      const mockState = createMockGameState();
      mockState.currentPlayerIndex = 1; // ai1
      
      const aiMove = [mockState.players[1].hand[0]]; // Diamonds 3
      
      // Mock getAIMove to return a valid move
      (aiLogic.getAIMove as jest.Mock).mockReturnValue(aiMove);
      
      const result = getAIMoveWithErrorHandling(mockState);
      
      // Verify getAIMove was called with the correct parameters
      expect(aiLogic.getAIMove).toHaveBeenCalledWith(mockState, 'ai1');
      
      expect(result).toEqual({
        cards: aiMove,
      });
    });

    test('should return error when called for human player', () => {
      const mockState = createMockGameState();
      mockState.currentPlayerIndex = 0; // human
      
      const result = getAIMoveWithErrorHandling(mockState);
      
      expect(result).toEqual({
        cards: [],
        error: 'Function called for human player'
      });
    });

    test('should handle empty AI move by returning fallback card', () => {
      const mockState = createMockGameState();
      mockState.currentPlayerIndex = 1; // ai1
      
      // Mock getAIMove to return an empty move
      (aiLogic.getAIMove as jest.Mock).mockReturnValue([]);
      
      const result = getAIMoveWithErrorHandling(mockState);
      
      expect(result).toEqual({
        cards: [mockState.players[1].hand[0]] // First card in hand as fallback
      });
    });

    test('should handle error in AI move logic', () => {
      const mockState = createMockGameState();
      mockState.currentPlayerIndex = 1; // ai1
      
      // Mock getAIMove to throw an error
      (aiLogic.getAIMove as jest.Mock).mockImplementation(() => {
        throw new Error('AI error');
      });
      
      const result = getAIMoveWithErrorHandling(mockState);
      
      expect(result.cards).toEqual([]);
      expect(result.error).toContain('Error generating AI move');
    });
  });
});