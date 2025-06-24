import { getComboType } from "../../game/comboDetection";
import { detectLeadingMultiCombo } from "../../game/multiComboDetection";
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
        return multiComboResult.cards;
      }
    }
  }

  // RESTRUCTURED: Clear priority chain for following play decisions
  const trickWinner = context.trickWinnerAnalysis;

  // Clear priority-based decision making

  // === PRIORITY 1: TEAM COORDINATION ===
  if (trickWinner?.isTeammateWinning) {
    // Teammate is winning - help collect points or play conservatively
    return handleTeammateWinning(
      comboAnalyses,
      context,
      trumpInfo,
      gameState,
      currentPlayerId,
    );
  }

  // === PRIORITY 2: OPPONENT BLOCKING ===
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

  // === PRIORITY 3: TRICK CONTENTION ===
  if (trickWinner?.canBeatCurrentWinner && trickWinner?.shouldTryToBeat) {
    // Can win the trick and it's worth winning
    return selectOptimalWinningCombo(
      comboAnalyses,
      context,
      positionStrategy,
      trumpInfo,
      gameState,
    );
  }

  // === PRIORITY 4: STRATEGIC DISPOSAL ===
  // Can't/shouldn't win - play optimally for future tricks
  return selectStrategicDisposal(
    comboAnalyses,
    context,
    positionStrategy,
    gameState,
  );
}
