import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  View,
  TextStyle,
  TouchableWithoutFeedback,
  Modal,
  TouchableOpacity,
} from "react-native";
import { GamePhase, Suit, Team, TrumpInfo } from "../types";
import {
  useCommonTranslation,
  useGameTranslation,
  useModalsTranslation,
} from "../hooks/useTranslation";
import { getTeamDisplayName } from "../utils/translationHelpers";
import { getSuitColorStyle, getSuitSymbol } from "../utils/suitHelpers";

interface GameStatusProps {
  teams: [Team, Team];
  trumpInfo: TrumpInfo;
  roundNumber: number;
  gamePhase: GamePhase;
  onStartNewGame?: () => void; // Hidden new game trigger
}

// Animated progress bar component
const AnimatedProgressBar: React.FC<{
  points: number;
  maxPoints: number;
}> = ({ points, maxPoints }) => {
  const progressWidth = useRef(new Animated.Value(0)).current;
  const previousPoints = useRef(0);

  useEffect(() => {
    const targetWidth = Math.min(100, (points / maxPoints) * 100);

    // Calculate duration using the same logic as rolling number animation
    const pointsDiff = Math.abs(points - previousPoints.current);
    const duration = Math.min(1000, pointsDiff * 50); // Max 1 second, same as rolling number

    Animated.timing(progressWidth, {
      toValue: targetWidth,
      duration: duration,
      useNativeDriver: false, // Width animations require useNativeDriver: false
    }).start();

    previousPoints.current = points;
  }, [points, maxPoints, progressWidth]);

  const animatedStyle = {
    width: progressWidth.interpolate({
      inputRange: [0, 100],
      outputRange: ["0%", "100%"],
      extrapolate: "clamp",
    }),
  };

  return (
    <View style={styles.progressContainer}>
      <Animated.View
        style={[styles.progressBar, styles.attackingProgress, animatedStyle]}
      />
    </View>
  );
};

// Rolling number animation component
const RollingNumber: React.FC<{
  value: number;
  isAttackingTeam: boolean;
  style?: TextStyle;
}> = ({ value, isAttackingTeam, style }) => {
  const [displayValue, setDisplayValue] = useState(value);
  const [previousValue, setPreviousValue] = useState(value);

  useEffect(() => {
    if (!isAttackingTeam || value === previousValue) {
      setDisplayValue(value);
      return;
    }

    // Only animate when attacking team gains points
    if (value > previousValue) {
      let currentValue = previousValue;
      const increment =
        value > previousValue + 10
          ? Math.ceil((value - previousValue) / 20)
          : 1;
      const duration = Math.min(1000, (value - previousValue) * 50); // Max 1 second
      const stepTime = duration / (value - previousValue);

      const animateValue = () => {
        if (currentValue < value) {
          currentValue = Math.min(currentValue + increment, value);
          setDisplayValue(currentValue);
          setTimeout(animateValue, stepTime);
        }
      };

      animateValue();
    } else {
      setDisplayValue(value);
    }

    setPreviousValue(value);
  }, [value, isAttackingTeam, previousValue]);

  return <Text style={style}>{displayValue}/80</Text>;
};

