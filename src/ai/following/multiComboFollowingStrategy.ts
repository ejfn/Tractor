import { evaluateTrickPlay } from "../../game/cardComparison";
import { generateMixedCombinations } from "../../game/combinationGeneration";
import { calculateCardStrategicValue, isTrump } from "../../game/gameHelpers";
import { detectLeadingMultiCombo } from "../../game/multiComboDetection";
import { isValidPlay } from "../../game/playValidation";
import {
  Card,
  Combo,
  GameState,
  PlayerId,
  Trick,
  TrumpInfo,
} from "../../types";

/**
 * Multi-Combo Following Strategy for AI
 *
 * Handles intelligent decision-making when AI needs to follow multi-combo leads.
 * Implements step-by-step multi-combo following logic:
 * 1. Same-suit structure matching with optimal card selection
 * 2. Trump opportunity when void in led suit
 * 3. Multi-layer trump vs trump comparison using highest combo type
 */

export interface MultiComboFollowingResult {
  cards: Card[];
  strategy: "same_suit_match" | "trump_beat" | "disposal" | "no_valid_response";
  reasoning: string;
  canBeat: boolean;
}

/**
 * Main entry point for multi-combo following decisions
 */
export function selectMultiComboFollowingPlay(
  playerHand: Card[],
  gameState: GameState,
  playerId: PlayerId,
  validCombos: Combo[],
): MultiComboFollowingResult | null {
  const { currentTrick, trumpInfo } = gameState;

  if (!currentTrick?.plays?.[0]?.cards) {
    return null; // No leading combo to follow
  }

  const leadingCards = currentTrick.plays[0].cards;

  // Check if leading combo is a multi-combo
  const leadingMultiCombo = detectLeadingMultiCombo(leadingCards, trumpInfo);
  if (!leadingMultiCombo.isMultiCombo) {
    return null; // Not a multi-combo lead, use regular following strategy
  }

  // Step 1: Try same-suit structure matching
  const sameSuitMatch = tryStructureMatching(
    leadingCards,
    playerHand,
    trumpInfo,
    playerId,
    gameState,
  );
  if (sameSuitMatch) {
    return sameSuitMatch;
  }

  // Step 2: Try trump opportunity (when void in led suit)
  const trumpBeat = tryTrumpOpportunity(
    leadingCards,
    playerHand,
    trumpInfo,
    playerId,
    gameState,
  );
  if (trumpBeat) {
    return trumpBeat;
  }

  // Step 3: Strategic disposal when can't beat
  const disposal = selectDisposalPlay(
    leadingCards,
    playerHand,
    trumpInfo,
    playerId,
    gameState,
    validCombos,
  );

  return (
    disposal || {
      cards: [],
      strategy: "no_valid_response",
      reasoning: "No valid response to multi-combo available",
      canBeat: false,
    }
  );
}

/**
 * Step 1: Try to match structure using same suit as led
 */
function tryStructureMatching(
  leadingCards: Card[],
  playerHand: Card[],
  trumpInfo: TrumpInfo,
  playerId: PlayerId,
  gameState: GameState,
): MultiComboFollowingResult | null {
  const leadingSuit = leadingCards[0]?.suit;
  const isLeadingTrump = leadingCards.some((card) => isTrump(card, trumpInfo));

  // Get cards in led suit/trump from player's hand
  const relevantCards = isLeadingTrump
    ? playerHand.filter((card) => isTrump(card, trumpInfo))
    : playerHand.filter(
        (card) => card.suit === leadingSuit && !isTrump(card, trumpInfo),
      );

  if (relevantCards.length < leadingCards.length) {
    return null; // Not enough cards to match structure
  }

  // Generate mixed combinations that match the leading structure
  const matchingCombos = generateMixedCombinations(
    relevantCards,
    leadingCards,
    trumpInfo,
    gameState,
    playerId,
  )
    .filter((combo) => combo.cards.length === leadingCards.length)
    .filter((combo) =>
      isValidPlay(combo.cards, playerHand, playerId, gameState),
    );

  if (matchingCombos.length === 0) {
    return null; // No valid structure matches
  }

  // Select best combo based on strategy context
  const selectedCombo = selectBestStructureMatch(
    matchingCombos,
    leadingCards,
    trumpInfo,
  );

  const canBeat = canComboBeatLeading(
    selectedCombo.cards,
    leadingCards,
    trumpInfo,
    playerHand,
  );

  return {
    cards: selectedCombo.cards,
    strategy: "same_suit_match",
    reasoning: `Matched structure with ${relevantCards.length} ${isLeadingTrump ? "trump" : leadingSuit} cards`,
    canBeat,
  };
}

