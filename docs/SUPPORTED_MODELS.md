# Supported LLM Models

This document lists the recommended and supported LLM models for the Tractor AI strategizer, sorted from **Best Overall (intelligence + value + speed balance)** to the most premium/specialized options. You can switch the active model by updating the `OPENROUTER_MODEL` environment variable in your `.env` file.

## Quick Comparison

| Model ID | Provider / Family | Input Price (1M) | Output Price (1M) | Speed / Latency | Strategic Reasoning | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `deepseek/deepseek-chat-v3.1` | DeepSeek | $0.21 | $0.79 | Moderate / Slow | **Outstanding** | **Best Overall:** System default. Exceptional strategic depth, partner play, and card counting. |
| `meta-llama/llama-3.3-70b-instruct` | Meta / Llama | $0.10 | $0.32 | Fast / Moderate | **Very High** | **Alternative:** Premium rules comprehension, highly strategic, and cheapest 70B option. |
| `openai/gpt-4o-mini` | OpenAI | $0.15 | $0.60 | **Very Fast** | High / Good | **Ultra Stable:** Extreme high-availability, very low latency, and zero provider stubs. |
| `qwen/qwen3-next-80b-a3b-instruct` | Alibaba / Qwen | $0.09 | $1.10 | Moderate | **High** | **Safe Alternative:** High general instruct capability and solid formatting reliability. |
| `google/gemini-2.5-flash` | Google / Gemini | $0.30 | $2.50 | **Ultra-Fast** | Moderate / Good | **Fastest:** Snappy, sub-second response times; high-performance Google API. |

---

## Detailed Profiles

### 1. DeepSeek Chat V3.1 (Best Overall / Default)
* **OpenRouter ID:** `deepseek/deepseek-chat-v3.1`
* **Characteristics:** Unparalleled strategic reasoning capacity, capable of master-level partner plays and long-term card-counting strategies.
* **Pricing:** $0.21 input / $0.79 output per 1M tokens

### 2. Meta Llama 3.3 70B Instruct (Alternative)
* **OpenRouter ID:** `meta-llama/llama-3.3-70b-instruct`
* **Characteristics:** Premium rules comprehension, exceptional instruction following, extremely cheap, and very low retry rates.
* **Pricing:** $0.10 input / $0.32 output per 1M tokens

### 3. GPT-4o Mini (Ultra Stable & High Availability)
* **OpenRouter ID:** `openai/gpt-4o-mini`
* **Characteristics:** High-availability hosting directly by OpenAI, ultra-low latency, solid game format compliance, and zero OpenRouter provider bugs.
* **Pricing:** $0.15 input / $0.60 output per 1M tokens

### 4. Qwen3 Next 80B Instruct (Safe Alternative)
* **OpenRouter ID:** `qwen/qwen3-next-80b-a3b-instruct`
* **Characteristics:** Extremely robust JSON formatting reliability and strong general-purpose reasoning with zero thinking token latency.
* **Pricing:** $0.09 input / $1.10 output per 1M tokens

### 5. Gemini 2.5 Flash (Fastest / Lowest Latency)
* **OpenRouter ID:** `google/gemini-2.5-flash`
* **Characteristics:** Ultra-low latency responses (often sub-second) and excellent JSON compliance, but output tokens are 8x more expensive than Llama.
* **Pricing:** $0.30 input / $2.50 output per 1M tokens

---

## How to Configure
To change the active model, open the `.env` file in the root of the project and set:

```env
OPENROUTER_MODEL=your-preferred-model-id
```
