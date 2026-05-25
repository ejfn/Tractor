import { Card, GameState, PlayerId, Rank } from "../../types";
import { gameLogger } from "../../utils/gameLogger";
import { getLLMConfig, isLLMEnabled } from "./llmConfig";
import { callOpenRouter, ChatMessage } from "./llmAIClient";
import { buildLLMUserPrompt, LLMEngagementContext } from "./llmGamePrompt";
import { getPlayValidationError } from "../../game/playValidation";
import { makeAIPlay } from "../aiStrategy";
import { sortCards } from "../../utils/cardSorting";
import { isTrump } from "../../game/cardValue";
import { createGameContext } from "../aiGameContext";
import { detectCandidateLeads } from "../leading/candidateLeadDetection";
import { collectLeadingContext } from "../leading/leadingContext";
import { scoreNonTrumpLead, scoreTrumpLead } from "../leading/leadingScoring";
import { analyzeSuitAvailability } from "../following/suitAvailabilityAnalysis";

// Telemetry metrics tracking
let llmTotalPlaysRequested = 0;
let llmSuccessfulPlays = 0;
let llmAPIErrorFallbacks = 0;
let llmInvalidCardRetries = 0;
let llmInvalidCardFallbacks = 0;

export interface LLMTelemetryStats {
  totalPlaysRequested: number;
  successfulPlays: number;
  apiErrorFallbacks: number;
  invalidCardRetries: number;
  invalidCardFallbacks: number;
  successRate: number;
  fallbackRate: number;
}

/**
 * Retrieve LLM telemetry statistics.
 */
export function getLLMFallbackStats(): LLMTelemetryStats {
  const totalRequests = llmTotalPlaysRequested;
  const successRate =
    totalRequests > 0 ? (llmSuccessfulPlays / totalRequests) * 100 : 0;
  const totalFallbacks = llmAPIErrorFallbacks + llmInvalidCardFallbacks;
  const fallbackRate =
    totalRequests > 0 ? (totalFallbacks / totalRequests) * 100 : 0;

  return {
    totalPlaysRequested: llmTotalPlaysRequested,
    successfulPlays: llmSuccessfulPlays,
    apiErrorFallbacks: llmAPIErrorFallbacks,
    invalidCardRetries: llmInvalidCardRetries,
    invalidCardFallbacks: llmInvalidCardFallbacks,
    successRate,
    fallbackRate,
  };
}

/**
 * Reset LLM telemetry statistics.
 */
export function resetLLMStats(): void {
  llmTotalPlaysRequested = 0;
  llmSuccessfulPlays = 0;
  llmAPIErrorFallbacks = 0;
  llmInvalidCardRetries = 0;
  llmInvalidCardFallbacks = 0;
}

/**
 * Strategic coordinator for asynchronous LLM play.
 * Uses Adaptive Engagement: skips LLM if decisions are obvious/clear,
 * and passes targeted strategic context if decisions are ambiguous.
 */
