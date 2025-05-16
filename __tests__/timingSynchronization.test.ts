import { GameState } from '../src/types/game';
import { initializeGame } from '../src/utils/gameLogic';
import { processPlay } from '../src/utils/gamePlayManager';
import { getAIMoveWithErrorHandling } from '../src/utils/gamePlayManager';
import { TRICK_RESULT_DISPLAY_TIME } from '../src/utils/gameTimings';

// Helper to simulate async timing
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe('Timing Synchronization Tests', () => {
  test('Simulate race condition during trick completion', async () => {
    const gameState = initializeGame('Human', ['Team A', 'Team B'], '2');
    let state = gameState;
    
    console.log('=== Testing timing synchronization ===');
    
    // Track state changes
    const stateHistory: { time: number, event: string, currentPlayerIndex: number, cardCounts: number[] }[] = [];
    const startTime = Date.now();
    
    const logState = (event: string, state: GameState) => {
      stateHistory.push({
        time: Date.now() - startTime,
        event,
        currentPlayerIndex: state.currentPlayerIndex,
        cardCounts: state.players.map(p => p.hand.length)
      });
    };
    
    // Play one complete trick
    for (let play = 0; play < 4; play++) {
      const currentPlayer = state.players[state.currentPlayerIndex];
      logState(`Before play ${play + 1}`, state);
      
      let cardsToPlay: any[] = [];
      if (currentPlayer.isHuman) {
        cardsToPlay = [currentPlayer.hand[0]];
      } else {
        const aiMove = getAIMoveWithErrorHandling(state);
        cardsToPlay = aiMove.error ? [currentPlayer.hand[0]] : aiMove.cards;
      }
      
      const result = processPlay(state, cardsToPlay);
      state = result.newState;
      logState(`After play ${play + 1}`, state);
      
      if (result.trickComplete) {
        console.log(`Trick complete! Winner: ${result.trickWinner}`);
        logState('Trick complete', state);
        
        // Simulate what happens in the real game:
        // 1. Trick result is displayed for 2 seconds
        await wait(TRICK_RESULT_DISPLAY_TIME);
        logState('After display time', state);
        
        // 2. The handleTrickResultComplete callback runs
        const clearedState = {
          ...state,
          currentTrick: null,
          currentPlayerIndex: state.winningPlayerIndex ?? state.currentPlayerIndex,
          winningPlayerIndex: undefined
        };
        state = clearedState;
        logState('After clearing trick', state);
        
        // 3. 100ms delay before clearing lastCompletedTrick (from useTrickResults)
        await wait(100);
        logState('After final delay', state);
        
        // Start next trick
        const nextPlayer = state.players[state.currentPlayerIndex];
        console.log(`\nNext trick starts with ${nextPlayer.name}`);
      }
    }
    
    // Play one more play to see what happens
    const currentPlayer = state.players[state.currentPlayerIndex];
    logState('Before second trick play', state);
    
    let cardsToPlay: any[] = [];
    if (currentPlayer.isHuman) {
      cardsToPlay = [currentPlayer.hand[0]];
    } else {
      const aiMove = getAIMoveWithErrorHandling(state);
      cardsToPlay = aiMove.error ? [currentPlayer.hand[0]] : aiMove.cards;
    }
    
    const result = processPlay(state, cardsToPlay);
    state = result.newState;
    logState('After second trick play', state);
    
    // Analyze the history
    console.log('\n=== State History ===');
    stateHistory.forEach(entry => {
      console.log(`${entry.time}ms: ${entry.event} - Player ${entry.currentPlayerIndex}, Cards: ${entry.cardCounts.join(',')}`);
    });
    
    // Check for anomalies
    console.log('\n=== Anomaly Check ===');
    for (let i = 1; i < stateHistory.length; i++) {
      const prev = stateHistory[i - 1];
      const curr = stateHistory[i];
      
      // Check for unequal card counts
      const uniqueCounts = new Set(curr.cardCounts);
      if (uniqueCounts.size > 1) {
        console.error(`Unequal card counts at ${curr.time}ms (${curr.event}): ${curr.cardCounts.join(',')}`);
      }
      
      // Check for unexpected card loss
      for (let j = 0; j < 4; j++) {
        const cardLoss = prev.cardCounts[j] - curr.cardCounts[j];
        if (cardLoss > 0 && !curr.event.includes('After play')) {
          console.error(`Player ${j} lost ${cardLoss} cards unexpectedly between "${prev.event}" and "${curr.event}"`);
        }
      }
    }
  });
  
  test('Check for state mutations during async operations', async () => {
    const gameState = initializeGame('Human', ['Team A', 'Team B'], '2');
    let state = gameState;
    
    console.log('\n=== Testing state mutations ===');
    
    // Play to complete a trick
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
        // Store state references to check for mutations
        const originalState = state;
        const originalCardCounts = state.players.map(p => p.hand.length);
        const originalPlayerIndex = state.currentPlayerIndex;
        
        state = result.newState;
        
        // Simulate async operations
        await wait(100);
        
        // Check if original state was mutated
        const currentCardCounts = originalState.players.map(p => p.hand.length);
        
        if (JSON.stringify(originalCardCounts) !== JSON.stringify(currentCardCounts)) {
          console.error('ERROR: Original state was mutated during async operation!');
          console.error(`  Original counts: ${originalCardCounts.join(',')}`);
          console.error(`  Current counts: ${currentCardCounts.join(',')}`);
        }
        
        if (originalState.currentPlayerIndex !== originalPlayerIndex) {
          console.error('ERROR: Original currentPlayerIndex was mutated!');
        }
      } else {
        state = result.newState;
      }
    }
  });
});