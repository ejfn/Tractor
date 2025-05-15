import { useRef, useEffect } from 'react';
import { Animated, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Hook for managing UI animations in the game
 * @param showScreen Whether the screen is currently shown
 * @returns Animation values and controls
 */
export function useUIAnimations(showScreen: boolean) {
  // Initialize with visible values for first render
  const fadeAnim = useRef(new Animated.Value(showScreen ? 1 : 0)).current;
  const scaleAnim = useRef(new Animated.Value(showScreen ? 1 : 0.95)).current;
  const slideAnim = useRef(new Animated.Value(showScreen ? 0 : SCREEN_WIDTH)).current;

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
          })
        ]).start();
      }, 100);
    }
  }, [showScreen, fadeAnim, scaleAnim, slideAnim]);

  return {
    fadeAnim,
    scaleAnim,
    slideAnim
  };
}

/**
 * Hook for managing AI thinking animation dots
 * @returns Thinking dots animations and control functions
 */
export function useThinkingDots() {
  // Thinking dots animation values
  const dot1 = useRef(new Animated.Value(1)).current;
  const dot2 = useRef(new Animated.Value(1)).current;
  const dot3 = useRef(new Animated.Value(1)).current;

  // Animate thinking dots (continuous animation)
  useEffect(() => {
    // Create recursive animation function for the thinking dots
    const animateThinkingDots = () => {
      // Sequence for first dot
      Animated.sequence([
        Animated.timing(dot1, {
          toValue: 0.4,
          duration: 300,
          useNativeDriver: true
        }),
        Animated.timing(dot1, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true
        })
      ]).start();

      // Sequence for second dot with delay
      setTimeout(() => {
        Animated.sequence([
          Animated.timing(dot2, {
            toValue: 0.4,
            duration: 300,
            useNativeDriver: true
          }),
          Animated.timing(dot2, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true
          })
        ]).start();
      }, 150);

      // Sequence for third dot with more delay
      setTimeout(() => {
        Animated.sequence([
          Animated.timing(dot3, {
            toValue: 0.4,
            duration: 300,
            useNativeDriver: true
          }),
          Animated.timing(dot3, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true
          })
        ]).start(() => {
          // After all animations complete, wait briefly and restart
          setTimeout(animateThinkingDots, 300);
        });
      }, 300);
    };

    // Start the animation loop
    animateThinkingDots();

    // Clean up on unmount
    return () => {
      // No explicit cleanup needed as animations will stop when component unmounts
    };
  }, [dot1, dot2, dot3]);

  return {
    dots: { dot1, dot2, dot3 }
  };
}