import { Card, GameState } from "../../types";
import { gameLogger } from "../../utils/gameLogger";
import { detectCandidateLeads } from "./candidateLeadDetection";
import { collectLeadingContext } from "./leadingContext";
import { scoreNonTrumpLead, scoreTrumpLead } from "./leadingScoring";

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

  // 3. Score all candidates and separate by trump/non-trump
  const nonTrumpCandidates = candidates
    .filter((candidate) => !candidate.metadata.isTrump)
    .map((candidate) => ({
      candidate,
      result: scoreNonTrumpLead(candidate, trumpInfo, context),
    }))
    .sort((a, b) => b.result.score - a.result.score);

  const trumpCandidates = candidates
    .filter((candidate) => candidate.metadata.isTrump)
    .map((candidate) => ({
      candidate,
      result: scoreTrumpLead(candidate, trumpInfo, context),
    }))
    .sort((a, b) => b.result.score - a.result.score);

  const bestNonTrump =
    nonTrumpCandidates.length > 0 ? nonTrumpCandidates[0] : null;
  const bestTrump = trumpCandidates.length > 0 ? trumpCandidates[0] : null;

  // 4. Apply decision logic to select best candidate
  let selectedCandidate = bestNonTrump || bestTrump; // fallback to overall best
  let decisionPath = "overall_best";

  if (bestNonTrump != null && bestTrump != null) {
    // Both trump and non-trump options available
    if (bestNonTrump.result.score >= 20) {
      // Non-trump is good enough
      selectedCandidate = bestNonTrump;
      decisionPath = "non_trump_good";
    } else if (bestTrump.result.score > -10) {
      // Non-trump too low, trump is acceptable
      selectedCandidate = bestTrump;
      decisionPath = "trump_selected";
    } else {
      // Both are poor, use non-trump as fallback
      selectedCandidate = bestNonTrump;
      decisionPath = "non_trump_fallback";
    }
  } else if (bestNonTrump != null) {
    // Only non-trump available
    selectedCandidate = bestNonTrump;
    decisionPath = "non_trump_only";
  } else if (bestTrump != null) {
    // Only trump available
    selectedCandidate = bestTrump;
    decisionPath = "trump_only";
  }

  // 5. Log decision for analysis
  gameLogger.debug("ai_leading_decision", {
    decisionPoint: "scoring_based_leading",
    player: currentPlayer.id,
    decision: selectedCandidate?.candidate.cards,
    score: selectedCandidate?.result.score,
    reasoning: selectedCandidate?.result.reasoning,
    context: {
      totalCandidates: candidates.length,
      decisionPath,
      nonTrumpCount: nonTrumpCandidates.length,
      trumpCount: trumpCandidates.length,
      bestNonTrumpScore: bestNonTrump?.result.score || 0,
      bestTrumpScore: bestTrump?.result.score || 0,
    },
  });

  return selectedCandidate?.candidate.cards || [];
}
