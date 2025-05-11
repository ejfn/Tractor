import React from 'react';
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import Card from './Card';
import { Card as CardType, Player } from '../types/game';

interface PlayerHandProps {
  player: Player;
  isCurrentPlayer: boolean;
  selectedCards: CardType[];
  onCardSelect?: (card: CardType) => void;
  showCards: boolean;
}

const PlayerHand: React.FC<PlayerHandProps> = ({
  player,
  isCurrentPlayer,
  selectedCards,
  onCardSelect,
  showCards,
}) => {
  // Sort cards by suit and rank for better display
  const sortedHand = [...player.hand].sort((a, b) => {
    // Jokers first
    if (a.joker && !b.joker) return -1;
    if (!a.joker && b.joker) return 1;
    
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

  return (
    <View style={[
      styles.container,
      isCurrentPlayer ? styles.currentPlayer : null
    ]}>
      <Text style={styles.playerName}>
        {player.name} {isCurrentPlayer ? '(Your Turn)' : ''}
        {player.team === 'A' ? ' - Team A' : ' - Team B'}
      </Text>
      
      <ScrollView horizontal style={styles.handContainer} contentContainerStyle={styles.handContent}>
        {sortedHand.map((card) => (
          <Card
            key={card.id}
            card={card}
            onSelect={isCurrentPlayer && player.isHuman ? onCardSelect : undefined}
            selected={selectedCards.some(c => c.id === card.id)}
            faceDown={!showCards && !player.isHuman}
          />
        ))}
      </ScrollView>
      
      <Text style={styles.cardCount}>
        Cards: {player.hand.length}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 10,
    margin: 5,
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
  },
  currentPlayer: {
    backgroundColor: '#E3F2FD',
    borderWidth: 2,
    borderColor: '#2196F3',
  },
  playerName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  handContainer: {
    flexDirection: 'row',
    maxHeight: 100,
  },
  handContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardCount: {
    fontSize: 12,
    color: '#757575',
    marginTop: 5,
  },
});

export default PlayerHand;