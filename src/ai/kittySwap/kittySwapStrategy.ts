import {
  Card,
  GameState,
  PlayerId,
  TrumpInfo,
  GamePhase,
  ComboStrength,
} from "../../types";
import { isTrump, calculateCardStrategicValue } from "../../game/gameLogic";

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

  if (player.hand.length !== 33) {
    throw new Error(
      `AI kitty swap: expected 33 cards (25 + 8 kitty), got ${player.hand.length}`,
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
  trumpConservationValue: number; // Trump hierarchy-based value
  comboStrengthProfile: ComboStrength[]; // Strength analysis of all combos
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
    ([suit, cards]) => analyzeSuitForElimination(suit, cards, trumpInfo),
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
 * Analyzes a suit to determine elimination vs preservation value with trump-strength awareness
 */
function analyzeSuitForElimination(
  suit: string,
  cards: Card[],
  trumpInfo: TrumpInfo,
): SuitAnalysis {
  const hasAce = cards.some((card) => card.rank === "A");
  const hasKing = cards.some((card) => card.rank === "K");

  // Find pairs and tractors
  const pairs = findPairs(cards);
  const tractors = findTractors(pairs);

  // ENHANCED: Calculate trump conservation value using proper hierarchy
  const trumpConservationValue = calculateTrumpConservationValueForCards(
    cards,
    trumpInfo,
  );

  // ENHANCED: Analyze combo strength profile for strategic decisions
  const comboStrengthProfile = analyzeComboStrengthProfile(
    cards,
    pairs,
    tractors,
    trumpInfo,
  );

  // Calculate elimination score (higher = better to eliminate)
  let eliminationScore = 0;

  // Favor eliminating short suits
  if (cards.length <= 3) eliminationScore += 50;
  else if (cards.length <= 5) eliminationScore += 30;
  else if (cards.length <= 7) eliminationScore += 10;

  // ENHANCED: Trump-aware penalty adjustments
  // For trump cards, use conservation hierarchy instead of flat penalties
  const isTrumpSuit = cards.some((card) => isTrump(card, trumpInfo));
  if (isTrumpSuit) {
    // Trump suit penalty based on conservation value rather than count
    eliminationScore -= Math.min(80, trumpConservationValue * 0.5);
  } else {
    // Non-trump penalties
    if (hasAce) eliminationScore -= 40; // Aces are very valuable for leading
    if (hasKing) eliminationScore -= 25; // Kings are strong leaders
    eliminationScore -= pairs.length * 20; // Pairs are valuable
    eliminationScore -= tractors.length * 35; // Tractors are extremely valuable
  }

  // ENHANCED: Strategic pair preservation logic
  const criticalCombos = comboStrengthProfile.filter(
    (s) => s === ComboStrength.Critical,
  ).length;
  const strongCombos = comboStrengthProfile.filter(
    (s) => s === ComboStrength.Strong,
  ).length;

  // Strategic pair inclusion logic - similar to point card strategy
  const { smallPairs, valuablePairs } = categorizePairs(pairs);

  // Small pairs (value < 5) can be included when elimination benefit outweighs cost
  eliminationScore -= smallPairs.length * 15; // Moderate penalty for small pairs

  // Valuable pairs (Aces, Kings, point cards) heavily penalized
  eliminationScore -= valuablePairs.length * 50; // Strong penalty for valuable pairs

  // Extra protection for Aces and Kings specifically
  if (hasAce) eliminationScore -= 60; // Aces are extremely valuable for leading
  if (hasKing) eliminationScore -= 40; // Kings are very valuable for leading

  // Extra penalty for suits with multiple pairs (potential tractors)
  const suitPairCounts: { [suit: string]: number } = {};
  pairs.forEach((pair) => {
    const suit = pair[0].suit!;
    suitPairCounts[suit] = (suitPairCounts[suit] || 0) + 1;
  });
  Object.values(suitPairCounts).forEach((pairCount) => {
    if (pairCount >= 2) {
      eliminationScore -= pairCount * 20; // Multiple pairs in suit are valuable (but allow strategic inclusion)
    }
  });

  eliminationScore -= criticalCombos * 50; // Never eliminate critical combos
  eliminationScore -= strongCombos * 30; // Heavy penalty for strong combos

  // Bonus for weak suits (only low cards)
  const onlyWeakCards = cards.every(
    (card) =>
      card.rank &&
      ["3", "4", "6", "7", "8", "9"].includes(card.rank) &&
      card.points === 0,
  );
  if (onlyWeakCards) eliminationScore += 40;

  // ENHANCED: Weak combo bonus
  const weakCombos = comboStrengthProfile.filter(
    (s) => s === ComboStrength.Weak,
  ).length;
  if (weakCombos === comboStrengthProfile.length && weakCombos > 0) {
    eliminationScore += 25; // Bonus for suits with only weak combos
  }

  // Calculate preservation score (higher = better to preserve)
  let preservationScore = 0;

  // ENHANCED: Trump-aware preservation scoring
  if (isTrumpSuit) {
    preservationScore += trumpConservationValue * 0.3; // Trump value contribution
  } else {
    if (hasAce) preservationScore += 40; // Ace = guaranteed winning lead
    if (hasKing) preservationScore += 25; // King = strong lead
  }

  preservationScore += pairs.length * 20; // Each pair is valuable
  preservationScore += tractors.length * 40; // Tractors are extremely valuable
  if (cards.length >= 6) preservationScore += 15; // Long suits have control value

  // ENHANCED: Combo strength-based preservation bonus
  preservationScore += criticalCombos * 60; // High value for critical combos
  preservationScore += strongCombos * 35; // Good value for strong combos

  // ENHANCED: Trump-aware elimination candidate determination
  const isEliminationCandidate =
    eliminationScore > preservationScore &&
    eliminationScore > 20 && // Must have significant elimination value
    cards.length <= 6 && // Don't eliminate very long suits
    tractors.length === 0 && // Never eliminate suits with tractors
    criticalCombos === 0 && // Never eliminate suits with critical combos
    !hasAce && // Never eliminate suits with Aces
    !hasKing && // Never eliminate suits with Kings
    (!isTrumpSuit || trumpConservationValue <= 20); // Be cautious with trump elimination

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
    trumpConservationValue,
    comboStrengthProfile,
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
        trumpInfo,
      );

    case "CONSERVATIVE":
      return selectStrategicDisposalCards(nonTrumpCards, 8, trumpInfo);

    case "EXCEPTIONAL_TRUMP":
      const needed = 8 - nonTrumpCards.length;
      const weakestTrumps = selectStrategicDisposalCards(
        trumpCards,
        needed,
        trumpInfo,
      );
      return [...nonTrumpCards, ...weakestTrumps];

    default:
      return selectStrategicDisposalCards(nonTrumpCards, 8, trumpInfo);
  }
}

