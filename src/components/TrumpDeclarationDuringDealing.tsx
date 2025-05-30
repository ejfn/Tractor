import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import {
  Card,
  GameState,
  PlayerId,
  DeclarationType,
  PlayerName,
} from "../types";
import {
  getPlayerDeclarationOptions,
  getTrumpDeclarationStatus,
} from "../game/trumpDeclarationManager";
import { getDealingProgress, isDealingComplete } from "../game/gameLogic";

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
  const isComplete = isDealingComplete(gameState);

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
            Current: {getPlayerDisplayName(declarationStatus.declarer!)}{" "}
            declared{" "}
            {getDeclarationDisplay(
              declarationStatus.type!,
              declarationStatus.suit,
            )}
          </Text>
        </View>
      )}

      <View style={styles.options}>
        <Text style={styles.optionsTitle}>Your Declaration Options:</Text>
        {declarationOptions.length > 0 ? (
          <View style={styles.optionsContainer}>
            {declarationOptions.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={styles.optionButton}
                onPress={() => onDeclaration(option)}
              >
                <Text style={styles.optionButtonText}>
                  {getDeclarationButtonDisplay(option.type, option.suit)}
                </Text>
                <Text style={styles.optionDescription}>
                  {getDeclarationDescription(option.type)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
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
          <Text style={styles.skipButtonText}>
            {isComplete ? "Start Playing" : "Continue Dealing"}
          </Text>
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
      return suitDisplay; // Single suit name
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

function getDeclarationButtonDisplay(type: DeclarationType, suit: any): string {
  const suitEmoji = getSuitEmoji(suit);

  switch (type) {
    case DeclarationType.Single:
      return suitEmoji; // Single emoji for single
    case DeclarationType.Pair:
      return `${suitEmoji}${suitEmoji}`; // Double emoji for pair
    case DeclarationType.SmallJokerPair:
      return "🃏🃏 (Small)";
    case DeclarationType.BigJokerPair:
      return "🃏🃏 (Big)";
    default:
      return `${type} in ${suitEmoji}`;
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

function getDeclarationDescription(type: DeclarationType): string {
  switch (type) {
    case DeclarationType.Single:
      return "Single";
    case DeclarationType.Pair:
      return "Pair";
    case DeclarationType.SmallJokerPair:
      return "Small Jokers";
    case DeclarationType.BigJokerPair:
      return "Big Jokers";
    default:
      return "";
  }
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: "20%",
    left: 8,
    right: 8,
    backgroundColor: "rgba(25, 35, 45, 0.96)",
    padding: 20,
    borderRadius: 16,
    zIndex: 2000,
    maxHeight: "40%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 1.5,
    borderColor: "rgba(100, 200, 255, 0.4)",
  },
  header: {
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#E8F4F8",
    textAlign: "center",
  },
  progress: {
    fontSize: 13,
    color: "#B0BEC5",
    marginTop: 4,
  },
  currentDeclaration: {
    backgroundColor: "rgba(255, 213, 79, 0.15)",
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 213, 79, 0.4)",
  },
  currentDeclarationText: {
    color: "#FFD54F",
    textAlign: "center",
    fontSize: 13,
    fontWeight: "600",
  },
  options: {
    marginBottom: 16,
  },
  optionsTitle: {
    color: "#E8F4F8",
    fontSize: 15,
    fontWeight: "bold",
    marginBottom: 10,
  },
  optionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 4,
  },
  optionButton: {
    backgroundColor: "rgba(40, 55, 70, 0.9)",
    padding: 10,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#64B5F6",
    width: "30%",
    marginBottom: 8,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  optionButtonText: {
    color: "#E8F4F8",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
  optionDescription: {
    color: "#B0BEC5",
    fontSize: 10,
    textAlign: "center",
    marginTop: 2,
  },
  actions: {
    alignItems: "center",
  },
  skipButton: {
    backgroundColor: "rgba(60, 75, 90, 0.8)",
    padding: 14,
    borderRadius: 12,
    minWidth: 140,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  skipButtonText: {
    color: "#E8F4F8",
    textAlign: "center",
    fontSize: 14,
    fontWeight: "600",
  },
  noOptionsContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  noOptionsText: {
    color: "#E8F4F8",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 4,
    fontWeight: "500",
  },
  noOptionsHint: {
    color: "#B0BEC5",
    fontSize: 11,
    textAlign: "center",
    fontStyle: "italic",
  },
});
