import Constants from "expo-constants";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface VersionDisplayProps {
  style?: any;
}

export const VersionDisplay: React.FC<VersionDisplayProps> = ({ style }) => {
  // Temporarily disable to test if this is causing splash screen issue
  return null;
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 15,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 5,
  },
  versionText: {
    fontSize: 12,
    color: "rgba(0, 0, 0, 0.6)",
    fontFamily: "monospace",
    backgroundColor: "transparent",
    paddingHorizontal: 8,
    paddingVertical: 4,
    textAlign: "center",
  },
});

export default VersionDisplay;
