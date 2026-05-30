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
    id: "google/gemini-2.5-flash-lite",
    name: "Gemini 2.5 Flash Lite",
    icon: "✨",
    rank: "Best Overall (Recommended)",
    rankColor: "#06B6D4",
    inputPrice: "$0.10",
    outputPrice: "$0.40",
    description:
      "Recommended. Speed Champion (~1-2s latency). Flawless rules compliance and sub-second responses. Outstanding resource conservation, combo awareness and teammate feeding.",
  },
  {
    id: "deepseek/deepseek-chat",
    name: "DeepSeek Chat (V3)",
    icon: "🌊",
    rank: "Peak Strategic Master",
    rankColor: "#8B5CF6",
    inputPrice: "$0.2288",
    outputPrice: "$0.9144",
    description:
      "Strategic master (~2-3s latency). Unparalleled strategic depth, superior teammate communication and trump unification.",
  },
  {
    id: "qwen/qwen3-next-80b-a3b-instruct",
    name: "Qwen3 Next 80B",
    icon: "🔷",
    rank: "Elite Strategy",
    rankColor: "#00BCD4",
    inputPrice: "$0.09",
    outputPrice: "$1.10",
    description:
      "Elite tactical engine (~3-4s latency). Flawless rules compliance, superb combo recognition, and great point preservation.",
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct",
    name: "Meta Llama 3.3 70B",
    icon: "🦙",
    rank: "Strategic Value",
    rankColor: "#F59E0B",
    inputPrice: "$0.10",
    outputPrice: "$0.32",
    description:
      "Value King (~2-3s latency). Excellent instructions follower and reliable rules alignment.",
  },
];

export const DEFAULT_MODEL_ID = AVAILABLE_MODELS[0].id;
export const DEFAULT_API_URL = "https://openrouter.ai/api/v1/chat/completions";