/**
 * Executes suit elimination strategy with trump-strength awareness
 */
function executeSuitEliminationStrategy(
  eliminationCandidates: SuitAnalysis[],
  nonTrumpCards: Card[],
  trumpInfo: TrumpInfo,
): Card[] {
  const cardsToSwap: Card[] = [];

  // Eliminate suits completely, prioritizing best elimination candidates
  for (const candidate of eliminationCandidates) {
    if (cardsToSwap.length + candidate.cards.length <= 8) {
      cardsToSwap.push(...candidate.cards);
    }
  }

  // Fill remaining slots with strategically weakest cards from remaining suits
  // BUT: Never include Aces, Kings, or valuable cards in suit elimination strategy
  if (cardsToSwap.length < 8) {
    const remainingCards = nonTrumpCards.filter(
      (card) => !cardsToSwap.includes(card),
    );

    // For suit elimination strategy, only include truly weak remaining cards
    // Filter out Aces, Kings, and point cards to preserve them for play
    const weakRemainingCards = remainingCards.filter(
      (card) => card.rank !== "A" && card.rank !== "K" && card.points === 0,
    );

    if (weakRemainingCards.length >= 8 - cardsToSwap.length) {
      // We have enough weak cards to complete the selection
      const additionalCards = selectStrategicDisposalCards(
        weakRemainingCards,
        8 - cardsToSwap.length,
        trumpInfo,
      );
      cardsToSwap.push(...additionalCards);
    } else {
      // Not enough weak cards - fall back to conservative strategy instead
      return selectStrategicDisposalCards(nonTrumpCards, 8, trumpInfo);
    }
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
 * ENHANCED: Calculates trump conservation value for a set of cards using proper hierarchy
 */
function calculateTrumpConservationValueForCards(
  cards: Card[],
  trumpInfo: TrumpInfo,
): number {
  let totalValue = 0;
  for (const card of cards) {
    if (isTrump(card, trumpInfo)) {
      totalValue += calculateCardStrategicValue(
        card,
        trumpInfo,
        "conservation",
      );
    }
  }
  return totalValue;
}

/**
 * ENHANCED: Analyzes combo strength profile for strategic disposal decisions
 */
function analyzeComboStrengthProfile(
  cards: Card[],
  pairs: Card[][],
  tractors: Card[][],
  trumpInfo: TrumpInfo,
): ComboStrength[] {
  const strengthProfile: ComboStrength[] = [];

  // Simplified combo strength analysis without full game context
  const analyzeCardStrength = (card: Card): ComboStrength => {
    const isTrumpCard = isTrump(card, trumpInfo);
    const conservationValue = isTrumpCard
      ? calculateCardStrategicValue(card, trumpInfo, "conservation")
      : card.points > 0
        ? 30
        : 10;

    // Determine strength based on conservation value and trump status
    if (isTrumpCard && conservationValue >= 80) {
      return ComboStrength.Critical; // High-value trump (Big Joker, Small Joker, Trump rank in trump suit)
    } else if (isTrumpCard && conservationValue >= 40) {
      return ComboStrength.Strong; // Mid-value trump (Trump suit high cards)
    } else if (card.rank === "A" || card.rank === "K") {
      return ComboStrength.Strong; // High non-trump cards
    } else if (card.points > 0) {
      return ComboStrength.Medium; // Point cards
    } else {
      return ComboStrength.Weak; // Low value cards
    }
  };

  // Analyze singles
  for (const card of cards) {
    strengthProfile.push(analyzeCardStrength(card));
  }

  // Analyze pairs - pairs are generally stronger than singles
  for (const pair of pairs) {
    const baseStrength = analyzeCardStrength(pair[0]);
    // Upgrade strength for pairs
    if (baseStrength === ComboStrength.Weak) {
      strengthProfile.push(ComboStrength.Medium);
    } else if (baseStrength === ComboStrength.Medium) {
      strengthProfile.push(ComboStrength.Strong);
    } else {
      strengthProfile.push(ComboStrength.Critical);
    }
  }

  // Analyze tractors - tractors are very strong
  for (const tractor of tractors) {
    const baseStrength = analyzeCardStrength(tractor[0]);
    // Tractors are always at least Strong
    if (
      baseStrength === ComboStrength.Weak ||
      baseStrength === ComboStrength.Medium
    ) {
      strengthProfile.push(ComboStrength.Strong);
    } else {
      strengthProfile.push(ComboStrength.Critical);
    }
  }

  return strengthProfile;
}

/**
 * ENHANCED: Strategic disposal using ComboStrength-based prioritization - preserve pairs
 */
function selectStrategicDisposalCards(
  cards: Card[],
  count: number,
  trumpInfo: TrumpInfo,
): Card[] {
  // Avoid breaking up pairs - prefer singles for disposal
  return selectPairPreservingDisposal(cards, count, trumpInfo);
}

/**
 * Categorizes pairs into small pairs (suitable for strategic inclusion) and valuable pairs (preserve)
 */
function categorizePairs(pairs: Card[][]): {
  smallPairs: Card[][];
  valuablePairs: Card[][];
} {
  const smallPairs: Card[][] = [];
  const valuablePairs: Card[][] = [];

  pairs.forEach((pair) => {
    const card = pair[0];
    const isValuable =
      card.rank === "A" || // Aces are always valuable
      card.rank === "K" || // Kings are always valuable
      card.points > 0 || // Point cards (5s, 10s, Kings) are valuable
      card.rank === "Q" ||
      card.rank === "J"; // Face cards are moderately valuable

    if (isValuable) {
      valuablePairs.push(pair);
    } else {
      smallPairs.push(pair); // 3, 4, 6, 7, 8, 9 pairs
    }
  });

  return { smallPairs, valuablePairs };
}

/**
 * Enhanced pair-preserving disposal with strategic small pair inclusion
 */
function selectPairPreservingDisposal(
  cards: Card[],
  count: number,
  trumpInfo: TrumpInfo,
): Card[] {
  const pairs = findPairs(cards);
  const { smallPairs, valuablePairs } = categorizePairs(pairs);

  // For trump-only disposal, use conservation hierarchy instead of pair-preserving logic
  const allTrump = cards.every((card) => isTrump(card, trumpInfo));
  if (allTrump) {
    const sortedByConservation = cards
      .map((card) => ({
        card,
        value: calculateCardStrategicValue(card, trumpInfo, "conservation"),
      }))
      .sort((a, b) => a.value - b.value); // Weakest first

    return sortedByConservation.slice(0, count).map((item) => item.card);
  }

  // Calculate suit elimination benefit
  const suitAnalysis = analyzeSuitForElimination("temp", cards, trumpInfo);
  const hasHighEliminationScore = suitAnalysis.eliminationScore > 40;

  const selectedCards: Card[] = [];

  // Strategy 1: Strategic small pair inclusion when elimination benefit is high
  if (hasHighEliminationScore && smallPairs.length > 0) {
    // Include small pairs when elimination benefit clearly outweighs conservation cost
    const pairsToInclude = Math.min(
      Math.floor((count - 2) / 2), // Leave room for other cards, need even slots for pairs
      smallPairs.length,
      2, // Maximum 2 small pairs to include
    );

    if (pairsToInclude > 0) {
      // Sort small pairs by rank (weakest first: 3s before 4s before 6s, etc.)
      const rankOrder = ["3", "4", "6", "7", "8", "9"];
      const sortedSmallPairs = smallPairs.sort((a, b) => {
        const aIndex = rankOrder.indexOf(a[0].rank!);
        const bIndex = rankOrder.indexOf(b[0].rank!);
        return aIndex - bIndex;
      });

      // Include weakest small pairs
      for (let i = 0; i < pairsToInclude; i++) {
        selectedCards.push(...sortedSmallPairs[i]);
      }
    }
  }

  // Strategy 2: Fill remaining slots avoiding valuable pairs
  if (selectedCards.length < count) {
    const pairCards = new Set(pairs.flat().map((card) => card.id));
    const remainingCards = cards.filter(
      (card) => !selectedCards.some((sc) => sc.id === card.id),
    );

    // Separate singles from remaining pair cards
    const singleCards = remainingCards.filter(
      (card) => !pairCards.has(card.id),
    );
    const remainingPairCards = remainingCards.filter((card) =>
      pairCards.has(card.id),
    );

    // Prefer singles first, but avoid high-value cards
    if (singleCards.length > 0) {
      const singleAnalyses = singleCards.map((card) => {
        const conservationValue = calculateCardStrategicValue(
          card,
          trumpInfo,
          "strategic",
        );

        // Extra penalty for high-value cards to ensure they're preserved
        // BUT: Only apply to non-trump cards - trump cards use proper conservation hierarchy
        let adjustedValue = conservationValue;
        if (!isTrump(card, trumpInfo)) {
          if (card.rank === "A") adjustedValue += 1000; // Aces never selected
          if (card.rank === "K") adjustedValue += 800; // Kings never selected
          if (card.points > 0) adjustedValue += 200; // Point cards strongly preserved
        }

        return { card, conservationValue: adjustedValue };
      });

      const sortedSingles = singleAnalyses.sort(
        (a, b) => a.conservationValue - b.conservationValue,
      );
      const singlesNeeded = Math.min(
        count - selectedCards.length,
        sortedSingles.length,
      );

      selectedCards.push(
        ...sortedSingles.slice(0, singlesNeeded).map((item) => item.card),
      );
    }

    // Only break up pairs as last resort (and prefer small pairs over valuable pairs)
    if (selectedCards.length < count && remainingPairCards.length > 0) {
      const pairAnalyses = remainingPairCards.map((card) => {
        const isFromValuablePair = valuablePairs.some((pair) =>
          pair.some((pc) => pc.id === card.id),
        );
        const conservationValue = calculateCardStrategicValue(
          card,
          trumpInfo,
          "strategic",
        );
        return {
          card,
          conservationValue,
          isValuable: isFromValuablePair,
        };
      });

      // Sort: small pair cards first, then by conservation value
      const sortedPairCards = pairAnalyses.sort((a, b) => {
        if (a.isValuable !== b.isValuable) {
          return a.isValuable ? 1 : -1; // Small pairs first
        }
        return a.conservationValue - b.conservationValue;
      });

      const remainingNeeded = count - selectedCards.length;
      selectedCards.push(
        ...sortedPairCards.slice(0, remainingNeeded).map((item) => item.card),
      );
    }
  }

  return selectedCards.slice(0, count);
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
