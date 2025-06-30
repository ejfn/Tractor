import {
  Card,
  Combo,
  ComboAnalysis,
  GameContext,
  GameState,
  Suit,
  TrickPosition,
  TrumpInfo,
  SecondPlayerAnalysis,
  PlayerId,
  Rank,
} from "../../types";
import { analyze2ndPlayerMemoryContext } from "../aiCardMemory";
import { isTrump, calculateCardStrategicValue } from "../../game/cardValue";
import { gameLogger } from "../../utils/gameLogger";

/**
 * Second Player Strategy - Position 2 specific optimizations
 *
 * Handles strategic opportunities for the 2nd player with early position
 * influence and setup opportunities for remaining players.
 */

/**
 * Phase 3: Memory-Enhanced 2nd Player Strategy Analysis
 *
 * Analyzes strategic opportunities for the 2nd player with memory-based
 * partial information analysis leveraging trump exhaustion and void detection.
 */
export function analyzeSecondPlayerStrategy(
  comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
  context: GameContext,
  trumpInfo: TrumpInfo,
  gameState: GameState,
): SecondPlayerAnalysis {
  if (context.trickPosition !== TrickPosition.Second) {
    throw new Error(
      "analyzeSecondPlayerStrategy should only be called for 2nd player (TrickPosition.Second)",
    );
  }

  // Enhanced analysis with memory context when available
  let memoryAnalysis = null;
  let currentPlayer: PlayerId | null = null;

  if (
    context.memoryContext?.cardMemory &&
    gameState.currentTrick?.plays?.[0]?.cards
  ) {
    // Determine current player from game state
    currentPlayer = gameState.players[gameState.currentPlayerIndex]?.id || null;

    if (currentPlayer) {
      try {
        memoryAnalysis = analyze2ndPlayerMemoryContext(
          context.memoryContext.cardMemory,
          gameState.currentTrick.plays[0].cards,
          trumpInfo,
          currentPlayer,
        );
      } catch (error) {
        gameLogger.warn(
          "second_player_memory_analysis_failed",
          {
            error: error instanceof Error ? error.message : String(error),
            currentPlayer,
            hasLeadingCards: !!gameState.currentTrick?.plays?.[0]?.cards,
          },
          "2nd player memory analysis failed",
        );
      }
    }
  }

  const pointCombos = comboAnalyses.filter((ca) =>
    ca.combo.cards.some((card) => card.points > 0),
  );

  // Enhanced response strategy based on memory analysis
  let responseStrategy: "support" | "pressure" | "block" | "setup" = "setup";
  let informationAdvantage = 0.6; // Base value
  let blockingPotential = 0.5; // Base value
  let coordinationValue = 0.7; // Base value

  if (memoryAnalysis) {
    responseStrategy = memoryAnalysis.optimalResponseStrategy;

    // Adjust metrics based on memory insights
    switch (memoryAnalysis.recommendedInfluenceLevel) {
      case "high":
        informationAdvantage = 0.8;
        blockingPotential = 0.8;
        coordinationValue = 0.9;
        break;
      case "moderate":
        informationAdvantage = 0.7;
        blockingPotential = 0.6;
        coordinationValue = 0.8;
        break;
      case "low":
        informationAdvantage = 0.5;
        blockingPotential = 0.3;
        coordinationValue = 0.6;
        break;
    }

    // Adjust blocking potential based on void detection
    const totalVoidProbability = Object.values(
      memoryAnalysis.opponentVoidProbabilities,
    ).reduce((sum, prob) => sum + prob, 0);
    if (totalVoidProbability > 0) {
      blockingPotential += totalVoidProbability * 0.3; // Increase blocking potential
      blockingPotential = Math.min(1.0, blockingPotential);
    }
  }

  // Determine leader relationship and strength
  const leadingCards = gameState.currentTrick?.plays?.[0]?.cards || [];
  const leaderRelationship = context.trickWinnerAnalysis?.isTeammateWinning
    ? "teammate"
    : "opponent";

  // Analyze leader strength based on cards played
  let leaderStrength: "weak" | "moderate" | "strong" = "moderate";
  if (leadingCards.length > 0) {
    const hasHighCards = leadingCards.some(
      (card) => card.rank === Rank.Ace || card.rank === Rank.King,
    );
    const hasPoints = leadingCards.some((card) => card.points > 0);
    const isTrumpLead = leadingCards.some(
      (card) =>
        card.suit === trumpInfo.trumpSuit || card.rank === trumpInfo.trumpRank,
    );

    if (isTrumpLead || hasHighCards || hasPoints) {
      // Trump leads, high cards (Ace/King), or point cards are all considered strong
      leaderStrength = "strong";
    } else {
      leaderStrength = "weak";
    }
  }

  // OVERRIDE: If teammate leads with strong card, always support regardless of memory analysis
  if (leaderRelationship === "teammate" && leaderStrength === "strong") {
    responseStrategy = "support";
  }

  // Select optimal combo based on enhanced analysis
  let optimalCombo = null;
  if (responseStrategy === "support" && pointCombos.length > 0) {
    // Support with best point contribution
    optimalCombo = pointCombos.reduce((best, current) => {
      const bestPoints = best.combo.cards.reduce(
        (total, card) => total + (card.points || 0),
        0,
      );
      const currentPoints = current.combo.cards.reduce(
        (total, card) => total + (card.points || 0),
        0,
      );
      return currentPoints > bestPoints ? current : best;
    }).combo;
  } else if (responseStrategy === "pressure" || responseStrategy === "block") {
    // Use strongest available combo for pressure/blocking
    const strongCombos = comboAnalyses.filter(
      (ca) =>
        ca.analysis.isTrump ||
        ca.combo.cards.some(
          (card) => card.rank === Rank.Ace || card.rank === Rank.King,
        ),
    );
    if (strongCombos.length > 0) {
      optimalCombo = strongCombos[0].combo;
    }
  }

  return {
    leaderRelationship,
    leaderStrength,
    responseStrategy,
    informationAdvantage,
    optimalCombo,
    setupOpportunity: responseStrategy === "setup",
    blockingPotential,
    coordinationValue,
    shouldContribute: responseStrategy === "support",
  };
}

