import {
  Card,
  GameState,
  Player,
  Combo,
  TrumpInfo,
  ComboType,
  GameContext,
  PlayStyle,
  ComboStrength,
  ComboAnalysis,
  TrickAnalysis,
  PositionStrategy,
  TrickPosition,
  PointPressure,
  CombinationAnalysis,
  PointFocusedContext,
  TrumpConservationStrategy,
  GamePhaseStrategy,
  Rank,
} from "../types";
import {
  identifyCombos,
  isValidPlay,
  isTrump,
  compareCards,
  getLeadingSuit,
  isPointCard,
} from "../game/gameLogic";
import {
  createGameContext,
  analyzeCombo,
  analyzeTrick,
  getPositionStrategy,
} from "./aiGameContext";
import {
  analyzeHandCombinations,
  performAdvancedCombinationAnalysis,
  createCombinationStrategy,
  selectOptimalCombination,
} from "./aiAdvancedCombinations";
import {
  createPointFocusedContext,
  createTrumpConservationStrategy,
  selectEarlyGameLeadingPlay,
  selectPartnerCoordinatedPlay,
  selectIntelligentTrumpFollow,
  selectAggressivePointCollection,
  selectConservativeUnbeatablePlay,
  selectFlexibleOutOfSuitPlay,
  selectAcePriorityLeadingPlay,
  selectAceAggressiveFollowing,
  selectOptimizedTrumpFollow,
} from "./aiPointFocusedStrategy";

// Base AI strategy interface
interface AIStrategy {
  makePlay(gameState: GameState, player: Player, validCombos: Combo[]): Card[];

  declareTrumpSuit(gameState: GameState, player: Player): boolean;
}

// Single AI strategy - always uses hard/expert level AI

// AI strategy implementation
class AIStrategy implements AIStrategy {
  makePlay(gameState: GameState, player: Player, validCombos: Combo[]): Card[] {
    const { currentTrick, trumpInfo } = gameState;

    // Create strategic context for this AI player
    const context = createGameContext(gameState, player.id);

    // Enhanced Point-Focused Strategy (Issue #61)
    const pointContext = createPointFocusedContext(
      gameState,
      player.id,
      context,
    );
    const trumpConservation = createTrumpConservationStrategy(
      pointContext,
      gameState,
      trumpInfo,
    );

    // Point-focused strategy takes priority when applicable
    if (!currentTrick || !currentTrick.leadingCombo) {
      // Leading play with enhanced point-focused strategy
      const pointFocusedPlay = this.selectPointFocusedLeadingPlay(
        validCombos,
        trumpInfo,
        context,
        pointContext,
        trumpConservation,
        gameState,
      );
      if (pointFocusedPlay) return pointFocusedPlay;
    } else {
      // Following play with enhanced point-focused strategy
      const pointFocusedPlay = this.selectPointFocusedFollowingPlay(
        validCombos,
        trumpInfo,
        context,
        pointContext,
        trumpConservation,
        gameState,
      );
      if (pointFocusedPlay) return pointFocusedPlay;
    }

    // Phase 4: Use advanced combination logic when appropriate
    if (this.shouldUseAdvancedCombinations(context)) {
      // If leading, use advanced leading logic
      if (!currentTrick || !currentTrick.leadingCombo) {
        return this.selectAdvancedLeadingPlay(
          validCombos,
          trumpInfo,
          context,
          gameState,
        );
      }

      // If following, use advanced following logic
      return this.selectAdvancedFollowingPlay(
        validCombos,
        trumpInfo,
        context,
        gameState,
      );
    }

    // Fallback to Phase 2/3 logic
    // If leading, use strategic leading logic
    if (!currentTrick || !currentTrick.leadingCombo) {
      return this.selectLeadingPlay(validCombos, trumpInfo, context);
    }

    // If following, use strategic following logic
    return this.selectFollowingPlay(gameState, validCombos, context);
  }

  declareTrumpSuit(gameState: GameState, player: Player): boolean {
    // Hard AI uses more strategic logic to decide when to declare
    const trumpRankCards = player.hand.filter(
      (card) => card.rank === gameState.trumpInfo.trumpRank,
    );

    // Count cards by suit to find most common suit
    const suitCounts = player.hand.reduce(
      (counts, card) => {
        if (card.suit) {
          counts[card.suit] = (counts[card.suit] || 0) + 1;
        }
        return counts;
      },
      {} as Record<string, number>,
    );

    // Find suit with most cards
    let mostCommonSuit = "";
    let maxCount = 0;

    Object.entries(suitCounts).forEach(([suit, count]) => {
      if (count > maxCount) {
        mostCommonSuit = suit;
        maxCount = count;
      }
    });

    // Declare if we have multiple trump rank cards AND they match our most common suit
    const trumpOfMostCommonSuit = trumpRankCards.filter(
      (card) => card.suit === mostCommonSuit,
    );

    if (trumpRankCards.length >= 2 && trumpOfMostCommonSuit.length > 0) {
      return true;
    }

    // Also declare if we have many cards of the same suit (8+)
    if (maxCount >= 8) {
      return true;
    }

    return false;
  }

  // Helper methods for the Hard AI
  private shouldLeadWithTrump(gameState: GameState, player: Player): boolean {
    // Count remaining trump cards in hand
    const { trumpInfo } = gameState;
    const trumpCards = player.hand.filter((card) => isTrump(card, trumpInfo));

    // Lead with trump if we have many trump cards or it's late in the round
    const isLateInRound = player.hand.length < 10;
    return trumpCards.length > 5 || isLateInRound;
  }

  private selectLeadingCombo(combos: Combo[], trumpInfo: TrumpInfo): Card[] {
    // Sort non-trump combos by value
    const nonTrumpCombos = combos.filter(
      (combo) => !combo.cards.some((card) => isTrump(card, trumpInfo)),
    );

    // If we have non-trump combos, use them
    if (nonTrumpCombos.length > 0) {
      // Prefer combos without point cards first
      const nonPointCombos = nonTrumpCombos.filter(
        (combo) => !combo.cards.some((card) => card.points > 0),
      );

      if (nonPointCombos.length > 0) {
        // Lead with a moderate-value non-point combo
        const sortedNonPointCombos = [...nonPointCombos].sort(
          (a, b) => a.value - b.value,
        );
        const middleIndex = Math.floor(sortedNonPointCombos.length / 2);
        return sortedNonPointCombos[middleIndex].cards;
      }

      // If all have points, use the lowest value combo
      const sortedNonTrumpCombos = [...nonTrumpCombos].sort(
        (a, b) => a.value - b.value,
      );
      return sortedNonTrumpCombos[0].cards;
    }

    // If we only have trump combos, play the lowest
    const sortedCombos = [...combos].sort((a, b) => a.value - b.value);
    return sortedCombos[0].cards;
  }

  private isStrongerCombo(
    combo1: Card[],
    combo2: Card[],
    trumpInfo: TrumpInfo,
  ): boolean {
    // Simple comparison for now - would need more complex logic for actual game
    // In general, a combo with a trump beats a non-trump combo
    const combo1HasTrump = combo1.some((card) => isTrump(card, trumpInfo));
    const combo2HasTrump = combo2.some((card) => isTrump(card, trumpInfo));

    if (combo1HasTrump && !combo2HasTrump) return true;
    if (!combo1HasTrump && combo2HasTrump) return false;

    // If both have trump or neither has trump, compare highest cards
    const highCard1 = this.getHighestCard(combo1, trumpInfo);
    const highCard2 = this.getHighestCard(combo2, trumpInfo);

    return compareCards(highCard1, highCard2, trumpInfo) > 0;
  }

