import {
  Card,
  DealingProgress,
  DeclarationOpportunity,
  GamePhase,
  GameState,
  PlayerId,
  Suit,
  canOverrideDeclaration,
  detectPossibleDeclarations,
} from "../types";
import {
  DeclarationType,
  TrumpDeclaration,
  validateDeclarationCards,
} from "../types/trumpDeclaration";
import { initializeTrumpDeclarationState } from "../utils/gameInitialization";
import { gameLogger } from "../utils/gameLogger";
import { pickupKittyCards } from "./kittyManager";

/**
 * Dealing and Trump Declaration Module
 *
 * Unified module handling the entire dealing phase including:
 * - Progressive card dealing
 * - Trump declaration opportunities and validation
 * - Declaration window management
 * - Transition to next game phase
 */

// ================================
// PROGRESSIVE DEALING FUNCTIONS
// ================================

// Deal cards to players (original all-at-once dealing for backward compatibility)
export const dealCards = (state: GameState): GameState => {
  const newState = { ...state };
  const { players, deck } = newState;

  // Calculate cards per player (leaving 8 for kitty in a 4-player game)
  const cardsPerPlayer = Math.floor((deck.length - 8) / players.length);

  players.forEach((player, index) => {
    const startIdx = index * cardsPerPlayer;
    player.hand = deck.slice(startIdx, startIdx + cardsPerPlayer);
  });

  // Set kitty cards (bottom 8 cards)
  newState.kittyCards = deck.slice(deck.length - 8);

  // Update game phase - start with dealing for progressive dealing system
  newState.gamePhase = GamePhase.Dealing;

  return newState;
};

// Progressive dealing with trump declaration opportunities
export const dealNextCard = (state: GameState): GameState => {
  const newState = { ...state };
  const { players, deck } = newState;

  // Initialize dealing state if not present
  if (!newState.dealingState) {
    const cardsPerPlayer = Math.floor((deck.length - 8) / players.length);
    // Round 1 always starts from human player (index 0), round 2+ uses roundStartingPlayerIndex
    const startingPlayerIndex =
      newState.roundNumber === 1
        ? 0 // Round 1 always starts from human
        : newState.roundStartingPlayerIndex; // Round 2+ uses round starting player

    // Set up kitty cards (last 8 cards from deck) - CRITICAL for progressive dealing
    newState.kittyCards = deck.slice(deck.length - 8);

    newState.dealingState = {
      cardsPerPlayer,
      currentRound: 0,
      currentDealingPlayerIndex: startingPlayerIndex,
      startingDealingPlayerIndex: startingPlayerIndex,
      totalRounds: cardsPerPlayer,
      completed: false,
      kittyDealt: false,
      paused: false,
      pauseReason: undefined,
      lastDealtCard: undefined,
    };

    // Log dealing phase start
    gameLogger.debug(
      "dealing_start",
      {
        roundNumber: newState.roundNumber,
        cardsPerPlayer,
        totalRounds: cardsPerPlayer,
        startingPlayerIndex,
        startingPlayer: newState.players[startingPlayerIndex]?.id,
        deckSize: deck.length,
        kittySize: newState.kittyCards.length,
      },
      `Dealing started for round ${newState.roundNumber}: ${cardsPerPlayer} cards per player, starting with ${newState.players[startingPlayerIndex]?.id}`,
    );
  }

  const dealingState = newState.dealingState;

  // Check if dealing is paused
  if (dealingState.paused) {
    return newState; // No changes when paused
  }

  // Check if dealing is complete
  if (isDealingComplete(newState)) {
    dealingState.completed = true;
    return newState; // No more cards to deal
  }

  // Calculate current dealt cards count
  const totalCardsInHands = players.reduce(
    (sum, player) => sum + player.hand.length,
    0,
  );
  const maxCardsToPlayers =
    Math.floor((deck.length - 8) / players.length) * players.length;

  // Deal next card
  const currentPlayer = players[dealingState.currentDealingPlayerIndex];
  if (currentPlayer && totalCardsInHands < maxCardsToPlayers) {
    const cardToDeal = deck[totalCardsInHands];
    currentPlayer.hand.push(cardToDeal);

    // Store reference to last dealt card
    dealingState.lastDealtCard = cardToDeal;

    // Move to next player for next card
    dealingState.currentDealingPlayerIndex =
      (dealingState.currentDealingPlayerIndex + 1) % players.length;

    // Check if we completed a round of dealing to all players
    const newTotalCards = totalCardsInHands + 1;
    if (newTotalCards % players.length === 0) {
      dealingState.currentRound++;
    }
  }

  return newState;
};

