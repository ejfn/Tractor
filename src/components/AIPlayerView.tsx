import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import CardBack from './CardBack';
import ThinkingIndicator from './ThinkingIndicator';
import { Player, Trick } from '../types/game';

interface AIPlayerViewProps {
  position: 'top' | 'left' | 'right';
  player: Player;
  isDefending: boolean;
  isCurrentPlayer: boolean;
  waitingForAI: boolean;
  showTrickResult: boolean;
  lastCompletedTrick: Trick | null;
  thinkingDots: {
    dot1: Animated.Value;
    dot2: Animated.Value;
    dot3: Animated.Value;
  };
}

/**
 * Component that renders an AI player's area including cards and status
 */
const AIPlayerView: React.FC<AIPlayerViewProps> = ({
  position,
  player,
  isDefending,
  isCurrentPlayer,
  waitingForAI,
  showTrickResult,
  lastCompletedTrick,
  thinkingDots
}) => {
  // Determine the container styles based on position
  const containerStyles = {
    top: styles.topArea,
    left: styles.leftArea,
    right: styles.rightArea
  }[position];

  // Determine card container layout
  const stackContainerStyle = position === 'top' ? 
    styles.cardStackContainer : 
    [styles.cardStackContainer, { flexDirection: 'column' as const, marginTop: 10 }];

  // Determine card layout direction
  const cardsLayoutStyle = {
    top: { flexDirection: 'row-reverse' as const },
    left: { flexDirection: 'column-reverse' as const },
    right: { flexDirection: 'column' as const }
  }[position];

  // Get CSS class name for card container
  const cardsContainerClass = position === 'top' ? styles.botCardsRow : styles.botCardsColumn;

  // Get card styling function based on position
  const getCardStyle = (index: number) => {
    switch (position) {
      case 'top':
        return {
          marginLeft: index < 9 ? -44 : 0,
          transform: [{ rotate: '0deg' }]
        };
      case 'left':
        return {
          marginTop: index < 9 ? -40 : 0,
          transform: [{ rotate: '270deg' }]
        };
      case 'right':
        return {
          marginBottom: index < 9 ? -40 : 0,
          transform: [{ rotate: '90deg' }]
        };
    }
  };

  // Label style with the team color
  const labelStyle = [
    styles.labelContainer,
    isDefending ? styles.teamALabel : styles.teamBLabel
  ];
  
  // Add extra spacing for top player label
  if (position === 'top') {
    labelStyle.push(styles.topPlayerLabel as any);
  }

  // Get player label based on position
  const playerLabel = {
    top: 'Bot 2',
    left: 'Bot 1',
    right: 'Bot 3'
  }[position];

  // Determine whether to show thinking indicator
  // Double-check that we're not showing thinking during trick result display
  // This provides an extra layer of protection against timing issues
  const showThinking = waitingForAI && !showTrickResult && !lastCompletedTrick;

  return (
    <View style={containerStyles}>
      <View style={labelStyle}>
        <Text style={styles.playerLabel}>{playerLabel}</Text>
        <ThinkingIndicator 
          visible={showThinking}
          dots={thinkingDots}
        />
      </View>
      <View style={stackContainerStyle}>
        <View style={[cardsContainerClass, cardsLayoutStyle]}>
          {[...Array(Math.min(10, player.hand.length))].map((_, i) => (
            <View
              key={`${position}-card-${i}`}
              style={[
                styles.botCardSmall,
                getCardStyle(i)
              ]}
            >
              <CardBack />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  topArea: {
    width: '100%',
    height: 110,
    marginTop: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftArea: {
    width: 100,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightArea: {
    width: 100,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelContainer: {
    height: 26,
    minWidth: 75,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,  // Increased from 3 to 10
    paddingHorizontal: 14,
    borderWidth: 0.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
    position: 'relative',
  },
  teamALabel: {
    backgroundColor: 'rgba(46, 125, 50, 0.75)',
    borderColor: '#E8F5E9',
  },
  teamBLabel: {
    backgroundColor: 'rgba(198, 40, 40, 0.75)',
    borderColor: '#FFEBEE',
  },
  topPlayerLabel: {
    marginBottom: 15,
  },
  playerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  cardStackContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,  // Increased from 5 to 8
  },
  botCardsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  botCardsColumn: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  botCardSmall: {
    width: 35,
    height: 49,
    backgroundColor: '#4169E1',
    borderRadius: 3,
    borderWidth: 1,
    borderColor: 'white',
    zIndex: 5,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
});

export default AIPlayerView;