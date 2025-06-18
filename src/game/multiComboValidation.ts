import { createCardMemory } from "../ai/aiCardMemory";
import {
  Card,
  Combo,
  GameState,
  MultiComboStructure,
  PlayerId,
  Rank,
  Suit,
  TrumpInfo,
} from "../types";
import { MultiComboValidation } from "../types/combinations";
import { identifyCombos } from "./comboDetection";
import { isTrump } from "./gameHelpers";

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
    const unbeatableResult = isComboUnbeatable(
      combo,
      suit,
      playedCards,
      ownHand,
      gameState.trumpInfo,
    );

    if (!unbeatableResult.isUnbeatable) {
      beatableComponents.push({
        combo,
        beatenBy: unbeatableResult.beatenBy,
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
 * @param combo Combo to check
 * @param suit Suit of the combo
 * @param playedCards All cards already played (visible)
 * @param ownHand Player's own hand
 * @param trumpInfo Trump information
 * @returns Unbeatable check result
 */
export function isComboUnbeatable(
  combo: Combo,
  suit: Suit,
  playedCards: Card[],
  ownHand: Card[],
  trumpInfo: TrumpInfo,
): { isUnbeatable: boolean; beatenBy: string } {
  // Create a theoretical deck with all possible cards of this suit
  const allPossibleCards = createAllCardsOfSuit(suit, trumpInfo);

  // Remove played cards and own hand cards from consideration
  const playedCardIds = new Set(playedCards.map((card) => card.cardId));
  const ownHandCardIds = new Set(ownHand.map((card) => card.cardId));

  const cardsOutside = allPossibleCards.filter(
    (card) =>
      !playedCardIds.has(card.cardId) && !ownHandCardIds.has(card.cardId),
  );

  // Generate all possible combos from cards "outside" (held by opponents)
  const outsideCombos = identifyCombos(cardsOutside, trumpInfo);

  // Check if any outside combo can beat this combo
  for (const outsideCombo of outsideCombos) {
    if (canBeatCombo(outsideCombo, combo, suit, trumpInfo)) {
      return {
        isUnbeatable: false,
        beatenBy: `${outsideCombo.type} ${formatComboCards(outsideCombo)}`,
      };
    }
  }

  return {
    isUnbeatable: true,
    beatenBy: "",
  };
}

/**
 * Check if one combo can beat another within the same suit
 * @param challenger Combo attempting to beat
 * @param target Combo being challenged
 * @param suit Suit being played
 * @param trumpInfo Trump information
 * @returns True if challenger beats target
 */
function canBeatCombo(
  challenger: Combo,
  target: Combo,
  suit: Suit,
  trumpInfo: TrumpInfo,
): boolean {
  // Must be same combo type to beat
  if (challenger.type !== target.type) {
    return false;
  }

  // Must be same number of cards
  if (challenger.cards.length !== target.cards.length) {
    return false;
  }

  // For pairs and tractors, compare the highest card
  const challengerHighest = getHighestCardInCombo(challenger, trumpInfo);
  const targetHighest = getHighestCardInCombo(target, trumpInfo);

  // Compare card strength
  return compareCardStrength(challengerHighest, targetHighest, trumpInfo) > 0;
}

/**
 * Get the highest card in a combo for comparison
 * @param combo Combo to analyze
 * @param trumpInfo Trump information
 * @returns Highest card in the combo
 */
function getHighestCardInCombo(combo: Combo, trumpInfo: TrumpInfo): Card {
  return combo.cards.reduce((highest, card) => {
    return compareCardStrength(card, highest, trumpInfo) > 0 ? card : highest;
  });
}

/**
 * Compare strength of two cards
 * @param cardA First card
 * @param cardB Second card
 * @param trumpInfo Trump information
 * @returns Positive if cardA > cardB, negative if cardA < cardB, 0 if equal
 */
function compareCardStrength(
  cardA: Card,
  cardB: Card,
  trumpInfo: TrumpInfo,
): number {
  // Use trump hierarchy if either card is trump
  const aIsTrump = isTrump(cardA, trumpInfo);
  const bIsTrump = isTrump(cardB, trumpInfo);

  if (aIsTrump && !bIsTrump) return 1;
  if (!aIsTrump && bIsTrump) return -1;

  if (aIsTrump && bIsTrump) {
    // Both trump - use trump hierarchy
    return compareTrumpCards(cardA, cardB, trumpInfo);
  }

  // Both non-trump - compare by rank
  return compareNonTrumpCards(cardA, cardB);
}

/**
 * Compare trump cards using trump hierarchy
 * @param cardA First trump card
 * @param cardB Second trump card
 * @param trumpInfo Trump information
 * @returns Comparison result
 */
function compareTrumpCards(
  cardA: Card,
  cardB: Card,
  trumpInfo: TrumpInfo,
): number {
  // Simplified trump hierarchy - would need full implementation
  // For now, use basic rank comparison as placeholder
  if (cardA.joker && cardB.joker) {
    return cardA.joker === "Big" ? 1 : cardB.joker === "Big" ? -1 : 0;
  }
  if (cardA.joker) return 1;
  if (cardB.joker) return -1;

  // Use rank comparison for trump rank cards
  return compareRankValues(cardA.rank, cardB.rank);
}

/**
 * Compare non-trump cards by rank
 * @param cardA First card
 * @param cardB Second card
 * @returns Comparison result
 */
function compareNonTrumpCards(cardA: Card, cardB: Card): number {
  return compareRankValues(cardA.rank, cardB.rank);
}

/**
 * Compare rank values
 * @param rankA First rank
 * @param rankB Second rank
 * @returns Comparison result
 */
function compareRankValues(rankA: string, rankB: string): number {
  const rankOrder = [
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "J",
    "Q",
    "K",
    "A",
  ];
  const indexA = rankOrder.indexOf(rankA);
  const indexB = rankOrder.indexOf(rankB);
  return indexA - indexB;
}

/**
 * Create all possible cards of a specific suit
 * @param suit Target suit
 * @param trumpInfo Trump information
 * @returns Array of all possible cards in that suit
 */
function createAllCardsOfSuit(suit: Suit, trumpInfo: TrumpInfo): Card[] {
  const cards: Card[] = [];

  if (suit === Suit.None) {
    // For trump multi-combos, include all trump cards
    // This is a placeholder - would need full trump card generation
    return [];
  } else {
    // For non-trump suits, create all cards of that suit
    const ranks = [
      Rank.Three,
      Rank.Four,
      Rank.Five,
      Rank.Six,
      Rank.Seven,
      Rank.Eight,
      Rank.Nine,
      Rank.Ten,
      Rank.Jack,
      Rank.Queen,
      Rank.King,
      Rank.Ace,
    ];
    ranks.forEach((rank) => {
      // Two copies from two decks
      cards.push(Card.createCard(suit, rank, 0));
      cards.push(Card.createCard(suit, rank, 1));
    });
  }

  return cards;
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
 * Format combo cards for display
 * @param combo Combo to format
 * @returns Formatted string
 */
function formatComboCards(combo: Combo): string {
  return combo.cards.map((card) => card.getDisplayName()).join("-");
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
