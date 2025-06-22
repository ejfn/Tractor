import React, { useEffect, useRef } from "react";
import {
  Animated,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
} from "react-native";
import { Card, RoundResult, Rank } from "../types";
import AnimatedCardComponent from "./AnimatedCard";
import { useModalsTranslation } from "../hooks/useTranslation";
import type { ModalsTranslationKey } from "../locales/types";
import { getTeamDisplayName } from "../utils/translationHelpers";

// Helper function to generate the round result message in the UI layer
function generateModalMessage(
  roundResult: RoundResult,
  tModals: (
    key: ModalsTranslationKey,
    options?: Record<string, unknown>,
  ) => string,
): string {
  const teamName = getTeamDisplayName(roundResult.winningTeam);
  const rankText = roundResult.rankAdvancement === 1 ? "rank" : "ranks";
  const newRank = roundResult.rankChanges[roundResult.winningTeam];

  if (roundResult.attackingTeamWon) {
    // Attacking team won
    if (roundResult.rankAdvancement === 0) {
      return (
        tModals("roundResult.attackingWonDefend", {
          teamName,
          points: roundResult.finalPoints,
          rank: newRank,
        }) + roundResult.pointsBreakdown
      );
    } else {
      if (newRank === Rank.Ace) {
        return (
          tModals("roundResult.attackingWonAce", {
            teamName,
            points: roundResult.finalPoints,
          }) + roundResult.pointsBreakdown
        );
      } else {
        return (
          tModals("roundResult.attackingWonAdvance", {
            teamName,
            points: roundResult.finalPoints,
            advancement: roundResult.rankAdvancement,
            rankText,
            rank: newRank,
          }) + roundResult.pointsBreakdown
        );
      }
    }
  } else {
    // Defending team won
    const pointMessage =
      roundResult.finalPoints === 0
        ? tModals("roundResult.heldToPoints", { points: 0 })
        : tModals("roundResult.defendedWithPoints", {
            points: roundResult.finalPoints,
          });

    if (roundResult.gameOver) {
      return (
        tModals("roundResult.defendingWonGame", {
          teamName,
          pointMessage,
        }) + roundResult.pointsBreakdown
      );
    } else if (newRank === Rank.Ace) {
      return (
        tModals("roundResult.defendingWonAce", {
          teamName,
          pointMessage,
        }) + roundResult.pointsBreakdown
      );
    } else {
      return (
        tModals("roundResult.defendingWonAdvance", {
          teamName,
          pointMessage,
          advancement: roundResult.rankAdvancement,
          rankText,
          rank: newRank,
        }) + roundResult.pointsBreakdown
      );
    }
  }
}

