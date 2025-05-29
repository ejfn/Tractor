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
  PositionStrategy,
  TrickPosition,
  PointPressure,
  CombinationAnalysis,
  PointFocusedContext,
  TrumpConservationStrategy,
  GamePhaseStrategy,
  Rank,
} from "../types";
import { isTrump, evaluateTrickPlay } from "../game/gameLogic";
import {
  createGameContext,
  analyzeCombo,
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
} from "./aiPointFocusedStrategy";
import { isBiggestRemainingInSuit, createCardMemory } from "./aiCardMemory";

/**
 * Base AI strategy interface defining the core capabilities
 * that any AI implementation must provide
 */
export interface AIStrategy {
  /**
   * Select cards to play for the given game state and player
   * @param gameState Current game state
   * @param player AI player making the move
   * @param validCombos Valid card combinations available to play
   * @returns Array of cards to play
   */
  makePlay(gameState: GameState, player: Player, validCombos: Combo[]): Card[];

  /**
   * Decide whether to declare trump suit during dealing phase
   * @param gameState Current game state
   * @param player AI player making the decision
   * @returns True if should declare trump, false otherwise
   */
  declareTrumpSuit(gameState: GameState, player: Player): boolean;
}

/**
 * Sophisticated 4-phase AI strategy implementation with restructured priority chain
 *
 * Features:
 * - Phase 1: Foundation intelligence with basic combination detection
 * - Phase 2: Strategic context awareness with point-focused gameplay
 * - Phase 3: Advanced memory systems with pattern recognition
 * - Phase 4: Strategic optimization with advanced combination analysis
 *
 * Priority Chain:
 * 1. Team Coordination - Support teammates and contribute points strategically
 * 2. Opponent Blocking - Counter opponent point collection based on trick value
 * 3. Trick Contention - Contest valuable tricks (≥5 points) when winnable
 * 4. Strategic Disposal - Conserve high-value cards and play optimally for future
 */
