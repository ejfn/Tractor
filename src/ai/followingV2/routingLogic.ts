import { canBeatCombo } from "../../game/cardComparison";
import { calculateCardStrategicValue, isTrump } from "../../game/cardValue";
import { Card, GameContext, GameState, PlayerId, TrumpInfo } from "../../types";
import { gameLogger } from "../../utils/gameLogger";
import { getRemainingUnseenCards } from "../aiGameContext";
import {
  analyzeSuitAvailability,
  SuitAvailabilityResult,
} from "./suitAvailabilityAnalysis";
// Memory integration V2 focuses on three core responsibilities:
// 1. Next player void status
// 2. Beatability analysis
// 3. Remaining points analysis
// These are used by strategic selection functions
import { selectComboByStrategicValue } from "./comboSelection";
import {
  selectLowestValueNonPointCombo,
  selectPointContribution,
  selectStrategicDisposal,
} from "./strategicSelection";

/**
 * Routing Logic - Main decision router for enhanced following strategy
 *
 * Routes to appropriate decision paths based on scenario classification.
 * Phase 1 implementation uses existing functions as placeholders.
 */

/**
 * Main routing function that directs to appropriate decision path
 *
 * Based on the scenario classification from suit availability analysis,
 * routes to the correct decision handler.
 */
export function routeToDecision(
  analysis: SuitAvailabilityResult,
  playerHand: Card[],
  context: GameContext,
  trumpInfo: TrumpInfo,
  gameState: GameState,
  currentPlayerId: PlayerId,
): Card[] {
  // Extract trick analysis for use across scenarios
  const { isTrumpLead } = context.trickWinnerAnalysis || {};

  gameLogger.debug("enhanced_following_routing", {
    player: currentPlayerId,
    scenario: analysis.scenario,
    leadingSuit: analysis.leadingSuit,
    leadingComboType: analysis.leadingComboType,
    requiredLength: analysis.requiredLength,
    availableCount: analysis.availableCount,
    reasoning: analysis.reasoning,
    isTrumpLead,
  });

  try {
    switch (analysis.scenario) {
      case "valid_combos":
        // Split valid combos by trump lead vs non-trump lead
        if (isTrumpLead) {
          return handleTrumpLeadValidCombos(
            analysis,
            context,
            trumpInfo,
            gameState,
            currentPlayerId,
          );
        } else {
          return handleNonTrumpLeadValidCombos(
            analysis,
            context,
            trumpInfo,
            gameState,
            currentPlayerId,
          );
        }

      case "enough_remaining":
        return handleEnoughRemainingScenario(
          analysis,
          context,
          trumpInfo,
          gameState,
        );

      case "void":
        return handleVoidScenario(
          playerHand,
          context,
          trumpInfo,
          gameState,
          currentPlayerId,
        );

      case "insufficient":
        return handleInsufficientScenario(
          analysis,
          playerHand,
          context,
          trumpInfo,
        );

      default:
        gameLogger.warn("unknown_enhanced_following_scenario", {
          scenario: analysis.scenario,
          player: currentPlayerId,
        });
        return fallbackSelection(playerHand, context, gameState, trumpInfo);
    }
  } catch (error) {
    gameLogger.error("enhanced_following_routing_error", {
      error: error instanceof Error ? error.message : String(error),
      scenario: analysis.scenario,
      player: currentPlayerId,
    });

    return fallbackSelection(playerHand, context, gameState, trumpInfo);
  }
}

/**
 * Handle trump lead valid combos - specialized for trump competition
 *
 * V2: Enhanced algorithm with A/B/C/D strategy classification
 */
function handleTrumpLeadValidCombos(
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
    return fallbackSelection([], context, gameState, trumpInfo);
  }

  gameLogger.debug("enhanced_following_trump_lead_valid_combos", {
    player: currentPlayerId,
    validComboCount: analysis.validCombos.length,
    comboTypes: analysis.validCombos.map((c) => c.type),
  });

  // Shortcut: If only one valid combo, just play it
  if (analysis.validCombos.length === 1) {
    gameLogger.debug("enhanced_following_trump_single_combo_shortcut", {
      player: currentPlayerId,
      selectedCards: analysis.validCombos[0].cards.map((c) => c.toString()),
      reason: "only_one_valid_combo",
    });
    return analysis.validCombos[0].cards;
  }

  // TODO: Implement V2 enhanced trump lead algorithm
  // For now, use strategic disposal as fallback
  const selectedCards = selectStrategicDisposal(
    analysis.validCombos[0].cards,
    analysis.requiredLength,
    trumpInfo,
  );

  gameLogger.debug("enhanced_following_trump_lead_result", {
    player: currentPlayerId,
    selectedCardCount: selectedCards.length,
    selectedCards: selectedCards.map((c) => c.toString()),
  });

  return selectedCards;
}

