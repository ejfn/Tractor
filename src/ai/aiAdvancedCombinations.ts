import {
  Card,
  Combo,
  ComboType,
  ComboStrength,
  TrumpInfo,
  GameState,
  GameContext,
  CombinationPotential,
  CombinationContext,
  AdvancedComboPattern,
  CombinationAnalysis,
  HandCombinationProfile,
  CombinationStrategy,
  PlayerId,
  TrickPosition,
  PointPressure,
  PlayStyle,
} from "../types";
import { identifyCombos } from "../game/gameLogic";
import { analyzeCombo } from "./aiGameContext";

/**
 * Phase 4: Advanced Combination Logic
 * Provides sophisticated combination analysis and strategic decision making
 */

// Advanced Pattern Definitions
const COMBINATION_PATTERNS: Record<string, AdvancedComboPattern> = {
  // Single card patterns
  TRUMP_SINGLE_STRONG: {
    type: ComboType.Single,
    minCards: 1,
    maxCards: 1,
    strengthRange: [ComboStrength.Strong, ComboStrength.Critical],
    situationalValue: 0.8,
    opponentDisruption: 0.9,
    partnerSupport: 0.6,
  },
  POINT_SINGLE_SAFE: {
    type: ComboType.Single,
    minCards: 1,
    maxCards: 1,
    strengthRange: [ComboStrength.Weak, ComboStrength.Medium],
    situationalValue: 0.6,
    opponentDisruption: 0.3,
    partnerSupport: 0.7,
  },

  // Pair patterns
  TRUMP_PAIR_DOMINANT: {
    type: ComboType.Pair,
    minCards: 2,
    maxCards: 2,
    strengthRange: [ComboStrength.Strong, ComboStrength.Critical],
    situationalValue: 0.9,
    opponentDisruption: 0.95,
    partnerSupport: 0.8,
  },
  REGULAR_PAIR_SAFE: {
    type: ComboType.Pair,
    minCards: 2,
    maxCards: 2,
    strengthRange: [ComboStrength.Weak, ComboStrength.Medium],
    situationalValue: 0.5,
    opponentDisruption: 0.4,
    partnerSupport: 0.6,
  },

  // Tractor patterns
  TRUMP_TRACTOR_GAME_ENDING: {
    type: ComboType.Tractor,
    minCards: 4,
    maxCards: 8,
    strengthRange: [ComboStrength.Critical, ComboStrength.Critical],
    situationalValue: 1.0,
    opponentDisruption: 1.0,
    partnerSupport: 0.9,
  },
  MIXED_TRACTOR_STRATEGIC: {
    type: ComboType.Tractor,
    minCards: 4,
    maxCards: 6,
    strengthRange: [ComboStrength.Medium, ComboStrength.Strong],
    situationalValue: 0.7,
    opponentDisruption: 0.6,
    partnerSupport: 0.7,
  },
};

/**
 * Analyzes all possible combinations in a hand with advanced strategic evaluation
 */
export function analyzeHandCombinations(
  cards: Card[],
  trumpInfo: TrumpInfo,
  gameState: GameState,
  context: GameContext,
): HandCombinationProfile {
  const combos = identifyCombos(cards, trumpInfo);

  let trumpCombos = 0;
  let pointCombos = 0;
  let totalCombinations = combos.length;

  // Analyze combination types and strengths
  const tractorCombos = combos.filter(
    (combo) => combo.type === ComboType.Tractor,
  );
  const pairCombos = combos.filter((combo) => combo.type === ComboType.Pair);

  combos.forEach((combo) => {
    const analysis = analyzeCombo(combo, trumpInfo, context);
    if (analysis.isTrump) trumpCombos++;
    if (analysis.hasPoints) pointCombos++;
  });

  // Evaluate potentials
  const tractorPotential = evaluateCombinationPotential(
    tractorCombos,
    trumpInfo,
    context,
  );
  const pairPotential = evaluateCombinationPotential(
    pairCombos,
    trumpInfo,
    context,
  );

  // Calculate flexibility and dominance
  const flexibilityScore = calculateFlexibilityScore(combos, context);
  const dominanceLevel = calculateDominanceLevel(combos, trumpInfo, context);

  return {
    totalCombinations,
    tractorPotential,
    pairPotential,
    trumpCombinations: trumpCombos,
    pointCombinations: pointCombos,
    flexibilityScore,
    dominanceLevel,
  };
}

/**
 * Performs advanced analysis on a specific combination
 */
