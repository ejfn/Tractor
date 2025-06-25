import { identifyCombos } from "../../game/comboDetection";
import { calculateCardStrategicValue, isTrump } from "../../game/cardValue";
import {
  Card,
  ComboType,
  GameState,
  PlayerId,
  Rank,
  TrumpInfo,
} from "../../types";

/**
 * AI Kitty Swap Strategy - Simple and Clear Rules
 *
 * Basic Exclusion Rules (NEVER dispose these):
 * 1. No trump cards
 * 2. No biggest cards (Aces and Kings)
 * 3. No tractors
 * 4. No big pairs (rank > 7)
 *
 * Elimination Strategy (when remaining >= 8):
 * - Prefer short suits without high points (10s) or Kings
 * - Trump strength: >14 very strong, >9 strong, <=9 normal
 * - Strong/very strong trump: can consider suits with points
 * - Prioritize: non-point suits > short suits > avoid Kings/10s
 *
 * Strong Hand Strategy (when remaining < 8):
 * - Start with all disposable cards
 * - Add small pairs, then small trump cards strategically
 */

export function selectAIKittySwapCards(
  gameState: GameState,
  playerId: PlayerId,
): Card[] {
  const player = gameState.players.find((p) => p.id === playerId);
  if (!player) {
    throw new Error(`Player not found: ${playerId}`);
  }
  const { disposable, excluded } = applyBasicExclusions(
    player.hand,
    gameState.trumpInfo,
  );

  if (disposable.length >= 8) {
    return selectFromDisposableCards(
      disposable,
      gameState.trumpInfo,
      player.hand,
    );
  } else {
    const selected: Card[] = [...disposable];
    const remaining = 8 - selected.length;

    if (remaining > 0) {
      const fromExclusions = selectFromExclusions(
        excluded,
        gameState.trumpInfo,
        remaining,
      );
      selected.push(...fromExclusions);
    }

    return selected;
  }
}

/**
 * Apply basic exclusion rules and categorize cards
 */
function applyBasicExclusions(
  hand: Card[],
  trumpInfo: TrumpInfo,
): {
  disposable: Card[];
  excluded: Card[];
} {
  const combos = identifyCombos(hand, trumpInfo);
  const pairs = combos.filter((combo) => combo.type === ComboType.Pair);
  const tractors = combos.filter((combo) => combo.type === ComboType.Tractor);

  // Identify excluded cards
  const trumpCards = new Set<string>();
  const biggestCards = new Set<string>();
  const tractorCards = new Set<string>();
  const bigPairCards = new Set<string>();

  // 1. Trump cards
  hand.forEach((card) => {
    if (isTrump(card, trumpInfo)) {
      trumpCards.add(card.id);
    }
  });

  // 2. Biggest cards (always preserve Aces and Kings)
  hand.forEach((card) => {
    if (card.rank === Rank.Ace || card.rank === Rank.King) {
      biggestCards.add(card.id);
    }
  });

  // 3. Tractor cards
  tractors.forEach((tractor) => {
    tractor.cards.forEach((card) => {
      tractorCards.add(card.id);
    });
  });

  // 4. Big pairs (rank >= 5)
  const bigRanks = [
    Rank.Five,
    Rank.Six,
    Rank.Seven,
    Rank.Eight,
    Rank.Nine,
    Rank.Ten,
    Rank.Jack,
    Rank.Queen,
    Rank.King,
    Rank.Ace,
  ];
  pairs.forEach((pair) => {
    if (pair.cards[0].rank && bigRanks.includes(pair.cards[0].rank)) {
      pair.cards.forEach((card) => {
        bigPairCards.add(card.id);
      });
    }
  });

  // Categorize cards
  const disposable: Card[] = [];
  const excluded: Card[] = [];

  hand.forEach((card) => {
    const isExcluded =
      trumpCards.has(card.id) ||
      biggestCards.has(card.id) ||
      tractorCards.has(card.id) ||
      bigPairCards.has(card.id);

    if (isExcluded) {
      excluded.push(card);
    } else {
      disposable.push(card);
    }
  });

  return { disposable, excluded };
}

