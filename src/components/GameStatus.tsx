import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Animated } from 'react-native';
import { Team, TrumpInfo } from '../types/game';

interface GameStatusProps {
  teams: [Team, Team];
  trumpInfo: TrumpInfo;
  roundNumber: number;
  gamePhase: string;
}

const GameStatus: React.FC<GameStatusProps> = ({
  teams,
  trumpInfo,
  roundNumber,
  gamePhase
}) => {
  // Animation values
  const scoreAnimation = useRef(new Animated.Value(0)).current;
  const phaseAnimation = useRef(new Animated.Value(0)).current;
  
  // Trigger animations when props change
  useEffect(() => {
    Animated.sequence([
      Animated.timing(scoreAnimation, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(scoreAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
        delay: 1000,
      })
    ]).start();
  }, [teams, scoreAnimation]);
  
  useEffect(() => {
    Animated.sequence([
      Animated.timing(phaseAnimation, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(phaseAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
        delay: 1500,
      })
    ]).start();
  }, [gamePhase, phaseAnimation]);
  
  // Animations for pulse effect
  const pulseScale = scoreAnimation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.05, 1]
  });
  
  const phaseScale = phaseAnimation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.1, 1]
  });

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.roundInfo}>
          <Text style={styles.roundText}>Round {roundNumber}</Text>
          <Animated.View 
            style={[styles.phaseIndicator, { transform: [{ scale: phaseScale }] }]}
          >
            <Text style={styles.phaseText}>{
              gamePhase.charAt(0).toUpperCase() + gamePhase.slice(1)
            }</Text>
          </Animated.View>
        </View>
        
        <View style={styles.trumpInfo}>
          <Text style={styles.infoLabel}>Trump:</Text>
          <View style={styles.trumpDisplay}>
            <Text style={styles.trumpText}>
              {trumpInfo.trumpRank}
              {trumpInfo.trumpSuit ? ` of ${trumpInfo.trumpSuit}` : ''}
            </Text>
          </View>
        </View>
      </View>
      
      <View style={styles.teamsContainer}>
        {teams.map(team => (
          <Animated.View 
            key={team.id}
            style={[
              styles.teamCard,
              team.isDefending ? styles.defendingTeam : styles.attackingTeam,
              { transform: [{ scale: pulseScale }] }
            ]}
          >
            <View style={styles.teamHeader}>
              <Text style={styles.teamName}>Team {team.id}</Text>
              <View style={[
                styles.statusBadge, 
                team.isDefending ? styles.defendingBadge : styles.attackingBadge
              ]}>
                <Text style={styles.statusText}>
                  {team.isDefending ? 'Defending' : 'Attacking'}
                </Text>
              </View>
            </View>
            
            <View style={styles.teamStats}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Rank:</Text>
                <Text style={styles.statValue}>{team.currentRank}</Text>
              </View>
              
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Points:</Text>
                <Text style={[
                  styles.statValue, 
                  styles.pointsValue,
                  team.points >= 80 && !team.isDefending ? styles.winningPoints : null
                ]}>
                  {team.points}/80
                </Text>
              </View>
            </View>
            
            {/* Progress bar for points */}
            <View style={styles.progressContainer}>
              <View 
                style={[
                  styles.progressBar,
                  team.isDefending ? styles.defendingProgress : styles.attackingProgress,
                  { width: `${Math.min(100, (team.points / 80) * 100)}%` }
                ]}
              />
            </View>
          </Animated.View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ECEFF1',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  roundInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roundText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 10,
  },
  phaseIndicator: {
    backgroundColor: '#90A4AE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  phaseText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  trumpInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    marginRight: 5,
  },
  trumpDisplay: {
    backgroundColor: '#FFF176',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  trumpText: {
    fontWeight: 'bold',
  },
  teamsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  teamCard: {
    flex: 1,
    borderRadius: 8,
    padding: 10,
    marginHorizontal: 5,
  },
  defendingTeam: {
    backgroundColor: '#E8F5E9',
    borderColor: '#81C784',
    borderWidth: 1,
  },
  attackingTeam: {
    backgroundColor: '#FFEBEE',
    borderColor: '#EF9A9A',
    borderWidth: 1,
  },
  teamHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  teamName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  defendingBadge: {
    backgroundColor: '#4CAF50',
  },
  attackingBadge: {
    backgroundColor: '#F44336',
  },
  statusText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  teamStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    marginRight: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  pointsValue: {
    fontSize: 16,
  },
  winningPoints: {
    color: '#4CAF50',
  },
  progressContainer: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  defendingProgress: {
    backgroundColor: '#4CAF50',
  },
  attackingProgress: {
    backgroundColor: '#F44336',
  },
});

export default GameStatus;