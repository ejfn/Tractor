import { GameState, Team, Rank, Suit } from '../types/game';
import { initializeGame } from './gameLogic';

/**
 * Prepares the game state for the next round
 * @param state Current game state
 * @param playerName Human player name
 * @param teamNames Array with team names [Team A name, Team B name]
 * @returns Updated game state ready for the next round
 */
export function prepareNextRound(
  state: GameState, 
  playerName: string, 
  teamNames: [string, string]
): GameState {
  const newState = { ...state };
  
  newState.roundNumber++;
  newState.gamePhase = 'dealing';
  
  // Set trump rank to defending team's rank
  const newDefendingTeam = newState.teams.find(t => t.isDefending);
  if (newDefendingTeam) {
    newState.trumpInfo.trumpRank = newDefendingTeam.currentRank;
    newState.trumpInfo.trumpSuit = undefined;
    newState.trumpInfo.declared = false;
  }
  
  // Create and shuffle a new deck
  const deck = initializeGame(
    playerName,
    teamNames,
    newState.trumpInfo.trumpRank
  ).deck;
  
  newState.deck = deck;
  
  // Deal cards
  let cardIndex = 0;
  const cardsPerPlayer = Math.floor((deck.length - 8) / newState.players.length);
  
  newState.players.forEach(player => {
    player.hand = deck.slice(cardIndex, cardIndex + cardsPerPlayer);
    cardIndex += cardsPerPlayer;
  });
  
  // Set kitty cards
  newState.kittyCards = deck.slice(deck.length - 8);
  
  // Reset trick history
  newState.tricks = [];
  newState.currentTrick = null;
  
  // First player is from defending team
  const defendingPlayers = newState.players.filter(
    p => p.team === newDefendingTeam?.id
  );
  newState.currentPlayerIndex = newState.players.indexOf(defendingPlayers[0]);
  
  // Set phase to declaring again
  newState.gamePhase = 'declaring';
  
  return newState;
}

/**
 * Processes the end of a round and determines outcomes
 * @param state Current game state
 * @returns Object containing updated state, game over flag, winner, and result message
 */
export function endRound(state: GameState): {
  newState: GameState;
  gameOver: boolean;
  winner: 'A' | 'B' | null;
  roundCompleteMessage: string;
} {
  const newState = { ...state };
  let gameOver = false;
  let winner: 'A' | 'B' | null = null;
  let roundCompleteMessage = '';

  // Calculate scores and determine if a team levels up
  const defendingTeam = newState.teams.find(t => t.isDefending);
  const attackingTeam = newState.teams.find(t => !t.isDefending);
  
  if (defendingTeam && attackingTeam) {
    // Attacking team needs 80+ points to win
    if (attackingTeam.points >= 80) {
      // Attacking team levels up
      const rankOrder = Object.values(Rank);
      const currentRankIndex = rankOrder.indexOf(attackingTeam.currentRank);
      
      if (currentRankIndex < rankOrder.length - 1) {
        attackingTeam.currentRank = rankOrder[currentRankIndex + 1];
        
        // Switch defending/attacking roles
        defendingTeam.isDefending = false;
        attackingTeam.isDefending = true;
        
        // Create round result message
        roundCompleteMessage = `Team ${attackingTeam.id} reached ${attackingTeam.points} points and advances to rank ${attackingTeam.currentRank}!`;
      } else {
        // Game over - attacking team reached Ace and won
        gameOver = true;
        winner = attackingTeam.id;
      }
    } else {
      // Defending team successfully defended
      const rankOrder = Object.values(Rank);
      const currentRankIndex = rankOrder.indexOf(defendingTeam.currentRank);
      
      if (currentRankIndex < rankOrder.length - 1) {
        defendingTeam.currentRank = rankOrder[currentRankIndex + 1];
        
        // Create round result message
        roundCompleteMessage = `Team ${defendingTeam.id} successfully defended with ${attackingTeam.points}/80 points for attackers! They advance to rank ${defendingTeam.currentRank}.`;
      } else {
        // Game over - defending team reached Ace and won
        gameOver = true;
        winner = defendingTeam.id;
      }
    }
    
    // Reset points for next round
    defendingTeam.points = 0;
    attackingTeam.points = 0;
  }
  
  return {
    newState,
    gameOver,
    winner,
    roundCompleteMessage
  };
}