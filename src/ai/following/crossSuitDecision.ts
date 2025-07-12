import { Card, GameContext, GameState, PlayerId, TrumpInfo } from "../../types";
import { gameLogger } from "../../utils/gameLogger";
import { selectCardsByStrategicValue } from "./strategicSelection";
import { SuitAvailabilityResult } from "./suitAvailabilityAnalysis";
import { shouldContributeToTeammate } from "./teammateAnalysis";

/**
 * Cross Suit Decision Module
 *
 * Handles scenarios involving cross-suit decisions:
 * - insufficient: Not enough cards in leading suit, need cross-suit fill
 * - void: No cards in leading suit, full cross-suit decision (future use)
 */

/**
 * Handle insufficient scenario - CROSS-SUIT decision
 *
 * Player doesn't have enough cards in the leading suit to meet length requirement.
 * This is primarily a cross-suit decision: how to fill the shortfall.
 *
 * Strategy:
 * 1. Use ALL remaining cards in the suit (no choice here)
 * 2. Decide whether to contribute or dispose for the cross-suit fill
 * 3. Fill shortfall with cross-suit cards using appropriate strategic mode
 */
export function handleInsufficientScenario(
  analysis: SuitAvailabilityResult,
  playerHand: Card[],
  context: GameContext,
  trumpInfo: TrumpInfo,
  gameState: GameState,
  currentPlayerId: PlayerId,
): Card[] {
  if (!analysis.remainingCards) {
    gameLogger.warn("following_insufficient_no_remaining", {
      player: currentPlayerId,
    });
    return [];
  }

  const needed = analysis.requiredLength;
  const available = analysis.remainingCards.length;
  const shortfall = needed - available;

  gameLogger.debug("following_insufficient_analysis", {
    player: currentPlayerId,
    needed,
    available,
    shortfall,
    leadingSuit: analysis.leadingSuit,
  });

  // Use ALL remaining cards in suit (no choice)
  const selectedCards = [...analysis.remainingCards];

  // Decision: Should contribute to teammate or dispose?
  const shouldContribute = shouldContributeToTeammate(
    context,
    gameState,
    currentPlayerId,
  );

  // Get cross-suit cards for filling (including trump)
  const crossSuitCards = playerHand.filter(
    (card) => !analysis.remainingCards?.includes(card),
  );

  const fillCards = shouldContribute
    ? selectCardsByStrategicValue(
        crossSuitCards,
        trumpInfo,
        "contribute",
        "lowest",
        shortfall,
      )
    : selectCardsByStrategicValue(
        crossSuitCards,
        trumpInfo,
        "strategic",
        "lowest",
        shortfall,
      );

  selectedCards.push(...fillCards);

  gameLogger.debug("following_insufficient_result", {
    player: currentPlayerId,
    suitCards: analysis.remainingCards.length,
    fillCards: fillCards.length,
    totalSelected: selectedCards.length,
    shouldContribute,
    reason: shouldContribute
      ? "teammate_winning_and_safe"
      : "strategic_disposal",
    selectedCards: selectedCards.map((c) => c.toString()),
  });

  return selectedCards;
}
