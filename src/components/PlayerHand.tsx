import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import AnimatedCard from './AnimatedCard';
import { Card as CardType, Player, TrumpInfo } from '../types/game';
import { isTrump } from '../utils/gameLogic';

interface PlayerHandProps {
  player: Player;
  isCurrentPlayer: boolean;
  selectedCards: CardType[];
  onCardSelect?: (card: CardType) => void;
  showCards: boolean;
  trumpInfo: TrumpInfo;
  position: 'bottom' | 'top' | 'left' | 'right';
}

const PlayerHand: React.FC<PlayerHandProps> = ({
  player,
  isCurrentPlayer,
  selectedCards,
  onCardSelect,
  showCards,
  trumpInfo,
  position
}) => {
  // Sort cards by suit and rank for better display
  const sortedHand = [...player.hand].sort((a, b) => {
    // Jokers first
    if (a.joker && !b.joker) return -1;
    if (!a.joker && b.joker) return 1;
    
    // Trump cards next
    const aIsTrump = isTrump(a, trumpInfo);
    const bIsTrump = isTrump(b, trumpInfo);
    
    if (aIsTrump && !bIsTrump) return -1;
    if (!aIsTrump && bIsTrump) return 1;
    
    // Compare suits
    if (a.suit && b.suit && a.suit !== b.suit) {
      const suitOrder = { 'Spades': 0, 'Hearts': 1, 'Clubs': 2, 'Diamonds': 3 };
      return suitOrder[a.suit] - suitOrder[b.suit];
    }
    
    // Compare ranks
    if (a.rank && b.rank) {
      const rankOrder = {
        '2': 0, '3': 1, '4': 2, '5': 3, '6': 4, '7': 5, '8': 6, '9': 7,
        '10': 8, 'J': 9, 'Q': 10, 'K': 11, 'A': 12
      };
      return rankOrder[a.rank] - rankOrder[b.rank];
    }
    
    return 0;
  });

  const isCardSelected = (card: CardType) => {
    return selectedCards.some(c => c.id === card.id);
  };

  const renderHumanHand = () => {
    return (
      <View style={styles.humanHandContainer}>
        <View style={styles.humanCardRow}>
          {sortedHand.map((card, index) => (
            <View
              key={card.id}
              style={[
                styles.humanCardContainer,
                {
                  marginLeft: index === 0 ? 0 : -40, // Tighter stacking
                  zIndex: 1000 - index, // Consistent z-index based on card order
                }
              ]}
            >
              <AnimatedCard
                card={card}
                onSelect={isCurrentPlayer ? onCardSelect : undefined}
                selected={isCardSelected(card)}
                faceDown={!showCards}
                isTrump={isTrump(card, trumpInfo)}
                delay={index * 30} // Faster staggered animation
              />
            </View>
          ))}
        </View>
      </View>
    );
  };

  // Calculate styles based on position
  const getAICardStyles = (index: number) => {
    const baseStyles = {
      position: 'absolute' as const,
      width: 24,
      height: 35,
      backgroundColor: 'transparent',
      zIndex: 100 - index,
    };

    switch(position) {
      case 'top':
        return {
          ...baseStyles,
          left: `${40 + index * 8}%`,
          top: 15,
          transform: [{ rotate: '180deg' }],
        };
      case 'left':
        return {
          ...baseStyles,
          top: `${25 + index * 8}%`,
          left: 15,
          transform: [{ rotate: '90deg' }],
        };
      case 'right':
        return {
          ...baseStyles,
          top: `${25 + index * 8}%`,
          right: 15,
          transform: [{ rotate: '270deg' }],
        };
      default:
        return baseStyles;
    }
  };

  const renderAIHand = () => {
    const displayedCards = sortedHand.slice(0, Math.min(7, sortedHand.length));
    
    return (
      <View style={[styles.aiHandContainer]}>
        <View style={styles.playerLabelContainer}>
          <Text style={styles.playerLabel}>
            {player.name} {isCurrentPlayer ? '⭐' : ''}
            {player.hand.length > 0 ? ` (${player.hand.length})` : ''}
          </Text>
        </View>

        {displayedCards.map((card, index) => {
          const cardStyle = getAICardStyles(index);
          // TypeScript workaround for style type
          return (
            <View
              key={card.id}
              style={cardStyle as any}
            >
              <AnimatedCard
                card={card}
                faceDown={!showCards}
                isTrump={isTrump(card, trumpInfo)}
                delay={index * 20}
                scale={0.4} // Smaller scale for AI cards
              />
            </View>
          );
        })}
      </View>
    );
  };

  if (position === 'bottom') {
    return renderHumanHand();
  } else {
    return renderAIHand();
  }
};

const styles = StyleSheet.create({
  humanHandContainer: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 5,
  },
  humanCardRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    minHeight: 95,
    marginBottom: 10,
  },
  humanCardContainer: {
    height: 95,
    width: 65,
  },
  aiHandContainer: {
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  playerLabelContainer: {
    position: 'absolute',
    top: -25,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 200,
  },
  playerLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: 'hidden',
    textAlign: 'center',
  },
});

export default PlayerHand;