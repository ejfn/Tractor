import { isTrump } from "../game/cardValue";
import {
  Card,
  GameContext,
  GameState,
  JokerType,
  PlayerId,
  PointPressure,
  Rank,
  Suit,
  TrickPosition,
  TrickWinnerAnalysis,
  TrumpInfo,
} from "../types";
import {
  createMemoryContext,
  getNextPlayerId,
  isNextPlayerVoidInSuit,
} from "./aiCardMemory";

/**
 * Analyzes the current game state to provide strategic context for AI decision making
 */

export function createGameContext(
  gameState: GameState,
  playerId: PlayerId,
): GameContext {
  // Core game context
  const isAttackingTeam = isPlayerOnAttackingTeam(gameState, playerId);
  const currentPoints = getCurrentAttackingPoints(gameState);
  const cardsRemaining = calculateCardsRemaining(gameState);

  // Analyze current trick winner for enhanced strategy (only if trick exists)
  const trickWinnerAnalysis = gameState.currentTrick
    ? analyzeTrickWinner(gameState, playerId)
    : undefined;
  const trickPosition = getTrickPosition(gameState, playerId);
  const pointPressure = calculatePointPressure(currentPoints, isAttackingTeam);

  // Create memory context (now returns MemoryContext directly)
  const memoryContext = createMemoryContext(gameState);

  // Calculate nextPlayerVoidLed (CRITICAL: preserve exact logic)
  let nextPlayerVoidLed = false;
  const leadCard = gameState.currentTrick?.plays[0]?.cards[0];
  const nextPlayerId = getNextPlayerId(gameState, gameState.currentPlayerIndex);

  if (leadCard && nextPlayerId) {
    const leadSuit = isTrump(leadCard, gameState.trumpInfo)
      ? Suit.None
      : leadCard.suit;
    nextPlayerVoidLed = isNextPlayerVoidInSuit(
      nextPlayerId,
      leadSuit,
      memoryContext,
    );
  }

  // Update the nextPlayerVoidLed field
  memoryContext.nextPlayerVoidLed = nextPlayerVoidLed;

  // Return clean GameContext + MemoryContext structure
  return {
    // Core Game Info
    isAttackingTeam,
    currentPoints,
    cardsRemaining,
    trickPosition,
    pointPressure,
    currentPlayer: playerId,
    trumpInfo: gameState.trumpInfo,
    trickWinnerAnalysis,

    // Memory System (optional)
    memoryContext,
  };
}

/**
 * NEW: Analyzes the current trick winner for enhanced AI strategy
 * This leverages the new real-time winningPlayerId tracking
 */
export function analyzeTrickWinner(
  gameState: GameState,
  playerId: PlayerId,
): TrickWinnerAnalysis {
  const currentTrick = gameState.currentTrick;

  // This function should only be called when there's an active trick
  if (!currentTrick) {
    throw new Error("analyzeTrickWinner called with no active trick");
  }

  const currentWinner =
    currentTrick.winningPlayerId || currentTrick.plays[0]?.playerId;
  const currentPlayer = gameState.players.find((p) => p.id === playerId);
  if (!currentPlayer) {
    throw new Error(`Player ${playerId} not found`);
  }

  // Determine team relationships
  const isLeadWinning = currentWinner === currentTrick.plays[0]?.playerId;
  const isTeammateWinning = isTeammate(gameState, playerId, currentWinner);
  const isOpponentWinning = !isTeammateWinning;
  const trickPoints = currentTrick.points;

  // Determine trump situation
  const leadingCards = currentTrick.plays[0]?.cards || [];
  const winningCards =
    currentTrick.plays.find((play) => play.playerId === currentWinner)?.cards ||
    leadingCards;

  const isTrumpLead = leadingCards.some((card) =>
    isTrump(card, gameState.trumpInfo),
  );
  const isCurrentlyTrumped =
    !isTrumpLead &&
    winningCards.some((card) => isTrump(card, gameState.trumpInfo));

  return {
    currentWinner,
    isTeammateWinning,
    isOpponentWinning,
    isLeadWinning,
    isTrumpLead,
    isCurrentlyTrumped,
    trickPoints,
  };
}

/**
 * Determines if a player is on the attacking team
 * Team A (Human + Bot2) vs Team B (Bot1 + Bot3)
 * The attacking team is determined by which team is NOT defending in the current round
 */
