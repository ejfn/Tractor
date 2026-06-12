import { Card, GameState, PlayerId } from "../../types";
import { gameLogger } from "../../utils/gameLogger";
import { getLLMConfig, isLLMEnabled } from "./llmConfig";
import { callOpenRouter, ChatMessage } from "./llmAIClient";
import { buildLLMUserPrompt } from "./llmGamePrompt";
import { getPlayValidationError } from "../../game/playValidation";

/** Log a shortcut event and simulate LLM latency. No-op when LLM is disabled. */
export async function logLLMShortcut(
  event: string,
  playerId: PlayerId,
  cards: Card[],
): Promise<void> {
  if (!isLLMEnabled()) return;
  gameLogger.info(event, { playerId, play: cards.map((c) => c.toString()) });
  await simulateLLMLatency();
}

// Telemetry metrics tracking
let llmTotalPlaysRequested = 0;
let llmSuccessfulPlays = 0;
let llmAPIErrorFallbacks = 0;
let llmInvalidCardRetries = 0;
let llmInvalidCardFallbacks = 0;

// Rolling window of recent LLM call durations (ms) for bypass timing
const ROLLING_WINDOW_SIZE = 10;
const llmCallDurations: number[] = [];

function recordLLMDuration(ms: number): void {
  llmCallDurations.push(ms);
  if (llmCallDurations.length > ROLLING_WINDOW_SIZE) {
    llmCallDurations.shift();
  }
}

function getAverageLLMDuration(): number {
  if (llmCallDurations.length === 0) return 0;
  const sum = llmCallDurations.reduce((a, b) => a + b, 0);
  return sum / llmCallDurations.length;
}

/**
 * When LLM is bypassed (disabled, wrong player, or fallback), sleep for a
 * random duration centered on the rolling average of actual LLM call times.
 * This prevents timing leaks — e.g. an instant response revealing that the
 * AI had only one legal play. Only applies when LLM is enabled.
 */
export async function simulateLLMLatency(): Promise<void> {
  if (!isLLMEnabled()) return;

  const avg = getAverageLLMDuration();
  if (avg === 0) {
    // No LLM calls recorded yet — use a reasonable default centered on the 50%–75% of standard 1–2s (500–1500ms)
    await new Promise((r) => setTimeout(r, 500 + Math.random() * 1000));
    return;
  }

  // Random duration: 50%–75% of the rolling average, clamped to [250ms, 3750ms]
  const jitter = 0.5 + Math.random() * 0.25;
  const delay = Math.max(250, Math.min(3750, Math.round(avg * jitter)));

  gameLogger.debug("llm_bypass_simulated_latency", { avg, delay });
  await new Promise((r) => setTimeout(r, delay));
}

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
 * Core LLM decision helper — called directly from inside strategy functions
 * at genuine ambiguous decision points.
 *
 * Returns the LLM-chosen cards on success, or `fallback` on any failure
 * (API error, invalid JSON, rule-invalid play after retries, or LLM disabled).
 *
 * @param gameState  Current game state (used for prompt building and validation)
 * @param playerId   The player making the decision
 * @param hand       The player's current hand
 * @param fallback   Cards to return if LLM is skipped or fails (the rule-based pick)
 */
export async function callLLMForDecision(
  gameState: GameState,
  playerId: PlayerId,
  hand: Card[],
  fallback: Card[],
): Promise<Card[]> {
  // If LLM is not enabled, immediately return rule-based fallback
  if (!isLLMEnabled()) {
    return fallback;
  }

  // Check if LLM applies to this specific player
  const config = getLLMConfig();
  if (!config.applyToPlayers.includes(playerId)) {
    await simulateLLMLatency();
    return fallback;
  }

  // Track start of LLM decision
  llmTotalPlaysRequested++;
  const decisionStartTime = Date.now();

  // Self-Correction Retry Loop (up to 2 tries: 1 initial attempt + 1 retry)
  const maxAttempts = 2;
  let attempt = 0;
  let errorHint = "";

  while (attempt < maxAttempts) {
    attempt++;
    try {
      // Always build a fresh user prompt — no growing message chain accumulation
      const prompt = buildLLMUserPrompt(gameState, playerId, hand);

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

      // Clean response (LLMs sometimes wrap in ```json ... ```)
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
          'Failed to parse your response as JSON. Please ensure your play selection strictly follows JSON formatting. Example: { "reasoning": "explanation", "play": ["3♣"] }';
        llmInvalidCardRetries++;
        continue;
      }

      const parsedPlay = parsed?.play;
      if (!Array.isArray(parsedPlay) || parsedPlay.length === 0) {
        gameLogger.warn("llm_invalid_format_keys", { playerId, parsed });
        errorHint =
          'Your response did not contain a valid \'play\' array of cards (e.g. ["3♣","3♣"]). Please select cards from your hand using their exact notation.';
        llmInvalidCardRetries++;
        continue;
      }

      // Map the returned card notations (e.g. "3♣", "BJ") back to Card objects,
      // consuming each hand card at most once so a pair like ["8♦","8♦"] maps to both copies.
      const remainingHand = [...hand];
      const selectedCards: Card[] = [];
      let mappingFailed = false;

      for (const token of parsedPlay) {
        const target = token.trim();
        const idx = remainingHand.findIndex((c) => c.toString() === target);
        if (idx === -1) {
          mappingFailed = true;
          break;
        }
        selectedCards.push(remainingHand[idx]);
        remainingHand.splice(idx, 1);
      }

      if (mappingFailed || selectedCards.length !== parsedPlay.length) {
        gameLogger.warn("llm_card_mapping_failed", {
          playerId,
          parsedPlay,
          handSize: hand.length,
        });

        errorHint =
          'Some cards you selected are not in your hand. Select only cards shown in YOUR HAND, using their exact notation (e.g. "3♣", "10♥", "BJ").';
        llmInvalidCardRetries++;
        continue;
      }

      // Validate the play against the Shengji rule engine
      const errorMsg = getPlayValidationError(
        selectedCards,
        hand,
        playerId,
        gameState,
      );

      if (errorMsg === null) {
        // Valid play! Log strategic reasoning and cards
        gameLogger.info("llm_decision_success", {
          playerId,
          reasoning: parsed.reasoning ?? "No reasoning provided.",
          play: selectedCards.map((c) => c.toString()),
          attempts: attempt,
        });

        llmSuccessfulPlays++;
        recordLLMDuration(Date.now() - decisionStartTime);
        return selectedCards;
      } else {
        // Play is invalid — trigger retry loop
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
      // Immediately abort loop on serious network/API error and use fallback
      break;
    }
  }

  // Either the loop exited on API error or we exhausted all retries
  const isRetryExhaustion = attempt >= maxAttempts;
  if (isRetryExhaustion) {
    llmInvalidCardFallbacks++;
    gameLogger.error("llm_retries_exhausted", {
      playerId,
      maxAttempts,
      message: "Exhausted all retries. Falling back to rule-based AI play.",
    });
  } else {
    llmAPIErrorFallbacks++;
    gameLogger.error("llm_fallback_triggered", {
      playerId,
      message: "API error triggered fallback to rule-based AI play.",
    });
  }

  recordLLMDuration(Date.now() - decisionStartTime);
  return fallback;
}
