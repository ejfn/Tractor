# LLM-Driven AI Decisions via OpenRouter

Integrate OpenRouter LLM API calls to make card play decisions for AI players during the `Playing` phase, while retaining rule-based fallback mechanisms and preserving the existing synchronous game engine and test suites.

This plan includes a beautiful, premium configuration UI modal accessible via a hidden tap gesture, keeping the interface completely pristine.

---

## Architecture & Design Decisions

We have aligned on the following key architectural and user-experience branches:

1. **Test Suite Compatibility**: We will preserve `getAIMoveWithErrorHandling` as a synchronous function to keep all 12+ existing test suites and simulation scripts fully functional and fast. We will introduce a new asynchronous counterpart, `getAIMoveWithErrorHandlingAsync`, for use by the `useAITurns` React hook.
2. **Card Selection Representation**: The LLM will see its sorted hand with unique IDs (e.g. `c1: A♠`, `c2: 8♠`) and select cards by returning a JSON array of card IDs (e.g. `["c1", "c2"]`). Real-time validation is performed on this selection using the rule engine.
3. **Reasoning & Output Format**: The LLM will output a JSON object containing both its strategic `"reasoning"` in English and the selected `"play"` card IDs array. The reasoning will be saved in our developer logs and BQ analytics.
4. **Self-Correction & Feedback Loop**: We will create a detailed `getPlayValidationError` helper in `src/game/playValidation.ts` that identifies the exact Shengji rule violated and returns a highly specific error message. The LLM gets up to 2 retries to correct its selection using this feedback.
5. **State Recovery & Session History**: Chat sessions will be reconstructed dynamically from the `gameState.tricks` array of the current round. This is 100% self-healing, stateless, and fully compatible with game save/load and app restarts.
6. **API Credentials & Security**: API credentials will be supplied via standard Expo `EXPO_PUBLIC_` environment variables (`EXPO_PUBLIC_OPENROUTER_API_KEY`) as defaults, and can be overridden by users in the UI settings, stored securely in local SQLite storage via `localStorage`.

---

## Configuration Settings UI Design

We will build a high-fidelity config modal accessible only through a hidden developer/power-user trigger, keeping the main interface completely pristine and clean.

### 1. Pristine UI Trigger Gesture (`src/components/GameStatus.tsx`)
Instead of displaying a settings gear icon, we will implement a symmetrical hidden trigger:
- **5 quick taps on the "Round X" text** in `GameStatus.tsx` will trigger a callback to open the LLM Configuration Modal.
- This mirrors the existing 5 quick taps on the "Trump" display used to restart the game, creating a clean, logical, and fully hidden gesture pattern for developers/power users.

### 2. Premium Settings Modal (`src/components/LLMConfigModal.tsx`)
A new high-fidelity Modal overlay styled with clean container card layouts, modern typography, glassmorphism accents, and interactive visual feedback:
- **Toggle switch**: Instantly enable or disable the LLM AI decision-making engine.
- **TextInput (API Token)**: Secure text entry for the OpenRouter API Key. Includes a hide/reveal toggle (eye icon) and visual status border.
- **Model selector (Radio list or dropdown)**: Clean, styled selectors showing the top supported models with brief taglines:
  - `deepseek/deepseek-chat` (DeepSeek-V3 - default, recommended for lowest latency & cost)
  - `google/gemini-2.5-flash` (Gemini 2.5 Flash - extremely fast)
  - `anthropic/claude-3.5-haiku` (Claude 3.5 Haiku - highly analytical)
  - `meta-llama/llama-3.3-70b-instruct` (Llama 3.3 70B - strong open-weights)
- **Difficulty selector**: Choose between **Easy**, **Medium**, and **Hard** which dynamically maps to `reasoning_effort` ('low', 'medium', 'high') for supported reasoning-capable models.
- **Interactive "Test Connection" Button**: Triggers a fast verification call to OpenRouter's API using a 4-second AbortController. Displays a loading indicator, followed by a green success toast or red error explanation.
- **Save & Cancel Buttons**: Animates and saves configurations, updating active game controllers immediately.

### 3. Local Storage Persistence (`src/ai/llmConfig.ts`)
LLM configuration will be read from `localStorage` under the key `tractor_llm_config`. On startup:
- First, check `localStorage` for user-saved configs.
- Fall back to environment variables (`EXPO_PUBLIC_LLM_ENABLED`, `EXPO_PUBLIC_OPENROUTER_API_KEY`, etc.) if no local config exists.
- Expose a `saveLLMConfig` utility that serializes the configuration back to `localStorage`.

