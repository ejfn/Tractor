import { GameState, Card, Trick } from '../types/game';
import { identifyCombos, isValidPlay, determineTrickWinner } from './gameLogic';
import { getAIMove } from './aiLogic';

/**
 * Process a player's play (human or AI)
 * @param state Current game state
 * @param cards The cards being played
 * @returns Object with updated state and trick completion info
 */
export function processPlay(state: GameState, cards: Card[]): {
  newState: GameState;
  trickComplete: boolean;
  trickWinner?: string;
  trickPoints?: number;
  completedTrick?: Trick;
} {
  // Create a deep copy of the state to avoid mutating the original
  const newState = { 
    ...state,
    players: state.players.map(p => ({
      ...p,
      hand: [...p.hand] // Deep copy the hand array
    })),
    teams: state.teams.map(t => ({ ...t })) // Deep copy teams too
  };
  const currentPlayer = newState.players[newState.currentPlayerIndex];
  
  // Ensure we have a current trick
  if (!newState.currentTrick) {
    // For the first player, create new trick and don't add to plays array
    newState.currentTrick = {
      leadingPlayerId: currentPlayer.id,
      leadingCombo: [...cards],
      plays: [],
      points: 0
    };
    
    // First player is leading the trick
  } else {
    // Make sure we never add the leading player to the plays array
    // This prevents the duplicate cards issue
    if (currentPlayer.id === newState.currentTrick.leadingPlayerId) {
      // Skip adding to plays to avoid duplication
    } else {
      // Add non-leading plays to the plays array
      newState.currentTrick.plays.push({
        playerId: currentPlayer.id,
        cards: [...cards]
      });
      
      // Add player's follow cards to the trick
    }
  }
  
  // Calculate points from this play
  const playPoints = cards.reduce((sum, card) => sum + card.points, 0);
  newState.currentTrick.points += playPoints;
  
  // Remove played cards from player's hand
  cards.forEach(playedCard => {
    currentPlayer.hand = currentPlayer.hand.filter(
      card => card.id !== playedCard.id
    );
  });
  
  // Check if this completes a trick - should be plays.length = players.length-1
  // Since the leading player's cards are in leadingCombo, not in the plays array
  if (newState.currentTrick.plays.length === newState.players.length - 1) {
    // Find the winner
    const winningPlayerId = determineTrickWinner(
      newState.currentTrick,
      newState.trumpInfo
    );
    
    // Add points to the winning team
    const trickWinningPlayer = newState.players.find(p => p.id === winningPlayerId);
    if (trickWinningPlayer) {
      const winningTeam = newState.teams.find(t => t.id === trickWinningPlayer.team);
      if (winningTeam) {
        winningTeam.points += newState.currentTrick.points;
      }
    }
    
    // Save this completed trick with the winningPlayerId explicitly set
    const completedTrick = { 
      ...newState.currentTrick,
      winningPlayerId: winningPlayerId // Explicitly set the winning player ID 
    };
    newState.tricks.push(completedTrick);
    
    // Store the winning player index to use when clearing the trick
    const winningPlayerIndex = newState.players.findIndex(p => p.id === winningPlayerId);
    newState.winningPlayerIndex = winningPlayerIndex;
    
    // Set winner as the next player to lead
  
    // DO NOT clear current trick immediately
    // We'll keep it in the state so cards remain visible
    // The UI will use this currentTrick until the trick result is shown
    // Only then will we use the saved completedTrick for displaying the result
    // newState.currentTrick = null; -- REMOVED THIS LINE
    
    // Return trick completion info with winning player name
    const resultWinningPlayer = newState.players[winningPlayerIndex];
    
    // Use the completed trick with winner ID for result display
    const trickWithWinner = completedTrick;
    
    return {
      newState,
      trickComplete: true,
      trickWinner: resultWinningPlayer?.name || 'Unknown Player',
      trickPoints: completedTrick.points,
      completedTrick: trickWithWinner,
    };
  } else {
    // Move to next player
    newState.currentPlayerIndex = (newState.currentPlayerIndex + 1) % newState.players.length;
    
    return {
      newState,
      trickComplete: false
    };
  }
}

/**
 * Get the AI's move based on the current game state
 * @param state Current game state
 * @returns Object with the cards to play and any error
 */
export function getAIMoveWithErrorHandling(state: GameState): {
  cards: Card[];
  error?: string;
} {
  try {
    const currentPlayer = state.players[state.currentPlayerIndex];
    
    // Safety check to ensure the current player is an AI
    if (currentPlayer.isHuman) {
      console.warn("getAIMoveWithErrorHandling called for human player");
      return { cards: [], error: "Function called for human player" };
    }
    
    // Get AI move
    const aiMove = getAIMove(state, currentPlayer.id);
    
    // Validate that we received a valid move
    if (!aiMove || aiMove.length === 0) {
      console.warn(`AI player ${currentPlayer.id} returned an empty move`);
      
      // Emergency fallback: play the first card in hand if move is empty
      if (currentPlayer.hand.length > 0) {
        return { cards: [currentPlayer.hand[0]] };
      } else {
        // If AI hand is somehow empty, return error
        return { 
          cards: [], 
          error: `AI player ${currentPlayer.id} has no cards to play` 
        };
      }
    }
    
    return { cards: aiMove };
  } catch (error) {
    console.error("Error in AI move logic:", error);
    return { 
      cards: [], 
      error: `Error generating AI move: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
}

/**
 * Validate if a play is valid according to game rules
 * @param state Current game state
 * @param cards Cards being played
 * @returns Boolean indicating if the play is valid
 */
export function validatePlay(state: GameState, cards: Card[]): boolean {
  if (!state || cards.length === 0) return false;
  
  const currentPlayer = state.players[state.currentPlayerIndex];
  
  if (!state.currentTrick) {
    // Player is leading - any combo is valid
    const combos = identifyCombos(currentPlayer.hand, state.trumpInfo);
    return combos.some(combo => 
      combo.cards.length === cards.length &&
      combo.cards.every(card => 
        cards.some(selected => selected.id === card.id)
      )
    );
  } else {
    // Player is following - must match the leading combo
    return isValidPlay(
      cards,
      state.currentTrick.leadingCombo,
      currentPlayer.hand,
      state.trumpInfo
    );
  }
}