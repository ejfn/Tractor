import { GameState, Rank, Card, Suit, PlayerId, PlayerName, GamePhase } from "../../src/types";
import { processPlay } from '../../src/game/gamePlayManager';
import { getAIMoveWithErrorHandling } from '../../src/game/gamePlayManager';
import { describe, test, expect } from '@jest/globals';
import { withIsolatedState } from '../helpers/testIsolation';
import { createCard } from '../helpers/cards';
import { createGameState, givePlayerCards } from '../helpers/gameStates';

describe('Human Wins and Leads Bug', () => {
  test('Human wins first trick and leads second', withIsolatedState(() => {
    // Create a deterministic game state where human is guaranteed to win first trick
    let gameState = createGameState({
      gamePhase: GamePhase.Playing,
      currentPlayerIndex: 0 // Human starts
    });

    // Give human high cards guaranteed to win
    gameState = givePlayerCards(gameState, 0, [
      createCard(Suit.Spades, Rank.Ace),
      createCard(Suit.Hearts, Rank.Ace),
      createCard(Suit.Spades, Rank.King),
      createCard(Suit.Hearts, Rank.King),
      ...Array.from({length: 21}, (_, i) => createCard(Suit.Clubs, Rank.Nine))
    ]);

    // Give AI players lower cards that cannot beat the human's aces
    gameState = givePlayerCards(gameState, 1, Array.from({length: 25}, (_, i) => createCard(Suit.Clubs, Rank.Seven)));
    gameState = givePlayerCards(gameState, 2, Array.from({length: 25}, (_, i) => createCard(Suit.Clubs, Rank.Eight)));
    gameState = givePlayerCards(gameState, 3, Array.from({length: 25}, (_, i) => createCard(Suit.Clubs, Rank.Six)));
    
    let state = gameState;
    
    // Play first trick - human leads with Ace of Spades (guaranteed to win with no trump)
    console.log('=== First Trick (Human leads and wins) ===');
    
    // Human plays Ace of Spades
    const humanAce = [state.players[0].hand[0]]; // Ace of Spades
    let result = processPlay(state, humanAce);
    state = result.newState;
    
    // AI players follow with their lower cards
    for (let play = 1; play < 4; play++) {
      const currentPlayer = state.players[state.currentPlayerIndex];
      const aiMove = getAIMoveWithErrorHandling(state);
      const cardsToPlay = aiMove.error ? [currentPlayer.hand[0]] : aiMove.cards;
      
      result = processPlay(state, cardsToPlay);
      state = result.newState;
    }
    
    // Verify human won the trick and all players have 24 cards
    expect(result.trickComplete).toBe(true);
    expect(result.trickWinnerId).toBe('human');
    expect(state.players.map(p => p.hand.length)).toEqual([24, 24, 24, 24]);
    
    // Verify human leads the second trick
    expect(state.currentPlayerIndex).toBe(0); // Human should be leading
    
    console.log('=== Second Trick (Human leads again) ===');
    
    // Human plays another card (Ace of Hearts)
    const humanSecondCard = [state.players[0].hand[0]]; // Ace of Hearts
    const cardCountsBefore = state.players.map(p => p.hand.length);
    
    result = processPlay(state, humanSecondCard);
    state = result.newState;
    
    const cardCountsAfter = state.players.map(p => p.hand.length);
    
    // Verify only the human lost a card
    expect(cardCountsBefore[0] - cardCountsAfter[0]).toBe(1); // Human lost 1 card
    expect(cardCountsBefore[1] - cardCountsAfter[1]).toBe(0); // Bot 1 lost 0 cards
    expect(cardCountsBefore[2] - cardCountsAfter[2]).toBe(0); // Bot 2 lost 0 cards  
    expect(cardCountsBefore[3] - cardCountsAfter[3]).toBe(0); // Bot 3 lost 0 cards
    
    console.log('Test completed successfully - no card count anomalies detected');
  }));
});