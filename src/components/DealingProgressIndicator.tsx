import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { GameState, PlayerId } from "../types";
import {
  getDealingProgress,
  getLastDealtCard,
  isDealingPaused,
  getDealingPauseReason,
} from "../game/gameLogic";
import { getTrumpDeclarationStatus } from "../game/trumpDeclarationManager";

interface DealingProgressIndicatorProps {
  gameState: GameState;
}

export function DealingProgressIndicator({
  gameState,
}: DealingProgressIndicatorProps) {
  const progress = getDealingProgress(gameState);
  const lastDealtCard = getLastDealtCard(gameState);
  const isPaused = isDealingPaused(gameState);
  const pauseReason = getDealingPauseReason(gameState);
  const declarationStatus = getTrumpDeclarationStatus(gameState);

  const progressPercentage = (progress.current / progress.total) * 100;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Dealing Cards</Text>
        {isPaused && (
          <Text style={styles.pausedText}>
            Paused for{" "}
            {pauseReason === "trump_declaration"
              ? "Trump Declaration"
              : pauseReason}
          </Text>
        )}
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View
            style={[styles.progressFill, { width: `${progressPercentage}%` }]}
          />
        </View>
        <Text style={styles.progressText}>
          {progress.current} / {progress.total} cards dealt
        </Text>
      </View>

      {lastDealtCard && (
        <View style={styles.lastCardInfo}>
          <Text style={styles.lastCardText}>
            Last card to: {getPlayerDisplayName(lastDealtCard.playerId)}
          </Text>
        </View>
      )}

      {declarationStatus.hasDeclaration && (
        <View style={styles.declarationStatus}>
          <Text style={styles.declarationText}>
            🃏 {getPlayerDisplayName(declarationStatus.declarer!)} declared{" "}
            {declarationStatus.type} in {declarationStatus.suit}
          </Text>
        </View>
      )}

      <View style={styles.playerHands}>
        {gameState.players.map((player, index) => (
          <View key={player.id} style={styles.playerHand}>
            <Text style={styles.playerName}>
              {getPlayerDisplayName(player.id)}
            </Text>
            <Text style={styles.cardCount}>{player.hand.length} cards</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function getPlayerDisplayName(playerId: string): string {
  switch (playerId) {
    case PlayerId.Human:
      return "You";
    case PlayerId.Bot1:
      return "Bot 1";
    case PlayerId.Bot2:
      return "Bot 2";
    case PlayerId.Bot3:
      return "Bot 3";
    default:
      return playerId;
  }
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    padding: 15,
    borderRadius: 10,
    margin: 10,
  },
  header: {
    alignItems: "center",
    marginBottom: 15,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  pausedText: {
    fontSize: 14,
    color: "#FFD700",
    marginTop: 5,
    fontStyle: "italic",
  },
  progressContainer: {
    marginBottom: 15,
  },
  progressBar: {
    height: 8,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#4CAF50",
    borderRadius: 4,
  },
  progressText: {
    color: "#CCCCCC",
    textAlign: "center",
    fontSize: 14,
  },
  lastCardInfo: {
    backgroundColor: "rgba(76, 175, 80, 0.2)",
    padding: 8,
    borderRadius: 5,
    marginBottom: 10,
  },
  lastCardText: {
    color: "#4CAF50",
    textAlign: "center",
    fontSize: 14,
  },
  declarationStatus: {
    backgroundColor: "rgba(255, 215, 0, 0.2)",
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
  },
  declarationText: {
    color: "#FFD700",
    textAlign: "center",
    fontSize: 16,
    fontWeight: "bold",
  },
  playerHands: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  playerHand: {
    alignItems: "center",
  },
  playerName: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  cardCount: {
    color: "#CCCCCC",
    fontSize: 11,
    marginTop: 2,
  },
});