export class AIStrategyImplementation implements AIStrategy {
  makePlay(gameState: GameState, player: Player, validCombos: Combo[]): Card[] {
    const { currentTrick, trumpInfo } = gameState;

    // Create strategic context for this AI player
    const context = createGameContext(gameState, player.id);

    // Create memory context for biggest remaining detection
    const cardMemory = createCardMemory(gameState);
    if (context.memoryContext) {
      context.memoryContext.cardMemory = cardMemory;
    }

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
      // Following play with RESTRUCTURED priority chain
      // Convert validCombos to comboAnalyses format using proper analysis
      const comboAnalyses = validCombos.map((combo) => ({
        combo,
        analysis: analyzeCombo(combo, trumpInfo, context),
      }));

      // Use new restructured follow logic
      const restructuredPlay = this.selectOptimalFollowPlay(
        comboAnalyses,
        context,
        {} as PositionStrategy, // Simplified for now
        trumpInfo,
        gameState,
      );
      return restructuredPlay;
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

  // === RESTRUCTURED PRIORITY CHAIN FOR FOLLOWING PLAY ===

  private selectOptimalFollowPlay(
    comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
    context: GameContext,
    positionStrategy: PositionStrategy,
    trumpInfo: TrumpInfo,
    gameState: GameState,
  ): Card[] {
    // RESTRUCTURED: Clear priority chain for following play decisions
    const trickWinner = context.trickWinnerAnalysis;

    // Clear priority-based decision making

    // === PRIORITY 1: TEAM COORDINATION ===
    if (trickWinner?.isTeammateWinning) {
      // Teammate is winning - help collect points or play conservatively
      return this.handleTeammateWinning(
        comboAnalyses,
        context,
        trumpInfo,
        gameState,
      );
    }

    // === PRIORITY 2: OPPONENT BLOCKING ===
    if (trickWinner?.isOpponentWinning) {
      // Opponent is winning - try to beat them or minimize damage
      const opponentResponse = this.handleOpponentWinning(
        comboAnalyses,
        context,
        trickWinner,
        trumpInfo,
        gameState,
      );
      if (opponentResponse) {
        return opponentResponse;
      }
    }

    // === PRIORITY 3: TRICK CONTENTION ===
    if (trickWinner?.canBeatCurrentWinner && trickWinner?.shouldTryToBeat) {
      // Can win the trick and it's worth winning
      return this.selectOptimalWinningCombo(
        comboAnalyses,
        context,
        positionStrategy,
        trumpInfo,
        gameState,
      );
    }
    // === PRIORITY 4: STRATEGIC DISPOSAL ===
    // Can't/shouldn't win - play optimally for future tricks
    return this.selectStrategicDisposal(
      comboAnalyses,
      context,
      positionStrategy,
    );
  }

  // === TEAM COORDINATION HANDLER ===
  private handleTeammateWinning(
    comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
    context: GameContext,
    trumpInfo: TrumpInfo,
    gameState?: GameState,
  ): Card[] {
    const trickWinner = context.trickWinnerAnalysis!;

    // For now, use simple heuristics based on trick winner analysis
    const shouldContributePoints = this.shouldContributePointCards(
      trickWinner,
      comboAnalyses,
      context,
      gameState,
      trumpInfo,
    );

    if (shouldContributePoints) {
      // CONTRIBUTE_POINTS: Use memory-enhanced point card hierarchy
      return this.selectPointContribution(comboAnalyses, trumpInfo, context);
    } else {
      // PLAY_CONSERVATIVE: Teammate winning strong - play low, avoid point cards
      return this.selectLowestValueNonPointCombo(comboAnalyses);
    }
  }

  // === POINT CONTRIBUTION DECISION ===
  private shouldContributePointCards(
    trickWinner: any,
    comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
    context: GameContext,
    gameState?: GameState,
    trumpInfo?: TrumpInfo,
  ): boolean {
    // Check if we have point cards available
    const hasPointCards = comboAnalyses.some((ca) =>
      ca.combo.cards.some((card) => card.points > 0),
    );

    if (!hasPointCards) {
      return false; // Can't contribute what we don't have
    }

    // Memory-enhanced decision: Check if our point cards are biggest remaining
    if (context.memoryContext?.cardMemory) {
      const guaranteedWinningPointCards = comboAnalyses.some((ca) => {
        const firstCard = ca.combo.cards[0];
        if (!firstCard.suit || !firstCard.points || firstCard.points <= 0) {
          return false;
        }

        // Skip trump cards (different dynamics)
        if (isTrump(firstCard, context.trumpInfo || ({} as TrumpInfo))) {
          return false;
        }

        const comboType = ca.combo.type === ComboType.Pair ? "pair" : "single";
        return (
          context.memoryContext!.cardMemory &&
          isBiggestRemainingInSuit(
            context.memoryContext!.cardMemory,
            firstCard.suit,
            firstCard.rank!,
            comboType,
          )
        );
      });

      // If we have guaranteed winning point cards, definitely contribute
      if (guaranteedWinningPointCards) {
        return true;
      }
    }

    // If teammate is the current winner, consider point contribution
    if (trickWinner.isTeammateWinning) {
      // If teammate is winning with very strong trump, contribute aggressively
      // (e.g., trump rank in trump suit, Big Joker, etc.)
      if (gameState?.currentTrick && trumpInfo) {
        // Find the winning player's card, not the leading card
        const winningPlayerId = trickWinner.currentWinner;
        const winningPlay = gameState.currentTrick.plays.find(
          (play) => play.playerId === winningPlayerId,
        );
        const winningCard = winningPlay
          ? winningPlay.cards[0]
          : gameState.currentTrick.leadingCombo[0];

        // If teammate is winning with very strong cards, contribute points aggressively
        // TODO: Future enhancement - integrate memory system to determine card strength based on:
        // - Cards already played in this suit
        // - Remaining cards in opponents' hands
        // - Probability that teammate's card will be beaten
        // This will make "strong card" detection more intelligent and context-aware
        const isVeryStrongCard =
          winningCard.joker || // Any joker
          (winningCard.rank === trumpInfo.trumpRank &&
            winningCard.suit === trumpInfo.trumpSuit) || // Trump rank in trump suit
          (winningCard.rank === Rank.Ace && !isTrump(winningCard, trumpInfo)); // Non-trump Ace

        if (isVeryStrongCard) {
          return true; // Contribute points aggressively when teammate has very strong cards
        }
      }

      return false; // Otherwise be conservative - teammate might lose the trick
    }

    // If trick has low points, worth contributing
    if (trickWinner.trickPoints < 15) {
      return true;
    }

    // For high-point tricks or strong teammate leads, be conservative
    return false;
  }

  // === POINT CONTRIBUTION WITH HIERARCHY ===
  private selectPointContribution(
    comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
    trumpInfo: TrumpInfo,
    context?: GameContext,
  ): Card[] {
    const pointCardCombos = comboAnalyses.filter((ca) =>
      ca.combo.cards.some((card) => card.points > 0),
    );

    if (pointCardCombos.length === 0) {
      // No point cards - play lowest available non-point cards
      return this.selectLowestValueNonPointCombo(comboAnalyses);
    }

    // Memory-enhanced selection: Prioritize biggest remaining point cards
    if (context?.memoryContext?.cardMemory) {
      const guaranteedWinningPointCards: {
        combo: { combo: Combo; analysis: ComboAnalysis };
        priority: number;
      }[] = [];

      pointCardCombos.forEach((comboAnalysis) => {
        const firstCard = comboAnalysis.combo.cards[0];
        if (!firstCard.suit || isTrump(firstCard, trumpInfo)) {
          return; // Skip trump or invalid cards
        }

        const comboType =
          comboAnalysis.combo.type === ComboType.Pair ? "pair" : "single";
        const isBiggestRemaining =
          context.memoryContext!.cardMemory &&
          isBiggestRemainingInSuit(
            context.memoryContext!.cardMemory,
            firstCard.suit,
            firstCard.rank!,
            comboType,
          );

        if (isBiggestRemaining) {
          let priority = 0;

          // Use same priority system as leading strategy
          if (firstCard.rank === Rank.King) {
            priority += 5; // Kings get highest priority for point contribution
          } else if (firstCard.rank === Rank.Ten) {
            priority += 4; // 10s get high priority
          } else if (firstCard.rank === Rank.Five) {
            priority += 3; // 5s get medium priority
          }

          // Bonus for pairs vs singles
          if (comboAnalysis.combo.type === ComboType.Pair) {
            priority += 1;
          }

          guaranteedWinningPointCards.push({
            combo: comboAnalysis,
            priority,
          });
        }
      });

      // If we have guaranteed winning point cards, use them
      if (guaranteedWinningPointCards.length > 0) {
        guaranteedWinningPointCards.sort((a, b) => b.priority - a.priority);
        return guaranteedWinningPointCards[0].combo.combo.cards;
      }
    }

    // Fallback: Sort by traditional point card hierarchy: 10 > King > 5
    const sortedPointCombos = pointCardCombos.sort((a, b) => {
      const aCard = a.combo.cards[0]; // Assume single card for simplicity
      const bCard = b.combo.cards[0];

      // Priority order: 10s first, then Kings, then 5s
      const getPriority = (card: any) => {
        if (card.rank === Rank.Ten) return 3;
        if (card.rank === Rank.King) return 2;
        if (card.rank === Rank.Five) return 1;
        return 0;
      };

      const aPriority = getPriority(aCard);
      const bPriority = getPriority(bCard);

      if (aPriority !== bPriority) {
        return bPriority - aPriority; // Higher priority first
      }

      // Same priority - prefer higher point value
      return b.analysis.pointValue - a.analysis.pointValue;
    });

    return sortedPointCombos[0].combo.cards;
  }

  // === OPPONENT BLOCKING HANDLER ===
  private handleOpponentWinning(
    comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
    context: GameContext,
    trickWinner: any,
    trumpInfo: TrumpInfo,
    gameState: GameState,
  ): Card[] | null {
    // Check if we can beat the opponent at all
    if (!trickWinner.canBeatCurrentWinner) {
      // Can't beat opponent - play lowest value card to minimize points given
      return this.selectLowestValueNonPointCombo(comboAnalyses);
    }

    // High-value tricks (>=10 points): definitely try to beat if we can
    if (trickWinner.trickPoints >= 10) {
      return this.selectOptimalWinningCombo(
        comboAnalyses,
        context,
        {} as PositionStrategy,
        trumpInfo,
        gameState,
      );
    }

    // Moderate points (5-9 points): beat if reasonable
    if (trickWinner.trickPoints >= 5 && trickWinner.shouldTryToBeat) {
      return this.selectAggressiveBeatPlay(comboAnalyses, context);
    }

    // Low value tricks (0-4 points): don't waste high cards on pointless tricks
    // Use conservation logic to play weakest cards instead of null
    return this.selectLowestValueNonPointCombo(comboAnalyses);
  }

  // === STRATEGIC DISPOSAL ===
  private selectStrategicDisposal(
    comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
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

    // When we can't win the trick, conserve valuable cards (trump + Aces + point cards)
    const trickWinner = context.trickWinnerAnalysis;
    if (!trickWinner?.canBeatCurrentWinner) {
      // First priority: prefer non-trump, non-Ace, non-point cards
      const nonValuable = comboAnalyses.filter(
        (ca) =>
          !ca.analysis.isTrump &&
          !ca.combo.cards.some((card) => card.rank === Rank.Ace) &&
          !ca.combo.cards.some((card) => (card.points || 0) > 0),
      );

      if (nonValuable.length > 0) {
        const sorted = nonValuable.sort(
          (a, b) => a.combo.value - b.combo.value,
        );
        return sorted[0].combo.cards;
      }

      // Second priority: prefer non-trump, non-point cards (even if Aces)
      const nonTrumpNonPoint = comboAnalyses.filter(
        (ca) =>
          !ca.analysis.isTrump &&
          !ca.combo.cards.some((card) => (card.points || 0) > 0),
      );
      if (nonTrumpNonPoint.length > 0) {
        const sorted = nonTrumpNonPoint.sort(
          (a, b) => a.combo.value - b.combo.value,
        );
        return sorted[0].combo.cards;
      }

      // Third priority: prefer non-trump (even if point cards)
      const nonTrump = comboAnalyses.filter((ca) => !ca.analysis.isTrump);
      if (nonTrump.length > 0) {
        const sorted = nonTrump.sort((a, b) => a.combo.value - b.combo.value);
        return sorted[0].combo.cards;
      }

      // Last resort: use trump cards (only if no non-trump available)
    }

    // Standard disposal - use weakest combo
    const sorted = comboAnalyses.sort((a, b) => a.combo.value - b.combo.value);
    return sorted[0].combo.cards;
  }

  // === HELPER METHODS ===

  private selectLowestValueNonPointCombo(
    comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
  ): Card[] {
    // First priority: non-point cards
    const nonPointCombos = comboAnalyses.filter(
      (ca) => !ca.combo.cards.some((card) => (card.points || 0) > 0),
    );

    if (nonPointCombos.length > 0) {
      // Sort by trump conservation value (lower = less valuable to preserve)
      const sorted = nonPointCombos.sort(
        (a, b) => a.analysis.conservationValue - b.analysis.conservationValue,
      );
      return sorted[0].combo.cards;
    }

    // Fallback: if only point cards available, use lowest conservation value
    const sorted = comboAnalyses.sort(
      (a, b) => a.analysis.conservationValue - b.analysis.conservationValue,
    );
    return sorted[0].combo.cards;
  }

  private selectOptimalWinningCombo(
    comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
    context: GameContext,
    positionStrategy: PositionStrategy,
    trumpInfo: TrumpInfo,
    gameState: GameState,
  ): Card[] {
    // Find combos that can actually beat the current trick using proper trick evaluation
    const currentTrick = gameState.currentTrick;
    const winningCombos = comboAnalyses.filter((ca) => {
      if (!currentTrick) return true; // No trick in progress

      // Use evaluateTrickPlay for proper trick-context evaluation
      try {
        const player = gameState.players[gameState.currentPlayerIndex];
        if (!player) return false;

        const evaluation = evaluateTrickPlay(
          ca.combo.cards,
          currentTrick,
          trumpInfo,
          player.hand,
        );

        return evaluation.canBeat && evaluation.isLegal;
      } catch {
        // If evaluation fails, assume this combo cannot win
        return false;
      }
    });

    if (winningCombos.length === 0) {
      return comboAnalyses[0].combo.cards; // Fallback
    }

    // Use the strongest winning combo to ensure we beat the opponent
    return winningCombos.sort((a, b) => b.combo.value - a.combo.value)[0].combo
      .cards;
  }

  private selectAggressiveBeatPlay(
    comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
    context: GameContext,
  ): Card[] {
    // Filter for combinations that can win
    const winningCombos = comboAnalyses.filter((ca) => {
      // This is a simplified check - could be enhanced with more sophisticated logic
      return ca.analysis.strength >= ComboStrength.Medium;
    });

    if (winningCombos.length === 0) {
      // Fallback to conservative play if we can't beat - avoid wasting point cards
      return this.selectLowestValueNonPointCombo(comboAnalyses);
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

  // === PHASE 2/3/4 STRATEGY METHODS ===

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

    const comboAnalyses = combos.map((combo) => ({
      combo,
      analysis: analyzeCombo(combo, gameState.trumpInfo, context),
    }));

    // Enhanced strategic decision making
    return this.selectOptimalFollowPlay(
      comboAnalyses,
      context,
      positionStrategy,
      gameState.trumpInfo,
      gameState,
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

    // Memory-enhanced biggest remaining strategy: Lead with guaranteed winners
    if (memoryContext) {
      const guaranteedWinnerPlay = this.selectBiggestRemainingCombo(
        comboAnalyses,
        memoryContext,
        trumpInfo,
      );
      if (guaranteedWinnerPlay) {
        return guaranteedWinnerPlay;
      }
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

  // Additional strategy helper methods...
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

  // Phase 4: Advanced Combination Logic Methods
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

    // Analyze current combination options with advanced logic
    const combinationAnalyses = validCombos.map((combo) =>
      performAdvancedCombinationAnalysis(combo, trumpInfo, gameState, context),
    );

    // Filter by timing and context
    let candidates = combinationAnalyses;

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

  // Enhanced Point-Focused Strategy Methods (Issue #61)
  private selectPointFocusedLeadingPlay(
    validCombos: Combo[],
    trumpInfo: TrumpInfo,
    context: GameContext,
    pointContext: PointFocusedContext,
    trumpConservation: TrumpConservationStrategy,
    gameState: GameState,
  ): Card[] | null {
    // Priority 1: Early game strategy - Lead high non-trump (includes integrated Ace priority)
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

  /**
   * Selects combinations that are guaranteed winners using biggest remaining logic
   * Prioritizes point cards and pairs over singles when they're unbeatable
   */
  private selectBiggestRemainingCombo(
    comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
    memoryContext: any,
    trumpInfo: TrumpInfo,
  ): Card[] | null {
    // Only consider non-trump combos (trump cards have different dynamics)
    const nonTrumpCombos = comboAnalyses.filter((ca) => {
      const combo = ca.combo;
      const firstCard = combo.cards[0];

      // Must be non-trump and have a suit
      return firstCard.suit && !isTrump(firstCard, trumpInfo);
    });

    if (nonTrumpCombos.length === 0) return null;

    // Find combos that are biggest remaining in their suit
    const guaranteedWinners: {
      combo: { combo: Combo; analysis: ComboAnalysis };
      priority: number;
    }[] = [];

    nonTrumpCombos.forEach((comboAnalysis) => {
      const firstCard = comboAnalysis.combo.cards[0];
      const suit = firstCard.suit!;
      const rank = firstCard.rank!;
      const comboType = comboAnalysis.combo.type;

      let priority = 0;
      let isGuaranteedWin = false;

      // Handle different combo types with strategic priority
      if (comboType === ComboType.Tractor) {
        // For tractors, check if the lowest pair in the tractor is biggest remaining
        // If lowest pair wins, the whole tractor wins
        const tractorCards = comboAnalysis.combo.cards.sort(
          (a, b) => this.getRankValue(a.rank!) - this.getRankValue(b.rank!),
        );
        const lowestRank = tractorCards[0].rank!;

        if (
          isBiggestRemainingInSuit(
            memoryContext.cardMemory,
            suit,
            lowestRank,
            "pair",
          )
        ) {
          isGuaranteedWin = true;
          priority += 3; // Tractors get medium-high priority
        }
      } else {
        // For pairs and singles
        const memoryComboType =
          comboType === ComboType.Pair ? "pair" : "single";

        if (
          isBiggestRemainingInSuit(
            memoryContext.cardMemory,
            suit,
            rank,
            memoryComboType,
          )
        ) {
          isGuaranteedWin = true;

          // Strategic priority: Aces and guaranteed Kings first (collect points before opponent runs out)
          if (rank === Rank.Ace) {
            priority += 6; // Aces get highest priority - always safe and valuable
          } else if (rank === Rank.King) {
            priority += 5; // Guaranteed Kings second highest - point cards we must collect
          } else if (comboType === ComboType.Pair) {
            priority += 2; // Other pairs get lower priority
          } else {
            priority += 1; // Other singles get lowest priority
          }
        }
      }

      if (isGuaranteedWin) {
        // Additional bonus for point cards (on top of rank priority)
        if (firstCard.points && firstCard.points > 0) {
          priority += 0.5; // Smaller bonus since rank priority already handles K/10/5
        }

        // Small bonus for higher ranks within same category
        const rankValue = this.getRankValue(rank);
        priority += rankValue * 0.05; // Reduced from 0.1 to make rank less dominant
      }

      if (isGuaranteedWin) {
        guaranteedWinners.push({
          combo: comboAnalysis,
          priority,
        });
      }
    });

    if (guaranteedWinners.length === 0) return null;

    // Sort by priority (highest first) and select the best
    guaranteedWinners.sort((a, b) => b.priority - a.priority);
    return guaranteedWinners[0].combo.combo.cards;
  }

  /**
   * Helper to get numeric value for rank comparison
   */
  private getRankValue(rank: Rank): number {
    const rankValues: Record<Rank, number> = {
      [Rank.Ace]: 14,
      [Rank.King]: 13,
      [Rank.Queen]: 12,
      [Rank.Jack]: 11,
      [Rank.Ten]: 10,
      [Rank.Nine]: 9,
      [Rank.Eight]: 8,
      [Rank.Seven]: 7,
      [Rank.Six]: 6,
      [Rank.Five]: 5,
      [Rank.Four]: 4,
      [Rank.Three]: 3,
      [Rank.Two]: 2,
    };
    return rankValues[rank] || 0;
  }
}

/**
 * Factory function to create AI strategy instances
 * Currently returns the sophisticated 4-phase AI implementation
 */
export const createAIStrategy = (): AIStrategy => {
  return new AIStrategyImplementation();
};
