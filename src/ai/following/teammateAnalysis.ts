import { canBeatCombo } from "../../game/cardComparison";
import { isTrump } from "../../game/cardValue";
import {
  Card,
  GameContext,
  GameState,
  PlayerId,
  Suit,
  Trick,
  TrickPosition,
} from "../../types";
import { getRemainingUnseenCards } from "../aiGameContext";
import { analyzeSuitAvailability } from "./suitAvailabilityAnalysis";

/**
 * Teammate Analysis Module
 *
 * Contains shared functions for analyzing teammate situations and determining
 * when it's safe and beneficial to contribute points to winning teammates.
 */

/**
 * Consolidated teammate contribution analysis - handles both trump and non-trump leads
 *
 * Automatically detects lead type and applies appropriate logic:
 * - Trump lead: Uses trump-specific analysis (biggest trump, trump void checks)
 * - Non-trump lead: Uses suit-specific analysis (biggest in suit, suit void checks)
 */
export function shouldContributeToTeammate(
  context: GameContext,
  gameState: GameState,
  _currentPlayerId: PlayerId,
): boolean {
  const trickAnalysis = context.trickWinnerAnalysis;
  if (!trickAnalysis?.isTeammateWinning) {
    return false;
  }

  const currentTrick = gameState.currentTrick;
  if (!currentTrick) return false;

  // Check if I'm 4th player
  const isLastPlayer = context.trickPosition === TrickPosition.Fourth;

  // Determine if this is a trump lead
  const trumpInfo = context.trumpInfo || gameState.trumpInfo;
  if (!trumpInfo) return false;

  const isTrumpLead = currentTrick.plays[0]?.cards.some((card) =>
    isTrump(card, trumpInfo),
  );

  if (isTrumpLead) {
    // Trump lead logic
    // Check next player trump void status (only if not last player)
    let isNextPlayerTrumpVoid = false;
    if (!isLastPlayer) {
      const nextPlayerIndex = (gameState.currentPlayerIndex + 1) % 4;
      const nextPlayerId = gameState.players[nextPlayerIndex]?.id as PlayerId;

      if (context.memoryContext.playerMemories && nextPlayerId) {
        const nextPlayerMemory =
          context.memoryContext.playerMemories[nextPlayerId];
        isNextPlayerTrumpVoid = nextPlayerMemory?.trumpVoid ?? false;
      }
    }

    // Get teammate's winning cards for biggest trump analysis
    const currentWinnerCards =
      currentTrick.plays.find(
        (play) => play.playerId === context.trickWinnerAnalysis?.currentWinner,
      )?.cards || [];

    // Check if teammate has biggest trump by memory analysis
    const teammateIsBiggestInTrump = checkComboIsBiggestInTrump(
      currentWinnerCards,
      context,
      gameState,
      currentTrick,
    );

    // Contribute if:
    // I'm 4th player OR next player void in trump OR teammate has biggest trump
    return isLastPlayer || isNextPlayerTrumpVoid || teammateIsBiggestInTrump;
  } else {
    // Non-trump lead logic
    // Check next player void status (only if not last player)
    let isNextPlayerVoid = false;
    if (!isLastPlayer) {
      const nextPlayerIndex = (gameState.currentPlayerIndex + 1) % 4;
      const nextPlayerId = gameState.players[nextPlayerIndex]?.id as PlayerId;
      const leadingSuit = currentTrick.plays[0]?.cards[0]?.suit;

      if (context.memoryContext.playerMemories && nextPlayerId && leadingSuit) {
        const nextPlayerMemory =
          context.memoryContext.playerMemories[nextPlayerId];
        isNextPlayerVoid =
          nextPlayerMemory?.suitVoids.has(leadingSuit) ?? false;
      }
    }

    // Condition 1: Teammate trumped it
    if (trickAnalysis.isCurrentlyTrumped) {
      return isLastPlayer || !isNextPlayerVoid;
    }

    // Condition 2: Teammate winning non-trump AND biggest in suit by memory
    const currentWinnerPlay = currentTrick.plays.find(
      (play) => play.playerId === context.trickWinnerAnalysis?.currentWinner,
    );
    const teammateIsBiggestInSuit = currentWinnerPlay
      ? checkComboIsBiggestInSuit(
          currentWinnerPlay.cards,
          context,
          gameState,
          currentTrick,
        )
      : true;

    if (teammateIsBiggestInSuit) {
      return isLastPlayer || !isNextPlayerVoid;
    }

    return false;
  }
}

