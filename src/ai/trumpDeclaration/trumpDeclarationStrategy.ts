import {
  getDealingProgress,
  getPlayerDeclarationOptions,
} from "../../game/dealingAndDeclaration";
import { Card, GameState, PlayerId, Rank, Suit } from "../../types";
import {
  DeclarationType,
  TrumpDeclaration,
  getDeclarationStrength,
} from "../../types/trumpDeclaration";

export interface AIDeclarationDecision {
  shouldDeclare: boolean;
  declaration?: {
    type: DeclarationType;
    cards: Card[];
    suit: Suit;
  };
  reasoning: string;
}

/**
 * AI trump declaration strategy during dealing phase
 */
export function getAITrumpDeclarationDecision(
  gameState: GameState,
  playerId: PlayerId,
): AIDeclarationDecision {
  const declarationOptions = getPlayerDeclarationOptions(gameState, playerId);

  if (declarationOptions.length === 0) {
    return {
      shouldDeclare: false,
      reasoning: "No valid declaration options available",
    };
  }

  const currentDeclaration =
    gameState.trumpDeclarationState?.currentDeclaration;
  const dealingProgress = getDealingProgress(gameState);
  const player = gameState.players.find((p) => p.id === playerId);

  if (!player) {
    return {
      shouldDeclare: false,
      reasoning: "Player not found",
    };
  }

  // NEW APPROACH: Evaluate suits first, then pick best declaration for chosen suit
  const bestSuitEvaluation = evaluateAllPossibleTrumpSuits(
    declarationOptions,
    dealingProgress,
    currentDeclaration,
    player.hand,
    gameState.trumpInfo.trumpRank,
  );

  // If no suit is worth declaring, don't declare
  if (!bestSuitEvaluation) {
    return {
      shouldDeclare: false,
      reasoning: "No suit meets declaration thresholds",
    };
  }

  const shouldDeclare = true; // Already passed threshold evaluation

  return {
    shouldDeclare,
    declaration: shouldDeclare ? bestSuitEvaluation.declaration : undefined,
    reasoning: bestSuitEvaluation.reasoning,
  };
}

// Helper functions

interface SuitEvaluation {
  declaration: { type: DeclarationType; cards: Card[]; suit: Suit };
  reasoning: string;
  suitStrength: number;
}

/**
 * Evaluate all possible trump suits and return the best one that meets thresholds
 */
function evaluateAllPossibleTrumpSuits(
  declarationOptions: { type: DeclarationType; cards: Card[]; suit: Suit }[],
  dealingProgress: { current: number; total: number },
  currentDeclaration: TrumpDeclaration | undefined,
  hand: Card[],
  trumpRank: Rank,
): SuitEvaluation | null {
  const progressRatio = dealingProgress.current / dealingProgress.total;

  // Group declaration options by suit
  const suitGroups = new Map<Suit, typeof declarationOptions>();
  for (const option of declarationOptions) {
    const existing = suitGroups.get(option.suit) || [];
    existing.push(option);
    suitGroups.set(option.suit, existing);
  }

  // Get current declaration suit strength if it exists
  let currentSuitStrength = 0;
  if (currentDeclaration) {
    currentSuitStrength = calculateSuitStrength(
      hand,
      currentDeclaration.suit,
      trumpRank,
    ).strength;
  }

  let bestSuit: SuitEvaluation | null = null;

  for (const [suit, options] of suitGroups) {
    const suitResult = calculateSuitStrength(hand, suit, trumpRank);

    // Skip if suit doesn't meet basic requirements
    if (
      !suitMeetsThresholds(
        suitResult.length,
        progressRatio,
        suitResult.strength,
      )
    ) {
      continue;
    }

    // Find best declaration type for this suit
    const bestDeclaration = options.sort(
      (a, b) => getDeclarationStrength(b.type) - getDeclarationStrength(a.type),
    )[0];

    // Skip if current declaration exists and we can't/shouldn't override
    if (currentDeclaration) {
      // Can't override by declaration strength
      if (!canOverrideByStrength(currentDeclaration, bestDeclaration)) {
        continue;
      }

      // Don't redeclare same suit
      if (suit === currentDeclaration.suit) {
        continue;
      }

      // Don't override unless significantly better
      if (currentSuitStrength > 0) {
        const OVERRIDE_THRESHOLD = 16;
        if (suitResult.strength <= currentSuitStrength + OVERRIDE_THRESHOLD) {
          continue;
        }
      }
    }

    // This suit is valid - check if it's the best so far
    const evaluation: SuitEvaluation = {
      declaration: bestDeclaration,
      reasoning: `Declaring ${suit} with ${suitResult.length} cards (${Math.round(progressRatio * 100)}% dealt)`,
      suitStrength: suitResult.strength,
    };

    if (!bestSuit || suitResult.strength > bestSuit.suitStrength) {
      bestSuit = evaluation;
    }
  }

  return bestSuit;
}

