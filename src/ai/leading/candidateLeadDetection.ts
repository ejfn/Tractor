import { isTrump } from "../../game/cardValue";
import { identifyCombos } from "../../game/comboDetection";
import { analyzeComboStructure } from "../../game/multiComboAnalysis";
import {
  checkOpponentVoidStatus,
  isComboUnbeatable,
} from "../../game/multiComboValidation";
import {
  Card,
  Combo,
  ComboType,
  GameState,
  PlayerId,
  Suit,
  TrumpInfo,
} from "../../types";
import { createCardMemory } from "../aiCardMemory";

/**
 * Candidate lead for scoring evaluation
 */
export interface CandidateLead {
  type: ComboType;
  cards: Card[];
  metadata: {
    suit: Suit; // Suit.None for trumps
    length: number; // Number of cards
    points: number; // Total point value
    isUnbeatable: boolean; // Whether this combo is unbeatable
    totalPairs: number; // Number of pairs (including tractor pairs)
    isTrump: boolean; // Whether this combo is trump
  };
}

/**
 * Detect ALL possible candidate leads for scoring evaluation
 * Finds multi-combos, tractors, pairs, and singles (both unbeatable AND beatable)
 */
export function detectCandidateLeads(
  playerHand: Card[],
  gameState: GameState,
  playerId: PlayerId,
  trumpInfo: TrumpInfo,
): CandidateLead[] {
  const candidates: CandidateLead[] = [];

  // 1. Find ALL multi-combo and unbeatable candidates
  const multiComboCandidates = detectMultiComboCandidates(
    playerHand,
    gameState,
    playerId,
    trumpInfo,
  );
  candidates.push(...multiComboCandidates);

  // 2. Find ALL straight combo candidates
  const allStraightCandidates = detectStraightComboCandidates(
    playerHand,
    trumpInfo,
  );

  // 3. Deduplicate: exclude combos already detected as unbeatable
  const alreadyDetectedCombos = new Set(
    multiComboCandidates.map((candidate) => getComboSignature(candidate.cards)),
  );

  const uniqueStraightCandidates = allStraightCandidates.filter(
    (candidate) =>
      !alreadyDetectedCombos.has(getComboSignature(candidate.cards)),
  );

  candidates.push(...uniqueStraightCandidates);

  // 4. Add all remaining singles (dedup by card ID)
  const alreadyUsedCardIds = new Set(
    candidates.flatMap((candidate) => candidate.cards.map((card) => card.id)),
  );

  const remainingSingles = playerHand
    .filter((card) => !alreadyUsedCardIds.has(card.id))
    .map((card): CandidateLead => {
      const suit = isTrump(card, trumpInfo) ? Suit.None : card.suit;
      return {
        type: ComboType.Single,
        cards: [card],
        metadata: createMetadata([card], suit, false, 0),
      };
    });

  candidates.push(...remainingSingles);

  return candidates;
}

/**
 * Detect multi-combo and unbeatable straight combo candidates
 * Multi-combos must be unbeatable to be valid, straight combos can be unbeatable singles/pairs/tractors
 */
function detectMultiComboCandidates(
  playerHand: Card[],
  gameState: GameState,
  playerId: PlayerId,
  trumpInfo: TrumpInfo,
): CandidateLead[] {
  const candidates: CandidateLead[] = [];

  // Check each non-trump suit for unbeatable opportunities
  for (const suit of [Suit.Hearts, Suit.Diamonds, Suit.Clubs, Suit.Spades]) {
    if (suit === trumpInfo.trumpSuit) continue; // Skip trump suit

    // Get unbeatable cards in this suit (following selectAIMultiComboLead logic)
    const unbeatableCards = getAllUnbeatableCardsInSuit(
      suit,
      playerHand,
      gameState,
      playerId,
    );

    if (unbeatableCards.length > 0) {
      // Analyze structure of unbeatable cards
      const structure = analyzeComboStructure(unbeatableCards, trumpInfo, true);

      if (structure && structure.combos.length >= 2) {
        // Multi-combo (2+ components)
        candidates.push({
          type: ComboType.Invalid,
          cards: unbeatableCards,
          metadata: createMetadata(
            unbeatableCards,
            suit,
            true,
            structure.totalPairs,
          ),
        });
      } else if (structure && structure.combos.length === 1) {
        // Unbeatable straight combo (single component)
        const combo = structure.combos[0];
        candidates.push({
          type: combo.type,
          cards: unbeatableCards,
          metadata: createMetadata(
            unbeatableCards,
            suit,
            true,
            structure.totalPairs,
          ),
        });
      }
    }
  }

  return candidates;
}

