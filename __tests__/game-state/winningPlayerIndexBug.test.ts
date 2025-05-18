import { GameState, Rank } from '../../src/types/game';
import { initializeGame } from '../../src/utils/gameLogic';
import { processPlay } from '../../src/utils/gamePlayManager';
import { getAIMoveWithErrorHandling } from '../../src/utils/gamePlayManager';

describe('Winning Player Index Bug', () => {
  test('Verify winningPlayerIndex is set correctly', () => {
    const gameState = initializeGame('Human', ['Team A', 'Team B'], Rank.Two);
    let state = gameState;
    
    console.log('=== Testing winningPlayerIndex ===');
    
    // Play one trick and track winningPlayerIndex
    for (let play = 0; play < 4; play++) {
      const currentPlayer = state.players[state.currentPlayerIndex];
      
      console.log(`\nPlay ${play + 1}: ${currentPlayer.name}`);
      console.log(`Before play:`);
      console.log(`  currentPlayerIndex: ${state.currentPlayerIndex}`);
      console.log(`  winningPlayerIndex: ${state.winningPlayerIndex}`);
      
      let cardsToPlay: any[] = [];
      if (currentPlayer.isHuman) {
        cardsToPlay = [currentPlayer.hand[0]];
      } else {
        const aiMove = getAIMoveWithErrorHandling(state);
        cardsToPlay = aiMove.error ? [currentPlayer.hand[0]] : aiMove.cards;
      }
      
      const result = processPlay(state, cardsToPlay);
      
      console.log(`After play:`);
      console.log(`  currentPlayerIndex: ${result.newState.currentPlayerIndex}`);
      console.log(`  winningPlayerIndex: ${result.newState.winningPlayerIndex}`);
      console.log(`  trickComplete: ${result.trickComplete}`);
      
      if (result.trickComplete) {
        console.log(`  trickWinner: ${result.trickWinner}`);
        
        // Verify winningPlayerIndex matches the winner
        const expectedWinnerIndex = result.newState.players.findIndex(p => p.name === result.trickWinner);
        if (result.newState.winningPlayerIndex !== expectedWinnerIndex) {
          throw new Error(`winningPlayerIndex (${result.newState.winningPlayerIndex}) doesn't match winner index (${expectedWinnerIndex})`);
        }
      }
      
      state = result.newState;
    }
  });
  
  test('Check winningPlayerIndex across multiple tricks', () => {
    const gameState = initializeGame('Human', ['Team A', 'Team B'], Rank.Two);
    let state = gameState;
    
    // Give human high cards to win some tricks
    const humanAces = state.players[0].hand.filter(c => c.rank === 'A');
    const humanKings = state.players[0].hand.filter(c => c.rank === 'K');
    const humanOther = state.players[0].hand.filter(c => c.rank !== 'A' && c.rank !== 'K');
    state.players[0].hand = [...humanAces, ...humanKings, ...humanOther.slice(0, 25 - humanAces.length - humanKings.length)];
    
    console.log('\n=== Playing multiple tricks ===');
    
    for (let trickNum = 0; trickNum < 3; trickNum++) {
      console.log(`\n--- TRICK ${trickNum + 1} ---`);
      console.log(`Starting player: ${state.players[state.currentPlayerIndex].name}`);
      console.log(`winningPlayerIndex at trick start: ${state.winningPlayerIndex}`);
      
      let trickResult = null;
      
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
        state = result.newState;
        
        if (result.trickComplete) {
          trickResult = result;
        }
      }
      
      console.log(`Trick winner: ${trickResult?.trickWinner}`);
      console.log(`winningPlayerIndex after trick: ${state.winningPlayerIndex}`);
      
      // Simulate clearing trick (as done in handleTrickResultComplete)
      const newState = {
        ...state,
        currentTrick: null,
        currentPlayerIndex: state.winningPlayerIndex ?? state.currentPlayerIndex,
        winningPlayerIndex: undefined
      };
      
      console.log(`After clearing trick:`);
      console.log(`  Next player: ${newState.players[newState.currentPlayerIndex].name} (index ${newState.currentPlayerIndex})`);
      console.log(`  winningPlayerIndex: ${newState.winningPlayerIndex}`);
      
      // Check if the next player is correct
      const expectedNextPlayer = trickResult?.trickWinner;
      const actualNextPlayer = newState.players[newState.currentPlayerIndex].name;
      
      if (expectedNextPlayer !== actualNextPlayer) {
        throw new Error(`Expected ${expectedNextPlayer} to start next trick, but ${actualNextPlayer} is starting`);
      }
      
      state = newState;
    }
  });
});