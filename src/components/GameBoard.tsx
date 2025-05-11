import React from 'react';
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import Card from './Card';
import PlayerHand from './PlayerHand';
import { GameState, Card as CardType, Player, Trick } from '../types/game';

interface GameBoardProps {
  gameState: GameState;
  selectedCards: CardType[];
  onCardSelect: (card: CardType) => void;
}

const GameBoard: React.FC<GameBoardProps> = ({
  gameState,
  selectedCards,
  onCardSelect,
}) => {
  const { players, currentTrick, currentPlayerIndex, trumpInfo, teams } = gameState;
  
  // Get current player
  const currentPlayer = players[currentPlayerIndex];
  
  // Find human player index
  const humanPlayerIndex = players.findIndex(p => p.isHuman);
  
  // Calculate total points for each team in this round
  const teamPoints = teams.map(team => {
    return {
      id: team.id,
      points: team.points,
      isDefending: team.isDefending
    };
  });

  return (
    <View style={styles.container}>
      <View style={styles.infoContainer}>
        <View style={styles.trumpInfo}>
          <Text style={styles.infoText}>
            Trump Rank: {trumpInfo.trumpRank}
            {trumpInfo.trumpSuit && ` of ${trumpInfo.trumpSuit}`}
          </Text>
          <Text style={styles.infoText}>
            Round: {gameState.roundNumber}
          </Text>
        </View>
        
        <View style={styles.teamInfo}>
          {teamPoints.map(team => (
            <View 
              key={team.id} 
              style={[
                styles.teamScoreContainer,
                team.isDefending ? styles.defendingTeam : styles.attackingTeam
              ]}
            >
              <Text style={styles.teamText}>
                Team {team.id}: {team.points} pts
                {team.isDefending ? ' (Defending)' : ' (Attacking)'}
              </Text>
            </View>
          ))}
        </View>
      </View>
      
      <View style={styles.trickContainer}>
        <Text style={styles.sectionTitle}>Current Trick</Text>
        {currentTrick ? (
          <View style={styles.trickCards}>
            <View style={styles.leadingPlay}>
              <Text style={styles.playerLabel}>
                {players.find(p => p.id === currentTrick.leadingPlayerId)?.name} (Lead):
              </Text>
              <ScrollView horizontal>
                {currentTrick.leadingCombo.map(card => (
                  <Card key={card.id} card={card} />
                ))}
              </ScrollView>
            </View>
            
            {currentTrick.plays.map(play => (
              <View key={play.playerId} style={styles.play}>
                <Text style={styles.playerLabel}>
                  {players.find(p => p.id === play.playerId)?.name}:
                </Text>
                <ScrollView horizontal>
                  {play.cards.map(card => (
                    <Card key={card.id} card={card} />
                  ))}
                </ScrollView>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>Waiting for first play...</Text>
        )}
      </View>
      
      <View style={styles.playersContainer}>
        {/* Show other players' hands */}
        {players.map((player, index) => 
          index !== humanPlayerIndex && (
            <PlayerHand
              key={player.id}
              player={player}
              isCurrentPlayer={index === currentPlayerIndex}
              selectedCards={[]}
              showCards={false}
            />
          )
        )}
        
        {/* Show human player's hand at the bottom */}
        {humanPlayerIndex !== -1 && (
          <PlayerHand
            player={players[humanPlayerIndex]}
            isCurrentPlayer={humanPlayerIndex === currentPlayerIndex}
            selectedCards={selectedCards}
            onCardSelect={onCardSelect}
            showCards={true}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
  },
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
    backgroundColor: '#E8EAF6',
    borderRadius: 10,
    marginBottom: 10,
  },
  trumpInfo: {
    flex: 1,
  },
  teamInfo: {
    flex: 1,
  },
  infoText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  teamScoreContainer: {
    padding: 5,
    borderRadius: 5,
    marginBottom: 5,
  },
  defendingTeam: {
    backgroundColor: '#C8E6C9',
  },
  attackingTeam: {
    backgroundColor: '#FFCDD2',
  },
  teamText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  trickContainer: {
    backgroundColor: '#FFFDE7',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  trickCards: {
    flexDirection: 'column',
  },
  leadingPlay: {
    marginBottom: 10,
  },
  play: {
    marginBottom: 5,
  },
  playerLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  emptyText: {
    fontStyle: 'italic',
    color: '#9E9E9E',
  },
  playersContainer: {
    flex: 1,
  },
});

export default GameBoard;