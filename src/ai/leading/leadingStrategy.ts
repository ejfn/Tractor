import {
  Card,
  Combo,
  ComboAnalysis,
  ComboStrength,
  ComboType,
  FirstPlayerAnalysis,
  GameContext,
  GamePhaseStrategy,
  GameState,
  TrumpInfo,
} from "../../types";
import {
  createPointFocusedContext,
  selectEarlyGameLeadingPlay,
} from "./pointFocusedStrategy";
import { analyzeCombo } from "../aiGameContext";
import { analyzeFirstPlayerStrategy } from "../analysis/firstPlayerAnalysis";
import { getRankValue } from "../analysis/comboAnalysis";
import { isTrump } from "../../game/gameLogic";

/**
 * Leading Strategy - Main leading logic and first position tactics
 *
 * Implements the unified advanced leading strategy with priority-based
 * decision making for the first player position.
 */

/**
 * UNIFIED LEADING PLAYER STRATEGY - Single Priority Chain
 * Main entry point for all leading play decisions
 */
export function selectAdvancedLeadingPlay(
  validCombos: Combo[],
  trumpInfo: TrumpInfo,
  context: GameContext,
  gameState: GameState,
): Card[] {
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  if (!currentPlayer) {
    return selectBasicLeadingPlay(validCombos, trumpInfo, context);
  }

  // Create analysis contexts
  const pointContext = createPointFocusedContext(
    gameState,
    currentPlayer.id,
    context,
  );
  const comboAnalyses = validCombos.map((combo) => ({
    combo,
    analysis: analyzeCombo(combo, trumpInfo, context),
  }));

  // === PRIORITY 1: EARLY GAME ACES ===
  // Non-trump Aces are guaranteed winners in early game - ALWAYS check this first
  if (pointContext.gamePhase === GamePhaseStrategy.EarlyGame) {
    const earlyGamePlay = selectEarlyGameLeadingPlay(
      validCombos,
      trumpInfo,
      pointContext,
      gameState,
    );
    if (earlyGamePlay) {
      return earlyGamePlay.cards;
    }
  }

  // === PRIORITY 2: MEMORY GUARANTEED WINNERS ===
  // Play guaranteed winners from memory analysis
  if (context.memoryContext) {
    const guaranteedWinner = selectBiggestRemainingCombo(
      comboAnalyses,
      context.memoryContext,
      trumpInfo,
    );
    if (guaranteedWinner) {
      return guaranteedWinner;
    }
  }

  // === PRIORITY 3: HISTORICAL INSIGHTS ===
  // Apply opponent modeling when sufficient data available
  if (gameState.tricks.length >= 3) {
    const historicalPlay = applyLeadingHistoricalInsights(
      context,
      validCombos,
      trumpInfo,
      gameState,
    );
    if (historicalPlay) {
      return historicalPlay;
    }
  }

  // === PRIORITY 4: FIRST PLAYER ANALYSIS ===
  // Use FirstPlayerAnalysis for game phase strategy
  const firstPlayerAnalysis = analyzeFirstPlayerStrategy(
    validCombos,
    trumpInfo,
    context,
    pointContext,
    gameState,
  );

  if (firstPlayerAnalysis.optimalLeadingCombo) {
    // Apply game phase specific leading logic using FirstPlayerAnalysis
    switch (firstPlayerAnalysis.gamePhaseStrategy) {
      case "probe":
        const probePlay = selectProbeLeadingPlay(
          validCombos,
          trumpInfo,
          firstPlayerAnalysis,
        );
        if (probePlay) return probePlay;
        break;
      case "aggressive":
        const aggressivePlay = selectAggressiveLeadingPlay(
          validCombos,
          trumpInfo,
          firstPlayerAnalysis,
        );
        if (aggressivePlay) return aggressivePlay;
        break;
      case "control":
        const controlPlay = selectControlLeadingPlay(
          validCombos,
          trumpInfo,
          firstPlayerAnalysis,
        );
        if (controlPlay) return controlPlay;
        break;
      case "endgame":
        const endgamePlay = selectEndgameLeadingPlay(
          validCombos,
          trumpInfo,
          firstPlayerAnalysis,
        );
        if (endgamePlay) return endgamePlay;
        break;
    }

    // Fallback to analysis recommendation
    return firstPlayerAnalysis.optimalLeadingCombo.cards;
  }

  // === PRIORITY 5: SAFE DISPOSAL ===
  // Play safe, non-revealing cards when no better option
  return selectSafeLeadingDisposal(comboAnalyses, trumpInfo, context);
}

/**
 * Basic leading play for fallback scenarios
 */
export function selectBasicLeadingPlay(
  validCombos: Combo[],
  trumpInfo: TrumpInfo,
  context: GameContext,
): Card[] {
  // Simple fallback logic when no player context available
  const comboAnalyses = validCombos.map((combo) => ({
    combo,
    analysis: analyzeCombo(combo, trumpInfo, context),
  }));

  return selectSafeLeadingDisposal(comboAnalyses, trumpInfo, context);
}

/**
 * Safe leading disposal when no better option available
 */
export function selectSafeLeadingDisposal(
  comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
  trumpInfo: TrumpInfo,
  context: GameContext,
): Card[] {
  // Use existing safe lead combo logic for disposal
  return selectSafeLeadCombo(comboAnalyses, trumpInfo);
}

/**
 * Safe leading - avoid giving away points or strong cards
 */
