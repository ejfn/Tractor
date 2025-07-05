import {
  Card,
  Combo,
  ComboAnalysis,
  ComboType,
  GameContext,
  GameState,
  PlayerId,
  PositionStrategy,
  TrumpInfo,
} from "../../types";
import { gameLogger } from "../../utils/gameLogger";
import { getComboType } from "../../game/comboDetection";
import { detectLeadingMultiCombo } from "../../game/multiComboAnalysis";
import { executeMultiComboFollowingAlgorithm } from "../following/multiComboFollowingStrategy";
import { routeToDecision } from "./core/routingLogic";
import { analyzeSuitAvailability } from "./core/suitAvailabilityAnalysis";

/**
 * Phase 2: Statistics tracking for enhanced following algorithm
 */
interface EnhancedFollowingStats {
  totalInvocations: number;
  scenarioDistribution: Record<string, number>;
  memoryUtilization: number;
  averageProcessingTime: number;
  processingTimes: number[];
  validationFailures: number;
}

// Module-level statistics tracking
let algorithmStats: EnhancedFollowingStats = {
  totalInvocations: 0,
  scenarioDistribution: {
    valid_combos: 0,
    enough_remaining: 0,
    void: 0,
    insufficient: 0,
    multi_combo: 0,
  },
  memoryUtilization: 0,
  averageProcessingTime: 0,
  processingTimes: [],
  validationFailures: 0,
};

/**
 * Enhanced Following Strategy V2 - Main Entry Point
 *
 * Implements a systematic approach to following play decisions through:
 * 1. Analyze suit availability → Classify scenario
 * 2. Route to decision path → Based on classification
 * 3. Apply memory-enhanced logic → Integrate memory context
 * 4. Return optimal cards → Clean, traceable decisions
 *
 * This replaces the scattered position-specific logic with small, targeted
 * decisions that are easier to understand and maintain.
 */

/**
 * Main following play selection using enhanced following algorithm
 *
 * This function implements the core enhanced following algorithm that analyzes the
 * relationship between leading cards and player hand, classifies the scenario,
 * and routes to the appropriate decision path through small, targeted decisions.
 */