/**
 * Detect ALL straight combo candidates (tractors, pairs, singles)
 * Includes all combos regardless of strength
 */
function detectStraightComboCandidates(
  playerHand: Card[],
  trumpInfo: TrumpInfo,
): CandidateLead[] {
  const straightCombos: CandidateLead[] = [];

  // Get all possible combos from hand
  const allCombos = identifyCombos(playerHand, trumpInfo);

  // Convert each combo to candidate lead format
  for (const combo of allCombos) {
    // Skip invalid combos
    if (combo.type === ComboType.Invalid) continue;

    // Determine suit (Suit.None for trump, actual suit for non-trump)
    let suit: Suit;
    if (combo.cards.length > 0 && isTrump(combo.cards[0], trumpInfo)) {
      suit = Suit.None; // Trump cards
    } else {
      suit = combo.cards[0].suit; // Non-trump cards
    }

    // All combos detected here are beatable (unbeatable ones are detected separately)
    const totalPairs = calculateComboPairs(combo);

    straightCombos.push({
      type: combo.type,
      cards: combo.cards,
      metadata: createMetadata(combo.cards, suit, false, totalPairs),
    });
  }

  return straightCombos;
}

/**
 * Get all unbeatable cards in a specific suit
 * Replicates the logic from multiComboLeadingStrategy.ts
 */
function getAllUnbeatableCardsInSuit(
  suit: Suit,
  playerHand: Card[],
  gameState: GameState,
  playerId: PlayerId,
): Card[] {
  // Get all cards in this suit from player's hand
  const suitCards = playerHand.filter(
    (card) => card.suit === suit && !isTrump(card, gameState.trumpInfo),
  );

  if (suitCards.length === 0) {
    return [];
  }

  // Check if all other players are void - if so, ALL cards are unbeatable
  const voidStatus = checkOpponentVoidStatus(suit, gameState, playerId);
  if (voidStatus.allOpponentsVoid) {
    return suitCards; // All cards unbeatable
  }

  // Otherwise, check each combo individually
  const allCombos = identifyCombos(suitCards, gameState.trumpInfo);
  const unbeatableCards: Card[] = [];

  // Determine if current player can see kitty cards
  const currentPlayerIndex = gameState.players.findIndex(
    (p) => p.id === playerId,
  );
  const isRoundStarter =
    currentPlayerIndex === gameState.roundStartingPlayerIndex;
  const visibleKittyCards = isRoundStarter ? gameState.kittyCards : [];

  for (const combo of allCombos) {
    const memory = createCardMemory(gameState);
    const isUnbeatable = isComboUnbeatable(
      combo,
      suit,
      memory.playedCards,
      playerHand,
      gameState.trumpInfo,
      visibleKittyCards,
    );

    if (isUnbeatable) {
      unbeatableCards.push(...combo.cards);
    }
  }

  // Remove duplicates (cards can be in multiple combos)
  const uniqueCards = Array.from(
    new Map(unbeatableCards.map((card) => [card.id, card])).values(),
  );

  return uniqueCards;
}

/**
 * Get a unique signature for a combo based on its cards
 */
function getComboSignature(cards: Card[]): string {
  return cards
    .map((card) => card.id)
    .sort()
    .join(",");
}

/**
 * Create metadata for a candidate lead
 */
function createMetadata(
  cards: Card[],
  suit: Suit,
  isUnbeatable: boolean,
  totalPairs: number,
): CandidateLead["metadata"] {
  const isTrump = suit === Suit.None;
  return {
    suit,
    length: cards.length,
    points: cards.reduce((sum, card) => sum + card.points, 0),
    isUnbeatable,
    totalPairs,
    isTrump,
  };
}

/**
 * Calculate total pairs in a combo
 */
function calculateComboPairs(combo: Combo): number {
  switch (combo.type) {
    case ComboType.Single:
      return 0;
    case ComboType.Pair:
      return 1;
    case ComboType.Tractor:
      // Tractor pairs = length / 2
      return combo.cards.length / 2;
    default:
      return 0;
  }
}
