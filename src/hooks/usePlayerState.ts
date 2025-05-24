import { useState, useCallback, useMemo } from 'react';
import { Card, GameState } from '../types/game';
import { PlayerPosition, PlayerState, PlayerStateManager } from '../types/playerState';

/**
 * Hook to manage unified player state
 */
export function usePlayerState(
  gameState: GameState | null,
  externalSelectedCards?: Card[],
  setExternalSelectedCards?: (cards: Card[]) => void
): PlayerStateManager | null {
  // Use external state if provided, otherwise manage internally
  const [internalSelectedCards, setInternalSelectedCards] = useState<Card[]>([]);
  const selectedCards = externalSelectedCards ?? internalSelectedCards;
  const setSelectedCards = setExternalSelectedCards ?? setInternalSelectedCards;
  
  const [thinkingPlayerId, setThinkingPlayerId] = useState<string | undefined>();

  // Build player states from game state
  const playerStates = useMemo(() => {
    if (!gameState) return null;

    const states: Record<string, PlayerState> = {};
    const positions: PlayerPosition[] = ['bottom', 'right', 'top', 'left'];
    
    // Determine current player from game state
    // Since we removed currentPlayerIndex, we need to determine it from game phase and trick state
    let currentPlayerId: string | undefined;
    
    if (gameState.gamePhase === 'playing' && gameState.currentTrick) {
      // During play, determine next player based on trick state
      const trickPlayCount = gameState.currentTrick.plays.length;
      const leadPlayerIndex = gameState.players.findIndex(p => p.id === gameState.currentTrick!.leadingPlayerId);
      const currentPlayerIndex = (leadPlayerIndex + trickPlayCount + 1) % gameState.players.length;
      currentPlayerId = gameState.players[currentPlayerIndex].id;
    } else if (gameState.gamePhase === 'playing' && !gameState.currentTrick) {
      // No active trick - need to determine who leads next
      // Check if there's a completed trick to find the winner
      if (gameState.tricks.length > 0) {
        const lastTrick = gameState.tricks[gameState.tricks.length - 1];
        currentPlayerId = lastTrick.winningPlayerId;
      } else {
        // First trick of the round - use first player (default fallback)
        currentPlayerId = gameState.players[0].id;
      }
    } else {
      // Not in playing phase - use first player as default
      currentPlayerId = gameState.players[0].id;
    }
    
    // Assign positions to players (human at bottom, others clockwise)
    gameState.players.forEach((player, index) => {
      const team = gameState.teams.find(t => 
        t.id === player.team
      );
      
      if (!team) {
        throw new Error(`Team not found for player ${player.id}`);
      }

      let position: PlayerPosition;
      if (player.isHuman) {
        position = 'bottom';
      } else {
        // Find human player index
        const humanIndex = gameState.players.findIndex(p => p.isHuman);
        // Calculate relative position
        const relativeIndex = (index - humanIndex + 4) % 4;
        position = positions[relativeIndex];
      }

      states[player.id] = {
        player,
        position,
        isThinking: player.id === thinkingPlayerId,
        isCurrentTurn: player.id === currentPlayerId,
        team
      };
    });

    return states;
  }, [gameState, thinkingPlayerId]);

  // Helper methods
  const getPlayerState = useCallback((playerId: string): PlayerState | undefined => {
    return playerStates?.[playerId];
  }, [playerStates]);

  const getPlayerStateByPosition = useCallback((position: PlayerPosition): PlayerState | undefined => {
    if (!playerStates) return undefined;
    return Object.values(playerStates).find(state => state.position === position);
  }, [playerStates]);

  const getCurrentPlayerState = useCallback((): PlayerState => {
    if (!gameState || !playerStates) {
      throw new Error('No game state available');
    }
    // Find current player using the fact that exactly one player has isCurrentTurn = true
    const currentPlayerState = Object.values(playerStates).find(state => state.isCurrentTurn);
    if (!currentPlayerState) {
      throw new Error('Current player state not found');
    }
    return currentPlayerState;
  }, [gameState, playerStates]);

  const getHumanPlayerState = useCallback((): PlayerState | undefined => {
    if (!playerStates) return undefined;
    return Object.values(playerStates).find(state => state.player.isHuman);
  }, [playerStates]);

  const getAllPlayerStates = useCallback((): PlayerState[] => {
    if (!playerStates) return [];
    // Return in playing order (by original player array order)
    return gameState?.players.map(p => playerStates[p.id]).filter(Boolean) || [];
  }, [gameState, playerStates]);

  const getPlayerIndex = useCallback((playerId: string): number => {
    if (!gameState) return -1;
    return gameState.players.findIndex(p => p.id === playerId);
  }, [gameState]);

  const getNextPlayerId = useCallback((playerId: string): string => {
    if (!gameState) throw new Error('No game state available');
    const currentIndex = getPlayerIndex(playerId);
    if (currentIndex === -1) throw new Error('Player not found');
    const nextIndex = (currentIndex + 1) % gameState.players.length;
    return gameState.players[nextIndex].id;
  }, [gameState, getPlayerIndex]);

  const setCurrentPlayer = useCallback((playerId: string): void => {
    // This would need to be handled by the parent game state
    // For now, this is a placeholder
    console.warn('setCurrentPlayer should be handled by gameState management');
  }, []);

  const updatePlayerState = useCallback((playerId: string, updates: Partial<Omit<PlayerState, 'player' | 'team'>>): void => {
    // Handle thinking state updates
    if ('isThinking' in updates) {
      if (updates.isThinking) {
        setThinkingPlayerId(playerId);
      } else if (thinkingPlayerId === playerId) {
        setThinkingPlayerId(undefined);
      }
    }
    // Other updates would need to be handled by parent game state
  }, [thinkingPlayerId]);

  if (!gameState || !playerStates) return null;

  // Find current player from player states
  const currentPlayerState = Object.values(playerStates).find(state => state.isCurrentTurn);
  const currentPlayerId = currentPlayerState?.player.id || gameState.players[0].id;

  return {
    playerStates,
    currentPlayerId,
    trickLeaderId: gameState.currentTrick?.leadingPlayerId,
    trickWinnerId: gameState.currentTrick?.winningPlayerId,
    trumpDeclarerId: gameState.trumpInfo.declarerPlayerId,
    selectedCards,
    thinkingPlayerId,
    getPlayerState,
    getPlayerStateByPosition,
    getCurrentPlayerState,
    getHumanPlayerState,
    getAllPlayerStates,
    getPlayerIndex,
    getNextPlayerId,
    setCurrentPlayer,
    setThinkingPlayer: setThinkingPlayerId,
    setSelectedCards,
    updatePlayerState
  };
}