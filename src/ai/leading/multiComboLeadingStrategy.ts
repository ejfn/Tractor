import {
  Card,
  Combo,
  ComboType,
  GameContext,
  GamePhaseStrategy,
  GameState,
  PlayerId,
  TrumpInfo,
} from "../../types";
import { isTrump } from "../../game/gameHelpers";

/**
 * Multi-Combo Leading Strategy Module
 *
 * Handles sophisticated multi-combo leading decisions across all game phases
 * with strategic evaluation for early, mid, and late game scenarios.
 */

/**
 * Select multi-combo lead based on game phase
 * @param validCombos Available combo options
 * @param trumpInfo Trump information
 * @param context Game context
 * @param gameState Current game state
 * @param gamePhase Current game phase
 * @returns Selected cards or null if no multi-combo should be played
 */
export function selectMultiComboLeadByPhase(
  validCombos: Combo[],
  trumpInfo: TrumpInfo,
  context: GameContext,
  gameState: GameState,
  gamePhase: GamePhaseStrategy,
): Card[] | null {
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  if (!currentPlayer) return null;

  if (gamePhase === GamePhaseStrategy.EarlyGame) {
    return selectEarlyGameMultiComboLead(
      validCombos,
      trumpInfo,
      context,
      gameState,
    );
  } else if (
    gamePhase === GamePhaseStrategy.MidGame ||
    gamePhase === GamePhaseStrategy.LateGame
  ) {
    return selectAdvancedStrategicMultiComboLead(
      validCombos,
      trumpInfo,
      context,
      gameState,
      currentPlayer.id,
    );
  }

  return null;
}

/**
 * Select multi-combo lead in early game (highest priority)
 * Early game: Multi-combos have maximum value with minimal risk
 */
function selectEarlyGameMultiComboLead(
  validCombos: Combo[],
  trumpInfo: TrumpInfo,
  context: GameContext,
  gameState: GameState,
): Card[] | null {
  // Find all multi-combo options
  const multiCombos = validCombos.filter(
    (combo) => combo.type === ComboType.MultiCombo,
  );

  if (multiCombos.length === 0) {
    return null;
  }

  // In early game, prioritize multi-combos by value (they should all be unbeatable)
  const bestMultiCombo = multiCombos.reduce((best, current) =>
    current.value > best.value ? current : best,
  );

  return bestMultiCombo.cards;
}

/**
 * Select advanced strategic multi-combo lead in mid/late game with sophisticated evaluation
 * Considers all advanced scenarios: points, teammate contribution, decision pressure,
 * final trick strategy, and kitty multiplier bonuses
 */
