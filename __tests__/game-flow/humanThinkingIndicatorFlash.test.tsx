import React from 'react';
import { render } from '@testing-library/react-native';
import HumanPlayerView from '../../src/components/HumanPlayerView';
import { Card, Suit, Rank, Player, TrumpInfo } from '../../src/types/game';
import { Animated } from 'react-native';

// Mock the ThinkingIndicator to easily check if it's rendered
jest.mock('../../src/components/ThinkingIndicator', () => ({
  __esModule: true,
  default: ({ visible }: { visible: boolean }) => {
    const View = require('react-native').View;
    const Text = require('react-native').Text;
    return visible ? <View testID="thinking-indicator"><Text>ThinkingIndicator</Text></View> : null;
  }
}));

// Mock the HumanHandAnimated component
jest.mock('../../src/components/HumanHandAnimated', () => ({
  __esModule: true,
  default: () => null
}));

const mockPlayer: Player = {
  id: 'human',
  name: 'Test Player',
  hand: [],
  isHuman: true,
  team: 'A',
  currentRank: Rank.Two
};

const mockTrumpInfo: TrumpInfo = {
  trumpRank: Rank.Two,
  declared: true,
  trumpSuit: Suit.Hearts
};

const mockThinkingDots = {
  dot1: new Animated.Value(0),
  dot2: new Animated.Value(0),
  dot3: new Animated.Value(0)
};

const mockCurrentTrick = { 
  leadingPlayerId: 'ai1',
  leadingCombo: [],
  plays: [
    { playerId: 'ai2', cards: [] },
    { playerId: 'ai3', cards: [] },
    { playerId: 'human', cards: [] }
  ],
  points: 10
};

