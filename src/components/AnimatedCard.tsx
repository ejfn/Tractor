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
}

export const AnimatedCard: React.FC<CardProps> = ({ 
  card, 
  selected, 
  onSelect, 
  faceDown = false, 
  isPlayed = false,
  isTrump = false,
  delay = 0
}) => {
  // Animated values
  const scale = useSharedValue(1);
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
      translateY.value = withSpring(-15);
      scale.value = withSpring(1.05);
    } else {
      translateY.value = withSpring(0);
      scale.value = withSpring(1);
    }
  }, [selected, translateY, scale]);
  
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
      <Animated.View style={[styles.card, styles.cardBack, animatedStyle]}>
        <Text style={styles.cardBackText}>🂠</Text>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        style={[
          styles.card,
          { borderColor: getColor() },
          selected && styles.selectedCard,
          isTrump && styles.trumpCard,
        ]}
        onPress={handlePress}
        disabled={!onSelect}
      >
        <Text style={[styles.rank, { color: getColor() }]}>{getCardText()}</Text>
        <Text style={[styles.suit, { color: getColor() }]}>{getSuitSymbol()}</Text>
        {card.points > 0 && (
          <View style={styles.pointsContainer}>
            <Text style={styles.pointsText}>{card.points}</Text>
          </View>
        )}
        {isTrump && (
          <View style={styles.trumpIndicator}>
            <Text style={styles.trumpIndicatorText}>T</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 60,
    height: 90,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 4,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardBack: {
    backgroundColor: '#6200EA',
    borderColor: '#3700B3',
  },
  cardBackText: {
    fontSize: 40,
    color: '#FFFFFF',
  },
  selectedCard: {
    borderWidth: 3,
  },
  trumpCard: {
    backgroundColor: '#FFF9C4', // Light yellow background for trump cards
  },
  rank: {
    fontSize: 18,
    fontWeight: 'bold',
    position: 'absolute',
    top: 5,
    left: 5,
  },
  suit: {
    fontSize: 40,
  },
  pointsContainer: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pointsText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
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