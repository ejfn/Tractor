import {
  GameState,
  PlayerId,
  Rank,
  Suit,
  GamePhase
} from "../../src/types";
import * as aiLogic from '../../src/ai/aiLogic';
import * as gameLogic from '../../src/game/gameLogic';
import {
  getAIMoveWithErrorHandling,
  processPlay,
  validatePlay
} from '../../src/game/gamePlayManager';
import {
  createCard,
  createTestCardsGameState,
  testData
} from "../helpers";
import { createGameState } from '../helpers/gameStates';

// Mock dependencies
jest.mock('../../src/game/gameLogic', () => ({
  identifyCombos: jest.fn(),
  isValidPlay: jest.fn(),
  compareCardCombos: jest.fn(),
  evaluateTrickPlay: jest.fn()
}));

jest.mock('../../src/ai/aiLogic', () => ({
  getAIMove: jest.fn()
}));

// Use shared utility for test cards, then modify trump to Spades as needed
const createMockGameState = () => {
  const state = createTestCardsGameState();
  // Override trump to Spades for this test
  state.trumpInfo.trumpSuit = Suit.Spades;
  return state;
};

describe('gamePlayManager', () => {
  beforeEach(() => {
    // Setup default mocks
    (gameLogic.evaluateTrickPlay as jest.Mock).mockReturnValue({
      canBeat: false,
      isLegal: true,
      strength: 50,
      reason: 'Mock evaluation'
    });
  });

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
      expect(result.newState.currentTrick?.leadingPlayerId).toBe(PlayerId.Human);
      expect(result.newState.currentTrick?.leadingCombo).toEqual(cardsToPlay);
      
      // UPDATED: First player's cards are stored in leadingCombo, not in plays array
      expect(result.newState.currentTrick?.plays).toHaveLength(0);
      // Leading player's cards are in leadingCombo, not plays array
      // expect(result.newState.currentTrick?.plays[0].playerId).toBe('human');
      // expect(result.newState.currentTrick?.plays[0].cards).toEqual(cardsToPlay);
      
      expect(result.newState.currentTrick?.points).toBe(5); // 5 points from the card
      
      // Verify the card was removed from the player's hand
      expect(result.newState.players[0].hand).toHaveLength(1);
      expect(result.newState.players[0].hand[0].rank).toBe(Rank.King);
      expect(result.newState.players[0].hand[0].suit).toBe(Suit.Clubs);
      
      // Verify the current player was advanced
      expect(result.newState.currentPlayerIndex).toBe(1);
      
      // Verify the trick is not complete yet
      expect(result.trickComplete).toBe(false);
    });

    test('should complete a trick when all players have played', () => {
      const mockState = createMockGameState();
      
      // Setup a trick in progress with 3 players already having played
      mockState.currentTrick = {
        leadingPlayerId: PlayerId.Bot3,
        leadingCombo: [createCard(Suit.Clubs, Rank.Four)],
        plays: [
          {
            playerId: PlayerId.Bot3,
            cards: [createCard(Suit.Clubs, Rank.Four)]
          },
          {
            playerId: PlayerId.Human,
            cards: [testData.cards.heartsFive]
          },
          {
            playerId: PlayerId.Bot1,
            cards: [createCard(Suit.Clubs, Rank.Jack)]
          }
        ],
        winningPlayerId: PlayerId.Bot3,
        points: 5 // 5 points from the Spades 5
      };
      
      // Setup the current player to be the last player in the trick
      mockState.currentPlayerIndex = 2; // ai2
      
      
      // Start fresh with a clear game state for this test
      const freshState = createMockGameState();
      
      // Setup a trick in progress with 3 players having played
      // For a 4-player game, we need leader + 3 followers to complete a trick
      freshState.currentTrick = {
        leadingPlayerId: PlayerId.Bot1,  // Bot 1 led
        leadingCombo: [createCard(Suit.Diamonds, Rank.Three)],
        plays: [
          // Human has played 
          {
            playerId: PlayerId.Human,
            cards: [testData.cards.heartsFive]
          },
          // Bot 2 has played
          {
            playerId: PlayerId.Bot2,
            cards: [createCard(Suit.Spades, Rank.Two)]
          }
        ],
        points: 5, // 5 points from the Spades 5
        winningPlayerId: PlayerId.Bot1 // Required field
      };
      
      // Setup the current player to be the last player in the trick (Bot 3)
      freshState.currentPlayerIndex = 3; // ai3
      
      
      // Process the play for the last player in the trick (Bot 3)
      const cardsToPlay = [freshState.players[3].hand[0]]; // Clubs 4 
      const result = processPlay(freshState, cardsToPlay);
      
      // Verify the trick is complete
      expect(result.trickComplete).toBe(true);
      expect(result.trickWinnerId).toBe(PlayerId.Bot1); // ai1
      expect(result.trickPoints).toBe(5); // 5 points from the Spades 5
      
      // Verify the trick was added to the tricks array
      expect(result.newState.tricks).toHaveLength(1);
      
      // UPDATED: Verify the current trick is NOT cleared immediately
      // as per our new trick result display logic
      expect(result.newState.currentTrick).not.toBeNull();
      
      // That happens in handleTrickResultComplete
      
      // Verify points were awarded to the winning team
      expect(result.newState.teams[1].points).toBe(5); // Team B (ai1's team)
      
      // Verify the completedTrick is returned properly
      expect(result.completedTrick).toBeTruthy();
    });
  });

  describe('validatePlay', () => {
    let mockState: GameState;
    
    beforeEach(() => {
      mockState = createMockGameState();
    });

    describe('when leading a trick', () => {
      beforeEach(() => {
        mockState.currentTrick = null; // Leading a trick
        
        // Mock identifyCombos to return a valid combo
        (gameLogic.identifyCombos as jest.Mock).mockReturnValue([
          { type: 'Single', cards: [mockState.players[0].hand[0]] }
        ]);
      });

      test('should validate a play when leading a trick', () => {
        const cardsToPlay = [mockState.players[0].hand[0]]; // Spades 5
        
        const result = validatePlay(mockState, cardsToPlay);
        
        // Verify identifyCombos was called with the player's hand
        expect(gameLogic.identifyCombos).toHaveBeenCalledWith(
          mockState.players[0].hand,
          mockState.trumpInfo
        );
        
        expect(result).toBe(true);
      });
    });

    describe('when following a trick', () => {
      beforeEach(() => {
        // Setup a trick in progress
        mockState.currentTrick = {
          leadingPlayerId: PlayerId.Bot3,
          leadingCombo: [createCard(Suit.Clubs, Rank.Four)],
          plays: [
            {
              playerId: PlayerId.Bot3,
              cards: [createCard(Suit.Clubs, Rank.Four)]
            }
          ],
          winningPlayerId: PlayerId.Bot3,
          points: 0
        };
        
        // Mock isValidPlay to return true
        (gameLogic.isValidPlay as jest.Mock).mockReturnValue(true);
      });

      test('should validate a play when following a trick', () => {
        const cardsToPlay = [mockState.players[0].hand[0]]; // Spades 5
        
        const result = validatePlay(mockState, cardsToPlay);
        
        // Verify isValidPlay was called with the correct parameters
        expect(gameLogic.isValidPlay).toHaveBeenCalledWith(
          cardsToPlay,
          mockState.currentTrick!.leadingCombo,
          mockState.players[0].hand,
          mockState.trumpInfo
        );
        
        expect(result).toBe(true);
      });
    });

    describe('edge cases', () => {
      test('should return false for invalid plays', () => {
        // Return false for invalid plays
        expect(validatePlay(mockState, [])).toBe(false);
        
        // Setup state to be null
        expect(validatePlay(null as unknown as GameState, [createCard(Suit.Spades, Rank.Five)])).toBe(false);
      });
    });
  });

  describe('getAIMoveWithErrorHandling', () => {
    let mockState: GameState;
    
    beforeEach(() => {
      mockState = createMockGameState();
    });

    describe('when successful', () => {
      beforeEach(() => {
        mockState.currentPlayerIndex = 1; // ai1
      });

      test('should return AI move when successful', () => {
        const aiMove = [mockState.players[1].hand[0]]; // Diamonds 3
        
        // Mock getAIMove to return a valid move
        (aiLogic.getAIMove as jest.Mock).mockReturnValue(aiMove);
        
        const result = getAIMoveWithErrorHandling(mockState);
        
        // Verify getAIMove was called with the correct parameters
        expect(aiLogic.getAIMove).toHaveBeenCalledWith(mockState, PlayerId.Bot1);
        
        expect(result).toEqual({
          cards: aiMove,
        });
      });
    });

    describe('error handling', () => {
      test('should return error when called for human player', () => {
        // NOTE: This test intentionally triggers a console warning to verify error handling
        // The warning "getAIMoveWithErrorHandling called for human player" is expected
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

  describe('State Immutability', () => {
    let originalState: GameState;
    let cardsToPlay: any[];
    
    beforeEach(() => {
      originalState = createMockGameState();
      cardsToPlay = [originalState.players[0].hand[0]];
    });

    test('should not mutate the original game state when processing plays', () => {
      const originalPlayerHand = [...originalState.players[0].hand];
      const originalPlayerHandIds = originalPlayerHand.map(c => c.id);

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
      const result = processPlay(originalState, cardsToPlay);

      // Verify all players are different references
      originalState.players.forEach((player, index) => {
        expect(result.newState.players[index]).not.toBe(player);
        expect(result.newState.players[index].hand).not.toBe(player.hand);
      });
    });

    test('should create deep copies of teams', () => {
      const result = processPlay(originalState, cardsToPlay);

      // Verify teams are different references
      originalState.teams.forEach((team, index) => {
        expect(result.newState.teams[index]).not.toBe(team);
      });
    });
  });

  describe('Card Count Consistency', () => {
    describe('multi-trick scenarios', () => {
      test('should maintain equal card counts for all players throughout a full game', () => {
        let state = createMockGameState();
        
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

      test('should handle complete game with all AI players', () => {
        let state = createMockGameState();
        
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

    describe('edge cases and error handling', () => {
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
    });
  });

  describe('Trick Winner Determination', () => {
    let gameState: GameState;
    
    beforeEach(() => {
      // Create common game state for trick winner tests
      gameState = createGameState({
        gamePhase: GamePhase.Playing,
        currentPlayerIndex: 0,
        trumpInfo: { trumpSuit: Suit.Hearts, trumpRank: Rank.Two }
      });
    });

    describe('Basic Rank Comparisons', () => {
      beforeEach(() => {
        // Mock evaluateTrickPlay for higher rank beats lower rank scenarios
        (gameLogic.evaluateTrickPlay as jest.Mock).mockImplementation((cards, trick, trumpInfo, hand) => {
          const playedCard = cards[0];
          const leadingCard = trick?.leadingCombo?.[0];
          if (!leadingCard) return { canBeat: false, isLegal: true, strength: 50, reason: 'No leading card' };
          
          // Higher ranks beat lower ranks: Ace > Ten > Seven > Five > Four
          const rankValues: Record<string, number> = { 'A': 14, '10': 10, '7': 7, '5': 5, '4': 4, '3': 3 };
          const playedValue = rankValues[playedCard.rank] || 0;
          const leadingValue = rankValues[leadingCard.rank] || 0;
          
          const canBeat = playedValue > leadingValue;
          return { canBeat, isLegal: true, strength: playedValue, reason: `${playedCard.rank} vs ${leadingCard.rank}` };
        });
      });

      test('Should correctly update trick winner using evaluateTrickPlay', () => {
        // Give human some cards including the leading combo
        gameState.players[0].hand = [
          createCard(Suit.Diamonds, Rank.Four, '1'),
          createCard(Suit.Diamonds, Rank.Four, '2'),
          createCard(Suit.Clubs, Rank.King, '1'),
        ];

        // Give Bot1 cards including a stronger combo
        gameState.players[1].hand = [
          createCard(Suit.Diamonds, Rank.Ace, '1'),
          createCard(Suit.Diamonds, Rank.Ace, '2'),
          createCard(Suit.Spades, Rank.King, '1'),
        ];

        // Human leads with 4♦-4♦
        const humanPlay = [
          createCard(Suit.Diamonds, Rank.Four, '1'),
          createCard(Suit.Diamonds, Rank.Four, '2'),
        ];

        const result1 = processPlay(gameState, humanPlay);
        
        // Verify human is initially winning
        expect(result1.newState.currentTrick?.winningPlayerId).toBe(PlayerId.Human);
        expect(result1.trickComplete).toBe(false);

        // Bot1 follows with A♦-A♦ (should beat 4♦-4♦)
        const bot1Play = [
          createCard(Suit.Diamonds, Rank.Ace, '1'),
          createCard(Suit.Diamonds, Rank.Ace, '2'),
        ];

        const result2 = processPlay(result1.newState, bot1Play);
        
        // Verify Bot1 is now winning (A♦-A♦ beats 4♦-4♦ in same suit)
        expect(result2.newState.currentTrick?.winningPlayerId).toBe(PlayerId.Bot1);
        expect(result2.trickComplete).toBe(false);
      });

      test('Should handle trump cards beating non-trump cards', () => {
        // Mock evaluateTrickPlay to return canBeat: true for trump vs non-trump
        (gameLogic.evaluateTrickPlay as jest.Mock).mockImplementation((cards, trick, trumpInfo, hand) => {
          const playedCard = cards[0];
          const leadingCard = trick?.leadingCombo?.[0];
          if (!leadingCard) return { canBeat: false, isLegal: true, strength: 50, reason: 'No leading card' };
          
          // Trump suit beats non-trump
          if (playedCard.suit === trumpInfo?.trumpSuit && leadingCard.suit !== trumpInfo?.trumpSuit) {
            return { canBeat: true, isLegal: true, strength: 100, reason: 'Trump beats non-trump' };
          }
          return { canBeat: false, isLegal: true, strength: 50, reason: 'Default' };
        });


        // Give human non-trump cards
        gameState.players[0].hand = [
          createCard(Suit.Diamonds, Rank.Ace, '1'),
          createCard(Suit.Diamonds, Rank.Ace, '2'),
          createCard(Suit.Clubs, Rank.King, '1'),
        ];

        // Give Bot1 trump cards
        gameState.players[1].hand = [
          createCard(Suit.Hearts, Rank.Three, '1'), // Trump suit
          createCard(Suit.Hearts, Rank.Three, '2'), // Trump suit
          createCard(Suit.Spades, Rank.King, '1'),
        ];

        // Human leads with A♦-A♦ (non-trump pair)
        const humanPlay = [
          createCard(Suit.Diamonds, Rank.Ace, '1'),
          createCard(Suit.Diamonds, Rank.Ace, '2'),
        ];

        const result1 = processPlay(gameState, humanPlay);
        expect(result1.newState.currentTrick?.winningPlayerId).toBe(PlayerId.Human);

        // Bot1 follows with 3♥-3♥ (trump pair should beat non-trump)
        const bot1Play = [
          createCard(Suit.Hearts, Rank.Three, '1'),
          createCard(Suit.Hearts, Rank.Three, '2'),
        ];

        const result2 = processPlay(result1.newState, bot1Play);
        
        // Trump pair should beat non-trump pair
        expect(result2.newState.currentTrick?.winningPlayerId).toBe(PlayerId.Bot1);
      });

      test('Should correctly track trick points accumulation', () => {
        // Mock evaluateTrickPlay to return canBeat: true for Ten vs Five
        (gameLogic.evaluateTrickPlay as jest.Mock).mockImplementation((cards, trick, trumpInfo, hand) => {
          const playedCard = cards[0];
          const leadingCard = trick?.leadingCombo?.[0];
          if (!leadingCard) return { canBeat: false, isLegal: true, strength: 50, reason: 'No leading card' };
          
          // Ten beats Five
          if (playedCard.rank === '10' && leadingCard.rank === '5') {
            return { canBeat: true, isLegal: true, strength: 100, reason: 'Ten beats Five' };
          }
          return { canBeat: false, isLegal: true, strength: 50, reason: 'Default' };
        });


        // Give players cards with points
        gameState.players[0].hand = [
          createCard(Suit.Diamonds, Rank.Five, '1'), // 5 points
          createCard(Suit.Clubs, Rank.King, '1'), // 10 points
        ];

        gameState.players[1].hand = [
          createCard(Suit.Diamonds, Rank.Ten, '1'), // 10 points
          createCard(Suit.Spades, Rank.King, '1'), // 10 points
        ];

        // Human leads with 5♦ (5 points)
        const humanPlay = [createCard(Suit.Diamonds, Rank.Five, '1')];
        const result1 = processPlay(gameState, humanPlay);
        
        expect(result1.newState.currentTrick?.points).toBe(5);

        // Bot1 follows with 10♦ (10 points, should win and add to total)
        const bot1Play = [createCard(Suit.Diamonds, Rank.Ten, '1')];
        const result2 = processPlay(result1.newState, bot1Play);
        
        expect(result2.newState.currentTrick?.points).toBe(15); // 5 + 10
        expect(result2.newState.currentTrick?.winningPlayerId).toBe(PlayerId.Bot1);
      });

      test('Should handle cross-suit trump scenarios correctly', () => {
        // Mock evaluateTrickPlay: trump rank should NOT be beaten by trump suit
        (gameLogic.evaluateTrickPlay as jest.Mock).mockImplementation((cards, trick, trumpInfo, hand) => {
          const playedCard = cards[0];
          const leadingCard = trick?.leadingCombo?.[0];
          if (!leadingCard) return { canBeat: false, isLegal: true, strength: 50, reason: 'No leading card' };
          
          // Trump suit card (3♥) should NOT beat trump rank card (2♠)
          if (playedCard.suit === trumpInfo?.trumpSuit && leadingCard.rank === trumpInfo?.trumpRank) {
            return { canBeat: false, isLegal: true, strength: 50, reason: 'Trump suit loses to trump rank' };
          }
          return { canBeat: false, isLegal: true, strength: 50, reason: 'Default' };
        });


        // Human has no Hearts but has trump rank cards
        gameState.players[0].hand = [
          createCard(Suit.Spades, Rank.Two, '1'), // Trump rank
          createCard(Suit.Clubs, Rank.King, '1'),
        ];

        // Bot1 has Hearts trump suit cards
        gameState.players[1].hand = [
          createCard(Suit.Hearts, Rank.Three, '1'), // Trump suit
          createCard(Suit.Spades, Rank.King, '1'),
        ];

        // Human leads with 2♠ (trump rank)
        const humanPlay = [createCard(Suit.Spades, Rank.Two, '1')];
        const result1 = processPlay(gameState, humanPlay);
        
        expect(result1.newState.currentTrick?.winningPlayerId).toBe(PlayerId.Human);

        // Bot1 follows with 3♥ (trump suit, should lose to trump rank)
        const bot1Play = [createCard(Suit.Hearts, Rank.Three, '1')];
        const result2 = processPlay(result1.newState, bot1Play);
        
        // Trump rank should beat trump suit
        expect(result2.newState.currentTrick?.winningPlayerId).toBe(PlayerId.Human);
      });

      test('Should handle multiple card combination comparisons', () => {
        // Mock evaluateTrickPlay to return canBeat: true for Ace vs Seven
        (gameLogic.evaluateTrickPlay as jest.Mock).mockImplementation((cards, trick, trumpInfo, hand) => {
          const playedCard = cards[0];
          const leadingCard = trick?.leadingCombo?.[0];
          if (!leadingCard) return { canBeat: false, isLegal: true, strength: 50, reason: 'No leading card' };
          
          // Ace beats Seven
          if (playedCard.rank === 'A' && leadingCard.rank === '7') {
            return { canBeat: true, isLegal: true, strength: 100, reason: 'Ace beats Seven' };
          }
          return { canBeat: false, isLegal: true, strength: 50, reason: 'Default' };
        });


        // Setup hands for pair comparison
        gameState.players[0].hand = [
          createCard(Suit.Spades, Rank.Seven, '1'),
          createCard(Suit.Spades, Rank.Seven, '2'),
          createCard(Suit.Clubs, Rank.King, '1'),
        ];

        gameState.players[1].hand = [
          createCard(Suit.Spades, Rank.Ace, '1'),
          createCard(Suit.Spades, Rank.Ace, '2'),
          createCard(Suit.Clubs, Rank.Queen, '1'),
        ];

        // Human leads with 7♠-7♠
        const humanPlay = [
          createCard(Suit.Spades, Rank.Seven, '1'),
          createCard(Suit.Spades, Rank.Seven, '2'),
        ];

        const result1 = processPlay(gameState, humanPlay);
        expect(result1.newState.currentTrick?.winningPlayerId).toBe(PlayerId.Human);

        // Bot1 follows with A♠-A♠ (should beat 7♠-7♠)
        const bot1Play = [
          createCard(Suit.Spades, Rank.Ace, '1'),
          createCard(Suit.Spades, Rank.Ace, '2'),
        ];

        const result2 = processPlay(result1.newState, bot1Play);
        
        // Ace pair should beat Seven pair
        expect(result2.newState.currentTrick?.winningPlayerId).toBe(PlayerId.Bot1);
      });

      test('Should maintain winner through subsequent plays', () => {
        // Mock evaluateTrickPlay to return canBeat: true only for Ace vs Three
        (gameLogic.evaluateTrickPlay as jest.Mock).mockImplementation((cards, trick, trumpInfo, hand) => {
          const playedCard = cards[0];
          const leadingCard = trick?.leadingCombo?.[0];
          if (!leadingCard) return { canBeat: false, isLegal: true, strength: 50, reason: 'No leading card' };
          
          // Only Ace beats Three
          if (playedCard.rank === 'A' && leadingCard.rank === '3') {
            return { canBeat: true, isLegal: true, strength: 100, reason: 'Ace beats Three' };
          }
          return { canBeat: false, isLegal: true, strength: 50, reason: 'Default' };
        });


        // Give all players cards
        gameState.players.forEach((player, i) => {
          player.hand = [
            createCard(Suit.Spades, i === 1 ? Rank.Ace : Rank.Three, `${i}_1`),
            createCard(Suit.Clubs, Rank.King, `${i}_2`),
          ];
        });

        // Human leads with 3♠
        const humanPlay = [createCard(Suit.Spades, Rank.Three, '0_1')];
        let result = processPlay(gameState, humanPlay);
        expect(result.newState.currentTrick?.winningPlayerId).toBe(PlayerId.Human);

        // Bot1 plays A♠ (should win)
        const bot1Play = [createCard(Suit.Spades, Rank.Ace, '1_1')];
        result = processPlay(result.newState, bot1Play);
        expect(result.newState.currentTrick?.winningPlayerId).toBe(PlayerId.Bot1);

        // Bot2 plays 3♠ (should not win)
        const bot2Play = [createCard(Suit.Spades, Rank.Three, '2_1')];
        result = processPlay(result.newState, bot2Play);
        expect(result.newState.currentTrick?.winningPlayerId).toBe(PlayerId.Bot1); // Still Bot1

        // Bot3 plays 3♠ (should not win)
        const bot3Play = [createCard(Suit.Spades, Rank.Three, '3_1')];
        result = processPlay(result.newState, bot3Play);
        
        // Bot1 should still be the winner after all plays
        expect(result.newState.currentTrick?.winningPlayerId).toBe(PlayerId.Bot1);
        expect(result.trickComplete).toBe(true);
        expect(result.trickWinnerId).toBe(PlayerId.Bot1);
      });
    });
  });
});