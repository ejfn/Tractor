import { isTrump } from "../game/cardValue";
import {
  Card,
  GameState,
  MemoryContext,
  PlayerId,
  Suit,
  Trick,
  TrumpInfo,
} from "../types";

/**
 * Phase 3: Card Memory & Counting System
 *
 * This module implements sophisticated card tracking and probability-based
 * decision making for AI strategic intelligence.
 */

/**
 * Creates and maintains comprehensive memory context for strategic AI decisions
 */
export function createMemoryContext(gameState: GameState): MemoryContext {
  const { tricks, players, trumpInfo } = gameState;

  // Initialize memory structure
  const memory: MemoryContext = {
    // Card Memory Data
    playedCards: [],
    trumpCardsPlayed: 0,
    pointCardsPlayed: 0,
    leadTrumpPairsPlayed: 0,
    suitDistribution: {},
    playerMemories: {},
    tricksAnalyzed: 0,

    // Memory Analysis (will be populated below)
    cardsRemaining: 0,
    knownCards: 0,
    nextPlayerVoidLed: false,
  };

  // Initialize player memories
  players.forEach((player) => {
    memory.playerMemories[player.id] = {
      playerId: player.id,
      knownCards: [],
      suitVoids: new Set(),
      trumpVoid: false, // Start assuming player has trump cards
      trumpUsed: 0,
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

  // Populate memory analysis fields
  memory.cardsRemaining = players.reduce(
    (sum, player) => sum + player.hand.length,
    0,
  );
  memory.knownCards = memory.playedCards.length;

  return memory;
}

/**
 * Analyzes a completed trick to extract card information and patterns
 */
function analyzeCompletedTrick(
  trick: Trick,
  memory: MemoryContext,
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
  memory: MemoryContext,
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
  memory: MemoryContext,
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
  }
}

// Helper functions

export function getNextPlayerId(
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
  cardMemory: MemoryContext,
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
