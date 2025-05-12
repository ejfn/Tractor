import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
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

  // Different layout based on player position (human vs AI)
  if (player.isHuman) {
    // Human player layout (bottom)
    return (
      <View style={[
        styles.container
      ]}>
        <View style={styles.cardsScrollContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={true}
            indicatorStyle="white"
            style={styles.handContainer}
            contentContainerStyle={[styles.handContent, { paddingBottom: 8 }]}
            directionalLockEnabled={true}
            snapToEnd={false}
            scrollsToTop={false}
            bouncesHorizontal={true}
            pagingEnabled={false}
            scrollEventThrottle={16}
          >
            <View style={[styles.humanCardRow,
              // Force a wider width based on card count to enable scrolling
              { width: Math.max(300, sortedHand.length * 20 + 100) }
            ]}>
              {sortedHand.map((card, index) => (
                <View
                  key={card.id}
                  style={[
                    styles.cardContainer,
                    {
                      marginLeft: index === 0 ? 0 : -40, // Tighter stacking
                      zIndex: 10 + index, // Consistent z-index based on card order
                      backfaceVisibility: 'hidden',
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
                top: 30, // Start below the name
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
    padding: 10,
    margin: 3,
    marginTop: 15, // Added margin at the top to push content down
    paddingBottom: 45, // Extra space at bottom for the play button
    borderRadius: 10,
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    position: 'relative', // Establish positioning context
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
    paddingTop: 30, // Additional padding at the top for the player name
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
    alignItems: 'center',
    marginTop: 0, // Removed margin
    backgroundColor: 'transparent',
    paddingVertical: 2, // Reduced padding
    overflow: 'visible',
  },
  handContainer: {
    flexDirection: 'row',
    maxHeight: 130, // Increased height to account for raised cards
    width: '100%',
    backgroundColor: 'transparent',
    paddingHorizontal: 10,
    paddingTop: 5,
    paddingBottom: 5,
    overflow: 'visible', // Allow content to overflow for raised cards
  },
  handContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2, // Reduced padding
    paddingRight: 200, // Add significant padding to ensure scrolling
    minWidth: '100%', // Ensure it takes at least full width
  },
  humanCardRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    height: 105, // Slightly reduced height
    alignItems: 'flex-end',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    overflow: 'visible',
    marginBottom: 5, // Small margin at the bottom for play button
    paddingTop: 20, // Kept padding at the top for raised cards
  },
  cardContainer: {
    height: 95, // Increased height to accommodate the animation
    width: 60,
    overflow: 'visible', // Allow overflow for raised cards
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
    backgroundColor: '#B71C1C',
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
    // Add subtle glow effect
    backgroundColor: '#C62828', // Slightly brighter red
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