import { isTrump } from "../game/cardValue";
import {
  AdaptiveBehaviorDetection,
  AdaptiveStrategyRecommendation,
  BehaviorPhaseProfile,
  Card,
  CardMemory,
  DeckId,
  EnhancedMemoryContext,
  GameContext,
  GameState,
  JokerType,
  LeadingBehaviorProfile,
  MemoryBasedStrategy,
  MemoryContext,
  OpponentLeadingPattern,
  PlayerContext,
  PlayerId,
  PlayerMemory,
  PlayPatterns,
  PredictiveOpponentModel,
  Rank,
  RoundProgressionPattern,
  Suit,
  TeamCoordinationPattern,
  Trick,
  TrickHistoryAnalysis,
  TrickSequencePattern,
  TrumpInfo,
} from "../types";

/**
 * Phase 3: Card Memory & Counting System
 *
 * This module implements sophisticated card tracking and probability-based
 * decision making for AI strategic intelligence.
 */

/**
 * Creates and maintains comprehensive card memory for strategic AI decisions
 */
export function createCardMemory(gameState: GameState): CardMemory {
  const { tricks, players, trumpInfo } = gameState;

  // Initialize memory structure
  const memory: CardMemory = {
    playedCards: [],
    trumpCardsPlayed: 0,
    pointCardsPlayed: 0,
    leadTrumpPairsPlayed: 0,
    suitDistribution: {},
    playerMemories: {},
    cardProbabilities: [],
    roundStartCards: Math.floor((52 * 2) / players.length), // Standard deck distribution
    tricksAnalyzed: 0,
  };

  // Initialize player memories
  players.forEach((player) => {
    memory.playerMemories[player.id] = {
      playerId: player.id,
      knownCards: [],
      estimatedHandSize: player.hand.length,
      suitVoids: new Set(),
      trumpVoid: false, // Start assuming player has trump cards
      trumpUsed: 0,
      pointCardsProbability: 0.5, // Start with neutral assumption
      playPatterns: [],
    };
  });

  // Analyze all completed tricks
  tricks.forEach((trick) => {
    analyzeCompletedTrick(trick, memory, trumpInfo);
  });

  // Analyze current trick if in progress
  if (gameState.currentTrick) {
    analyzeCurrentTrick(gameState.currentTrick, memory, trumpInfo);
  }

  // Calculate card probabilities for remaining cards
  calculateCardProbabilities(memory, gameState);

  return memory;
}

/**
 * Analyzes a completed trick to extract card information and patterns
 */
function analyzeCompletedTrick(
  trick: Trick,
  memory: CardMemory,
  trumpInfo: TrumpInfo,
): void {
  // Extract lead card from the first card played
  const leadCard = trick.plays[0]?.cards[0] || null;
  // Only set leadSuit if the lead is NOT trump (pass null for trump leads)
  const leadSuit =
    leadCard && !isTrump(leadCard, trumpInfo) ? leadCard.suit : null;

  // Track all plays including leader at plays[0]
  trick.plays.forEach(
    (play: { playerId: PlayerId; cards: Card[] }, index: number) => {
      const position = index === 0 ? "leading" : "following";
      play.cards.forEach((card: Card) => {
        processPlayedCard(
          card,
          play.playerId,
          memory,
          trumpInfo,
          position,
          leadSuit,
        );
      });
    },
  );

  // Count trump pairs in leading play (first play only)
  if (trick.plays.length > 0) {
    const leadCards = trick.plays[0].cards;
    const allTrump = leadCards.every((card) => isTrump(card, trumpInfo));

    if (allTrump) {
      // Count identical trump cards and calculate pairs
      const cardCounts: { [key: string]: number } = {};
      leadCards.forEach((card) => {
        cardCounts[card.commonId] = (cardCounts[card.commonId] || 0) + 1;
      });

      // Add pairs to memory (each group of identical cards contributes pairs)
      Object.values(cardCounts).forEach((count) => {
        if (count >= 2) {
          memory.leadTrumpPairsPlayed += 1;
        }
      });
    }
  }

  memory.tricksAnalyzed++;
}

/**
 * Analyzes the current trick in progress
 */
function analyzeCurrentTrick(
  trick: Trick,
  memory: CardMemory,
  trumpInfo: TrumpInfo,
): void {
  // Extract lead card from the first card played
  const leadCard = trick.plays[0]?.cards[0] || null;
  // Only set leadSuit if the lead is NOT trump (pass null for trump leads)
  const leadSuit =
    leadCard && !isTrump(leadCard, trumpInfo) ? leadCard.suit : null;

  // Track all plays made so far including leader at plays[0]
  trick.plays.forEach(
    (play: { playerId: PlayerId; cards: Card[] }, index: number) => {
      const position = index === 0 ? "leading" : "following";
      play.cards.forEach((card: Card) => {
        processPlayedCard(
          card,
          play.playerId,
          memory,
          trumpInfo,
          position,
          leadSuit,
        );
      });
    },
  );
}

/**
 * Processes a single played card to update memory and patterns
 */
function processPlayedCard(
  card: Card,
  playerId: PlayerId,
  memory: CardMemory,
  trumpInfo: TrumpInfo,
  position: "leading" | "following",
  leadSuit: Suit | null, // null when trump is led (no suit void tracking for trump leads)
): void {
  // Add to global played cards
  memory.playedCards.push(card);

  // Update suit distribution
  const suitKey = card.suit || "joker";
  memory.suitDistribution[suitKey] =
    (memory.suitDistribution[suitKey] || 0) + 1;

  // Update trump/point counters
  if (isTrump(card, trumpInfo)) {
    memory.trumpCardsPlayed++;
  }
  if (card.points > 0) {
    memory.pointCardsPlayed++;
  }

  // Update player-specific memory
  const playerMemory = memory.playerMemories[playerId];
  if (playerMemory) {
    playerMemory.knownCards.push(card);
    playerMemory.estimatedHandSize = Math.max(
      0,
      playerMemory.estimatedHandSize - 1,
    );

    // Update trump count estimate
    if (isTrump(card, trumpInfo)) {
      playerMemory.trumpUsed++;
    }

    // CRITICAL: Detect suit voids when player cannot follow non-trump suit
    // leadSuit is null for trump leads, so this only tracks voids for non-trump suits
    if (
      position === "following" &&
      leadSuit &&
      (card.suit !== leadSuit || isTrump(card, trumpInfo))
    ) {
      if (!playerMemory.suitVoids.has(leadSuit)) {
        playerMemory.suitVoids.add(leadSuit);
        // Note: Player is now known to be void in the led non-trump suit
      }
    }

    // CRITICAL: Detect trump voids when trump is led but player cannot follow with trump
    // This handles the separate case where trump is led (leadSuit is null)
    if (
      position === "following" &&
      leadSuit === null && // Trump was led
      !isTrump(card, trumpInfo) && // Player played non-trump
      !playerMemory.trumpVoid // Not already marked as trump void
    ) {
      playerMemory.trumpVoid = true;
      // Note: Player is now known to be void in trump cards
    }

    // Update point card probability based on what they've played
    updatePointCardProbability(playerMemory, card);

    // Record play pattern
    recordPlayPattern(playerMemory, card, trumpInfo, position);
  }
}