export function selectFollowingPlay(
  comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
  context: GameContext,
  positionStrategy: PositionStrategy,
  trumpInfo: TrumpInfo,
  gameState: GameState,
  currentPlayerId: PlayerId,
): Card[] {
  // Phase 2: Performance tracking start
  const startTime = performance.now();
  algorithmStats.totalInvocations++;

  // Get current player from game state first
  const currentPlayer = gameState.players.find((p) => p.id === currentPlayerId);
  if (!currentPlayer) {
    gameLogger.error("enhanced_following_no_current_player", {
      currentPlayerId,
      availablePlayers: gameState.players.map((p) => p.id),
    });
    return comboAnalyses.length > 0 ? comboAnalyses[0].combo.cards : [];
  }

  // Extract leading cards from game state
  const leadingCards = gameState.currentTrick?.plays[0]?.cards;
  if (!leadingCards || leadingCards.length === 0) {
    gameLogger.warn("enhanced_following_no_leading_cards", {
      player: currentPlayerId,
      trickExists: !!gameState.currentTrick,
    });
    return comboAnalyses.length > 0 ? comboAnalyses[0].combo.cards : [];
  }

  // Priority 0: Multi-combo handling (reuse existing implementation)
  const leadingComboType = getComboType(leadingCards, trumpInfo);
  if (leadingComboType === ComboType.Invalid) {
    const leadingMultiCombo = detectLeadingMultiCombo(leadingCards, trumpInfo);

    if (leadingMultiCombo.isMultiCombo) {
      const multiComboResult = executeMultiComboFollowingAlgorithm(
        leadingCards,
        currentPlayer.hand,
        gameState,
        currentPlayerId,
      );

      if (
        multiComboResult &&
        multiComboResult.strategy !== "no_valid_response"
      ) {
        gameLogger.debug("enhanced_following_multi_combo", {
          player: currentPlayerId,
          strategy: multiComboResult.strategy,
          cardCount: multiComboResult.cards.length,
          reasoning: multiComboResult.reasoning,
          canBeat: multiComboResult.canBeat,
        });

        return multiComboResult.cards;
      }
    }
  }

  // Log enhanced_following algorithm start
  gameLogger.debug("enhanced_following_algorithm_start", {
    player: currentPlayerId,
    position: context.trickPosition,
    leadingCardCount: leadingCards.length,
    leadingCards: leadingCards.map((c) => `${c.rank}${c.suit}`),
    handSize: currentPlayer.hand.length,
    memoryAvailable: !!context.memoryContext?.cardMemory,
    trickPoints: context.trickWinnerAnalysis?.trickPoints ?? 0,
  });

  // Phase 1: Analyze suit availability and classify scenario
  const analysis = analyzeSuitAvailability(
    leadingCards,
    currentPlayer.hand,
    trumpInfo,
  );

  // Phase 2: Update scenario statistics
  algorithmStats.scenarioDistribution[analysis.scenario]++;

  gameLogger.debug("enhanced_following_scenario_classification", {
    player: currentPlayerId,
    scenario: analysis.scenario,
    leadingSuit: analysis.leadingSuit,
    leadingComboType: analysis.leadingComboType,
    requiredLength: analysis.requiredLength,
    availableCount: analysis.availableCount,
    reasoning: analysis.reasoning,
  });

  // Phase 2: Route to appropriate decision path
  let selectedCards: Card[];

  try {
    selectedCards = routeToDecision(
      analysis,
      currentPlayer.hand,
      context,
      trumpInfo,
      gameState,
      currentPlayerId,
    );
  } catch (error) {
    gameLogger.error("enhanced_following_routing_error", {
      player: currentPlayerId,
      scenario: analysis.scenario,
      error: error instanceof Error ? error.message : String(error),
    });

    // Fallback to first available combo
    selectedCards =
      comboAnalyses.length > 0
        ? comboAnalyses[0].combo.cards
        : [currentPlayer.hand[0]];
  }

  // Phase 2: Card validation before returning
  if (!selectedCards || selectedCards.length === 0) {
    gameLogger.warn("enhanced_following_empty_selection", {
      player: currentPlayerId,
      scenario: analysis.scenario,
      fallbackToFirstCard: true,
    });

    selectedCards =
      currentPlayer.hand.length > 0 ? [currentPlayer.hand[0]] : [];
  }

  // Validate selected cards for safety
  const isValid = validateSelectedCards(
    selectedCards,
    currentPlayer.hand,
    analysis.requiredLength,
    currentPlayerId,
  );

  if (!isValid) {
    algorithmStats.validationFailures++;
    gameLogger.error("enhanced_following_validation_failed", {
      player: currentPlayerId,
      scenario: analysis.scenario,
      fallbackToFirstCard: true,
    });

    // Ultimate fallback - use first available card
    selectedCards =
      currentPlayer.hand.length > 0 ? [currentPlayer.hand[0]] : [];
  }

  // Final result logging
  gameLogger.debug("enhanced_following_algorithm_result", {
    player: currentPlayerId,
    position: context.trickPosition,
    scenario: analysis.scenario,
    selectedCardCount: selectedCards.length,
    selectedCards: selectedCards.map((c) => `${c.rank}${c.suit}`),
    success: selectedCards.length > 0,
  });

  // Phase 2: Complete performance tracking
  const endTime = performance.now();
  const processingTime = endTime - startTime;
  algorithmStats.processingTimes.push(processingTime);

  // Update average processing time
  algorithmStats.averageProcessingTime =
    algorithmStats.processingTimes.reduce((sum, time) => sum + time, 0) /
    algorithmStats.processingTimes.length;

  // Limit processingTimes array to last 100 entries for memory efficiency
  if (algorithmStats.processingTimes.length > 100) {
    algorithmStats.processingTimes = algorithmStats.processingTimes.slice(-100);
  }

  gameLogger.debug("enhanced_following_algorithm_performance", {
    player: currentPlayerId,
    processingSteps: [
      "suit_availability_analysis",
      "scenario_classification",
      "decision_routing",
      "card_selection",
      "validation",
    ],
    decisionPath: analysis.scenario,
    processingTime: `${processingTime.toFixed(2)}ms`,
    totalInvocations: algorithmStats.totalInvocations,
    validationFailures: algorithmStats.validationFailures,
  });

  return selectedCards;
}

