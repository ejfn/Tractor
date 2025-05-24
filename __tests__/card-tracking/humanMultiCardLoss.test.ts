import { GameState, Card, Rank, Player } from '../../src/types/game';
import { initializeGame } from '../../src/utils/gameLogic';
import { processPlay } from '../../src/utils/gamePlayManager';
import { getAIMoveWithErrorHandling } from '../../src/utils/gamePlayManager';
import { GameStateUtils } from '../../src/utils/gameStateUtils';

describe('Human Multi-Card Loss Bug', () => {
  test('Reproduce human losing multiple cards', () => {
    const gameState = initializeGame('Human', ['Team A', 'Team B'], Rank.Two);
    let state = gameState;
    
    console.log('=== Initial state ===');
    console.log(`All players have: ${GameStateUtils.getAllPlayers(state).map(p => p.hand.length).join(', ')} cards`);
    
    // Play first trick - Human wins
    console.log('\n=== TRICK 1 ===');
    for (let play = 0; play < 4; play++) {
      const currentPlayerIndex = (gameState.currentTrick ? 
        GameStateUtils.getPlayersInOrder(state).findIndex(p => p.id === gameState.currentTrick!.leadingPlayerId) + gameState.currentTrick.plays.length + 1 
        : 0) % 4;
      const currentPlayer = GameStateUtils.getPlayersInOrder(state)[currentPlayerIndex];
      const cardsBefore = GameStateUtils.getAllPlayers(state).map(p => p.hand.length);
      
      let cardsToPlay = [currentPlayer.hand[0]];
      const result = processPlay(state, cardsToPlay, currentPlayer.id);
      
      const cardsAfter = GameStateUtils.getAllPlayers(result.newState).map(p => p.hand.length);
      console.log(`${currentPlayer.name}: ${cardsBefore[currentPlayerIndex]} -> ${cardsAfter[currentPlayerIndex]}`);
      
      state = result.newState;
      
      if (result.trickComplete) {
        console.log(`Winner: ${result.trickWinner}`);
      }
    }
    
    console.log(`After trick 1: ${GameStateUtils.getAllPlayers(state).map(p => p.hand.length).join(', ')}`);
    
    // Play second trick - focus on human's turn
    console.log('\n=== TRICK 2 ===');
    
    // First play (should be the previous winner)
    const currentPlayerIndex = (gameState.currentTrick ? 
      GameStateUtils.getPlayersInOrder(state).findIndex(p => p.id === gameState.currentTrick!.leadingPlayerId) + gameState.currentTrick.plays.length + 1 
      : 0) % 4;
    const firstPlayer = GameStateUtils.getPlayersInOrder(state)[currentPlayerIndex];
    console.log(`\nFirst player: ${firstPlayer.name} (index ${currentPlayerIndex})`);
    console.log(`Cards before ALL players: ${GameStateUtils.getAllPlayers(state).map(p => p.hand.length).join(', ')}`);
    
    // Get the specific cards the human will play
    let humanCardsToPlay = [];
    if (firstPlayer.isHuman) {
      console.log(`Human hand size: ${firstPlayer.hand.length}`);
      console.log(`Human hand sample: ${firstPlayer.hand.slice(0, 5).map(c => `${c.rank}${c.suit || 'JOKER'}`).join(', ')}`);
      
      // Check if human might play multiple cards (pair, tractor, etc)
      const pairs = [];
      for (let i = 0; i < firstPlayer.hand.length - 1; i++) {
        if (firstPlayer.hand[i].rank === firstPlayer.hand[i + 1].rank &&
            firstPlayer.hand[i].suit === firstPlayer.hand[i + 1].suit) {
          pairs.push([firstPlayer.hand[i], firstPlayer.hand[i + 1]]);
        }
      }
      
      if (pairs.length > 0) {
        console.log(`Human has ${pairs.length} pairs`);
        humanCardsToPlay = pairs[0]; // Play first pair
      } else {
        humanCardsToPlay = [firstPlayer.hand[0]];
      }
    } else {
      const aiMove = getAIMoveWithErrorHandling(state, firstPlayer.id);
      humanCardsToPlay = aiMove.error ? [firstPlayer.hand[0]] : aiMove.cards;
    }
    
    console.log(`Playing ${humanCardsToPlay.length} cards`);
    
    // Process the play with detailed tracking
    const beforeState = JSON.parse(JSON.stringify(state)); // Deep copy for comparison
    const result = processPlay(state, humanCardsToPlay, firstPlayer.id);
    
    console.log('\nAfter processing play:');
    const cardsAfter = GameStateUtils.getAllPlayers(result.newState).map(p => p.hand.length);
    console.log(`Cards after ALL players: ${cardsAfter.join(', ')}`);
    
    // Check each player's card change
    for (let i = 0; i < 4; i++) {
      const before = GameStateUtils.getPlayersInOrder(beforeState)[i].hand.length;
      const after = GameStateUtils.getPlayersInOrder(result.newState)[i].hand.length;
      const diff = before - after;
      
      if (diff !== 0) {
        console.log(`Player ${i} (${GameStateUtils.getPlayersInOrder(state)[i].name}): lost ${diff} cards`);
        
        if (i === currentPlayerIndex && diff !== humanCardsToPlay.length) {
          console.error(`ERROR: Player ${i} should have lost ${humanCardsToPlay.length} cards but lost ${diff}`);
        } else if (i !== currentPlayerIndex && diff > 0) {
          console.error(`ERROR: Player ${i} wasn't playing but lost ${diff} cards`);
        }
      }
    }
    
    // Check if this reproduces the bug
    const humanIndex = 0;
    const humanBefore = GameStateUtils.getPlayersInOrder(beforeState)[humanIndex].hand.length;
    const humanAfter = GameStateUtils.getPlayersInOrder(result.newState)[humanIndex].hand.length;
    const humanLost = humanBefore - humanAfter;
    
    if (humanLost > humanCardsToPlay.length) {
      console.error(`\nBUG REPRODUCED: Human played ${humanCardsToPlay.length} cards but lost ${humanLost} cards`);
      
      // Analyze what happened
      console.log('\nDebugging info:');
      console.log(`Current player index: ${currentPlayerIndex}`);
      console.log(`Human player index: ${humanIndex}`);
      console.log(`Cards played IDs: ${humanCardsToPlay.map(c => c.id).join(', ')}`);
      
      // Check the hand differences
      const beforeIds = beforeState.players[humanIndex].hand.map((c: Card) => c.id);
      const afterIds = result.newState.players[humanIndex].hand.map((c: Card) => c.id);
      const lostIds = beforeIds.filter((id: string) => !afterIds.includes(id));
      
      console.log(`Lost card IDs: ${lostIds.join(', ')}`);
      console.log(`Expected to lose: ${humanCardsToPlay.map((c: Card) => c.id).join(', ')}`);
      
      const unexpectedLoss = lostIds.filter((id: string) => !humanCardsToPlay.some((c: Card) => c.id === id));
      if (unexpectedLoss.length > 0) {
        console.error(`UNEXPECTED CARDS LOST: ${unexpectedLoss.join(', ')}`);
      }
    }
    
    // Continue playing to see if pattern continues
    state = result.newState;
    
    // Play rest of trick 2
    for (let play = 1; play < 4; play++) {
      const currentPlayerIndex = (gameState.currentTrick ? 
        GameStateUtils.getPlayersInOrder(state).findIndex(p => p.id === gameState.currentTrick!.leadingPlayerId) + gameState.currentTrick.plays.length + 1 
        : 0) % 4;
      const currentPlayer = GameStateUtils.getPlayersInOrder(state)[currentPlayerIndex];
      const cardsBefore = GameStateUtils.getAllPlayers(state).map(p => p.hand.length);
      
      let cardsToPlay = [];
      if (currentPlayer.isHuman) {
        cardsToPlay = [currentPlayer.hand[0]];
      } else {
        const aiMove = getAIMoveWithErrorHandling(state, currentPlayer.id);
        cardsToPlay = aiMove.error ? [currentPlayer.hand[0]] : aiMove.cards;
      }
      
      const result = processPlay(state, cardsToPlay, currentPlayer.id);
      const cardsAfter = GameStateUtils.getAllPlayers(result.newState).map(p => p.hand.length);
      
      console.log(`${currentPlayer.name}: ${cardsBefore[currentPlayerIndex]} -> ${cardsAfter[currentPlayerIndex]}`);
      
      // Check for anomalies
      for (let i = 0; i < 4; i++) {
        const diff = cardsBefore[i] - cardsAfter[i];
        if (diff > 0 && i !== currentPlayerIndex) {
          console.error(`ERROR: Player ${i} (${GameStateUtils.getPlayersInOrder(state)[i].name}) lost ${diff} cards but wasn't playing`);
        }
      }
      
      state = result.newState;
    }
    
    console.log(`\nAfter trick 2: ${GameStateUtils.getAllPlayers(state).map(p => p.hand.length).join(', ')}`);
    
    // Final verification
    const finalCounts = GameStateUtils.getAllPlayers(state).map(p => p.hand.length);
    const expectedCount = 25 - 2; // Started with 25, played 2 tricks
    
    finalCounts.forEach((count, idx) => {
      if (count !== expectedCount) {
        console.error(`ERROR: Player ${idx} (${GameStateUtils.getPlayersInOrder(state)[idx].name}) has ${count} cards, expected ${expectedCount}`);
      }
    });
  });
});
