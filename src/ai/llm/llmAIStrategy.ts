import { Card, GameState, PlayerId } from "../../types";
import { gameLogger } from "../../utils/gameLogger";
import { createGameContext } from "../aiGameContext";
import { getLLMConfig, isLLMEnabled, saveLLMConfig } from "./llmConfig";
import { callOpenRouter, ChatMessage } from "./llmAIClient";
import { resolveOpenRouterModelId, isDefaultModelSelection } from "./llmModels";
import { formatPerceptionBlock } from "./llmPerception";
import { generateLegalActionSpace, LegalAction } from "./llmActionSpace";
import { buildCompactTrickPrompt } from "./llmPromptTemplates";
import { buildLLMKittySwapUserPrompt } from "./llmKittySwapPrompt";

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

// Tracking consecutive failures for auto switch-back
let consecutiveLLMFailures = 0;
const CONSECUTIVE_FAILURE_THRESHOLD = 3;

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
 * When LLM is bypassed, sleep for a random duration centered on the rolling average.
 */
export async function simulateLLMLatency(): Promise<void> {
  if (!isLLMEnabled()) return;

  const avg = getAverageLLMDuration();
  if (avg === 0) {
    await new Promise((r) => setTimeout(r, 500 + Math.random() * 1000));
    return;
  }

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

export function resetLLMStats(): void {
  llmTotalPlaysRequested = 0;
  llmSuccessfulPlays = 0;
  llmAPIErrorFallbacks = 0;
  llmInvalidCardRetries = 0;
  llmInvalidCardFallbacks = 0;
  consecutiveLLMFailures = 0;
}

export interface LLMDisabledEvent {
  kind: "auto_disabled";
  model: string;
  consecutiveFailures: number;
}

export type LLMNotificationEvent = LLMDisabledEvent;

type FallbackListener = (event: LLMNotificationEvent) => void;
const fallbackListeners = new Set<FallbackListener>();

export function subscribeToLLMNotifications(
  listener: FallbackListener,
): () => void {
  fallbackListeners.add(listener);
  return () => {
    fallbackListeners.delete(listener);
  };
}

function notifyLLMEvent(event: LLMNotificationEvent): void {
  fallbackListeners.forEach((listener) => {
    try {
      listener(event);
    } catch (e) {
      gameLogger.error("llm_notification_listener_error", { error: String(e) });
    }
  });
}

/**
 * Core LLM decision helper — Executes the 4-layer pipeline.
 *
 * 1. Extracts pure facts & perception (Layer 1)
 * 2. Generates enumerated legal action space (Layer 2)
 * 3. Builds prompt and queries model for action index (Layer 3)
 * 4. Verifies and executes chosen legal play with safety fallback (Layer 4)
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

  const isCustom = !isDefaultModelSelection(config.model);
  llmTotalPlaysRequested++;
  const decisionStartTime = Date.now();

  // Layer 1 & 2: Build Perception & Legal Action Space
  const gameContext = createGameContext(gameState, playerId);
  const perceptionBlock = formatPerceptionBlock(
    gameState,
    playerId,
    hand,
    gameState.trumpInfo,
    gameContext,
  );
  const legalActions: LegalAction[] = generateLegalActionSpace(
    gameState,
    hand,
    playerId,
    gameState.trumpInfo,
    gameContext,
  );

  if (legalActions.length === 0) {
    return fallback;
  }

  if (legalActions.length === 1) {
    recordLLMDuration(Date.now() - decisionStartTime);
    return legalActions[0].cards;
  }

  // Layer 3: Query Strategic Reasoner
  const maxAttempts = 2;
  let attempt = 0;
  let errorHint = "";

  while (attempt < maxAttempts) {
    attempt++;
    try {
      const prompt = buildCompactTrickPrompt(perceptionBlock, legalActions);

      let userPromptContent = prompt.user;
      if (errorHint) {
        userPromptContent += `\n\n=== RETRY NOTIFICATION ===\n${errorHint}\nPlease select a valid integer index [1..${legalActions.length}], outputting strictly JSON format: {"thought": "...", "actionIndex": <integer>}`;
      }

      const messages: ChatMessage[] = [
        { role: "system", content: prompt.system },
        { role: "user", content: userPromptContent },
      ];

      const responseText = await callOpenRouter(
        config.apiKey,
        resolveOpenRouterModelId(config.model),
        config.apiUrl,
        messages,
        config.timeoutMs,
      );

      let cleanedJson = responseText.trim();
      cleanedJson = cleanedJson
        .replace(/<think>[\s\S]*?<\/think>/gi, "")
        .trim();

      const codeBlockMatch = cleanedJson.match(/```json\s*([\s\S]*?)\s*```/i);
      if (codeBlockMatch) {
        cleanedJson = codeBlockMatch[1].trim();
      } else {
        const genericBlockMatch = cleanedJson.match(/```\s*([\s\S]*?)\s*```/);
        if (genericBlockMatch) {
          cleanedJson = genericBlockMatch[1].trim();
        }
      }

      let parsed: { thought?: string; actionIndex?: number; action?: number };
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
          'Failed to parse your response as JSON. Output strictly JSON: {"thought": "explanation", "actionIndex": 1}';
        llmInvalidCardRetries++;
        continue;
      }

      let chosenIndex = parsed.actionIndex ?? parsed.action;
      if (chosenIndex === 0 && legalActions.length > 0) {
        gameLogger.debug("llm_aliased_zero_index_to_one", { playerId });
        chosenIndex = 1;
      }

      if (
        typeof chosenIndex !== "number" ||
        chosenIndex < 1 ||
        chosenIndex > legalActions.length
      ) {
        gameLogger.warn("llm_invalid_action_index", {
          playerId,
          chosenIndex,
          maxIndex: legalActions.length,
        });

        errorHint = `Invalid action index '${chosenIndex}'. Must be an integer between 1 and ${legalActions.length}.`;
        llmInvalidCardRetries++;
        continue;
      }

      // Layer 4: Execution Guard
      const selectedAction = legalActions[chosenIndex - 1];
      const durationMs = Date.now() - decisionStartTime;
      recordLLMDuration(durationMs);

      llmSuccessfulPlays++;
      if (isCustom) {
        consecutiveLLMFailures = 0;
      }

      gameLogger.info("llm_decision_success", {
        playerId,
        thought: parsed.thought ?? "No thought provided.",
        actionIndex: chosenIndex,
        label: selectedAction.label,
        play: selectedAction.cards.map((c) => c.toString()),
        durationMs,
        attempts: attempt,
      });

      return selectedAction.cards;
    } catch (apiError) {
      gameLogger.error("llm_api_call_exception", {
        playerId,
        attempt,
        error: apiError instanceof Error ? apiError.message : String(apiError),
      });
      break;
    }
  }

  // Retry exhaustion or API error -> Fallback
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

  if (isCustom) {
    consecutiveLLMFailures++;
    if (consecutiveLLMFailures >= CONSECUTIVE_FAILURE_THRESHOLD) {
      const currentConfig = getLLMConfig();
      saveLLMConfig({ ...currentConfig, enabled: false });
      const failedCount = consecutiveLLMFailures;
      consecutiveLLMFailures = 0;
      notifyLLMEvent({
        kind: "auto_disabled",
        model: config.model,
        consecutiveFailures: failedCount,
      });
    }
  }

  recordLLMDuration(Date.now() - decisionStartTime);
  return fallback;
}

/**
 * Core LLM decision helper for Kitty Swap phase.
 */
export async function callLLMForKittySwap(
  gameState: GameState,
  playerId: PlayerId,
  hand: Card[],
  fallback: Card[],
): Promise<Card[]> {
  if (!isLLMEnabled()) {
    return fallback;
  }

  const config = getLLMConfig();
  if (!config.applyToPlayers.includes(playerId)) {
    await simulateLLMLatency();
    return fallback;
  }

  const isCustom = !isDefaultModelSelection(config.model);
  llmTotalPlaysRequested++;
  const decisionStartTime = Date.now();

  const maxAttempts = 2;
  let attempt = 0;
  let errorHint = "";

  while (attempt < maxAttempts) {
    attempt++;
    try {
      const prompt = buildLLMKittySwapUserPrompt(gameState, playerId, hand);

      let userPromptContent = prompt.user;
      if (errorHint) {
        userPromptContent += `\n\n=== RETRY NOTIFICATION ===\nYour previous selection was invalid because: ${errorHint}\nPlease select exactly 8 valid cards from your hand, outputting strictly the JSON format: { "reasoning": "...", "play": [...] }`;
      }

      const messages: ChatMessage[] = [
        { role: "system", content: prompt.system },
        { role: "user", content: userPromptContent },
      ];

      const responseText = await callOpenRouter(
        config.apiKey,
        resolveOpenRouterModelId(config.model),
        config.apiUrl,
        messages,
        config.timeoutMs,
      );

      let cleanedJson = responseText.trim();
      cleanedJson = cleanedJson
        .replace(/<think>[\s\S]*?<\/think>/gi, "")
        .trim();

      const codeBlockMatch = cleanedJson.match(/```json\s*([\s\S]*?)\s*```/i);
      if (codeBlockMatch) {
        cleanedJson = codeBlockMatch[1].trim();
      } else {
        const genericBlockMatch = cleanedJson.match(/```\s*([\s\S]*?)\s*```/);
        if (genericBlockMatch) {
          cleanedJson = genericBlockMatch[1].trim();
        }
      }

      let parsed: { reasoning?: string; play?: string[] };
      try {
        parsed = JSON.parse(cleanedJson);
      } catch (parseError) {
        gameLogger.warn("llm_kitty_swap_json_parse_failed", {
          playerId,
          attempt,
          rawResponse: responseText,
          error:
            parseError instanceof Error
              ? parseError.message
              : String(parseError),
        });
        errorHint =
          'Failed to parse your response as JSON. Please ensure your selection strictly follows JSON formatting: { "reasoning": "explanation", "play": ["3♣", "4♣", ...] }';
        llmInvalidCardRetries++;
        continue;
      }

      const parsedPlay = parsed?.play;
      if (!Array.isArray(parsedPlay) || parsedPlay.length !== 8) {
        gameLogger.warn("llm_kitty_swap_invalid_count", { playerId, parsed });
        errorHint = `Your 'play' array contained ${Array.isArray(parsedPlay) ? parsedPlay.length : 0} card(s), but you must select EXACTLY 8 cards from your hand.`;
        llmInvalidCardRetries++;
        continue;
      }

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

      if (mappingFailed || selectedCards.length !== 8) {
        gameLogger.warn("llm_kitty_swap_card_mapping_failed", {
          playerId,
          parsedPlay,
          handSize: hand.length,
        });
        errorHint =
          'Some cards you selected are not in your 33-card hand. Select only cards shown in YOUR HAND, using their exact notation (e.g. "3♣", "10♥", "BJ").';
        llmInvalidCardRetries++;
        continue;
      }

      const durationMs = Date.now() - decisionStartTime;
      recordLLMDuration(durationMs);
      llmSuccessfulPlays++;
      consecutiveLLMFailures = 0;

      gameLogger.info("llm_kitty_swap_decision_success", {
        playerId,
        reasoning: parsed.reasoning ?? "No reasoning provided.",
        play: selectedCards.map((c) => c.toString()),
        durationMs,
      });

      return selectedCards;
    } catch (apiError) {
      gameLogger.error("llm_kitty_swap_api_error", {
        playerId,
        attempt,
        error: apiError instanceof Error ? apiError.message : String(apiError),
      });
      llmAPIErrorFallbacks++;
      break;
    }
  }

  if (isCustom) {
    consecutiveLLMFailures++;
    if (consecutiveLLMFailures >= CONSECUTIVE_FAILURE_THRESHOLD) {
      const currentConfig = getLLMConfig();
      saveLLMConfig({ ...currentConfig, enabled: false });
      const failedCount = consecutiveLLMFailures;
      consecutiveLLMFailures = 0;
      notifyLLMEvent({
        kind: "auto_disabled",
        model: config.model,
        consecutiveFailures: failedCount,
      });
    }
  }

  recordLLMDuration(Date.now() - decisionStartTime);
  llmInvalidCardFallbacks++;
  return fallback;
}
