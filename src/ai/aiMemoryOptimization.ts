import {
  CardMemory,
  GameState,
  PlayerId,
  TrumpInfo,
  Card,
  Trick,
  Suit,
} from "../types";

/**
 * Phase 4: Memory System Performance Optimization
 *
 * Provides optimized memory operations and caching strategies to improve
 * AI performance while maintaining full memory system functionality.
 */

interface MemoryCache {
  lastGameStateHash: string;
  cachedMemory: CardMemory | null;
  lastUpdateTrick: number;
  cacheHits: number;
  cacheMisses: number;
}

// Global memory cache for performance optimization
let memoryCache: MemoryCache = {
  lastGameStateHash: "",
  cachedMemory: null,
  lastUpdateTrick: -1,
  cacheHits: 0,
  cacheMisses: 0,
};

/**
 * Optimized memory creation with intelligent caching
 * Only recalculates memory when game state has actually changed
 */
export function createOptimizedCardMemory(gameState: GameState): CardMemory {
  const gameStateHash = generateGameStateHash(gameState);
  const currentTrickCount = gameState.tricks.length;

  // Check if we can use cached memory
  if (
    memoryCache.lastGameStateHash === gameStateHash &&
    memoryCache.cachedMemory &&
    memoryCache.lastUpdateTrick === currentTrickCount
  ) {
    memoryCache.cacheHits++;
    return { ...memoryCache.cachedMemory }; // Return copy to prevent mutations
  }

  // Cache miss - need to recalculate
  memoryCache.cacheMisses++;

  // Use incremental update if only new tricks were added
  if (
    memoryCache.cachedMemory &&
    memoryCache.lastUpdateTrick < currentTrickCount &&
    currentTrickCount - memoryCache.lastUpdateTrick <= 3
  ) {
    const updatedMemory = incrementalMemoryUpdate(
      memoryCache.cachedMemory,
      gameState,
      memoryCache.lastUpdateTrick,
    );

    // Update cache
    memoryCache.lastGameStateHash = gameStateHash;
    memoryCache.cachedMemory = updatedMemory;
    memoryCache.lastUpdateTrick = currentTrickCount;

    return { ...updatedMemory };
  }

  // Full recalculation needed
  const freshMemory = createFullCardMemory(gameState);

  // Update cache
  memoryCache.lastGameStateHash = gameStateHash;
  memoryCache.cachedMemory = freshMemory;
  memoryCache.lastUpdateTrick = currentTrickCount;

  return { ...freshMemory };
}

/**
 * Generate a hash of the game state for cache validation
 */
function generateGameStateHash(gameState: GameState): string {
  // Create hash based on tricks and current trick
  const tricksHash = gameState.tricks
    .map(
      (trick) =>
        `${trick.winningPlayerId}:${trick.points}:${trick.plays.length}`,
    )
    .join("|");

  const currentTrickHash = gameState.currentTrick
    ? `${gameState.currentTrick.plays.length}:${gameState.currentTrick.winningPlayerId}`
    : "none";

  return `${tricksHash}::${currentTrickHash}`;
}

/**
 * Incrementally update memory with only new tricks
 */
function incrementalMemoryUpdate(
  baseMemory: CardMemory,
  gameState: GameState,
  lastTrickIndex: number,
): CardMemory {
  const updatedMemory: CardMemory = {
    ...baseMemory,
    playedCards: [...baseMemory.playedCards],
    suitDistribution: { ...baseMemory.suitDistribution },
    playerMemories: {},
    cardProbabilities: [...baseMemory.cardProbabilities],
  };

  // Deep copy player memories
  Object.keys(baseMemory.playerMemories).forEach((playerId) => {
    updatedMemory.playerMemories[playerId] = {
      ...baseMemory.playerMemories[playerId],
      knownCards: [...baseMemory.playerMemories[playerId].knownCards],
      suitVoids: new Set(baseMemory.playerMemories[playerId].suitVoids),
      playPatterns: [...baseMemory.playerMemories[playerId].playPatterns],
    };
  });

  // Process only new tricks
  const newTricks = gameState.tricks.slice(lastTrickIndex);
  newTricks.forEach((trick) => {
    processNewTrickForMemory(trick, updatedMemory, gameState.trumpInfo);
  });

  // Update trick count
  updatedMemory.tricksAnalyzed = gameState.tricks.length;

  // Process current trick if exists
  if (gameState.currentTrick) {
    processCurrentTrickForMemory(
      gameState.currentTrick,
      updatedMemory,
      gameState.trumpInfo,
    );
  }

  return updatedMemory;
}

