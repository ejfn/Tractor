import { createCardMemory } from "../ai/aiCardMemory";
import {
  Card,
  Combo,
  ComboType,
  GameState,
  MultiComboStructure,
  PlayableRank,
  PlayerId,
  Rank,
  Suit,
  TrumpInfo,
} from "../types";
import { MultiComboValidation } from "../types/combinations";
import { identifyCombos } from "./comboDetection";
import { getTractorRank } from "./tractorLogic";
import { sortCards } from "../utils/cardSorting";

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

  // Rule 2: All other players must be void in that suit
  const voidStatus = checkOpponentVoidStatus(suit, gameState, playerId);
  validation.voidStatus = voidStatus;

  if (!voidStatus.allOpponentsVoid) {
    validation.invalidReasons.push(
      `Not all opponents are void in ${suit}. Non-void players: ${getOpponentIds(
        gameState,
        playerId,
      )
        .filter((id) => !voidStatus.voidPlayers.includes(id))
        .join(", ")}`,
    );
    return validation;
  }

  // Rule 3: Each component combo must be unbeatable
  const unbeatableStatus = validateUnbeatableComponents(
    components,
    suit,
    gameState,
    playerId,
  );
  validation.unbeatableStatus = unbeatableStatus;

  if (!unbeatableStatus.allUnbeatable) {
    validation.invalidReasons.push(
      `${unbeatableStatus.beatableComponents.length} component(s) can be beaten`,
    );
    return validation;
  }

  // All validations passed
  validation.isValid = true;
  return validation;
}

/**
 * Check if all opponents are void in the target suit
 * @param suit Target suit for multi-combo
 * @param gameState Current game state
 * @param currentPlayerId Player attempting multi-combo
 * @returns Void status information
 */
export function checkOpponentVoidStatus(
  suit: Suit,
  gameState: GameState,
  currentPlayerId: PlayerId,
): { allOpponentsVoid: boolean; voidPlayers: PlayerId[] } {
  // Get memory system data for void detection
  const memory = createCardMemory(gameState);
  const opponentIds = getOpponentIds(gameState, currentPlayerId);

  const voidPlayers: PlayerId[] = [];

  // Check confirmed voids from memory system using playerMemories
  opponentIds.forEach((opponentId) => {
    const playerMemory = memory.playerMemories[opponentId];
    if (playerMemory && playerMemory.suitVoids.has(suit)) {
      voidPlayers.push(opponentId);
    }
  });

  const allOpponentsVoid = voidPlayers.length === opponentIds.length;

  return {
    allOpponentsVoid,
    voidPlayers,
  };
}

/**
 * Validate each combo component is unbeatable using played cards + memory
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

  const beatableComponents: {
    combo: Combo;
    beatenBy: string;
  }[] = [];

  // Check each component combo for unbeatable status
  for (const combo of components) {
    const isUnbeatable = isComboUnbeatable(
      combo,
      suit,
      playedCards,
      ownHand,
      gameState.trumpInfo,
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
 * Check if a specific combo is unbeatable based on played cards and own hand
 * Each combo type uses different logic for efficiency and correctness
 */
export function isComboUnbeatable(
  combo: Combo,
  suit: Suit,
  playedCards: Card[],
  ownHand: Card[],
  trumpInfo: TrumpInfo,
): boolean {
  switch (combo.type) {
    case ComboType.Single:
      return isSingleUnbeatable(
        combo.cards[0],
        suit,
        playedCards,
        ownHand,
        trumpInfo,
      );
    case ComboType.Pair:
      return isPairUnbeatable(
        combo.cards,
        suit,
        playedCards,
        ownHand,
        trumpInfo,
      );
    case ComboType.Tractor:
      return isTractorUnbeatable(
        combo.cards,
        suit,
        playedCards,
        ownHand,
        trumpInfo,
      );
    default:
      return false;
  }
}

/**
 * Check if a single card is unbeatable
 * Logic: Populate all possible cards greater than given rank (excluding trump rank),
 * then do set difference with (played ∪ in hand)
 */
function isSingleUnbeatable(
  card: Card,
  suit: Suit,
  playedCards: Card[],
  ownHand: Card[],
  trumpInfo: TrumpInfo,
): boolean {
  // For trump cards (suit === Suit.None), use trump-specific logic
  if (suit === Suit.None) {
    // TODO: Implement trump-specific unbeatable logic
    return false; // Conservative approach for now
  }
  // Get all possible cards greater than this card's rank in this suit
  const higherCards = createHigherCardsInSuit(
    card.rank as PlayableRank,
    suit,
    trumpInfo,
  );

  // Create set of accounted cards (played + in hand)
  const accountedCardIds = new Set([
    ...playedCards.map((c) => c.id),
    ...ownHand.map((c) => c.id),
  ]);

  // Set difference: higher cards that are NOT accounted for
  const unaccountedHigherCards = higherCards.filter(
    (higherCard) => !accountedCardIds.has(higherCard.id),
  );

  // If any higher cards are unaccounted for, this single is beatable
  return unaccountedHigherCards.length === 0;
}