export function selectSafeLeadCombo(
  comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
  trumpInfo: TrumpInfo,
): Card[] {
  // Safe leading - avoid giving away points or strong cards
  const safe = comboAnalyses.filter(
    (ca) =>
      !ca.analysis.hasPoints && ca.analysis.strength === ComboStrength.Weak,
  );

  if (safe.length > 0) {
    // Prefer non-trump safe cards
    const nonTrumpSafe = safe.filter((ca) => !ca.analysis.isTrump);
    if (nonTrumpSafe.length > 0) {
      return nonTrumpSafe[0].combo.cards;
    }
    return safe[0].combo.cards;
  }

  // No safe options - pick least risky
  const sorted = comboAnalyses.sort((a, b) => {
    if (a.analysis.hasPoints !== b.analysis.hasPoints) {
      return a.analysis.hasPoints ? 1 : -1;
    }
    return a.combo.value - b.combo.value;
  });
  return sorted[0].combo.cards;
}

// Helper functions that will be extracted from main file
function selectBiggestRemainingCombo(
  comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
  memoryContext: any,
  trumpInfo: TrumpInfo,
): Card[] | null {
  // This will be moved from the main file
  return null; // Placeholder
}

function applyLeadingHistoricalInsights(
  context: GameContext,
  validCombos: Combo[],
  trumpInfo: TrumpInfo,
  gameState: GameState,
): Card[] | null {
  // This will be moved from the main file
  return null; // Placeholder
}

/**
 * Probe strategy: Lead safe, non-revealing cards to gather information
 */
export function selectProbeLeadingPlay(
  validCombos: Combo[],
  trumpInfo: TrumpInfo,
  analysis: FirstPlayerAnalysis,
): Card[] | null {
  // Probe strategy: Lead safe, non-revealing cards to gather information
  const safeCombos = validCombos.filter(
    (combo) =>
      !combo.cards.some((card) => isTrump(card, trumpInfo)) &&
      combo.cards.every((card) => (card.points || 0) === 0) &&
      combo.cards.every(
        (card) => (card.rank ? getRankValue(card.rank) : 0) <= 9,
      ), // Avoid high cards
  );

  if (safeCombos.length > 0) {
    return safeCombos[0].cards;
  }

  return analysis.optimalLeadingCombo?.cards || null;
}

/**
 * Aggressive strategy: Lead strong combinations to force early pressure
 */
export function selectAggressiveLeadingPlay(
  validCombos: Combo[],
  trumpInfo: TrumpInfo,
  analysis: FirstPlayerAnalysis,
): Card[] | null {
  // Aggressive strategy: Lead strong combinations to force early pressure
  const strongCombos = validCombos.filter(
    (combo) =>
      combo.cards.some((card) => (card.points || 0) > 0) ||
      combo.type === ComboType.Tractor ||
      combo.type === ComboType.Pair,
  );

  if (strongCombos.length > 0) {
    // Select combo with highest point value or strongest combination
    const bestCombo = strongCombos.reduce((best, combo) => {
      const comboPoints = combo.cards.reduce(
        (sum, card) => sum + (card.points || 0),
        0,
      );
      const bestPoints = best.cards.reduce(
        (sum, card) => sum + (card.points || 0),
        0,
      );

      if (comboPoints > bestPoints) return combo;
      if (comboPoints === bestPoints && combo.type > best.type) return combo;
      return best;
    });

    return bestCombo.cards;
  }

  return analysis.optimalLeadingCombo?.cards || null;
}

/**
 * Control strategy: Lead tactical combinations that set up good team positioning
 */
export function selectControlLeadingPlay(
  validCombos: Combo[],
  trumpInfo: TrumpInfo,
  analysis: FirstPlayerAnalysis,
): Card[] | null {
  // Control strategy: Lead tactical combinations that set up good team positioning
  const tacticalCombos = validCombos.filter(
    (combo) =>
      combo.type === ComboType.Tractor || combo.type === ComboType.Pair,
  );

  if (tacticalCombos.length > 0) {
    // Prefer tractors over pairs for better control
    const tractors = tacticalCombos.filter(
      (combo) => combo.type === ComboType.Tractor,
    );
    if (tractors.length > 0) {
      return tractors[0].cards;
    }
    return tacticalCombos[0].cards;
  }

  return analysis.optimalLeadingCombo?.cards || null;
}

/**
 * Endgame strategy: Lead highest value combinations for maximum points
 */
export function selectEndgameLeadingPlay(
  validCombos: Combo[],
  trumpInfo: TrumpInfo,
  analysis: FirstPlayerAnalysis,
): Card[] | null {
  // Endgame strategy: Lead highest value combinations for maximum points
  const bestCombo = validCombos.reduce((best, combo) => {
    const comboValue = combo.cards.reduce((sum, card) => {
      let value = card.points || 0;
      if (isTrump(card, trumpInfo)) value += 10;
      value += Math.min(card.rank ? getRankValue(card.rank) : 0, 10);
      return sum + value;
    }, 0);

    const bestValue = best.cards.reduce((sum, card) => {
      let value = card.points || 0;
      if (isTrump(card, trumpInfo)) value += 10;
      value += Math.min(card.rank ? getRankValue(card.rank) : 0, 10);
      return sum + value;
    }, 0);

    return comboValue > bestValue ? combo : best;
  });

  return bestCombo.cards;
}
