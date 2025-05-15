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
      
      // UPDATED: First player's cards are stored in leadingCombo, not in plays array
      expect(result.newState.currentTrick?.plays).toHaveLength(0);
      // Leading player's cards are in leadingCombo, not plays array
      // expect(result.newState.currentTrick?.plays[0].playerId).toBe('human');
      // expect(result.newState.currentTrick?.plays[0].cards).toEqual(cardsToPlay);
      
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
      
      // Start fresh with a clear game state for this test
      const freshState = createMockGameState();
      
      // Setup a trick in progress with 3 players having played
      // For a 4-player game, we need leader + 3 followers to complete a trick
      freshState.currentTrick = {
        leadingPlayerId: 'ai1',  // Bot 1 led
        leadingCombo: [createMockCard('diamonds_3_1', Suit.Diamonds, Rank.Three)],
        plays: [
          // Human has played 
          {
            playerId: 'human',
            cards: [createMockCard('spades_5_1', Suit.Spades, Rank.Five, 5)]
          },
          // Bot 2 has played
          {
            playerId: 'ai2',
            cards: [createMockCard('spades_2_1', Suit.Spades, Rank.Two)]
          }
        ],
        points: 5 // 5 points from the Spades 5
      };
      
      // Setup the current player to be the last player in the trick (Bot 3)
      freshState.currentPlayerIndex = 3; // ai3
      
      // Mock determineTrickWinner to return ai1
      (gameLogic.determineTrickWinner as jest.Mock).mockReturnValue('ai1');
      
      // Process the play for the last player in the trick (Bot 3)
      const cardsToPlay = [freshState.players[3].hand[0]]; // Clubs 4 
      const result = processPlay(freshState, cardsToPlay);
      
      // Verify the trick is complete
      expect(result.trickComplete).toBe(true);
      expect(result.trickWinner).toBe('Bot 1'); // ai1
      expect(result.trickPoints).toBe(5); // 5 points from the Spades 5
      
      // Verify the trick was added to the tricks array
      expect(result.newState.tricks).toHaveLength(1);
      
      // UPDATED: Verify the current trick is NOT cleared immediately
      // as per our new trick result display logic
      expect(result.newState.currentTrick).not.toBeNull();
      
      // With our new implementation, we set winningPlayerIndex but don't change currentPlayerIndex yet
      // That happens in handleTrickResultComplete
      expect(result.newState.winningPlayerIndex).toBe(1); // ai1
      
      // Verify points were awarded to the winning team
      expect(result.newState.teams[1].points).toBe(5); // Team B (ai1's team)
      
      // Verify the completedTrick is returned properly
      expect(result.completedTrick).toBeTruthy();
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
      // NOTE: This test intentionally triggers a console warning to verify error handling
      // The warning "getAIMoveWithErrorHandling called for human player" is expected
      const mockState = createMockGameState();
      mockState.currentPlayerIndex = 0; // human
      
      const result = getAIMoveWithErrorHandling(mockState);
      
      expect(result).toEqual({
        cards: [],
        error: 'Function called for human player'
      });
    });

    test('should handle empty AI move by returning fallback card', () => {
      // NOTE: This test intentionally triggers a console warning to verify fallback behavior
      // The warning "AI player ai1 returned an empty move" is expected
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
      // NOTE: This test intentionally triggers a console error to verify error handling
      // The error "Error in AI move logic: Error: AI error" is expected
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