export function performAdvancedCombinationAnalysis(
  combo: Combo,
  trumpInfo: TrumpInfo,
  gameState: GameState,
  context: GameContext,
): CombinationAnalysis {
  const baseAnalysis = analyzeCombo(combo, trumpInfo, context);
  const pattern = identifyComboPattern(combo, baseAnalysis, context);

  // Calculate advanced metrics
  const effectiveness = calculateEffectiveness(
    combo,
    pattern,
    context,
    trumpInfo,
  );
  const timing = determineTiming(combo, context, gameState);
  const risk = calculateRisk(combo, pattern, context);
  const reward = calculateReward(combo, pattern, context);
  const alternativeCount = countAlternatives(
    combo,
    gameState.players.find((p) => p.id === getCurrentPlayerId(gameState))
      ?.hand || [],
    trumpInfo,
  );

  return {
    pattern,
    cards: combo.cards,
    effectiveness,
    timing,
    risk,
    reward,
    alternativeCount,
  };
}

/**
 * Creates an adaptive combination strategy based on game context
 */
export function createCombinationStrategy(
  context: GameContext,
  handProfile: HandCombinationProfile,
): CombinationStrategy {
  const combinationContext = determineCombinationContext(context);
  const preferredPatterns = selectPreferredPatterns(
    combinationContext,
    context,
    handProfile,
  );
  const avoidancePatterns = selectAvoidancePatterns(
    combinationContext,
    context,
  );

  return {
    context: combinationContext,
    preferredPatterns,
    avoidancePatterns,
    adaptiveThreshold: calculateAdaptiveThreshold(context),
    memoryInfluence: calculateMemoryInfluence(context),
  };
}

/**
 * Selects the optimal combination based on advanced analysis
 */
export function selectOptimalCombination(
  availableCombos: Combo[],
  strategy: CombinationStrategy,
  trumpInfo: TrumpInfo,
  gameState: GameState,
  context: GameContext,
): Combo | null {
  if (availableCombos.length === 0) return null;

  // Analyze all combinations
  const analyses = availableCombos.map((combo) =>
    performAdvancedCombinationAnalysis(combo, trumpInfo, gameState, context),
  );

  // Apply strategy filters
  let candidates = analyses.filter(
    (analysis) =>
      isPatternPreferred(analysis.pattern, strategy.preferredPatterns) &&
      !isPatternAvoided(analysis.pattern, strategy.avoidancePatterns),
  );

  // Fallback to all if no candidates match strategy
  if (candidates.length === 0) {
    candidates = analyses;
  }

  // Select based on context-specific criteria
  const selected = selectByCriteria(candidates, strategy, context);

  return selected
    ? { type: selected.pattern.type, cards: selected.cards, value: 0 }
    : null;
}

// Helper Functions

function evaluateCombinationPotential(
  combos: Combo[],
  trumpInfo: TrumpInfo,
  context: GameContext,
): CombinationPotential {
  if (combos.length === 0) return CombinationPotential.None;

  const strongCombos = combos.filter((combo) => {
    const analysis = analyzeCombo(combo, trumpInfo, context);
    return (
      analysis.strength === ComboStrength.Strong ||
      analysis.strength === ComboStrength.Critical
    );
  });

  if (strongCombos.length >= 2) return CombinationPotential.Dominant;
  if (strongCombos.length === 1) return CombinationPotential.Strong;
  return CombinationPotential.Weak;
}

function calculateFlexibilityScore(
  combos: Combo[],
  context: GameContext,
): number {
  const singleCombos = combos.filter((c) => c.type === ComboType.Single).length;
  const pairCombos = combos.filter((c) => c.type === ComboType.Pair).length;
  const tractorCombos = combos.filter(
    (c) => c.type === ComboType.Tractor,
  ).length;

  // Higher flexibility if multiple combo types are available
  const typeVariety =
    (singleCombos > 0 ? 1 : 0) +
    (pairCombos > 0 ? 1 : 0) +
    (tractorCombos > 0 ? 1 : 0);
  const baseScore = typeVariety / 3.0;

  // Bonus for having multiple options within each type
  const optionBonus = Math.min(combos.length / 10.0, 0.3);

  return Math.min(baseScore + optionBonus, 1.0);
}

