import { isTrump, calculateCardStrategicValue } from "../../game/cardValue";
import { gameLogger } from "../../utils/gameLogger";
import {
  Card,
  Combo,
  ComboAnalysis,
  ComboType,
  GameContext,
  GameState,
  PlayerId,
  Rank,
  Suit,
  TrickPosition,
  TrickWinnerAnalysis,
  TrumpInfo,
} from "../../types";
import { isBiggestRemainingInSuit } from "../aiCardMemory";
import { getPointCardPriority } from "../utils/aiHelpers";
import {
  selectEnhancedPointContribution,
  selectPointContribution,
} from "./pointContribution";
import {
  analyzeSecondPlayerStrategy,
  selectOptimalSameSuitResponse,
  selectOptimalTrumpResponse,
  selectSecondPlayerContribution,
} from "./secondPlayerStrategy";
import { selectLowestValueNonPointCombo } from "./strategicDisposal";
import { calculateMemoryEnhanced3rdPlayerRisk } from "./thirdPlayerRiskAnalysis";
import { analyzeThirdPlayerAdvantage } from "./thirdPlayerStrategy";

/**
 * Teammate Support - Team coordination when teammate is winning
 *
 * Handles point contribution and conservative play when teammate is currently
 * winning the trick. Uses position-specific analysis for optimal support.
 */

/**
 * Helper function to check if a player is void of the led suit
 * Uses memory system and hand analysis to determine if player can follow suit
 */
function isPlayerVoidOfLedSuit(
  playerId: PlayerId,
  ledSuit: Suit | null,
  gameState: GameState,
  context: GameContext,
  trumpInfo: TrumpInfo,
): boolean {
  // If no led suit (trump lead), check trump void
  if (ledSuit === null) {
    // Check memory for trump void
    if (context.memoryContext?.cardMemory) {
      const playerMemory =
        context.memoryContext.cardMemory.playerMemories[playerId];
      if (playerMemory) {
        return playerMemory.trumpVoid;
      }
    }

    // Fallback: Check if player has trump cards in hand
    const player = gameState.players.find((p) => p.id === playerId);
    if (player) {
      return !player.hand.some((card) => isTrump(card, trumpInfo));
    }

    return false;
  }

  // Check memory for suit void
  if (context.memoryContext?.cardMemory) {
    const playerMemory =
      context.memoryContext.cardMemory.playerMemories[playerId];
    if (playerMemory) {
      return playerMemory.suitVoids.has(ledSuit);
    }
  }

  // Fallback: Check if player has cards of the led suit in hand
  const player = gameState.players.find((p) => p.id === playerId);
  if (player) {
    return !player.hand.some((card) => card.suit === ledSuit);
  }

  return false;
}

/**
 * Main teammate winning handler with position-specific logic
 */
