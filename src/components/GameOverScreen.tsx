import React, { useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Animated,
  Dimensions 
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
  const confettiAnim1 = useRef(new Animated.Value(0)).current;
  const confettiAnim2 = useRef(new Animated.Value(0)).current;
  const confettiAnim3 = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    // Start animations
    Animated.parallel([
      Animated.loop(
        Animated.sequence([
          Animated.timing(floatAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(floatAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ),
      Animated.loop(
        Animated.timing(confettiAnim1, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        })
      ),
      Animated.loop(
        Animated.timing(confettiAnim2, {
          toValue: 1,
          duration: 3500,
          useNativeDriver: true,
        })
      ),
      Animated.loop(
        Animated.timing(confettiAnim3, {
          toValue: 1,
          duration: 4000,
          useNativeDriver: true,
        })
      ),
    ]).start();
  }, [confettiAnim1, confettiAnim2, confettiAnim3, floatAnim]);
  
  const translateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });
  
  return (
    <View style={styles.container}>
      {/* Confetti animations */}
      <Animated.Text 
        style={[
          styles.confetti, 
          { 
            left: '20%',
            transform: [{
              translateY: confettiAnim1.interpolate({
                inputRange: [0, 1],
                outputRange: [-100, Dimensions.get('window').height + 100],
              })
            }]
          }
        ]}
      >
        🎉
      </Animated.Text>
      <Animated.Text 
        style={[
          styles.confetti, 
          { 
            left: '50%',
            transform: [{
              translateY: confettiAnim2.interpolate({
                inputRange: [0, 1],
                outputRange: [-100, Dimensions.get('window').height + 100],
              })
            }]
          }
        ]}
      >
        🎊
      </Animated.Text>
      <Animated.Text 
        style={[
          styles.confetti, 
          { 
            left: '80%',
            transform: [{
              translateY: confettiAnim3.interpolate({
                inputRange: [0, 1],
                outputRange: [-100, Dimensions.get('window').height + 100],
              })
            }]
          }
        ]}
      >
        🏆
      </Animated.Text>
      
      <Animated.View
        style={[
          styles.card,
          {
            opacity: fadeAnim,
            transform: [
              { scale: scaleAnim },
              { translateY: translateY }
            ]
          }
        ]}
      >
        {/* Decorative corners */}
        <View style={[styles.corner, styles.topLeft]} />
        <View style={[styles.corner, styles.topRight]} />
        <View style={[styles.corner, styles.bottomLeft]} />
        <View style={[styles.corner, styles.bottomRight]} />
        
        <Text style={styles.trophy}>🏆</Text>
        <Text style={styles.title}>Victory!</Text>
        <Text style={styles.winnerText}>
          {winner === 'A' ? teamNames[0] : teamNames[1]} wins the game!
        </Text>
        <Text style={styles.congratsText}>Congratulations!</Text>
        
        <TouchableOpacity
          style={styles.button}
          onPress={onNewGame}
          activeOpacity={0.8}
        >
          <View style={styles.buttonGradient}>
            <Text style={styles.buttonText}>NEW GAME</Text>
          </View>
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
    backgroundColor: '#3F51B5',
  },
  confetti: {
    position: 'absolute',
    fontSize: 40,
    zIndex: 10,
  },
  card: {
    backgroundColor: '#FAFAFA',
    padding: 40,
    borderRadius: 20,
    alignItems: 'center',
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 15,
    borderWidth: 4,
    borderColor: '#FFD700',
    position: 'relative',
    overflow: 'hidden',
  },
  trophy: {
    fontSize: 80,
    marginBottom: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 3,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 10,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  winnerText: {
    fontSize: 24,
    color: '#34495E',
    marginBottom: 10,
    textAlign: 'center',
    fontWeight: '600',
  },
  congratsText: {
    fontSize: 20,
    color: '#7F8C8D',
    marginBottom: 30,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  button: {
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 10,
  },
  buttonGradient: {
    backgroundColor: '#E91E63',
    paddingVertical: 18,
    paddingHorizontal: 50,
    borderRadius: 35,
    minWidth: 250,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#C2185B',
  },
  buttonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  corner: {
    position: 'absolute',
    width: 35,
    height: 35,
    borderColor: '#FFD700',
    borderWidth: 4,
  },
  topLeft: {
    top: -4,
    left: -4,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 20,
  },
  topRight: {
    top: -4,
    right: -4,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 20,
  },
  bottomLeft: {
    bottom: -4,
    left: -4,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 20,
  },
  bottomRight: {
    bottom: -4,
    right: -4,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 20,
  },
});

export default GameOverScreen;