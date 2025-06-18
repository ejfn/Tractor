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
  PlayerId,
  Suit,
  TrumpInfo,
  MemoryContext,
  EnhancedMemoryContext,
} from "../../types";
import {
  createPointFocusedContext,
  selectEarlyGameLeadingPlay,
  selectMemoryEnhancedPointPlay,
} from "./pointFocusedStrategy";
import { selectMultiComboLeadByPhase } from "./multiComboLeadingStrategy";
import { analyzeCombo } from "../aiGameContext";
import { analyzeFirstPlayerStrategy } from "./firstPlayerLeadingAnalysis";
import { getRankValue } from "../analysis/comboAnalysis";
import { isTrump } from "../../game/gameHelpers";
import { isBiggestRemainingInSuit } from "../aiCardMemory";
import { VoidExploitationAnalysis } from "../analysis/voidExploitation";

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

  // === PRIORITY 1: MULTI-COMBOS (GAME PHASE AWARE) ===
  // Early game: Multi-combos have HIGHEST priority
  // Mid/Late game: Sophisticated strategic evaluation
  const multiComboPlay = selectMultiComboLeadByPhase(
    validCombos,
    trumpInfo,
    context,
    gameState,
    pointContext.gamePhase,
  );
  if (multiComboPlay) {
    return multiComboPlay;
  }

  // === PRIORITY 2: EARLY GAME ACES ===
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

  // === PRIORITY 3: VOID EXPLOITATION ===
  // Use void exploitation opportunities for strategic advantage
  if (context.memoryContext && context.memoryContext.voidExploitation) {
    const voidAnalysis = context.memoryContext.voidExploitation;
    const voidExploitationPlay = selectVoidExploitationLead(
      comboAnalyses,
      voidAnalysis,
      trumpInfo,
    );
    if (voidExploitationPlay) {
      return voidExploitationPlay;
    }
  }

  // === PRIORITY 2.5: POINT CARD PROTECTION ===
  // Filter out risky point card leads that would give points to opponents
  if (context.memoryContext && context.memoryContext.voidExploitation) {
    const safeComboAnalyses = filterRiskyPointCardLeads(
      comboAnalyses,
      context.memoryContext.voidExploitation,
      trumpInfo,
      gameState,
      currentPlayer.id,
    );
    // Update combo analyses to use only safe options for subsequent priorities
    if (safeComboAnalyses.length > 0) {
      comboAnalyses.splice(0, comboAnalyses.length, ...safeComboAnalyses);
    }
  }

  // === PRIORITY 3: MEMORY-ENHANCED POINT TIMING ===
  // Use advanced point card timing analysis for optimal point collection
  if (context.memoryContext?.cardMemory && gameState.tricks.length >= 1) {
    const pointTimingPlay = selectMemoryEnhancedPointPlay(
      validCombos,
      trumpInfo,
      context,
      gameState,
      currentPlayer.id,
    );
    if (pointTimingPlay) {
      return pointTimingPlay.cards;
    }
  }

  // === PRIORITY 4: MEMORY GUARANTEED WINNERS ===
  // Play guaranteed winners from memory analysis (but not in early probing phase)
  if (
    context.memoryContext &&
    pointContext.gamePhase !== GamePhaseStrategy.EarlyGame
  ) {
    const guaranteedWinner = selectBiggestRemainingCombo(
      comboAnalyses,
      context.memoryContext,
      trumpInfo,
    );
    if (guaranteedWinner) {
      return guaranteedWinner;
    }
  }

  // === PRIORITY 6: HISTORICAL INSIGHTS ===
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

  // === PRIORITY 6: FIRST PLAYER ANALYSIS ===
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

  // === PRIORITY 7: SAFE DISPOSAL ===
  // Play safe, non-revealing cards when no better option
  return selectSafeLeadingDisposal(comboAnalyses, trumpInfo, context);
}

/**
 * Basic leading play for fallback scenarios
 *
 * @remarks Used as fallback when no player context is available or memory analysis fails.
 * Provides simple, safe play selection for edge cases.
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
 *
 * @remarks Thin wrapper around selectSafeLeadCombo for consistent API.
 * Consider using selectSafeLeadCombo directly for new code.
 */
export function selectSafeLeadingDisposal(
  comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
  trumpInfo: TrumpInfo,
  _context: GameContext,
): Card[] {
  // Use existing safe lead combo logic for disposal
  return selectSafeLeadCombo(comboAnalyses, trumpInfo);
}

/**
 * Safe leading - avoid giving away points or strong cards
 */
