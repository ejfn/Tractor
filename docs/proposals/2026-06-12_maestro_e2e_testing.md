# E2E UI Test Automation with Maestro

This document proposes an automated End-to-End (E2E) UI testing setup for **Tractor** using **Maestro**.

## Objective
To automate full-game play simulations in the UI to ensure:
1. Screen transitions and phases (Dealing, KittySwap, Playing, Scoring, RoundEnd) render correctly.
2. User interactions (tapping cards, animation pop-ups, and the Play/Swap button states) work as expected.
3. The React Native UI coordinates correctly with the underlying game state engine without crashing.

---

## The Challenge
Shengji (Tractor) has complex card-playing rules (suit matching, combinations, multi-combos, kitty swaps). 
In a black-box testing tool like Maestro, hardcoding a specific sequence of taps is impossible because:
1. Hand deals are randomized.
2. The cards played by bots (Bot 1, Bot 2, Bot 3) change dynamically.
3. The E2E script cannot calculate valid Shengji moves on its own.

---

## Proposed Solution: AI-Assisted E2E UI Interaction
Instead of making the test script smart, we make the app **expose suggestions** to the test harness when it is the human player's turn.

1. **Calculate suggested play in the UI**: When `process.env.EXPO_PUBLIC_E2E_MODE === 'true'` is active, the app runs the existing rule-based bot algorithms (`makeAIPlay` and `getAIKittySwap`) in the background on the human player's turn.
2. **Expose test IDs**: Any card that is part of the computed suggestion is rendered with a special `testID="card-suggested"`. All other cards in the human hand get standard test IDs (`card-normal-${index}`).
3. **Automate in Maestro**: The Maestro E2E script runs a simple JavaScript block to locate all elements matching `card-suggested`, taps each one to select them in the hand (triggering animations and state changes), and then taps the `Play Cards` button.

```
+------------------+                   +----------------------+
|   Maestro CLI    |                   |   React Native App   |
|                  |                   |  (EXPO_PUBLIC_E2E)   |
|                  |                   |                      |
| 1. Find & tap    | --(Simulate Tap)--> 2. Card component with|
|    "card-suggested"|                  |    testID="card-suggested"
|                  |                   |    gets selected.    |
|                  |                   |                      |
| 3. Click "Play"  | --(Simulate Tap)--> 4. Play button fires,|
|                  |                   |    game state updates|
+------------------+                   +----------------------+
```

---

## Proposed Changes

### 1. Component Updates

#### `src/components/AnimatedCard.tsx`
*   Add `testID?: string` to `CardProps` interface.
*   Forward the `testID` prop to the internal `<TouchableOpacity>` element:
    ```tsx
    <TouchableOpacity
      testID={testID}
      style={[styles.card, ...]}
      onPress={handlePress}
      disabled={!onSelect}
      {...touchableProps}
    >
    ```

#### `src/screens/GameScreenView.tsx`
*   Compute `suggestedCards` during the human's turn.
    ```typescript
    const suggestedCards = React.useMemo(() => {
      const isE2EMode = process.env.EXPO_PUBLIC_E2E_MODE === "true";
      if (!isE2EMode || gameState.currentPlayerIndex !== humanPlayerIndex) return [];
      
      if (gameState.gamePhase === GamePhase.Playing) {
        return makeAIPlay(gameState, humanPlayer);
      } else if (gameState.gamePhase === GamePhase.KittySwap) {
        return getAIKittySwap(gameState, humanPlayer.id);
      }
      return [];
    }, [gameState, humanPlayerIndex]);
    ```
*   Pass `suggestedCards={suggestedCards}` to `<HumanPlayerView>`.

#### `src/components/HumanPlayerView.tsx`
*   Accept `suggestedCards: Card[]` as a prop.
*   Pass it down to `<HumanHandAnimated>`.

#### `src/components/HumanHandAnimated.tsx`
*   Accept `suggestedCards: Card[]` as a prop.
*   In the hand mapping function:
    ```typescript
    const isSuggested = suggestedCards.some((sCard) => sCard.id === card.id);
    // Render:
    <AnimatedCardComponent
      card={card}
      testID={isSuggested ? "card-suggested" : `card-normal-${index}`}
      // ...other props
    />
    ```

### 2. Maestro Test Case

Create a test file `__tests__/e2e/play-full-game.yaml`:
```yaml
appId: host.exp.Exponent # Or custom dev client bundle ID
---
- launchApp
- tapOn: "Start Game"

# Loop containing human turn play:
- runScript: |
    // Locate and tap suggested cards
    var cards = maestro.findElements({ id: "card-suggested" });
    for (var i = 0; i < cards.length; i++) {
        maestro.tapOn(cards[i]);
    }

- assertVisible: "Play Cards"
- tapOn: "Play Cards"
```

---

## Verification Plan

### Automated Run
1. Install Maestro CLI locally:
   ```bash
   curl -FsSL https://get.maestro.mobile.dev | bash
   ```
2. Set E2E environment flag and run development build:
   ```bash
   EXPO_PUBLIC_E2E_MODE=true npm run android
   ```
3. Run the E2E script:
   ```bash
   maestro test __tests__/e2e/play-full-game.yaml
   ```

### Manual Verification
*   Verify that `EXPO_PUBLIC_E2E_MODE=false` does not render `card-suggested` IDs and behaves normally.
*   Inspect rendered DOM tags using React Native developer tools.