/**
 * Create cards higher than given rank in given suit (excluding trump rank)
 */
function createHigherCardsInSuit(
  baseRank: PlayableRank,
  suit: Suit,
  trumpInfo: TrumpInfo,
  singleDeck = false,
): Card[] {
  // For trump cards (suit === Suit.None), return empty array for now
  if (suit === Suit.None) {
    return []; // Conservative approach - no cards to beat trump
  }
  // Get all rank values from the enum, excluding None
  const allRanks = Object.values(Rank).filter((rank) => rank !== Rank.None);

  // Filter out trump rank - those cards become trump, not part of regular suit
  const nonTrumpRanks = allRanks.filter((rank) => rank !== trumpInfo.trumpRank);

  // Find ranks higher than baseRank
  const baseIndex = nonTrumpRanks.indexOf(baseRank);
  if (baseIndex === -1) return []; // Base rank not found or is trump rank

  const higherRanks = nonTrumpRanks.slice(baseIndex + 1);

  // Create cards for higher ranks
  const higherCards: Card[] = [];
  higherRanks.forEach((rank) => {
    higherCards.push(Card.createCard(suit, rank, 0));
    if (!singleDeck) {
      higherCards.push(Card.createCard(suit, rank, 1));
    }
  });

  return higherCards;
}

/**
 * Check if a pair is unbeatable
 * Logic: For pairs, need to check if any higher pair can be formed
 * A pair is unbeatable if all cards of higher ranks don't have both copies available
 */
function isPairUnbeatable(
  pairCards: Card[],
  suit: Suit,
  playedCards: Card[],
  ownHand: Card[],
  trumpInfo: TrumpInfo,
): boolean {
  // For trump cards (suit === Suit.None), use trump-specific logic
  if (suit === Suit.None) {
    // TODO: Implement trump-specific unbeatable logic
    return false; // Conservative approach for now
  }
  // Get the rank of this pair
  const pairRank = pairCards[0].rank as PlayableRank;

  // 1) Generate higher cards (single deck only)
  const higherCards = createHigherCardsInSuit(pairRank, suit, trumpInfo, true);

  // 2) Create set of accounted card types using commonId
  const accountedCommonIds = new Set([
    ...playedCards.map((c) => c.commonId),
    ...ownHand.map((c) => c.commonId),
  ]);

  // Remove accounted higher cards
  const unaccountedHigherCards = higherCards.filter(
    (card) => !accountedCommonIds.has(card.commonId),
  );

  // 3) If nothing left, then unbeatable
  return unaccountedHigherCards.length === 0;
}

/**
 * Placeholder for tractor unbeatable logic - to be implemented
 */
function isTractorUnbeatable(
  tractorCards: Card[],
  suit: Suit,
  playedCards: Card[],
  ownHand: Card[],
  trumpInfo: TrumpInfo,
): boolean {
  // For trump cards (suit === Suit.None), use trump-specific logic
  if (suit === Suit.None) {
    // TODO: Implement trump-specific unbeatable logic
    return false; // Conservative approach for now
  }
  const tractorLength = tractorCards.length / 2; // Number of pairs in tractor

  // Get the highest rank in the tractor - use sorting helper (descending order)
  const sortedTractorCards = sortCards(tractorCards, trumpInfo);
  const highestTractorRank = sortedTractorCards[0].rank as PlayableRank;

  // 1) Generate higher cards (single deck only)
  const higherCards = createHigherCardsInSuit(
    highestTractorRank,
    suit,
    trumpInfo,
    true,
  );

  // 2) Remove accounted using commonId
  const accountedCommonIds = new Set([
    ...playedCards.map((c) => c.commonId),
    ...ownHand.map((c) => c.commonId),
  ]);

  const unaccountedHigherCards = higherCards.filter(
    (card) => !accountedCommonIds.has(card.commonId),
  );

  // 3) If nothing left, then unbeatable
  if (unaccountedHigherCards.length === 0) {
    return true;
  }

  // 4) Check if unaccounted cards can form consecutive sequences >= tractor length
  const unaccountedRanks = unaccountedHigherCards.map((card) => card.rank);
  return !hasConsecutiveSequence(
    unaccountedRanks,
    tractorLength,
    suit,
    trumpInfo,
  );
}