export function handleTeammateWinning(
  comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
  context: GameContext,
  trumpInfo: TrumpInfo,
  gameState: GameState,
  currentPlayerId?: PlayerId,
): Card[] {
  const trickWinner = context.trickWinnerAnalysis;
  if (!trickWinner) {
    // No trick winner analysis available, fall back to safe play
    return selectLowestValueNonPointCombo(comboAnalyses);
  }

  // ENHANCED POINT TIMING ANALYSIS: Use advanced point timing when available
  if (context.memoryContext?.cardMemory && currentPlayerId) {
    const enhancedContribution = selectEnhancedPointContribution(
      comboAnalyses,
      trumpInfo,
      context,
      gameState,
      currentPlayerId,
    );
    if (enhancedContribution) {
      return enhancedContribution;
    }
  }

  // MEMORY ENHANCEMENT: Prioritize guaranteed point winners when teammate winning (only for valuable tricks)
  if (
    context.memoryContext?.cardMemory &&
    gameState?.currentTrick?.points &&
    gameState.currentTrick.points >= 10
  ) {
    const guaranteedPointWinner = selectMemoryGuaranteedPointContribution(
      comboAnalyses,
      context,
      trumpInfo,
    );
    if (guaranteedPointWinner) {
      return guaranteedPointWinner;
    }
  }

  // Position-specific analysis and contribution logic
  switch (context.trickPosition) {
    case TrickPosition.Fourth:
      // Phase 3: 4th Player Enhanced Strategy with Perfect Information + Memory
      const shouldContributeFourth = shouldContributePointCards(
        trickWinner,
        comboAnalyses,
        context,
        gameState,
        trumpInfo,
      );
      if (shouldContributeFourth) {
        // Use enhanced 4th player contribution with proper 10 > King > 5 priority
        return selectPointContribution(
          comboAnalyses,
          trumpInfo,
          context,
          gameState,
        );
      }
      break;

    case TrickPosition.Second:
      // Enhanced Second Player Strategy: Same-suit following or trump response

      // Priority 1: Try optimal same-suit response (higher card selection)
      const sameSuitResponse = selectOptimalSameSuitResponse(
        comboAnalyses,
        context,
        trumpInfo,
        gameState,
      );
      if (sameSuitResponse) {
        gameLogger.debug("ai_following_decision", {
          decisionPoint: "teammate_winning_second_player",
          strategy: "same_suit_following",
          player: currentPlayerId || "unknown",
        });
        return sameSuitResponse;
      }

      // Priority 2: Try optimal trump response (when void in leading suit)
      const trumpResponse = selectOptimalTrumpResponse(
        comboAnalyses,
        context,
        trumpInfo,
        gameState,
      );
      if (trumpResponse) {
        gameLogger.debug("ai_following_decision", {
          decisionPoint: "teammate_winning_second_player",
          strategy: "trump_response",
          player: currentPlayerId || "unknown",
        });
        return trumpResponse;
      }

      // Priority 3: Fall back to legacy analysis-based strategy
      const secondPlayerAnalysis = analyzeSecondPlayerStrategy(
        comboAnalyses,
        context,
        trumpInfo,
        gameState,
      );

      if (secondPlayerAnalysis.shouldContribute) {
        return selectSecondPlayerContribution(
          comboAnalyses,
          secondPlayerAnalysis,
          trumpInfo,
          context,
        );
      }
      break;

    case TrickPosition.Third:
      // 3rd Player Strategy Enhancement: Trump conservation when following teammate

      const shouldContributeThird = shouldThirdPlayerContribute(
        trickWinner,
        comboAnalyses,
        context,
        gameState,
        trumpInfo,
      );

      // Strategic decision tracking for AI learning
      gameLogger.debug("ai_following_decision", {
        decisionPoint: "teammate_winning_third_player",
        shouldContribute: shouldContributeThird,
        trickPoints: gameState?.currentTrick?.points || 0,
        player: currentPlayerId || "unknown",
      });

      if (shouldContributeThird) {
        const contribution = selectThirdPlayerContribution(
          comboAnalyses,
          trumpInfo,
          context,
          gameState,
        );
        if (contribution) {
          return contribution.cards;
        }
      } else {
        // Check for trump takeover when not contributing points
        const takeoverPlay = selectThirdPlayerTakeoverStrategy(
          comboAnalyses,
          context,
          gameState,
          trumpInfo,
        );
        if (takeoverPlay) {
          return takeoverPlay;
        }
      }
      break;

    case TrickPosition.First:
    default:
      // Standard logic for first position and fallback
      const shouldContributeStandard = shouldContributePointCards(
        trickWinner,
        comboAnalyses,
        context,
        gameState,
        trumpInfo,
      );

      if (shouldContributeStandard) {
        return selectPointContribution(
          comboAnalyses,
          trumpInfo,
          context,
          gameState,
        );
      }
      break;
  }

  // Fallback: Conservative play when not contributing points
  return selectLowestValueNonPointCombo(comboAnalyses);
}

/**
 * Determines whether to contribute point cards when teammate is winning
 */
export function shouldContributePointCards(
  trickWinner: TrickWinnerAnalysis,
  comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
  context: GameContext,
  gameState?: GameState,
  _trumpInfo?: TrumpInfo,
): boolean {
  // Check if we have point cards available
  const hasPointCards = comboAnalyses.some((ca) =>
    ca.combo.cards.some((card) => card.points > 0),
  );

  if (!hasPointCards) {
    return false; // Can't contribute what we don't have
  }

  // 🎯 4TH PLAYER ENHANCEMENT: Perfect information with trump conservation
  if (context.trickPosition === TrickPosition.Fourth) {
    // Last player has perfect information - but should be smart about trump conservation

    // Check if we have non-trump point cards available for contribution
    const nonTrumpPointCards = comboAnalyses.filter(
      (ca) =>
        !ca.analysis.isTrump && ca.combo.cards.some((card) => card.points > 0),
    );

    // If teammate is securely winning and we have non-trump point options, prefer those
    if (nonTrumpPointCards.length > 0) {
      return true; // Contribute with non-trump point cards
    }

    // If only trump point cards available, be more conservative
    // Only contribute trump when teammate needs significant help or trick is very valuable
    if (
      gameState?.currentTrick?.points &&
      gameState.currentTrick.points >= 15
    ) {
      return true; // High value trick - worth using trump points
    }

    // For low-value tricks, preserve trump even if teammate winning
    return false; // Conservative trump preservation when teammate securely winning
  }

  // For earlier positions: Conservative play when teammate has reasonable lead
  // Only contribute point cards when teammate needs help or has very strong lead
  const teammateLeadStrength = analyzeTeammateLeadStrength(
    trickWinner,
    gameState,
  );

  // Conservative approach: preserve pairs unless teammate needs help
  if (teammateLeadStrength === "weak") {
    return true; // Help weak teammate
  } else if (teammateLeadStrength === "very_strong") {
    return true; // Maximize points with very strong teammate
  } else {
    return false; // Conservative play with moderate teammate lead
  }
}

