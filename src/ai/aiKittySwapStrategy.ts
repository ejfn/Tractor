import {
  Card,
  GameState,
  PlayerId,
  TrumpInfo,
  GamePhase,
  JokerType,
} from "../types";
import { isTrump } from "../game/gameLogic";

/**
 * Advanced AI Kitty Swap Strategy - Sophisticated approach with suit elimination and strategic analysis
 *
 * Strategic Principles:
 * 1. USUALLY don't put trump cards in kitty, but allow when hands are exceptionally strong:
 *    - Very long trump suit (10+ cards) with strong combinations
 *    - Strong hands in other suits (tractors, big pairs) that shouldn't be sacrificed
 * 2. BALANCE suit elimination vs conservation:
 *    - SUIT ELIMINATION: Empty 1-2 weak suits completely after preserving:
 *      * Aces (guaranteed winning leading plays)
 *      * Kings (strong leading plays in most cases)
 *      * Tractors (powerful combination control)
 *      * Big pairs (strong leading combinations)
 *    - CONSERVATION: Keep valuable cards even if it prevents perfect elimination
 * 3. STRATEGIC DECISION FRAMEWORK:
 *    - High elimination value + low conservation cost = ELIMINATE SUIT
 *    - High conservation value + moderate elimination benefit = WEAKEST FIRST
 *    - Balanced scenario = HYBRID approach (partial elimination + conservation)
 * 4. Strategic point card inclusion only when elimination benefit clearly outweighs conservation cost
 */

/**
 * Advanced AI kitty swap selection with sophisticated suit elimination strategy
 */
export function selectAIKittySwapCards(
  gameState: GameState,
  playerId: PlayerId,
): Card[] {
  const player = gameState.players.find((p) => p.id === playerId);
  if (!player) {
    throw new Error(`Player ${playerId} not found`);
  }

  if (gameState.gamePhase !== GamePhase.KittySwap) {
    throw new Error(`AI kitty swap called during ${gameState.gamePhase} phase`);
  }

  if (player.hand.length !== 25) {
    throw new Error(
      `AI kitty swap: expected 25 cards, got ${player.hand.length}`,
    );
  }

  const { trumpInfo } = gameState;
  const hand = player.hand;

  // Perform comprehensive strategic analysis
  const analysis = analyzeHandForKittySwap(hand, trumpInfo);

  // Execute strategic decision based on analysis
  return executeKittySwapStrategy(analysis, trumpInfo);
}

/**
 * Comprehensive hand analysis for strategic kitty swap decisions
 */
interface HandAnalysis {
  trumpCards: Card[];
  nonTrumpCards: Card[];
  suitAnalyses: SuitAnalysis[];
  eliminationCandidates: SuitAnalysis[];
  strategicRecommendation:
    | "SUIT_ELIMINATION"
    | "CONSERVATIVE"
    | "EXCEPTIONAL_TRUMP";
  isExceptionallyStrong: boolean;
}

interface SuitAnalysis {
  suit: string;
  cards: Card[];
  hasAce: boolean;
  hasKing: boolean;
  pairs: Card[][];
  tractors: Card[][];
  eliminationScore: number; // Higher = better to eliminate
  preservationScore: number; // Higher = better to preserve
  isEliminationCandidate: boolean;
}

/**
 * Analyzes entire hand for strategic kitty swap decisions
 */
