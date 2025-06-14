import React, { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View, TextStyle } from "react-native";
import { GamePhase, Suit, Team, TrumpInfo } from "../types";

const getSuitSymbol = (suit: Suit): string => {
  switch (suit) {
    case Suit.Hearts:
      return "♥";
    case Suit.Diamonds:
      return "♦";
    case Suit.Clubs:
      return "♣";
    case Suit.Spades:
      return "♠";
    default:
      return "";
  }
};

const getSuitColorStyle = (suit: Suit, styles: Record<string, TextStyle>) => {
  return suit === Suit.Hearts || suit === Suit.Diamonds
    ? styles.redSuit
    : styles.blackSuit;
};

interface GameStatusProps {
  teams: [Team, Team];
  trumpInfo: TrumpInfo;
  roundNumber: number;
  gamePhase: GamePhase;
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
}) => {
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
          <Text style={styles.roundText}>Round {roundNumber}</Text>
          <Animated.View
            style={[
              styles.phaseIndicator,
              { transform: [{ scale: phaseScale }] },
            ]}
          >
            <Text style={styles.phaseText}>
              {gamePhase.charAt(0).toUpperCase() + gamePhase.slice(1)}
            </Text>
          </Animated.View>
        </View>

        <View style={styles.trumpInfo}>
          <Text style={styles.trumpLabel}>Trump</Text>
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
                      getSuitColorStyle(trumpInfo.trumpSuit, styles),
                    ]}
                  >
                    {trumpInfo.trumpRank}
                  </Text>
                  <Text
                    style={[
                      styles.suitSymbol,
                      getSuitColorStyle(trumpInfo.trumpSuit, styles),
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
              <Text style={styles.teamName}>Team {team.id}</Text>
              <View
                style={[
                  styles.statusBadge,
                  team.isDefending
                    ? styles.defendingBadge
                    : styles.attackingBadge,
                ]}
              >
                <Text style={styles.statusText}>
                  {team.isDefending ? "Defending" : "Attacking"}
                </Text>
              </View>
            </View>

            <View style={styles.teamStats}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Rank:</Text>
                <Text style={styles.statValue}>{team.currentRank}</Text>
              </View>

              {!team.isDefending && (
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Points:</Text>
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
  redSuit: {
    color: "#D32F2F", // Deeper red for contrast on light background
  },
  blackSuit: {
    color: "#000000", // Black for contrast on light background
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

export default GameStatus;