/**
 * Updates a player's point card probability based on their play
 */
function updatePointCardProbability(
  playerMemory: PlayerMemory,
  _card: Card,
): void {
  const totalCards = playerMemory.knownCards.length;
  const pointCards = playerMemory.knownCards.filter((c) => c.points > 0).length;

  // Bayesian update based on observed play
  if (totalCards > 0) {
    const observedRate = pointCards / totalCards;
    // Weighted average with prior (0.5) and observed evidence
    const weight = Math.min(totalCards / 10, 0.8); // More weight as we see more cards
    playerMemory.pointCardsProbability =
      (1 - weight) * 0.5 + weight * observedRate;
  }
}

/**
 * Phase 3: Trump Exhaustion Tracking System
 *
 * Calculates trump depletion levels for strategic trump deployment and conservation.
 * Provides sophisticated analysis of remaining trump distribution for optimal timing.
 */

/**
 * Calculates trump exhaustion level for a specific player
 * Returns 0.0 (no trump played) to 1.0 (completely exhausted/void)
 */
export function getTrumpExhaustionLevel(
  cardMemory: CardMemory,
  playerId: PlayerId,
  trumpInfo: TrumpInfo,
): number {
  const playerMemory = cardMemory.playerMemories[playerId];
  if (!playerMemory) return 0.0;

  // If player is confirmed trump void, they are 100% exhausted
  if (playerMemory.trumpVoid) return 1.0;

  // Calculate exhaustion based on trump cards played vs estimated trump holdings
  const trumpCardsPlayed = playerMemory.knownCards.filter((card) =>
    isTrump(card, trumpInfo),
  ).length;

  // Estimate initial trump cards (approximately 25-30% of total deck)
  // Total trump cards in deck: 2 jokers + 8 trump rank cards + 13 trump suit cards = 23 trump cards
  const estimatedInitialTrumpCards = Math.ceil(23 / 4); // ~6 trump cards per player on average

  // Calculate exhaustion ratio with minimum bounds
  const exhaustionRatio = Math.min(
    trumpCardsPlayed / Math.max(estimatedInitialTrumpCards, 1),
    1.0,
  );

  return exhaustionRatio;
}

/**
 * Analyzes trump distribution across all players for strategic insight
 */
export function analyzeTrumpDistribution(
  cardMemory: CardMemory,
  trumpInfo: TrumpInfo,
): {
  globalTrumpExhaustion: number;
  playerExhaustion: Record<PlayerId, number>;
  mostTrumpDepleted: PlayerId | null;
  leastTrumpDepleted: PlayerId | null;
  voidPlayers: PlayerId[];
} {
  const playerExhaustion: Record<PlayerId, number> = {} as Record<
    PlayerId,
    number
  >;
  const voidPlayers: PlayerId[] = [];
  let totalExhaustion = 0;
  let playerCount = 0;

  let mostDepleted: PlayerId | null = null;
  let leastDepleted: PlayerId | null = null;
  let highestExhaustion = -1;
  let lowestExhaustion = 2;

  // Analyze each player's trump exhaustion
  Object.keys(cardMemory.playerMemories).forEach((playerId) => {
    const id = playerId as PlayerId;
    const exhaustion = getTrumpExhaustionLevel(cardMemory, id, trumpInfo);

    playerExhaustion[id] = exhaustion;
    totalExhaustion += exhaustion;
    playerCount++;

    // Track void players
    if (cardMemory.playerMemories[id].trumpVoid) {
      voidPlayers.push(id);
    }

    // Track most and least depleted
    if (exhaustion > highestExhaustion) {
      highestExhaustion = exhaustion;
      mostDepleted = id;
    }
    if (exhaustion < lowestExhaustion) {
      lowestExhaustion = exhaustion;
      leastDepleted = id;
    }
  });

  const globalTrumpExhaustion =
    playerCount > 0 ? totalExhaustion / playerCount : 0;

  return {
    globalTrumpExhaustion,
    playerExhaustion,
    mostTrumpDepleted: mostDepleted,
    leastTrumpDepleted: leastDepleted,
    voidPlayers,
  };
}

/**
 * Determines optimal trump deployment timing based on exhaustion analysis
 */
export function calculateTrumpDeploymentTiming(
  cardMemory: CardMemory,
  currentPlayer: PlayerId,
  trumpInfo: TrumpInfo,
): {
  shouldConserveTrump: boolean;
  recommendedDeployment: "never" | "critical" | "strategic" | "aggressive";
  trumpAdvantage: number; // 0.0 to 1.0, higher means more advantage
  reasoning: string;
} {
  const trumpAnalysis = analyzeTrumpDistribution(cardMemory, trumpInfo);
  const currentPlayerExhaustion = trumpAnalysis.playerExhaustion[currentPlayer];

  // Calculate trump advantage: how much trump we have relative to opponents
  const opponentExhaustions = Object.entries(trumpAnalysis.playerExhaustion)
    .filter(([playerId]) => playerId !== currentPlayer)
    .map(([, exhaustion]) => exhaustion);

  const averageOpponentExhaustion =
    opponentExhaustions.length > 0
      ? opponentExhaustions.reduce((sum, e) => sum + e, 0) /
        opponentExhaustions.length
      : 0;

  // Trump advantage: positive when we have more trump than opponents
  const trumpAdvantage = Math.max(
    0,
    averageOpponentExhaustion - currentPlayerExhaustion,
  );

  // Determine deployment strategy
  let shouldConserveTrump = false;
  let recommendedDeployment: "never" | "critical" | "strategic" | "aggressive" =
    "strategic";
  let reasoning = "";

  if (currentPlayerExhaustion >= 0.8) {
    // We're nearly exhausted - use remaining trump strategically
    shouldConserveTrump = true;
    recommendedDeployment = "critical";
    reasoning = "Nearly trump exhausted - save for critical moments";
  } else if (trumpAdvantage >= 0.4) {
    // We have significant trump advantage - can be aggressive
    shouldConserveTrump = false;
    recommendedDeployment = "aggressive";
    reasoning = "Strong trump advantage - deploy aggressively";
  } else if (trumpAdvantage >= 0.2) {
    // Moderate trump advantage - strategic deployment
    shouldConserveTrump = false;
    recommendedDeployment = "strategic";
    reasoning = "Moderate trump advantage - strategic deployment";
  } else if (trumpAdvantage <= -0.2) {
    // Trump disadvantage - conserve heavily
    shouldConserveTrump = true;
    recommendedDeployment = "critical";
    reasoning = "Trump disadvantage - heavy conservation required";
  } else {
    // Balanced trump situation - standard strategic play
    shouldConserveTrump = false;
    recommendedDeployment = "strategic";
    reasoning = "Balanced trump situation - standard strategy";
  }

  return {
    shouldConserveTrump,
    recommendedDeployment,
    trumpAdvantage,
    reasoning,
  };
}

