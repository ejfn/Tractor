import { GameState, PlayerId, Rank } from '../types';
import {
  TrumpDeclaration,
  TrumpDeclarationState,
  DeclarationType,
  canOverrideDeclaration,
  validateDeclarationCards,
  detectPossibleDeclarations
} from '../types/trumpDeclaration';

/**
 * Initialize trump declaration state for a new round
 */
export function initializeTrumpDeclarationState(): TrumpDeclarationState {
  return {
    currentDeclaration: undefined,
    declarationHistory: [],
    declarationWindow: true // Start with declarations allowed
  };
}

/**
 * Make a trump declaration during the dealing phase
 */
export function makeTrumpDeclaration(
  gameState: GameState,
  playerId: PlayerId,
  declaration: Omit<TrumpDeclaration, 'playerId' | 'timestamp'>
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
    timestamp: Date.now()
  };

  // Validate the declaration cards
  if (!validateDeclarationCards(
    fullDeclaration.cards,
    fullDeclaration.type,
    gameState.trumpInfo.trumpRank
  )) {
    throw new Error(`Invalid declaration cards for ${fullDeclaration.type}`);
  }

  // Check if this declaration can override the current one
  if (!canOverrideDeclaration(
    newState.trumpDeclarationState.currentDeclaration,
    fullDeclaration
  )) {
    throw new Error('Declaration cannot override current declaration');
  }

  // Update the declaration state
  newState.trumpDeclarationState.currentDeclaration = fullDeclaration;
  newState.trumpDeclarationState.declarationHistory.push(fullDeclaration);

  // Update trump info if this is a valid declaration
  newState.trumpInfo.trumpSuit = fullDeclaration.suit;
  newState.trumpInfo.declared = true;
  newState.trumpInfo.declarerPlayerId = playerId;

  return newState;
}

/**
 * Check if a player can make a declaration with their current hand
 */
export function getPlayerDeclarationOptions(
  gameState: GameState,
  playerId: PlayerId
): { type: DeclarationType; cards: any[]; suit: any }[] {
  const player = gameState.players.find(p => p.id === playerId);
  if (!player) {
    return [];
  }

  // Get all possible declarations from the player's hand
  const possibleDeclarations = detectPossibleDeclarations(
    player.hand,
    gameState.trumpInfo.trumpRank
  );

  // Filter out declarations that cannot override the current one
  const currentDeclaration = gameState.trumpDeclarationState?.currentDeclaration;
  
  return possibleDeclarations.filter(declaration => {
    const mockDeclaration: TrumpDeclaration = {
      playerId,
      rank: gameState.trumpInfo.trumpRank,
      suit: declaration.suit,
      type: declaration.type,
      cards: declaration.cards,
      timestamp: Date.now()
    };
    
    return canOverrideDeclaration(currentDeclaration, mockDeclaration);
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
    newState.trumpInfo.trumpSuit = finalDeclaration.suit;
    newState.trumpInfo.declared = true;
    newState.trumpInfo.declarerPlayerId = finalDeclaration.playerId;
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
      declarationCount: declarationState?.declarationHistory.length || 0
    };
  }

  const current = declarationState.currentDeclaration;
  return {
    hasDeclaration: true,
    declarer: current.playerId,
    type: current.type,
    suit: current.suit,
    declarationCount: declarationState.declarationHistory.length
  };
}

/**
 * Check if declarations are currently allowed
 */
export function areDeclarationsAllowed(gameState: GameState): boolean {
  return gameState.trumpDeclarationState?.declarationWindow ?? false;
}