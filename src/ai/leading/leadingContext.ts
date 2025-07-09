import { Card, GameState, PlayerId, Suit, TrumpInfo } from "../../types";
import { createCardMemory } from "../aiCardMemory";
import { isTrump } from "../../game/cardValue";

/**
 * Context information for leading strategy scoring
 */
export interface LeadingContext {
  handLength: number; // Number of cards in each player's hand (same for all)
  leadTrumpPairsPlayed: number; // Number of trump pairs played as leads (including tractor pairs)
  trumpCardsPlayed: number; // Total trump cards played so far
  playerTrumpPairs: number; // Total trump pairs in current player's hand
  teammate: {
    voidSuits: Set<Suit>; // Which suits teammate is void in
    isTrumpVoid: boolean; // Whether teammate is void in trump
  };
  opponents: {
    voidSuits: Set<Suit>; // Which suits ALL opponents are void in
    isTrumpVoid: boolean; // Whether ALL opponents are void in trump
  };
}

/**
 * Count trump pairs in a hand
 */
function countTrumpPairsInHand(hand: Card[], trumpInfo: TrumpInfo): number {
  // Get trump cards only
  const trumpCards = hand.filter((card) => isTrump(card, trumpInfo));

  // Count identical trump cards
  const cardCounts: { [key: string]: number } = {};
  trumpCards.forEach((card) => {
    cardCounts[card.commonId] = (cardCounts[card.commonId] || 0) + 1;
  });

  // Count pairs (each group of identical cards with count >= 2 contributes 1 pair)
  let pairCount = 0;
  Object.values(cardCounts).forEach((count) => {
    if (count >= 2) {
      pairCount += 1;
    }
  });

  return pairCount;
}

/**
 * Collect basic context information for leading strategy scoring
 */
export function collectLeadingContext(
  gameState: GameState,
  playerId: PlayerId,
): LeadingContext {
  const memory = createCardMemory(gameState);
  const playerMemories = memory.playerMemories;

  // Find teammate and opponents from gameState
  const { teammateId, opponentIds } = getTeammates(playerId, gameState);

  // Collect teammate void status
  const teammateVoids = new Set<Suit>();
  let teammateIsTrumpVoid = false;

  const teammateMemory = playerMemories[teammateId];
  if (teammateMemory) {
    // Add confirmed suit voids
    teammateMemory.suitVoids.forEach((suit) => teammateVoids.add(suit));
    // Check trump void
    teammateIsTrumpVoid = teammateMemory.trumpVoid;
  }

  // Collect opponent void status (ALL opponents must be void)
  const opponentVoids = new Set<Suit>();
  let allOpponentsTrumpVoid = true;

  // Check each suit to see if ALL opponents are void
  for (const suit of [Suit.Hearts, Suit.Diamonds, Suit.Clubs, Suit.Spades]) {
    const allOpponentsVoidInSuit = opponentIds.every((opponentId) => {
      const opponentMemory = playerMemories[opponentId];
      return opponentMemory?.suitVoids.has(suit) || false;
    });

    if (allOpponentsVoidInSuit) {
      opponentVoids.add(suit);
    }
  }

  // Check if ALL opponents are trump void
  allOpponentsTrumpVoid = opponentIds.every((opponentId) => {
    const opponentMemory = playerMemories[opponentId];
    return opponentMemory?.trumpVoid || false;
  });

  // Get hand length (same for all players)
  const currentPlayer = gameState.players.find((p) => p.id === playerId);
  const currentPlayerHand = currentPlayer?.hand.length || 0;

  // Count trump pairs in current player's hand
  const playerTrumpPairs = countTrumpPairsInHand(
    currentPlayer?.hand || [],
    gameState.trumpInfo,
  );

  return {
    handLength: currentPlayerHand,
    leadTrumpPairsPlayed: memory.leadTrumpPairsPlayed,
    trumpCardsPlayed: memory.trumpCardsPlayed,
    playerTrumpPairs,
    teammate: {
      voidSuits: teammateVoids,
      isTrumpVoid: teammateIsTrumpVoid,
    },
    opponents: {
      voidSuits: opponentVoids,
      isTrumpVoid: allOpponentsTrumpVoid,
    },
  };
}

/**
 * Get teammate and opponent IDs for a given player from gameState
 */
function getTeammates(
  playerId: PlayerId,
  gameState: GameState,
): {
  teammateId: PlayerId;
  opponentIds: PlayerId[];
} {
  // Find the player's team from gameState
  const currentPlayer = gameState.players.find((p) => p.id === playerId);
  if (!currentPlayer) {
    throw new Error(`Player ${playerId} not found in gameState`);
  }

  const currentTeamId = currentPlayer.team;

  // Find teammate (same team, different player)
  const teammate = gameState.players.find(
    (p) => p.team === currentTeamId && p.id !== playerId,
  );
  if (!teammate) {
    throw new Error(`Teammate not found for player ${playerId}`);
  }

  // Find opponents (different team)
  const opponents = gameState.players.filter((p) => p.team !== currentTeamId);
  if (opponents.length !== 2) {
    throw new Error(`Expected 2 opponents, found ${opponents.length}`);
  }

  return {
    teammateId: teammate.id,
    opponentIds: opponents.map((p) => p.id),
  };
}
