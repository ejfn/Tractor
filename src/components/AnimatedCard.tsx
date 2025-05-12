import React, { useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSpring,
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
}

export const AnimatedCard: React.FC<CardProps> = ({
  card,
  selected,
  onSelect,
  faceDown = false,
  isPlayed = false,
  isTrump = false,
  delay = 0,
  scale: cardScale = 1 // Default scale factor of 1, renamed to avoid conflict
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
      // Animate card when selected
      scale.value = withSequence(
        withTiming(1.1, { duration: 100 }),
        withTiming(1, { duration: 100 })
      );
      onSelect(card);
    }
  };
  
  // Selection animation
  useEffect(() => {
    if (selected) {
      translateY.value = withSpring(-10 * cardScale); // Reduced from -15 to -10
      scale.value = withSpring(cardScale * 1.03); // Reduced scale effect from 1.05 to 1.03
    } else {
      translateY.value = withSpring(0);
      scale.value = withSpring(cardScale);
    }
  }, [selected, translateY, scale, cardScale]);
  
  // Play animation
  useEffect(() => {
    if (isPlayed) {
      // Delay animations for sequential effect
      setTimeout(() => {
        rotate.value = withTiming(
          `${Math.random() * 10 - 5}deg`,
          { duration: 300, easing: Easing.out(Easing.ease) }
        );
        scale.value = withTiming(1, { duration: 300 });
        opacity.value = withTiming(1, { duration: 300 });
      }, delay);
    }
  }, [isPlayed, delay, rotate, opacity, scale]);
  
  // Card appearance animations
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: scale.value },
        { translateY: translateY.value },
        { rotate: rotate.value }
      ],
      opacity: opacity.value,
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
    // Special styling for jokers
    bgColor = card.joker === 'Big' ? '#FFEBEE' : '#F5F5F5';
    borderColor = card.joker === 'Big' ? '#D32F2F' : '#000000';

    // Simplified joker card
    const jokerColor = card.joker === 'Big' ? '#D32F2F' : '#000000';

    return (
      <Animated.View style={animatedStyle}>
        <TouchableOpacity
          style={[
            styles.card,
            {
              backgroundColor: 'white',
              borderColor: 'transparent', // No border for jokers
              borderWidth: 0,
              padding: 0,
              justifyContent: 'center',
              alignItems: 'center',
            },
            selected && styles.selectedCard
          ]}
          onPress={handlePress}
          disabled={!onSelect}
          activeOpacity={0.7}
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
              opacity: 0.8,
              fontWeight: 'bold',
            }}>
              ★
            </Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // Normal card enhancements
  if (isTrump) {
    // Special styling for trump cards
    const isTopTrump = card.rank === 'A';  // Simplified check for top trump

    if (isTopTrump) {
      bgColor = '#FFF9C4'; // Light yellow for top trump
      borderColor = '#FBC02D'; // Gold border
      borderWidth = 2;
    } else {
      bgColor = '#E8F5E9'; // Light green for trumps
      borderColor = '#4CAF50'; // Green border
      borderWidth = 1.5;
    }
  }

  // Render normal card with enhanced styling
  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        style={[
          styles.card,
          { backgroundColor: bgColor, borderColor, borderWidth },
          selected && styles.selectedCard,
        ]}
        onPress={handlePress}
        disabled={!onSelect}
        activeOpacity={0.7}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        {/* Card header with rank and suit */}
        <View style={styles.cardHeader}>
          <View style={styles.rankSuitPair}>
            <Text style={[styles.cardRank, { color: getColor() }]}>{getCardText()}</Text>
            <Text style={[styles.suitSymbolSmall, { color: getColor() }]}>{getSuitSymbol()}</Text>
          </View>

          {/* Indicators */}
          {isTrump && (
            <View style={styles.trumpIndicator}>
              <Text style={styles.trumpIndicatorText}>♦</Text>
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
  selectedCard: {
    borderWidth: 2.5,
    borderColor: '#3F51B5',
    backgroundColor: '#E8EAF6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 8,
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
  // Indicators
  trumpIndicator: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: '#FFC107',
    borderRadius: 10,
    width: 15,
    height: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trumpIndicatorText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#212121',
  },
});

export default AnimatedCard;