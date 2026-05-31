import { PlayerId, TeamId, Suit, Player } from "../types";
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
 * Get translated player name, supporting both player ID, raw ID string, or full Player object
 */
export function getPlayerDisplayName(
  t: TranslationFunction,
  playerOrId: PlayerId | Player | string | undefined,
  players?: Player[],
): string {
  if (!playerOrId) return "";

  // If a full Player object is passed
  if (typeof playerOrId === "object" && "id" in playerOrId) {
    if (playerOrId.id === PlayerId.Human) {
      return t("players.human", { ns: "common" });
    }
    if (playerOrId.displayNameIndex !== undefined) {
      const names = t("botNames", { ns: "common", returnObjects: true });
      if (
        Array.isArray(names) &&
        names[playerOrId.displayNameIndex] !== undefined
      ) {
        return names[playerOrId.displayNameIndex];
      }
    }
    return t(`players.${playerOrId.id}` as CommonTranslationKey, {
      ns: "common",
    }) as string;
  }

  // If a string or PlayerId is passed
  const idStr = typeof playerOrId === "string" ? playerOrId : playerOrId;
  if (idStr === PlayerId.Human) {
    return t("players.human", { ns: "common" });
  }

  // Look up player details in a players list if provided
  if (players) {
    const playerObj = players.find((p) => p.id === idStr);
    if (playerObj && playerObj.displayNameIndex !== undefined) {
      const names = t("botNames", { ns: "common", returnObjects: true });
      if (
        Array.isArray(names) &&
        names[playerObj.displayNameIndex] !== undefined
      ) {
        return names[playerObj.displayNameIndex];
      }
    }
  }

  // Fallback to static bot key
  const key: CommonTranslationKey = `players.${idStr}` as CommonTranslationKey;
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
