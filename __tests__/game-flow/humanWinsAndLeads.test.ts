import { GameState, Rank, Card } from "../../src/types";
import { initializeGame } from '../../src/game/gameLogic';
import { processPlay } from '../../src/game/gamePlayManager';
import { getAIMoveWithErrorHandling } from '../../src/game/gamePlayManager';
import { describe, test, expect } from '@jest/globals';

describe('Human Wins and Leads Bug', () => {
  test('Human wins first trick and leads second', () => {
    const gameState = initializeGame();
    let state = gameState;
    
    // Give human high cards to ensure they win
    const humanAces = state.players[0].hand.filter(c => c.rank === Rank.Ace);
    const humanKings = state.players[0].hand.filter(c => c.rank === Rank.King);
    const humanOther = state.players[0].hand.filter(c => c.rank !== Rank.Ace && c.rank !== Rank.King);
    
    // Give human multiple aces and kings
    state.players[0].hand = [...humanAces, ...humanKings, ...humanOther.slice(0, 25 - humanAces.length - humanKings.length)];
    
    console.log('=== First Trick (Human should win) ===');
    console.log(`Initial counts: ${state.players.map(p => p.hand.length).join(', ')}`);
    
    // Play first trick
    for (let play = 0; play < 4; play++) {
      const currentPlayer = state.players[state.currentPlayerIndex];
      const cardsBefore = state.players.map(p => p.hand.length);
      
      let cardsToPlay: Card[] = [];
      if (currentPlayer.isHuman) {
        // Human plays an ace to ensure winning
        const ace = currentPlayer.hand.find(c => c.rank === Rank.Ace);
        cardsToPlay = [ace || currentPlayer.hand[0]];
      } else {
        const aiMove = getAIMoveWithErrorHandling(state);
        cardsToPlay = aiMove.error ? [currentPlayer.hand[0]] : aiMove.cards;
      }
      
      console.log(`\n${currentPlayer.name} (index ${state.currentPlayerIndex}) plays ${cardsToPlay.length} cards`);
      console.log(`Before: ${cardsBefore.join(', ')}`);
      
      const result = processPlay(state, cardsToPlay);
      const cardsAfter = result.newState.players.map(p => p.hand.length);
      
      console.log(`After: ${cardsAfter.join(', ')}`);
      console.log(`Next player index: ${result.newState.currentPlayerIndex}`);
      
      // Check for card loss anomalies
      for (let i = 0; i < 4; i++) {
        const loss = cardsBefore[i] - cardsAfter[i];
        if (loss > 0 && i !== state.currentPlayerIndex) {
          console.error(`ERROR: Player ${i} (${state.players[i].name}) lost ${loss} cards but wasn't playing!`);
        }
      }
      
      state = result.newState;
      
      if (result.trickComplete) {
        console.log(`\nTrick complete! Winner: ${result.trickWinnerId}`);
      }
    }
    
    console.log(`\nAfter trick 1: ${state.players.map(p => p.hand.length).join(', ')}`);
    expect(state.players.map(p => p.hand.length)).toEqual([24, 24, 24, 24]);
    
    // Now the human should be leading the second trick
    console.log('\n=== Second Trick (Human leads) ===');
    console.log(`Current player: ${state.players[state.currentPlayerIndex].name} (index ${state.currentPlayerIndex})`);
    
    // First play of second trick - HUMAN SHOULD BE PLAYING
    const humanIndex = 0;
    const humanBefore = state.players[humanIndex].hand.length;
    const allBefore = state.players.map(p => p.hand.length);
    
    console.log(`\nBefore human plays:`);
    console.log(`All counts: ${allBefore.join(', ')}`);
    console.log(`Human has ${humanBefore} cards`);
    
    // Check for pairs the human might play
    const humanPlayer = state.players[humanIndex];
    let humanCards: Card[] = [];
    
    // Look for pairs
    for (let i = 0; i < humanPlayer.hand.length - 1; i++) {
      if (humanPlayer.hand[i].rank === humanPlayer.hand[i + 1].rank &&
          humanPlayer.hand[i].suit === humanPlayer.hand[i + 1].suit) {
        humanCards = [humanPlayer.hand[i], humanPlayer.hand[i + 1]];
        console.log(`Human has a pair: ${humanCards[0].rank} of ${humanCards[0].suit}`);
        break;
      }
    }
    
    // If no pair, just play one card
    if (humanCards.length === 0) {
      humanCards = [humanPlayer.hand[0]];
    }
    
    console.log(`Human will play ${humanCards.length} cards`);
    console.log(`Card IDs to play: ${humanCards.map(c => c.id).join(', ')}`);
    
    // Create a snapshot of the state before processing
    const beforeProcessing = JSON.parse(JSON.stringify(state));
    
    // Process the human's play
    const result = processPlay(state, humanCards);
    
    console.log(`\nAfter processing human's play:`);
    const allAfter = result.newState.players.map(p => p.hand.length);
    console.log(`All counts: ${allAfter.join(', ')}`);
    console.log(`Next player index: ${result.newState.currentPlayerIndex}`);
    
    // Detailed analysis
    for (let i = 0; i < 4; i++) {
      const before = allBefore[i];
      const after = allAfter[i];
      const loss = before - after;
      
      if (loss > 0) {
        console.log(`Player ${i} (${state.players[i].name}): ${before} -> ${after} (lost ${loss} cards)`);
        
        if (i === humanIndex) {
          console.log(`Human played ${humanCards.length} cards and lost ${loss} cards`);
          if (loss !== humanCards.length) {
            console.error(`BUG DETECTED: Human played ${humanCards.length} but lost ${loss} cards!`);
            
            // Find which cards were actually removed
            const beforeIds = beforeProcessing.players[i].hand.map((c: any) => c.id);
            const afterIds = result.newState.players[i].hand.map(c => c.id);
            const removedIds = beforeIds.filter((id: string) => !afterIds.includes(id));
            
            console.error(`Cards that were removed: ${removedIds.join(', ')}`);
            console.error(`Cards that should have been removed: ${humanCards.map(c => c.id).join(', ')}`);
            
            const unexpected = removedIds.filter((id: string) => !humanCards.some(c => c.id === id));
            if (unexpected.length > 0) {
              console.error(`UNEXPECTED REMOVALS: ${unexpected.join(', ')}`);
            }
          }
        } else if (loss > 0) {
          console.error(`BUG: Player ${i} lost ${loss} cards but wasn't playing!`);
        }
      }
    }
    
    // Continue with the rest of the trick
    state = result.newState;
    
    console.log('\nContinuing second trick...');
    for (let play = 1; play < 4; play++) {
      const currentPlayer = state.players[state.currentPlayerIndex];
      
      let cardsToPlay: Card[] = [];
      if (currentPlayer.isHuman) {
        cardsToPlay = [currentPlayer.hand[0]];
      } else {
        const aiMove = getAIMoveWithErrorHandling(state);
        cardsToPlay = aiMove.error ? [currentPlayer.hand[0]] : aiMove.cards;
      }
      
      const result = processPlay(state, cardsToPlay);
      console.log(`${currentPlayer.name}: ${state.players[state.currentPlayerIndex].hand.length} -> ${result.newState.players[state.currentPlayerIndex].hand.length}`);
      
      state = result.newState;
    }
    
    // Final check
    console.log(`\nFinal counts: ${state.players.map(p => p.hand.length).join(', ')}`);
    
    // All players should have lost exactly 1 card in first trick + N cards in second trick (where N is what human led)
    const cardsPlayedInSecondTrick = humanCards.length;
    const expectedCount = 25 - 1 - cardsPlayedInSecondTrick;
    
    console.log(`\nExpected count: ${expectedCount} (25 - 1 - ${cardsPlayedInSecondTrick})`);
    
    // All players should have equal card counts
    const allCounts = state.players.map(p => p.hand.length);
    const countsEqual = allCounts.every(count => count === allCounts[0]);
    
    expect(countsEqual).toBe(true);
    if (!countsEqual) {
      console.error('Card counts are not equal!');
      state.players.forEach((player, idx) => {
        console.error(`Player ${idx} (${player.name}): ${player.hand.length} cards`);
      });
    }
    
    // Also verify all have the expected count
    state.players.forEach((player, idx) => {
      expect(player.hand.length).toBe(expectedCount);
    });
  });
});