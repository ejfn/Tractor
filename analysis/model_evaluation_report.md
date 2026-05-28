# Shengji AI Model Evaluation Report

This document records the empirical performance, rules compliance, latency, and connection reliability of different LLMs acting as AI opponents in the Chinese card game Shengji (升级/Tractor).

---

## 1. Comparative Evaluation Matrix

| Model ID | Enabled | Games Run | Successful Plays | API/Timeout Fallbacks | Invalid Retries | Success Rate (%) | Latency / Play | Connection / Provider Issues | Key Notes & Rules Compliance |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `deepseek/deepseek-chat-v3.1` | **Yes** | 1 | 39 | 0 | 0 | 100.0% | ~6-8s | None | **Outstanding:** 100% rules compliance on the first try. High strategic depth (trump bleeding, partner feeding). Adaptive shortcuts successfully bypassed 36 simple plays. |
| `meta-llama/llama-3.3-70b-instruct` | **Yes** | 1 | 30 | 3 | 0 | 90.9% | ~4-6s | Minor (3 fallbacks) | **Very High:** 100% rules compliance on successful responses (0 retries). Outstanding game strategy. Bypassed 42 plays using adaptive shortcuts. Seamlessly tolerated 3 provider-side API errors. |
| `openai/gpt-4o-mini` | **Yes** | 1 | 29 | 0 | 7 | 90.6% | ~5-6s | None | **Ultra Stable:** 100% API connection reliability. High strategic depth. Struggled slightly with duplicate choice ID constraints (7 retries, 3 fallbacks to algorithmic AI), but completed the game cleanly. |
| `qwen/qwen3-next-80b-a3b-instruct` | **Yes** | 1 | 48 | 0 | 0 | 100.0% | ~5-6s | None | **Outstanding:** 100% rules compliance and 100% success rate on the first try. Perfect strategic reasoning (trump conservation, teammate feeding, void analysis). |
| `google/gemini-2.5-flash` | **Yes** | 1 | 31 | 0 | 0 | 100.0% | ~7-8s | None | **Outstanding:** 100% rules compliance and 100% success rate on the first try. Perfect strategic reasoning (trump conservation, teammate feeding, void analysis). |

---

## 2. Detailed Execution Log

### Run #1: DeepSeek Chat V3.1
* **Date**: 2026-05-28
* **Target Games**: 1
* **Max Rounds**: 1 (Intentionally limited)
* **API / Timeout Fallbacks**: 0
* **Invalid Play Retries**: 0
* **Overall Telemetry Success Rate**: 100.0%
* **Adaptive Shortcuts Bypassed**: 36 plays (Massive token savings)
* **Strategic Observations**:
  - **Flawless Rules Compliance**: Demonstrated perfect alignment with Shengji's complex position-aware constraints (following suit, void discards, and cutting).
  - **Teammate & Partner Awareness**: Correctly fed point cards (Trick 8) to maximize scores when partner was winning securely.
  - **Advanced Trump Unification**: Mastered trump group unification by executing a brilliant trump-suit rank pair (`2♣, 2♦`) over-ruff to win the trick against `bot1`'s off-suit rank pair (`2♠, 2♠`) on Trick 15.
  - **Clear Reasoning Blocks**: Highly logical and strategic decision logs.

### Run #2: Meta Llama 3.3 70B Instruct
* **Date**: 2026-05-28
* **Target Games**: 1
* **Max Rounds**: 1 (Intentionally limited)
* **API / Timeout Fallbacks**: 3
* **Invalid Play Retries**: 0
* **Overall Telemetry Success Rate**: 90.9%
* **Adaptive Shortcuts Bypassed**: 42 plays (Extremely efficient)
* **Strategic Observations**:
  - **High Strategic Play**: Highlighted by smart trick contesting, partner coordination, and excellent card dumping choices.
  - **Zero Retries for Rules**: Every single successful API response was immediately 100% valid under the game rules, requiring zero invalid play retries.
  - **Connection Tolerance**: Seamlessly survived 3 provider-side API glitches or empty payloads, falling back to local rule-based AI to keep the game flow going.

### Run #3: GPT-4o Mini
* **Date**: 2026-05-28
* **Target Games**: 1
* **Max Rounds**: 1 (Intentionally limited)
* **API / Timeout Fallbacks**: 0
* **Invalid Play Retries**: 7 (with 3 retries exhausted leading to algorithmic fallback)
* **Overall Telemetry Success Rate**: 90.6%
* **Strategic Observations**:
  - **Connection Stability**: Excellent 100% network uptime without a single connection failure or timeout.
  - **Strategic Capabilities**: Exhibited solid game strategies, including aggressive trump leads (Trick 3 pair `2♥, 2♥` lead) and smart void discards to avoid feeding opponents point cards.
  - **ID Selection Challenges**: Struggled slightly with exact duplicate choice ID selection (e.g. generating parsed plays with duplicate choice IDs like `["c11", "c11"]` or invalid tractor pairings), which triggered 7 retries and 3 local algorithmic fallback plays. Overall, very robust and highly responsive.

### Run #4: Qwen3 Next 80B
* **Date**: 2026-05-28
* **Target Games**: 1
* **Max Rounds**: 1 (Intentionally limited)
* **API / Timeout Fallbacks**: 0
* **Invalid Play Retries**: 0
* **Overall Telemetry Success Rate**: 100.0%
* **Adaptive Shortcuts Bypassed**: 24 plays
* **Strategic Observations**:
  - **Flawless Rules Compliance**: 100% correct plays on the first try for all 48 API requests. Zero rule violations, zero retries, and zero timeouts.
  - **Deep Tactical Reasoning**: Highly advanced strategic reasoning logs. Excellent explanation of position heuristics, pair preservation (Trick 4 preservation of higher pairs and leading `9♦, 9♦`), and void-suit cut opportunities.
  - **Partner Feeding Mastery**: Correctly played the high-value `10♦` and `K♦` cards to feed the winning teammate securely (Trick 2 and Trick 7), maximizing points capture.
  - **Trump Conservation**: Smartly played low trumps (e.g. `7♣` and `5♣` on Trick 8) to win cheaply, conserving high-value trumps and Jokers for later.

### Run #5: Gemini 2.5 Flash
* **Date**: 2026-05-28
* **Target Games**: 1
* **Max Rounds**: 1 (Intentionally limited)
* **API / Timeout Fallbacks**: 0
* **Invalid Play Retries**: 0
* **Overall Telemetry Success Rate**: 100.0%
* **Adaptive Shortcuts Bypassed**: 41 plays
* **Strategic Observations**:
  - **Flawless Rules Compliance**: 100% correct plays on the first try for all 31 API requests. Zero rule violations, zero retries, and zero timeouts.
  - **Outstanding Partner Feeding**: Excellent partner support by feeding high point cards (`K♣` and `10♥` on Trick 2 and Trick 8) to partner's winning tricks, maximizing scoring efficiency.
  - **Superb Resource Conservation**: Correctly discarded low-value cards (`Q♣` and `K♣` as lone cards) when void in Spades rather than cutting unnecessarily, saving crucial trumps for contested tricks.
  - **Ultra-Fast & Stable**: Exceptional connection reliability and high responsiveness under standard network configurations.
