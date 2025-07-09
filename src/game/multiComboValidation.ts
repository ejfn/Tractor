import { createCardMemory } from "../ai/aiCardMemory";
import {
  Card,
  Combo,
  ComboType,
  GameState,
  PlayerId,
  Rank,
  Suit,
  TrumpInfo,
} from "../types";
import { MultiComboValidation } from "../types/combinations";
import { sortCards } from "../utils/cardSorting";
import { compareCards } from "./cardComparison";
import { identifyCombos } from "./comboDetection";

/**
 * Multi-Combo Validation Module
 *
 * Handles validation of multi-combo attempts using memory system and void detection.
 * Phase 1: Only validates leading multi-combos with unbeatable requirement.
 */

/**
 * Validate leading multi-combo using memory system and void detection
 * @param components Component combos within the multi-combo
 * @param suit Suit of the multi-combo (Suit.None for trump)
 * @param gameState Current game state
 * @param playerId Player attempting the multi-combo
 * @returns Validation result
 */
export function validateLeadingMultiCombo(
  components: Combo[],
  suit: Suit,
  gameState: GameState,
  playerId: PlayerId,
): MultiComboValidation {
  const validation: MultiComboValidation = {
    isValid: false,
    invalidReasons: [],
    voidStatus: {
      allOpponentsVoid: false,
      voidPlayers: [],
    },
    unbeatableStatus: {
      allUnbeatable: false,
      beatableComponents: [],
    },
  };

  // Rule 1: Leading multi-combos must be from non-trump suits
  if (suit === Suit.None) {
    validation.invalidReasons.push(
      "Leading multi-combos must be from non-trump suits",
    );
    return validation;
  }

  // Rule 2: Either all other players are void OR each combo is unbeatable
  const voidStatus = checkOtherPlayersVoidStatus(suit, gameState, playerId);
  validation.voidStatus = voidStatus;

  const unbeatableStatus = validateUnbeatableComponents(
    components,
    suit,
    gameState,
    playerId,
  );
  validation.unbeatableStatus = unbeatableStatus;

  // Multi-combo is valid if EITHER condition is met:
  // 1. All other players are void in the suit (every card is unbeatable)
  // 2. Each component combo is individually unbeatable based on memory
  if (!voidStatus.allOpponentsVoid && !unbeatableStatus.allUnbeatable) {
    validation.invalidReasons.push(
      `Multi-combo invalid: not all players void (${voidStatus.voidPlayers.length}/3 void) AND ${unbeatableStatus.beatableComponents.length} component(s) can be beaten`,
    );
    return validation;
  }

  // All validations passed
  validation.isValid = true;
  return validation;
}

/**
 * Check if all other players (all three other players) are void in the target suit
 * @param suit Target suit for multi-combo
 * @param gameState Current game state
 * @param currentPlayerId Player attempting multi-combo
 * @returns Void status information
 */
export function checkOtherPlayersVoidStatus(
  suit: Suit,
  gameState: GameState,
  currentPlayerId: PlayerId,
): { allOpponentsVoid: boolean; voidPlayers: PlayerId[] } {
  // Get memory system data for void detection
  const memory = createCardMemory(gameState);
  const allOtherPlayerIds = getAllOtherPlayerIds(gameState, currentPlayerId);

  const voidPlayers: PlayerId[] = [];

  // Check confirmed voids from memory system using playerMemories
  allOtherPlayerIds.forEach((playerId) => {
    const playerMemory = memory.playerMemories[playerId];
    if (playerMemory && playerMemory.suitVoids.has(suit)) {
      voidPlayers.push(playerId);
    }
  });

  const allOpponentsVoid = voidPlayers.length === allOtherPlayerIds.length;

  return {
    allOpponentsVoid,
    voidPlayers,
  };
}

/**
 * Validate each combo component is unbeatable using played cards + memory + kitty visibility
 * @param components Component combos to validate
 * @param suit Suit of the multi-combo
 * @param gameState Current game state
 * @param currentPlayerId Player attempting multi-combo
 * @returns Unbeatable validation status
 */
