import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Animated } from 'react-native';
import HumanPlayerView from '../../src/components/HumanPlayerView';
import { Player, Card, Suit, Rank, TrumpInfo } from '../../src/types/game';
import { createTestPlayer, createTestGameState, createTestCard, createTestTrumpInfo } from '../helpers/testUtils';
import { GameStateUtils } from '../../src/utils/gameStateUtils';

// Mock dependencies
jest.mock('../../src/components/ThinkingIndicator', () => {
  const React = require('react');
  return function MockThinkingIndicator(props: any) {
    return React.createElement('ThinkingIndicator', {
      ...props,
      testID: `thinking-indicator-${props.visible ? 'visible' : 'hidden'}`
    });
  };
});

jest.mock('../../src/components/PlayerHandAnimated', () => {
  const React = require('react');
  return function MockPlayerHandAnimated(props: any) {
    return React.createElement('PlayerHandAnimated', {
      ...props,
      testID: 'player-hand-animated',
      onCardSelect: () => props.onCardSelect && props.onCardSelect(props.player.hand[0]),
      onPlayCards: () => props.onPlayCards && props.onPlayCards()
    });
  };
});

describe('HumanPlayerView', () => {
  // Mock animation values
  const createAnimatedValues = () => ({
    dot1: new Animated.Value(0),
    dot2: new Animated.Value(0),
    dot3: new Animated.Value(0)
  });

  test('renders correctly for current player', () => {
    const thinkingDots = createAnimatedValues();
    const player = createTestPlayer("human", "Human Player", [], true, "A", "bottom");
    const trumpInfo = createTestTrumpInfo();
    
    const { getByText } = render(
      <HumanPlayerView 
        player={player}
        isCurrentPlayer={true}
        isDefending={true}
        selectedCards={[]}
        onCardSelect={() => {}}
        onPlayCards={() => {}}
        showTrickResult={false}
        canPlay={true}
        thinkingDots={thinkingDots}
        trumpInfo={trumpInfo}
      />
    );
    
    expect(getByText('You')).toBeTruthy();
  });
});
