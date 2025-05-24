import {
  processPlay,
  validatePlay,
  getAIMoveWithErrorHandling
} from '../../src/utils/gamePlayManager';
import { 
  GameState, 
  Card, 
  Rank, 
  Suit, 
  JokerType, 
  TrumpInfo,
  PlayerPosition 
} from '../../src/types/game';
import { GameStateUtils } from '../../src/utils/gameStateUtils';
import * as gameLogic from '../../src/utils/gameLogic';
import * as aiLogic from '../../src/utils/aiLogic';

// Helper function to get current player ID from game state
function getCurrentPlayerId(gameState: GameState): string {
  if (gameState.gamePhase === 'playing' && gameState.currentTrick) {
    // During play, determine next player based on trick state
    const trickPlayCount = gameState.currentTrick.plays.length;
    const leadPlayerIndex = GameStateUtils.getPlayerIndex(gameState, gameState.currentTrick.leadingPlayerId);
    const playersInOrder = GameStateUtils.getPlayersInOrder(gameState);
    const currentPlayerIndex = (leadPlayerIndex + trickPlayCount + 1) % playersInOrder.length;
    return playersInOrder[currentPlayerIndex].id;
  } else if (gameState.gamePhase === 'playing' && !gameState.currentTrick) {
    // No active trick - check if there's a completed trick to find the winner
    if (gameState.tricks.length > 0) {
      const lastTrick = gameState.tricks[gameState.tricks.length - 1];
      const playersInOrder = GameStateUtils.getPlayersInOrder(gameState);
      return lastTrick.winningPlayerId || playersInOrder[0].id;
    } else {
      // First trick of the round - use first player
      const playersInOrder = GameStateUtils.getPlayersInOrder(gameState);
      return playersInOrder[0].id;
    }
  } else {
    // Not in playing phase - use first player as default
    const playersInOrder = GameStateUtils.getPlayersInOrder(gameState);
    return playersInOrder[0].id;
  }
}

// Mock dependencies
jest.mock('../../src/utils/gameLogic', () => ({
  identifyCombos: jest.fn(),
  isValidPlay: jest.fn(),
  determineTrickWinner: jest.fn()
}));

