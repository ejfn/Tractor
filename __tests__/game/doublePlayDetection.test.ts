import { GameState, Card, Rank } from "../../src/types";
import { processPlay } from '../../src/game/playProcessing';
import { getAIMoveWithErrorHandling } from '../../src/game/playProcessing';
import { createFullyDealtGameState } from '../helpers/gameStates';
import { gameLogger } from '../../src/utils/gameLogger';

describe('Double Play Detection Tests', () => {
  test('Track each player play-by-play', () => {
    const gameState = createFullyDealtGameState();
    let state = gameState;
    
    // Detailed tracking for each player
    const playerTracking = state.players.map(p => ({
      name: p.name,
      plays: [] as { trick: number, cards: number, action: string }[]
    }));
    
    // Play 3 complete tricks with detailed logging
    for (let trickNum = 0; trickNum < 3; trickNum++) {
      gameLogger.info('test_trick_start', { trickNumber: trickNum + 1 }, `\n=== TRICK ${trickNum + 1} ===`);
      gameLogger.info('test_starting_card_counts', { cardCounts: state.players.map(p => p.hand.length) }, `Starting card counts: ${state.players.map(p => p.hand.length).join(', ')}`);
      
      let trickPlays = 0;
      const trickStartingPlayer = state.currentPlayerIndex;
      
      while (trickPlays < 4) {
        const currentPlayerIdx = state.currentPlayerIndex;
        const currentPlayer = state.players[currentPlayerIdx];
        const allCardsBefore = state.players.map(p => p.hand.length);
        
        gameLogger.info('test_player_turn', { playNumber: trickPlays + 1, playerIndex: currentPlayerIdx, playerName: currentPlayer.name }, `\nPlay ${trickPlays + 1}: Player ${currentPlayerIdx} (${currentPlayer.name})`);
        gameLogger.info('test_cards_before_play', { cardCounts: allCardsBefore }, `Cards before: ${allCardsBefore.join(', ')}`);
        
        // Get cards to play
        let cardsToPlay: Card[] = [];
        if (currentPlayer.isHuman) {
          cardsToPlay = [currentPlayer.hand[0]];
        } else {
          const aiMove = getAIMoveWithErrorHandling(state);
          if (aiMove.error) {
            gameLogger.error('test_ai_error', { error: aiMove.error, playerIndex: currentPlayerIdx }, `AI Error: ${aiMove.error}`);
            cardsToPlay = [currentPlayer.hand[0]];
          } else {
            cardsToPlay = aiMove.cards;
          }
        }
        
        gameLogger.info('test_cards_to_play', { cardCount: cardsToPlay.length, playerIndex: currentPlayerIdx }, `Playing ${cardsToPlay.length} card(s)`);
        
        // Process the play
        const result = processPlay(state, cardsToPlay);
        const allCardsAfter = result.newState.players.map(p => p.hand.length);
        
        gameLogger.info('test_cards_after_play', { cardCounts: allCardsAfter }, `Cards after: ${allCardsAfter.join(', ')}`);
        gameLogger.info('test_player_change', { fromPlayer: currentPlayerIdx, toPlayer: result.newState.currentPlayerIndex }, `Current player changed from ${currentPlayerIdx} to ${result.newState.currentPlayerIndex}`);
        
        // Track what each player did
        state.players.forEach((player, idx) => {
          const before = allCardsBefore[idx];
          const after = allCardsAfter[idx];
          const diff = before - after;
          
          if (diff !== 0) {
            const action = idx === currentPlayerIdx ? 'played' : 'UNEXPECTED';
            playerTracking[idx].plays.push({
              trick: trickNum,
              cards: diff,
              action
            });
            
            gameLogger.info('test_player_card_change', { playerName: player.name, before, after, diff, action }, `  ${player.name}: ${before} -> ${after} (${diff} cards ${action})`);
            
            if (action === 'UNEXPECTED') {
              gameLogger.error('test_unexpected_card_loss', { playerName: player.name, currentPlayerName: currentPlayer.name }, `ERROR: ${player.name} lost cards when not playing!`);
              gameLogger.error('test_current_player_context', { currentPlayerName: currentPlayer.name }, `  Current player was ${currentPlayer.name}`);
              throw new Error('Unexpected card loss detected');
            }
          }
        });
        
        // Check if only the current player lost cards
        const expectedLoss = cardsToPlay.length;
        const actualLosses = allCardsBefore.map((before, idx) => ({
          player: state.players[idx].name,
          loss: before - allCardsAfter[idx]
        })).filter(p => p.loss > 0);
        
        if (actualLosses.length !== 1) {
          gameLogger.error('test_multiple_players_lost_cards', { actualLosses }, `ERROR: Multiple players lost cards!`);
          actualLosses.forEach(p => gameLogger.error('test_player_card_loss_detail', { playerName: p.player, loss: p.loss }, `  ${p.player}: ${p.loss} cards`));
          throw new Error('Multiple players lost cards in single play');
        }
        
        if (actualLosses[0].player !== currentPlayer.name) {
          gameLogger.error('test_wrong_player_lost_cards', { expectedPlayer: currentPlayer.name, actualPlayer: actualLosses[0].player }, `ERROR: Wrong player lost cards!`);
          gameLogger.error('test_expected_player', { expectedPlayer: currentPlayer.name }, `  Expected: ${currentPlayer.name}`);
          gameLogger.error('test_actual_player', { actualPlayer: actualLosses[0].player }, `  Actual: ${actualLosses[0].player}`);
          throw new Error('Wrong player lost cards');
        }
        
        state = result.newState;
        trickPlays++;
        
        if (result.trickComplete) {
          gameLogger.info('test_trick_complete', { winnerId: result.trickWinnerId, trickPlays }, `\nTrick complete! Winner: ${result.trickWinnerId}`);
          
          // Verify we played exactly 4 times
          if (trickPlays !== 4) {
            gameLogger.error('test_incorrect_play_count', { actualPlays: trickPlays, expectedPlays: 4 }, `ERROR: Trick completed after ${trickPlays} plays instead of 4`);
            throw new Error('Incorrect number of plays in trick');
          }
          
          break;
        }
      }
      
      // After each trick, verify equal card counts
      const endCounts = state.players.map(p => p.hand.length);
      const uniqueCounts = new Set(endCounts);
      
      if (uniqueCounts.size > 1) {
        gameLogger.error('test_unequal_card_counts', { trickNumber: trickNum + 1, cardCounts: endCounts }, `ERROR: Unequal card counts after trick ${trickNum + 1}`);
        gameLogger.error('test_card_count_details', { cardCounts: endCounts }, `Counts: ${endCounts.join(', ')}`);
        
        // Show play history for each player
        playerTracking.forEach((player, idx) => {
          gameLogger.error('test_player_play_history', { playerName: player.name, plays: player.plays }, `\n${player.name} play history:`);
          player.plays.forEach(play => {
            gameLogger.error('test_player_play_detail', { playerName: player.name, trick: play.trick + 1, cards: play.cards, action: play.action }, `  Trick ${play.trick + 1}: ${play.cards} cards ${play.action}`);
          });
        });
        
        throw new Error('Card count mismatch after trick');
      }
    }
    
    // Final analysis
    gameLogger.info('test_final_analysis_start', {}, '\n=== FINAL ANALYSIS ===');
    playerTracking.forEach(player => {
      const totalCards = player.plays.reduce((sum, play) => sum + play.cards, 0);
      gameLogger.info('test_final_player_summary', { playerName: player.name, totalCards, totalPlays: player.plays.length }, `${player.name}: ${totalCards} total cards played in ${player.plays.length} plays`);
    });
  });
  
  test('Test trick completion detection', () => {
    const gameState = createFullyDealtGameState();
    let state = gameState;
    
    gameLogger.info('test_trick_completion_start', {}, '\n=== Testing trick completion ===');
    
    // Manually track plays in the trick
    let playsInCurrentTrick = 0;
    const currentTrickPlayers: string[] = [];
    
    for (let i = 0; i < 8; i++) { // Play 2 tricks worth
      const currentPlayer = state.players[state.currentPlayerIndex];
      currentTrickPlayers.push(currentPlayer.name);
      
      gameLogger.info('test_completion_play', { playNumber: i + 1, playerName: currentPlayer.name, playsInTrick: playsInCurrentTrick }, `\nPlay ${i + 1}: ${currentPlayer.name}`);
      gameLogger.info('test_completion_trick_count', { playsInCurrentTrick }, `  Plays in current trick: ${playsInCurrentTrick}`);
      
      let cardsToPlay = [currentPlayer.hand[0]];
      const result = processPlay(state, cardsToPlay);
      
      playsInCurrentTrick++;
      
      if (result.trickComplete) {
        gameLogger.info('test_completion_trick_done', { playsInCurrentTrick, players: currentTrickPlayers }, `  Trick completed after ${playsInCurrentTrick} plays`);
        gameLogger.info('test_completion_players', { players: currentTrickPlayers }, `  Players who played: ${currentTrickPlayers.join(', ')}`);
        
        if (playsInCurrentTrick !== 4) {
          gameLogger.error('test_completion_wrong_play_count', { actualPlays: playsInCurrentTrick, expectedPlays: 4 }, `ERROR: Trick completed with ${playsInCurrentTrick} plays`);
        }
        
        playsInCurrentTrick = 0;
        currentTrickPlayers.length = 0;
      }
      
      state = result.newState;
    }
  });
});