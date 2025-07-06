import { calculateCardStrategicValue, isTrump } from "../../game/cardValue";
import { Card, ComboType, GameContext, GameState, PlayerId, TrumpInfo } from "../../types";
import { gameLogger } from "../../utils/gameLogger";
import {
  SuitAvailabilityResult,
} from "./suitAvailabilityAnalysis";
// Memory integration V2 focuses on three core responsibilities:
// 1. Next player void status
// 2. Beatability analysis
// 3. Remaining points analysis
// These are used by strategic selection functions
import {
  selectLowestValueNonPointCombo,
  selectPointContribution,
  selectStrategicDisposal,
} from "./strategicSelection";
import {
  handleTrumpLeadValidCombos,
  handleNonTrumpLeadValidCombos,
} from "./validCombosDecision";

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

/**
 * Get combo requirements based on leading combo type
 */
function getComboRequirements(
  leadingComboType: ComboType,
  requiredLength: number,
): {
  minimumPairs: number;
  minimumTractors: number;
  canUseMixed: boolean;
} {
  switch (leadingComboType) {
    case ComboType.Single:
      return {
        minimumPairs: 0,
        minimumTractors: 0,
        canUseMixed: true,
      };
    case ComboType.Pair:
      return {
        minimumPairs: requiredLength / 2, // Each pair is 2 cards
        minimumTractors: 0,
        canUseMixed: false,
      };
    case ComboType.Tractor:
      return {
        minimumPairs: requiredLength / 2, // Each pair is 2 cards
        minimumTractors: 1, // Need at least one tractor
        canUseMixed: false,
      };
    default:
      // Multi-combo or other - treat as singles
      return {
        minimumPairs: 0,
        minimumTractors: 0,
        canUseMixed: true,
      };
  }
}

