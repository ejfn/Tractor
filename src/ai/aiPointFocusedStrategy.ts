import {
  Card,
  Combo,
  TrumpInfo,
  GameState,
  ComboType,
  JokerType,
  GameContext,
  PointPressure,
  PointFocusedContext,
  TrumpConservationStrategy,
  GamePhaseStrategy,
  PointCardStrategy,
  TrumpTiming,
  Rank,
} from "../types";
import {
  isTrump,
  compareCards,
  compareCardCombos,
  isPointCard,
} from "../game/gameLogic";

/**
 * Enhanced Point-Focused AI Strategy Implementation
 * Addresses issue #61 with sophisticated point card collection and trump management
 */

/**
 * Creates a point-focused strategic context based on game state
 */
export function createPointFocusedContext(
  gameState: GameState,
  playerId: string,
  baseContext: GameContext,
): PointFocusedContext {
  const player = gameState.players.find((p) => p.id === playerId);
  if (!player) throw new Error(`Player ${playerId} not found`);

  // Determine game phase based on cards remaining
  const totalStartingCards = Math.max(
    ...gameState.players.map(
      (p) => p.hand.length + (gameState.tricks.length * 4) / 4,
    ),
  );
  const cardsPlayed = gameState.tricks.length * 4;
  const gameProgress = cardsPlayed / (totalStartingCards * 4);

  const gamePhase = determineGamePhase(gameProgress);

  // Calculate team points
  const { teamPoints, opponentPoints } = calculateTeamPoints(
    gameState,
    player.team,
  );

  // Calculate point card density in remaining cards
  const pointCardDensity = calculatePointCardDensity(gameState);

  // Determine point card strategy
  const pointCardStrategy = determinePointCardStrategy(
    teamPoints,
    opponentPoints,
    gamePhase,
    baseContext.isAttackingTeam,
  );

  // Determine trump timing strategy
  const trumpTiming = determineTrumpTiming(
    gamePhase,
    teamPoints,
    opponentPoints,
    pointCardDensity,
    baseContext,
  );

  // Check if partner needs point escape
  const partnerNeedsPointEscape = checkPartnerPointEscape(gameState, player);

  // Determine if team can win without collecting more points
  const canWinWithoutPoints = checkCanWinWithoutPoints(
    teamPoints,
    opponentPoints,
    baseContext.isAttackingTeam,
  );

  return {
    gamePhase,
    pointCardStrategy,
    trumpTiming,
    teamPointsCollected: teamPoints,
    opponentPointsCollected: opponentPoints,
    pointCardDensity,
    partnerNeedsPointEscape,
    canWinWithoutPoints,
  };
}

/**
 * Creates trump conservation strategy based on game context
 */
export function createTrumpConservationStrategy(
  pointContext: PointFocusedContext,
  gameState: GameState,
  trumpInfo: TrumpInfo,
): TrumpConservationStrategy {
  const tricksRemaining = estimateTricksRemaining(gameState);

  // Be more conservative in early game, more aggressive in late game
  const conservationLevel =
    pointContext.gamePhase === GamePhaseStrategy.EarlyGame
      ? "high"
      : pointContext.gamePhase === GamePhaseStrategy.LateGame
        ? "low"
        : "medium";

  const preserveBigJokers = shouldPreserveTrumpType(
    "big_joker",
    conservationLevel,
    tricksRemaining,
    pointContext,
  );

  const preserveSmallJokers = shouldPreserveTrumpType(
    "small_joker",
    conservationLevel,
    tricksRemaining,
    pointContext,
  );

  const preserveTrumpRanks = shouldPreserveTrumpType(
    "trump_rank",
    conservationLevel,
    tricksRemaining,
    pointContext,
  );

  // Minimum tricks remaining before using big trumps
  const minTricksRemainingForBigTrump =
    conservationLevel === "high" ? 6 : conservationLevel === "medium" ? 4 : 2;

  // Trump following priority based on strategy
  const trumpFollowingPriority = determineTrumpFollowingPriority(pointContext);

  return {
    preserveBigJokers,
    preserveSmallJokers,
    preserveTrumpRanks,
    minTricksRemainingForBigTrump,
    trumpFollowingPriority,
  };
}

