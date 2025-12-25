import { Platform } from "react-native";
import { gameLogger } from "./gameLogger";

// Dynamically import ads module - may not be available in Expo Go
let MobileAds:
  | typeof import("react-native-google-mobile-ads").MobileAds
  | null = null;
let InterstitialAd:
  | typeof import("react-native-google-mobile-ads").InterstitialAd
  | null = null;
let AdEventType:
  | typeof import("react-native-google-mobile-ads").AdEventType
  | null = null;
let TestIds: typeof import("react-native-google-mobile-ads").TestIds | null =
  null;

// Track if native module is available
let isNativeModuleAvailable = false;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const adsModule = require("react-native-google-mobile-ads");
  MobileAds = adsModule.MobileAds;
  InterstitialAd = adsModule.InterstitialAd;
  AdEventType = adsModule.AdEventType;
  TestIds = adsModule.TestIds;
  isNativeModuleAvailable = true;
} catch {
  gameLogger.info(
    "ads_not_available",
    {},
    "Google Mobile Ads not available (Expo Go)",
  );
}

// Unit IDs - only used when native module is available
const getInterstitialId = () => {
  if (!TestIds) return null;
  if (__DEV__) return TestIds.INTERSTITIAL;
  return Platform.select({
    android:
      process.env.EXPO_PUBLIC_ANDROID_INTERSTITIAL_ID || TestIds.INTERSTITIAL,
    ios: process.env.EXPO_PUBLIC_IOS_INTERSTITIAL_ID || TestIds.INTERSTITIAL,
    default: TestIds.INTERSTITIAL,
  });
};

class AdManager {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private interstitial: any = null;
  private isLoaded = false;
  private isInitialized = false;

  constructor() {
    if (isNativeModuleAvailable) {
      this.initialize();
    }
  }

  /**
   * Initialize the Mobile Ads SDK
   */
  async initialize() {
    if (this.isInitialized || !MobileAds) return;

    try {
      await MobileAds().initialize();
      this.isInitialized = true;
      this.loadInterstitial();
    } catch (error) {
      gameLogger.error("ad_init_failed", { error }, "Failed to initialize ads");
    }
  }

  /**
   * Create and load the interstitial ad
   */
  loadInterstitial() {
    const interstitialId = getInterstitialId();
    if (!interstitialId || !InterstitialAd || !AdEventType) return;

    // Clean up existing ad
    this.interstitial = null;
    this.isLoaded = false;

    try {
      const interstitial = InterstitialAd.createForAdRequest(interstitialId, {
        requestNonPersonalizedAdsOnly: true,
      });

      interstitial.addAdEventListener(AdEventType.LOADED, () => {
        this.isLoaded = true;
        gameLogger.info("ad_loaded", {}, "Interstitial ad loaded");
      });

      interstitial.addAdEventListener(AdEventType.ERROR, (error) => {
        this.isLoaded = false;
        gameLogger.warn(
          "ad_load_error",
          { error },
          "Failed to load interstitial ad",
        );
      });

      interstitial.load();
      this.interstitial = interstitial;
    } catch (error) {
      gameLogger.error(
        "ad_create_failed",
        { error },
        "Failed to create ad request",
      );
    }
  }

  /**
   * Show interstitial ad if loaded.
   * Guarantees that onClosed callback is called even if ad fails to show.
   *
   * @param onClosed Callback to run after ad is closed or fails
   */
  showInterstitial(onClosed: () => void) {
    // If native module not available, just proceed
    if (!isNativeModuleAvailable || !AdEventType) {
      onClosed();
      return;
    }

    if (!this.interstitial || !this.isLoaded) {
      gameLogger.info("ad_skipped_not_ready", {}, "Skipping ad (not loaded)");
      onClosed();
      // Try to preload for next time
      this.loadInterstitial();
      return;
    }

    let hasCalledBack = false;
    const handleClose = () => {
      if (!hasCalledBack) {
        hasCalledBack = true;
        onClosed();
        // Load the next ad immediately
        this.loadInterstitial();
      }
    };

    try {
      const unsubscribeClose = this.interstitial.addAdEventListener(
        AdEventType.CLOSED,
        handleClose,
      );

      // Fallback for errors during show - listener discarded with ad object
      this.interstitial.addAdEventListener(
        AdEventType.ERROR,
        (error: Error) => {
          gameLogger.error("ad_show_error", { error }, "Error showing ad");
          unsubscribeClose();
          handleClose();
        },
      );

      this.interstitial.show();
    } catch (error) {
      gameLogger.error("ad_show_exception", { error }, "Exception showing ad");
      handleClose();
    }
  }
}

export const adManager = new AdManager();
