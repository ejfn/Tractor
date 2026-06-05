---
name: model-evaluation
description: Instructions, templates, and scripts for evaluating and benchmarking different LLM models for Shengji strategic AI decision-making.
version: 1.0.0
license: UNLICENSED
---

## Overview

The Model Evaluation skill provides structured tools, instructions, and scripts to benchmark different Large Language Models (LLMs) against the Tractor (Shengji) AI decision engine.

Evaluating models helps ensure:
1. **Rule Compliance**: Selecting models that consistently generate valid plays (0% rule violations).
2. **API/Connection Reliability**: Detecting sensitivity to rate limits (HTTP 429) or high latency timeouts.
3. **Strategic Reasoning**: Evaluating the model's textual `reasoning` logs for elite positional play, defense protection, and trump management.
4. **Performance Efficiency**: Benchmarking tokens-per-second, API request cost, and average turn duration.

---

## 1. Automated Multi-Model Benchmarking

We provide a specialized, high-performance runner script (`evaluate-models.sh`) to automatically run sequential game simulations across different models and compile a comparative evaluation report.

### A. Run Command (Default Models)
To benchmark the standard model list (`deepseek/deepseek-chat`, `meta-llama/llama-3.3-70b-instruct`, `google/gemini-2.5-flash`), run:
```bash
./.agents/skills/model-evaluation/scripts/evaluate-models.sh
```

### B. Run Command (Custom Models)
To evaluate specific models (e.g. Gemini 2.5 Pro and Llama 3.3):
```bash
./.agents/skills/model-evaluation/scripts/evaluate-models.sh "google/gemini-2.5-pro" "meta-llama/llama-3.3-70b-instruct"
```

### C. Options and Customization
You can customize the evaluation length and tolerances:
```bash
# Run 1 game of 2 rounds per model with a high API error tolerance
./.agents/skills/model-evaluation/scripts/evaluate-models.sh -g 1 -r 2 --max-api-errors 30 "deepseek/deepseek-chat"
```

---

## 2. Model Evaluation Checklist

When benchmarking a new model, evaluate it across the following four key pillars:

### 1. Rules Compliance Rate (Gold Standard)
* **Goal**: **100% compliance** (0 invalid plays).
* **Metric**: `LLM Invalid Card Rule Violations Retried` and `LLM Invalid Card Retries Exhausted Fallbacks`.
* **Verdict**: Models that frequently select cards not in their hand or fail to follow suit are unusable in production. DeepSeek V3 excels here.

### 2. Error Fallback Resilience
* **Goal**: Low fallback rate.
* **Metric**: `LLM Plays API / Timeout Fallbacks`.
* **Verdict**: Compares how often the model hits concurrency limits or upstream timeouts. If a model has a high fallback rate due to HTTP 429, a retry mechanism with exponential backoff or high-quota dedicated API keys should be utilized.

### 3. Positional Strategic Play
Review individual game logs in `logs/` to verify:
* **Teammate Points Protection**: Does the player play low non-points when the teammate is winning?
* **Trump Bleeding**: Does the leader force opponents' trumps out early?
* **Void Setup**: Does the AI actively dump high non-points to exhaust a suit and set up truffs?

### 4. Duration and Latency
* **Goal**: Prompt completion < 3.0 seconds.
* **Metric**: `Total Duration` and average turn duration.
* **Verdict**: Faster models deliver a responsive player experience in-app.

---

## 3. Reference Table of Evaluated Models

| Model | Success Rate | Rule Compliance | Latency | Strategic Verdict |
| :--- | :--- | :--- | :--- | :--- |
| **`deepseek/deepseek-chat` (V3)** | **~84%** (rate-limited) | **100%** | Medium-Low | **Excellent**: Demonstrates high positional awareness and flawless formatting compliance. |
| **`meta-llama/llama-3.3-70b`** | High | High | Medium | **Very Good**: Solid reasoning, occasionally requires retry on complex card-id sorting. |
| **`google/gemini-2.5-flash`** | Very High | High | Low | **Excellent Value**: Best speed/cost ratio; highly recommended for runtime. |