/**
 * Select 8 cards from disposable cards using intelligent suit elimination strategy
 */
function selectFromDisposableCards(
  disposable: Card[],
  trumpInfo: TrumpInfo,
  entireHand: Card[],
): Card[] {
  // Group by suit for elimination strategy
  const suitGroups: { [suit: string]: Card[] } = {};
  disposable.forEach((card) => {
    if (card.suit) {
      if (!suitGroups[card.suit]) suitGroups[card.suit] = [];
      suitGroups[card.suit].push(card);
    }
  });

  // Evaluate trump strength in ENTIRE hand to determine elimination strategy
  const allTrumpCards = entireHand.filter((card) => isTrump(card, trumpInfo));
  const trumpStrength =
    allTrumpCards.length > 12
      ? "very_strong"
      : allTrumpCards.length > 9
        ? "strong"
        : "normal";

  // Analyze each suit for elimination potential
  const eliminationCandidates: {
    suit: string;
    cards: Card[];
    score: number;
    hasPoints: boolean;
  }[] = [];
  const otherCards: Card[] = [];

  Object.entries(suitGroups).forEach(([suit, cards]) => {
    if (cards.length <= 6) {
      const hasPoints = cards.some((card) => card.points > 0);
      const hasKings = cards.some((card) => card.rank === Rank.King);

      // Calculate elimination score
      let score = 0;

      // Prefer shorter suits
      score += (7 - cards.length) * 10; // Shorter = higher score

      // Penalize point cards (unless trump is strong/very strong)
      if (hasPoints) {
        score -=
          trumpStrength === "very_strong"
            ? 10
            : trumpStrength === "strong"
              ? 25
              : 60; // Less penalty with stronger trump
      }

      // Penalize Kings (even disposable Kings like point Kings)
      if (hasKings) {
        score -=
          trumpStrength === "very_strong"
            ? 5
            : trumpStrength === "strong"
              ? 15
              : 40; // Less penalty with stronger trump
      }

      // Bonus for non-point, non-King suits (ideal elimination targets)
      if (!hasPoints && !hasKings) {
        score += 30;
      }

      eliminationCandidates.push({ suit, cards, score, hasPoints });
    } else {
      otherCards.push(...cards);
    }
  });

  // Sort by elimination score (higher score = better elimination candidate)
  eliminationCandidates.sort((a, b) => b.score - a.score);

  const selected: Card[] = [];

  // Try to eliminate complete suits, prioritizing by score
  for (const candidate of eliminationCandidates) {
    if (selected.length + candidate.cards.length <= 8) {
      selected.push(...candidate.cards);
    } else {
      // If candidate doesn't fit, add its cards back to otherCards pool
      otherCards.push(...candidate.cards);
    }
  }

  // Fill remaining slots with other disposable cards (weakest first)
  if (selected.length < 8) {
    const remaining = otherCards.filter((card) => !selected.includes(card));
    const sortedRemaining = remaining
      .map((card) => ({
        card,
        value: calculateCardStrategicValue(card, trumpInfo, "strategic"),
      }))
      .sort((a, b) => a.value - b.value);

    const needed = 8 - selected.length;
    selected.push(...sortedRemaining.slice(0, needed).map((item) => item.card));
  }

  return selected.slice(0, 8);
}

/**
 * Select cards from exclusions to fill remaining slots
 * Simple approach: sort by strategic value and take the lowest values
 */
function selectFromExclusions(
  excluded: Card[],
  trumpInfo: TrumpInfo,
  needed: number,
): Card[] {
  if (needed <= 0) {
    return [];
  }

  // Sort all excluded cards by strategic value (lowest = least valuable)
  const sortedExcluded = excluded
    .map((card) => ({
      card,
      value: calculateCardStrategicValue(card, trumpInfo, "strategic"),
    }))
    .sort((a, b) => a.value - b.value);

  // Take the needed number of least valuable cards
  return sortedExcluded.slice(0, needed).map((item) => item.card);
}
