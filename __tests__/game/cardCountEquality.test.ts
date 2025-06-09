import { GameState, Card, Player, Rank, Suit, GamePhase } from "../../src/types";
import { initializeGame, dealCards } from '../../src/game/gameLogic';
import { processPlay } from '../../src/game/gamePlayManager';
import { getAIMoveWithErrorHandling } from '../../src/game/gamePlayManager';

describe('Card Count Equality', () => {
  let gameState: GameState;
  
  beforeEach(() => {
    // Don't create shared state - let each test create its own
    // Initialize properly in each test
  });
  
  function playFullTrick(state: GameState): GameState {
    let currentState = state;
    
    // Play all 4 players
    for (let i = 0; i < 4; i++) {
      const currentPlayer = currentState.players[currentState.currentPlayerIndex];
      
      let cardsToPlay: Card[] = [];
      
      if (currentPlayer.isHuman) {
        // For human, just play first valid card(s)
        if (currentState.currentTrick?.plays[0]?.cards.length) {
          // Following suit - play same number of cards
          cardsToPlay = currentPlayer.hand.slice(0, currentState.currentTrick.plays[0].cards.length);
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
    // Create fresh game state
    let state = initializeGame();
    state = dealCards(state);
    state.gamePhase = GamePhase.Playing;
    state.trumpInfo.trumpSuit = Suit.Spades;
    
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
    // Create fresh game state
    let state = initializeGame();
    state = dealCards(state);
    state.gamePhase = GamePhase.Playing;
    state.trumpInfo.trumpSuit = Suit.Spades;
    
    // Arrange the first trick so human wins
    // Give human highest card (BJ)
    const bigJoker: Card = {
      id: 'joker_big_0',
      points: 0,
      joker: 'Big' as any
    };
    
    // Replace human's first card with big joker
    state.players[0].hand[0] = bigJoker;
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
    expect(trickResult.trickWinnerId).toBe('human');
    expect(state.currentPlayerIndex).toBe(0); // Human should be next
    
    const countsAfterTrick1 = state.players.map(p => p.hand.length);
    expect(countsAfterTrick1).toEqual([24, 24, 24, 24]);
    
    // Clear current trick (simulating UI flow)
    state.currentTrick = null;
    
    // Now human leads second trick with a single card
    const human = state.players[0];
    const humanCards = [human.hand[0]];
    
    // Play second trick with single cards only
    trickResult = processPlay(state, humanCards);
    state = trickResult.newState;
    
    // All other players play singles too
    for (let i = 1; i < 4; i++) {
      const bot = state.players[state.currentPlayerIndex];
      const botCards = [bot.hand[0]];
      trickResult = processPlay(state, botCards);
      state = trickResult.newState;
    }
    
    const finalCounts = state.players.map(p => p.hand.length);
    const expectedCount = 23; // All players should have 23 cards
    
    // All players should have equal counts
    expect(finalCounts.every(count => count === expectedCount)).toBe(true);
    expect(finalCounts).toEqual([expectedCount, expectedCount, expectedCount, expectedCount]);
  });
  
  it('maintains counts when different combo types are played', () => {
    // Start fresh with a new game to ensure no state interference
    let state = initializeGame();
    state = dealCards(state);
    state.gamePhase = GamePhase.Playing;
    state.trumpInfo.trumpSuit = Suit.Spades;
    
    // Verify initial state has correct counts
    const initialCounts = state.players.map(p => p.hand.length);
    expect(initialCounts).toEqual([25, 25, 25, 25]);
    
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
    
    // After the first trick completes, the winner becomes the current player.
    // For this test, we want the human to lead the next trick with a pair.
    // Reset to human player (index 0) if needed.
    if (state.currentPlayerIndex !== 0) {
      state.currentPlayerIndex = 0;
    }
    
    // Find or create a pair for the human player
    const human = state.players[0];
    let pairCards: Card[] = [];
    
    // Look for existing pairs
    for (let i = 0; i < human.hand.length - 1; i++) {
      if (human.hand[i].rank === human.hand[i+1].rank && 
          human.hand[i].suit === human.hand[i+1].suit) {
        pairCards = [human.hand[i], human.hand[i+1]];
        break;
      }
    }
    
    // If no pairs found, create one
    if (pairCards.length === 0) {
      const firstCard = human.hand[0];
      const identicalCard: Card = {
        ...firstCard,
        id: firstCard.id + '_copy'
      };
      human.hand[1] = identicalCard;
      pairCards = [human.hand[0], human.hand[1]];
    }
    
    // Human plays pair
    const pairResult = processPlay(state, pairCards);
    state = pairResult.newState;
    
    // Others follow with 2 cards each - all non-leading players should play
    let playersPlayed = 1; // Human already played
    
    while (playersPlayed < 4) {
      const playerIdx = state.currentPlayerIndex;
      const player = state.players[playerIdx];
      
      const initialCount = player.hand.length;
      const aiMove = getAIMoveWithErrorHandling(state);
      let cards = aiMove.error ? player.hand.slice(0, 2) : aiMove.cards;
      
      // Ensure we always play 2 cards when following a pair
      if (cards.length !== 2) {
        cards = player.hand.slice(0, 2);
      }
      
      // Check all players before this play
      const beforeCounts = state.players.map(p => p.hand.length);
      
      const result = processPlay(state, cards);
      // Process play doesn't return error property
      state = result.newState;
      
      // If trick is complete, we should stop the loop!
      if (result.trickComplete) {
        break;
      }
      
      
      playersPlayed++;
    }
    
    const finalCounts = state.players.map(p => p.hand.length);
    expect(finalCounts).toEqual([22, 22, 22, 22]);
  });
});