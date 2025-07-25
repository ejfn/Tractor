import React from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { sharedStyles } from "../styles/sharedStyles";
import { Player, Trick } from "../types";
import { getPlayerDisplayName } from "../utils/translationHelpers";
import CardBack from "./CardBack";
import ThinkingIndicator from "./ThinkingIndicator";

interface AIPlayerViewProps {
  position: "top" | "left" | "right";
  player: Player;
  isDefending: boolean;
  isCurrentPlayer: boolean;
  waitingForAI: boolean;
  showTrickResult: boolean;
  lastCompletedTrick: Trick | null;
  thinkingDots: {
    dot1: Animated.Value;
    dot2: Animated.Value;
    dot3: Animated.Value;
  };
  isRoundStartingPlayer?: boolean;
}

/**
 * Component that renders an AI player's area including cards and status
 */
const AIPlayerView: React.FC<AIPlayerViewProps> = ({
  position,
  player,
  isDefending,
  isCurrentPlayer,
  waitingForAI,
  showTrickResult,
  lastCompletedTrick,
  thinkingDots,
  isRoundStartingPlayer = false,
}) => {
  // GameTable provides the container sizing/positioning,
  // so we don't need wrapper styles

  const getCardContainerStyle = () => {
    switch (position) {
      case "top":
        return styles.topCardStackContainer;
      case "left":
        return styles.leftCardStackContainer;
      case "right":
        return styles.rightCardStackContainer;
    }
  };

  // Get card styling function based on position
  const getCardStyle = (index: number) => {
    switch (position) {
      case "top":
        return {
          left: 10 * index,
          transform: [{ rotate: "0deg" }],
        };
      case "left":
        return {
          bottom: 10 * (index - 1),
          transform: [{ rotate: "270deg" }],
        };
      case "right":
        return {
          top: 10 * (index - 1),
          transform: [{ rotate: "90deg" }],
        };
    }
  };

  // Label style with the team color
  const labelStyle = [
    sharedStyles.labelContainer,
    styles.aiLabelSpacing,
    isDefending ? sharedStyles.teamALabel : sharedStyles.teamBLabel,
  ];

  // Get player label using translation
  const playerLabel = getPlayerDisplayName(player.id);

  // Determine whether to show thinking indicator
  // Double-check that we're not showing thinking during trick result display
  // This provides an extra layer of protection against timing issues
  const showThinking = waitingForAI && !showTrickResult && !lastCompletedTrick;

  return (
    <View style={styles.container}>
      <View style={labelStyle}>
        <View style={styles.labelContent}>
          {isRoundStartingPlayer && (
            <Text style={styles.startingPlayerIcon}>👑</Text>
          )}
          <Text style={sharedStyles.playerLabel}>{playerLabel}</Text>
        </View>
        <ThinkingIndicator
          visible={showThinking}
          dots={thinkingDots}
          testID={`thinking-indicator-${showThinking ? "visible" : "hidden"}`}
        />
      </View>
      <View style={[getCardContainerStyle()]}>
        {[...Array(Math.min(10, player.hand.length))].map((_, i) => (
          <View
            key={`${position}-card-${i}`}
            style={[styles.botCardSmall, getCardStyle(i)]}
          >
            <CardBack />
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: sharedStyles.playerViewContainer,
  aiLabelSpacing: {
    marginBottom: 25, // AI players need more margin bottom than human
  },
  labelContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  startingPlayerIcon: {
    fontSize: 12,
    marginRight: 4,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  topCardStackContainer: {
    width: 125,
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  leftCardStackContainer: {
    width: 50,
    height: 120,
    flexDirection: "column-reverse",
    alignItems: "center",
  },
  rightCardStackContainer: {
    width: 50,
    height: 125,
    flexDirection: "column",
    alignItems: "center",
  },
  botCardSmall: {
    width: 36,
    height: 50,
    backgroundColor: "#4169E1",
    borderRadius: 3,
    borderWidth: 1,
    borderColor: "white",
    zIndex: 5,
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
  },
});

export default AIPlayerView;