  private getHighestCard(cards: Card[], trumpInfo: TrumpInfo): Card {
    return cards.reduce(
      (highest, card) =>
        compareCards(highest, card, trumpInfo) > 0 ? highest : card,
      cards[0],
    );
  }

  private selectBalancedFollowCombo(
    combos: Combo[],
    trickPoints: number,
  ): Card[] {
    // Balance between saving strong cards and winning points
    const sortedCombos = [...combos].sort((a, b) => a.value - b.value);

    // If trick has some points but not a lot, use a medium-strength combo
    if (trickPoints > 5 && trickPoints < 15) {
      const middleIndex = Math.floor(sortedCombos.length / 2);
      return sortedCombos[middleIndex].cards;
    }

    // Otherwise use our weakest combo
    return sortedCombos[0].cards;
  }

  // New strategic methods using GameContext

  private selectLeadingPlay(
    combos: Combo[],
    trumpInfo: TrumpInfo,
    context: GameContext,
  ): Card[] {
    // Enhanced Phase 2: Position-aware strategy with combo analysis
    const positionStrategy = getPositionStrategy(
      context.trickPosition,
      context.playStyle,
    );
    const comboAnalyses = combos.map((combo) => ({
      combo,
      analysis: analyzeCombo(combo, trumpInfo, context),
    }));

    // Strategy depends on team role, position, and play style
    if (context.isAttackingTeam) {
      return this.selectAttackingLeadPlay(
        comboAnalyses,
        trumpInfo,
        context,
        positionStrategy,
      );
    } else {
      return this.selectDefendingLeadPlay(
        comboAnalyses,
        trumpInfo,
        context,
        positionStrategy,
      );
    }
  }

  private selectFollowingPlay(
    gameState: GameState,
    combos: Combo[],
    context: GameContext,
  ): Card[] {
    // Enhanced Phase 2: Comprehensive trick and position analysis
    const positionStrategy = getPositionStrategy(
      context.trickPosition,
      context.playStyle,
    );
    const trickAnalysis = analyzeTrick(
      gameState,
      gameState.players[gameState.currentPlayerIndex].id,
      combos,
    );

    const comboAnalyses = combos.map((combo) => ({
      combo,
      analysis: analyzeCombo(combo, gameState.trumpInfo, context),
    }));

    // Enhanced strategic decision making
    return this.selectOptimalFollowPlay(
      comboAnalyses,
      trickAnalysis,
      context,
      positionStrategy,
      gameState.trumpInfo,
    );
  }

  private selectAttackingLeadPlay(
    comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
    trumpInfo: TrumpInfo,
    context: GameContext,
    positionStrategy: PositionStrategy,
  ): Card[] {
    // Phase 3: Memory-enhanced attacking lead strategy
    const memoryStrategy = context.memoryStrategy;
    const memoryContext = context.memoryContext;

    // Use memory insights to adjust base strategy
    if (memoryStrategy?.endgameOptimal && memoryContext) {
      // Perfect information available - make optimal decisions
      return this.selectEndgameOptimalPlay(comboAnalyses, context, trumpInfo);
    }

    if (memoryStrategy?.suitExhaustionAdvantage) {
      // Exploit known suit voids
      return this.selectSuitExploitationPlay(comboAnalyses, trumpInfo);
    }

    // Enhanced strategy with memory-based adjustments
    switch (context.playStyle) {
      case PlayStyle.Desperate:
        // Use strongest available combo, prioritize trump based on memory
        const trumpPriority =
          memoryStrategy?.shouldPlayTrump ||
          (memoryContext?.trumpExhaustion ?? 0) > 0.7;
        return this.selectByStrength(
          comboAnalyses,
          [ComboStrength.Critical, ComboStrength.Strong],
          trumpPriority,
        );

      case PlayStyle.Aggressive:
        // Balance between probing and strength, adjust based on opponent strength
        const riskAdjustment = memoryStrategy?.riskLevel || 0.5;
        if (positionStrategy.disruptionFocus > 0.6 || riskAdjustment > 0.7) {
          return this.selectDisruptiveCombo(comboAnalyses, trumpInfo);
        }
        return this.selectByStrength(
          comboAnalyses,
          [ComboStrength.Strong, ComboStrength.Medium],
          false,
        );

      case PlayStyle.Balanced:
        // Information gathering with memory-enhanced risk assessment
        if (
          positionStrategy.informationGathering > 0.6 &&
          (memoryContext?.uncertaintyLevel ?? 1) > 0.5
        ) {
          return this.selectProbingCombo(comboAnalyses, trumpInfo);
        }
        return this.selectByStrength(
          comboAnalyses,
          [ComboStrength.Medium, ComboStrength.Weak],
          false,
        );

      case PlayStyle.Conservative:
      default:
        // Safe probing with memory-based safety assessment
        return this.selectSafeLeadCombo(comboAnalyses, trumpInfo);
    }
  }

  private selectDefendingLeadPlay(
    comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
    trumpInfo: TrumpInfo,
    context: GameContext,
    positionStrategy: PositionStrategy,
  ): Card[] {
    // Phase 3: Memory-enhanced defending lead strategy
    const memoryStrategy = context.memoryStrategy;
    const memoryContext = context.memoryContext;

    // Use memory insights for defensive strategy
    if (memoryStrategy?.endgameOptimal && memoryContext) {
      // Perfect information - block optimally
      return this.selectEndgameDefensePlay(comboAnalyses, context, trumpInfo);
    }

    // Adjust strategy based on estimated opponent strength
    const opponentThreat = memoryStrategy?.expectedOpponentStrength || 0.5;

    switch (context.playStyle) {
      case PlayStyle.Desperate:
        // Maximum disruption with memory-enhanced targeting
        if (memoryStrategy?.shouldPlayTrump || opponentThreat > 0.7) {
          return this.selectMaxDisruptionCombo(comboAnalyses, trumpInfo);
        }
        return this.selectDisruptiveCombo(comboAnalyses, trumpInfo);

      case PlayStyle.Aggressive:
        // Active defense with opponent strength assessment
        if (positionStrategy.disruptionFocus > 0.5 || opponentThreat > 0.6) {
          return this.selectDisruptiveCombo(comboAnalyses, trumpInfo);
        }
        return this.selectByStrength(
          comboAnalyses,
          [ComboStrength.Medium, ComboStrength.Strong],
          false,
        );

      case PlayStyle.Balanced:
        // Moderate defense with information optimization
        if ((memoryContext?.uncertaintyLevel ?? 1) > 0.6) {
          // Still need information
          return this.selectBalancedDefenseCombo(
            comboAnalyses,
            trumpInfo,
            positionStrategy,
          );
        }
        // Have good information - play more strategically
        return this.selectMemoryInformedDefense(
          comboAnalyses,
          context,
          trumpInfo,
        );

      case PlayStyle.Conservative:
      default:
        // Patient defense with memory-based safety
        return this.selectSafeLeadCombo(comboAnalyses, trumpInfo);
    }
  }