jest.mock('../../src/utils/aiLogic', () => ({
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
    players: {
      'player': {
        id: 'player',
        name: 'You',
        isHuman: true,
        hand: [
          createMockCard('spades_5_1', Suit.Spades, Rank.Five, 5),
          createMockCard('hearts_k_1', Suit.Hearts, Rank.King, 10)
        ],
        teamId: 'A',
        position: 'bottom' as PlayerPosition,
        isThinking: false
      },
      'ai1': {
        id: 'ai1',
        name: 'Bot 1',
        isHuman: false,
        hand: [
          createMockCard('diamonds_3_1', Suit.Diamonds, Rank.Three),
          createMockCard('clubs_j_1', Suit.Clubs, Rank.Jack)
        ],
        teamId: 'B',
        position: 'right' as PlayerPosition,
        isThinking: false
      },
      'ai2': {
        id: 'ai2',
        name: 'Bot 2',
        isHuman: false,
        hand: [
          createMockCard('spades_2_1', Suit.Spades, Rank.Two),
          createMockCard('hearts_a_1', Suit.Hearts, Rank.Ace)
        ],
        teamId: 'A',
        position: 'top' as PlayerPosition,
        isThinking: false
      },
      'ai3': {
        id: 'ai3',
        name: 'Bot 3',
        isHuman: false,
        hand: [
          createMockCard('clubs_4_1', Suit.Clubs, Rank.Four),
          createMockCard('diamonds_10_1', Suit.Diamonds, Rank.Ten, 10)
        ],
        teamId: 'B',
        position: 'left' as PlayerPosition,
        isThinking: false
      }
    },
    teams: {
      'A': {
        id: 'A',
        points: 0,
        currentRank: Rank.Two,
        isDefending: true
      },
      'B': {
        id: 'B',
        points: 0,
        currentRank: Rank.Two,
        isDefending: false
      }
    },
    trumpInfo: {
      trumpRank: Rank.Two,
      trumpSuit: Suit.Spades,
      declared: true
    },
    gamePhase: 'playing',
    roundNumber: 1,
    currentTrick: null,
    tricks: [],
    deck: [],
    kittyCards: [],
    currentPlayerId: 'player',
    selectedCards: []
  };
};

describe('gamePlayManager', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processPlay', () => {
    test('should process a play and update the game state correctly', () => {
      const mockState = createMockGameState();
      const humanPlayer = GameStateUtils.getPlayerById(mockState, 'player');
      const cardsToPlay = [humanPlayer.hand[0]]; // Spades 5
      
      // Initial play - should create a new trick
      const result = processPlay(mockState, cardsToPlay, 'player');
      
      // Verify the state was updated correctly
      expect(result.newState.currentTrick).toBeTruthy();
      expect(result.newState.currentTrick?.leadingPlayerId).toBe('player');
      expect(result.newState.currentTrick?.leadingCombo).toEqual(cardsToPlay);
      
      // UPDATED: First player's cards are stored in leadingCombo, not in plays array
      expect(result.newState.currentTrick?.plays).toHaveLength(0);
      // Leading player's cards are in leadingCombo, not plays array
      // expect(result.newState.currentTrick?.plays[0].playerId).toBe('player');
      // expect(result.newState.currentTrick?.plays[0].cards).toEqual(cardsToPlay);
      
      expect(result.newState.currentTrick?.points).toBe(5); // 5 points from the card
      
      // Verify the card was removed from the player's hand
      const updatedHumanPlayer = GameStateUtils.getPlayerById(result.newState, 'player');
      expect(updatedHumanPlayer.hand).toHaveLength(1);
      expect(updatedHumanPlayer.hand[0].id).toBe('hearts_k_1');
      
      // Verify the trick was created and play setup correctly
      // The next player would be determined by the trick state
      expect(result.newState.currentTrick?.plays).toHaveLength(0); // Human leads, so no plays yet
      
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
            playerId: 'player',
            cards: [createMockCard('spades_5_1', Suit.Spades, Rank.Five, 5)]
          },
          {
            playerId: 'ai1',
            cards: [createMockCard('clubs_j_1', Suit.Clubs, Rank.Jack)]
          }
        ],
        points: 5 // 5 points from the Spades 5
      };
      
      
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
            playerId: 'player',
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
      
      
      // Mock determineTrickWinner to return ai1
      (gameLogic.determineTrickWinner as jest.Mock).mockReturnValue('ai1');
      
      // Process the play for the last player in the trick (Bot 3)
      const ai3Player = GameStateUtils.getPlayerById(freshState, 'ai3');
      const cardsToPlay = [ai3Player.hand[0]]; // Clubs 4 
      const result = processPlay(freshState, cardsToPlay, 'ai3');
      
      // Verify the trick is complete
      expect(result.trickComplete).toBe(true);
      expect(result.trickWinner).toBe('Bot 1'); // ai1
      expect(result.trickPoints).toBe(5); // 5 points from the Spades 5
      
      // Verify the trick was added to the tricks array
      expect(result.newState.tricks).toHaveLength(1);
      
      // UPDATED: Verify the current trick is NOT cleared immediately
      // as per our new trick result display logic
      expect(result.newState.currentTrick).not.toBeNull();
      
      // Verify the trick was completed with proper winner
      expect(result.newState.tricks).toHaveLength(1);
      expect(result.newState.tricks[0].winningPlayerId).toBe('ai1');
      
      // Verify points were awarded to the winning team
      const teamB = GameStateUtils.getTeam(result.newState, 'B');
      expect(teamB.points).toBe(5); // Team B (ai1's team)
      
      // Verify the completedTrick is returned properly
      expect(result.completedTrick).toBeTruthy();
    });
  });

  describe('validatePlay', () => {
    test('should validate a play when leading a trick', () => {
      const mockState = createMockGameState();
      mockState.currentTrick = null; // Leading a trick
      
      const humanPlayer = GameStateUtils.getPlayerById(mockState, 'player');
      const cardsToPlay = [humanPlayer.hand[0]]; // Spades 5
      
      // Mock identifyCombos to return a valid combo
      (gameLogic.identifyCombos as jest.Mock).mockReturnValue([
        { type: 'Single', cards: cardsToPlay }
      ]);
      
      const result = validatePlay(mockState, cardsToPlay, 'player');
      
      // Verify identifyCombos was called with the player's hand
      expect(gameLogic.identifyCombos).toHaveBeenCalledWith(
        humanPlayer.hand,
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
      
      const cardsToPlay = [mockState.players['player'].hand[0]]; // Spades 5
      
      // Mock isValidPlay to return true
      (gameLogic.isValidPlay as jest.Mock).mockReturnValue(true);
      
      const result = validatePlay(mockState, cardsToPlay, 'player');
      
      // Verify isValidPlay was called with the correct parameters
      const humanPlayer = GameStateUtils.getPlayerById(mockState, 'player');
      expect(gameLogic.isValidPlay).toHaveBeenCalledWith(
        cardsToPlay,
        mockState.currentTrick.leadingCombo,
        humanPlayer.hand,
        mockState.trumpInfo
      );
      
      expect(result).toBe(true);
    });

    test('should return false for invalid plays', () => {
      const mockState = createMockGameState();
      
      // Return false for invalid plays
      expect(validatePlay(mockState, [], 'player')).toBe(false);
      
      // Setup state to be null
      expect(validatePlay(null as unknown as GameState, [createMockCard('spades_5_1', Suit.Spades, Rank.Five)], 'player')).toBe(false);
    });
  });

  describe('getAIMoveWithErrorHandling', () => {
    test('should return AI move when successful', () => {
      const mockState = createMockGameState();
      
      const ai1Player = GameStateUtils.getPlayerById(mockState, 'ai1');
      const aiMove = [ai1Player.hand[0]]; // Diamonds 3
      
      // Mock getAIMove to return a valid move
      (aiLogic.getAIMove as jest.Mock).mockReturnValue(aiMove);
      
      const result = getAIMoveWithErrorHandling(mockState, 'ai1');
      
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
      
      const result = getAIMoveWithErrorHandling(mockState, 'player');
      
      expect(result).toEqual({
        cards: [],
        error: 'Function called for human player'
      });
    });

    test('should handle empty AI move by returning fallback card', () => {
      // NOTE: This test intentionally triggers a console warning to verify fallback behavior
      // The warning "AI player ai1 returned an empty move" is expected
      const mockState = createMockGameState();
      
      // Mock getAIMove to return an empty move
      (aiLogic.getAIMove as jest.Mock).mockReturnValue([]);
      
      const result = getAIMoveWithErrorHandling(mockState, 'ai1');
      
      const ai1Player = GameStateUtils.getPlayerById(mockState, 'ai1');
      expect(result).toEqual({
        cards: [ai1Player.hand[0]] // First card in hand as fallback
      });
    });

    test('should handle error in AI move logic', () => {
      // NOTE: This test intentionally triggers a console error to verify error handling
      // The error "Error in AI move logic: Error: AI error" is expected
      const mockState = createMockGameState();
      
      // Mock getAIMove to throw an error
      (aiLogic.getAIMove as jest.Mock).mockImplementation(() => {
        throw new Error('AI error');
      });
      
      const result = getAIMoveWithErrorHandling(mockState, 'ai1');
      
      expect(result.cards).toEqual([]);
      expect(result.error).toContain('Error generating AI move');
    });
  });

  describe('State Immutability', () => {
    test('should not mutate the original game state when processing plays', () => {
      const originalState = createMockGameState();
      const originalHumanPlayer = GameStateUtils.getPlayerById(originalState, 'player');
      const originalPlayerHand = [...originalHumanPlayer.hand];
      const originalPlayerHandIds = originalPlayerHand.map(c => c.id);
      const cardsToPlay = [originalHumanPlayer.hand[0]];

      // Process the play
      const result = processPlay(originalState, cardsToPlay, 'player');

      // Verify original state was not mutated
      const originalHumanPlayerAfter = GameStateUtils.getPlayerById(originalState, 'player');
      expect(originalHumanPlayerAfter.hand.length).toBe(2);
      expect(originalHumanPlayerAfter.hand.map(c => c.id)).toEqual(originalPlayerHandIds);
      
      // Verify new state has the card removed
      const newHumanPlayer = GameStateUtils.getPlayerById(result.newState, 'player');
      expect(newHumanPlayer.hand.length).toBe(1);
      expect(newHumanPlayer.hand.map(c => c.id)).not.toContainEqual(cardsToPlay[0].id);
    });

    test('should create deep copies of all players and their hands', () => {
      const originalState = createMockGameState();
      const humanPlayer = GameStateUtils.getPlayerById(originalState, 'player');
      const cardsToPlay = [humanPlayer.hand[0]];

      const result = processPlay(originalState, cardsToPlay, 'player');

      // Verify all players are different references
      const originalPlayers = GameStateUtils.getAllPlayers(originalState);
      originalPlayers.forEach((player) => {
        const newPlayer = GameStateUtils.getPlayerById(result.newState, player.id);
        expect(newPlayer).not.toBe(player);
        expect(newPlayer.hand).not.toBe(player.hand);
      });
    });

    test('should create deep copies of teams', () => {
      const originalState = createMockGameState();
      const humanPlayer = GameStateUtils.getPlayerById(originalState, 'player');
      const cardsToPlay = [humanPlayer.hand[0]];

      const result = processPlay(originalState, cardsToPlay, 'player');

      // Verify teams are different references
      const originalTeams = GameStateUtils.getAllTeams(originalState);
      originalTeams.forEach((team) => {
        const newTeam = GameStateUtils.getTeam(result.newState, team.id);
        expect(newTeam).not.toBe(team);
      });
    });
  });

  describe('Card Count Consistency', () => {
    test('should maintain equal card counts for all players throughout a full game', () => {
      let state = createMockGameState();
      
      // Mock determineTrickWinner to return different winners for variety
      const winners = ['player', 'ai1', 'ai2', 'ai3'];
      let winnerIndex = 0;
      (gameLogic.determineTrickWinner as jest.Mock).mockImplementation(() => {
        return winners[winnerIndex++ % 4];
      });

      // Initial state - verify all players have same card count
      const players = GameStateUtils.getAllPlayers(state);
      const initialCardCount = players[0].hand.length;
      players.forEach(player => {
        expect(player.hand.length).toBe(initialCardCount);
      });

      // Play multiple complete tricks
      for (let trickNum = 0; trickNum < 2; trickNum++) {
        // Play 4 cards (one complete trick)
        for (let playNum = 0; playNum < 4; playNum++) {
          const currentPlayerId = getCurrentPlayerId(state);
          const currentPlayer = GameStateUtils.findPlayerById(state, currentPlayerId);
          if (!currentPlayer) {
            throw new Error(`No current player found with ID ${currentPlayerId}`);
          }
          const cardsToPlay = [currentPlayer.hand[0]];
          
          const result = processPlay(state, cardsToPlay, currentPlayer.id);
          state = result.newState;

          // After each play, verify card counts are consistent
          if (result.trickComplete) {
            // After a complete trick, all players should have the same number of cards
            const allPlayers = GameStateUtils.getAllPlayers(state);
            const cardCounts = allPlayers.map(p => p.hand.length);
            const uniqueCounts = new Set(cardCounts);
            expect(uniqueCounts.size).toBe(1); // All players should have same card count
          } else {
            // Mid-trick: verify no cards were lost or duplicated
            const allPlayers = GameStateUtils.getAllPlayers(state);
            const totalCards = allPlayers.reduce((sum, player) => sum + player.hand.length, 0);
            const currentPlayerIndex = GameStateUtils.getPlayerIndex(state, currentPlayer.id);
            const expectedTotalCards = initialCardCount * 4 - ((trickNum * 4) + (playNum + 1));
            expect(totalCards).toBe(expectedTotalCards);
          }
        }
      }

      // Final verification: all players should have played equal number of cards
      const allPlayers = GameStateUtils.getAllPlayers(state);
      const finalCardCounts = allPlayers.map(p => p.hand.length);
      expect(new Set(finalCardCounts).size).toBe(1); // All counts should be the same
    });

    test('should handle concurrent plays without causing uneven card distribution', () => {
      const state1 = createMockGameState();
      const state2 = { ...state1 }; // Shallow copy to simulate concurrent access
      
      // Player 1 plays from state1
      const player1 = GameStateUtils.getPlayerById(state1, 'player');
      const result1 = processPlay(state1, [player1.hand[0]], player1.id);
      
      // Player 2 plays from state2 (simulating a race condition)
      const player2 = GameStateUtils.getPlayerById(state2, 'ai1');
      const result2 = processPlay(state2, [player2.hand[0]], player2.id);
      
      // Both results should have correct card counts
      expect(GameStateUtils.getPlayerById(result1.newState, 'player').hand.length).toBe(1);
      expect(GameStateUtils.getPlayerById(result1.newState, 'ai1').hand.length).toBe(2); // Not played yet in this state
      
      expect(GameStateUtils.getPlayerById(result2.newState, 'player').hand.length).toBe(2); // Not played yet in this state
      expect(GameStateUtils.getPlayerById(result2.newState, 'ai1').hand.length).toBe(1);
    });

    test('should never allow a player to have negative cards or have cards disappear unexpectedly', () => {
      const state = createMockGameState();
      const humanPlayer = GameStateUtils.getPlayerById(state, 'player');
      const playerHand = humanPlayer.hand;
      
      // Try to play same card multiple times (simulating a bug)
      const cardToPlay = playerHand[0];
      
      // First play should succeed
      const result1 = processPlay(state, [cardToPlay], 'player');
      expect(GameStateUtils.getPlayerById(result1.newState, 'player').hand.length).toBe(1);
      
      // Second play with the same card from original state should also work
      // because processPlay should not mutate the original state
      const result2 = processPlay(state, [cardToPlay], 'player');
      expect(GameStateUtils.getPlayerById(result2.newState, 'player').hand.length).toBe(1);
      
      // Original state should still have 2 cards
      expect(GameStateUtils.getPlayerById(state, 'player').hand.length).toBe(2);
    });

    test('should handle AI plays with proper card references', () => {
      const state = createMockGameState();
      
      // Simulate AI selecting cards from its hand
      const aiPlayer = GameStateUtils.getPlayerById(state, 'ai1');
      const aiCards = aiPlayer.hand; // The actual cards in the AI's hand
      
      // AI plays its first card
      const result = processPlay(state, [aiCards[0]], 'ai1');
      
      // Verify the AI's hand was properly updated
      const updatedAiPlayer = GameStateUtils.getPlayerById(result.newState, 'ai1');
      expect(updatedAiPlayer.hand.length).toBe(1);
      expect(updatedAiPlayer.hand).not.toContainEqual(aiCards[0]);
      
      // Original state should be unchanged
      expect(GameStateUtils.getPlayerById(state, 'ai1').hand.length).toBe(2);
    });

    test('should handle complete game with all AI players', () => {
      let state = createMockGameState();
      
      // Mock determineTrickWinner
      (gameLogic.determineTrickWinner as jest.Mock).mockReturnValue('player');
      
      // Track card counts throughout
      const allPlayers = GameStateUtils.getAllPlayers(state);
      const initialCounts = allPlayers.map(p => p.hand.length);
      expect(new Set(initialCounts).size).toBe(1); // All players start with same count
      
      // Play one complete trick
      for (let i = 0; i < 4; i++) {
        const currentPlayerId = getCurrentPlayerId(state);
        const currentPlayer = GameStateUtils.findPlayerById(state, currentPlayerId);
        if (!currentPlayer) {
          throw new Error(`No current player found with ID ${currentPlayerId}`);
        }
        const cardToPlay = [currentPlayer.hand[0]];
        
        const result = processPlay(state, cardToPlay, currentPlayer.id);
        state = result.newState;
        
        // Verify no player has lost more cards than they should
        const currentPlayers = GameStateUtils.getAllPlayers(state);
        currentPlayers.forEach((player) => {
          expect(player.hand.length).toBeGreaterThanOrEqual(0);
        });
      }
      
      // After one complete trick, all players should have one less card
      const finalPlayers = GameStateUtils.getAllPlayers(state);
      const finalCounts = finalPlayers.map(p => p.hand.length);
      expect(new Set(finalCounts).size).toBe(1); // All players should have same count
      expect(finalCounts[0]).toBe(initialCounts[0] - 1);
    });
  });
});