export function isPlayerOnAttackingTeam(
  gameState: GameState,
  playerId: PlayerId,
): boolean {
  // Find the player's team
  const player = gameState.players.find((p) => p.id === playerId);
  if (!player) {
    throw new Error(`Player ${playerId} not found in game state`);
  }

  // Find the team data for this player
  const playerTeam = gameState.teams.find((team) => team.id === player.team);
  if (!playerTeam) {
    throw new Error(`Team ${player.team} not found for player ${playerId}`);
  }

  // Attacking team is the team that is NOT defending
  return !playerTeam.isDefending;
}

/**
 * Calculates total points collected by the attacking team so far
 */
export function getCurrentAttackingPoints(gameState: GameState): number {
  // Find the attacking team (the team that is NOT defending)
  const attackingTeam = gameState.teams.find((team) => !team.isDefending);

  if (!attackingTeam) {
    throw new Error("No attacking team found in game state");
  }

  // Return the current points accumulated by the attacking team
  // This includes points from all completed tricks won by the attacking team
  return attackingTeam.points;
}

/**
 * Calculates how many cards are left in the current round
 */
export function calculateCardsRemaining(gameState: GameState): number {
  // Get average cards remaining from all players
  const totalCardsRemaining = gameState.players.reduce(
    (sum, player) => sum + player.hand.length,
    0,
  );
  return Math.floor(totalCardsRemaining / 4); // Average per player
}

/**
 * Determines the player's position in the current trick
 */
export function getTrickPosition(
  gameState: GameState,
  playerId: PlayerId,
): TrickPosition {
  const { currentTrick } = gameState;

  if (!currentTrick) {
    // Player is leading
    return TrickPosition.First;
  }

  // Check if this player has already played in the trick
  const playerPlayIndex = currentTrick.plays.findIndex(
    (play) => play.playerId === playerId,
  );

  if (playerPlayIndex !== -1) {
    // Player has already played, return their actual position
    switch (playerPlayIndex) {
      case 0:
        return TrickPosition.First; // Leader
      case 1:
        return TrickPosition.Second;
      case 2:
        return TrickPosition.Third;
      case 3:
        return TrickPosition.Fourth;
      default:
        return TrickPosition.First; // Fallback
    }
  }

  // Player hasn't played yet, determine their upcoming position
  switch (currentTrick.plays.length) {
    case 0:
      return TrickPosition.First; // First player (leader)
    case 1:
      return TrickPosition.Second; // Second player (first follower)
    case 2:
      return TrickPosition.Third; // Third player (second follower)
    case 3:
      return TrickPosition.Fourth; // Fourth player (third follower)
    default:
      return TrickPosition.First; // Fallback
  }
}

/**
 * Calculates point pressure based on attacking team's progress and player's team affiliation
 *
 * Point pressure is team-specific:
 * - Attacking team: Low points = HIGH pressure (need to catch up)
 * - Defending team: Low attacking points = LOW pressure (they're winning)
 */
export function calculatePointPressure(
  currentPoints: number,
  isAttackingTeam: boolean,
): PointPressure {
  const progressRatio = currentPoints / 80;

  if (isAttackingTeam) {
    // Attacking team: pressure increases as they fall behind
    if (progressRatio < 0.3) {
      return PointPressure.HIGH; // < 24 points - need to catch up urgently
    } else if (progressRatio < 0.7) {
      return PointPressure.MEDIUM; // 24-56 points - moderate pressure
    } else {
      return PointPressure.LOW; // 56+ points - on track or ahead
    }
  } else {
    // Defending team: pressure increases as attacking team catches up
    if (progressRatio < 0.3) {
      return PointPressure.LOW; // < 24 points - defending successfully
    } else if (progressRatio < 0.7) {
      return PointPressure.MEDIUM; // 24-56 points - need to tighten defense
    } else {
      return PointPressure.HIGH; // 56+ points - attacking team close to winning
    }
  }
}

/**
 * Generate remaining unseen cards for a specific suit or trump group
 *
 * @param suit - The suit to analyze (or Suit.None for all trump cards)
 * @param context - Game context containing all necessary state and memory
 * @param gameState - Current game state
 * @returns Array of unseen cards in the specified suit/trump group
 */
