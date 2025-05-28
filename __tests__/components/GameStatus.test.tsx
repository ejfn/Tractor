import React from 'react';
import { render } from '@testing-library/react-native';
import GameStatus from '../../src/components/GameStatus';
import { GamePhase, Suit, Rank, Team, TeamId, PlayerId } from '../../src/types';

describe('GameStatus', () => {
  const mockTeams: [Team, Team] = [
    {
      id: TeamId.A,
      currentRank: Rank.Two,
      points: 0,
      isDefending: true,
    },
    {
      id: TeamId.B,
      currentRank: Rank.Two,
      points: 25,
      isDefending: false,
    },
  ];

  const mockTrumpInfo = {
    trumpRank: Rank.Two,
    trumpSuit: Suit.Hearts,
    declared: true,
    declarerPlayerId: PlayerId.Human,
  };

  it('should render team information correctly', () => {
    const { getByText } = render(
      <GameStatus
        teams={mockTeams}
        trumpInfo={mockTrumpInfo}
        roundNumber={1}
        gamePhase={GamePhase.Playing}
      />
    );

    expect(getByText('Team A')).toBeTruthy();
    expect(getByText('Team B')).toBeTruthy();
    expect(getByText('Defending')).toBeTruthy();
    expect(getByText('Attacking')).toBeTruthy();
    expect(getByText('Round 1')).toBeTruthy();
    expect(getByText('Playing')).toBeTruthy();
  });

  it('should show animated progress bar for attacking team', () => {
    const { getByText, queryByText } = render(
      <GameStatus
        teams={mockTeams}
        trumpInfo={mockTrumpInfo}
        roundNumber={1}
        gamePhase={GamePhase.Playing}
      />
    );

    // Should show points for attacking team
    expect(getByText('25/80')).toBeTruthy();
    
    // Defending team should not show points
    const defendingTeamTexts = queryByText('0/80');
    expect(defendingTeamTexts).toBeNull();
  });

  it('should handle teams with different point values', () => {
    const teamsWithHighPoints: [Team, Team] = [
      {
        id: TeamId.A,
        currentRank: Rank.Three,
        points: 0,
        isDefending: true,
      },
      {
        id: TeamId.B,
        currentRank: Rank.Three,
        points: 65,
        isDefending: false,
      },
    ];

    const { getByText } = render(
      <GameStatus
        teams={teamsWithHighPoints}
        trumpInfo={mockTrumpInfo}
        roundNumber={2}
        gamePhase={GamePhase.Scoring}
      />
    );

    expect(getByText('65/80')).toBeTruthy();
    expect(getByText('Round 2')).toBeTruthy();
    expect(getByText('Scoring')).toBeTruthy();
  });

  it('should display trump information correctly', () => {
    const { getByText, getAllByText } = render(
      <GameStatus
        teams={mockTeams}
        trumpInfo={mockTrumpInfo}
        roundNumber={1}
        gamePhase={GamePhase.Playing}
      />
    );

    expect(getByText('Trump')).toBeTruthy();
    // There might be multiple "2" texts (from ranks), so check there's at least one
    expect(getAllByText('2').length).toBeGreaterThan(0);
    expect(getByText('♥')).toBeTruthy();
  });

  it('should handle no trump scenario', () => {
    const noTrumpInfo = {
      trumpRank: Rank.Ace,
      trumpSuit: undefined,
      declared: true,
      declarerPlayerId: PlayerId.Human,
    };

    const { getByText } = render(
      <GameStatus
        teams={mockTeams}
        trumpInfo={noTrumpInfo}
        roundNumber={1}
        gamePhase={GamePhase.Playing}
      />
    );

    expect(getByText('A')).toBeTruthy();
    expect(getByText('🤡')).toBeTruthy();
  });
});