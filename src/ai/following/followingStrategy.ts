import { gameLogger } from "../../utils/gameLogger";
import { getComboType } from "../../game/comboDetection";
import { detectLeadingMultiCombo } from "../../game/multiComboAnalysis";
import { isTrump, calculateCardStrategicValue } from "../../game/cardValue";
import {
  Card,
  Combo,
  ComboAnalysis,
  ComboType,
  GameContext,
  GameState,
  PlayerId,
  PositionStrategy,
  TrickPosition,
  TrumpInfo,
} from "../../types";
import { executeMultiComboFollowingAlgorithm } from "./multiComboFollowingStrategy";
import { handleOpponentWinning } from "./opponentBlocking";
import {
  selectFourthPlayerPointAvoidance,
  selectStrategicDisposal,
} from "./strategicDisposal";
import { handleTeammateWinning } from "./teammateSupport";
import { selectOptimalWinningCombo } from "./trickContention";

/**
 * Following Strategy - Main following logic with 4-priority decision chain
 *
 * Implements the restructured priority chain for optimal following play decisions:
 * 1. Team Coordination - Support teammates when winning
 * 2. Opponent Blocking - Counter opponent point collection
 * 3. Trick Contention - Contest valuable tricks when winnable
 * 4. Strategic Disposal - Play optimally when can't influence trick outcome
 */

/**
 * Main following play selection using restructured 4-priority decision chain
 */
export function selectOptimalFollowPlay(
  comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
  context: GameContext,
  positionStrategy: PositionStrategy,
  trumpInfo: TrumpInfo,
  gameState: GameState,
  currentPlayerId?: PlayerId,
): Card[] {
  // === PRIORITY 0: MULTI-COMBO SPECIALIZED HANDLING ===
  // Check for multi-combo following scenarios first
  const leadingCards = gameState.currentTrick?.plays[0].cards;

  if (leadingCards == null) {
    throw new Error("No leading cards found in current trick");
  }

  if (currentPlayerId == null) {
    throw new Error("Current player ID must be provided for following play");
  }

  const leadingComboType = getComboType(leadingCards, trumpInfo);

  if (leadingComboType === ComboType.Invalid) {
    // If leading cards are a multi-combo, handle specialized following logic
    const leadingMultiCombo = detectLeadingMultiCombo(leadingCards, trumpInfo);

    if (leadingMultiCombo.isMultiCombo) {
      const player = gameState.players.find((p) => p.id === currentPlayerId);
      const playerHand = player?.hand || [];

      const multiComboResult = executeMultiComboFollowingAlgorithm(
        leadingCards,
        playerHand,
        gameState,
        currentPlayerId,
      );

      if (
        multiComboResult &&
        multiComboResult.strategy !== "no_valid_response"
      ) {
        gameLogger.debug("AI following decision: multi-combo", {
          decisionPoint: "follow_multi_combo",
          player: currentPlayerId,
          decision: multiComboResult.cards,
          context,
        });
        return multiComboResult.cards;
      }
    }
  }

  // RESTRUCTURED: Clear priority chain for following play decisions
  const trickWinner = context.trickWinnerAnalysis;

  // DEBUG: Log decision flow entry point
  gameLogger.debug(
    "ai_following_decision_start",
    {
      player: currentPlayerId,
      trickPosition: context.trickPosition,
      trickWinner: trickWinner
        ? {
            isTeammateWinning: trickWinner.isTeammateWinning,
            isOpponentWinning: trickWinner.isOpponentWinning,
            canBeatCurrentWinner: trickWinner.canBeatCurrentWinner,
            shouldTryToBeat: trickWinner.shouldTryToBeat,
            trickPoints: trickWinner.trickPoints,
            currentWinner: trickWinner.currentWinner,
          }
        : null,
      availableCombos: comboAnalyses.length,
      leadingCards: leadingCards?.map((c) => `${c.rank}${c.suit}`),
    },
    "=== AI Following Decision Analysis ===",
  );

  // Clear priority-based decision making

  // === PRIORITY 1: TEAM COORDINATION ===
  if (trickWinner?.isTeammateWinning) {
    gameLogger.debug(
      "ai_following_path",
      {
        player: currentPlayerId,
        path: "PRIORITY_1_TEAM_COORDINATION",
        reason: "teammate_is_winning",
      },
      "Following Path: Team Coordination (Teammate Winning)",
    );

    // Teammate is winning - help collect points or play conservatively
    const decision = handleTeammateWinning(
      comboAnalyses,
      context,
      trumpInfo,
      gameState,
      currentPlayerId,
    );
    gameLogger.debug("AI following decision: teammate winning", {
      decisionPoint: "follow_teammate_winning",
      player: currentPlayerId,
      decision,
      context,
    });
    return decision;
  }

  // === PRIORITY 2: SUIT ESTABLISHMENT ===
  // NEW: Higher priority for suit establishment even when opponent is winning
  if (
    trickWinner?.canBeatCurrentWinner &&
    shouldTryEstablishSuit(gameState, context, currentPlayerId)
  ) {
    gameLogger.debug(
      "ai_following_path",
      {
        player: currentPlayerId,
        path: "PRIORITY_2_SUIT_ESTABLISHMENT",
        reason: "establishing_strong_suit",
      },
      "Following Path: Suit Establishment (Building Position)",
    );

    const decision = selectOptimalWinningCombo(
      comboAnalyses,
      context,
      positionStrategy,
      trumpInfo,
      gameState,
    );
    gameLogger.debug("AI following decision: suit establishment", {
      decisionPoint: "follow_suit_establishment",
      player: currentPlayerId,
      decision,
      context,
    });
    return decision;
  }

  // === PRIORITY 3: OPPONENT BLOCKING ===
  if (trickWinner?.isOpponentWinning) {
    // Opponent is winning - try to beat them or minimize damage
    const opponentResponse = handleOpponentWinning(
      comboAnalyses,
      context,
      trickWinner,
      trumpInfo,
      gameState,
    );
    if (opponentResponse) {
      gameLogger.debug("AI following decision: opponent blocking", {
        decisionPoint: "follow_opponent_blocking",
        player: currentPlayerId,
        decision: opponentResponse,
        context,
      });
      return opponentResponse;
    }

    // Position-specific disposal when can't beat opponent
    if (context.trickPosition === TrickPosition.Fourth) {
      return selectFourthPlayerPointAvoidance(
        comboAnalyses,
        context,
        trumpInfo,
      );
    }
  }

  // === PRIORITY 4: TRICK CONTENTION ===
  if (trickWinner?.canBeatCurrentWinner && trickWinner?.shouldTryToBeat) {
    // Can win the trick and it's worth winning
    const decision = selectOptimalWinningCombo(
      comboAnalyses,
      context,
      positionStrategy,
      trumpInfo,
      gameState,
    );
    gameLogger.debug("AI following decision: trick contention", {
      decisionPoint: "follow_trick_contention",
      player: currentPlayerId,
      decision,
      context,
    });
    return decision;
  }

  // === PRIORITY 5: STRATEGIC DISPOSAL ===
  // Can't/shouldn't win - play optimally for future tricks
  const decision = selectStrategicDisposal(
    comboAnalyses,
    context,
    positionStrategy,
    gameState,
  );
  gameLogger.debug("AI following decision: strategic disposal", {
    decisionPoint: "follow_strategic_disposal",
    player: currentPlayerId,
    decision,
    context,
  });
  return decision;
}

