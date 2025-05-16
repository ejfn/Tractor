import { GameState, Card, Player, Rank, Suit } from '../src/types/game';
import { initializeGame, dealCards } from '../src/utils/gameLogic';
import { processPlay } from '../src/utils/gamePlayManager';
import { getAIMoveWithErrorHandling } from '../src/utils/gamePlayManager';

describe('Card Count Equality', () => {
  let gameState: GameState;
  
  beforeEach(() => {
    // Initialize a 4-player game
    gameState = initializeGame('Human', ['Team A', 'Team B'], Rank.Two);
    
    // Deal cards
    gameState = dealCards(gameState);
    
    // Start playing phase
    gameState.gamePhase = 'playing';
    
    // Make sure we have trump defined
    gameState.trumpInfo.trumpSuit = Suit.Spades;
  });
  
  function playFullTrick(state: GameState): GameState {
    let currentState = state;
    
    // Play all 4 players
    for (let i = 0; i < 4; i++) {
      const currentPlayer = currentState.players[currentState.currentPlayerIndex];
      
      let cardsToPlay: Card[] = [];
      
      if (currentPlayer.isHuman) {
        // For human, just play first valid card(s)
        if (currentState.currentTrick?.leadingCombo.length) {
          // Following suit - play same number of cards
          cardsToPlay = currentPlayer.hand.slice(0, currentState.currentTrick.leadingCombo.length);
        } else {
          // Leading - play single card
          cardsToPlay = [currentPlayer.hand[0]];
        }
      } else {
        // AI player
        const aiMove = getAIMoveWithErrorHandling(currentState);
        if (aiMove.error) {
          // Fallback
          cardsToPlay = [currentPlayer.hand[0]];
        } else {
          cardsToPlay = aiMove.cards;
        }
      }
      
      const result = processPlay(currentState, cardsToPlay);
      currentState = result.newState;
    }
    
    return currentState;
  }
  
  it('maintains equal card counts after multiple tricks', () => {
    // Play 5 tricks
    let state = gameState;
    
    for (let trickNum = 1; trickNum <= 5; trickNum++) {
      const initialCounts = state.players.map(p => p.hand.length);
      
      // All players should start with equal counts
      const allEqual = initialCounts.every(count => count === initialCounts[0]);
      expect(allEqual).toBe(true);
      
      state = playFullTrick(state);
      
      const afterCounts = state.players.map(p => p.hand.length);
      
      // All players should still have equal counts
      const stillEqual = afterCounts.every(count => count === afterCounts[0]);
      expect(stillEqual).toBe(true);
      
      // Each player should have lost the same number of cards as the leader played
      const cardsLost = initialCounts[0] - afterCounts[0];
      expect(cardsLost).toBeGreaterThan(0);
      expect(cardsLost).toBeLessThanOrEqual(4); // Max combo size
      
      console.log(`Trick ${trickNum}: Each player lost ${cardsLost} cards. Counts: ${afterCounts.join(', ')}`);
    }
  });
  
  it('handles human winning and leading next trick', () => {
    // Arrange the first trick so human wins
    // Give human highest card (BJ)
    const bigJoker: Card = {
      id: 'joker_big_0',
      points: 0,
      joker: 'Big' as any
    };
    
    // Replace human's first card with big joker
    gameState.players[0].hand[0] = bigJoker;
    
    // Play first trick where human wins
    let state = gameState;
    let trickResult = processPlay(state, [bigJoker]);
    state = trickResult.newState;
    
    // Bot plays  
    for (let i = 1; i < 4; i++) {
      const bot = state.players[state.currentPlayerIndex];
      const aiMove = getAIMoveWithErrorHandling(state);
      const cardsToPlay = aiMove.error ? [bot.hand[0]] : aiMove.cards;
      trickResult = processPlay(state, cardsToPlay);
      state = trickResult.newState;
    }
    
    // Human should have won
    expect(trickResult.trickComplete).toBe(true);
    expect(trickResult.trickWinner).toBe('Human');
    expect(state.currentPlayerIndex).toBe(0); // Human should be next
    
    const countsAfterTrick1 = state.players.map(p => p.hand.length);
    expect(countsAfterTrick1).toEqual([24, 24, 24, 24]);
    
    // Clear current trick (simulating UI flow)
    state.currentTrick = null;
    
    // Now human leads second trick
    const human = state.players[0];
    // Try to play a pair if possible
    let humanCards: Card[] = [];
    for (let i = 0; i < human.hand.length - 1; i++) {
      if (human.hand[i].rank === human.hand[i+1].rank && 
          human.hand[i].suit === human.hand[i+1].suit) {
        humanCards = [human.hand[i], human.hand[i+1]];
        break;
      }
    }
    
    if (humanCards.length === 0) {
      humanCards = [human.hand[0]];
    }
    
    const cardsToPlayCount = humanCards.length;
    
    // Play second trick
    state = playFullTrick(state);
    
    const finalCounts = state.players.map(p => p.hand.length);
    const expectedCount = 24 - cardsToPlayCount;
    
    // All players should have equal counts
    expect(finalCounts.every(count => count === expectedCount)).toBe(true);
    expect(finalCounts).toEqual([expectedCount, expectedCount, expectedCount, expectedCount]);
  });
  
  it('maintains counts when different combo types are played', () => {
    let state = gameState;
    
    // Test single card play
    const singleResult = processPlay(state, [state.players[0].hand[0]]);
    state = singleResult.newState;
    
    // Continue trick
    for (let i = 1; i < 4; i++) {
      const player = state.players[state.currentPlayerIndex];
      const result = processPlay(state, [player.hand[0]]);
      state = result.newState;
    }
    
    expect(state.players.map(p => p.hand.length)).toEqual([24, 24, 24, 24]);
    
    // Clear for next trick
    state.currentTrick = null;
    
    // Test pair play (if available)
    const human = state.players[0];
    let pairCards: Card[] = [];
    for (let i = 0; i < human.hand.length - 1; i++) {
      if (human.hand[i].rank === human.hand[i+1].rank && 
          human.hand[i].suit === human.hand[i+1].suit) {
        pairCards = [human.hand[i], human.hand[i+1]];
        break;
      }
    }
    
    if (pairCards.length === 2) {
      // Human plays pair
      const pairResult = processPlay(state, pairCards);
      state = pairResult.newState;
      
      // Others follow with 2 cards each
      for (let i = 1; i < 4; i++) {
        const player = state.players[state.currentPlayerIndex];
        const aiMove = getAIMoveWithErrorHandling(state);
        const cards = aiMove.error ? player.hand.slice(0, 2) : aiMove.cards;
        const result = processPlay(state, cards);
        state = result.newState;
      }
      
      expect(state.players.map(p => p.hand.length)).toEqual([22, 22, 22, 22]);
    }
  });
});