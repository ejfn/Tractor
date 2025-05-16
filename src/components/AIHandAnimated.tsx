import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Player, TrumpInfo } from '../types/game';
import { isTrump } from '../utils/gameLogic';
import AnimatedCardComponent from './AnimatedCard';

interface AIHandAnimatedProps {
  player: Player;
  trumpInfo: TrumpInfo;
  isCurrentPlayer: boolean;
  position: 'top' | 'left' | 'right';
}

const AIHandAnimated: React.FC<AIHandAnimatedProps> = ({
  player,
  trumpInfo,
  isCurrentPlayer,
  position
}) => {
  // Sort cards similar to human hand for consistency
  const sortedHand = [...player.hand].sort((a, b) => {
    // Jokers first
    if (a.joker && b.joker) {
      return a.joker === 'Big' ? -1 : 1;
    }
    if (a.joker && !b.joker) return -1;
    if (!a.joker && b.joker) return 1;

    // Trump cards next
    const aIsTrump = isTrump(a, trumpInfo);
    const bIsTrump = isTrump(b, trumpInfo);

    if (aIsTrump && !bIsTrump) return -1;
    if (!aIsTrump && bIsTrump) return 1;

    // Sort by suit and rank
    if (a.suit && b.suit && a.suit !== b.suit) {
      const suitOrder = { 'Spades': 0, 'Hearts': 1, 'Clubs': 2, 'Diamonds': 3 };
      return suitOrder[a.suit] - suitOrder[b.suit];
    }

    if (a.rank && b.rank) {
      const rankOrder = {
        '2': 0, '3': 1, '4': 2, '5': 3, '6': 4, '7': 5, '8': 6, '9': 7,
        '10': 8, 'J': 9, 'Q': 10, 'K': 11, 'A': 12
      };
      return rankOrder[b.rank] - rankOrder[a.rank];
    }

    return 0;
  });

  const containerStyle = {
    top: styles.topAiContainer,
    left: styles.leftAiContainer,
    right: styles.rightAiContainer,
  }[position];

  const nameContainerStyle = {
    top: styles.topPlayerName,
    left: styles.leftPlayerName,
    right: styles.rightPlayerName,
  }[position];

  const handContainerStyle = {
    top: styles.topHandContainer,
    left: styles.leftHandContainer,
    right: styles.rightHandContainer,
  }[position];

  return (
    <View style={containerStyle}>
      <View style={[styles.playerNameContainer, nameContainerStyle]}>
        <Text style={styles.playerName}>
          {player.name} {isCurrentPlayer ? '⭐' : ''}
        </Text>
      </View>
      
      <View style={[styles.aiHandContainer, handContainerStyle]}>
        {sortedHand.slice(0, Math.min(7, sortedHand.length)).map((card, index) => {
          const viewStyle: any = {
            position: 'absolute',
            zIndex: 10 - index,
            width: 24,
            height: 35,
            backgroundColor: 'transparent',
            backfaceVisibility: 'hidden',
            shadowOpacity: 0,
          };

          if (position === 'top') {
            Object.assign(viewStyle, {
              transform: [{ rotate: '180deg' }],
              top: 40,
              left: 50 + (index * 12),
            });
          } else if (position === 'left') {
            Object.assign(viewStyle, {
              transform: [{ rotate: '90deg' }],
              top: 5 + (index * 12),
              left: 15,
            });
          } else if (position === 'right') {
            Object.assign(viewStyle, {
              transform: [{ rotate: '270deg' }],
              top: 5 + (index * 12),
              right: 15,
            });
          }

          return (
            <View
              key={`${card.id}-container`}
              style={viewStyle}
              shouldRasterizeIOS={true}
              renderToHardwareTextureAndroid={true}
            >
              <AnimatedCardComponent
                key={card.id}
                card={card}
                faceDown={false}
                isTrump={isTrump(card, trumpInfo)}
                delay={index * 20}
              />
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  topAiContainer: {
    width: '70%',
    alignSelf: 'center',
    paddingTop: 15,
  },
  leftAiContainer: {
    width: 60,
    alignSelf: 'center',
    paddingTop: 30,
    minHeight: 200,
  },
  rightAiContainer: {
    width: 60,
    alignSelf: 'center',
    paddingTop: 30,
    minHeight: 200,
  },
  playerNameContainer: {
    zIndex: 50,
    alignItems: 'center',
    width: '100%',
    marginBottom: 5,
  },
  topPlayerName: {
    alignItems: 'center',
    marginBottom: 10,
  },
  leftPlayerName: {
    alignItems: 'center',
    marginBottom: 8,
  },
  rightPlayerName: {
    alignItems: 'center',
    marginBottom: 8,
  },
  playerName: {
    fontSize: 12,
    fontWeight: 'bold',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    color: 'white',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: 'hidden',
    textAlign: 'center',
    minWidth: 70,
    marginBottom: 8,
  },
  aiHandContainer: {
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  topHandContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  leftHandContainer: {
    width: '100%',
    height: 150,
    position: 'relative',
  },
  rightHandContainer: {
    width: '100%',
    height: 150,
    position: 'relative',
  },
});

export default AIHandAnimated;