/**
 * Step 2: Try trump opportunity when void in led suit
 */
function tryTrumpOpportunity(
  leadingCards: Card[],
  playerHand: Card[],
  trumpInfo: TrumpInfo,
  playerId: PlayerId,
  gameState: GameState,
): MultiComboFollowingResult | null {
  const leadingSuit = leadingCards[0]?.suit;
  const isLeadingTrump = leadingCards.some((card) => isTrump(card, trumpInfo));

  if (isLeadingTrump) {
    return null; // Already trump lead, no trump opportunity
  }

  // Check if void in led suit
  const hasLedSuit = playerHand.some(
    (card) => card.suit === leadingSuit && !isTrump(card, trumpInfo),
  );

  if (hasLedSuit) {
    return null; // Not void, must follow suit
  }

  // Get trump cards that can form matching structure
  const trumpCards = playerHand.filter((card) => isTrump(card, trumpInfo));

  if (trumpCards.length < leadingCards.length) {
    return null; // Not enough trump cards
  }

  // Generate trump combinations that match the leading structure
  const trumpCombos = generateMixedCombinations(
    trumpCards,
    leadingCards,
    trumpInfo,
    gameState,
    playerId,
  )
    .filter((combo) => combo.cards.length === leadingCards.length)
    .filter((combo) =>
      isValidPlay(combo.cards, playerHand, playerId, gameState),
    );

  if (trumpCombos.length === 0) {
    return null; // No valid trump responses
  }

  // Check if there's already a trump response to beat
  const currentWinner = gameState.currentTrick
    ? getCurrentWinningCombo(gameState.currentTrick)
    : [];
  const needToBeatTrump = currentWinner.some((card) =>
    isTrump(card, trumpInfo),
  );

  // Select best trump combo considering existing trump responses
  const selectedCombo = needToBeatTrump
    ? selectBestTrumpVsTrump(trumpCombos, currentWinner, trumpInfo)
    : selectBestTrumpCombo(trumpCombos, trumpInfo);

  return {
    cards: selectedCombo.cards,
    strategy: "trump_beat",
    reasoning: `Trump opportunity: void in ${leadingSuit}, using ${trumpCards.length} trump cards`,
    canBeat: true, // Trump always beats non-trump
  };
}

/**
 * Step 3: Strategic disposal when can't beat the multi-combo
 */
function selectDisposalPlay(
  leadingCards: Card[],
  playerHand: Card[],
  trumpInfo: TrumpInfo,
  playerId: PlayerId,
  gameState: GameState,
  validCombos: Combo[],
): MultiComboFollowingResult | null {
  // Filter valid combos that match the required length
  const validDisposals = validCombos.filter(
    (combo) => combo.cards.length === leadingCards.length,
  );

  if (validDisposals.length === 0) {
    return null;
  }

  // Sort by strategic value (lowest first for disposal)
  const sortedDisposals = validDisposals.sort((a, b) => {
    const aValue = a.cards.reduce(
      (sum, card) =>
        sum + calculateCardStrategicValue(card, trumpInfo, "strategic"),
      0,
    );
    const bValue = b.cards.reduce(
      (sum, card) =>
        sum + calculateCardStrategicValue(card, trumpInfo, "strategic"),
      0,
    );
    return aValue - bValue; // Lowest value first
  });

  const selectedCombo = sortedDisposals[0];

  return {
    cards: selectedCombo.cards,
    strategy: "disposal",
    reasoning: `Strategic disposal: playing lowest value cards (${selectedCombo.cards.length} cards)`,
    canBeat: false,
  };
}

/**
 * Select best structure match based on strategic context
 */
