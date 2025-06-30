/* eslint-disable no-undef */
// Global test setup for AsyncStorage mock
// Set DEBUG log level for all tests
import { gameLogger, LogLevel } from "../src/utils/gameLogger";

jest.mock("@react-native-async-storage/async-storage", () => ({
  setItem: jest.fn(),
  getItem: jest.fn().mockResolvedValue(null),
  removeItem: jest.fn(),
}));

// Mock expo-localization for tests
jest.mock("expo-localization", () => ({
  getLocales: jest.fn(() => [{ languageCode: "en" }]),
}));
gameLogger.setLogLevel(LogLevel.DEBUG);
