import React from "react";
import { View, StyleSheet, Animated } from "react-native";

interface ThinkingIndicatorProps {
  visible: boolean;
  dots: {
    dot1: Animated.Value;
    dot2: Animated.Value;
    dot3: Animated.Value;
  };
  testID?: string;
  /** When true, renders in purple LLM mode instead of gold algorithmic mode */
  isLLM?: boolean;
}

/**
 * Component that displays animated thinking dots.
 * Gold = Algorithmic AI, Purple = LLM AI.
 */
const ThinkingIndicator: React.FC<ThinkingIndicatorProps> = ({
  visible,
  dots,
  testID,
  isLLM = false,
}) => {


  if (!visible) return null;

  const containerStyle = isLLM
    ? styles.thinkingIndicatorLLM
    : styles.thinkingIndicator;

  return (
    <View style={containerStyle} testID={testID}>
      <Animated.View style={[styles.thinkingDot, { opacity: dots.dot1 }]} />
      <Animated.View style={[styles.thinkingDot, { opacity: dots.dot2 }]} />
      <Animated.View style={[styles.thinkingDot, { opacity: dots.dot3 }]} />
    </View>
  );
};

const baseIndicator = {
  position: "absolute" as const,
  top: -8,
  right: -8,
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 12,
  borderWidth: 1,
  flexDirection: "row" as const,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.3,
  shadowRadius: 2,
  elevation: 3,
  zIndex: 5,
};

const styles = StyleSheet.create({
  /** Gold – Algorithmic AI */
  thinkingIndicator: {
    ...baseIndicator,
    backgroundColor: "#FFC107",
    borderColor: "#FFD54F",
  },
  /** Purple – LLM AI */
  thinkingIndicatorLLM: {
    ...baseIndicator,
    backgroundColor: "#7B1FA2",
    borderColor: "#AB47BC",
  },
  thinkingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "white",
    marginHorizontal: 1,
  },
});

export default ThinkingIndicator;
