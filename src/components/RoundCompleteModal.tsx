import React, { useEffect, useRef } from "react";
import {
  Animated,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Card, RoundResult } from "../types";
import AnimatedCardComponent from "./AnimatedCard";

interface RoundCompleteModalProps {
  onNextRound: () => void;
  fadeAnim?: Animated.Value;
  scaleAnim?: Animated.Value;
  kittyCards?: Card[]; // Kitty cards to display
  roundResult: RoundResult; // Round result containing message and winning team data
}

/**
 * Round completion modal displaying the round results and next round button
 */
const RoundCompleteModal: React.FC<RoundCompleteModalProps> = ({
  onNextRound,
  kittyCards,
  roundResult,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Reset animations
    scaleAnim.setValue(0);
    bounceAnim.setValue(0);
    fadeAnim.setValue(0);

    // Start animations
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.timing(bounceAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [bounceAnim, fadeAnim, scaleAnim]);

  const translateY = bounceAnim.interpolate({
    inputRange: [0, 0.5, 0.7, 0.85, 1],
    outputRange: [50, -10, 5, -2, 0],
  });

  return (
    <Modal
      visible={true}
      transparent={true}
      animationType="fade"
      onRequestClose={onNextRound}
    >
      <SafeAreaView style={styles.modalWrapper}>
        <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
          <Animated.View
            style={[
              styles.modalContent,
              {
                transform: [{ scale: scaleAnim }, { translateY: translateY }],
              },
            ]}
          >
            {/* Background effects */}
            <View style={styles.backgroundDeco1} />
            <View style={styles.backgroundDeco2} />

            {/* Trophy/Crown emoji for winner */}
            <Text style={styles.trophy}>
              {roundResult.attackingTeamWon ? "⚔️" : "🛡️"}
            </Text>

            <Text style={styles.title}>Round Complete!</Text>
            <Text style={styles.message}>
              {roundResult.roundCompleteMessage}
            </Text>

            {/* Kitty Cards Display */}
            {kittyCards && kittyCards.length > 0 && (
              <View style={styles.kittySection}>
                <View style={styles.kittyCardsContainer}>
                  {kittyCards.map((card, index) => (
                    <View
                      key={card.id}
                      style={[
                        styles.kittyCardWrapper,
                        index === 0 ? { marginLeft: 0 } : {},
                      ]}
                    >
                      <AnimatedCardComponent
                        card={card}
                        selected={false}
                        scale={0.75}
                        disabled={false}
                        style={styles.kittyCard}
                      />
                    </View>
                  ))}
                </View>
              </View>
            )}

            <TouchableOpacity
              style={styles.button}
              onPress={onNextRound}
              activeOpacity={0.8}
            >
              <View style={styles.buttonGradient}>
                <Text style={styles.buttonText}>NEXT ROUND →</Text>
              </View>
            </TouchableOpacity>

            {/* Decorative corners */}
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </Animated.View>
        </Animated.View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalWrapper: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: "#FAFAFA",
    borderRadius: 16,
    padding: 20,
    width: "90%",
    maxWidth: 320,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 10000,
    borderWidth: 2,
    borderColor: "#FFD700",
    position: "relative",
    overflow: "hidden",
  },
  backgroundDeco1: {
    position: "absolute",
    top: -50,
    right: -50,
    width: 150,
    height: 150,
    backgroundColor: "#FFD700",
    borderRadius: 75,
    opacity: 0.1,
  },
  backgroundDeco2: {
    position: "absolute",
    bottom: -70,
    left: -70,
    width: 200,
    height: 200,
    backgroundColor: "#3F51B5",
    borderRadius: 100,
    opacity: 0.08,
  },
  trophy: {
    fontSize: 48,
    marginBottom: 10,
    textShadowColor: "rgba(0, 0, 0, 0.2)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2C3E50",
    marginBottom: 8,
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.1)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  message: {
    fontSize: 16,
    color: "#34495E",
    textAlign: "center",
    marginBottom: 8,
    lineHeight: 22,
    fontWeight: "500",
    paddingHorizontal: 10,
  },
  kittySection: {
    marginBottom: 20,
    paddingRight: 20,
    width: "100%",
    alignItems: "center",
  },
  kittyCardsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    height: 70,
  },
  kittyCardWrapper: {
    width: 40,
    height: 70,
    marginLeft: -16,
  },
  kittyCard: {
    // Scale handled by AnimatedCard scale prop
  },
  button: {
    marginTop: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
  },
  buttonGradient: {
    backgroundColor: "#4CAF50",
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 24,
    minWidth: 160,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#45a049",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  corner: {
    position: "absolute",
    width: 24,
    height: 24,
    borderColor: "#FFD700",
    borderWidth: 2,
  },
  topLeft: {
    top: -2,
    left: -2,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 16,
  },
  topRight: {
    top: -2,
    right: -2,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 16,
  },
  bottomLeft: {
    bottom: -2,
    left: -2,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 16,
  },
  bottomRight: {
    bottom: -2,
    right: -2,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 16,
  },
});

export default RoundCompleteModal;