/**
 * Full memory creation (fallback when incremental update not possible)
 */
function createFullCardMemory(gameState: GameState): CardMemory {
  const { tricks, players, trumpInfo } = gameState;

  // Initialize memory structure
  const memory: CardMemory = {
    playedCards: [],
    trumpCardsPlayed: 0,
    pointCardsPlayed: 0,
    suitDistribution: {},
    playerMemories: {},
    cardProbabilities: [],
    roundStartCards: Math.floor((52 * 2) / players.length),
    tricksAnalyzed: 0,
  };

  // Initialize player memories
  players.forEach((player) => {
    memory.playerMemories[player.id] = {
      playerId: player.id,
      knownCards: [],
      estimatedHandSize: player.hand.length,
      suitVoids: new Set(),
      trumpVoid: false,
      trumpCount: 0,
      pointCardsProbability: 0.5,
      playPatterns: [],
    };
  });

  // Analyze all completed tricks
  tricks.forEach((trick) => {
    processNewTrickForMemory(trick, memory, trumpInfo);
  });

  // Analyze current trick if in progress
  if (gameState.currentTrick) {
    processCurrentTrickForMemory(gameState.currentTrick, memory, trumpInfo);
  }

  memory.tricksAnalyzed = tricks.length;

  return memory;
}

/**
 * Process a single trick for memory updates
 */
function processNewTrickForMemory(
  trick: Trick,
  memory: CardMemory,
  trumpInfo: TrumpInfo,
): void {
  // Extract lead card from the first card played
  const leadCard = trick.plays[0]?.cards[0] || null;
  const leadSuit =
    leadCard && !isTrump(leadCard, trumpInfo) ? leadCard.suit : null;

  trick.plays.forEach((play) => {
    play.cards.forEach((card) => {
      // Add to played cards
      memory.playedCards.push(card);

      // Update counters
      if (isTrump(card, trumpInfo)) {
        memory.trumpCardsPlayed++;
      }
      if (isPointCard(card)) {
        memory.pointCardsPlayed++;
      }

      // Update player memory
      const playerMemory = memory.playerMemories[play.playerId];
      if (playerMemory) {
        playerMemory.knownCards.push(card);

        // Detect void if trump was played on non-trump lead
        if (leadSuit && card.suit !== leadSuit && isTrump(card, trumpInfo)) {
          playerMemory.suitVoids.add(leadSuit);
        }
      }
    });
  });
}

/**
 * Process current (incomplete) trick for memory updates
 */
function processCurrentTrickForMemory(
  currentTrick: Trick,
  memory: CardMemory,
  trumpInfo: TrumpInfo,
): void {
  if (currentTrick.plays.length === 0) return;

  const leadCard = currentTrick.plays[0]?.cards[0] || null;
  const leadSuit =
    leadCard && !isTrump(leadCard, trumpInfo) ? leadCard.suit : null;

  currentTrick.plays.forEach((play) => {
    play.cards.forEach((card) => {
      const playerMemory = memory.playerMemories[play.playerId];
      if (playerMemory) {
        // Detect void if trump was played on non-trump lead
        if (leadSuit && card.suit !== leadSuit && isTrump(card, trumpInfo)) {
          playerMemory.suitVoids.add(leadSuit);
        }
      }
    });
  });
}

