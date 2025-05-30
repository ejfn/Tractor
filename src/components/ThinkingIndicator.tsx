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
}

/**
 * Component that displays animated thinking dots
 */
const ThinkingIndicator: React.FC<ThinkingIndicatorProps> = ({
  visible,
  dots,
  testID,
}) => {
  // Track indicator visibility changes
  React.useEffect(() => {
    // Monitor when thinking indicator visibility changes
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={styles.thinkingIndicator} testID={testID}>
      <Animated.View style={[styles.thinkingDot, { opacity: dots.dot1 }]} />
      <Animated.View style={[styles.thinkingDot, { opacity: dots.dot2 }]} />
      <Animated.View style={[styles.thinkingDot, { opacity: dots.dot3 }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  thinkingIndicator: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#FFC107",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FFD54F",
    flexDirection: "row",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
    zIndex: 5,
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
