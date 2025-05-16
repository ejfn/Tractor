import React from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Card as CardType, Player, TrumpInfo } from '../types/game';
import { isTrump } from '../utils/gameLogic';
import AnimatedCardComponent from './AnimatedCard';

interface HumanHandAnimatedProps {
  player: Player;
  isCurrentPlayer: boolean;
  selectedCards: CardType[];
  onCardSelect?: (card: CardType) => void;
  onPlayCards?: () => void;
  trumpInfo: TrumpInfo;
  canPlay?: boolean;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const HumanHandAnimated: React.FC<HumanHandAnimatedProps> = ({
  player,
  isCurrentPlayer,
  selectedCards,
  onCardSelect,
  onPlayCards,
  trumpInfo,
  canPlay = false
}) => {
  // Sort cards by suit and rank for better display
  const sortedHand = [...player.hand].sort((a, b) => {
    // Jokers first, big joker before small joker
    if (a.joker && b.joker) {
      return a.joker === 'Big' ? -1 : 1;
    }
    if (a.joker && !b.joker) return -1;
    if (!a.joker && b.joker) return 1;

    // Trump cards next
    const aIsTrump = isTrump(a, trumpInfo);
    const bIsTrump = isTrump(b, trumpInfo);

    if (aIsTrump && bIsTrump) {
      // Trump rank cards first
      const aIsTrumpRank = a.rank === trumpInfo.trumpRank;
      const bIsTrumpRank = b.rank === trumpInfo.trumpRank;

      if (aIsTrumpRank && !bIsTrumpRank) return -1;
      if (!aIsTrumpRank && bIsTrumpRank) return 1;

      // If both are trump rank, sort by suit
      if (aIsTrumpRank && bIsTrumpRank) {
        if (a.suit && b.suit) {
          if (trumpInfo.declared) {
            if (a.suit === trumpInfo.trumpSuit && b.suit !== trumpInfo.trumpSuit) return -1;
            if (a.suit !== trumpInfo.trumpSuit && b.suit === trumpInfo.trumpSuit) return 1;
          }

          // Sort by rotated suit order
          const standardSuitOrder = ['Spades', 'Hearts', 'Clubs', 'Diamonds'];
          let trumpIndex = -1;
          if (trumpInfo.declared && trumpInfo.trumpSuit) {
            trumpIndex = standardSuitOrder.indexOf(trumpInfo.trumpSuit);
          }

          let rotatedOrder = [...standardSuitOrder];
          if (trumpIndex > 0) {
            rotatedOrder = [
              ...standardSuitOrder.slice(trumpIndex),
              ...standardSuitOrder.slice(0, trumpIndex)
            ];
          }

          const suitOrder: Record<string, number> = {};
          rotatedOrder.forEach((suit, index) => {
            suitOrder[suit] = index;
          });

          return suitOrder[a.suit] - suitOrder[b.suit];
        }
      }

      // Sort by rank (descending)
      if (a.rank && b.rank) {
        const rankOrder = {
          '2': 0, '3': 1, '4': 2, '5': 3, '6': 4, '7': 5, '8': 6, '9': 7,
          '10': 8, 'J': 9, 'Q': 10, 'K': 11, 'A': 12
        };
        return rankOrder[b.rank] - rankOrder[a.rank];
      }
    }

    if (aIsTrump && !bIsTrump) return -1;
    if (!aIsTrump && bIsTrump) return 1;

    // Neither is trump - sort by suit with rotation
    if (a.suit && b.suit && a.suit !== b.suit) {
      const standardSuitOrder = ['Spades', 'Hearts', 'Clubs', 'Diamonds'];
      let trumpIndex = -1;
      if (trumpInfo.declared && trumpInfo.trumpSuit) {
        trumpIndex = standardSuitOrder.indexOf(trumpInfo.trumpSuit);
      }

      let rotatedOrder = [...standardSuitOrder];
      if (trumpIndex > 0) {
        rotatedOrder = [
          ...standardSuitOrder.slice(trumpIndex),
          ...standardSuitOrder.slice(0, trumpIndex)
        ];
      }

      const suitOrder: Record<string, number> = {};
      rotatedOrder.forEach((suit, index) => {
        suitOrder[suit] = index;
      });

      return suitOrder[a.suit] - suitOrder[b.suit];
    }

    // Same suit - sort by rank (descending)
    if (a.rank && b.rank) {
      const rankOrder = {
        '2': 0, '3': 1, '4': 2, '5': 3, '6': 4, '7': 5, '8': 6, '9': 7,
        '10': 8, 'J': 9, 'Q': 10, 'K': 11, 'A': 12
      };
      return rankOrder[b.rank] - rankOrder[a.rank];
    }

    return 0;
  });

  const isCardSelected = (card: CardType) => {
    return selectedCards.some(c => c.id === card.id);
  };

  // Constants for card layout
  const cardWidth = 65;
  const cardOverlap = 40;
  const visibleCardWidth = cardWidth - cardOverlap;

  // Calculate total width and scrolling needs
  const totalCardsWidth = cardWidth + (sortedHand.length - 1) * visibleCardWidth;
  const availableWidth = SCREEN_WIDTH - 40;
  const needsScrolling = totalCardsWidth > availableWidth;

  return (
    <View style={styles.container} testID="player-hand-animated">
      <View style={styles.cardsScrollContainer}>
        <ScrollView
          horizontal={true}
          showsHorizontalScrollIndicator={false}
          style={styles.scrollViewStyle}
          contentContainerStyle={[
            styles.scrollViewContent,
            {
              alignItems: 'center',
              justifyContent: needsScrolling ? 'flex-start' : 'center'
            }
          ]}
          scrollEnabled={true}
        >
          <View style={styles.cardRow}>
            {sortedHand.map((card, index) => (
              <View
                key={card.id}
                style={[
                  styles.cardWrapper,
                  {
                    marginLeft: index === 0 ? 0 : -cardOverlap,
                    zIndex: index
                  }
                ]}
                pointerEvents="box-none"
              >
                <AnimatedCardComponent
                  card={card}
                  onSelect={isCurrentPlayer ? onCardSelect : undefined}
                  selected={isCardSelected(card)}
                  faceDown={false}
                  isTrump={isTrump(card, trumpInfo)}
                  delay={index * 30}
                />
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      {canPlay && selectedCards.length > 0 && onPlayCards && (
        <View style={styles.playButtonContainer}>
          <TouchableOpacity
            style={styles.playButton}
            onPress={onPlayCards}
            hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
          >
            <Text style={styles.playButtonText}>
              {selectedCards.length === 1 ? 'Play 1 Card' : `Play ${selectedCards.length} Cards`}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    paddingHorizontal: 8,
    position: 'relative',
    backgroundColor: 'transparent',
  },
  cardsScrollContainer: {
    width: '100%',
    height: 140,
    backgroundColor: 'transparent',
    position: 'relative',
  },
  scrollViewStyle: {
    width: '100%',
    height: 140,
    backgroundColor: 'transparent',
  },
  scrollViewContent: {
    minWidth: '100%',
    paddingTop: 45,
    paddingBottom: 10,
    paddingHorizontal: 10,
    flexDirection: 'row',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  cardWrapper: {
    height: 95,
    width: 65,
  },
  playButtonContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    zIndex: 100,
  },
  playButton: {
    backgroundColor: '#C62828',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    minWidth: 130,
    maxWidth: 200,
    height: 36,
    marginBottom: 5,
  },
  playButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    flexShrink: 1,
  },
});

export default HumanHandAnimated;