/**
 * Phase 3: Position-Specific Memory Query Functions
 *
 * Provides memory analysis tailored to specific trick positions, leveraging
 * unique advantages and information available to each position.
 */

/**
 * 2nd Player Memory Analysis - Partial Information with Memory Enhancement
 *
 * Leverages leading card analysis combined with memory to make informed decisions
 * with partial information (1 card seen, 2 remaining players).
 */
export function analyze2ndPlayerMemoryContext(
  cardMemory: CardMemory,
  leadingCards: Card[],
  trumpInfo: TrumpInfo,
  currentPlayer: PlayerId,
): {
  opponentVoidProbabilities: Record<PlayerId, number>;
  trumpExhaustionAdvantage: number;
  recommendedInfluenceLevel: "low" | "moderate" | "high";
  optimalResponseStrategy: "support" | "pressure" | "block" | "setup";
  leadingSuitPointPotential: number;
  nextOpponentsVoidProbability: number;
  recommendedTrumpStrategy: "conserve" | "compete" | "pressure";
  reasoning: string;
} {
  // Analyze opponents (3rd and 4th players)
  const allPlayers = Object.keys(cardMemory.playerMemories) as PlayerId[];
  const opponents = allPlayers.filter((id) => id !== currentPlayer);

  // Calculate void probabilities for remaining players
  const opponentVoidProbabilities: Record<PlayerId, number> = {} as Record<
    PlayerId,
    number
  >;
  let totalVoidProbability = 0;

  opponents.forEach((playerId) => {
    const playerMemory = cardMemory.playerMemories[playerId];
    if (playerMemory) {
      // Check if opponent is known to be void in leading suit
      const leadSuit = leadingCards[0]?.suit;
      if (leadSuit && !isTrump(leadingCards[0], trumpInfo)) {
        opponentVoidProbabilities[playerId] = playerMemory.suitVoids.has(
          leadSuit,
        )
          ? 1.0
          : 0.0;
      } else {
        // Trump lead - check trump void status
        opponentVoidProbabilities[playerId] = playerMemory.trumpVoid
          ? 1.0
          : 0.0;
      }
      totalVoidProbability += opponentVoidProbabilities[playerId];
    }
  });

  // Calculate trump exhaustion advantage
  const trumpAnalysis = analyzeTrumpDistribution(cardMemory, trumpInfo);
  const currentPlayerExhaustion = trumpAnalysis.playerExhaustion[currentPlayer];
  const averageOpponentExhaustion =
    opponents.reduce((sum, id) => sum + trumpAnalysis.playerExhaustion[id], 0) /
    opponents.length;

  const trumpExhaustionAdvantage =
    averageOpponentExhaustion - currentPlayerExhaustion;

  // Determine recommended influence level
  let recommendedInfluenceLevel: "low" | "moderate" | "high" = "moderate";
  let optimalResponseStrategy: "support" | "pressure" | "block" | "setup" =
    "setup";
  let reasoning = "";

  if (totalVoidProbability >= 1.0) {
    // At least one opponent is void - high influence opportunity
    recommendedInfluenceLevel = "high";
    optimalResponseStrategy =
      trumpExhaustionAdvantage > 0.2 ? "pressure" : "block";
    reasoning = "Opponent void detected - high influence potential";
  } else if (trumpExhaustionAdvantage > 0.3) {
    // Strong trump advantage - moderate influence
    recommendedInfluenceLevel = "moderate";
    optimalResponseStrategy = "pressure";
    reasoning = "Strong trump advantage - apply pressure";
  } else if (trumpExhaustionAdvantage < -0.2) {
    // Trump disadvantage - low influence, setup for teammate
    recommendedInfluenceLevel = "low";
    optimalResponseStrategy = "setup";
    reasoning = "Trump disadvantage - setup for teammate";
  } else {
    // Balanced situation - strategic positioning
    recommendedInfluenceLevel = "moderate";
    optimalResponseStrategy = "setup";
    reasoning = "Balanced situation - strategic positioning";
  }

  return {
    opponentVoidProbabilities,
    trumpExhaustionAdvantage,
    recommendedInfluenceLevel,
    optimalResponseStrategy,
    leadingSuitPointPotential: 0,
    nextOpponentsVoidProbability: 0,
    recommendedTrumpStrategy: "conserve" as const,
    reasoning,
  };
}

/**
 * 3rd Player Memory Analysis - Tactical Position with Enhanced Risk Assessment
 *
 * Combines tactical position advantages with memory data for optimal risk/reward decisions.
 */
