import { GameState, PlayerId, Suit } from "../types";
import {
  TrumpDeclaration,
  TrumpDeclarationState,
  DeclarationType,
  canOverrideDeclaration,
  validateDeclarationCards,
  detectPossibleDeclarations,
} from "../types/trumpDeclaration";

/**
 * Initialize trump declaration state for a new round
 */
export function initializeTrumpDeclarationState(): TrumpDeclarationState {
  return {
    currentDeclaration: undefined,
    declarationHistory: [],
    declarationWindow: true, // Start with declarations allowed
  };
}

/**
 * Make a trump declaration during the dealing phase
 */
export function makeTrumpDeclaration(
  gameState: GameState,
  playerId: PlayerId,
  declaration: Omit<TrumpDeclaration, "playerId" | "timestamp">,
): GameState {
  const newState = { ...gameState };

  // Ensure trump declaration state exists
  if (!newState.trumpDeclarationState) {
    newState.trumpDeclarationState = initializeTrumpDeclarationState();
  }

  // Create full declaration with playerId and timestamp
  const fullDeclaration: TrumpDeclaration = {
    ...declaration,
    playerId,
    timestamp: Date.now(),
  };

  // Validate the declaration cards
  if (
    !validateDeclarationCards(
      fullDeclaration.cards,
      fullDeclaration.type,
      gameState.trumpInfo.trumpRank,
    )
  ) {
    throw new Error(`Invalid declaration cards for ${fullDeclaration.type}`);
  }

  // Check if this declaration can override the current one
  if (
    !canOverrideDeclaration(
      newState.trumpDeclarationState.currentDeclaration,
      fullDeclaration,
    )
  ) {
    throw new Error("Declaration cannot override current declaration");
  }

  // Update the declaration state
  newState.trumpDeclarationState.currentDeclaration = fullDeclaration;
  newState.trumpDeclarationState.declarationHistory.push(fullDeclaration);

  // Update trump info if this is a valid declaration
  // For joker pairs (Suit.None), keep trump suit as None (no specific trump suit)
  if (fullDeclaration.suit === Suit.None) {
    newState.trumpInfo.trumpSuit = Suit.None; // No trump suit - only jokers + trump rank in all suits
  } else {
    newState.trumpInfo.trumpSuit = fullDeclaration.suit; // Regular trump rank declarations use suit
  }

  // Real-time team role changes during dealing (first round only)
  if (newState.roundNumber === 1) {
    // Find the declarer player and their team
    const declarerPlayer = newState.players.find((p) => p.id === playerId);
    if (declarerPlayer) {
      const declarerTeam = declarerPlayer.team;

      // Set team roles based on current trump declarer
      newState.teams.forEach((team) => {
        if (team.id === declarerTeam) {
          team.isDefending = true; // Declarer's team defends
        } else {
          team.isDefending = false; // Other team attacks
        }
      });

      // Update round starting player to the trump declarer during round 1 dealing
      const declarerIndex = newState.players.findIndex(
        (p) => p.id === playerId,
      );
      if (declarerIndex !== -1) {
        newState.roundStartingPlayerIndex = declarerIndex;
        newState.currentPlayerIndex = declarerIndex; // Set current player immediately to prevent UI timing issues
      }
    }
  }

  return newState;
}

/**
 * Check if a player can make a declaration with their current hand
 */
export function getPlayerDeclarationOptions(
  gameState: GameState,
  playerId: PlayerId,
): { type: DeclarationType; cards: any[]; suit: any }[] {
  const player = gameState.players.find((p) => p.id === playerId);
  if (!player) {
    return [];
  }

  // Get current declaration for strengthening opportunities
  const currentDeclaration =
    gameState.trumpDeclarationState?.currentDeclaration;

  // Get all possible declarations from the player's hand
  const possibleDeclarations = detectPossibleDeclarations(
    player.hand,
    gameState.trumpInfo.trumpRank,
    currentDeclaration,
    playerId,
  );

  return possibleDeclarations.filter((declaration) => {
    const mockDeclaration: TrumpDeclaration = {
      playerId,
      rank: gameState.trumpInfo.trumpRank,
      suit: declaration.suit,
      type: declaration.type,
      cards: declaration.cards,
      timestamp: Date.now(),
    };

    // Check if declaration can override current declaration
    if (!canOverrideDeclaration(currentDeclaration, mockDeclaration)) {
      return false;
    }

    // Additional restriction for bots: joker declarations require 4+ trump rank cards
    if (
      !player.isHuman &&
      (declaration.type === DeclarationType.SmallJokerPair ||
        declaration.type === DeclarationType.BigJokerPair)
    ) {
      const trumpRankCards = player.hand.filter(
        (card) =>
          card.rank === gameState.trumpInfo.trumpRank &&
          card.joker === undefined,
      );
      return trumpRankCards.length >= 4;
    }

    return true;
  });
}

/**
 * Close the declaration window (no more declarations allowed)
 */
export function closeDeclarationWindow(gameState: GameState): GameState {
  const newState = { ...gameState };

  if (newState.trumpDeclarationState) {
    newState.trumpDeclarationState.declarationWindow = false;
  }

  return newState;
}

/**
 * Finalize trump declaration and transition to next phase
 * This applies the final declaration to the game state
 */
export function finalizeTrumpDeclaration(gameState: GameState): GameState {
  const newState = { ...gameState };

  if (newState.trumpDeclarationState?.currentDeclaration) {
    const finalDeclaration = newState.trumpDeclarationState.currentDeclaration;

    // Apply the final trump declaration to trumpInfo
    // Handle Suit.None the same way as during declaration
    if (finalDeclaration.suit === Suit.None) {
      newState.trumpInfo.trumpSuit = Suit.None; // No trump suit for joker pairs
    } else {
      newState.trumpInfo.trumpSuit = finalDeclaration.suit; // Regular trump rank declarations
    }
  } else {
    // No one declared trump during dealing - set to Suit.None (no trump game)
    newState.trumpInfo.trumpSuit = Suit.None;
  }

  // Close the declaration window
  if (newState.trumpDeclarationState) {
    newState.trumpDeclarationState.declarationWindow = false;
  }

  return newState;
}

/**
 * Get the current trump declaration status for display
 */
export function getTrumpDeclarationStatus(gameState: GameState): {
  hasDeclaration: boolean;
  declarer?: PlayerId;
  type?: DeclarationType;
  suit?: any;
  declarationCount: number;
} {
  const declarationState = gameState.trumpDeclarationState;

  if (!declarationState?.currentDeclaration) {
    return {
      hasDeclaration: false,
      declarationCount: declarationState?.declarationHistory.length || 0,
    };
  }

  const current = declarationState.currentDeclaration;
  return {
    hasDeclaration: true,
    declarer: current.playerId,
    type: current.type,
    suit: current.suit,
    declarationCount: declarationState.declarationHistory.length,
  };
}

/**
 * Check if declarations are currently allowed
 */
export function areDeclarationsAllowed(gameState: GameState): boolean {
  return gameState.trumpDeclarationState?.declarationWindow ?? false;
}
