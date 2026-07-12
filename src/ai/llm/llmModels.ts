/**
 * Sentinel stored in LLM config when the user selects the built-in Default model.
 * Resolved to {@link DEFAULT_MODEL.id} only at call/verify time, so the default
 * model id can change later without migrating saved configs.
 */
export const DEFAULT_MODEL_SENTINEL = "default";

export interface DefaultModelInfo {
  id: string;
  displayName: string;
  inputPrice: string;
  outputPrice: string;
}

/**
 * The built-in Default model: id + display metadata kept cohesive so a model
 * bump is a one-spot edit.
 */
export const DEFAULT_MODEL: DefaultModelInfo = {
  id: "google/gemini-3.1-flash-lite",
  displayName: "Gemini 3.1 Flash Lite",
  inputPrice: "$0.25",
  outputPrice: "$1.50",
};

/** Concrete OpenRouter model id backing the built-in Default selection. */
export const DEFAULT_MODEL_ID = DEFAULT_MODEL.id;

export const DEFAULT_API_URL = "https://openrouter.ai/api/v1/chat/completions";

/** Trim a stored config model value (single normalization site). */
function normalizeStoredModel(storedModel: string): string {
  return storedModel.trim();
}

/**
 * Map a stored config value to the concrete OpenRouter model id used in API
 * calls. The sentinel and empty values resolve to the built-in default; any
 * other non-empty string is treated as a user-supplied OpenRouter model id.
 */
export function resolveOpenRouterModelId(storedModel: string): string {
  const trimmed = normalizeStoredModel(storedModel);
  if (trimmed === "" || trimmed === DEFAULT_MODEL_SENTINEL) {
    return DEFAULT_MODEL_ID;
  }
  return trimmed;
}

/**
 * Whether the stored config value means "use the built-in Default model".
 * Treats the legacy concrete default id as Default so old saves normalize to
 * the sentinel on load.
 */
export function isDefaultModelSelection(storedModel: string): boolean {
  const trimmed = normalizeStoredModel(storedModel);
  return (
    trimmed === "" ||
    trimmed === DEFAULT_MODEL_SENTINEL ||
    trimmed === DEFAULT_MODEL_ID
  );
}

/**
 * Whether a custom model id has the OpenRouter `provider/model` shape.
 * Not an existence check — the connectivity test is the real validator.
 */
export function isValidOpenRouterModelId(modelId: string): boolean {
  const trimmed = normalizeStoredModel(modelId);
  return trimmed.length > 0 && trimmed.includes("/");
}
