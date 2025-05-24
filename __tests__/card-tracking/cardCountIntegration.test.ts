import { GameState, Card, Rank, Player } from '../../src/types/game';
import { initializeGame } from '../../src/utils/gameLogic';
import { processPlay } from '../../src/utils/gamePlayManager';
import { getAIMoveWithErrorHandling } from '../../src/utils/gamePlayManager';
import { GameStateUtils } from '../../src/utils/gameStateUtils';

describe('Card Count Integration Test', () => {
  test('Track card removal through processPlay', () => {
    // Initialize game with 4 players
    const gameState = initializeGame(
      'Human', 
      ['Team A', 'Team B'],
      Rank.Two
    );
    
    let state = gameState;
    
    // Log initial state
    console.log('Initial card counts:');
    const allPlayers = GameStateUtils.getAllPlayers(state);
    allPlayers.forEach((p: Player, idx) => {
      console.log(`  Player ${idx} (${p.name}): ${p.hand.length} cards`);
    });
    
    // Play one complete trick
    const playerIds = ['player', 'ai1', 'ai2', 'ai3'];
    for (let play = 0; play < 4; play++) {
      const currentPlayerId = playerIds[play];
      const currentPlayer = GameStateUtils.getPlayerById(state, currentPlayerId);
      console.log(`\n--- Play ${play + 1} ---`);
      console.log(`Current player: ${currentPlayerId} (${currentPlayer.name})`);
      console.log(`Card counts before: ${GameStateUtils.getAllPlayers(state).map(p => p.hand.length).join(', ')}`);
      
      // For simplicity, play the first card
      const cardsToPlay = [currentPlayer.hand[0]];
      console.log(`Playing ${cardsToPlay.length} card(s): ${cardsToPlay[0].suit || 'JOKER'}${cardsToPlay[0].rank || ''}`);
      
      // Store card IDs and player indices before the play
      const allPlayersBefore = GameStateUtils.getAllPlayers(state);
      const cardCountsBefore = allPlayersBefore.map(p => p.hand.length);
      const cardIdsBefore = allPlayersBefore.map(p => p.hand.map(c => c.id));
      
      // Process the play
      const result = processPlay(state, cardsToPlay, currentPlayer.id);
      
      // Update state
      state = result.newState;
      console.log(`Card counts after: ${GameStateUtils.getAllPlayers(state).map(p => p.hand.length).join(', ')}`);
      console.log(`New current player: ${currentPlayerId}`);
      
      // Track changes
      const allPlayersAfter = GameStateUtils.getAllPlayers(state);
      allPlayersAfter.forEach((player: Player, idx) => {
        const countBefore = cardCountsBefore[idx];
        const countAfter = player.hand.length;
        const cardIdsDiff = cardIdsBefore[idx].filter(id => !player.hand.some(c => c.id === id));
        
        if (countBefore !== countAfter) {
          console.log(`  Player ${idx} (${player.name}): ${countBefore} -> ${countAfter} (lost ${cardIdsDiff.length} cards)`);
          if (cardIdsDiff.length > 0) {
            console.log(`    Lost card IDs: ${cardIdsDiff.join(', ')}`);
          }
          
          // Only the player who just played should lose cards
          if (player.id !== currentPlayerId) {
            console.error(`ERROR: Player ${idx} (${player.name}) lost cards but wasn't the current player!`);
            throw new Error(`Player ${idx} lost cards incorrectly`);
          }
        }
      });
      
      if (result.trickComplete) {
        console.log(`Trick complete! Winner: ${result.trickWinner}`);
      }
    }
    
    // Final verification
    const finalCounts = GameStateUtils.getAllPlayers(state).map(p => p.hand.length);
    console.log(`\nFinal card counts: ${finalCounts.join(', ')}`);
    const uniqueCounts = new Set(finalCounts);
    expect(uniqueCounts.size).toBe(1);
  });
  
  test('Track processPlay with state mutations', () => {
    const gameState = initializeGame(
      'Human', 
      ['Team A', 'Team B'],
      Rank.Two
    );
    
    // Make first play
    console.log('\n=== Testing state mutation ===');
    const originalState = gameState;
    const humanPlayer = GameStateUtils.getPlayerById(originalState, 'player');
    const player0Cards = humanPlayer.hand.map(c => c.id);
    
    console.log(`Player 0 has ${humanPlayer.hand.length} cards`);
    
    // Process human play
    const result1 = processPlay(originalState, [humanPlayer.hand[0]], humanPlayer.id);
    
    console.log(`After play:`);
    const originalHumanAfter = GameStateUtils.getPlayerById(originalState, 'player');
    const resultHuman = GameStateUtils.getPlayerById(result1.newState, 'player');
    console.log(`  Original state player 0: ${originalHumanAfter.hand.length} cards`);
    console.log(`  Result state player 0: ${resultHuman.hand.length} cards`);
    
    // Check if original state was mutated
    const player0CardsAfter = originalHumanAfter.hand.map(c => c.id);
    if (player0Cards.length !== player0CardsAfter.length) {
      console.error('ERROR: Original state was mutated!');
      console.error(`  Before: ${player0Cards.length} cards`);
      console.error(`  After: ${player0CardsAfter.length} cards`);
    }
    
    // Now make another play with the new state - determine next player
    const playerIds = ['player', 'ai1', 'ai2', 'ai3'];
    let nextPlayerIdx = 1; // Next player after human (index 0)
    if (result1.newState.currentTrick) {
      const allPlayers = GameStateUtils.getAllPlayers(result1.newState);
      const leadPlayerIndex = allPlayers.findIndex(p => p.id === result1.newState.currentTrick!.leadingPlayerId);
      nextPlayerIdx = (leadPlayerIndex + result1.newState.currentTrick.plays.length + 1) % 4;
    }
    
    const nextPlayerId = playerIds[nextPlayerIdx];
    const currentPlayer = GameStateUtils.getPlayerById(result1.newState, nextPlayerId);
    
    console.log(`\nPlayer ${nextPlayerIdx} (${currentPlayer.name}) playing...`);
    const cardsBefore = GameStateUtils.getAllPlayers(result1.newState).map(p => p.hand.length);
    
    let cardsToPlay: Card[] = [];
    if (currentPlayer.isHuman) {
      cardsToPlay = [currentPlayer.hand[0]];
    } else {
      const aiMove = getAIMoveWithErrorHandling(result1.newState, currentPlayer.id);
      cardsToPlay = aiMove.error ? [currentPlayer.hand[0]] : aiMove.cards;
    }
    
    const result2 = processPlay(result1.newState, cardsToPlay, currentPlayer.id);
    
    console.log(`Card counts:`);
    console.log(`  Before: ${cardsBefore.join(', ')}`);
    console.log(`  After: ${GameStateUtils.getAllPlayers(result2.newState).map(p => p.hand.length).join(', ')}`);
    
    // Check each player's card count
    const allPlayersAfter2 = GameStateUtils.getAllPlayers(result2.newState);
    allPlayersAfter2.forEach((player: Player, idx) => {
      const before = cardsBefore[idx];
      const after = player.hand.length;
      const wasCurrentPlayer = player.id === nextPlayerId;
      
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