function selectBestStructureMatch(
  matchingCombos: { cards: Card[] }[],
  leadingCards: Card[],
  trumpInfo: TrumpInfo,
): { cards: Card[] } {
  // Sort by strategic priority: can beat > team coordination > conservation
  return matchingCombos.sort((a, b) => {
    const aCanBeat = canComboBeatLeading(a.cards, leadingCards, trumpInfo, []);
    const bCanBeat = canComboBeatLeading(b.cards, leadingCards, trumpInfo, []);

    if (aCanBeat !== bCanBeat) {
      return bCanBeat ? 1 : -1; // Prefer beating combos
    }

    // Both can beat or both can't beat - use strategic value
    const aValue = a.cards.reduce(
      (sum, card) =>
        sum + calculateCardStrategicValue(card, trumpInfo, "strategic"),
      0,
    );
    const bValue = b.cards.reduce(
      (sum, card) =>
        sum + calculateCardStrategicValue(card, trumpInfo, "strategic"),
      0,
    );

    return aCanBeat ? bValue - aValue : aValue - bValue; // Higher if beating, lower if not
  })[0];
}

/**
 * Select best trump combo for beating non-trump multi-combo
 */
function selectBestTrumpCombo(
  trumpCombos: { cards: Card[] }[],
  trumpInfo: TrumpInfo,
): { cards: Card[] } {
  // Use lowest value trump cards to beat non-trump
  return trumpCombos.sort((a, b) => {
    const aValue = a.cards.reduce(
      (sum, card) =>
        sum + calculateCardStrategicValue(card, trumpInfo, "conservation"),
      0,
    );
    const bValue = b.cards.reduce(
      (sum, card) =>
        sum + calculateCardStrategicValue(card, trumpInfo, "conservation"),
      0,
    );
    return aValue - bValue; // Lowest conservation value first
  })[0];
}

/**
 * Select best trump combo for beating existing trump response
 */
function selectBestTrumpVsTrump(
  trumpCombos: { cards: Card[] }[],
  currentWinner: Card[],
  trumpInfo: TrumpInfo,
): { cards: Card[] } {
  // Filter combos that can actually beat the current winner
  const beatingCombos = trumpCombos.filter((combo) =>
    canComboBeatLeading(combo.cards, currentWinner, trumpInfo, []),
  );

  if (beatingCombos.length === 0) {
    return trumpCombos[0]; // Fallback to any trump combo
  }

  // Use lowest value trump combo that can still beat
  return beatingCombos.sort((a, b) => {
    const aValue = a.cards.reduce(
      (sum, card) =>
        sum + calculateCardStrategicValue(card, trumpInfo, "conservation"),
      0,
    );
    const bValue = b.cards.reduce(
      (sum, card) =>
        sum + calculateCardStrategicValue(card, trumpInfo, "conservation"),
      0,
    );
    return aValue - bValue;
  })[0];
}

/**
 * Check if combo can beat leading combo using the new multi-combo comparison logic
 */
function canComboBeatLeading(
  responseCards: Card[],
  leadingCards: Card[],
  trumpInfo: TrumpInfo,
  playerHand: Card[],
): boolean {
  // Create a mock trick to use evaluateTrickPlay
  const mockTrick = {
    plays: [
      {
        playerId: "human" as PlayerId,
        cards: leadingCards,
      },
    ],
    winningPlayerId: "human" as PlayerId,
    points: 0,
    isFinalTrick: false,
  };

  // Use the comprehensive evaluateTrickPlay function which includes multi-combo comparison
  const result = evaluateTrickPlay(
    responseCards,
    mockTrick,
    trumpInfo,
    playerHand,
  );
  return result.canBeat;
}

/**
 * Get current winning combo from trick
 */
function getCurrentWinningCombo(trickData: Trick): Card[] {
  if (!trickData.winningPlayerId) {
    return trickData.plays?.[0]?.cards || [];
  }

  const winningPlay = trickData.plays?.find(
    (play) => play.playerId === trickData.winningPlayerId,
  );
  return winningPlay ? winningPlay.cards : trickData.plays?.[0]?.cards || [];
}
