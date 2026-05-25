// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Disable web platform support
config.resolver.platforms = ['ios', 'android'];

// Configure .md files as static assets
config.resolver.assetExts.push('md');

module.exports = config;