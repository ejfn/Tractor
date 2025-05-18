import { GameState, Rank } from '../types/game';
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
    const rankOrder = Object.values(Rank);
    const points = attackingTeam.points;
    
    // Attacking team needs 80+ points to win
    if (points >= 80) {
      // Attacking team wins and becomes new defending team
      let rankAdvancement = 0;
      
      // Calculate rank advancement based on points
      // For every 40 points above 80, advance one additional rank
      if (points >= 120) {
        rankAdvancement = Math.floor((points - 80) / 40);
      }
      
      // Update attacking team's rank
      const currentRankIndex = rankOrder.indexOf(attackingTeam.currentRank);
      const newRankIndex = Math.min(currentRankIndex + rankAdvancement, rankOrder.length - 1);
      
      if (newRankIndex < rankOrder.length - 1) {
        attackingTeam.currentRank = rankOrder[newRankIndex];
        
        // Switch defending/attacking roles
        defendingTeam.isDefending = false;
        attackingTeam.isDefending = true;
        
        // Create round result message
        if (rankAdvancement === 0) {
          roundCompleteMessage = `Team ${attackingTeam.id} won with ${points} points and will defend at rank ${attackingTeam.currentRank}!`;
        } else {
          roundCompleteMessage = `Team ${attackingTeam.id} won with ${points} points and advances ${rankAdvancement} rank${rankAdvancement > 1 ? 's' : ''} to ${attackingTeam.currentRank}!`;
        }
      } else {
        // Game over - attacking team reached Ace and won
        gameOver = true;
        winner = attackingTeam.id;
      }
    } else {
      // Defending team successfully defended
      let rankAdvancement = 1; // Default advancement
      
      // Calculate rank advancement based on attacker's points
      if (points < 40) {
        rankAdvancement = 2;
      }
      if (points === 0) {
        rankAdvancement = 3;
      }
      
      // Update defending team's rank
      const currentRankIndex = rankOrder.indexOf(defendingTeam.currentRank);
      const newRankIndex = Math.min(currentRankIndex + rankAdvancement, rankOrder.length - 1);
      
      if (newRankIndex < rankOrder.length - 1) {
        defendingTeam.currentRank = rankOrder[newRankIndex];
        
        // Create round result message
        let pointMessage = '';
        if (points === 0) {
          pointMessage = 'shut out the attackers (0 points)';
        } else if (points < 40) {
          pointMessage = `held attackers to only ${points} points`;
        } else {
          pointMessage = `defended with attackers getting ${points}/80 points`;
        }
        
        roundCompleteMessage = `Team ${defendingTeam.id} ${pointMessage} and advances ${rankAdvancement} rank${rankAdvancement > 1 ? 's' : ''} to ${defendingTeam.currentRank}!`;
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