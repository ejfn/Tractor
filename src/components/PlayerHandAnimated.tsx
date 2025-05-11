import React from 'react';
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import AnimatedCard from './AnimatedCard';
import { Card as CardType, Player, TrumpInfo } from '../types/game';
import { isTrump } from '../utils/gameLogic';

interface PlayerHandProps {
  player: Player;
  isCurrentPlayer: boolean;
  selectedCards: CardType[];
  onCardSelect?: (card: CardType) => void;
  showCards: boolean;
  trumpInfo: TrumpInfo;
}

const PlayerHandAnimated: React.FC<PlayerHandProps> = ({
  player,
  isCurrentPlayer,
  selectedCards,
  onCardSelect,
  showCards,
  trumpInfo
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

  return (
    <View style={[
      styles.container,
      isCurrentPlayer ? styles.currentPlayer : null
    ]}>
      <View style={styles.headerContainer}>
        <Text style={styles.playerName}>
          {player.name} {isCurrentPlayer ? '(Your Turn)' : ''}
        </Text>
        <View style={styles.teamBadge}>
          <Text style={styles.teamBadgeText}>
            Team {player.team}
          </Text>
        </View>
      </View>
      
      <ScrollView horizontal style={styles.handContainer} contentContainerStyle={styles.handContent}>
        {sortedHand.map((card, index) => (
          <AnimatedCard
            key={card.id}
            card={card}
            onSelect={isCurrentPlayer && player.isHuman ? onCardSelect : undefined}
            selected={isCardSelected(card)}
            faceDown={!showCards && !player.isHuman}
            isTrump={isTrump(card, trumpInfo)}
            delay={index * 50} // Staggered animation
          />
        ))}
      </ScrollView>
      
      <View style={styles.statsContainer}>
        <Text style={styles.cardCount}>
          Cards: {player.hand.length}
        </Text>
        <Text style={styles.rankText}>
          Rank: {player.currentRank}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 12,
    margin: 5,
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  currentPlayer: {
    backgroundColor: '#E3F2FD',
    borderWidth: 2,
    borderColor: '#2196F3',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  playerName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  teamBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#9E9E9E',
  },
  teamBadgeText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  handContainer: {
    flexDirection: 'row',
    maxHeight: 110,
  },
  handContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  cardCount: {
    fontSize: 12,
    color: '#757575',
  },
  rankText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1976D2',
  },
});

export default PlayerHandAnimated;