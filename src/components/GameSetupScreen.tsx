import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from "react-native";

interface GameSetupScreenProps {
  onStartGame: () => void;
  fadeAnim: Animated.Value;
  scaleAnim: Animated.Value;
}

/**
 * Game setup screen component with title, description and start button
 */
const GameSetupScreen: React.FC<GameSetupScreenProps> = ({
  onStartGame,
  fadeAnim,
  scaleAnim,
}) => {
  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.card,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Text style={styles.title}>Tractor Single Player</Text>
        <Text style={styles.subtitle}>Shengji (升级) Card Game</Text>

        <TouchableOpacity style={styles.button} onPress={onStartGame}>
          <Text style={styles.buttonText}>Start Game</Text>
        </TouchableOpacity>

        <Text style={styles.creditsText}>You vs 3 AI Players</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#3F51B5",
  },
  card: {
    backgroundColor: "white",
    padding: 30,
    borderRadius: 16,
    alignItems: "center",
    width: "90%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#3F51B5",
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 18,
    color: "#5C6BC0",
    marginBottom: 30,
    textAlign: "center",
  },
  button: {
    backgroundColor: "#3F51B5",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 30,
    width: "80%",
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 18,
  },
  creditsText: {
    marginTop: 30,
    fontSize: 14,
    color: "#9E9E9E",
    textAlign: "center",
  },
});

export default GameSetupScreen;
