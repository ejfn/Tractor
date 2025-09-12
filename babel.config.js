module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    // Explicitly set platforms to exclude web
    plugins: [
      ["@babel/plugin-transform-export-namespace-from"],
      ["react-native-worklets/plugin"],
      // Removed 'module:react-native-dotenv' - was causing "Welcome to Expo" screen issue
      // Removed 'expo-router/babel' as it's deprecated in SDK 50+
    ],
    env: {
      production: {
        // Production specific settings
      },
    },
  };
};
