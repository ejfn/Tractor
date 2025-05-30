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
}

export function DealingProgressIndicator({
  gameState,
  onPauseDealing,
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
          ? "🃏 Trump Declaration"
          : `Dealing... ${progress.current}/${progress.total}`}
      </Text>

      {/* Show current declaration winner */}
      {declarationStatus.hasDeclaration && (
        <Text style={styles.declarationText}>
          🃏 {getPlayerDisplayName(declarationStatus.declarer!)} leads:{" "}
          {getDeclarationDisplay(declarationStatus.type!, declarationStatus.suit)}
        </Text>
      )}

      {/* Show last dealt card */}
      {lastDealtCard && !isPaused && (
        <Text style={styles.lastCardText}>
          → {getPlayerDisplayName(lastDealtCard.playerId)}
        </Text>
      )}

      {/* Tap hint */}
      {!isPaused && (
        <Text style={styles.tapHint}>
          Tap to pause & declare
        </Text>
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

function getSuitEmoji(suit: any): string {
  switch (suit) {
    case "Hearts":
      return "♥";
    case "Diamonds":
      return "♦";
    case "Clubs":
      return "♣";
    case "Spades":
      return "♠";
    default:
      return suit;
  }
}

function getDeclarationDisplay(type: DeclarationType, suit: any): string {
  const suitEmoji = getSuitEmoji(suit);
  
  switch (type) {
    case DeclarationType.Single:
      return suitEmoji; // Single emoji for single
    case DeclarationType.Pair:
      return `${suitEmoji}${suitEmoji}`; // Double emoji for pair
    case DeclarationType.SmallJokerPair:
      return "🃏🃏 (Small)"; // Two joker emojis with indicator
    case DeclarationType.BigJokerPair:
      return "🃏🃏 (Big)"; // Two joker emojis with indicator
    default:
      return `${type} in ${suitEmoji}`;
  }
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 60,
    left: 10,
    right: 10,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    padding: 12,
    borderRadius: 6,
    zIndex: 1000,
    alignItems: "center",
  },
  progressBar: {
    height: 6,
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 4,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#4CAF50",
  },
  statusText: {
    color: "#FFFFFF",
    fontSize: 12,
    textAlign: "center",
    fontWeight: "500",
  },
  declarationText: {
    color: "#FFD700",
    fontSize: 11,
    textAlign: "center",
    fontWeight: "bold",
    marginTop: 2,
  },
  lastCardText: {
    color: "#CCCCCC",
    fontSize: 10,
    textAlign: "center",
    marginTop: 1,
  },
  tapHint: {
    color: "rgba(255, 215, 0, 0.7)",
    fontSize: 9,
    textAlign: "center",
    marginTop: 2,
    fontStyle: "italic",
  },
});
