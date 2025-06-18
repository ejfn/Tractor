import { GameState, Rank } from "../../src/types";
import { processPlay } from '../../src/game/playProcessing';
import { getAIMoveWithErrorHandling } from '../../src/game/playProcessing';
import { TRICK_RESULT_DISPLAY_TIME } from '../../src/utils/gameTimings';
import { createFullyDealtGameState } from '../helpers/gameStates';
import { gameLogger } from '../../src/utils/gameLogger';

// Helper to simulate async timing
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe('Timing Synchronization Tests', () => {
  test('Simulate race condition during trick completion', async () => {
    const gameState = createFullyDealtGameState();
    let state = gameState;
    
    gameLogger.info('test_timing_sync_start', {}, 'Testing timing synchronization');
    
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
        gameLogger.info('test_trick_complete', { winnerId: result.trickWinnerId }, `Trick complete! Winner: ${result.trickWinnerId}`);
        logState('Trick complete', state);
        
        // Simulate what happens in the real game:
        // 1. Trick result is displayed for 2 seconds
        await wait(TRICK_RESULT_DISPLAY_TIME);
        logState('After display time', state);
        
        // 2. The handleTrickResultComplete callback runs
        const clearedState = {
          ...state,
          currentTrick: null,
        };
        state = clearedState;
        logState('After clearing trick', state);
        
        // 3. 100ms delay before clearing lastCompletedTrick (from useTrickResults)
        await wait(100);
        logState('After final delay', state);
        
        // Start next trick
        const nextPlayer = state.players[state.currentPlayerIndex];
        gameLogger.info('test_next_trick_start', { playerName: nextPlayer.id }, `Next trick starts with ${nextPlayer.id}`);
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
    gameLogger.info('test_state_history_header', {}, 'State History');
    stateHistory.forEach(entry => {
      gameLogger.info('test_state_history_entry', { 
        time: entry.time, 
        event: entry.event, 
        currentPlayerIndex: entry.currentPlayerIndex, 
        cardCounts: entry.cardCounts 
      }, `${entry.time}ms: ${entry.event} - Player ${entry.currentPlayerIndex}, Cards: ${entry.cardCounts.join(',')}`);
    });
    
    // Check for anomalies
    gameLogger.info('test_anomaly_check_header', {}, 'Anomaly Check');
    for (let i = 1; i < stateHistory.length; i++) {
      const prev = stateHistory[i - 1];
      const curr = stateHistory[i];
      
      // Check for unequal card counts
      const uniqueCounts = new Set(curr.cardCounts);
      if (uniqueCounts.size > 1) {
        gameLogger.error('test_unequal_card_counts', { 
          time: curr.time, 
          event: curr.event, 
          cardCounts: curr.cardCounts 
        }, `Unequal card counts at ${curr.time}ms (${curr.event}): ${curr.cardCounts.join(',')}`);
      }
      
      // Check for unexpected card loss
      for (let j = 0; j < 4; j++) {
        const cardLoss = prev.cardCounts[j] - curr.cardCounts[j];
        if (cardLoss > 0 && !curr.event.includes('After play')) {
          gameLogger.error('test_unexpected_card_loss', { 
            playerId: j, 
            cardLoss: cardLoss, 
            prevEvent: prev.event, 
            currEvent: curr.event 
          }, `Player ${j} lost ${cardLoss} cards unexpectedly between "${prev.event}" and "${curr.event}"`);
        }
      }
    }
  });
  
  test('Check for state mutations during async operations', async () => {
    const gameState = createFullyDealtGameState();
    let state = gameState;
    
    gameLogger.info('test_state_mutations_start', {}, 'Testing state mutations');
    
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
          gameLogger.error('test_state_mutation_detected', {}, 'ERROR: Original state was mutated during async operation!');
          gameLogger.error('test_original_card_counts', { originalCardCounts }, `  Original counts: ${originalCardCounts.join(',')}`);
          gameLogger.error('test_current_card_counts', { currentCardCounts }, `  Current counts: ${currentCardCounts.join(',')}`);
        }
        
        if (originalState.currentPlayerIndex !== originalPlayerIndex) {
          gameLogger.error('test_player_index_mutation', {}, 'ERROR: Original currentPlayerIndex was mutated!');
        }
      } else {
        state = result.newState;
      }
    }
  });
});