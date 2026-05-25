import * as fs from "fs";
import * as path from "path";
import { gameLogger } from "../../utils/gameLogger";

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
  model: "deepseek/deepseek-chat",
  apiUrl: "https://openrouter.ai/api/v1/chat/completions",
  timeoutMs: 15000,
  applyToPlayers: ["bot1", "bot2", "bot3"],
};

// Check if running in a Jest/Node environment
const isNodeTestEnv = typeof process !== "undefined" && process.env.NODE_ENV === "test";

// Manually parse .env file in Node environment to populate process.env
function loadEnvFile(): void {
  if (typeof process === "undefined") return;

  try {
    const cwd = process.cwd();
    const envPath = path.resolve(cwd, ".env");

    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf8");
      const lines = content.split(/\r?\n/);

      for (const line of lines) {
        // Skip comments or empty lines
        if (line.trim().startsWith("#") || !line.trim()) continue;

        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          const key = match[1];
          let val = match[2] || "";

          // Remove wrapping quotes if any
          if (val.length > 0 && val.charAt(0) === '"' && val.charAt(val.length - 1) === '"') {
            val = val.substring(1, val.length - 1);
          } else if (val.length > 0 && val.charAt(0) === "'" && val.charAt(val.length - 1) === "'") {
            val = val.substring(1, val.length - 1);
          }

          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  } catch (error) {
    // Fail silently in config initializations
  }
}

// Initialize environment variables if in Node/Jest
if (isNodeTestEnv) {
  loadEnvFile();
}

/**
 * Retrieve the active LLM configuration.
 * First reads from localStorage. If unavailable, falls back to env variables, then default settings.
 */
export function getLLMConfig(): LLMConfig {
  let savedConfig: Partial<LLMConfig> = {};

  // 1. Try to read from localStorage if accessible
  try {
    if (typeof localStorage !== "undefined" && localStorage !== null) {
      const stored = localStorage.getItem("tractor_llm_config");
      if (stored) {
        savedConfig = JSON.parse(stored);
      }
    }
  } catch (error) {
    gameLogger.warn("llm_config_storage_read_error", { error });
  }

  // 2. Read environment variables (standard or expo-prefixed)
  const envEnabled =
    process.env.LLM_ENABLED === "true" ||
    process.env.EXPO_PUBLIC_LLM_ENABLED === "true";

  const envApiKey =
    process.env.OPENROUTER_API_KEY ||
    process.env.EXPO_PUBLIC_OPENROUTER_API_KEY ||
    "";

  const envModel =
    process.env.OPENROUTER_MODEL ||
    process.env.EXPO_PUBLIC_OPENROUTER_MODEL ||
    "";

  const envApiUrl =
    process.env.OPENROUTER_API_URL ||
    process.env.EXPO_PUBLIC_OPENROUTER_API_URL ||
    "";

  // 3. Assemble and merge options
  return {
    enabled: savedConfig.enabled !== undefined ? savedConfig.enabled : (envEnabled || DEFAULT_LLM_CONFIG.enabled),
    apiKey: savedConfig.apiKey || envApiKey || DEFAULT_LLM_CONFIG.apiKey,
    model: savedConfig.model || envModel || DEFAULT_LLM_CONFIG.model,
    apiUrl: savedConfig.apiUrl || envApiUrl || DEFAULT_LLM_CONFIG.apiUrl,
    timeoutMs: savedConfig.timeoutMs || DEFAULT_LLM_CONFIG.timeoutMs,
    applyToPlayers: savedConfig.applyToPlayers || DEFAULT_LLM_CONFIG.applyToPlayers,
  };
}

/**
 * Save LLM configuration to localStorage
 */
export function saveLLMConfig(config: LLMConfig): void {
  try {
    if (typeof localStorage !== "undefined" && localStorage !== null) {
      localStorage.setItem("tractor_llm_config", JSON.stringify(config));
      gameLogger.info("llm_config_saved", { enabled: config.enabled, model: config.model });
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
