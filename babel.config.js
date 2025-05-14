module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Explicitly set platforms to exclude web
    plugins: [
      ['@babel/plugin-transform-export-namespace-from'],
      ['react-native-reanimated/plugin'],
      ['module:react-native-dotenv'],
      ['expo-router/babel'],
    ],
    env: {
      production: {
        // Production specific settings
      },
    },
  };
};