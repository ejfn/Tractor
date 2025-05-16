import { GameState } from '../src/types/game';
import { initializeGame } from '../src/utils/gameLogic';
import { processPlay } from '../src/utils/gamePlayManager';
import { getAIMoveWithErrorHandling } from '../src/utils/gamePlayManager';

describe('Full Game Simulation', () => {
  test('Play complete game monitoring all card counts', () => {
    const gameState = initializeGame('Human', ['Team A', 'Team B'], '2');
    let state = gameState;
    
    // Complete game tracking
    const gameLog: {
      round: number,
      trick: number,
      play: number,
      player: string,
      cardsBefore: number[],
      cardsAfter: number[],
      cardsPlayed: number,
      winner?: string,
      error?: string
    }[] = [];
    
    let round = 0;
    let totalErrors = 0;
    
    // Play until someone runs out of cards or we hit an error
    while (state.players.every(p => p.hand.length > 0) && totalErrors < 3) {
      round++;
      console.log(`\n=== ROUND ${round} ===`);
      
      // Play 5 complete tricks per round
      for (let trickNum = 0; trickNum < 5 && state.players.every(p => p.hand.length > 0); trickNum++) {
        console.log(`\nTrick ${trickNum + 1}:`);
        const trickStartCounts = state.players.map(p => p.hand.length);
        console.log(`Starting counts: ${trickStartCounts.join(', ')}`);
        
        let trickWinner = null;
        
        // Play one complete trick
        for (let playNum = 0; playNum < 4; playNum++) {
          const currentPlayer = state.players[state.currentPlayerIndex];
          const cardsBefore = state.players.map(p => p.hand.length);
          
          // Get cards to play
          let cardsToPlay: any[] = [];
          let error = null;
          
          if (currentPlayer.isHuman) {
            // Human plays first available card
            if (currentPlayer.hand.length > 0) {
              cardsToPlay = [currentPlayer.hand[0]];
            } else {
              error = 'Human has no cards';
            }
          } else {
            // AI plays
            const aiMove = getAIMoveWithErrorHandling(state);
            if (aiMove.error) {
              error = aiMove.error;
              // Fallback to first card
              if (currentPlayer.hand.length > 0) {
                cardsToPlay = [currentPlayer.hand[0]];
              }
            } else {
              cardsToPlay = aiMove.cards;
            }
          }
          
          if (cardsToPlay.length === 0) {
            console.error(`ERROR: ${currentPlayer.name} has no cards to play!`);
            totalErrors++;
            break;
          }
          
          // Process the play
          const result = processPlay(state, cardsToPlay);
          const cardsAfter = result.newState.players.map(p => p.hand.length);
          
          // Log the play
          gameLog.push({
            round,
            trick: trickNum,
            play: playNum,
            player: currentPlayer.name,
            cardsBefore,
            cardsAfter,
            cardsPlayed: cardsToPlay.length,
            winner: result.trickWinner,
            error
          });
          
          // Check for anomalies
          let anomalies: string[] = [];
          
          // Check each player's card count
          for (let i = 0; i < 4; i++) {
            const before = cardsBefore[i];
            const after = cardsAfter[i];
            const expected = i === state.currentPlayerIndex ? before - cardsToPlay.length : before;
            
            if (after !== expected) {
              anomalies.push(`Player ${i} (${state.players[i].name}): expected ${expected}, got ${after}`);
            }
          }
          
          // Check for unequal card counts
          const uniqueCounts = new Set(cardsAfter);
          if (uniqueCounts.size > 1 && playNum === 3) {
            // After a complete trick, all should be equal
            anomalies.push(`Unequal counts after trick: ${cardsAfter.join(', ')}`);
          }
          
          if (anomalies.length > 0) {
            console.error(`\nANOMALIES in Round ${round}, Trick ${trickNum + 1}, Play ${playNum + 1}:`);
            anomalies.forEach(a => console.error(`  ${a}`));
            totalErrors++;
          }
          
          state = result.newState;
          
          if (result.trickComplete) {
            trickWinner = result.trickWinner;
          }
        }
        
        // Verify trick ended correctly
        const trickEndCounts = state.players.map(p => p.hand.length);
        const expectedCount = trickStartCounts[0] - 1;
        
        const wrongCounts = trickEndCounts.filter((c, i) => c !== expectedCount);
        if (wrongCounts.length > 0) {
          console.error(`ERROR: After trick ${trickNum + 1}, not all players have ${expectedCount} cards`);
          console.error(`  Counts: ${trickEndCounts.join(', ')}`);
          totalErrors++;
        }
        
        console.log(`Trick winner: ${trickWinner}, End counts: ${trickEndCounts.join(', ')}`);
      }
      
      // Don't play too many rounds
      if (round >= 5) break;
    }
    
    // Analyze the game log
    console.log('\n=== GAME ANALYSIS ===');
    
    // Find when card counts first diverged
    let firstDivergence = null;
    for (const entry of gameLog) {
      const counts = entry.cardsAfter;
      const uniqueCounts = new Set(counts);
      
      if (uniqueCounts.size > 1 && !firstDivergence) {
        firstDivergence = entry;
        break;
      }
    }
    
    if (firstDivergence) {
      console.error('\nFirst divergence occurred at:');
      console.error(`  Round ${firstDivergence.round}, Trick ${firstDivergence.trick + 1}, Play ${firstDivergence.play + 1}`);
      console.error(`  Player: ${firstDivergence.player}`);
      console.error(`  Cards before: ${firstDivergence.cardsBefore.join(', ')}`);
      console.error(`  Cards after: ${firstDivergence.cardsAfter.join(', ')}`);
      
      // Show context around the divergence
      const contextStart = Math.max(0, gameLog.indexOf(firstDivergence) - 3);
      const contextEnd = Math.min(gameLog.length, gameLog.indexOf(firstDivergence) + 4);
      
      console.error('\nContext:');
      for (let i = contextStart; i < contextEnd; i++) {
        const entry = gameLog[i];
        const marker = i === gameLog.indexOf(firstDivergence) ? ' <-- DIVERGENCE' : '';
        console.error(`  ${entry.player}: ${entry.cardsBefore.join(',')} -> ${entry.cardsAfter.join(',')}${marker}`);
      }
    }
    
    // Player-specific analysis
    const players = ['Human', 'Bot 1', 'Bot 2', 'Bot 3'];
    console.log('\nPlayer Analysis:');
    
    players.forEach((playerName, idx) => {
      const playerEntries = gameLog.filter(e => e.player === playerName);
      const totalCardsPlayed = playerEntries.reduce((sum, e) => sum + e.cardsPlayed, 0);
      const errors = playerEntries.filter(e => e.error).length;
      
      console.log(`${playerName}:`);
      console.log(`  Total plays: ${playerEntries.length}`);
      console.log(`  Total cards played: ${totalCardsPlayed}`);
      console.log(`  Errors: ${errors}`);
      
      // Find anomalous entries
      const anomalous = playerEntries.filter(e => {
        const expectedCount = e.cardsBefore[idx] - e.cardsPlayed;
        return e.cardsAfter[idx] !== expectedCount;
      });
      
      if (anomalous.length > 0) {
        console.error(`  ANOMALIES: ${anomalous.length} plays with incorrect card removal`);
        anomalous.slice(0, 3).forEach(a => {
          console.error(`    Round ${a.round}, Trick ${a.trick + 1}: ${a.cardsBefore[idx]} -> ${a.cardsAfter[idx]} (played ${a.cardsPlayed})`);
        });
      }
    });
    
    expect(totalErrors).toBe(0);
  });
});