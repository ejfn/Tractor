import { canBeatCombo } from "../../game/cardComparison";
import { calculateCardStrategicValue, isTrump } from "../../game/cardValue";
import { Card, Combo, GameContext, GameState, PlayerId, TrumpInfo } from "../../types";
import { gameLogger } from "../../utils/gameLogger";
import { getRemainingUnseenCards } from "../aiGameContext";
import { SuitAvailabilityResult, analyzeSuitAvailability } from "./suitAvailabilityAnalysis";

/**
 * Valid Combos Decision Module - Handles trump and non-trump valid combo scenarios
 *
 * This module contains the specialized logic for when players have valid combos
 * that can properly respond to the leading combo type (pairs for pairs, tractors for tractors).
 */

/**
 * Handle trump lead valid combos - specialized for trump competition
 *
 * Algorithm:
 * 1. If only one valid combo, just play it
 * 2. If teammate winning and (I'm 4th or teammate strong >150), contribute
 * 3. If can beat current winner:
 *    - High points (>=10): Beat with stronger card (>150 threshold)
 *    - Low points (<10): Beat with moderately stronger card (>100 threshold)
 * 4. Dispose
 */
export function handleTrumpLeadValidCombos(
  analysis: SuitAvailabilityResult,
  context: GameContext,
  trumpInfo: TrumpInfo,
  gameState: GameState,
  currentPlayerId: PlayerId,
): Card[] {
  if (!analysis.validCombos || analysis.validCombos.length === 0) {
    gameLogger.error("enhanced_following_no_trump_valid_combos", {
      player: currentPlayerId,
      scenario: analysis.scenario,
      message:
        "handleTrumpLeadValidCombos called with no valid combos - routing bug",
    });
    return [];
  }

  const trickAnalysis = context.trickWinnerAnalysis;
  if (!trickAnalysis) {
    gameLogger.error("enhanced_following_trump_no_trick_analysis", {
      player: currentPlayerId,
      message:
        "handleTrumpLeadValidCombos called without trick analysis - context bug",
    });
    return analysis.validCombos[0].cards;
  }

  const { isTeammateWinning, trickPoints } = trickAnalysis;

  gameLogger.debug("enhanced_following_trump_lead_analysis", {
    player: currentPlayerId,
    validComboCount: analysis.validCombos.length,
    isTeammateWinning,
    trickPoints,
    comboTypes: analysis.validCombos.map((c) => c.type),
  });

  // Step 1: If only one valid combo, just play it
  if (analysis.validCombos.length === 1) {
    gameLogger.debug("enhanced_following_trump_single_combo_shortcut", {
      player: currentPlayerId,
      selectedCards: analysis.validCombos[0].cards.map((c) => c.toString()),
      reason: "only_one_valid_combo",
    });
    return analysis.validCombos[0].cards;
  }

  // Step 2: Check if we should contribute to teammate
  if (shouldContributeToTeammateInTrump(context, gameState, currentPlayerId)) {
    const contributionCards = selectComboByStrategicValue(
      analysis.validCombos,
      trumpInfo,
      "contribute",
      "lowest",
    );
    if (contributionCards.length > 0) {
      gameLogger.debug("enhanced_following_trump_contribute_teammate", {
        player: currentPlayerId,
        selectedCards: contributionCards.map((c) => c.toString()),
        reason: "teammate_winning_and_conditions_met",
      });
      return contributionCards;
    }
  }

  // Step 3: Check if we should beat current winner
  const currentWinnerCards =
    gameState.currentTrick?.plays.find(
      (play) => play.playerId === context.trickWinnerAnalysis?.currentWinner,
    )?.cards || [];

  // Use beat logic with appropriate threshold based on trick points
  const beatResult = attemptToBeatWithThreshold(
    analysis.validCombos,
    currentWinnerCards,
    trumpInfo,
    trickPoints >= 10 ? 150 : 100, // High points: 150, Low points: 100
    trickPoints,
    isTeammateWinning,
  );

  if (beatResult) {
    gameLogger.debug("enhanced_following_trump_beat_winner", {
      player: currentPlayerId,
      selectedCards: beatResult.map((c) => c.toString()),
      threshold: trickPoints >= 10 ? 150 : 100,
      trickPoints,
      reason: "can_beat_with_appropriate_strength",
    });
    return beatResult;
  }

  // Step 4: Fallback - dispose smallest combo
  const disposalCards = selectComboByStrategicValue(
    analysis.validCombos,
    trumpInfo,
    "strategic",
    "lowest",
  );

  gameLogger.debug("enhanced_following_trump_dispose", {
    player: currentPlayerId,
    selectedCards: disposalCards.map((c) => c.toString()),
    reason: "fallback_disposal",
  });

  return disposalCards;
}