/**
 * Ace-priority leading strategy - prioritizes non-trump Aces and Ace pairs
 */
export function selectAcePriorityLeadingPlay(
  validCombos: Combo[],
  trumpInfo: TrumpInfo,
  pointContext: PointFocusedContext,
  gameState: GameState,
): Combo | null {
  // Strategy: Non-trump Aces are guaranteed biggest unless someone has run out
  const nonTrumpCombos = validCombos.filter(
    (combo) => !combo.cards.some((card) => isTrump(card, trumpInfo)),
  );

  if (nonTrumpCombos.length === 0) {
    return null; // No non-trump options available
  }

  // Prioritize Ace combos over other combos
  const aceCombos = nonTrumpCombos.filter((combo) =>
    combo.cards.every((card) => card.rank === Rank.Ace),
  );

  if (aceCombos.length > 0) {
    // Sort Ace combos by type preference: pairs > singles
    const acePairs = aceCombos.filter((combo) => combo.type === ComboType.Pair);
    const aceSingles = aceCombos.filter(
      (combo) => combo.type === ComboType.Single,
    );

    // Prefer Ace pairs over Ace singles - they're harder to beat
    if (acePairs.length > 0) {
      return acePairs[0];
    }
    if (aceSingles.length > 0) {
      return aceSingles[0];
    }
  }

  return null; // No Ace combos available, use fallback strategy
}

/**
 * Enhanced early-game non-trump leading strategy for point escape
 */
export function selectEarlyGameLeadingPlay(
  validCombos: Combo[],
  trumpInfo: TrumpInfo,
  pointContext: PointFocusedContext,
  gameState: GameState,
): Combo | null {
  if (pointContext.gamePhase !== GamePhaseStrategy.EarlyGame) {
    return null; // Use this only in early game
  }

  // Strategy: Lead with high non-trump cards to let partner escape point cards
  // Avoid leading with trump cards early unless absolutely necessary
  const nonTrumpCombos = validCombos.filter(
    (combo) => !combo.cards.some((card) => isTrump(card, trumpInfo)),
  );

  if (nonTrumpCombos.length === 0) {
    // Only consider trump if no non-trump options AND it's strategically sound
    const trumpCombos = validCombos.filter((combo) =>
      combo.cards.some((card) => isTrump(card, trumpInfo)),
    );

    // In early game, avoid leading with high trumps (jokers, trump rank)
    const lowTrumpCombos = trumpCombos.filter(
      (combo) =>
        !combo.cards.some(
          (card) => card.joker || card.rank === trumpInfo.trumpRank,
        ),
    );

    if (lowTrumpCombos.length > 0) {
      return lowTrumpCombos.sort((a, b) => a.value - b.value)[0]; // Use smallest trump
    }

    return null; // Avoid leading high trumps early
  }

  // Prioritize high cards in different suits to probe opponent hands
  const sortedBySuitAndStrength = nonTrumpCombos.sort((a, b) => {
    const aHighCard = getHighestCard(a.cards, trumpInfo);
    const bHighCard = getHighestCard(b.cards, trumpInfo);
    return compareCards(bHighCard, aHighCard, trumpInfo);
  });

  // Prefer pairs and tractors over singles when leading high
  const tractorCombos = sortedBySuitAndStrength.filter(
    (combo) => combo.type === ComboType.Tractor,
  );
  const pairCombos = sortedBySuitAndStrength.filter(
    (combo) => combo.type === ComboType.Pair,
  );
  const singleCombos = sortedBySuitAndStrength.filter(
    (combo) => combo.type === ComboType.Single,
  );

  // Return the highest strength combination, preferring tractors > pairs > singles
  if (tractorCombos.length > 0) return tractorCombos[0];
  if (pairCombos.length > 0) return pairCombos[0];
  return singleCombos[0];
}

/**
 * Enhanced following strategy with aggressive point collection
 */
