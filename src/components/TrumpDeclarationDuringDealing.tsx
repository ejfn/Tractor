import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Card, GameState, PlayerId, DeclarationType } from "../types";
import {
  getPlayerDeclarationOptions,
  getTrumpDeclarationStatus,
} from "../game/trumpDeclarationManager";
import { getDealingProgress } from "../game/gameLogic";

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

  // Don't show if no options available
  if (declarationOptions.length === 0) {
    return null;
  }

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
            Current: {declarationStatus.declarer} declared{" "}
            {declarationStatus.type}
            in {declarationStatus.suit}
          </Text>
        </View>
      )}

      <View style={styles.options}>
        <Text style={styles.optionsTitle}>Your Declaration Options:</Text>
        {declarationOptions.map((option, index) => (
          <TouchableOpacity
            key={index}
            style={styles.optionButton}
            onPress={() => onDeclaration(option)}
          >
            <Text style={styles.optionButtonText}>
              Declare {option.type} in {option.suit}
            </Text>
            <Text style={styles.optionDescription}>
              {getDeclarationDescription(option.type)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.skipButton} onPress={onSkipDeclaration}>
          <Text style={styles.skipButtonText}>Continue Dealing</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function getDeclarationDescription(type: DeclarationType): string {
  switch (type) {
    case DeclarationType.Single:
      return "One trump rank card";
    case DeclarationType.Pair:
      return "Two trump rank cards";
    case DeclarationType.JokerPair:
      return "Two jokers (strongest)";
    default:
      return "";
  }
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    padding: 20,
    borderRadius: 10,
    margin: 20,
    borderWidth: 2,
    borderColor: "#FFD700",
  },
  header: {
    alignItems: "center",
    marginBottom: 15,
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
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
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
});
