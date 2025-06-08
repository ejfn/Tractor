import {
  GameState,
  PlayerId,
  DeclarationType,
  Card,
  Suit,
  Rank,
  getDeclarationStrength,
} from "../../types";
import {
  getPlayerDeclarationOptions,
  getTrumpDeclarationStatus,
} from "../../game/trumpDeclarationManager";
import { getDealingProgress } from "../../game/gameLogic";

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

  // Make declaration decision based on calculated probability
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
      return 0.3; // Conservative for single cards - only with good hand
    case DeclarationType.Pair:
      return 0.7; // Likely for pairs - strong declaration
    case DeclarationType.SmallJokerPair:
      return 0.85; // Very likely for small joker pairs - excellent declaration
    case DeclarationType.BigJokerPair:
      return 0.95; // Almost always declare big joker pairs - strongest possible
    default:
      return 0.1;
  }
}

function getDealingProgressMultiplier(progress: {
  current: number;
  total: number;
}): number {
  const progressRatio = progress.current / progress.total;

  // Early in dealing: very conservative chance (wait to see more cards)
  if (progressRatio < 0.2) {
    return 0.5;
  }
  // Early-mid dealing: moderate chance (good timing to establish trump)
  else if (progressRatio < 0.4) {
    return 1.1;
  }
  // Mid dealing: peak chance (optimal timing)
  else if (progressRatio < 0.7) {
    return 1.3;
  }
  // Late dealing: moderate urgency (last opportunity)
  else if (progressRatio < 0.9) {
    return 1.1;
  }
  // Very late: conservative chance (very limited benefit)
  else {
    return 0.5;
  }
}

function getCurrentDeclarationMultiplier(
  currentDeclaration: any,
  proposedDeclaration: { type: DeclarationType },
): number {
  if (!currentDeclaration.hasDeclaration) {
    return 1.2; // Strong bonus when no one has declared yet - establish early control
  }

  const currentStrength = getDeclarationStrength(currentDeclaration.type);
  const proposedStrength = getDeclarationStrength(proposedDeclaration.type);
  const strengthDiff = proposedStrength - currentStrength;

  if (strengthDiff <= 0) {
    return 0.05; // Almost never declare if not stronger
  } else if (strengthDiff === 1) {
    return 0.6; // Good chance if slightly stronger - competitive override
  } else if (strengthDiff === 2) {
    return 0.9; // Very high chance if significantly stronger
  } else {
    return 1.0; // Always override if much stronger (e.g., big joker vs single)
  }
}

