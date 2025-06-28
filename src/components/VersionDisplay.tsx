import React from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";
import { getAppVersion } from "../utils/versioning";

interface VersionDisplayProps {
  style?: ViewStyle;
}

export const VersionDisplay: React.FC<VersionDisplayProps> = ({ style }) => {
  const version = getAppVersion();

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