/**
 * Handle non-trump lead valid combos - specialized for non-trump situations
 *
 * Enhanced algorithm:
 * 1. Contribute if teammate secure + safe timing
 * 2. Beat if can beat + not trumped by opponent
 * 3. Dispose smallest combo avoiding points
 */
function handleNonTrumpLeadValidCombos(
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
    return fallbackSelection([], context, gameState, trumpInfo);
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
 * Handle enough remaining scenario - same suit contribute or dispose
 *
 * Phase 1: Use existing point contribution and disposal logic
 */
function handleEnoughRemainingScenario(
  analysis: SuitAvailabilityResult,
  context: GameContext,
  trumpInfo: TrumpInfo,
  gameState: GameState,
): Card[] {
  if (!analysis.remainingCards || analysis.remainingCards.length === 0) {
    gameLogger.warn("enhanced_following_no_remaining_cards", {});
    return fallbackSelection([], context, gameState, trumpInfo);
  }

  gameLogger.debug("enhanced_following_enough_remaining_decision", {
    remainingCount: analysis.remainingCards.length,
    requiredLength: analysis.requiredLength,
    trickPoints: context.trickWinnerAnalysis?.trickPoints ?? 0,
  });

  // Phase 2: Enhanced analysis for enough remaining scenario
  const requirements = getComboRequirements(
    analysis.leadingComboType,
    analysis.requiredLength,
  );

  // Simple point timing analysis - placeholder for Phase 1
  const trickPoints = context.trickWinnerAnalysis?.trickPoints ?? 0;
  const pointTiming = {
    shouldContribute: trickPoints >= 10,
    priority: trickPoints >= 15 ? "high" : "medium",
    expectedValue: trickPoints,
    reasoning: [`trick_points_${trickPoints}`],
  };

  gameLogger.debug("enhanced_following_enough_remaining_analysis", {
    remainingCount: analysis.remainingCards.length,
    requirements: {
      minimumPairs: requirements.minimumPairs,
      minimumTractors: requirements.minimumTractors,
      canUseMixed: requirements.canUseMixed,
    },
    pointTiming: {
      shouldContribute: pointTiming.shouldContribute,
      priority: pointTiming.priority,
    },
  });

  if (pointTiming.shouldContribute) {
    gameLogger.debug("enhanced_following_point_contribution", {
      priority: pointTiming.priority,
      expectedValue: pointTiming.expectedValue,
      reasoning: pointTiming.reasoning,
    });

    // Use V2 point contribution logic
    return selectPointContribution(
      analysis.remainingCards,
      analysis.requiredLength,
      trumpInfo,
    );
  } else {
    gameLogger.debug("enhanced_following_same_suit_disposal", {
      reasoning: pointTiming.reasoning,
    });

    // Use V2 disposal logic
    return selectLowestValueNonPointCombo(
      analysis.remainingCards,
      analysis.requiredLength,
      trumpInfo,
    );
  }
}

/**
 * Handle void scenario - trump decision or cross-suit play
 *
 * Enhanced for Phase 1: Smart trump selection based on memory and context
 */
function handleVoidScenario(
  playerHand: Card[],
  context: GameContext,
  trumpInfo: TrumpInfo,
  gameState: GameState,
  currentPlayerId: PlayerId,
): Card[] {
  gameLogger.debug("enhanced_following_void_scenario", {
    player: currentPlayerId,
    handSize: playerHand.length,
    trickPoints: context.trickWinnerAnalysis?.trickPoints ?? 0,
  });

  const trumpCards = playerHand.filter((card) => isTrump(card, trumpInfo));

  if (trumpCards.length > 0) {
    // Enhanced trump selection logic for third player scenarios
    const trickPoints = context.trickWinnerAnalysis?.trickPoints ?? 0;
    const isTeammateWinning =
      context.trickWinnerAnalysis?.isTeammateWinning ?? false;

    // Determine next player and check if they're void
    const nextPlayerIndex = (gameState.currentPlayerIndex + 1) % 4;
    const nextPlayerId = gameState.players[nextPlayerIndex]?.id as PlayerId;
    const leadingSuit = gameState.currentTrick?.plays[0]?.cards[0]?.suit;

    let isNextPlayerVoid = false;
    if (context.memoryContext?.cardMemory && nextPlayerId && leadingSuit) {
      const nextPlayerMemory =
        context.memoryContext.cardMemory.playerMemories[nextPlayerId];
      isNextPlayerVoid = nextPlayerMemory?.suitVoids.has(leadingSuit) ?? false;
    }

    gameLogger.debug("enhanced_following_enhanced_trump_analysis", {
      player: currentPlayerId,
      trumpCount: trumpCards.length,
      trickPoints,
      isTeammateWinning,
      nextPlayerId,
      isNextPlayerVoid,
      trumpCards: trumpCards.map((c) => c.toString()),
    });

    // Smart trump selection based on scenario
    let selectedTrump: Card;

    if (isNextPlayerVoid) {
      // Next player is void - trump selection based on points in trick
      if (trickPoints >= 15) {
        // High points: use highest trump
        selectedTrump = trumpCards.sort(
          (a, b) =>
            calculateCardStrategicValue(b, trumpInfo, "basic") -
            calculateCardStrategicValue(a, trumpInfo, "basic"),
        )[0];
        gameLogger.debug("enhanced_following_trump_selection", {
          player: currentPlayerId,
          reason: "high_points_next_void",
          selected: `${selectedTrump.rank}${selectedTrump.suit}`,
        });
      } else if (trickPoints >= 5) {
        // Medium points: use trump > 10 (Jack, Queen, King, Ace)
        const mediumTrump = trumpCards.filter((card) => {
          const value = calculateCardStrategicValue(card, trumpInfo, "basic");
          return value > 10; // Roughly Jack level and above
        });

        if (mediumTrump.length > 0) {
          selectedTrump = mediumTrump.sort(
            (a, b) =>
              calculateCardStrategicValue(a, trumpInfo, "basic") -
              calculateCardStrategicValue(b, trumpInfo, "basic"),
          )[0]; // Use lowest of the medium trumps
        } else {
          selectedTrump = trumpCards.sort(
            (a, b) =>
              calculateCardStrategicValue(a, trumpInfo, "basic") -
              calculateCardStrategicValue(b, trumpInfo, "basic"),
          )[0]; // Use lowest trump
        }

        gameLogger.debug("enhanced_following_trump_selection", {
          player: currentPlayerId,
          reason: "medium_points_next_void",
          selected: `${selectedTrump.rank}${selectedTrump.suit}`,
          mediumTrumpAvailable: mediumTrump.length > 0,
        });
      } else {
        // Low/no points: use lowest trump
        selectedTrump = trumpCards.sort(
          (a, b) =>
            calculateCardStrategicValue(a, trumpInfo, "basic") -
            calculateCardStrategicValue(b, trumpInfo, "basic"),
        )[0];
        gameLogger.debug("enhanced_following_trump_selection", {
          player: currentPlayerId,
          reason: "low_points_next_void",
          selected: `${selectedTrump.rank}${selectedTrump.suit}`,
        });
      }
    } else {
      // Next player is NOT void - more strategic trump selection
      if (trickPoints >= 5) {
        // There are points to collect - use point trump if available
        const pointTrump = trumpCards.filter((card) => card.points > 0);

        if (pointTrump.length > 0) {
          selectedTrump = pointTrump[0]; // Use first point trump
          gameLogger.debug("enhanced_following_trump_selection", {
            player: currentPlayerId,
            reason: "points_available_next_not_void",
            selected: `${selectedTrump.rank}${selectedTrump.suit}`,
            isPointTrump: true,
          });
        } else {
          // No point trump - use medium trump
          selectedTrump = trumpCards.sort(
            (a, b) =>
              calculateCardStrategicValue(b, trumpInfo, "basic") -
              calculateCardStrategicValue(a, trumpInfo, "basic"),
          )[0];
          gameLogger.debug("enhanced_following_trump_selection", {
            player: currentPlayerId,
            reason: "points_available_no_point_trump",
            selected: `${selectedTrump.rank}${selectedTrump.suit}`,
          });
        }
      } else {
        // Low points - conservative trump usage
        selectedTrump = trumpCards.sort(
          (a, b) =>
            calculateCardStrategicValue(a, trumpInfo, "basic") -
            calculateCardStrategicValue(b, trumpInfo, "basic"),
        )[0];
        gameLogger.debug("enhanced_following_trump_selection", {
          player: currentPlayerId,
          reason: "low_points_conservative",
          selected: `${selectedTrump.rank}${selectedTrump.suit}`,
        });
      }
    }

    return [selectedTrump];
  }

  // No trump usage - fall back to cross-suit disposal
  gameLogger.debug("enhanced_following_cross_suit_disposal", {
    player: currentPlayerId,
    reason: "no_trump_available",
  });

  // Use V2 strategic disposal for cross-suit
  return selectStrategicDisposal(playerHand, 1, trumpInfo);
}

/**
 * Handle insufficient scenario - use remaining + cross-suit fill
 *
 * Phase 1: Simple fill strategy using lowest value cards
 */
function handleInsufficientScenario(
  analysis: SuitAvailabilityResult,
  playerHand: Card[],
  context: GameContext,
  trumpInfo: TrumpInfo,
): Card[] {
  if (!analysis.remainingCards) {
    gameLogger.warn("enhanced_following_insufficient_no_remaining", {});
    return fallbackSelection(playerHand, context, {} as GameState, trumpInfo);
  }

  const needed = analysis.requiredLength;
  const available = analysis.remainingCards.length;
  const shortfall = needed - available;

  gameLogger.debug("enhanced_following_insufficient_fill", {
    needed,
    available,
    shortfall,
    leadingSuit: analysis.leadingSuit,
  });

  // Use all remaining cards in suit
  const selectedCards = [...analysis.remainingCards];

  // Fill shortfall with cross-suit cards (avoid trump)
  const crossSuitCards = playerHand.filter(
    (card) =>
      !analysis.remainingCards?.includes(card) && !isTrump(card, trumpInfo),
  );

  // Sort by strategic value (lowest first for disposal)
  const sortedCrossSuit = crossSuitCards.sort(
    (a, b) =>
      calculateCardStrategicValue(a, trumpInfo, "basic") -
      calculateCardStrategicValue(b, trumpInfo, "basic"),
  );

  // Add lowest value cross-suit cards to fill
  const fillCards = sortedCrossSuit.slice(0, shortfall);
  selectedCards.push(...fillCards);

  gameLogger.debug("enhanced_following_insufficient_result", {
    suitCards: analysis.remainingCards.length,
    fillCards: fillCards.length,
    totalSelected: selectedCards.length,
    selectedCards: selectedCards.map((c) => c.toString()),
  });

  return selectedCards;
}

/**
 * Fallback selection when other logic fails
 *
 * Simple safe selection to ensure we always return valid cards.
 */
function fallbackSelection(
  playerHand: Card[],
  _context: GameContext,
  _gameState: GameState,
  trumpInfo?: TrumpInfo,
): Card[] {
  gameLogger.debug("enhanced_following_fallback_selection", {
    handSize: playerHand.length,
    reason: "routing_fallback",
  });

  if (playerHand.length === 0) {
    gameLogger.error("enhanced_following_empty_hand", {});
    return [];
  }

  // Use V2 strategic disposal as fallback
  try {
    if (trumpInfo) {
      return selectStrategicDisposal(playerHand, 1, trumpInfo);
    } else {
      // Ultimate fallback without trump info - just return first card
      return [playerHand[0]];
    }
  } catch (error) {
    gameLogger.error("enhanced_following_fallback_error", {
      error: error instanceof Error ? error.message : String(error),
    });

    // Ultimate fallback - just return first card
    return [playerHand[0]];
  }
}

// =============== HELPER FUNCTIONS FOR NON-TRUMP LEAD ALGORITHM ===============

/**
 * Determine if we should contribute points to teammate
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
