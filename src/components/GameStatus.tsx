import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Animated, Platform } from 'react-native';
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
    backgroundColor: 'transparent', // Reverted from green color to transparent
    borderRadius: 16, // Matched with gameTable border radius
    padding: Platform.OS === 'android' ? 8 : 12, // Reduced padding on Android
    paddingTop: Platform.OS === 'android' ? 0 : 5, // No top padding on Android
    marginLeft: 10,
    marginRight: 10,
    marginTop: 0, // No top margin to stick to the top
    marginBottom: Platform.OS === 'android' ? 2 : 5, // Even smaller bottom margin on Android
    borderWidth: 0, // Removed border
    borderColor: 'transparent',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Platform.OS === 'android' ? 5 : 10, // Reduced margin on Android
    marginTop: Platform.OS === 'android' ? 2 : 0, // Slight top margin on Android
  },
  roundInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roundText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 10,
    color: '#303F9F',
  },
  phaseIndicator: {
    backgroundColor: '#303F9F',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  phaseText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  trumpInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    marginRight: 5,
    fontWeight: 'bold',
    color: '#424242',
  },
  trumpDisplay: {
    backgroundColor: '#FFC107',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.5)',
  },
  trumpText: {
    fontWeight: 'bold',
    color: '#212121',
  },
  teamsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  teamCard: {
    flex: 1,
    borderRadius: 10,
    padding: 12,
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  defendingTeam: {
    backgroundColor: '#E8F5E9',
    borderColor: '#2E7D32',
    borderWidth: 1.5,
  },
  attackingTeam: {
    backgroundColor: '#FFEBEE',
    borderColor: '#C62828',
    borderWidth: 1.5,
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
    color: '#212121',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  defendingBadge: {
    backgroundColor: '#2E7D32',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  attackingBadge: {
    backgroundColor: '#C62828',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  statusText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
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
    color: '#424242',
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#212121',
  },
  pointsValue: {
    fontSize: 16,
  },
  winningPoints: {
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  progressContainer: {
    height: 10,
    backgroundColor: '#E0E0E0',
    borderRadius: 5,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  defendingProgress: {
    backgroundColor: '#4CAF50',
  },
  attackingProgress: {
    backgroundColor: '#E53935',
  },
});

export default GameStatus;