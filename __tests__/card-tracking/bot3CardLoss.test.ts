import { GameState, Player, Rank } from '../../src/types/game';
import { initializeGame } from '../../src/utils/gameLogic';
import { processPlay } from '../../src/utils/gamePlayManager';
import { getAIMoveWithErrorHandling } from '../../src/utils/gamePlayManager';

describe('Bot 3 Card Loss Investigation', () => {
  // Helper to check if processPlay is being called multiple times for the same play
  let processPlayCalls: { playerName: string, cardCount: number, timestamp: number }[] = [];
  
  // Mock processPlay to track calls
  const trackProcessPlay = (state: GameState, cards: any[]) => {
    const currentPlayer = state.players[state.currentPlayerIndex];
    processPlayCalls.push({
      playerName: currentPlayer.name,
      cardCount: cards.length,
      timestamp: Date.now()
    });
    
    console.log(`[TRACK] processPlay called for ${currentPlayer.name} with ${cards.length} cards`);
    
    // Call the real processPlay
    return processPlay(state, cards);
  };
  
  test('Track Bot 3 through multiple complete tricks', () => {
    const gameState = initializeGame('Human', ['Team A', 'Team B'], Rank.Two);
    let state = gameState;
    
    // Find Bot 3 index
    const bot3Index = state.players.findIndex(p => p.name === 'Bot 3');
    console.log(`Bot 3 is at index ${bot3Index}`);
    
    // Play tracking
    const bot3History: {
      trickNum: number,
      playNum: number,
      cardsBefore: number,
      cardsAfter: number,
      action: string,
      currentPlayerIndex: number
    }[] = [];
    
    // Play 5 complete tricks
    for (let trickNum = 0; trickNum < 5; trickNum++) {
      console.log(`\n=== TRICK ${trickNum + 1} ===`);
      processPlayCalls = []; // Reset tracking for each trick
      
      for (let playNum = 0; playNum < 4; playNum++) {
        const currentPlayer = state.players[state.currentPlayerIndex];
        const bot3Before = state.players[bot3Index].hand.length;
        
        console.log(`\nPlay ${playNum + 1}: Player ${state.currentPlayerIndex} (${currentPlayer.name})`);
        console.log(`Card counts before: ${state.players.map((p, i) => `${i}:${p.hand.length}`).join(', ')}`);
        
        // Determine cards to play
        let cardsToPlay: any[] = [];
        if (currentPlayer.isHuman) {
          cardsToPlay = [currentPlayer.hand[0]];
        } else {
          const aiMove = getAIMoveWithErrorHandling(state);
          if (aiMove.error) {
            console.error(`AI Error: ${aiMove.error}`);
            cardsToPlay = currentPlayer.hand.length > 0 ? [currentPlayer.hand[0]] : [];
          } else {
            cardsToPlay = aiMove.cards;
          }
        }
        
        // Process the play
        const result = trackProcessPlay(state, cardsToPlay);
        state = result.newState;
        
        const bot3After = state.players[bot3Index].hand.length;
        
        // Record Bot 3 history
        bot3History.push({
          trickNum,
          playNum,
          cardsBefore: bot3Before,
          cardsAfter: bot3After,
          action: state.currentPlayerIndex === bot3Index ? 'played' : 'waiting',
          currentPlayerIndex: state.currentPlayerIndex
        });
        
        console.log(`Card counts after: ${state.players.map((p, i) => `${i}:${p.hand.length}`).join(', ')}`);
        
        // Check if Bot 3 lost cards incorrectly
        // Note: The currentPlayerIndex in the original state tells us who just played
        const playerWhoJustPlayed = currentPlayer.id.includes('3') ? bot3Index : state.currentPlayerIndex;
        
        if (bot3Before !== bot3After && playerWhoJustPlayed !== bot3Index) {
          console.error(`ERROR: Bot 3 lost ${bot3Before - bot3After} cards but wasn't playing!`);
          console.error(`Player who just played: ${currentPlayer.name} (index ${playerWhoJustPlayed})`);
          console.error(`Current player index after play: ${state.currentPlayerIndex}`);
          console.error(`Process play calls in this trick:`);
          processPlayCalls.forEach(call => {
            console.error(`  ${call.playerName} at ${call.timestamp}`);
          });
        }
        
        if (result.trickComplete) {
          console.log(`Trick complete: Winner = ${result.trickWinner}`);
        }
      }
      
      // Check card count equality after each trick
      const counts = state.players.map(p => p.hand.length);
      const uniqueCounts = new Set(counts);
      if (uniqueCounts.size > 1) {
        console.error(`\nERROR: Unequal card counts after trick ${trickNum + 1}!`);
        console.error(`Counts: ${counts.join(', ')}`);
        
        // Print Bot 3 history
        console.error('\nBot 3 History:');
        bot3History.forEach(h => {
          console.error(`  Trick ${h.trickNum + 1}, Play ${h.playNum + 1}: ${h.cardsBefore} -> ${h.cardsAfter} (${h.action})`);
        });
        
        throw new Error('Unequal card distribution detected');
      }
    }
    
    // Final analysis
    console.log('\n=== FINAL ANALYSIS ===');
    const finalCounts = state.players.map(p => p.hand.length);
    console.log(`Final card counts: ${finalCounts.join(', ')}`);
    
    // Look for patterns in Bot 3 history
    console.log('\nBot 3 Card Loss Pattern:');
    let totalLost = 0;
    bot3History.forEach((h, idx) => {
      const cardLoss = h.cardsBefore - h.cardsAfter;
      if (cardLoss > 0) {
        totalLost += cardLoss;
        console.log(`  Entry ${idx}: Lost ${cardLoss} cards (${h.action})`);
      }
    });
    console.log(`Total cards lost by Bot 3: ${totalLost}`);
    
    // Check that all players have equal cards at the end
    expect(new Set(finalCounts).size).toBe(1);
  });
  
  test('Check for state mutation in real game flow', () => {
    console.log('\n=== STATE MUTATION TEST ===');
    
    const gameState = initializeGame('Human', ['Team A', 'Team B'], Rank.Two);
    
    // Deep copy to preserve original
    const originalStateCopy = JSON.parse(JSON.stringify(gameState));
    
    // Make first play
    const firstPlay = processPlay(gameState, [gameState.players[0].hand[0]]);
    
    // Check if original was mutated
    const originalHandLengths = originalStateCopy.players.map((p: Player) => p.hand.length);
    const currentHandLengths = gameState.players.map((p: Player) => p.hand.length);
    
    console.log('Original hand lengths:', originalHandLengths.join(', '));
    console.log('Current hand lengths:', currentHandLengths.join(', '));
    
    // They should be different if not mutated
    if (JSON.stringify(originalHandLengths) !== JSON.stringify(currentHandLengths)) {
      console.error('ERROR: Original state was mutated!');
    }
    
    // Check the actual play worked correctly
    const newHandLengths = firstPlay.newState.players.map(p => p.hand.length);
    console.log('New state hand lengths:', newHandLengths.join(', '));
    
    // Only player 0 should have lost a card
    expect(newHandLengths[0]).toBe(originalHandLengths[0] - 1);
    expect(newHandLengths[1]).toBe(originalHandLengths[1]);
    expect(newHandLengths[2]).toBe(originalHandLengths[2]);
    expect(newHandLengths[3]).toBe(originalHandLengths[3]);
  });
});