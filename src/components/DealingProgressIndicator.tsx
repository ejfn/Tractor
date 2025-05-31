import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { GameState, PlayerId, DeclarationType } from "../types";
import {
  getDealingProgress,
  getLastDealtCard,
  isDealingPaused,
  getDealingPauseReason,
} from "../game/gameLogic";
import { getTrumpDeclarationStatus } from "../game/trumpDeclarationManager";

interface DealingProgressIndicatorProps {
  gameState: GameState;
  onPauseDealing?: () => void;
  isModalVisible?: boolean;
}

export function DealingProgressIndicator({
  gameState,
  onPauseDealing,
  isModalVisible = false,
}: DealingProgressIndicatorProps) {
  const progress = getDealingProgress(gameState);
  const lastDealtCard = getLastDealtCard(gameState);
  const isPaused = isDealingPaused(gameState);
  const pauseReason = getDealingPauseReason(gameState);
  const declarationStatus = getTrumpDeclarationStatus(gameState);

  const progressPercentage = (progress.current / progress.total) * 100;

  const handleTap = () => {
    if (onPauseDealing && !isPaused) {
      onPauseDealing();
    }
  };

  // Use TouchableOpacity only when not paused, otherwise use View
  const ContainerComponent = isPaused ? View : TouchableOpacity;
  const containerProps = isPaused
    ? { style: styles.container }
    : { style: styles.container, onPress: handleTap, activeOpacity: 0.8 };

  return (
    <ContainerComponent {...containerProps}>
      {/* Compact progress bar */}
      <View style={styles.progressBar}>
        <View
          style={[styles.progressFill, { width: `${progressPercentage}%` }]}
        />
      </View>

      {/* Compact status text */}
      <Text style={styles.statusText}>
        {isPaused && pauseReason === "trump_declaration"
          ? "Trump Declaration"
          : `Dealing... ${progress.current}/${progress.total}`}
      </Text>

      {/* Show current declaration winner */}
      {declarationStatus.hasDeclaration && (
        <Text style={styles.declarationText}>
          {getPlayerDisplayName(declarationStatus.declarer!)} leads:{" "}
          {getDeclarationDisplay(
            declarationStatus.type!,
            declarationStatus.suit,
          )}
        </Text>
      )}

      {/* Show last dealt card - hide when modal is visible */}
      {lastDealtCard && !isPaused && !isModalVisible && (
        <Text style={styles.lastCardText}>
          → {getPlayerDisplayName(lastDealtCard.playerId)}
        </Text>
      )}

      {/* Tap hint - hide when modal is visible */}
      {!isPaused && !isModalVisible && (
        <Text style={styles.tapHint}>Tap to pause & declare</Text>
      )}
    </ContainerComponent>
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

function getSuitDisplay(suit: any): string {
  switch (suit) {
    case "Hearts":
      return "Hearts";
    case "Diamonds":
      return "Diamonds";
    case "Clubs":
      return "Clubs";
    case "Spades":
      return "Spades";
    default:
      return suit;
  }
}

function getDeclarationDisplay(type: DeclarationType, suit: any): string {
  const suitDisplay = getSuitDisplay(suit);

  switch (type) {
    case DeclarationType.Single:
      return suitDisplay; // Single symbol for single
    case DeclarationType.Pair:
      return `${suitDisplay} Pair`; // Suit name + "Pair"
    case DeclarationType.SmallJokerPair:
      return "Small Jokers";
    case DeclarationType.BigJokerPair:
      return "Big Jokers";
    default:
      return `${type} in ${suitDisplay}`;
  }
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 60,
    left: 10,
    right: 10,
    backgroundColor: "rgba(30, 40, 50, 0.95)",
    padding: 14,
    borderRadius: 12,
    zIndex: 1000,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
    borderWidth: 1,
    borderColor: "rgba(100, 200, 255, 0.3)",
  },
  progressBar: {
    height: 8,
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 6,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#00E676",
    borderRadius: 4,
  },
  statusText: {
    color: "#E8F4F8",
    fontSize: 13,
    textAlign: "center",
    fontWeight: "600",
  },
  declarationText: {
    color: "#FFD54F",
    fontSize: 12,
    textAlign: "center",
    fontWeight: "bold",
    marginTop: 3,
    backgroundColor: "rgba(255, 213, 79, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  lastCardText: {
    color: "#B0BEC5",
    fontSize: 11,
    textAlign: "center",
    marginTop: 2,
  },
  tapHint: {
    color: "#64B5F6",
    fontSize: 10,
    textAlign: "center",
    marginTop: 3,
    fontStyle: "italic",
    opacity: 0.9,
  },
});
