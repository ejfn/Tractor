import {
  GameState,
  PlayerId,
  DeclarationType,
  Card,
  Suit,
  Rank,
  getDeclarationStrength,
  canOverrideDeclaration,
} from "../types";
import {
  getPlayerDeclarationOptions,
  getTrumpDeclarationStatus,
} from "../game/trumpDeclarationManager";
import { getDealingProgress } from "../game/gameLogic";

export interface AIDeclarationDecision {
  shouldDeclare: boolean;
  declaration?: {
    type: DeclarationType;
    cards: Card[];
    suit: Suit;
  };
  confidence: number; // 0-1, how confident the AI is about this decision
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
      confidence: 1.0,
      reasoning: "No valid declaration options available",
    };
  }

  const currentDeclaration = getTrumpDeclarationStatus(gameState);
  const dealingProgress = getDealingProgress(gameState);
  const player = gameState.players.find((p) => p.id === playerId);

  if (!player) {
    return {
      shouldDeclare: false,
      confidence: 1.0,
      reasoning: "Player not found",
    };
  }

  // Evaluate the strongest available declaration
  const strongestDeclaration = declarationOptions[0]; // Options are sorted by strength

  // Calculate base probability based on declaration strength
  let declarationProbability = getBaseDeclarationProbability(
    strongestDeclaration.type,
  );

  // Adjust based on dealing progress
  declarationProbability *= getDealingProgressMultiplier(dealingProgress);

  // Adjust based on current declaration status
  declarationProbability *= getCurrentDeclarationMultiplier(
    currentDeclaration,
    strongestDeclaration,
  );

  // Adjust based on hand quality
  declarationProbability *= getHandQualityMultiplier(
    player.hand,
    gameState.trumpInfo.trumpRank,
  );

  // Adjust based on team strategy
  declarationProbability *= getTeamStrategyMultiplier(gameState, playerId);

  // Add some randomness to make AI less predictable
  const randomFactor = 0.8 + Math.random() * 0.4; // 0.8 to 1.2
  declarationProbability *= randomFactor;

  // Cap probability at reasonable limits
  declarationProbability = Math.min(
    0.9,
    Math.max(0.05, declarationProbability),
  );

  const shouldDeclare = Math.random() < declarationProbability;

  return {
    shouldDeclare,
    declaration: shouldDeclare ? strongestDeclaration : undefined,
    confidence: declarationProbability,
    reasoning: generateDecisionReasoning(
      shouldDeclare,
      strongestDeclaration.type,
      currentDeclaration,
      dealingProgress,
    ),
  };
}

/**
 * AI logic for evaluating whether to override existing declarations
 */
export function shouldAIOverrideDeclaration(
  gameState: GameState,
  playerId: PlayerId,
  proposedDeclaration: { type: DeclarationType; suit: Suit },
): boolean {
  const currentDeclaration = getTrumpDeclarationStatus(gameState);

  if (!currentDeclaration.hasDeclaration) {
    return true; // No current declaration, safe to declare
  }

  // Don't override our own declarations unless significantly stronger
  if (currentDeclaration.declarer === playerId) {
    const currentStrength = getDeclarationStrength(currentDeclaration.type!);
    const proposedStrength = getDeclarationStrength(proposedDeclaration.type);
    return proposedStrength > currentStrength + 1; // Need significant improvement
  }

  // Override opponent declarations more aggressively
  const currentStrength = getDeclarationStrength(currentDeclaration.type!);
  const proposedStrength = getDeclarationStrength(proposedDeclaration.type);

  // Only override if we have a stronger declaration
  if (proposedStrength <= currentStrength) {
    return false;
  }

  // Calculate override probability based on strength difference
  const strengthDiff = proposedStrength - currentStrength;
  const overrideProbability = Math.min(0.8, strengthDiff * 0.4);

  return Math.random() < overrideProbability;
}

// Helper functions

function getBaseDeclarationProbability(type: DeclarationType): number {
  switch (type) {
    case DeclarationType.Single:
      return 0.3; // Conservative for single cards
    case DeclarationType.Pair:
      return 0.6; // More likely for pairs
    case DeclarationType.JokerPair:
      return 0.9; // Almost always declare joker pairs
    default:
      return 0.1;
  }
}

function getDealingProgressMultiplier(progress: {
  current: number;
  total: number;
}): number {
  const progressRatio = progress.current / progress.total;

  // Early in dealing: higher chance to declare (establish trump early)
  if (progressRatio < 0.3) {
    return 1.3;
  }
  // Mid dealing: normal chance
  else if (progressRatio < 0.7) {
    return 1.0;
  }
  // Late in dealing: lower chance (less time to benefit)
  else {
    return 0.7;
  }
}

function getCurrentDeclarationMultiplier(
  currentDeclaration: any,
  proposedDeclaration: { type: DeclarationType },
): number {
  if (!currentDeclaration.hasDeclaration) {
    return 1.2; // Higher chance when no one has declared yet
  }

  const currentStrength = getDeclarationStrength(currentDeclaration.type);
  const proposedStrength = getDeclarationStrength(proposedDeclaration.type);
  const strengthDiff = proposedStrength - currentStrength;

  if (strengthDiff <= 0) {
    return 0.1; // Very low chance if not stronger
  } else if (strengthDiff === 1) {
    return 0.5; // Moderate chance if slightly stronger
  } else {
    return 0.8; // High chance if much stronger
  }
}

function getHandQualityMultiplier(hand: Card[], trumpRank: Rank): number {
  let trumpCards = 0;
  let pointCards = 0;
  let totalPoints = 0;

  hand.forEach((card) => {
    if (card.rank === trumpRank || card.joker) {
      trumpCards++;
    }
    if (card.points > 0) {
      pointCards++;
      totalPoints += card.points;
    }
  });

  // Good trump holding encourages declaration
  const trumpRatio = trumpCards / hand.length;
  let multiplier = 1.0 + trumpRatio * 0.5;

  // Many point cards might discourage early declaration (want to see more cards)
  if (pointCards > 3) {
    multiplier *= 0.9;
  }

  return Math.min(1.5, Math.max(0.7, multiplier));
}

function getTeamStrategyMultiplier(
  gameState: GameState,
  playerId: PlayerId,
): number {
  const player = gameState.players.find((p) => p.id === playerId);
  if (!player) return 1.0;

  // Find team members
  const teammates = gameState.players.filter(
    (p) => p.team === player.team && p.id !== playerId,
  );
  const opponents = gameState.players.filter((p) => p.team !== player.team);

  // If teammates are close to us in dealing order, might want to wait
  // This is a simplified team strategy - could be more sophisticated

  // For now, return neutral multiplier
  return 1.0;
}

function generateDecisionReasoning(
  shouldDeclare: boolean,
  declarationType: DeclarationType,
  currentDeclaration: any,
  dealingProgress: { current: number; total: number },
): string {
  if (!shouldDeclare) {
    if (currentDeclaration.hasDeclaration) {
      return `Holding back - ${currentDeclaration.declarer} already declared ${currentDeclaration.type}`;
    } else {
      return `Waiting for better opportunity - only ${declarationType} available`;
    }
  } else {
    if (currentDeclaration.hasDeclaration) {
      return `Overriding ${currentDeclaration.declarer}'s ${currentDeclaration.type} with ${declarationType}`;
    } else {
      const progressPercent = Math.round(
        (dealingProgress.current / dealingProgress.total) * 100,
      );
      return `Declaring ${declarationType} early (${progressPercent}% dealt) to establish trump`;
    }
  }
}