/**
 * Get memory cache statistics for performance monitoring
 */
export function getMemoryCacheStats(): {
  cacheHits: number;
  cacheMisses: number;
  hitRate: number;
  lastUpdateTrick: number;
} {
  const totalAccesses = memoryCache.cacheHits + memoryCache.cacheMisses;
  const hitRate = totalAccesses > 0 ? memoryCache.cacheHits / totalAccesses : 0;

  return {
    cacheHits: memoryCache.cacheHits,
    cacheMisses: memoryCache.cacheMisses,
    hitRate: Math.round(hitRate * 100) / 100,
    lastUpdateTrick: memoryCache.lastUpdateTrick,
  };
}

/**
 * Reset memory cache (useful for testing or new games)
 */
export function resetMemoryCache(): void {
  memoryCache = {
    lastGameStateHash: "",
    cachedMemory: null,
    lastUpdateTrick: -1,
    cacheHits: 0,
    cacheMisses: 0,
  };
}

/**
 * Optimized void detection with early termination
 */
export function hasConfirmedVoid(
  memory: CardMemory,
  playerId: PlayerId,
  suit: Suit,
): boolean {
  const playerMemory = memory.playerMemories[playerId];
  return playerMemory ? playerMemory.suitVoids.has(suit) : false;
}

/**
 * Optimized trump exhaustion check
 */
export function getTrumpExhaustionQuick(
  memory: CardMemory,
  playerId: PlayerId,
): number {
  const playerMemory = memory.playerMemories[playerId];
  if (!playerMemory) return 0;

  // Quick estimation based on trump void flag
  if (playerMemory.trumpVoid) return 1.0;

  // Estimate based on played trump cards
  const estimatedTrumpExhaustion = Math.min(
    memory.trumpCardsPlayed / 20, // Rough estimate of total trump cards
    0.9, // Never assume complete exhaustion without confirmation
  );

  return estimatedTrumpExhaustion;
}

// Helper functions

function isTrump(card: Card, trumpInfo: TrumpInfo): boolean {
  return (
    card.suit === trumpInfo.trumpSuit ||
    card.rank === trumpInfo.trumpRank ||
    card.suit === null
  ); // Jokers
}

function isPointCard(card: Card): boolean {
  return card.rank === "K" || card.rank === "10" || card.rank === "5";
}

/**
 * Memory system performance profiler for development
 */

// Global profiler state to avoid class with only static properties
const profilerState = {
  startTime: 0,
  operations: [] as {
    operation: string;
    duration: number;
    cacheHit: boolean;
  }[],
};

export const MemoryProfiler = {
  startProfile(): void {
    profilerState.startTime = Date.now();
    profilerState.operations = [];
  },

  recordOperation(operation: string, cacheHit: boolean = false): void {
    const duration = Date.now() - profilerState.startTime;
    profilerState.operations.push({ operation, duration, cacheHit });
    profilerState.startTime = Date.now();
  },

  getProfile(): {
    totalOperations: number;
    cacheHitRate: number;
    averageDuration: number;
    operations: { operation: string; duration: number; cacheHit: boolean }[];
  } {
    const cacheHits = profilerState.operations.filter(
      (op) => op.cacheHit,
    ).length;
    const totalDuration = profilerState.operations.reduce(
      (sum, op) => sum + op.duration,
      0,
    );

    return {
      totalOperations: profilerState.operations.length,
      cacheHitRate:
        profilerState.operations.length > 0
          ? cacheHits / profilerState.operations.length
          : 0,
      averageDuration:
        profilerState.operations.length > 0
          ? totalDuration / profilerState.operations.length
          : 0,
      operations: [...profilerState.operations],
    };
  },

  reset(): void {
    profilerState.operations = [];
    profilerState.startTime = Date.now();
  },
};
