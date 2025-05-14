import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import CardBack from './CardBack';
import { Player } from '../types/game';

interface BotPlayerProps {
  position: 'top' | 'left' | 'right';
  player: Player;
  isDefending: boolean;
  isCurrentPlayer: boolean;
  waitingForAI: boolean;
  showTrickResult: boolean;
  lastCompletedTrick: any; // Using any to match the original implementation
  thinkingDots: {
    dot1: Animated.Value;
    dot2: Animated.Value;
    dot3: Animated.Value;
  };
}

/**
 * BotPlayer component renders an AI player's area including their cards and status.
 * This component was extracted from EnhancedGameScreen to improve maintainability.
 */
const BotPlayer: React.FC<BotPlayerProps> = ({
  position,
  player,
  isDefending,
  isCurrentPlayer,
  waitingForAI,
  showTrickResult,
  lastCompletedTrick,
  thinkingDots
}) => {
  // Determine the specific styling based on position
  const getContainerStyle = () => {
    switch (position) {
      case 'top':
        return styles.topArea;
      case 'left':
        return styles.leftArea;
      case 'right':
        return styles.rightArea;
      default:
        return {};
    }
  };

  // Determine card layout based on position
  const getCardLayoutStyle = () => {
    switch (position) {
      case 'top':
        return { flexDirection: 'row-reverse' as const };
      case 'left':
        return { flexDirection: 'column-reverse' as const };
      case 'right':
        return { flexDirection: 'column' as const };
      default:
        return {};
    }
  };

  // Determine card margin and rotation based on position
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
      default:
        return {};
    }
  };

  // Extra styling for the top player label
  const getLabelStyle = () => {
    const baseStyle = [
      styles.labelContainer,
      isDefending ? styles.teamALabel : styles.teamBLabel
    ];

    if (position === 'top') {
      baseStyle.push(styles.topPlayerLabel as any);
    }

    return baseStyle;
  };

  const getPlayerLabel = () => {
    switch (position) {
      case 'top':
        return 'Bot 2';
      case 'left':
        return 'Bot 1';
      case 'right':
        return 'Bot 3';
      default:
        return '';
    }
  };

  // Whether we should show thinking dots
  const showThinking = waitingForAI && 
                     !showTrickResult && 
                     !lastCompletedTrick && 
                     isCurrentPlayer;

  // Special layout for card container based on position
  const getStackContainerStyle = () => {
    if (position === 'top') {
      return styles.cardStackContainer;
    } else {
      return [
        styles.cardStackContainer,
        { flexDirection: 'column' as const, marginTop: 10 }
      ];
    }
  };

  return (
    <View style={getContainerStyle()}>
      <View style={getLabelStyle()}>
        <Text style={styles.playerLabel}>{getPlayerLabel()}</Text>
        {showThinking && (
          <View style={styles.thinkingIndicator}>
            <Animated.View style={[styles.thinkingDot, {opacity: thinkingDots.dot1}]} />
            <Animated.View style={[styles.thinkingDot, {opacity: thinkingDots.dot2}]} />
            <Animated.View style={[styles.thinkingDot, {opacity: thinkingDots.dot3}]} />
          </View>
        )}
      </View>
      <View style={getStackContainerStyle()}>
        <View style={[
          position === 'top' ? styles.botCardsRow : styles.botCardsColumn, 
          getCardLayoutStyle()
        ]}>
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
    marginBottom: 3,
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
  thinkingIndicator: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FFC107',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFD54F',
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
    zIndex: 5,
  },
  thinkingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'white',
    marginHorizontal: 1,
  },
  cardStackContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 5,
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
    zIndex: 5,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
});

export default BotPlayer;