function analyzeHandForKittySwap(
  hand: Card[],
  trumpInfo: TrumpInfo,
): HandAnalysis {
  // Separate trump and non-trump cards
  const trumpCards = hand.filter((card) => isTrump(card, trumpInfo));
  const nonTrumpCards = hand.filter((card) => !isTrump(card, trumpInfo));

  // Group non-trump cards by suit
  const suitGroups: { [suit: string]: Card[] } = {};
  nonTrumpCards.forEach((card) => {
    if (card.suit) {
      if (!suitGroups[card.suit]) suitGroups[card.suit] = [];
      suitGroups[card.suit].push(card);
    }
  });

  // Analyze each suit for strategic value
  const suitAnalyses: SuitAnalysis[] = Object.entries(suitGroups).map(
    ([suit, cards]) => analyzeSuitForElimination(suit, cards),
  );

  // Identify elimination candidates
  const eliminationCandidates = suitAnalyses
    .filter((analysis) => analysis.isEliminationCandidate)
    .sort((a, b) => b.eliminationScore - a.eliminationScore);

  // Evaluate exceptional strength for trump inclusion
  const isExceptionallyStrong = evaluateExceptionalStrength(
    trumpCards,
    nonTrumpCards,
    trumpInfo,
  );

  // Determine strategic recommendation
  let strategicRecommendation:
    | "SUIT_ELIMINATION"
    | "CONSERVATIVE"
    | "EXCEPTIONAL_TRUMP";

  if (canExecuteSuitElimination(eliminationCandidates, nonTrumpCards.length)) {
    strategicRecommendation = "SUIT_ELIMINATION";
  } else if (nonTrumpCards.length >= 8) {
    strategicRecommendation = "CONSERVATIVE";
  } else if (isExceptionallyStrong) {
    strategicRecommendation = "EXCEPTIONAL_TRUMP";
  } else {
    strategicRecommendation = "CONSERVATIVE"; // Fallback to conservative approach
  }

  return {
    trumpCards,
    nonTrumpCards,
    suitAnalyses,
    eliminationCandidates,
    strategicRecommendation,
    isExceptionallyStrong,
  };
}

/**
 * Analyzes a suit to determine elimination vs preservation value
 */
function analyzeSuitForElimination(suit: string, cards: Card[]): SuitAnalysis {
  const hasAce = cards.some((card) => card.rank === "A");
  const hasKing = cards.some((card) => card.rank === "K");

  // Find pairs and tractors
  const pairs = findPairs(cards);
  const tractors = findTractors(pairs);

  // Calculate elimination score (higher = better to eliminate)
  let eliminationScore = 0;

  // Favor eliminating short suits
  if (cards.length <= 3) eliminationScore += 50;
  else if (cards.length <= 5) eliminationScore += 30;
  else if (cards.length <= 7) eliminationScore += 10;

  // Penalty for valuable cards
  if (hasAce) eliminationScore -= 40; // Aces are very valuable for leading
  if (hasKing) eliminationScore -= 25; // Kings are strong leaders
  eliminationScore -= pairs.length * 20; // Pairs are valuable
  eliminationScore -= tractors.length * 35; // Tractors are extremely valuable

  // Bonus for weak suits (only low cards)
  const onlyWeakCards = cards.every(
    (card) =>
      card.rank &&
      ["3", "4", "6", "7", "8", "9"].includes(card.rank) &&
      card.points === 0,
  );
  if (onlyWeakCards) eliminationScore += 40;

  // Calculate preservation score (higher = better to preserve)
  let preservationScore = 0;
  if (hasAce) preservationScore += 40; // Ace = guaranteed winning lead
  if (hasKing) preservationScore += 25; // King = strong lead
  preservationScore += pairs.length * 20; // Each pair is valuable
  preservationScore += tractors.length * 40; // Tractors are extremely valuable
  if (cards.length >= 6) preservationScore += 15; // Long suits have control value

  // Determine if this suit is a good elimination candidate
  const isEliminationCandidate =
    eliminationScore > preservationScore &&
    eliminationScore > 20 && // Must have significant elimination value
    cards.length <= 6 && // Don't eliminate very long suits
    tractors.length === 0; // Never eliminate suits with tractors

  return {
    suit,
    cards,
    hasAce,
    hasKing,
    pairs,
    tractors,
    eliminationScore,
    preservationScore,
    isEliminationCandidate,
  };
}

