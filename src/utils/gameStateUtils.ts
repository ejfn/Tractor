import { GameState, Player, Team } from '../types/game';

export class GameStateUtils {
  static getPlayerById(gameState: GameState, playerId: string): Player {
    const player = gameState.players[playerId];
    if (!player) {
      throw new Error(`Player with id ${playerId} not found`);
    }
    return player;
  }

  static getPlayerIndex(gameState: GameState, playerId: string): number {
    const playersInOrder = this.getPlayersInOrder(gameState);
    const index = playersInOrder.findIndex(p => p.id === playerId);
    if (index === -1) {
      throw new Error(`Player with id ${playerId} not found in play order`);
    }
    return index;
  }

  static getPlayersInOrder(gameState: GameState): Player[] {
    return gameState.playOrder.map(playerId => this.getPlayerById(gameState, playerId));
  }

  static getTeam(gameState: GameState, teamId: string): Team {
    const team = gameState.teams[teamId];
    if (!team) {
      throw new Error(`Team with id ${teamId} not found`);
    }
    return team;
  }

  static findPlayersByTeam(gameState: GameState, teamId: string): Player[] {
    const team = this.getTeam(gameState, teamId);
    return team.playerIds.map(playerId => this.getPlayerById(gameState, playerId));
  }

  static getCurrentPlayer(gameState: GameState): Player {
    if (!gameState.currentTrick) {
      throw new Error('No current trick in progress');
    }
    
    const leadingPlayerIndex = this.getPlayerIndex(gameState, gameState.currentTrick.leadingPlayerId);
    const currentPlayerIndex = (leadingPlayerIndex + gameState.currentTrick.plays.length) % gameState.playOrder.length;
    const currentPlayerId = gameState.playOrder[currentPlayerIndex];
    
    return this.getPlayerById(gameState, currentPlayerId);
  }

  static getNextPlayer(gameState: GameState, currentPlayerId: string): Player {
    const currentIndex = this.getPlayerIndex(gameState, currentPlayerId);
    const nextIndex = (currentIndex + 1) % gameState.playOrder.length;
    const nextPlayerId = gameState.playOrder[nextIndex];
    
    return this.getPlayerById(gameState, nextPlayerId);
  }

  static getAllPlayers(gameState: GameState): Player[] {
    return Object.values(gameState.players);
  }

  static getAllTeams(gameState: GameState): Team[] {
    return Object.values(gameState.teams);
  }

  static getPlayerTeam(gameState: GameState, playerId: string): Team {
    const teams = this.getAllTeams(gameState);
    const team = teams.find(t => t.playerIds.includes(playerId));
    if (!team) {
      throw new Error(`No team found for player ${playerId}`);
    }
    return team;
  }

  static isPlayerTurn(gameState: GameState, playerId: string): boolean {
    if (!gameState.currentTrick) return false;
    
    try {
      const currentPlayer = this.getCurrentPlayer(gameState);
      return currentPlayer.id === playerId;
    } catch {
      return false;
    }
  }

  static getTrickWinner(gameState: GameState, trickIndex: number): Player | null {
    if (trickIndex >= gameState.completedTricks.length) {
      return null;
    }
    
    const trick = gameState.completedTricks[trickIndex];
    return this.getPlayerById(gameState, trick.winningPlayerId);
  }

  static getPlayerCount(gameState: GameState): number {
    return Object.keys(gameState.players).length;
  }

  static getTeamCount(gameState: GameState): number {
    return Object.keys(gameState.teams).length;
  }

  static updatePlayer(gameState: GameState, playerId: string, updates: Partial<Player>): GameState {
    const existingPlayer = this.getPlayerById(gameState, playerId);
    
    return {
      ...gameState,
      players: {
        ...gameState.players,
        [playerId]: {
          ...existingPlayer,
          ...updates
        }
      }
    };
  }

  static updateTeam(gameState: GameState, teamId: string, updates: Partial<Team>): GameState {
    const existingTeam = this.getTeam(gameState, teamId);
    
    return {
      ...gameState,
      teams: {
        ...gameState.teams,
        [teamId]: {
          ...existingTeam,
          ...updates
        }
      }
    };
  }
}