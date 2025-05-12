import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import AnimatedCard from './AnimatedCard';
import { Card as CardType, Player, TrumpInfo } from '../types/game';
import { isTrump } from '../utils/gameLogic';

interface PlayerHandProps {
  player: Player;
  isCurrentPlayer: boolean;
  selectedCards: CardType[];
  onCardSelect?: (card: CardType) => void;
  onPlayCards?: () => void; // Function to handle playing cards
  showCards: boolean;
  trumpInfo: TrumpInfo;
  canPlay?: boolean; // Whether the play button should be shown
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const PlayerHandAnimated: React.FC<PlayerHandProps> = ({
  player,
  isCurrentPlayer,
  selectedCards,
  onCardSelect,
  onPlayCards,
  showCards,
  trumpInfo,
  canPlay = false // Default to false
}) => {
  // Sort cards by suit and rank for better display
  const sortedHand = [...player.hand].sort((a, b) => {
    // Jokers first, big joker before small joker
    if (a.joker && b.joker) {
      return a.joker === 'Big' ? -1 : 1; // Big joker comes first
    }
    if (a.joker && !b.joker) return -1;
    if (!a.joker && b.joker) return 1;

    // Trump cards next (we need to be more specific about trump ordering)
    const aIsTrump = isTrump(a, trumpInfo);
    const bIsTrump = isTrump(b, trumpInfo);

    if (aIsTrump && bIsTrump) {
      // Both are trumps, need more detailed sorting

      // Trump rank cards first (before trump suit cards)
      const aIsTrumpRank = a.rank === trumpInfo.trumpRank;
      const bIsTrumpRank = b.rank === trumpInfo.trumpRank;

      if (aIsTrumpRank && !bIsTrumpRank) return -1;
      if (!aIsTrumpRank && bIsTrumpRank) return 1;

      // If both are trump rank, sort by suit
      if (aIsTrumpRank && bIsTrumpRank) {
        if (a.suit && b.suit) {
          // If one is trump suit, it comes first
          if (trumpInfo.declared) {
            if (a.suit === trumpInfo.trumpSuit && b.suit !== trumpInfo.trumpSuit) return -1;
            if (a.suit !== trumpInfo.trumpSuit && b.suit === trumpInfo.trumpSuit) return 1;
          }

          // Otherwise sort by rotated suit order (maintaining alternating black and red)
          // Define the standard suit order: black-red-black-red (S, H, C, D)
          const standardSuitOrder = ['Spades', 'Hearts', 'Clubs', 'Diamonds'];

          // Find trump suit's position in the standard order
          let trumpIndex = -1;
          if (trumpInfo.declared && trumpInfo.trumpSuit) {
            trumpIndex = standardSuitOrder.indexOf(trumpInfo.trumpSuit);
          }

          // Rotate the order so trump suit is first, maintaining the alternating colors
          let rotatedOrder = [...standardSuitOrder];
          if (trumpIndex > 0) {
            rotatedOrder = [
              ...standardSuitOrder.slice(trumpIndex),
              ...standardSuitOrder.slice(0, trumpIndex)
            ];
          }

          // Create an object mapping each suit to its position in the rotated order
          const suitOrder = {};
          rotatedOrder.forEach((suit, index) => {
            suitOrder[suit] = index;
          });

          return suitOrder[a.suit] - suitOrder[b.suit];
        }
      }

      // If both are just trump suit cards, sort by rank (descending)
      if (a.rank && b.rank) {
        const rankOrder = {
          '2': 0, '3': 1, '4': 2, '5': 3, '6': 4, '7': 5, '8': 6, '9': 7,
          '10': 8, 'J': 9, 'Q': 10, 'K': 11, 'A': 12
        };
        return rankOrder[b.rank] - rankOrder[a.rank]; // Descending order (highest rank first)
      }
    }

    // One is trump, one is not
    if (aIsTrump && !bIsTrump) return -1;
    if (!aIsTrump && bIsTrump) return 1;

    // Neither is trump - maintain alternating black/red pattern with rotation based on trump suit
    if (a.suit && b.suit && a.suit !== b.suit) {
      // Define the standard suit order: black-red-black-red (S, H, C, D)
      const standardSuitOrder = ['Spades', 'Hearts', 'Clubs', 'Diamonds'];

      // Find trump suit's position in the standard order
      let trumpIndex = -1;
      if (trumpInfo.declared && trumpInfo.trumpSuit) {
        trumpIndex = standardSuitOrder.indexOf(trumpInfo.trumpSuit);
      }

      // Rotate the order so trump suit is first, maintaining the alternating colors
      let rotatedOrder = [...standardSuitOrder];
      if (trumpIndex > 0) {
        rotatedOrder = [
          ...standardSuitOrder.slice(trumpIndex),
          ...standardSuitOrder.slice(0, trumpIndex)
        ];
      }

      // Create an object mapping each suit to its position in the rotated order
      const suitOrder = {};
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
      return rankOrder[b.rank] - rankOrder[a.rank]; // Descending order (highest rank first)
    }

    return 0;
  });

  const isCardSelected = (card: CardType) => {
    return selectedCards.some(c => c.id === card.id);
  };

  // Different layout based on player position (human vs AI)
  if (player.isHuman) {
    // Constants for card layout
    const cardWidth = 65; // Width of each card
    const cardOverlap = 40; // How much each card overlaps the previous one
    const visibleCardWidth = cardWidth - cardOverlap; // Visible width of each card (except first)

    // Calculate total width of all cards with overlap
    const totalCardsWidth = cardWidth + (sortedHand.length - 1) * visibleCardWidth;

    // Check if scrolling is needed
    const availableWidth = SCREEN_WIDTH - 40; // Available width minus padding
    const needsScrolling = totalCardsWidth > availableWidth;

    // Human player layout (bottom)
    return (
      <View style={styles.container}>
        <View style={styles.cardsScrollContainer}>
          {/* Scroll indicator removed */}

          {/* ScrollView for horizontal scrolling */}
          <ScrollView
            horizontal={true}
            showsHorizontalScrollIndicator={false}
            style={styles.scrollViewStyle}
            contentContainerStyle={[
              styles.scrollViewContent,
              {
                // When not scrolling, center the content
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
          </ScrollView>
        </View>

        {/* Play button outside card container */}
        {canPlay && selectedCards.length > 0 && onPlayCards && (
          <View style={styles.playButtonContainer}>
            <TouchableOpacity
              style={styles.playButton}
              onPress={onPlayCards}
            >
              <Text style={styles.playButtonText}>
                {selectedCards.length === 1 ? 'Play 1 Card' : `Play ${selectedCards.length} Cards`}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  } else {
    // AI player layout (top, left, right)
    // Determine if this is the top, left, or right player for proper layout
    const isTopPlayer = player.id === 'ai2'; // Player index 2 is the top player
    const isLeftPlayer = player.id === 'ai1'; // Player index 1 is the left player
    const isRightPlayer = player.id === 'ai3'; // Player index 3 is the right player

    return (
      <View style={[
        isTopPlayer && styles.topAiContainer,
        isLeftPlayer && styles.leftAiContainer,
        isRightPlayer && styles.rightAiContainer,
      ]}>
        {/* Position player name above the card stack */}
        <View style={[
          styles.playerNameContainer,
          isTopPlayer && styles.topPlayerName,
          isLeftPlayer && styles.leftPlayerName,
          isRightPlayer && styles.rightPlayerName
        ]}>
          <Text style={styles.playerName}>
            {player.name} {isCurrentPlayer ? '⭐' : ''}
          </Text>
        </View>
        
        {/* Different card layouts based on player position */}
        <View style={[
          styles.aiHandContainer,
          isTopPlayer && styles.topHandContainer,
          isLeftPlayer && styles.leftHandContainer,
          isRightPlayer && styles.rightHandContainer
        ]}>
          {sortedHand.slice(0, Math.min(7, sortedHand.length)).map((card, index) => {
            // Different positioning and rotation based on player position
            const viewStyle = {
              position: 'relative' as 'relative',
              zIndex: 10 - index,
              width: 24, // Even smaller width for bot cards
              height: 35, // Even smaller height for bot cards
              backgroundColor: 'transparent',
              backfaceVisibility: 'hidden' as 'hidden',
              shadowOpacity: 0,
            };

            if (isTopPlayer) {
              // Top player cards are rotated 180 degrees and stacked horizontally
              Object.assign(viewStyle, {
                transform: [{ rotate: '180deg' }],
                position: 'absolute',
                top: 40, // Further increased for more spacing between name and cards
                left: 50 + (index * 12), // Reduced overlap
              });
            } else if (isLeftPlayer) {
              // Left player cards are rotated 90 degrees and stacked vertically
              Object.assign(viewStyle, {
                transform: [{ rotate: '90deg' }],
                position: 'absolute',
                top: 30 + (index * 12), // Stacked vertically with less overlap
                left: 15, // Fixed left position
              });
            } else if (isRightPlayer) {
              // Right player cards are rotated 270 degrees and stacked vertically
              Object.assign(viewStyle, {
                transform: [{ rotate: '270deg' }],
                position: 'absolute',
                top: 30 + (index * 12), // Stacked vertically with less overlap
                right: 15, // Fixed right position
              });
            }

            return (
              <View
                key={`${card.id}-container`}
                style={viewStyle}
                shouldRasterizeIOS={true}
                renderToHardwareTextureAndroid={true}
              >
                <AnimatedCard
                  key={card.id}
                  card={card}
                  faceDown={!showCards}
                  isTrump={isTrump(card, trumpInfo)}
                  delay={index * 20} // Fast staggered animation
                />
              </View>
            );
          })}
        </View>
      </View>
    );
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    padding: 8,
    paddingBottom: 45, // Extra space at bottom for the play button
    position: 'relative', // Establish positioning context
    backgroundColor: 'transparent',
  },
  currentPlayer: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderColor: 'transparent',
    elevation: 0,
  },
  aiContainer: {
    maxHeight: 180,
    alignItems: 'center',
    backgroundColor: 'transparent', // Completely transparent for AI players
    position: 'relative',
  },
  topAiContainer: {
    width: '70%',
    alignSelf: 'center',
    paddingTop: 15, // Reduced from 30 to 15 to move name up
  },
  leftAiContainer: {
    width: 60,
    alignSelf: 'center',
    paddingTop: 30, // Additional padding at the top for player name
  },
  rightAiContainer: {
    width: 60,
    alignSelf: 'center',
    paddingTop: 30, // Additional padding at the top for player name
  },
  playerNameContainer: {
    position: 'absolute',
    zIndex: 50,
    alignItems: 'center',
    width: '100%',
  },
  topPlayerName: {
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    marginBottom: 10, // Add extra spacing for Bot 2 specifically
  },
  leftPlayerName: {
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  rightPlayerName: {
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
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
  cardsScrollContainer: {
    width: '100%',
    height: 130,
    backgroundColor: 'transparent',
    position: 'relative',
  },
  scrollIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingVertical: 2,
    alignItems: 'center',
    zIndex: 50,
  },
  scrollIndicatorText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  scrollViewStyle: {
    width: '100%',
    height: 130,
    backgroundColor: 'transparent',
  },
  scrollViewContent: {
    minWidth: '100%',
    paddingTop: 25, // Space for raised cards
    paddingBottom: 10,
    paddingHorizontal: 10,
    flexDirection: 'row', // Ensure horizontal layout
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  cardWrapper: {
    height: 95,
    width: 65,
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
    height: '100%',
    position: 'relative',
  },
  rightHandContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  // Play button styles
  playButtonContainer: {
    width: '100%',
    alignItems: 'center',
    position: 'absolute', // Use absolute positioning
    bottom: 0, // Position at the bottom
    left: 0,
    right: 0,
    zIndex: 100, // Ensure it's above other elements
  },
  playButton: {
    backgroundColor: '#C62828', // Slightly brighter red
    paddingVertical: 8,
    paddingHorizontal: 15,
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
    width: '42%',
    minWidth: 130,
    height: 36,
  },
  playButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    flexShrink: 1,
  },
});

export default PlayerHandAnimated;