const GameStatus: React.FC<GameStatusProps> = ({
  teams,
  trumpInfo,
  roundNumber,
  gamePhase,
  onStartNewGame,
}) => {
  // Translation hooks
  const { t: tCommon } = useCommonTranslation();
  const { t: tGame } = useGameTranslation();
  const { t: tModals } = useModalsTranslation();

  // Hidden new game trigger - 5 quick taps on trump display
  const [tapCount, setTapCount] = useState(0);
  const [showNewGameModal, setShowNewGameModal] = useState(false);
  const tapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTrumpTap = () => {
    const newCount = tapCount + 1;
    setTapCount(newCount);

    // Clear existing timeout
    if (tapTimeoutRef.current) {
      clearTimeout(tapTimeoutRef.current);
    }

    if (newCount >= 5) {
      // 5 taps reached - show confirmation
      setTapCount(0);
      setShowNewGameModal(true);
    } else {
      // Reset counter after 2 seconds if not reached 5 taps
      tapTimeoutRef.current = setTimeout(() => {
        setTapCount(0);
      }, 2000);
    }
  };
  // Animation values
  const phaseAnimation = useRef(new Animated.Value(0)).current;

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
      }),
    ]).start();
  }, [gamePhase, phaseAnimation]);

  // Shared scale animation for both phase and trump
  const phaseScale = phaseAnimation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.1, 1],
  });

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.roundInfo}>
          <Text style={styles.roundText}>
            {tCommon("round", { number: roundNumber })}
          </Text>
          <Animated.View
            style={[
              styles.phaseIndicator,
              { transform: [{ scale: phaseScale }] },
            ]}
          >
            <Text style={styles.phaseText}>{tGame(`phases.${gamePhase}`)}</Text>
          </Animated.View>
        </View>

        <View style={styles.trumpInfo}>
          <Text style={styles.trumpLabel}>{tCommon("trump")}</Text>
          <TouchableWithoutFeedback onPress={handleTrumpTap}>
            <Animated.View
              style={[
                styles.trumpDisplay,
                { transform: [{ scale: phaseScale }] },
              ]}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                {trumpInfo.trumpSuit && trumpInfo.trumpSuit !== Suit.None ? (
                  <>
                    <Text
                      style={[
                        styles.trumpText,
                        getSuitColorStyle(trumpInfo.trumpSuit),
                      ]}
                    >
                      {trumpInfo.trumpRank}
                    </Text>
                    <Text
                      style={[
                        styles.suitSymbol,
                        getSuitColorStyle(trumpInfo.trumpSuit),
                      ]}
                    >
                      {getSuitSymbol(trumpInfo.trumpSuit)}
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.trumpText}>{trumpInfo.trumpRank}</Text>
                    {trumpInfo.trumpSuit === Suit.None && (
                      <Text style={styles.suitSymbol}>🤡</Text>
                    )}
                  </>
                )}
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </View>

      <View style={styles.teamsContainer}>
        {teams.map((team) => (
          <View
            key={team.id}
            style={[
              styles.teamCard,
              team.isDefending ? styles.defendingTeam : styles.attackingTeam,
            ]}
          >
            <View style={styles.teamHeader}>
              <Text style={styles.teamName}>{getTeamDisplayName(team.id)}</Text>
              <View
                style={[
                  styles.statusBadge,
                  team.isDefending
                    ? styles.defendingBadge
                    : styles.attackingBadge,
                ]}
              >
                <Text style={styles.statusText}>
                  {team.isDefending
                    ? tGame("status.defending")
                    : tGame("status.attacking")}
                </Text>
              </View>
            </View>

            <View style={styles.teamStats}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>{tGame("status.rank")}</Text>
                <Text style={styles.statValue}>{team.currentRank}</Text>
              </View>

              {!team.isDefending && (
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>{tGame("status.points")}</Text>
                  <RollingNumber
                    value={team.points}
                    isAttackingTeam={!team.isDefending}
                    style={
                      team.points >= 80
                        ? {
                            ...styles.statValue,
                            ...styles.pointsValue,
                            ...styles.winningPoints,
                          }
                        : { ...styles.statValue, ...styles.pointsValue }
                    }
                  />
                </View>
              )}
            </View>

            {/* Animated progress bar for points - only for attacking team */}
            {!team.isDefending && (
              <AnimatedProgressBar points={team.points} maxPoints={80} />
            )}
          </View>
        ))}
      </View>

      {/* New Game Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showNewGameModal}
        onRequestClose={() => setShowNewGameModal(false)}
      >
        <View style={modalStyles.overlay}>
          <View style={modalStyles.modalContainer}>
            <View style={modalStyles.header}>
              <Text style={modalStyles.title}>{tModals("newGame.title")}</Text>
            </View>

            <View style={modalStyles.content}>
              <Text style={modalStyles.message}>
                {tModals("newGame.message")}
              </Text>
              <Text style={modalStyles.submessage}>
                {tModals("newGame.submessage")}
              </Text>
            </View>

            <View style={modalStyles.buttonContainer}>
              <TouchableOpacity
                style={[modalStyles.button, modalStyles.cancelButton]}
                onPress={() => setShowNewGameModal(false)}
              >
                <Text style={modalStyles.cancelButtonText}>
                  {tModals("newGame.cancel")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[modalStyles.button, modalStyles.confirmButton]}
                onPress={() => {
                  setShowNewGameModal(false);
                  onStartNewGame?.();
                }}
              >
                <Text style={modalStyles.confirmButtonText}>
                  {tModals("newGame.confirm")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "transparent", // Reverted from green color to transparent
    borderRadius: 16, // Matched with gameTable border radius
    padding: 8, // Reduced padding on Android
    paddingTop: 0, // No top padding on Android
    paddingHorizontal: 0,
    marginLeft: 10,
    marginRight: 10,
    marginTop: 16, // Increased top margin to 16px for more comfortable spacing
    marginBottom: 2, // Even smaller bottom margin on Android
    borderWidth: 0, // Removed border
    borderColor: "transparent",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 10,
    marginBottom: 5, // Increased margin to create separation
    marginTop: 2, // Slight top margin
    minHeight: 36, // Ensure consistent height
    paddingBottom: 10, // Add padding to increase separation
  },
  roundInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  roundText: {
    fontSize: 15, // Slightly smaller font
    fontWeight: "bold",
    marginRight: 8, // Reduced margin
    color: "#0a7ea4", // Teal to match the app's tint color
  },
  phaseIndicator: {
    backgroundColor: "#E1F5FE", // Solid light blue background
    paddingHorizontal: 8, // Reduced horizontal padding
    paddingVertical: 0, // No vertical padding
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#0a7ea4", // Teal border (app's tint color)
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
    minWidth: 65,
    height: 28, // Reduced height
    justifyContent: "center",
    alignItems: "center",
  },
  phaseText: {
    color: "#0a7ea4", // Teal text to match border
    fontSize: 13,
    fontWeight: "bold",
  },
  trumpInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  trumpLabel: {
    fontSize: 15, // Slightly smaller font
    fontWeight: "bold",
    marginRight: 8, // Reduced margin
    color: "#0a7ea4", // Teal to match the app's tint color
  },
  trumpDisplay: {
    backgroundColor: "#E1F5FE", // Solid light blue background
    paddingHorizontal: 8, // Reduced horizontal padding
    paddingVertical: 5, // Reduced vertical padding
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#0a7ea4", // Teal border (app's tint color)
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 65, // Match typical width of phase indicator
    height: 28, // Reduced height to match phase indicator
  },
  trumpText: {
    fontWeight: "bold",
    fontSize: 13,
    marginRight: 1,
    lineHeight: 16,
  },
  suitSymbol: {
    fontSize: 13,
    fontWeight: "bold",
    marginLeft: 2,
    lineHeight: 16,
    marginBottom: 1, // Lift it up slightly
  },
  teamsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    //marginHorizontal: 0
  },
  teamCard: {
    flex: 1,
    borderRadius: 10,
    padding: 10, // Reduced padding
    marginHorizontal: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  defendingTeam: {
    backgroundColor: "#E8F5E9",
    borderColor: "#2E7D32",
    borderWidth: 1.5,
  },
  attackingTeam: {
    backgroundColor: "#FFEBEE",
    borderColor: "#C62828",
    borderWidth: 1.5,
  },
  teamHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6, // Reduced margin
  },
  teamName: {
    fontSize: 15, // Slightly smaller font
    fontWeight: "bold",
    color: "#212121",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  defendingBadge: {
    backgroundColor: "#2E7D32",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.5)",
  },
  attackingBadge: {
    backgroundColor: "#C62828",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.5)",
  },
  statusText: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  teamStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6, // Reduced margin
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  statLabel: {
    fontSize: 12,
    marginRight: 4,
    color: "#424242",
  },
  statValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#212121",
  },
  pointsValue: {
    fontSize: 16,
  },
  winningPoints: {
    color: "#2E7D32",
    fontWeight: "bold",
  },
  progressContainer: {
    height: 8, // Reduced height
    backgroundColor: "#E0E0E0",
    borderRadius: 4, // Reduced border radius
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.1)",
  },
  progressBar: {
    height: "100%",
    borderRadius: 3, // Smaller border radius to match container
  },
  defendingProgress: {
    backgroundColor: "#4CAF50",
  },
  attackingProgress: {
    backgroundColor: "#E53935",
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    backgroundColor: "#faf5f0",
    borderRadius: 16,
    padding: 0,
    margin: 20,
    maxWidth: 340,
    width: "90%",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 1,
    borderColor: "#e8ddd4",
  },
  header: {
    backgroundColor: "#f0e6d6",
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#d6c7b3",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#5d4e37",
    textAlign: "center",
  },
  content: {
    padding: 24,
    alignItems: "center",
  },
  message: {
    fontSize: 16,
    fontWeight: "600",
    color: "#5d4e37",
    textAlign: "center",
    marginBottom: 12,
    lineHeight: 22,
  },
  submessage: {
    fontSize: 14,
    color: "#8b7355",
    textAlign: "center",
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: "row",
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 8,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: "#e8ddd4",
    borderWidth: 1,
    borderColor: "#d6c7b3",
  },
  confirmButton: {
    backgroundColor: "#c53030",
  },
  cancelButtonText: {
    color: "#5d4e37",
    fontSize: 16,
    fontWeight: "600",
  },
  confirmButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default GameStatus;