export function selectSafeLeadCombo(
  comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
  _trumpInfo: TrumpInfo,
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

/**
 * Memory-enhanced: Select combos with guaranteed winning cards
 * Uses card memory to identify combinations that are certain to win
 */
function selectBiggestRemainingCombo(
  comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
  memoryContext: MemoryContext,
  trumpInfo: TrumpInfo,
): Card[] | null {
  if (!memoryContext.cardMemory) return null;

  // Find combos with guaranteed winning cards
  const guaranteedWinners: {
    combo: { combo: Combo; analysis: ComboAnalysis };
    priority: number;
  }[] = [];

  comboAnalyses.forEach((comboAnalysis) => {
    const firstCard = comboAnalysis.combo.cards[0];
    if (!firstCard.rank || !firstCard.suit || isTrump(firstCard, trumpInfo)) {
      return; // Skip trump or invalid cards for now
    }

    const comboType =
      comboAnalysis.combo.type === ComboType.Pair ? "pair" : "single";
    const isBiggestRemaining =
      memoryContext.cardMemory &&
      firstCard.rank &&
      isBiggestRemainingInSuit(
        memoryContext.cardMemory,
        firstCard.suit,
        firstCard.rank,
        comboType,
      );

    if (isBiggestRemaining) {
      let priority = 0;

      // Priority calculation: Point cards > High cards > Others
      if (firstCard.points && firstCard.points > 0) {
        priority += 100; // Highest priority for point cards
        priority += firstCard.points; // Add point value
      } else {
        // Non-point cards by rank value
        const rankValue = getRankValue(firstCard.rank);
        priority += rankValue;
      }

      guaranteedWinners.push({
        combo: comboAnalysis,
        priority,
      });
    }
  });

  if (guaranteedWinners.length > 0) {
    // Sort by priority: highest first
    guaranteedWinners.sort((a, b) => b.priority - a.priority);
    return guaranteedWinners[0].combo.combo.cards;
  }

  return null;
}

/**
 * Memory-enhanced: Apply historical analysis to leading strategy
 * Uses opponent patterns to adapt leading decisions
 */
function applyLeadingHistoricalInsights(
  context: GameContext,
  validCombos: Combo[],
  trumpInfo: TrumpInfo,
  _gameState: GameState,
): Card[] | null {
  // Check if we have enhanced memory context with historical data
  const enhancedContext = context.memoryContext as EnhancedMemoryContext;
  if (!enhancedContext?.trickHistory) return null;

  const trickHistory = enhancedContext.trickHistory;

  // Analyze opponent aggressiveness patterns
  const opponentPatterns = trickHistory.opponentLeadingPatterns;
  let shouldBeConservative = false;
  let shouldBeAggressive = false;

  // Check opponent aggressiveness levels
  Object.values(opponentPatterns).forEach((pattern) => {
    if (pattern.aggressivenessLevel > 0.7) {
      shouldBeConservative = true; // Conservative against aggressive opponents
    }
    if (pattern.aggressivenessLevel < 0.3) {
      shouldBeAggressive = true; // Aggressive against conservative opponents
    }
  });

  const comboAnalyses = validCombos.map((combo) => ({
    combo,
    analysis: analyzeCombo(combo, trumpInfo, context),
  }));

  if (shouldBeConservative) {
    // Play conservatively: avoid high-value cards and trump
    const conservativeCombos = comboAnalyses.filter(
      (ca) =>
        !ca.analysis.hasPoints &&
        !ca.analysis.isTrump &&
        ca.analysis.strength === ComboStrength.Weak,
    );

    if (conservativeCombos.length > 0) {
      return conservativeCombos[0].combo.cards;
    }
  }

  if (shouldBeAggressive) {
    // Play aggressively: use memory-enhanced guaranteed winners
    if (context.memoryContext) {
      const memoryResult = selectBiggestRemainingCombo(
        comboAnalyses,
        context.memoryContext,
        trumpInfo,
      );

      if (memoryResult) {
        return memoryResult;
      }
    }

    // If no guaranteed winners, play strong cards
    const strongCombos = comboAnalyses.filter(
      (ca) =>
        ca.analysis.strength === ComboStrength.Strong || ca.analysis.hasPoints,
    );

    if (strongCombos.length > 0) {
      return strongCombos[0].combo.cards;
    }
  }

  // Default: use adaptive behavior insights
  if (trickHistory.adaptiveBehaviorTrends?.learningRate > 0.5) {
    // Opponent adapts quickly - vary strategy
    const randomIndex = Math.floor(Math.random() * comboAnalyses.length);
    return comboAnalyses[randomIndex].combo.cards;
  }

  return null; // No specific historical insights apply
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
  _trumpInfo: TrumpInfo,
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
  _trumpInfo: TrumpInfo,
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
  _analysis: FirstPlayerAnalysis,
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

/**
 * Void Exploitation Leading - Use void analysis for strategic leading
 */
function selectVoidExploitationLead(
  comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
  voidAnalysis: VoidExploitationAnalysis,
  trumpInfo: TrumpInfo,
): Card[] | null {
  // Check if we have high-value void exploitation opportunities
  if (
    voidAnalysis.voidAdvantageScore > 0.7 &&
    voidAnalysis.voidBasedLeadRecommendations.length > 0
  ) {
    const bestVoidLead = voidAnalysis.voidBasedLeadRecommendations[0];

    // Find the combo that matches the recommended lead
    const matchingCombo = comboAnalyses.find(
      (ca) =>
        ca.combo.cards.length === 1 &&
        ca.combo.cards[0].suit === bestVoidLead.leadCard.suit &&
        ca.combo.cards[0].rank === bestVoidLead.leadCard.rank,
    );

    if (matchingCombo) {
      return matchingCombo.combo.cards;
    }
  }

  // Check for immediate void exploitation opportunities
  const immediateOpportunities =
    voidAnalysis.voidTimingRecommendations.immediateOpportunities;
  if (immediateOpportunities.length > 0) {
    const bestOpportunity = immediateOpportunities[0];

    // Find a combo that exploits this void
    const exploitationCombo = comboAnalyses.find((ca) =>
      ca.combo.cards.some((card) =>
        bestOpportunity.exploitationCards.some(
          (exploitCard) =>
            card.suit === exploitCard.suit && card.rank === exploitCard.rank,
        ),
      ),
    );

    if (exploitationCombo) {
      return exploitationCombo.combo.cards;
    }
  }

  return null;
}

/**
 * Point Card Protection - Filter out risky leads that give points to opponents
 * Prevents leading non-trump point cards when opponents have voids in that suit
 */
function filterRiskyPointCardLeads(
  comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
  voidAnalysis: VoidExploitationAnalysis,
  trumpInfo: TrumpInfo,
  gameState: GameState,
  currentPlayerId: PlayerId,
): { combo: Combo; analysis: ComboAnalysis }[] {
  const safeCombos = comboAnalyses.filter((comboAnalysis) => {
    const combo = comboAnalysis.combo;
    const analysis = comboAnalysis.analysis;

    // Only check non-trump point cards
    if (analysis.isTrump || !analysis.hasPoints) {
      return true; // Trump cards and non-point cards are safe
    }

    // Check if this would lead into a dangerous opponent void
    const leadSuit = combo.cards[0].suit;
    const isRiskyLead = isRiskyPointCardLead(
      combo,
      leadSuit,
      voidAnalysis,
      trumpInfo,
      gameState,
      currentPlayerId,
    );

    return !isRiskyLead;
  });

  // If filtering removes all options, return original list to avoid empty choices
  return safeCombos.length > 0 ? safeCombos : comboAnalyses;
}

/**
 * Determine if leading this point card combo is risky due to opponent voids
 */
function isRiskyPointCardLead(
  combo: Combo,
  leadSuit: Suit,
  voidAnalysis: VoidExploitationAnalysis,
  trumpInfo: TrumpInfo,
  gameState: GameState,
  currentPlayerId: PlayerId,
): boolean {
  // Calculate total point value at risk
  const pointsAtRisk = combo.cards.reduce(
    (sum, card) => sum + (card.points || 0),
    0,
  );

  // Only protect valuable point cards (5+ points)
  if (pointsAtRisk < 5) {
    return false; // Low-value point cards can be risked
  }

  // Check confirmed opponent voids in this suit
  const confirmedVoidOpponents = Object.entries(voidAnalysis.confirmedVoids)
    .filter(([playerId, voidSuits]) => {
      const isOpponent = !isTeammatePlayer(
        playerId as PlayerId,
        gameState,
        currentPlayerId,
      );
      const hasVoidInSuit = voidSuits.includes(leadSuit);
      return isOpponent && hasVoidInSuit;
    })
    .map(([playerId]) => playerId as PlayerId);

  if (confirmedVoidOpponents.length > 0) {
    // High risk: Confirmed opponent void in this suit
    return true;
  }

  // Check probable opponent voids with high probability
  const probableVoidOpponents = Object.entries(voidAnalysis.probableVoids)
    .filter(([playerId, voidProbs]) => {
      const isOpponent = !isTeammatePlayer(
        playerId as PlayerId,
        gameState,
        currentPlayerId,
      );
      const highProbVoid = voidProbs.some(
        (voidProb) =>
          voidProb.suit === leadSuit &&
          voidProb.probability > 0.75 &&
          voidProb.confidence > 0.7,
      );
      return isOpponent && highProbVoid;
    })
    .map(([playerId]) => playerId as PlayerId);

  if (probableVoidOpponents.length > 0 && pointsAtRisk >= 10) {
    // High risk for valuable cards: Probable opponent void with high confidence
    return true;
  }

  return false; // Safe to lead
}

/**
 * Helper function to check if a player is a teammate using game state
 */
function isTeammatePlayer(
  playerId: PlayerId,
  gameState: GameState,
  currentPlayerId: PlayerId,
): boolean {
  const currentPlayer = gameState.players.find((p) => p.id === currentPlayerId);
  const targetPlayer = gameState.players.find((p) => p.id === playerId);

  if (!currentPlayer || !targetPlayer) {
    return false;
  }

  return currentPlayer.team === targetPlayer.team;
}
