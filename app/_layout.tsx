import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  Platform,
  StatusBar as RNStatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import "react-native-reanimated";

// Import the color scheme hook
import { useColorScheme } from "../hooks/useColorScheme";

// Initialize i18n and import language functions
import { useCommonTranslation } from "../src/hooks/useTranslation";
import { changeLanguageCustom, getCurrentLanguage } from "../src/locales";

// Header title with i18n support
const HeaderTitle = () => {
  const { t } = useCommonTranslation();
  return (
    <View style={{ width: "100%", alignItems: "center" }}>
      <Text
        style={{
          color: "white",
          fontSize: 18, // Slightly reduced font size
          fontWeight: "bold",
          textAlign: "center",
          textShadowColor: "rgba(0, 0, 0, 0.25)",
          textShadowOffset: { width: 1, height: 1 },
          textShadowRadius: 2,
          // Ensure it doesn't get truncated
          paddingHorizontal: 5,
          width: Platform.OS === "android" ? 200 : undefined, // Fixed width on Android
        }}
        numberOfLines={1}
        adjustsFontSizeToFit={true}
      >
        {t("appTitle")}
      </Text>
    </View>
  );
};

// Shared button style for perfect alignment
const languageButtonStyle = {
  paddingHorizontal: 12,
  paddingVertical: 6,
  marginRight: 0,
  marginLeft: 12,
  minWidth: 60,
  alignItems: "center" as const,
  justifyContent: "center" as const,
};

const languageTextStyle = {
  color: "white",
  fontSize: 12,
  fontWeight: "600" as const,
  textShadowColor: "rgba(0, 0, 0, 0.3)",
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 1,
};

// Invisible spacer to balance the header (matches language button exactly)
const HeaderLeftSpacer = () => {
  return (
    <View style={{ ...languageButtonStyle, backgroundColor: "transparent" }}>
      <Text style={{ ...languageTextStyle, opacity: 0 }}>中文</Text>
    </View>
  );
};

// Language switcher button for header
const HeaderLanguageButton = () => {
  const { t } = useCommonTranslation();
  const [currentLanguage, setCurrentLanguage] = useState(getCurrentLanguage());

  const handleLanguageToggle = async () => {
    const newLanguage = currentLanguage === "en" ? "zh" : "en";
    try {
      await changeLanguageCustom(newLanguage);
      setCurrentLanguage(newLanguage);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to change language:", error);
    }
  };

  return (
    <TouchableOpacity
      onPress={handleLanguageToggle}
      style={{ ...languageButtonStyle, marginRight: -8 }}
    >
      <Text style={languageTextStyle}>{t("language.shortCode")}</Text>
    </TouchableOpacity>
  );
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      {/* Use dark status bar on Android for better visibility */}
      <StatusBar style={Platform.OS === "android" ? "light" : "auto"} />
      {/* Render a view under the status bar to change its background on Android */}
      {Platform.OS === "android" && (
        <View
          style={{
            backgroundColor: "#1B5E4F",
            height: RNStatusBar.currentHeight || 0,
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
          }}
        />
      )}
      <Stack
        screenOptions={{
          headerShown: true,
          headerStyle: {
            backgroundColor: "#1B5E4F", // Deep emerald green background for header
          },
          headerTintColor: "#FFFFFF", // White text for header
          headerTitleAlign: "center", // Center the header title
          headerTitle: () => <HeaderTitle />,
          // Balance the header with invisible spacer that exactly matches language button
          headerLeft: () => <HeaderLeftSpacer />,
          headerRight: () => <HeaderLanguageButton />,
          contentStyle: {
            backgroundColor: "transparent", // Reverted from filled color to transparent
            flex: 1, // Make content fill available space
            height: "100%", // Ensure content fills the height
          },
        }}
      />
    </ThemeProvider>
  );
}
