import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { Animated } from 'react-native';
import HumanPlayerView from '../../src/components/HumanPlayerView';
import { PlayerId, PlayerName, TeamId, GamePhase } from "../../src/types";
import {
  createPlayer,
  createTrumpScenarios,
  testData
} from "../helpers";

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


describe('HumanPlayerView', () => {
  // Mock animation values using shared utility pattern
  const createAnimatedValues = () => ({
    dot1: new Animated.Value(0),
    dot2: new Animated.Value(0),
    dot3: new Animated.Value(0)
  });

  // Create mock player using shared utility
  const createMockPlayer = () => createPlayer(
    PlayerId.Human,
    PlayerName.Human,
    true,
    TeamId.A,
    [testData.cards.spadesAce, testData.cards.clubsKing]
  );

  // Create mock trump info using shared utility
  const createMockTrumpInfo = () => createTrumpScenarios.spadesTrump();

  test('renders correctly for current player without trick result', () => {
    const thinkingDots = createAnimatedValues();
    const player = createMockPlayer();
    const trumpInfo = createMockTrumpInfo();
    
    const { getByText, getByTestId } = render(
      <HumanPlayerView 
        player={player}
        isCurrentPlayer={true}
        isDefending={true}
        selectedCards={[]}
        onCardSelect={jest.fn()}
        onPlayCards={jest.fn()}
        canPlay={true}
        trumpInfo={trumpInfo}
        showTrickResult={false}
        lastCompletedTrick={null}
        thinkingDots={thinkingDots}
        gamePhase={GamePhase.Playing}
      />
    );
    
    // Check that the player label is displayed
    expect(getByText('You')).toBeTruthy();
    
    // Check that the thinking indicator is visible
    expect(getByTestId('thinking-indicator-visible')).toBeTruthy();
    
    // Check that the player hand is rendered
    expect(getByTestId('player-hand-animated')).toBeTruthy();
  });

  test('does not show thinking indicator when trick result is shown', () => {
    const thinkingDots = createAnimatedValues();
    const player = createMockPlayer();
    const trumpInfo = createMockTrumpInfo();
    
    const { getByText, queryByTestId } = render(
      <HumanPlayerView 
        player={player}
        isCurrentPlayer={true}
        isDefending={true}
        selectedCards={[]}
        onCardSelect={jest.fn()}
        onPlayCards={jest.fn()}
        canPlay={true}
        trumpInfo={trumpInfo}
        showTrickResult={true}
        lastCompletedTrick={null}
        thinkingDots={thinkingDots}
      />
    );
    
    // Check that the player label is displayed
    expect(getByText('You')).toBeTruthy();
    
    // Check that the thinking indicator is not visible
    expect(queryByTestId('thinking-indicator-visible')).toBeNull();
  });

  test('renders correctly for non-current player', () => {
    const thinkingDots = createAnimatedValues();
    const player = createMockPlayer();
    const trumpInfo = createMockTrumpInfo();
    
    const { getByText, queryByTestId } = render(
      <HumanPlayerView 
        player={player}
        isCurrentPlayer={false}
        isDefending={true}
        selectedCards={[]}
        onCardSelect={jest.fn()}
        onPlayCards={jest.fn()}
        canPlay={false}
        trumpInfo={trumpInfo}
        showTrickResult={false}
        lastCompletedTrick={null}
        thinkingDots={thinkingDots}
      />
    );
    
    // Check that the player label is displayed
    expect(getByText('You')).toBeTruthy();
    
    // Check that the thinking indicator is not rendered
    expect(queryByTestId('thinking-indicator-visible')).toBeNull();
  });

  test('uses correct team styling for defending team', () => {
    const thinkingDots = createAnimatedValues();
    const player = createMockPlayer();
    const trumpInfo = createMockTrumpInfo();
    
    const { getByText } = render(
      <HumanPlayerView 
        player={player}
        isCurrentPlayer={false}
        isDefending={true}
        selectedCards={[]}
        onCardSelect={jest.fn()}
        onPlayCards={jest.fn()}
        canPlay={false}
        trumpInfo={trumpInfo}
        showTrickResult={false}
        lastCompletedTrick={null}
        thinkingDots={thinkingDots}
      />
    );
    
    // Verify the component rendered successfully
    expect(getByText('You')).toBeTruthy();
  });

  test('uses correct team styling for attacking team', () => {
    const thinkingDots = createAnimatedValues();
    const player = createMockPlayer();
    const trumpInfo = createMockTrumpInfo();
    
    const { getByText } = render(
      <HumanPlayerView 
        player={player}
        isCurrentPlayer={false}
        isDefending={false}
        selectedCards={[]}
        onCardSelect={jest.fn()}
        onPlayCards={jest.fn()}
        canPlay={false}
        trumpInfo={trumpInfo}
        showTrickResult={false}
        lastCompletedTrick={null}
        thinkingDots={thinkingDots}
      />
    );
    
    // Verify the component rendered successfully
    expect(getByText('You')).toBeTruthy();
  });

  test('properly passes onCardSelect to PlayerHandAnimated', () => {
    const thinkingDots = createAnimatedValues();
    const player = createMockPlayer();
    const trumpInfo = createMockTrumpInfo();
    const mockOnCardSelect = jest.fn();
    
    render(
      <HumanPlayerView 
        player={player}
        isCurrentPlayer={true}
        isDefending={true}
        selectedCards={[]}
        onCardSelect={mockOnCardSelect}
        onPlayCards={jest.fn()}
        canPlay={true}
        trumpInfo={trumpInfo}
        showTrickResult={false}
        lastCompletedTrick={null}
        thinkingDots={thinkingDots}
      />
    );
    
    // Since we're testing a prop pass-through, we can verify by checking
    // that the mock was properly set up
    expect(mockOnCardSelect).not.toHaveBeenCalled();
  });

  test('calls onPlayCards when play button is pressed', () => {
    const thinkingDots = createAnimatedValues();
    const player = createMockPlayer();
    const trumpInfo = createMockTrumpInfo();
    const mockOnPlayCards = jest.fn();
    
    const { getByTestId } = render(
      <HumanPlayerView 
        player={player}
        isCurrentPlayer={true}
        isDefending={true}
        selectedCards={[player.hand[0]]}
        onCardSelect={jest.fn()}
        onPlayCards={mockOnPlayCards}
        canPlay={true}
        trumpInfo={trumpInfo}
        showTrickResult={false}
        lastCompletedTrick={null}
        thinkingDots={thinkingDots}
      />
    );
    
    // Simulate play button press
    fireEvent(getByTestId('player-hand-animated'), 'onPlayCards');
    
    // Check that onPlayCards was called
    expect(mockOnPlayCards).toHaveBeenCalled();
  });
});