/**
 * Analyzes the strength of teammate's current lead
 */
function analyzeTeammateLeadStrength(
  trickWinner: TrickWinnerAnalysis,
  gameState?: GameState,
): "weak" | "moderate" | "very_strong" {
  if (!gameState?.currentTrick) {
    return "moderate";
  }

  const trick = gameState.currentTrick;

  // Get winning cards - find the winning play in the plays array
  const winningPlay = trick.plays.find(
    (p) => p.playerId === trickWinner.currentWinner,
  );
  const winningCards = winningPlay?.cards || [];

  if (winningCards.length === 0) {
    return "moderate";
  }

  const winningCard = winningCards[0];
  const trumpInfo = gameState.trumpInfo;

  // Use strategic value for consistent strength analysis
  const strategicValue = calculateCardStrategicValue(
    winningCard,
    trumpInfo,
    "basic",
  );

  // Very strong: High strategic value (trump cards, strong non-trump cards)
  if (strategicValue >= 170) {
    return "very_strong"; // Jokers, trump rank cards
  } else if (strategicValue >= 110) {
    return "very_strong"; // Trump suit cards > 10, or strong non-trump (A, K when strong)
  } else if (strategicValue >= 10) {
    return "moderate"; // Moderate cards (Q, J, or non-trump K when not strongest)
  } else {
    return "weak"; // Low value cards
  }
}

/**
 * 3rd Player Contribution Logic - Trump conservation with risk assessment
 *
 * Determines whether 3rd player should contribute point cards when teammate is winning.
 * Uses tactical position advantages and risk assessment to balance trump conservation
 * with optimal point collection.
 */