// Check if dealing is complete
export const isDealingComplete = (state: GameState): boolean => {
  if (!state.dealingState) return false;

  const { players, deck } = state;
  const cardsPerPlayer = Math.floor((deck.length - 8) / players.length);
  const totalCardsToPlayer = cardsPerPlayer * players.length;

  // Calculate current cards dealt by counting cards in hands
  const totalCardsInHands = players.reduce(
    (sum, player) => sum + player.hand.length,
    0,
  );

  return totalCardsInHands >= totalCardsToPlayer;
};

// Get dealing progress
export const getDealingProgress = (state: GameState): DealingProgress => {
  if (!state.dealingState) {
    return { current: 0, total: 0 };
  }

  const { players, deck } = state;
  const cardsPerPlayer = Math.floor((deck.length - 8) / players.length);
  const totalCardsToPlayer = cardsPerPlayer * players.length;

  // Calculate current cards dealt by counting cards in hands
  const totalCardsInHands = players.reduce(
    (sum, player) => sum + player.hand.length,
    0,
  );

  return {
    current: totalCardsInHands,
    total: totalCardsToPlayer,
  };
};

// Check for trump declaration opportunities
export const checkDeclarationOpportunities = (
  state: GameState,
): DeclarationOpportunity[] => {
  if (!state.dealingState || !state.dealingState.lastDealtCard) {
    return [];
  }

  const opportunities: DeclarationOpportunity[] = [];

  // Check each player for trump declaration opportunities
  state.players.forEach((player) => {
    const playerOpportunities = getPlayerDeclarationOptions(state, player.id);
    if (playerOpportunities.length > 0) {
      opportunities.push(...playerOpportunities);
    }
  });

  return opportunities;
};

// Get the last dealt card
export const getLastDealtCard = (state: GameState): Card | undefined => {
  return state.dealingState?.lastDealtCard;
};

// Pause dealing (for human trump declarations)
export const pauseDealing = (state: GameState, reason: string): GameState => {
  const newState = { ...state };
  if (newState.dealingState) {
    newState.dealingState.paused = true;
    newState.dealingState.pauseReason = reason;
  }
  return newState;
};

// Resume dealing after declaration decisions
export const resumeDealing = (state: GameState): GameState => {
  const newState = { ...state };
  if (newState.dealingState) {
    newState.dealingState.paused = false;
    newState.dealingState.pauseReason = undefined;
  }
  return newState;
};

// Check if dealing is currently paused
export const isDealingPaused = (state: GameState): boolean => {
  return state.dealingState?.paused ?? false;
};

// Get the reason why dealing is paused
export const getDealingPauseReason = (state: GameState): string | undefined => {
  return state.dealingState?.pauseReason;
};

