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
      "Recommended. Speed Champion (~1-2s latency). Flawless rules compliance and sub-second responses. Outstanding resource conservation (discarding lone cards when void rather than overruffing needlessly) and partner feeding.",
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
      "Strategic master (~2-3s latency). Unparalleled strategic depth, teammate feeding, and trump unification. Excels at card counting, positional defense, and over-ruffing contested tricks.",
  },
  {
    id: "qwen/qwen3-next-80b-a3b-instruct",
    name: "Qwen3 Next 80B",
    icon: "🔷",
    rank: "Elite Strategy & Speed",
    rankColor: "#00BCD4",
    inputPrice: "$0.09",
    outputPrice: "$1.10",
    description:
      "Elite AI (~3-4s latency). 100% rules compliance. Outstanding position heuristics, pair preservation (e.g. leading 9♦ pair while keeping higher pairs), and void cuts with perfect precision.",
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct",
    name: "Meta Llama 3.3 70B",
    icon: "🦙",
    rank: "Budget Value King",
    rankColor: "#F59E0B",
    inputPrice: "$0.10",
    outputPrice: "$0.32",
    description:
      "Value King (~2-3s latency). Premium instructions follower and excellent rules alignment. Exhibits robust error correction, smart trick contesting, card dumping, and partner coordination.",
  },
];

export const DEFAULT_MODEL_ID = AVAILABLE_MODELS[0].id;
export const DEFAULT_API_URL = "https://openrouter.ai/api/v1/chat/completions";
