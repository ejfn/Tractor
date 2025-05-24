import { Text, View, TextProps, ViewProps, StyleSheet } from "react-native";
import { useColorScheme } from "@/hooks/useColorScheme";

// Simple themed text component for 404 page
export function ThemedText({
  type = "body",
  lightColor,
  darkColor,
  style,
  ...props
}: TextProps & {
  type?: "title" | "body" | "link" | "label" | "caption";
  lightColor?: string;
  darkColor?: string;
}) {
  const colorScheme = useColorScheme();
  const color =
    colorScheme === "dark" ? (darkColor ?? "#fff") : (lightColor ?? "#000");

  const textStyle = [
    styles.text,
    type === "title" && styles.title,
    type === "link" && styles.link,
    type === "label" && styles.label,
    type === "caption" && styles.caption,
    { color },
    style,
  ];

  return <Text style={textStyle} {...props} />;
}

// Simple themed view component for 404 page
export function ThemedView({
  lightColor,
  darkColor,
  style,
  ...props
}: ViewProps & {
  lightColor?: string;
  darkColor?: string;
}) {
  const colorScheme = useColorScheme();
  const backgroundColor =
    colorScheme === "dark" ? (darkColor ?? "#000") : (lightColor ?? "#fff");

  return <View style={[{ backgroundColor }, style]} {...props} />;
}

const styles = StyleSheet.create({
  text: {
    fontSize: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
  },
  link: {
    color: "#2e78b7",
    fontWeight: "bold",
  },
  label: {
    fontWeight: "bold",
    marginBottom: 4,
  },
  caption: {
    fontSize: 14,
    color: "#666",
  },
});