function calculateDominanceLevel(
  combos: Combo[],
  trumpInfo: TrumpInfo,
  context: GameContext,
): number {
  let dominanceScore = 0;
  let totalCombos = combos.length;

  combos.forEach((combo) => {
    const analysis = analyzeCombo(combo, trumpInfo, context);
    switch (analysis.strength) {
      case ComboStrength.Critical:
        dominanceScore += 4;
        break;
      case ComboStrength.Strong:
        dominanceScore += 3;
        break;
      case ComboStrength.Medium:
        dominanceScore += 2;
        break;
      case ComboStrength.Weak:
        dominanceScore += 1;
        break;
    }

    // Trump bonus
    if (analysis.isTrump) dominanceScore += 1;
  });

  // Normalize to 0-1 scale
  const maxPossibleScore = totalCombos * 5; // Critical + Trump bonus
  return totalCombos > 0 ? Math.min(dominanceScore / maxPossibleScore, 1.0) : 0;
}

function identifyComboPattern(
  combo: Combo,
  analysis: any,
  context: GameContext,
): AdvancedComboPattern {
  // Determine pattern based on combo type and analysis
  if (combo.type === ComboType.Tractor) {
    if (analysis.isTrump && analysis.strength === ComboStrength.Critical) {
      return COMBINATION_PATTERNS.TRUMP_TRACTOR_GAME_ENDING;
    }
    return COMBINATION_PATTERNS.MIXED_TRACTOR_STRATEGIC;
  }

  if (combo.type === ComboType.Pair) {
    if (
      analysis.isTrump &&
      (analysis.strength === ComboStrength.Strong ||
        analysis.strength === ComboStrength.Critical)
    ) {
      return COMBINATION_PATTERNS.TRUMP_PAIR_DOMINANT;
    }
    return COMBINATION_PATTERNS.REGULAR_PAIR_SAFE;
  }

  // Single cards
  if (
    analysis.isTrump &&
    (analysis.strength === ComboStrength.Strong ||
      analysis.strength === ComboStrength.Critical)
  ) {
    return COMBINATION_PATTERNS.TRUMP_SINGLE_STRONG;
  }
  return COMBINATION_PATTERNS.POINT_SINGLE_SAFE;
}

function calculateEffectiveness(
  combo: Combo,
  pattern: AdvancedComboPattern,
  context: GameContext,
  trumpInfo: TrumpInfo,
): number {
  let effectiveness = pattern.situationalValue;

  // Context adjustments
  if (context.trickPosition === TrickPosition.First) {
    effectiveness += pattern.opponentDisruption * 0.3;
  } else {
    effectiveness += pattern.partnerSupport * 0.2;
  }

  // Pressure adjustments
  if (context.pointPressure === PointPressure.HIGH) {
    effectiveness += 0.2;
  }

  // Play style adjustments
  switch (context.playStyle) {
    case PlayStyle.Aggressive:
      effectiveness += pattern.opponentDisruption * 0.1;
      break;
    case PlayStyle.Conservative:
      effectiveness -= 0.1; // Prefer safer plays
      break;
    case PlayStyle.Desperate:
      effectiveness += 0.3; // Everything is more valuable when desperate
      break;
  }

  return Math.min(effectiveness, 1.0);
}

function determineTiming(
  combo: Combo,
  context: GameContext,
  gameState: GameState,
): "immediate" | "delayed" | "endgame" {
  const cardsRemaining = context.cardsRemaining;
  const totalCards = gameState.players[0].hand.length; // Approximate starting hand size

  if (cardsRemaining < totalCards * 0.3) {
    return "endgame";
  }

  if (
    context.pointPressure === PointPressure.HIGH ||
    context.playStyle === PlayStyle.Desperate
  ) {
    return "immediate";
  }

  return "delayed";
}

function calculateRisk(
  combo: Combo,
  pattern: AdvancedComboPattern,
  context: GameContext,
): number {
  let risk = 1.0 - pattern.situationalValue; // Higher value = lower risk

  // High-value combinations are riskier to play early
  if (pattern.strengthRange[1] === ComboStrength.Critical) {
    risk += 0.3;
  }

  // Position affects risk
  if (context.trickPosition === TrickPosition.First) {
    risk += 0.1; // Leading is always riskier
  }

  return Math.min(risk, 1.0);
}

function calculateReward(
  combo: Combo,
  pattern: AdvancedComboPattern,
  context: GameContext,
): number {
  let reward = pattern.situationalValue;

  // Higher rewards for trump combinations
  if (pattern.type === ComboType.Tractor) {
    reward += 0.2;
  }

  // Context bonuses
  if (context.isAttackingTeam) {
    reward += pattern.opponentDisruption * 0.2;
  } else {
    reward += pattern.partnerSupport * 0.2;
  }

  return Math.min(reward, 1.0);
}