/**
 * Finds pairs in a set of cards
 */
function findPairs(cards: Card[]): Card[][] {
  const rankGroups: { [rank: string]: Card[] } = {};

  cards.forEach((card) => {
    if (card.rank) {
      if (!rankGroups[card.rank]) rankGroups[card.rank] = [];
      rankGroups[card.rank].push(card);
    }
  });

  const pairs: Card[][] = [];
  Object.values(rankGroups).forEach((rankCards) => {
    for (let i = 0; i < rankCards.length - 1; i += 2) {
      pairs.push([rankCards[i], rankCards[i + 1]]);
    }
  });

  return pairs;
}

/**
 * Finds tractors (consecutive pairs) in a set of pairs
 */
function findTractors(pairs: Card[][]): Card[][] {
  if (pairs.length < 2) return [];

  const rankOrder = [
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "J",
    "Q",
    "K",
    "A",
  ];
  const pairsByRank = pairs
    .map((pair) => ({
      rank: pair[0].rank!,
      cards: pair,
      rankIndex: rankOrder.indexOf(pair[0].rank!),
    }))
    .sort((a, b) => a.rankIndex - b.rankIndex);

  const tractors: Card[][] = [];
  let currentTractor: Card[] = [];

  for (let i = 0; i < pairsByRank.length; i++) {
    if (i === 0) {
      currentTractor = [...pairsByRank[i].cards];
    } else if (pairsByRank[i].rankIndex === pairsByRank[i - 1].rankIndex + 1) {
      // Consecutive pair found
      currentTractor.push(...pairsByRank[i].cards);
    } else {
      // Break in sequence
      if (currentTractor.length >= 4) {
        // At least 2 pairs
        tractors.push([...currentTractor]);
      }
      currentTractor = [...pairsByRank[i].cards];
    }
  }

  // Check final tractor
  if (currentTractor.length >= 4) {
    tractors.push(currentTractor);
  }

  return tractors;
}

/**
 * Determines if suit elimination strategy is viable
 */
function canExecuteSuitElimination(
  eliminationCandidates: SuitAnalysis[],
  totalNonTrumpCards: number,
): boolean {
  if (eliminationCandidates.length === 0) return false;

  // Check if we can eliminate 1-2 suits completely within 8 cards
  let cardsNeeded = 0;
  let suitsToEliminate = 0;

  for (const candidate of eliminationCandidates) {
    if (cardsNeeded + candidate.cards.length <= 8) {
      cardsNeeded += candidate.cards.length;
      suitsToEliminate++;

      // Target eliminating 1-2 suits for optimal hand structure
      if (suitsToEliminate >= 1 && cardsNeeded >= 6) {
        return true; // Good elimination opportunity
      }
    } else {
      break;
    }
  }

  return suitsToEliminate >= 1 && cardsNeeded <= 8;
}

/**
 * Executes the strategic kitty swap decision
 */
function executeKittySwapStrategy(
  analysis: HandAnalysis,
  trumpInfo: TrumpInfo,
): Card[] {
  const {
    strategicRecommendation,
    eliminationCandidates,
    nonTrumpCards,
    trumpCards,
  } = analysis;

  switch (strategicRecommendation) {
    case "SUIT_ELIMINATION":
      return executeSuitEliminationStrategy(
        eliminationCandidates,
        nonTrumpCards,
      );

    case "CONSERVATIVE":
      return selectWeakestCards(nonTrumpCards, 8);

    case "EXCEPTIONAL_TRUMP":
      const needed = 8 - nonTrumpCards.length;
      const weakestTrumps = selectWeakestTrumpCards(trumpCards, needed);
      return [...nonTrumpCards, ...weakestTrumps];

    default:
      return selectWeakestCards(nonTrumpCards, 8);
  }
}

/**
 * Executes suit elimination strategy
 */
