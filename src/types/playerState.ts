import { Card, Player, Team } from './game';

export type PlayerPosition = 'bottom' | 'right' | 'top' | 'left';

export interface PlayerState {
  player: Player;
  position: PlayerPosition;
  isThinking: boolean;
  isCurrentTurn: boolean;
  team: Team;
}

export interface PlayerStateManager {
  // Player states indexed by player ID
  playerStates: Record<string, PlayerState>;
  
  // Turn management (using IDs for consistency)
  currentPlayerId: string;
  trickLeaderId?: string;
  trickWinnerId?: string;
  trumpDeclarerId?: string;
  
  // UI state
  selectedCards: Card[];
  thinkingPlayerId?: string;
  
  // Helper methods
  getPlayerState: (playerId: string) => PlayerState | undefined;
  getPlayerStateByPosition: (position: PlayerPosition) => PlayerState | undefined;
  getCurrentPlayerState: () => PlayerState;
  getHumanPlayerState: () => PlayerState | undefined;
  getAllPlayerStates: () => PlayerState[];
  getPlayerIndex: (playerId: string) => number;
  getNextPlayerId: (playerId: string) => string;
  setCurrentPlayer: (playerId: string) => void;
  setThinkingPlayer: (playerId: string | undefined) => void;
  setSelectedCards: (cards: Card[]) => void;
  updatePlayerState: (playerId: string, updates: Partial<Omit<PlayerState, 'player' | 'team'>>) => void;
}