export function getRemainingUnseenCards(
  suit: Suit,
  context: GameContext,
  gameState: GameState,
): Card[] {
  const currentPlayerId = context.currentPlayer;
  const trumpInfo = context.trumpInfo || gameState.trumpInfo;

  if (!trumpInfo) return [];

  // Use the memory context directly
  const cardMemory = context.memoryContext;
  const currentPlayer = gameState.players.find((p) => p.id === currentPlayerId);
  if (!currentPlayer) return [];

  // Generate all cards for the suit/trump group (from 2 decks)
  const allCardsInGroup = generateAllCardsForSuitOrTrump(suit, trumpInfo);

  // Helper to check if card belongs to the target suit/trump group
  const belongsToGroup = (card: Card): boolean =>
    suit === Suit.None
      ? isTrump(card, trumpInfo)
      : !isTrump(card, trumpInfo) && card.suit === suit;

  // Get all seen cards
  const seenCards = new Set<string>();

  // 1. All played cards from memory
  cardMemory.playedCards.forEach((card) => {
    if (belongsToGroup(card)) {
      seenCards.add(card.commonId);
    }
  });

  // 2. Current trick cards (if not already in played cards)
  const currentTrick = gameState.currentTrick;
  if (currentTrick) {
    currentTrick.plays.forEach((play) => {
      play.cards.forEach((card) => {
        if (belongsToGroup(card)) {
          seenCards.add(card.commonId);
        }
      });
    });
  }

  // 3. Current player's hand
  currentPlayer.hand.forEach((card) => {
    if (belongsToGroup(card)) {
      seenCards.add(card.commonId);
    }
  });

  // 4. Kitty cards (if current player is round starter and kitty is visible)
  const isRoundStarter =
    gameState.currentPlayerIndex === gameState.roundStartingPlayerIndex;
  if (isRoundStarter && gameState.kittyCards) {
    gameState.kittyCards.forEach((card) => {
      if (belongsToGroup(card)) {
        seenCards.add(card.commonId);
      }
    });
  }

  // Filter out seen cards
  return allCardsInGroup.filter((card) => !seenCards.has(card.commonId));
}

/**
 * Helper: Generate all cards for a suit or trump group (2 decks)
 */
function generateAllCardsForSuitOrTrump(
  suit: Suit,
  trumpInfo: TrumpInfo,
): Card[] {
  const allCards: Card[] = [];

  if (suit === Suit.None) {
    // Trump group: all trump cards
    // Add jokers (4 total: 2 big, 2 small)
    allCards.push(Card.createJoker(JokerType.Big, 0));
    allCards.push(Card.createJoker(JokerType.Big, 1));
    allCards.push(Card.createJoker(JokerType.Small, 0));
    allCards.push(Card.createJoker(JokerType.Small, 1));

    // Add trump rank cards from all suits (8 total: 2 per suit)
    [Suit.Spades, Suit.Hearts, Suit.Diamonds, Suit.Clubs].forEach((s) => {
      allCards.push(Card.createCard(s, trumpInfo.trumpRank, 0));
      allCards.push(Card.createCard(s, trumpInfo.trumpRank, 1));
    });

    // Add trump suit cards (excluding trump rank, 24 total: 2 per rank)
    if (trumpInfo.trumpSuit) {
      Object.values(Rank).forEach((rank) => {
        if (
          rank !== Rank.None &&
          rank !== trumpInfo.trumpRank &&
          trumpInfo.trumpSuit
        ) {
          allCards.push(Card.createCard(trumpInfo.trumpSuit, rank, 0));
          allCards.push(Card.createCard(trumpInfo.trumpSuit, rank, 1));
        }
      });
    }
  } else {
    // Specific non-trump suit (excluding trump rank cards, 24 total: 2 per rank)
    Object.values(Rank).forEach((rank) => {
      if (rank !== Rank.None && rank !== trumpInfo.trumpRank) {
        allCards.push(Card.createCard(suit, rank, 0));
        allCards.push(Card.createCard(suit, rank, 1));
      }
    });
  }

  return allCards;
}

function isTeammate(
  gameState: GameState,
  playerId1: PlayerId,
  playerId2: PlayerId,
): boolean {
  // Get both players from gameState
  const player1 = gameState.players.find((p) => p.id === playerId1);
  const player2 = gameState.players.find((p) => p.id === playerId2);

  if (!player1 || !player2) {
    return false;
  }

  // Players are teammates if they're on the same team
  return player1.team === player2.team;
}
