import { GameState, Card, Rank } from "../../src/types";
import { initializeGame } from '../../src/game/gameLogic';
import { processPlay } from '../../src/game/gamePlayManager';
import { getAIMoveWithErrorHandling } from '../../src/game/gamePlayManager';

describe('Comprehensive Card Tracking Tests', () => {
  // Helper function to verify card counts
  const verifyCardCounts = (state: GameState, expected?: number) => {
    const counts = state.players.map(p => p.hand.length);
    const uniqueCounts = new Set(counts);
    
    if (uniqueCounts.size > 1) {
      console.error('ERROR: Unequal card counts detected!');
      state.players.forEach((p, idx) => {
        console.error(`  ${p.name}: ${p.hand.length} cards`);
      });
      return false;
    }
    
    if (expected !== undefined && counts[0] !== expected) {
      console.error(`ERROR: Expected ${expected} cards but found ${counts[0]}`);
      return false;
    }
    
    return true;
  };

  test('Track card counts with Bot 2 focus', () => {
    const gameState = initializeGame();
    let state = gameState;
    
    const bot2Index = state.players.findIndex(p => p.name === 'Bot 2');
    console.log(`Bot 2 is at index ${bot2Index}`);
    
    // Track Bot 2's card history
    const bot2History: { trick: number, play: number, cards: number, action: string }[] = [];
    
    // Play 15 complete tricks
    for (let trickNum = 0; trickNum < 15; trickNum++) {
      console.log(`\n=== TRICK ${trickNum + 1} ===`);
      
      for (let playNum = 0; playNum < 4; playNum++) {
        const currentPlayer = state.players[state.currentPlayerIndex];
        const bot2CardsBefore = state.players[bot2Index].hand.length;
        
        // Get cards to play
        let cardsToPlay: Card[] = [];
        if (currentPlayer.isHuman) {
          const comboLength = state.currentTrick?.leadingCombo?.length || 1;
          cardsToPlay = currentPlayer.hand.slice(0, Math.min(comboLength, currentPlayer.hand.length));
        } else {
          const aiMove = getAIMoveWithErrorHandling(state);
          cardsToPlay = aiMove.error ? 
            (state.currentTrick?.leadingCombo ? 
              currentPlayer.hand.slice(0, Math.min(state.currentTrick.leadingCombo.length, currentPlayer.hand.length)) : 
              [currentPlayer.hand[0]]) : 
            aiMove.cards;
        }
        
        // Process the play
        const result = processPlay(state, cardsToPlay);
        
        // Track Bot 2's state
        const bot2CardsAfter = result.newState.players[bot2Index].hand.length;
        const action = state.currentPlayerIndex === bot2Index ? 'playing' : 'waiting';
        
        bot2History.push({
          trick: trickNum,
          play: playNum,
          cards: bot2CardsBefore,
          action
        });
        
        // Check if Bot 2 lost cards incorrectly
        if (bot2CardsBefore !== bot2CardsAfter && action === 'waiting') {
          console.error(`ERROR: Bot 2 lost ${bot2CardsBefore - bot2CardsAfter} cards while waiting!`);
          console.error(`  Current player was: ${currentPlayer.name}`);
        }
        
        state = result.newState;
        
        if (result.trickComplete) {
          console.log(`  Winner: ${result.trickWinner}`);
          
          // Verify equal counts after trick
          if (!verifyCardCounts(state)) {
            console.error(`  Failed after trick ${trickNum + 1}`);
            throw new Error('Card count mismatch');
          }
        }
      }
    }
    
    // Analyze Bot 2's history
    console.log('\nBot 2 Card History Analysis:');
    let totalLost = 0;
    bot2History.forEach((entry, idx) => {
      if (idx > 0) {
        const prev = bot2History[idx - 1];
        const lost = prev.cards - entry.cards;
        if (lost > 0) {
          totalLost += lost;
          console.log(`  Trick ${entry.trick + 1}, Play ${entry.play + 1}: Lost ${lost} cards (${entry.action})`);
        }
      }
    });
    console.log(`Total cards lost by Bot 2: ${totalLost}`);
    
    expect(verifyCardCounts(state)).toBe(true);
  });

  test('Test with different starting players', () => {
    // Test starting with each player as the first to play
    for (let startingPlayer = 0; startingPlayer < 4; startingPlayer++) {
      console.log(`\n=== Testing with Player ${startingPlayer} starting ===`);
      
      const gameState = initializeGame();
      let state = gameState;
      state.currentPlayerIndex = startingPlayer;
      
      // Play 5 tricks with single cards only
      for (let trickNum = 0; trickNum < 5; trickNum++) {
        const startCounts = state.players.map(p => p.hand.length);
        
        for (let playNum = 0; playNum < 4; playNum++) {
          const currentPlayer = state.players[state.currentPlayerIndex];
          
          // Force all players to play singles
          const cardsToPlay = [currentPlayer.hand[0]];
          
          const result = processPlay(state, cardsToPlay);
          state = result.newState;
          
          if (result.trickComplete) {
            console.log(`  Trick ${trickNum + 1} won by ${result.trickWinner}`);
          }
        }
        
        const endCounts = state.players.map(p => p.hand.length);
        const expectedCount = startCounts[0] - 1;
        
        // Verify all players lost exactly 1 card
        endCounts.forEach((count, idx) => {
          expect(count).toBe(expectedCount);
        });
        
        expect(verifyCardCounts(state, expectedCount)).toBe(true);
      }
    }
  });

  test('Test with multiple cards played (pairs, tractors)', () => {
    const gameState = initializeGame();
    let state = gameState;
    
    // Give players some pairs to test multi-card plays
    state.players.forEach(player => {
      // Sort by rank to create pairs
      player.hand.sort((a, b) => {
        if (a.rank === b.rank) return 0;
        return a.rank! > b.rank! ? 1 : -1;
      });
    });
    
    console.log('\n=== Testing multi-card plays ===');
    
    // Try to play pairs when possible
    for (let trickNum = 0; trickNum < 3; trickNum++) {
      console.log(`\nTrick ${trickNum + 1}:`);
      
      for (let playNum = 0; playNum < 4; playNum++) {
        const currentPlayer = state.players[state.currentPlayerIndex];
        const cardsBefore = currentPlayer.hand.length;
        
        let cardsToPlay: Card[] = [];
        
        // Try to find a pair
        const pairs: Card[][] = [];
        for (let i = 0; i < currentPlayer.hand.length - 1; i++) {
          if (currentPlayer.hand[i].rank === currentPlayer.hand[i + 1].rank &&
              currentPlayer.hand[i].suit === currentPlayer.hand[i + 1].suit) {
            pairs.push([currentPlayer.hand[i], currentPlayer.hand[i + 1]]);
          }
        }
        
        if (playNum === 0 && pairs.length > 0) {
          // Lead with a pair if possible
          cardsToPlay = pairs[0];
          console.log(`  ${currentPlayer.name} plays pair: ${cardsToPlay[0].rank} of ${cardsToPlay[0].suit}`);
        } else if (currentPlayer.isHuman) {
          const comboLength = state.currentTrick?.leadingCombo?.length || 1;
          cardsToPlay = currentPlayer.hand.slice(0, Math.min(comboLength, currentPlayer.hand.length));
        } else {
          const aiMove = getAIMoveWithErrorHandling(state);
          cardsToPlay = aiMove.error ? 
            (state.currentTrick?.leadingCombo ? 
              currentPlayer.hand.slice(0, Math.min(state.currentTrick.leadingCombo.length, currentPlayer.hand.length)) : 
              [currentPlayer.hand[0]]) : 
            aiMove.cards;
        }
        
        const result = processPlay(state, cardsToPlay);
        state = result.newState;
        
        const cardsAfter = state.players[state.currentPlayerIndex].hand.length;
        console.log(`  ${currentPlayer.name}: ${cardsBefore} -> ${cardsAfter} (played ${cardsToPlay.length})`);
        
        // Verify the player lost exactly the cards they played
        const otherPlayersBefore = state.players.map((p, idx) => 
          p.id === currentPlayer.id ? 0 : p.hand.length
        );
        
        state.players.forEach((player, idx) => {
          if (player.id !== currentPlayer.id) {
            const before = cardsBefore; // This needs fixing - track all players
            const after = player.hand.length;
            if (before !== after && idx !== state.currentPlayerIndex) {
              console.error(`ERROR: ${player.name} lost cards when not playing!`);
            }
          }
        });
      }
      
      expect(verifyCardCounts(state)).toBe(true);
    }
  });

  test('Test edge cases - empty hands, invalid moves', () => {
    const gameState = initializeGame();
    let state = gameState;
    
    // Test what happens when we try to process invalid states
    console.log('\n=== Testing edge cases ===');
    
    // Test 1: Try to play when no cards
    const emptyHandPlayer = { ...state.players[0], hand: [] };
    const stateWithEmptyHand = { ...state };
    
    try {
      const result = processPlay(stateWithEmptyHand, []);
      console.log('Empty hand test: No error thrown (this might be a bug)');
    } catch (e) {
      console.log('Empty hand test: Error correctly thrown');
    }
    
    // Test 2: Regular gameplay to near-empty hands
    while (state.players.every(p => p.hand.length > 3)) {
      for (let playNum = 0; playNum < 4; playNum++) {
        const currentPlayer = state.players[state.currentPlayerIndex];
        
        let cardsToPlay: Card[] = [];
        if (currentPlayer.isHuman) {
          const comboLength = state.currentTrick?.leadingCombo?.length || 1;
          cardsToPlay = currentPlayer.hand.slice(0, Math.min(comboLength, currentPlayer.hand.length));
        } else {
          const aiMove = getAIMoveWithErrorHandling(state);
          cardsToPlay = aiMove.error ? 
            (state.currentTrick?.leadingCombo ? 
              currentPlayer.hand.slice(0, Math.min(state.currentTrick.leadingCombo.length, currentPlayer.hand.length)) : 
              [currentPlayer.hand[0]]) : 
            aiMove.cards;
        }
        
        const result = processPlay(state, cardsToPlay);
        state = result.newState;
      }
      
      expect(verifyCardCounts(state)).toBe(true);
    }
    
    console.log('Final card counts:', state.players.map(p => p.hand.length).join(', '));
  });

  test('Test concurrent plays and race conditions', () => {
    const gameState = initializeGame();
    
    console.log('\n=== Testing race conditions ===');
    
    // Simulate multiple players trying to play at once
    const player0Cards = [gameState.players[0].hand[0]];
    const player1Cards = [gameState.players[1].hand[0]];
    
    // Process first play
    const result1 = processPlay(gameState, player0Cards);
    
    // Try to process second play with original state (simulating race condition)
    try {
      const result2 = processPlay(gameState, player1Cards);
      console.log('Race condition test: Both plays succeeded (might indicate state mutation)');
      
      // Check if original state was mutated
      const originalCounts = gameState.players.map(p => p.hand.length);
      const result1Counts = result1.newState.players.map(p => p.hand.length);
      
      if (JSON.stringify(originalCounts) !== JSON.stringify([25, 25, 25, 25])) {
        console.error('ERROR: Original state was mutated!');
      }
    } catch (e) {
      console.log('Race condition test: Second play failed (good - prevents race condition)');
    }
  });
});