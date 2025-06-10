import React from 'react';
import { render } from '@testing-library/react-native';
import HumanPlayerView from '../../src/components/HumanPlayerView';
import { Card, Suit, Rank, Player, TrumpInfo, PlayerId, PlayerName, TeamId, GamePhase } from "../../src/types";
import { Animated } from 'react-native';

// Mock the ThinkingIndicator to easily check if it's rendered
jest.mock('../../src/components/ThinkingIndicator', () => ({
  __esModule: true,
  default: ({ visible }: { visible: boolean }) => {
    const View = require('react-native').View;
    const Text = require('react-native').Text;
    return visible ? <View testID="thinking-indicator-visible"><Text>ThinkingIndicator</Text></View> : null;
  }
}));

// Mock the HumanHandAnimated component
jest.mock('../../src/components/HumanHandAnimated', () => ({
  __esModule: true,
  default: () => null
}));

const mockPlayer: Player = {
  id: PlayerId.Human,
  name: PlayerName.Human,
  hand: [],
  isHuman: true,
  team: TeamId.A,
};

const mockTrumpInfo: TrumpInfo = {
  trumpRank: Rank.Two,
  trumpSuit: Suit.Hearts
};

const mockThinkingDots = {
  dot1: new Animated.Value(0),
  dot2: new Animated.Value(0),
  dot3: new Animated.Value(0)
};

const mockCurrentTrickHumanWon = { 
  leadingPlayerId: PlayerId.Bot1,
  leadingCombo: [],
  plays: [
    { playerId: PlayerId.Bot2, cards: [] },
    { playerId: PlayerId.Bot3, cards: [] },
    { playerId: PlayerId.Human, cards: [] }
  ],
  points: 10,
  winningPlayerId: PlayerId.Human // Human won this trick
};

const mockCurrentTrickOngoing = { 
  leadingPlayerId: PlayerId.Bot1,
  leadingCombo: [],
  plays: [
    { playerId: PlayerId.Bot2, cards: [] }
  ],
  points: 5,
  winningPlayerId: PlayerId.Bot2 // Bot2 currently winning, trick is still ongoing
};

describe('Human Thinking Indicator Flash Fix', () => {
  it('should not show thinking indicator when human just won a trick', () => {
    // Test the specific scenario where the human wins a trick
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
        lastCompletedTrick={undefined}  // No completed trick yet
        thinkingDots={mockThinkingDots}
        currentPlayerIndex={humanPlayerIndex}
        currentTrick={mockCurrentTrickHumanWon}  // Trick still exists with human as winner
      />
    );

    // The thinking indicator should NOT be visible in this scenario
    expect(queryByTestId('thinking-indicator-visible')).toBeNull();
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
        lastCompletedTrick={undefined}  // No completed trick
        thinkingDots={mockThinkingDots}
        currentPlayerIndex={humanPlayerIndex}
        currentTrick={mockCurrentTrickOngoing}  // Active trick without human winning yet
        gamePhase={GamePhase.Playing}
      />
    );

    // The thinking indicator SHOULD be visible during normal turns
    expect(queryByTestId('thinking-indicator-visible')).toBeTruthy();
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
        lastCompletedTrick={undefined}
        thinkingDots={mockThinkingDots}
        currentPlayerIndex={humanPlayerIndex}
        currentTrick={undefined}
      />
    );

    // The thinking indicator should NOT be visible when showing trick results
    expect(queryByTestId('thinking-indicator-visible')).toBeNull();
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
        lastCompletedTrick={undefined}  
        thinkingDots={mockThinkingDots}
        currentPlayerIndex={humanPlayerIndex}
        currentTrick={undefined}  // No current trick - leading new trick
        gamePhase={GamePhase.Playing}
      />
    );

    // When leading a new trick after winning, thinking indicator SHOULD show
    expect(queryByTestId('thinking-indicator-visible')).toBeTruthy();
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
        lastCompletedTrick={undefined}
        thinkingDots={mockThinkingDots}
        currentPlayerIndex={aiPlayerIndex}
        currentTrick={mockCurrentTrickOngoing}  // Ongoing trick, AI's turn initially
        gamePhase={GamePhase.Playing}
      />
    );

    // Initially not human's turn - no indicator
    expect(queryByTestId('thinking-indicator-visible')).toBeNull();

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
        lastCompletedTrick={undefined}  // Not set YET
        thinkingDots={mockThinkingDots}
        currentPlayerIndex={humanPlayerIndex}  // Human is current
        currentTrick={mockCurrentTrickHumanWon}  // Trick still exists with human as winner
        gamePhase={GamePhase.Playing}
      />
    );

    // With the fix, no indicator should show during this gap
    expect(queryByTestId('thinking-indicator-visible')).toBeNull();

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
        lastCompletedTrick={undefined}  // Cleared
        thinkingDots={mockThinkingDots}
        currentPlayerIndex={humanPlayerIndex}
        currentTrick={undefined}  // Trick cleared - starting new trick
        gamePhase={GamePhase.Playing}
      />
    );

    // Now the indicator should show for the real turn
    expect(queryByTestId('thinking-indicator-visible')).toBeTruthy();
  });
});