function getHandQualityMultiplier(hand: Card[], trumpRank: Rank): number {
  // Analyze suit distribution and combinations - what actually matters for trump declaration
  const suitCounts = new Map<Suit, number>();
  const suitCards = new Map<Suit, Card[]>();

  hand.forEach((card) => {
    // Skip jokers and trump rank cards - they're always trump regardless of suit
    if (card.joker || card.rank === trumpRank) {
      return;
    }

    // Group cards by suit (excluding trump rank cards)
    if (card.suit) {
      if (!suitCards.has(card.suit)) {
        suitCards.set(card.suit, []);
      }
      suitCards.get(card.suit)!.push(card);
      suitCounts.set(card.suit, (suitCounts.get(card.suit) || 0) + 1);
    }
  });

  // Start with baseline multiplier
  let multiplier = 1.0;

  // Find best suit based on length and combinations
  let bestSuitScore = 0;
  let bestSuitLength = 0;
  let bestCombinations = 0;

  for (const [, cards] of suitCards.entries()) {
    const length = cards.length;

    // Count pairs in this suit (same rank, same suit)
    const rankCounts = new Map<Rank, number>();
    cards.forEach((card) => {
      if (card.rank) {
        rankCounts.set(card.rank, (rankCounts.get(card.rank) || 0) + 1);
      }
    });

    let pairs = 0;
    for (const [, count] of rankCounts.entries()) {
      if (count >= 2) {
        pairs++;
      }
    }

    // Score this suit: length is most important, then pairs
    const score = length * 3 + pairs * 2;

    if (score > bestSuitScore) {
      bestSuitScore = score;
      bestSuitLength = length;
      bestCombinations = pairs;
    }
  }

  // CRITICAL: Suit length evaluation (most important factor)
  // Note: 24 trump suit cards ÷ 4 players = 6 average per player
  if (bestSuitLength <= 2) {
    multiplier *= 0.2; // Very bad - way below average
  } else if (bestSuitLength <= 3) {
    multiplier *= 0.4; // Bad - well below average
  } else if (bestSuitLength <= 4) {
    multiplier *= 0.7; // Poor - below average
  } else if (bestSuitLength <= 5) {
    multiplier *= 0.8; // Below average
  } else if (bestSuitLength === 6) {
    multiplier *= 0.9; // Slightly below average
  } else if (bestSuitLength === 7) {
    multiplier *= 1.0; // Average trump suit length
  } else if (bestSuitLength === 8) {
    multiplier *= 1.2; // Good - above average
  } else if (bestSuitLength >= 9) {
    multiplier *= 1.4; // Excellent - well above average
  }

  // Pair bonus in the trump suit
  if (bestCombinations >= 3) {
    multiplier *= 1.4; // Excellent - multiple pairs
  } else if (bestCombinations >= 2) {
    multiplier *= 1.2; // Very good - two pairs
  } else if (bestCombinations >= 1) {
    multiplier *= 1.1; // Good - one pair
  }
  // No penalty for no pairs - length is more important

  // Penalty if no decent suits at all
  if (bestSuitLength === 0) {
    multiplier *= 0.1; // No suits to declare - very bad
  }

  return Math.min(2.0, Math.max(0.05, multiplier));
}

function getTeamStrategyMultiplier(
  gameState: GameState,
  playerId: PlayerId,
): number {
  const player = gameState.players.find((p) => p.id === playerId);
  if (!player) return 1.0;

  // Team strategy could be enhanced here - for now neutral
  // Could consider: teammate positions in dealing order, team coordination, etc.

  return 1.0;
}

function getDeclarationTypeDisplayName(type: DeclarationType): string {
  switch (type) {
    case DeclarationType.Single:
      return "single";
    case DeclarationType.Pair:
      return "pair";
    case DeclarationType.SmallJokerPair:
      return "small joker pair";
    case DeclarationType.BigJokerPair:
      return "big joker pair";
    default:
      return type;
  }
}

function generateDecisionReasoning(
  shouldDeclare: boolean,
  declarationType: DeclarationType,
  currentDeclarationStatus: {
    hasDeclaration: boolean;
    declarer?: string;
    type?: DeclarationType;
  },
  dealingProgress: { current: number; total: number },
): string {
  const currentTypeDisplay = currentDeclarationStatus.type
    ? getDeclarationTypeDisplayName(currentDeclarationStatus.type)
    : "unknown";
  const newTypeDisplay = getDeclarationTypeDisplayName(declarationType);

  if (!shouldDeclare) {
    if (
      currentDeclarationStatus.hasDeclaration &&
      currentDeclarationStatus.declarer &&
      currentDeclarationStatus.type
    ) {
      return `Holding back - ${currentDeclarationStatus.declarer} already declared ${currentTypeDisplay}`;
    } else {
      return `Waiting for better opportunity - only ${newTypeDisplay} available`;
    }
  } else {
    if (
      currentDeclarationStatus.hasDeclaration &&
      currentDeclarationStatus.declarer &&
      currentDeclarationStatus.type
    ) {
      return `Overriding ${currentDeclarationStatus.declarer}'s ${currentTypeDisplay} with ${newTypeDisplay}`;
    } else {
      const progressPercent = Math.round(
        (dealingProgress.current / dealingProgress.total) * 100,
      );
      return `Declaring ${newTypeDisplay} early (${progressPercent}% dealt) to establish trump`;
    }
  }
}