function executeSuitEliminationStrategy(
  eliminationCandidates: SuitAnalysis[],
  nonTrumpCards: Card[],
): Card[] {
  const cardsToSwap: Card[] = [];

  // Eliminate suits completely, prioritizing best elimination candidates
  for (const candidate of eliminationCandidates) {
    if (cardsToSwap.length + candidate.cards.length <= 8) {
      cardsToSwap.push(...candidate.cards);
    }
  }

  // Fill remaining slots with weakest cards from remaining suits
  if (cardsToSwap.length < 8) {
    const remainingCards = nonTrumpCards.filter(
      (card) => !cardsToSwap.includes(card),
    );
    const additionalCards = selectWeakestCards(
      remainingCards,
      8 - cardsToSwap.length,
    );
    cardsToSwap.push(...additionalCards);
  }

  return cardsToSwap.slice(0, 8);
}

/**
 * Evaluates if hand is exceptionally strong enough to allow trump cards in kitty
 */
function evaluateExceptionalStrength(
  trumpCards: Card[],
  nonTrumpCards: Card[],
  trumpInfo: TrumpInfo,
): boolean {
  // Criterion 1: Very long trump suit (10+ cards) with strong combinations
  if (trumpCards.length >= 10) {
    const trumpPairs = countPairs(trumpCards);
    if (trumpPairs >= 2) return true; // Long trump with multiple pairs
  }

  // Criterion 2: Strong hands in other suits (tractors, big pairs) that shouldn't be sacrificed
  const nonTrumpSuitStrength = evaluateNonTrumpSuitStrength(nonTrumpCards);
  const trumpSuitStrength = trumpCards.length >= 8 ? 1 : 0; // Moderately long trump

  // Exceptional if we have strong non-trump combinations AND decent trump length
  return nonTrumpSuitStrength >= 2 && trumpSuitStrength >= 1;
}

/**
 * Counts pairs in a set of cards
 */
function countPairs(cards: Card[]): number {
  const rankCounts: { [rank: string]: number } = {};

  cards.forEach((card) => {
    if (card.rank) {
      rankCounts[card.rank] = (rankCounts[card.rank] || 0) + 1;
    }
  });

  return Object.values(rankCounts).reduce(
    (pairs, count) => pairs + Math.floor(count / 2),
    0,
  );
}

/**
 * Evaluates strength of non-trump suits (looks for tractors, pairs, high cards)
 */
function evaluateNonTrumpSuitStrength(nonTrumpCards: Card[]): number {
  const suitGroups: { [suit: string]: Card[] } = {};

  // Group by suit
  nonTrumpCards.forEach((card) => {
    if (card.suit) {
      if (!suitGroups[card.suit]) suitGroups[card.suit] = [];
      suitGroups[card.suit].push(card);
    }
  });

  let strengthScore = 0;

  // Evaluate each suit
  Object.values(suitGroups).forEach((suitCards) => {
    const pairs = countPairs(suitCards);
    const hasAce = suitCards.some((card) => card.rank === "A");
    const hasKing = suitCards.some((card) => card.rank === "K");

    // Award points for valuable combinations
    strengthScore += pairs * 0.5; // Each pair adds 0.5 points
    if (hasAce) strengthScore += 0.3;
    if (hasKing) strengthScore += 0.2;

    // Bonus for potential tractors (2+ pairs in same suit)
    if (pairs >= 2) strengthScore += 0.5;

    // Bonus for long suits with good cards
    if (suitCards.length >= 6 && (hasAce || hasKing || pairs >= 1)) {
      strengthScore += 0.3;
    }
  });

  return strengthScore;
}

/**
 * Selects weakest trump cards for strategic inclusion in kitty
 */
