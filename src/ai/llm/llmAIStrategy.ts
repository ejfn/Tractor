import { Card, GameState, PlayerId } from "../../types";
import { gameLogger } from "../../utils/gameLogger";
import { getLLMConfig, isLLMEnabled } from "./llmConfig";
import { callOpenRouter, ChatMessage } from "./llmAIClient";
import { buildLLMUserPrompt } from "./llmGamePrompt";
import { getPlayValidationError } from "../../game/playValidation";
import { makeAIPlay } from "../aiStrategy";
import { sortCards } from "../../utils/cardSorting";

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
  const successRate = totalRequests > 0 ? (llmSuccessfulPlays / totalRequests) * 100 : 0;
  const totalFallbacks = llmAPIErrorFallbacks + llmInvalidCardFallbacks;
  const fallbackRate = totalRequests > 0 ? (totalFallbacks / totalRequests) * 100 : 0;

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
 * If LLM is disabled or fails, falls back to rule-based play.
 */
export async function selectLLMPlayAsync(
  gameState: GameState,
  playerId: PlayerId
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

  // Track start of LLM decision
  llmTotalPlaysRequested++;

  const sortedHand = sortCards(player.hand, gameState.trumpInfo);
  const prompt = await buildLLMUserPrompt(gameState, playerId, player.hand);

  const messages: ChatMessage[] = [
    { role: "system", content: prompt.system },
    { role: "user", content: prompt.user },
  ];

  // Self-Correction Retry Loop (up to 3 tries total: 1 initial attempt + 2 retries)
  const maxAttempts = 3;
  let attempt = 0;

  while (attempt < maxAttempts) {
    attempt++;
    try {
      // Call LLM API
      const responseText = await callOpenRouter(
        config.apiKey,
        config.model,
        config.apiUrl,
        messages,
        config.timeoutMs
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
          error: parseError instanceof Error ? parseError.message : String(parseError),
        });

        // Add user retry instruction to messages and try again
        messages.push({ role: "assistant", content: responseText });
        messages.push({
          role: "user",
          content: "Failed to parse your response as JSON. Please ensure your play selection strictly follows JSON formatting. Example format:\n{\n  \"reasoning\": \"English explanation\",\n  \"play\": [\"c1\", \"c2\"]\n}",
        });
        llmInvalidCardRetries++;
        continue;
      }

      const parsedPlay = parsed?.play;
      if (!Array.isArray(parsedPlay) || parsedPlay.length === 0) {
        gameLogger.warn("llm_invalid_format_keys", { playerId, parsed });
        messages.push({ role: "assistant", content: JSON.stringify(parsed) });
        messages.push({
          role: "user",
          content: "Your response did not contain a valid 'play' array of card IDs (e.g. ['c1', 'c2']). Please select valid card IDs from your hand.",
        });
        llmInvalidCardRetries++;
        continue;
      }

      // 1. Check for duplicate card choice IDs in parsedPlay
      const uniquePlayIds = new Set(parsedPlay.map(id => id.trim().toLowerCase()));
      if (uniquePlayIds.size !== parsedPlay.length) {
        gameLogger.warn("llm_duplicate_choice_ids", {
          playerId,
          parsedPlay,
        });

        messages.push({ role: "assistant", content: JSON.stringify(parsed) });
        messages.push({
          role: "user",
          content: "Your selection contains duplicate card choice IDs (e.g. selecting the same ID 'c1' twice). You cannot play the same card choice ID more than once in a single play. Each card ID in your play selection must be unique. Please try again with unique card IDs.",
        });
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

        messages.push({ role: "assistant", content: JSON.stringify(parsed) });
        messages.push({
          role: "user",
          content: `Some card IDs you selected are invalid or not in your hand. Please select only from the provided list ('c1' to 'c${sortedHand.length}').`,
        });
        llmInvalidCardRetries++;
        continue;
      }

      // Validate the play against the Shengji rule engine
      const errorMsg = getPlayValidationError(
        selectedCards,
        player.hand,
        playerId,
        gameState
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

        messages.push({ role: "assistant", content: JSON.stringify(parsed) });
        messages.push({
          role: "user",
          content: `Your play was invalid because: ${errorMsg}. Please try again, selecting a valid play from your remaining hand, and strictly outputting the JSON format.`,
        });
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
      message: "Exhausted all retries. Falling back to rule-based AI algorithm.",
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