function countAlternatives(
  combo: Combo,
  hand: Card[],
  trumpInfo: TrumpInfo,
): number {
  const allCombos = identifyCombos(hand, trumpInfo);
  return allCombos.filter((c) => c.type === combo.type).length;
}

function determineCombinationContext(context: GameContext): CombinationContext {
  if (context.trickPosition === TrickPosition.First) {
    return CombinationContext.Leading;
  }

  if (context.isAttackingTeam) {
    return CombinationContext.Attacking;
  }

  return CombinationContext.Defending;
}

function selectPreferredPatterns(
  combinationContext: CombinationContext,
  context: GameContext,
  handProfile: HandCombinationProfile,
): AdvancedComboPattern[] {
  const patterns: AdvancedComboPattern[] = [];

  switch (combinationContext) {
    case CombinationContext.Leading:
      if (handProfile.tractorPotential === CombinationPotential.Dominant) {
        patterns.push(COMBINATION_PATTERNS.TRUMP_TRACTOR_GAME_ENDING);
      }
      patterns.push(COMBINATION_PATTERNS.TRUMP_PAIR_DOMINANT);
      break;

    case CombinationContext.Attacking:
      patterns.push(COMBINATION_PATTERNS.TRUMP_SINGLE_STRONG);
      patterns.push(COMBINATION_PATTERNS.TRUMP_PAIR_DOMINANT);
      break;

    case CombinationContext.Defending:
      patterns.push(COMBINATION_PATTERNS.REGULAR_PAIR_SAFE);
      patterns.push(COMBINATION_PATTERNS.POINT_SINGLE_SAFE);
      break;
  }

  return patterns;
}

function selectAvoidancePatterns(
  combinationContext: CombinationContext,
  context: GameContext,
): AdvancedComboPattern[] {
  const patterns: AdvancedComboPattern[] = [];

  // Avoid playing game-ending combinations too early
  if (
    context.cardsRemaining > 8 &&
    context.pointPressure !== PointPressure.HIGH
  ) {
    patterns.push(COMBINATION_PATTERNS.TRUMP_TRACTOR_GAME_ENDING);
  }

  return patterns;
}

function calculateAdaptiveThreshold(context: GameContext): number {
  let threshold = 0.5; // Base threshold

  if (context.pointPressure === PointPressure.HIGH) {
    threshold -= 0.2; // More willing to adapt when under pressure
  }

  if (context.playStyle === PlayStyle.Aggressive) {
    threshold -= 0.1;
  }

  return Math.max(threshold, 0.1);
}

function calculateMemoryInfluence(context: GameContext): number {
  if (!context.memoryContext) return 0.3; // Default influence

  // Higher memory influence when we have better information
  const uncertainty = context.memoryContext.uncertaintyLevel;
  return 1.0 - uncertainty; // Less uncertainty = more memory influence
}

function isPatternPreferred(
  pattern: AdvancedComboPattern,
  preferredPatterns: AdvancedComboPattern[],
): boolean {
  return preferredPatterns.some(
    (preferred) =>
      preferred.type === pattern.type &&
      preferred.strengthRange[0] === pattern.strengthRange[0] &&
      preferred.strengthRange[1] === pattern.strengthRange[1],
  );
}

function isPatternAvoided(
  pattern: AdvancedComboPattern,
  avoidancePatterns: AdvancedComboPattern[],
): boolean {
  return avoidancePatterns.some(
    (avoided) =>
      avoided.type === pattern.type &&
      avoided.strengthRange[0] === pattern.strengthRange[0] &&
      avoided.strengthRange[1] === pattern.strengthRange[1],
  );
}

function selectByCriteria(
  candidates: CombinationAnalysis[],
  strategy: CombinationStrategy,
  context: GameContext,
): CombinationAnalysis | null {
  if (candidates.length === 0) return null;

  // Sort by effectiveness score
  candidates.sort((a, b) => b.effectiveness - a.effectiveness);

  // Apply memory influence if available
  if (context.memoryContext && strategy.memoryInfluence > 0.5) {
    // Prefer combinations that exploit known opponent weaknesses
    const memoryEnhanced = candidates.filter((c) => c.timing === "immediate");
    if (memoryEnhanced.length > 0) {
      return memoryEnhanced[0];
    }
  }

  return candidates[0];
}

function getCurrentPlayerId(gameState: GameState): PlayerId {
  return gameState.players[gameState.currentPlayerIndex].id;
}
