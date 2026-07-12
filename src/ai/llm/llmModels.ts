export interface ModelInfo {
  id: string;
  name: string;
  icon: string;
  rank: string;
  rankColor: string;
  inputPrice: string;
  outputPrice: string;
  description: string;
}

export const AVAILABLE_MODELS: ModelInfo[] = [
  {
    id: "google/gemini-3.1-flash-lite",
    name: "Gemini 3.1 Flash Lite",
    icon: "✨",
    rank: "Best Overall (Recommended)",
    rankColor: "#06B6D4",
    inputPrice: "$0.25",
    outputPrice: "$1.50",
    description:
      "Recommended. Speed Champion (~1-2s latency). Optimized for low-latency, high-volume workloads with improved strategic reasoning and outstanding rules compliance.",
  },
  {
    id: "x-ai/grok-4.5",
    name: "Grok 4.5",
    icon: "👁️",
    rank: "Elite Strategy & Reasoning",
    rankColor: "#10B981",
    inputPrice: "$2.00",
    outputPrice: "$6.00",
    description:
      "State-of-the-art strategic and reasoning model from xAI. Outstanding tactical depth and card coordination.",
  },
  {
    id: "deepseek/deepseek-v4-flash",
    name: "DeepSeek V4 Flash",
    icon: "🌊",
    rank: "Peak Strategic Master",
    rankColor: "#8B5CF6",
    inputPrice: "$0.077",
    outputPrice: "$0.154",
    description:
      "Strategic master. High strategic depth and excellent rules compliance, though latency can vary under load.",
  },
  {
    id: "qwen/qwen3.6-flash",
    name: "Qwen 3.6 Flash",
    icon: "🔷",
    rank: "Elite Strategy",
    rankColor: "#00BCD4",
    inputPrice: "$0.1875",
    outputPrice: "$1.125",
    description:
      "Elite tactical engine. Flawless rules compliance, superb combo recognition, and great point preservation.",
  },
];

export const DEFAULT_MODEL_ID = AVAILABLE_MODELS[0].id;
export const DEFAULT_API_URL = "https://openrouter.ai/api/v1/chat/completions";
