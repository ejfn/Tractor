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
  trumpDeclarationMode?: boolean;
  onSkipTrumpDeclaration?: () => void;
  onConfirmTrumpDeclaration?: () => void;
  showTrickResult?: boolean;
  lastCompletedTrick?: any;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const HumanHandAnimated: React.FC<HumanHandAnimatedProps> = ({
  player,
  isCurrentPlayer,
  selectedCards,
  onCardSelect,
  onPlayCards,
  trumpInfo,
  canPlay = false,
  trumpDeclarationMode = false,
  onSkipTrumpDeclaration,
  onConfirmTrumpDeclaration,
  showTrickResult = false,
  lastCompletedTrick = null
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

  // Don't filter cards - show full hand even in trump declaration mode
  const displayHand = sortedHand;
  
  // Check if card is selectable in trump declaration mode
  const isCardSelectableForTrump = (card: CardType) => {
    return trumpDeclarationMode ? card.rank === trumpInfo.trumpRank : true;
  };
    

  // Constants for card layout
  const cardWidth = 65;
  const cardOverlap = 40;
  const visibleCardWidth = cardWidth - cardOverlap;

  // Calculate total width and scrolling needs
  const totalCardsWidth = cardWidth + (displayHand.length - 1) * visibleCardWidth;
  const availableWidth = SCREEN_WIDTH - 40;
  const needsScrolling = totalCardsWidth > availableWidth;

  return (
    <View style={styles.container} testID="player-hand-animated">
      <View style={styles.handContainer}>
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
            {displayHand.map((card, index) => (
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
                  onSelect={isCurrentPlayer && isCardSelectableForTrump(card) && !showTrickResult && !lastCompletedTrick ? onCardSelect : undefined}
                  selected={isCardSelected(card)}
                  faceDown={false}
                  isTrump={isTrump(card, trumpInfo)}
                  delay={index * 30}
                  disabled={trumpDeclarationMode && !isCardSelectableForTrump(card)}
                />
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
      
      {trumpDeclarationMode && (
        <View style={styles.trumpDeclareSimple}>
          <Text style={styles.trumpDeclareText}>
            Select a {trumpInfo.trumpRank} to declare trump
          </Text>
          <View style={styles.buttonRow}>
            {selectedCards.length > 0 && onConfirmTrumpDeclaration && (
              <TouchableOpacity
                style={styles.confirmButtonSimple}
                onPress={onConfirmTrumpDeclaration}
              >
                <Text style={styles.buttonText}>OK</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.skipButtonSimple}
              onPress={onSkipTrumpDeclaration}
            >
              <Text style={styles.buttonText}>Skip</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      
      {!trumpDeclarationMode && canPlay && selectedCards.length > 0 && onPlayCards && (
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
    width: '100%',
    height: '100%',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    backgroundColor: 'transparent',
  },
  handContainer: {
    height: 140,
    width: '100%',
    paddingHorizontal: 4,
    marginTop: 10,
  },
  scrollViewStyle: {
    width: '100%',
    height: 140,
    backgroundColor: 'transparent',
  },
  scrollViewContent: {
    minWidth: '100%',
    paddingTop: 35,
    paddingBottom: 20,
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
    paddingVertical: 12,
    paddingHorizontal: 20,
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
  trumpDeclareSimple: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignItems: 'center',
  },
  trumpDeclareText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  buttonRow: {
    flexDirection: 'row',
  },
  confirmButtonSimple: {
    backgroundColor: '#3F51B5',
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 20,
    marginRight: 10,
  },
  skipButtonSimple: {
    backgroundColor: '#6C757D',
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 20,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default HumanHandAnimated;