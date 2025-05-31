import { GameState, Rank } from "../../src/types";
import { processPlay } from '../../src/game/gamePlayManager';
import { getAIMoveWithErrorHandling } from '../../src/game/gamePlayManager';
import { createFullyDealtGameState } from '../helpers/gameStates';

describe('Trick Winner Determination', () => {
  test('should correctly determine trick winner and set current player', () => {
    const gameState = createFullyDealtGameState();
    let state = gameState;
    
    // Play one complete trick
    for (let play = 0; play < 4; play++) {
      const currentPlayer = state.players[state.currentPlayerIndex];
      
      let cardsToPlay: any[] = [];
      if (currentPlayer.isHuman) {
        cardsToPlay = [currentPlayer.hand[0]];
      } else {
        const aiMove = getAIMoveWithErrorHandling(state);
        cardsToPlay = aiMove.error ? [currentPlayer.hand[0]] : aiMove.cards;
      }
      
      const result = processPlay(state, cardsToPlay);
      
      if (result.trickComplete) {
        // Verify that the trick winner is properly determined
        expect(result.trickWinnerId).toBeTruthy();
        
        // Verify that the current player index points to the winner
        const expectedWinnerIndex = result.newState.players.findIndex(p => p.id === result.trickWinnerId);
        expect(result.newState.currentPlayerIndex).toBe(expectedWinnerIndex);
        
        // Verify that currentTrick.winningPlayerId is set correctly
        expect(result.newState.currentTrick?.winningPlayerId).toBeTruthy();
        const winnerPlayer = result.newState.players.find(p => p.id === result.newState.currentTrick?.winningPlayerId);
        expect(winnerPlayer?.id).toBe(result.trickWinnerId);
      }
      
      state = result.newState;
    }
  });
  
  test('should maintain consistent winner information', () => {
    const gameState = createFullyDealtGameState();
    let state = gameState;
    
    // Play multiple tricks and verify consistency
    for (let trickNum = 0; trickNum < 2; trickNum++) {
      for (let play = 0; play < 4; play++) {
        const currentPlayer = state.players[state.currentPlayerIndex];
        
        let cardsToPlay: any[] = [];
        if (currentPlayer.isHuman) {
          cardsToPlay = [currentPlayer.hand[0]];
        } else {
          const aiMove = getAIMoveWithErrorHandling(state);
          cardsToPlay = aiMove.error ? [currentPlayer.hand[0]] : aiMove.cards;
        }
        
        const result = processPlay(state, cardsToPlay);
        
        if (result.trickComplete) {
          // The winner should be consistently identified
          const winnerById = result.newState.players.find(p => p.id === result.trickWinnerId);
          const winnerByCurrentTrick = result.newState.players.find(p => p.id === result.newState.currentTrick?.winningPlayerId);
          
          expect(winnerById).toBeTruthy();
          expect(winnerByCurrentTrick).toBeTruthy();
          expect(winnerById?.id).toBe(winnerByCurrentTrick?.id);
        }
        
        state = result.newState;
      }
    }
  });
});