export function selectAggressivePointCollection(
  validCombos: Combo[],
  trumpInfo: TrumpInfo,
  pointContext: PointFocusedContext,
  gameState: GameState,
  leadingCombo: Card[],
): Combo | null {
  const currentTrick = gameState.currentTrick;
  if (!currentTrick) return null;

  // Calculate points currently on the table
  const tablePoints = calculateTrickPoints(currentTrick);

  // Check if opponent is currently winning with point cards
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const currentWinner = gameState.players.find(
    (p) => p.id === currentTrick.winningPlayerId,
  );
  const isOpponentWinning =
    currentWinner && currentWinner.team !== currentPlayer.team;

  // Only use aggressive collection if opponent is winning AND there are points to collect
  if (!isOpponentWinning || tablePoints === 0) {
    return null;
  }

  // Look for combos that can beat the current winning play
  const winningCombos = validCombos.filter((combo) =>
    canBeatCurrentWinner(combo, currentTrick, trumpInfo),
  );

  if (winningCombos.length === 0) {
    return null; // Can't win the trick
  }

  // Sort by strength - prioritize Aces when there are significant points
  const sortedWinningCombos = winningCombos.sort((a, b) => {
    // Prefer non-trump over trump if both can win
    const aIsTrump = a.cards.some((card) => isTrump(card, trumpInfo));
    const bIsTrump = b.cards.some((card) => isTrump(card, trumpInfo));

    if (aIsTrump !== bIsTrump) {
      return aIsTrump ? 1 : -1; // Prefer non-trump
    }

    // When there are significant points (10+), prioritize Aces
    if (tablePoints >= 10) {
      const aHasAce = a.cards.some((card) => card.rank === Rank.Ace);
      const bHasAce = b.cards.some((card) => card.rank === Rank.Ace);

      if (aHasAce !== bHasAce) {
        return aHasAce ? -1 : 1; // Prefer Ace combos
      }
    }

    return a.value - b.value; // Use minimal strength
  });

  return sortedWinningCombos[0];
}

/**
 * Ace-aggressive following strategy - uses Aces when points are on the table
 */
export function selectAceAggressiveFollowing(
  validCombos: Combo[],
  trumpInfo: TrumpInfo,
  pointContext: PointFocusedContext,
  gameState: GameState,
  leadingCombo: Card[],
): Combo | null {
  const currentTrick = gameState.currentTrick;
  if (!currentTrick) return null;

  // Calculate points currently on the table
  const tablePoints = calculateTrickPoints(currentTrick);

  // Only use this strategy if there are points worth collecting
  if (tablePoints === 0) {
    return null;
  }

  // Look for Ace combos that can potentially win or compete for the trick
  const aceCombos = validCombos.filter((combo) =>
    combo.cards.every((card) => card.rank === "A" && !isTrump(card, trumpInfo)),
  );

  if (aceCombos.length === 0) {
    return null; // No Ace combos available
  }

  // Check if we can beat the current winner with an Ace
  const winningAceCombos = aceCombos.filter((combo) =>
    canBeatCurrentWinner(combo, currentTrick, trumpInfo),
  );

  if (winningAceCombos.length > 0) {
    // Use the Ace combo that can win
    return winningAceCombos[0];
  }

  // Don't waste Aces if we can't win the trick
  // Let other strategies handle this case

  return null;
}

/**
 * Enhanced partner coordination for point card following
 */
export function selectPartnerCoordinatedPlay(
  validCombos: Combo[],
  trumpInfo: TrumpInfo,
  pointContext: PointFocusedContext,
  gameState: GameState,
  leadingCombo: Card[],
): Combo | null {
  const currentTrick = gameState.currentTrick;
  if (!currentTrick) return null;

  // Check if teammate is currently winning the trick
  const currentPlayer = gameState.players.find(
    (p) => p.id === getCurrentPlayerId(gameState),
  );
  const winningPlayer = gameState.players.find(
    (p) => p.id === currentTrick.winningPlayerId,
  );

  const isTeammateWinning =
    winningPlayer &&
    currentPlayer &&
    winningPlayer.team === currentPlayer.team &&
    winningPlayer.id !== currentPlayer.id;

  if (!isTeammateWinning) {
    return null; // Use regular strategy
  }

  // Teammate is winning, so help them by following with point cards
  const pointCardCombos = validCombos.filter((combo) =>
    combo.cards.some((card) => isPointCard(card)),
  );

  if (pointCardCombos.length === 0) {
    return null; // No point cards to contribute
  }

  // Sort point card combos by point value (highest first)
  const sortedByPoints = pointCardCombos.sort((a, b) => {
    const aPoints = calculateComboPoints(a.cards);
    const bPoints = calculateComboPoints(b.cards);
    return bPoints - aPoints;
  });

  // Follow with the highest point value combo that matches the lead
  const matchingType = getComboType(leadingCombo);
  const matchingCombos = sortedByPoints.filter(
    (combo) => combo.type === matchingType,
  );

  return matchingCombos.length > 0 ? matchingCombos[0] : sortedByPoints[0];
}

