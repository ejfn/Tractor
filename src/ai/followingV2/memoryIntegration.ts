import { isTrump } from "../../game/cardValue";
import {
  Card,
  CardMemory,
  GameState,
  PlayerId,
  Rank,
  Suit,
  TrumpInfo,
} from "../../types";

/**
 * Memory Integration V2 - Core Analysis for Following Strategy
 *
 * Main responsibilities:
 * 1. Is next player (opponent) void in the suit?
 * 2. Is there any possibility to beat the current winner in the leading suit (if not trumped)?
 * 3. How many points left in the same suit?
 *
 * Memory considers all cards visible to current player:
 * - Player's hand
 * - Current trick played cards
 * - Kitty cards (only when player owns the kitty)
 */

/**
 * Result of next player void analysis
 */
export interface NextPlayerVoidResult {
  isVoid: boolean;
  confidence: "confirmed" | "probable" | "unknown";
  reasoning: string[];
}

/**
 * Result of remaining points analysis
 */
export interface RemainingPointsResult {
  totalPoints: number;
  pointCards: Card[];
  distribution: {
    fives: number;
    tens: number;
    kings: number;
  };
  reasoning: string[];
}

/**
 * Core memory analysis result
 */
export interface MemoryAnalysisResult {
  nextPlayerVoid: NextPlayerVoidResult;
  remainingPoints: RemainingPointsResult;
}

/**
 * Get all cards visible to the current player
 */
function getVisibleCards(
  playerHand: Card[],
  gameState: GameState,
  currentPlayerId: PlayerId,
): Card[] {
  const visibleCards: Card[] = [];

  // 1. Player's own hand
  visibleCards.push(...playerHand);

  // 2. Current trick played cards
  if (gameState.currentTrick?.plays) {
    for (const play of gameState.currentTrick.plays) {
      visibleCards.push(...play.cards);
    }
  }

  // 3. Kitty cards (only if current player owns the kitty)
  const isKittyOwner =
    gameState.roundStartingPlayerIndex !== undefined &&
    gameState.players[gameState.roundStartingPlayerIndex]?.id ===
      currentPlayerId;

  if (isKittyOwner && gameState.kittyCards) {
    visibleCards.push(...gameState.kittyCards);
  }

  return visibleCards;
}

/**
 * Get all cards that have been played in previous tricks
 */
function getPlayedCards(gameState: GameState): Card[] {
  const playedCards: Card[] = [];

  // Add cards from completed tricks
  for (const trick of gameState.tricks) {
    for (const play of trick.plays) {
      playedCards.push(...play.cards);
    }
  }

  return playedCards;
}

/**
 * Check if next player is void in the leading suit
 */
export function analyzeNextPlayerVoid(
  leadingSuit: Suit,
  gameState: GameState,
  currentPlayerId: PlayerId,
  trumpInfo: TrumpInfo,
  cardMemory: CardMemory,
): NextPlayerVoidResult {
  const reasoning: string[] = [];

  // Find next player
  const currentPlayerIndex = gameState.players.findIndex(
    (p) => p.id === currentPlayerId,
  );
  if (currentPlayerIndex === -1) {
    return {
      isVoid: false,
      confidence: "unknown",
      reasoning: ["current_player_not_found"],
    };
  }

  // 4th player doesn't have a next player
  if (currentPlayerIndex === 3) {
    return {
      isVoid: false,
      confidence: "unknown",
      reasoning: ["fourth_player_has_no_next_player"],
    };
  }

  const nextPlayerIndex = currentPlayerIndex + 1;
  const nextPlayerId = gameState.players[nextPlayerIndex]?.id;

  if (!nextPlayerId) {
    return {
      isVoid: false,
      confidence: "unknown",
      reasoning: ["next_player_not_found"],
    };
  }

  reasoning.push(`next_player_${nextPlayerId}`);

  // Use provided memory for void detection
  const nextPlayerMemory = cardMemory.playerMemories[nextPlayerId];

  if (nextPlayerMemory?.suitVoids.has(leadingSuit)) {
    reasoning.push("confirmed_void_from_memory");
    return {
      isVoid: true,
      confidence: "confirmed",
      reasoning,
    };
  }

  // Check if next player has played off-suit when they could have followed
  // This would indicate they're void in that suit
  for (const trick of gameState.tricks) {
    if (trick.plays.length < 2) continue;

    const leadPlay = trick.plays[0];
    const nextPlayerPlay = trick.plays.find((p) => p.playerId === nextPlayerId);

    if (!nextPlayerPlay) continue;

    const leadPlaySuit = leadPlay.cards[0]?.suit;
    const nextPlayerCards = nextPlayerPlay.cards;

    if (leadPlaySuit === leadingSuit && nextPlayerCards.length > 0) {
      const playedNonSuit = nextPlayerCards.some(
        (card: Card) => card.suit !== leadingSuit && !isTrump(card, trumpInfo),
      );

      if (playedNonSuit) {
        reasoning.push("played_off_suit_when_leading_suit_required");
        return {
          isVoid: true,
          confidence: "probable",
          reasoning,
        };
      }
    }
  }

  reasoning.push("no_void_evidence_found");
  return {
    isVoid: false,
    confidence: "unknown",
    reasoning,
  };
}