/**
 * Second player contribution logic with influence positioning
 */
export function selectSecondPlayerContribution(
  comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
  analysis: SecondPlayerAnalysis,
  _trumpInfo: TrumpInfo,
  _context: GameContext,
): import("../../types").Card[] {
  // If we have an optimal combo from analysis, use it
  if (analysis.optimalCombo) {
    return analysis.optimalCombo.cards;
  }

  // Fall back to point contribution if supporting teammate
  if (analysis.shouldContribute) {
    const pointCombos = comboAnalyses.filter((ca) =>
      ca.combo.cards.some((card) => card.points > 0),
    );

    if (pointCombos.length > 0) {
      // Select highest point combo
      const bestPointCombo = pointCombos.reduce((best, current) => {
        const bestPoints = best.combo.cards.reduce(
          (total, card) => total + (card.points || 0),
          0,
        );
        const currentPoints = current.combo.cards.reduce(
          (total, card) => total + (card.points || 0),
          0,
        );
        return currentPoints > bestPoints ? current : best;
      });
      return bestPointCombo.combo.cards;
    }
  }

  // Default to first available combo
  return comboAnalyses.length > 0 ? comboAnalyses[0].combo.cards : [];
}

/**
 * Enhanced 2nd Player Same-Suit Following Strategy
 *
 * For non-trump suit following, 2nd player should generally play higher
 * than the leader when possible to either win the trick or set up teammates.
 */
