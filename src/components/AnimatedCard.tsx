import React, { useCallback, useEffect, useMemo } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Card as CardType, JokerType } from "../types";
import { getSuitColorStyle, getSuitSymbol } from "../utils/suitHelpers";

interface CardProps {
  card: CardType;
  selected?: boolean;
  onSelect?: (card: CardType) => void;
  faceDown?: boolean;
  isPlayed?: boolean;
  isTrump?: boolean;
  delay?: number;
  scale?: number; // Add scale prop for bot cards
  style?: ViewStyle; // Add style prop for additional styling
  onAnimationComplete?: () => void; // Add callback for animation completion - properly typed as function
  disabled?: boolean; // Add disabled prop for trump declaration mode
}

export const AnimatedCard: React.FC<CardProps> = ({
  card,
  selected,
  onSelect,
  faceDown = false,
  isPlayed = false,
  isTrump = false,
  delay = 0,
  scale: cardScale = 1, // Default scale factor of 1, renamed to avoid conflict
  style = {}, // Default empty style object
  onAnimationComplete = undefined, // Explicitly set default to undefined to ensure proper typing
  disabled = false,
}) => {
  // Animated values
  const scale = useSharedValue(cardScale);
  const rotate = useSharedValue("0deg");
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);

  const suitColor = useMemo(
    () => getSuitColorStyle(card.suit).color,
    [card.suit],
  );
  const suitSymbol = useMemo(
    () => getSuitSymbol(card.suit, card.joker),
    [card.suit, card.joker],
  );
  const cardText = useMemo(() => {
    if (card.joker) {
      return card.joker === JokerType.Big ? "BIG JOKER" : "SMALL JOKER";
    }
    return card.rank || "";
  }, [card.joker, card.rank]);

  // Handle card selection with improved touch response - memoized for performance
  const handlePress = useCallback(() => {
    if (onSelect && !disabled) {
      // Ensure opacity is maintained during tap animation
      opacity.value = 1;

      // Cleaner tap animation - single spring with a small bounce
      scale.value = withTiming(1.05, {
        duration: 25, // Extremely quick animation - almost immediate
        easing: Easing.bezier(0.25, 0.1, 0.25, 1), // Custom easing for a subtle bounce
      });

      // Call onSelect immediately instead of waiting for animation
      onSelect(card);

      // Reset scale immediately after to prevent jumpy feeling
      setTimeout(() => {
        scale.value = withTiming(cardScale, { duration: 25 });
      }, 50);
    }
  }, [onSelect, disabled, opacity, scale, card, cardScale]);

  // Selection animation - improved with higher pop-up for better visibility
  useEffect(() => {
    if (selected) {
      // Use a tiny delay to ensure all cards start animating at the same time
      // This helps when multiple cards are selected simultaneously via auto-selection
      setTimeout(() => {
        translateY.value = withTiming(-20 * cardScale, {
          duration: 120, // Slightly longer duration for smoother animation
          easing: Easing.out(Easing.cubic),
        });
        scale.value = withTiming(cardScale * 1.05, {
          duration: 120, // Match duration for consistency
          easing: Easing.out(Easing.cubic),
        });
        opacity.value = 1;
      }, 0); // Use setTimeout with 0ms to synchronize animations
    } else {
      // Quick deselection with consistent timing
      setTimeout(() => {
        translateY.value = withTiming(0, {
          duration: 120,
          easing: Easing.inOut(Easing.cubic),
        });
        scale.value = withTiming(cardScale, {
          duration: 120,
          easing: Easing.inOut(Easing.cubic),
        });
        opacity.value = 1;
      }, 0);
    }
  }, [selected, translateY, scale, opacity, cardScale]);

  // Play animation - improved for cleaner, more refined appearance with better Bot3 support
  useEffect(() => {
    if (isPlayed) {
      // Delay animations for sequential effect
      setTimeout(() => {
        // Set rotation to 0 for a neat stack with improved easing
        rotate.value = withTiming("0deg", {
          duration: 200, // Reduced duration for smoother Bot3 animations
          easing: Easing.out(Easing.quad), // Quad easing for better performance
        });

        // Improved scale animation with completion callback
        scale.value = withTiming(
          1,
          {
            duration: 200, // Match duration with rotation for consistent feel
            easing: Easing.out(Easing.quad), // Quad easing for better performance
          },
          (finished) => {
            if (finished && typeof onAnimationComplete === "function") {
              // Notify parent component that animation is complete
              onAnimationComplete();
            }
          },
        );

        // Always set opacity to 1 immediately to prevent any transparency
        opacity.value = 1;
      }, delay);
    }
  }, [isPlayed, delay, rotate, opacity, scale, onAnimationComplete]);

  // Card appearance animations with improved performance settings
  // Create base animation style without shadows
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: scale.value },
        { translateY: translateY.value },
        { rotate: rotate.value },
      ],
      // Apply opacity based on disabled state - use higher opacity for better visibility
      opacity: disabled ? 0.7 : 1,
      // Add hardware acceleration hints for smoother animations
      backfaceVisibility: "hidden",
      // Enhanced zIndex for selected cards to ensure they appear clearly above other cards
      zIndex: selected
        ? style.zIndex
          ? style.zIndex + 10
          : 20
        : style.zIndex || 0,
    };
  }, [selected, disabled, style.zIndex]); // Add dependencies to avoid unnecessary recalculations

  // Create shadow styles separately to avoid shadowOffset error - memoized for performance
  const shadowStyle = useMemo(() => {
    return selected || isPlayed
      ? {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.15,
          shadowRadius: 2,
          elevation: 2,
        }
      : {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.2,
          shadowRadius: 3,
          elevation: 3,
        };
  }, [selected, isPlayed]);

  // Memoized static styles to avoid recreation on every render
  const faceDownCardBackStyle = useMemo(
    () => ({
      flex: 1,
      backgroundColor: "#1A4B84", // Deep blue background
      borderRadius: 6,
      borderWidth: 1.5,
      borderColor: "white",
      overflow: "hidden" as const,
      justifyContent: "center" as const,
      alignItems: "center" as const,
      position: "relative" as const,
    }),
    [],
  );

  const gridContainerStyle = useMemo(
    () => ({
      width: "90%" as const,
      height: "90%" as const,
      position: "relative" as const,
    }),
    [],
  );

  const jokerLetterStyle = useMemo(
    () => ({
      fontSize: 10,
      fontWeight: "bold" as const,
      lineHeight: 11,
      textAlign: "center" as const,
    }),
    [],
  );

  const jokerContentStyle = useMemo(
    () => ({
      position: "relative" as const,
      width: "100%" as const,
      height: "100%" as const,
      justifyContent: "center" as const,
      alignItems: "center" as const,
    }),
    [],
  );

  const jokerTopLeftStyle = useMemo(
    () => ({
      position: "absolute" as const,
      top: 3,
      left: 3,
      flexDirection: "column" as const,
      alignItems: "center" as const,
      zIndex: 10,
    }),
    [],
  );

  const jokerBottomRightStyle = useMemo(
    () => ({
      position: "absolute" as const,
      bottom: 3,
      right: 3,
      flexDirection: "column" as const,
      alignItems: "center" as const,
      transform: [{ rotate: "180deg" }],
      zIndex: 10,
    }),
    [],
  );

  const jokerStarStyle = useMemo(
    () => ({
      fontSize: 45,
      opacity: 1,
      fontWeight: "bold" as const,
      includeFontPadding: false as const,
      transform: [{ translateY: -3 }] as const,
    }),
    [],
  );

  // Memoized joker letters array to avoid recreation on every render
  const jokerLetters = useMemo(() => ["J", "O", "K", "E", "R"], []);

  // Memoized TouchableOpacity props to avoid recreation
  const touchableProps = useMemo(
    () => ({
      activeOpacity: 1.0,
      delayPressIn: 0,
      pressRetentionOffset: { top: 1, bottom: 1, left: 1, right: 1 },
      hitSlop: { top: 1, bottom: 1, left: 1, right: 1 },
    }),
    [],
  );

  // Memoized card styling to avoid recalculation
  const cardStyling = useMemo(() => {
    let bgColor = "white";
    let borderColor = "#CCCCCC";
    let borderWidth = 1;

    if (card.joker) {
      // Standardized styling for jokers as trump cards
      bgColor = "#FFFCEB"; // Consistent light gold background for all trump cards
      borderColor = "#D4B82F"; // Gold border for all trump cards
      borderWidth = 1.5; // Consistent border width for all trump cards
    } else if (isTrump) {
      // Consistent styling for all trump cards
      bgColor = "#FFFCEB"; // Light gold tint for all trump cards
      borderColor = "#D4B82F"; // Gold border for all trump cards
      borderWidth = 1.5; // Consistent border width for all trump cards
    }

    return { bgColor, borderColor, borderWidth };
  }, [card.joker, isTrump]);

  // Memoized joker color calculation
  const jokerColor = useMemo(() => {
    if (card.joker) {
      return card.joker === "Big" ? "#D32F2F" : "#000000";
    }
    return "#000000"; // Default to black for non-joker cards
  }, [card.joker]);

  if (faceDown) {
    return (
      <Animated.View style={[styles.card, shadowStyle, style, animatedStyle]}>
        <View style={styles.cardBack}>
          {/* Card back with simplified 3x3 grid pattern */}
          <View style={faceDownCardBackStyle}>
            {/* Simple grid pattern */}
            <View style={gridContainerStyle} pointerEvents="none">
              {/* Main grid container */}
              <View
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  borderWidth: 1,
                  borderColor: "rgba(255, 255, 255, 0.3)",
                }}
              />

              {/* Horizontal lines */}
              <View
                style={{
                  position: "absolute",
                  left: "10%",
                  right: "10%",
                  top: "33%",
                  height: 1,
                  backgroundColor: "rgba(255, 255, 255, 0.3)",
                }}
              />

              <View
                style={{
                  position: "absolute",
                  left: "10%",
                  right: "10%",
                  top: "66%",
                  height: 1,
                  backgroundColor: "rgba(255, 255, 255, 0.3)",
                }}
              />

              {/* Vertical lines */}
              <View
                style={{
                  position: "absolute",
                  top: "10%",
                  bottom: "10%",
                  left: "33%",
                  width: 1,
                  backgroundColor: "rgba(255, 255, 255, 0.3)",
                }}
              />

              <View
                style={{
                  position: "absolute",
                  top: "10%",
                  bottom: "10%",
                  left: "66%",
                  width: 1,
                  backgroundColor: "rgba(255, 255, 255, 0.3)",
                }}
              />
            </View>

            {/* Center emblem */}
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: "white",
                justifyContent: "center",
                alignItems: "center",
                position: "absolute",
                zIndex: 5,
              }}
              pointerEvents="none"
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "bold",
                  color: "#1A4B84",
                  textAlign: "center",
                }}
              >
                T
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>
    );
  }

  if (card.joker) {
    return (
      <Animated.View style={[shadowStyle, style, animatedStyle]}>
        <TouchableOpacity
          style={[
            styles.card,
            {
              backgroundColor: cardStyling.bgColor,
              borderColor: cardStyling.borderColor,
              borderWidth: 1,
              padding: 0,
              justifyContent: "center",
              alignItems: "center",
              opacity: 1, // Ensure opacity is always 1
            },
          ]}
          onPress={handlePress}
          disabled={!onSelect}
          {...touchableProps}
        >
          {/* Card content with vertical JOKER text */}
          <View style={jokerContentStyle}>
            {/* Top left vertical JOKER text */}
            <View style={jokerTopLeftStyle}>
              {jokerLetters.map((letter, idx) => (
                <Text
                  key={idx}
                  style={{
                    ...jokerLetterStyle,
                    color: jokerColor,
                  }}
                >
                  {letter}
                </Text>
              ))}
            </View>

            {/* Bottom right vertical JOKER text (inverted) */}
            <View style={jokerBottomRightStyle}>
              {jokerLetters.map((letter, idx) => (
                <Text
                  key={idx}
                  style={{
                    ...jokerLetterStyle,
                    color: jokerColor,
                  }}
                >
                  {letter}
                </Text>
              ))}
            </View>

            {/* Star symbol in center */}
            <Text
              style={{
                ...jokerStarStyle,
                color: jokerColor,
              }}
            >
              ★
            </Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // Render normal card with enhanced styling
  return (
    <Animated.View style={[shadowStyle, style, animatedStyle]}>
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: cardStyling.bgColor,
            borderColor: cardStyling.borderColor,
            borderWidth: cardStyling.borderWidth,
            opacity: 1, // Ensure opacity is always 1
          },
        ]}
        onPress={handlePress}
        disabled={!onSelect}
        {...touchableProps}
      >
        {/* Card header with rank and suit */}
        <View style={styles.cardHeader}>
          <View style={styles.rankSuitPair}>
            <Text
              allowFontScaling={false}
              style={[styles.cardRank, { color: suitColor }]}
            >
              {cardText}
            </Text>
            <Text
              allowFontScaling={false}
              style={[styles.suitSymbolSmall, { color: suitColor }]}
            >
              {suitSymbol}
            </Text>
          </View>
        </View>

        {/* Card footer with rank and suit (inverted) */}
        <View style={styles.cardFooter}>
          <View style={styles.rankSuitPairInverted}>
            <Text
              allowFontScaling={false}
              style={[styles.cardRank, { color: suitColor, fontSize: 15 }]}
            >
              {cardText}
            </Text>
            <Text
              allowFontScaling={false}
              style={[styles.suitSymbolSmall, { color: suitColor }]}
            >
              {suitSymbol}
            </Text>
          </View>
        </View>

        {/* Points indicator removed */}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 65, // Card width
    height: 95, // Card height
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: "#FFFFFF",
    padding: 4,
    margin: 2,
    position: "relative",
    // Improve shadow for cleaner look
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
    // Performance optimizations
    backfaceVisibility: "hidden",
    // @ts-expect-error - These are valid React Native style properties
    shouldRasterizeIOS: true, // iOS performance optimization
    renderToHardwareTextureAndroid: true, // Android performance optimization
    overflow: "hidden",
  },
  cardBack: {
    flex: 1,
    width: "100%",
    height: "100%",
    backgroundColor: "transparent",
    borderRadius: 6, // Match card border radius
    overflow: "hidden",
    // Performance optimizations for card back too
    backfaceVisibility: "hidden",
    shouldRasterizeIOS: true,
    renderToHardwareTextureAndroid: true,
  },
  // Using state-based styling controlled by animated values instead of this static style
  selectedCard: {
    opacity: 1, // Keep this to ensure no transparency when selected
  },
  // Card layout sections
  cardHeader: {
    position: "absolute",
    top: 4,
    left: 4,
    alignItems: "center",
  },
  rankSuitPair: {
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
  },
  rankSuitPairInverted: {
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
  },
  cardCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  cardFooter: {
    position: "absolute",
    bottom: 5,
    right: 4,
    alignItems: "center",
    transform: [{ rotate: "180deg" }],
  },
  // Card text elements
  cardRank: {
    fontSize: 14,
    fontWeight: "bold",
    includeFontPadding: false,
    fontFamily: "SpaceMono",
  },
  suitSymbolSmall: {
    fontSize: 14,
    fontWeight: "bold",
    includeFontPadding: false,
    fontFamily: "SpaceMono",
  },
  suit: {
    fontSize: 35,
  },
  // Trump indicator styles
  trumpIndicator: {
    display: "none",
  },
  trumpStar: {
    display: "none",
  },
});

// Export as both named and default for backward compatibility
export default React.memo(AnimatedCard);
