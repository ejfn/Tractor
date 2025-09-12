import { useRef, useEffect } from "react";
import { Animated, Dimensions } from "react-native";
import { THINKING_DOTS_INTERVAL } from "../utils/gameTimings";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

/**
 * Hook for managing UI animations in the game
 * @param showScreen Whether the screen is currently shown
 * @returns Animation values and controls
 */
export function useUIAnimations(showScreen: boolean) {
  // Initialize with visible values for first render
  const fadeAnim = useRef(new Animated.Value(showScreen ? 1 : 0)).current;
  const scaleAnim = useRef(new Animated.Value(showScreen ? 1 : 0.95)).current;
  const slideAnim = useRef(
    new Animated.Value(showScreen ? 0 : SCREEN_WIDTH),
  ).current;

  // Initialize animations when screen changes
  useEffect(() => {
    // Only animate when changing from setup to game screen or vice versa
    if (!showScreen) {
      // Reset animations for next show
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.95);
      slideAnim.setValue(SCREEN_WIDTH);
    } else {
      // Game screen animations with a slight delay to ensure component is mounted
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 8,
            tension: 40,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ]).start();
      }, 100);
    }
  }, [showScreen, fadeAnim, scaleAnim, slideAnim]);

  return {
    fadeAnim,
    scaleAnim,
    slideAnim,
  };
}

/**
 * Hook for managing AI thinking animation dots
 * @returns Thinking dots animations and control functions
 */
export function useThinkingDots() {
  const dot1 = useRef(new Animated.Value(1)).current;
  const dot2 = useRef(new Animated.Value(1)).current;
  const dot3 = useRef(new Animated.Value(1)).current;

  const timersRef = useRef<{ [key: string]: ReturnType<typeof setTimeout> }>(
    {},
  );

  const clearAllTimers = () => {
    Object.values(timersRef.current).forEach((t) => clearTimeout(t));
    timersRef.current = {};
  };

  useEffect(() => {
    const animate = () => {
      dot1.stopAnimation();
      dot2.stopAnimation();
      dot3.stopAnimation();
      dot1.setValue(1);
      dot2.setValue(1);
      dot3.setValue(1);
      clearAllTimers();

      Animated.sequence([
        Animated.timing(dot1, {
          toValue: 0.4,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(dot1, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      timersRef.current.t1 = setTimeout(() => {
        Animated.sequence([
          Animated.timing(dot2, {
            toValue: 0.4,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(dot2, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      }, 150);

      timersRef.current.t2 = setTimeout(() => {
        Animated.sequence([
          Animated.timing(dot3, {
            toValue: 0.4,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(dot3, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          timersRef.current.t3 = setTimeout(animate, THINKING_DOTS_INTERVAL);
        });
      }, THINKING_DOTS_INTERVAL);
    };

    animate();

    return () => {
      clearAllTimers();
      dot1.stopAnimation();
      dot2.stopAnimation();
      dot3.stopAnimation();
    };
  }, [dot1, dot2, dot3]);

  return { dots: { dot1, dot2, dot3 } };
}