/**
 * Conservative play against unbeatable cards
 */
export function selectConservativeUnbeatablePlay(
  validCombos: Combo[],
  trumpInfo: TrumpInfo,
  pointContext: PointFocusedContext,
  gameState: GameState,
  leadingCombo: Card[],
): Combo | null {
  const currentTrick = gameState.currentTrick;
  if (!currentTrick) return null;

  // Check if the leading combo is unbeatable (like non-trump Ace)
  const isUnbeatable = isUnbeatableCombo(leadingCombo, trumpInfo, gameState);
  if (!isUnbeatable) return null;

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const leader = gameState.players.find(
    (p) => p.id === currentTrick.leadingPlayerId,
  );
  const isOpponentTeam = leader && leader.team !== currentPlayer.team;

  if (!isOpponentTeam) return null; // Don't apply against partner

  // Calculate points on table to decide if trump is worth using
  const tablePoints = calculateTrickPoints(currentTrick);

  // Option 1: Use trump combo if table points justify the investment
  const trumpCombos = validCombos.filter((combo) =>
    combo.cards.some((card) => isTrump(card, trumpInfo)),
  );

  if (
    trumpCombos.length > 0 &&
    shouldUseTrumpForPoints(tablePoints, trumpCombos, pointContext)
  ) {
    // Use the minimal trump combo that can win
    const winningTrumpCombos = trumpCombos.filter((combo) =>
      canBeatCurrentWinner(combo, currentTrick, trumpInfo),
    );

    if (winningTrumpCombos.length > 0) {
      return winningTrumpCombos.sort((a, b) => a.value - b.value)[0];
    }
  }

  // Option 2: Play smallest cards, avoid points
  const nonPointCombos = validCombos.filter(
    (combo) => !combo.cards.some((card) => isPointCard(card)),
  );

  if (nonPointCombos.length > 0) {
    // Play the smallest non-point combo
    return nonPointCombos.sort((a, b) => a.value - b.value)[0];
  }

  // Option 3: If all combos have points, play the smallest point combo
  return validCombos.sort((a, b) => {
    const aPoints = calculateComboPoints(a.cards);
    const bPoints = calculateComboPoints(b.cards);
    if (aPoints !== bPoints) return aPoints - bPoints;
    return a.value - b.value;
  })[0];
}

/**
 * Flexible following when out of suit
 */
