import { GameState, Player, Rank } from '../../src/types/game';
import { initializeGame } from '../../src/utils/gameLogic';
import { processPlay } from '../../src/utils/gamePlayManager';
import { getAIMoveWithErrorHandling } from '../../src/utils/gamePlayManager';
import { findPlayerById, getPlayOrder } from '../helpers/testUtils';
import { GameStateUtils } from '../../src/utils/gameStateUtils';

describe('Bot 3 Card Loss Investigation', () => {
  // Helper to check if processPlay is being called multiple times for the same play
  let processPlayCalls: { playerName: string, cardCount: number, timestamp: number }[] = [];
  
  // Mock processPlay to track calls
  const trackProcessPlay = (state: GameState, cards: any[], playerId: string) => {
    const currentPlayer = GameStateUtils.getPlayerById(state, playerId);
    processPlayCalls.push({
      playerName: currentPlayer.name,
      cardCount: cards.length,
      timestamp: Date.now()
    });
    
    console.log(`[TRACK] processPlay called for ${currentPlayer.name} with ${cards.length} cards`);
    
    // Call the real processPlay
    return processPlay(state, cards, playerId);
  };
  
  test('Track Bot 3 through multiple complete tricks', () => {
    const gameState = initializeGame('Human', ['Team A', 'Team B'], Rank.Two);
    let state = gameState;
    
    // Find Bot 3 player
    const bot3Player = GameStateUtils.findAIPlayers(state).find(p => p.name === 'Bot 3');
    if (!bot3Player) throw new Error('Bot 3 not found');
    const bot3Id = bot3Player.id;
    console.log(`Bot 3 ID: ${bot3Id}`);
    
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
    const playOrder = GameStateUtils.getPlayerOrder(state);
    for (let trickNum = 0; trickNum < 5; trickNum++) {
      console.log(`\n=== TRICK ${trickNum + 1} ===`);
      processPlayCalls = []; // Reset tracking for each trick
      
      for (let playNum = 0; playNum < 4; playNum++) {
        const currentPlayerId = playOrder[playNum].id; // Sequential play for testing
        const currentPlayer = gameState.players[currentPlayerId];
        if (!currentPlayer) {
          throw new Error(`Player ${currentPlayerId} not found`);
        }
        const bot3Before = gameState.players[bot3Id].hand.length;
        
        console.log(`\nPlay ${playNum + 1}: Player ${currentPlayerId} (${currentPlayer.name})`);
        console.log(`Card counts before: ${GameStateUtils.getAllPlayers(state).map(p => `${p.id}:${p.hand.length}`).join(', ')}`);
        
        // Determine cards to play
        let cardsToPlay: any[] = [];
        if (currentPlayer.isHuman) {
          cardsToPlay = [currentPlayer.hand[0]];
        } else {
          const aiMove = getAIMoveWithErrorHandling(state, currentPlayer.id);
          if (aiMove.error) {
            console.error(`AI Error: ${aiMove.error}`);
            cardsToPlay = currentPlayer.hand.length > 0 ? [currentPlayer.hand[0]] : [];
          } else {
            cardsToPlay = aiMove.cards;
          }
        }
        
        // Process the play
        const result = trackProcessPlay(state, cardsToPlay, currentPlayer.id);
        state = result.newState;
        
        const bot3After = gameState.players[bot3Id].hand.length;
        
        // Record Bot 3 history
        bot3History.push({
          trickNum,
          playNum,
          cardsBefore: bot3Before,
          cardsAfter: bot3After,
          action: currentPlayerId === bot3Id ? 'played' : 'waiting',
          currentPlayerIndex: playNum
        });
        
        console.log(`Card counts after: ${Object.values(gameState.players).map(p => `${p.id}:${p.hand.length}`).join(', ')}`);
        
        // Check if Bot 3 lost cards incorrectly
        // Note: The currentPlayerId tells us who just played
        const playerWhoJustPlayed = currentPlayerId;
        
        if (bot3Before !== bot3After && playerWhoJustPlayed !== bot3Id) {
          console.error(`ERROR: Bot 3 lost ${bot3Before - bot3After} cards but wasn't playing!`);
          console.error(`Player who just played: ${currentPlayer.name} (id ${playerWhoJustPlayed})`);
          console.error(`Current player id after play: ${currentPlayerId}`);
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
      const counts = Object.values(gameState.players).map(p => p.hand.length);
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
    const finalCounts = Object.values(gameState.players).map(p => p.hand.length);
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
    
    // Make first play - use human player
    const humanPlayer = Object.values(gameState.players).find(p => p.isHuman)!;
    const firstPlay = processPlay(gameState, [humanPlayer.hand[0]], humanPlayer.id);
    
    // Check if original was mutated
    const originalHandLengths = Object.values(originalStateCopy.players).map((p: any) => p.hand.length);
    const currentHandLengths = Object.values(gameState.players).map((p: Player) => p.hand.length);
    
    console.log('Original hand lengths:', originalHandLengths.join(', '));
    console.log('Current hand lengths:', currentHandLengths.join(', '));
    
    // They should be different if not mutated
    if (JSON.stringify(originalHandLengths) !== JSON.stringify(currentHandLengths)) {
      console.error('ERROR: Original state was mutated!');
    }
    
    // Check the actual play worked correctly
    const newHandLengths = Object.values(firstPlay.newState.players).map(p => p.hand.length);
    console.log('New state hand lengths:', newHandLengths.join(', '));
    
    // Only the human player should have lost a card
    const playOrder = getPlayOrder(gameState);
    const newPlayersByOrder = playOrder.map(player => firstPlay.newState.players[player.id]);
    const originalPlayersByOrder = playOrder.map(player => originalStateCopy.players[player.id]);
    
    expect(newPlayersByOrder[0].hand.length).toBe(originalPlayersByOrder[0].hand.length - 1); // human
    expect(newPlayersByOrder[1].hand.length).toBe(originalPlayersByOrder[1].hand.length); // bot1
    expect(newPlayersByOrder[2].hand.length).toBe(originalPlayersByOrder[2].hand.length); // bot2
    expect(newPlayersByOrder[3].hand.length).toBe(originalPlayersByOrder[3].hand.length); // bot3
  });
});
