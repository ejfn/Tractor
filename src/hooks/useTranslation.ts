import { useTranslation as useI18nTranslation } from "react-i18next";
import type { Namespace } from "../locales";
import type {
  CommonTranslationKey,
  GameTranslationKey,
  TrumpDeclarationTranslationKey,
  ModalsTranslationKey,
} from "../locales/types";

// Define a proper type for translation options that matches i18next's expectations
type TranslationOptions = Record<string, unknown>;

/**
 * Custom hook for type-safe translations
 * Wraps react-i18next's useTranslation with better TypeScript support
 */
export function useTranslation(namespace?: Namespace) {
  const { t, i18n } = useI18nTranslation(namespace);

  return {
    t,
    i18n,
    language: i18n.language,
    changeLanguage:
      i18n.changeLanguage?.bind(i18n) || (() => Promise.resolve()),
  };
}

/**
 * Hook specifically for common translations (buttons, basic UI)
 */
export function useCommonTranslation() {
  const { t, i18n } = useI18nTranslation("common");

  return {
    t: (key: CommonTranslationKey, options?: TranslationOptions) =>
      t(key, options) as string,
    i18n,
    language: i18n.language,
    changeLanguage:
      i18n.changeLanguage?.bind(i18n) || (() => Promise.resolve()),
  };
}

/**
 * Hook specifically for game-related translations
 */
export function useGameTranslation() {
  const { t, i18n } = useI18nTranslation("game");

  return {
    t: (key: GameTranslationKey, options?: TranslationOptions) =>
      t(key, options) as string,
    i18n,
    language: i18n.language,
    changeLanguage:
      i18n.changeLanguage?.bind(i18n) || (() => Promise.resolve()),
  };
}

/**
 * Hook specifically for trump declaration translations
 */
export function useTrumpDeclarationTranslation() {
  const { t, i18n } = useI18nTranslation("trumpDeclaration");

  return {
    t: (key: TrumpDeclarationTranslationKey, options?: TranslationOptions) =>
      t(key, options) as string,
    i18n,
    language: i18n.language,
    changeLanguage:
      i18n.changeLanguage?.bind(i18n) || (() => Promise.resolve()),
  };
}

/**
 * Hook specifically for modal translations
 */
export function useModalsTranslation() {
  const { t, i18n } = useI18nTranslation("modals");

  return {
    t: (key: ModalsTranslationKey, options?: TranslationOptions) =>
      t(key, options) as string,
    i18n,
    language: i18n.language,
    changeLanguage:
      i18n.changeLanguage?.bind(i18n) || (() => Promise.resolve()),
  };
}

export default useTranslation;
