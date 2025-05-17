import React, { useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
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
  disabled?: boolean; // Add disabled prop for trump declaration mode
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
  onAnimationComplete = undefined, // Explicitly set default to undefined to ensure proper typing
  disabled = false
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

  // Handle card selection with improved touch response
  const handlePress = () => {
    if (onSelect && !disabled) {
      // Ensure opacity is maintained during tap animation
      opacity.value = 1;

      // Cleaner tap animation - single spring with a small bounce
      scale.value = withTiming(1.05, {
        duration: 25, // Extremely quick animation - almost immediate
        easing: Easing.bezier(0.25, 0.1, 0.25, 1) // Custom easing for a subtle bounce
      });

      // Call onSelect immediately instead of waiting for animation
      onSelect(card);

      // Reset scale immediately after to prevent jumpy feeling
      setTimeout(() => {
        scale.value = withTiming(cardScale, { duration: 25 });
      }, 50);
    }
  };
  
  // Selection animation - improved with higher pop-up for better visibility
  useEffect(() => {
    if (selected) {
      // More pronounced upward movement for better visibility
      translateY.value = withTiming(-20 * cardScale, { // Increased from -10 to -20 for higher pop
        duration: 60, // Keep snappy response
        easing: Easing.out(Easing.cubic) // Smooth easing for upward movement
      });
      scale.value = withTiming(cardScale * 1.05, { // Slightly larger scale for better visibility
        duration: 60, // Keep snappy response
        easing: Easing.out(Easing.cubic) // Smooth easing for scale
      });
      opacity.value = 1; // Ensure the card stays fully opaque when selected
    } else {
      // Quick deselection with slightly different timing to feel natural
      translateY.value = withTiming(0, {
        duration: 70, // Slightly longer for deselection (feels more natural)
        easing: Easing.inOut(Easing.cubic) // Smoother return to normal position
      });
      scale.value = withTiming(cardScale, {
        duration: 70, // Slightly longer for deselection
        easing: Easing.inOut(Easing.cubic)
      });
      opacity.value = 1; // Ensure the card stays fully opaque when deselected
    }
  }, [selected, translateY, scale, opacity, cardScale]);
  
  // Play animation - improved for cleaner, more refined appearance
  useEffect(() => {
    if (isPlayed) {
      // Delay animations for sequential effect
      setTimeout(() => {
        // Set rotation to 0 for a neat stack with improved easing
        rotate.value = withTiming('0deg', {
          duration: 250, // Slightly reduced duration for more responsive feel
          easing: Easing.out(Easing.cubic) // Cubic easing for smoother deceleration
        });

        // Improved scale animation with completion callback
        scale.value = withTiming(1, {
          duration: 250, // Match duration with rotation for consistent feel
          easing: Easing.out(Easing.cubic) // Cubic easing for smoother deceleration
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
  
  // Card appearance animations with improved performance settings
  // Create base animation style without shadows
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: scale.value },
        { translateY: translateY.value },
        { rotate: rotate.value }
      ],
      // Apply opacity based on disabled state - use higher opacity for better visibility
      opacity: disabled ? 0.7 : 1,
      // Add hardware acceleration hints for smoother animations
      backfaceVisibility: 'hidden',
      // Enhanced zIndex for selected cards to ensure they appear clearly above other cards
      zIndex: selected ? (style.zIndex ? style.zIndex + 10 : 20) : (style.zIndex || 0),
    };
  }, [selected, disabled, style.zIndex]); // Add dependencies to avoid unnecessary recalculations

  // Create shadow styles separately to avoid shadowOffset error
  const shadowStyle = selected ? {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  } : {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  };

  if (faceDown) {
    return (
      <Animated.View style={[styles.card, shadowStyle, style, animatedStyle]}>
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
    // Standardized styling for jokers as trump cards
    bgColor = '#FFFCEB'; // Consistent light gold background for all trump cards
    borderColor = '#D4B82F'; // Gold border for all trump cards
    borderWidth = 1.5; // Consistent border width for all trump cards

    // Joker colors maintained for readability
    const jokerColor = card.joker === 'Big' ? '#D32F2F' : '#000000';

    return (
      <Animated.View style={[shadowStyle, style, animatedStyle]}>
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
          ]}
          onPress={handlePress}
          disabled={!onSelect}
          activeOpacity={1.0} // Keep full opacity on press
          delayPressIn={0} // Remove delay for immediate feedback
          pressRetentionOffset={{ top: 1, bottom: 1, left: 1, right: 1 }} // Minimal touch area expansion
          hitSlop={{ top: 1, bottom: 1, left: 1, right: 1 }} // Minimal hit area expansion
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

  // Standardized trump card styling - same for all trump cards
  if (isTrump) {
    // Consistent styling for all trump cards
    bgColor = '#FFFCEB'; // Light gold tint for all trump cards
    borderColor = '#D4B82F'; // Gold border for all trump cards
    borderWidth = 1.5; // Consistent border width for all trump cards
  }

  // Render normal card with enhanced styling
  return (
    <Animated.View style={[shadowStyle, style, animatedStyle]}>
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: bgColor,
            borderColor,
            borderWidth,
            opacity: 1, // Ensure opacity is always 1
          }
        ]}
        onPress={handlePress}
        disabled={!onSelect}
        activeOpacity={1.0} // Keep full opacity on press
        delayPressIn={0} // Remove delay for immediate feedback
        pressRetentionOffset={{ top: 1, bottom: 1, left: 1, right: 1 }} // Minimal touch area expansion
        hitSlop={{ top: 1, bottom: 1, left: 1, right: 1 }} // Minimal hit area expansion
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
    width: 65, // Card width
    height: 95, // Card height
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
    padding: 4,
    margin: 2,
    position: 'relative',
    // Improve shadow for cleaner look
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
    // Performance optimizations
    backfaceVisibility: 'hidden',
    // @ts-ignore - These are valid React Native style properties
    shouldRasterizeIOS: true, // iOS performance optimization
    renderToHardwareTextureAndroid: true, // Android performance optimization
    overflow: 'hidden',
  },
  cardBack: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
    borderRadius: 6, // Match card border radius
    overflow: 'hidden',
    // Performance optimizations for card back too
    backfaceVisibility: 'hidden',
    // @ts-ignore - These are valid React Native style properties
    shouldRasterizeIOS: true,
    renderToHardwareTextureAndroid: true,
  },
  // Using state-based styling controlled by animated values instead of this static style
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

// Export as both named and default for backward compatibility
export default AnimatedCard;