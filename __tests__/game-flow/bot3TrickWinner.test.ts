import { GameState, Rank } from '../../src/types/game';
import { initializeGame } from '../../src/utils/gameLogic';
import { processPlay } from '../../src/utils/gamePlayManager';
import { getAIMoveWithErrorHandling } from '../../src/utils/gamePlayManager';

describe('Bot 3 Trick Winner Issue', () => {
  test('Check Bot 3 winning tricks and player index handling', () => {
    const gameState = initializeGame();
    let state = gameState;
    
    // Give Bot 3 really high cards to ensure it wins tricks
    const bot3Index = 3;
    state.players[bot3Index].hand = [
      ...state.players[bot3Index].hand.filter(c => c.joker || (c.rank === 'A')),
      ...state.players[bot3Index].hand.filter(c => !c.joker && c.rank !== 'A')
    ];
    
    console.log('=== Starting game with Bot 3 having high cards ===');
    console.log(`Bot 3 has ${state.players[bot3Index].hand.filter(c => c.joker || c.rank === 'A').length} high cards`);
    
    // Track the entire play sequence
    const playHistory: {
      trickNum: number,
      playNum: number,
      playerIndex: number,
      playerName: string,
      cardsBefore: number[],
      cardsAfter: number[],
      trickComplete: boolean,
      winner?: string
    }[] = [];
    
    // Play 3 complete tricks
    for (let trickNum = 0; trickNum < 3; trickNum++) {
      console.log(`\n=== TRICK ${trickNum + 1} ===`);
      console.log(`Starting player: ${state.currentPlayerIndex} (${state.players[state.currentPlayerIndex].name})`);
      
      for (let playNum = 0; playNum < 4; playNum++) {
        const cardsBefore = state.players.map(p => p.hand.length);
        const currentPlayerIndex = state.currentPlayerIndex;
        const currentPlayer = state.players[currentPlayerIndex];
        
        console.log(`\nPlay ${playNum + 1}: Player ${currentPlayerIndex} (${currentPlayer.name})`);
        console.log(`Cards before: ${cardsBefore.join(', ')}`);
        
        // Determine cards to play
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
        
        const cardsAfter = state.players.map(p => p.hand.length);
        console.log(`Cards after: ${cardsAfter.join(', ')}`);
        console.log(`Next player index: ${state.currentPlayerIndex}`);
        
        // Record history
        playHistory.push({
          trickNum,
          playNum,
          playerIndex: currentPlayerIndex,
          playerName: currentPlayer.name,
          cardsBefore,
          cardsAfter,
          trickComplete: result.trickComplete || false,
          winner: result.trickWinner
        });
        
        if (result.trickComplete) {
          console.log(`Trick complete! Winner: ${result.trickWinner}`);
          
          // Debug: Check who should be the next player
          const expectedNextPlayer = state.players.findIndex(p => p.name === result.trickWinner);
          console.log(`Expected next player: ${expectedNextPlayer}, Actual: ${state.currentPlayerIndex}`);
          
          if (expectedNextPlayer !== state.currentPlayerIndex) {
            console.error(`ERROR: Next player mismatch! Expected ${expectedNextPlayer}, got ${state.currentPlayerIndex}`);
          }
        }
        
        // Check for discrepancies
        cardsAfter.forEach((count, idx) => {
          const before = cardsBefore[idx];
          const expected = idx === currentPlayerIndex ? before - cardsToPlay.length : before;
          
          if (count !== expected) {
            console.error(`ERROR: Player ${idx} (${state.players[idx].name}) has ${count} cards, expected ${expected}`);
            console.error(`  Before: ${before}, After: ${count}, Player was ${idx === currentPlayerIndex ? 'playing' : 'waiting'}`);
          }
        });
      }
      
      // After each trick, check card balance
      const finalCounts = state.players.map(p => p.hand.length);
      const uniqueCounts = new Set(finalCounts);
      
      if (uniqueCounts.size > 1) {
        console.error(`\nERROR: Unequal cards after trick ${trickNum + 1}!`);
        console.error(`Card counts: ${finalCounts.join(', ')}`);
        
        // Analyze the history to find the issue
        const bot3History = playHistory.filter(h => h.playerIndex === bot3Index || h.playerName === 'Bot 3');
        console.error('\nBot 3 specific history:');
        bot3History.forEach(h => {
          console.error(`  Trick ${h.trickNum + 1}, Play ${h.playNum + 1}: ${h.cardsBefore[bot3Index]} -> ${h.cardsAfter[bot3Index]}`);
        });
        
        throw new Error('Card imbalance detected');
      }
    }
    
    console.log('\n=== ANALYSIS ===');
    const bot3Wins = playHistory.filter(h => h.winner === 'Bot 3').length;
    console.log(`Bot 3 won ${bot3Wins} tricks`);
    
    // Check final state
    const finalCounts = state.players.map(p => p.hand.length);
    console.log(`Final card counts: ${finalCounts.join(', ')}`);
    expect(new Set(finalCounts).size).toBe(1);
  });
  
  test('Examine winner index calculation', () => {
    const gameState = initializeGame();
    
    console.log('\n=== Testing winner index calculation ===');
    
    // Simulate a trick where Bot 3 wins
    const mockTrick = {
      leadingPlayerId: 'player',
      leadingCombo: [{ id: 'test1', suit: 'Hearts', rank: '2' }],
      plays: [
        { playerId: 'ai1', cards: [{ id: 'test2', suit: 'Hearts', rank: '3' }] },
        { playerId: 'ai2', cards: [{ id: 'test3', suit: 'Hearts', rank: '4' }] },
        { playerId: 'ai3', cards: [{ id: 'test4', suit: 'Hearts', rank: 'A' }] } // Bot 3 plays highest
      ],
      points: 0
    };
    
    // Find Bot 3's index in the players array
    const bot3Index = gameState.players.findIndex(p => p.id === 'ai3');
    console.log(`Bot 3 ID: ai3, Index in players array: ${bot3Index}`);
    
    // Test the mapping between player IDs and indices
    gameState.players.forEach((player, idx) => {
      console.log(`Player ${idx}: ID = ${player.id}, Name = ${player.name}`);
    });
    
    // Simulate finding the winner
    const winningPlayerId = 'ai3'; // Bot 3 wins
    const winnerIndex = gameState.players.findIndex(p => p.id === winningPlayerId);
    console.log(`Winner ID: ${winningPlayerId}, Winner Index: ${winnerIndex}`);
    
    // Check if the index mapping is consistent
    expect(winnerIndex).toBe(bot3Index);
    expect(gameState.players[winnerIndex].name).toBe('Bot 3');
  });
});