  private selectOptimalFollowPlay(
    comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
    trickAnalysis: TrickAnalysis,
    context: GameContext,
    positionStrategy: PositionStrategy,
    trumpInfo: TrumpInfo,
  ): Card[] {
    // Enhanced following strategy with real-time trick winner analysis
    const trickWinner = context.trickWinnerAnalysis;

    // NEW: Enhanced decision logic using real-time trick winner information
    if (trickWinner) {
      // When teammate is winning, check if we should play conservatively
      // BUT don't be conservative if we can contribute point cards to help teammate
      if (
        trickWinner.isTeammateWinning &&
        trickWinner.shouldPlayConservatively
      ) {
        // Check if we have point cards that could help teammate
        const hasPointCards = comboAnalyses.some((ca) =>
          ca.combo.cards.some((card) => card.points > 0),
        );

        // Only be conservative if we don't have point cards to contribute
        if (!hasPointCards) {
          return this.selectConservativePlay(comboAnalyses, context);
        }
        // Otherwise, continue to partner coordination logic later in priority chain
      }

      // If opponent is winning and we should try to beat them
      if (
        trickWinner.isOpponentWinning &&
        trickWinner.shouldTryToBeat &&
        trickWinner.canBeatCurrentWinner
      ) {
        return this.selectAggressiveBeatPlay(
          comboAnalyses,
          trickAnalysis,
          context,
        );
      }

      // If there are significant points and opponent is winning
      if (trickWinner.isOpponentWinning && trickWinner.trickPoints >= 10) {
        // Try to contest if we can
        if (trickAnalysis.canWin && trickAnalysis.shouldContest) {
          return this.selectOptimalWinningCombo(
            comboAnalyses,
            trickAnalysis,
            context,
            positionStrategy,
          );
        }
      }
    }

    // Fallback to original logic
    // Can we win this trick?
    if (trickAnalysis.canWin && trickAnalysis.shouldContest) {
      // Worth contesting - select optimal winning combo
      return this.selectOptimalWinningCombo(
        comboAnalyses,
        trickAnalysis,
        context,
        positionStrategy,
      );
    }

    // Can't or shouldn't win - strategic disposal
    return this.selectStrategicDisposal(
      comboAnalyses,
      trickAnalysis,
      context,
      positionStrategy,
    );
  }

  // Enhanced helper methods for Phase 2 strategy

  private selectByStrength(
    comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
    preferredStrengths: ComboStrength[],
    preferTrump: boolean,
  ): Card[] {
    // Filter by preferred strengths
    const preferred = comboAnalyses.filter((ca) =>
      preferredStrengths.includes(ca.analysis.strength),
    );

    if (preferred.length > 0) {
      // Sort by trump preference and value
      const sorted = preferred.sort((a, b) => {
        if (preferTrump && a.analysis.isTrump !== b.analysis.isTrump) {
          return a.analysis.isTrump ? -1 : 1;
        }
        return b.combo.value - a.combo.value;
      });
      return sorted[0].combo.cards;
    }

    // Fallback to any available combo
    const fallback = comboAnalyses.sort(
      (a, b) => a.combo.value - b.combo.value,
    );
    return fallback[0].combo.cards;
  }

  private selectProbingCombo(
    comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
    trumpInfo: TrumpInfo,
  ): Card[] {
    // Select combo that maximizes information gathering
    const nonTrump = comboAnalyses.filter((ca) => !ca.analysis.isTrump);
    if (nonTrump.length > 0) {
      // Prefer medium-strength non-trump to probe opponent hands
      const medium = nonTrump.filter(
        (ca) => ca.analysis.strength === ComboStrength.Medium,
      );
      if (medium.length > 0) {
        return medium[0].combo.cards;
      }
      // Fallback to weakest non-trump
      const sorted = nonTrump.sort((a, b) => a.combo.value - b.combo.value);
      return sorted[0].combo.cards;
    }
    // Only trump available - use weakest
    const sorted = comboAnalyses.sort((a, b) => a.combo.value - b.combo.value);
    return sorted[0].combo.cards;
  }

  private selectSafeLeadCombo(
    comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
    trumpInfo: TrumpInfo,
  ): Card[] {
    // Safe leading - avoid giving away points or strong cards
    const safe = comboAnalyses.filter(
      (ca) =>
        !ca.analysis.hasPoints && ca.analysis.strength === ComboStrength.Weak,
    );

    if (safe.length > 0) {
      // Prefer non-trump safe cards
      const nonTrumpSafe = safe.filter((ca) => !ca.analysis.isTrump);
      if (nonTrumpSafe.length > 0) {
        return nonTrumpSafe[0].combo.cards;
      }
      return safe[0].combo.cards;
    }

    // No safe options - pick least risky
    const sorted = comboAnalyses.sort((a, b) => {
      if (a.analysis.hasPoints !== b.analysis.hasPoints) {
        return a.analysis.hasPoints ? 1 : -1;
      }
      return a.combo.value - b.combo.value;
    });
    return sorted[0].combo.cards;
  }

  private selectDisruptiveCombo(
    comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
    trumpInfo: TrumpInfo,
  ): Card[] {
    // Select combo with highest disruption potential
    const sorted = comboAnalyses.sort(
      (a, b) => b.analysis.disruptionPotential - a.analysis.disruptionPotential,
    );
    return sorted[0].combo.cards;
  }

  private selectMaxDisruptionCombo(
    comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
    trumpInfo: TrumpInfo,
  ): Card[] {
    // Maximum disruption - prefer trump tractors/pairs
    const trump = comboAnalyses.filter((ca) => ca.analysis.isTrump);
    if (trump.length > 0) {
      const tractors = trump.filter(
        (ca) => ca.combo.type === ComboType.Tractor,
      );
      if (tractors.length > 0) {
        return tractors.sort((a, b) => b.combo.value - a.combo.value)[0].combo
          .cards;
      }
      const pairs = trump.filter((ca) => ca.combo.type === ComboType.Pair);
      if (pairs.length > 0) {
        return pairs.sort((a, b) => b.combo.value - a.combo.value)[0].combo
          .cards;
      }
      return trump.sort((a, b) => b.combo.value - a.combo.value)[0].combo.cards;
    }

    // No trump - use highest disruption potential
    return this.selectDisruptiveCombo(comboAnalyses, trumpInfo);
  }

  private selectBalancedDefenseCombo(
    comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
    trumpInfo: TrumpInfo,
    positionStrategy: PositionStrategy,
  ): Card[] {
    // Balanced defense considers information gathering vs disruption
    if (
      positionStrategy.informationGathering > positionStrategy.disruptionFocus
    ) {
      return this.selectProbingCombo(comboAnalyses, trumpInfo);
    } else {
      return this.selectDisruptiveCombo(comboAnalyses, trumpInfo);
    }
  }

  private selectOptimalWinningCombo(
    comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
    trickAnalysis: TrickAnalysis,
    context: GameContext,
    positionStrategy: PositionStrategy,
  ): Card[] {
    // Find combos that can win the trick
    const winningCombos = comboAnalyses.filter((ca) => {
      // This would need actual comparison logic with trick winner
      return ca.combo.value > 50; // Simplified for now
    });

    if (winningCombos.length === 0) {
      return comboAnalyses[0].combo.cards; // Fallback
    }

    // Choose winning combo based on strategy
    if (positionStrategy.riskTaking > 0.7) {
      // High risk tolerance - use minimal winning combo
      return winningCombos.sort((a, b) => a.combo.value - b.combo.value)[0]
        .combo.cards;
    } else {
      // Conservative - ensure win with stronger combo
      return winningCombos.sort((a, b) => b.combo.value - a.combo.value)[0]
        .combo.cards;
    }
  }

