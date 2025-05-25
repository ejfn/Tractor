import React from "react";
import { Text, View, StyleSheet } from "react-native";
import Constants from "expo-constants";

interface VersionDisplayProps {
  style?: any;
}

export const VersionDisplay: React.FC<VersionDisplayProps> = ({ style }) => {
  // Try to get version from various sources
  const getVersion = (): string => {
    // First try to get from EAS update environment variables
    const easVersion =
      Constants.expoConfig?.extra?.version || Constants.expoConfig?.version;

    if (easVersion && easVersion !== "1.0.0") {
      return easVersion;
    }

    // Fallback to git commit hash if available
    const gitCommit = Constants.expoConfig?.extra?.gitCommit;
    if (gitCommit) {
      return `git-${gitCommit.substring(0, 7)}`;
    }

    // For local dev, show dev version with git info if available
    const isDev = __DEV__ || Constants.appOwnership === "expo";
    if (isDev) {
      try {
        // Try to import dev version file
        const devVersion = require("../dev-version.json");
        if (devVersion?.gitCommit) {
          return `v1.0.0-dev.${devVersion.gitCommit.substring(0, 7)}`;
        }
      } catch {
        // Dev version file doesn't exist or can't be read
      }
      return "v1.0.0-dev";
    }

    // Final fallback - don't show version if it's just the default
    return "";
  };

  const version = getVersion();

  // Don't render anything if no meaningful version is available
  if (!version) {
    return null;
  }

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
