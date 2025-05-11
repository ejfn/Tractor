import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import AnimatedCard from './AnimatedCard';
import { Card as CardType, Player, Trick, TrumpInfo } from '../types/game';
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
    backgroundColor: '#FFFDE7',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    minHeight: 150,
  },
  emptyText: {
    fontStyle: 'italic',
    color: '#9E9E9E',
    textAlign: 'center',
    marginTop: 50,
  },
  playRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  winningPlay: {
    backgroundColor: 'rgba(129, 199, 132, 0.2)',
    borderRadius: 8,
  },
  playerInfo: {
    width: 80,
    marginRight: 10,
  },
  playerName: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  playType: {
    fontSize: 12,
    color: '#757575',
    fontStyle: 'italic',
  },
  cardsContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  pointsDisplay: {
    marginTop: 10,
    padding: 8,
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    borderRadius: 8,
    alignItems: 'center',
  },
  pointsText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976D2',
  },
});

export default CardPlayArea;