// =============== HELPER FUNCTIONS ===============

/**
 * Check if given combo is biggest in the leading suit by memory analysis
 *
 * Algorithm:
 * 1. Get all remaining unseen cards for the leading suit
 * 2. Use suit availability analysis to see what combos are possible from unseen cards
 * 3. Check if any of those combos can beat the given combo
 * 4. If yes, combo is not biggest; if no, combo is biggest
 */
function checkComboIsBiggestInSuit(
  combo: Card[],
  context: GameContext,
  gameState: GameState,
  currentTrick: Trick,
): boolean {
  const leadingSuit = currentTrick.plays[0]?.cards[0]?.suit;
  const trumpInfo = context.trumpInfo || gameState.trumpInfo;

  if (!leadingSuit || !trumpInfo) {
    return true; // Assume combo is biggest if we can't analyze
  }

  // Skip analysis if this is trump lead (trump cards don't follow this logic)
  if (currentTrick.plays[0]?.cards.some((card) => isTrump(card, trumpInfo))) {
    return true;
  }

  // Get all remaining unseen cards for the leading suit
  const unseenCards = getRemainingUnseenCards(leadingSuit, context, gameState);

  if (unseenCards.length === 0) {
    return true; // No more cards in suit, combo definitely is biggest
  }

  // Use suit availability analysis to see what combos are possible from unseen cards
  const leadingCards = currentTrick.plays[0]?.cards || [];
  const unseenAnalysis = analyzeSuitAvailability(
    leadingCards,
    unseenCards, // Treat unseen cards as a hypothetical player's hand
    trumpInfo,
  );

  // If no valid combos can be formed from unseen cards, combo is biggest
  if (
    unseenAnalysis.scenario !== "valid_combos" ||
    !unseenAnalysis.validCombos ||
    unseenAnalysis.validCombos.length === 0
  ) {
    return true;
  }

  // Check if any unseen combo can beat the given combo
  for (const unseenCombo of unseenAnalysis.validCombos) {
    const canBeat = canBeatCombo(unseenCombo.cards, combo, trumpInfo);
    if (canBeat) {
      // Found an unseen combo that can beat given combo - it is not biggest
      return false;
    }
  }

  // No unseen combo can beat given combo - it is biggest in suit
  return true;
}

/**
 * Check if given trump combo is biggest in trump by memory analysis
 *
 * Algorithm:
 * 1. Get all remaining unseen trump cards
 * 2. Use suit availability analysis to see what trump combos are possible from unseen cards
 * 3. Check if any of those trump combos can beat the given combo
 * 4. If yes, combo is not biggest; if no, combo is biggest trump
 */
function checkComboIsBiggestInTrump(
  combo: Card[],
  context: GameContext,
  gameState: GameState,
  currentTrick: Trick,
): boolean {
  const trumpInfo = context.trumpInfo || gameState.trumpInfo;

  if (!trumpInfo) {
    return true; // Assume combo is biggest if we can't analyze
  }

  // Skip analysis if this is not a trump lead
  if (!currentTrick.plays[0]?.cards.some((card) => isTrump(card, trumpInfo))) {
    return true; // Not analyzing trump for non-trump leads
  }

  // Get all remaining unseen trump cards (use Suit.None for trump group)
  const unseenTrumpCards = getRemainingUnseenCards(
    Suit.None,
    context,
    gameState,
  );

  if (unseenTrumpCards.length === 0) {
    return true; // No more trump cards, combo definitely is biggest
  }

  // Use suit availability analysis to see what trump combos are possible from unseen cards
  const leadingCards = currentTrick.plays[0]?.cards || [];
  const unseenAnalysis = analyzeSuitAvailability(
    leadingCards,
    unseenTrumpCards, // Treat unseen trump cards as a hypothetical player's hand
    trumpInfo,
  );

  // If no valid combos can be formed from unseen trump cards, combo is biggest
  if (
    unseenAnalysis.scenario !== "valid_combos" ||
    !unseenAnalysis.validCombos ||
    unseenAnalysis.validCombos.length === 0
  ) {
    return true;
  }

  // Check if any unseen trump combo can beat the given combo
  for (const unseenCombo of unseenAnalysis.validCombos) {
    const canBeat = canBeatCombo(unseenCombo.cards, combo, trumpInfo);
    if (canBeat) {
      // Found an unseen trump combo that can beat given combo - it is not biggest
      return false;
    }
  }

  // No unseen trump combo can beat given combo - it is biggest trump
  return true;
}
