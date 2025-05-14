import React from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Animated 
} from 'react-native';

interface GameOverScreenProps {
  winner: 'A' | 'B' | null;
  teamNames: [string, string];
  onNewGame: () => void;
  fadeAnim: Animated.Value;
  scaleAnim: Animated.Value;
}

/**
 * Game over screen component displaying the winner and new game button
 */
const GameOverScreen: React.FC<GameOverScreenProps> = ({
  winner,
  teamNames,
  onNewGame,
  fadeAnim,
  scaleAnim
}) => {
  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.card,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }]
          }
        ]}
      >
        <Text style={styles.title}>Game Over!</Text>
        <Text style={styles.winnerText}>
          {winner === 'A' ? teamNames[0] : teamNames[1]} wins!
        </Text>
        
        <TouchableOpacity
          style={styles.button}
          onPress={onNewGame}
        >
          <Text style={styles.buttonText}>New Game</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#3F51B5', // Match the background color from EnhancedGameScreen
  },
  card: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#3F51B5',
    marginBottom: 16,
    textAlign: 'center',
  },
  winnerText: {
    fontSize: 22,
    color: '#4CAF50',
    marginBottom: 30,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: '#3F51B5',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 30,
    width: '80%',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  },
});

export default GameOverScreen;