function shouldThirdPlayerContribute(
  _trickWinner: TrickWinnerAnalysis,
  comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
  context: GameContext,
  gameState?: GameState,
  trumpInfo?: TrumpInfo,
): boolean {
  // Check if we have point cards available
  const hasPointCards = comboAnalyses.some((ca) =>
    ca.combo.cards.some((card) => card.points > 0),
  );

  gameLogger.debug(
    "should_third_player_contribute_start",
    {
      hasPointCards,
      availablePointCards: comboAnalyses
        .filter((ca) => ca.combo.cards.some((card) => card.points > 0))
        .map((ca) =>
          ca.combo.cards
            .map((c) => `${c.rank}${c.suit}(${c.points}pts)`)
            .join(","),
        ),
      totalCombos: comboAnalyses.length,
    },
    "Checking if third player should contribute points",
  );

  if (!hasPointCards) {
    gameLogger.debug(
      "should_third_player_contribute_result",
      {
        result: false,
        reason: "no_point_cards_available",
      },
      "Third player contribution: NO - no point cards available",
    );
    return false; // Can't contribute what we don't have
  }

  // Use 3rd player risk assessment and tactical analysis
  if (!trumpInfo || !gameState) {
    gameLogger.debug(
      "should_third_player_contribute_result",
      {
        result: false,
        reason: "missing_trump_info_or_game_state",
      },
      "Third player contribution: NO - missing required parameters",
    );
    return false; // Cannot analyze without required parameters
  }

  // CRITICAL FIX: Check if 4th player is also void of the led suit
  // If both 3rd and 4th players are void, don't contribute point cards as 4th player can trump in
  const currentTrick = gameState.currentTrick;
  if (currentTrick && currentTrick.plays.length > 0) {
    const leadCard = currentTrick.plays[0]?.cards[0];
    if (leadCard) {
      const ledSuit = isTrump(leadCard, trumpInfo) ? null : leadCard.suit;

      // Check if BOTH 3rd and 4th players are void of the led suit
      // Only avoid contributing if both are void (4th player would steal points)
      const currentPlayerId = context.currentPlayer || PlayerId.Bot2; // 3rd player
      const thirdPlayerVoid = isPlayerVoidOfLedSuit(
        currentPlayerId,
        ledSuit,
        gameState,
        context,
        trumpInfo,
      );

      const fourthPlayerVoid = isPlayerVoidOfLedSuit(
        PlayerId.Bot3, // 4th player is always Bot3
        ledSuit,
        gameState,
        context,
        trumpInfo,
      );

      if (thirdPlayerVoid && fourthPlayerVoid) {
        // Both 3rd and 4th players are void - don't contribute point cards
        // 4th player can trump in and take our points
        gameLogger.debug(
          "should_third_player_contribute_result",
          {
            result: false,
            reason: "both_players_void",
            thirdPlayerVoid,
            fourthPlayerVoid,
            ledSuit,
          },
          "Third player contribution: NO - both 3rd and 4th players void, 4th would steal points",
        );
        return false;
      } else if (fourthPlayerVoid && !thirdPlayerVoid) {
        // Only 4th player is void, but 3rd player has suit cards
        // This is actually a GOOD scenario - we can play our suit cards safely
        gameLogger.debug(
          "should_third_player_contribute_suit_analysis",
          {
            thirdPlayerVoid,
            fourthPlayerVoid,
            ledSuit,
            reason: "fourth_void_third_has_suit",
          },
          "4th player void but 3rd player has suit cards - can contribute safely",
        );
      }

      // NEW: Check if 2nd player already trumped - 3rd should beat trump, not contribute points
      // Only apply this logic for 3rd player (TrickPosition.Third)
      if (context.trickPosition === TrickPosition.Third) {
        const secondPlayerCards = currentTrick.plays[1]?.cards;
        if (secondPlayerCards && secondPlayerCards.length > 0) {
          const secondPlayerIsTrump =
            secondPlayerCards[0] && isTrump(secondPlayerCards[0], trumpInfo);

          if (secondPlayerIsTrump) {
            // Check if 3rd player is void in leading suit (check actual hand, not memory)
            const currentPlayer = gameState.players.find(
              (p) => p.id === context.currentPlayer,
            );
            const hasLeadingSuit =
              currentPlayer?.hand.some(
                (card) => card.suit === ledSuit && !isTrump(card, trumpInfo),
              ) || false;

            if (!hasLeadingSuit) {
              // 2nd player (opponent) trumped and we're void - should beat trump, not contribute points
              gameLogger.debug(
                "should_third_player_contribute_result",
                {
                  result: false,
                  reason: "second_player_trumped_third_void",
                  hasLeadingSuit,
                  secondPlayerIsTrump,
                  secondPlayerCard: `${secondPlayerCards[0].rank}${secondPlayerCards[0].suit}`,
                  ledSuit,
                },
                "Third player contribution: NO - 2nd player trumped and 3rd player void, should beat trump instead",
              );
              return false; // This will trigger takeover logic
            } else {
              // NEW: 2nd player trumped and 3rd player has leading suit cards
              // Should NEVER contribute points - always dispose leading suit cards
              gameLogger.debug(
                "should_third_player_contribute_result",
                {
                  result: false,
                  reason: "second_player_trumped_has_leading_suit",
                  hasLeadingSuit,
                  secondPlayerIsTrump,
                  secondPlayerCard: `${secondPlayerCards[0].rank}${secondPlayerCards[0].suit}`,
                  ledSuit,
                },
                "Third player contribution: NO - 2nd player trumped, should dispose leading suit cards instead of contributing points",
              );
              return false; // This will trigger disposal logic
            }
          }
        }
      }
    }
  }

  const thirdPlayerAnalysis = analyzeThirdPlayerAdvantage(
    comboAnalyses,
    context,
    trumpInfo,
    gameState,
  );

  // Check if we have non-trump point cards available for contribution
  const nonTrumpPointCards = comboAnalyses.filter(
    (ca) =>
      !ca.analysis.isTrump && ca.combo.cards.some((card) => card.points > 0),
  );

  // If we have non-trump point options, prefer those (similar to 4th player logic)
  if (nonTrumpPointCards.length > 0) {
    gameLogger.debug(
      "should_third_player_contribute_non_trump_analysis",
      {
        nonTrumpPointCards: nonTrumpPointCards.length,
        takeoverRecommendation: thirdPlayerAnalysis.takeoverRecommendation,
        teammateLeadStrength: thirdPlayerAnalysis.teammateLeadStrength,
        currentTrickPoints: gameState?.currentTrick?.points || 0,
      },
      "Analyzing non-trump point contribution decision",
    );

    // Use risk assessment to determine contribution level
    if (thirdPlayerAnalysis.takeoverRecommendation === "support") {
      gameLogger.debug(
        "should_third_player_contribute_result",
        {
          result: true,
          reason: "support_recommendation_with_non_trump_points",
        },
        "Third player contribution: YES - support recommendation",
      );
      return true; // Safe to contribute with non-trump points
    } else if (thirdPlayerAnalysis.takeoverRecommendation === "strategic") {
      // Strategic decision based on trick value and teammate strength
      const currentTrickPoints = gameState?.currentTrick?.points || 0;
      const shouldContribute =
        currentTrickPoints >= 10 || // Moderate value trick
        thirdPlayerAnalysis.teammateLeadStrength === "weak"; // Help weak teammate
      gameLogger.debug(
        "should_third_player_contribute_result",
        {
          result: shouldContribute,
          reason: "strategic_decision",
          currentTrickPoints,
          teammateLeadStrength: thirdPlayerAnalysis.teammateLeadStrength,
          conditions: {
            moderateValueTrick: currentTrickPoints >= 10,
            weakTeammate: thirdPlayerAnalysis.teammateLeadStrength === "weak",
          },
        },
        `Third player contribution: ${shouldContribute ? "YES" : "NO"} - strategic decision`,
      );
      return shouldContribute;
    }
    // For takeover recommendation, be more conservative with point contribution
    const shouldContribute =
      thirdPlayerAnalysis.teammateLeadStrength === "weak";
    gameLogger.debug(
      "should_third_player_contribute_result",
      {
        result: shouldContribute,
        reason: "takeover_recommendation_conservative",
        teammateLeadStrength: thirdPlayerAnalysis.teammateLeadStrength,
      },
      `Third player contribution: ${shouldContribute ? "YES" : "NO"} - conservative for takeover`,
    );
    return shouldContribute;
  }

  // If only trump point cards available, be very conservative (like 4th player)
  // Only use trump points when:
  // 1. High-value trick (≥15 points) OR
  // 2. High risk situation (≥0.6) AND moderate trick value (≥10 points) OR
  // 3. Teammate is weak AND trick has some value (≥5 points)
  const currentTrickPoints = gameState?.currentTrick?.points || 0;
  const riskLevel = thirdPlayerAnalysis.riskAssessment;

  if (currentTrickPoints >= 15) {
    return true; // High value trick - worth using trump points
  }

  if (riskLevel >= 0.6 && currentTrickPoints >= 10) {
    return true; // High risk situation with moderate trick value
  }

  if (
    thirdPlayerAnalysis.teammateLeadStrength === "weak" &&
    currentTrickPoints >= 5
  ) {
    return true; // Help weak teammate when trick has some value
  }

  // Conservative trump preservation for low-value tricks and safe situations
  return false;
}

