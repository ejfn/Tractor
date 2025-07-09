import { canBeatCombo } from "../../game/cardComparison";
import { calculateCardStrategicValue, isTrump } from "../../game/cardValue";
import {
  Card,
  GameContext,
  GameState,
  PlayerId,
  Suit,
  TrickPosition,
  TrumpInfo,
} from "../../types";
import { gameLogger } from "../../utils/gameLogger";
import {
  selectCardsByStrategicValue,
  selectComboByStrategicValue,
} from "./strategicSelection";
import {
  analyzeSuitAvailability,
  SuitAvailabilityResult,
} from "./suitAvailabilityAnalysis";
import { shouldContributeToTeammate } from "./teammateAnalysis";

/**
 * Void Decision Module
 *
 * Handles the void scenario where players have no cards in the leading suit.
 * Decision flow: shouldContribute → trump evaluation → cross-suit fallback
 */

/**
 * Evaluate trump selection for void scenario
 */
function evaluateTrumpSelection(
  playerHand: Card[],
  context: GameContext,
  trumpInfo: TrumpInfo,
  gameState: GameState,
  _currentPlayerId: PlayerId,
  analysis: SuitAvailabilityResult,
): Card[] | null {
  const currentTrick = gameState.currentTrick;
  const isTeammateWinning =
    context.trickWinnerAnalysis?.isTeammateWinning ?? false;
  // Check if we have valid trump combos that can beat current winner
  const leadingCards = currentTrick?.plays[0]?.cards || [];
  const trumpAvailability = analyzeSuitAvailability(
    leadingCards,
    playerHand,
    trumpInfo,
    Suit.None, // Analyze trump cards (Suit.None)
  );

  if (
    trumpAvailability.scenario === "valid_combos" &&
    trumpAvailability.validCombos
  ) {
    // Get current winner cards to check if we can beat them
    const currentWinnerCards =
      currentTrick?.plays.find(
        (play) => play.playerId === context.trickWinnerAnalysis?.currentWinner,
      )?.cards || [];

    const isCurrentlyTrumped =
      context.trickWinnerAnalysis?.isCurrentlyTrumped ?? false;

    let beatingCombos;
    if (isCurrentlyTrumped) {
      // Winner is trump - need to check if our trump combos can beat theirs
      beatingCombos = trumpAvailability.validCombos.filter((combo) =>
        canBeatCombo(combo.cards, currentWinnerCards, trumpInfo),
      );
    } else {
      // Winner is non-trump - any valid trump combo will beat it
      beatingCombos = trumpAvailability.validCombos;
    }

    if (beatingCombos.length > 0) {
      const trickPoints = context.trickWinnerAnalysis?.trickPoints ?? 0;

      const isTractor = beatingCombos[0]?.type === "Tractor";

      if (
        isTractor &&
        !isTeammateWinning &&
        (trickPoints >= 10 || context.trickPosition === TrickPosition.Second)
      ) {
        // If tractor: always beat it with lowest one
        return selectComboByStrategicValue(
          beatingCombos,
          trumpInfo,
          "contribute",
          "lowest",
          1,
        );
      }

      // If pair/single: more complex logic
      if (!isTractor) {
        // Check if last player or next player void status
        const isLastPlayer = context.trickPosition === TrickPosition.Fourth;
        let isNextPlayerVoid = false;

        if (!isLastPlayer) {
          const nextPlayerIndex = (gameState.currentPlayerIndex + 1) % 4;
          const nextPlayerId = gameState.players[nextPlayerIndex]?.id;
          if (
            context.memoryContext.playerMemories &&
            nextPlayerId &&
            analysis.leadingSuit
          ) {
            const nextPlayerMemory =
              context.memoryContext.playerMemories[nextPlayerId];
            isNextPlayerVoid =
              nextPlayerMemory?.suitVoids.has(analysis.leadingSuit) ?? false;
          }
        }

        if (isLastPlayer || !isNextPlayerVoid) {
          // Safe scenario: trump with lowest combo
          return selectComboByStrategicValue(
            beatingCombos,
            trumpInfo,
            "contribute",
            "lowest",
          );
        }

        const highValueCombos = beatingCombos.filter((combo) => {
          const value = calculateCardStrategicValue(
            combo.cards[0],
            trumpInfo,
            "strategic",
          );
          return trickPoints >= 10 ? value > 150 : value > 100 && value < 150;
        });

        return selectComboByStrategicValue(
          highValueCombos.length > 0 ? highValueCombos : beatingCombos,
          trumpInfo,
          "strategic",
          highValueCombos.length > 0 ? "lowest" : "highest",
        );
      }
    }
  }

  return null;
}