  private selectStrategicDisposal(
    comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
    trickAnalysis: TrickAnalysis,
    context: GameContext,
    positionStrategy: PositionStrategy,
  ): Card[] {
    // Strategic disposal when not contesting trick
    if (context.cardsRemaining <= 3) {
      // Endgame - dispose of least valuable
      const sorted = comboAnalyses.sort(
        (a, b) => a.analysis.conservationValue - b.analysis.conservationValue,
      );
      return sorted[0].combo.cards;
    }

    // Mid-game strategic disposal
    if (positionStrategy.informationGathering > 0.6) {
      // Use disposal to gather information
      return this.selectProbingCombo(comboAnalyses, { trumpRank: "A" } as any);
    }

    // Standard disposal - weakest non-trump
    const nonTrump = comboAnalyses.filter((ca) => !ca.analysis.isTrump);
    if (nonTrump.length > 0) {
      const sorted = nonTrump.sort((a, b) => a.combo.value - b.combo.value);
      return sorted[0].combo.cards;
    }

    // Only trump left - use weakest
    const sorted = comboAnalyses.sort((a, b) => a.combo.value - b.combo.value);
    return sorted[0].combo.cards;
  }

  // Updated helper methods

  private selectStrongestCombo(combos: Combo[]): Card[] {
    // Play strongest combo available
    const sorted = [...combos].sort((a, b) => b.value - a.value);
    return sorted[0].cards;
  }

  private selectMediumCombo(combos: Combo[], trumpInfo?: TrumpInfo): Card[] {
    // Play medium-strength combo
    if (trumpInfo) {
      // Prefer non-trump if available
      const nonTrumpCombos = combos.filter(
        (combo) => !combo.cards.some((card) => isTrump(card, trumpInfo)),
      );
      if (nonTrumpCombos.length > 0) {
        const sorted = [...nonTrumpCombos].sort((a, b) => a.value - b.value);
        const midIndex = Math.floor(sorted.length / 2);
        return sorted[midIndex].cards;
      }
    }

    const sorted = [...combos].sort((a, b) => a.value - b.value);
    const midIndex = Math.floor(sorted.length / 2);
    return sorted[midIndex].cards;
  }

  // Phase 3: Memory-enhanced strategic methods

  private selectEndgameOptimalPlay(
    comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
    context: GameContext,
    trumpInfo: TrumpInfo,
  ): Card[] {
    // Perfect information available - calculate optimal play
    const memoryContext = context.memoryContext;
    if (!memoryContext) {
      return this.selectByStrength(comboAnalyses, [ComboStrength.Strong], true);
    }

    // In endgame with perfect info, play optimally based on opponent hands
    const strongestOpponent = Math.max(
      ...Object.values(memoryContext.opponentHandStrength),
    );

    if (strongestOpponent > 0.7) {
      // Strong opponent - use critical cards to ensure wins
      return this.selectByStrength(
        comboAnalyses,
        [ComboStrength.Critical, ComboStrength.Strong],
        true,
      );
    } else {
      // Weak opponents - use minimal strength to win
      return this.selectByStrength(
        comboAnalyses,
        [ComboStrength.Medium, ComboStrength.Weak],
        false,
      );
    }
  }

  private selectSuitExploitationPlay(
    comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
    trumpInfo: TrumpInfo,
  ): Card[] {
    // Find combos that exploit known suit voids
    // Prefer non-trump suits where opponents have voids
    const nonTrumpCombos = comboAnalyses.filter((ca) => !ca.analysis.isTrump);

    if (nonTrumpCombos.length > 0) {
      // Sort by strength and select medium strength to probe
      const sorted = nonTrumpCombos.sort(
        (a, b) => b.combo.value - a.combo.value,
      );
      const midIndex = Math.floor(sorted.length / 2);
      return sorted[midIndex].combo.cards;
    }

    // Fallback to trump if no non-trump available
    return this.selectByStrength(comboAnalyses, [ComboStrength.Medium], true);
  }

  private selectEndgameDefensePlay(
    comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
    context: GameContext,
    trumpInfo: TrumpInfo,
  ): Card[] {
    // Perfect information defense - block optimally
    const memoryContext = context.memoryContext;
    if (!memoryContext) {
      return this.selectMaxDisruptionCombo(comboAnalyses, trumpInfo);
    }

    // Calculate minimum strength needed to disrupt
    const averageOpponentStrength =
      Object.values(memoryContext.opponentHandStrength).reduce(
        (sum, strength) => sum + strength,
        0,
      ) / 4;

    if (averageOpponentStrength > 0.6) {
      // Strong opponents - use maximum strength
      return this.selectByStrength(
        comboAnalyses,
        [ComboStrength.Critical, ComboStrength.Strong],
        true,
      );
    } else {
      // Weak opponents - moderate disruption sufficient
      return this.selectByStrength(
        comboAnalyses,
        [ComboStrength.Medium, ComboStrength.Strong],
        false,
      );
    }
  }

  private selectMemoryInformedDefense(
    comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
    context: GameContext,
    trumpInfo: TrumpInfo,
  ): Card[] {
    // Use memory insights for informed defense
    const memoryStrategy = context.memoryStrategy;
    const memoryContext = context.memoryContext;

    if (!memoryStrategy || !memoryContext) {
      return this.selectBalancedDefenseCombo(comboAnalyses, trumpInfo, {
        informationGathering: 0.5,
        riskTaking: 0.5,
        partnerCoordination: 0.5,
        disruptionFocus: 0.5,
      });
    }

    // Adjust defense based on trump exhaustion
    if (memoryContext.trumpExhaustion > 0.8) {
      // Few trumps left - safe to play strong non-trump
      const nonTrump = comboAnalyses.filter((ca) => !ca.analysis.isTrump);
      if (nonTrump.length > 0) {
        return this.selectByStrength(nonTrump, [ComboStrength.Strong], false);
      }
    }

    // Standard memory-informed defense
    const riskLevel = memoryStrategy.riskLevel;
    if (riskLevel > 0.7) {
      // High confidence - play more aggressively
      return this.selectByStrength(
        comboAnalyses,
        [ComboStrength.Strong, ComboStrength.Medium],
        memoryStrategy.shouldPlayTrump,
      );
    } else {
      // Lower confidence - conservative defense
      return this.selectByStrength(
        comboAnalyses,
        [ComboStrength.Medium, ComboStrength.Weak],
        false,
      );
    }
  }

  private selectLegacyDisruptiveCombo(
    combos: Combo[],
    trumpInfo: TrumpInfo,
  ): Card[] {
    // Lead with trump to disrupt opponent plans (legacy method)
    const trumpCombos = combos.filter((combo) =>
      combo.cards.some((card) => isTrump(card, trumpInfo)),
    );

    if (trumpCombos.length > 0) {
      // Use medium-strength trump to probe
      const sorted = [...trumpCombos].sort((a, b) => a.value - b.value);
      const midIndex = Math.floor(sorted.length / 2);
      return sorted[midIndex].cards;
    }

    // No trump available - use regular leading logic
    return this.selectLeadingCombo(combos, trumpInfo);
  }

  // Phase 4: Advanced Combination Logic Methods

  /**
   * Enhanced leading play selection with advanced combination analysis
   */
  private selectAdvancedLeadingPlay(
    validCombos: Combo[],
    trumpInfo: TrumpInfo,
    context: GameContext,
    gameState: GameState,
  ): Card[] {
    // Find current player based on game state
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (!currentPlayer)
      return this.selectLeadingPlay(validCombos, trumpInfo, context);

    // Analyze hand combination profile
    const handProfile = analyzeHandCombinations(
      currentPlayer.hand,
      trumpInfo,
      gameState,
      context,
    );

    // Create advanced combination strategy
    const strategy = createCombinationStrategy(context, handProfile);

    // Select optimal combination using Phase 4 logic
    const optimalCombo = selectOptimalCombination(
      validCombos,
      strategy,
      trumpInfo,
      gameState,
      context,
    );

    if (optimalCombo) {
      return optimalCombo.cards;
    }

    // Fallback to Phase 2/3 logic
    return this.selectLeadingPlay(validCombos, trumpInfo, context);
  }

