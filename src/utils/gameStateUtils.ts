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
    const playerIds = Object.keys(gameState.players);
    const index = playerIds.findIndex(id => id === playerId);
    if (index === -1) {
      throw new Error(`Player with id ${playerId} not found`);
    }
    return index;
  }

  static getPlayersInOrder(gameState: GameState): Player[] {
    // Return players in positional order: bottom, right, top, left
    const positionOrder = ['bottom', 'right', 'top', 'left'];
    const playersByPosition = new Map();
    
    Object.values(gameState.players).forEach(player => {
      playersByPosition.set(player.position, player);
    });
    
    return positionOrder
      .map(position => playersByPosition.get(position))
      .filter(player => player !== undefined);
  }

  static getTeam(gameState: GameState, teamId: "A" | "B"): Team {
    const team = gameState.teams[teamId];
    if (!team) {
      throw new Error(`Team with id ${teamId} not found`);
    }
    return team;
  }

  static findPlayersByTeam(gameState: GameState, teamId: "A" | "B"): Player[] {
    return Object.values(gameState.players).filter(player => player.teamId === teamId);
  }

  static getCurrentPlayer(gameState: GameState): Player {
    return this.getPlayerById(gameState, gameState.currentPlayerId);
  }

  static getNextPlayer(gameState: GameState, currentPlayerId: string): Player {
    const playersInOrder = this.getPlayersInOrder(gameState);
    const currentIndex = playersInOrder.findIndex(p => p.id === currentPlayerId);
    if (currentIndex === -1) {
      throw new Error(`Player ${currentPlayerId} not found in play order`);
    }
    
    const nextIndex = (currentIndex + 1) % playersInOrder.length;
    return playersInOrder[nextIndex];
  }

  static getAllPlayers(gameState: GameState): Player[] {
    return Object.values(gameState.players);
  }

  static getAllTeams(gameState: GameState): Team[] {
    return Object.values(gameState.teams);
  }

  static getPlayerTeam(gameState: GameState, playerId: string): Team {
    const player = this.getPlayerById(gameState, playerId);
    return this.getTeam(gameState, player.teamId);
  }

  static isPlayerTurn(gameState: GameState, playerId: string): boolean {
    return gameState.currentPlayerId === playerId;
  }

  static getTrickWinner(gameState: GameState, trickIndex: number): Player | null {
    if (trickIndex >= gameState.tricks.length) {
      return null;
    }
    
    const trick = gameState.tricks[trickIndex];
    if (!trick.winningPlayerId) {
      return null;
    }
    
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

  static updateTeam(gameState: GameState, teamId: "A" | "B", updates: Partial<Team>): GameState {
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