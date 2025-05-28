import React from 'react';
import { render } from '@testing-library/react-native';
import TrickResultDisplay from '../../src/components/TrickResultDisplay';
import { PlayerId, PlayerName, TeamId } from '../../src/types';
import { createGameState } from '../helpers';

describe('TrickResultDisplay', () => {
  it('should show points when attacking team wins', () => {
    const gameState = createGameState();
    // Set up attacking team (Team B) as non-defending
    gameState.teams[1].isDefending = false;
    gameState.players[1].team = TeamId.B; // Bot1 is on attacking team
    
    const { getByText } = render(
      <TrickResultDisplay
        visible={true}
        winnerId={PlayerId.Bot1}
        points={15}
        gameState={gameState}
      />
    );

    expect(getByText('Bot 1 wins!')).toBeTruthy();
    expect(getByText('+15 pts')).toBeTruthy();
  });

  it('should NOT show points when defending team wins', () => {
    const gameState = createGameState();
    // Set up defending team (Team A) as defending
    gameState.teams[0].isDefending = true;
    gameState.players[0].team = TeamId.A; // Human is on defending team
    
    const { getByText, queryByText } = render(
      <TrickResultDisplay
        visible={true}
        winnerId={PlayerId.Human}
        points={15}
        gameState={gameState}
      />
    );

    expect(getByText('You win!')).toBeTruthy();
    expect(queryByText('+15 pts')).toBeNull();
  });

  it('should show points when attacking team wins with zero points', () => {
    const gameState = createGameState();
    // Set up attacking team (Team B) as non-defending
    gameState.teams[1].isDefending = false;
    gameState.players[2].team = TeamId.B; // Bot2 is on attacking team
    
    const { getByText, queryByText } = render(
      <TrickResultDisplay
        visible={true}
        winnerId={PlayerId.Bot2}
        points={0}
        gameState={gameState}
      />
    );

    expect(getByText('Bot 2 wins!')).toBeTruthy();
    expect(queryByText('+0 pts')).toBeNull(); // Zero points should not be shown
  });

  it('should not render when not visible', () => {
    const gameState = createGameState();
    
    const { queryByText } = render(
      <TrickResultDisplay
        visible={false}
        winnerId={PlayerId.Bot3}
        points={10}
        gameState={gameState}
      />
    );

    expect(queryByText('Bot 3 wins!')).toBeNull();
    expect(queryByText('+10 pts')).toBeNull();
  });
});