interface RoundCompleteModalProps {
  onNextRound: () => void;
  onNewGame?: () => void; // For game over scenarios
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
  onNewGame,
  kittyCards,
  roundResult,
}) => {
  const { t: tModals } = useModalsTranslation();

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Game over celebration animations
  const firework1 = useRef(new Animated.Value(0)).current;
  const firework2 = useRef(new Animated.Value(0)).current;
  const firework3 = useRef(new Animated.Value(0)).current;
  const confetti1 = useRef(new Animated.Value(0)).current;
  const confetti2 = useRef(new Animated.Value(0)).current;
  const confetti3 = useRef(new Animated.Value(0)).current;
  const sparkle1 = useRef(new Animated.Value(0)).current;
  const sparkle2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Reset animations
    scaleAnim.setValue(0);
    bounceAnim.setValue(0);
    fadeAnim.setValue(0);

    // Reset celebration animations
    firework1.setValue(0);
    firework2.setValue(0);
    firework3.setValue(0);
    confetti1.setValue(0);
    confetti2.setValue(0);
    confetti3.setValue(0);
    sparkle1.setValue(0);
    sparkle2.setValue(0);

    // Start basic animations
    const basicAnimations = [
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
    ];

    // Add celebration animations for game over
    if (roundResult.gameOver) {
      const celebrationAnimations = [
        // Fireworks with staggered timing
        Animated.sequence([
          Animated.delay(500),
          Animated.timing(firework1, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.delay(700),
          Animated.timing(firework2, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.delay(900),
          Animated.timing(firework3, {
            toValue: 1,
            duration: 1100,
            useNativeDriver: true,
          }),
        ]),
        // Confetti falling
        Animated.sequence([
          Animated.delay(400),
          Animated.timing(confetti1, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.delay(600),
          Animated.timing(confetti2, {
            toValue: 1,
            duration: 2200,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.delay(800),
          Animated.timing(confetti3, {
            toValue: 1,
            duration: 1800,
            useNativeDriver: true,
          }),
        ]),
        // Sparkles
        Animated.loop(
          Animated.sequence([
            Animated.timing(sparkle1, {
              toValue: 1,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(sparkle1, {
              toValue: 0,
              duration: 800,
              useNativeDriver: true,
            }),
          ]),
        ),
        Animated.loop(
          Animated.sequence([
            Animated.delay(400),
            Animated.timing(sparkle2, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(sparkle2, {
              toValue: 0,
              duration: 1000,
              useNativeDriver: true,
            }),
          ]),
        ),
      ];

      Animated.parallel([...basicAnimations, ...celebrationAnimations]).start();
    } else {
      Animated.parallel(basicAnimations).start();
    }
  }, [
    bounceAnim,
    fadeAnim,
    scaleAnim,
    roundResult.gameOver,
    firework1,
    firework2,
    firework3,
    confetti1,
    confetti2,
    confetti3,
    sparkle1,
    sparkle2,
  ]);

  const translateY = bounceAnim.interpolate({
    inputRange: [0, 0.5, 0.7, 0.85, 1],
    outputRange: [50, -10, 5, -2, 0],
  });

  // Celebration animation transforms
  const { height: screenHeight } = Dimensions.get("window");

  const firework1Transform = {
    opacity: firework1,
    scale: firework1.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0, 1.5, 0.3],
    }),
    translateY: firework1.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -50],
    }),
  };

  const firework2Transform = {
    opacity: firework2,
    scale: firework2.interpolate({
      inputRange: [0, 0.6, 1],
      outputRange: [0, 1.2, 0.2],
    }),
    translateY: firework2.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -30],
    }),
  };

  const firework3Transform = {
    opacity: firework3,
    scale: firework3.interpolate({
      inputRange: [0, 0.4, 1],
      outputRange: [0, 1.8, 0.4],
    }),
    translateY: firework3.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -70],
    }),
  };

  const confetti1Transform = {
    opacity: confetti1,
    translateY: confetti1.interpolate({
      inputRange: [0, 1],
      outputRange: [-50, screenHeight * 0.8],
    }),
    rotate: confetti1.interpolate({
      inputRange: [0, 1],
      outputRange: ["0deg", "720deg"],
    }),
  };

  const confetti2Transform = {
    opacity: confetti2,
    translateY: confetti2.interpolate({
      inputRange: [0, 1],
      outputRange: [-30, screenHeight * 0.9],
    }),
    rotate: confetti2.interpolate({
      inputRange: [0, 1],
      outputRange: ["0deg", "-540deg"],
    }),
  };

  const confetti3Transform = {
    opacity: confetti3,
    translateY: confetti3.interpolate({
      inputRange: [0, 1],
      outputRange: [-70, screenHeight * 0.7],
    }),
    rotate: confetti3.interpolate({
      inputRange: [0, 1],
      outputRange: ["0deg", "900deg"],
    }),
  };

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

            {/* Game Over Celebration Effects */}
            {roundResult.gameOver && (
              <>
                {/* Fireworks */}
                <Animated.View
                  style={[
                    styles.firework,
                    styles.firework1,
                    {
                      opacity: firework1Transform.opacity,
                      transform: [
                        { scale: firework1Transform.scale },
                        { translateY: firework1Transform.translateY },
                      ],
                    },
                  ]}
                >
                  <Text style={styles.fireworkEmoji}>✨</Text>
                </Animated.View>

                <Animated.View
                  style={[
                    styles.firework,
                    styles.firework2,
                    {
                      opacity: firework2Transform.opacity,
                      transform: [
                        { scale: firework2Transform.scale },
                        { translateY: firework2Transform.translateY },
                      ],
                    },
                  ]}
                >
                  <Text style={styles.fireworkEmoji}>🎆</Text>
                </Animated.View>

                <Animated.View
                  style={[
                    styles.firework,
                    styles.firework3,
                    {
                      opacity: firework3Transform.opacity,
                      transform: [
                        { scale: firework3Transform.scale },
                        { translateY: firework3Transform.translateY },
                      ],
                    },
                  ]}
                >
                  <Text style={styles.fireworkEmoji}>🎇</Text>
                </Animated.View>

                {/* Confetti */}
                <Animated.View
                  style={[
                    styles.confetti,
                    styles.confetti1,
                    {
                      opacity: confetti1Transform.opacity,
                      transform: [
                        { translateY: confetti1Transform.translateY },
                        { rotate: confetti1Transform.rotate },
                      ],
                    },
                  ]}
                >
                  <Text style={styles.confettiEmoji}>🎊</Text>
                </Animated.View>

                <Animated.View
                  style={[
                    styles.confetti,
                    styles.confetti2,
                    {
                      opacity: confetti2Transform.opacity,
                      transform: [
                        { translateY: confetti2Transform.translateY },
                        { rotate: confetti2Transform.rotate },
                      ],
                    },
                  ]}
                >
                  <Text style={styles.confettiEmoji}>🎉</Text>
                </Animated.View>

                <Animated.View
                  style={[
                    styles.confetti,
                    styles.confetti3,
                    {
                      opacity: confetti3Transform.opacity,
                      transform: [
                        { translateY: confetti3Transform.translateY },
                        { rotate: confetti3Transform.rotate },
                      ],
                    },
                  ]}
                >
                  <Text style={styles.confettiEmoji}>🌟</Text>
                </Animated.View>

                {/* Sparkles */}
                <Animated.View
                  style={[
                    styles.sparkle,
                    styles.sparkle1,
                    {
                      opacity: sparkle1,
                      transform: [{ scale: sparkle1 }],
                    },
                  ]}
                >
                  <Text style={styles.sparkleEmoji}>💫</Text>
                </Animated.View>

                <Animated.View
                  style={[
                    styles.sparkle,
                    styles.sparkle2,
                    {
                      opacity: sparkle2,
                      transform: [{ scale: sparkle2 }],
                    },
                  ]}
                >
                  <Text style={styles.sparkleEmoji}>⭐</Text>
                </Animated.View>
              </>
            )}

            {/* Trophy/Crown emoji for winner */}
            <Text style={styles.trophy}>
              {roundResult.gameOver
                ? "🏆"
                : roundResult.attackingTeamWon
                  ? "⚔️"
                  : "🛡️"}
            </Text>

            <Text style={styles.title}>
              {roundResult.gameOver
                ? tModals("gameOver.title")
                : tModals("roundComplete.title")}
            </Text>
            <Text style={styles.message}>
              {generateModalMessage(roundResult, tModals)}
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
              style={[
                styles.button,
                roundResult.gameOver && styles.gameOverButton,
              ]}
              onPress={roundResult.gameOver ? onNewGame : onNextRound}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.buttonGradient,
                  roundResult.gameOver && styles.gameOverButtonGradient,
                ]}
              >
                <Text style={styles.buttonText}>
                  {roundResult.gameOver
                    ? tModals("gameOver.newGame")
                    : tModals("roundComplete.nextRound")}
                </Text>
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
  gameOverButton: {
    shadowColor: "#FFD700",
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
  },
  gameOverButtonGradient: {
    backgroundColor: "#FF6B35",
    borderColor: "#E55100",
    shadowColor: "#FFD700",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  // Celebration Effects Styles
  firework: {
    position: "absolute",
    zIndex: 1000,
  },
  firework1: {
    top: 20,
    left: 60,
  },
  firework2: {
    top: 40,
    right: 50,
  },
  firework3: {
    top: 80,
    left: 30,
  },
  fireworkEmoji: {
    fontSize: 30,
    textAlign: "center",
  },
  confetti: {
    position: "absolute",
    zIndex: 999,
  },
  confetti1: {
    top: -50,
    left: 80,
  },
  confetti2: {
    top: -30,
    right: 60,
  },
  confetti3: {
    top: -70,
    left: 140,
  },
  confettiEmoji: {
    fontSize: 20,
    textAlign: "center",
  },
  sparkle: {
    position: "absolute",
    zIndex: 1001,
  },
  sparkle1: {
    top: 30,
    right: 20,
  },
  sparkle2: {
    top: 120,
    left: 10,
  },
  sparkleEmoji: {
    fontSize: 25,
    textAlign: "center",
  },
});

export default RoundCompleteModal;
