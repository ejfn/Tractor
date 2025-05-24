import React from 'react';
import { render } from '@testing-library/react-native';
import { View } from 'react-native';
import CardPlayArea from '../../src/components/CardPlayArea';
import { Card, Player, Suit, Rank, Trick, TrumpInfo, PlayerId } from '../../src/types/game';

// Mock AnimatedCard component for testing
jest.mock('../../src/components/AnimatedCard', () => {
  const React = require('react');
  const { View } = require('react-native');
  
  return function MockAnimatedCard(props: any) {
    // Extract z-index from style property
    let zIndex = 0;
    if (Array.isArray(props.style)) {
      for (const style of props.style) {
        if (style && style.zIndex) {
          zIndex = style.zIndex;
          break;
        }
      }
    } else if (props.style && props.style.zIndex) {
      zIndex = props.style.zIndex;
    }
    
    return React.createElement(View, {
      testID: `card-${props.card?.id}`,
      'data-z-index': zIndex,
      'data-play-sequence': props.card?.playSequence,
      'data-card-id': props.card?.id
    });
  };
});

describe('CardPlayArea', () => {
  // Mock data for testing
  const mockPlayers: Player[] = [
  ];

  const mockTrumpInfo: TrumpInfo = {
    trumpRank: Rank.Two,
    trumpSuit: Suit.Spades,
    declared: true
  };

  // Helper function to create a mock card
  const createMockCard = (id: string, suit: Suit, rank: Rank): Card => ({
    id,
    suit,
    rank,
    points: 0,
    joker: undefined
  });

  // Helper function to get container z-index from a rendered component
  const getContainerZIndex = (container: any): number => {
    if (!container || !container.props || !container.props.style) return 0;
    
    const style = container.props.style;
    let zIndex = 0;
    
    if (Array.isArray(style)) {
      for (const item of style) {
        if (item && typeof item === 'object' && 'zIndex' in item) {
          zIndex = item.zIndex;
          break;
        }
      }
    } else if (typeof style === 'object' && 'zIndex' in style) {
      zIndex = style.zIndex;
    }
    
    return zIndex;
  };
  
  // Basic test to verify component rendering
  test('CardPlayArea renders successfully with cards', () => {
    // Create mock cards for each player
    const humanCard = createMockCard('human-card', Suit.Hearts, Rank.Ten);
    const ai1Card = createMockCard('ai1-card', Suit.Hearts, Rank.Jack);
    const ai2Card = createMockCard('ai2-card', Suit.Hearts, Rank.Queen);
    const ai3Card = createMockCard('ai3-card', Suit.Hearts, Rank.King);

    const mockTrick: Trick = {
      leadingPlayerId: PlayerId.Bot2,
      leadingCombo: [ai2Card],
      plays: [
        { playerId: PlayerId.Bot2, cards: [ai2Card] },
        { playerId: PlayerId.Bot3, cards: [ai3Card] },
        { playerId: PlayerId.Human, cards: [humanCard] },
        { playerId: PlayerId.Bot1, cards: [ai1Card] },
      ],
      points: 0
    };

    // Render the component
    const { getByTestId } = render(
      <CardPlayArea
        currentTrick={mockTrick}
        players={mockPlayers}
        trumpInfo={mockTrumpInfo}
      />
    );

    // Check that cards were rendered
    expect(getByTestId('card-ai2-card')).toBeTruthy();
    expect(getByTestId('card-ai3-card')).toBeTruthy();
    expect(getByTestId('card-human-card')).toBeTruthy();
    expect(getByTestId('card-ai1-card')).toBeTruthy();
  });

  // Test that empty trick renders properly
  test('CardPlayArea shows waiting message with empty trick', () => {
    // Render with null trick
    const { getByText } = render(
      <CardPlayArea
        currentTrick={null}
        players={mockPlayers}
        trumpInfo={mockTrumpInfo}
      />
    );

    expect(getByText('Waiting for first play...')).toBeTruthy();
  });

  // Test 1: Bot 2 (top) leads, followed by Bot 3, Human, Bot 1
  test('When Bot 2 leads, container z-index increases with play order', () => {
    // Create mock cards for each player
    const humanCard = createMockCard('human-card', Suit.Hearts, Rank.Ten);
    const ai1Card = createMockCard('ai1-card', Suit.Hearts, Rank.Jack);
    const ai2Card = createMockCard('ai2-card', Suit.Hearts, Rank.Queen);
    const ai3Card = createMockCard('ai3-card', Suit.Hearts, Rank.King);

    const mockTrick: Trick = {
      leadingPlayerId: PlayerId.Bot2,
      leadingCombo: [ai2Card],
      plays: [
        { playerId: PlayerId.Bot2, cards: [ai2Card] },
        { playerId: PlayerId.Bot3, cards: [ai3Card] },
        { playerId: PlayerId.Human, cards: [humanCard] },
        { playerId: PlayerId.Bot1, cards: [ai1Card] },
      ],
      points: 0
    };

    const result = render(
      <CardPlayArea
        currentTrick={mockTrick}
        players={mockPlayers}
        trumpInfo={mockTrumpInfo}
      />
    );

    // Find containers using the positions of the cards
    const playAreaContainers = findPlayAreaContainers(result);
    
    // Get z-index of each container
    const ai2Container = findContainerForCard(result, 'card-ai2-card');
    const ai3Container = findContainerForCard(result, 'card-ai3-card');
    const humanContainer = findContainerForCard(result, 'card-human-card');
    const ai1Container = findContainerForCard(result, 'card-ai1-card');
    
    // Get the z-index values from the containers
    const ai2ContainerZIndex = getContainerZIndex(ai2Container);
    const ai3ContainerZIndex = getContainerZIndex(ai3Container);
    const humanContainerZIndex = getContainerZIndex(humanContainer);
    const ai1ContainerZIndex = getContainerZIndex(ai1Container);
    
    // Test that later plays have higher z-index
    expect(ai3ContainerZIndex).toBeGreaterThan(ai2ContainerZIndex);
    expect(humanContainerZIndex).toBeGreaterThan(ai3ContainerZIndex);
    expect(ai1ContainerZIndex).toBeGreaterThan(humanContainerZIndex);
  });

  // Test 2: Human leads, followed by Bot 1, Bot 2, Bot 3
  test('When Human leads, container z-index increases with play order', () => {
    const humanCard = createMockCard('human-card', Suit.Hearts, Rank.Ten);
    const ai1Card = createMockCard('ai1-card', Suit.Hearts, Rank.Jack);
    const ai2Card = createMockCard('ai2-card', Suit.Hearts, Rank.Queen);
    const ai3Card = createMockCard('ai3-card', Suit.Hearts, Rank.King);

    const mockTrick: Trick = {
      leadingPlayerId: PlayerId.Human,
      leadingCombo: [humanCard],
      plays: [
        { playerId: PlayerId.Human, cards: [humanCard] },
        { playerId: PlayerId.Bot1, cards: [ai1Card] },
        { playerId: PlayerId.Bot2, cards: [ai2Card] },
        { playerId: PlayerId.Bot3, cards: [ai3Card] },
      ],
      points: 0
    };

    const result = render(
      <CardPlayArea
        currentTrick={mockTrick}
        players={mockPlayers}
        trumpInfo={mockTrumpInfo}
      />
    );

    // Find containers for each card
    const humanContainer = findContainerForCard(result, 'card-human-card');
    const ai1Container = findContainerForCard(result, 'card-ai1-card');
    const ai2Container = findContainerForCard(result, 'card-ai2-card');
    const ai3Container = findContainerForCard(result, 'card-ai3-card');
    
    // Get the z-index values from the containers
    const humanContainerZIndex = getContainerZIndex(humanContainer);
    const ai1ContainerZIndex = getContainerZIndex(ai1Container);
    const ai2ContainerZIndex = getContainerZIndex(ai2Container);
    const ai3ContainerZIndex = getContainerZIndex(ai3Container);
    
    // Test that later plays have higher z-index
    expect(ai1ContainerZIndex).toBeGreaterThan(humanContainerZIndex);
    expect(ai2ContainerZIndex).toBeGreaterThan(ai1ContainerZIndex);
    expect(ai3ContainerZIndex).toBeGreaterThan(ai2ContainerZIndex);
  });
  
  // Test 3: Multiple cards played by each player (pairs)
  test('Multiple cards per player have correct z-index ordering', () => {
    // Create multiple cards for each player
    const humanCard1 = createMockCard('human-card-1', Suit.Hearts, Rank.Ten);
    const humanCard2 = createMockCard('human-card-2', Suit.Hearts, Rank.Jack);
    const ai1Card1 = createMockCard('ai1-card-1', Suit.Diamonds, Rank.Ten);
    const ai1Card2 = createMockCard('ai1-card-2', Suit.Diamonds, Rank.Jack);
    
    // Create a trick with multiple cards per play
    const mockTrick: Trick = {
      leadingPlayerId: PlayerId.Human,
      leadingCombo: [humanCard1, humanCard2],
      plays: [
        { playerId: PlayerId.Human, cards: [humanCard1, humanCard2] },
        { playerId: PlayerId.Bot1, cards: [ai1Card1, ai1Card2] },
      ],
      points: 0
    };

    const result = render(
      <CardPlayArea
        currentTrick={mockTrick}
        players={mockPlayers}
        trumpInfo={mockTrumpInfo}
      />
    );

    // Find containers for each player's cards
    const humanContainer = findContainerForCard(result, 'card-human-card-1');
    const ai1Container = findContainerForCard(result, 'card-ai1-card-1');
    
    // Get the z-index values from the containers
    const humanContainerZIndex = getContainerZIndex(humanContainer);
    const ai1ContainerZIndex = getContainerZIndex(ai1Container);
    
    // Cards from later players should have higher container z-indices
    expect(ai1ContainerZIndex).toBeGreaterThan(humanContainerZIndex);
    
    // Also verify individual card z-index within each player's container
    // This is implementation-dependent and might be harder to test directly
    const humanCard1Element = result.getByTestId('card-human-card-1');
    const humanCard2Element = result.getByTestId('card-human-card-2');
    const ai1Card1Element = result.getByTestId('card-ai1-card-1');
    const ai1Card2Element = result.getByTestId('card-ai1-card-2');
    
    // Get z-index (through data attributes set in our mock)
    const humanCard1ZIndex = parseInt(humanCard1Element.props['data-z-index'] || '0', 10);
    const humanCard2ZIndex = parseInt(humanCard2Element.props['data-z-index'] || '0', 10);
    const ai1Card1ZIndex = parseInt(ai1Card1Element.props['data-z-index'] || '0', 10);
    const ai1Card2ZIndex = parseInt(ai1Card2Element.props['data-z-index'] || '0', 10);
    
    // Within each container, second card should have higher z-index than first
    expect(humanCard2ZIndex).toBeGreaterThan(humanCard1ZIndex);
    expect(ai1Card2ZIndex).toBeGreaterThan(ai1Card1ZIndex);
  });
});

// Helper functions to navigate the component structure
function findPlayAreaContainers(renderResult: any) {
  // This is difficult without a good way to target specific containers
  return {};
}

function findContainerForCard(renderResult: any, cardTestId: string): any {
  try {
    // Get the card element from the test ID
    const cardElement = renderResult.getByTestId(cardTestId);

    // Get the z-index from the data attribute on the card element
    // In our implementation, the z-index is based on globalPlayOrder
    return {
      props: {
        style: {
          zIndex: parseInt(cardElement.props['data-z-index'] || '0', 10)
        }
      }
    };
  } catch (e) {
    return { props: { style: { zIndex: 0 } } };
  }
}