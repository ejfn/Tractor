import { TeamId, Rank } from "../types";
import i18n from "../locales";
import { getTeamDisplayName } from "./translationHelpers";

/**
 * Generate translated round result message based on round outcome
 */
export function generateRoundResultMessage(
  attackingTeamWon: boolean,
  winningTeam: TeamId,
  points: number,
  rankAdvancement: number,
  newRank: Rank,
  pointsBreakdown: string,
  gameOver: boolean = false,
): string {
  // Get translated team name
  const teamName = getTeamDisplayName(winningTeam);

  // Helper for singular/plural ranks
  const rankText = rankAdvancement === 1 ? "rank" : "ranks";

  if (attackingTeamWon) {
    // Attacking team won
    if (rankAdvancement === 0) {
      return (
        i18n.t("modals:roundResult.attackingWonDefend", {
          teamName,
          points,
          rank: newRank,
        }) + pointsBreakdown
      );
    } else {
      if (newRank === Rank.Ace) {
        return (
          i18n.t("modals:roundResult.attackingWonAce", {
            teamName,
            points,
          }) + pointsBreakdown
        );
      } else {
        return (
          i18n.t("modals:roundResult.attackingWonAdvance", {
            teamName,
            points,
            advancement: rankAdvancement,
            rankText,
            rank: newRank,
          }) + pointsBreakdown
        );
      }
    }
  } else {
    // Defending team won
    const pointMessage =
      points === 0
        ? i18n.t("modals:roundResult.heldToPoints", { points: 0 })
        : i18n.t("modals:roundResult.defendedWithPoints", { points });

    if (gameOver) {
      return (
        i18n.t("modals:roundResult.defendingWonGame", {
          teamName,
          pointMessage,
        }) + pointsBreakdown
      );
    } else if (newRank === Rank.Ace) {
      return (
        i18n.t("modals:roundResult.defendingWonAce", {
          teamName,
          pointMessage,
        }) + pointsBreakdown
      );
    } else {
      return (
        i18n.t("modals:roundResult.defendingWonAdvance", {
          teamName,
          pointMessage,
          advancement: rankAdvancement,
          rankText,
          rank: newRank,
        }) + pointsBreakdown
      );
    }
  }
}