export function analyze3rdPlayerMemoryContext(
  cardMemory: CardMemory,
  leadingCards: Card[],
  secondPlayerCards: Card[],
  trumpInfo: TrumpInfo,
  currentPlayer: PlayerId,
): {
  finalPlayerPrediction: {
    playerId: PlayerId;
    likelyVoid: boolean;
    trumpAdvantage: number;
    predictedResponse: "weak" | "moderate" | "strong";
  };
  optimalTakeoverOpportunity: boolean;
  riskAssessment: number; // 0.0 to 1.0
  recommendedAction: "support" | "takeover" | "conservative" | "strategic";
  reasoning: string;
} {
  const allPlayers = Object.keys(cardMemory.playerMemories) as PlayerId[];
  const finalPlayer = allPlayers.find(
    (id) =>
      id !== currentPlayer &&
      !leadingCards.some((card) =>
        cardMemory.playerMemories[id]?.knownCards.includes(card),
      ) &&
      !secondPlayerCards.some((card) =>
        cardMemory.playerMemories[id]?.knownCards.includes(card),
      ),
  );

  if (!finalPlayer) {
    // Fallback if can't identify final player
    return {
      finalPlayerPrediction: {
        playerId: allPlayers[0] || ("bot1" as PlayerId),
        likelyVoid: false,
        trumpAdvantage: 0,
        predictedResponse: "moderate",
      },
      optimalTakeoverOpportunity: false,
      riskAssessment: 0.5,
      recommendedAction: "conservative",
      reasoning: "Cannot identify final player - conservative approach",
    };
  }

  const finalPlayerMemory = cardMemory.playerMemories[finalPlayer];
  const trumpAnalysis = analyzeTrumpDistribution(cardMemory, trumpInfo);

  // Analyze final player's likely void status
  const leadSuit = leadingCards[0]?.suit;
  let likelyVoid = false;
  if (leadSuit && !isTrump(leadingCards[0], trumpInfo)) {
    likelyVoid = finalPlayerMemory?.suitVoids.has(leadSuit) ?? false;
  } else {
    // Trump lead
    likelyVoid = finalPlayerMemory?.trumpVoid ?? false;
  }

  // Calculate trump advantage relative to final player
  const currentPlayerExhaustion = trumpAnalysis.playerExhaustion[currentPlayer];
  const finalPlayerExhaustion = trumpAnalysis.playerExhaustion[finalPlayer];
  const trumpAdvantage = finalPlayerExhaustion - currentPlayerExhaustion;

  // Predict final player's response strength
  let predictedResponse: "weak" | "moderate" | "strong" = "moderate";
  if (likelyVoid) {
    predictedResponse = "weak";
  } else if (trumpAdvantage > 0.3) {
    predictedResponse = "weak";
  } else if (trumpAdvantage < -0.3) {
    predictedResponse = "strong";
  }

  // Assess takeover opportunity
  const optimalTakeoverOpportunity = trumpAdvantage > 0.2 || likelyVoid;

  // Calculate risk assessment
  let riskAssessment = 0.5; // Base risk
  if (likelyVoid) riskAssessment -= 0.3; // Lower risk if opponent void
  if (trumpAdvantage > 0.2) riskAssessment -= 0.2; // Lower risk with trump advantage
  if (trumpAdvantage < -0.2) riskAssessment += 0.2; // Higher risk with trump disadvantage
  if (predictedResponse === "strong") riskAssessment += 0.2; // Higher risk if opponent strong

  riskAssessment = Math.max(0, Math.min(1, riskAssessment)); // Clamp to [0,1]

  // Determine recommended action
  let recommendedAction: "support" | "takeover" | "conservative" | "strategic" =
    "strategic";
  let reasoning = "";

  if (optimalTakeoverOpportunity && riskAssessment < 0.4) {
    recommendedAction = "takeover";
    reasoning = "Low risk takeover opportunity detected";
  } else if (riskAssessment > 0.7) {
    recommendedAction = "conservative";
    reasoning = "High risk situation - play conservatively";
  } else if (predictedResponse === "weak") {
    recommendedAction = "support";
    reasoning = "Final player likely weak - support current winner";
  } else {
    recommendedAction = "strategic";
    reasoning = "Balanced situation - strategic positioning";
  }

  return {
    finalPlayerPrediction: {
      playerId: finalPlayer,
      likelyVoid,
      trumpAdvantage,
      predictedResponse,
    },
    optimalTakeoverOpportunity,
    riskAssessment,
    recommendedAction,
    reasoning,
  };
}

/**
 * Records play patterns for behavioral analysis
 */
function recordPlayPattern(
  playerMemory: PlayerMemory,
  card: Card,
  trumpInfo: TrumpInfo,
  position: "leading" | "following",
): void {
  let cardType: "trump" | "point" | "safe" | "discard";

  if (isTrump(card, trumpInfo)) {
    cardType = "trump";
  } else if (card.points > 0) {
    cardType = "point";
  } else if (card.rank && ["2", "3", "4"].includes(card.rank)) {
    cardType = "safe";
  } else {
    cardType = "discard";
  }

  const situation = `${position}_${cardType}`;

  // Update or create pattern
  const existingPattern = playerMemory.playPatterns.find(
    (p) => p.situation === situation,
  );
  if (existingPattern) {
    existingPattern.frequency += 1;
  } else {
    playerMemory.playPatterns.push({
      situation,
      cardType,
      frequency: 1,
    });
  }
}

/**
 * Checks if a specific rank is the biggest remaining in a suit
 * For singles: true if both copies of all higher ranks have been played
 * For pairs: true if ANY single of any higher rank has been played (making higher pairs impossible)
 */
export function isBiggestRemainingInSuit(
  memory: CardMemory,
  suit: Suit,
  rank: Rank,
  comboType: "single" | "pair",
): boolean {
  // Define rank hierarchy (Ace highest to 3 lowest)
  const rankHierarchy = [
    Rank.Ace,
    Rank.King,
    Rank.Queen,
    Rank.Jack,
    Rank.Ten,
    Rank.Nine,
    Rank.Eight,
    Rank.Seven,
    Rank.Six,
    Rank.Five,
    Rank.Four,
    Rank.Three,
  ];

  const rankIndex = rankHierarchy.indexOf(rank);
  if (rankIndex === -1) return false; // Invalid rank

  if (comboType === "pair") {
    // For pairs: ANY higher rank played makes higher pairs impossible
    // Example: Q♥-Q♥ wins if ANY A♥ OR K♥ has been played
    for (let i = 0; i < rankIndex; i++) {
      const higherRank = rankHierarchy[i];
      if (hasRankBeenPlayed(memory, suit, higherRank)) {
        return true; // Higher pair is impossible, our pair wins
      }
    }
    return false;
  } else {
    // For singles: BOTH copies of ALL higher ranks must be played
    // Example: K♥ wins if both A♥ cards have been played
    for (let i = 0; i < rankIndex; i++) {
      const higherRank = rankHierarchy[i];
      const playedCount = memory.playedCards.filter(
        (card) => card.rank === higherRank && card.suit === suit,
      ).length;

      if (playedCount < 2) {
        return false; // This higher rank still has cards available
      }
    }
    return true; // All higher ranks exhausted
  }
}

/**
 * Checks if a specific rank has any cards played in a suit
 * Used internally by isBiggestRemainingInSuit
 */
function hasRankBeenPlayed(
  memory: CardMemory,
  suit: Suit,
  rank: Rank,
): boolean {
  return memory.playedCards.some(
    (card) => card.rank === rank && card.suit === suit,
  );
}

/**
 * Calculates probability distribution for unseen cards
 */