/**
 * Validate that selected cards are legal for the current game state
 *
 * This is a safety check to ensure the enhanced following algorithm doesn't return
 * invalid card selections.
 *
 * @internal Currently unused but kept for future validation needs
 */
function validateSelectedCards(
  selectedCards: Card[],
  playerHand: Card[],
  requiredLength: number,
  currentPlayerId: PlayerId,
): boolean {
  // Check if cards are in player's hand
  const allCardsInHand = selectedCards.every((card) =>
    playerHand.some(
      (handCard) =>
        handCard.id === card.id ||
        (handCard.rank === card.rank && handCard.suit === card.suit),
    ),
  );

  if (!allCardsInHand) {
    gameLogger.error("enhanced_following_invalid_card_selection", {
      player: currentPlayerId,
      selectedCards: selectedCards.map((c) => `${c.rank}${c.suit}`),
      reason: "cards_not_in_hand",
    });
    return false;
  }

  // Check length requirement (basic validation)
  if (selectedCards.length !== requiredLength) {
    gameLogger.warn("enhanced_following_length_mismatch", {
      player: currentPlayerId,
      selectedLength: selectedCards.length,
      requiredLength,
      reason: "length_mismatch",
    });
    // This might be valid in some scenarios (insufficient cards), so just warn
  }

  return true;
}

/**
 * Get enhanced following algorithm statistics for analysis and debugging
 *
 * Phase 2: Returns real-time statistics from the algorithm execution.
 */
export function getEnhancedFollowingStats(): {
  totalInvocations: number;
  scenarioDistribution: Record<string, number>;
  memoryUtilization: number;
  averageProcessingTime: number;
  validationFailures: number;
  memoryUtilizationRate: number;
} {
  const memoryUtilizationRate =
    algorithmStats.totalInvocations > 0
      ? algorithmStats.memoryUtilization / algorithmStats.totalInvocations
      : 0;

  return {
    totalInvocations: algorithmStats.totalInvocations,
    scenarioDistribution: { ...algorithmStats.scenarioDistribution },
    memoryUtilization: algorithmStats.memoryUtilization,
    averageProcessingTime: algorithmStats.averageProcessingTime,
    validationFailures: algorithmStats.validationFailures,
    memoryUtilizationRate,
  };
}

/**
 * Reset enhanced following algorithm statistics
 *
 * Phase 2: Actually resets the tracking counters for new game sessions.
 */
export function resetEnhancedFollowingStats(): void {
  const previousStats = { ...algorithmStats };

  algorithmStats = {
    totalInvocations: 0,
    scenarioDistribution: {
      valid_combos: 0,
      enough_remaining: 0,
      void: 0,
      insufficient: 0,
      multi_combo: 0,
    },
    memoryUtilization: 0,
    averageProcessingTime: 0,
    processingTimes: [],
    validationFailures: 0,
  };

  gameLogger.debug("enhanced_following_algorithm_stats_reset", {
    timestamp: new Date().toISOString(),
    previousStats: {
      totalInvocations: previousStats.totalInvocations,
      averageProcessingTime: previousStats.averageProcessingTime,
      validationFailures: previousStats.validationFailures,
    },
  });
}