function selectWeakestTrumpCards(trumpCards: Card[], count: number): Card[] {
  // Sort trump cards by weakness (using conservation hierarchy in reverse)
  const sortedTrumps = trumpCards.sort((a, b) => {
    // Jokers are never weak - should be last resort
    if (a.joker && !b.joker) return 1;
    if (!a.joker && b.joker) return -1;
    if (a.joker && b.joker) {
      // Between jokers, Big Joker is stronger
      return a.joker === JokerType.Big ? 1 : -1;
    }

    // Among non-jokers, prefer trump suit cards over trump rank cards
    if (a.rank && b.rank && a.suit && b.suit) {
      // Both are trump rank cards in different suits - prefer by suit
      const rankOrder = [
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
        "10",
        "J",
        "Q",
        "K",
        "A",
      ];
      const aRankIndex = rankOrder.indexOf(a.rank);
      const bRankIndex = rankOrder.indexOf(b.rank);
      return aRankIndex - bRankIndex;
    }

    return 0;
  });

  return sortedTrumps.slice(0, count);
}

/**
 * Selects weakest cards from a collection
 */
function selectWeakestCards(cards: Card[], count: number): Card[] {
  const sortedCards = cards.sort((a, b) => {
    // First priority: prefer non-point cards
    if (a.points === 0 && b.points > 0) return -1;
    if (a.points > 0 && b.points === 0) return 1;

    // Second priority: prefer lower point values
    if (a.points !== b.points) return a.points - b.points;

    // Third priority: prefer weaker ranks
    const rankOrder = [
      "3",
      "4",
      "6",
      "7",
      "8",
      "9",
      "J",
      "Q",
      "10",
      "5",
      "K",
      "A",
    ];
    const aIndex = rankOrder.indexOf(a.rank || "A");
    const bIndex = rankOrder.indexOf(b.rank || "A");

    return aIndex - bIndex;
  });

  return sortedCards.slice(0, count);
}

/**
 * Analysis function that provides reasoning
 */
export function getAIKittySwapDecision(
  gameState: GameState,
  playerId: PlayerId,
): {
  cardsToSwap: Card[];
  reasoning: string[];
  handOptimization: {
    suitsEliminated: string[];
    strongSuitsKept: string[];
    combinationsPreserved: number;
  };
} {
  const player = gameState.players.find((p) => p.id === playerId)!;
  const { trumpInfo } = gameState;
  const hand = player.hand;

  const trumpCards = hand.filter((card) => isTrump(card, trumpInfo));
  const nonTrumpCards = hand.filter((card) => !isTrump(card, trumpInfo));
  const isExceptionallyStrong = evaluateExceptionalStrength(
    trumpCards,
    nonTrumpCards,
    trumpInfo,
  );

  const cardsToSwap = selectAIKittySwapCards(gameState, playerId);

  const trumpCardsInKitty = cardsToSwap.filter((card) =>
    isTrump(card, trumpInfo),
  );
  const pointCards = cardsToSwap.filter((card) => card.points > 0);
  const nonPointCards = cardsToSwap.filter((card) => card.points === 0);

  const reasoning: string[] = [
    `Selected ${nonPointCards.length} non-point cards and ${pointCards.length} point cards`,
    "Used refined strategy: usually avoid trump cards, but allow when hands are exceptionally strong",
  ];

  if (trumpCardsInKitty.length > 0) {
    reasoning.push(
      `Strategically included ${trumpCardsInKitty.length} weak trump cards due to exceptional hand strength`,
    );
    reasoning.push(
      `Hand evaluation: ${trumpCards.length} trump cards, ${nonTrumpCards.length} non-trump cards`,
    );
    if (isExceptionallyStrong) {
      reasoning.push(
        "Exceptional criteria met: very long trump suit OR strong non-trump combinations",
      );
    }
  } else {
    reasoning.push(
      "Preserved all trump cards for play phase (standard strategy)",
    );
  }

  return {
    cardsToSwap,
    reasoning,
    handOptimization: {
      suitsEliminated: [],
      strongSuitsKept: [],
      combinationsPreserved: 0,
    },
  };
}
