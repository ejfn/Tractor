import {
  Card,
  Player,
  PlayerId,
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
  isHuman: boolean,
  team: TeamId,
  hand: Card[] = []
): Player => ({
  id,
  isHuman,
  team,
  hand: [...hand] // Deep copy the hand
});

/**
 * Creates the standard 4-player setup used in most tests
 */
export const createStandardPlayers = (): Player[] => [
  createPlayer(PlayerId.Human, true, TeamId.A),
  createPlayer(PlayerId.Bot1, false, TeamId.B),
  createPlayer(PlayerId.Bot2, false, TeamId.A),
  createPlayer(PlayerId.Bot3, false, TeamId.B)
];

/**
 * Creates players with standard IDs (names are now handled by i18n)
 */
export const createPlayersWithIds = (playerIds: PlayerId[]): Player[] => {
  const teams: TeamId[] = [TeamId.A, TeamId.B, TeamId.A, TeamId.B];
  return playerIds.map((id, index) => 
    createPlayer(id, index === 0, teams[index])
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