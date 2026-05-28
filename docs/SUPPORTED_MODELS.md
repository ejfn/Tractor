# Supported LLM Models

This document lists the recommended and supported LLM models for the Tractor AI strategizer, ranked according to their **Empirical Shengji Strategy & Reasoning Level** (intelligence + value + speed + rules compliance). You can switch the active model by updating the `tractor_llm_config` in-app or via the `OPENROUTER_MODEL` environment variable.

> [!NOTE]
> The default strategizer in the Tractor app is the local **Algorithmic Math Engine** (rule-based local AI), which requires zero API connection and executes instantly. Enabling the **LLM Strategizer** allows you to select one of these premium LLM models to drive advanced, deep strategic play.

## Quick Comparison

| Model ID | Provider / Family | Input Price (1M) | Output Price (1M) | Speed / Latency | Reasoning Level | Key Empirical Telemetry & Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `deepseek/deepseek-chat-v3.1` | DeepSeek | $0.21 | $0.79 | Moderate / Slow | **Elite** (Rank #1) | **100% Correctness.** Unparalleled strategic depth, teammate feeding, and trump unification. Best strategic thinker but slower response times (~10-13s). |
| `qwen/qwen3-next-80b-a3b-instruct` | Alibaba / Qwen | $0.09 | $1.10 | **Very Fast** | **Elite** (Rank #2) | **100% Correctness.** Zero retries/fallbacks. Outstanding position heuristics, pair preservation (`9♦, 9♦`), and low trump conservation. |
| `meta-llama/llama-3.3-70b-instruct` | Meta / Llama | $0.10 | $0.32 | Fast / Moderate | **Tier 1** (Rank #3) | **100% Correctness.** Zero fallbacks after ignoring Parasail. Smart trick contesting, card dumping, and partner coordination. Corrects minor errors. |
| `google/gemini-2.5-flash` | Google / Gemini | $0.30 | $2.50 | **Very Fast** | **Tier 1** (Rank #4) | **100% Correctness.** Zero retries/fallbacks. Outstanding speed and resource conservation, but premium output pricing. |

---

## Detailed Profiles

### 1. DeepSeek Chat V3.1 (Elite / Best Overall Strategy)
* **OpenRouter ID:** `deepseek/deepseek-chat-v3.1`
* **Characteristics:** Master-level strategic reasoning capacity. Outstanding card counting, partner play coordination, and trump unification. In simulation tests, it successfully unified off-suit trump ranks (`2♣, 2♦`) to over-ruff and win complex contested tricks.
* **Pricing:** $0.21 input / $0.79 output per 1M tokens
* **Latency / Play**: ~10-13s (has thinking tokens)

### 2. Qwen3 Next 80B Instruct (Elite / Flawless Compliance & Response)
* **OpenRouter ID:** `qwen/qwen3-next-80b-a3b-instruct`
* **Characteristics:** Spectacular Shengji strategy. Explains position-aware heuristics, pair preservation (leading `9♦, 9♦` while keeping higher pairs), and void cuts with perfect precision. Fast, highly responsive, and 100% correct on the first try.
* **Pricing:** $0.09 input / $1.10 output per 1M tokens
* **Latency / Play**: ~4-5s

### 3. Meta Llama 3.3 70B Instruct (Tier 1 / Premium Rules & Value King)
* **OpenRouter ID:** `meta-llama/llama-3.3-70b-instruct`
* **Characteristics:** Premium instructions follower and excellent rules alignment. Exhibits robust error correction (corrects card choices in retries) and achieves a perfect 100% play success rate with zero fallbacks after globally bypassing buggy providers like Parasail.
* **Pricing:** $0.10 input / $0.32 output per 1M tokens
* **Latency / Play**: ~8-9s

### 4. Gemini 2.5 Flash (Tier 1 / Premium Speed Champion)
* **OpenRouter ID:** `google/gemini-2.5-flash`
* **Characteristics:** Sub-second responsive. Highly strategic context, correct resource conservation (discarding lone cards when void rather than overruffing zero-point tricks needlessly), and strong partner feeding. Flawless 100% correctness on the first try, but premium pricing.
* **Pricing:** $0.30 input / $2.50 output per 1M tokens
* **Latency / Play**: ~7s

---

## How to Configure
To change the active model, open the `.env` file in the root of the project and set:

```env
OPENROUTER_MODEL=your-preferred-model-id
```

Additionally, players can switch models in real-time inside the mobile application using the **AI Settings Modal** on the main dashboard.
