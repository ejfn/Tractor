import {
  Card,
  Combo,
  ComboAnalysis,
  ComboStrength,
  GameContext,
  GameState,
  PositionStrategy,
  Suit,
  TrumpInfo,
} from "../../types";
import { evaluateTrickPlay } from "../../game/cardComparison";
import { isTrump } from "../../game/cardValue";

/**
 * Trick Contention - Strategic trick winning when valuable
 *
 * Handles optimal combo selection when AI can and should contest for trick victory.
 * Uses trump conservation hierarchy and proper trick evaluation for strategic wins.
 */

/**
 * Main trick contention handler for valuable tricks
 */
export function selectOptimalWinningCombo(
  comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
  context: GameContext,
  _positionStrategy: PositionStrategy,
  trumpInfo: TrumpInfo,
  gameState: GameState,
): Card[] {
  // Find combos that can actually beat the current trick using proper trick evaluation
  const currentTrick = gameState.currentTrick;
  const winningCombos = comboAnalyses.filter((ca) => {
    if (!currentTrick) return true; // No trick in progress

    // Use evaluateTrickPlay for proper trick-context evaluation
    try {
      const player = gameState.players[gameState.currentPlayerIndex];
      if (!player) return false;

      const evaluation = evaluateTrickPlay(
        ca.combo.cards,
        currentTrick,
        trumpInfo,
        player.hand,
      );

      return evaluation.canBeat && evaluation.isLegal;
    } catch {
      // If evaluation fails, assume this combo cannot win
      return false;
    }
  });

  if (winningCombos.length === 0) {
    return comboAnalyses[0].combo.cards; // Fallback
  }

  // Enhanced strategy: Balance between conservation and suit establishment
  const trickWinner = context.trickWinnerAnalysis;
  const trickPoints = trickWinner?.trickPoints || 0;

  // For high-value tricks (10+ points): Use weakest winning combo (conservation)
  if (trickPoints >= 10) {
    return winningCombos.sort(
      (a, b) => a.analysis.conservationValue - b.analysis.conservationValue,
    )[0].combo.cards;
  }

  // For medium-value tricks (5-9 points): Balance conservation with strength
  if (trickPoints >= 5) {
    // Use medium-strength combo to establish position while conserving high cards
    const sortedByConservation = winningCombos.sort(
      (a, b) => a.analysis.conservationValue - b.analysis.conservationValue,
    );

    // Use combo that's not the weakest but also not the strongest (middle range)
    const middleIndex = Math.min(1, sortedByConservation.length - 1);
    return sortedByConservation[middleIndex].combo.cards;
  }

  // For low-value tricks (0-4 points): Focus on suit establishment
  // Check if we're trying to establish a strong suit
  const leadingSuit = currentTrick?.plays[0]?.cards[0]?.suit;
  if (
    leadingSuit &&
    shouldUseSuitEstablishmentStrategy(gameState, leadingSuit, trumpInfo)
  ) {
    // Use stronger card to establish dominance in this suit
    const nonTrumpCombos = winningCombos.filter((ca) => !ca.analysis.isTrump);
    if (nonTrumpCombos.length > 0) {
      // Use strongest non-trump combo for establishment
      return nonTrumpCombos.sort((a, b) => b.combo.value - a.combo.value)[0]
        .combo.cards;
    }
  }

  // Default: Use weakest winning combo for conservation
  return winningCombos.sort(
    (a, b) => a.analysis.conservationValue - b.analysis.conservationValue,
  )[0].combo.cards;
}

/**
 * Determines if we should use suit establishment strategy
 */
function shouldUseSuitEstablishmentStrategy(
  gameState: GameState,
  leadingSuit: Suit,
  trumpInfo: TrumpInfo,
): boolean {
  // Don't establish trump suits (already strong)
  if (leadingSuit === trumpInfo.trumpSuit) return false;

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  if (!currentPlayer) return false;

  // Get cards in leading suit (non-trump)
  const suitCards = currentPlayer.hand.filter(
    (card) => card.suit === leadingSuit && !isTrump(card, trumpInfo),
  );

  // Only establish if we have 4+ cards in the suit
  return suitCards.length >= 4;
}

/**
 * Aggressive beat play for medium-value tricks
 */
export function selectAggressiveBeatPlay(
  comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
  _context: GameContext,
): Card[] {
  // Filter for combinations that can win
  const winningCombos = comboAnalyses.filter((ca) => {
    // This is a simplified check - could be enhanced with more sophisticated logic
    return ca.analysis.strength >= ComboStrength.Medium;
  });

  if (winningCombos.length === 0) {
    // No medium+ strength combos - use weakest available
    const sorted = comboAnalyses.sort(
      (a, b) => a.analysis.conservationValue - b.analysis.conservationValue,
    );
    return sorted[0].combo.cards;
  }

  // Use weakest medium+ combo for conservation
  const sorted = winningCombos.sort(
    (a, b) => a.analysis.conservationValue - b.analysis.conservationValue,
  );
  return sorted[0].combo.cards;
}
