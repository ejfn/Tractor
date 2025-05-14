module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Explicitly set platforms to exclude web
    plugins: [
      ['@babel/plugin-transform-export-namespace-from'],
      ['react-native-reanimated/plugin'],
      ['module:react-native-dotenv'],
      // Removed 'expo-router/babel' as it's deprecated in SDK 50+
    ],
    env: {
      production: {
        // Production specific settings
      },
    },
  };
};