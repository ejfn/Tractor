---
name: simulation-testing
description: Guidelines and instructions for running Shengji game simulation tests both with and without LLM models.
version: 1.0.0
license: MIT
---

## Overview

The unattended game simulation test (`__tests__/simulation/gameSimulation.test.ts`) executes full Shengji (Tractor) games using all-AI players to validate strategy correctness, rule compliance, and connection reliability.

---

## 1. Simulation Testing Guidelines

### A. Without LLM (Local Rule-Based AI)
Runs complete games using the fast, local rule-based AI engine:
- **Default Behavior**: Simulates **full games** until a team successfully defends Ace.
- **Safety Ceiling**: Falls back to a maximum of **60 rounds** to prevent infinite loops.
- **Run Command**:
  ```bash
  npm run test:simulation
  ```

---

### B. With LLM (Live OpenRouter AI)
Runs games using the active LLM strategizer bots:
- **Default Limit**: Runs exactly **1 round max** per game (`MAX_ROUNDS=1`) to conserve tokens and prevent long runs.
- **Strict Error Detection & Aborts**:
  - **API Error Limit**: Immediately aborts and fails if API errors/timeouts exceed **3** (`MAX_LLM_API_ERRORS=3`).
  - **Empty Response Handling**: OpenRouter empty responses (`llm_api_empty_response` where `content: null` or throws a payload exception) are **explicitly captured as API exceptions** and counted toward the API error threshold.
  - **Invalid Play Limit**: Immediately aborts and fails if invalid play card selections/retries exceed **10** (`MAX_LLM_INVALID_PLAYS=10`).
- **Run Command**:
  ```bash
  LLM_ENABLED=true TARGET_GAMES=1 MAX_ROUNDS=1 MAX_LLM_API_ERRORS=3 MAX_LLM_INVALID_PLAYS=10 npm run test:simulation
  ```

---

## 2. Dynamic Option Overrides

You can override any of these defaults on the fly by appending environment variables before the test command:

| Override Variable | Purpose | Example |
| :--- | :--- | :--- |
| `LLM_MODEL` | Specify a custom LLM model ID | `LLM_MODEL=google/gemini-2.5-flash` |
| `MAX_ROUNDS` | Customize maximum rounds per game | `MAX_ROUNDS=2` |
| `TARGET_GAMES` | Customize number of games to run | `TARGET_GAMES=2` |
| `MAX_LLM_API_ERRORS` | Customize allowed API failures | `MAX_LLM_API_ERRORS=5` |
| `MAX_LLM_INVALID_PLAYS` | Customize allowed invalid plays | `MAX_LLM_INVALID_PLAYS=15` |

**Example of Custom LLM Run**:
```bash
LLM_ENABLED=true TARGET_GAMES=1 MAX_ROUNDS=2 LLM_MODEL=google/gemini-2.5-flash npm run test:simulation
```

---

## 3. Environment & Local Overrides

Both the simulation test (`__tests__/simulation/gameSimulation.test.ts`) and the runner script (`scripts/run-simulation.sh`) support a robust environment-loading hierarchy to manage API keys and configurations securely:

### A. Automatic .env Loading
- If a `.env` file exists at the project root, the environment variables (such as `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, and `OPENROUTER_API_URL`) are automatically loaded.

### B. Priority & Overrides Hierarchy
To allow flexible execution setups (e.g. CI/CD vs. local testing), variables are loaded in the following strict priority:
1. **Command Line Arguments / Inline Exports** (Highest Priority): Direct CLI parameters (e.g., `-m google/gemini-2.5-flash`) or inline environment variable prefixes (e.g., `OPENROUTER_API_KEY=override_key ...`) always override any other configurations.
2. **Pre-existing Shell Variables**: Any variable already exported in the active shell environment.
3. **.env File**: Defined values inside the local `.env` file at the root.
4. **Script / Test Defaults** (Lowest Priority): Hardcoded sensible defaults in the script/test environment.

