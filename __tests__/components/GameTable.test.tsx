import React from 'react';
import { render } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import GameTable from '../../src/components/GameTable';

describe('GameTable', () => {
  test('renders all player positions correctly', () => {
    const { getByTestId } = render(
      <GameTable 
        topPlayer={<View testID="top-player"><Text>Top Player</Text></View>}
        leftPlayer={<View testID="left-player"><Text>Left Player</Text></View>}
        rightPlayer={<View testID="right-player"><Text>Right Player</Text></View>}
        bottomPlayer={<View testID="bottom-player"><Text>Bottom Player</Text></View>}
        centerContent={<View testID="center-content"><Text>Center Content</Text></View>}
      />
    );
    
    // Check that all player positions are rendered
    expect(getByTestId('top-player')).toBeTruthy();
    expect(getByTestId('left-player')).toBeTruthy();
    expect(getByTestId('right-player')).toBeTruthy();
    expect(getByTestId('bottom-player')).toBeTruthy();
    expect(getByTestId('center-content')).toBeTruthy();
  });

  test('renders optional trick result when provided', () => {
    const { getByTestId } = render(
      <GameTable 
        topPlayer={<View><Text>Top Player</Text></View>}
        leftPlayer={<View><Text>Left Player</Text></View>}
        rightPlayer={<View><Text>Right Player</Text></View>}
        bottomPlayer={<View><Text>Bottom Player</Text></View>}
        centerContent={<View><Text>Center Content</Text></View>}
        trickResult={<View testID="trick-result"><Text>Trick Result</Text></View>}
      />
    );
    
    // Check that trick result is rendered
    expect(getByTestId('trick-result')).toBeTruthy();
  });

  test('does not render trick result when not provided', () => {
    const { queryByTestId } = render(
      <GameTable 
        topPlayer={<View><Text>Top Player</Text></View>}
        leftPlayer={<View><Text>Left Player</Text></View>}
        rightPlayer={<View><Text>Right Player</Text></View>}
        bottomPlayer={<View><Text>Bottom Player</Text></View>}
        centerContent={<View><Text>Center Content</Text></View>}
      />
    );
    
    // Check that trick result is not rendered
    expect(queryByTestId('trick-result')).toBeNull();
  });

  test('renders text content correctly', () => {
    const { getByText } = render(
      <GameTable 
        topPlayer={<Text>Top Player</Text>}
        leftPlayer={<Text>Left Player</Text>}
        rightPlayer={<Text>Right Player</Text>}
        bottomPlayer={<Text>Bottom Player</Text>}
        centerContent={<Text>Center Content</Text>}
      />
    );
    
    // Check that all text content is rendered
    expect(getByText('Top Player')).toBeTruthy();
    expect(getByText('Left Player')).toBeTruthy();
    expect(getByText('Right Player')).toBeTruthy();
    expect(getByText('Bottom Player')).toBeTruthy();
    expect(getByText('Center Content')).toBeTruthy();
  });
});