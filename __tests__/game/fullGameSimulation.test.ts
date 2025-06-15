
import { getAIMoveWithErrorHandling, processPlay } from '../../src/game/playProcessing';
import { initializeGame } from '../../src/utils/gameInitialization';
import { gameLogger } from '../../src/utils/gameLogger';

describe('Full Game Simulation', () => {
  test('Play complete game monitoring all card counts', () => {
    const gameState = initializeGame();
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
      gameLogger.info('test_round_start', { round }, `\n=== ROUND ${round} ===`);
      
      // Play 5 complete tricks per round
      for (let trickNum = 0; trickNum < 5 && state.players.every(p => p.hand.length > 0); trickNum++) {
        gameLogger.info('test_trick_start', { trickNum: trickNum + 1 }, `\nTrick ${trickNum + 1}:`);
        const trickStartCounts = state.players.map(p => p.hand.length);
        gameLogger.info('test_trick_card_counts', { counts: trickStartCounts }, `Starting counts: ${trickStartCounts.join(', ')}`);
        
        let trickWinner = null;
        
        // Play one complete trick
        for (let playNum = 0; playNum < 4; playNum++) {
          const currentPlayer = state.players[state.currentPlayerIndex];
          const cardsBefore = state.players.map(p => p.hand.length);
          
          // Get cards to play
          let cardsToPlay: any[] = [];
          let error: string | undefined = undefined;
          
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
            gameLogger.error('test_no_cards_error', { player: currentPlayer.name }, `ERROR: ${currentPlayer.name} has no cards to play!`);
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
            winner: result.trickWinnerId,
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
            gameLogger.error('test_card_count_anomalies', { round, trick: trickNum + 1, play: playNum + 1, anomalies }, `\nANOMALIES in Round ${round}, Trick ${trickNum + 1}, Play ${playNum + 1}:`);
            anomalies.forEach(a => gameLogger.error('test_anomaly_detail', { anomaly: a }, `  ${a}`));
            totalErrors++;
          }
          
          state = result.newState;
          
          if (result.trickComplete) {
            trickWinner = result.trickWinnerId;
          }
        }
        
        // Verify trick ended correctly
        const trickEndCounts = state.players.map(p => p.hand.length);
        const expectedCount = trickStartCounts[0] - 1;
        
        const wrongCounts = trickEndCounts.filter((c, i) => c !== expectedCount);
        if (wrongCounts.length > 0) {
          gameLogger.error('test_trick_end_error', { trick: trickNum + 1, expectedCount, actualCounts: trickEndCounts }, `ERROR: After trick ${trickNum + 1}, not all players have ${expectedCount} cards`);
          gameLogger.error('test_trick_end_counts', { counts: trickEndCounts }, `  Counts: ${trickEndCounts.join(', ')}`);
          totalErrors++;
        }
        
        gameLogger.info('test_trick_end', { winner: trickWinner, counts: trickEndCounts }, `Trick winner: ${trickWinner}, End counts: ${trickEndCounts.join(', ')}`);
      }
      
      // Don't play too many rounds
      if (round >= 5) break;
    }
    
    // Analyze the game log
    gameLogger.info('test_game_analysis_start', {}, '\n=== GAME ANALYSIS ===');
    
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
      gameLogger.error('test_first_divergence', { 
        round: firstDivergence.round, 
        trick: firstDivergence.trick + 1, 
        play: firstDivergence.play + 1,
        player: firstDivergence.player,
        cardsBefore: firstDivergence.cardsBefore,
        cardsAfter: firstDivergence.cardsAfter
      }, '\nFirst divergence occurred at:');
      gameLogger.error('test_divergence_details', { firstDivergence }, `  Round ${firstDivergence.round}, Trick ${firstDivergence.trick + 1}, Play ${firstDivergence.play + 1}`);
      gameLogger.error('test_divergence_player', { player: firstDivergence.player }, `  Player: ${firstDivergence.player}`);
      gameLogger.error('test_divergence_before', { cardsBefore: firstDivergence.cardsBefore }, `  Cards before: ${firstDivergence.cardsBefore.join(', ')}`);
      gameLogger.error('test_divergence_after', { cardsAfter: firstDivergence.cardsAfter }, `  Cards after: ${firstDivergence.cardsAfter.join(', ')}`);
      
      // Show context around the divergence
      const contextStart = Math.max(0, gameLog.indexOf(firstDivergence) - 3);
      const contextEnd = Math.min(gameLog.length, gameLog.indexOf(firstDivergence) + 4);
      
      gameLogger.error('test_divergence_context_start', {}, '\nContext:');
      for (let i = contextStart; i < contextEnd; i++) {
        const entry = gameLog[i];
        const marker = i === gameLog.indexOf(firstDivergence) ? ' <-- DIVERGENCE' : '';
        gameLogger.error('test_divergence_context_entry', { entry, marker }, `  ${entry.player}: ${entry.cardsBefore.join(',')} -> ${entry.cardsAfter.join(',')}${marker}`);
      }
    }
    
    // Player-specific analysis
    const players = ['Human', 'Bot 1', 'Bot 2', 'Bot 3'];
    gameLogger.info('test_player_analysis_start', {}, '\nPlayer Analysis:');
    
    players.forEach((playerName, idx) => {
      const playerEntries = gameLog.filter(e => e.player === playerName);
      const totalCardsPlayed = playerEntries.reduce((sum, e) => sum + e.cardsPlayed, 0);
      const errors = playerEntries.filter(e => e.error).length;
      
      gameLogger.info('test_player_stats', { 
        playerName, 
        totalPlays: playerEntries.length, 
        totalCardsPlayed, 
        errors 
      }, `${playerName}:`);
      gameLogger.info('test_player_plays', { playerName, totalPlays: playerEntries.length }, `  Total plays: ${playerEntries.length}`);
      gameLogger.info('test_player_cards', { playerName, totalCardsPlayed }, `  Total cards played: ${totalCardsPlayed}`);
      gameLogger.info('test_player_errors', { playerName, errors }, `  Errors: ${errors}`);
      
      // Find anomalous entries
      const anomalous = playerEntries.filter(e => {
        const expectedCount = e.cardsBefore[idx] - e.cardsPlayed;
        return e.cardsAfter[idx] !== expectedCount;
      });
      
      if (anomalous.length > 0) {
        gameLogger.error('test_player_anomalies', { playerName, anomalousCount: anomalous.length }, `  ANOMALIES: ${anomalous.length} plays with incorrect card removal`);
        anomalous.slice(0, 3).forEach(a => {
          gameLogger.error('test_anomaly_example', { 
            playerName, 
            round: a.round, 
            trick: a.trick + 1, 
            cardsBefore: a.cardsBefore[idx], 
            cardsAfter: a.cardsAfter[idx], 
            cardsPlayed: a.cardsPlayed 
          }, `    Round ${a.round}, Trick ${a.trick + 1}: ${a.cardsBefore[idx]} -> ${a.cardsAfter[idx]} (played ${a.cardsPlayed})`);
        });
      }
    });
    
    expect(totalErrors).toBe(0);
  });
});