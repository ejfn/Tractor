import { getComboType } from "../../game/comboDetection";
import {
  Card,
  ComboType,
  GameContext,
  GameState,
  PlayerId,
  TrumpInfo,
} from "../../types";
import { gameLogger } from "../../utils/gameLogger";
import { executeMultiComboFollowingAlgorithm } from "./multiComboFollowingStrategy";
import { routeToDecision } from "./routingLogic";
import { analyzeSuitAvailability } from "./suitAvailabilityAnalysis";

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

export function selectFollowingPlay(
  context: GameContext,
  trumpInfo: TrumpInfo,
  gameState: GameState,
  currentPlayerId: PlayerId,
): Card[] {
  // Phase 2: Performance tracking start
  const startTime = performance.now();

  // Get current player from game state first
  const currentPlayer = gameState.players.find((p) => p.id === currentPlayerId);
  if (!currentPlayer) {
    gameLogger.error("following_player_not_found", {
      player: currentPlayerId,
      gameState: gameState,
    });
    throw new Error("Current player not found in game state");
  }

  // Extract leading cards from game state
  const leadingCards = gameState.currentTrick?.plays[0]?.cards;
  if (!leadingCards || leadingCards.length === 0) {
    gameLogger.error("following_no_leading_cards", {
      player: currentPlayerId,
      trickPosition: context.trickPosition,
    });
    throw new Error("No leading cards found in current trick");
  }

  // Priority 0: Multi-combo handling (reuse existing implementation)
  const leadingComboType = getComboType(leadingCards, trumpInfo);
  if (leadingComboType === ComboType.Invalid) {
    const multiComboResult = executeMultiComboFollowingAlgorithm(
      leadingCards,
      currentPlayer.hand,
      gameState,
      currentPlayerId,
    );

    if (multiComboResult && multiComboResult.strategy !== "no_valid_response") {
      gameLogger.debug("following_multi_combo", {
        player: currentPlayerId,
        strategy: multiComboResult.strategy,
        cardCount: multiComboResult.cards.length,
        reasoning: multiComboResult.reasoning,
        canBeat: multiComboResult.canBeat,
      });

      return multiComboResult.cards;
    }
  }

  // Log following algorithm start
  gameLogger.debug("following_algorithm_start", {
    player: currentPlayerId,
    position: context.trickPosition,
    leadingCardCount: leadingCards.length,
    leadingCards: leadingCards.map((c) => `${c.rank}${c.suit}`),
    handSize: currentPlayer.hand.length,
    memoryAvailable: !!context.memoryContext.playerMemories,
    trickPoints: context.trickWinnerAnalysis?.trickPoints ?? 0,
  });

  // Phase 1: Analyze suit availability and classify scenario
  const analysis = analyzeSuitAvailability(
    leadingCards,
    currentPlayer.hand,
    trumpInfo,
  );

  gameLogger.debug("following_scenario_classification", {
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
    gameLogger.error("following_routing_error", {
      player: currentPlayerId,
      scenario: analysis.scenario,
      error: error instanceof Error ? error.message : String(error),
    });

    // Fallback: select first x cards from hand (x = leadingCards.length)
    const requiredLength = leadingCards.length;
    selectedCards = currentPlayer.hand.slice(0, requiredLength);
  }

  // Phase 2: Card validation before returning
  if (!selectedCards || selectedCards.length === 0) {
    gameLogger.warn("following_empty_selection", {
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
    gameLogger.error("following_validation_failed", {
      player: currentPlayerId,
      scenario: analysis.scenario,
      fallbackToFirstCard: true,
    });

    // Ultimate fallback - use first available card
    selectedCards =
      currentPlayer.hand.length > 0 ? [currentPlayer.hand[0]] : [];
  }

  // Final result logging
  gameLogger.debug("following_algorithm_result", {
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

  gameLogger.debug("following_algorithm_performance", {
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
    gameLogger.error("following_invalid_card_selection", {
      player: currentPlayerId,
      selectedCards: selectedCards.map((c) => `${c.rank}${c.suit}`),
      reason: "cards_not_in_hand",
    });
    return false;
  }

  // Check length requirement (basic validation)
  if (selectedCards.length !== requiredLength) {
    gameLogger.warn("following_length_mismatch", {
      player: currentPlayerId,
      selectedLength: selectedCards.length,
      requiredLength,
      reason: "length_mismatch",
    });
    // This might be valid in some scenarios (insufficient cards), so just warn
  }

  return true;
}
