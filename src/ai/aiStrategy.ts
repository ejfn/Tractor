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
  FourthPlayerAnalysis,
  ThirdPlayerAnalysis,
  FirstPlayerAnalysis,
  SecondPlayerAnalysis,
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
      // Phase 3: First Player Leading Strategy Enhancement
      if (context.trickPosition === TrickPosition.First) {
        const firstPlayerStrategy = this.selectFirstPlayerLeadingStrategy(
          validCombos,
          trumpInfo,
          context,
          pointContext,
          gameState,
        );
        if (firstPlayerStrategy) return firstPlayerStrategy;
      }

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
      gameState,
    );
  }

  // === TEAM COORDINATION HANDLER ===
  private handleTeammateWinning(
    comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
    context: GameContext,
    trumpInfo: TrumpInfo,
    gameState: GameState,
  ): Card[] {
    const trickWinner = context.trickWinnerAnalysis!;

    // Single unified path with position-specific analysis
    switch (context.trickPosition) {
      case TrickPosition.Third:
        // 3rd player tactical analysis
        const shouldContributeThird = this.shouldContributePointCards(
          trickWinner,
          comboAnalyses,
          context,
          gameState,
          trumpInfo,
        );

        if (shouldContributeThird) {
          const thirdPlayerAnalysis = this.analyzeThirdPlayerAdvantage(
            comboAnalyses,
            context,
            trumpInfo,
            gameState,
          );

          if (thirdPlayerAnalysis.optimalCombo) {
            return thirdPlayerAnalysis.optimalCombo.cards;
          }
        }
        break;

      case TrickPosition.Fourth:
        // 4th player perfect information analysis
        const shouldContributeFourth = this.shouldContributePointCards(
          trickWinner,
          comboAnalyses,
          context,
          gameState,
          trumpInfo,
        );

        if (shouldContributeFourth) {
          const fourthPlayerAnalysis = this.analyzeFourthPlayerAdvantage(
            comboAnalyses,
            context,
            trumpInfo,
            gameState,
          );

          // Use 4th player perfect information for optimal point contribution
          if (fourthPlayerAnalysis.guaranteedPointCards.length > 0) {
            // Sort by highest point value for maximum contribution
            const sortedByPoints =
              fourthPlayerAnalysis.guaranteedPointCards.sort((a, b) => {
                const aPoints = a.cards.reduce(
                  (total, card) => total + (card.points || 0),
                  0,
                );
                const bPoints = b.cards.reduce(
                  (total, card) => total + (card.points || 0),
                  0,
                );
                return bPoints - aPoints; // Highest points first
              });
            return sortedByPoints[0].cards;
          } else {
            // Use enhanced 4th player contribution with proper 10 > King > 5 priority
            return this.selectPointContribution(
              comboAnalyses,
              trumpInfo,
              context,
              gameState,
            );
          }
        }
        break;

      case TrickPosition.Second:
        // Phase 3: Second Player Strategy Enhancement
        const secondPlayerAnalysis = this.analyzeSecondPlayerStrategy(
          comboAnalyses,
          context,
          trumpInfo,
          gameState,
        );

        if (secondPlayerAnalysis.shouldContribute) {
          return this.selectSecondPlayerContribution(
            comboAnalyses,
            secondPlayerAnalysis,
            trumpInfo,
            context,
          );
        }
        break;

      case TrickPosition.First:
      default:
        // Standard logic for other positions
        const shouldContributeStandard = this.shouldContributePointCards(
          trickWinner,
          comboAnalyses,
          context,
          gameState,
          trumpInfo,
        );

        if (shouldContributeStandard) {
          return this.selectPointContribution(
            comboAnalyses,
            trumpInfo,
            context,
            gameState,
          );
        }
        break;
    }

    // Fallback: Conservative play when not contributing points
    return this.selectLowestValueNonPointCombo(comboAnalyses);
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

    // 🎯 4TH PLAYER ENHANCEMENT: Perfect information point contribution
    if (context.trickPosition === TrickPosition.Fourth) {
      // Last player has perfect information - maximize point contribution when teammate winning
      return true; // Always contribute when teammate winning and we're last
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

    // For low-point tricks, only contribute if it's safe
    if (trickWinner.trickPoints < 15) {
      // If teammate is winning, be conservative unless they have very strong cards
      if (trickWinner.isTeammateWinning) {
        return false; // Don't contribute unless teammate has very strong cards (handled above)
      }
      return true; // Safe to contribute when we can win low-point tricks
    }

    // For high-point tricks or strong teammate leads, be conservative
    return false;
  }

  // === POINT CONTRIBUTION WITH HIERARCHY ===
  private selectPointContribution(
    comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
    trumpInfo: TrumpInfo,
    context?: GameContext,
    gameState?: GameState,
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

          // 🎯 4TH PLAYER ENHANCEMENT: Enhanced priority for last player
          // Priority order: 10s > Kings > 5s (traditional Shengji strategy)
          if (context?.trickPosition === TrickPosition.Fourth) {
            // Last player gets bonus priority for point cards
            if (firstCard.rank === Rank.Ten) {
              priority += 7; // 10s get highest priority
            } else if (firstCard.rank === Rank.King) {
              priority += 6; // Kings get medium priority
            } else if (firstCard.rank === Rank.Five) {
              priority += 5; // 5s get lowest priority
            }
          } else {
            // Original priority for other positions
            if (firstCard.rank === Rank.Ten) {
              priority += 5; // 10s get highest priority for point contribution
            } else if (firstCard.rank === Rank.King) {
              priority += 4; // Kings get medium priority
            } else if (firstCard.rank === Rank.Five) {
              priority += 3; // 5s get lowest priority
            }
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
      // 🎯 4TH PLAYER ENHANCEMENT: Enhanced point card avoidance
      if (context.trickPosition === TrickPosition.Fourth) {
        return this.selectFourthPlayerPointAvoidance(
          comboAnalyses,
          context,
          trumpInfo,
        );
      }
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
    gameState?: GameState,
  ): Card[] {
    // REMOVED ISSUE #104 BAND-AID FIX - Game logic now properly handles mixed combinations

    // Strategic disposal when not contesting trick
    if (context.cardsRemaining <= 3) {
      // Endgame - dispose of least valuable
      const sorted = comboAnalyses.sort(
        (a, b) => a.analysis.conservationValue - b.analysis.conservationValue,
      );
      return sorted[0].combo.cards;
    }

    // 🎯 4TH PLAYER ENHANCEMENT: Perfect information disposal
    if (context.trickPosition === TrickPosition.Fourth && gameState) {
      return this.selectFourthPlayerOptimalDisposal(
        comboAnalyses,
        context,
        gameState,
      );
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

  // === 3RD PLAYER TACTICAL ANALYSIS ===

  /**
   * Analyzes tactical advantages available to the 3rd player when teammate is winning
   * Evaluates takeover opportunities and optimal contribution strategies
   */
  private analyzeThirdPlayerAdvantage(
    comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
    context: GameContext,
    trumpInfo: TrumpInfo,
    gameState: GameState,
  ): ThirdPlayerAnalysis {
    if (context.trickPosition !== TrickPosition.Third) {
      throw new Error(
        "analyzeThirdPlayerAdvantage should only be called for 3rd player (TrickPosition.Third)",
      );
    }

    if (!context.trickWinnerAnalysis?.isTeammateWinning) {
      throw new Error(
        "analyzeThirdPlayerAdvantage should only be called when teammate is winning",
      );
    }

    // Analyze teammate's lead strength directly
    const { currentTrick } = gameState;
    if (!currentTrick) {
      throw new Error(
        "analyzeThirdPlayerAdvantage called with no active trick",
      );
    }

    // Get teammate's winning cards
    const trickWinner = context.trickWinnerAnalysis!;
    const winnerId = trickWinner.currentWinner;
    const winningPlay = currentTrick.plays.find(
      (play) => play.playerId === winnerId,
    );
    const teammateCards = winningPlay?.cards || currentTrick.leadingCombo || [];

    if (teammateCards.length === 0) {
      throw new Error("No cards found for winning teammate");
    }

    const leadingCard = teammateCards[0];
    const vulnerabilityFactors: string[] = [];
    let leadStrength: "weak" | "moderate" | "strong" = "moderate";

    // Analyze trump vs non-trump
    const isTeammateTrump = isTrump(leadingCard, gameState.trumpInfo);

    if (!isTeammateTrump) {
      vulnerabilityFactors.push("non-trump-lead");
      if (leadingCard.rank === Rank.Ace) {
        leadStrength = "moderate";
      } else if (
        leadingCard.rank === Rank.King ||
        leadingCard.rank === Rank.Queen
      ) {
        leadStrength = "weak";
        vulnerabilityFactors.push("vulnerable-to-higher-cards");
      } else {
        leadStrength = "weak";
        vulnerabilityFactors.push("low-card-lead");
      }
    } else {
      // Trump analysis
      if (leadingCard.joker === "Big") {
        leadStrength = "strong";
      } else if (leadingCard.joker === "Small") {
        leadStrength = "strong";
        vulnerabilityFactors.push("beatable-by-big-joker");
      } else if (
        leadingCard.rank === gameState.trumpInfo.trumpRank &&
        leadingCard.suit === gameState.trumpInfo.trumpSuit
      ) {
        leadStrength = "strong";
        vulnerabilityFactors.push("beatable-by-jokers");
      } else {
        leadStrength = "moderate";
        vulnerabilityFactors.push("beatable-by-higher-trump");
      }
    }

    // Combination type analysis
    const comboType =
      teammateCards.length === 1
        ? "single"
        : teammateCards.length === 2
          ? "pair"
          : "tractor";

    if (comboType === "pair" || comboType === "tractor") {
      // Pairs and tractors are harder to beat
      if (leadStrength === "weak") leadStrength = "moderate";
      else if (leadStrength === "moderate") leadStrength = "strong";
    } else {
      vulnerabilityFactors.push("single-card-vulnerable");
    }

    // 4th player threat assessment (simplified)
    const isVulnerableToFourthPlayer =
      !isTeammateTrump || leadStrength !== "strong";
    if (isVulnerableToFourthPlayer) {
      vulnerabilityFactors.push("fourth-player-threat");
      // Downgrade strength if vulnerable
      if (leadStrength === "strong") leadStrength = "moderate";
      else if (leadStrength === "moderate") leadStrength = "weak";
    }

    // Calculate point potential
    const currentTrickPoints = currentTrick.points || 0;
    const pointMaximizationPotential = currentTrickPoints + 10; // Simplified estimation

    // Determine strategy based on analysis
    let takeoverRecommendation: "support" | "takeover" | "strategic";
    let pointContributionStrategy: "enhanced" | "strategic" | "conservative";

    const shouldTakeover =
      leadStrength === "weak" &&
      isVulnerableToFourthPlayer &&
      pointMaximizationPotential > 15;

    if (shouldTakeover) {
      takeoverRecommendation = "takeover";
      pointContributionStrategy = "enhanced";
    } else if (leadStrength === "strong") {
      takeoverRecommendation = "support";
      pointContributionStrategy = "enhanced";
    } else {
      takeoverRecommendation = "strategic";
      pointContributionStrategy = "strategic";
    }

    // Find optimal combo for the situation
    const optimalCombo = this.selectOptimalThirdPlayerCombo(
      comboAnalyses,
      takeoverRecommendation,
      pointContributionStrategy,
      trumpInfo,
      context,
    );

    // Calculate risk assessment
    const riskAssessment = this.calculateThirdPlayerRisk(
      leadStrength,
      isVulnerableToFourthPlayer,
      takeoverRecommendation,
      context,
    );

    // Determine if 3rd position provides tactical advantage
    // Only be aggressive when we have a strong reason to override conservative play
    const tacticalAdvantage =
      (isVulnerableToFourthPlayer && leadStrength === "strong") || // Only protect strong leads aggressively
      pointMaximizationPotential > 20 || // Very high point potential
      context.pointPressure === PointPressure.HIGH; // High pressure situations

    return {
      teammateLeadStrength: leadStrength,
      takeoverRecommendation,
      pointContributionStrategy,
      vulnerabilityFactors,
      riskAssessment,
      pointMaximizationPotential,
      optimalCombo,
      tacticalAdvantage,
    };
  }

  /**
   * Selects optimal combo for 3rd player based on tactical analysis
   */
  private selectOptimalThirdPlayerCombo(
    comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
    takeoverRecommendation: "support" | "takeover" | "strategic",
    pointContributionStrategy: "enhanced" | "strategic" | "conservative",
    trumpInfo: TrumpInfo,
    context: GameContext,
  ): Combo | null {
    if (comboAnalyses.length === 0) return null;

    switch (takeoverRecommendation) {
      case "takeover":
        // Find combos that can beat current trick
        const winningCombos = comboAnalyses.filter((ca) => {
          // Simplified check - would use evaluateTrickPlay in real implementation
          return (
            ca.analysis.strength >= ComboStrength.Medium && ca.analysis.isTrump
          );
        });
        if (winningCombos.length > 0) {
          // Select most efficient takeover combo
          const sorted = winningCombos.sort(
            (a, b) =>
              b.analysis.pointValue * 2 +
              b.combo.value -
              (a.analysis.pointValue * 2 + a.combo.value),
          );
          return sorted[0].combo;
        }
        // Fallback to support if no takeover possible
        break;

      case "support":
        // Contribute points aggressively - use enhanced strategy
        const pointContributions = comboAnalyses.filter((ca) =>
          ca.combo.cards.some((card) => card.points > 0),
        );
        if (pointContributions.length > 0) {
          // Sort by traditional Shengji priority: 10 > King > 5
          const sorted = pointContributions.sort((a, b) => {
            const aCard = a.combo.cards[0];
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

            // Same rank priority - prefer higher point value
            const aPoints = a.combo.cards.reduce(
              (total, card) => total + (card.points || 0),
              0,
            );
            const bPoints = b.combo.cards.reduce(
              (total, card) => total + (card.points || 0),
              0,
            );
            return bPoints - aPoints;
          });
          return sorted[0].combo;
        }
        break;

      case "strategic":
        // Balanced approach - use same prioritization as support case
        const strategicContributions = comboAnalyses.filter((ca) =>
          ca.combo.cards.some((card) => card.points > 0),
        );
        if (strategicContributions.length > 0) {
          // Use same priority system as support case: 10 > King > 5
          const sorted = strategicContributions.sort((a, b) => {
            const aCard = a.combo.cards[0];
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

            // Same rank priority - prefer higher point value
            const aPoints = a.combo.cards.reduce(
              (total, card) => total + (card.points || 0),
              0,
            );
            const bPoints = b.combo.cards.reduce(
              (total, card) => total + (card.points || 0),
              0,
            );
            return bPoints - aPoints;
          });
          return sorted[0].combo;
        }
        break;
    }

    // Default fallback - get a valid combo for the analysis to return
    const fallbackCombo = this.selectPointContributionCombo(
      comboAnalyses,
      trumpInfo,
      context,
    );
    return fallbackCombo;
  }

  /**
   * Helper method to select point contribution combo and return Combo object
   */
  private selectPointContributionCombo(
    comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
    trumpInfo: TrumpInfo,
    context: GameContext,
  ): Combo | null {
    if (comboAnalyses.length === 0) return null;

    // Use existing point contribution logic but return the combo instead of cards
    const pointCardCombos = comboAnalyses.filter((ca) =>
      ca.combo.cards.some((card) => card.points > 0),
    );

    if (pointCardCombos.length > 0) {
      // Sort by traditional point card hierarchy: 10 > King > 5
      const sorted = pointCardCombos.sort((a, b) => {
        const aCard = a.combo.cards[0];
        const bCard = b.combo.cards[0];

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

        return b.analysis.pointValue - a.analysis.pointValue;
      });

      return sorted[0].combo;
    }

    // Fallback to lowest value combo if no point cards available
    const sorted = comboAnalyses.sort((a, b) => a.combo.value - b.combo.value);
    return sorted[0].combo;
  }

  /**
   * Calculates risk assessment for 3rd player tactical decisions
   */
  private calculateThirdPlayerRisk(
    leadStrength: "weak" | "moderate" | "strong",
    isVulnerableToFourthPlayer: boolean,
    takeoverRecommendation: "support" | "takeover" | "strategic",
    context: GameContext,
  ): number {
    let risk = 0.3; // Base risk level

    // Increase risk for takeover attempts
    if (takeoverRecommendation === "takeover") {
      risk += 0.3;
    }

    // Adjust based on teammate lead strength
    switch (leadStrength) {
      case "strong":
        risk -= 0.1; // Lower risk with strong teammate
        break;
      case "weak":
        risk += 0.2; // Higher risk with weak teammate
        break;
    }

    // Adjust based on 4th player vulnerability
    if (isVulnerableToFourthPlayer) {
      risk -= 0.1; // Lower risk when protecting from 4th player
    }

    // Adjust based on game pressure
    if (context.pointPressure === PointPressure.HIGH) {
      risk -= 0.1; // Lower risk tolerance in high pressure
    }

    return Math.max(0, Math.min(1, risk));
  }

  // === 4TH PLAYER PERFECT INFORMATION ANALYSIS ===

  /**
   * Analyzes perfect information advantages available to the 4th (last) player
   * Leverages complete visibility of all played cards for optimal decision making
   */
  private analyzeFourthPlayerAdvantage(
    comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
    context: GameContext,
    trumpInfo: TrumpInfo,
    gameState: GameState,
  ): FourthPlayerAnalysis {
    if (context.trickPosition !== TrickPosition.Fourth) {
      throw new Error(
        "analyzeFourthPlayerAdvantage should only be called for 4th player (TrickPosition.Fourth)",
      );
    }

    const cardMemory = context.memoryContext?.cardMemory;
    const trickWinner = context.trickWinnerAnalysis;

    // Analyze certain win cards using memory system
    const certainWinCards: Combo[] = [];
    const guaranteedPointCards: Combo[] = [];

    for (const { combo } of comboAnalyses) {
      const firstCard = combo.cards[0];
      const comboType =
        combo.cards.length === 1
          ? "single"
          : combo.cards.length === 2
            ? "pair"
            : "tractor";

      // Use existing memory system to identify guaranteed winners
      if (
        cardMemory &&
        firstCard.suit &&
        firstCard.rank &&
        (comboType === "single" || comboType === "pair") &&
        isBiggestRemainingInSuit(
          cardMemory,
          firstCard.suit,
          firstCard.rank,
          comboType,
        )
      ) {
        certainWinCards.push(combo);

        // Track point cards that are guaranteed winners
        if (combo.cards.some((card) => (card.points || 0) > 0)) {
          guaranteedPointCards.push(combo);
        }
      }
    }

    // Calculate point maximization potential
    const currentTrickPoints =
      gameState.currentTrick?.plays.reduce(
        (total, play) =>
          total +
          play.cards.reduce(
            (cardTotal, card) => cardTotal + (card.points || 0),
            0,
          ),
        0,
      ) || 0;

    const maxPossiblePoints = Math.max(
      ...comboAnalyses.map((ca) =>
        ca.combo.cards.reduce((total, card) => total + (card.points || 0), 0),
      ),
    );

    const pointMaximizationPotential = currentTrickPoints + maxPossiblePoints;

    // Determine optimal strategy based on trick winner and perfect information
    let optimalContributionStrategy: "maximize" | "conserve" | "beat";

    if (trickWinner?.isTeammateWinning) {
      // Teammate winning - maximize point contribution with guaranteed winners
      optimalContributionStrategy =
        guaranteedPointCards.length > 0 ? "maximize" : "conserve";
    } else if (trickWinner?.isOpponentWinning) {
      // Opponent winning - try to beat if possible, otherwise minimize points
      optimalContributionStrategy = trickWinner.canBeatCurrentWinner
        ? "beat"
        : "conserve";
    } else {
      // No clear winner - use memory-informed decision
      optimalContributionStrategy =
        certainWinCards.length > 0 ? "beat" : "conserve";
    }

    return {
      certainWinCards,
      pointMaximizationPotential,
      optimalContributionStrategy,
      teammateSupportOpportunity: Boolean(
        trickWinner?.isTeammateWinning && guaranteedPointCards.length > 0,
      ),
      guaranteedPointCards,
      perfectInformationAdvantage: certainWinCards.length > 0,
    };
  }

  /**
   * Optimal disposal for 4th player using perfect information
   * Leverages complete visibility of all played cards for strategic decision making
   */
  private selectFourthPlayerOptimalDisposal(
    comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
    context: GameContext,
    gameState: GameState,
  ): Card[] {
    const trickWinner = context.trickWinnerAnalysis;
    const trumpInfo = gameState.trumpInfo;

    // Get 4th player perfect information analysis
    const analysis = this.analyzeFourthPlayerAdvantage(
      comboAnalyses,
      context,
      trumpInfo,
      gameState,
    );

    // Strategy 1: If teammate is winning and we have guaranteed point cards, contribute them
    if (
      trickWinner?.isTeammateWinning &&
      analysis.guaranteedPointCards.length > 0
    ) {
      // Prioritize highest point value guaranteed winners
      const sortedByPoints = analysis.guaranteedPointCards.sort((a, b) => {
        const aPoints = a.cards.reduce(
          (total, card) => total + (card.points || 0),
          0,
        );
        const bPoints = b.cards.reduce(
          (total, card) => total + (card.points || 0),
          0,
        );
        return bPoints - aPoints; // Descending order
      });
      return sortedByPoints[0].cards;
    }

    // Strategy 2: If opponent is winning, minimize point contribution using perfect information
    if (trickWinner?.isOpponentWinning) {
      return this.selectFourthPlayerPointAvoidance(
        comboAnalyses,
        context,
        trumpInfo,
      );
    }

    // Strategy 3: If we can win with guaranteed cards, use strategic winning
    if (
      analysis.perfectInformationAdvantage &&
      analysis.certainWinCards.length > 0
    ) {
      // Among certain win cards, prefer non-point cards to conserve points for later
      const nonPointWinners = analysis.certainWinCards.filter(
        (combo) => !combo.cards.some((card) => (card.points || 0) > 0),
      );

      if (nonPointWinners.length > 0) {
        // Use lowest value non-point winner
        const sorted = nonPointWinners.sort((a, b) => a.value - b.value);
        return sorted[0].cards;
      }

      // If only point card winners available, use lowest point winner
      const sorted = analysis.certainWinCards.sort((a, b) => a.value - b.value);
      return sorted[0].cards;
    }

    // Strategy 4: Default to enhanced disposal with perfect information context
    // Prefer cards that won't be needed later based on perfect information
    const enhancedDisposal = this.selectEnhancedDisposalWithPerfectInfo(
      comboAnalyses,
      context,
      gameState,
    );
    if (enhancedDisposal) {
      return enhancedDisposal;
    }

    // Fallback to standard disposal logic
    return this.selectLowestValueNonPointCombo(comboAnalyses);
  }

  /**
   * Enhanced point card avoidance for 4th player when opponent is winning
   */
  private selectFourthPlayerPointAvoidance(
    comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
    context: GameContext,
    trumpInfo: TrumpInfo,
  ): Card[] {
    // Priority 1: Non-trump, non-point, non-Ace cards (safest disposal)
    const safeCards = comboAnalyses.filter(
      (ca) =>
        !ca.analysis.isTrump &&
        !ca.combo.cards.some((card) => (card.points || 0) > 0) &&
        !ca.combo.cards.some((card) => card.rank === Rank.Ace),
    );

    if (safeCards.length > 0) {
      const sorted = safeCards.sort((a, b) => a.combo.value - b.combo.value);
      return sorted[0].combo.cards;
    }

    // Priority 2: Non-trump, non-point cards (lose Ace but avoid giving points)
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

    // Priority 3: Non-trump cards (avoid giving away trump)
    const nonTrump = comboAnalyses.filter((ca) => !ca.analysis.isTrump);
    if (nonTrump.length > 0) {
      // Among non-trump, prefer lowest point cards
      const sorted = nonTrump.sort((a, b) => {
        const aPoints = a.combo.cards.reduce(
          (total, card) => total + (card.points || 0),
          0,
        );
        const bPoints = b.combo.cards.reduce(
          (total, card) => total + (card.points || 0),
          0,
        );
        if (aPoints !== bPoints) return aPoints - bPoints; // Prefer lower points
        return a.combo.value - b.combo.value; // Then by card value
      });
      return sorted[0].combo.cards;
    }

    // Last resort: Use weakest trump (only when no non-trump available)
    const sorted = comboAnalyses.sort(
      (a, b) => a.analysis.conservationValue - b.analysis.conservationValue,
    );
    return sorted[0].combo.cards;
  }

  /**
   * Enhanced disposal using perfect information about remaining cards
   */
  private selectEnhancedDisposalWithPerfectInfo(
    comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
    context: GameContext,
    gameState: GameState,
  ): Card[] | null {
    const cardMemory = context.memoryContext?.cardMemory;
    if (!cardMemory) return null;

    // Look for cards that are guaranteed to not be useful later
    // (i.e., all higher cards of the same suit have been played)
    const futureUselessCards = comboAnalyses.filter((ca) => {
      const firstCard = ca.combo.cards[0];
      if (!firstCard.suit || !firstCard.rank) return false;

      const comboType =
        ca.combo.cards.length === 1
          ? "single"
          : ca.combo.cards.length === 2
            ? "pair"
            : "tractor";

      // Skip tractors for memory analysis
      if (comboType === "tractor") return false;

      // Check if this card will never be the biggest remaining in its suit
      return !isBiggestRemainingInSuit(
        cardMemory,
        firstCard.suit,
        firstCard.rank,
        comboType,
      );
    });

    if (futureUselessCards.length > 0) {
      // Among future useless cards, prefer non-point cards
      const nonPointUseless = futureUselessCards.filter(
        (ca) => !ca.combo.cards.some((card) => (card.points || 0) > 0),
      );

      if (nonPointUseless.length > 0) {
        const sorted = nonPointUseless.sort(
          (a, b) => a.combo.value - b.combo.value,
        );
        return sorted[0].combo.cards;
      }

      // If only point cards are useless, use lowest point value
      const sorted = futureUselessCards.sort(
        (a, b) => a.combo.value - b.combo.value,
      );
      return sorted[0].combo.cards;
    }

    return null; // No perfect information advantage found
  }

  // === 3RD PLAYER TACTICAL ANALYSIS (CONSOLIDATED) ===
  // Note: Tactical analysis functionality has been consolidated into
  // analyzeThirdPlayerAdvantage() method to reduce code duplication

  // REMOVED: tryCreateTwoSinglesInsteadOfPair method - no longer needed with proper game logic fix

  private selectLowestValueNonPointCombo(
    comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
  ): Card[] {
    // REMOVED ISSUE #104 BAND-AID FIX - Game logic now properly handles mixed combinations

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
          trumpInfo,
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
          trumpInfo,
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
          trumpInfo,
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
          trumpInfo,
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
    trumpInfo?: TrumpInfo,
  ): Card[] {
    // Filter by preferred strengths
    const preferred = comboAnalyses.filter((ca) =>
      preferredStrengths.includes(ca.analysis.strength),
    );

    if (preferred.length > 0) {
      // TRUMP LEADING PROTECTION: Avoid trump suit high cards (A, K, 10) when leading
      // This prevents wasteful leading with valuable trump cards that opponents might beat
      let safePreferred = preferred;

      if (trumpInfo?.trumpSuit) {
        safePreferred = preferred.filter((ca) => {
          const combo = ca.combo;

          // Check if this combo contains trump suit high cards (Ace, King, or 10)
          const hasTrumpSuitHighCard = combo.cards.some((card) => {
            if (!card.suit || card.joker) return false; // Skip jokers

            // Check if card is trump suit AND high-value (A, K, 10)
            const isTrumpSuit = card.suit === trumpInfo.trumpSuit;
            const isHighCard =
              card.rank === Rank.Ace ||
              card.rank === Rank.King ||
              card.rank === Rank.Ten;

            return isTrumpSuit && isHighCard;
          });

          return !hasTrumpSuitHighCard; // Exclude combos with trump suit high cards
        });
      }

      // Use safe options if available, otherwise prioritize non-trump over trump suit high cards
      let filteredOptions =
        safePreferred.length > 0 ? safePreferred : preferred;

      // If no safe preferred options and trump protection is needed, expand to all combos and avoid trump suit high cards
      if (safePreferred.length === 0 && trumpInfo?.trumpSuit) {
        // Filter ALL combos to avoid trump suit high cards, regardless of strength
        const allSafeOptions = comboAnalyses.filter((ca) => {
          const combo = ca.combo;
          const hasTrumpSuitHighCard = combo.cards.some((card) => {
            if (!card.suit || card.joker) return false;
            const isTrumpSuit = card.suit === trumpInfo.trumpSuit;
            const isHighCard =
              card.rank === Rank.Ace ||
              card.rank === Rank.King ||
              card.rank === Rank.Ten;
            return isTrumpSuit && isHighCard;
          });
          return !hasTrumpSuitHighCard;
        });

        // Use non-trump suit high card alternatives if available
        if (allSafeOptions.length > 0) {
          filteredOptions = allSafeOptions;
        }
      }

      // Sort by trump preference and value
      const sorted = filteredOptions.sort((a, b) => {
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
      return this.selectByStrength(
        comboAnalyses,
        [ComboStrength.Strong],
        true,
        trumpInfo,
      );
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
        trumpInfo,
      );
    } else {
      // Weak opponents - use minimal strength to win
      return this.selectByStrength(
        comboAnalyses,
        [ComboStrength.Medium, ComboStrength.Weak],
        false,
        trumpInfo,
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
    return this.selectByStrength(
      comboAnalyses,
      [ComboStrength.Medium],
      true,
      trumpInfo,
    );
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
        trumpInfo,
      );
    } else {
      // Weak opponents - moderate disruption sufficient
      return this.selectByStrength(
        comboAnalyses,
        [ComboStrength.Medium, ComboStrength.Strong],
        false,
        trumpInfo,
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
        return this.selectByStrength(
          nonTrump,
          [ComboStrength.Strong],
          false,
          trumpInfo,
        );
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
        trumpInfo,
      );
    } else {
      // Lower confidence - conservative defense
      return this.selectByStrength(
        comboAnalyses,
        [ComboStrength.Medium, ComboStrength.Weak],
        false,
        trumpInfo,
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

  // Phase 3: 1st Player (Leading) Strategy Enhancement
  private selectFirstPlayerLeadingStrategy(
    validCombos: Combo[],
    trumpInfo: TrumpInfo,
    context: GameContext,
    pointContext: PointFocusedContext,
    gameState: GameState,
  ): Card[] | null {
    // Analyze current game phase and leading strategy
    const analysis = this.analyzeFirstPlayerStrategy(
      validCombos,
      trumpInfo,
      context,
      pointContext,
      gameState,
    );

    if (!analysis.optimalLeadingCombo) {
      return null; // No dedicated first player strategy applies
    }

    // Apply game phase specific leading logic
    switch (analysis.gamePhaseStrategy) {
      case "probe":
        return this.selectProbeLeadingPlay(validCombos, trumpInfo, analysis);
      case "aggressive":
        return this.selectAggressiveLeadingPlay(
          validCombos,
          trumpInfo,
          analysis,
        );
      case "control":
        return this.selectControlLeadingPlay(validCombos, trumpInfo, analysis);
      case "endgame":
        return this.selectEndgameLeadingPlay(validCombos, trumpInfo, analysis);
      default:
        return analysis.optimalLeadingCombo.cards;
    }
  }

  private analyzeFirstPlayerStrategy(
    validCombos: Combo[],
    trumpInfo: TrumpInfo,
    context: GameContext,
    pointContext: PointFocusedContext,
    gameState: GameState,
  ): FirstPlayerAnalysis {
    // Determine game phase strategy based on context
    let gamePhaseStrategy: "probe" | "aggressive" | "control" | "endgame";

    if (context.cardsRemaining > 20) {
      gamePhaseStrategy = "probe"; // Early game - gather information
    } else if (context.pointPressure === PointPressure.HIGH) {
      gamePhaseStrategy = "aggressive"; // High pressure - force points
    } else if (context.cardsRemaining <= 8) {
      gamePhaseStrategy = "endgame"; // Late game - precise control
    } else {
      gamePhaseStrategy = "control"; // Mid game - strategic control
    }

    // Calculate information gathering focus
    const informationGatheringFocus =
      gamePhaseStrategy === "probe"
        ? 0.9
        : gamePhaseStrategy === "aggressive"
          ? 0.3
          : gamePhaseStrategy === "control"
            ? 0.6
            : 0.8;

    // Calculate hand reveal minimization
    const handRevealMinimization =
      gamePhaseStrategy === "probe"
        ? 0.8
        : gamePhaseStrategy === "aggressive"
          ? 0.2
          : gamePhaseStrategy === "control"
            ? 0.6
            : 0.4;

    // Find optimal leading combo based on strategy
    const optimalLeadingCombo = this.selectOptimalLeadingComboForPhase(
      validCombos,
      trumpInfo,
      gamePhaseStrategy,
      context,
    );

    // Determine strategic depth
    const strategicDepth: "shallow" | "medium" | "deep" = context.memoryContext
      ? "deep"
      : context.pointPressure === PointPressure.HIGH
        ? "medium"
        : "shallow";

    return {
      gamePhaseStrategy,
      informationGatheringFocus,
      handRevealMinimization,
      optimalLeadingCombo,
      strategicDepth,
      trumpConservationPriority: gamePhaseStrategy === "probe" ? 0.9 : 0.6,
      opponentProbeValue: informationGatheringFocus,
      teamCoordinationSetup: gamePhaseStrategy === "control",
    };
  }

  private selectOptimalLeadingComboForPhase(
    validCombos: Combo[],
    trumpInfo: TrumpInfo,
    gamePhaseStrategy: "probe" | "aggressive" | "control" | "endgame",
    context: GameContext,
  ): Combo | null {
    if (validCombos.length === 0) return null;

    // Filter combos based on game phase strategy
    let candidates: Combo[];

    switch (gamePhaseStrategy) {
      case "probe":
        // Prefer safe, non-revealing leads
        candidates = validCombos.filter(
          (combo) =>
            !combo.cards.some((card) => isTrump(card, trumpInfo)) &&
            combo.cards.every((card) => (card.points || 0) === 0),
        );
        break;

      case "aggressive":
        // Prefer strong, point-collecting leads
        candidates = validCombos.filter(
          (combo) =>
            combo.cards.some((card) => (card.points || 0) > 0) ||
            combo.cards.some((card) => isTrump(card, trumpInfo)),
        );
        break;

      case "control":
        // Prefer strategic, combination-rich leads
        candidates = validCombos.filter(
          (combo) =>
            combo.type === ComboType.Tractor || combo.type === ComboType.Pair,
        );
        break;

      case "endgame":
        // Prefer highest value available
        candidates = validCombos;
        break;

      default:
        candidates = validCombos;
    }

    // Fall back to all combos if no phase-specific candidates
    if (candidates.length === 0) {
      candidates = validCombos;
    }

    // Select best combo from candidates based on value and strategy
    return candidates.reduce(
      (best, combo) => {
        const comboValue = this.calculateLeadingComboValue(
          combo,
          trumpInfo,
          gamePhaseStrategy,
        );
        const bestValue = best
          ? this.calculateLeadingComboValue(best, trumpInfo, gamePhaseStrategy)
          : 0;

        return comboValue > bestValue ? combo : best;
      },
      null as Combo | null,
    );
  }

  private calculateLeadingComboValue(
    combo: Combo,
    trumpInfo: TrumpInfo,
    gamePhaseStrategy: "probe" | "aggressive" | "control" | "endgame",
  ): number {
    let value = 0;

    // Base value from combo type
    switch (combo.type) {
      case ComboType.Tractor:
        value += 30;
        break;
      case ComboType.Pair:
        value += 20;
        break;
      case ComboType.Single:
        value += 10;
        break;
    }

    // Add card strength value
    const cardStrength = combo.cards.reduce((sum, card) => {
      if (isTrump(card, trumpInfo)) {
        return sum + 15; // Trump cards are valuable
      }
      const rankValue = card.rank ? this.getRankValue(card.rank) : 0;
      return sum + Math.min(rankValue, 10); // Non-trump card rank value
    }, 0);

    value += cardStrength;

    // Phase-specific adjustments
    switch (gamePhaseStrategy) {
      case "probe":
        // Penalty for revealing strong cards early
        if (combo.cards.some((card) => isTrump(card, trumpInfo))) {
          value -= 20;
        }
        break;

      case "aggressive":
        // Bonus for point cards and strong combinations
        const points = combo.cards.reduce(
          (sum, card) => sum + (card.points || 0),
          0,
        );
        value += points * 2;
        break;

      case "control":
        // Bonus for tactical combinations
        if (combo.type === ComboType.Tractor) {
          value += 15;
        }
        if (combo.type === ComboType.Pair) {
          value += 10;
        }
        break;

      case "endgame":
        // Maximize total value
        const totalValue = combo.cards.reduce(
          (sum, card) =>
            sum +
            (card.points || 0) +
            (isTrump(card, trumpInfo)
              ? 10
              : card.rank
                ? this.getRankValue(card.rank)
                : 0),
          0,
        );
        value += totalValue;
        break;
    }

    return value;
  }

  private selectProbeLeadingPlay(
    validCombos: Combo[],
    trumpInfo: TrumpInfo,
    analysis: FirstPlayerAnalysis,
  ): Card[] | null {
    // Probe strategy: Lead safe, non-revealing cards to gather information
    const safeCombos = validCombos.filter(
      (combo) =>
        !combo.cards.some((card) => isTrump(card, trumpInfo)) &&
        combo.cards.every((card) => (card.points || 0) === 0) &&
        combo.cards.every(
          (card) => (card.rank ? this.getRankValue(card.rank) : 0) <= 9,
        ), // Avoid high cards
    );

    if (safeCombos.length > 0) {
      return safeCombos[0].cards;
    }

    return analysis.optimalLeadingCombo?.cards || null;
  }

  private selectAggressiveLeadingPlay(
    validCombos: Combo[],
    trumpInfo: TrumpInfo,
    analysis: FirstPlayerAnalysis,
  ): Card[] | null {
    // Aggressive strategy: Lead strong combinations to force early pressure
    const strongCombos = validCombos.filter(
      (combo) =>
        combo.cards.some((card) => (card.points || 0) > 0) ||
        combo.type === ComboType.Tractor ||
        combo.type === ComboType.Pair,
    );

    if (strongCombos.length > 0) {
      // Select combo with highest point value or strongest combination
      const bestCombo = strongCombos.reduce((best, combo) => {
        const comboPoints = combo.cards.reduce(
          (sum, card) => sum + (card.points || 0),
          0,
        );
        const bestPoints = best.cards.reduce(
          (sum, card) => sum + (card.points || 0),
          0,
        );

        if (comboPoints > bestPoints) return combo;
        if (comboPoints === bestPoints && combo.type > best.type) return combo;
        return best;
      });

      return bestCombo.cards;
    }

    return analysis.optimalLeadingCombo?.cards || null;
  }

  private selectControlLeadingPlay(
    validCombos: Combo[],
    trumpInfo: TrumpInfo,
    analysis: FirstPlayerAnalysis,
  ): Card[] | null {
    // Control strategy: Lead tactical combinations that set up good team positioning
    const tacticalCombos = validCombos.filter(
      (combo) =>
        combo.type === ComboType.Tractor || combo.type === ComboType.Pair,
    );

    if (tacticalCombos.length > 0) {
      // Prefer tractors over pairs for better control
      const tractors = tacticalCombos.filter(
        (combo) => combo.type === ComboType.Tractor,
      );
      if (tractors.length > 0) {
        return tractors[0].cards;
      }
      return tacticalCombos[0].cards;
    }

    return analysis.optimalLeadingCombo?.cards || null;
  }

  private selectEndgameLeadingPlay(
    validCombos: Combo[],
    trumpInfo: TrumpInfo,
    analysis: FirstPlayerAnalysis,
  ): Card[] | null {
    // Endgame strategy: Lead highest value combinations for maximum points
    const bestCombo = validCombos.reduce((best, combo) => {
      const comboValue = combo.cards.reduce((sum, card) => {
        let value = card.points || 0;
        if (isTrump(card, trumpInfo)) value += 10;
        value += Math.min(card.rank ? this.getRankValue(card.rank) : 0, 10);
        return sum + value;
      }, 0);

      const bestValue = best.cards.reduce((sum, card) => {
        let value = card.points || 0;
        if (isTrump(card, trumpInfo)) value += 10;
        value += Math.min(card.rank ? this.getRankValue(card.rank) : 0, 10);
        return sum + value;
      }, 0);

      return comboValue > bestValue ? combo : best;
    });

    return bestCombo.cards;
  }

  // Phase 3: 2nd Player Strategy Enhancement
  private analyzeSecondPlayerStrategy(
    comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
    context: GameContext,
    trumpInfo: TrumpInfo,
    gameState: GameState,
  ): SecondPlayerAnalysis {
    const leadingPlayer = gameState.currentTrick?.leadingPlayerId;
    const leadingCombo = gameState.currentTrick?.leadingCombo;

    if (!leadingPlayer || !leadingCombo) {
      // Fallback analysis if no trick context
      return {
        leaderRelationship: "opponent",
        leaderStrength: "moderate",
        responseStrategy: "setup",
        informationAdvantage: 0.5,
        optimalCombo: comboAnalyses.length > 0 ? comboAnalyses[0].combo : null,
        setupOpportunity: false,
        blockingPotential: 0.5,
        coordinationValue: 0.5,
        shouldContribute: false,
      };
    }

    // Determine relationship to leader
    const leaderRelationship = this.isTeammate(leadingPlayer, context)
      ? "teammate"
      : "opponent";

    // Analyze leader's play strength
    const leaderStrength = this.assessLeaderStrength(leadingCombo, trumpInfo);

    // Determine response strategy based on relationship and strength
    let responseStrategy: "support" | "pressure" | "block" | "setup";
    let shouldContribute = false;

    if (leaderRelationship === "teammate") {
      if (leaderStrength === "strong") {
        responseStrategy = "support";
        shouldContribute = true;
      } else if (leaderStrength === "moderate") {
        responseStrategy = "setup"; // Set up for 3rd/4th players
        shouldContribute = false;
      } else {
        responseStrategy = "pressure"; // Put pressure to help weak teammate
        shouldContribute = false;
      }
    } else {
      if (leaderStrength === "strong") {
        responseStrategy = "block"; // Try to block strong opponent
        shouldContribute = false;
      } else {
        responseStrategy = "setup"; // Set up good positioning
        shouldContribute = false;
      }
    }

    // Calculate information advantage from seeing leader's play
    const informationAdvantage = leaderRelationship === "opponent" ? 0.8 : 0.6;

    // Find optimal combo based on strategy
    const optimalCombo = this.selectOptimalSecondPlayerCombo(
      comboAnalyses,
      responseStrategy,
      trumpInfo,
    );

    return {
      leaderRelationship,
      leaderStrength,
      responseStrategy,
      informationAdvantage,
      optimalCombo,
      setupOpportunity: responseStrategy === "setup",
      blockingPotential: leaderRelationship === "opponent" ? 0.7 : 0.3,
      coordinationValue: responseStrategy === "setup" ? 0.8 : 0.5,
      shouldContribute,
    };
  }

  private assessLeaderStrength(
    leadingCombo: Card[],
    trumpInfo: TrumpInfo,
  ): "weak" | "moderate" | "strong" {
    const hasTrump = leadingCombo.some((card) => isTrump(card, trumpInfo));
    const hasPoints = leadingCombo.some((card) => (card.points || 0) > 0);
    const isHighCard = leadingCombo.some(
      (card) => (card.rank ? this.getRankValue(card.rank) : 0) >= 11,
    ); // Jack or higher
    const isMultiCard = leadingCombo.length > 1;

    // Strong: Trump cards, high cards, or combinations
    if (hasTrump || (isHighCard && isMultiCard)) {
      return "strong";
    }

    // Moderate: Point cards or single high cards
    if (hasPoints || isHighCard) {
      return "moderate";
    }

    // Weak: Low cards without special properties
    return "weak";
  }

  private selectOptimalSecondPlayerCombo(
    comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
    responseStrategy: "support" | "pressure" | "block" | "setup",
    trumpInfo: TrumpInfo,
  ): Combo | null {
    if (comboAnalyses.length === 0) return null;

    let filteredCombos: { combo: Combo; analysis: ComboAnalysis }[];

    switch (responseStrategy) {
      case "support":
        // Support: Play point cards or strong combinations
        filteredCombos = comboAnalyses.filter(
          ({ combo, analysis }) =>
            analysis.hasPoints || analysis.strength === ComboStrength.Strong,
        );
        break;

      case "pressure":
        // Pressure: Play moderate strength to put pressure on trick
        filteredCombos = comboAnalyses.filter(
          ({ combo, analysis }) =>
            analysis.strength === ComboStrength.Medium ||
            analysis.strength === ComboStrength.Strong,
        );
        break;

      case "block":
        // Block: Play defensively, avoid giving points
        filteredCombos = comboAnalyses.filter(
          ({ combo, analysis }) =>
            !analysis.hasPoints && analysis.strength !== ComboStrength.Critical,
        );
        break;

      case "setup":
        // Setup: Play strategically to set up good positions for 3rd/4th players
        filteredCombos = comboAnalyses.filter(
          ({ combo, analysis }) =>
            analysis.strength === ComboStrength.Medium ||
            combo.type === ComboType.Pair ||
            combo.type === ComboType.Tractor,
        );
        break;

      default:
        filteredCombos = comboAnalyses;
    }

    // Fall back to all combos if no strategy-specific options
    if (filteredCombos.length === 0) {
      filteredCombos = comboAnalyses;
    }

    // Select best combo based on strategy and value
    return filteredCombos.reduce((best, current) => {
      if (!best) return current;

      const currentValue = this.calculateSecondPlayerComboValue(
        current,
        responseStrategy,
      );
      const bestValue = this.calculateSecondPlayerComboValue(
        best,
        responseStrategy,
      );

      return currentValue > bestValue ? current : best;
    }).combo;
  }

  private calculateSecondPlayerComboValue(
    comboAnalysis: { combo: Combo; analysis: ComboAnalysis },
    responseStrategy: "support" | "pressure" | "block" | "setup",
  ): number {
    const { combo, analysis } = comboAnalysis;
    let value = 0;

    // Base value from combo type
    switch (combo.type) {
      case ComboType.Tractor:
        value += 30;
        break;
      case ComboType.Pair:
        value += 20;
        break;
      case ComboType.Single:
        value += 10;
        break;
    }

    // Strategy-specific adjustments
    switch (responseStrategy) {
      case "support":
        // Bonus for point cards and strong combinations
        if (analysis.hasPoints) value += analysis.pointValue * 2;
        if (analysis.strength === ComboStrength.Strong) value += 20;
        break;

      case "pressure":
        // Bonus for moderate to strong combinations
        if (analysis.strength === ComboStrength.Medium) value += 15;
        if (analysis.strength === ComboStrength.Strong) value += 25;
        break;

      case "block":
        // Bonus for safe, non-point cards
        if (!analysis.hasPoints) value += 15;
        if (analysis.strength === ComboStrength.Weak) value += 10;
        break;

      case "setup":
        // Bonus for tactical combinations
        if (combo.type === ComboType.Pair) value += 15;
        if (combo.type === ComboType.Tractor) value += 25;
        if (analysis.strength === ComboStrength.Medium) value += 10;
        break;
    }

    return value;
  }

  private selectSecondPlayerContribution(
    comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
    analysis: SecondPlayerAnalysis,
    trumpInfo: TrumpInfo,
    context: GameContext,
  ): Card[] {
    // If we have an optimal combo from analysis, use it
    if (analysis.optimalCombo) {
      return analysis.optimalCombo.cards;
    }

    // Fall back to point contribution if supporting teammate
    if (
      analysis.shouldContribute &&
      analysis.leaderRelationship === "teammate"
    ) {
      const pointCombos = comboAnalyses.filter(
        ({ analysis: comboAnalysis }) => comboAnalysis.hasPoints,
      );

      if (pointCombos.length > 0) {
        // Select highest point combo
        const bestPointCombo = pointCombos.reduce((best, current) => {
          return current.analysis.pointValue > best.analysis.pointValue
            ? current
            : best;
        });
        return bestPointCombo.combo.cards;
      }
    }

    // Default to first available combo
    return comboAnalyses.length > 0 ? comboAnalyses[0].combo.cards : [];
  }

  private isTeammate(playerId: string, context: GameContext): boolean {
    // In Shengji, Human + Bot2 vs Bot1 + Bot3
    // This is a simplified check - in practice you'd check the game state for team assignments
    const humanTeam = ["human", "bot2"];
    const botTeam = ["bot1", "bot3"];

    // Since we don't have the current AI player ID in context, we need to infer it
    // This is a simplification for the implementation
    return (
      humanTeam.includes(playerId.toLowerCase()) ||
      botTeam.includes(playerId.toLowerCase())
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

    // TRUMP LEADING PROTECTION: Filter out trump suit high cards when leading
    let safeCombos = combos;
    if (trumpInfo?.trumpSuit) {
      const safeOptions = combos.filter((combo) => {
        const hasTrumpSuitHighCard = combo.cards.some((card) => {
          if (!card.suit || card.joker) return false;
          const isTrumpSuit = card.suit === trumpInfo.trumpSuit;
          const isHighCard =
            card.rank === Rank.Ace ||
            card.rank === Rank.King ||
            card.rank === Rank.Ten;
          return isTrumpSuit && isHighCard;
        });
        return !hasTrumpSuitHighCard;
      });

      // Use safe options if available, otherwise use all combos (emergency fallback)
      if (safeOptions.length > 0) {
        safeCombos = safeOptions;
      }
    }

    // Sort by combo strength and strategic value
    const sortedCombos = safeCombos.sort((a, b) => {
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
