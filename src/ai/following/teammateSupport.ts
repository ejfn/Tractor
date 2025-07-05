import { isTrump, calculateCardStrategicValue } from "../../game/cardValue";
import { gameLogger } from "../../utils/gameLogger";
import {
  Card,
  Combo,
  ComboAnalysis,
  GameContext,
  GameState,
  PlayerId,
  Rank,
  TrickWinnerAnalysis,
  TrumpInfo,
} from "../../types";
import {
  selectEnhancedPointContribution,
  selectPointContribution,
} from "./pointContribution";
import { selectLowestValueNonPointCombo } from "./strategicDisposal";

/**
 * Teammate Support - Team coordination when teammate is winning
 *
 * Simplified module focusing on core teammate support logic.
 * Position-specific strategy is now handled by positionStrategy.ts
 */

/**
 * Main teammate winning handler - simplified for unified position strategy
 */
export function handleTeammateWinning(
  comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
  context: GameContext,
  trumpInfo: TrumpInfo,
  _gameState: GameState,
  currentPlayerId?: PlayerId,
): Card[] {
  const trickWinner = context.trickWinnerAnalysis;
  if (!trickWinner) {
    // No trick winner analysis available, fall back to safe play
    return selectLowestValueNonPointCombo(comboAnalyses);
  }

  // ENHANCED POINT TIMING ANALYSIS: Use advanced point timing when available
  if (context.memoryContext?.cardMemory && currentPlayerId) {
    const enhancedContribution = selectEnhancedPointContribution(
      comboAnalyses,
      trumpInfo,
      context,
      _gameState,
      currentPlayerId,
    );
    if (enhancedContribution) {
      return enhancedContribution;
    }
  }

  // MEMORY ENHANCEMENT: Prioritize guaranteed point winners when teammate winning (only for valuable tricks)
  if (
    context.memoryContext?.cardMemory &&
    _gameState?.currentTrick?.points &&
    _gameState.currentTrick.points >= 10
  ) {
    const guaranteedPointWinner = selectMemoryGuaranteedPointContribution(
      comboAnalyses,
      context,
      trumpInfo,
    );
    if (guaranteedPointWinner) {
      return guaranteedPointWinner;
    }
  }

  // Unified teammate support logic (position-specific logic now handled by positionStrategy.ts)
  const shouldContribute = shouldContributePointCards(
    trickWinner,
    comboAnalyses,
    context,
    _gameState,
    trumpInfo,
  );

  if (shouldContribute) {
    return selectPointContribution(
      comboAnalyses,
      trumpInfo,
      context,
      _gameState,
    );
  }

  // Fallback: Conservative play when not contributing points
  return selectLowestValueNonPointCombo(comboAnalyses);
}

/**
 * Determines whether to contribute point cards when teammate is winning
 */
export function shouldContributePointCards(
  trickWinner: TrickWinnerAnalysis,
  comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
  context: GameContext,
  gameState?: GameState,
  _trumpInfo?: TrumpInfo,
): boolean {
  // Check if we have point cards available
  const hasPointCards = comboAnalyses.some((ca) =>
    ca.combo.cards.some((card) => card.points > 0),
  );

  if (!hasPointCards) {
    return false; // Can't contribute what we don't have
  }

  // Conservative logic for teammate support
  const trickPoints = trickWinner.trickPoints;
  const cardsRemaining = context.cardsRemaining;

  // Contribute points for valuable tricks or when teammate needs help
  if (trickPoints >= 15) {
    return true; // High value trick
  }

  if (trickPoints >= 10 && cardsRemaining <= 10) {
    return true; // Medium value trick in endgame
  }

  if (trickPoints >= 5 && cardsRemaining <= 5) {
    return true; // Any points in final tricks
  }

  return false; // Conservative default
}

/**
 * Select memory-enhanced guaranteed point contribution when teammate is winning
 */
function selectMemoryGuaranteedPointContribution(
  comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
  context: GameContext,
  trumpInfo: TrumpInfo,
): Card[] | null {
  if (!context.memoryContext?.cardMemory) {
    return null;
  }

  // Look for point cards that are guaranteed winners
  const pointCombos = comboAnalyses.filter((ca) =>
    ca.combo.cards.some((card) => card.points > 0),
  );

  for (const ca of pointCombos) {
    // Check if this combo contains guaranteed winners
    const hasGuaranteedWinner = ca.combo.cards.some((card) => {
      if (card.points === 0) return false;

      // Simple heuristic: Aces and Kings are often guaranteed in endgame
      if (card.rank === Rank.Ace || card.rank === Rank.King) {
        // Check if we've seen stronger cards in this suit already
        const playedCards =
          context.memoryContext?.cardMemory?.playedCards || [];
        const strongerCards = playedCards.filter(
          (playedCard) =>
            playedCard.suit === card.suit &&
            !isTrump(playedCard, trumpInfo) &&
            calculateCardStrategicValue(playedCard, trumpInfo, "basic") >
              calculateCardStrategicValue(card, trumpInfo, "basic"),
        );

        // If no stronger cards have been played, this might be a guaranteed winner
        return strongerCards.length === 0;
      }

      return false;
    });

    if (hasGuaranteedWinner) {
      gameLogger.debug("ai_following_decision", {
        decisionPoint: "guaranteed_point_contribution",
        cards: ca.combo.cards.map((c) => `${c.rank}${c.suit}`),
        points: ca.combo.cards.reduce((sum, c) => sum + c.points, 0),
      });

      return ca.combo.cards;
    }
  }

  return null;
}
