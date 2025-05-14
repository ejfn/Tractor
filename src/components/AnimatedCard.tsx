import React, { useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing
} from 'react-native-reanimated';
import { Card as CardType, Suit, JokerType } from '../types/game';

interface CardProps {
  card: CardType;
  selected?: boolean;
  onSelect?: (card: CardType) => void;
  faceDown?: boolean;
  isPlayed?: boolean;
  isTrump?: boolean;
  delay?: number;
  scale?: number; // Add scale prop for bot cards
  style?: any; // Add style prop for additional styling
  onAnimationComplete?: (() => void); // Add callback for animation completion - properly typed as function
}

export const AnimatedCard: React.FC<CardProps> = ({
  card,
  selected,
  onSelect,
  faceDown = false,
  isPlayed = false,
  isTrump = false,
  delay = 0,
  scale: cardScale = 1, // Default scale factor of 1, renamed to avoid conflict
  style = {}, // Default empty style object
  onAnimationComplete = undefined // Explicitly set default to undefined to ensure proper typing
}) => {
  // Animated values
  const scale = useSharedValue(cardScale);
  const rotate = useSharedValue('0deg');
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);
  
  // Color based on suit
  const getColor = () => {
    if (card.joker) return '#000';
    
    switch (card.suit) {
      case Suit.Hearts:
      case Suit.Diamonds:
        return '#D32F2F'; // Red
      case Suit.Clubs:
      case Suit.Spades:
        return '#212121'; // Black
      default:
        return '#000';
    }
  };
  
  // Suit symbol
  const getSuitSymbol = () => {
    if (card.joker) return card.joker === JokerType.Big ? '🃏' : '🂿';
    
    switch (card.suit) {
      case Suit.Hearts:
        return '♥';
      case Suit.Diamonds:
        return '♦';
      case Suit.Clubs:
        return '♣';
      case Suit.Spades:
        return '♠';
      default:
        return '';
    }
  };
  
  // Card text content
  const getCardText = () => {
    if (card.joker) {
      return card.joker === JokerType.Big ? 'BIG JOKER' : 'SMALL JOKER';
    }
    
    return card.rank || '';
  };

  // Handle card selection
  const handlePress = () => {
    if (onSelect) {
      // Ensure opacity is maintained during tap animation
      opacity.value = 1;

      // Animate card when selected (faster animation)
      scale.value = withSequence(
        withTiming(1.1, { duration: 50 }), // Reduced from 100ms to 50ms
        withTiming(1, { duration: 50 })    // Reduced from 100ms to 50ms
      );
      onSelect(card);
    }
  };
  
  // Selection animation - faster using withTiming instead of withSpring
  useEffect(() => {
    if (selected) {
      // Use withTiming with shorter duration for faster animation
      translateY.value = withTiming(-10 * cardScale, { duration: 80 }); // Fast upward animation
      scale.value = withTiming(cardScale * 1.03, { duration: 80 }); // Fast scale animation
      opacity.value = 1; // Ensure the card stays fully opaque when selected
    } else {
      // Fast animation when deselecting
      translateY.value = withTiming(0, { duration: 80 });
      scale.value = withTiming(cardScale, { duration: 80 });
      opacity.value = 1; // Ensure the card stays fully opaque when deselected
    }
  }, [selected, translateY, scale, opacity, cardScale]);
  
  // Play animation - removed random rotation for stacked appearance
  useEffect(() => {
    if (isPlayed) {
      // Delay animations for sequential effect
      setTimeout(() => {
        // Set rotation to 0 for a neat stack
        rotate.value = withTiming('0deg', {
          duration: 300,
          easing: Easing.out(Easing.ease)
        });

        // Use animation completion callback for the scale animation
        scale.value = withTiming(1, {
          duration: 300
        }, (finished) => {
          if (finished && typeof onAnimationComplete === 'function') {
            // Notify parent component that animation is complete
            onAnimationComplete();
          }
        });

        // Always set opacity to 1 immediately to prevent any transparency
        opacity.value = 1;
      }, delay);
    }
  }, [isPlayed, delay, rotate, opacity, scale, onAnimationComplete]);
  
  // Card appearance animations
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: scale.value },
        { translateY: translateY.value },
        { rotate: rotate.value }
      ],
      // Always force opacity to be 1 to prevent any transparency effects
      opacity: 1,
      // Include any additional styles passed as props
      ...style,
    };
  });

  if (faceDown) {
    return (
      <Animated.View style={[styles.card, animatedStyle]}>
        <View style={styles.cardBack}>
          {/* Card back with simplified 3x3 grid pattern */}
          <View style={{
            flex: 1,
            backgroundColor: '#1A4B84', // Deep blue background
            borderRadius: 6,
            borderWidth: 1.5,
            borderColor: 'white',
            overflow: 'hidden',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative'
          }}>
            {/* Simple grid pattern */}
            <View style={{
              width: '90%',
              height: '90%',
              position: 'relative',
            }} pointerEvents="none">
              {/* Main grid container */}
              <View style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.3)'
              }} />

              {/* Horizontal lines */}
              <View style={{
                position: 'absolute',
                left: '10%',
                right: '10%',
                top: '33%',
                height: 1,
                backgroundColor: 'rgba(255, 255, 255, 0.3)'
              }} />

              <View style={{
                position: 'absolute',
                left: '10%',
                right: '10%',
                top: '66%',
                height: 1,
                backgroundColor: 'rgba(255, 255, 255, 0.3)'
              }} />

              {/* Vertical lines */}
              <View style={{
                position: 'absolute',
                top: '10%',
                bottom: '10%',
                left: '33%',
                width: 1,
                backgroundColor: 'rgba(255, 255, 255, 0.3)'
              }} />

              <View style={{
                position: 'absolute',
                top: '10%',
                bottom: '10%',
                left: '66%',
                width: 1,
                backgroundColor: 'rgba(255, 255, 255, 0.3)'
              }} />
            </View>

            {/* Center emblem */}
            <View style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: 'white',
              justifyContent: 'center',
              alignItems: 'center',
              position: 'absolute',
              zIndex: 5
            }} pointerEvents="none">
              <Text style={{
                fontSize: 14,
                fontWeight: 'bold',
                color: '#1A4B84',
                textAlign: 'center'
              }}>T</Text>
            </View>
          </View>
        </View>
      </Animated.View>
    );
  }

  // Determine background color based on card type
  let bgColor = 'white';
  let borderColor = '#CCCCCC';
  let borderWidth = 1;

  if (card.joker) {
    // Enhanced styling for jokers (treated as trump cards)
    bgColor = card.joker === 'Big' ? '#FFEBEE' : '#F5F5F5';
    borderColor = '#D4B82F'; // Darker gold border like other trump cards
    borderWidth = 1.5; // Slightly thicker border

    // Simplified joker card
    const jokerColor = card.joker === 'Big' ? '#D32F2F' : '#000000';

    return (
      <Animated.View style={animatedStyle}>
        <TouchableOpacity
          style={[
            styles.card,
            {
              backgroundColor: bgColor,
              borderColor: borderColor, // Gold border for jokers
              borderWidth: 1,
              padding: 0,
              justifyContent: 'center',
              alignItems: 'center',
              opacity: 1, // Ensure opacity is always 1
            }
            // Removed selectedCard styling
          ]}
          onPress={handlePress}
          disabled={!onSelect}
          activeOpacity={1.0} // Changed from 0.7 to 1.0 to prevent any transparency on press
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          {/* Card content with vertical JOKER text */}
          <View style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            {/* Top left vertical JOKER text */}
            <View style={{
              position: 'absolute',
              top: 3,
              left: 3,
              flexDirection: 'column',
              alignItems: 'center',
              zIndex: 10,
            }}>
              {['J','O','K','E','R'].map((letter, idx) => (
                <Text key={idx} style={{
                  fontSize: 10,
                  fontWeight: 'bold',
                  color: jokerColor,
                  lineHeight: 11,
                  textAlign: 'center',
                }}>
                  {letter}
                </Text>
              ))}
            </View>

            {/* Bottom right vertical JOKER text (inverted) */}
            <View style={{
              position: 'absolute',
              bottom: 3,
              right: 3,
              flexDirection: 'column',
              alignItems: 'center',
              transform: [{ rotate: '180deg' }],
              zIndex: 10,
            }}>
              {['J','O','K','E','R'].map((letter, idx) => (
                <Text key={idx} style={{
                  fontSize: 10,
                  fontWeight: 'bold',
                  color: jokerColor,
                  lineHeight: 11,
                  textAlign: 'center',
                }}>
                  {letter}
                </Text>
              ))}
            </View>

            {/* Star symbol in center */}
            <Text style={{
              fontSize: 45,
              color: jokerColor,
              opacity: 1, // Changed from 0.8 to 1 to prevent transparency
              fontWeight: 'bold',
            }}>
              ★
            </Text>

            {/* Trump indicator star */}
            <View style={{
              position: 'absolute',
              top: 1,
              right: 1,
              width: 14,
              height: 14,
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              <Text style={{
                fontSize: 12,
                color: '#D4B82F',
                fontWeight: 'bold',
              }}>★</Text>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // Enhanced trump card styling
  if (isTrump) {
    const isTopTrump = card.rank === 'A';  // Check for Ace trump

    if (isTopTrump) {
      // More distinctive styling for Ace trumps
      bgColor = '#FFF9E0'; // Richer gold-cream tint
      borderColor = '#D4B82F'; // Darker gold border
      borderWidth = 1.5; // Thicker border
    } else {
      // More noticeable styling for regular trump cards
      bgColor = '#FFFCEB'; // Light gold tint
      borderColor = '#D4B82F'; // Darker gold border
      borderWidth = 1; // Standard border width
    }
  }

  // Render normal card with enhanced styling
  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: bgColor,
            borderColor,
            borderWidth,
            opacity: 1, // Ensure opacity is always 1
          }
          // Removed selectedCard styling
        ]}
        onPress={handlePress}
        disabled={!onSelect}
        activeOpacity={1.0} // Changed from 0.7 to 1.0 to prevent any transparency on press
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        {/* Card header with rank and suit */}
        <View style={styles.cardHeader}>
          <View style={styles.rankSuitPair}>
            <Text style={[styles.cardRank, { color: getColor() }]}>{getCardText()}</Text>
            <Text style={[styles.suitSymbolSmall, { color: getColor() }]}>{getSuitSymbol()}</Text>
          </View>

          {/* Subtle trump indicator */}
          {isTrump && (
            <View style={styles.trumpIndicator}>
              <Text style={styles.trumpStar}>★</Text>
            </View>
          )}
        </View>

        {/* Card center with large suit symbol */}
        <View style={styles.cardCenter}>
          <Text style={[styles.suit, { color: getColor() }]}>{getSuitSymbol()}</Text>
        </View>

        {/* Card footer with rank and suit (inverted) */}
        <View style={styles.cardFooter}>
          <View style={styles.rankSuitPairInverted}>
            <Text style={[styles.suitSymbolSmall, { color: getColor() }]}>{getSuitSymbol()}</Text>
            <Text style={[styles.cardRank, { color: getColor() }]}>{getCardText()}</Text>
          </View>
        </View>

        {/* Points indicator removed */}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 65, // Increased from 60 to 65
    height: 95, // Increased from 85 to 95
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
    padding: 4,
    margin: 2,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
    backfaceVisibility: 'hidden',
    overflow: 'hidden',
  },
  cardBack: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
    borderRadius: 8,
    overflow: 'hidden',
  },
  // Removed highlight styling, just keeping the opacity setting
  selectedCard: {
    opacity: 1, // Keep this to ensure no transparency when selected
  },
  // Card layout sections
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 2,
    width: '100%',
  },
  rankSuitPair: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  rankSuitPairInverted: {
    flexDirection: 'column',
    alignItems: 'center',
    transform: [{ rotate: '180deg' }],
  },
  cardCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardFooter: {
    alignItems: 'flex-end',
    marginTop: 2,
  },
  // Card text elements
  cardRank: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  suitSymbolSmall: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  suit: {
    fontSize: 35,
  },
  // Trump indicator styles
  trumpIndicator: {
    position: 'absolute',
    top: 1,
    right: 1,
    width: 14,
    height: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trumpStar: {
    fontSize: 12,
    color: '#D4B82F',
    fontWeight: 'bold',
  },
});

export default AnimatedCard;