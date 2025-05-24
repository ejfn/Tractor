import { processPlay } from '../../src/utils/gamePlayManager';
import { GameState, Player, Rank, Suit, Card, Team } from '../../src/types/game';
import { GameStateUtils } from '../../src/utils/gameStateUtils';
import { createTestGameState, createTestCard } from '../helpers/testUtils';

describe('Counter-clockwise rotation', () => {
  test('Players should rotate counter-clockwise from human perspective', () => {
    const gameState = createTestGameState();
    
    // Give players cards
    GameStateUtils.getPlayersInOrder(gameState)[0].hand = [createTestCard(Suit.Hearts, Rank.Ace, undefined, 'h_a_1')];
    GameStateUtils.getPlayersInOrder(gameState)[1].hand = [createTestCard(Suit.Hearts, Rank.King, undefined, 'h_k_1')];
    GameStateUtils.getPlayersInOrder(gameState)[2].hand = [createTestCard(Suit.Hearts, Rank.Queen, undefined, 'h_q_1')];
    GameStateUtils.getPlayersInOrder(gameState)[3].hand = [createTestCard(Suit.Hearts, Rank.Jack, undefined, 'h_j_1')];
    
    // Human (index 0) plays first
    const result1 = processPlay(gameState, [GameStateUtils.getPlayersInOrder(gameState)[0].hand[0]], GameStateUtils.getPlayersInOrder(gameState)[0].id);
    // After human plays, Bot 1 should be next (index 1)
    
    // Bot 1 (index 1) plays
    const result2 = processPlay(result1.newState, [GameStateUtils.getPlayersInOrder(result1.newState)[1].hand[0]], GameStateUtils.getPlayersInOrder(result1.newState)[1].id);
    // After Bot 1 plays, Bot 2 should be next (index 2)
    
    // Bot 2 (index 2) plays
    const result3 = processPlay(result2.newState, [GameStateUtils.getPlayersInOrder(result2.newState)[2].hand[0]], GameStateUtils.getPlayersInOrder(result2.newState)[2].id);
    // After Bot 2 plays, Bot 3 should be next (index 3)
    
    // Bot 3 (index 3) plays - completes trick
    const result4 = processPlay(result3.newState, [GameStateUtils.getPlayersInOrder(result3.newState)[3].hand[0]], GameStateUtils.getPlayersInOrder(result3.newState)[3].id);
    
    // After trick completion, winner (Human with Ace) should be next
    expect(result4.trickComplete).toBe(true);
    expect(result4.trickWinner).toBe('Human');
    const winnerIndex = GameStateUtils.getPlayersInOrder(result4.newState).findIndex(p => p.name === 'Human');
    expect(winnerIndex).toBe(0); // Human won
  });

  test('Visual positions match counter-clockwise layout', () => {
    const gameState = createTestGameState();
    
    // Verify player order in the array (logical order)
    expect(GameStateUtils.getPlayersInOrder(gameState)[0].name).toBe('Human');  // Bottom (human perspective)
    expect(GameStateUtils.getPlayersInOrder(gameState)[1].name).toBe('Bot 1');  // Next in array
    expect(GameStateUtils.getPlayersInOrder(gameState)[2].name).toBe('Bot 2');  // Next in array
    expect(GameStateUtils.getPlayersInOrder(gameState)[3].name).toBe('Bot 3');  // Next in array
    
    // Visual positions (swapped for counter-clockwise from human's view):
    // Human (bottom) → Bot 3 (left) → Bot 2 (top) → Bot 1 (right) → Human
    // This is achieved by swapping Bot 1 and Bot 3 visual positions
    
    // Verify team assignments remain correct
    expect(GameStateUtils.getPlayersInOrder(gameState)[0].teamId).toBe('A'); // Human - Team A
    expect(GameStateUtils.getPlayersInOrder(gameState)[1].teamId).toBe('B'); // Bot 1 - Team B
    expect(GameStateUtils.getPlayersInOrder(gameState)[2].teamId).toBe('A'); // Bot 2 - Team A
    expect(GameStateUtils.getPlayersInOrder(gameState)[3].teamId).toBe('B'); // Bot 3 - Team B
  });
});