/**
 * Handle non-trump lead valid combos - specialized for non-trump situations
 *
 * Enhanced algorithm:
 * 1. Contribute if teammate secure + safe timing
 * 2. Beat if can beat + not trumped by opponent
 * 3. Dispose smallest combo avoiding points
 */
export function handleNonTrumpLeadValidCombos(
  analysis: SuitAvailabilityResult,
  context: GameContext,
  trumpInfo: TrumpInfo,
  gameState: GameState,
  currentPlayerId: PlayerId,
): Card[] {
  if (!analysis.validCombos || analysis.validCombos.length === 0) {
    gameLogger.error("enhanced_following_no_nontrump_valid_combos", {
      player: currentPlayerId,
      scenario: analysis.scenario,
      message:
        "handleNonTrumpLeadValidCombos called with no valid combos - routing bug",
    });
    return [];
  }

  const trickAnalysis = context.trickWinnerAnalysis;
  if (!trickAnalysis) {
    gameLogger.error("enhanced_following_no_trick_analysis", {
      player: currentPlayerId,
      message:
        "handleNonTrumpLeadValidCombos called without trick analysis - context bug",
    });
    return analysis.validCombos[0].cards;
  }

  const { isTeammateWinning, isCurrentlyTrumped } = trickAnalysis;

  gameLogger.debug("enhanced_following_nontrump_lead_analysis", {
    player: currentPlayerId,
    validComboCount: analysis.validCombos.length,
    isTeammateWinning,
    isCurrentlyTrumped,
    comboTypes: analysis.validCombos.map((c) => c.type),
  });

  // Shortcut: If only one valid combo, just play it
  if (analysis.validCombos.length === 1) {
    gameLogger.debug("enhanced_following_single_combo_shortcut", {
      player: currentPlayerId,
      selectedCards: analysis.validCombos[0].cards.map((c) => c.toString()),
      reason: "only_one_valid_combo",
    });
    return analysis.validCombos[0].cards;
  }

  // Step 1: Check if we should contribute to teammate
  if (shouldContributeToTeammate(context, gameState, currentPlayerId)) {
    const contributionCards = selectComboByStrategicValue(
      analysis.validCombos,
      trumpInfo,
      "contribute",
      "lowest",
    );
    if (contributionCards.length > 0) {
      gameLogger.debug("enhanced_following_contribute_to_teammate", {
        player: currentPlayerId,
        selectedCards: contributionCards.map((c) => c.toString()),
        reason: "teammate_secure_and_safe_timing",
      });
      return contributionCards;
    }
  }

  // Step 2: Check if we should beat opponent (can beat + not trumped by opponent)
  if (!isTeammateWinning && !isCurrentlyTrumped) {
    const highestCombo = selectComboByStrategicValue(
      analysis.validCombos,
      trumpInfo,
      "basic",
      "highest",
    );

    // Check if this combo can actually beat the current winner
    const currentWinnerCards =
      gameState.currentTrick?.plays.find(
        (play) => play.playerId === context.trickWinnerAnalysis?.currentWinner,
      )?.cards || [];

    const canBeat = canBeatCombo(highestCombo, currentWinnerCards, trumpInfo);

    if (highestCombo.length > 0 && canBeat) {
      gameLogger.debug("enhanced_following_beat_opponent", {
        player: currentPlayerId,
        selectedCards: highestCombo.map((c) => c.toString()),
        reason: "can_beat_and_not_trumped",
      });
      return highestCombo;
    }
  }

  // Step 3: Fallback - dispose smallest combo avoiding points
  const disposalCards = selectComboByStrategicValue(
    analysis.validCombos,
    trumpInfo,
    "strategic",
    "lowest",
  );

  gameLogger.debug("enhanced_following_dispose_nontrump", {
    player: currentPlayerId,
    selectedCards: disposalCards.map((c) => c.toString()),
    reason: "fallback_disposal",
  });

  return disposalCards;
}

// =============== HELPER FUNCTIONS ===============

/**
 * Determine if we should contribute points to teammate (non-trump scenario)
 *
 * Conditions:
 * - teammate trumped it OR
 * - teammate winning non-trump AND biggest in suit by memory
 * AND
 * - (I'm 4th player OR next player not void)
 */