  /**
   * Enhanced following play with advanced combination analysis
   */
  private selectAdvancedFollowingPlay(
    validCombos: Combo[],
    trumpInfo: TrumpInfo,
    context: GameContext,
    gameState: GameState,
  ): Card[] {
    // Find current player based on game state
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (!currentPlayer)
      return this.selectFollowingPlay(gameState, validCombos, context);

    // Priority 0: Check if partner is winning - use enhanced point card strategy
    const currentTrick = gameState.currentTrick;
    if (currentTrick?.leadingCombo) {
      // Defer to new trick winner analysis logic if available
      if (context.trickWinnerAnalysis) {
        // The enhanced selectOptimalFollowPlay logic will handle trick winner analysis,
        // but we still need to check Priority 6 partner coordination here since
        // selectOptimalFollowPlay doesn't have access to all the required parameters
        // Continue to Priority 6 logic below
      } else {
        // Fallback to legacy partner winning logic when trick winner analysis not available
        const currentWinner = gameState.players.find(
          (p) => p.id === currentTrick.winningPlayerId,
        );
        if (currentWinner && currentWinner.team === currentPlayer.team) {
          // Convert advanced analyses to simple combo analyses for compatibility
          const comboAnalyses = validCombos.map((combo) => ({
            combo,
            analysis: analyzeCombo(combo, trumpInfo, context),
          }));

          return this.selectPointCollectionPlay(comboAnalyses, context);
        }
      }
    }

    // Analyze current combination options with advanced logic
    const combinationAnalyses = validCombos.map((combo) =>
      performAdvancedCombinationAnalysis(combo, trumpInfo, gameState, context),
    );

    // Filter by timing and context
    let candidates = combinationAnalyses;

    // Priority 0.5: Enhanced trick winner analysis (new logic)
    if (context.trickWinnerAnalysis) {
      const trickWinner = context.trickWinnerAnalysis;

      // Convert advanced analyses to simple combo analyses for compatibility
      const comboAnalyses = validCombos.map((combo) => ({
        combo,
        analysis: analyzeCombo(combo, trumpInfo, context),
      }));

      // Apply new trick winner strategy logic
      if (
        trickWinner.isTeammateWinning &&
        trickWinner.shouldPlayConservatively
      ) {
        return this.selectConservativePlay(comboAnalyses, context);
      }

      if (
        trickWinner.isOpponentWinning &&
        trickWinner.shouldTryToBeat &&
        trickWinner.canBeatCurrentWinner
      ) {
        // For advanced following play, we need to adapt this for the combinationAnalyses format
        return this.selectAggressiveBeatPlayAdvanced(
          candidates,
          context,
          trumpInfo,
        );
      }

      if (
        trickWinner.isTeammateWinning &&
        !trickWinner.shouldPlayConservatively
      ) {
        return this.selectPointCollectionPlay(comboAnalyses, context);
      }
    }

    // Priority 1: Endgame optimization
    if (context.cardsRemaining <= 6 && context.memoryStrategy?.endgameOptimal) {
      const endgameCandidates = candidates.filter(
        (analysis) => analysis.timing === "endgame",
      );
      if (endgameCandidates.length > 0) {
        candidates = endgameCandidates;
      }
    }

    // Priority 2: Memory-informed decisions
    if (context.memoryStrategy && context.memoryContext) {
      const memoryInformed = this.selectMemoryInformedCombo(
        candidates,
        context,
      );
      if (memoryInformed) {
        return memoryInformed.cards;
      }
    }

    // Priority 3: Adaptive strategy based on position
    const selected = this.selectAdaptiveCombo(candidates, context);
    if (selected) {
      return selected.cards;
    }

    // Fallback to existing logic
    return this.selectFollowingPlay(gameState, validCombos, context);
  }

  /**
   * Advanced aggressive beat play for advanced combination analysis format
   */
  private selectAggressiveBeatPlayAdvanced(
    combinationAnalyses: CombinationAnalysis[],
    context: GameContext,
    trumpInfo: TrumpInfo,
  ): Card[] {
    // Filter for combinations that can beat current winner
    const beatCandidates = combinationAnalyses.filter(
      (analysis) => analysis.effectiveness > 0.6 && analysis.risk < 0.8,
    );

    if (beatCandidates.length > 0) {
      // Select the strongest combination that can beat
      const bestBeat = beatCandidates.reduce((best, current) =>
        current.effectiveness > best.effectiveness ? current : best,
      );
      return bestBeat.cards;
    }

    // Fallback to any decent combination
    const fallback = combinationAnalyses.find(
      (analysis) => analysis.effectiveness > 0.4,
    );
    return fallback ? fallback.cards : combinationAnalyses[0].cards;
  }

  /**
   * Memory-informed combination selection
   */
  private selectMemoryInformedCombo(
    analyses: CombinationAnalysis[],
    context: GameContext,
  ): CombinationAnalysis | null {
    if (!context.memoryContext || !context.memoryStrategy) return null;

    // Filter combinations based on memory insights
    const memoryFiltered = analyses.filter((analysis) => {
      // Prefer immediate plays when we have good information
      if (context.memoryContext!.uncertaintyLevel < 0.3) {
        return analysis.timing === "immediate";
      }

      // Conservative approach when uncertainty is high
      if (context.memoryContext!.uncertaintyLevel > 0.7) {
        return analysis.risk < 0.5;
      }

      return true;
    });

    if (memoryFiltered.length === 0) return null;

    // Sort by effectiveness with memory influence
    memoryFiltered.sort((a, b) => {
      const aScore =
        a.effectiveness +
        a.reward * (1 - context.memoryContext!.uncertaintyLevel);
      const bScore =
        b.effectiveness +
        b.reward * (1 - context.memoryContext!.uncertaintyLevel);
      return bScore - aScore;
    });

    return memoryFiltered[0];
  }

  /**
   * Position-adaptive combination selection
   */
  private selectAdaptiveCombo(
    analyses: CombinationAnalysis[],
    context: GameContext,
  ): CombinationAnalysis | null {
    if (analyses.length === 0) return null;

    let candidates = [...analyses];

    // Position-specific filtering
    switch (context.trickPosition) {
      case TrickPosition.First:
        // Leading: prefer combinations with high opponent disruption
        candidates = candidates.filter(
          (a) => a.pattern.opponentDisruption > 0.6,
        );
        break;

      case TrickPosition.Second:
        // Early follower: balance risk and information gathering
        candidates = candidates.filter(
          (a) => a.risk < 0.7 && a.alternativeCount > 1,
        );
        break;

      case TrickPosition.Third:
        // Late follower: tactical decisions based on current trick state
        candidates = candidates.filter(
          (a) =>
            a.pattern.partnerSupport > 0.5 ||
            a.pattern.opponentDisruption > 0.7,
        );
        break;

      case TrickPosition.Fourth:
        // Last player: optimize based on winning/losing position
        candidates = candidates.filter(
          (a) => a.timing === "immediate" || a.effectiveness > 0.8,
        );
        break;
    }

    // If filtering removed all candidates, use original list
    if (candidates.length === 0) {
      candidates = analyses;
    }

    // Sort by composite score
    candidates.sort((a, b) => {
      const aScore =
        a.effectiveness * 0.5 + a.reward * 0.3 + (1 - a.risk) * 0.2;
      const bScore =
        b.effectiveness * 0.5 + b.reward * 0.3 + (1 - b.risk) * 0.2;
      return bScore - aScore;
    });

    return candidates[0];
  }

