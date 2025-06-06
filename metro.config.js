// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Disable web platform support
config.resolver.platforms = ['ios', 'android'];

// Configure @ path alias for imports
config.resolver.alias = {
  '@': __dirname,
};

module.exports = config;