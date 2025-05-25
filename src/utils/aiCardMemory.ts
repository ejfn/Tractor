import {
  GameState,
  Card,
  CardMemory,
  PlayerMemory,
  MemoryContext,
  MemoryBasedStrategy,
  Suit,
  Rank,
  TrumpInfo,
  JokerType,
} from "../types/game";
import { isTrump } from "./gameLogic";

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
      trumpCount: 0,
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
  trick: any,
  memory: CardMemory,
  trumpInfo: TrumpInfo,
): void {
  // Track leading combo
  if (trick.leadingCombo) {
    trick.leadingCombo.forEach((card: Card) => {
      processPlayedCard(
        card,
        trick.leadingPlayerId,
        memory,
        trumpInfo,
        "leading",
      );
    });
  }

  // Track all following plays
  trick.plays.forEach((play: any) => {
    play.cards.forEach((card: Card) => {
      processPlayedCard(card, play.playerId, memory, trumpInfo, "following");
    });
  });

  memory.tricksAnalyzed++;
}

/**
 * Analyzes the current trick in progress
 */
function analyzeCurrentTrick(
  trick: any,
  memory: CardMemory,
  trumpInfo: TrumpInfo,
): void {
  // Track leading combo
  if (trick.leadingCombo) {
    trick.leadingCombo.forEach((card: Card) => {
      processPlayedCard(
        card,
        trick.leadingPlayerId,
        memory,
        trumpInfo,
        "leading",
      );
    });
  }

  // Track plays made so far
  trick.plays.forEach((play: any) => {
    play.cards.forEach((card: Card) => {
      processPlayedCard(card, play.playerId, memory, trumpInfo, "following");
    });
  });
}

/**
 * Processes a single played card to update memory and patterns
 */
function processPlayedCard(
  card: Card,
  playerId: string,
  memory: CardMemory,
  trumpInfo: TrumpInfo,
  position: "leading" | "following",
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
      playerMemory.trumpCount++;
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
  card: Card,
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
        const points =
          rank === Rank.Five
            ? 5
            : rank === Rank.Ten || rank === Rank.King
              ? 10
              : 0;
        cards.push({
          suit,
          rank,
          id: `${rank}_${suit}_${deck}`,
          points,
        });
      });
    });

    // Jokers
    cards.push(
      { joker: JokerType.Small, id: `small_joker_${deck}`, points: 0 },
      { joker: JokerType.Big, id: `big_joker_${deck}`, points: 0 },
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
  trumpInfo: TrumpInfo,
): number {
  // Base strength on estimated remaining cards and observed patterns
  let strength = playerMemory.estimatedHandSize * 0.1; // Base score

  // Add strength for trump cards
  strength += playerMemory.trumpCount * 0.3;

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
  memory: CardMemory,
  memoryContext: MemoryContext,
  trumpInfo: TrumpInfo,
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
  gameState: GameState,
): boolean {
  // Check if any opponent has shown suit voids we can exploit
  const playerMemories = Object.values(memory.playerMemories);

  return playerMemories.some(
    (playerMemory) =>
      playerMemory.suitVoids.size > 0 && playerMemory.estimatedHandSize > 3,
  );
}

/**
 * Integrates memory-based insights into existing game context
 */
export function enhanceGameContextWithMemory(
  baseContext: any,
  memory: CardMemory,
  gameState: GameState,
): any {
  const memoryContext = createMemoryContext(memory, gameState);
  const memoryStrategy = createMemoryStrategy(memory, memoryContext, gameState);

  return {
    ...baseContext,
    memoryContext,
    memoryStrategy,
  };
}
