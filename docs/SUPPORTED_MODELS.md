# Supported LLM Models

This document lists the recommended and supported LLM models for the Tractor AI strategizer, sorted from **Best Overall (intelligence + value + speed balance)** to the most premium/specialized options. You can switch the active model by updating the `OPENROUTER_MODEL` environment variable in your `.env` file.

## Quick Comparison

| Model ID | Provider / Family | Input Price (1M) | Output Price (1M) | Speed / Latency | Strategic Reasoning | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `meta-llama/llama-3.3-70b-instruct` | Meta / Llama | $0.10 | $0.32 | Fast / Moderate | **Very High** | **Best Overall:** Unmatched intelligence/price ratio. Outstanding rules compliance. |
| `deepseek/deepseek-chat-v3.1` | DeepSeek | $0.21 | $0.79 | Moderate / Slow | **Outstanding** | **Best for Depth:** Incredible strategic depth, partner play, and card counting. |
| `qwen/qwen3-next-80b-a3b-instruct` | Alibaba / Qwen | $0.09 | $1.10 | Moderate | **High** | **Safe Alternative:** High general instruct capability and solid formatting reliability. |
| `google/gemini-2.5-flash` | Google / Gemini | $0.30 | $2.50 | **Ultra-Fast** | Moderate / Good | **Niche for Speed:** Extremely snappy, sub-second latency; most expensive outputs. |

---

## Detailed Profiles

### 1. Meta Llama 3.3 70B Instruct (Best Overall)
* **OpenRouter ID:** `meta-llama/llama-3.3-70b-instruct`
* **Characteristics:** Premium rules comprehension, exceptional instruction following, extremely cheap, and very low retry rates.
* **Pricing:** $0.10 input / $0.32 output per 1M tokens

### 2. DeepSeek Chat V3.1 (Best for Strategic Depth)
* **OpenRouter ID:** `deepseek/deepseek-chat-v3.1`
* **Characteristics:** Unparalleled strategic reasoning capacity, capable of master-level partner plays and long-term card-counting strategies.
* **Pricing:** $0.21 input / $0.79 output per 1M tokens

### 3. Qwen3 Next 80B Instruct (Safe Alternative)
* **OpenRouter ID:** `qwen/qwen3-next-80b-a3b-instruct`
* **Characteristics:** Extremely robust JSON formatting reliability and strong general-purpose reasoning with zero thinking token latency.
* **Pricing:** $0.09 input / $1.10 output per 1M tokens

### 4. Gemini 2.5 Flash (Niche for Speed / Latency)
* **OpenRouter ID:** `google/gemini-2.5-flash`
* **Characteristics:** Ultra-low latency responses (often sub-second) and excellent JSON compliance, but output tokens are 8x more expensive than Llama.
* **Pricing:** $0.30 input / $2.50 output per 1M tokens

---

## How to Configure
To change the active model, open the `.env` file in the root of the project and set:

```env
OPENROUTER_MODEL=your-preferred-model-id
```
