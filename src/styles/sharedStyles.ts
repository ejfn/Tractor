import { StyleSheet } from "react-native";

export const sharedStyles = StyleSheet.create({
  // Player label container - used for both human and AI players
  labelContainer: {
    height: 26,
    minWidth: 75,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 14,
    borderWidth: 0.5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
    position: "relative",
  },

  // Team colors
  teamALabel: {
    backgroundColor: "rgba(46, 125, 50, 0.75)",
    borderColor: "#E8F5E9",
  },
  teamBLabel: {
    backgroundColor: "rgba(198, 40, 40, 0.75)",
    borderColor: "#FFEBEE",
  },

  // Player label text
  playerLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "white",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.2)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },

  // Container for player views
  playerViewContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
