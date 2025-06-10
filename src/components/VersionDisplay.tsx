import Constants from "expo-constants";
import React from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";

interface VersionDisplayProps {
  style?: ViewStyle;
}

export const VersionDisplay: React.FC<VersionDisplayProps> = ({ style }) => {
  const getVersion = (): string => {
    // Only use dev version in actual development mode
    if (__DEV__) {
      try {
        // Try to import dev version file
        const devVersion = require("../dev-version.json");
        if (devVersion?.version && devVersion?.gitCommit) {
          return `${devVersion.version}+${devVersion.gitCommit.substring(0, 7)}`;
        }
      } catch {
        // Dev version file doesn't exist or can't be read
      }
      return "v1.0.0-dev";
    }

    // For published builds, use version injected by build pipeline
    try {
      const version =
        Constants.expoConfig?.extra?.version || Constants.expoConfig?.version;
      if (version) {
        return version;
      }
    } catch {
      // Fallback if Constants access fails
    }

    // Final fallback for production builds
    return "v1.0.0";
  };

  const version = getVersion();

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.versionText}>
        {version.startsWith("v") ? version : `v${version}`}
      </Text>
    </View>
  );
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
