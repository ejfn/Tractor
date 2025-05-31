import { GameState, Card, Rank } from "../../src/types";
import { processPlay } from '../../src/game/gamePlayManager';
import { getAIMoveWithErrorHandling } from '../../src/game/gamePlayManager';
import { createFullyDealtGameState } from '../helpers/gameStates';

describe('Card Count Integration Test', () => {
  test('Track card removal through processPlay', () => {
    // Initialize game with 4 players
    const gameState = createFullyDealtGameState();
    
    let state = gameState;
    
    // Log initial state
    console.log('Initial card counts:');
    state.players.forEach((p, idx) => {
      console.log(`  Player ${idx} (${p.name}): ${p.hand.length} cards`);
    });
    
    // Play one complete trick
    for (let play = 0; play < 4; play++) {
      const currentPlayerIdx = state.currentPlayerIndex;
      const currentPlayer = state.players[currentPlayerIdx];
      console.log(`\n--- Play ${play + 1} ---`);
      console.log(`Current player: ${currentPlayerIdx} (${currentPlayer.name})`);
      console.log(`Card counts before: ${state.players.map(p => p.hand.length).join(', ')}`);
      
      // For simplicity, play the first card
      const cardsToPlay = [currentPlayer.hand[0]];
      console.log(`Playing ${cardsToPlay.length} card(s): ${cardsToPlay[0].suit || 'JOKER'}${cardsToPlay[0].rank || ''}`);
      
      // Store card IDs and player indices before the play
      const cardCountsBefore = state.players.map(p => p.hand.length);
      const cardIdsBefore = state.players.map(p => p.hand.map(c => c.id));
      
      // Process the play
      const result = processPlay(state, cardsToPlay);
      
      // Update state
      state = result.newState;
      console.log(`Card counts after: ${state.players.map(p => p.hand.length).join(', ')}`);
      console.log(`New current player: ${state.currentPlayerIndex}`);
      
      // Track changes
      state.players.forEach((player, idx) => {
        const countBefore = cardCountsBefore[idx];
        const countAfter = player.hand.length;
        const cardIdsDiff = cardIdsBefore[idx].filter(id => !player.hand.some(c => c.id === id));
        
        if (countBefore !== countAfter) {
          console.log(`  Player ${idx} (${player.name}): ${countBefore} -> ${countAfter} (lost ${cardIdsDiff.length} cards)`);
          if (cardIdsDiff.length > 0) {
            console.log(`    Lost card IDs: ${cardIdsDiff.join(', ')}`);
          }
          
          // Only the player who just played should lose cards
          if (idx !== currentPlayerIdx) {
            console.error(`ERROR: Player ${idx} (${player.name}) lost cards but wasn't the current player!`);
            throw new Error(`Player ${idx} lost cards incorrectly`);
          }
        }
      });
      
      if (result.trickComplete) {
        console.log(`Trick complete! Winner: ${result.trickWinnerId}`);
      }
    }
    
    // Final verification
    const finalCounts = state.players.map(p => p.hand.length);
    console.log(`\nFinal card counts: ${finalCounts.join(', ')}`);
    const uniqueCounts = new Set(finalCounts);
    expect(uniqueCounts.size).toBe(1);
  });
  
  test('Track processPlay with state mutations', () => {
    const gameState = createFullyDealtGameState();
    
    // Make first play
    console.log('\n=== Testing state mutation ===');
    const originalState = gameState;
    const player0Cards = originalState.players[0].hand.map(c => c.id);
    
    console.log(`Player 0 has ${originalState.players[0].hand.length} cards`);
    
    // Process human play
    const result1 = processPlay(originalState, [originalState.players[0].hand[0]]);
    
    console.log(`After play:`);
    console.log(`  Original state player 0: ${originalState.players[0].hand.length} cards`);
    console.log(`  Result state player 0: ${result1.newState.players[0].hand.length} cards`);
    
    // Check if original state was mutated
    const player0CardsAfter = originalState.players[0].hand.map(c => c.id);
    if (player0Cards.length !== player0CardsAfter.length) {
      console.error('ERROR: Original state was mutated!');
      console.error(`  Before: ${player0Cards.length} cards`);
      console.error(`  After: ${player0CardsAfter.length} cards`);
    }
    
    // Now make another play with the new state
    const currentPlayer = result1.newState.players[result1.newState.currentPlayerIndex];
    
    console.log(`\nPlayer ${result1.newState.currentPlayerIndex} (${currentPlayer.name}) playing...`);
    const cardsBefore = result1.newState.players.map(p => p.hand.length);
    
    let cardsToPlay: Card[] = [];
    if (currentPlayer.isHuman) {
      cardsToPlay = [currentPlayer.hand[0]];
    } else {
      const aiMove = getAIMoveWithErrorHandling(result1.newState);
      cardsToPlay = aiMove.error ? [currentPlayer.hand[0]] : aiMove.cards;
    }
    
    const result2 = processPlay(result1.newState, cardsToPlay);
    
    console.log(`Card counts:`);
    console.log(`  Before: ${cardsBefore.join(', ')}`);
    console.log(`  After: ${result2.newState.players.map(p => p.hand.length).join(', ')}`);
    
    // Check each player's card count
    result2.newState.players.forEach((player, idx) => {
      const before = cardsBefore[idx];
      const after = player.hand.length;
      const wasCurrentPlayer = idx === result1.newState.currentPlayerIndex;
      
      if (wasCurrentPlayer) {
        expect(after).toBe(before - cardsToPlay.length);
      } else {
        if (after !== before) {
          console.error(`ERROR: Player ${idx} (${player.name}) lost ${before - after} cards incorrectly!`);
        }
        expect(after).toBe(before);
      }
    });
  });
});