// ================================
// TRUMP DECLARATION FUNCTIONS
// ================================

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

  // Log the trump declaration with detailed information
  gameLogger.debug(
    "trump_declared",
    {
      playerId,
      declarationType: fullDeclaration.type,
      suit: fullDeclaration.suit,
      rank: fullDeclaration.rank,
      cards: fullDeclaration.cards.map((card) => card.toString()),
      roundNumber: newState.roundNumber,
      dealingProgress: getDealingProgress(newState),
      previousDeclaration:
        newState.trumpDeclarationState.declarationHistory.length > 1
          ? newState.trumpDeclarationState.declarationHistory[
              newState.trumpDeclarationState.declarationHistory.length - 2
            ]
          : null,
    },
    `Trump declared by ${playerId}: ${fullDeclaration.type} with ${fullDeclaration.cards.map((c) => c.toString()).join(", ")}`,
  );

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

        gameLogger.debug(
          "team_roles_updated",
          {
            playerId,
            declarerTeam,
            defendingTeamId: declarerTeam,
            attackingTeamId: newState.teams.find((t) => t.id !== declarerTeam)
              ?.id,
            roundStartingPlayerIndex: declarerIndex,
            roundNumber: newState.roundNumber,
          },
          `Round 1: Trump declarer ${playerId} team ${declarerTeam} now defending, will start round`,
        );
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
): DeclarationOpportunity[] {
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

    gameLogger.info(
      "trump_finalized",
      {
        finalDeclaration: {
          playerId: finalDeclaration.playerId,
          type: finalDeclaration.type,
          suit: finalDeclaration.suit,
          rank: finalDeclaration.rank,
          cards: finalDeclaration.cards.map((card) => card.toString()),
        },
        trumpInfo: {
          trumpRank: newState.trumpInfo.trumpRank,
          trumpSuit:
            finalDeclaration.suit === Suit.None
              ? Suit.None
              : finalDeclaration.suit,
        },
        roundNumber: newState.roundNumber,
        totalDeclarations:
          newState.trumpDeclarationState.declarationHistory.length,
      },
      `Trump finalized: ${finalDeclaration.type} by ${finalDeclaration.playerId}, trump is ${finalDeclaration.suit === Suit.None ? "jokers only" : finalDeclaration.suit}`,
    );

    // Apply the final trump declaration to trumpInfo
    // Handle Suit.None the same way as during declaration
    if (finalDeclaration.suit === Suit.None) {
      newState.trumpInfo.trumpSuit = Suit.None; // No trump suit for joker pairs
    } else {
      newState.trumpInfo.trumpSuit = finalDeclaration.suit; // Regular trump rank declarations
    }
  } else {
    // No one declared trump during dealing - set to Suit.None (no trump game)
    gameLogger.debug(
      "no_trump_declared",
      {
        trumpInfo: {
          trumpRank: newState.trumpInfo.trumpRank,
          trumpSuit: Suit.None,
        },
        roundNumber: newState.roundNumber,
      },
      "No trump declared during dealing, default to no trump game",
    );

    newState.trumpInfo.trumpSuit = Suit.None;
  }

  // Close the declaration window
  if (newState.trumpDeclarationState) {
    newState.trumpDeclarationState.declarationWindow = false;
  }

  // Handle kitty cards pickup - round starting player always gets the kitty
  // The round starting player (who leads the first trick) picks up the 8 kitty cards
  // Note: roundStartingPlayerIndex is set by:
  //   - First round: trump declarer (set in makeTrumpDeclaration)
  //   - Later rounds: determined by previous round results (set in prepareNextRound)
  if (newState.kittyCards.length === 8) {
    const roundStartingPlayerId =
      newState.players[newState.roundStartingPlayerIndex].id;

    // Round starting player picks up kitty cards and enters KittySwap phase
    const { newState: stateWithKitty } = pickupKittyCards(
      newState,
      roundStartingPlayerId,
    );
    return stateWithKitty;
  } else {
    // No kitty cards available - transition directly to Playing phase
    newState.gamePhase = GamePhase.Playing;
    return newState;
  }
}

/**
 * Check if declarations are currently allowed
 */
export function areDeclarationsAllowed(gameState: GameState): boolean {
  return gameState.trumpDeclarationState?.declarationWindow ?? false;
}
