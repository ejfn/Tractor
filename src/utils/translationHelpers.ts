import { PlayerId, TeamId, Suit } from "../types";
import i18n from "../locales";
import type { CommonTranslationKey } from "../locales/types";

/**
 * Get translated team name
 */
export function getTeamDisplayName(teamId: TeamId): string {
  const key: CommonTranslationKey = `teams.${teamId}` as CommonTranslationKey;
  return i18n.t(key, { ns: "common" });
}

/**
 * Get translated player name
 */
export function getPlayerDisplayName(playerId: PlayerId): string {
  const key: CommonTranslationKey =
    `players.${playerId}` as CommonTranslationKey;
  return i18n.t(key, { ns: "common" });
}

/**
 * Get translated suit name
 */
export function getSuitDisplayName(suit: Suit): string {
  const suitKey = suit.toLowerCase();
  const key: CommonTranslationKey = `suits.${suitKey}` as CommonTranslationKey;
  return i18n.t(key, { ns: "common" });
}