describe('Human Thinking Indicator Flash Fix', () => {
  it('should not show thinking indicator when human just won a trick', () => {
    // Test the specific scenario where the human wins a trick
    // currentPlayerIndex and winningPlayerIndex are both set to human
    // but there's still a currentTrick (not cleared yet)
    const humanPlayerIndex = 0;
    
    const { queryByTestId } = render(
      <HumanPlayerView
        player={mockPlayer}
        isCurrentPlayer={true}  // Human is current player
        isDefending={false}
        selectedCards={[]}
        onCardSelect={() => {}}
        onPlayCards={() => {}}
        canPlay={true}
        isValidPlay={true}
        trumpInfo={mockTrumpInfo}
        showTrickResult={false}  // Not showing trick result yet
        lastCompletedTrick={null}  // No completed trick yet
        thinkingDots={mockThinkingDots}
        currentPlayerIndex={humanPlayerIndex}
        winningPlayerIndex={humanPlayerIndex}  // Human won the trick
        currentTrick={mockCurrentTrick}  // Trick still exists
      />
    );

    // The thinking indicator should NOT be visible in this scenario
    expect(queryByTestId('thinking-indicator')).toBeNull();
  });

  it('should show thinking indicator during normal human turn', () => {
    // Normal scenario where human should think
    const humanPlayerIndex = 0;
    
    const { queryByTestId } = render(
      <HumanPlayerView
        player={mockPlayer}
        isCurrentPlayer={true}  // Human's turn
        isDefending={false}
        selectedCards={[]}
        onCardSelect={() => {}}
        onPlayCards={() => {}}
        canPlay={true}
        isValidPlay={true}
        trumpInfo={mockTrumpInfo}
        showTrickResult={false}  // Not showing trick result
        lastCompletedTrick={null}  // No completed trick
        thinkingDots={mockThinkingDots}
        currentPlayerIndex={humanPlayerIndex}
        winningPlayerIndex={undefined}  // No winner yet
        currentTrick={mockCurrentTrick}  // Active trick
      />
    );

    // The thinking indicator SHOULD be visible during normal turns
    expect(queryByTestId('thinking-indicator')).toBeTruthy();
  });

  it('should not show thinking indicator when showing trick result', () => {
    const humanPlayerIndex = 0;
    
    const { queryByTestId } = render(
      <HumanPlayerView
        player={mockPlayer}
        isCurrentPlayer={true}
        isDefending={false}
        selectedCards={[]}
        onCardSelect={() => {}}
        onPlayCards={() => {}}
        canPlay={true}
        isValidPlay={true}
        trumpInfo={mockTrumpInfo}
        showTrickResult={true}  // Showing trick result
        lastCompletedTrick={null}
        thinkingDots={mockThinkingDots}
        currentPlayerIndex={humanPlayerIndex}
        winningPlayerIndex={humanPlayerIndex}
        currentTrick={null}
      />
    );

    // The thinking indicator should NOT be visible when showing trick results
    expect(queryByTestId('thinking-indicator')).toBeNull();
  });

  it('should handle edge case where human leads new trick after winning', () => {
    // Scenario where human won last trick and is now leading new trick
    const humanPlayerIndex = 0;
    
    const { queryByTestId } = render(
      <HumanPlayerView
        player={mockPlayer}
        isCurrentPlayer={true}  // Human's turn
        isDefending={false}
        selectedCards={[]}
        onCardSelect={() => {}}
        onPlayCards={() => {}}
        canPlay={true}
        isValidPlay={true}
        trumpInfo={mockTrumpInfo}
        showTrickResult={false}  
        lastCompletedTrick={null}  
        thinkingDots={mockThinkingDots}
        currentPlayerIndex={humanPlayerIndex}
        winningPlayerIndex={humanPlayerIndex}  // Human is winner
        currentTrick={null}  // No current trick - leading new trick
      />
    );

    // When leading a new trick after winning, thinking indicator SHOULD show
    expect(queryByTestId('thinking-indicator')).toBeTruthy();
  });

  it('should handle transitions correctly', () => {
    const humanPlayerIndex = 0;
    const aiPlayerIndex = 1;
    
    const { rerender, queryByTestId } = render(
      <HumanPlayerView
        player={mockPlayer}
        isCurrentPlayer={false}  // Not human's turn initially
        isDefending={false}
        selectedCards={[]}
        onCardSelect={() => {}}
        onPlayCards={() => {}}
        canPlay={false}
        isValidPlay={true}
        trumpInfo={mockTrumpInfo}
        showTrickResult={false}
        lastCompletedTrick={null}
        thinkingDots={mockThinkingDots}
        currentPlayerIndex={aiPlayerIndex}
        winningPlayerIndex={undefined}
        currentTrick={mockCurrentTrick}
      />
    );

    // Initially not human's turn - no indicator
    expect(queryByTestId('thinking-indicator')).toBeNull();

    // Human wins trick - both indices update simultaneously
    // This is the problematic moment where the flash occurs
    rerender(
      <HumanPlayerView
        player={mockPlayer}
        isCurrentPlayer={true}  // Human is now current
        isDefending={false}
        selectedCards={[]}
        onCardSelect={() => {}}
        onPlayCards={() => {}}
        canPlay={false}  // Can't play yet during transition
        isValidPlay={true}
        trumpInfo={mockTrumpInfo}
        showTrickResult={false}  // Not showing result YET
        lastCompletedTrick={null}  // Not set YET
        thinkingDots={mockThinkingDots}
        currentPlayerIndex={humanPlayerIndex}  // Human is current
        winningPlayerIndex={humanPlayerIndex}  // Human won
        currentTrick={mockCurrentTrick}  // Trick still exists
      />
    );

    // With the fix, no indicator should show during this gap
    expect(queryByTestId('thinking-indicator')).toBeNull();

    // After transition completes and trick is cleared
    rerender(
      <HumanPlayerView
        player={mockPlayer}
        isCurrentPlayer={true}  // Still human's turn
        isDefending={false}
        selectedCards={[]}
        onCardSelect={() => {}}
        onPlayCards={() => {}}
        canPlay={true}  // Can play now
        isValidPlay={true}
        trumpInfo={mockTrumpInfo}
        showTrickResult={false}  // Not showing result
        lastCompletedTrick={null}  // Cleared
        thinkingDots={mockThinkingDots}
        currentPlayerIndex={humanPlayerIndex}
        winningPlayerIndex={humanPlayerIndex}  // Still the winner
        currentTrick={null}  // Trick cleared - starting new trick
      />
    );

    // Now the indicator should show for the real turn
    expect(queryByTestId('thinking-indicator')).toBeTruthy();
  });
});