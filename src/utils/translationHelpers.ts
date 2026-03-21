import { PlayerId, TeamId, Suit } from "../types";
import type { CommonTranslationKey } from "../locales/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TranslationFunction = any;

/**
 * Get translated team name
 */
export function getTeamDisplayName(
  t: TranslationFunction,
  teamId: TeamId,
): string {
  const key: CommonTranslationKey = `teams.${teamId}` as CommonTranslationKey;
  return t(key, { ns: "common" }) as string;
}

/**
 * Get translated player name
 */
export function getPlayerDisplayName(
  t: TranslationFunction,
  playerId: PlayerId,
): string {
  const key: CommonTranslationKey =
    `players.${playerId}` as CommonTranslationKey;
  return t(key, { ns: "common" }) as string;
}

/**
 * Get translated suit name
 */
export function getSuitDisplayName(t: TranslationFunction, suit: Suit): string {
  const suitKey = suit.toLowerCase();
  const key: CommonTranslationKey = `suits.${suitKey}` as CommonTranslationKey;
  return t(key, { ns: "common" }) as string;
}