function calculateCardProbabilities(
  memory: CardMemory,
  gameState: GameState,
): void {
  const { players } = gameState;
  const playedCardIds = new Set(memory.playedCards.map((c) => c.id));

  // Get all possible cards (double deck)
  const allPossibleCards = generateFullDeck();
  const unseenCards = allPossibleCards.filter(
    (card) => !playedCardIds.has(card.id),
  );

  memory.cardProbabilities = unseenCards.map((card) => {
    const playerProbs: Record<string, number> = {};
    let totalHandSize = 0;

    // Calculate total cards remaining across all players
    players.forEach((player) => {
      const playerMemory = memory.playerMemories[player.id];
      if (playerMemory) {
        totalHandSize += playerMemory.estimatedHandSize;
      }
    });

    // Base probability distribution
    players.forEach((player) => {
      const playerMemory = memory.playerMemories[player.id];
      if (playerMemory && totalHandSize > 0) {
        // Base probability proportional to hand size
        let baseProbability = playerMemory.estimatedHandSize / totalHandSize;

        // Adjust based on suit voids
        if (card.suit && playerMemory.suitVoids.has(card.suit)) {
          baseProbability = 0; // Can't have cards of a void suit
        }

        // Adjust based on play patterns for point cards
        if (card.points > 0) {
          baseProbability *= playerMemory.pointCardsProbability;
        }

        playerProbs[player.id] = Math.max(0, Math.min(1, baseProbability));
      } else {
        playerProbs[player.id] = 0;
      }
    });

    // Normalize probabilities to sum to 1
    const totalProb = Object.values(playerProbs).reduce(
      (sum, prob) => sum + prob,
      0,
    );
    if (totalProb > 0) {
      Object.keys(playerProbs).forEach((playerId) => {
        playerProbs[playerId] /= totalProb;
      });
    }

    return {
      card,
      players: playerProbs,
    };
  });
}

/**
 * Creates memory-enhanced strategic context
 */
export function createMemoryContext(
  memory: CardMemory,
  gameState: GameState,
): MemoryContext {
  const { players } = gameState;

  // Calculate total cards remaining
  const cardsRemaining = players.reduce(
    (sum, player) => sum + player.hand.length,
    0,
  );

  // Calculate known information ratio
  const totalPossibleCards = memory.roundStartCards * players.length;
  const knownCards = memory.playedCards.length;
  const uncertaintyLevel = 1 - knownCards / totalPossibleCards;

  // Calculate trump exhaustion
  const totalTrumps = countTotalTrumps(gameState.trumpInfo);
  const trumpExhaustion = memory.trumpCardsPlayed / totalTrumps;

  // Estimate opponent hand strengths
  const opponentHandStrength: Record<string, number> = {};
  players.forEach((player) => {
    const playerMemory = memory.playerMemories[player.id];
    if (playerMemory) {
      // Estimate strength based on remaining cards and play patterns
      const strengthScore = estimatePlayerStrength(
        playerMemory,
        gameState.trumpInfo,
      );
      opponentHandStrength[player.id] = strengthScore;
    }
  });

  return {
    cardsRemaining,
    knownCards,
    uncertaintyLevel,
    trumpExhaustion,
    opponentHandStrength,
  };
}

/**
 * Creates memory-based strategic recommendations
 */
export function createMemoryStrategy(
  memory: CardMemory,
  memoryContext: MemoryContext,
  gameState: GameState,
): MemoryBasedStrategy {
  const { trumpInfo } = gameState;

  // Should we play trump based on trump tracking?
  const shouldPlayTrump = determineTrumpPlay(memory, memoryContext, trumpInfo);

  // Risk level based on information certainty
  const riskLevel = calculateRiskLevel(memoryContext);

  // Expected opponent strength
  const expectedOpponentStrength =
    calculateAverageOpponentStrength(memoryContext);

  // Can we exploit suit exhaustion?
  const suitExhaustionAdvantage = detectSuitExhaustionAdvantage(
    memory,
    gameState,
  );

  // Perfect information available?
  const endgameOptimal =
    memoryContext.uncertaintyLevel < 0.1 && memoryContext.cardsRemaining <= 12; // 3 cards per player

  return {
    shouldPlayTrump,
    riskLevel,
    expectedOpponentStrength,
    suitExhaustionAdvantage,
    endgameOptimal,
  };
}

// Helper functions

function generateFullDeck(): Card[] {
  // Generate a double deck for Shengji
  const cards: Card[] = [];
  const suits = [Suit.Hearts, Suit.Diamonds, Suit.Clubs, Suit.Spades];
  const ranks = [
    Rank.Two,
    Rank.Three,
    Rank.Four,
    Rank.Five,
    Rank.Six,
    Rank.Seven,
    Rank.Eight,
    Rank.Nine,
    Rank.Ten,
    Rank.Jack,
    Rank.Queen,
    Rank.King,
    Rank.Ace,
  ];

  // Regular cards (2 decks)
  for (let deck = 0; deck < 2; deck++) {
    suits.forEach((suit) => {
      ranks.forEach((rank) => {
        cards.push(Card.createCard(suit, rank, deck as DeckId));
      });
    });

    // Jokers
    cards.push(
      Card.createJoker(JokerType.Small, deck as DeckId),
      Card.createJoker(JokerType.Big, deck as DeckId),
    );
  }

  return cards;
}

function countTotalTrumps(trumpInfo: TrumpInfo): number {
  // 2 Big Jokers + 2 Small Jokers + trump rank cards + trump suit cards
  let count = 4; // Jokers

  // Trump rank cards (8 total - 2 of each suit in double deck)
  count += 8;

  // Trump suit cards (if declared)
  if (trumpInfo.trumpSuit) {
    count += 24; // 12 ranks × 2 decks, minus trump rank cards already counted
  }

  return count;
}

function estimatePlayerStrength(
  playerMemory: PlayerMemory,
  _trumpInfo: TrumpInfo,
): number {
  // Base strength on estimated remaining cards and observed patterns
  let strength = playerMemory.estimatedHandSize * 0.1; // Base score

  // Subtract strength for trump cards used (more trumps used = weaker player)
  strength -= playerMemory.trumpUsed * 0.3;

  // Add strength for point card probability
  strength += playerMemory.pointCardsProbability * 0.2;

  // Analyze play patterns for conservativeness (indicates strong hand)
  const conservativePatterns = playerMemory.playPatterns.filter(
    (p) => p.cardType === "safe" || p.cardType === "discard",
  );
  const totalPatterns = playerMemory.playPatterns.reduce(
    (sum, p) => sum + p.frequency,
    0,
  );

  if (totalPatterns > 0) {
    const conservativenessRatio =
      conservativePatterns.reduce((sum, p) => sum + p.frequency, 0) /
      totalPatterns;
    strength += conservativenessRatio * 0.4; // Conservative play suggests strong hand
  }

  return Math.max(0, Math.min(1, strength)); // Normalize to 0-1
}

