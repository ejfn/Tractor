import AsyncStorage from "@react-native-async-storage/async-storage";
import { getLocales } from "expo-localization";
import i18next, { changeLanguage, use as i18nUse } from "i18next";
import { initReactI18next } from "react-i18next";

// Import translation files
import commonEn from "./en/common.json";
import gameEn from "./en/game.json";
import modalsEn from "./en/modals.json";
import trumpDeclarationEn from "./en/trumpDeclaration.json";

import commonZh from "./zh/common.json";
import gameZh from "./zh/game.json";
import modalsZh from "./zh/modals.json";
import trumpDeclarationZh from "./zh/trumpDeclaration.json";

// Language resources
const resources = {
  en: {
    common: commonEn,
    game: gameEn,
    trumpDeclaration: trumpDeclarationEn,
    modals: modalsEn,
  },
  zh: {
    common: commonZh,
    game: gameZh,
    trumpDeclaration: trumpDeclarationZh,
    modals: modalsZh,
  },
};

// Get system language
const getSystemLanguage = (): Language => {
  const locales = getLocales();
  const systemLanguage = locales[0]?.languageCode;

  // Support Chinese (any variant) and English
  if (systemLanguage?.startsWith("zh")) {
    return "zh";
  }
  return "en"; // Default to English
};

// Storage key for language preference
const LANGUAGE_STORAGE_KEY = "user_language_preference";

// Get stored language preference or use system default
const getStoredLanguage = async (): Promise<Language> => {
  try {
    const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored && (stored === "en" || stored === "zh")) {
      return stored as Language;
    }
  } catch (error) {
    console.warn("Failed to load language preference:", error);
  }
  return getSystemLanguage();
};

// Initialize i18next with system language detection
const initializeI18n = async () => {
  const initialLanguage = await getStoredLanguage();

  i18nUse(initReactI18next).init({
    resources,
    lng: initialLanguage,
    fallbackLng: "en",

    // Namespace configuration
    defaultNS: "common",
    ns: ["common", "game", "trumpDeclaration", "modals"],

    interpolation: {
      escapeValue: false, // React already escapes by default
    },

    // Development settings
    debug: __DEV__,

    // React i18next options
    react: {
      useSuspense: false, // Disable suspense for React Native
    },

    // Compatibility settings
    compatibilityJSON: "v4", // Use v4 format for React Native compatibility
  });
};

export default i18next;

// Export types for TypeScript support
export type Language = "en" | "zh";
export type Namespace = "common" | "game" | "trumpDeclaration" | "modals";

// Helper function to get current language
export const getCurrentLanguage = (): Language => {
  return i18next.language as Language;
};

// Initialize i18n on module load (only once)
if (!i18next.isInitialized) {
  initializeI18n();
}

// Helper function to change language with persistence
export const changeLanguageCustom = async (
  language: Language,
): Promise<void> => {
  try {
    await changeLanguage(language);
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch (error) {
    console.error("Failed to change and store language:", error);
  }
};

// Export the system language helper function
export { getSystemLanguage };