export function selectFlexibleOutOfSuitPlay(
  validCombos: Combo[],
  trumpInfo: TrumpInfo,
  pointContext: PointFocusedContext,
  gameState: GameState,
  leadingCombo: Card[],
): Combo | null {
  const currentTrick = gameState.currentTrick;
  if (!currentTrick) return null;

  // Check if we're out of the leading suit for pairs/tractors
  const leadingType = getComboType(leadingCombo);
  const leadingSuit = getLeadingSuit(leadingCombo);

  if (leadingType === ComboType.Single || !leadingSuit) {
    return null; // This logic only applies to pairs/tractors
  }

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const suitCards = currentPlayer.hand.filter(
    (card) => card.suit === leadingSuit && !isTrump(card, trumpInfo),
  );

  // Only apply if we're actually out of the leading suit
  if (suitCards.length >= leadingCombo.length) {
    return null; // We have enough cards of the suit
  }

  // Check if partner is likely to win
  const partner = getPartnerTeam(gameState, currentPlayer.id);
  const isPartnerWinning =
    partner && currentTrick.winningPlayerId === partner.id;

  if (isPartnerWinning) {
    // Partner winning: add points from any suits
    const pointCombos = validCombos.filter((combo) =>
      combo.cards.some((card) => isPointCard(card)),
    );

    if (pointCombos.length > 0) {
      // Add highest point combo available
      return pointCombos.sort((a, b) => {
        const aPoints = calculateComboPoints(a.cards);
        const bPoints = calculateComboPoints(b.cards);
        return bPoints - aPoints;
      })[0];
    }
  }

  // Standard case: when out of suit, prefer non-point singles over valuable pairs
  // Priority: 1) Non-point singles (small first), 2) Trump pairs/tractors (if trying to win), 3) Other pairs as last resort

  const requiredLength = leadingCombo.length;
  const availableCombos = validCombos.filter(
    (combo) => combo.cards.length === requiredLength,
  );

  if (availableCombos.length === 0) return null;

  // Separate combos by type and trump status
  const singleCombos = availableCombos.filter(
    (combo) => combo.type === ComboType.Single,
  );
  const trumpCombos = availableCombos.filter((combo) =>
    combo.cards.some((card) => isTrump(card, trumpInfo)),
  );
  const nonTrumpPairs = availableCombos.filter(
    (combo) =>
      combo.type !== ComboType.Single &&
      !combo.cards.some((card) => isTrump(card, trumpInfo)),
  );

  // For pairs/tractors when out of suit, prioritize non-point singles
  if (requiredLength > 1) {
    if (singleCombos.length >= requiredLength) {
      // Separate non-point and point singles
      const nonPointSingles = singleCombos.filter((combo) =>
        combo.cards.every((card) => !isPointCard(card)),
      );
      const pointSingles = singleCombos.filter((combo) =>
        combo.cards.some((card) => isPointCard(card)),
      );

      // Prefer non-point singles, starting from smallest
      const prioritizedSingles = [
        ...nonPointSingles.sort((a, b) => a.value - b.value),
        ...pointSingles.sort((a, b) => a.value - b.value),
      ];

      if (prioritizedSingles.length >= requiredLength) {
        const selectedCards = prioritizedSingles
          .slice(0, requiredLength)
          .flatMap((combo) => combo.cards);
        return {
          type: ComboType.Single, // Mark as singles when combining
          cards: selectedCards,
          value: selectedCards.reduce(
            (sum, card) => sum + (card.points || 0),
            0,
          ),
        };
      }
    }

    // If we don't have enough singles, check if we should use trump to win
    if (trumpCombos.length > 0) {
      // Only use trump if there are significant points on the table or strategic need
      const tricksPoints =
        currentTrick.leadingCombo.reduce((sum, card) => sum + card.points, 0) +
        currentTrick.plays.reduce(
          (sum, play) =>
            sum +
            play.cards.reduce((cardSum, card) => cardSum + card.points, 0),
          0,
        );

      if (tricksPoints >= 10) {
        // Worth using trump for 10+ points
        return trumpCombos.sort((a, b) => a.value - b.value)[0]; // Use smallest trump combo
      }
    }

    // Last resort: use non-trump pairs, but pick the smallest ones
    if (nonTrumpPairs.length > 0) {
      return nonTrumpPairs.sort((a, b) => a.value - b.value)[0];
    }
  }

  // For singles, just play the smallest available
  if (availableCombos.length > 0) {
    return availableCombos.sort((a, b) => a.value - b.value)[0];
  }

  return null;
}

/**
 * Optimized trump following - uses smallest trump when not planning to beat
 */
