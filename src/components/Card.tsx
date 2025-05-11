import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Card as CardType, Suit, JokerType } from '../types/game';

interface CardProps {
  card: CardType;
  selected?: boolean;
  onSelect?: (card: CardType) => void;
  faceDown?: boolean;
}

export const Card: React.FC<CardProps> = ({ card, selected, onSelect, faceDown = false }) => {
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
      onSelect(card);
    }
  };

  if (faceDown) {
    return (
      <TouchableOpacity
        style={[styles.card, styles.cardBack]}
        disabled={!onSelect}
      >
        <Text style={styles.cardBackText}>🂠</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { borderColor: getColor() },
        selected && styles.selectedCard
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
    </TouchableOpacity>
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
    transform: [{ translateY: -10 }],
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
});

export default Card;