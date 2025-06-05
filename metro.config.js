// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Disable web platform support (mobile-only app)
config.resolver.platforms = ['ios', 'android'];

// Production optimizations
config.transformer.minifierConfig = {
  // Enable dead code elimination
  mangle: true,
  compress: {
    drop_console: true, // Remove console.log in production
    drop_debugger: true,
    dead_code: true,
    unused: true,
  },
};

// Asset optimization
config.transformer.assetPlugins = ['expo-asset/tools/hashAssetFiles'];

// Bundle splitting for better performance
config.serializer.createModuleIdFactory = function () {
  const projectRootPath = __dirname;
  return function (path) {
    const relativePath = path.substr(projectRootPath.length + 1);
    return relativePath;
  };
};

module.exports = config;