/**
 * Analyze remaining points in the leading suit
 */
export function analyzeRemainingPoints(
  leadingSuit: Suit,
  gameState: GameState,
  currentPlayerId: PlayerId,
  trumpInfo: TrumpInfo,
): RemainingPointsResult {
  const reasoning: string[] = [];

  // Get all visible and played cards
  const visibleCards = getVisibleCards(
    gameState.players.find((p) => p.id === currentPlayerId)?.hand || [],
    gameState,
    currentPlayerId,
  );
  const playedCards = getPlayedCards(gameState);

  // Combine all known cards
  const knownCards = [...visibleCards, ...playedCards];

  reasoning.push(`total_known_cards_${knownCards.length}`);

  // Filter for leading suit cards (excluding trump)
  const knownSuitCards = knownCards.filter(
    (card) => card.suit === leadingSuit && !isTrump(card, trumpInfo),
  );

  // Get all point cards that have been accounted for
  const knownPointCards = knownSuitCards.filter((card) => card.points > 0);

  // Calculate total possible points in this suit
  const totalPossiblePoints = {
    fives: 8 * 5, // 8 fives worth 5 points each
    tens: 8 * 10, // 8 tens worth 10 points each
    kings: 8 * 10, // 8 kings worth 10 points each
  };

  // Calculate known points
  const knownPoints = {
    fives: knownPointCards.filter((c) => c.rank === Rank.Five).length * 5,
    tens: knownPointCards.filter((c) => c.rank === Rank.Ten).length * 10,
    kings: knownPointCards.filter((c) => c.rank === Rank.King).length * 10,
  };

  // Calculate remaining points
  const remainingPoints = {
    fives: totalPossiblePoints.fives - knownPoints.fives,
    tens: totalPossiblePoints.tens - knownPoints.tens,
    kings: totalPossiblePoints.kings - knownPoints.kings,
  };

  const totalRemainingPoints =
    remainingPoints.fives + remainingPoints.tens + remainingPoints.kings;

  // Build list of remaining point cards (theoretical)
  const remainingPointCards: Card[] = [];

  // Add remaining fives
  for (let i = 0; i < remainingPoints.fives / 5; i++) {
    remainingPointCards.push(Card.createCard(leadingSuit, Rank.Five, 0));
  }

  // Add remaining tens
  for (let i = 0; i < remainingPoints.tens / 10; i++) {
    remainingPointCards.push(Card.createCard(leadingSuit, Rank.Ten, 0));
  }

  // Add remaining kings
  for (let i = 0; i < remainingPoints.kings / 10; i++) {
    remainingPointCards.push(Card.createCard(leadingSuit, Rank.King, 0));
  }

  reasoning.push(`known_suit_cards_${knownSuitCards.length}`);
  reasoning.push(`known_point_cards_${knownPointCards.length}`);
  reasoning.push(`remaining_fives_${remainingPoints.fives / 5}`);
  reasoning.push(`remaining_tens_${remainingPoints.tens / 10}`);
  reasoning.push(`remaining_kings_${remainingPoints.kings / 10}`);
  reasoning.push(`total_remaining_points_${totalRemainingPoints}`);

  return {
    totalPoints: totalRemainingPoints,
    pointCards: remainingPointCards,
    distribution: remainingPoints,
    reasoning,
  };
}

/**
 * Main memory analysis function - performs all three core analyses
 */
export function performMemoryAnalysis(
  leadingCards: Card[],
  gameState: GameState,
  currentPlayerId: PlayerId,
  trumpInfo: TrumpInfo,
  cardMemory: CardMemory,
): MemoryAnalysisResult {
  const leadingSuit = leadingCards[0]?.suit;

  if (!leadingSuit) {
    throw new Error("Invalid leading cards - no suit detected");
  }

  return {
    nextPlayerVoid: analyzeNextPlayerVoid(
      leadingSuit,
      gameState,
      currentPlayerId,
      trumpInfo,
      cardMemory,
    ),
    remainingPoints: analyzeRemainingPoints(
      leadingSuit,
      gameState,
      currentPlayerId,
      trumpInfo,
    ),
  };
}
