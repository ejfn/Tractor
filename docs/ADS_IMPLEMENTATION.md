# Ad Integration Strategy & Implementation Plan

## 1. Overview
This document outlines the strategy for integrating AdMob Interstitial Ads into the Tractor card game. The goal is to monetize via natural gameplay breaks while maintaining a premium user experience.

## 2. Ad Placement Strategy

### Primary: Between Rounds (Interstitial)
-   **Trigger:** User finishes a round and views the `RoundCompleteModal`.
-   **Action:** User clicks **"Next Round"**.
-   **Ad Flow:** 
    1.  Modal closes.
    2.  Interstitial Ad appears.
    3.  User closes Ad.
    4.  Next round dealing animation begins.
-   **Code Location:** `src/screens/GameScreenController.tsx` (intercepting `onNextRound`).

### Secondary: Game Over (Interstitial)
-   **Trigger:** Game ends (Victory/Defeat).
-   **Action:** User clicks **"New Game"**.
-   **Ad Flow:** Similar to above.
-   **Code Location:** `src/screens/GameScreenController.tsx` (intercepting `onStartNewGame`).

## 3. Technical Architecture

### A. Ad Manager Utility (`src/utils/adManager.ts`)
A dedicated singleton/service to handle all AdMob interactions:
-   **Initialization:** Safe initialization of the Mobile Ads SDK.
-   **Preloading:** Automatically load the next Interstitial when a round ends, so it's ready when the user clicks.
-   **Safety Wrapper:** a `showInterstitial(onClose)` function that guarantees the `onClose` callback is fired even if the ad fails to load, preventing the user from getting stuck.

### B. Component Integration
We will modify `GameScreenController.tsx` to wrap the state transition functions.

**Pseudo-code:**
```typescript
const handleNextRoundWithAd = async () => {
    // 1. Check if we should show ad (e.g. every round, or every 2 rounds)
    const shouldShow = AdManager.checkFrequency();
    
    if (shouldShow) {
        // 2. Attempt to show ad
        await AdManager.showInterstitial(() => {
            // 3. Callback: actually start next round
            handleNextRound(); 
        });
    } else {
        // No ad, proceed immediately
        handleNextRound();
    }
};
```

## 4. Implementation Steps

1.  **Dependencies**: Install `react-native-google-mobile-ads`.
2.  **Dynamic Config**: Convert `app.json` to `app.config.ts` to support reading `process.env`.
3.  **Environment Variables**:
    -   `ANDROID_ADMOB_APP_ID`: Application ID (Build time).
    -   `EXPO_PUBLIC_ANDROID_INTERSTITIAL_ID`: Unit ID (Runtime/Bundle time).
4.  **Utility**: Create `src/utils/adManager.ts` utilizing these variables.
5.  **Integration**: Update `GameScreenController.tsx` to use the manager.

## 5. Deployment / GitHub Secrets
To build on GitHub Actions/EAS:
1.  Add `ANDROID_ADMOB_APP_ID` to your Repository Secrets (or EAS Secrets).
2.  Add `EXPO_PUBLIC_ANDROID_INTERSTITIAL_ID` to Repository Secrets/EAS Secrets.
3.  Ensure your build workflow injects these as environment variables.

If these variables are missing, the app will default to **Test IDs** (safe for development).
5.  **Testing**: Verify with AdMob Test IDs (Android only).

> [!NOTE]
> iOS support is deferred. Ensure iOS build properties are either omitted or safe to ignore.
-   **"No Ads" IAP**: Add a check in `AdManager` to bypass ads if the user has purchased the upgrade.
-   **Frequency Capping**: Only show ads every N minutes or N rounds.
