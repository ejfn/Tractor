import { GameState, Card, Rank, Suit, Player } from '../../src/types/game';
import { GameStateUtils } from '../../src/utils/gameStateUtils';
import { initializeGame, dealCards } from '../../src/utils/gameLogic';
import { processPlay } from '../../src/utils/gamePlayManager';
import { getAIMoveWithErrorHandling } from '../../src/utils/gamePlayManager';

describe('Double Play Detection Tests', () => {
  test('Track each player play-by-play', () => {
    // Create game state
    let state = initializeGame('Human', ['Team A', 'Team B'], Rank.Two);
    state = dealCards(state);
    state.gamePhase = 'playing';
    state.trumpInfo.trumpSuit = Suit.Spades;
    
    // Track double play attempts
    let totalPlays = 0;
    let incorrectCardCounts = 0;
    const doublePlayData: Record<string, { plays: number, cardsPlayed: number, startingCards: number }> = {};
    
    console.log(`Initial card counts: ${GameStateUtils.getAllPlayers(state).map(p => p.hand.length).join(', ')}`);
    
    // Initialize tracking for each player
    GameStateUtils.getAllPlayers(state).forEach(player => {
      doublePlayData[player.name] = {
        plays: 0,
        cardsPlayed: 0,
        startingCards: player.hand.length
      };
    });
    
    // Play 3 complete tricks with detailed logging
    for (let trickNum = 0; trickNum < 3; trickNum++) {
      console.log(`\n=== TRICK ${trickNum + 1} ===`);
      console.log(`Starting card counts: ${GameStateUtils.getAllPlayers(state).map(p => p.hand.length).join(', ')}`);
      
      // Use simple sequential play like other working tests
      for (let playNum = 0; playNum < 4; playNum++) {
        const currentPlayerIdx = playNum;
        const currentPlayer = GameStateUtils.getPlayersInOrder(state)[currentPlayerIdx];
        const allCardsBefore = GameStateUtils.getAllPlayers(state).map(p => p.hand.length);
        
        console.log(`\nPlay ${playNum + 1}: Player ${currentPlayerIdx} (${currentPlayer.name})`);
        console.log(`Cards before: ${allCardsBefore.join(', ')}`);
        
        // Always play single cards to keep it simple
        const cardsToPlay = [currentPlayer.hand[0]];
        
        console.log(`Playing ${cardsToPlay.length} card(s)`);
        
        // Track what the current player is doing
        doublePlayData[currentPlayer.name].plays++;
        doublePlayData[currentPlayer.name].cardsPlayed += cardsToPlay.length;
        
        // Process the play
        const result = processPlay(state, cardsToPlay, currentPlayer.id);
        const allCardsAfter = GameStateUtils.getAllPlayers(result.newState).map(p => p.hand.length);
        
        console.log(`Cards after: ${allCardsAfter.join(', ')}`);
        console.log(`Processing play for player ${currentPlayerIdx} (${currentPlayer.name})`);
        
        // Track overall plays and verify counts
        totalPlays++;
        
        // Check if only the current player lost cards
        for (let i = 0; i < 4; i++) {
          const expected = i === currentPlayerIdx ? allCardsBefore[i] - cardsToPlay.length : allCardsBefore[i];
          if (allCardsAfter[i] !== expected) {
            console.error(`ERROR: Player ${i} has ${allCardsAfter[i]} cards, expected ${expected}`);
            incorrectCardCounts++;
          }
        }
        
        state = result.newState;
        
        if (result.trickComplete) {
          console.log(`Trick completed by ${result.trickWinner}!`);
        }
      }
      
      // Clear trick for next round
      state.currentTrick = null;
      
      // After each trick, verify equal card counts
      const endCounts = GameStateUtils.getAllPlayers(state).map(p => p.hand.length);
      const uniqueCounts = new Set(endCounts);
      
      if (uniqueCounts.size > 1) {
        console.error(`ERROR: Unequal card counts after trick ${trickNum + 1}`);
        console.error(`Counts: ${endCounts.join(', ')}`);
        incorrectCardCounts++;
      }
      
      console.log(`Ending card counts: ${endCounts.join(', ')}`);
    }
    
    // Final verification  
    console.log('\n=== FINAL VERIFICATION ===');
    console.log(`Total plays tracked: ${totalPlays}`);
    console.log(`Incorrect card counts detected: ${incorrectCardCounts}`);
    
    // Verify each player played exactly 3 times (one per trick)
    GameStateUtils.getAllPlayers(state).forEach(player => {
      const playerData = doublePlayData[player.name];
      console.log(`${player.name}: ${playerData.plays} plays, ${playerData.cardsPlayed} cards played`);
      expect(playerData.plays).toBe(3); // Should have played in each of 3 tricks
    });
    
    // Verify no double play detected
    expect(incorrectCardCounts).toBe(0);
    expect(totalPlays).toBe(12); // 3 tricks × 4 players
  });
  
  test('Manually track plays in current trick', () => {
    let state = initializeGame('Human', ['Team A', 'Team B'], Rank.Two);
    state = dealCards(state);
    state.gamePhase = 'playing';
    state.trumpInfo.trumpSuit = Suit.Spades;
    
    // Manually track plays in the trick
    let playsInCurrentTrick = 0;
    const currentTrickPlayers: string[] = [];
    
    for (let i = 0; i < 8; i++) { // Play 2 tricks worth
      // Use sequential logic for testing
      const currentPlayerIdx = i % 4;
      const currentPlayer = GameStateUtils.getPlayersInOrder(state)[currentPlayerIdx];
      currentTrickPlayers.push(currentPlayer.name);
      
      // Track cards before
      const beforeCounts = GameStateUtils.getAllPlayers(state).map(p => p.hand.length);
      
      // Simple single card play
      const cardsToPlay = [currentPlayer.hand[0]];
      
      const result = processPlay(state, cardsToPlay, currentPlayer.id);
      state = result.newState;
      
      playsInCurrentTrick++;
      
      // Check if trick completed
      if (result.trickComplete) {
        console.log(`Trick completed after ${playsInCurrentTrick} plays by ${currentTrickPlayers.join(', ')}`);
        expect(playsInCurrentTrick).toBe(4);
        
        // Reset for next trick
        playsInCurrentTrick = 0;
        currentTrickPlayers.length = 0;
        state.currentTrick = null;
      }
      
      // Verify only current player lost cards
      const afterCounts = GameStateUtils.getAllPlayers(state).map(p => p.hand.length);
      for (let j = 0; j < 4; j++) {
        const expected = j === currentPlayerIdx ? beforeCounts[j] - 1 : beforeCounts[j];
        expect(afterCounts[j]).toBe(expected);
      }
    }
  });
});
