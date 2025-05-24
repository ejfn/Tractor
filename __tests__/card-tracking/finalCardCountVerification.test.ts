import { GameState, Rank } from '../../src/types/game';
import { initializeGame } from '../../src/utils/gameLogic';
import { processPlay } from '../../src/utils/gamePlayManager';
import { getAIMoveWithErrorHandling } from '../../src/utils/gamePlayManager';

describe('Final Card Count Verification', () => {
  test('Bot 3 maintains correct card count throughout extended gameplay', () => {
    const gameState = initializeGame();
    let state = gameState;
    
    // Play 10 complete tricks
    for (let trickNum = 0; trickNum < 10; trickNum++) {
      const trickStartCounts = state.players.map(p => p.hand.length);
      
      console.log(`\nTrick ${trickNum + 1} starting with counts: ${trickStartCounts.join(', ')}`);
      
      // Play all 4 players
      for (let playNum = 0; playNum < 4; playNum++) {
        const currentPlayer = state.players[state.currentPlayerIndex];
        const bot3Index = state.players.findIndex(p => p.name === 'Bot 3');
        const bot3Before = state.players[bot3Index].hand.length;
        
        // Get cards to play
        let cardsToPlay: any[] = [];
        if (currentPlayer.isHuman) {
          cardsToPlay = [currentPlayer.hand[0]];
        } else {
          const aiMove = getAIMoveWithErrorHandling(state);
          cardsToPlay = aiMove.error ? [currentPlayer.hand[0]] : aiMove.cards;
        }
        
        // Process the play
        const result = processPlay(state, cardsToPlay);
        state = result.newState;
        
        const bot3After = state.players[bot3Index].hand.length;
        
        // Verify Bot 3 only lost cards when it was its turn
        if (state.currentPlayerIndex === bot3Index + 1 || 
            (state.currentPlayerIndex === 0 && result.trickComplete)) {
          // Bot 3 just played or trick completed with Bot 3 as last player
          if (bot3Before === bot3After && currentPlayer.name === 'Bot 3') {
            throw new Error(`Bot 3 didn't lose cards when it played!`);
          }
        } else if (bot3Before !== bot3After && currentPlayer.name !== 'Bot 3') {
          throw new Error(`Bot 3 lost cards when it wasn't its turn! Player ${currentPlayer.name} was playing.`);
        }
        
        if (result.trickComplete) {
          console.log(`  Trick won by ${result.trickWinner}`);
        }
      }
      
      // Verify equal card counts after each trick
      const trickEndCounts = state.players.map(p => p.hand.length);
      const uniqueCounts = new Set(trickEndCounts);
      
      if (uniqueCounts.size > 1) {
        console.error(`ERROR: Unequal card counts after trick ${trickNum + 1}`);
        console.error(`Counts: ${trickEndCounts.join(', ')}`);
        
        // Show which players have different counts
        const expectedCount = trickEndCounts[0];
        state.players.forEach((player, idx) => {
          if (player.hand.length !== expectedCount) {
            console.error(`  ${player.name} has ${player.hand.length} cards, expected ${expectedCount}`);
          }
        });
        
        throw new Error('Card count imbalance detected');
      }
      
      console.log(`  Trick ${trickNum + 1} complete. All players have ${trickEndCounts[0]} cards.`);
    }
    
    // Final verification
    const finalCounts = state.players.map(p => p.hand.length);
    console.log(`\nFinal card counts after 10 tricks: ${finalCounts.join(', ')}`);
    
    expect(new Set(finalCounts).size).toBe(1);
    expect(finalCounts[3]).toBe(finalCounts[0]); // Bot 3 has same as Human
  });
  
  test('Winner correctly becomes next player', () => {
    const gameState = initializeGame();
    let state = gameState;
    
    // Give Bot 3 all the aces to ensure it wins
    const bot3Index = 3;
    const allAces = state.players.flatMap(p => p.hand.filter(c => c.rank === 'A'));
    const nonAcesBot3 = state.players[bot3Index].hand.filter(c => c.rank !== 'A');
    const otherCards = state.players.flatMap((p, idx) => 
      idx !== bot3Index ? p.hand.filter(c => c.rank !== 'A') : []
    );
    
    // Redistribute cards: Bot 3 gets all aces
    state.players[bot3Index].hand = [...allAces, ...nonAcesBot3.slice(0, 25 - allAces.length)];
    state.players.forEach((player, idx) => {
      if (idx !== bot3Index) {
        const startIdx = idx * 25;
        player.hand = otherCards.slice(startIdx, startIdx + 25);
      }
    });
    
    console.log(`Bot 3 has ${state.players[bot3Index].hand.filter(c => c.rank === 'A').length} aces`);
    
    // Play a trick
    let winners: string[] = [];
    
    for (let playNum = 0; playNum < 4; playNum++) {
      const currentPlayer = state.players[state.currentPlayerIndex];
      
      let cardsToPlay: any[] = [];
      if (currentPlayer.isHuman) {
        cardsToPlay = [currentPlayer.hand[0]];
      } else {
        const aiMove = getAIMoveWithErrorHandling(state);
        cardsToPlay = aiMove.error ? [currentPlayer.hand[0]] : aiMove.cards;
      }
      
      const result = processPlay(state, cardsToPlay);
      state = result.newState;
      
      if (result.trickComplete) {
        winners.push(result.trickWinner!);
        console.log(`Trick winner: ${result.trickWinner}`);
        console.log(`Next player should be: ${result.trickWinner}`);
        console.log(`Next player is: ${state.players[state.currentPlayerIndex].name}`);
        
        // Verify winner is the next player
        expect(state.players[state.currentPlayerIndex].name).toBe(result.trickWinner);
      }
    }
    
    expect(winners.length).toBeGreaterThan(0);
  });
});