/**
 * 3rd Player Contribution Selection - Optimal card selection with trump conservation
 *
 * Selects optimal point contribution for 3rd player, prioritizing non-trump point cards
 * and using strategic value assessment for trump point cards.
 */
function selectThirdPlayerContribution(
  comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
  trumpInfo: TrumpInfo,
  context: GameContext,
  gameState: GameState,
): Combo | null {
  // Get 3rd player analysis for strategic decision making
  const thirdPlayerAnalysis = analyzeThirdPlayerAdvantage(
    comboAnalyses,
    context,
    trumpInfo,
    gameState,
  );

  // Filter point card combinations
  const pointCardCombos = comboAnalyses.filter((ca) =>
    ca.combo.cards.some((card) => card.points > 0),
  );

  if (pointCardCombos.length === 0) {
    return null; // No point cards available
  }

  // Prioritize non-trump point cards (similar to 4th player strategy)
  const nonTrumpPointCombos = pointCardCombos.filter(
    (ca) => !ca.analysis.isTrump,
  );

  // If we have non-trump point cards, prefer those
  if (nonTrumpPointCombos.length > 0) {
    // Sort by strategic priority: Ten > King > Five (even when same point value)
    return nonTrumpPointCombos.sort((a, b) => {
      const aCard = a.combo.cards[0];
      const bCard = b.combo.cards[0];

      const aPriority = getPointCardPriority(aCard);
      const bPriority = getPointCardPriority(bCard);

      if (aPriority !== bPriority) {
        return bPriority - aPriority; // Higher priority first
      }

      // If same priority, sort by point value
      const aPoints = a.combo.cards.reduce(
        (total, card) => total + (card.points || 0),
        0,
      );
      const bPoints = b.combo.cards.reduce(
        (total, card) => total + (card.points || 0),
        0,
      );
      return bPoints - aPoints;
    })[0].combo;
  }

  // If only trump point cards available, use strategic selection
  // Consider risk level and teammate strength for trump card usage
  if (
    thirdPlayerAnalysis.riskAssessment >= 0.6 ||
    thirdPlayerAnalysis.teammateLeadStrength === "weak"
  ) {
    // High risk or weak teammate - use trump points strategically
    return pointCardCombos.sort((a, b) => {
      const aPoints = a.combo.cards.reduce(
        (total, card) => total + (card.points || 0),
        0,
      );
      const bPoints = b.combo.cards.reduce(
        (total, card) => total + (card.points || 0),
        0,
      );
      return bPoints - aPoints; // Highest points first
    })[0].combo;
  }

  // Low risk with strong teammate - conservative trump usage
  // Select lowest value trump point combination to minimize waste
  return pointCardCombos.sort((a, b) => {
    const aPoints = a.combo.cards.reduce(
      (total, card) => total + (card.points || 0),
      0,
    );
    const bPoints = b.combo.cards.reduce(
      (total, card) => total + (card.points || 0),
      0,
    );
    return aPoints - bPoints; // Lowest points first (minimize trump waste)
  })[0].combo;
}

