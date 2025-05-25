import { GameState, Rank, Suit } from "../../src/types";
import { initializeGame } from '../../src/game/gameLogic';
import { prepareNextRound, endRound } from '../../src/game/gameRoundManager';
import { declareTrumpSuit } from '../../src/game/trumpManager';

describe('Next round starting player selection', () => {
  // Test utilities
  const createTestGameState = (): GameState => {
    return initializeGame();
  };

  const completeRound = (state: GameState, attackingTeamWins: boolean): GameState => {
    // Create a copy of the state
    const stateCopy = { ...state };
    
    // Modify points to determine winner
    const attackingTeam = stateCopy.teams.find(t => !t.isDefending);
    if (attackingTeam) {
      // If attacking team should win, give them 80+ points
      // Otherwise, give them less than 80 points
      attackingTeam.points = attackingTeamWins ? 100 : 70;
    }
    
    // End the round
    const result = endRound(stateCopy);
    return result.newState;
  };

  test('First round: trump declarer goes first', () => {
    // Create a new game state
    const state = createTestGameState();
    
    // Human player (index 0) declares trump
    const humanIndex = 0;
    state.currentPlayerIndex = humanIndex;
    const humanPlayer = state.players[humanIndex];
    
    // Declare trump
    const declaredState = declareTrumpSuit(state, Suit.Hearts);
    
    // Verify declarer is set
    expect(declaredState.trumpInfo.declarerPlayerId).toBe(humanPlayer.id);
    
    // Complete round with defending team winning
    const endedState = completeRound(declaredState, false);
    
    // Since this is the first test, we need a special setup
    // For only this test, we'll set the roundNumber back to 0 so when
    // prepareNextRound increments it, it becomes 1 (first round)
    endedState.roundNumber = 0;
    
    // Prepare next round (will be round 1)
    const nextRoundState = prepareNextRound(endedState);
    
    // Verify the round number is 1
    expect(nextRoundState.roundNumber).toBe(1);
    
    // Find the index of the trump declarer in the player array
    const declarerIndex = nextRoundState.players.findIndex(
      p => p.id === declaredState.trumpInfo.declarerPlayerId
    );
    
    // Verify trump declarer is the first player in the next round
    expect(nextRoundState.currentPlayerIndex).toBe(declarerIndex);
  });

  test('Following rounds: defending team defends - other defending player goes first', () => {
    // Create a new game state (round 1)
    const state = createTestGameState();
    state.roundNumber = 1;
    
    // Set up defending team (Team A with Human and Bot2)
    state.players[0].team = 'A'; // Human
    state.players[1].team = 'B'; // Bot1
    state.players[2].team = 'A'; // Bot2
    state.players[3].team = 'B'; // Bot3
    
    // Human (player 0) started the last round
    state.currentPlayerIndex = 0;
    state.lastRoundStartingPlayerIndex = 0;
    
    // Set Team A as defending
    state.teams[0].id = 'A';
    state.teams[0].isDefending = true;
    state.teams[1].id = 'B';
    state.teams[1].isDefending = false;
    
    // Complete the round with defending team winning
    const endedState = completeRound(state, false);
    
    // Prepare next round
    const nextRoundState = prepareNextRound(endedState);
    
    // Expect the other player from Team A (Bot2, index 2) to go first
    expect(nextRoundState.currentPlayerIndex).toBe(2);
  });

  test('Following rounds: attacking team wins - teammate of attacker goes first', () => {
    // Create a new game state (round 1)
    const state = createTestGameState();
    state.roundNumber = 1;
    
    // Set up teams
    state.players[0].team = 'A'; // Human
    state.players[1].team = 'B'; // Bot1
    state.players[2].team = 'A'; // Bot2
    state.players[3].team = 'B'; // Bot3
    
    // Bot1 (player 1) started the last round
    state.currentPlayerIndex = 1;
    state.lastRoundStartingPlayerIndex = 1;
    
    // Set Team B as attacking
    state.teams[0].id = 'A';
    state.teams[0].isDefending = true;
    state.teams[1].id = 'B';
    state.teams[1].isDefending = false;
    
    // Complete the round with attacking team winning
    const endedState = completeRound(state, true);
    
    // Prepare next round
    const nextRoundState = prepareNextRound(endedState);
    
    // Expect the other player from Team B (Bot3, index 3) to go first
    expect(nextRoundState.currentPlayerIndex).toBe(3);
  });

  test('Alternates between teammates across multiple rounds (defending team)', () => {
    // Create a new game state (round 2)
    const state = createTestGameState();
    state.roundNumber = 2;
    
    // Set up teams
    state.players[0].team = 'A'; // Human
    state.players[1].team = 'B'; // Bot1
    state.players[2].team = 'A'; // Bot2
    state.players[3].team = 'B'; // Bot3
    
    // Bot2 (player 2) started the last round
    state.currentPlayerIndex = 2;
    state.lastRoundStartingPlayerIndex = 2;
    
    // Set Team A as defending
    state.teams[0].id = 'A';
    state.teams[0].isDefending = true;
    state.teams[1].id = 'B';
    state.teams[1].isDefending = false;
    
    // Simulate trump declaration to save the starting player index
    const declaredState2 = declareTrumpSuit(state, Suit.Hearts);
    
    // Complete round 2 with defending team winning
    const endedRound2 = completeRound(declaredState2, false);
    
    // Prepare round 3
    const round3State = prepareNextRound(endedRound2);
    
    // Expect Human (index 0) to go first in round 3
    expect(round3State.currentPlayerIndex).toBe(0);
    
    // Simulate trump declaration for round 3 to save the starting player index
    const declaredState3 = declareTrumpSuit(round3State, Suit.Clubs);
    
    // Complete round 3 with defending team winning again
    const endedRound3 = completeRound(declaredState3, false);
    
    // Prepare round 4
    const round4State = prepareNextRound(endedRound3);
    
    // Expect Bot2 (index 2) to go first again in round 4
    expect(round4State.currentPlayerIndex).toBe(2);
  });
});