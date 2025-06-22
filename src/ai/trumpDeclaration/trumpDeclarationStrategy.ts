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
    if (!suitMeetsThresholds(suitResult.length, progressRatio)) {
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
 * Check if a suit meets basic threshold requirements
 */
function suitMeetsThresholds(
  suitLength: number,
  progressRatio: number,
): boolean {
  // Progressive suit length requirements based on timing
  if (progressRatio < 0.3) {
    return suitLength >= 6; // Early (0-30%): need exceptional suit
  } else if (progressRatio < 0.7) {
    return suitLength >= 8; // Mid (30-70%): need good suit
  } else {
    return suitLength >= 7; // Late (70-100%): acceptable suit
  }
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
