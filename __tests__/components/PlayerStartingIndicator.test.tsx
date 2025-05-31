import React from 'react';
import { render } from '@testing-library/react-native';
import { Animated } from 'react-native';
import HumanPlayerView from '../../src/components/HumanPlayerView';
import AIPlayerView from '../../src/components/AIPlayerView';
import { Suit, Rank, PlayerId, Player, TrumpInfo, PlayerName, TeamId } from "../../src/types";

describe('Player Starting Indicator', () => {
  const createMockPlayer = (id: PlayerId, name: PlayerName): Player => ({
    id,
    name,
    hand: [],
    team: TeamId.A,
    isHuman: id === PlayerId.Human,
  });

  const createMockTrumpInfo = (): TrumpInfo => ({
    trumpRank: Rank.Two,
    trumpSuit: Suit.Spades,
  });

  const createMockThinkingDots = () => ({
    dot1: new Animated.Value(0),
    dot2: new Animated.Value(0),
    dot3: new Animated.Value(0),
  });

  test('HumanPlayerView shows crown when isRoundStartingPlayer is true', () => {
    const mockPlayer = createMockPlayer(PlayerId.Human, PlayerName.Human);
    const mockTrumpInfo = createMockTrumpInfo();
    const mockThinkingDots = createMockThinkingDots();

    const { queryByText } = render(
      <HumanPlayerView
        player={mockPlayer}
        isCurrentPlayer={false}
        isDefending={true}
        selectedCards={[]}
        onCardSelect={jest.fn()}
        onPlayCards={jest.fn()}
        canPlay={false}
        trumpInfo={mockTrumpInfo}
        thinkingDots={mockThinkingDots}
        isRoundStartingPlayer={true}
      />
    );

    // Should show crown emoji
    expect(queryByText('👑')).toBeTruthy();
  });

  test('HumanPlayerView does not show crown when isRoundStartingPlayer is false', () => {
    const mockPlayer = createMockPlayer(PlayerId.Human, PlayerName.Human);
    const mockTrumpInfo = createMockTrumpInfo();
    const mockThinkingDots = createMockThinkingDots();

    const { queryByText } = render(
      <HumanPlayerView
        player={mockPlayer}
        isCurrentPlayer={false}
        isDefending={true}
        selectedCards={[]}
        onCardSelect={jest.fn()}
        onPlayCards={jest.fn()}
        canPlay={false}
        trumpInfo={mockTrumpInfo}
        thinkingDots={mockThinkingDots}
        isRoundStartingPlayer={false}
      />
    );

    // Should not show crown emoji
    expect(queryByText('👑')).toBeFalsy();
  });

  test('AIPlayerView shows crown when isRoundStartingPlayer is true', () => {
    const mockPlayer = createMockPlayer(PlayerId.Bot1, PlayerName.Bot1);
    const mockThinkingDots = createMockThinkingDots();

    const { queryByText } = render(
      <AIPlayerView
        position="right"
        player={mockPlayer}
        isDefending={true}
        isCurrentPlayer={false}
        waitingForAI={false}
        showTrickResult={false}
        lastCompletedTrick={null}
        thinkingDots={mockThinkingDots}
        isRoundStartingPlayer={true}
      />
    );

    // Should show crown emoji
    expect(queryByText('👑')).toBeTruthy();
  });

  test('AIPlayerView does not show crown when isRoundStartingPlayer is false', () => {
    const mockPlayer = createMockPlayer(PlayerId.Bot1, PlayerName.Bot1);
    const mockThinkingDots = createMockThinkingDots();

    const { queryByText } = render(
      <AIPlayerView
        position="right"
        player={mockPlayer}
        isDefending={true}
        isCurrentPlayer={false}
        waitingForAI={false}
        showTrickResult={false}
        lastCompletedTrick={null}
        thinkingDots={mockThinkingDots}
        isRoundStartingPlayer={false}
      />
    );

    // Should not show crown emoji
    expect(queryByText('👑')).toBeFalsy();
  });

  test('AIPlayerView defaults to not showing crown when prop is undefined', () => {
    const mockPlayer = createMockPlayer(PlayerId.Bot1, PlayerName.Bot1);
    const mockThinkingDots = createMockThinkingDots();

    const { queryByText } = render(
      <AIPlayerView
        position="right"
        player={mockPlayer}
        isDefending={true}
        isCurrentPlayer={false}
        waitingForAI={false}
        showTrickResult={false}
        lastCompletedTrick={null}
        thinkingDots={mockThinkingDots}
        // isRoundStartingPlayer prop omitted - should default to false
      />
    );

    // Should not show crown emoji
    expect(queryByText('👑')).toBeFalsy();
  });
});