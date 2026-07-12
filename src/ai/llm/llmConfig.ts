import { gameLogger } from "../../utils/gameLogger";
import {
  DEFAULT_API_URL,
  DEFAULT_MODEL_SENTINEL,
  isDefaultModelSelection,
} from "./llmModels";

export interface LLMConfig {
  enabled: boolean;
  apiKey: string;
  model: string;
  apiUrl: string;
  timeoutMs: number;
  applyToPlayers: string[];
}

export const DEFAULT_LLM_CONFIG: LLMConfig = {
  enabled: false,
  apiKey: "",
  model: DEFAULT_MODEL_SENTINEL,
  apiUrl: DEFAULT_API_URL,
  timeoutMs: 15000,
  applyToPlayers: ["bot1", "bot2", "bot3"],
};

/**
 * Retrieve the active LLM configuration.
 * Source of truth is localStorage (set via the in-app settings UI).
 * Falls back to DEFAULT_LLM_CONFIG only — never reads from .env.
 */
export function getLLMConfig(): LLMConfig {
  try {
    if (typeof localStorage !== "undefined" && localStorage !== null) {
      const stored = localStorage.getItem("tractor_llm_config");
      if (stored) {
        const savedConfig = JSON.parse(stored) as Partial<LLMConfig>;
        const rawModel = savedConfig.model ?? "";
        // Default sentinel + legacy concrete default id normalize to sentinel;
        // any other non-empty id is preserved as a user-supplied OpenRouter id.
        const model = isDefaultModelSelection(rawModel)
          ? DEFAULT_MODEL_SENTINEL
          : rawModel.trim();
        return {
          enabled: savedConfig.enabled ?? DEFAULT_LLM_CONFIG.enabled,
          apiKey: savedConfig.apiKey ?? DEFAULT_LLM_CONFIG.apiKey,
          model,
          apiUrl: savedConfig.apiUrl || DEFAULT_LLM_CONFIG.apiUrl,
          timeoutMs: savedConfig.timeoutMs || DEFAULT_LLM_CONFIG.timeoutMs,
          applyToPlayers:
            savedConfig.applyToPlayers || DEFAULT_LLM_CONFIG.applyToPlayers,
        };
      }
    }
  } catch (error) {
    gameLogger.warn("llm_config_storage_read_error", { error });
  }

  return { ...DEFAULT_LLM_CONFIG };
}

/**
 * Save LLM configuration to localStorage
 */
export function saveLLMConfig(config: LLMConfig): void {
  try {
    if (typeof localStorage !== "undefined" && localStorage !== null) {
      localStorage.setItem("tractor_llm_config", JSON.stringify(config));
      gameLogger.info("llm_config_saved", {
        enabled: config.enabled,
        model: config.model,
      });
    }
  } catch (error) {
    gameLogger.error("llm_config_save_error", { error });
  }
}

/**
 * Helper to quickly check if LLM decisions are enabled
 */
export function isLLMEnabled(): boolean {
  const config = getLLMConfig();
  return config.enabled && !!config.apiKey;
}