export function selectOptimizedTrumpFollow(
  validCombos: Combo[],
  trumpInfo: TrumpInfo,
  conservationStrategy: TrumpConservationStrategy,
  pointContext: PointFocusedContext,
  gameState: GameState,
  leadingCombo: Card[],
): Combo | null {
  // Only apply when following trump leads
  const isLeadingTrump = leadingCombo.some((card) => isTrump(card, trumpInfo));
  if (!isLeadingTrump) return null;

  const currentTrick = gameState.currentTrick;
  if (!currentTrick) return null;

  const trumpCombos = validCombos.filter((combo) =>
    combo.cards.some((card) => isTrump(card, trumpInfo)),
  );

  if (trumpCombos.length === 0) return null;

  // Calculate points on table and evaluate if worth competing
  const tablePoints = calculateTrickPoints(currentTrick);
  const worthCompeting = shouldUseTrumpForPoints(
    tablePoints,
    trumpCombos,
    pointContext,
  );

  if (!worthCompeting) {
    // Not worth competing - use smallest trump to conserve strength
    const nonPreservedTrumps = trumpCombos.filter(
      (combo) =>
        !shouldPreserveCombo(
          combo,
          conservationStrategy,
          pointContext,
          trumpInfo,
        ),
    );

    if (nonPreservedTrumps.length > 0) {
      return getLowestTrumpCombo(nonPreservedTrumps, trumpInfo);
    }

    // If all are preservation-worthy but we must play, use smallest
    return getLowestTrumpCombo(trumpCombos, trumpInfo);
  }

  // Worth competing - try to win with appropriate trump strength
  const winningTrumpCombos = trumpCombos.filter((combo) =>
    canBeatCurrentWinner(combo, currentTrick, trumpInfo),
  );

  if (winningTrumpCombos.length > 0) {
    // Use minimal trump strength to win
    return getLowestTrumpCombo(winningTrumpCombos, trumpInfo);
  }

  // Can't win even with trump - use smallest trump
  const nonPreservedTrumps = trumpCombos.filter(
    (combo) =>
      !shouldPreserveCombo(
        combo,
        conservationStrategy,
        pointContext,
        trumpInfo,
      ),
  );

  if (nonPreservedTrumps.length > 0) {
    return getLowestTrumpCombo(nonPreservedTrumps, trumpInfo);
  }

  return getLowestTrumpCombo(trumpCombos, trumpInfo);
}

/**
 * Intelligent trump following to avoid waste (legacy)
 */
export function selectIntelligentTrumpFollow(
  validCombos: Combo[],
  trumpInfo: TrumpInfo,
  conservationStrategy: TrumpConservationStrategy,
  pointContext: PointFocusedContext,
  leadingCombo: Card[],
): Combo | null {
  // Only apply when following trump leads
  const isLeadingTrump = leadingCombo.some((card) => isTrump(card, trumpInfo));
  if (!isLeadingTrump) return null;

  const trumpCombos = validCombos.filter((combo) =>
    combo.cards.some((card) => isTrump(card, trumpInfo)),
  );

  if (trumpCombos.length === 0) return null;

  // Filter out trump cards we want to preserve
  const filteredTrumpCombos = trumpCombos.filter(
    (combo) =>
      !shouldPreserveCombo(
        combo,
        conservationStrategy,
        pointContext,
        trumpInfo,
      ),
  );

  if (filteredTrumpCombos.length === 0) {
    // If we must play trump and all are preservation-worthy,
    // play the lowest value trump
    return getLowestTrumpCombo(trumpCombos, trumpInfo);
  }

  // Play the lowest appropriate trump
  return getLowestTrumpCombo(filteredTrumpCombos, trumpInfo);
}

// Helper Functions

function determineGamePhase(gameProgress: number): GamePhaseStrategy {
  if (gameProgress <= 0.25) return GamePhaseStrategy.EarlyGame;
  if (gameProgress <= 0.75) return GamePhaseStrategy.MidGame;
  return GamePhaseStrategy.LateGame;
}

function calculateTeamPoints(
  gameState: GameState,
  team: "A" | "B",
): { teamPoints: number; opponentPoints: number } {
  let teamPoints = 0;
  let opponentPoints = 0;

  gameState.tricks.forEach((trick) => {
    const winnerPlayer = gameState.players.find(
      (p) => p.id === trick.winningPlayerId,
    );
    if (winnerPlayer) {
      if (winnerPlayer.team === team) {
        teamPoints += trick.points;
      } else {
        opponentPoints += trick.points;
      }
    }
  });

  return { teamPoints, opponentPoints };
}

function calculatePointCardDensity(gameState: GameState): number {
  const allRemainingCards = gameState.players.flatMap((p) => p.hand);
  const pointCards = allRemainingCards.filter((card) => isPointCard(card));
  return allRemainingCards.length > 0
    ? pointCards.length / allRemainingCards.length
    : 0;
}