/**
 * Memory-enhanced: Select guaranteed point winning combos for teammate support
 * Uses card memory to identify point cards that are certain to win
 */
function selectMemoryGuaranteedPointContribution(
  comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
  context: GameContext,
  trumpInfo: TrumpInfo,
): Card[] | null {
  if (!context.memoryContext?.cardMemory) return null;

  // Find point card combos with guaranteed winning cards
  const guaranteedPointWinners: {
    combo: { combo: Combo; analysis: ComboAnalysis };
    priority: number;
  }[] = [];

  comboAnalyses.forEach((comboAnalysis) => {
    const firstCard = comboAnalysis.combo.cards[0];
    const hasPoints = comboAnalysis.combo.cards.some(
      (card) => card.points && card.points > 0,
    );

    if (!hasPoints || !firstCard.rank || !firstCard.suit) {
      return; // Skip non-point or invalid cards
    }

    // Skip trump cards for now (save trump for critical situations)
    if (firstCard.suit && firstCard.suit === trumpInfo.trumpSuit) {
      return;
    }

    const comboType =
      comboAnalysis.combo.type === ComboType.Pair ? "pair" : "single";
    const isBiggestRemaining =
      context.memoryContext?.cardMemory &&
      firstCard.rank &&
      isBiggestRemainingInSuit(
        context.memoryContext.cardMemory,
        firstCard.suit,
        firstCard.rank,
        comboType,
      );

    if (isBiggestRemaining) {
      let priority = 0;
      const totalPoints = comboAnalysis.combo.cards.reduce(
        (sum, card) => sum + (card.points || 0),
        0,
      );

      // Priority calculation: Point value > Card rank
      priority += totalPoints * 10; // High priority for point value

      // Bonus for high-value point cards
      if (firstCard.rank === Rank.Ten) {
        priority += 50; // 10s are high value
      } else if (firstCard.rank === Rank.King) {
        priority += 40; // Kings are high value
      } else if (firstCard.rank === Rank.Five) {
        priority += 30; // 5s are medium value
      }

      guaranteedPointWinners.push({
        combo: comboAnalysis,
        priority,
      });
    }
  });

  if (guaranteedPointWinners.length > 0) {
    // Sort by priority: highest first
    guaranteedPointWinners.sort((a, b) => b.priority - a.priority);
    return guaranteedPointWinners[0].combo.combo.cards;
  }

  return null;
}

/**
 * Third Player Takeover Strategy - Strategic trump selection when void in leading suit
 *
 * RESTRICTIONS:
 * - Only applies to NON-TRUMP SINGLES - trump leads are already strong, pairs/tractors too risky
 * - Only evaluates when leading card is non-trump single that can be beaten
 *
 * Uses risk analysis to determine optimal trump choice based on 4th player capabilities
 * Also considers 2nd player (opponent) position for optimal counter-strategy
 */