  /**
   * Enhanced combo analysis with Phase 4 insights
   */
  private analyzeComboWithAdvancedInsights(
    combo: Combo,
    trumpInfo: TrumpInfo,
    gameState: GameState,
    context: GameContext,
  ): CombinationAnalysis {
    return performAdvancedCombinationAnalysis(
      combo,
      trumpInfo,
      gameState,
      context,
    );
  }

  /**
   * Determines if Phase 4 logic should be used based on game state
   */
  private shouldUseAdvancedCombinations(context: GameContext): boolean {
    // Use advanced logic when:
    // 1. We have memory context (Phase 3 integration)
    // 2. Game is in critical stages (high pressure or endgame)
    // 3. Hand has significant combination potential

    return (
      context.memoryContext !== undefined ||
      context.pointPressure === PointPressure.HIGH ||
      context.cardsRemaining <= 8 ||
      context.playStyle === PlayStyle.Aggressive ||
      context.playStyle === PlayStyle.Desperate
    );
  }

  /**
   * NEW: Select conservative play when teammate is winning
   */
  private selectConservativePlay(
    comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
    context: GameContext,
  ): Card[] {
    // When teammate is winning, play the lowest value cards possible
    const sorted = comboAnalyses.sort((a, b) => {
      // Prioritize non-trump, non-point cards
      if (a.analysis.isTrump !== b.analysis.isTrump) {
        return a.analysis.isTrump ? 1 : -1; // Non-trump preferred
      }
      if (a.analysis.hasPoints !== b.analysis.hasPoints) {
        return a.analysis.hasPoints ? 1 : -1; // Non-point preferred
      }
      // Then by lowest value
      return a.combo.value - b.combo.value;
    });

    return sorted[0].combo.cards;
  }

  /**
   * Select point collection play when partner is winning
   * This is the original conservative play logic that prioritizes point cards
   */
  private selectPointCollectionPlay(
    comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
    context: GameContext,
  ): Card[] {
    // Enhanced strategy for when partner is winning:
    // 1. Prioritize point cards (5s, 10s, Kings)
    // 2. Then select smallest non-point cards
    // 3. Avoid beating partner unless necessary

    // Separate combos with point cards vs non-point cards
    const pointCardCombos = comboAnalyses.filter((ca) =>
      ca.combo.cards.some((card) => isPointCard(card)),
    );

    const nonPointCardCombos = comboAnalyses.filter(
      (ca) => !ca.combo.cards.some((card) => isPointCard(card)),
    );

    // If we have point card combos, prioritize: 10s -> Kings -> 5s
    if (pointCardCombos.length > 0) {
      // Helper function to determine card priority
      const getCardPriority = (cards: Card[]): number => {
        // Check if combo contains 10s (highest priority for 10-point cards)
        if (cards.some((card) => card.rank === Rank.Ten)) return 3;
        // Check if combo contains Kings (second priority for 10-point cards)
        if (cards.some((card) => card.rank === Rank.King)) return 2;
        // Check if combo contains 5s (lowest priority)
        if (cards.some((card) => card.rank === Rank.Five)) return 1;
        return 0;
      };

      const sortedByPoints = pointCardCombos.sort((a, b) => {
        const pointsA = a.combo.cards.reduce(
          (sum, card) => sum + (card.points || 0),
          0,
        );
        const pointsB = b.combo.cards.reduce(
          (sum, card) => sum + (card.points || 0),
          0,
        );

        // First sort by total points (higher points first)
        if (pointsB !== pointsA) {
          return pointsB - pointsA;
        }

        // If equal points, prioritize 10s > Kings > 5s
        return getCardPriority(b.combo.cards) - getCardPriority(a.combo.cards);
      });
      return sortedByPoints[0].combo.cards;
    }

    // Otherwise, play smallest non-point cards (lowest conservation value)
    const sorted = nonPointCardCombos.sort(
      (a, b) => a.analysis.conservationValue - b.analysis.conservationValue,
    );

    return sorted.length > 0
      ? sorted[0].combo.cards
      : comboAnalyses[0].combo.cards;
  }

  /**
   * NEW: Select aggressive play to beat current winner
   */
  private selectAggressiveBeatPlay(
    comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
    trickAnalysis: TrickAnalysis,
    context: GameContext,
  ): Card[] {
    // Filter for combinations that can win
    const winningCombos = comboAnalyses.filter((ca) => {
      // This is a simplified check - could be enhanced with more sophisticated logic
      return ca.analysis.strength >= ComboStrength.Medium;
    });

    if (winningCombos.length === 0) {
      // Fallback to conservative play if we can't beat
      return this.selectConservativePlay(comboAnalyses, context);
    }

    // Select the most efficient winning combo (minimal overkill)
    const sorted = winningCombos.sort((a, b) => {
      // Prefer trump combos if opponent is playing non-trump
      if (a.analysis.isTrump !== b.analysis.isTrump) {
        return a.analysis.isTrump ? -1 : 1; // Trump preferred when beating
      }
      // Among similar trump status, prefer lower value (minimal overkill)
      return a.combo.value - b.combo.value;
    });

    return sorted[0].combo.cards;
  }

  // Enhanced Point-Focused Strategy Methods (Issue #61)

  /**
   * Point-focused leading play selection with Ace priority
   */
  private selectPointFocusedLeadingPlay(
    validCombos: Combo[],
    trumpInfo: TrumpInfo,
    context: GameContext,
    pointContext: PointFocusedContext,
    trumpConservation: TrumpConservationStrategy,
    gameState: GameState,
  ): Card[] | null {
    // Priority 1: Ace priority leading - prioritize non-trump Aces and Ace pairs
    const acePriorityPlay = selectAcePriorityLeadingPlay(
      validCombos,
      trumpInfo,
      pointContext,
      gameState,
    );
    if (acePriorityPlay) {
      return acePriorityPlay.cards;
    }

    // Priority 2: Early game strategy - Lead high non-trump to help partner escape points
    if (pointContext.gamePhase === GamePhaseStrategy.EarlyGame) {
      const earlyGamePlay = selectEarlyGameLeadingPlay(
        validCombos,
        trumpInfo,
        pointContext,
        gameState,
      );
      if (earlyGamePlay) {
        return earlyGamePlay.cards;
      }
    }

    // Priority 3: Check trump conservation constraints
    const conservationFilteredCombos = this.filterByTrumpConservation(
      validCombos,
      trumpConservation,
      pointContext,
      trumpInfo,
    );

    if (conservationFilteredCombos.length > 0) {
      // Use filtered combos to avoid wasting big trumps early
      return this.selectOptimalFromFiltered(
        conservationFilteredCombos,
        trumpInfo,
        context,
      );
    }

    return null; // Use fallback strategy
  }