---

## Proposed Changes

### 1. Persistent Settings (`src/ai/llmConfig.ts`) [NEW]

Provide type definitions and persistence wrappers:

```typescript
export interface LLMConfig {
  enabled: boolean;
  apiKey: string;
  model: string;
  timeoutMs: number;
  difficulty: 'easy' | 'medium' | 'hard';
  applyToPlayers: string[]; // ['bot1', 'bot2', 'bot3']
}

export const DEFAULT_LLM_CONFIG: LLMConfig = {
  enabled: false,
  apiKey: '',
  model: 'deepseek/deepseek-chat',
  timeoutMs: 15000,
  difficulty: 'medium',
  applyToPlayers: ['bot1', 'bot2', 'bot3'],
};

export function getLLMConfig(): LLMConfig;
export function saveLLMConfig(config: LLMConfig): void;
```

### 2. Connection Tester (`src/ai/llmAIClient.ts`) [NEW]

Implement API calls and a connectivity testing utility:

```typescript
// Calls OpenRouter and returns assistant string response
export async function callOpenRouter(...);

// Fast check to see if OpenRouter key is active
export async function testOpenRouterConnection(apiKey: string): Promise<{ success: boolean; message: string }>
```

### 3. Configuration UI Component (`src/components/LLMConfigModal.tsx`) [NEW]

Create a beautiful component overlay containing all selectors, text inputs, error tooltips, hide/reveal keys, and save behaviors.

### 4. Integration into Screen Controller (`src/screens/GameScreenController.tsx`) [MODIFY]

Manage modal visibility state, load the LLM configuration on startup, pass handlers to trigger settings modals, and update hooks when settings are saved.

### 5. Integration into Header View (`src/screens/GameScreenView.tsx` & `src/components/GameStatus.tsx`) [MODIFY]

- Add an `onOpenSettings` prop to `GameStatus` and wrap the Round Text in a `TouchableWithoutFeedback` to detect the 5-tap gesture.
- Pass this trigger up through `GameScreenView` to `GameScreenController`.
- Render `<LLMConfigModal />` inside `GameScreenView`.

### 6. Prompt Builder (`src/ai/llmGamePrompt.ts`) [NEW]

Responsible for generating the static system rules prompt and reconstructing the dynamic user/assistant conversation history from the game state.

### 7. Strategy Coordinator (`src/ai/llmAIStrategy.ts`) [NEW]

Orchestrates the asynchronous AI play selection workflow with bypasses, validation, retries, and fallback strategies.

### 8. Rule Engine Feedback (`src/game/playValidation.ts`) [MODIFY]

Add the `getPlayValidationError` helper to identify exact Shengji rule violations and return descriptive string messages.

### 9. Process Play Async Coordinator (`src/game/playProcessing.ts`) [MODIFY]

Add the async wrapper: `getAIMoveWithErrorHandlingAsync(...)`.

### 10. AI Turn Hook Integration (`src/hooks/useAITurns.ts`) [MODIFY]

Convert `handleAIMove` to be asynchronous, utilizing unique `turnId` controls, `AbortController` cancellation, and zero artificial delays.

---

## Verification Plan

### Automated Tests
- Run `npm run typecheck` to verify strict compilation.
- Run `npm run test` to verify all existing synchronous tests pass (LLM disabled by default).
- Write `__tests__/ai/llmGamePrompt.test.ts` to test conversation reconstruction.
- Write `__tests__/ai/llmAIClient.test.ts` to test connection testers and retry validation wrappers.

### Manual Verification
- **Hidden Trigger Gesture**: Open game -> Tap the "Round 1" header text 5 times rapidly -> Verify the LLM Configuration Modal slides into view beautifully.
- **Connection Testing**: Enter OpenRouter API token -> Press Test Connection -> Verify loader followed by green tick/success notification.
- **Settings Persistence**: Restart the app -> Tap "Round 1" 5 times -> Verify all token, model, and difficulty choices are perfectly preserved.
- **Stale Updates / Pacing**: Verify that clicking cards rapidly or pausing the game does not cause double plays or crash states during active API requests.