function selectThirdPlayerTakeoverStrategy(
  comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
  context: GameContext,
  gameState: GameState,
  trumpInfo: TrumpInfo,
): Card[] | null {
  const currentTrick = gameState.currentTrick;
  if (!currentTrick || currentTrick.plays.length < 2) {
    return null; // Need leading and second player cards for analysis
  }

  const leadingCards = currentTrick.plays[0].cards;
  const secondPlayerCards = currentTrick.plays[1].cards;
  const currentPlayer = context.currentPlayer;

  // Only apply takeover strategy for single card leads
  if (leadingCards.length !== 1 || secondPlayerCards.length !== 1) {
    return null; // Don't takeover pairs/tractors - too risky and complex
  }

  const leadCard = leadingCards[0];

  // Only evaluate takeover when leading is non-trump single
  if (isTrump(leadCard, trumpInfo)) {
    return null; // Don't takeover trump leads - they're already strong
  }

  // Check if current player is void in leading suit
  const leadingSuit = leadCard.suit;

  if (leadingSuit) {
    const currentPlayerHand =
      gameState.players.find((p) => p.id === currentPlayer)?.hand || [];
    const hasLeadingSuit = currentPlayerHand.some(
      (card) => card.suit === leadingSuit && !isTrump(card, trumpInfo),
    );

    if (hasLeadingSuit) {
      return null; // Not void, use regular same-suit logic
    }
  }

  // Analyze 2nd player (opponent) position before considering takeover
  const secondPlayerCard = secondPlayerCards[0];
  const secondPlayerIsTrump = isTrump(secondPlayerCard, trumpInfo);

  // 2nd player is always an OPPONENT of 3rd player in Tractor
  // Consider opponent's play when deciding takeover strategy
  if (secondPlayerIsTrump) {
    // Opponent already trumped - good opportunity to counter-trump with better trump
    // Be more aggressive since we're taking points away from opponent
    const trickPoints = currentTrick.points;
    if (trickPoints >= 5) {
      // Worth counter-trumping opponent when there are decent points
      // Continue with takeover analysis
    }
  } else {
    // Opponent played non-trump - good takeover opportunity with trump
    // Continue with takeover analysis
  }

  // Get trump combos
  const trumpCombos = comboAnalyses.filter((ca) =>
    ca.combo.cards.every((card) => isTrump(card, trumpInfo)),
  );

  if (trumpCombos.length === 0) {
    return null; // No trump options
  }

  // Use risk analysis to determine strategy
  const riskAnalysis = calculateMemoryEnhanced3rdPlayerRisk(
    leadingCards,
    secondPlayerCards,
    trumpInfo,
    currentPlayer,
    context,
  );

  // Check if analysis succeeded and extract void status
  let fourthPlayerVoid = false;
  if (context.memoryContext?.cardMemory) {
    try {
      const memoryAnalysis = context.memoryContext.cardMemory;
      // Get 4th player ID (Bot3) and check their void status directly
      const fourthPlayerId = gameState.players.find(
        (p) =>
          p.id !== currentPlayer &&
          p.id !== currentTrick.plays[0].playerId &&
          p.id !== currentTrick.plays[1].playerId,
      )?.id;

      gameLogger.debug(
        "takeover_void_detection_attempt",
        {
          fourthPlayerId,
          leadingSuit,
          hasMemoryAnalysis: !!memoryAnalysis,
          hasPlayerMemory: !!(
            fourthPlayerId && memoryAnalysis.playerMemories[fourthPlayerId]
          ),
        },
        "Attempting to detect 4th player void status from memory",
      );

      if (fourthPlayerId && leadingSuit) {
        fourthPlayerVoid =
          memoryAnalysis.playerMemories[fourthPlayerId]?.suitVoids.has(
            leadingSuit,
          ) || false;

        gameLogger.debug(
          "takeover_void_detection_result",
          {
            fourthPlayerId,
            leadingSuit,
            fourthPlayerVoid,
            voidSuits: Array.from(
              memoryAnalysis.playerMemories[fourthPlayerId]?.suitVoids || [],
            ),
          },
          `4th player void detection: ${fourthPlayerVoid ? "VOID" : "NOT VOID"} in ${leadingSuit}`,
        );
      }
    } catch (error) {
      // Fallback to risk analysis interpretation
      fourthPlayerVoid = riskAnalysis.memoryFactors.finalPlayerVoidRisk < 0;
      gameLogger.debug(
        "takeover_void_detection_fallback",
        {
          error: error instanceof Error ? error.message : String(error),
          fallbackVoidStatus: fourthPlayerVoid,
          riskFactor: riskAnalysis.memoryFactors.finalPlayerVoidRisk,
        },
        "Memory void detection failed, using risk analysis fallback",
      );
    }
  } else {
    gameLogger.debug(
      "takeover_void_detection_no_memory",
      {
        hasMemoryContext: !!context.memoryContext,
        hasCardMemory: !!context.memoryContext?.cardMemory,
      },
      "No memory context available for void detection",
    );
  }
  const trickPoints = currentTrick.points;

  gameLogger.debug(
    "takeover_trump_selection_start",
    {
      fourthPlayerVoid,
      trickPoints,
      availableTrumps: trumpCombos.length,
      trumpCards: trumpCombos.map((tc) =>
        tc.combo.cards.map((c) => `${c.rank}${c.suit}`).join(","),
      ),
    },
    `Starting trump selection: 4th player ${fourthPlayerVoid ? "IS VOID" : "NOT VOID"}, trick points: ${trickPoints}`,
  );

  // Strategic trump selection based on corrected strategy
  if (!fourthPlayerVoid) {
    // 4th player NOT void - use point trump if available
    const pointTrumps = trumpCombos.filter((ca) =>
      ca.combo.cards.some((card) => card.points > 0),
    );

    gameLogger.debug(
      "takeover_trump_selection_not_void",
      {
        pointTrumpsAvailable: pointTrumps.length,
        pointTrumps: pointTrumps.map((pt) =>
          pt.combo.cards
            .map((c) => `${c.rank}${c.suit}(${c.points}pts)`)
            .join(","),
        ),
      },
      "4th player NOT void - looking for point trumps",
    );

    if (pointTrumps.length > 0) {
      // Sort by point value descending
      pointTrumps.sort((a, b) => {
        const aPoints = a.combo.cards.reduce(
          (sum, card) => sum + (card.points || 0),
          0,
        );
        const bPoints = b.combo.cards.reduce(
          (sum, card) => sum + (card.points || 0),
          0,
        );
        return bPoints - aPoints;
      });
      gameLogger.debug(
        "takeover_trump_selection_result",
        {
          selectedCards: pointTrumps[0].combo.cards.map(
            (c) => `${c.rank}${c.suit}(${c.points}pts)`,
          ),
          reason: "point_trump_for_non_void_4th_player",
        },
        "Selected point trump because 4th player not void",
      );
      return pointTrumps[0].combo.cards;
    }
  } else {
    // 4th player IS void - strategic selection based on trick points
    gameLogger.debug(
      "takeover_trump_selection_void",
      {
        trickPoints,
        strategy:
          trickPoints >= 15
            ? "high_points_highest_trump"
            : trickPoints >= 5
              ? "intermediate_points_trump_gt_10"
              : "low_points_fallback",
      },
      "4th player IS void - selecting trump based on trick points",
    );

    if (trickPoints >= 15) {
      // High points - use highest trump
      trumpCombos.sort((a, b) => b.combo.value - a.combo.value);
      gameLogger.debug(
        "takeover_trump_selection_result",
        {
          selectedCards: trumpCombos[0].combo.cards.map(
            (c) => `${c.rank}${c.suit}`,
          ),
          reason: "highest_trump_for_high_points",
          trickPoints,
        },
        "Selected highest trump for high points (≥15)",
      );
      return trumpCombos[0].combo.cards;
    } else if (trickPoints >= 5) {
      // Intermediate points (5-14) - use trump > 110 value if available
      const midRangeTrumps = trumpCombos.filter((ca) => ca.combo.value > 110);
      gameLogger.debug(
        "takeover_trump_selection_intermediate",
        {
          midRangeTrumpsAvailable: midRangeTrumps.length,
          midRangeTrumps: midRangeTrumps.map(
            (mt) =>
              `${mt.combo.cards.map((c) => c.rank + c.suit).join(",")}(val:${mt.combo.value})`,
          ),
          trickPoints,
        },
        "Looking for trump > 110 value for intermediate points",
      );

      if (midRangeTrumps.length > 0) {
        // Use smallest trump > 110 for efficiency
        midRangeTrumps.sort((a, b) => a.combo.value - b.combo.value);
        gameLogger.debug(
          "takeover_trump_selection_result",
          {
            selectedCards: midRangeTrumps[0].combo.cards.map(
              (c) => `${c.rank}${c.suit}`,
            ),
            reason: "smallest_trump_gt_110_for_intermediate_points",
            value: midRangeTrumps[0].combo.value,
            trickPoints,
          },
          "Selected trump > 110 for intermediate points",
        );
        return midRangeTrumps[0].combo.cards;
      }
    }
  }

  // Fallback: use lowest trump
  trumpCombos.sort((a, b) => a.combo.value - b.combo.value);
  gameLogger.debug(
    "takeover_trump_selection_result",
    {
      selectedCards: trumpCombos[0].combo.cards.map(
        (c) => `${c.rank}${c.suit}`,
      ),
      reason: "fallback_lowest_trump",
      value: trumpCombos[0].combo.value,
      fourthPlayerVoid,
      trickPoints,
    },
    "Fallback: Selected lowest trump",
  );
  return trumpCombos[0].combo.cards;
}