export function validateUnbeatableComponents(
  components: Combo[],
  suit: Suit,
  gameState: GameState,
  currentPlayerId: PlayerId,
): {
  allUnbeatable: boolean;
  beatableComponents: { combo: Combo; beatenBy: string }[];
} {
  const memory = createCardMemory(gameState);
  const playedCards = memory.playedCards;
  const currentPlayer = gameState.players.find((p) => p.id === currentPlayerId);
  const ownHand = currentPlayer?.hand || [];

  // Determine if current player can see kitty cards
  const currentPlayerIndex = gameState.players.findIndex(
    (p) => p.id === currentPlayerId,
  );
  const isRoundStarter =
    currentPlayerIndex === gameState.roundStartingPlayerIndex;

  const beatableComponents: {
    combo: Combo;
    beatenBy: string;
  }[] = [];

  // Check each component combo for unbeatable status with kitty visibility
  const visibleKittyCards = isRoundStarter ? gameState.kittyCards : [];

  for (const combo of components) {
    const isUnbeatable = isComboUnbeatable(
      combo,
      suit,
      playedCards,
      ownHand,
      gameState.trumpInfo,
      visibleKittyCards,
    );

    if (!isUnbeatable) {
      beatableComponents.push({
        combo,
        beatenBy: "unknown", // beatenBy no longer matters
      });
    }
  }

  return {
    allUnbeatable: beatableComponents.length === 0,
    beatableComponents,
  };
}

/**
 * Find all possible combos that can be formed from unseen cards (not played, not in own hand, not in visible kitty)
 * This unified function replaces individual per-type generation for better performance
 * Pass actual kitty cards for round starter, empty array for other players
 */
export function findAllPossibleUnseenCombos(
  suit: Suit,
  playedCards: Card[],
  ownHand: Card[],
  trumpInfo: TrumpInfo,
  visibleKittyCards: Card[],
): {
  singles: Card[];
  pairs: Card[][];
  tractors: Card[][];
} {
  // For trump cards (suit === Suit.None), use conservative approach for now
  if (suit === Suit.None) {
    return { singles: [], pairs: [], tractors: [] };
  }

  // Get all cards for this suit (excluding trump rank cards)
  const allSuitCards = createAllCardsInSuit(suit, trumpInfo);

  // Create set of accounted cards using card.id (specific deck instances for singles)
  const accountedCardIds = new Set([
    ...playedCards.map((c) => c.id),
    ...ownHand.map((c) => c.id),
    ...visibleKittyCards.map((c) => c.id),
  ]);

  // Find unseen individual card instances
  const unseenCardInstances = allSuitCards.filter(
    (card) => !accountedCardIds.has(card.id),
  );

  // For singles: all unseen individual cards
  const singles = unseenCardInstances;

  // For pairs and tractors: need to check which pairs can still be formed
  // Create set of accounted commonIds for pair/tractor logic
  const accountedCommonIds = new Set([
    ...playedCards.map((c) => c.commonId),
    ...ownHand.map((c) => c.commonId),
    ...visibleKittyCards.map((c) => c.commonId),
  ]);

  // Find ranks that can still form pairs (both copies not accounted)
  const unseenCardsByCommonId = allSuitCards.filter(
    (card) => !accountedCommonIds.has(card.commonId),
  );

  // Generate pairs and tractors from available rank types
  const allUnseenCombos = identifyCombos(unseenCardsByCommonId, trumpInfo);

  const pairs = allUnseenCombos
    .filter((combo) => combo.type === ComboType.Pair)
    .map((combo) => combo.cards);

  const tractors = allUnseenCombos
    .filter((combo) => combo.type === ComboType.Tractor)
    .map((combo) => combo.cards);

  return { singles, pairs, tractors };
}

/**
 * Create all cards in a suit (excluding trump rank cards which become trump)
 */
