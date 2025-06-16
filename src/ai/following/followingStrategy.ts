import {
  Card,
  Combo,
  ComboAnalysis,
  GameContext,
  GameState,
  PlayerId,
  PositionStrategy,
  TrickPosition,
  TrumpInfo,
} from "../../types";
import { handleTeammateWinning } from "./teammateSupport";
import { handleOpponentWinning } from "./opponentBlocking";
import {
  selectStrategicDisposal,
  selectFourthPlayerPointAvoidance,
} from "./strategicDisposal";
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
