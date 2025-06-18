import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useGameTranslation } from "../hooks/useTranslation";
import { GameState, PlayerId } from "../types";
import { getPlayerDisplayName } from "../utils/translationHelpers";

interface TrickResultDisplayProps {
  visible: boolean;
  winnerId: string;
  points: number;
  gameState: GameState;
}

/**
 * Displays the trick winner and points earned
 */
const TrickResultDisplay: React.FC<TrickResultDisplayProps> = ({
  visible,
  winnerId,
  points,
  gameState,
}) => {
  const { t } = useGameTranslation();
  // Just use the visible prop directly - simpler code
  if (!visible) return null;

  // Find the winning player and determine team info
  const winningPlayer = gameState.players.find((p) => p.id === winnerId);
  if (!winningPlayer) return null;

  const winningTeam = gameState.teams.find((t) => t.id === winningPlayer.team);
  const isAttackingTeamWin = winningTeam ? !winningTeam.isDefending : false;

  const winnerName = getPlayerDisplayName(winningPlayer.id);

  return (
    <View style={styles.container}>
      <Text style={styles.winnerText}>
        {winningPlayer.id === PlayerId.Human
          ? t("tricks.youWin")
          : t("tricks.playerWins", { playerName: winnerName })}
      </Text>
      {points > 0 && isAttackingTeamWin && (
        <Text style={styles.pointsText}>
          {t("tricks.pointsAwarded", { points })}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFC107", // Gold background
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: "center",
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 1000,
    minWidth: 100,
    borderWidth: 1,
    borderColor: "#D4B82F", // Darker gold border
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 4,
  },
  winnerText: {
    color: "#212121", // Dark text for contrast
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 2,
  },
  pointsText: {
    color: "#D32F2F", // Red for points for contrast
    fontSize: 13,
    fontWeight: "bold",
    textAlign: "center",
  },
});

export default TrickResultDisplay;