  /**
   * Point-focused following play selection with enhanced strategies
   */
  private selectPointFocusedFollowingPlay(
    validCombos: Combo[],
    trumpInfo: TrumpInfo,
    context: GameContext,
    pointContext: PointFocusedContext,
    trumpConservation: TrumpConservationStrategy,
    gameState: GameState,
  ): Card[] | null {
    const currentTrick = gameState.currentTrick;
    if (!currentTrick?.leadingCombo) return null;

    // Check if partner is winning - if so, defer to enhanced conservative logic
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const currentWinner = gameState.players.find(
      (p) => p.id === currentTrick.winningPlayerId,
    );
    if (currentWinner && currentWinner.team === currentPlayer.team) {
      return null; // Let enhanced conservative logic handle this
    }

    // Priority 1: Ace aggressive following - use Aces when points are on the table
    const aceAggressivePlay = selectAceAggressiveFollowing(
      validCombos,
      trumpInfo,
      pointContext,
      gameState,
      currentTrick.leadingCombo,
    );
    if (aceAggressivePlay) {
      return aceAggressivePlay.cards;
    }

    // Priority 2: Aggressive point collection when opponent is winning with points
    const aggressivePlay = selectAggressivePointCollection(
      validCombos,
      trumpInfo,
      pointContext,
      gameState,
      currentTrick.leadingCombo,
    );
    if (aggressivePlay) {
      return aggressivePlay.cards;
    }

    // Priority 3: Conservative play against unbeatable cards
    const conservativePlay = selectConservativeUnbeatablePlay(
      validCombos,
      trumpInfo,
      pointContext,
      gameState,
      currentTrick.leadingCombo,
    );
    if (conservativePlay) {
      return conservativePlay.cards;
    }

    // Priority 4: Optimized trump following - use smallest trump when not planning to beat
    const optimizedTrumpPlay = selectOptimizedTrumpFollow(
      validCombos,
      trumpInfo,
      trumpConservation,
      pointContext,
      gameState,
      currentTrick.leadingCombo,
    );
    if (optimizedTrumpPlay) {
      return optimizedTrumpPlay.cards;
    }

    // Priority 5: Flexible following when out of suit
    const flexiblePlay = selectFlexibleOutOfSuitPlay(
      validCombos,
      trumpInfo,
      pointContext,
      gameState,
      currentTrick.leadingCombo,
    );
    if (flexiblePlay) {
      return flexiblePlay.cards;
    }

    // Priority 6: Partner coordination: Follow with point cards when partner is winning
    const partnerCoordinatedPlay = selectPartnerCoordinatedPlay(
      validCombos,
      trumpInfo,
      pointContext,
      gameState,
      currentTrick.leadingCombo,
    );
    if (partnerCoordinatedPlay) {
      return partnerCoordinatedPlay.cards;
    }

    // Priority 7: Intelligent trump following to avoid waste (legacy fallback)
    const intelligentTrumpPlay = selectIntelligentTrumpFollow(
      validCombos,
      trumpInfo,
      trumpConservation,
      pointContext,
      currentTrick.leadingCombo,
    );
    if (intelligentTrumpPlay) {
      return intelligentTrumpPlay.cards;
    }

    return null; // Use fallback strategy
  }

  /**
   * Filters combos based on trump conservation strategy
   */
  private filterByTrumpConservation(
    combos: Combo[],
    conservation: TrumpConservationStrategy,
    pointContext: PointFocusedContext,
    trumpInfo: TrumpInfo,
  ): Combo[] {
    return combos.filter((combo) => {
      // Allow all non-trump combos
      const hasTrump = combo.cards.some((card) => isTrump(card, trumpInfo));
      if (!hasTrump) return true;

      // Check conservation rules for trump combos
      const hasBigJoker = combo.cards.some((card) => card.joker === "Big");
      const hasSmallJoker = combo.cards.some((card) => card.joker === "Small");
      const hasTrumpRank = combo.cards.some(
        (card) => card.rank === trumpInfo.trumpRank,
      );

      // Apply conservation rules
      if (hasBigJoker && conservation.preserveBigJokers) return false;
      if (hasSmallJoker && conservation.preserveSmallJokers) return false;
      if (hasTrumpRank && conservation.preserveTrumpRanks) return false;

      return true;
    });
  }

  /**
   * Selects optimal combo from conservation-filtered options
   */
  private selectOptimalFromFiltered(
    combos: Combo[],
    trumpInfo: TrumpInfo,
    context: GameContext,
  ): Card[] {
    if (combos.length === 0) {
      throw new Error("Cannot select from empty combo list");
    }

    // Sort by combo strength and strategic value
    const sortedCombos = combos.sort((a, b) => {
      const aAnalysis = analyzeCombo(a, trumpInfo, context);
      const bAnalysis = analyzeCombo(b, trumpInfo, context);

      // Prioritize by strength and strategic value
      const aScore = this.calculateComboScore(aAnalysis);
      const bScore = this.calculateComboScore(bAnalysis);

      return bScore - aScore;
    });

    return sortedCombos[0].cards;
  }

  /**
   * Calculates strategic score for combo selection
   */
  private calculateComboScore(analysis: ComboAnalysis): number {
    let score = 0;

    // Base score from strength
    switch (analysis.strength) {
      case ComboStrength.Critical:
        score += 4;
        break;
      case ComboStrength.Strong:
        score += 3;
        break;
      case ComboStrength.Medium:
        score += 2;
        break;
      case ComboStrength.Weak:
        score += 1;
        break;
    }

    // Bonuses
    if (analysis.isTrump) score += 1;
    if (analysis.hasPoints) score += 0.5;

    // Strategic value
    score += analysis.disruptionPotential * 0.3;
    score += analysis.conservationValue * 0.2;

    return score;
  }
}

// Create AI strategy (there's only one level now)
export const createAIStrategy = (): AIStrategy => {
  return new AIStrategy();
};