export function selectOptimalSameSuitResponse(
  comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
  context: GameContext,
  trumpInfo: TrumpInfo,
  gameState: GameState,
): Card[] | null {
  const leadingCards = gameState.currentTrick?.plays[0]?.cards;
  if (!leadingCards || leadingCards.length === 0) {
    return null;
  }

  const leadingSuit = leadingCards[0].suit;
  const leadingCard = leadingCards[0];

  // Only handle non-trump suit following
  if (isTrump(leadingCard, trumpInfo)) {
    return null;
  }

  // Filter combos that are in the same suit and non-trump
  const sameSuitCombos = comboAnalyses.filter((ca) => {
    return (
      ca.combo.cards.length > 0 &&
      ca.combo.cards[0].suit === leadingSuit &&
      !ca.analysis.isTrump
    );
  });

  if (sameSuitCombos.length === 0) {
    return null; // Player is void in leading suit
  }

  // Determine if teammate or opponent led the card
  // For 2nd player, we need to check WHO led, not who is "winning"
  const leadingPlayerId = gameState.currentTrick?.plays[0]?.playerId;
  const currentPlayerId = gameState.players[gameState.currentPlayerIndex]?.id;
  
  // Team relationships in Tractor:
  // Team A: Human + Bot2, Team B: Bot1 + Bot3
  const isTeammateLeading = 
    (currentPlayerId === PlayerId.Bot1 && leadingPlayerId === PlayerId.Bot3) ||
    (currentPlayerId === PlayerId.Bot2 && leadingPlayerId === PlayerId.Human) ||
    (currentPlayerId === PlayerId.Bot3 && leadingPlayerId === PlayerId.Bot1) ||
    (currentPlayerId === PlayerId.Human && leadingPlayerId === PlayerId.Bot2);

  if (isTeammateLeading) {
    // Teammate is leading - contribute high cards, especially point cards
    return selectTeammateLeadingSameSuitResponse(
      sameSuitCombos,
      leadingCard,
      context,
    );
  } else {
    // Opponent is leading - try to beat with higher cards if possible
    return selectOpponentLeadingSameSuitResponse(
      sameSuitCombos,
      leadingCard,
      context,
      trumpInfo,
    );
  }
}

/**
 * Select optimal same-suit response when teammate is leading
 * Priority: Point cards > High cards > Medium cards > Low cards
 */
function selectTeammateLeadingSameSuitResponse(
  sameSuitCombos: { combo: Combo; analysis: ComboAnalysis }[],
  leadingCard: Card,
  context: GameContext,
): Card[] {
  // Priority 1: Point cards (contribute points for teammate)
  const pointCombos = sameSuitCombos.filter((ca) => ca.analysis.hasPoints);
  if (pointCombos.length > 0) {
    // Select highest point combo
    const bestPointCombo = pointCombos.reduce((best, current) => {
      const bestPoints = best.combo.cards.reduce(
        (total, card) => total + (card.points || 0),
        0,
      );
      const currentPoints = current.combo.cards.reduce(
        (total, card) => total + (card.points || 0),
        0,
      );
      return currentPoints > bestPoints ? current : best;
    });
    return bestPointCombo.combo.cards;
  }

  // Priority 2: High cards (Ace, King) to strengthen teammate's lead
  const highCardCombos = sameSuitCombos.filter((ca) =>
    ca.combo.cards.some(
      (card) => card.rank === Rank.Ace || card.rank === Rank.King,
    ),
  );
  if (highCardCombos.length > 0) {
    // Select highest among high cards
    const sortedHighCards = highCardCombos.sort((a, b) => {
      const aValue = calculateCardStrategicValue(
        a.combo.cards[0],
        context.trumpInfo || { trumpSuit: Suit.None, trumpRank: Rank.None },
        "basic",
      );
      const bValue = calculateCardStrategicValue(
        b.combo.cards[0],
        context.trumpInfo || { trumpSuit: Suit.None, trumpRank: Rank.None },
        "basic",
      );
      return bValue - aValue; // Highest first
    });
    return sortedHighCards[0].combo.cards;
  }

  // Priority 3: Any remaining cards (play highest available)
  const sortedCombos = sameSuitCombos.sort((a, b) => {
    const aValue = calculateCardStrategicValue(
      a.combo.cards[0],
      context.trumpInfo || { trumpSuit: Suit.None, trumpRank: Rank.None },
      "basic",
    );
    const bValue = calculateCardStrategicValue(
      b.combo.cards[0],
      context.trumpInfo || { trumpSuit: Suit.None, trumpRank: Rank.None },
      "basic",
    );
    return bValue - aValue; // Highest first
  });
  return sortedCombos[0].combo.cards;
}

