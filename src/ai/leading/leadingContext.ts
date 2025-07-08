import { GameState, PlayerId, Suit } from "../../types";
import { createCardMemory } from "../aiCardMemory";

/**
 * Context information for leading strategy scoring
 */
export interface LeadingContext {
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

  return {
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