function shouldContributeToTeammate(
  context: GameContext,
  gameState: GameState,
  _currentPlayerId: PlayerId,
): boolean {
  const trickAnalysis = context.trickWinnerAnalysis;
  if (!trickAnalysis?.isTeammateWinning) {
    return false;
  }

  const currentTrick = gameState.currentTrick;
  if (!currentTrick) return false;

  // Check if I'm 4th player
  const isLastPlayer = currentTrick.plays.length === 3;

  // Check next player void status (only if not last player)
  let isNextPlayerVoid = false;
  if (!isLastPlayer) {
    const nextPlayerIndex = (gameState.currentPlayerIndex + 1) % 4;
    const nextPlayerId = gameState.players[nextPlayerIndex]?.id as PlayerId;
    const leadingSuit = currentTrick.plays[0]?.cards[0]?.suit;

    if (context.memoryContext?.cardMemory && nextPlayerId && leadingSuit) {
      const nextPlayerMemory =
        context.memoryContext.cardMemory.playerMemories[nextPlayerId];
      isNextPlayerVoid = nextPlayerMemory?.suitVoids.has(leadingSuit) ?? false;
    }
  }

  // Condition 1: Teammate trumped it
  if (trickAnalysis.isCurrentlyTrumped) {
    return isLastPlayer || !isNextPlayerVoid;
  }

  // Condition 2: Teammate winning non-trump AND biggest in suit by memory
  const currentWinnerPlay = currentTrick.plays.find(
    (play) => play.playerId === context.trickWinnerAnalysis?.currentWinner,
  );
  const teammateIsBiggestInSuit = currentWinnerPlay
    ? checkComboIsBiggestInSuit(
        currentWinnerPlay.cards,
        context,
        gameState,
        currentTrick,
      )
    : true;

  if (teammateIsBiggestInSuit) {
    return isLastPlayer || !isNextPlayerVoid;
  }

  return false;
}

/**
 * Check if we should contribute to teammate in trump scenario
 *
 * Conditions:
 * - teammate is winning AND
 * - (I'm 4th player OR teammate has strong trump >150)
 */
function shouldContributeToTeammateInTrump(
  context: GameContext,
  gameState: GameState,
  _currentPlayerId: PlayerId,
): boolean {
  const trickAnalysis = context.trickWinnerAnalysis;
  if (!trickAnalysis?.isTeammateWinning) {
    return false;
  }

  const currentTrick = gameState.currentTrick;
  if (!currentTrick) return false;

  // Check if I'm 4th player
  const isLastPlayer = currentTrick.plays.length === 3;

  // Get teammate's winning cards and check their strategic value
  const currentWinnerCards =
    currentTrick.plays.find(
      (play) => play.playerId === context.trickWinnerAnalysis?.currentWinner,
    )?.cards || [];

  const trumpInfo = context.trumpInfo || gameState.trumpInfo;
  if (!trumpInfo || currentWinnerCards.length === 0) {
    return isLastPlayer; // If can't analyze teammate strength, contribute only if 4th
  }

  // Calculate teammate's trump strength
  const teammateStrength = currentWinnerCards.reduce(
    (sum: number, card: Card) =>
      sum + calculateCardStrategicValue(card, trumpInfo, "basic"),
    0,
  );

  // Contribute if I'm 4th player OR teammate has strong trump (>150)
  return isLastPlayer || teammateStrength > 150;
}

/**
 * Attempt to beat current winner with appropriate threshold
 *
 * Unified logic for both high points (>=10) and low points (<10) scenarios
 * with different strength thresholds.
 */
function attemptToBeatWithThreshold(
  validCombos: Combo[],
  currentWinnerCards: Card[],
  trumpInfo: TrumpInfo,
  strengthThreshold: number,
  trickPoints: number,
  isTeammateWinning: boolean,
): Card[] | null {
  if (currentWinnerCards.length === 0) {
    return null; // Can't beat if no current winner
  }

  // Find combos that can beat the current winner
  const beatingCombos = validCombos.filter((combo) =>
    canBeatCombo(combo.cards, currentWinnerCards, trumpInfo),
  );

  if (beatingCombos.length === 0) {
    return null; // Can't beat current winner
  }

  // If opponent is winning, beat with combo that meets strength threshold
  if (!isTeammateWinning) {
    const strongBeatingCombos = beatingCombos.filter((combo) => {
      const comboStrength = combo.cards.reduce(
        (sum: number, card: Card) =>
          sum + calculateCardStrategicValue(card, trumpInfo, "basic"),
        0,
      );
      return comboStrength > strengthThreshold;
    });

    if (strongBeatingCombos.length > 0) {
      // Use the weakest combo that still meets the threshold
      return selectComboByStrategicValue(
        strongBeatingCombos,
        trumpInfo,
        "basic",
        "lowest",
      );
    }
    return null; // No combo meets strength threshold
  }

  // If teammate is winning, check if teammate is too weak
  const teammateStrength = currentWinnerCards.reduce(
    (sum: number, card: Card) =>
      sum + calculateCardStrategicValue(card, trumpInfo, "basic"),
    0,
  );

  const shouldBeatWeakTeammate =
    trickPoints >= 10
      ? teammateStrength < 150 // High points: beat if teammate <150
      : teammateStrength < 100; // Low points: beat if teammate <100 AND rank <10

  if (shouldBeatWeakTeammate) {
    // For low points, additional check: only beat if teammate rank < 10
    if (trickPoints < 10) {
      const teammateHasLowRank = currentWinnerCards.some((card) => {
        const cardValue = calculateCardStrategicValue(card, trumpInfo, "basic");
        return cardValue < 10; // Roughly equivalent to rank < 10
      });
      if (!teammateHasLowRank) {
        return null; // Don't beat teammate if they don't have low rank cards
      }
    }

    // Beat weak teammate with combo that meets strength threshold
    const strongBeatingCombos = beatingCombos.filter((combo) => {
      const comboStrength = combo.cards.reduce(
        (sum: number, card: Card) =>
          sum + calculateCardStrategicValue(card, trumpInfo, "basic"),
        0,
      );
      return comboStrength > strengthThreshold;
    });

    if (strongBeatingCombos.length > 0) {
      return selectComboByStrategicValue(
        strongBeatingCombos,
        trumpInfo,
        "basic",
        "lowest",
      );
    }
  }

  return null; // Don't beat strong teammate
}

