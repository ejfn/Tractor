// Trump declaration types for dealing phase declarations
import { PlayerId, Rank, Suit, Card } from './core';

export enum DeclarationType {
  Single = 'single',        // One card of trump rank
  Pair = 'pair',           // Two cards of trump rank (maximum with two decks)
  JokerPair = 'jokerPair'  // Two jokers (strongest possible)
}

export type TrumpDeclaration = {
  playerId: PlayerId;
  rank: Rank;
  suit: Suit;              // Required - must specify suit for trump rank cards
  type: DeclarationType;
  cards: Card[];           // The actual cards used for declaration
  timestamp: number;       // When the declaration was made
};

export type TrumpDeclarationState = {
  currentDeclaration?: TrumpDeclaration;  // Current winning declaration
  declarationHistory: TrumpDeclaration[]; // All declarations made this round
  declarationWindow: boolean;             // Whether declarations are currently allowed
};

/**
 * Get numeric strength of declaration type for comparison
 */
export function getDeclarationStrength(type: DeclarationType): number {
  switch (type) {
    case DeclarationType.Single:
      return 1;
    case DeclarationType.Pair:
      return 2;
    case DeclarationType.JokerPair:
      return 3;
    default:
      return 0;
  }
}

/**
 * Check if a new declaration can override the current one
 * Rules:
 * - Same player: Can only strengthen in SAME suit
 * - Different player: Can override with ANY suit if stronger combination
 * - Joker pair always beats trump rank pairs
 */
export function canOverrideDeclaration(
  current: TrumpDeclaration | undefined,
  newDeclaration: TrumpDeclaration
): boolean {
  // If no current declaration, any declaration is valid
  if (!current) {
    return true;
  }

  const currentStrength = getDeclarationStrength(current.type);
  const newStrength = getDeclarationStrength(newDeclaration.type);

  // Same player strengthening
  if (current.playerId === newDeclaration.playerId) {
    // Must be same suit AND stronger combination
    return current.suit === newDeclaration.suit && newStrength > currentStrength;
  }

  // Different player override
  // Can use any suit if stronger combination
  return newStrength > currentStrength;
}

/**
 * Validate that the cards match the declaration type
 */
export function validateDeclarationCards(
  cards: Card[],
  type: DeclarationType,
  trumpRank: Rank
): boolean {
  switch (type) {
    case DeclarationType.Single:
      return cards.length === 1 && 
             (cards[0].rank === trumpRank || cards[0].joker !== undefined);
    
    case DeclarationType.Pair:
      if (cards.length !== 2) return false;
      
      // Joker pair
      if (cards.every(card => card.joker !== undefined)) {
        return true;
      }
      
      // Trump rank pair - must be same rank and same suit
      return cards.every(card => card.rank === trumpRank) &&
             cards[0].suit === cards[1].suit;
    
    case DeclarationType.JokerPair:
      return cards.length === 2 && 
             cards.every(card => card.joker !== undefined);
    
    default:
      return false;
  }
}

/**
 * Detect possible declarations from a player's hand
 */
export function detectPossibleDeclarations(
  hand: Card[],
  trumpRank: Rank
): { type: DeclarationType; cards: Card[]; suit: Suit }[] {
  const declarations: { type: DeclarationType; cards: Card[]; suit: Suit }[] = [];

  // Check for joker pairs first (strongest)
  const jokers = hand.filter(card => card.joker !== undefined);
  if (jokers.length >= 2) {
    declarations.push({
      type: DeclarationType.JokerPair,
      cards: jokers.slice(0, 2),
      suit: Suit.Spades // Default suit for jokers, will be overridden
    });
  }

  // Check for trump rank cards grouped by suit
  const trumpCards = hand.filter(card => card.rank === trumpRank);
  const trumpBySuit: Record<string, Card[]> = {};
  
  trumpCards.forEach(card => {
    if (card.suit) {
      if (!trumpBySuit[card.suit]) {
        trumpBySuit[card.suit] = [];
      }
      trumpBySuit[card.suit].push(card);
    }
  });

  // Check each suit for pairs and singles
  Object.entries(trumpBySuit).forEach(([suit, cards]) => {
    if (cards.length >= 2) {
      // Pair available
      declarations.push({
        type: DeclarationType.Pair,
        cards: cards.slice(0, 2),
        suit: suit as Suit
      });
    } else if (cards.length === 1) {
      // Single available
      declarations.push({
        type: DeclarationType.Single,
        cards: cards,
        suit: suit as Suit
      });
    }
  });

  // Sort by strength (strongest first)
  return declarations.sort((a, b) => 
    getDeclarationStrength(b.type) - getDeclarationStrength(a.type)
  );
}