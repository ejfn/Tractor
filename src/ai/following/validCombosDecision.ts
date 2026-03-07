import { canBeatCombo } from "../../game/cardComparison";
import { calculateCardStrategicValue } from "../../game/cardValue";
import {
  Card,
  Combo,
  GameContext,
  GameState,
  PlayerId,
  TrickPosition,
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
 * 2.5. Position-aware strategy: 2nd proactive raise, 3rd blocking, 4th optimal
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
    gameLogger.error("following_no_trump_valid_combos", {
      player: currentPlayerId,
      scenario: analysis.scenario,
      message:
        "handleTrumpLeadValidCombos called with no valid combos - routing bug",
    });
    return [];
  }

  const trickAnalysis = context.trickWinnerAnalysis;
  if (!trickAnalysis) {
    gameLogger.error("following_trump_no_trick_analysis", {
      player: currentPlayerId,
      message:
        "handleTrumpLeadValidCombos called without trick analysis - context bug",
    });
    return analysis.validCombos[0].cards;
  }

  const { isTeammateWinning, trickPoints } = trickAnalysis;

  gameLogger.debug("following_trump_lead_analysis", {
    player: currentPlayerId,
    validComboCount: analysis.validCombos.length,
    isTeammateWinning,
    trickPoints,
    comboTypes: analysis.validCombos.map((c) => c.type),
  });

  // Step 1: If only one valid combo, just play it
  if (analysis.validCombos.length === 1) {
    gameLogger.debug("following_trump_single_combo_shortcut", {
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
      gameLogger.debug("following_trump_contribute_teammate", {
        player: currentPlayerId,
        selectedCards: contributionCards.map((c) => c.toString()),
        reason: "teammate_winning_and_conditions_met",
      });
      return contributionCards;
    }
  }

  // Step 2.5: Position-aware trump strategy
  const positionResult = applyPositionAwareTrumpStrategy(
    analysis.validCombos,
    context,
    trumpInfo,
    gameState,
    currentPlayerId,
  );

  if (positionResult) {
    gameLogger.debug("following_trump_position_aware", {
      player: currentPlayerId,
      position: context.trickPosition,
      selectedCards: positionResult.map((c) => c.toString()),
      reason: "position_aware_strategy",
    });
    return positionResult;
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
    gameLogger.debug("following_trump_beat_winner", {
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

  gameLogger.debug("following_trump_dispose", {
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
    gameLogger.error("following_no_nontrump_valid_combos", {
      player: currentPlayerId,
      scenario: analysis.scenario,
      message:
        "handleNonTrumpLeadValidCombos called with no valid combos - routing bug",
    });
    return [];
  }

  const trickAnalysis = context.trickWinnerAnalysis;
  if (!trickAnalysis) {
    gameLogger.error("following_no_trick_analysis", {
      player: currentPlayerId,
      message:
        "handleNonTrumpLeadValidCombos called without trick analysis - context bug",
    });
    return analysis.validCombos[0].cards;
  }

  const { isTeammateWinning, isCurrentlyTrumped } = trickAnalysis;

  gameLogger.debug("following_nontrump_lead_analysis", {
    player: currentPlayerId,
    validComboCount: analysis.validCombos.length,
    isTeammateWinning,
    isCurrentlyTrumped,
    comboTypes: analysis.validCombos.map((c) => c.type),
  });

  // Shortcut: If only one valid combo, just play it
  if (analysis.validCombos.length === 1) {
    gameLogger.debug("following_single_combo_shortcut", {
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
      gameLogger.debug("following_contribute_to_teammate", {
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
      gameLogger.debug("following_beat_opponent", {
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

  gameLogger.debug("following_dispose_nontrump", {
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

  if (isTeammateWinning) {
    // If teammate is winning, check if teammate is too weak
    const teammateStrength = currentWinnerCards.reduce(
      (max: number, card: Card) => {
        const value = calculateCardStrategicValue(card, trumpInfo, "basic");
        max = Math.max(max, value);
        return max;
      },
      0,
    );

    if (teammateStrength > strengthThreshold) {
      return null;
    }
  }

  const strongBeatingCombos = beatingCombos.filter((combo) => {
    combo.cards.some((card) => {
      const cardStrength = calculateCardStrategicValue(
        card,
        trumpInfo,
        "contribute",
      );
      return cardStrength > strengthThreshold;
    });
  });

  if (strongBeatingCombos.length > 0) {
    // Use the weakest combo that still meets the threshold
    return selectComboByStrategicValue(
      strongBeatingCombos,
      trumpInfo,
      "contribute",
      "lowest",
    );
  }

  return null; // Don't beat strong teammate
}

// =============== POSITION-AWARE TRUMP STRATEGY ===============

/**
 * Position-aware trump strategy for following a trump lead
 *
 * Position-specific logic:
 * - 2nd Player: Proactively raises with a mid-range trump when leader plays weak trump
 * - 3rd Player: Blocks to prevent 4th player from cheaply winning; raises to protect weak teammate
 * - 4th Player: Beats with cheapest possible combo (perfect information)
 */
function applyPositionAwareTrumpStrategy(
  validCombos: Combo[],
  context: GameContext,
  trumpInfo: TrumpInfo,
  gameState: GameState,
  currentPlayerId: PlayerId,
): Card[] | null {
  const trickAnalysis = context.trickWinnerAnalysis;
  if (!trickAnalysis) return null;

  const { isTeammateWinning, trickPoints } = trickAnalysis;
  const position = context.trickPosition;

  // Get current winner's cards for comparison
  const currentWinnerCards =
    gameState.currentTrick?.plays.find(
      (play) => play.playerId === trickAnalysis.currentWinner,
    )?.cards || [];

  if (currentWinnerCards.length === 0) return null;

  // Assess the current winner's trump strength
  const currentWinnerStrength = getMaxStrategicValue(
    currentWinnerCards,
    trumpInfo,
  );

  switch (position) {
    case TrickPosition.Second:
      return handleSecondPlayerTrumpStrategy(
        validCombos,
        currentWinnerCards,
        currentWinnerStrength,
        isTeammateWinning,
        trumpInfo,
      );

    case TrickPosition.Third:
      return handleThirdPlayerTrumpStrategy(
        validCombos,
        context,
        gameState,
        currentPlayerId,
        currentWinnerCards,
        currentWinnerStrength,
        isTeammateWinning,
        trickPoints,
        trumpInfo,
      );

    case TrickPosition.Fourth:
      return handleFourthPlayerTrumpStrategy(
        validCombos,
        currentWinnerCards,
        isTeammateWinning,
        trumpInfo,
      );

    default:
      return null;
  }
}

/**
 * 2nd Player: Proactive raise when leader plays a weak trump
 *
 * When opponent leads with a weak trump (strategic value < 110),
 * play the cheapest combo that can beat it to take early control.
 */
function handleSecondPlayerTrumpStrategy(
  validCombos: Combo[],
  currentWinnerCards: Card[],
  currentWinnerStrength: number,
  isTeammateWinning: boolean,
  trumpInfo: TrumpInfo,
): Card[] | null {
  // Only raise against weak leads; strong leads handled by generic beat logic
  if (currentWinnerStrength >= 110) return null;

  // When teammate is leading with a weak trump, also consider raising
  // to protect the trick from opponents overtaking later
  // Find cheapest combo that can beat the current winner
  const beatingCombos = validCombos.filter((combo) =>
    canBeatCombo(combo.cards, currentWinnerCards, trumpInfo),
  );

  if (beatingCombos.length === 0) return null;

  // Select the cheapest beating combo to take control without wasting strong trumps
  const cheapestBeat = selectComboByStrategicValue(
    beatingCombos,
    trumpInfo,
    "contribute",
    "lowest",
  );

  // Don't raise if our cheapest beat is too expensive (value > 150, e.g. jokers)
  const cheapestBeatStrength = getMaxStrategicValue(cheapestBeat, trumpInfo);
  if (cheapestBeatStrength > 150) return null;

  gameLogger.debug("following_trump_2nd_proactive_raise", {
    reason: isTeammateWinning
      ? "protecting_teammate_weak_lead"
      : "taking_control_from_opponent",
    leaderStrength: currentWinnerStrength,
    raiseStrength: cheapestBeatStrength,
  });

  return cheapestBeat;
}

/**
 * 3rd Player: Block opponents and protect teammates
 *
 * - When opponent is winning: beat with cheapest combo to block 4th player
 * - When teammate winning with weak trump: raise to protect against 4th player (opponent)
 */
function handleThirdPlayerTrumpStrategy(
  validCombos: Combo[],
  context: GameContext,
  gameState: GameState,
  currentPlayerId: PlayerId,
  currentWinnerCards: Card[],
  currentWinnerStrength: number,
  isTeammateWinning: boolean,
  _trickPoints: number,
  trumpInfo: TrumpInfo,
): Card[] | null {
  // Check if 4th player is an opponent
  const fourthPlayerIsOpponent = isFourthPlayerOpponent(
    context,
    gameState,
    currentPlayerId,
  );

  if (!isTeammateWinning) {
    // Opponent is winning — block to prevent 4th player from cheaply winning
    const beatingCombos = validCombos.filter((combo) =>
      canBeatCombo(combo.cards, currentWinnerCards, trumpInfo),
    );

    if (beatingCombos.length === 0) return null;

    // Beat with cheapest possible combo
    const cheapestBeat = selectComboByStrategicValue(
      beatingCombos,
      trumpInfo,
      "contribute",
      "lowest",
    );

    // Don't waste high-value trumps (> 150) for blocking when no points at stake
    const cheapestBeatStrength = getMaxStrategicValue(cheapestBeat, trumpInfo);
    if (cheapestBeatStrength > 150) return null;

    gameLogger.debug("following_trump_3rd_block_opponent", {
      reason: "blocking_opponent_for_4th_player",
      currentWinnerStrength,
      blockStrength: cheapestBeatStrength,
    });

    return cheapestBeat;
  }

  // Teammate is winning with a weak trump — raise to protect against 4th player overtaking
  if (
    isTeammateWinning &&
    currentWinnerStrength < 110 &&
    fourthPlayerIsOpponent
  ) {
    const beatingCombos = validCombos.filter((combo) =>
      canBeatCombo(combo.cards, currentWinnerCards, trumpInfo),
    );

    if (beatingCombos.length === 0) return null;

    // Raise with the cheapest combo that can beat the weak teammate
    const cheapestRaise = selectComboByStrategicValue(
      beatingCombos,
      trumpInfo,
      "contribute",
      "lowest",
    );

    // Only raise if our card isn't too expensive
    const raiseStrength = getMaxStrategicValue(cheapestRaise, trumpInfo);
    if (raiseStrength > 150) return null;

    gameLogger.debug("following_trump_3rd_protect_teammate", {
      reason: "raising_to_protect_weak_teammate",
      teammateStrength: currentWinnerStrength,
      raiseStrength,
    });

    return cheapestRaise;
  }

  return null;
}

/**
 * 4th Player: Perfect information optimization
 *
 * When opponent is winning, beat with cheapest possible combo.
 * When teammate is winning, handled by earlier teammate contribution step.
 */
function handleFourthPlayerTrumpStrategy(
  validCombos: Combo[],
  currentWinnerCards: Card[],
  isTeammateWinning: boolean,
  trumpInfo: TrumpInfo,
): Card[] | null {
  // When teammate is winning, don't overtake (handled by Step 2)
  if (isTeammateWinning) return null;

  // Opponent is winning — beat with cheapest possible combo (no one plays after)
  const beatingCombos = validCombos.filter((combo) =>
    canBeatCombo(combo.cards, currentWinnerCards, trumpInfo),
  );

  if (beatingCombos.length === 0) return null;

  const cheapestBeat = selectComboByStrategicValue(
    beatingCombos,
    trumpInfo,
    "contribute",
    "lowest",
  );

  gameLogger.debug("following_trump_4th_optimal_beat", {
    reason: "4th_player_cheapest_beat",
    beatStrength: getMaxStrategicValue(cheapestBeat, trumpInfo),
  });

  return cheapestBeat;
}

// =============== HELPER FUNCTIONS ===============

/**
 * Get the maximum strategic value across a set of cards
 */
function getMaxStrategicValue(cards: Card[], trumpInfo: TrumpInfo): number {
  return cards.reduce((max, card) => {
    const value = calculateCardStrategicValue(card, trumpInfo, "basic");
    return Math.max(max, value);
  }, 0);
}

/**
 * Check if the 4th player (next after current) in the trick is an opponent
 */
function isFourthPlayerOpponent(
  context: GameContext,
  gameState: GameState,
  currentPlayerId: PlayerId,
): boolean {
  // When we are 3rd player, the 4th player is the next player after us
  const currentPlayerIndex = gameState.players.findIndex(
    (p) => p.id === currentPlayerId,
  );
  if (currentPlayerIndex === -1) return false;

  const fourthPlayerIndex = (currentPlayerIndex + 1) % 4;
  const fourthPlayer = gameState.players[fourthPlayerIndex];
  const currentPlayer = gameState.players[currentPlayerIndex];

  if (!fourthPlayer || !currentPlayer) return false;

  // They are opponents if they are on different teams
  return fourthPlayer.team !== currentPlayer.team;
}