function determineTrumpPlay(
  _memory: CardMemory,
  memoryContext: MemoryContext,
  _trumpInfo: TrumpInfo,
): boolean {
  // Play trump if exhaustion is high (opponents likely have few trumps)
  if (memoryContext.trumpExhaustion > 0.7) {
    return true;
  }

  // Play trump if opponents show low trump probability
  const averageOpponentStrength =
    calculateAverageOpponentStrength(memoryContext);
  if (averageOpponentStrength < 0.3) {
    return true;
  }

  return false;
}

function calculateRiskLevel(memoryContext: MemoryContext): number {
  // Higher risk when we have more information (lower uncertainty)
  return 1 - memoryContext.uncertaintyLevel;
}

function calculateAverageOpponentStrength(
  memoryContext: MemoryContext,
): number {
  const strengths = Object.values(memoryContext.opponentHandStrength);
  if (strengths.length === 0) return 0.5; // Neutral assumption

  return (
    strengths.reduce((sum, strength) => sum + strength, 0) / strengths.length
  );
}

function detectSuitExhaustionAdvantage(
  memory: CardMemory,
  _gameState: GameState,
): boolean {
  // Check if any opponent has shown suit voids we can exploit
  const playerMemories = Object.values(memory.playerMemories);

  return playerMemories.some(
    (playerMemory) =>
      playerMemory.suitVoids.size > 0 && playerMemory.estimatedHandSize > 3,
  );
}

/**
 * Phase 4: Historical Trick Analysis Functions
 */

/**
 * Analyzes historical trick patterns to identify opponent behavior and team coordination
 */
export function analyzeTrickHistory(
  tricks: Trick[],
  gameState: GameState,
): TrickHistoryAnalysis {
  const { players, trumpInfo } = gameState;

  // Initialize analysis structure
  const analysis: TrickHistoryAnalysis = {
    opponentLeadingPatterns: {} as Record<PlayerId, OpponentLeadingPattern>,
    teamCoordinationHistory: createTeamCoordinationPattern(tricks, players),
    adaptiveBehaviorTrends: createAdaptiveBehaviorDetection(tricks, players),
    roundProgression: createRoundProgressionPattern(tricks, players, trumpInfo),
    trickSequencePatterns: identifyTrickSequencePatterns(tricks, players),
  };

  // Analyze each player's leading patterns
  players.forEach((player) => {
    analysis.opponentLeadingPatterns[player.id] = analyzeOpponentLeadingPattern(
      player.id,
      tricks,
      trumpInfo,
    );
  });

  return analysis;
}

/**
 * Analyzes a specific player's leading behavior patterns
 */
function analyzeOpponentLeadingPattern(
  playerId: PlayerId,
  tricks: Trick[],
  trumpInfo: TrumpInfo,
): OpponentLeadingPattern {
  const leaderTricks = tricks.filter(
    (trick) => trick.plays[0]?.playerId === playerId,
  );

  if (leaderTricks.length === 0) {
    return createDefaultLeadingPattern();
  }

  const trumpLeads = leaderTricks.filter((trick) =>
    trick.plays[0]?.cards.some((card) => isTrump(card, trumpInfo)),
  ).length;

  const pointLeads = leaderTricks.filter((trick) =>
    trick.plays[0]?.cards.some((card) => card.points > 0),
  ).length;

  // Analyze suit preferences
  const suitCounts: Record<string, number> = {};
  leaderTricks.forEach((trick) => {
    const leadSuit = trick.plays[0]?.cards[0]?.suit;
    if (leadSuit) {
      suitCounts[leadSuit] = (suitCounts[leadSuit] || 0) + 1;
    }
  });

  const strongSuitPreference = Object.entries(suitCounts).reduce(
    (max, [suit, count]) => {
      if (!max || count > suitCounts[max]) {
        return suit;
      }
      return max;
    },
    null as string | null,
  ) as Suit | null;

  // Calculate aggressiveness based on trump and point card usage
  const aggressivenessLevel = Math.min(
    1,
    (trumpLeads / leaderTricks.length) * 0.6 +
      (pointLeads / leaderTricks.length) * 0.4,
  );

  return {
    trumpLeadFrequency: trumpLeads / leaderTricks.length,
    pointCardLeadFrequency: pointLeads / leaderTricks.length,
    strongSuitPreference,
    situationalBehavior: analyzeSituationalBehavior(leaderTricks, trumpInfo),
    aggressivenessLevel,
    teamCoordinationStyle: analyzeTeamCoordinationStyle(leaderTricks, tricks),
  };
}

/**
 * Creates team coordination pattern analysis
 */
function createTeamCoordinationPattern(
  tricks: Trick[],
  players: PlayerContext[],
): TeamCoordinationPattern {
  let supportCount = 0;
  let blockingCount = 0;
  let totalInteractions = 0;

  // Analyze each trick for team coordination patterns
  tricks.forEach((trick) => {
    const allPlays = trick.plays;

    for (let i = 1; i < allPlays.length; i++) {
      const currentPlayer = players.find((p) => p.id === allPlays[i].playerId);
      const previousPlayer = players.find(
        (p) => p.id === allPlays[i - 1].playerId,
      );

      if (currentPlayer && previousPlayer) {
        totalInteractions++;

        // Check if they're teammates
        if (currentPlayer.team === previousPlayer.team) {
          // Analyze if current player is supporting previous player
          if (analyzeSupport(allPlays[i].cards, allPlays[i - 1].cards, trick)) {
            supportCount++;
          }
        } else {
          // Analyze if current player is blocking previous player
          if (
            analyzeBlocking(allPlays[i].cards, allPlays[i - 1].cards, trick)
          ) {
            blockingCount++;
          }
        }
      }
    }
  });

  return {
    supportFrequency:
      totalInteractions > 0 ? supportCount / totalInteractions : 0,
    blockingEfficiency:
      totalInteractions > 0 ? blockingCount / totalInteractions : 0,
    pointContributionStrategy: "conservative", // Simplified for now
    communicationPatterns: [], // Simplified for now
    cooperationLevel:
      totalInteractions > 0 ? supportCount / totalInteractions : 0.5,
  };
}

/**
 * Creates adaptive behavior detection analysis
 */