/**
 * Check if a suit meets basic threshold requirements with randomness
 */
function suitMeetsThresholds(
  suitLength: number,
  progressRatio: number,
  suitStrength?: number,
): boolean {
  // 1. Minimum threshold - never declare with tiny suits regardless of progress
  if (suitLength < 3) {
    return false;
  }

  // Comprehensive probability calculation combining suit length + dealing phase + randomness

  // 2. Suit Length Factor (0.0 to 1.0+)
  // Longer suits are exponentially more likely to declare
  const suitLengthFactor = Math.min(1.0, Math.pow(suitLength / 6, 1.5));

  // 3. Progress Factor (0.2 to 1.0)
  // Later in dealing = more aggressive declarations
  const progressFactor = 0.2 + progressRatio * 0.8;

  // 4. Suit Quality Factor (1.0 to 1.5)
  // High pairs and good cards boost probability
  const qualityFactor = suitStrength
    ? 1.0 + Math.min(0.5, (suitStrength - suitLength * 10) / 40)
    : 1.0;

  // 5. Base Probability (combining all factors)
  const baseProbability = suitLengthFactor * progressFactor * qualityFactor;

  // 6. Randomness Modifier (-0.2 to +0.2)
  // Adds unpredictability while maintaining trends
  const randomModifier = (Math.random() - 0.5) * 0.4;

  // 7. Final Probability (clamped between 0 and 1)
  const finalProbability = Math.max(
    0,
    Math.min(1, baseProbability + randomModifier),
  );

  // 8. Decision based on final probability
  return Math.random() < finalProbability;
}

/**
 * Calculate overall strength of a suit (length + pairs only)
 * Returns both the strength score and the suit length
 */
function calculateSuitStrength(
  hand: Card[],
  suit: Suit,
  trumpRank: Rank,
): { strength: number; length: number } {
  const suitCards = hand.filter(
    (card) => card.suit === suit && !card.joker && card.rank !== trumpRank,
  );

  const length = suitCards.length;
  if (length === 0) return { strength: 0, length: 0 };

  // Base strength from length (primary factor)
  const strength = length * 10;

  // Count pairs for strategic value
  const rankCounts = new Map<Rank, number>();
  suitCards.forEach((card) => {
    if (card.rank) {
      rankCounts.set(card.rank, (rankCounts.get(card.rank) || 0) + 1);
    }
  });

  // Pair bonuses (strategic value for combinations)
  let pairBonus = 0;
  for (const count of rankCounts.values()) {
    if (count >= 2) {
      pairBonus += 8; // Each pair adds strategic value
    }
  }

  return { strength: strength + pairBonus, length };
}

/**
 * Check if proposed declaration can override current one by strength
 */
function canOverrideByStrength(
  current: TrumpDeclaration,
  proposed: { type: DeclarationType },
): boolean {
  const currentStrength = getDeclarationStrength(current.type);
  const proposedStrength = getDeclarationStrength(proposed.type);
  return proposedStrength > currentStrength;
}
