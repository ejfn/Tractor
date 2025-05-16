import { GameState } from '../src/types/game';
import { initializeGame } from '../src/utils/gameLogic';
import { processPlay } from '../src/utils/gamePlayManager';

describe('Human Trick Winner Bug', () => {
  test('Verify currentPlayerIndex updates correctly when human wins', () => {
    const gameState = initializeGame('Human', ['Team A', 'Team B'], '2');
    let state = gameState;
    
    // Give human the highest card to ensure they win
    const humanAces = state.players[0].hand.filter(c => c.rank === 'A');
    const humanOther = state.players[0].hand.filter(c => c.rank !== 'A');
    const allOther = state.players.slice(1).flatMap(p => p.hand.filter(c => c.rank !== 'A'));
    
    // Redistribute: Human gets all aces
    state.players[0].hand = [...humanAces, ...humanOther.slice(0, 25 - humanAces.length)];
    for (let i = 1; i < 4; i++) {
      state.players[i].hand = allOther.slice((i-1)*25, i*25);
    }
    
    console.log('=== Testing with Human having high cards ===');
    console.log(`Human has ${humanAces.length} aces`);
    
    // Play one complete trick
    for (let play = 0; play < 4; play++) {
      const currentIdx = state.currentPlayerIndex;
      const currentPlayer = state.players[currentIdx];
      
      console.log(`\nPlay ${play + 1}: Player ${currentIdx} (${currentPlayer.name})`);
      
      const cardsToPlay = [currentPlayer.hand[0]];
      console.log(`Playing: ${cardsToPlay[0].rank} of ${cardsToPlay[0].suit || 'JOKER'}`);
      
      const result = processPlay(state, cardsToPlay);
      
      console.log(`After play:`);
      console.log(`  Previous player index: ${currentIdx}`);
      console.log(`  New player index: ${result.newState.currentPlayerIndex}`);
      console.log(`  Trick complete: ${result.trickComplete || false}`);
      
      if (result.trickComplete) {
        console.log(`  Winner: ${result.trickWinner}`);
        console.log(`  Winning player index: ${result.newState.winningPlayerIndex}`);
        
        // Verify the winner becomes the next player
        const expectedNextIdx = result.newState.players.findIndex(p => p.name === result.trickWinner);
        const actualNextIdx = result.newState.currentPlayerIndex;
        
        console.log(`  Expected next player: ${expectedNextIdx}`);
        console.log(`  Actual next player: ${actualNextIdx}`);
        
        if (expectedNextIdx !== actualNextIdx) {
          throw new Error(`Winner ${result.trickWinner} should be next player (index ${expectedNextIdx}) but next is ${actualNextIdx}`);
        }
      }
      
      state = result.newState;
    }
    
    // Play another trick to see who starts
    console.log('\n=== Starting second trick ===');
    const secondTrickStarter = state.currentPlayerIndex;
    console.log(`Player ${secondTrickStarter} (${state.players[secondTrickStarter].name}) is starting`);
    
    // This should be the winner of the first trick
    expect(state.players[secondTrickStarter].name).toBe('Human');
  });
  
  test('Check currentPlayerIndex during play sequence', () => {
    const gameState = initializeGame('Human', ['Team A', 'Team B'], '2');
    let state = gameState;
    
    console.log('\n=== Tracking currentPlayerIndex ===');
    
    const indexHistory: { action: string, index: number, player: string }[] = [];
    
    // Track the index before any plays
    indexHistory.push({
      action: 'initial',
      index: state.currentPlayerIndex,
      player: state.players[state.currentPlayerIndex].name
    });
    
    // Play 8 cards (2 tricks)
    for (let i = 0; i < 8; i++) {
      const currentIdx = state.currentPlayerIndex;
      const currentPlayer = state.players[currentIdx];
      
      console.log(`\nPlay ${i + 1}: ${currentPlayer.name} (index ${currentIdx})`);
      
      const cardsToPlay = [currentPlayer.hand[0]];
      const result = processPlay(state, cardsToPlay);
      
      // Track index change
      if (result.trickComplete) {
        indexHistory.push({
          action: `trick complete (winner: ${result.trickWinner})`,
          index: result.newState.currentPlayerIndex,
          player: result.newState.players[result.newState.currentPlayerIndex].name
        });
      } else {
        indexHistory.push({
          action: 'normal play',
          index: result.newState.currentPlayerIndex,
          player: result.newState.players[result.newState.currentPlayerIndex].name
        });
      }
      
      state = result.newState;
    }
    
    // Analyze the history
    console.log('\n=== Index History ===');
    indexHistory.forEach((entry, i) => {
      console.log(`${i}: ${entry.action} -> index ${entry.index} (${entry.player})`);
    });
    
    // Check for any duplicates (same player playing twice in a row)
    for (let i = 1; i < indexHistory.length; i++) {
      if (indexHistory[i].index === indexHistory[i-1].index && 
          !indexHistory[i-1].action.includes('trick complete')) {
        console.error(`ERROR: Player ${indexHistory[i].player} played twice in a row!`);
        console.error(`  Previous: ${indexHistory[i-1].action}`);
        console.error(`  Current: ${indexHistory[i].action}`);
      }
    }
  });
});