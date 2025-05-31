// Trump declaration types for dealing phase declarations
import { PlayerId, Rank, Suit, Card, JokerType } from "./core";

export enum DeclarationType {
  Single = "single", // One card of trump rank
  Pair = "pair", // Two cards of trump rank (maximum with two decks)
  SmallJokerPair = "smallJokerPair", // Two small jokers
  BigJokerPair = "bigJokerPair", // Two big jokers (strongest possible)
}

export type TrumpDeclaration = {
  playerId: PlayerId;
  rank: Rank;
  suit: Suit; // Suit.None for joker pairs, specific suit for trump rank cards
  type: DeclarationType;
  cards: Card[]; // The actual cards used for declaration
  timestamp: number; // When the declaration was made
};

export type TrumpDeclarationState = {
  currentDeclaration?: TrumpDeclaration; // Current winning declaration
  declarationHistory: TrumpDeclaration[]; // All declarations made this round
  declarationWindow: boolean; // Whether declarations are currently allowed
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
    case DeclarationType.SmallJokerPair:
      return 3;
    case DeclarationType.BigJokerPair:
      return 4;
    default:
      return 0;
  }
}

/**
 * Check if a new declaration can override the current one
 * Rules:
 * - Same player: Can only strengthen in SAME suit (cannot redeclare same rank in different suit)
 * - Different player: Can override with ANY suit if stronger combination
 * - Only same jokers make pairs (SmallJokerPair vs BigJokerPair)
 * - Joker pairs always beat trump rank pairs
 */
export function canOverrideDeclaration(
  current: TrumpDeclaration | undefined,
  newDeclaration: TrumpDeclaration,
): boolean {
  // If no current declaration, any declaration is valid
  if (!current) {
    return true;
  }

  const currentStrength = getDeclarationStrength(current.type);
  const newStrength = getDeclarationStrength(newDeclaration.type);

  // Same player strengthening
  if (current.playerId === newDeclaration.playerId) {
    // Rule 3: Cannot redeclare same rank in different suit
    // Must be same suit AND stronger combination
    return (
      current.suit === newDeclaration.suit && newStrength > currentStrength
    );
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
  trumpRank: Rank,
): boolean {
  switch (type) {
    case DeclarationType.Single:
      return (
        cards.length === 1 &&
        cards[0].rank === trumpRank &&
        cards[0].joker === undefined
      );

    case DeclarationType.Pair:
      if (cards.length !== 2) return false;

      // Trump rank pair - must be same rank and same suit (no jokers)
      return (
        cards.every(
          (card) => card.rank === trumpRank && card.joker === undefined,
        ) && cards[0].suit === cards[1].suit
      );

    case DeclarationType.SmallJokerPair:
      return (
        cards.length === 2 &&
        cards.every((card) => card.joker === JokerType.Small)
      );

    case DeclarationType.BigJokerPair:
      return (
        cards.length === 2 &&
        cards.every((card) => card.joker === JokerType.Big)
      );

    default:
      return false;
  }
}

/**
 * Check if player can strengthen their current declaration
 * Rule: Single can be upgraded to pair if player gets another matching card
 */
function checkStrengtheningOpportunities(
  hand: Card[],
  currentDeclaration: TrumpDeclaration,
  trumpRank: Rank,
): { type: DeclarationType; cards: Card[]; suit: Suit } | null {
  // Only allow strengthening from Single to Pair for trump rank cards
  if (currentDeclaration.type !== DeclarationType.Single) {
    return null; // Can't strengthen pairs or joker pairs further
  }

  // Find trump rank cards in the same suit as current declaration
  const matchingCards = hand.filter(
    (card) =>
      card.rank === trumpRank &&
      card.suit === currentDeclaration.suit &&
      card.joker === undefined,
  );

  // Need at least 2 cards to make a pair
  if (matchingCards.length >= 2) {
    return {
      type: DeclarationType.Pair,
      cards: matchingCards.slice(0, 2),
      suit: currentDeclaration.suit,
    };
  }

  return null;
}

/**
 * Detect possible declarations from a player's hand
 * Includes strengthening opportunities if player is current declarer
 */
export function detectPossibleDeclarations(
  hand: Card[],
  trumpRank: Rank,
  currentDeclaration?: TrumpDeclaration,
  playerId?: PlayerId,
): { type: DeclarationType; cards: Card[]; suit: Suit }[] {
  const declarations: { type: DeclarationType; cards: Card[]; suit: Suit }[] =
    [];

  // Check for strengthening opportunities if this player is the current declarer
  if (
    currentDeclaration &&
    playerId &&
    currentDeclaration.playerId === playerId
  ) {
    const canStrengthen = checkStrengtheningOpportunities(
      hand,
      currentDeclaration,
      trumpRank,
    );
    if (canStrengthen) {
      declarations.push(canStrengthen);
    }
    // If this player already has a declaration, only return strengthening opportunities
    // Cannot make new declarations once you've declared (except strengthening single → pair)
    return declarations;
  }

  // Check for joker pairs first (strongest) - only if no current declaration from this player
  const bigJokers = hand.filter((card) => card.joker === JokerType.Big);
  const smallJokers = hand.filter((card) => card.joker === JokerType.Small);

  // Big joker pair (strongest) - No trump suit, only jokers + trump rank in all suits
  if (bigJokers.length >= 2) {
    declarations.push({
      type: DeclarationType.BigJokerPair,
      cards: bigJokers.slice(0, 2),
      suit: Suit.None, // No trump suit for joker pairs
    });
  }

  // Small joker pair - No trump suit, only jokers + trump rank in all suits
  if (smallJokers.length >= 2) {
    declarations.push({
      type: DeclarationType.SmallJokerPair,
      cards: smallJokers.slice(0, 2),
      suit: Suit.None, // No trump suit for joker pairs
    });
  }

  // Check for trump rank cards grouped by suit
  const trumpCards = hand.filter((card) => card.rank === trumpRank);
  const trumpBySuit: Record<string, Card[]> = {};

  trumpCards.forEach((card) => {
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
      // Pair available - check if we already have this from strengthening
      const alreadyHasPair = declarations.some(
        (decl) => decl.type === DeclarationType.Pair && decl.suit === suit,
      );
      if (!alreadyHasPair) {
        declarations.push({
          type: DeclarationType.Pair,
          cards: cards.slice(0, 2),
          suit: suit as Suit,
        });
      }
    } else if (cards.length === 1) {
      // Single available - check if we already have this from strengthening
      const alreadyHasSingle = declarations.some(
        (decl) => decl.type === DeclarationType.Single && decl.suit === suit,
      );
      if (!alreadyHasSingle) {
        declarations.push({
          type: DeclarationType.Single,
          cards: cards,
          suit: suit as Suit,
        });
      }
    }
  });

  // Sort by strength (strongest first)
  return declarations.sort(
    (a, b) => getDeclarationStrength(b.type) - getDeclarationStrength(a.type),
  );
}
