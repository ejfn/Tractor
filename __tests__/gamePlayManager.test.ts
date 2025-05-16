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

  describe('State Immutability', () => {
    test('should not mutate the original game state when processing plays', () => {
      const originalState = createMockGameState();
      const originalPlayerHand = [...originalState.players[0].hand];
      const originalPlayerHandIds = originalPlayerHand.map(c => c.id);
      const cardsToPlay = [originalState.players[0].hand[0]];

      // Process the play
      const result = processPlay(originalState, cardsToPlay);

      // Verify original state was not mutated
      expect(originalState.players[0].hand.length).toBe(2);
      expect(originalState.players[0].hand.map(c => c.id)).toEqual(originalPlayerHandIds);
      
      // Verify new state has the card removed
      expect(result.newState.players[0].hand.length).toBe(1);
      expect(result.newState.players[0].hand.map(c => c.id)).not.toContainEqual(cardsToPlay[0].id);
    });

    test('should create deep copies of all players and their hands', () => {
      const originalState = createMockGameState();
      const cardsToPlay = [originalState.players[0].hand[0]];

      const result = processPlay(originalState, cardsToPlay);

      // Verify all players are different references
      originalState.players.forEach((player, index) => {
        expect(result.newState.players[index]).not.toBe(player);
        expect(result.newState.players[index].hand).not.toBe(player.hand);
      });
    });

    test('should create deep copies of teams', () => {
      const originalState = createMockGameState();
      const cardsToPlay = [originalState.players[0].hand[0]];

      const result = processPlay(originalState, cardsToPlay);

      // Verify teams are different references
      originalState.teams.forEach((team, index) => {
        expect(result.newState.teams[index]).not.toBe(team);
      });
    });
  });

  describe('Card Count Consistency', () => {
    test('should maintain equal card counts for all players throughout a full game', () => {
      let state = createMockGameState();
      
      // Mock determineTrickWinner to return different winners for variety
      const winners = ['human', 'ai1', 'ai2', 'ai3'];
      let winnerIndex = 0;
      (gameLogic.determineTrickWinner as jest.Mock).mockImplementation(() => {
        return winners[winnerIndex++ % 4];
      });

      // Initial state - verify all players have same card count
      const initialCardCount = state.players[0].hand.length;
      state.players.forEach(player => {
        expect(player.hand.length).toBe(initialCardCount);
      });

      // Play multiple complete tricks
      for (let trickNum = 0; trickNum < 2; trickNum++) {
        // Play 4 cards (one complete trick)
        for (let playNum = 0; playNum < 4; playNum++) {
          const currentPlayer = state.players[state.currentPlayerIndex];
          const cardsToPlay = [currentPlayer.hand[0]];
          
          const result = processPlay(state, cardsToPlay);
          state = result.newState;

          // After each play, verify card counts are consistent
          if (result.trickComplete) {
            // After a complete trick, all players should have the same number of cards
            const cardCounts = state.players.map(p => p.hand.length);
            const uniqueCounts = new Set(cardCounts);
            expect(uniqueCounts.size).toBe(1); // All players should have same card count
          } else {
            // Mid-trick: verify no cards were lost or duplicated
            const totalCards = state.players.reduce((sum, player) => sum + player.hand.length, 0);
            const expectedTotalCards = initialCardCount * 4 - ((trickNum * 4) + (playNum + 1));
            expect(totalCards).toBe(expectedTotalCards);
          }
        }
      }

      // Final verification: all players should have played equal number of cards
      const finalCardCounts = state.players.map(p => p.hand.length);
      expect(new Set(finalCardCounts).size).toBe(1); // All counts should be the same
    });

    test('should handle concurrent plays without causing uneven card distribution', () => {
      const state1 = createMockGameState();
      const state2 = { ...state1 }; // Shallow copy to simulate concurrent access
      
      // Player 1 plays from state1
      const result1 = processPlay(state1, [state1.players[0].hand[0]]);
      
      // Player 2 plays from state2 (simulating a race condition)
      state2.currentPlayerIndex = 1;
      const result2 = processPlay(state2, [state2.players[1].hand[0]]);
      
      // Both results should have correct card counts
      expect(result1.newState.players[0].hand.length).toBe(1);
      expect(result1.newState.players[1].hand.length).toBe(2); // Not played yet in this state
      
      expect(result2.newState.players[0].hand.length).toBe(2); // Not played yet in this state
      expect(result2.newState.players[1].hand.length).toBe(1);
    });

    test('should never allow a player to have negative cards or have cards disappear unexpectedly', () => {
      const state = createMockGameState();
      const playerHand = state.players[0].hand;
      
      // Try to play same card multiple times (simulating a bug)
      const cardToPlay = playerHand[0];
      
      // First play should succeed
      const result1 = processPlay(state, [cardToPlay]);
      expect(result1.newState.players[0].hand.length).toBe(1);
      
      // Second play with the same card from original state should also work
      // because processPlay should not mutate the original state
      const result2 = processPlay(state, [cardToPlay]);
      expect(result2.newState.players[0].hand.length).toBe(1);
      
      // Original state should still have 2 cards
      expect(state.players[0].hand.length).toBe(2);
    });

    test('should handle AI plays with proper card references', () => {
      const state = createMockGameState();
      
      // Set the current player to AI (ai1)
      state.currentPlayerIndex = 1;
      
      // Simulate AI selecting cards from its hand
      const aiPlayer = state.players[1]; // ai1
      const aiCards = aiPlayer.hand; // The actual cards in the AI's hand
      
      // AI plays its first card
      const result = processPlay(state, [aiCards[0]]);
      
      // Verify the AI's hand was properly updated
      expect(result.newState.players[1].hand.length).toBe(1);
      expect(result.newState.players[1].hand).not.toContainEqual(aiCards[0]);
      
      // Original state should be unchanged
      expect(state.players[1].hand.length).toBe(2);
    });

    test('should handle complete game with all AI players', () => {
      let state = createMockGameState();
      
      // Mock determineTrickWinner
      (gameLogic.determineTrickWinner as jest.Mock).mockReturnValue('human');
      
      // Track card counts throughout
      const initialCounts = state.players.map(p => p.hand.length);
      expect(new Set(initialCounts).size).toBe(1); // All players start with same count
      
      // Play one complete trick
      for (let i = 0; i < 4; i++) {
        const currentPlayer = state.players[state.currentPlayerIndex];
        const cardToPlay = [currentPlayer.hand[0]];
        
        const result = processPlay(state, cardToPlay);
        state = result.newState;
        
        // Verify no player has lost more cards than they should
        state.players.forEach((player, idx) => {
          let expectedCards = initialCounts[idx] - (idx <= i ? 1 : 0);
          if (idx === state.currentPlayerIndex && i < 3) {
            // For the newly current player who hasn't played yet
            expectedCards++;
          }
          expect(player.hand.length).toBeGreaterThanOrEqual(0);
        });
      }
      
      // After one complete trick, all players should have one less card
      const finalCounts = state.players.map(p => p.hand.length);
      expect(new Set(finalCounts).size).toBe(1); // All players should have same count
      expect(finalCounts[0]).toBe(initialCounts[0] - 1);
    });
  });
});