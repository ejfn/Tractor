import { getRankValue } from "../../game/cardValue";
import { JokerType, TrumpInfo } from "../../types";
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
 * Score a candidate lead with detailed reasoning
 * Non-trump: card rank values, +20 per pair, +30 if unbeatable, void bonuses
 * Trump: -penalty per card, +30 per pair (no unbeatable bonus)
 */
export function scoreCandidateLead(
  candidate: CandidateLead,
  trumpInfo: TrumpInfo,
  context: LeadingContext,
): ScoringResult {
  let score = 0;
  const reasoning: string[] = [];

  if (candidate.metadata.isTrump) {
    const trumpPenalty = candidate.cards.reduce((sum, card) => {
      if (card.joker === JokerType.Big) {
        return sum + 20;
      } else if (card.joker === JokerType.Small) {
        return sum + 19;
      } else if (card.rank === trumpInfo.trumpRank) {
        // Trump rank cards: trump suit = 16, off-suit = 15
        return sum + (card.suit === trumpInfo.trumpSuit ? 16 : 15);
      } else {
        // Regular trump suit cards: use normal rank value
        return sum + getRankValue(card.rank);
      }
    }, 0);

    score -= trumpPenalty;

    reasoning.push(`Trump penalty (-${trumpPenalty}pts)`);
    if (candidate.metadata.totalPairs > 0) {
      const pairScore = candidate.metadata.totalPairs * 30;
      score += pairScore;
      reasoning.push(
        `${candidate.metadata.totalPairs} trump pairs (+${pairScore}pts)`,
      );
    }
  } else {
    // Basic scoring: use card rank values (exclude trump cards)
    const cardScore = candidate.cards.reduce(
      (sum, card) => sum + getRankValue(card.rank),
      0,
    );
    if (cardScore > 0) {
      score += cardScore;
      reasoning.push(`Card rank values (+${cardScore}pts)`);
    }

    // Pair bonuses: +20 for non-trump pairs
    if (candidate.metadata.totalPairs > 0) {
      const pairScore = candidate.metadata.totalPairs * 20;
      score += pairScore;
      reasoning.push(
        `${candidate.metadata.totalPairs} pairs (+${pairScore}pts)`,
      );
    }

    // +50 if unbeatable
    if (candidate.metadata.isUnbeatable) {
      score += 50;
      reasoning.push("Unbeatable (+50pts)");
    }

    // Point card penalty for weak combos (totalPairs < 2)
    if (candidate.metadata.totalPairs < 2 && candidate.metadata.points >= 10) {
      score -= candidate.metadata.points;
      reasoning.push(`Point card penalty (-${candidate.metadata.points}pts)`);

      // Void suit bonuses/penalties
      if (context.opponents.voidSuits.has(candidate.metadata.suit)) {
        score -= candidate.metadata.points * 2;
        reasoning.push(
          `Opponents void in suit (-${candidate.metadata.points * 2}pts)`,
        );
      }

      if (context.teammate.voidSuits.has(candidate.metadata.suit)) {
        score += candidate.metadata.points * 2;
        reasoning.push(
          `Teammate void in suit (+${candidate.metadata.points * 2}pts)`,
        );
      }
    }
  }

  return {
    score,
    reasoning,
  };
}

/**
 * Score all candidates and return sorted results
 */
export function scoreAllCandidates(
  candidates: CandidateLead[],
  trumpInfo: TrumpInfo,
  context: LeadingContext,
): { candidate: CandidateLead; result: ScoringResult }[] {
  const scoredCandidates = candidates.map((candidate) => ({
    candidate,
    result: scoreCandidateLead(candidate, trumpInfo, context),
  }));

  // Sort by score (highest first)
  return scoredCandidates.sort((a, b) => b.result.score - a.result.score);
}