function createAdaptiveBehaviorDetection(
  tricks: Trick[],
  _players: PlayerContext[],
): AdaptiveBehaviorDetection {
  const midpoint = Math.floor(tricks.length / 2);
  const earlyTricks = tricks.slice(0, midpoint);
  const lateTricks = tricks.slice(midpoint);

  // Compare early vs late behavior for adaptation detection
  const earlyPatterns = analyzePlayPatterns(earlyTricks);
  const latePatterns = analyzePlayPatterns(lateTricks);

  const behaviorConsistency = calculateBehaviorConsistency(
    earlyPatterns,
    latePatterns,
  );

  return {
    learningRate: 1 - behaviorConsistency, // Less consistency = more learning
    counterStrategyUsage: 0.3, // Simplified for now
    behaviorConsistency,
    adaptationTriggers: ["opponent_trump_usage", "point_pressure"], // Simplified
    strategicFlexibility: 1 - behaviorConsistency,
  };
}

/**
 * Creates round progression pattern analysis
 */
function createRoundProgressionPattern(
  tricks: Trick[],
  _players: PlayerContext[],
  trumpInfo: TrumpInfo,
): RoundProgressionPattern {
  const trickCount = tricks.length;
  const earlyTricks = tricks.slice(0, Math.floor(trickCount / 3));
  const midTricks = tricks.slice(
    Math.floor(trickCount / 3),
    Math.floor((2 * trickCount) / 3),
  );
  const lateTricks = tricks.slice(Math.floor((2 * trickCount) / 3));

  return {
    earlyRoundBehavior: analyzeBehaviorPhase(earlyTricks, trumpInfo),
    midRoundBehavior: analyzeBehaviorPhase(midTricks, trumpInfo),
    endgameBehavior: analyzeBehaviorPhase(lateTricks, trumpInfo),
    consistencyScore: calculateRoundConsistency(
      earlyTricks,
      midTricks,
      lateTricks,
    ),
  };
}

/**
 * Identifies multi-trick sequence patterns
 */
function identifyTrickSequencePatterns(
  tricks: Trick[],
  _players: PlayerContext[],
): TrickSequencePattern[] {
  const patterns: TrickSequencePattern[] = [];

  // Look for setup patterns (simplified implementation)
  for (let i = 0; i < tricks.length - 1; i++) {
    const currentTrick = tricks[i];
    const nextTrick = tricks[i + 1];

    // Check for setup patterns
    if (isSetupPattern(currentTrick, nextTrick, _players)) {
      patterns.push({
        patternType: "setup",
        triggerConditions: ["low_point_trick", "teammate_next_lead"],
        sequenceLength: 2,
        successRate: 0.7, // Simplified
        playerInvolved: [
          currentTrick.plays[0]?.playerId,
          nextTrick.plays[0]?.playerId,
        ],
        description: "Player sets up teammate for advantageous lead",
      });
    }
  }

  return patterns;
}

/**
 * Creates enhanced memory context with historical analysis
 */
export function createEnhancedMemoryContext(
  memory: CardMemory,
  gameState: GameState,
): EnhancedMemoryContext {
  const baseContext = createMemoryContext(memory, gameState);
  const trickHistory = analyzeTrickHistory(gameState.tricks, gameState);

  return {
    ...baseContext,
    trickHistory,
    predictiveModeling: createPredictiveModels(trickHistory, gameState),
    adaptiveStrategy: createAdaptiveStrategy(trickHistory, gameState),
  };
}

/**
 * Creates predictive opponent models based on historical analysis
 */
function createPredictiveModels(
  trickHistory: TrickHistoryAnalysis,
  gameState: GameState,
): PredictiveOpponentModel[] {
  const models: PredictiveOpponentModel[] = [];

  gameState.players.forEach((player) => {
    const leadingPattern = trickHistory.opponentLeadingPatterns[player.id];
    if (leadingPattern) {
      models.push({
        playerId: player.id,
        nextMoveAnalysis: {
          mostLikelyPlay: predictNextPlayType(leadingPattern),
          confidence: calculatePredictionConfidence(leadingPattern),
          alternativeScenarios: [],
          reasoning: `Based on ${Math.round(leadingPattern.aggressivenessLevel * 100)}% aggressiveness and leading patterns`,
        },
        handStrengthEstimate: {
          trumpCount: 2, // Simplified estimate
          pointCardProbability: leadingPattern.pointCardLeadFrequency,
          dominantSuit: leadingPattern.strongSuitPreference,
          overallStrength: leadingPattern.aggressivenessLevel,
          voidSuits: [],
        },
        strategicIntent: {
          primaryGoal: determinePrimaryGoal(leadingPattern),
          secondaryGoals: [],
          adaptationLevel: trickHistory.adaptiveBehaviorTrends.learningRate,
          teamCoordination:
            trickHistory.teamCoordinationHistory.cooperationLevel,
        },
        reliability: Math.min(0.9, gameState.tricks.length * 0.1), // More tricks = more reliable
      });
    }
  });

  return models;
}

/**
 * Creates adaptive strategy recommendations
 */
function createAdaptiveStrategy(
  trickHistory: TrickHistoryAnalysis,
  gameState: GameState,
): AdaptiveStrategyRecommendation {
  const mostAggressiveOpponent = Object.entries(
    trickHistory.opponentLeadingPatterns,
  ).reduce(
    (
      max: { playerId: PlayerId; pattern: OpponentLeadingPattern } | null,
      [playerId, pattern],
    ) =>
      pattern.aggressivenessLevel > (max?.pattern.aggressivenessLevel || 0)
        ? { playerId: playerId as PlayerId, pattern }
        : max,
    null,
  );

  return {
    recommendedApproach:
      (mostAggressiveOpponent?.pattern.aggressivenessLevel || 0) > 0.7
        ? "counter"
        : "maintain",
    targetOpponent: mostAggressiveOpponent?.playerId || null,
    tacticalAdjustments: [],
    confidenceLevel: Math.min(0.8, gameState.tricks.length * 0.1),
    expectedOutcome:
      "Improved strategic positioning against aggressive opponents",
  };
}

// Helper functions for historical analysis

function createDefaultLeadingPattern(): OpponentLeadingPattern {
  return {
    trumpLeadFrequency: 0.3,
    pointCardLeadFrequency: 0.2,
    strongSuitPreference: null,
    situationalBehavior: {},
    aggressivenessLevel: 0.5,
    teamCoordinationStyle: "supportive",
  };
}

function analyzeSituationalBehavior(
  tricks: Trick[],
  _trumpInfo: TrumpInfo,
): Record<string, LeadingBehaviorProfile> {
  // Simplified implementation
  return {
    early_game: {
      cardTypePreference: "safe",
      comboPreference: "singles",
      frequency: tricks.length,
      context: "Conservative early game approach",
    },
  };
}

