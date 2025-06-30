/* eslint-disable no-undef */
// Global test setup for AsyncStorage mock
jest.mock("@react-native-async-storage/async-storage", () => ({
  setItem: jest.fn(),
  getItem: jest.fn().mockResolvedValue(null),
  removeItem: jest.fn(),
}));

// Mock expo-localization for tests
jest.mock("expo-localization", () => ({
  getLocales: jest.fn(() => [{ languageCode: "en" }]),
}));

// Set DEBUG log level for all tests
const { gameLogger, LogLevel } = require("../src/utils/gameLogger");
gameLogger.setLogLevel(LogLevel.DEBUG);