function determinePointCardStrategy(
  teamPoints: number,
  opponentPoints: number,
  gamePhase: GamePhaseStrategy,
  isAttackingTeam: boolean,
): PointCardStrategy {
  if (isAttackingTeam) {
    // Attacking team needs points
    if (teamPoints < 40) return PointCardStrategy.Aggressive;
    if (teamPoints >= 80) return PointCardStrategy.Conservative;
    return gamePhase === GamePhaseStrategy.EarlyGame
      ? PointCardStrategy.Escape
      : PointCardStrategy.Aggressive;
  } else {
    // Defending team wants to prevent points
    if (opponentPoints >= 60) return PointCardStrategy.Block;
    return gamePhase === GamePhaseStrategy.EarlyGame
      ? PointCardStrategy.Escape
      : PointCardStrategy.Conservative;
  }
}

function determineTrumpTiming(
  gamePhase: GamePhaseStrategy,
  teamPoints: number,
  opponentPoints: number,
  pointCardDensity: number,
  baseContext: GameContext,
): TrumpTiming {
  if (baseContext.pointPressure === PointPressure.HIGH) {
    return TrumpTiming.Emergency;
  }

  if (gamePhase === GamePhaseStrategy.EarlyGame) {
    return pointCardDensity > 0.3 ? TrumpTiming.Flush : TrumpTiming.Preserve;
  }

  if (gamePhase === GamePhaseStrategy.LateGame) {
    return TrumpTiming.Control;
  }

  // Mid-game strategy
  const pointGap = Math.abs(teamPoints - opponentPoints);
  return pointGap > 20 ? TrumpTiming.Control : TrumpTiming.Preserve;
}

function checkPartnerPointEscape(gameState: GameState, player: any): boolean {
  const partner = gameState.players.find(
    (p) => p.team === player.team && p.id !== player.id,
  );
  if (!partner) return false;

  const partnerPointCards = partner.hand.filter((card) => isPointCard(card));
  return partnerPointCards.length >= 3; // Partner has many point cards
}

function checkCanWinWithoutPoints(
  teamPoints: number,
  opponentPoints: number,
  isAttackingTeam: boolean,
): boolean {
  if (isAttackingTeam) {
    return teamPoints >= 80; // Already have enough points
  } else {
    return opponentPoints < 80 && teamPoints + opponentPoints < 120; // Can prevent opponent from getting 80
  }
}

function estimateTricksRemaining(gameState: GameState): number {
  const averageHandSize =
    gameState.players.reduce((sum, player) => sum + player.hand.length, 0) /
    gameState.players.length;
  return Math.ceil(averageHandSize);
}

function shouldPreserveTrumpType(
  trumpType: "big_joker" | "small_joker" | "trump_rank",
  conservationLevel: "high" | "medium" | "low",
  tricksRemaining: number,
  pointContext: PointFocusedContext,
): boolean {
  if (pointContext.trumpTiming === TrumpTiming.Emergency) return false;
  if (conservationLevel === "low") return false;

  const minTricks =
    trumpType === "big_joker" ? 6 : trumpType === "small_joker" ? 4 : 3;
  return tricksRemaining >= minTricks;
}

function determineTrumpFollowingPriority(
  pointContext: PointFocusedContext,
): "minimal" | "moderate" | "aggressive" {
  switch (pointContext.trumpTiming) {
    case TrumpTiming.Emergency:
      return "aggressive";
    case TrumpTiming.Control:
      return "moderate";
    case TrumpTiming.Flush:
      return "moderate";
    case TrumpTiming.Preserve:
      return "minimal";
    default:
      return "moderate";
  }
}

function getHighestCard(cards: Card[], trumpInfo: TrumpInfo): Card {
  return cards.reduce((highest, card) =>
    compareCards(card, highest, trumpInfo) > 0 ? card : highest,
  );
}

function getComboType(cards: Card[]): ComboType {
  if (cards.length === 1) return ComboType.Single;
  if (cards.length === 2) return ComboType.Pair;
  return ComboType.Tractor;
}

function calculateComboPoints(cards: Card[]): number {
  return cards.reduce((sum, card) => sum + card.points, 0);
}

function getPartnerTeam(gameState: GameState, playerId: string): any {
  const player = gameState.players.find((p) => p.id === playerId);
  if (!player) return null;

  return gameState.players.find(
    (p) => p.team === player.team && p.id !== player.id,
  );
}

function getCurrentPlayerId(gameState: GameState): string {
  return gameState.players[gameState.currentPlayerIndex].id;
}

