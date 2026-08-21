import {
  GameContext,
  GameState,
  getPartnerId,
  PlayableSuit,
  PlayerId,
  Suit,
} from "../../types";
import { isTrump } from "../../game/cardValue";
import { RoundStrategyPlan } from "./llmPlanState";

/**
 * Detects real-time strategic turning points (inflections) to alert the LLM.
 * Returns a concise alert string if an inflection occurred, or null otherwise.
 */
export function detectStrategicInflection(
  gameState: GameState,
  playerId: PlayerId,
  currentPlan: RoundStrategyPlan,
  gameContext: GameContext,
): string | null {
  const { tricks, trumpInfo, players } = gameState;
  const player = players.find((p) => p.id === playerId);
  const handSize = player?.hand.length ?? 25;
  const partnerId = getPartnerId(playerId);
  const attackingPoints = gameContext.currentPoints;

  // 1. Endgame Kitty Defense Alert (hand <= 7 cards)
  if (handSize <= 7 && currentPlan.goal !== "kitty_defense") {
    return "Endgame reached (≤7 cards left). Shift focus to Kitty Defense and conserve Jokers for final trick multiplier.";
  }

  // 2. Score Danger Zone Alert (60+ points for attackers)
  if (attackingPoints >= 60 && attackingPoints < 80) {
    if (gameContext.isAttackingTeam) {
      return `Match point! You hold ${attackingPoints}/80 pts. Cash bosses to cross the 80-pt threshold.`;
    } else {
      return `Critical defense! Attackers have ${attackingPoints}/80 pts. Spend high trumps to deny point tricks.`;
    }
  }

  // 3. Tactical Rupture: Surprise Ruff on last trick
  if (tricks.length > 0) {
    const lastTrick = tricks[tricks.length - 1];
    const leadPlay = lastTrick.plays[0];
    const winningId = lastTrick.winningPlayerId;

    if (leadPlay && winningId) {
      const isLeadByOurTeam =
        leadPlay.playerId === playerId || leadPlay.playerId === partnerId;
      const isWonByOpponent = winningId !== playerId && winningId !== partnerId;
      const leadCard = leadPlay.cards[0];
      const isNonTrumpLead = leadCard && !isTrump(leadCard, trumpInfo);

      if (isLeadByOurTeam && isWonByOpponent && isNonTrumpLead) {
        const winningPlay = lastTrick.plays.find(
          (p) => p.playerId === winningId,
        );
        const isRuff = winningPlay?.cards.some((c) => isTrump(c, trumpInfo));

        if (isRuff) {
          return `Tactical Shift: Opponent ${winningId} RUFFED your team's ${leadCard.suit} lead on Trick ${tricks.length}. ${leadCard.suit} is compromised.`;
        }
      }
    }
  }

  // 4. Target Suit Depletion Alert
  if (currentPlan.targetSuit && currentPlan.targetSuit !== Suit.None) {
    const targetSuit = currentPlan.targetSuit as PlayableSuit;
    const opponent1 = players.find(
      (p) => p.id !== playerId && p.id !== partnerId,
    )?.id;
    const opponent2 = players.find(
      (p) => p.id !== playerId && p.id !== partnerId && p.id !== opponent1,
    )?.id;

    const memory = gameContext.memoryContext;
    const opp1Void = opponent1
      ? memory.playerMemories[opponent1]?.suitVoids.has(targetSuit)
      : false;
    const opp2Void = opponent2
      ? memory.playerMemories[opponent2]?.suitVoids.has(targetSuit)
      : false;

    if (opp1Void && opp2Void) {
      return `Target suit ${targetSuit} is exhausted (both opponents are void). Pivot to another suit or draw trumps.`;
    }
  }

  return null;
}