/**
 * Check if given combo is biggest in the leading suit by memory analysis
 *
 * Algorithm:
 * 1. Get all remaining unseen cards for the leading suit
 * 2. Use suit availability analysis to see what combos are possible from unseen cards
 * 3. Check if any of those combos can beat the given combo
 * 4. If yes, combo is not biggest; if no, combo is biggest
 */
function checkComboIsBiggestInSuit(
  combo: Card[],
  context: GameContext,
  gameState: GameState,
  currentTrick: NonNullable<GameState["currentTrick"]>,
): boolean {
  const leadingSuit = currentTrick.plays[0]?.cards[0]?.suit;
  const trumpInfo = context.trumpInfo || gameState.trumpInfo;

  if (!leadingSuit || !trumpInfo) {
    return true; // Assume combo is biggest if we can't analyze
  }

  // Skip analysis if this is trump lead (trump cards don't follow this logic)
  if (currentTrick.plays[0]?.cards.some((card) => isTrump(card, trumpInfo))) {
    return true;
  }

  // Get all remaining unseen cards for the leading suit
  const unseenCards = getRemainingUnseenCards(leadingSuit, context, gameState);

  if (unseenCards.length === 0) {
    return true; // No more cards in suit, combo definitely is biggest
  }

  // Use suit availability analysis to see what combos are possible from unseen cards
  const leadingCards = currentTrick.plays[0]?.cards || [];
  const unseenAnalysis = analyzeSuitAvailability(
    leadingCards,
    unseenCards, // Treat unseen cards as a hypothetical player's hand
    trumpInfo,
  );

  // If no valid combos can be formed from unseen cards, combo is biggest
  if (
    unseenAnalysis.scenario !== "valid_combos" ||
    !unseenAnalysis.validCombos ||
    unseenAnalysis.validCombos.length === 0
  ) {
    return true;
  }

  // Check if any unseen combo can beat the given combo
  for (const unseenCombo of unseenAnalysis.validCombos) {
    const canBeat = canBeatCombo(unseenCombo.cards, combo, trumpInfo);
    if (canBeat) {
      // Found an unseen combo that can beat given combo - it is not biggest
      return false;
    }
  }

  // No unseen combo can beat given combo - it is biggest in suit
  return true;
}

// =============== COMBO SELECTION UTILITIES ===============

/**
 * Core combo selection function - selects combo based on strategic value
 *
 * @param validCombos - Array of combos to choose from
 * @param trumpInfo - Current trump information
 * @param mode - Strategic value calculation mode
 * @param direction - Whether to select highest or lowest value
 * @returns Selected combo cards
 */
export function selectComboByStrategicValue(
  validCombos: Combo[],
  trumpInfo: TrumpInfo,
  mode: "contribute" | "strategic" | "basic",
  direction: "highest" | "lowest",
): Card[] {
  if (validCombos.length === 0) {
    throw new Error("selectComboByStrategicValue called with no valid combos");
  }

  // Calculate strategic value for each combo
  const comboScores = validCombos.map((combo) => ({
    combo,
    score: combo.cards.reduce(
      (sum, card) => sum + calculateCardStrategicValue(card, trumpInfo, mode),
      0,
    ),
  }));

  // Sort by score based on direction
  comboScores.sort((a, b) =>
    direction === "highest" ? b.score - a.score : a.score - b.score,
  );

  return comboScores[0].combo.cards;
}