/**
 * Enhanced suit establishment check with more aggressive criteria
 */
function shouldTryEstablishSuit(
  gameState: GameState,
  context: GameContext,
  currentPlayerId: PlayerId,
): boolean {
  const currentTrick = gameState.currentTrick;
  if (!currentTrick?.plays[0]?.cards) return false;

  const leadingSuit = currentTrick.plays[0].cards[0]?.suit;
  if (!leadingSuit) return false;

  // Don't establish trump suits (already strong)
  if (leadingSuit === gameState.trumpInfo.trumpSuit) return false;

  const player = gameState.players.find((p) => p.id === currentPlayerId);
  if (!player) return false;

  // Get cards in leading suit (non-trump)
  // Use the same filtering logic as other parts of the codebase
  const suitCards = player.hand.filter(
    (card) => card.suit === leadingSuit && !isTrump(card, gameState.trumpInfo),
  );

  // More aggressive: Try to establish with 3+ cards (reduced from 4+)
  if (suitCards.length < 3) return false;

  // Check for cards with decent strategic value (more robust than rank-based filtering)
  const decentCards = suitCards.filter((card) => {
    const strategicValue = calculateCardStrategicValue(
      card,
      gameState.trumpInfo,
      "basic",
    );
    // Consider cards with strategic value >= 10 as "decent" (roughly Queen+ level)
    return strategicValue >= 10;
  });

  // More aggressive: Establish with just 1+ decent card (reduced from 2+)
  if (decentCards.length >= 1) return true;

  // Even establish with many low cards (5+ total cards)
  if (suitCards.length >= 5) return true;

  // Low-value tricks: Always try to establish if we have the length
  const trickPoints = context.trickWinnerAnalysis?.trickPoints || 0;
  if (trickPoints <= 4 && suitCards.length >= 3) return true;

  return false;
}