/**
 * Select optimal same-suit response when opponent is leading
 * Try to beat opponent with higher cards, otherwise play strategically
 */
function selectOpponentLeadingSameSuitResponse(
  sameSuitCombos: { combo: Combo; analysis: ComboAnalysis }[],
  leadingCard: Card,
  context: GameContext,
  trumpInfo: TrumpInfo,
): Card[] {
  // Find combos that can beat the leading card
  const beatingCombos = sameSuitCombos.filter((ca) => {
    const cardValue = calculateCardStrategicValue(
      ca.combo.cards[0],
      trumpInfo,
      "basic",
    );
    const leadingValue = calculateCardStrategicValue(
      leadingCard,
      trumpInfo,
      "basic",
    );
    return cardValue > leadingValue;
  });

  if (beatingCombos.length > 0) {
    // Can beat opponent - select the lowest card that can beat
    const sortedBeatingCombos = beatingCombos.sort((a, b) => {
      const aValue = calculateCardStrategicValue(
        a.combo.cards[0],
        trumpInfo,
        "basic",
      );
      const bValue = calculateCardStrategicValue(
        b.combo.cards[0],
        trumpInfo,
        "basic",
      );
      return aValue - bValue; // Lowest first (efficient beating)
    });

    gameLogger.debug(
      "second_player_beats_opponent",
      {
        leadingCard: `${leadingCard.rank}${leadingCard.suit}`,
        selectedCard: `${sortedBeatingCombos[0].combo.cards[0].rank}${sortedBeatingCombos[0].combo.cards[0].suit}`,
        strategy: "efficient_beating",
      },
      "2nd player efficiently beats opponent's lead",
    );

    return sortedBeatingCombos[0].combo.cards;
  }

  // Cannot beat opponent - play lowest card to minimize loss
  const sortedCombos = sameSuitCombos.sort((a, b) => {
    const aValue = calculateCardStrategicValue(
      a.combo.cards[0],
      trumpInfo,
      "basic",
    );
    const bValue = calculateCardStrategicValue(
      b.combo.cards[0],
      trumpInfo,
      "basic",
    );
    return aValue - bValue; // Lowest first
  });

  gameLogger.debug(
    "second_player_minimizes_loss",
    {
      leadingCard: `${leadingCard.rank}${leadingCard.suit}`,
      selectedCard: `${sortedCombos[0].combo.cards[0].rank}${sortedCombos[0].combo.cards[0].suit}`,
      strategy: "minimize_loss",
    },
    "2nd player plays low card when cannot beat opponent",
  );

  return sortedCombos[0].combo.cards;
}

/**
 * Enhanced 2nd Player Trump Response Strategy
 *
 * When 2nd player is void in leading suit, strategically select trump cards
 * based on remaining point potential and opponent void analysis.
 */