export async function selectLLMPlayAsync(
  gameState: GameState,
  playerId: PlayerId,
): Promise<Card[]> {
  const player = gameState.players.find((p) => p.id === playerId);
  if (!player) {
    throw new Error(`Player with ID ${playerId} not found`);
  }

  // 1. If LLM is not enabled, immediately bypass and run rule-based AI
  if (!isLLMEnabled()) {
    return makeAIPlay(gameState, player);
  }

  // Check if LLM is applied to this specific player
  const config = getLLMConfig();
  if (config.applyToPlayers && !config.applyToPlayers.includes(playerId)) {
    return makeAIPlay(gameState, player);
  }

  // 2. Perform Adaptive Engagement checks to determine if the play is a Clear Decision
  const { currentTrick, trumpInfo } = gameState;
  const isLeading = !currentTrick || currentTrick.plays.length === 0;

  let isClearDecision = false;
  let clearDecisionPlay: Card[] = [];
  let engagementContext: LLMEngagementContext | undefined = undefined;

  const context = createGameContext(gameState, playerId);

  if (isLeading) {
    const candidates = detectCandidateLeads(
      player.hand,
      gameState,
      playerId,
      trumpInfo,
    );
    if (candidates.length === 0) {
      isClearDecision = true;
      clearDecisionPlay = player.hand.length > 0 ? [player.hand[0]] : [];
    } else {
      const leadingContext = collectLeadingContext(gameState, playerId);

      const nonTrumpCandidates = candidates
        .filter((c) => !c.metadata.isTrump)
        .map((candidate) => ({
          candidate,
          result: scoreNonTrumpLead(candidate, trumpInfo, leadingContext),
        }))
        .sort((a, b) => b.result.score - a.result.score);

      const trumpCandidates = candidates
        .filter((c) => c.metadata.isTrump)
        .map((candidate) => ({
          candidate,
          result: scoreTrumpLead(candidate, trumpInfo, leadingContext),
        }))
        .sort((a, b) => b.result.score - a.result.score);

      const bestNonTrump =
        nonTrumpCandidates.length > 0 ? nonTrumpCandidates[0] : null;
      const bestTrump = trumpCandidates.length > 0 ? trumpCandidates[0] : null;
      const bestOverall =
        bestNonTrump && bestTrump
          ? bestNonTrump.result.score >= bestTrump.result.score
            ? bestNonTrump
            : bestTrump
          : bestNonTrump || bestTrump;

      if (bestOverall) {
        const isRoundStart = gameState.tricks.length < 3;
        const isHighAce = bestOverall.candidate.cards.some(
          (card) =>
            (card.rank === Rank.Ace && trumpInfo.trumpRank !== Rank.Ace) ||
            (card.rank === Rank.King && trumpInfo.trumpRank === Rank.Ace),
        );

        // Shortcut 1: Aces led at round start
        if (
          isRoundStart &&
          isHighAce &&
          !bestOverall.candidate.metadata.isTrump
        ) {
          isClearDecision = true;
          clearDecisionPlay = bestOverall.candidate.cards;
          gameLogger.info("llm_adaptive_shortcut_lead_ace", {
            playerId,
            play: clearDecisionPlay.map((c) => c.toString()),
          });
        }
        // Shortcut 2: High confident winning combo (unbeatable)
        else if (bestOverall.candidate.metadata.isUnbeatable) {
          isClearDecision = true;
          clearDecisionPlay = bestOverall.candidate.cards;
          gameLogger.info("llm_adaptive_shortcut_lead_unbeatable", {
            playerId,
            play: clearDecisionPlay.map((c) => c.toString()),
          });
        }
        // Ambiguous Lead: engage LLM with candidates list
        else {
          const allOptionsStr = candidates
            .map((c, idx) => {
              const score = c.metadata.isTrump
                ? scoreTrumpLead(c, trumpInfo, leadingContext).score
                : scoreNonTrumpLead(c, trumpInfo, leadingContext).score;
              return `Option L${idx + 1}: Play ${c.cards.map((card) => card.toString()).join(", ")} (Score: ${score})`;
            })
            .join("\n");

          engagementContext = {
            dilemma:
              "We need to choose which suit or combination to lead. We want to secure the lead, pressure opponents, avoid leading under opponents' voids, and avoid wasting point cards prematurely.",
            specificHelp: `Evaluate our lead candidates. Help us choose the optimal leading play. Recommend the best option and explain your reasoning.\n\nCandidates evaluated by rule-based engine:\n${allOptionsStr}`,
          };
        }
      } else {
        isClearDecision = true;
        clearDecisionPlay = player.hand.length > 0 ? [player.hand[0]] : [];
      }
    }
  } else {
    // Following play
    const leadingPlay = currentTrick.plays[0];
    const leadingCards = leadingPlay.cards;
    const analysis = analyzeSuitAvailability(
      leadingCards,
      player.hand,
      trumpInfo,
    );

    // Shortcut 1: Hand size <= required
    if (player.hand.length <= leadingCards.length) {
      isClearDecision = true;
      clearDecisionPlay = player.hand;
      gameLogger.info("llm_adaptive_shortcut_follow_hand_size", {
        playerId,
        play: clearDecisionPlay.map((c) => c.toString()),
      });
    }
    // Shortcut 2: Exactly enough same-suit cards to follow (no card choices)
    else if (
      analysis.remainingCards &&
      analysis.remainingCards.length === analysis.requiredLength
    ) {
      isClearDecision = true;
      clearDecisionPlay = analysis.remainingCards;
      gameLogger.info("llm_adaptive_shortcut_follow_forced_suit", {
        playerId,
        play: clearDecisionPlay.map((c) => c.toString()),
      });
    }
    // Shortcut 3: Only 1 valid combo choice
    else if (
      analysis.scenario === "valid_combos" &&
      analysis.validCombos &&
      analysis.validCombos.length === 1
    ) {
      isClearDecision = true;
      clearDecisionPlay = analysis.validCombos[0].cards;
      gameLogger.info("llm_adaptive_shortcut_follow_single_combo", {
        playerId,
        play: clearDecisionPlay.map((c) => c.toString()),
      });
    }
    // Ambiguous Following: engage LLM based on scenarios
    else {
      const trickWinnerAnalysis = context.trickWinnerAnalysis;
      const isTeammateWinning = trickWinnerAnalysis?.isTeammateWinning ?? false;
      const currentWinner = trickWinnerAnalysis?.currentWinner ?? "unknown";
      const trickPoints = trickWinnerAnalysis?.trickPoints ?? 0;

      if (
        analysis.scenario === "void" &&
        player.hand.some((c) => isTrump(c, trumpInfo))
      ) {
        // Engagement Point 1: Trump vs Discard when Void
        engagementContext = {
          dilemma: `We are VOID in the led suit (${leadingCards[0]?.suit || "Trump Group"}). Currently, ${currentWinner} (Teammate Winning: ${isTeammateWinning}) is winning the trick with points: ${trickPoints}. We hold trump cards in our hand and must decide whether to use a trump card to cut (win the trick) or save our trumps and discard a non-trump card.`,
          specificHelp: `Help us decide: Should we TRUMP-IN to win the trick, or should we DISCARD a non-trump card to save our trump cards? If you choose to trump, pick the lowest trump combo that can beat the current winner. If you choose to discard, pick the lowest useless card to discard.`,
        };
      } else if (
        analysis.scenario === "insufficient" ||
        (analysis.scenario === "void" &&
          !player.hand.some((c) => isTrump(c, trumpInfo)))
      ) {
        // Engagement Point 2: Strategic Discard / Feed Points
        engagementContext = {
          dilemma: `We need to DISCARD off-suit cards because we do not have enough cards of the led suit. Currently, ${currentWinner} (Teammate Winning: ${isTeammateWinning}) is winning the trick. There are ${trickPoints} points currently in the trick.`,
          specificHelp: `If our partner is winning the trick safely, we should feed them point cards (5, 10, King) to secure points. If opponents are winning, we should discard our lowest non-point cards to deny them points. Choose which card(s) to discard from our hand.`,
        };
      } else {
        // Engagement Point 3: Choose How to Follow Suit (Multiple options)
        engagementContext = {
          dilemma: `We have multiple cards or combinations of the led suit to follow the trick. Currently, ${currentWinner} (Teammate Winning: ${isTeammateWinning}) is winning the trick. We need to decide whether to play high cards to try to win/beat opponents, or play low/preserve our pairs or tractors.`,
          specificHelp: `Decide how to follow suit: Should we play high cards to compete and beat opponents, or play low to preserve our high cards and active combinations? Select the optimal cards from our relevant cards list.`,
        };
      }
    }
  }

  // 3. If a Clear Decision was identified, play it immediately and skip the LLM call!
  if (isClearDecision) {
    return clearDecisionPlay;
  }

  // Track start of LLM decision
  llmTotalPlaysRequested++;

  const sortedHand = sortCards(player.hand, gameState.trumpInfo);

  // Self-Correction Retry Loop (up to 3 tries total: 1 initial attempt + 2 retries)
  const maxAttempts = 3;
  let attempt = 0;
  let errorHint = "";

  while (attempt < maxAttempts) {
    attempt++;
    try {
      // ALWAYS generate a fresh, flat user prompt from scratch - no message chain accumulation!
      const prompt = buildLLMUserPrompt(
        gameState,
        playerId,
        player.hand,
        engagementContext,
      );

      let userPromptContent = prompt.user;
      if (errorHint) {
        userPromptContent += `\n\n=== RETRY NOTIFICATION ===\nYour previous selection was invalid because: ${errorHint}\nPlease select a valid play, outputting strictly the JSON format.`;
      }

      const messages: ChatMessage[] = [
        { role: "system", content: prompt.system },
        { role: "user", content: userPromptContent },
      ];

      // Call LLM API
      const responseText = await callOpenRouter(
        config.apiKey,
        config.model,
        config.apiUrl,
        messages,
        config.timeoutMs,
      );

      // Clean response (sometimes LLMs wrapping response in ```json ... ```)
      let cleanedJson = responseText.trim();
      const codeBlockMatch = cleanedJson.match(/^```json\s*([\s\S]*?)\s*```$/);
      if (codeBlockMatch) {
        cleanedJson = codeBlockMatch[1].trim();
      }

      let parsed: { reasoning?: string; play?: string[] };
      try {
        parsed = JSON.parse(cleanedJson);
      } catch (parseError) {
        gameLogger.warn("llm_json_parse_failed", {
          playerId,
          attempt,
          rawResponse: responseText,
          error:
            parseError instanceof Error
              ? parseError.message
              : String(parseError),
        });

        errorHint =
          'Failed to parse your response as JSON. Please ensure your play selection strictly follows JSON formatting. Example: { "reasoning": "explanation", "play": ["c1"] }';
        llmInvalidCardRetries++;
        continue;
      }

      const parsedPlay = parsed?.play;
      if (!Array.isArray(parsedPlay) || parsedPlay.length === 0) {
        gameLogger.warn("llm_invalid_format_keys", { playerId, parsed });
        errorHint =
          "Your response did not contain a valid 'play' array of card IDs (e.g. ['c1', 'c2']). Please select valid card IDs from your hand.";
        llmInvalidCardRetries++;
        continue;
      }

      // Check for duplicate card choice IDs in parsedPlay
      const uniquePlayIds = new Set(
        parsedPlay.map((id) => id.trim().toLowerCase()),
      );
      if (uniquePlayIds.size !== parsedPlay.length) {
        gameLogger.warn("llm_duplicate_choice_ids", {
          playerId,
          parsedPlay,
        });

        errorHint =
          "Your selection contains duplicate card choice IDs (e.g. selecting the same ID 'c1' twice). Each card ID in your play selection must be unique. Please try again with unique card IDs.";
        llmInvalidCardRetries++;
        continue;
      }

      // Map card IDs (e.g., 'c1', 'c2') back to actual Card objects in the hand
      const selectedCards: Card[] = [];
      let mappingFailed = false;

      for (const cardIdSymbol of parsedPlay) {
        const match = cardIdSymbol.trim().match(/^c(\d+)$/);
        if (match) {
          const cardIdx = parseInt(match[1], 10) - 1;
          if (cardIdx >= 0 && cardIdx < sortedHand.length) {
            selectedCards.push(sortedHand[cardIdx]);
          } else {
            mappingFailed = true;
          }
        } else {
          mappingFailed = true;
        }
      }

      if (mappingFailed || selectedCards.length !== parsedPlay.length) {
        gameLogger.warn("llm_card_mapping_failed", {
          playerId,
          parsedPlay,
          handSize: sortedHand.length,
        });

        errorHint = `Some card IDs you selected are invalid or not in your hand. Please select only from the provided list ('c1' to 'c${sortedHand.length}').`;
        llmInvalidCardRetries++;
        continue;
      }

      // Validate the play against the Shengji rule engine
      const errorMsg = getPlayValidationError(
        selectedCards,
        player.hand,
        playerId,
        gameState,
      );

      if (errorMsg === null) {
        // Valid play! Log strategic reasoning and cards
        gameLogger.info("llm_decision_success", {
          playerId,
          reasoning: parsed.reasoning || "No reasoning provided.",
          play: selectedCards.map((c) => c.toString()),
          attempts: attempt,
        });

        llmSuccessfulPlays++;
        return selectedCards;
      } else {
        // Play is invalid! Trigger retry loop
        gameLogger.warn("llm_decision_invalid_rule", {
          playerId,
          attempt,
          invalidPlay: selectedCards.map((c) => c.toString()),
          error: errorMsg,
        });

        errorHint = `Your play was invalid because: ${errorMsg}. Please select a valid combination of cards from your hand that satisfies the trick follow rules.`;
        llmInvalidCardRetries++;
      }
    } catch (apiError) {
      gameLogger.error("llm_api_call_exception", {
        playerId,
        attempt,
        error: apiError instanceof Error ? apiError.message : String(apiError),
      });
      // Immediately abort loop on serious network/API key error and run fallback
      break;
    }
  }

  // If we reach here, either the loop exited on API error or we exhausted all retries
  const isRetryExhaustion = attempt >= maxAttempts;
  if (isRetryExhaustion) {
    llmInvalidCardFallbacks++;
    gameLogger.error("llm_retries_exhausted", {
      playerId,
      maxAttempts,
      message:
        "Exhausted all retries. Falling back to rule-based AI algorithm.",
    });
  } else {
    llmAPIErrorFallbacks++;
    gameLogger.error("llm_fallback_triggered", {
      playerId,
      message: "API error triggered fallback to rule-based AI algorithm.",
    });
  }

  // Gracefully fallback to rule-based AI
  return makeAIPlay(gameState, player);
}
