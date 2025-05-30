import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Card, GameState, PlayerId, DeclarationType, PlayerName } from "../types";
import {
  getPlayerDeclarationOptions,
  getTrumpDeclarationStatus,
} from "../game/trumpDeclarationManager";
import { getDealingProgress } from "../game/gameLogic";
import { getDeclarationStrength } from "../types/trumpDeclaration";

interface TrumpDeclarationDuringDealingProps {
  gameState: GameState;
  onDeclaration: (declaration: {
    type: DeclarationType;
    cards: Card[];
    suit: any;
  }) => void;
  onSkipDeclaration: () => void;
}

export function TrumpDeclarationDuringDealing({
  gameState,
  onDeclaration,
  onSkipDeclaration,
}: TrumpDeclarationDuringDealingProps) {
  // Get current declaration status
  const declarationStatus = getTrumpDeclarationStatus(gameState);
  const dealingProgress = getDealingProgress(gameState);

  // Get human player's declaration options
  const humanPlayer = gameState.players.find((p) => p.id === PlayerId.Human);
  const declarationOptions = humanPlayer
    ? getPlayerDeclarationOptions(gameState, PlayerId.Human)
    : [];

  // Show modal even if no declaration options (for manual pause)
  // We'll handle empty options in the UI

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Trump Declaration Opportunity</Text>
        <Text style={styles.progress}>
          Dealing: {dealingProgress.current}/{dealingProgress.total} cards
        </Text>
      </View>

      {declarationStatus.hasDeclaration && (
        <View style={styles.currentDeclaration}>
          <Text style={styles.currentDeclarationText}>
            Current: {getPlayerDisplayName(declarationStatus.declarer!)} declared{" "}
            {getDeclarationDisplay(declarationStatus.type!, declarationStatus.suit)}
          </Text>
        </View>
      )}

      <View style={styles.options}>
        <Text style={styles.optionsTitle}>Your Declaration Options:</Text>
        {declarationOptions.length > 0 ? (
          declarationOptions.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={styles.optionButton}
              onPress={() => onDeclaration(option)}
            >
              <Text style={styles.optionButtonText}>
                Declare {getDeclarationDisplay(option.type, option.suit)}
              </Text>
              <Text style={styles.optionDescription}>
                {getDeclarationDescription(option.type)}
              </Text>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.noOptionsContainer}>
            <Text style={styles.noOptionsText}>
              No declarations available with current hand
            </Text>
            <Text style={styles.noOptionsHint}>
              Need matching trump rank cards or joker pairs
            </Text>
          </View>
        )}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.skipButton} onPress={onSkipDeclaration}>
          <Text style={styles.skipButtonText}>Continue Dealing</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function getPlayerDisplayName(playerId: PlayerId): string {
  switch (playerId) {
    case PlayerId.Human:
      return PlayerName.Human;
    case PlayerId.Bot1:
      return PlayerName.Bot1;
    case PlayerId.Bot2:
      return PlayerName.Bot2;
    case PlayerId.Bot3:
      return PlayerName.Bot3;
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

function getDeclarationDescription(type: DeclarationType): string {
  switch (type) {
    case DeclarationType.Single:
      return "One trump rank card";
    case DeclarationType.Pair:
      return "Two trump rank cards";
    case DeclarationType.SmallJokerPair:
      return "Two small jokers";
    case DeclarationType.BigJokerPair:
      return "Two big jokers (strongest)";
    default:
      return "";
  }
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: "20%",
    left: 10,
    right: 10,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#FFD700",
    zIndex: 2000,
    maxHeight: "40%",
  },
  header: {
    alignItems: "center",
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFD700",
    textAlign: "center",
  },
  progress: {
    fontSize: 14,
    color: "#CCCCCC",
    marginTop: 5,
  },
  currentDeclaration: {
    backgroundColor: "rgba(255, 215, 0, 0.2)",
    padding: 6,
    borderRadius: 4,
    marginBottom: 10,
  },
  currentDeclarationText: {
    color: "#FFD700",
    textAlign: "center",
    fontSize: 14,
  },
  options: {
    marginBottom: 15,
  },
  optionsTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
  },
  optionButton: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#FFD700",
  },
  optionButtonText: {
    color: "#FFD700",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
  optionDescription: {
    color: "#CCCCCC",
    fontSize: 12,
    textAlign: "center",
    marginTop: 2,
  },
  actions: {
    alignItems: "center",
  },
  skipButton: {
    backgroundColor: "rgba(128, 128, 128, 0.3)",
    padding: 12,
    borderRadius: 8,
    minWidth: 150,
  },
  skipButtonText: {
    color: "#CCCCCC",
    textAlign: "center",
    fontSize: 14,
  },
  noOptionsContainer: {
    backgroundColor: "rgba(128, 128, 128, 0.2)",
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(128, 128, 128, 0.4)",
  },
  noOptionsText: {
    color: "#CCCCCC",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 4,
  },
  noOptionsHint: {
    color: "#999999",
    fontSize: 12,
    textAlign: "center",
    fontStyle: "italic",
  },
});
