import React from "react";
import { View, Text, StyleSheet, TransformsStyle } from "react-native";

interface CardBackProps {
  width?: number;
  height?: number;
  transform?: TransformsStyle["transform"];
}

/**
 * CardBack component renders a consistent card back pattern with a grid of dots and a "T" letter.
 * This component was extracted from EnhancedGameScreen to improve maintainability.
 */
const CardBack: React.FC<CardBackProps> = ({
  width = 35,
  height = 49,
  transform = [],
}) => {
  return (
    <View style={[styles.cardBack, { width, height, transform }]}>
      <View style={styles.cardBackPattern}>
        <View style={styles.cardBackGrid}>
          <View style={styles.dotRow}>
            <View style={styles.cardBackDot} />
            <View style={styles.cardBackDot} />
            <View style={styles.cardBackDot} />
          </View>
          <View style={styles.dotRow}>
            <View style={styles.cardBackDot} />
            <View style={styles.cardBackDot} />
            <View style={styles.cardBackDot} />
          </View>
          <View style={styles.dotRow}>
            <View style={styles.cardBackDot} />
            <View style={styles.cardBackDot} />
            <View style={styles.cardBackDot} />
          </View>
        </View>
        <Text style={styles.cardBackLetter}>T</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardBack: {
    backgroundColor: "#4169E1",
    borderRadius: 3,
    borderWidth: 1,
    borderColor: "white",
    zIndex: 5,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  cardBackPattern: {
    width: "85%",
    height: "85%",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.6)",
    borderRadius: 2,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.1)",
    position: "relative",
    overflow: "hidden",
  },
  cardBackLetter: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    zIndex: 10,
  },
  cardBackGrid: {
    position: "absolute",
    top: 2,
    left: 2,
    right: 2,
    bottom: 2,
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardBackDot: {
    width: 4,
    height: 4,
    backgroundColor: "rgba(255,255,255,0.5)",
    borderRadius: 2,
  },
  dotRow: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-between",
    paddingHorizontal: 2,
  },
});

export default CardBack;
