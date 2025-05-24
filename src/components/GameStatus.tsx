import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { Suit, Team, TrumpInfo, GamePhase } from "../types/game";

interface GameStatusProps {
  teams: [Team, Team];
  trumpInfo: TrumpInfo;
  roundNumber: number;
  gamePhase: GamePhase;
}

const GameStatus: React.FC<GameStatusProps> = ({
  teams,
  trumpInfo,
  roundNumber,
  gamePhase,
}) => {
  // Animation values
  const phaseAnimation = useRef(new Animated.Value(0)).current;
  const trumpAnimation = useRef(new Animated.Value(0)).current;

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

  // Trigger animation when trump info changes
  useEffect(() => {
    Animated.sequence([
      Animated.timing(trumpAnimation, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(trumpAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
        delay: 1500,
      }),
    ]).start();
  }, [trumpInfo, trumpAnimation]);

  // Animations for phase and trump
  const phaseScale = phaseAnimation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.1, 1],
  });

  const trumpScale = trumpAnimation.interpolate({
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
              { transform: [{ scale: trumpScale }] },
            ]}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              {trumpInfo.trumpSuit ? (
                <>
                  <Text
                    style={[
                      styles.trumpText,
                      trumpInfo.trumpSuit === Suit.Hearts ||
                      trumpInfo.trumpSuit === Suit.Diamonds
                        ? styles.redSuit
                        : styles.blackSuit,
                    ]}
                  >
                    {trumpInfo.trumpRank}
                  </Text>
                  <Text
                    style={[
                      styles.suitSymbol,
                      trumpInfo.trumpSuit === Suit.Hearts ||
                      trumpInfo.trumpSuit === Suit.Diamonds
                        ? styles.redSuit
                        : styles.blackSuit,
                    ]}
                  >
                    {trumpInfo.trumpSuit === Suit.Hearts
                      ? "♥"
                      : trumpInfo.trumpSuit === Suit.Diamonds
                        ? "♦"
                        : trumpInfo.trumpSuit === Suit.Clubs
                          ? "♣"
                          : trumpInfo.trumpSuit === Suit.Spades
                            ? "♠"
                            : ""}
                  </Text>
                </>
              ) : (
                <Text style={styles.trumpText}>{trumpInfo.trumpRank}</Text>
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
                  <Text
                    style={[
                      styles.statValue,
                      styles.pointsValue,
                      team.points >= 80 ? styles.winningPoints : null,
                    ]}
                  >
                    {team.points}/80
                  </Text>
                </View>
              )}
            </View>

            {/* Progress bar for points - only for attacking team */}
            {!team.isDefending && (
              <View style={styles.progressContainer}>
                <View
                  style={[
                    styles.progressBar,
                    styles.attackingProgress,
                    { width: `${Math.min(100, (team.points / 80) * 100)}%` },
                  ]}
                />
              </View>
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
    paddingVertical: 5, // Reduced vertical padding
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
