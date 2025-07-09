import { getRankValue } from "../../game/cardValue";
import { ComboType, JokerType, Rank, TrumpInfo } from "../../types";
import { CandidateLead } from "./candidateLeadDetection";
import { LeadingContext } from "./leadingContext";

/**
 * Scoring result with detailed reasoning
 */
export interface ScoringResult {
  score: number; // Total score (higher = better)
  reasoning: string[]; // Array of scoring reasons
}

/**
 * Score trump lead candidate
 */
export function scoreTrumpLead(
  candidate: CandidateLead,
  trumpInfo: TrumpInfo,
  context: LeadingContext,
): ScoringResult {
  let cardScore = 0;
  const reasoning: string[] = [];

  // Base card scoring with detailed reasoning
  const cardDetails: string[] = [];
  candidate.cards.forEach((card) => {
    let baseScore = 0;
    if (card.joker === JokerType.Big) {
      baseScore = -20;
      cardDetails.push("Big Joker (-20)");
    } else if (card.joker === JokerType.Small) {
      baseScore = -19;
      cardDetails.push("Small Joker (-19)");
    } else if (card.rank === trumpInfo.trumpRank) {
      // Trump rank cards: trump suit = 16, off-suit = 15
      baseScore = card.suit === trumpInfo.trumpSuit ? -16 : -15;
      cardDetails.push(`Trump rank ${card.rank} (${baseScore})`);
    } else if (card.points > 0) {
      baseScore = -20 - card.points; // Point cards have a penalty
      cardDetails.push(`Point card ${card.rank} (${baseScore})`);
    } else {
      // Regular trump suit cards: use normal rank value
      baseScore = -1 * getRankValue(card.rank);
      cardDetails.push(`Trump ${card.rank} (${baseScore})`);
    }
    cardScore += baseScore;
  });

  if (cardDetails.length > 0) {
    reasoning.push(
      `Base trump cards: ${cardDetails.join(", ")} (${cardScore}pts)`,
    );
  }

  // Game stage corrections
  let stageBonus = 0;
  if (context.trumpCardsPlayed > 24) {
    // late stage, promote jokers and ranks
    const promotedCards = candidate.cards.filter(
      (card) =>
        card.joker === JokerType.Big ||
        card.joker === JokerType.Small ||
        card.rank === trumpInfo.trumpRank,
    );
    if (promotedCards.length > 0) {
      stageBonus = promotedCards.length * 10;
      reasoning.push(
        `Late stage promotion: ${promotedCards.length} high cards (+${stageBonus}pts)`,
      );
    }
  } else if (context.trumpCardsPlayed > 12) {
    // midstage, promote ranks
    const rankCards = candidate.cards.filter(
      (card) => card.rank === trumpInfo.trumpRank,
    );
    if (rankCards.length > 0) {
      stageBonus = rankCards.length * 5;
      reasoning.push(
        `Mid stage promotion: ${rankCards.length} rank cards (+${stageBonus}pts)`,
      );
    }
  } else {
    reasoning.push("Early stage: using default values");
  }
  cardScore += stageBonus;

  // Pair bonuses
  if (candidate.metadata.totalPairs > 0) {
    const pairBonus = candidate.metadata.totalPairs * 30;
    cardScore += pairBonus;
    reasoning.push(
      `${candidate.metadata.totalPairs} trump pairs (+${pairBonus}pts)`,
    );

    // Big pair promotion when player has many pairs
    if (context.leadTrumpPairsPlayed + context.playerTrumpPairs >= 3) {
      const hasBigCards = candidate.cards.some(
        (c) =>
          c.joker === JokerType.Big ||
          c.joker === JokerType.Small ||
          c.rank === trumpInfo.trumpRank,
      );
      if (hasBigCards) {
        const bigPairBonus = 15 * candidate.metadata.totalPairs;
        cardScore += bigPairBonus;
        reasoning.push(
          `Big pair promotion: many pairs available (+${bigPairBonus}pts)`,
        );
      }
    }
  }

  return {
    score: cardScore,
    reasoning,
  };
}

/**
 * Score non-trump lead candidate with detailed reasoning
 * Non-trump: card rank values, +20 per pair, +30 if unbeatable, void bonuses
 */
export function scoreNonTrumpLead(
  candidate: CandidateLead,
  trumpInfo: TrumpInfo,
  context: LeadingContext,
): ScoringResult {
  let score = 0;
  const reasoning: string[] = [];

  // Basic scoring: use card rank values (exclude trump cards)
  const cardScore = candidate.cards.reduce(
    (sum, card) => sum + getRankValue(card.rank),
    0,
  );
  if (cardScore > 0) {
    score += cardScore;
    reasoning.push(`Card strength from ranks (+${cardScore}pts)`);
  }

  // Pair bonuses: pairs are harder to beat than singles
  if (candidate.metadata.totalPairs > 0) {
    const pairScore = candidate.metadata.totalPairs * 20;
    score += pairScore;
    reasoning.push(
      `${candidate.metadata.totalPairs} pairs - harder to beat (+${pairScore}pts)`,
    );
  }

  // +50 if contains Ace or King in non-trump suit (high-value cards)
  if (
    candidate.cards.some(
      (card) =>
        (card.rank === Rank.Ace && trumpInfo.trumpRank !== Rank.Ace) ||
        (card.rank === Rank.King && trumpInfo.trumpRank === Rank.Ace),
    )
  ) {
    score += 50;
    reasoning.push("Contains high-value Ace/King (+50pts)");
  }

  // +50 if unbeatable (guaranteed to win trick)
  if (candidate.metadata.isUnbeatable) {
    score += 50;
    reasoning.push("Unbeatable combo (+50pts)");
  }

  // -50 penalty for small multi-combos
  if (
    candidate.type === ComboType.Invalid &&
    score < 80 // Small multi-combo threshold ( <30 without unbeatbale bonus)
  ) {
    score -= 50;
    reasoning.push("Small multi-combo penalty (-50pts)");
  }

  // Point card penalty
  if (candidate.metadata.points >= 10) {
    score -= candidate.metadata.points;
    reasoning.push(`Point card penalty (-${candidate.metadata.points}pts)`);
  }

  // Teammate/Opponent void suit bonus/penalty for small combos
  if (candidate.metadata.totalPairs < 2) {
    if (context.opponents.voidSuits.has(candidate.metadata.suit)) {
      score -= 25;
      reasoning.push(`Opponents void penalty - (-25pts)`);
    }

    if (context.teammate.voidSuits.has(candidate.metadata.suit)) {
      score += 25;
      reasoning.push(`Teammate void bonus - (+25pts)`);
    }
  }

  return {
    score,
    reasoning,
  };
}