function analyzeTeamCoordinationStyle(
  _leaderTricks: Trick[],
  _allTricks: Trick[],
): "supportive" | "independent" | "opportunistic" {
  // Simplified analysis
  return "supportive";
}

function analyzeSupport(
  currentCards: Card[],
  _previousCards: Card[],
  trick: Trick,
): boolean {
  // Simplified: check if current player contributed points when teammate was winning
  return currentCards.some((card) => card.points > 0) && trick.points > 0;
}

function analyzeBlocking(
  currentCards: Card[],
  _previousCards: Card[],
  _trick: Trick,
): boolean {
  // Simplified: check if current player used trump to block opponent
  return currentCards.length > 0; // Placeholder logic
}

function analyzePlayPatterns(tricks: Trick[]): PlayPatterns {
  // Simplified pattern analysis
  if (tricks.length === 0) {
    return {
      trumpUsage: 0,
      pointFocus: 0,
    };
  }

  return {
    trumpUsage:
      tricks.filter((t) => t.plays[0]?.cards.some((c) => c.rank === undefined))
        .length / tricks.length,
    pointFocus: tricks.filter((t) => t.points > 0).length / tricks.length,
  };
}

function calculateBehaviorConsistency(
  earlyPatterns: PlayPatterns,
  latePatterns: PlayPatterns,
): number {
  // Handle case where patterns might be undefined or have NaN values
  const trumpDiff = Math.abs(
    (earlyPatterns.trumpUsage || 0) - (latePatterns.trumpUsage || 0),
  );
  const pointDiff = Math.abs(
    (earlyPatterns.pointFocus || 0) - (latePatterns.pointFocus || 0),
  );

  const consistency = 1 - (trumpDiff + pointDiff) / 2;

  // Ensure we return a valid number between 0 and 1
  if (isNaN(consistency)) return 0.5; // Default consistency when no data
  return Math.max(0, Math.min(1, consistency));
}

function analyzeBehaviorPhase(
  tricks: Trick[],
  trumpInfo: TrumpInfo,
): BehaviorPhaseProfile {
  if (tricks.length === 0) {
    return {
      riskTolerance: 0.5,
      trumpUsage: 0.3,
      pointFocus: 0.4,
      teamOrientation: 0.5,
    };
  }

  const trumpTricks = tricks.filter((t) =>
    t.plays[0]?.cards.some((c) => isTrump(c, trumpInfo)),
  ).length;

  const pointTricks = tricks.filter((t) => t.points > 0).length;

  return {
    riskTolerance: trumpTricks / tricks.length,
    trumpUsage: trumpTricks / tricks.length,
    pointFocus: pointTricks / tricks.length,
    teamOrientation: 0.5, // Simplified
  };
}

function calculateRoundConsistency(
  _early: Trick[],
  _mid: Trick[],
  _late: Trick[],
): number {
  // Simplified consistency score
  return 0.7; // Placeholder
}

function isSetupPattern(
  current: Trick,
  next: Trick,
  players: PlayerContext[],
): boolean {
  // Simplified setup pattern detection
  const currentWinner = players.find((p) => p.id === current.winningPlayerId);
  const nextLeader = players.find((p) => p.id === next.plays[0]?.playerId);

  return currentWinner?.team === nextLeader?.team && current.points < 10;
}

function predictNextPlayType(
  pattern: OpponentLeadingPattern,
): "trump" | "point" | "safe" | "tactical" {
  if (pattern.trumpLeadFrequency > 0.5) return "trump";
  if (pattern.pointCardLeadFrequency > 0.4) return "point";
  if (pattern.aggressivenessLevel < 0.3) return "safe";
  return "tactical";
}

function calculatePredictionConfidence(
  pattern: OpponentLeadingPattern,
): number {
  // Higher confidence for more consistent patterns
  const consistency = Math.max(
    pattern.trumpLeadFrequency,
    pattern.pointCardLeadFrequency,
    1 - pattern.aggressivenessLevel,
  );
  return Math.min(0.9, consistency);
}

function determinePrimaryGoal(
  pattern: OpponentLeadingPattern,
):
  | "point_collection"
  | "trump_conservation"
  | "opponent_blocking"
  | "endgame_setup" {
  if (pattern.pointCardLeadFrequency > 0.4) return "point_collection";
  if (pattern.trumpLeadFrequency > 0.6) return "opponent_blocking";
  if (pattern.aggressivenessLevel < 0.3) return "trump_conservation";
  return "endgame_setup";
}

function getNextPlayerId(
  gameState: GameState,
  currentPlayerIndex: number,
): PlayerId | null {
  const currentTrick = gameState.currentTrick;
  if (!currentTrick) {
    return null; // No active trick
  }

  // Check if current player is the 4th player (no next player)
  if (currentTrick.plays.length >= 3) {
    return null; // 4th player has no next player
  }

  const allPlayerIds = gameState.players.map((player) => player.id);
  if (currentPlayerIndex < 0 || currentPlayerIndex >= allPlayerIds.length) {
    return null;
  }

  // Return next player in sequence
  const nextIndex = (currentPlayerIndex + 1) % allPlayerIds.length;
  return allPlayerIds[nextIndex];
}

export function isNextPlayerVoidInSuit(
  nextPlayerId: PlayerId,
  suit: Suit,
  cardMemory: CardMemory,
): boolean {
  // Use memory system to check for confirmed voids
  const nextPlayerMemory = cardMemory.playerMemories[nextPlayerId];
  if (!nextPlayerMemory) {
    return false;
  }

  if (suit === Suit.None) {
    // Check for trump void
    return nextPlayerMemory.trumpVoid;
  } else {
    // Check for suit void
    return nextPlayerMemory.suitVoids.has(suit);
  }
}

/**
 * Integrates memory-based insights into existing game context
 */
export function enhanceGameContextWithMemory(
  baseContext: GameContext,
  memory: CardMemory,
  gameState: GameState,
): GameContext {
  const memoryContext = createEnhancedMemoryContext(memory, gameState);
  const leadCard = gameState.currentTrick?.plays[0]?.cards[0];
  const nextPlayerId = getNextPlayerId(gameState, gameState.currentPlayerIndex);

  if (leadCard && nextPlayerId) {
    const leadSuit = isTrump(leadCard, gameState.trumpInfo)
      ? Suit.None
      : leadCard.suit;
    memoryContext.nextPlayerVoidLed = isNextPlayerVoidInSuit(
      nextPlayerId,
      leadSuit,
      memory,
    );
  } else {
    memoryContext.nextPlayerVoidLed = false; // No lead card or next player
  }

  return {
    ...baseContext,
    memoryContext,
  };
}
