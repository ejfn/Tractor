import { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Tractor",
  slug: "Tractor",
  version: (process.env.APP_VERSION as string) || "v1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "tractor",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
  },
  android: {
    package: "com.cardgame.tractor",
    versionCode: 1,
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    permissions: ["android.permission.VIBRATE"],
    softwareKeyboardLayoutMode: "pan",
    edgeToEdgeEnabled: true,
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 250,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
      },
    ],
    "expo-localization",
    [
      "react-native-google-mobile-ads",
      {
        androidAppId:
          process.env.ANDROID_ADMOB_APP_ID ||
          "ca-app-pub-3940256099942544~3347511713",
        iosAppId:
          process.env.IOS_ADMOB_APP_ID ||
          "ca-app-pub-3940256099942544~1458002511",
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  jsEngine: "hermes",
  updates: {
    fallbackToCacheTimeout: 0,
    url: "https://u.expo.dev/3256dcee-103a-467b-96c4-97a9f634df51",
    requestHeaders: {
      "expo-channel-name": "production",
    },
  },
  assetBundlePatterns: ["**/*"],
  extra: {
    router: {},
    eas: {
      projectId: "3256dcee-103a-467b-96c4-97a9f634df51",
    },
  },
  owner: "ejfn",
  runtimeVersion: (process.env.RUNTIME_VERSION as string) || "v1.0.0",
  platforms: ["ios", "android"],
});
