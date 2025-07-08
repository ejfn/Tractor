import { Card, GameState } from "../../types";
import { gameLogger } from "../../utils/gameLogger";
import { detectCandidateLeads } from "./candidateLeadDetection";
import { collectLeadingContext } from "./leadingContext";
import { scoreAllCandidates } from "./leadingScoring";

/**
 * Leading Strategy - Scoring-based leading logic
 *
 * Implements a unified scoring-based leading strategy that evaluates
 * all possible candidate leads and selects the highest scoring option.
 */

/**
 * SCORING-BASED LEADING STRATEGY
 * Main entry point for all leading play decisions
 */
export function selectLeadingPlay(gameState: GameState): Card[] {
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  if (!currentPlayer) {
    throw new Error("No current player found");
  }

  const trumpInfo = gameState.trumpInfo;

  // 1. Detect all possible candidate leads
  const candidates = detectCandidateLeads(
    currentPlayer.hand,
    gameState,
    currentPlayer.id,
    trumpInfo,
  );

  if (candidates.length === 0) {
    // Fallback: select first card from hand
    gameLogger.warn("no_candidate_leads_found", {
      player: currentPlayer.id,
      handSize: currentPlayer.hand.length,
      message: "No candidate leads found, using fallback strategy",
    });
    return currentPlayer.hand.length > 0 ? [currentPlayer.hand[0]] : [];
  }

  // 2. Collect leading context for scoring
  const context = collectLeadingContext(gameState, currentPlayer.id);

  // 3. Score all candidates and get best option
  const scoredCandidates = scoreAllCandidates(candidates, trumpInfo, context);
  const bestCandidate = scoredCandidates[0];

  // 4. Log decision for analysis
  gameLogger.debug("ai_leading_decision", {
    decisionPoint: "scoring_based_leading",
    player: currentPlayer.id,
    decision: bestCandidate.candidate.cards,
    score: bestCandidate.result.score,
    reasoning: bestCandidate.result.reasoning,
    context: {
      totalCandidates: candidates.length,
      topScores: scoredCandidates.slice(0, 3).map((sc) => ({
        score: sc.result.score,
        type: sc.candidate.type,
        cards: sc.candidate.cards.length,
      })),
    },
  });

  return bestCandidate.candidate.cards;
}