// Main AI player logic
export const getAIMove = (gameState: GameState, playerId: string): Card[] => {
  const player = gameState.players.find((p) => p.id === playerId);
  if (!player) {
    throw new Error(`AI player with ID ${playerId} not found`);
  }

  // Get all possible card combinations from player's hand
  const allCombos = identifyCombos(player.hand, gameState.trumpInfo);

  // Filter to valid plays based on current trick
  let validCombos: Combo[] = [];

  if (!gameState.currentTrick || !gameState.currentTrick.leadingCombo) {
    // Player is leading, any valid combo is fine
    validCombos = allCombos;
  } else {
    // Get the leading combo's type and suit
    const leadingCombo = gameState.currentTrick.leadingCombo;
    const leadingLength = leadingCombo.length;
    const leadingSuit = getLeadingSuit(leadingCombo);
    const isLeadingTrump = leadingCombo.some((card) =>
      isTrump(card, gameState.trumpInfo),
    );

    // If leading with trump, prioritize trump combos
    if (isLeadingTrump) {
      // Find trump combos
      const trumpCombos = allCombos.filter(
        (combo) =>
          combo.cards.length === leadingLength &&
          combo.cards.some((card) => isTrump(card, gameState.trumpInfo)),
      );

      if (trumpCombos.length > 0) {
        // Must play trump if you have them
        validCombos = trumpCombos.filter((combo) =>
          isValidPlay(
            combo.cards,
            leadingCombo,
            player.hand,
            gameState.trumpInfo,
          ),
        );
      } else {
        // Check if the player has any trump cards at all
        const hasTrumpCards = player.hand.some((card) =>
          isTrump(card, gameState.trumpInfo),
        );

        if (hasTrumpCards) {
          // If player has trump cards but not trump combos, they should prioritize playing trumps
          // as singles rather than forming non-trump combos
          const trumpCards = player.hand
            .filter((card) => isTrump(card, gameState.trumpInfo))
            .sort((a, b) => compareCards(a, b, gameState.trumpInfo));

          // Create simple combos with individual trump cards
          // Unused in current logic but kept for potential future use
          // const singleTrumpCombos = trumpCards.map(card => ({
          //   type: ComboType.Single,
          //   cards: [card],
          //   value: 50 + (card.rank === gameState.trumpInfo.trumpRank ? 100 : 0)
          // }));

          // Check if we have enough trump cards to match the leading length
          if (trumpCards.length >= leadingLength) {
            // First, try to find proper trump combos that match the leading length
            const trumpCombos = allCombos.filter((combo) => {
              // Check if this combo is made entirely of trump cards
              const isAllTrump = combo.cards.every((card) =>
                isTrump(card, gameState.trumpInfo),
              );

              return (
                isAllTrump &&
                combo.cards.length === leadingLength &&
                isValidPlay(
                  combo.cards,
                  leadingCombo,
                  player.hand,
                  gameState.trumpInfo,
                )
              );
            });

            if (trumpCombos.length > 0) {
              // Use proper trump combos (tractors, pairs) if available
              validCombos = trumpCombos;
            } else {
              // Fallback: construct singles combo only if no proper combos exist
              const trumpCombo = {
                type: ComboType.Single,
                cards: trumpCards.slice(0, leadingLength),
                value: 200,
              };

              // Only use this fallback if it would be valid
              if (
                isValidPlay(
                  trumpCombo.cards,
                  leadingCombo,
                  player.hand,
                  gameState.trumpInfo,
                )
              ) {
                validCombos = [trumpCombo];
              } else {
                validCombos = [];
              }
            }
          } else {
            // For other lengths, just check general valid plays
            validCombos = allCombos.filter(
              (combo) =>
                combo.cards.length === leadingLength &&
                isValidPlay(
                  combo.cards,
                  leadingCombo,
                  player.hand,
                  gameState.trumpInfo,
                ),
            );
          }
        } else {
          // If no trump cards at all, can play anything of the right length
          validCombos = allCombos.filter(
            (combo) =>
              combo.cards.length === leadingLength &&
              isValidPlay(
                combo.cards,
                leadingCombo,
                player.hand,
                gameState.trumpInfo,
              ),
          );
        }
      }
    } else if (leadingSuit) {
      // If leading with a specific suit, prioritize that suit
      const suitCombos = allCombos.filter(
        (combo) =>
          combo.cards.length === leadingLength &&
          combo.cards.every((card) => card.suit === leadingSuit),
      );

      if (suitCombos.length > 0) {
        // Must play the same suit if you have enough cards
        validCombos = suitCombos.filter((combo) =>
          isValidPlay(
            combo.cards,
            leadingCombo,
            player.hand,
            gameState.trumpInfo,
          ),
        );
      } else {
        // If can't follow suit, can play anything of the right length
        validCombos = allCombos.filter(
          (combo) =>
            combo.cards.length === leadingLength &&
            isValidPlay(
              combo.cards,
              leadingCombo,
              player.hand,
              gameState.trumpInfo,
            ),
        );
      }
    } else {
      // For any other case, apply general valid play rules
      validCombos = allCombos.filter(
        (combo) =>
          combo.cards.length === leadingLength &&
          isValidPlay(
            combo.cards,
            leadingCombo,
            player.hand,
            gameState.trumpInfo,
          ),
      );
    }
  }

  // If no valid combos, find partial matches (this handles the case where
  // player doesn't have enough cards of the leading suit)
  if (validCombos.length === 0 && gameState.currentTrick) {
    const leadingCombo = gameState.currentTrick.leadingCombo;
    const leadingLength = leadingCombo.length;
    const leadingSuit = getLeadingSuit(leadingCombo);

    // First, check if the player has ANY cards of the leading suit
    const leadingSuitCards = player.hand.filter(
      (card) =>
        card.suit === leadingSuit && !isTrump(card, gameState.trumpInfo),
    );

    // If player has cards of the leading suit, they MUST play all of them first
    if (leadingSuitCards.length > 0) {
      if (leadingSuitCards.length >= leadingLength) {
        // This can happen when the AI has enough cards of the right suit
        // but they don't form a valid combo (e.g., they don't match the pattern)
        // We need to find a valid play using those suit cards

        // Try to form a valid play by selecting the right cards of the suit
        // Sort cards by value to ensure a consistent selection
        const sortedLeadingSuitCards = [...leadingSuitCards].sort((a, b) =>
          compareCards(a, b, gameState.trumpInfo),
        );

        // Check if the available cards can form a valid play
        const selectedCards = sortedLeadingSuitCards.slice(0, leadingLength);
        if (
          isValidPlay(
            selectedCards,
            leadingCombo,
            player.hand,
            gameState.trumpInfo,
          )
        ) {
          return selectedCards;
        }

        // If we can't make a valid play from the leading suit cards alone,
        // we might need to include some trump cards or other cards
        // This is a complex case that depends on the game rules
        console.warn(
          "AI has enough leading suit cards but cannot form a valid combo - trying alternative selection",
        );

        // Look for any valid combinations with these suit cards
        const possibleCombos = allCombos.filter(
          (combo) =>
            combo.cards.length === leadingLength &&
            isValidPlay(
              combo.cards,
              leadingCombo,
              player.hand,
              gameState.trumpInfo,
            ),
        );

        if (possibleCombos.length > 0) {
          // Sort by value and take the lowest
          possibleCombos.sort((a, b) => a.value - b.value);
          return possibleCombos[0].cards;
        }

        // Last resort: just play the cards even if it's not a valid combo
        // This should be caught by the game rules, but it's a fallback
        console.warn(
          "AI cannot find any valid play - using arbitrary cards of the leading suit",
        );
        return sortedLeadingSuitCards.slice(0, leadingLength);
      } else {
        // Not enough cards of the leading suit, but must use all we have
        // Plus some other cards to reach the required length
        const otherCards = player.hand
          .filter(
            (card) =>
              card.suit !== leadingSuit || isTrump(card, gameState.trumpInfo),
          )
          .sort((a, b) => compareCards(a, b, gameState.trumpInfo));

        const remainingNeeded = leadingLength - leadingSuitCards.length;
        if (otherCards.length >= remainingNeeded) {
          return [...leadingSuitCards, ...otherCards.slice(0, remainingNeeded)];
        } else {
          // Not enough cards total
          console.warn(
            `AI player ${playerId} doesn't have enough cards (has: ${player.hand.length}, needs: ${leadingLength})`,
          );
          return [...leadingSuitCards, ...otherCards];
        }
      }
    }

    // If no cards of leading suit, just take lowest value cards
    const availableCards = [...player.hand].sort((a, b) =>
      compareCards(a, b, gameState.trumpInfo),
    );

    // Take the lowest cards up to the required length
    if (availableCards.length < leadingLength) {
      // Emergency handling: if we don't have enough cards, return all we have
      console.warn(
        `AI player ${playerId} doesn't have enough cards (has: ${availableCards.length}, needs: ${leadingLength})`,
      );
      return availableCards;
    }

    const forcedPlay = availableCards.slice(0, leadingLength);
    return forcedPlay;
  }

  // Use the AI strategy to select cards to play
  const strategy = createAIStrategy();
  return strategy.makePlay(gameState, player, validCombos);
};

// AI trump declaration decision
export const shouldAIDeclare = (
  gameState: GameState,
  playerId: string,
): boolean => {
  const player = gameState.players.find((p) => p.id === playerId);
  if (!player) {
    throw new Error(`AI player with ID ${playerId} not found`);
  }

  const strategy = createAIStrategy();
  return strategy.declareTrumpSuit(gameState, player);
};
