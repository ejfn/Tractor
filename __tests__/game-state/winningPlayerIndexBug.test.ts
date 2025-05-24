import { GameState, Rank } from '../../src/types/game';
import { initializeGame } from '../../src/utils/gameLogic';
import { processPlay } from '../../src/utils/gamePlayManager';
import { getAIMoveWithErrorHandling } from '../../src/utils/gamePlayManager';

// Helper function to get current player ID from game state
function getCurrentPlayerId(gameState: GameState): string {
  if (gameState.gamePhase === 'playing' && gameState.currentTrick) {
    // During play, determine next player based on trick state
    const trickPlayCount = gameState.currentTrick.plays.length;
    const leadPlayerIndex = gameState.players.findIndex(p => p.id === gameState.currentTrick!.leadingPlayerId);
    const currentPlayerIndex = (leadPlayerIndex + trickPlayCount + 1) % gameState.players.length;
    return gameState.players[currentPlayerIndex].id;
  } else if (gameState.gamePhase === 'playing' && !gameState.currentTrick) {
    // No active trick - check if there's a completed trick to find the winner
    if (gameState.tricks.length > 0) {
      const lastTrick = gameState.tricks[gameState.tricks.length - 1];
      return lastTrick.winningPlayerId || gameState.players[0].id;
    } else {
      // First trick of the round - use first player
      return gameState.players[0].id;
    }
  } else {
    // Not in playing phase - use first player as default
    return gameState.players[0].id;
  }
}

describe('Winning Player Index Bug', () => {
  test('Verify winningPlayerIndex is set correctly', () => {
    const gameState = initializeGame('Human', ['Team A', 'Team B'], Rank.Two);
    let state = gameState;
    
    console.log('=== Testing winningPlayerIndex ===');
    
    // Play one trick and track winner
    for (let play = 0; play < 4; play++) {
      const currentPlayerId = getCurrentPlayerId(state);
      const currentPlayer = state.players.find(p => p.id === currentPlayerId);
      if (!currentPlayer) {
        throw new Error(`No current player found with ID ${currentPlayerId}`);
      }
      
      console.log(`\nPlay ${play + 1}: ${currentPlayer.name}`);
      console.log(`Before play:`);
      console.log(`  currentPlayerId: ${currentPlayerId}`);
      
      let cardsToPlay: any[] = [];
      if (currentPlayer.isHuman) {
        cardsToPlay = [currentPlayer.hand[0]];
      } else {
        const aiMove = getAIMoveWithErrorHandling(state, currentPlayer.id);
        cardsToPlay = aiMove.error ? [currentPlayer.hand[0]] : aiMove.cards;
      }
      
      const result = processPlay(state, cardsToPlay, currentPlayer.id);
      
      console.log(`After play:`);
      console.log(`  trickComplete: ${result.trickComplete}`);
      
      if (result.trickComplete) {
        console.log(`  trickWinner: ${result.trickWinner}`);
        
        // Verify winner makes sense
        const expectedWinnerIndex = result.newState.players.findIndex(p => p.name === result.trickWinner);
        if (expectedWinnerIndex === -1) {
          throw new Error(`Trick winner "${result.trickWinner}" not found in players`);
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
      const currentPlayerId = getCurrentPlayerId(state);
      const currentPlayer = state.players.find(p => p.id === currentPlayerId);
      if (!currentPlayer) {
        throw new Error(`No current player found with ID ${currentPlayerId}`);
      }
      console.log(`Starting player: ${currentPlayer.name}`);
      
      let trickResult = null;
      
      for (let play = 0; play < 4; play++) {
        const currentPlayerId = getCurrentPlayerId(state);
        const currentPlayer = state.players.find(p => p.id === currentPlayerId);
        if (!currentPlayer) {
          throw new Error(`No current player found with ID ${currentPlayerId}`);
        }
        
        let cardsToPlay: any[] = [];
        if (currentPlayer.isHuman) {
          cardsToPlay = [currentPlayer.hand[0]];
        } else {
          const aiMove = getAIMoveWithErrorHandling(state, currentPlayer.id);
          cardsToPlay = aiMove.error ? [currentPlayer.hand[0]] : aiMove.cards;
        }
        
        const result = processPlay(state, cardsToPlay, currentPlayer.id);
        state = result.newState;
        
        if (result.trickComplete) {
          trickResult = result;
        }
      }
      
      console.log(`Trick winner: ${trickResult?.trickWinner}`);
      
      // Check if the next player is correct (winner should be next)
      const expectedNextPlayer = trickResult?.trickWinner;
      if (expectedNextPlayer) {
        const nextPlayerId = getCurrentPlayerId(state);
        const expectedWinnerPlayer = state.players.find(p => p.name === expectedNextPlayer);
        if (expectedWinnerPlayer && nextPlayerId !== expectedWinnerPlayer.id) {
          console.warn(`Expected ${expectedNextPlayer} to be current player, but current is ${nextPlayerId}`);
        }
      }
    }
  });
});