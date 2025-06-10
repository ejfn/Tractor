import {
  Card,
  Player,
  PlayerId,
  PlayerName,
  Rank,
  Team,
  TeamId
} from '../../src/types';

// ============================================================================
// PLAYER CREATION UTILITIES
// ============================================================================

/**
 * Creates a player with specified properties
 */
export const createPlayer = (
  id: PlayerId,
  name: PlayerName,
  isHuman: boolean,
  team: TeamId,
  hand: Card[] = []
): Player => ({
  id,
  name,
  isHuman,
  team,
  hand: [...hand] // Deep copy the hand
});

/**
 * Creates the standard 4-player setup used in most tests
 */
export const createStandardPlayers = (): Player[] => [
  createPlayer(PlayerId.Human, PlayerName.Human, true, TeamId.A),
  createPlayer(PlayerId.Bot1, PlayerName.Bot1, false, TeamId.B),
  createPlayer(PlayerId.Bot2, PlayerName.Bot2, false, TeamId.A),
  createPlayer(PlayerId.Bot3, PlayerName.Bot3, false, TeamId.B)
];

/**
 * Creates players with standard IDs but custom display names (useful for specific test scenarios)
 * Note: This bypasses type safety for custom names, use carefully
 */
export const createPlayersWithNames = (names: string[]): Player[] => {
  const teams: TeamId[] = [TeamId.A, TeamId.B, TeamId.A, TeamId.B];
  const playerIds = [PlayerId.Human, PlayerId.Bot1, PlayerId.Bot2, PlayerId.Bot3];
  return names.map((name, index) => 
    createPlayer(playerIds[index], name as PlayerName, index === 0, teams[index])
  );
};

// ============================================================================
// TEAM CREATION UTILITIES
// ============================================================================

/**
 * Creates a team with specified properties
 */
export const createTeam = (
  id: TeamId,
  currentRank: Rank = Rank.Two,
  isDefending: boolean,
  points: number = 0
): Team => ({
  id,
  currentRank,
  isDefending,
  points
});

/**
 * Creates the standard team setup (Team A defending, Team B attacking)
 */
export const createStandardTeams = (): [Team, Team] => [
  createTeam(TeamId.A, Rank.Two, true, 0),
  createTeam(TeamId.B, Rank.Two, false, 0)
];

/**
 * Creates teams with custom ranks and points
 */
export const createTeamsWithRanks = (
  teamARank: Rank,
  teamBRank: Rank,
  defendingTeam: 'A' | 'B' = 'A',
  teamAPoints: number = 0,
  teamBPoints: number = 0
): [Team, Team] => [
  createTeam(TeamId.A, teamARank, defendingTeam === 'A', teamAPoints),
  createTeam(TeamId.B, teamBRank, defendingTeam === 'B', teamBPoints)
];