export function selectOptimalTrumpResponse(
  comboAnalyses: { combo: Combo; analysis: ComboAnalysis }[],
  context: GameContext,
  trumpInfo: TrumpInfo,
  gameState: GameState,
): Card[] | null {
  const leadingCards = gameState.currentTrick?.plays[0]?.cards;
  if (!leadingCards || leadingCards.length === 0) {
    return null;
  }

  const leadingSuit = leadingCards[0].suit;

  // Only handle non-trump suit leads (when we're void and can trump)
  if (isTrump(leadingCards[0], trumpInfo)) {
    return null;
  }

  // Filter trump combos only
  const trumpCombos = comboAnalyses.filter((ca) => ca.analysis.isTrump);
  if (trumpCombos.length === 0) {
    return null; // No trump cards available
  }

  // Assess remaining point potential in leading suit
  const remainingPointPotential = assessRemainingPointPotential(
    leadingSuit,
    context,
    gameState,
  );

  // Check if next opponents (3rd/4th players) are likely void
  const nextOpponentsVoidProbability = assessNextOpponentsVoidStatus(
    leadingSuit,
    context,
    gameState,
  );

  // Determine trump selection strategy - WHO led the card?
  const leadingPlayerId = gameState.currentTrick?.plays[0]?.playerId;
  const currentPlayerId = gameState.players[gameState.currentPlayerIndex]?.id;
  
  // Team relationships in Tractor:
  // Team A: Human + Bot2, Team B: Bot1 + Bot3
  const isTeammateLeading = 
    (currentPlayerId === PlayerId.Bot1 && leadingPlayerId === PlayerId.Bot3) ||
    (currentPlayerId === PlayerId.Bot2 && leadingPlayerId === PlayerId.Human) ||
    (currentPlayerId === PlayerId.Bot3 && leadingPlayerId === PlayerId.Bot1) ||
    (currentPlayerId === PlayerId.Human && leadingPlayerId === PlayerId.Bot2);

  if (isTeammateLeading) {
    // Teammate leading - support with appropriate trump
    return selectTeammateLeadingTrumpResponse(
      trumpCombos,
      remainingPointPotential,
      nextOpponentsVoidProbability,
      context,
    );
  } else {
    // Opponent leading - strategic trump to beat or minimize damage
    return selectOpponentLeadingTrumpResponse(
      trumpCombos,
      remainingPointPotential,
      nextOpponentsVoidProbability,
      context,
    );
  }
}

/**
 * Assess remaining point potential in the leading suit
 * Uses memory system to estimate points still in play
 */
function assessRemainingPointPotential(
  leadingSuit: Suit,
  context: GameContext,
  gameState: GameState,
): number {
  // Base assessment: typical point cards in suit
  let basePoints = 0;

  // 5s (5 points each), 10s (10 points each), Kings (10 points each)
  // Estimate based on standard deck (2 of each per suit)
  basePoints += 10; // 2 fives = 10 points
  basePoints += 20; // 2 tens = 20 points
  basePoints += 20; // 2 kings = 20 points
  // Total: 50 points per suit in a full deck

  // If memory system is available, use it for more accurate assessment
  if (context.memoryContext?.cardMemory) {
    const playedCards = context.memoryContext.cardMemory.playedCards;

    // Subtract points already played in this suit
    const playedPointsInSuit = playedCards
      .filter((card) => card.suit === leadingSuit)
      .reduce((total, card) => total + (card.points || 0), 0);

    return Math.max(0, basePoints - playedPointsInSuit);
  }

  // Conservative estimate when no memory available
  return Math.floor(basePoints * 0.7); // Assume some points already played
}

/**
 * Assess probability that next opponents (3rd/4th players) are void in suit
 */
function assessNextOpponentsVoidStatus(
  leadingSuit: Suit,
  context: GameContext,
  gameState: GameState,
): number {
  if (!context.memoryContext?.cardMemory) {
    return 0.2; // Default low probability without memory
  }

  const playerMemories = context.memoryContext.cardMemory.playerMemories;
  const currentPlayerIndex = gameState.currentPlayerIndex;

  // Get 3rd and 4th player IDs (next players)
  const thirdPlayerIndex = (currentPlayerIndex + 1) % 4;
  const fourthPlayerIndex = (currentPlayerIndex + 2) % 4;

  const thirdPlayerId = gameState.players[thirdPlayerIndex]?.id;
  const fourthPlayerId = gameState.players[fourthPlayerIndex]?.id;

  let voidCount = 0;
  let totalPlayers = 0;

  if (thirdPlayerId && playerMemories[thirdPlayerId]) {
    totalPlayers++;
    if (playerMemories[thirdPlayerId].suitVoids.has(leadingSuit)) {
      voidCount++;
    }
  }

  if (fourthPlayerId && playerMemories[fourthPlayerId]) {
    totalPlayers++;
    if (playerMemories[fourthPlayerId].suitVoids.has(leadingSuit)) {
      voidCount++;
    }
  }

  return totalPlayers > 0 ? voidCount / totalPlayers : 0.2;
}

