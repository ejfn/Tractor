import { GameState, Card, Trick, Team } from '../types/game';
import { identifyCombos, isValidPlay, determineTrickWinner } from './gameLogic';
import { getAIMove } from './aiLogic';

/**
 * Process a player's play (human or AI)
 * @param state Current game state
 * @param cards The cards being played
 * @param currentPlayerId ID of the current player
 * @returns Object with updated state and trick completion info
 */
export function processPlay(state: GameState, cards: Card[], currentPlayerId: string): {
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
    teams: state.teams.map(t => ({ ...t })) as [Team, Team] // Deep copy teams too
  };
  
  // Find the current player by ID
  const currentPlayer = newState.players.find(p => p.id === currentPlayerId);
  if (!currentPlayer) {
    throw new Error(`Player with ID ${currentPlayerId} not found`);
  }
  
  const currentPlayerIndex = newState.players.indexOf(currentPlayer);
  
  // Check if we should start a new trick
  // Rules:
  // 1. If no current trick exists, start a new one
  // 2. If current trick is complete AND this player won it, start a new one
  //    (but only in testing or after the UI has shown the result)
  const isTrickComplete = newState.currentTrick && 
    newState.currentTrick.plays.length === newState.players.length - 1;
  
  // Check if this player is the winner of the previous trick
  const isWinner = newState.tricks.length > 0 && 
    newState.players[currentPlayerIndex].id === newState.tricks[newState.tricks.length - 1].winningPlayerId;
  
  if (!newState.currentTrick || (isTrickComplete && isWinner)) {
    // For the first player, create new trick and don't add to plays array
    newState.currentTrick = {
      leadingPlayerId: currentPlayer.id,
      leadingCombo: [...cards],
      plays: [],
      points: 0
    };
    
    // First player is leading the trick
  } else if (newState.currentTrick) {
    // Trick exists - add to plays array
    // Make sure we never add the leading player to the plays array
    // This prevents the duplicate cards issue
    if (currentPlayer.id === newState.currentTrick.leadingPlayerId) {
      // This is the leading player playing again - this should never happen in a normal game
      // Log an error but continue processing
      console.error(`Warning: Leading player ${currentPlayer.id} is playing again in the same trick`);
    } else {
      // Add non-leading plays to the plays array
      newState.currentTrick.plays.push({
        playerId: currentPlayer.id,
        cards: [...cards]
      });
      
      // Add player's follow cards to the trick
    }
  } else {
    // This should never happen - no current trick but not starting new one
    console.error(`Invalid state: no currentTrick for player ${currentPlayer.id}`);
    return {
      newState: state,
      trickComplete: false
    };
  }
  
  // Calculate points from this play
  const playPoints = cards.reduce((sum, card) => sum + card.points, 0);
  newState.currentTrick.points += playPoints;
  
  // Remove played cards from player's hand
  // Use the currentPlayerIndex we already computed
  
  // Create a new hand array without the played cards
  const newHand = newState.players[currentPlayerIndex].hand.filter(
      card => !cards.some(playedCard => playedCard.id === card.id)
    );
    
    // Update the player's hand in the new state
    newState.players[currentPlayerIndex].hand = newHand;
  
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
    
    // Winning player will be tracked via PlayerStateManager
    
    // The winning player will lead the next trick
    // This is handled by the PlayerStateManager when determining current player
  
    // DO NOT clear current trick immediately
    // We'll keep it in the state so cards remain visible
    // The UI will use this currentTrick until the trick result is shown
    // Only then will we use the saved completedTrick for displaying the result
    // newState.currentTrick = null; -- REMOVED THIS LINE
    
    // Return trick completion info with winning player name
    const winningPlayer = newState.players.find(p => p.id === winningPlayerId);
    
    // Use the completed trick with winner ID for result display
    const trickWithWinner = completedTrick;
    
    return {
      newState,
      trickComplete: true,
      trickWinner: winningPlayer?.name || 'Unknown Player',
      trickPoints: completedTrick.points,
      completedTrick: trickWithWinner,
    };
  } else {
    // Move to next player (this will be handled by PlayerStateManager)
    // The next player is determined by the trick state
    
    return {
      newState,
      trickComplete: false
    };
  }
}

/**
 * Get the AI's move based on the current game state
 * @param state Current game state
 * @param currentPlayerId ID of the current player
 * @returns Object with the cards to play and any error
 */
export function getAIMoveWithErrorHandling(state: GameState, currentPlayerId: string): {
  cards: Card[];
  error?: string;
} {
  try {
    // Find the current player by ID
    const currentPlayer = state.players.find(p => p.id === currentPlayerId);
    
    if (!currentPlayer) {
      return { cards: [], error: `Player with ID ${currentPlayerId} not found` };
    }
    
    // Note: currentPlayerIndex could be used for index-based operations if needed
    
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
      
      // Emergency fallback: play cards to match the combo length
      if (currentPlayer.hand.length > 0) {
        const comboLength = state.currentTrick?.leadingCombo?.length || 1;
        const cardsToPlay = currentPlayer.hand.slice(0, Math.min(comboLength, currentPlayer.hand.length));
        return { cards: cardsToPlay };
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
 * @param currentPlayerId ID of the current player
 * @returns Boolean indicating if the play is valid
 */
export function validatePlay(state: GameState, cards: Card[], currentPlayerId: string): boolean {
  if (!state || cards.length === 0) return false;
  
  const currentPlayer = state.players.find(p => p.id === currentPlayerId);
  if (!currentPlayer) return false;
  
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