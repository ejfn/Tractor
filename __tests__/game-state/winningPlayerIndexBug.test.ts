import { GameState, Rank } from "../../src/types";
import { initializeGame } from '../../src/game/gameLogic';
import { processPlay } from '../../src/game/gamePlayManager';
import { getAIMoveWithErrorHandling } from '../../src/game/gamePlayManager';

describe('Trick Winner Determination', () => {
  test('should correctly determine trick winner and set current player', () => {
    const gameState = initializeGame();
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
        expect(result.trickWinner).toBeTruthy();
        
        // Verify that the current player index points to the winner
        const expectedWinnerIndex = result.newState.players.findIndex(p => p.name === result.trickWinner);
        expect(result.newState.currentPlayerIndex).toBe(expectedWinnerIndex);
        
        // Verify that currentTrick.winningPlayerId is set correctly
        expect(result.newState.currentTrick?.winningPlayerId).toBeTruthy();
        const winnerPlayer = result.newState.players.find(p => p.id === result.newState.currentTrick?.winningPlayerId);
        expect(winnerPlayer?.name).toBe(result.trickWinner);
      }
      
      state = result.newState;
    }
  });
  
  test('should maintain consistent winner information', () => {
    const gameState = initializeGame();
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
          const winnerByName = result.newState.players.find(p => p.name === result.trickWinner);
          const winnerById = result.newState.players.find(p => p.id === result.newState.currentTrick?.winningPlayerId);
          
          expect(winnerByName).toBeTruthy();
          expect(winnerById).toBeTruthy();
          expect(winnerByName?.id).toBe(winnerById?.id);
        }
        
        state = result.newState;
      }
    }
  });
});