/**
 * Select trump response when teammate is leading
 */
function selectTeammateLeadingTrumpResponse(
  trumpCombos: { combo: Combo; analysis: ComboAnalysis }[],
  remainingPointPotential: number,
  nextOpponentsVoidProbability: number,
  context: GameContext,
): Card[] {
  // High remaining points + high opponent void probability = use higher trump
  // to compete for points and force opponents to use valuable trump
  if (remainingPointPotential >= 15 && nextOpponentsVoidProbability >= 0.5) {
    const highTrumpCombos = trumpCombos.filter(
      (ca) => ca.analysis.conservationValue >= 60, // High-value trump
    );

    if (highTrumpCombos.length > 0) {
      gameLogger.debug(
        "second_player_high_trump_support",
        {
          pointPotential: remainingPointPotential,
          voidProbability: nextOpponentsVoidProbability,
          strategy: "high_trump_competition",
        },
        "2nd player uses high trump to compete for valuable trick",
      );

      // Use lowest among high trump (efficient use)
      const sortedHighTrump = highTrumpCombos.sort(
        (a, b) => a.analysis.conservationValue - b.analysis.conservationValue,
      );
      return sortedHighTrump[0].combo.cards;
    }
  }

  // Default: Use medium trump to support teammate
  const sortedTrumpCombos = trumpCombos.sort(
    (a, b) => a.analysis.conservationValue - b.analysis.conservationValue,
  );

  gameLogger.debug(
    "second_player_medium_trump_support",
    {
      pointPotential: remainingPointPotential,
      voidProbability: nextOpponentsVoidProbability,
      strategy: "medium_trump_support",
    },
    "2nd player uses medium trump to support teammate",
  );

  return sortedTrumpCombos[Math.floor(sortedTrumpCombos.length / 2)].combo
    .cards;
}

/**
 * Select trump response when opponent is leading
 */
function selectOpponentLeadingTrumpResponse(
  trumpCombos: { combo: Combo; analysis: ComboAnalysis }[],
  remainingPointPotential: number,
  nextOpponentsVoidProbability: number,
  context: GameContext,
): Card[] {
  // High remaining points = worth competing with higher trump
  if (remainingPointPotential >= 20) {
    const mediumTrumpCombos = trumpCombos.filter(
      (ca) =>
        ca.analysis.conservationValue >= 40 &&
        ca.analysis.conservationValue < 80,
    );

    if (mediumTrumpCombos.length > 0) {
      gameLogger.debug(
        "second_player_trump_competition",
        {
          pointPotential: remainingPointPotential,
          voidProbability: nextOpponentsVoidProbability,
          strategy: "medium_trump_competition",
        },
        "2nd player competes with medium trump for valuable trick",
      );

      // Use lowest among medium trump
      const sortedMediumTrump = mediumTrumpCombos.sort(
        (a, b) => a.analysis.conservationValue - b.analysis.conservationValue,
      );
      return sortedMediumTrump[0].combo.cards;
    }
  }

  // Low points or high opponent void probability = use low trump
  const sortedTrumpCombos = trumpCombos.sort(
    (a, b) => a.analysis.conservationValue - b.analysis.conservationValue,
  );

  gameLogger.debug(
    "second_player_low_trump_block",
    {
      pointPotential: remainingPointPotential,
      voidProbability: nextOpponentsVoidProbability,
      strategy: "low_trump_conservation",
    },
    "2nd player uses low trump to conserve valuable cards",
  );

  return sortedTrumpCombos[0].combo.cards;
}
