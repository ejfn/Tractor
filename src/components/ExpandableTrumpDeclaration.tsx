import React, { useEffect, useState } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { getDealingProgress, isDealingComplete } from "../game/gameLogic";
import {
  getPlayerDeclarationOptions,
  getTrumpDeclarationStatus,
} from "../game/trumpDeclarationManager";
import { Card, DeclarationType, GameState, PlayerId } from "../types";

interface ExpandableTrumpDeclarationProps {
  gameState: GameState;
  onDeclaration: (declaration: {
    type: DeclarationType;
    cards: Card[];
    suit: any;
  }) => void;
  onContinue: () => void;
  onPause: () => void;
  shouldShowOpportunities: boolean;
}

export function ExpandableTrumpDeclaration({
  gameState,
  onDeclaration,
  onContinue,
  onPause,
  shouldShowOpportunities,
}: ExpandableTrumpDeclarationProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [animatedHeight] = useState(new Animated.Value(0));
  const [isCollapsing, setIsCollapsing] = useState(false);

  // Get all the data we need
  const dealingProgress = getDealingProgress(gameState);
  const declarationStatus = getTrumpDeclarationStatus(gameState);
  const isComplete = isDealingComplete(gameState);

  // Get human player's declaration options
  const humanPlayer = gameState.players.find((p) => p.id === PlayerId.Human);
  const declarationOptions = humanPlayer
    ? getPlayerDeclarationOptions(gameState, PlayerId.Human)
    : [];

  const progressPercentage =
    (dealingProgress.current / dealingProgress.total) * 100;

  // Auto-expand when dealing is complete OR when hook says to show opportunities
  useEffect(() => {
    if (
      (isComplete || shouldShowOpportunities) &&
      !isExpanded &&
      !isCollapsing
    ) {
      setIsExpanded(true);
      Animated.timing(animatedHeight, {
        toValue: 1,
        duration: 250,
        useNativeDriver: false,
      }).start();
    }
  }, [
    isComplete,
    shouldShowOpportunities,
    isExpanded,
    isCollapsing,
    animatedHeight,
  ]);

  const handleTap = () => {
    if (!isExpanded) {
      onPause();
      setIsExpanded(true);
      Animated.timing(animatedHeight, {
        toValue: 1,
        duration: 250,
        useNativeDriver: false,
      }).start();
    }
  };

  const handleContinue = () => {
    setIsCollapsing(true);
    setIsExpanded(false);
    Animated.timing(animatedHeight, {
      toValue: 0,
      duration: 250,
      useNativeDriver: false,
    }).start(() => {
      onContinue();
      // Keep collapsing flag longer to prevent re-expansion
      setTimeout(() => {
        setIsCollapsing(false);
      }, 500);
    });
  };

  const handleDeclaration = (declaration: any) => {
    setIsCollapsing(true);
    setIsExpanded(false);
    Animated.timing(animatedHeight, {
      toValue: 0,
      duration: 250,
      useNativeDriver: false,
    }).start(() => {
      onDeclaration(declaration);
      // Keep collapsing flag longer to prevent re-expansion
      setTimeout(() => {
        setIsCollapsing(false);
      }, 500);
    });
  };

  // Dynamic height based on content
  const hasTwoRows = declarationOptions.length > 3;
  const dynamicHeight = hasTwoRows ? 320 : 260;

  // Interpolate height for animation
  const expandedHeight = animatedHeight.interpolate({
    inputRange: [0, 1],
    outputRange: [0, dynamicHeight],
  });

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handleTap}
      activeOpacity={isExpanded ? 1 : 0.8}
      disabled={isExpanded}
    >
      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View
          style={[styles.progressFill, { width: `${progressPercentage}%` }]}
        />
      </View>

      {/* Status text */}
      <Text style={styles.statusText}>
        Dealing... {dealingProgress.current}/{dealingProgress.total}
      </Text>

      {/* Current dealing player - only show when not expanded and not complete */}
      {!isExpanded && !isComplete && gameState.dealingState && (
        <Text style={styles.currentPlayerText}>
          →{" "}
          {getPlayerDisplayName(
            gameState.players[gameState.dealingState.currentDealingPlayerIndex]
              ?.id || "",
          )}
        </Text>
      )}

      {/* Current declaration - only show when not expanded */}
      {declarationStatus.hasDeclaration && !isExpanded && (
        <Text style={styles.declarationText}>
          {getPlayerDisplayName(declarationStatus.declarer!)} leads:{" "}
          {getDeclarationDisplay(
            declarationStatus.type!,
            declarationStatus.suit,
          )}
        </Text>
      )}

      {/* Tap hint - only show when not expanded */}
      {!isExpanded && !isComplete && (
        <Text style={styles.tapHint}>Tap to pause & declare</Text>
      )}

      {/* Expandable content - in same container */}
      <Animated.View style={{ height: expandedHeight, overflow: "hidden" }}>
        {/* Title */}
        <Text style={styles.title}>
          {isComplete
            ? declarationOptions.length > 0
              ? "Final Declaration Opportunity"
              : "Final Declaration Info"
            : "Trump Declaration Opportunity"}
        </Text>

        {/* Current declaration leader */}
        <View style={styles.currentDeclaration}>
          <Text style={styles.currentDeclarationText}>
            {declarationStatus.hasDeclaration
              ? `Trump Declaration: ${getDeclarationDisplay(
                  declarationStatus.type!,
                  declarationStatus.suit,
                )} by ${getPlayerDisplayName(declarationStatus.declarer!)}`
              : "No trump declarations made"}
          </Text>
        </View>

        {/* Declaration options */}
        <View style={styles.options}>
          {declarationOptions.length > 0 ? (
            <View style={styles.buttonContainer}>
              <View style={styles.buttonRow}>
                {declarationOptions.slice(0, 3).map((option, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.button}
                    onPress={() => handleDeclaration(option)}
                  >
                    <Text style={styles.buttonText}>
                      {getDeclarationButtonDisplay(option.type, option.suit)}
                    </Text>
                    <Text style={styles.buttonDesc}>
                      {getDeclarationDescription(option.type)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {declarationOptions.length > 3 && (
                <View style={styles.buttonRow}>
                  {declarationOptions.slice(3, 6).map((option, index) => (
                    <TouchableOpacity
                      key={index + 3}
                      style={styles.button}
                      onPress={() => handleDeclaration(option)}
                    >
                      <Text style={styles.buttonText}>
                        {getDeclarationButtonDisplay(option.type, option.suit)}
                      </Text>
                      <Text style={styles.buttonDesc}>
                        {getDeclarationDescription(option.type)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          ) : (
            <View style={styles.noOptionsContainer}>
              <Text style={styles.noOptionsText}>
                No valid declarations available with your current hand.
              </Text>
              <Text style={styles.noOptionsHint}>
                {isComplete
                  ? "Play will begin with the current trump setting"
                  : "Need matching trump rank cards or joker pairs"}
              </Text>
            </View>
          )}
        </View>

        {/* Continue button */}
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
        >
          <Text style={styles.continueButtonText}>
            {isComplete ? "Start Playing" : "Continue"}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </TouchableOpacity>
  );
}

// Helper functions
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

function getDeclarationButtonDisplay(type: DeclarationType, suit: any): string {
  const suitEmoji = getSuitEmoji(suit);

  switch (type) {
    case DeclarationType.Single:
      return suitEmoji;
    case DeclarationType.Pair:
      return `${suitEmoji}${suitEmoji}`;
    case DeclarationType.SmallJokerPair:
      return "🃏🃏";
    case DeclarationType.BigJokerPair:
      return "🃏🃏";
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

function getDeclarationDisplay(type: DeclarationType, suit: any): string {
  const suitDisplay = getSuitDisplay(suit);

  switch (type) {
    case DeclarationType.Single:
      return suitDisplay;
    case DeclarationType.Pair:
      return `${suitDisplay} Pair`;
    case DeclarationType.SmallJokerPair:
      return "Small Jokers";
    case DeclarationType.BigJokerPair:
      return "Big Jokers";
    default:
      return `${type} in ${suitDisplay}`;
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

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 60,
    left: 10,
    right: 10,
    zIndex: 1000,
    backgroundColor: "rgba(30, 40, 50, 0.95)",
    padding: 14,
    borderRadius: 12,
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
  currentPlayerText: {
    color: "#64B5F6",
    fontSize: 11,
    textAlign: "center",
    marginTop: 2,
    opacity: 0.9,
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
  tapHint: {
    color: "#64B5F6",
    fontSize: 10,
    textAlign: "center",
    marginTop: 3,
    fontStyle: "italic",
    opacity: 0.9,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#E8F4F8",
    textAlign: "center",
    marginTop: 16,
    marginBottom: 8,
  },
  currentDeclaration: {
    backgroundColor: "rgba(255, 213, 79, 0.15)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 213, 79, 0.4)",
    width: "90%",
    alignSelf: "center",
  },
  currentDeclarationText: {
    color: "#FFD54F",
    textAlign: "center",
    fontSize: 14,
    fontWeight: "bold",
  },
  options: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 8,
    paddingBottom: 60,
  },
  buttonContainer: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
    gap: 12,
    width: "100%",
  },
  button: {
    backgroundColor: "rgba(40, 55, 70, 0.9)",
    padding: 10,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#64B5F6",
    width: 100,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  buttonText: {
    color: "#E8F4F8",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
  buttonDesc: {
    color: "#B0BEC5",
    fontSize: 10,
    textAlign: "center",
    marginTop: 2,
  },
  noOptionsContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    padding: 14,
    marginBottom: 10,
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
  continueButton: {
    backgroundColor: "rgba(60, 75, 90, 0.8)",
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    position: "absolute",
    bottom: 16,
    alignSelf: "center",
    width: 120,
  },
  continueButtonText: {
    color: "#E8F4F8",
    textAlign: "center",
    fontSize: 14,
    fontWeight: "600",
  },
});
