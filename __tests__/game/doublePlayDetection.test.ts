import { GameState, Card, Rank } from "../../src/types";
import { initializeGame } from '../../src/game/gameLogic';
import { processPlay } from '../../src/game/gamePlayManager';
import { getAIMoveWithErrorHandling } from '../../src/game/gamePlayManager';

describe('Double Play Detection Tests', () => {
  test('Track each player play-by-play', () => {
    const gameState = initializeGame();
    let state = gameState;
    
    // Detailed tracking for each player
    const playerTracking = state.players.map(p => ({
      name: p.name,
      plays: [] as { trick: number, cards: number, action: string }[]
    }));
    
    // Play 3 complete tricks with detailed logging
    for (let trickNum = 0; trickNum < 3; trickNum++) {
      console.log(`\n=== TRICK ${trickNum + 1} ===`);
      console.log(`Starting card counts: ${state.players.map(p => p.hand.length).join(', ')}`);
      
      let trickPlays = 0;
      const trickStartingPlayer = state.currentPlayerIndex;
      
      while (trickPlays < 4) {
        const currentPlayerIdx = state.currentPlayerIndex;
        const currentPlayer = state.players[currentPlayerIdx];
        const allCardsBefore = state.players.map(p => p.hand.length);
        
        console.log(`\nPlay ${trickPlays + 1}: Player ${currentPlayerIdx} (${currentPlayer.name})`);
        console.log(`Cards before: ${allCardsBefore.join(', ')}`);
        
        // Get cards to play
        let cardsToPlay: Card[] = [];
        if (currentPlayer.isHuman) {
          cardsToPlay = [currentPlayer.hand[0]];
        } else {
          const aiMove = getAIMoveWithErrorHandling(state);
          if (aiMove.error) {
            console.error(`AI Error: ${aiMove.error}`);
            cardsToPlay = [currentPlayer.hand[0]];
          } else {
            cardsToPlay = aiMove.cards;
          }
        }
        
        console.log(`Playing ${cardsToPlay.length} card(s)`);
        
        // Process the play
        const result = processPlay(state, cardsToPlay);
        const allCardsAfter = result.newState.players.map(p => p.hand.length);
        
        console.log(`Cards after: ${allCardsAfter.join(', ')}`);
        console.log(`Current player changed from ${currentPlayerIdx} to ${result.newState.currentPlayerIndex}`);
        
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
            
            console.log(`  ${player.name}: ${before} -> ${after} (${diff} cards ${action})`);
            
            if (action === 'UNEXPECTED') {
              console.error(`ERROR: ${player.name} lost cards when not playing!`);
              console.error(`  Current player was ${currentPlayer.name}`);
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
          console.error(`ERROR: Multiple players lost cards!`);
          actualLosses.forEach(p => console.error(`  ${p.player}: ${p.loss} cards`));
          throw new Error('Multiple players lost cards in single play');
        }
        
        if (actualLosses[0].player !== currentPlayer.name) {
          console.error(`ERROR: Wrong player lost cards!`);
          console.error(`  Expected: ${currentPlayer.name}`);
          console.error(`  Actual: ${actualLosses[0].player}`);
          throw new Error('Wrong player lost cards');
        }
        
        state = result.newState;
        trickPlays++;
        
        if (result.trickComplete) {
          console.log(`\nTrick complete! Winner: ${result.trickWinner}`);
          
          // Verify we played exactly 4 times
          if (trickPlays !== 4) {
            console.error(`ERROR: Trick completed after ${trickPlays} plays instead of 4`);
            throw new Error('Incorrect number of plays in trick');
          }
          
          break;
        }
      }
      
      // After each trick, verify equal card counts
      const endCounts = state.players.map(p => p.hand.length);
      const uniqueCounts = new Set(endCounts);
      
      if (uniqueCounts.size > 1) {
        console.error(`ERROR: Unequal card counts after trick ${trickNum + 1}`);
        console.error(`Counts: ${endCounts.join(', ')}`);
        
        // Show play history for each player
        playerTracking.forEach((player, idx) => {
          console.error(`\n${player.name} play history:`);
          player.plays.forEach(play => {
            console.error(`  Trick ${play.trick + 1}: ${play.cards} cards ${play.action}`);
          });
        });
        
        throw new Error('Card count mismatch after trick');
      }
    }
    
    // Final analysis
    console.log('\n=== FINAL ANALYSIS ===');
    playerTracking.forEach(player => {
      const totalCards = player.plays.reduce((sum, play) => sum + play.cards, 0);
      console.log(`${player.name}: ${totalCards} total cards played in ${player.plays.length} plays`);
    });
  });
  
  test('Test trick completion detection', () => {
    const gameState = initializeGame();
    let state = gameState;
    
    console.log('\n=== Testing trick completion ===');
    
    // Manually track plays in the trick
    let playsInCurrentTrick = 0;
    const currentTrickPlayers: string[] = [];
    
    for (let i = 0; i < 8; i++) { // Play 2 tricks worth
      const currentPlayer = state.players[state.currentPlayerIndex];
      currentTrickPlayers.push(currentPlayer.name);
      
      console.log(`\nPlay ${i + 1}: ${currentPlayer.name}`);
      console.log(`  Plays in current trick: ${playsInCurrentTrick}`);
      
      let cardsToPlay = [currentPlayer.hand[0]];
      const result = processPlay(state, cardsToPlay);
      
      playsInCurrentTrick++;
      
      if (result.trickComplete) {
        console.log(`  Trick completed after ${playsInCurrentTrick} plays`);
        console.log(`  Players who played: ${currentTrickPlayers.join(', ')}`);
        
        if (playsInCurrentTrick !== 4) {
          console.error(`ERROR: Trick completed with ${playsInCurrentTrick} plays`);
        }
        
        playsInCurrentTrick = 0;
        currentTrickPlayers.length = 0;
      }
      
      state = result.newState;
    }
  });
});