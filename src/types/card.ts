/**
 * Card suit enumeration
 */
export enum Suit {
  Hearts = "Hearts",
  Diamonds = "Diamonds",
  Clubs = "Clubs",
  Spades = "Spades",
  None = "None", // For trump multi-combos and joker pair declarations
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
 * Playable ranks - all ranks except None (which is used for jokers)
 */
export type PlayableRank = Exclude<Rank, Rank.None>;

/**
 * Playable suits - all suits except None (which is used for trump multi-combos)
 */
export type PlayableSuit = Exclude<Suit, Suit.None>;

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
 * - commonId: identity without deck info (e.g., "Hearts_A")
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
  readonly commonId: string; // Card identity without deck: "Hearts_A", "Big_Joker"
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
      this.commonId = `${joker}_Joker`;
    } else {
      this.commonId = `${suit}_${rank}`;
    }

    // Generate unique instance ID
    this.id = `${this.commonId}_${deckId}`;
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
   * Deserialize Card objects from JSON back to Card class instances
   * This is crucial because JSON.parse creates plain objects, losing Card methods
   */
  static deserializeCard(cardData: unknown): Card {
    const data = cardData as Record<string, unknown>;
    if (data.joker) {
      // This is a joker card
      return Card.createJoker(data.joker as JokerType, data.deckId as DeckId);
    } else {
      // This is a regular card
      return Card.createCard(
        data.suit as Suit,
        data.rank as Rank,
        data.deckId as DeckId,
      );
    }
  }

  /**
   * Deep deserialization of any object that may contain Card objects
   * Recursively traverses the object and converts all Card-like objects to proper Card instances
   */
  static deepDeserializeCards(obj: unknown): unknown {
    if (obj === null || obj === undefined) {
      return obj;
    }

    // If this looks like a Card object, deserialize it
    if (Card.isCardLike(obj)) {
      return Card.deserializeCard(obj);
    }

    // If it's an array, recursively deserialize each element
    if (Array.isArray(obj)) {
      return obj.map(Card.deepDeserializeCards);
    }

    // If it's an object, recursively deserialize all properties
    if (typeof obj === "object") {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = Card.deepDeserializeCards(value);
      }
      return result;
    }

    // For primitives, return as-is
    return obj;
  }

  /**
   * Check if an object looks like a serialized Card
   */
  private static isCardLike(obj: unknown): boolean {
    if (typeof obj !== "object" || obj === null) {
      return false;
    }

    // Must have deckId and either joker OR (suit and rank)
    const hasBasicProps = "deckId" in obj && typeof obj.deckId === "number";
    const isJoker =
      hasBasicProps && "joker" in obj && typeof obj.joker === "string";
    const isRegularCard =
      hasBasicProps &&
      "suit" in obj &&
      "rank" in obj &&
      typeof obj.suit === "string" &&
      typeof obj.rank === "string";

    return isJoker || isRegularCard;
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
    return this.commonId === other.commonId;
  }

  /**
   * Check if this card is trump given the current trump info
   */
  isTrump(trumpInfo: TrumpInfo): boolean {
    return (
      this.joker !== undefined ||
      this.rank === trumpInfo.trumpRank ||
      this.suit === trumpInfo.trumpSuit
    );
  }

  /**
   * String representation of the card
   */
  toString(): string {
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
  Invalid = "Invalid", // Invalid combination that doesn't form any valid combo type
}

// Multi-combo components breakdown
export type MultiCombo = {
  combos: Combo[]; // Individual combo components within the multi-combo
  totalLength: number; // Total cards in multi-combo
  totalPairs: number; // Total pairs (includes standalone pairs + pairs within tractors)
  totalTractorPairs: number; // Total pairs from all tractors (for AI analysis)
  tractors: number; // Count of tractors
  tractorSizes: number[]; // Length of each tractor (in pairs)
  isTrump: boolean; // Whether this multi-combo consists of trump cards
};

export type Combo = {
  type: ComboType;
  cards: Card[];
  value: number; // Relative hand strength for comparison
  isBreakingPair?: boolean; // Whether this combo breaks up a valuable pair
};