function shouldPreserveCombo(
  combo: Combo,
  conservationStrategy: TrumpConservationStrategy,
  pointContext: PointFocusedContext,
  trumpInfo: TrumpInfo,
): boolean {
  if (pointContext.trumpTiming === TrumpTiming.Emergency) return false;

  const hasBigJoker = combo.cards.some((card) => card.joker === JokerType.Big);
  const hasSmallJoker = combo.cards.some(
    (card) => card.joker === JokerType.Small,
  );
  const hasTrumpRank = combo.cards.some(
    (card) => card.rank === trumpInfo.trumpRank,
  );

  return (
    (hasBigJoker && conservationStrategy.preserveBigJokers) ||
    (hasSmallJoker && conservationStrategy.preserveSmallJokers) ||
    (hasTrumpRank && conservationStrategy.preserveTrumpRanks)
  );
}

function getLowestTrumpCombo(combos: Combo[], trumpInfo: TrumpInfo): Combo {
  return combos.reduce((lowest, combo) => {
    const lowestCard = getHighestCard(lowest.cards, trumpInfo);
    const comboCard = getHighestCard(combo.cards, trumpInfo);
    return compareCards(lowestCard, comboCard, trumpInfo) < 0 ? lowest : combo;
  });
}

// Helper functions for enhanced strategy

function calculateTrickPoints(trick: any): number {
  let totalPoints = 0;

  // Add points from leading combo
  if (trick.leadingCombo) {
    totalPoints += calculateComboPoints(trick.leadingCombo);
  }

  // Add points from all plays
  if (trick.plays) {
    trick.plays.forEach((play: any) => {
      totalPoints += calculateComboPoints(play.cards);
    });
  }

  return totalPoints;
}

function canBeatCurrentWinner(
  combo: Combo,
  trick: any,
  trumpInfo: TrumpInfo,
): boolean {
  // Determine who is currently winning the trick
  let currentWinningCards = trick.leadingCombo;

  // Check all plays to find the current winner
  if (trick.plays && trick.plays.length > 0) {
    trick.plays.forEach((play: any) => {
      // Use proper card comparison to determine if this play beats the current winner
      const comparison = compareCardCombos(
        play.cards,
        currentWinningCards,
        trumpInfo,
      );
      if (comparison > 0) {
        currentWinningCards = play.cards;
      }
    });
  }

  // Now check if our combo can beat the current winning cards
  try {
    const comparison = compareCardCombos(
      combo.cards,
      currentWinningCards,
      trumpInfo,
    );
    return comparison > 0;
  } catch {
    // If comparison fails (e.g., different lengths), assume we can't beat it
    return false;
  }
}

function isUnbeatableCombo(
  leadingCombo: Card[],
  trumpInfo: TrumpInfo,
  gameState: GameState,
): boolean {
  // Check if it's a non-trump Ace or other high card that's likely unbeatable
  const isNonTrump = !leadingCombo.some((card) => isTrump(card, trumpInfo));

  if (!isNonTrump) return false;

  // Check if it contains Aces or other high cards
  const hasAce = leadingCombo.some((card) => card.rank === "A");
  const hasKing = leadingCombo.some((card) => card.rank === "K");

  // Simple heuristic - Aces are often unbeatable unless trumped
  return hasAce || (hasKing && leadingCombo.length > 1);
}

function shouldUseTrumpForPoints(
  tablePoints: number,
  trumpCombos: Combo[],
  pointContext: PointFocusedContext,
): boolean {
  // Decide if the points on the table justify using trump
  const minPointsForTrump =
    pointContext.gamePhase === GamePhaseStrategy.EarlyGame
      ? 15
      : pointContext.gamePhase === GamePhaseStrategy.MidGame
        ? 10
        : 5;

  // Also consider if we have weak trump combos that are safe to use
  const hasWeakTrump = trumpCombos.some((combo) => combo.value < 100);

  return tablePoints >= minPointsForTrump || (tablePoints >= 5 && hasWeakTrump);
}

function getLeadingSuit(cards: Card[]): string | null {
  // Get the suit of the leading cards (first non-joker card)
  const nonJokerCard = cards.find((card) => !card.joker);
  return nonJokerCard?.suit || null;
}
