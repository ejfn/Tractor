import Constants from "expo-constants";

// Attempt to load dev-version.json if available
let devVersionInfo: { version: string; gitCommit: string } | undefined;
try {
  const devVersion = require("../dev-version.json");
  devVersionInfo = devVersion;
} catch {
  // dev-version.json might not exist in production builds or during certain build steps
  devVersionInfo = undefined;
}

export const getAppVersion = (): string => {
  // Only use dev version in actual development mode
  if (__DEV__) {
    if (devVersionInfo?.version && devVersionInfo?.gitCommit) {
      return `${devVersionInfo.version}+${devVersionInfo.gitCommit.substring(0, 7)}`;
    }
    return "v1.0.0-dev"; // Fallback for dev if dev-version.json is missing
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