/**
 * Handle void scenario - TRUMP vs CROSS-SUIT decision
 *
 * Player has no cards in the leading suit.
 * Strategy:
 * 1. Evaluate shouldContribute decision (consistent with other scenarios)
 * 2. Trump evaluation: Can I trump? Should I trump? (for non-trump leads)
 * 3. Fallback: Cross-suit selection using the contribute decision
 */
export function handleVoidScenario(
  analysis: SuitAvailabilityResult,
  playerHand: Card[],
  context: GameContext,
  trumpInfo: TrumpInfo,
  gameState: GameState,
  currentPlayerId: PlayerId,
): Card[] {
  gameLogger.debug("enhanced_following_void_analysis", {
    player: currentPlayerId,
    requiredLength: analysis.requiredLength,
    leadingSuit: analysis.leadingSuit,
    trickPoints: context.trickWinnerAnalysis?.trickPoints ?? 0,
  });

  // Step 1: shouldContribute decision (consistent with other scenarios)
  const shouldContribute = shouldContributeToTeammate(
    context,
    gameState,
    currentPlayerId,
  );

  // Step 2: If shouldContribute, ALWAYS contribute with cross-suit (including trump)
  if (shouldContribute) {
    const contributeSelection = selectCardsByStrategicValue(
      playerHand,
      trumpInfo,
      "contribute",
      "lowest",
      analysis.requiredLength,
    );

    gameLogger.debug("enhanced_following_void_contribute", {
      player: currentPlayerId,
      reason: "shouldContribute_true",
      selectedCards: contributeSelection.map((c) => c.toString()),
    });

    return contributeSelection;
  }

  // Step 3: If NOT contributing, evaluate trump (only for non-trump leads)
  const trumpCards = playerHand.filter((card) => isTrump(card, trumpInfo));
  const isTrumpLead = context.trickWinnerAnalysis?.isTrumpLead ?? false;

  let trumpSelection: Card[] | null = null;
  if (!isTrumpLead && trumpCards.length >= analysis.requiredLength) {
    trumpSelection = evaluateTrumpSelection(
      trumpCards,
      context,
      trumpInfo,
      gameState,
      currentPlayerId,
      analysis,
    );
  }

  if (trumpSelection && trumpSelection.length === analysis.requiredLength) {
    gameLogger.debug("enhanced_following_void_trump", {
      player: currentPlayerId,
      trickPoints: context.trickWinnerAnalysis?.trickPoints ?? 0,
      isTeammateWinning:
        context.trickWinnerAnalysis?.isTeammateWinning ?? false,
      selectedCards: trumpSelection.map((c: Card) => c.toString()),
    });

    return trumpSelection;
  }

  // Step 4: Final fallback - cross-suit dispose
  const disposeSelection = selectCardsByStrategicValue(
    playerHand,
    trumpInfo,
    "strategic",
    "lowest",
    analysis.requiredLength,
  );

  gameLogger.debug("enhanced_following_void_dispose", {
    player: currentPlayerId,
    reason: "cross_suit_dispose",
    selectedCards: disposeSelection.map((c) => c.toString()),
  });

  return disposeSelection;
}