/**
 * Check if there's a consecutive sequence of the required length
 * Uses getTractorRank to properly handle trump rank skipping
 */
function hasConsecutiveSequence(
  ranks: Rank[],
  requiredLength: number,
  suit: Suit,
  trumpInfo: TrumpInfo,
): boolean {
  if (ranks.length < requiredLength) return false;

  // Convert ranks to tractor ranks using the actual suit
  // Create dummy cards to use getTractorRank function
  const tractorRanks = ranks
    .map((rank) => {
      const dummyCard = Card.createCard(suit, rank, 0);
      return getTractorRank(dummyCard, trumpInfo);
    })
    .sort((a, b) => a - b);

  // Find all consecutive sequences in tractor rank space
  let maxConsecutiveLength = 0;
  let currentLength = 1;

  for (let i = 1; i < tractorRanks.length; i++) {
    if (tractorRanks[i] === tractorRanks[i - 1] + 1) {
      // Consecutive in tractor rank space
      currentLength++;
    } else {
      // Break in sequence, update max and reset
      maxConsecutiveLength = Math.max(maxConsecutiveLength, currentLength);
      currentLength = 1;
    }
  }

  // Don't forget the last sequence
  maxConsecutiveLength = Math.max(maxConsecutiveLength, currentLength);

  // If any consecutive sequence is >= required length, then beatable
  return maxConsecutiveLength >= requiredLength;
}

/**
 * Get opponent player IDs
 * @param gameState Current game state
 * @param currentPlayerId Current player
 * @returns Array of opponent player IDs
 */
function getOpponentIds(
  gameState: GameState,
  currentPlayerId: PlayerId,
): PlayerId[] {
  return gameState.players
    .filter((player) => player.id !== currentPlayerId)
    .map((player) => player.id);
}

/**
 * Validate following multi-combo matches lead structure
 * @param followingCards Cards being played to follow
 * @param leadingStructure Structure of the leading multi-combo
 * @param playerHand Player's full hand
 * @param trumpInfo Trump information
 * @returns Validation result
 */
export function validateFollowingMultiCombo(
  followingCards: Card[],
  leadingStructure: MultiComboStructure,
  playerHand: Card[],
  trumpInfo: TrumpInfo,
): MultiComboValidation {
  const validation: MultiComboValidation = {
    isValid: false,
    invalidReasons: [],
    voidStatus: { allOpponentsVoid: false, voidPlayers: [] },
    unbeatableStatus: { allUnbeatable: false, beatableComponents: [] },
  };

  // Rule 1: Must match total length exactly
  if (followingCards.length !== leadingStructure.totalLength) {
    validation.invalidReasons.push(
      `Wrong total length: ${followingCards.length} vs required ${leadingStructure.totalLength}`,
    );
    return validation;
  }

  // Rule 2: Must match combination structure
  const followingComponents = identifyCombos(followingCards, trumpInfo);
  const structureMatch = matchesMultiComboStructure(
    followingComponents,
    leadingStructure,
  );

  if (!structureMatch.matches) {
    validation.invalidReasons.push(structureMatch.reason);
    return validation;
  }

  // Following multi-combos don't need unbeatable validation
  validation.isValid = true;
  return validation;
}

/**
 * Check if following multi-combo matches required structure
 * @param followingComponents Components of following multi-combo
 * @param requiredStructure Required structure from lead
 * @returns Match result
 */
function matchesMultiComboStructure(
  followingComponents: Combo[],
  requiredStructure: MultiComboStructure,
): { matches: boolean; reason: string } {
  const actualStructure = {
    singles: 0,
    pairs: 0,
    tractors: 0,
    tractorSizes: [] as number[],
  };

  // Count actual components
  followingComponents.forEach((combo) => {
    switch (combo.type) {
      case "Single":
        actualStructure.singles++;
        break;
      case "Pair":
        actualStructure.pairs++;
        break;
      case "Tractor":
        actualStructure.tractors++;
        actualStructure.tractorSizes.push(combo.cards.length / 2);
        break;
    }
  });

  // Check if following has enough of each component type
  if (actualStructure.pairs < requiredStructure.components.pairs) {
    return {
      matches: false,
      reason: `Not enough pairs: ${actualStructure.pairs} vs required ${requiredStructure.components.pairs}`,
    };
  }

  if (actualStructure.tractors < requiredStructure.components.tractors) {
    return {
      matches: false,
      reason: `Not enough tractors: ${actualStructure.tractors} vs required ${requiredStructure.components.tractors}`,
    };
  }

  return { matches: true, reason: "" };
}
