import { canBeatCombo } from "../../game/cardComparison";
import { calculateCardStrategicValue } from "../../game/cardValue";
import {
  Card,
  Combo,
  GameContext,
  GameState,
  PlayerId,
  TrumpInfo,
} from "../../types";
import { gameLogger } from "../../utils/gameLogger";
import { selectComboByStrategicValue } from "./strategicSelection";
import { SuitAvailabilityResult } from "./suitAvailabilityAnalysis";
import { shouldContributeToTeammate } from "./teammateAnalysis";

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
  if (shouldContributeToTeammate(context, gameState, currentPlayerId)) {
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
    trickPoints,
    isTeammateWinning,
  );

  if (beatResult) {
    gameLogger.debug("enhanced_following_trump_beat_winner", {
      player: currentPlayerId,
      selectedCards: beatResult.map((c) => c.toString()),
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

  const strengthThreshold = trickPoints >= 10 ? 150 : 100; // High points: 150, Low points: 100

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

  if (teammateStrength < strengthThreshold) {
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
