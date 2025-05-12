import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import AnimatedCard from './AnimatedCard';
import { Card as CardType, Player, Trick, TrumpInfo } from '../types/game'; // Using Card as CardType to avoid naming conflict
import { isTrump } from '../utils/gameLogic';

interface CardPlayAreaProps {
  currentTrick: Trick | null;
  players: Player[];
  trumpInfo: TrumpInfo;
  winningPlayerId?: string;
}

const CardPlayArea: React.FC<CardPlayAreaProps> = ({
  currentTrick,
  players,
  trumpInfo,
  winningPlayerId
}) => {
  if (!currentTrick) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>Waiting for first play...</Text>
      </View>
    );
  }

  // Get player name by ID
  const getPlayerName = (playerId: string) => {
    const player = players.find(p => p.id === playerId);
    return player ? player.name : 'Unknown';
  };

  // Check if a player is winning
  const isWinning = (playerId: string) => {
    return playerId === winningPlayerId;
  };

  return (
    <View style={styles.container}>
      {/* Leading play */}
      <View style={[
        styles.playRow, 
        isWinning(currentTrick.leadingPlayerId) && styles.winningPlay
      ]}>
        <View style={styles.playerInfo}>
          <Text style={styles.playerName}>
            {getPlayerName(currentTrick.leadingPlayerId)}
          </Text>
          <Text style={styles.playType}>(Lead)</Text>
        </View>
        <View style={styles.cardsContainer}>
          {currentTrick.leadingCombo.map((card, index) => (
            <AnimatedCard
              key={card.id}
              card={card}
              isPlayed={true}
              isTrump={isTrump(card, trumpInfo)}
              delay={index * 100}
            />
          ))}
        </View>
      </View>

      {/* Other plays */}
      {currentTrick.plays.map((play, playIndex) => (
        <View 
          key={play.playerId}
          style={[
            styles.playRow,
            isWinning(play.playerId) && styles.winningPlay
          ]}
        >
          <View style={styles.playerInfo}>
            <Text style={styles.playerName}>
              {getPlayerName(play.playerId)}
            </Text>
          </View>
          <View style={styles.cardsContainer}>
            {play.cards.map((card, cardIndex) => (
              <AnimatedCard
                key={card.id}
                card={card}
                isPlayed={true}
                isTrump={isTrump(card, trumpInfo)}
                delay={(playIndex + 1) * 200 + cardIndex * 100}
              />
            ))}
          </View>
        </View>
      ))}

      {/* Points display */}
      {currentTrick.points > 0 && (
        <View style={styles.pointsDisplay}>
          <Text style={styles.pointsText}>
            Points in this trick: {currentTrick.points}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent', // No background
    borderRadius: 16,
    padding: 15,
    marginBottom: 10,
    minHeight: 200,
    borderWidth: 0, // No border
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0, // No shadow
    shadowRadius: 0,
    elevation: 0, // No elevation
    position: 'relative',
    overflow: 'hidden',
  },
  emptyText: {
    fontStyle: 'italic',
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  playRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 0, // No bottom border
    backgroundColor: 'rgba(0, 0, 0, 0.05)', // Less opaque background
    borderRadius: 6,
    marginBottom: 3,
  },
  winningPlay: {
    backgroundColor: 'rgba(129, 199, 132, 0.3)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(129, 199, 132, 0.6)',
  },
  playerInfo: {
    width: 80,
    marginRight: 10,
  },
  playerName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'rgba(255, 255, 255, 0.9)',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  playType: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    fontStyle: 'italic',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  cardsContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  pointsDisplay: {
    marginTop: 10,
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  pointsText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'rgba(255, 255, 255, 0.9)',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});

export default CardPlayArea;