function selectAdvancedStrategicMultiComboLead(
  validCombos: Combo[],
  trumpInfo: TrumpInfo,
  context: GameContext,
  gameState: GameState,
  currentPlayerId: PlayerId,
): Card[] | null {
  // Find all multi-combo options
  const multiCombos = validCombos.filter(
    (combo) => combo.type === ComboType.MultiCombo,
  );

  if (multiCombos.length === 0) {
    return null;
  }

  // Advanced strategic evaluation
  const evaluatedMultiCombos = multiCombos.map((combo) => {
    let strategicValue = combo.value;
    const tricksPlayed = gameState.tricks.length;
    const estimatedTricksRemaining = 25 - tricksPlayed;

    // Get current player and team info
    const currentPlayer = gameState.players.find(
      (p) => p.id === currentPlayerId,
    );
    const isAttackingTeam =
      currentPlayer &&
      gameState.teams.some(
        (team) => team.id === currentPlayer.team && !team.isDefending,
      );

    // === SCENARIO 1: HIGH POINT COLLECTION ===
    // Calculate total points available in opponent hands
    const availableOpponentPoints = estimateOpponentPointsAvailable(
      gameState,
      currentPlayerId,
    );
    if (availableOpponentPoints >= 30) {
      strategicValue += availableOpponentPoints * 3; // Strong bonus for high point opportunities
    }

    // === SCENARIO 2: TEAMMATE POINT CONTRIBUTION ===
    // Estimate teammate's ability to contribute points
    const teammatePointPotential = estimateTeammatePointContribution(
      gameState,
      currentPlayerId,
      combo,
    );
    strategicValue += teammatePointPotential * 2;

    // === SCENARIO 3: OPPONENT DECISION PRESSURE ===
    // Force opponents into difficult optimization vs points decisions
    const decisionPressureValue = calculateOpponentDecisionPressure(
      combo,
      gameState,
      currentPlayerId,
      estimatedTricksRemaining,
    );
    strategicValue += decisionPressureValue;

    // === SCENARIO 4: FINAL TRICK STRATEGY ===
    // Save multi-combo for last trick with confident second-to-last win
    if (estimatedTricksRemaining <= 2) {
      const finalTrickBonus = evaluateFinalTrickStrategy(
        combo,
        gameState,
        currentPlayerId,
        context,
        trumpInfo,
      );
      strategicValue += finalTrickBonus;
    }

    // === SCENARIO 5: KITTY BONUS MULTIPLIER (ATTACKING TEAM) ===
    if (isAttackingTeam && estimatedTricksRemaining <= 3) {
      const kittyMultiplierBonus = calculateKittyMultiplierValue(
        combo,
        gameState,
      );
      strategicValue += kittyMultiplierBonus;
    }

    // === BASE LATE-GAME PENALTY (reduced from previous simple version) ===
    // Only apply if none of the above scenarios provide significant value
    if (
      estimatedTricksRemaining < 8 &&
      availableOpponentPoints < 20 &&
      teammatePointPotential < 15
    ) {
      strategicValue -= 100; // Reduced penalty when special scenarios don't apply
    }

    return {
      combo,
      strategicValue,
      scenarios: {
        pointCollection: availableOpponentPoints,
        teammateContribution: teammatePointPotential,
        decisionPressure: decisionPressureValue,
        tricksRemaining: estimatedTricksRemaining,
      },
    };
  });

  // Select best strategic multi-combo
  const bestEvaluation = evaluatedMultiCombos.reduce((best, current) =>
    current.strategicValue > best.strategicValue ? current : best,
  );

  // Use multi-combo if it has positive strategic value
  if (bestEvaluation.strategicValue > 0) {
    return bestEvaluation.combo.cards;
  }

  return null;
}

/**
 * Estimate total points available in opponent hands
 */
function estimateOpponentPointsAvailable(
  gameState: GameState,
  currentPlayerId: PlayerId,
): number {
  // Count points already played
  const playedPoints = gameState.tricks.reduce((total, trick) => {
    return (
      total +
      trick.plays.reduce((trickTotal, play) => {
        return (
          trickTotal +
          play.cards.reduce(
            (cardTotal, card) => cardTotal + (card.points || 0),
            0,
          )
        );
      }, 0)
    );
  }, 0);

  // Total points in game: 200 (8x5s=40, 8x10s=80, 8xKings=80)
  const totalGamePoints = 200;
  const remainingPoints = totalGamePoints - playedPoints;

  // Estimate points in opponent hands (roughly 2/3 of remaining points)
  return Math.floor(remainingPoints * 0.66);
}

/**
 * Estimate teammate's potential point contribution to the trick
 */
function estimateTeammatePointContribution(
  gameState: GameState,
  currentPlayerId: PlayerId,
  combo: Combo,
): number {
  // Get teammate ID
  const currentPlayer = gameState.players.find((p) => p.id === currentPlayerId);
  const teammate = gameState.players.find(
    (p) => p.team === currentPlayer?.team && p.id !== currentPlayerId,
  );

  if (!teammate) return 0;

  // Estimate based on teammate's hand size and game phase
  const teammateHandSize = teammate.hand.length;
  const tricksPlayed = gameState.tricks.length;

  // Early game: teammate likely has more point cards
  if (tricksPlayed < 8) {
    return Math.min(teammateHandSize * 2, 25); // Conservative estimate
  }

  // Late game: teammate likely has fewer but more concentrated point cards
  return Math.min(teammateHandSize * 3, 20);
}

