/**
 * Card suit enumeration
 */
export enum Suit {
  Hearts = "Hearts",
  Diamonds = "Diamonds",
  Clubs = "Clubs",
  Spades = "Spades",
  None = "None", // For joker pair declarations - no trump suit
}

/**
 * Card rank enumeration
 */
export enum Rank {
  None = "None", // For jokers - no rank
  Two = "2",
  Three = "3",
  Four = "4",
  Five = "5",
  Six = "6",
  Seven = "7",
  Eight = "8",
  Nine = "9",
  Ten = "10",
  Jack = "J",
  Queen = "Q",
  King = "K",
  Ace = "A",
}

/**
 * Joker type enumeration
 */
export enum JokerType {
  Small = "Small",
  Big = "Big",
}

/**
 * Deck identifier for 2-deck Tractor game
 */
export type DeckId = 0 | 1;

/**
 * Trump information for determining trump cards
 */
export type TrumpInfo = {
  trumpRank: Rank;
  trumpSuit?: Suit; // undefined = not declared, Suit.None = joker pairs, specific suit = trump rank declarations
};

/**
 * Card class with proper identity management for 2-deck Tractor game
 *
 * Features:
 * - Constructor overloads for regular cards and jokers
 * - cardId: identity without deck info (e.g., "Hearts_A")
 * - id: unique instance ID with deck (e.g., "Hearts_A_1")
 * - isIdenticalTo(): reliable pair validation
 */
export class Card {
  // Core card identity
  readonly suit: Suit;
  readonly rank: Rank;
  readonly joker?: JokerType;
  readonly points: number;

  // Deck instance info
  readonly deckId: DeckId; // 0 or 1 (deck identifier)

  // Computed properties
  readonly cardId: string; // Card identity without deck: "Hearts_A", "Big_Joker"
  readonly id: string; // Full unique ID with deck: "Hearts_A_1", "Big_Joker_2"

  // Private constructor to prevent direct instantiation
  private constructor(
    suit: Suit,
    rank: Rank,
    joker: JokerType | undefined,
    deckId: DeckId,
  ) {
    this.suit = suit;
    this.rank = rank;
    this.joker = joker;
    this.deckId = deckId;

    // Calculate points based on rank
    if (rank === Rank.Five) {
      this.points = 5;
    } else if (rank === Rank.Ten || rank === Rank.King) {
      this.points = 10;
    } else {
      this.points = 0;
    }

    // Generate card identity
    if (joker) {
      this.cardId = `${joker}_Joker`;
    } else {
      this.cardId = `${suit}_${rank}`;
    }

    // Generate unique instance ID
    this.id = `${this.cardId}_${deckId}`;
  }

  /**
   * Create a regular playing card
   */
  static createCard(suit: Suit, rank: Rank, deckId: DeckId): Card {
    return new Card(suit, rank, undefined, deckId);
  }

  /**
   * Create a joker card
   */
  static createJoker(jokerType: JokerType, deckId: DeckId): Card {
    return new Card(Suit.None, Rank.None, jokerType, deckId);
  }

  /**
   * Create a pair of identical cards from different decks
   * Returns [Card from deck 0, Card from deck 1]
   */
  static createPair(suit: Suit, rank: Rank): [Card, Card] {
    return [
      new Card(suit, rank, undefined, 0),
      new Card(suit, rank, undefined, 1),
    ];
  }

  /**
   * Create a pair of identical jokers from different decks
   * Returns [Joker from deck 0, Joker from deck 1]
   */
  static createJokerPair(jokerType: JokerType): [Card, Card] {
    return [
      new Card(Suit.None, Rank.None, jokerType, 0),
      new Card(Suit.None, Rank.None, jokerType, 1),
    ];
  }

  /**
   * Create a clone of this card with identical properties
   */
  clone(): Card {
    return new Card(this.suit, this.rank, this.joker, this.deckId);
  }

  /**
   * Check if this card can form a pair with another card
   * Two cards are identical if they have the same cardId (same suit and rank)
   * This is the key method that fixes the pair formation bug
   */
  isIdenticalTo(other: Card): boolean {
    return this.cardId === other.cardId;
  }

  /**
   * Check if this card is trump given the current trump info
   */
  isTrump(trumpInfo: TrumpInfo): boolean {
    // Jokers are always trump
    if (this.joker) return true;

    // Trump rank cards are trump regardless of suit (but not Rank.None)
    if (this.rank !== Rank.None && this.rank === trumpInfo.trumpRank)
      return true;

    // Trump suit cards are trump (but not Suit.None)
    if (this.suit !== Suit.None && this.suit === trumpInfo.trumpSuit)
      return true;

    return false;
  }

  /**
   * String representation of the card
   */
  toString(): string {
    if (this.joker) {
      return `${this.joker} Joker (${this.deckId})`;
    } else {
      return `${this.rank}${
        this.suit === Suit.Hearts
          ? "♥"
          : this.suit === Suit.Diamonds
            ? "♦"
            : this.suit === Suit.Clubs
              ? "♣"
              : this.suit === Suit.Spades
                ? "♠"
                : "?"
      } (${this.deckId})`;
    }
  }

  /**
   * Get a short display name for the card
   */
  getDisplayName(): string {
    if (this.joker) {
      return this.joker === JokerType.Big ? "BJ" : "SJ";
    } else {
      const suitSymbol =
        this.suit === Suit.Hearts
          ? "♥"
          : this.suit === Suit.Diamonds
            ? "♦"
            : this.suit === Suit.Clubs
              ? "♣"
              : this.suit === Suit.Spades
                ? "♠"
                : "?";
      return `${this.rank}${suitSymbol}`;
    }
  }
}

// Combination types for valid plays
export enum ComboType {
  Single = "Single",
  Pair = "Pair",
  Tractor = "Tractor", // Consecutive pairs of same suit
}

export type Combo = {
  type: ComboType;
  cards: Card[];
  value: number; // Relative hand strength for comparison
  isBreakingPair?: boolean; // Whether this combo breaks up a valuable pair
};
