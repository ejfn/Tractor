import { Card, GameContext, GameState, PlayerId, TrumpInfo } from "../../types";
import { gameLogger } from "../../utils/gameLogger";
import { handleInsufficientScenario } from "./crossSuitDecision";
import { handleEnoughRemainingScenario } from "./sameSuitDecision";
import { selectStrategicDisposal } from "./strategicSelection";
import { SuitAvailabilityResult } from "./suitAvailabilityAnalysis";
import {
  handleNonTrumpLeadValidCombos,
  handleTrumpLeadValidCombos,
} from "./validCombosDecision";
import { handleVoidScenario } from "./voidDecision";

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
          currentPlayerId,
        );

      case "insufficient":
        return handleInsufficientScenario(
          analysis,
          playerHand,
          context,
          trumpInfo,
          gameState,
          currentPlayerId,
        );

      case "void":
        return handleVoidScenario(
          analysis,
          playerHand,
          context,
          trumpInfo,
          gameState,
          currentPlayerId,
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