/**
 * Calculate opponent decision pressure value
 */
function calculateOpponentDecisionPressure(
  combo: Combo,
  gameState: GameState,
  currentPlayerId: PlayerId,
  tricksRemaining: number,
): number {
  let pressureValue = 0;

  // More pressure in late game when hand optimization matters more
  if (tricksRemaining < 8) {
    pressureValue += 50; // Base late-game pressure
  }

  // Stronger multi-combos create more pressure
  if (combo.multiComboStructure) {
    const structure = combo.multiComboStructure;

    // Tractors create more pressure than just pairs
    if (structure.components.tractors > 0) {
      pressureValue += 30;
    }

    // Multiple combo types create decision complexity
    const comboTypeCount =
      (structure.components.tractors > 0 ? 1 : 0) +
      (structure.components.pairs > 0 ? 1 : 0) +
      (structure.components.singles > 0 ? 1 : 0);
    pressureValue += comboTypeCount * 15;
  }

  return pressureValue;
}

/**
 * Evaluate final trick strategy bonus
 */
function evaluateFinalTrickStrategy(
  combo: Combo,
  gameState: GameState,
  currentPlayerId: PlayerId,
  context: GameContext,
  trumpInfo: TrumpInfo,
): number {
  const tricksPlayed = gameState.tricks.length;
  const estimatedTricksRemaining = 25 - tricksPlayed;

  // Only apply for last 2 tricks
  if (estimatedTricksRemaining > 2) return 0;

  let finalTrickBonus = 0;

  // If this is the second-to-last trick, evaluate saving multi-combo for final trick
  if (estimatedTricksRemaining === 2) {
    // Bonus if we have confidence in winning the next (second-to-last) trick with other cards
    const currentPlayer = gameState.players.find(
      (p) => p.id === currentPlayerId,
    );
    if (currentPlayer) {
      const nonMultiComboCombos = currentPlayer.hand.filter(
        (card) => !combo.cards.some((comboCard) => comboCard.id === card.id),
      );

      // If we have strong non-multi-combo cards, consider saving the multi-combo
      const hasStrongAlternatives = nonMultiComboCombos.some(
        (card) =>
          card.rank === "A" || card.rank === "K" || isTrump(card, trumpInfo),
      );

      if (hasStrongAlternatives) {
        finalTrickBonus -= 100; // Penalty for using multi-combo too early
      }
    }
  }

  // If this is the final trick, strong bonus for multi-combo
  if (estimatedTricksRemaining === 1) {
    finalTrickBonus += 200; // Strong bonus for multi-combo on final trick
  }

  return finalTrickBonus;
}

/**
 * Calculate kitty bonus multiplier value for attacking team
 */
function calculateKittyMultiplierValue(
  combo: Combo,
  gameState: GameState,
): number {
  // Only attacking team benefits from kitty multiplier
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  if (!currentPlayer) return 0;

  // Check if current player is on attacking team
  const isAttackingTeam = gameState.teams.some(
    (team) => team.id === currentPlayer.team && !team.isDefending,
  );

  if (!isAttackingTeam) return 0;

  let multiplierValue = 0;

  // Estimate points in kitty (this is hidden, so rough estimate)
  const estimatedKittyPoints = 15; // Conservative estimate

  if (combo.multiComboStructure) {
    const structure = combo.multiComboStructure;

    // Kitty multiplier is based on highest combo type in multi-combo
    if (structure.components.tractors > 0) {
      // Tractor in multi-combo = 4x multiplier
      multiplierValue = estimatedKittyPoints * 4;
    } else if (structure.components.pairs > 0) {
      // Pairs in multi-combo = 4x multiplier
      multiplierValue = estimatedKittyPoints * 4;
    } else {
      // Singles only = 2x multiplier
      multiplierValue = estimatedKittyPoints * 2;
    }

    // Additional bonus for complex multi-combos
    const comboComplexity =
      structure.components.tractors + structure.components.pairs;
    multiplierValue += comboComplexity * 10;
  }

  return multiplierValue;
}