function createAllCardsInSuit(suit: Suit, trumpInfo: TrumpInfo): Card[] {
  // Get all rank values from the enum, excluding None
  const allRanks = Object.values(Rank).filter((rank) => rank !== Rank.None);

  // Filter out trump rank - those cards become trump, not part of regular suit
  const nonTrumpRanks = allRanks.filter((rank) => rank !== trumpInfo.trumpRank);

  // Create cards for each rank (double deck - 2 copies of each)
  const cards: Card[] = [];
  nonTrumpRanks.forEach((rank) => {
    cards.push(Card.createCard(suit, rank, 0)); // First copy
    cards.push(Card.createCard(suit, rank, 1)); // Second copy
  });

  return cards;
}

/**
 * Check if a specific combo is unbeatable based on played cards, own hand, and visible kitty cards
 * UNIFIED VERSION: Uses findAllPossibleUnseenCombos for better performance
 * Accounts for kitty card visibility - pass actual kitty for round starter, [] for others
 */
export function isComboUnbeatable(
  combo: Combo,
  suit: Suit,
  playedCards: Card[],
  ownHand: Card[],
  trumpInfo: TrumpInfo,
  visibleKittyCards: Card[],
): boolean {
  // For trump cards (suit === Suit.None), use conservative approach for now
  if (suit === Suit.None) {
    return false; // Conservative approach - trump logic not implemented
  }

  // Get all possible unseen combos once, accounting for kitty visibility
  const unseenCombos = findAllPossibleUnseenCombos(
    suit,
    playedCards,
    ownHand,
    trumpInfo,
    visibleKittyCards,
  );

  switch (combo.type) {
    case ComboType.Single:
      return !unseenCombos.singles.some((card) =>
        isCardStronger(card, combo.cards[0], trumpInfo),
      );
    case ComboType.Pair:
      return !unseenCombos.pairs.some((pair) =>
        isPairStronger(pair, combo.cards, trumpInfo),
      );
    case ComboType.Tractor:
      return !unseenCombos.tractors.some((tractor) =>
        isTractorStronger(tractor, combo.cards, trumpInfo),
      );
    default:
      return false;
  }
}

/**
 * Check if one card is stronger than another
 */
function isCardStronger(
  card1: Card,
  card2: Card,
  trumpInfo: TrumpInfo,
): boolean {
  try {
    const result = compareCards(card1, card2, trumpInfo);
    return result > 0; // card1 > card2
  } catch {
    // Different suits - can't compare directly, assume not stronger
    return false;
  }
}

/**
 * Check if one pair is stronger than another
 */
function isPairStronger(
  pair1: Card[],
  pair2: Card[],
  trumpInfo: TrumpInfo,
): boolean {
  if (pair1.length !== 2 || pair2.length !== 2) return false;
  try {
    // Compare the rank of the pairs (both cards in pair have same rank)
    const result = compareCards(pair1[0], pair2[0], trumpInfo);
    return result > 0; // pair1 > pair2
  } catch {
    // Different suits - can't compare directly, assume not stronger
    return false;
  }
}

/**
 * Check if one tractor is stronger than another
 */
function isTractorStronger(
  tractor1: Card[],
  tractor2: Card[],
  trumpInfo: TrumpInfo,
): boolean {
  if (tractor1.length !== tractor2.length) return false;

  try {
    // Sort both tractors and compare the highest cards
    const sorted1 = sortCards(tractor1, trumpInfo);
    const sorted2 = sortCards(tractor2, trumpInfo);

    const result = compareCards(sorted1[0], sorted2[0], trumpInfo);
    return result > 0; // tractor1 > tractor2
  } catch {
    // Different suits - can't compare directly, assume not stronger
    return false;
  }
}

/**
 * Get all other player IDs (the other three players in a 4-player game)
 * NOTE: Multi-combo validation is about ALL OTHER THREE PLAYERS, not just opponents!
 * @param gameState Current game state
 * @param currentPlayerId Current player
 * @returns Array of all other player IDs
 */
function getAllOtherPlayerIds(
  gameState: GameState,
  currentPlayerId: PlayerId,
): PlayerId[] {
  return gameState.players
    .filter((player) => player.id !== currentPlayerId)
    .map((player) => player.id);
}
